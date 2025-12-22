import json
from ..models.user import Users
from ..models.posts import Posts, PostLikes, PostReply, ReplyLike
from ..database import get_db
from ..websocket import manager
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from ..schemas.post import PostResponse
from sqlalchemy.orm import selectinload
from sqlalchemy.future import select
from sqlalchemy import and_, func
from app.utils import get_current_user
from io import BytesIO
from app.config import settings
from app.aws_utils import storage, BUCKET
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


async def get_post_from_db(user_id: str, db: AsyncSession):
    sub_query_for_like = (
        select(func.count(PostLikes.id))
        .where(PostLikes.post_id == Posts.id)
        .correlate(Posts)
    )
    sub_query_is_liked = (
        select(func.count(PostLikes.id))
        .where(PostLikes.post_id == Posts.id, PostLikes.user_id == user_id)
        .correlate(Posts)
    )

    sub_query_for_reply = (
        select(func.count(PostReply.id))
        .where(PostReply.post_id == Posts.id)
        .correlate(Posts)
    )

    query = (
        select(
            Posts,
            sub_query_for_like.label("like_count"),
            sub_query_is_liked.label("is_liked"),
            sub_query_for_reply.label("reply_count"),
        )
        .order_by(Posts.created_at.desc())
        .options(selectinload(Posts.user))
    )

    result = await db.execute(query)
    posts = result.all()

    response = []
    for post, likes_count, is_liked, reply_count in posts:

        response.append(
            {
                "id": str(post.id),
                "text": post.text,
                "created_at": post.created_at.isoformat(),
                "likes_count": likes_count,
                "is_liked": is_liked,
                "image_path": post.image_path,
                "reply_count": reply_count or 0,
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


@router.get("/{id}", status_code=status.HTTP_200_OK)
async def get_post_by_id(id: str, db: AsyncSession = Depends(get_db)):

    like_count = (
        select(func.count(ReplyLike.id))
        .where(ReplyLike.reply_id == PostReply.id)
        .correlate(PostReply)
    )

    query = (
        select(PostReply, like_count.label("like_count"))
        .where(PostReply.post_id == id)
        .options(selectinload(PostReply.user))
    )
    result = await db.execute(query)
    replies = result.all()
    response = []

    for reply, like_count in replies:
        response.append(
            {
                "id": str(reply.id),
                "reply": reply.reply,
                "created_at": reply.created_at,
                "like_count": like_count,
                "user": {
                    "id": reply.user.id,
                    "first_name": reply.user.first_name,
                    "last_name": reply.user.last_name,
                    "image_path": reply.user.image_path,
                },
            }
        )

    return response


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
    text: Optional[str] = Form(None, max_length=1000),
    image: Optional[UploadFile] = File(None),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):


    upload_path = None

    content = await image.read()
    storage.upload_fileobj(
        Fileobj=BytesIO(content),
        Bucket=BUCKET,
        Key=f"images/{image.filename}",
        ExtraArgs={"ContentType": image.content_type},
    )

    upload_path = f"https://{BUCKET}.s3.amazonaws.com/images/{image.filename}"

    new_post = Posts(text=text, image_path=upload_path, user_id=user.id)
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


@router.post("/{id}/reply/", status_code=status.HTTP_201_CREATED)
async def reply_to_post(
    id: str,
    user: Users = Depends(get_current_user),
    text: str = Form(..., max_length=1000),
    db: AsyncSession = Depends(get_db),
):

    result = await db.execute(select(Posts).where(Posts.id == id))
    post = result.scalars().first()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Post not found"
        )

    reply = PostReply(reply=text, post_id=post.id, user_id=user.id)
    db.add(reply)
    await db.commit()
    return {"msg": "Reply created"}


@router.delete("/reply/{reply_id}/", status_code=status.HTTP_200_OK)
async def delete_reply(
    reply_id: str,
    user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PostReply).where(PostReply.id == reply_id))
    reply = result.scalars().first()

    if not reply:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Reply not found"
        )

    if reply.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized"
        )

    await db.delete(reply)
    await db.commit()
    return {"msg": "Reply deleted"}


@router.post("/reply/{id}/create-delete-like/")
async def like_dislike_reply(
    id: str, user: Users = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(PostReply).where(PostReply.id == id))

    reply = result.scalars().first()

    if not reply:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Replt not found"
        )

    result = await db.execute(
        select(ReplyLike).where(
            and_(ReplyLike.reply_id == id, ReplyLike.user_id == user.id)
        )
    )

    like = result.scalars().first()

    if like:
        await db.delete(like)
        await db.commit()
        return {"message": "Like deleted"}

    new_like = ReplyLike(user_id=user.id, reply_id=reply.id)
    db.add(new_like)
    await db.commit()
    return {"msg": "Liked"}
