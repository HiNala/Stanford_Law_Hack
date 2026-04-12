"""Semantic search over contract clauses using pgvector."""

import uuid

from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.clause import Clause
from app.models.contract import Contract
from app.services.ai_service import get_embedding


async def semantic_search(
    db: AsyncSession,
    query: str,
    user_id: uuid.UUID,
    contract_id: uuid.UUID | None = None,
    contract_ids: list[uuid.UUID] | None = None,
    top_k: int = 10,
) -> list[dict]:
    """
    Search across clause embeddings for the most relevant matches.
    Always scoped to the authenticated user's contracts for security.
    Optionally further scoped to specific contract(s).
    Falls back to keyword search when no embeddings are available.
    """
    query_embedding = await get_embedding(query)

    # Base filter: user-owned contracts with embeddings
    base_stmt = (
        select(
            Clause,
            Contract.title,
            Clause.embedding.cosine_distance(query_embedding).label("distance"),
        )
        .join(Contract, Clause.contract_id == Contract.id)
        .where(Contract.user_id == user_id)
        .where(Clause.embedding.isnot(None))
    )

    if contract_id:
        base_stmt = base_stmt.where(Clause.contract_id == contract_id)
    elif contract_ids:
        base_stmt = base_stmt.where(Clause.contract_id.in_(contract_ids))

    base_stmt = base_stmt.order_by("distance").limit(top_k)

    result = await db.execute(base_stmt)
    rows = result.all()

    # --- Vector results found: return them directly ---
    if rows:
        return [
            {
                "clause_id": clause.id,
                "contract_id": clause.contract_id,
                "contract_title": contract_title,
                "clause_text": clause.clause_text,
                "clause_type": clause.clause_type,
                "risk_level": clause.risk_level,
                "similarity_score": round(1.0 - distance, 4),
                "section_heading": clause.section_heading,
            }
            for clause, contract_title, distance in rows
        ]

    # --- Fallback: keyword search across clause_text and explanation ---
    words = [w.strip() for w in query.lower().split() if len(w.strip()) > 2]
    if not words:
        return []

    # Build OR filter: any word appears in clause_text or explanation
    filters = [
        or_(
            func.lower(Clause.clause_text).contains(word),
            func.lower(Clause.explanation).contains(word),
            func.lower(Clause.clause_type).contains(word),
        )
        for word in words[:5]  # cap to 5 keywords to keep query fast
    ]

    fallback_stmt = (
        select(Clause, Contract.title)
        .join(Contract, Clause.contract_id == Contract.id)
        .where(Contract.user_id == user_id)
        .where(or_(*filters))
    )

    if contract_id:
        fallback_stmt = fallback_stmt.where(Clause.contract_id == contract_id)
    elif contract_ids:
        fallback_stmt = fallback_stmt.where(Clause.contract_id.in_(contract_ids))

    # Sort by risk score descending so most dangerous clauses surface first
    fallback_stmt = fallback_stmt.order_by(Clause.risk_score.desc().nulls_last()).limit(top_k)

    fallback_result = await db.execute(fallback_stmt)
    fallback_rows = fallback_result.all()

    return [
        {
            "clause_id": clause.id,
            "contract_id": clause.contract_id,
            "contract_title": contract_title,
            "clause_text": clause.clause_text,
            "clause_type": clause.clause_type,
            "risk_level": clause.risk_level,
            "similarity_score": 0.70,  # placeholder score for keyword matches
            "section_heading": clause.section_heading,
        }
        for clause, contract_title in fallback_rows
    ]
