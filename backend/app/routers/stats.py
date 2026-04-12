"""Dashboard statistics routes."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.contract import Contract
from app.models.clause import Clause

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return aggregate statistics for the user's dashboard."""
    user_id = current_user.id

    # Total contracts
    total_q = await db.execute(
        select(func.count(Contract.id)).where(Contract.user_id == user_id)
    )
    total_contracts = total_q.scalar() or 0

    # Contracts by status
    status_q = await db.execute(
        select(Contract.status, func.count(Contract.id))
        .where(Contract.user_id == user_id)
        .group_by(Contract.status)
    )
    contracts_by_status = dict(status_q.all())

    # Average risk score
    avg_q = await db.execute(
        select(func.avg(Contract.overall_risk_score))
        .where(Contract.user_id == user_id)
        .where(Contract.overall_risk_score.isnot(None))
    )
    average_risk_score = round(float(avg_q.scalar() or 0), 3)

    # Highest risk contract
    highest_q = await db.execute(
        select(Contract.id, Contract.title, Contract.original_filename, Contract.overall_risk_score)
        .where(Contract.user_id == user_id)
        .where(Contract.overall_risk_score.isnot(None))
        .order_by(Contract.overall_risk_score.desc())
        .limit(1)
    )
    highest_row = highest_q.first()
    highest_risk_contract = None
    if highest_row:
        highest_risk_contract = {
            "id": str(highest_row.id),
            "title": highest_row.title or highest_row.original_filename,
            "risk_score": highest_row.overall_risk_score,
        }

    # Risk distribution across all clauses
    risk_q = await db.execute(
        select(Clause.risk_level, func.count(Clause.id))
        .join(Contract, Clause.contract_id == Contract.id)
        .where(Contract.user_id == user_id)
        .where(Clause.risk_level.isnot(None))
        .group_by(Clause.risk_level)
    )
    risk_dist_raw = dict(risk_q.all())
    risk_distribution = {
        "critical": risk_dist_raw.get("critical", 0),
        "high": risk_dist_raw.get("high", 0),
        "medium": risk_dist_raw.get("medium", 0),
        "low": risk_dist_raw.get("low", 0),
    }

    return {
        "total_contracts": total_contracts,
        "contracts_by_status": contracts_by_status,
        "average_risk_score": average_risk_score,
        "highest_risk_contract": highest_risk_contract,
        "risk_distribution": risk_distribution,
    }
