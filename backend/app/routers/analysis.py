"""Analysis routes — trigger re-analysis and generate reports."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, async_session_factory
from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.contract_service import get_contract
from app.services.summary_service import generate_summary_report

router = APIRouter(prefix="/analysis", tags=["analysis"])


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
