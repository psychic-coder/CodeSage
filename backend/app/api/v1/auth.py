import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.postgres import get_db
from app.models.postgres.user import User
from app.models.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.core.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = (await db.execute(select(User).where(User.email == req.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(400, "Email already registered")
    user = User(id=str(uuid.uuid4()), email=req.email,
                hashed_password=hash_password(req.password), name=req.name)
    db.add(user)
    await db.commit()
    return TokenResponse(access_token=create_access_token(user.id, user.email))


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.email == req.email))).scalar_one_or_none()
    if not user or not verify_password(req.password, user.hashed_password or ""):
        raise HTTPException(401, "Invalid credentials")
    return TokenResponse(access_token=create_access_token(user.id, user.email))


@router.get("/me", response_model=UserResponse)
async def me(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.id == current_user["user_id"]))).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    return UserResponse(id=user.id, email=user.email, name=user.name, avatar_url=user.avatar_url)