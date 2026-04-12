"""Contract lifecycle management — upload, processing pipeline, retrieval."""

import os
import uuid
import logging

from sqlalchemy import select, delete, func, asc, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.contract import Contract
from app.models.clause import Clause
from app.services.parsing_service import extract_text
from app.services.chunking_service import chunk_contract_text
from app.services.embedding_service import embed_clauses
from app.services.analysis_service import analyze_all_clauses, extract_contract_metadata
from app.utils.text_processing import clean_text

logger = logging.getLogger(__name__)


async def create_contract(
    db: AsyncSession,
    user_id: uuid.UUID,
    filename: str,
    original_filename: str,
    file_path: str,
    file_type: str,
    file_size_bytes: int,
) -> Contract:
    """Create a new contract record in the database."""
    contract = Contract(
        user_id=user_id,
        filename=filename,
        original_filename=original_filename,
        file_path=file_path,
        file_type=file_type,
        file_size_bytes=file_size_bytes,
        status="uploaded",
    )
    db.add(contract)
    await db.flush()
    return contract


async def process_contract(db: AsyncSession, contract_id: uuid.UUID) -> Contract:
    """
    Run the full analysis pipeline on a contract:
    1. Extract text
    2. Chunk into clauses
    3. Generate embeddings
    4. Run risk analysis
    5. Extract metadata
    """
    result = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = result.scalar_one_or_none()
    if not contract:
        raise ValueError(f"Contract {contract_id} not found")

    try:
        contract.status = "processing"
        await db.flush()

        # Remove any clauses from a previous (possibly failed) run before creating new ones
        await db.execute(delete(Clause).where(Clause.contract_id == contract_id))
        await db.flush()

        # Step 1: Extract text
        logger.info(f"Extracting text from {contract.file_path}")
        raw_text = extract_text(contract.file_path, contract.file_type)
        raw_text = clean_text(raw_text)
        contract.raw_text = raw_text
        await db.flush()

        # Step 2: Chunk into clauses
        logger.info(f"Chunking contract {contract_id}")
        chunks = chunk_contract_text(raw_text)

        if not chunks:
            raise ValueError("No text content could be extracted or chunked from this file.")

        for chunk in chunks:
            clause = Clause(
                contract_id=contract_id,
                clause_index=chunk["clause_index"],
                clause_text=chunk["clause_text"],
                start_char=chunk["start_char"],
                end_char=chunk["end_char"],
                section_heading=chunk.get("section_heading"),
            )
            db.add(clause)
        await db.flush()

        # Step 3: Generate embeddings
        logger.info(f"Generating embeddings for {len(chunks)} clauses")
        await embed_clauses(db, contract_id)

        # Step 4: Run risk analysis
        logger.info(f"Running risk analysis on {len(chunks)} clauses")
        await analyze_all_clauses(db, contract_id)

        # Step 5: Extract metadata
        logger.info(f"Extracting metadata for contract {contract_id}")
        await extract_contract_metadata(db, contract_id)

        contract.status = "analyzed"
        await db.flush()

    except Exception as e:
        logger.error(f"Pipeline failed for contract {contract_id}: {e}")
        contract.status = "error"
        contract.metadata_ = {"error": str(e)}
        await db.flush()
        raise

    return contract


async def get_contract(db: AsyncSession, contract_id: uuid.UUID) -> Contract | None:
    """Fetch a single contract by ID."""
    result = await db.execute(select(Contract).where(Contract.id == contract_id))
    return result.scalar_one_or_none()


async def get_user_contracts(
    db: AsyncSession,
    user_id: uuid.UUID,
    skip: int = 0,
    limit: int = 50,
    status_filter: str | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> tuple[list[Contract], int]:
    """Fetch all contracts for a user with pagination, filtering, and sorting."""
    base = select(Contract).where(Contract.user_id == user_id)

    if status_filter:
        base = base.where(Contract.status == status_filter)

    # Count total matching rows
    count_result = await db.execute(
        select(func.count()).select_from(base.subquery())
    )
    total = count_result.scalar() or 0

    # Determine sort column
    sort_columns = {
        "created_at": Contract.created_at,
        "overall_risk_score": Contract.overall_risk_score,
        "title": Contract.title,
    }
    sort_col = sort_columns.get(sort_by, Contract.created_at)
    order = sort_col.asc() if sort_order == "asc" else sort_col.desc()

    result = await db.execute(
        base.order_by(order).offset(skip).limit(limit)
    )
    contracts = list(result.scalars().all())
    return contracts, total


async def get_contract_clauses(
    db: AsyncSession, contract_id: uuid.UUID
) -> list[Clause]:
    """Fetch all clauses for a contract, ordered by index."""
    result = await db.execute(
        select(Clause)
        .where(Clause.contract_id == contract_id)
        .order_by(Clause.clause_index)
    )
    return list(result.scalars().all())
