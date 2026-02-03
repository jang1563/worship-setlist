from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class Token(BaseModel):
    """Response schema for JWT token."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Data extracted from JWT token."""
    user_id: Optional[int] = None
    email: Optional[str] = None


class UserBase(BaseModel):
    """Base schema for user."""
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)


class UserCreate(UserBase):
    """Schema for user registration."""
    password: str = Field(..., min_length=8, max_length=100)


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class UserResponse(UserBase):
    """Response schema for user."""
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserWithToken(BaseModel):
    """Response schema for login/register with token."""
    user: UserResponse
    access_token: str
    token_type: str = "bearer"
