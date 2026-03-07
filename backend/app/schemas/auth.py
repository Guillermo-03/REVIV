from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserStatsResponse(BaseModel):
    events_attended: int
    events_organized: int
    total_volunteer_hours: int
    reports_submitted: int
    reports_resolved: int


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str
    avatar_url: Optional[str] = None
    created_at: datetime
    is_verified: bool
    stats: UserStatsResponse


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


def user_to_response(user) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        created_at=user.created_at,
        is_verified=user.is_verified,
        stats=UserStatsResponse(**user.stats.model_dump()),
    )
