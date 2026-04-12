"""Clause retrieval routes — get clauses for a specific contract."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.clause import ClauseResponse, ClauseListResponse, ContractAnalysisSummary, RiskDistribution
from app.services.contract_service import get_contract, get_contract_clauses

router = APIRouter(prefix="/clauses", tags=["clauses"])


@router.get("/{contract_id}", response_model=ClauseListResponse)
async def list_clauses(
    contract_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all clauses for a contract, ordered by position."""
    contract = await get_contract(db, contract_id)
    if not contract or contract.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Contract not found")

    clauses = await get_contract_clauses(db, contract_id)
    return ClauseListResponse(
        clauses=[ClauseResponse.model_validate(c) for c in clauses],
        total=len(clauses),
    )


@router.get("/{contract_id}/summary", response_model=ContractAnalysisSummary)
async def get_analysis_summary(
    contract_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a high-level risk summary for a contract."""
    contract = await get_contract(db, contract_id)
    if not contract or contract.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Contract not found")

    clauses = await get_contract_clauses(db, contract_id)

    dist = RiskDistribution()
    top_risks = []
    for c in clauses:
        level = c.risk_level or "low"
        if level == "critical":
            dist.critical += 1
        elif level == "high":
            dist.high += 1
        elif level == "medium":
            dist.medium += 1
        else:
            dist.low += 1

        if level in ("high", "critical"):
            top_risks.append(ClauseResponse.model_validate(c))

    top_risks.sort(key=lambda x: x.risk_score or 0, reverse=True)

    return ContractAnalysisSummary(
        contract_id=contract_id,
        overall_risk_score=contract.overall_risk_score,
        risk_level=contract.risk_level,
        risk_distribution=dist,
        total_clauses=len(clauses),
        top_risks=top_risks[:10],
    )
