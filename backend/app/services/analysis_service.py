"""Risk analysis service — scores and explains each clause using GPT-4o."""

import uuid
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.clause import Clause
from app.models.contract import Contract
from app.services.ai_service import get_json_completion, get_completion

logger = logging.getLogger(__name__)

RISK_ANALYSIS_SYSTEM_PROMPT = """You are a senior legal risk analyst. Analyze the following contract clause and provide a structured risk assessment.

Respond ONLY with valid JSON containing these fields:
- risk_score: float from 0.0 (no risk) to 1.0 (critical risk)
- risk_level: one of "low", "medium", "high", "critical"
- risk_category: one of "financial", "termination", "indemnification", "ip_assignment", "non_compete", "compliance", "change_of_control", "liability", "confidentiality", "general"
- clause_type: what type of clause this is (e.g. "termination", "payment_terms", "warranty", "governing_law", "indemnification", "confidentiality", "non_compete", "force_majeure", "limitation_of_liability", "general")
- explanation: 2-3 sentence plain-English explanation of why this clause is or is not risky
- suggestion: if risk is medium or higher, suggest safer alternative language; if low risk, set to null"""

METADATA_SYSTEM_PROMPT = """You are a legal document analyst. Extract key metadata from this contract text.

Respond ONLY with valid JSON containing:
- title: the contract's title or name (string)
- parties: array of party name strings
- effective_date: when the contract takes effect (YYYY-MM-DD or null)
- expiration_date: when it expires (YYYY-MM-DD or null)
- governing_law: jurisdiction (string or null)
- contract_type: one of "NDA", "MSA", "Employment", "Lease", "SaaS", "Vendor", "IP_License", "Partnership", "Settlement", "Other"
- summary: 3-5 sentence executive summary of the contract"""


async def analyze_clause(clause_text: str) -> dict:
    """Analyze a single clause and return structured risk data."""
    result = await get_json_completion(
        system_prompt=RISK_ANALYSIS_SYSTEM_PROMPT,
        user_prompt=f"Clause text:\n\n{clause_text}",
        temperature=0.1,
    )
    return result


async def analyze_all_clauses(db: AsyncSession, contract_id: uuid.UUID) -> int:
    """Run risk analysis on every clause in a contract. Returns count analyzed."""
    result = await db.execute(
        select(Clause)
        .where(Clause.contract_id == contract_id)
        .order_by(Clause.clause_index)
    )
    clauses = list(result.scalars().all())

    analyzed = 0
    for clause in clauses:
        try:
            analysis = await analyze_clause(clause.clause_text)
            clause.risk_score = analysis.get("risk_score", 0.0)
            clause.risk_level = analysis.get("risk_level", "low")
            clause.risk_category = analysis.get("risk_category", "general")
            clause.clause_type = analysis.get("clause_type", "general")
            clause.explanation = analysis.get("explanation", "")
            clause.suggestion = analysis.get("suggestion")
            analyzed += 1
        except Exception as e:
            logger.error(f"Failed to analyze clause {clause.id}: {e}")
            clause.risk_level = "medium"
            clause.explanation = "Analysis failed — flagged for manual review."

    await db.flush()

    # Compute overall contract risk score
    scored_clauses = [c for c in clauses if c.risk_score is not None]
    if scored_clauses:
        total_weight = sum(len(c.clause_text) for c in scored_clauses)
        if total_weight > 0:
            weighted_score = sum(
                c.risk_score * len(c.clause_text) for c in scored_clauses
            ) / total_weight
        else:
            weighted_score = sum(c.risk_score for c in scored_clauses) / len(scored_clauses)

        contract_result = await db.execute(
            select(Contract).where(Contract.id == contract_id)
        )
        contract = contract_result.scalar_one_or_none()
        if contract:
            contract.overall_risk_score = round(weighted_score, 3)
            if weighted_score >= 0.75:
                contract.risk_level = "critical"
            elif weighted_score >= 0.5:
                contract.risk_level = "high"
            elif weighted_score >= 0.25:
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
