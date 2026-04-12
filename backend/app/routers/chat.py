"""Chat routes — RAG-powered conversation with contracts via SSE streaming."""

import time
import uuid
import json
import logging
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.exceptions import AppException
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatMessageResponse, ChatHistoryResponse
from app.services.contract_service import get_contract
from app.services.chat_service import chat_with_contract, retrieve_relevant_clauses, get_chat_history

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])

# ── Simple in-memory rate limiter (per-user, 10 msgs / 60s) ──────────────────
_rate_buckets: dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT = 10
_RATE_WINDOW = 60  # seconds


def _check_rate_limit(user_id: uuid.UUID) -> None:
    key = str(user_id)
    now = time.time()
    # Prune old entries
    _rate_buckets[key] = [t for t in _rate_buckets[key] if now - t < _RATE_WINDOW]
    if len(_rate_buckets[key]) >= _RATE_LIMIT:
        raise AppException(
            status_code=429,
            detail="Too many requests. Please wait before sending another message.",
            error_code="RATE_LIMIT_EXCEEDED",
        )
    _rate_buckets[key].append(now)


@router.post("/{contract_id}")
async def chat(
    contract_id: uuid.UUID,
    payload: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a message about a contract and receive a streamed AI response via SSE."""
    contract = await get_contract(db, contract_id)
    if not contract or contract.user_id != current_user.id:
        raise AppException(status_code=404, detail="Contract not found", error_code="CONTRACT_NOT_FOUND")

    if contract.status != "analyzed":
        raise AppException(
            status_code=400,
            detail="Contract analysis must complete before using chat",
            error_code="CONTRACT_NOT_ANALYZED",
        )

    if not payload.message or not payload.message.strip():
        raise AppException(status_code=400, detail="Message cannot be empty", error_code="VALIDATION_ERROR")

    _check_rate_limit(current_user.id)

    async def event_stream():
        try:
            # First event: send context clause IDs so frontend can highlight them
            context_clauses = await retrieve_relevant_clauses(db, contract_id, payload.message)
            clause_ids = [str(c.id) for c in context_clauses]
            yield f"data: {json.dumps({'type': 'context', 'clause_ids': clause_ids})}\n\n"

            # Stream tokens — pass pre-fetched clauses to avoid a second vector search
            async for chunk in chat_with_contract(
                db, contract_id, current_user.id, payload.message,
                prefetched_clauses=context_clauses,
            ):
                yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"

            await db.commit()
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except Exception as e:
            logger.error(f"Chat stream error: {e}")
            await db.rollback()
            yield f"data: {json.dumps({'type': 'error', 'detail': 'Analysis service temporarily unavailable'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/{contract_id}/history", response_model=ChatHistoryResponse)
async def get_history(
    contract_id: uuid.UUID,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get paginated chat history for a contract."""
    contract = await get_contract(db, contract_id)
    if not contract or contract.user_id != current_user.id:
        raise AppException(status_code=404, detail="Contract not found", error_code="CONTRACT_NOT_FOUND")

    page_size = min(page_size, 100)
    skip = (page - 1) * page_size
    messages, total = await get_chat_history(db, contract_id, skip=skip, limit=page_size)
    return ChatHistoryResponse(
        items=[ChatMessageResponse.model_validate(m) for m in messages],
        contract_id=contract_id,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(skip + page_size) < total,
    )
