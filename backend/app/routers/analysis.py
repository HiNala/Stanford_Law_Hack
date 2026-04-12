"""Analysis routes — trigger re-analysis, generate reports, get summaries."""

import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, async_session_factory
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
        raise HTTPException(status_code=404, detail="Contract not found")

    if contract.status == "processing":
        raise HTTPException(status_code=409, detail="Analysis is already in progress")

    if not contract.raw_text and contract.status != "uploaded":
        raise HTTPException(
            status_code=400,
            detail="No text could be extracted from this contract. Please verify the file is not corrupt or empty.",
        )

    async def _reanalyze(cid: uuid.UUID):
        async with async_session_factory() as session:
            try:
                await process_contract(session, cid)
                await session.commit()
            except Exception as e:
                logger.error(f"Re-analysis failed for {cid}: {e}")
                await session.rollback()

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
        raise HTTPException(status_code=404, detail="Contract not found")

    if contract.status != "analyzed":
        raise HTTPException(status_code=400, detail="Contract has not been analyzed yet")

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
        raise HTTPException(status_code=404, detail="Contract not found")

    clauses = await get_contract_clauses(db, contract_id)

    # Build risk distribution
    risk_dist = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    key_findings = []
    for c in clauses:
        level = c.risk_level or "low"
        risk_dist[level] = risk_dist.get(level, 0) + 1
        if level in ("high", "critical"):
            key_findings.append({
                "finding": c.explanation or c.clause_text[:120],
                "risk_level": level,
                "clause_id": str(c.id),
                "recommendation": c.suggestion,
            })

    key_findings.sort(key=lambda x: 0 if x["risk_level"] == "critical" else 1)

    # Build recommended actions from suggestions
    recommended_actions = [
        f.get("recommendation") for f in key_findings if f.get("recommendation")
    ][:6]

    return {
        "contract_id": str(contract_id),
        "title": contract.title or contract.original_filename,
        "executive_summary": contract.summary or "Summary not yet generated. Use the /report endpoint to generate one.",
        "key_findings": key_findings[:10],
        "risk_distribution": risk_dist,
        "recommended_actions": recommended_actions,
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
        raise HTTPException(status_code=404, detail="Contract not found")

    return {
        "contract_id": contract_id,
        "status": contract.status,
        "risk_level": contract.risk_level,
        "overall_risk_score": contract.overall_risk_score,
    }
