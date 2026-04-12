"""Semantic search over contract clauses using pgvector."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.clause import Clause
from app.models.contract import Contract
from app.services.ai_service import get_embedding


async def semantic_search(
    db: AsyncSession,
    query: str,
    user_id: uuid.UUID,
    contract_id: uuid.UUID | None = None,
    top_k: int = 10,
) -> list[dict]:
    """
    Search across clause embeddings for the most relevant matches.
    Always scoped to the authenticated user's contracts for security.
    Optionally further scoped to a single contract.
    """
    query_embedding = await get_embedding(query)

    # Join with contracts to enforce user_id ownership
    stmt = (
        select(
            Clause,
            Clause.embedding.cosine_distance(query_embedding).label("distance"),
        )
        .join(Contract, Clause.contract_id == Contract.id)
        .where(Contract.user_id == user_id)
        .where(Clause.embedding.isnot(None))
    )

    if contract_id:
        stmt = stmt.where(Clause.contract_id == contract_id)

    stmt = stmt.order_by("distance").limit(top_k)

    result = await db.execute(stmt)
    rows = result.all()

    search_results = []
    for clause, distance in rows:
        search_results.append({
            "clause_id": clause.id,
            "contract_id": clause.contract_id,
            "clause_text": clause.clause_text,
            "clause_type": clause.clause_type,
            "risk_level": clause.risk_level,
            "similarity_score": round(1.0 - distance, 4),
            "section_heading": clause.section_heading,
        })

    return search_results
