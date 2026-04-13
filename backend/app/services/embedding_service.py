"""Generate and store vector embeddings for contract clauses."""

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.clause import Clause
from app.services.ai_service import get_embeddings_batch

logger = logging.getLogger(__name__)


async def embed_clauses(db: AsyncSession, contract_id: uuid.UUID) -> int:
    """Generate embeddings for all clauses and store them.

    Gracefully skips embedding if the API is unavailable — analysis and
    heatmap still work; only semantic RAG search is degraded.
    Returns the number of clauses embedded (0 if skipped).
    """
    result = await db.execute(
        select(Clause)
        .where(Clause.contract_id == contract_id)
        .order_by(Clause.clause_index)
    )
    clauses = list(result.scalars().all())
    if not clauses:
        return 0

    texts = [c.clause_text for c in clauses]

    try:
        batch_size = 20
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i : i + batch_size]
            batch_clauses = clauses[i : i + batch_size]
            embeddings = await get_embeddings_batch(batch_texts)
            for clause, embedding in zip(batch_clauses, embeddings):
                clause.embedding = embedding
        await db.flush()
        logger.info(f"Embedded {len(clauses)} clauses for contract {contract_id}")
        return len(clauses)
    except Exception as exc:
        logger.warning(
            f"Embedding skipped for contract {contract_id} ({exc.__class__.__name__}: {exc}). "
            "Analysis will proceed without semantic search vectors."
        )
        # Leave embeddings as NULL — analysis pipeline continues normally
        return 0
