"""Pydantic schemas for chat messages."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Schema for sending a chat message."""
    message: str = Field(..., max_length=2000, description="User question about the contract")
    contract_id: uuid.UUID | None = None


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
    """Schema for returning chat history with pagination."""
    items: list[ChatMessageResponse]
    contract_id: uuid.UUID
    total: int = 0
    page: int = 1
    page_size: int = 50
    has_more: bool = False


class SearchRequest(BaseModel):
    """Schema for semantic search."""
    query: str = Field(..., description="Natural language search query")
    contract_ids: list[uuid.UUID] = Field(default_factory=list, description="Contract IDs to search within (empty = all)")
    contract_id: uuid.UUID | None = Field(None, description="Single contract filter (backwards compat)")
    limit: int = Field(10, ge=1, le=50)
    top_k: int = Field(10, ge=1, le=50, description="Alias for limit")


class SearchResult(BaseModel):
    """A single search result."""
    clause_id: uuid.UUID
    contract_id: uuid.UUID
    contract_title: str | None = None
    clause_text: str
    clause_type: str | None
    risk_level: str | None
    similarity_score: float
    section_heading: str | None


class SearchResponse(BaseModel):
    """Schema for search results."""
    results: list[SearchResult]
    query: str
    total_results: int
