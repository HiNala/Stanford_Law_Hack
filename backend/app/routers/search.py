"""Semantic search routes — search across contract clauses using vector similarity."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.chat import SearchRequest, SearchResponse, SearchResult
from app.services.search_service import semantic_search

router = APIRouter(prefix="/search", tags=["search"])


@router.post("/", response_model=SearchResponse)
async def search_clauses(
    payload: SearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Search for relevant clauses across contracts using semantic similarity."""
    # Support both contract_id (single) and contract_ids (list)
    cid = payload.contract_id
    cids = payload.contract_ids if payload.contract_ids else None
    limit = max(payload.limit, payload.top_k)

    results = await semantic_search(
        db=db,
        query=payload.query,
        user_id=current_user.id,
        contract_id=cid,
        contract_ids=cids,
        top_k=limit,
    )
    return SearchResponse(
        results=[SearchResult(**r) for r in results],
        query=payload.query,
        total_results=len(results),
    )
