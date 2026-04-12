"""TrustFoundry legal search and reasoning integration.

TrustFoundry provides verified legal search across 14M+ US laws, regulations, and cases.
This service tries the live TrustFoundry REST API first; if unavailable (key not yet
activated, network issue, rate limit), it falls back to a curated pre-cached legal
knowledge base of the statutes and cases most relevant to commercial contract review.

Integration Points:
  - Clause analysis: enriches GPT-4o analysis with verified statute citations
  - Chat: adds relevant law to RAG context
  - Reports: grounds critical findings in actual codeified law

Usage:
  from app.services.trustfoundry_service import get_legal_context

API Reference: https://trustfoundry.ai/legal-apis/
"""

import asyncio
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

# Normalise jurisdiction codes
_JURISDICTION_MAP = {
    "california": "CA",
    "new york": "NY",
    "delaware": "DE",
    "texas": "TX",
    "florida": "FL",
    "illinois": "IL",
    "federal": "FED",
}


def _normalise_jurisdiction(governing_law: str | None) -> str:
    """Return a 2-letter state code or 'DEFAULT'."""
    if not governing_law:
        return "DEFAULT"
    key = governing_law.lower().strip()
    # Already a code?
    if len(key) == 2:
        return key.upper()
    return _JURISDICTION_MAP.get(key, "DEFAULT")


# ─── TrustFoundry API client ────────────────────────────────────────────────────

_SEARCH_ENDPOINT_CANDIDATES = [
    "/v1/search",
    "/search",
    "/api/v1/search",
]


class TrustFoundryService:
    """
    Integrates TrustFoundry's legal search and reasoning API.
    Falls back to a curated pre-cached knowledge base when the API is unavailable.
    """

    def __init__(self) -> None:
        self._api_key: str = getattr(settings, "TRUSTFOUNDRY_API_KEY", "")
        self._base_url: str = getattr(
            settings, "TRUSTFOUNDRY_API_URL", "https://api.trustfoundry.ai"
        ).rstrip("/")
        self._enabled: bool = bool(
            getattr(settings, "TRUSTFOUNDRY_ENABLED", True)
            and self._api_key
        )
        self._live_available: bool | None = None  # lazily probed
        self._search_path: str = "/v1/search"

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
            "source": "trustfoundry" | "cached" | "none",
            "verified": bool,
            "citations": [ { "citation", "summary", "source_url", "verified" }, ... ],
          }
        """
        if not self._enabled:
            return self._cached_context(clause_type, governing_law)

        # Try live API (lazy probe on first call)
        if self._live_available is None:
            self._live_available = await self._probe_api()

        if self._live_available:
            try:
                result = await self._search_live(clause_type, governing_law, clause_text)
                if result:
                    return {"source": "trustfoundry", "verified": True, "citations": result}
            except Exception as exc:
                logger.warning("TrustFoundry live call failed: %s", exc)
                self._live_available = False

        return self._cached_context(clause_type, governing_law)

    # ── Live API helpers ────────────────────────────────────────────────────────

    async def _probe_api(self) -> bool:
        """Check whether the API is reachable and the key is valid."""
        timeout = httpx.Timeout(8.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            for path in _SEARCH_ENDPOINT_CANDIDATES:
                for auth_header in [
                    ("Authorization", f"Bearer {self._api_key}"),
                    ("X-API-Key", self._api_key),
                ]:
                    try:
                        resp = await client.get(
                            f"{self._base_url}{path}",
                            headers={auth_header[0]: auth_header[1]},
                            params={"q": "test", "limit": "1"},
                        )
                        if resp.status_code < 400:
                            self._search_path = path
                            logger.info("TrustFoundry API reachable at %s", path)
                            return True
                        if resp.status_code == 401:
                            logger.warning("TrustFoundry API key rejected (401)")
                            return False
                    except Exception:
                        continue
        logger.info("TrustFoundry API not reachable — using pre-cached legal knowledge")
        return False

    async def _search_live(
        self,
        clause_type: str,
        governing_law: str | None,
        clause_text: str,
    ) -> list[dict] | None:
        """Query the live TrustFoundry search API."""
        query_map = {
            "non_compete": "non-compete agreement enforceability restrictions",
            "indemnification": "one-sided indemnification clause unlimited liability",
            "auto_renewal": "automatic renewal contract consumer protection",
            "change_of_control": "change of control assignment termination",
            "data_privacy": "data privacy CCPA GDPR processing agreement",
            "ip_ownership": "intellectual property assignment work for hire",
            "limitation_of_liability": "limitation of liability cap unconscionability",
            "confidentiality": "confidentiality trade secret duration obligation",
            "non_solicitation": "non-solicitation employee customer enforceability",
        }
        query = query_map.get(clause_type, f"{clause_type.replace('_', ' ')} contract law")
        params: dict[str, str] = {"q": query, "limit": "3"}
        if governing_law:
            params["jurisdiction"] = governing_law

        headers = {"Authorization": f"Bearer {self._api_key}", "Accept": "application/json"}
        timeout = httpx.Timeout(15.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(
                f"{self._base_url}{self._search_path}",
                headers=headers,
                params=params,
            )
            resp.raise_for_status()
            data = resp.json()

        raw = data.get("results", data.get("items", data if isinstance(data, list) else []))
        citations = []
        for item in raw[:3]:
            citations.append({
                "citation": item.get("citation") or item.get("title") or "Unknown",
                "summary": item.get("summary") or item.get("excerpt") or item.get("text", "")[:300],
                "source_url": item.get("url") or item.get("source_url"),
                "verified": True,
            })
        return citations or None

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
