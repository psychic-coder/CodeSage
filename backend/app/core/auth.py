import time
from datetime import datetime, timedelta

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings
from app.database.redis import get_redis

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str, email: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=24)
    return jwt.encode(
        {"sub": user_id, "email": email, "exp": expire},
        settings.secret_key,
        algorithm=ALGORITHM,
    )


async def revoke_token(token: str):
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        exp = payload.get("exp")
        now = time.time()
        ttl = max(int(exp - now), 1) if exp else 86400
        redis = get_redis()
        await redis.setex(f"blocklist:{token}", ttl, "1")
    except Exception:
        pass


async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        redis = get_redis()
        if await redis.exists(f"blocklist:{token}"):
            raise HTTPException(status_code=401, detail="Token revoked")

        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"user_id": user_id, "email": payload.get("email")}
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
