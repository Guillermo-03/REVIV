from fastapi import HTTPException, status

from app.models.user import User, UserStats
from app.core.security import hash_password, verify_password, create_access_token
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse, user_to_response


async def register_user(data: RegisterRequest) -> TokenResponse:
    existing = await User.find_one(User.email == data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        display_name=data.display_name,
        stats=UserStats(),
    )
    await user.insert()
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=user_to_response(user))


async def authenticate_user(data: LoginRequest) -> TokenResponse:
    user = await User.find_one(User.email == data.email)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=user_to_response(user))


async def get_user_by_id(user_id: str) -> User:
    from beanie import PydanticObjectId
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
