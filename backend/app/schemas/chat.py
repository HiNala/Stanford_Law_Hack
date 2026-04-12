"""Pydantic schemas for chat messages."""

import uuid
from datetime import datetime

from pydantic import BaseModel


class ChatRequest(BaseModel):
    """Schema for sending a chat message."""
    message: str
    contract_id: uuid.UUID


class ChatMessageResponse(BaseModel):
    """Schema for returning a chat message."""
    id: uuid.UUID
    contract_id: uuid.UUID
    role: str
    content: str
    context_clause_ids: list[uuid.UUID] | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatHistoryResponse(BaseModel):
    """Schema for returning chat history."""
    messages: list[ChatMessageResponse]
    contract_id: uuid.UUID


class SearchRequest(BaseModel):
    """Schema for semantic search."""
    query: str
    contract_id: uuid.UUID | None = None
    top_k: int = 5


class SearchResult(BaseModel):
    """A single search result."""
    clause_id: uuid.UUID
    contract_id: uuid.UUID
    clause_text: str
    clause_type: str | None
    risk_level: str | None
    similarity_score: float
    section_heading: str | None


class SearchResponse(BaseModel):
    """Schema for search results."""
    results: list[SearchResult]
    query: str
    total: int
