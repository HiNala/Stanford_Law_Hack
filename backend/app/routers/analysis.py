"""Analysis routes — trigger re-analysis, generate reports, get summaries."""

import uuid
import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, async_session_factory
from app.exceptions import AppException
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.contract import Contract as ContractModel
from app.models.clause import Clause as ClauseModel
from app.services.contract_service import get_contract, get_contract_clauses, process_contract
from app.services.summary_service import generate_summary_report

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analysis", tags=["analysis"])


class ReanalyzeRequest(BaseModel):
    """Optional body for re-analyze."""
    force_reanalyze: bool = False


@router.post("/{contract_id}/analyze", status_code=status.HTTP_202_ACCEPTED)
async def trigger_analysis(
    contract_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    payload: ReanalyzeRequest | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually trigger (or re-trigger) analysis for a contract."""
    contract = await get_contract(db, contract_id)
    if not contract or contract.user_id != current_user.id:
        raise AppException(status_code=404, detail="Contract not found", error_code="CONTRACT_NOT_FOUND")

    if contract.status == "processing":
        raise AppException(status_code=409, detail="Analysis is already in progress", error_code="ANALYSIS_IN_PROGRESS")

    if not contract.raw_text and contract.status != "uploaded":
        raise AppException(
            status_code=400,
            detail="No text could be extracted from this contract. Please verify the file is not corrupt or empty.",
            error_code="NO_EXTRACTED_TEXT",
        )

    async def _reanalyze(cid: uuid.UUID):
        async with async_session_factory() as session:
            try:
                await process_contract(session, cid)
                await session.commit()
            except Exception as e:
                logger.error(f"Re-analysis failed for {cid}: {e}")
                await session.rollback()
                # Mark contract as error so it doesn't stay stuck in processing
                try:
                    from sqlalchemy import update as sa_update
                    from app.models.contract import Contract as ContractModel
                    async with async_session_factory() as err_session:
                        await err_session.execute(
                            sa_update(ContractModel)
                            .where(ContractModel.id == cid)
                            .values(status="error")
                        )
                        await err_session.commit()
                except Exception as inner_e:
                    logger.error(f"Failed to set error status for {cid}: {inner_e}")

    background_tasks.add_task(_reanalyze, contract_id)

    return {
        "detail": "Analysis started",
        "contract_id": str(contract_id),
        "status": "processing",
    }


@router.post("/{contract_id}/report")
async def generate_report(
    contract_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a comprehensive due diligence summary report."""
    contract = await get_contract(db, contract_id)
    if not contract or contract.user_id != current_user.id:
        raise AppException(status_code=404, detail="Contract not found", error_code="CONTRACT_NOT_FOUND")

    if contract.status != "analyzed":
        raise AppException(status_code=400, detail="Contract has not been analyzed yet", error_code="CONTRACT_NOT_ANALYZED")

    report = await generate_summary_report(db, contract_id)
    return {"contract_id": contract_id, "report": report}


@router.get("/{contract_id}/summary")
async def get_contract_summary(
    contract_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return AI-generated summary and key findings per MISSION-04 spec."""
    contract = await get_contract(db, contract_id)
    if not contract or contract.user_id != current_user.id:
        raise AppException(status_code=404, detail="Contract not found", error_code="CONTRACT_NOT_FOUND")

    clauses = await get_contract_clauses(db, contract_id)

    # Build risk distribution and separate findings by severity
    risk_dist = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    critical_findings = []
    material_findings = []
    clause_types_seen = set()

    for c in clauses:
        level = c.risk_level or "low"
        risk_dist[level] = risk_dist.get(level, 0) + 1
        if c.clause_type:
            clause_types_seen.add(c.clause_type)

        finding = {
            "finding": c.explanation or c.clause_text[:200],
            "risk_level": level,
            "clause_id": str(c.id),
            "section": c.section_heading or c.clause_type or "Unknown",
            "recommendation": c.suggestion,
            "confidence": c.metadata_.get("confidence") if c.metadata_ else None,
        }
        if level == "critical":
            critical_findings.append(finding)
        elif level == "high":
            material_findings.append(finding)

    # Detect missing standard provisions
    standard_provisions = {
        "indemnification", "limitation_of_liability", "confidentiality",
        "governing_law", "dispute_resolution", "termination_convenience",
        "data_privacy", "force_majeure", "insurance", "warranty",
    }
    missing_provisions = sorted(standard_provisions - clause_types_seen)

    # Build recommended actions from suggestions (critical first)
    all_findings = critical_findings + material_findings
    recommended_actions = [
        f.get("recommendation") for f in all_findings if f.get("recommendation")
    ][:8]

    return {
        "contract_id": str(contract_id),
        "title": contract.title or contract.original_filename,
        "executive_summary": contract.summary or "Summary not yet generated. Use the /report endpoint to generate one.",
        "critical_findings": critical_findings,
        "material_findings": material_findings,
        "key_findings": (critical_findings + material_findings)[:10],
        "risk_distribution": risk_dist,
        "missing_provisions": missing_provisions,
        "recommended_actions": recommended_actions,
        "clause_types": sorted(clause_types_seen),
    }


class PortfolioReportRequest(BaseModel):
    contract_ids: List[str] | None = None  # None = all user contracts


@router.post("/portfolio-report")
async def generate_portfolio_report(
    payload: PortfolioReportRequest | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a strategic risk report across multiple contracts (or the entire portfolio).
    Returns aggregated findings, contract triage, priority action items, and cross-contract patterns.
    """
    # Resolve which contracts to include
    if payload and payload.contract_ids:
        contract_result = await db.execute(
            select(ContractModel)
            .where(
                ContractModel.user_id == current_user.id,
                ContractModel.id.in_([uuid.UUID(cid) for cid in payload.contract_ids]),
            )
        )
    else:
        contract_result = await db.execute(
            select(ContractModel)
            .where(
                ContractModel.user_id == current_user.id,
                ContractModel.status == "analyzed",
            )
            .order_by(ContractModel.created_at.desc())
        )

    contracts = list(contract_result.scalars().all())
    if not contracts:
        raise AppException(
            status_code=404,
            detail="No analyzed contracts found for portfolio report",
            error_code="NO_ANALYZED_CONTRACTS",
        )

    # Gather all clauses
    contract_ids = [c.id for c in contracts]
    clause_result = await db.execute(
        select(ClauseModel).where(ClauseModel.contract_id.in_(contract_ids))
    )
    all_clauses = list(clause_result.scalars().all())

    # Build contract ID → contract map
    contract_map = {str(c.id): c for c in contracts}

    # ── Aggregate statistics ──────────────────────────────────────────────────
    risk_dist = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for clause in all_clauses:
        level = clause.risk_level or "low"
        risk_dist[level] = risk_dist.get(level, 0) + 1

    total_findings = sum(risk_dist.values())
    avg_risk = (
        sum((c.overall_risk_score or 0) for c in contracts) / len(contracts)
        if contracts else 0.0
    )

    # ── Contract triage ───────────────────────────────────────────────────────
    immediate_attention = []
    renegotiation_recommended = []
    acceptable_as_is = []

    for contract in contracts:
        risk_score = contract.overall_risk_score or 0.0
        clauses_for_contract = [c for c in all_clauses if c.contract_id == contract.id]
        crit = sum(1 for c in clauses_for_contract if c.risk_level == "critical")
        high = sum(1 for c in clauses_for_contract if c.risk_level == "high")

        triage_entry = {
            "contract_id": str(contract.id),
            "title": contract.title or contract.original_filename,
            "risk_score": round(risk_score, 2),
            "risk_level": contract.risk_level or "unknown",
            "critical_findings": crit,
            "high_findings": high,
            "governing_law": contract.governing_law,
            "contract_type": contract.contract_type,
            "parties": (
                contract.parties.get("names", []) if isinstance(contract.parties, dict) else []
            ),
            "summary": contract.summary[:250] + "…" if contract.summary and len(contract.summary) > 250 else contract.summary,
        }

        if risk_score >= 0.70 or crit >= 2:
            immediate_attention.append(triage_entry)
        elif risk_score >= 0.40 or crit >= 1 or high >= 2:
            renegotiation_recommended.append(triage_entry)
        else:
            acceptable_as_is.append(triage_entry)

    # Sort each tier by risk score descending
    for tier in (immediate_attention, renegotiation_recommended, acceptable_as_is):
        tier.sort(key=lambda x: x["risk_score"], reverse=True)

    # ── Priority action items ─────────────────────────────────────────────────
    # Take top 6 critical then top 4 high clauses, sorted by risk score
    critical_clauses = sorted(
        [c for c in all_clauses if c.risk_level == "critical"],
        key=lambda c: c.risk_score or 0,
        reverse=True,
    )[:6]
    high_clauses = sorted(
        [c for c in all_clauses if c.risk_level == "high"],
        key=lambda c: c.risk_score or 0,
        reverse=True,
    )[:4]

    action_items = []
    for priority_idx, clause in enumerate(critical_clauses + high_clauses, start=1):
        contract = contract_map.get(str(clause.contract_id))
        contract_title = contract.title or contract.original_filename if contract else "Unknown"

        # Determine recommended assignee based on risk level and clause type
        senior_types = {"indemnification", "change_of_control", "ip_ownership", "non_compete"}
        assignee = "Partner — requires strategic judgment" if clause.clause_type in senior_types else "Senior Associate"

        # Effort estimate based on clause type
        effort_map = {
            "indemnification": "4–8 hours drafting + partner review",
            "change_of_control": "2–4 hours — negotiate consent or waiver",
            "non_compete": "1–2 hours — likely removal or narrow scope",
            "ip_ownership": "3–6 hours — restructure work-for-hire provisions",
            "data_privacy": "2–4 hours — negotiate DPA and data use restrictions",
            "auto_renewal": "1 hour — extend cancellation window to 60–90 days",
            "limitation_of_liability": "2–3 hours — negotiate cap and carve-outs",
        }
        effort = effort_map.get(clause.clause_type or "", "2–4 hours")

        # Include legal reference if available
        legal_ref = None
        if clause.metadata_ and clause.metadata_.get("legal_grounding"):
            grounding = clause.metadata_["legal_grounding"]
            if grounding.get("citations"):
                first_cit = grounding["citations"][0]
                legal_ref = f"{first_cit['citation']} — {first_cit['summary'][:120]}…"

        action_items.append({
            "priority": priority_idx,
            "action": (
                clause.suggestion
                or f"Review and renegotiate {(clause.clause_type or 'clause').replace('_', ' ')} in {contract_title}"
            ),
            "risk_level": clause.risk_level,
            "contract_title": contract_title,
            "contract_id": str(clause.contract_id),
            "clause_id": str(clause.id),
            "section": clause.section_heading or clause.clause_type or "Unknown",
            "rationale": clause.explanation[:300] + "…" if clause.explanation and len(clause.explanation) > 300 else (clause.explanation or ""),
            "effort": effort,
            "recommended_assignee": assignee,
            "legal_reference": legal_ref,
            "trustfoundry_verified": bool(
                clause.metadata_
                and clause.metadata_.get("legal_grounding")
                and clause.metadata_["legal_grounding"].get("verified")
            ),
        })

    # ── Cross-contract patterns ───────────────────────────────────────────────
    patterns = []

    # Detect repeated clause types across contracts
    from collections import defaultdict, Counter
    clause_type_by_contract: dict[str, set] = defaultdict(set)
    for clause in all_clauses:
        if clause.clause_type and clause.risk_level in ("critical", "high"):
            clause_type_by_contract[clause.clause_type].add(str(clause.contract_id))

    for clause_type, affected_contract_ids in sorted(
        clause_type_by_contract.items(), key=lambda x: len(x[1]), reverse=True
    ):
        if len(affected_contract_ids) >= 2:
            titles = [
                contract_map[cid].title or contract_map[cid].original_filename
                for cid in affected_contract_ids
                if cid in contract_map
            ]
            type_display = clause_type.replace("_", " ").title()
            patterns.append({
                "pattern": f"{type_display} Risk",
                "affected_contracts": len(affected_contract_ids),
                "contract_titles": titles[:4],
                "significance": (
                    f"{len(affected_contract_ids)} of {len(contracts)} contracts contain high-risk "
                    f"{type_display.lower()} provisions. This pattern indicates a systemic negotiation "
                    f"gap — your standard contract templates may not adequately protect against these risks."
                ),
                "recommendation": (
                    f"Create a standardized {type_display.lower()} playbook with pre-approved "
                    f"alternative language that associates can apply across all new engagements."
                ),
            })

    # Governing law distribution
    governing_law_counts: Counter = Counter(
        c.governing_law or "Unspecified" for c in contracts
    )
    if len(governing_law_counts) > 1:
        law_summary = ", ".join(f"{k}: {v}" for k, v in governing_law_counts.most_common(4))
        patterns.append({
            "pattern": "Inconsistent Governing Law",
            "affected_contracts": len(contracts),
            "contract_titles": [],
            "significance": (
                f"Portfolio spans {len(governing_law_counts)} different governing jurisdictions "
                f"({law_summary}). Each jurisdiction has materially different rules for "
                f"non-compete enforceability, indemnification limits, and data privacy obligations."
            ),
            "recommendation": (
                "Standardize on a primary governing law jurisdiction where possible. "
                "For multi-jurisdiction portfolios, maintain jurisdiction-specific redline templates."
            ),
        })

    # ── Executive summary ─────────────────────────────────────────────────────
    immediate_count = len(immediate_attention)
    renego_count = len(renegotiation_recommended)
    ok_count = len(acceptable_as_is)

    executive_summary = (
        f"Portfolio analysis across {len(contracts)} contracts identified {total_findings} clauses "
        f"requiring review, including {risk_dist['critical']} critical and {risk_dist['high']} high-risk provisions. "
        f"The average portfolio risk score is {round(avg_risk * 100)}%. "
        f"{immediate_count} contract{'s' if immediate_count != 1 else ''} require{'s' if immediate_count == 1 else ''} "
        f"immediate senior attention before any execution or M&A close, "
        f"{renego_count} should be renegotiated prior to renewal, "
        f"and {ok_count} are acceptable as currently drafted. "
        f"Priority focus areas: {', '.join(list(clause_type_by_contract.keys())[:3]) or 'general contract risk'}."
    )

    # ── Assemble report ───────────────────────────────────────────────────────
    return {
        "report_metadata": {
            "contracts_analyzed": len(contracts),
            "total_clauses_reviewed": len(all_clauses),
            "total_findings": total_findings,
            "generated_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        },
        "risk_overview": {
            "overall_risk_score": round(avg_risk, 2),
            "overall_risk_level": (
                "critical" if avg_risk >= 0.70 else
                "high" if avg_risk >= 0.45 else
                "medium" if avg_risk >= 0.20 else "low"
            ),
            "risk_distribution": risk_dist,
            "contracts_requiring_immediate_attention": immediate_count,
            "contracts_requiring_renegotiation": renego_count,
            "contracts_acceptable_as_is": ok_count,
        },
        "executive_summary": executive_summary,
        "contract_triage": {
            "immediate_attention": immediate_attention,
            "renegotiation_recommended": renegotiation_recommended,
            "acceptable_as_is": acceptable_as_is,
        },
        "priority_action_items": action_items,
        "cross_contract_patterns": patterns[:5],
        "trustfoundry_grounded": sum(
            1 for item in action_items if item.get("trustfoundry_verified")
        ),
    }


@router.get("/{contract_id}/status")
async def get_analysis_status(
    contract_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check the processing status of a contract."""
    contract = await get_contract(db, contract_id)
    if not contract or contract.user_id != current_user.id:
        raise AppException(status_code=404, detail="Contract not found", error_code="CONTRACT_NOT_FOUND")

    return {
        "contract_id": contract_id,
        "status": contract.status,
        "risk_level": contract.risk_level,
        "overall_risk_score": contract.overall_risk_score,
    }
