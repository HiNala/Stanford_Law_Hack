"""Generate and store vector embeddings for contract clauses."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.clause import Clause
from app.services.ai_service import get_embeddings_batch


async def embed_clauses(db: AsyncSession, contract_id: uuid.UUID) -> int:
    """
    Generate embeddings for all clauses of a contract and store them.

    Returns the number of clauses embedded.
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

    # Batch in groups of 100 to stay within limits
    batch_size = 100
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i : i + batch_size]
        batch_clauses = clauses[i : i + batch_size]
        embeddings = await get_embeddings_batch(batch_texts)

        for clause, embedding in zip(batch_clauses, embeddings):
            clause.embedding = embedding

    await db.flush()
    return len(clauses)
