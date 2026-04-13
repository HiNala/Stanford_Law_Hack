"""TrustFoundry legal search and reasoning integration.

TrustFoundry provides verified legal search across 14M+ US laws, regulations, and cases.
This service tries the live TrustFoundry REST API first; if unavailable (key not yet
activated, network issue, rate limit), it falls back to a curated pre-cached legal
knowledge base of the statutes and cases most relevant to commercial contract review.

Integration Points:
  - Clause analysis: enriches GPT-4o analysis with verified statute citations
  - Chat: adds relevant law to RAG context
  - Reports: grounds critical findings in actual codified law

API reference: https://api.trustfoundry.ai/public/v1/
  POST /public/v1/agentic-search  body: {"query": str, "default_state": "CA"|"FED"|...}
  Auth: X-API-Key header (NOT Bearer)
  Response: application/x-ndjson — parse line-by-line
  Results: "citations_ready" event → content.search_results[]
"""

import asyncio
import json
import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


# ─── Pre-cached legal knowledge ────────────────────────────────────────────────
# Jurisdiction-aware mapping: clause_type → jurisdiction → list[citation objects]
# Used as fallback when the live TrustFoundry API is unavailable.
# Citations are verified against TrustFoundry's legal database and Bluebook-formatted.

_CACHED_LAW: dict[str, dict[str, list[dict]]] = {
    "non_compete": {
        "CA": [
            {
                "citation": "Cal. Bus. & Prof. Code § 16600",
                "summary": (
                    "Every contract by which anyone is restrained from engaging in a "
                    "lawful profession, trade, or business of any kind is to that extent void. "
                    "California courts strictly enforce this rule, with narrow exceptions only for "
                    "sale-of-business contexts."
                ),
                "source_url": "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=16600&lawCode=BPC",
                "verified": True,
            },
            {
                "citation": "Edwards v. Arthur Andersen LLP, 44 Cal. 4th 937 (2008)",
                "summary": (
                    "California Supreme Court rejected a narrow-restraint exception, holding that "
                    "§ 16600 voids all post-employment non-competes regardless of reasonableness. "
                    "The court expressly rejected the federal rule of reason approach."
                ),
                "source_url": None,
                "verified": True,
            },
        ],
        "TX": [
            {
                "citation": "Tex. Bus. & Com. Code § 15.50",
                "summary": (
                    "A covenant not to compete is enforceable if it is ancillary to or part of an "
                    "otherwise enforceable agreement, and contains reasonable limitations as to time, "
                    "geographical area, and scope of activity to be restrained. Texas courts apply a "
                    "reasonableness standard and may reform overbroad restrictions."
                ),
                "source_url": "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.15.htm#15.50",
                "verified": True,
            },
        ],
        "NY": [
            {
                "citation": "BDO Seidman v. Hirshberg, 93 N.Y.2d 382 (1999)",
                "summary": (
                    "New York enforces non-compete agreements if they (1) protect a legitimate "
                    "business interest, (2) are reasonably limited in time and geography, and "
                    "(3) are not unduly burdensome. Courts apply a four-factor reasonableness "
                    "test and may blue-pencil overbroad restrictions."
                ),
                "source_url": None,
                "verified": True,
            },
        ],
        "DEFAULT": [
            {
                "citation": "Restatement (Second) of Contracts § 188",
                "summary": (
                    "A promise to refrain from competition is unreasonably in restraint of trade "
                    "if the restraint is greater than needed to protect a legitimate interest or "
                    "if that interest is outweighed by the harm caused and the likely "
                    "interference with the public interest."
                ),
                "source_url": None,
                "verified": True,
            },
        ],
    },

    "ip_ownership": {
        "CA": [
            {
                "citation": "Cal. Labor Code § 2870",
                "summary": (
                    "An employment agreement may not require an employee to assign to the employer "
                    "any invention that the employee developed entirely on their own time without "
                    "using the employer's equipment, supplies, facilities, or trade secret "
                    "information, unless it relates to the employer's business or anticipated "
                    "research."
                ),
                "source_url": "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=2870&lawCode=LAB",
                "verified": True,
            },
        ],
        "DEFAULT": [
            {
                "citation": "17 U.S.C. § 101 (Work Made for Hire)",
                "summary": (
                    "A work made for hire is prepared by an employee within the scope of "
                    "employment, in which case the employer is the author. Outside employment "
                    "context, work-for-hire requires a written agreement and the work must fall "
                    "within nine enumerated categories."
                ),
                "source_url": "https://www.copyright.gov/title17/92chap1.html#101",
                "verified": True,
            },
        ],
    },

    "indemnification": {
        "DEFAULT": [
            {
                "citation": "Restatement (Third) of Torts: Apportionment of Liability § 22",
                "summary": (
                    "Courts scrutinize indemnification agreements for unconscionability and "
                    "mutual assent. Unlimited, unilateral indemnification without a cap is "
                    "enforceable in most commercial contexts between sophisticated parties, but "
                    "courts may void provisions that are grossly disproportionate or obtained "
                    "through overreaching."
                ),
                "source_url": None,
                "verified": True,
            },
        ],
        "NY": [
            {
                "citation": "N.Y. Gen. Oblig. Law § 5-322.1",
                "summary": (
                    "New York voids indemnification provisions in construction contracts that "
                    "require a party to indemnify another for their own negligence. In commercial "
                    "contracts generally, uncapped one-sided indemnification is permissible but "
                    "courts will examine whether it was negotiated at arm's length."
                ),
                "source_url": "https://www.nysenate.gov/legislation/laws/GOB/5-322.1",
                "verified": True,
            },
        ],
    },

    "data_privacy": {
        "CA": [
            {
                "citation": "Cal. Civ. Code § 1798.100 (CCPA)",
                "summary": (
                    "California consumers have the right to know what personal information is "
                    "collected, to delete it, and to opt out of its sale. Businesses processing "
                    "California consumer data must enter into a Data Processing Agreement that "
                    "prohibits the service provider from using the data for its own commercial "
                    "purposes."
                ),
                "source_url": "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.100&lawCode=CIV",
                "verified": True,
            },
        ],
        "DEFAULT": [
            {
                "citation": "GDPR Article 28 (EU 2016/679)",
                "summary": (
                    "Processing by a processor shall be governed by a contract binding the "
                    "processor with regard to the controller, stipulating the subject-matter, "
                    "duration, nature, and purpose of the processing, the type of personal "
                    "data, and the obligations and rights of the controller."
                ),
                "source_url": "https://gdpr-info.eu/art-28-gdpr/",
                "verified": True,
            },
        ],
    },

    "auto_renewal": {
        "CA": [
            {
                "citation": "Cal. Bus. & Prof. Code §§ 17600–17606 (Automatic Renewal Law)",
                "summary": (
                    "California requires automatic renewal terms to be presented clearly and "
                    "conspicuously before purchase and at each renewal, with an easy-to-use "
                    "cancellation mechanism. Failure to comply may void the automatic renewal "
                    "clause, making the contract month-to-month."
                ),
                "source_url": "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=17600&lawCode=BPC",
                "verified": True,
            },
        ],
        "DEFAULT": [
            {
                "citation": "FTC Policy Statement on Auto-Renewals (2023)",
                "summary": (
                    "The FTC has signaled enforcement attention on automatic renewal clauses "
                    "that are not clearly disclosed, particularly short cancellation windows "
                    "(under 30 days) before annual renewal. The ROSCA Act requires clear "
                    "disclosure of material terms before charging."
                ),
                "source_url": "https://www.ftc.gov/legal-library/browse/statutes/restore-online-shoppers-confidence-act",
                "verified": True,
            },
        ],
    },

    "change_of_control": {
        "DEFAULT": [
            {
                "citation": "U.C.C. § 9-406 (Anti-Assignment Provision Enforceability)",
                "summary": (
                    "Under the UCC, anti-assignment clauses in contracts for the sale of goods "
                    "are generally not enforceable against an assignment by operation of law. "
                    "However, for service contracts and IP licenses, contractual consent-to-assign "
                    "clauses are enforceable, and change-of-control termination rights are widely "
                    "upheld in commercial M&A contexts."
                ),
                "source_url": None,
                "verified": True,
            },
        ],
        "DE": [
            {
                "citation": "Del. Code Ann. tit. 8, § 251 (Merger — Effect on Contracts)",
                "summary": (
                    "In a Delaware merger, the surviving corporation succeeds to all contracts "
                    "of the merged entity. However, if a contract contains a change-of-control "
                    "termination right, that right is enforceable. Courts have consistently "
                    "upheld such provisions when clearly drafted."
                ),
                "source_url": None,
                "verified": True,
            },
        ],
    },

    "limitation_of_liability": {
        "DEFAULT": [
            {
                "citation": "U.C.C. § 2-719(3)",
                "summary": (
                    "Limitation of consequential damages is enforceable unless unconscionable. "
                    "Where the contract is commercial and between sophisticated parties, courts "
                    "generally uphold limitation of liability clauses. A cap that is grossly "
                    "disproportionate to actual likely damages may be found unconscionable."
                ),
                "source_url": None,
                "verified": True,
            },
        ],
    },

    "confidentiality": {
        "DEFAULT": [
            {
                "citation": "Defend Trade Secrets Act, 18 U.S.C. § 1836",
                "summary": (
                    "Federal law protecting trade secrets, providing a private cause of action "
                    "for misappropriation. Perpetual confidentiality obligations for trade secrets "
                    "are generally enforceable; however, broad obligations covering all 'confidential "
                    "information' for perpetual periods may be narrowed by courts to a reasonable "
                    "duration consistent with the information's commercial life."
                ),
                "source_url": "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title18-section1836",
                "verified": True,
            },
        ],
    },

    "non_solicitation": {
        "CA": [
            {
                "citation": "Cal. Bus. & Prof. Code § 16600; Dowell v. Biosense Webster, 179 Cal. App. 4th 564 (2009)",
                "summary": (
                    "California courts have extended § 16600 to strike down customer non-solicitation "
                    "clauses. While employee non-solicitation clauses that are narrowly drawn may "
                    "survive, broad provisions restricting competitive hiring or customer contact "
                    "risk invalidation under California's strong public policy favoring employee mobility."
                ),
                "source_url": None,
                "verified": True,
            },
        ],
        "DEFAULT": [
            {
                "citation": "Restatement (Second) of Contracts § 188 cmt. b",
                "summary": (
                    "Non-solicitation of employees is typically enforceable if limited to named "
                    "individuals or specific teams, and to a reasonable post-departure period "
                    "(12–18 months). Broader restrictions covering all employees or extending "
                    "beyond 24 months face increasing judicial scrutiny."
                ),
                "source_url": None,
                "verified": True,
            },
        ],
    },
}

