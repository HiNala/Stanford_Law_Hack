"""Risk analysis service — scores and explains each clause using GPT-4o.

Enhanced with CUAD/Kira-inspired 25-category taxonomy, market benchmarking,
impact assessment, and confidence scoring.
"""

import asyncio
import time
import uuid
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.clause import Clause
from app.models.contract import Contract
from app.services.ai_service import get_json_completion
from app.services.trustfoundry_service import get_legal_context, SUBSTANTIVE_CLAUSE_TYPES

logger = logging.getLogger(__name__)

# 25-category taxonomy inspired by CUAD dataset and Kira smart fields
CLAUSE_TAXONOMY = (
    "change_of_control, termination_convenience, termination_cause, "
    "indemnification, limitation_of_liability, non_compete, non_solicitation, "
    "ip_ownership, assignment, exclusivity, most_favored_nation, "
    "confidentiality, data_privacy, insurance, audit_rights, warranty, "
    "force_majeure, governing_law, dispute_resolution, notice, survival, "
    "payment_terms, auto_renewal, sla, general"
)

RISK_ANALYSIS_SYSTEM_PROMPT = f"""You are a senior associate attorney at a top-tier M&A and corporate transactional practice. You are conducting contract due diligence for a partner. Your analysis must be precise enough that the partner could rely on it to advise a client.

Analyze the contract clause below and return a JSON object with EXACTLY these fields:

{{
  "risk_score": <float 0.0-1.0, where 0.0=no risk, 1.0=critical>,
  "risk_level": "<low|medium|high|critical>",
  "clause_type": "<one of the 25 types listed below>",
  "risk_category": "<same value as clause_type>",
  "explanation": "<2-3 sentences: what this clause does and why it is or is not risky. Be concrete and specific — cite the actual language.>",
  "market_comparison": "<how this compares to market standard for this clause type — reference concrete norms, e.g. '15-day notice is well below the 30-90 day standard for MSAs; most commercial agreements require 60 days'>",
  "impact_if_triggered": "<practical worst-case scenario if this clause is exercised against your client — quantify exposure where possible, e.g. 'unlimited indemnification exposure with no cap'>",
  "suggestion": "<specific, actionable safer alternative language the client should request, or null if the clause is low-risk>",
  "confidence": <float 0.0-1.0 reflecting certainty of this assessment given the clause text provided>
}}

Clause types (pick exactly one): {CLAUSE_TAXONOMY}

Scoring guidance:
- One-sided provisions always score higher than bilateral/mutual ones
- Below-market notice periods, caps, or terms score higher than market-standard
- Missing standard protections score high or critical (no liability cap → critical; no mutual indemnification → high)
- Change-of-control termination rights: always high or critical — these are M&A deal-breakers
- Uncapped indemnification or unlimited liability: always critical
- Standard boilerplate (notice in writing, governing law in major US jurisdiction): low risk
- Short auto-renewal windows under 30 days: high risk
- Perpetual confidentiality obligations: high risk (unenforceable in many jurisdictions)

Respond ONLY with the JSON object. No markdown fences. No preamble. No trailing text."""

METADATA_SYSTEM_PROMPT = """You are a legal document analyst. Extract key metadata from this contract text.

Respond ONLY with valid JSON containing:
- title: the contract's title or name (string)
- parties: array of party name strings
- effective_date: when the contract takes effect (YYYY-MM-DD or null)
- expiration_date: when it expires (YYYY-MM-DD or null)
- governing_law: jurisdiction (string or null)
- contract_value: any stated dollar value or consideration (string or null)
- contract_type: one of "NDA", "MSA", "Employment", "Lease", "SaaS", "Vendor", "IP_License", "Partnership", "Settlement", "Other"
- summary: 3-5 sentence executive summary of the contract highlighting the most critical risk areas and key commercial terms"""


