from passlib.context import CryptContext
from jose import jwt, ExpiredSignatureError, JWTError
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status
from datetime import datetime, timedelta
from .config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.user import Users
from .database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


def hash_user_password(user_pwd: str) -> str:
    return pwd_context.hash(user_pwd)


def check_password(user_pwd: str, hashed_pwd: str) -> bool:
    return pwd_context.verify(user_pwd, hashed_pwd)


def create_access_token(data: dict) -> str:
    data = data.copy()
    expire = datetime.now() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    data["exp"] = expire

    token = jwt.encode(data, key=settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token


def create_refresh_token(data: dict) -> str:
    data = data.copy()
    expire = datetime.now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    data["exp"] = expire

    token = jwt.encode(data, key=settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
):
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token"
        )
    try:
        payload = jwt.decode(
            token, key=settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        email = payload.get("data")

        if not email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST)

        query = select(Users).where(Users.email == email)

        result = await db.execute(query)

        user = result.scalars().first()

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="User does not exist"
            )

        return user
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )


async def verify_refresh_token(token: str):
    try:
        payload = jwt.decode(
            token, key=settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        email = payload.get("data")
        return email

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired"
        )
