import os, aiofiles, uuid
from ..models.user import Users
from ..models.posts import Posts
from ..database import get_db
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from ..schemas.post import PostResponse
from ..schemas.user import (
    UserCreate,
    UserLogin,
    UserProfileReponse,
    UserProfileUpdate,
    RefreshTokenRequest,
)
from sqlalchemy import func
from sqlalchemy import select, delete, insert
from typing import Annotated, Optional
from ..utils import (
    hash_user_password,
    create_access_token,
    create_refresh_token,
    check_password,
    verify_refresh_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


UPLOAD_FOLDER = "uploads/images"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(user_in: UserCreate, db: AsyncSession = Depends(get_db)):

    query = select(Users).where(Users.email == user_in.email)
    result = await db.execute(query)
    user = result.scalars().first()

    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )
    hashed_password = hash_user_password(user_in.password)

    new_user = Users(
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        email=user_in.email,
        hashed_password=hashed_password,
    )

    db.add(new_user)
    await db.commit()

    access_token = create_access_token({"data": new_user.email})
    refresh_token = create_refresh_token({"data": new_user.email})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/login", status_code=status.HTTP_200_OK)
async def login(user_in: UserLogin, db: AsyncSession = Depends(get_db)):

    query = select(Users).where(Users.email == user_in.email)

    result = await db.execute(query)

    user = result.scalars().first()

    if user and check_password(user_in.password, user.hashed_password):
        access_token = create_access_token({"data": user.email})
        refresh_token = create_refresh_token({"data": user.email})
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
        }
    return {"msg": "User does not exits"}


@router.post("/refresh", status_code=status.HTTP_201_CREATED)
async def generate_access_token(token: RefreshTokenRequest):
    email = await verify_refresh_token(token.refresh_token)
    access_token = create_access_token({"data": email})
    refresh_token = create_refresh_token({"data": email})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.get("/me", status_code=status.HTTP_200_OK, response_model=UserProfileReponse)
async def get_user_profile(
    user: Annotated[Users, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    post_count = await db.scalar(
        select(func.count(Posts.id)).filter(Posts.user_id == user.id)
    )

    followers_table = Users.following.property.secondary
    followers = await db.scalar(
        select(func.count()).where(followers_table.c.followee_id == user.id)
    )

    followees = await db.scalar(
        select(func.count()).where(followers_table.c.follower_id == user.id)
    )

    return {
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "image_path": user.image_path,
        "post_count": post_count,
        "followers": followers,
        "following": followees,
    }


@router.get(
    "/user/posts", status_code=status.HTTP_200_OK, response_model=list[PostResponse]
)
async def get_users_posts(
    user: Annotated[Users, Depends(get_current_user)],  # TO DO: add pagination here
    db: AsyncSession = Depends(get_db),
):
    query = select(Posts).where(Posts.user_id == user.id)

    result = await db.execute(query)

    posts = result.scalars().all()

    return posts


@router.post("/me/update", status_code=status.HTTP_200_OK)
async def update_user_profile(
    user: Annotated[Users, Depends(get_current_user)],
    first_name: Optional[str] = Form(None),
    last_name: Optional[str] = Form(None),
    profile_picture: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
):
    if first_name is not None:
        user.first_name = first_name
    if last_name is not None:
        user.last_name = last_name

    if profile_picture:
        extension = profile_picture.filename.split(".")[-1].lower()
        unique_id = str(uuid.uuid4())
        filename = f"{unique_id}.{extension}"
        filepath = f"{UPLOAD_FOLDER}/{filename}"

        async with aiofiles.open(filepath, "wb") as f:
            content = await profile_picture.read()
            await f.write(content)

        user.image_path = filepath

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {"msg": "Updated"}


@router.post("/follow/{id}")
async def follow(
    id: str,
    user: Annotated[Users, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:

    query = select(Users).where(Users.id == id)
    result = await db.execute(query)
    user_to_follow = result.scalars().first()

    if not user_to_follow:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="User does not exsits"
        )

    followers_table = Users.following.property.secondary

    result = await db.execute(
        select(followers_table).where(
            followers_table.c.followee_id == user_to_follow.id,
            followers_table.c.follower_id == user.id,
        )
    )

    is_following = result.first()

    if is_following:
        await db.execute(
            delete(followers_table).where(
                followers_table.c.followee_id == user_to_follow.id,
                followers_table.c.follower_id == user.id,
            )
        )
        await db.commit()
        return {"msg": "Unfollowed"}

    await db.execute(
        insert(followers_table).values(
            follower_id=user.id,
            followee_id=user_to_follow.id,
        )
    )
    await db.commit()
    return {"msg": "Followed"}


@router.get(
    "/follow/recommendation",
    status_code=status.HTTP_200_OK,
)
async def user_to_follow(
    db: AsyncSession = Depends(get_db),
    user: Users = Depends(get_current_user),  # change the recommandation system
):

    followers_table = Users.following.property.secondary

    F = followers_table.alias()

    query = await db.execute(
        select(
            Users.id,
            Users.first_name,
            Users.last_name,
            Users.image_path,
            func.count(F.c.follower_id).label("is_following"),
        )
        .where(Users.id != user.id)
        .outerjoin(F, (F.c.follower_id == user.id) & (F.c.followee_id == Users.id))
        .group_by(Users.id)
    )

    result = query.mappings().all()
    users = []
    for row in result:
        users.append(
            {
                "id": row.id,
                "first_name": row.first_name,
                "last_name": row.last_name,
                "image_path": row.image_path,
                "is_following": bool(row.is_following),  # True if already followed
            }
        )

    return users