async def analyze_clause(clause_text: str) -> dict:
    """Analyze a single clause and return structured risk data."""
    result = await get_json_completion(
        system_prompt=RISK_ANALYSIS_SYSTEM_PROMPT,
        user_prompt=f"Clause text:\n\n{clause_text}",
        temperature=0.1,
    )
    return result


async def analyze_all_clauses(
    db: AsyncSession, contract_id: uuid.UUID, max_concurrent: int = 5
) -> int:
    """Run risk analysis on every clause in a contract with bounded concurrency.

    Uses an asyncio.Semaphore to limit parallel AI calls (default 5) so we
    stay within API rate limits while still being much faster than serial.
    Returns count of successfully analyzed clauses.
    """
    t0 = time.perf_counter()
    result = await db.execute(
        select(Clause)
        .where(Clause.contract_id == contract_id)
        .order_by(Clause.clause_index)
    )
    clauses = list(result.scalars().all())
    logger.info(f"Analyzing {len(clauses)} clauses for contract {contract_id}")

    semaphore = asyncio.Semaphore(max_concurrent)

    async def _analyze_one(clause: Clause) -> dict | None:
        async with semaphore:
            try:
                return await analyze_clause(clause.clause_text)
            except Exception as e:
                logger.error(f"Failed to analyze clause {clause.id}: {e}")
                return None

    # Fire all analyses concurrently (semaphore bounds parallelism)
    results = await asyncio.gather(*[_analyze_one(c) for c in clauses])

    analyzed = 0
    for clause, analysis in zip(clauses, results):
        if analysis is None:
            clause.risk_level = "medium"
            clause.risk_score = 0.5
            clause.explanation = "Analysis could not be completed — flagged for manual review."
            clause.suggestion = "Manual review recommended."
            continue

        clause.risk_score = analysis.get("risk_score", 0.0)
        clause.risk_level = analysis.get("risk_level", "low")
        clause.risk_category = analysis.get("risk_category", "general")
        clause.clause_type = analysis.get("clause_type", "general")

        # Build rich explanation that includes market context and impact
        base_explanation = analysis.get("explanation", "")
        market = analysis.get("market_comparison", "")
        impact = analysis.get("impact_if_triggered", "")

        rich_parts = [base_explanation]
        if market:
            rich_parts.append(f"**Market context:** {market}")
        if impact and analysis.get("risk_level") in ("medium", "high", "critical"):
            rich_parts.append(f"**If triggered:** {impact}")

        clause.explanation = "\n\n".join(p for p in rich_parts if p)
        clause.suggestion = analysis.get("suggestion")

        # Store confidence and enriched analysis metadata in JSONB
        clause.metadata_ = {
            "confidence": analysis.get("confidence", 0.5),
            "market_comparison": market or None,
            "impact_if_triggered": impact or None,
            "clause_type_detail": analysis.get("clause_type_detail"),
        }
        analyzed += 1

    await db.flush()

    # ── TrustFoundry legal grounding — enriches substantive clauses ────────────
    # Query TrustFoundry for verified legal citations for medium/high/critical clauses.
    # Done after the GPT-4o pass so it doesn't slow down analysis per-clause.
    try:
        contract_result = await db.execute(
            select(Contract).where(Contract.id == contract_id)
        )
        contract_obj = contract_result.scalar_one_or_none()
        governing_law = contract_obj.governing_law if contract_obj else None

        tf_candidates = [
            c for c in clauses
            if c.risk_level in ("medium", "high", "critical")
            and c.clause_type in SUBSTANTIVE_CLAUSE_TYPES
        ]

        if tf_candidates:
            tf_tasks = [
                get_legal_context(
                    clause_type=c.clause_type or "general",
                    governing_law=governing_law,
                    clause_text=c.clause_text,
                )
                for c in tf_candidates
            ]
            tf_results = await asyncio.gather(*tf_tasks, return_exceptions=True)

            for clause, tf_result in zip(tf_candidates, tf_results):
                if isinstance(tf_result, Exception) or not tf_result:
                    continue
                if tf_result.get("citations"):
                    existing_meta = clause.metadata_ or {}
                    existing_meta["legal_grounding"] = {
                        "source": tf_result["source"],
                        "verified": tf_result["verified"],
                        "citations": tf_result["citations"],
                        "provider": "TrustFoundry",
                    }
                    clause.metadata_ = existing_meta

            await db.flush()
            grounded = sum(
                1 for c in tf_candidates
                if c.metadata_ and c.metadata_.get("legal_grounding")
            )
            logger.info(
                f"TrustFoundry legal grounding: {grounded}/{len(tf_candidates)} clauses enriched "
                f"(governing law: {governing_law or 'unspecified'})"
            )
    except Exception as tf_err:
        logger.warning(f"TrustFoundry enrichment failed (non-fatal): {tf_err}")

    elapsed = time.perf_counter() - t0
    logger.info(f"Clause analysis complete: {analyzed}/{len(clauses)} in {elapsed:.1f}s")

    # Compute overall contract risk score using max-influenced weighted average
    scored_clauses = [c for c in clauses if c.risk_score is not None]
    if scored_clauses:
        # Weight by text length (longer clauses matter more)
        total_weight = sum(len(c.clause_text) for c in scored_clauses)
        if total_weight > 0:
            weighted_score = sum(
                c.risk_score * len(c.clause_text) for c in scored_clauses
            ) / total_weight
        else:
            weighted_score = sum(c.risk_score for c in scored_clauses) / len(scored_clauses)

        # Boost score if there are any critical clauses (so the overall score reflects severity)
        critical_count = sum(1 for c in scored_clauses if c.risk_level == "critical")
        if critical_count > 0:
            weighted_score = min(weighted_score * (1 + 0.1 * critical_count), 1.0)

        contract_result = await db.execute(
            select(Contract).where(Contract.id == contract_id)
        )
        contract = contract_result.scalar_one_or_none()
        if contract:
            contract.overall_risk_score = round(weighted_score, 3)
            if weighted_score >= 0.70:
                contract.risk_level = "critical"
            elif weighted_score >= 0.45:
                contract.risk_level = "high"
            elif weighted_score >= 0.20:
                contract.risk_level = "medium"
            else:
                contract.risk_level = "low"

    await db.flush()
    return analyzed