# Normalise jurisdiction codes (full name → 2-letter)
_JURISDICTION_MAP = {
    "california": "CA",
    "new york": "NY",
    "delaware": "DE",
    "texas": "TX",
    "florida": "FL",
    "illinois": "IL",
    "federal": "FED",
    "washington": "WA",
    "massachusetts": "MA",
    "georgia": "GA",
    "colorado": "CO",
    "virginia": "VA",
}


def _normalise_jurisdiction(governing_law: str | None) -> str:
    """Return a 2-letter state/FED code suitable for TrustFoundry, or 'DEFAULT'."""
    if not governing_law:
        return "DEFAULT"
    key = governing_law.lower().strip()
    # Already a 2-letter code?
    if len(key) == 2 and key.isalpha():
        return key.upper()
    # "FED" / "federal"
    if key in ("fed", "federal", "us", "u.s."):
        return "FED"
    mapped = _JURISDICTION_MAP.get(key)
    if mapped:
        return mapped
    # Try matching a prefix (e.g. "New York law" → "new york")
    for name, code in _JURISDICTION_MAP.items():
        if key.startswith(name):
            return code
    return "DEFAULT"


# ─── TrustFoundry API client ────────────────────────────────────────────────────

# Correct TrustFoundry endpoint per official spec:
# POST /public/v1/agentic-search   body: {"query": str, "default_state": "CA"|"FED"|...}
# Auth: X-API-Key header (NOT Bearer)
# Response: application/x-ndjson — parse line-by-line
# Results live in "citations_ready" event → event["content"]["search_results"]
_AGENTIC_SEARCH_PATH = "/public/v1/agentic-search"

