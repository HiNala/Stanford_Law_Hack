"""Generate executive summaries and export reports for contracts."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contract import Contract
from app.models.clause import Clause
from app.services.ai_service import get_completion

SUMMARY_SYSTEM_PROMPT = """You are a legal report generator. Create a professional due diligence summary report based on the contract analysis provided.

Structure your report as:
1. Executive Summary
2. Key Parties and Terms
3. Risk Assessment Overview (with risk distribution)
4. High-Risk Findings (detail each high/critical clause)
5. Recommendations
6. Conclusion

Use markdown formatting. Be precise, professional, and actionable."""


async def generate_summary_report(
    db: AsyncSession, contract_id: uuid.UUID
) -> str:
    """Generate a comprehensive summary report for a contract."""
    contract_result = await db.execute(
        select(Contract).where(Contract.id == contract_id)
    )
    contract = contract_result.scalar_one_or_none()
    if not contract:
        raise ValueError(f"Contract {contract_id} not found")

    clause_result = await db.execute(
        select(Clause)
        .where(Clause.contract_id == contract_id)
        .order_by(Clause.clause_index)
    )
    clauses = list(clause_result.scalars().all())

    # Build context for the report
    risk_summary = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    high_risk_details = []

    for clause in clauses:
        level = clause.risk_level or "low"
        if level in risk_summary:
            risk_summary[level] += 1
        if level in ("high", "critical"):
            high_risk_details.append(
                f"- [{clause.clause_type or 'Unknown'}] (Risk: {clause.risk_score:.2f}): "
                f"{clause.explanation or clause.clause_text[:200]}"
            )

    context = f"""Contract: {contract.title or contract.original_filename}
Type: {contract.contract_type or 'Unknown'}
Parties: {contract.parties or 'Unknown'}
Governing Law: {contract.governing_law or 'Unknown'}
Overall Risk Score: {contract.overall_risk_score or 'N/A'}
Risk Level: {contract.risk_level or 'N/A'}

Risk Distribution:
- Critical: {risk_summary['critical']}
- High: {risk_summary['high']}
- Medium: {risk_summary['medium']}
- Low: {risk_summary['low']}

Total Clauses Analyzed: {len(clauses)}

High-Risk Findings:
{chr(10).join(high_risk_details) if high_risk_details else 'None identified.'}
"""

    report = await get_completion(
        system_prompt=SUMMARY_SYSTEM_PROMPT,
        user_prompt=context,
        temperature=0.2,
        max_tokens=4000,
    )

    # Store the summary on the contract
    contract.summary = report
    await db.flush()

    return report
