"""Pydantic schemas for contracts."""

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel


class ContractListItem(BaseModel):
    """Schema for contract list items (lightweight)."""
    id: uuid.UUID
    original_filename: str
    title: str | None = None
    file_type: str
    contract_type: str | None = None
    overall_risk_score: float | None = None
    risk_level: str | None = None
    status: str
    parties: Any | None = None
    effective_date: date | None = None
    expiration_date: date | None = None
    governing_law: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ContractResponse(BaseModel):
    """Schema for returning full contract data."""
    id: uuid.UUID
    filename: str
    original_filename: str
    file_type: str
    file_size_bytes: int | None = None
    title: str | None = None
    parties: Any | None = None
    effective_date: date | None = None
    expiration_date: date | None = None
    governing_law: str | None = None
    contract_type: str | None = None
    overall_risk_score: float | None = None
    risk_level: str | None = None
    status: str
    summary: str | None = None
    raw_text: str | None = None
    metadata_: dict | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ContractListResponse(BaseModel):
    """Schema for listing contracts with pagination."""
    items: list[ContractListItem]
    total: int
    page: int = 1
    page_size: int = 20
    has_more: bool = False


class ContractUploadResponse(BaseModel):
    """Schema for upload confirmation."""
    id: uuid.UUID
    original_filename: str
    file_type: str
    file_size_bytes: int
    status: str
    created_at: datetime
    message: str
