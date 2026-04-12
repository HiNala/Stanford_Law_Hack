"""Contract upload, listing, and retrieval routes."""

import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db, async_session_factory
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.contract import ContractResponse, ContractListResponse, ContractUploadResponse
from app.services.contract_service import (
    create_contract,
    process_contract,
    get_contract,
    get_user_contracts,
    get_contract_clauses,
)

router = APIRouter(prefix="/contracts", tags=["contracts"])


async def _run_pipeline(contract_id: uuid.UUID) -> None:
    """Background task to run the full analysis pipeline."""
    async with async_session_factory() as db:
        try:
            await process_contract(db, contract_id)
            await db.commit()
        except Exception:
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
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    allowed = settings.ALLOWED_EXTENSIONS.split(",")
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"File type .{ext} not supported. Allowed: {allowed}")

    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(status_code=400, detail=f"File too large. Max: {settings.MAX_FILE_SIZE_MB}MB")

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
        filename=file.filename,
        status="processing",
        message="Contract uploaded successfully. Analysis has started.",
    )


@router.get("/", response_model=ContractListResponse)
async def list_contracts(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all contracts for the current user."""
    contracts, total = await get_user_contracts(db, current_user.id, skip, limit)
    return ContractListResponse(
        contracts=[ContractResponse.model_validate(c) for c in contracts],
        total=total,
    )


@router.get("/{contract_id}", response_model=ContractResponse)
async def get_contract_detail(
    contract_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get details for a single contract."""
    contract = await get_contract(db, contract_id)
    if not contract or contract.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Contract not found")
    return ContractResponse.model_validate(contract)
