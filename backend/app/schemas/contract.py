"""Pydantic schemas for contracts."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel


class ContractResponse(BaseModel):
    """Schema for returning contract data."""
    id: uuid.UUID
    filename: str
    original_filename: str
    file_type: str
    file_size_bytes: int | None
    title: str | None
    parties: dict | None
    effective_date: date | None
    expiration_date: date | None
    governing_law: str | None
    contract_type: str | None
    overall_risk_score: float | None
    risk_level: str | None
    status: str
    summary: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ContractListResponse(BaseModel):
    """Schema for listing contracts."""
    contracts: list[ContractResponse]
    total: int


class ContractUploadResponse(BaseModel):
    """Schema for upload confirmation."""
    id: uuid.UUID
    filename: str
    status: str
    message: str
