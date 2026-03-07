from typing import Annotated
from fastapi import APIRouter, Depends

from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse, user_to_response
from app.services.auth_service import register_user, authenticate_user
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(data: RegisterRequest):
    return await register_user(data)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest):
    return await authenticate_user(data)


@router.get("/me", response_model=UserResponse)
async def me(current_user: Annotated[User, Depends(get_current_user)]):
    return user_to_response(current_user)


@router.post("/verify-email", status_code=501)
async def verify_email():
    return {"detail": "Not implemented"}


@router.post("/forgot-password", status_code=501)
async def forgot_password():
    return {"detail": "Not implemented"}


@router.post("/reset-password", status_code=501)
async def reset_password():
    return {"detail": "Not implemented"}
