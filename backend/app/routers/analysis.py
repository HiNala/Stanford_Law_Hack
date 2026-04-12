"""Analysis routes — trigger re-analysis, generate reports, get summaries."""

import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, async_session_factory
from app.exceptions import AppException
from app.middleware.auth import get_current_user
from app.models.user import User
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
