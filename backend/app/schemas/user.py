"""Pydantic schemas for user authentication and profiles."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    """Schema for user registration."""
    email: str
    password: str
    full_name: str | None = None


class UserLogin(BaseModel):
    """Schema for user login."""
    email: str
    password: str


class UserResponse(BaseModel):
    """Schema for returning user data."""
    id: uuid.UUID
    email: str
    full_name: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
