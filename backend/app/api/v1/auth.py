import uuid
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    revoke_token,
    verify_password,
)
from app.database.postgres import get_db
from app.models.postgres.user import User
from app.models.schemas.auth import (
    GitHubAuthRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

router = APIRouter()


async def fetch_github_profile(access_token: str) -> dict[str, Any]:
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        user_res = await client.get("https://api.github.com/user", headers=headers)
        if user_res.status_code != 200:
            raise HTTPException(401, "Invalid GitHub token")
        profile = user_res.json()

        email = profile.get("email")
        if not email:
            emails_res = await client.get(
                "https://api.github.com/user/emails", headers=headers
            )
            if emails_res.status_code == 200:
                emails = emails_res.json()
                primary = next(
                    (
                        item
                        for item in emails
                        if item.get("primary") and item.get("verified")
                    ),
                    None,
                )
                fallback = next((item for item in emails if item.get("verified")), None)
                chosen = primary or fallback or (emails[0] if emails else None)
                if chosen:
                    email = chosen.get("email")

        if not email:
            email = f"github-{profile['id']}@users.noreply.codesage.local"

        return {
            "github_id": str(profile["id"]),
            "email": email,
            "name": profile.get("name") or profile.get("login"),
            "avatar_url": profile.get("avatar_url"),
        }


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = (
        await db.execute(select(User).where(User.email == req.email))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(400, "Email already registered")
    user = User(
        id=str(uuid.uuid4()),
        email=req.email,
        hashed_password=hash_password(req.password),
        name=req.name,
    )
    db.add(user)
    await db.commit()
    return TokenResponse(access_token=create_access_token(user.id, user.email))


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = (
        await db.execute(select(User).where(User.email == req.email))
    ).scalar_one_or_none()
    if not user or not verify_password(req.password, user.hashed_password or ""):
        raise HTTPException(401, "Invalid credentials")
    return TokenResponse(access_token=create_access_token(user.id, user.email))


@router.post("/github", response_model=TokenResponse)
async def github_login(req: GitHubAuthRequest, db: AsyncSession = Depends(get_db)):
    profile = await fetch_github_profile(req.access_token)

    user = (
        await db.execute(select(User).where(User.github_id == profile["github_id"]))
    ).scalar_one_or_none()
    if not user:
        user = (
            await db.execute(select(User).where(User.email == profile["email"]))
        ).scalar_one_or_none()

    if user:
        user.github_id = profile["github_id"]
        user.email = profile["email"]
        user.name = profile["name"]
        user.avatar_url = profile["avatar_url"]
    else:
        user = User(
            id=str(uuid.uuid4()),
            email=profile["email"],
            hashed_password=None,
            github_id=profile["github_id"],
            name=profile["name"],
            avatar_url=profile["avatar_url"],
        )
        db.add(user)

    await db.commit()
    return TokenResponse(access_token=create_access_token(user.id, user.email))


@router.get("/me", response_model=UserResponse)
async def me(
    current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    user = (
        await db.execute(select(User).where(User.id == current_user["user_id"]))
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    return UserResponse(
        id=user.id, email=user.email, name=user.name, avatar_url=user.avatar_url
    )


@router.post("/logout")
async def logout(token: str = Depends(oauth2_scheme)):
    await revoke_token(token)
    return {"message": "Logged out successfully"}
