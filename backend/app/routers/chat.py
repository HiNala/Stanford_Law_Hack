"""Chat routes — RAG-powered conversation with contracts via SSE streaming."""

import uuid
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatMessageResponse, ChatHistoryResponse
from app.services.contract_service import get_contract
from app.services.chat_service import chat_with_contract, get_chat_history

router = APIRouter(prefix="/chat", tags=["chat"])


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
        raise HTTPException(status_code=404, detail="Contract not found")

    if contract.status != "analyzed":
        raise HTTPException(status_code=400, detail="Contract has not been analyzed yet")

    async def event_stream():
        async for chunk in chat_with_contract(db, contract_id, current_user.id, payload.message):
            yield f"data: {json.dumps({'content': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/{contract_id}/history", response_model=ChatHistoryResponse)
async def get_history(
    contract_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the full chat history for a contract."""
    contract = await get_contract(db, contract_id)
    if not contract or contract.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Contract not found")

    messages = await get_chat_history(db, contract_id)
    return ChatHistoryResponse(
        messages=[ChatMessageResponse.model_validate(m) for m in messages],
        contract_id=contract_id,
    )