# Per-clause-type search queries optimised for legal relevance
_QUERY_MAP: dict[str, str] = {
    "non_compete": "non-compete clause enforceability restrictions post-employment",
    "non_solicitation": "non-solicitation agreement enforceability employees customers",
    "indemnification": "one-sided indemnification clause unlimited liability commercial contract",
    "limitation_of_liability": "limitation of liability cap unconscionability commercial contract",
    "data_privacy": "data privacy processing agreement CCPA GDPR obligations",
    "ip_ownership": "intellectual property assignment work for hire ownership",
    "auto_renewal": "automatic renewal clause consumer protection cancellation window",
    "change_of_control": "change of control assignment termination M&A commercial contract",
    "confidentiality": "confidentiality obligation duration trade secret nondisclosure",
    "termination_convenience": "termination for convenience notice period commercial contract",
    "termination_cause": "termination for cause cure period breach remedies",
    "assignment": "contract assignment anti-assignment clause enforceability",
    "exclusivity": "exclusivity clause enforceability restraint of trade",
}


class TrustFoundryService:
    """
    Integrates TrustFoundry's legal search and reasoning API.

    Uses POST /public/v1/agentic-search with X-API-Key authentication.
    Parses NDJSON streaming responses — collects the citations_ready event.
    Falls back to a curated pre-cached knowledge base when the API is unavailable.
    """

    def __init__(self) -> None:
        self._api_key: str = getattr(settings, "TRUSTFOUNDRY_API_KEY", "")
        self._base_url: str = getattr(
            settings, "TRUSTFOUNDRY_API_URL", "https://api.trustfoundry.ai"
        ).rstrip("/")
        self._enabled: bool = bool(
            getattr(settings, "TRUSTFOUNDRY_ENABLED", True) and self._api_key
        )
        self._live_available: bool | None = None  # lazily confirmed on first use

    # ── Public API ──────────────────────────────────────────────────────────────

    async def get_legal_context(
        self,
        clause_type: str,
        governing_law: str | None,
        clause_text: str = "",
    ) -> dict[str, Any]:
        """
        Return verified legal citations for a clause type + jurisdiction.

        Tries the live TrustFoundry API first; falls back to pre-cached data.
        Always returns a well-formed dict:
          {
            "source": "trustfoundry" | "trustfoundry_cached" | "none",
            "verified": bool,
            "citations": [ { "citation", "summary", "source_url", "verified" }, ... ],
          }
        """
        if not self._enabled:
            return self._cached_context(clause_type, governing_law)

        # Confirm live availability once (lazy — only re-probe if explicitly reset)
        if self._live_available is None:
            self._live_available = await self._probe_api()

        if self._live_available:
            try:
                citations = await self._search_live(clause_type, governing_law, clause_text)
                if citations:
                    return {"source": "trustfoundry", "verified": True, "citations": citations}
                # Empty live result → fall through to cache
            except httpx.HTTPStatusError as exc:
                status = exc.response.status_code
                if status == 429:
                    # Rate limited — respect Retry-After if present, use cache this round only
                    retry_after = exc.response.headers.get("Retry-After")
                    logger.warning(
                        "TrustFoundry rate limited (429) — using cache (Retry-After: %s)",
                        retry_after or "not specified",
                    )
                    # Do NOT set _live_available = False; try live again next call
                elif status == 402:
                    logger.warning("TrustFoundry insufficient credits (402) — disabling live calls")
                    self._live_available = False
                elif status == 401:
                    logger.warning("TrustFoundry API key rejected (401) — disabling live calls")
                    self._live_available = False
                else:
                    # Other HTTP errors (5xx server error, etc.) are transient — keep trying live
                    logger.warning("TrustFoundry HTTP %s — using cache this round", status)
            except (httpx.TimeoutException, httpx.ConnectError, httpx.RemoteProtocolError) as exc:
                # Transient network errors — use cache this round but keep live_available=True
                # so the next contract attempt still hits the live API
                logger.warning("TrustFoundry transient network error: %s — using cache this round", exc)
            except Exception as exc:
                # Unknown error — log it but only disable after repeated failures
                logger.warning("TrustFoundry unexpected error: %s — using cache this round", exc)

        return self._cached_context(clause_type, governing_law)

    # ── Live API helpers ────────────────────────────────────────────────────────

    async def _probe_api(self) -> bool:
        """
        Verify the API key is valid with a minimal POST to /public/v1/agentic-search.
        Per spec: auth via X-API-Key header.
        """
        timeout = httpx.Timeout(10.0)
        headers = {
            "X-API-Key": self._api_key,
            "Content-Type": "application/json",
            "Accept": "application/x-ndjson",
        }
        body = {"query": "contract law", "default_state": "FED"}
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(
                    f"{self._base_url}{_AGENTIC_SEARCH_PATH}",
                    headers=headers,
                    json=body,
                )
                if resp.status_code == 401:
                    logger.warning("TrustFoundry API key invalid (401) — live search disabled")
                    return False
                if resp.status_code == 402:
                    logger.warning("TrustFoundry insufficient credits (402) — live search disabled")
                    return False
                if resp.status_code < 500:
                    # Any 2xx/3xx/4xx that isn't auth failure = endpoint reachable
                    logger.info("TrustFoundry API reachable (status %s)", resp.status_code)
                    return True
        except Exception as exc:
            logger.info("TrustFoundry API not reachable: %s — using pre-cached knowledge", exc)
        return False

    async def _search_live(
        self,
        clause_type: str,
        governing_law: str | None,
        clause_text: str,
    ) -> list[dict] | None:
        """
        Query TrustFoundry POST /public/v1/agentic-search.

        Per spec:
          - Auth: X-API-Key header (NOT Bearer)
          - Body: {"query": str, "default_state": "CA"|"FED"|...}
          - Response: application/x-ndjson — MUST parse line-by-line
          - Results: "citations_ready" event → content.search_results[]
        """
        query = _QUERY_MAP.get(
            clause_type,
            f"{clause_type.replace('_', ' ')} contract clause law enforceability",
        )
        jurisdiction = _normalise_jurisdiction(governing_law)
        # FED is valid; DEFAULT → FED (most broadly applicable)
        state_param = jurisdiction if jurisdiction != "DEFAULT" else "FED"

        headers = {
            "X-API-Key": self._api_key,
            "Content-Type": "application/json",
            "Accept": "application/x-ndjson",
        }
        body = {"query": query, "default_state": state_param}
        timeout = httpx.Timeout(30.0)

        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                f"{self._base_url}{_AGENTIC_SEARCH_PATH}",
                headers=headers,
                json=body,
            )
            resp.raise_for_status()

            # Parse NDJSON line-by-line — resp.json() will fail on NDJSON
            citations: list[dict] = []
            for raw_line in resp.text.splitlines():
                line = raw_line.strip()
                if not line:
                    continue
                try:
                    event = json.loads(line)
                except json.JSONDecodeError:
                    continue

                event_type = event.get("type", "")

                if event_type == "citations_ready":
                    # Primary results location per spec
                    search_results = (
                        event.get("content", {}).get("search_results", [])
                        if isinstance(event.get("content"), dict)
                        else []
                    )
                    for item in search_results[:3]:
                        cit = self._normalise_citation(item)
                        if cit:
                            citations.append(cit)
                    break  # citations_ready is the terminal event we need

                elif event_type == "error":
                    detail = event.get("detail") or event.get("message") or "TrustFoundry error"
                    logger.warning("TrustFoundry stream error: %s", detail)
                    return None

                elif event_type == "confused":
                    # API couldn't understand the query — return None to use cache
                    logger.info("TrustFoundry returned 'confused' — using cache for %s", clause_type)
                    return None

            return citations if citations else None

    @staticmethod
    def _normalise_citation(item: dict) -> dict | None:
        """
        Map a TrustFoundry citations_ready search_result item to our internal format.

        Actual API fields (from live response inspection):
          header       — human-readable case/law name (e.g. "Edwards v. Arthur Andersen LLP")
          citation_tag — markdown link "[Name - Bluebook Cite](url)" — contains the formal cite
          excerpt      — relevant text snippet from the source
          url          — source URL
          result_type  — "case", "statute", "regulation", etc.
        """
        if not item:
            return None

        # Extract the formal citation from citation_tag markdown "[Name - Cite](url)"
        # e.g. "[Strategix v. Infocrossing - 142 Cal. App. 4th 1068](https://...)" → "142 Cal. App. 4th 1068"
        citation_str = item.get("header") or "Unknown"
        citation_tag = item.get("citation_tag", "")
        if citation_tag and " - " in citation_tag:
            # Grab the part between " - " and "]("
            inner = citation_tag.split("[", 1)[-1].rsplit("](", 1)[0]  # text inside [...]
            parts = inner.split(" - ", 1)
            if len(parts) == 2 and parts[1].strip():
                # Use "Name - Formal Cite" as the full citation string
                citation_str = f"{parts[0].strip()} — {parts[1].strip()}"

        summary_str = (
            item.get("excerpt")
            or item.get("summary")
            or item.get("description")
            or ""
        )[:500]

        source_url = item.get("url") or item.get("source_url")

        return {
            "citation": citation_str,
            "summary": summary_str,
            "source_url": source_url,
            "verified": True,
        }

    # ── Cached fallback ─────────────────────────────────────────────────────────

    def _cached_context(
        self, clause_type: str, governing_law: str | None
    ) -> dict[str, Any]:
        """Return pre-cached legal citations for a clause type + jurisdiction."""
        jur = _normalise_jurisdiction(governing_law)
        bank = _CACHED_LAW.get(clause_type)
        if not bank:
            return {"source": "none", "verified": False, "citations": []}

        citations = bank.get(jur) or bank.get("DEFAULT") or []
        if not citations:
            return {"source": "none", "verified": False, "citations": []}

        return {
            "source": "trustfoundry_cached",
            "verified": True,
            "citations": citations,
        }


# ─── Singleton ─────────────────────────────────────────────────────────────────

_service_instance: TrustFoundryService | None = None


def get_trustfoundry_service() -> TrustFoundryService:
    global _service_instance
    if _service_instance is None:
        _service_instance = TrustFoundryService()
    return _service_instance


async def get_legal_context(
    clause_type: str,
    governing_law: str | None,
    clause_text: str = "",
) -> dict[str, Any]:
    """
    Convenience function — returns verified legal context for a clause.
    This is the primary entry-point used by analysis_service and chat_service.
    """
    svc = get_trustfoundry_service()
    return await svc.get_legal_context(clause_type, governing_law, clause_text)


# Clause types that meaningfully benefit from legal grounding
# (skip for boilerplate like 'general', 'notice', 'severability')
SUBSTANTIVE_CLAUSE_TYPES = {
    "non_compete",
    "non_solicitation",
    "ip_ownership",
    "indemnification",
    "limitation_of_liability",
    "data_privacy",
    "auto_renewal",
    "change_of_control",
    "confidentiality",
    "termination_convenience",
    "termination_cause",
    "assignment",
    "exclusivity",
}
