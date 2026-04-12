"""Contract upload, listing, and retrieval routes."""

import logging
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db, async_session_factory
from app.exceptions import AppException
from app.middleware.auth import get_current_user
from app.models.contract import Contract
from app.models.user import User
from app.schemas.contract import (
    ContractResponse,
    ContractListItem,
    ContractListResponse,
    ContractUploadResponse,
    RiskDistributionInline,
)
from app.services.contract_service import (
    create_contract,
    process_contract,
    get_contract,
    get_user_contracts,
    get_contract_clauses,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/contracts", tags=["contracts"])


async def _run_pipeline(contract_id: uuid.UUID) -> None:
    """Background task to run the full analysis pipeline."""
    pipeline_error: Exception | None = None

    # Phase 1: run the analysis pipeline
    async with async_session_factory() as db:
        try:
            await process_contract(db, contract_id)
            await db.commit()
        except Exception as e:
            pipeline_error = e
            await db.rollback()

    # Phase 2: if pipeline failed, persist the error status in a clean transaction
    if pipeline_error is not None:
        logger.error(f"Pipeline failed for {contract_id}: {pipeline_error}")
        async with async_session_factory() as db:
            try:
                result = await db.execute(select(Contract).where(Contract.id == contract_id))
                contract = result.scalar_one_or_none()
                if contract:
                    contract.status = "error"
                    contract.metadata_ = {"error": str(pipeline_error)[:500]}
                await db.commit()
            except Exception as e2:
                logger.error(f"Failed to save error state for {contract_id}: {e2}")
                await db.rollback()


@router.post("/upload", response_model=ContractUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_contract(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a contract file and kick off the analysis pipeline."""
    if not file.filename:
        raise AppException(status_code=400, detail="No filename provided", error_code="VALIDATION_ERROR")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    allowed = settings.ALLOWED_EXTENSIONS.split(",")
    if ext not in allowed:
        raise AppException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed)}",
            error_code="UNSUPPORTED_FILE_TYPE",
        )

    content = await file.read()
    if len(content) == 0:
        raise AppException(status_code=400, detail="Uploaded file is empty", error_code="EMPTY_FILE")

    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.MAX_FILE_SIZE_MB:
        raise AppException(
            status_code=413,
            detail=f"File size exceeds maximum allowed ({settings.MAX_FILE_SIZE_MB}MB)",
            error_code="FILE_TOO_LARGE",
        )

    # Save to disk
    unique_name = f"{uuid.uuid4().hex}_{file.filename}"
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)
    with open(file_path, "wb") as f:
        f.write(content)

    # Create DB record
    contract = await create_contract(
        db=db,
        user_id=current_user.id,
        filename=unique_name,
        original_filename=file.filename,
        file_path=file_path,
        file_type=ext,
        file_size_bytes=len(content),
    )

    # Kick off pipeline in background
    background_tasks.add_task(_run_pipeline, contract.id)

    return ContractUploadResponse(
        id=contract.id,
        original_filename=file.filename,
        file_type=ext,
        file_size_bytes=len(content),
        status="processing",
        created_at=contract.created_at,
        message="Contract uploaded successfully. Analysis in progress.",
    )


@router.get("/", response_model=ContractListResponse)
async def list_contracts(
    page: int = 1,
    page_size: int = 20,
    status: str | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all contracts for the current user with pagination."""
    page_size = min(page_size, 100)
    skip = (page - 1) * page_size
    contracts, total = await get_user_contracts(
        db,
        current_user.id,
        skip,
        page_size,
        status_filter=status,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return ContractListResponse(
        items=[ContractListItem.model_validate(c) for c in contracts],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(skip + page_size) < total,
    )


@router.get("/{contract_id}", response_model=ContractResponse)
async def get_contract_detail(
    contract_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get details for a single contract."""
    contract = await get_contract(db, contract_id)
    if not contract:
        raise AppException(status_code=404, detail="Contract not found", error_code="CONTRACT_NOT_FOUND")
    if contract.user_id != current_user.id:
        raise AppException(status_code=403, detail="You do not have access to this contract", error_code="FORBIDDEN")

    # Compute risk_distribution from clauses
    clauses = await get_contract_clauses(db, contract_id)
    dist = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for c in clauses:
        level = c.risk_level or "low"
        if level in dist:
            dist[level] += 1

    resp = ContractResponse.model_validate(contract)
    resp.risk_distribution = RiskDistributionInline(**dist)
    return resp


@router.delete("/{contract_id}")
async def delete_contract(
    contract_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a contract and all associated clauses and chat messages."""
    contract = await get_contract(db, contract_id)
    if not contract:
        raise AppException(status_code=404, detail="Contract not found", error_code="CONTRACT_NOT_FOUND")
    if contract.user_id != current_user.id:
        raise AppException(status_code=403, detail="You do not have access to this contract", error_code="FORBIDDEN")
    if contract.status == "processing":
        raise AppException(status_code=409, detail="Cannot delete a contract that is currently being processed", error_code="CONTRACT_PROCESSING")

    # Delete file from disk
    if contract.file_path and os.path.exists(contract.file_path):
        try:
            os.remove(contract.file_path)
        except OSError:
            logger.warning(f"Could not delete file: {contract.file_path}")

    await db.delete(contract)
    await db.commit()
    return {"detail": "Contract deleted successfully"}


@router.get("/{contract_id}/status")
async def get_contract_status(
    contract_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lightweight endpoint for polling processing status."""
    contract = await get_contract(db, contract_id)
    if not contract or contract.user_id != current_user.id:
        raise AppException(status_code=404, detail="Contract not found", error_code="CONTRACT_NOT_FOUND")

    clauses = await get_contract_clauses(db, contract_id) if contract.status in ("processing", "analyzed") else []
    analyzed = sum(1 for c in clauses if c.risk_level is not None)
    total = len(clauses)

    progress = None
    if contract.status == "processing" and total > 0:
        progress = {
            "stage": "analyzing_clauses" if analyzed < total else "extracting_metadata",
            "clauses_analyzed": analyzed,
            "total_clauses": total,
            "percent_complete": int((analyzed / total) * 100) if total else 0,
        }

    return {
        "id": contract.id,
        "status": contract.status,
        "overall_risk_score": contract.overall_risk_score,
        "risk_level": contract.risk_level,
        "progress": progress,
    }