async def extract_contract_metadata(db: AsyncSession, contract_id: uuid.UUID) -> dict:
    """Extract metadata (title, parties, dates, etc.) from a contract's raw text."""
    result = await db.execute(
        select(Contract).where(Contract.id == contract_id)
    )
    contract = result.scalar_one_or_none()
    if not contract or not contract.raw_text:
        return {}

    # Use first 6000 chars to stay within token limits
    text_snippet = contract.raw_text[:6000]

    metadata = await get_json_completion(
        system_prompt=METADATA_SYSTEM_PROMPT,
        user_prompt=f"Contract text:\n\n{text_snippet}",
        temperature=0.1,
    )

    # Update contract with extracted metadata
    if metadata.get("title"):
        contract.title = metadata["title"]
    if metadata.get("parties"):
        contract.parties = {"names": metadata["parties"]}
    if metadata.get("effective_date"):
        try:
            from datetime import date as dt_date
            contract.effective_date = dt_date.fromisoformat(metadata["effective_date"])
        except (ValueError, TypeError):
            pass
    if metadata.get("expiration_date"):
        try:
            from datetime import date as dt_date
            contract.expiration_date = dt_date.fromisoformat(metadata["expiration_date"])
        except (ValueError, TypeError):
            pass
    if metadata.get("governing_law"):
        contract.governing_law = metadata["governing_law"]
    if metadata.get("contract_type"):
        contract.contract_type = metadata["contract_type"]
    if metadata.get("summary"):
        contract.summary = metadata["summary"]

    await db.flush()
    return metadata
