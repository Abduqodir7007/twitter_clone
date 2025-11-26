import json, os, uuid, aiofiles
from ..models.user import Users
from ..models.posts import Posts, PostLikes
from ..database import get_db
from ..websocket import manager
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from ..schemas.post import PostResponse
from sqlalchemy.orm import selectinload
from sqlalchemy.future import select
from sqlalchemy import and_, func, exists
from app.utils import get_current_user
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    UploadFile,
    File,
    Form,
    WebSocket,
    WebSocketDisconnect,
)

router = APIRouter(prefix="/post")

UPLOAD_FOLDER = "uploads/images"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


async def get_post_from_db(user_id: str, db: AsyncSession):  #  TO DO reply count
    sub_query = (
        exists()
        .where(and_(PostLikes.post_id == Posts.id, PostLikes.user_id == user_id))
        .correlate(Posts)
    )
    query = (
        select(
            Posts,
            func.count(PostLikes.id).label("likes_count"),
            sub_query.label("is_liked"),
        )
        .outerjoin(PostLikes, PostLikes.post_id == Posts.id)
        .options(selectinload(Posts.user))
        .order_by(Posts.created_at.desc())
        .group_by(Posts.id)
    )
    result = await db.execute(query)
    posts = result.all()

    response = []
    for post, likes_count, is_liked in posts:

        response.append(
            {
                "id": str(post.id),
                "text": post.text,
                "created_at": post.created_at.isoformat(),
                "likes_count": likes_count,
                "is_liked": is_liked,
                "image_path": post.image_path,
                "user": {
                    "first_name": post.user.first_name,
                    "last_name": post.user.last_name,
                },
            }
        )
    return response


@router.get("/", response_model=list[PostResponse])
async def get_all_posts(
    user: Users = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    posts = await get_post_from_db(str(user.id), db)

    return posts


@router.websocket("/ws")
async def get_posts(
    websocket: WebSocket,
    user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):

    await manager.connect(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            if message.get("type") == "posts":
                posts = await get_post_from_db(str(user.id), db)
                await websocket.send_json({"type": "posts", "data": posts})
    except WebSocketDisconnect:
        await manager.disconnect(websocket)


@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create_post(
    text: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filepath = None

    if image:
        extension = image.filename.split(".")[-1]
        filename = f"{uuid.uuid4()}.{extension}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)

        async with aiofiles.open(filepath, "wb") as f:
            content = await image.read()
            await f.write(content)

    new_post = Posts(text=text, image_path=filepath, user_id=user.id)

    db.add(new_post)
    await db.commit()

    return {"msg": "Post Created"}


@router.delete("/delete/{id}", status_code=status.HTTP_200_OK)
async def delete_post(
    id: str, user: Users = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):

    result = await db.execute(select(Posts).where(Posts.id == id))
    post = result.scalars().first()

    if not post:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST)

    await db.delete(post)
    await db.commit()
    return {"msg": "deleted"}


@router.post("/create_delete_like/{id}/", status_code=status.HTTP_200_OK)
async def post_like(
    id: str, user: Users = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Posts).where(Posts.id == id))
    post = result.scalars().first()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Post not found"
        )

    result = await db.execute(
        select(PostLikes).where(
            and_(PostLikes.user_id == user.id, PostLikes.post_id == post.id)
        )
    )

    like = result.scalar_one_or_none()
    if like:
        await db.delete(like)
        await db.commit()
        return {"msg": "Dislike"}

    new_like = PostLikes(user_id=user.id, post_id=post.id)

    db.add(new_like)
    await db.commit()

    return {"msg": "Like"}
