import json
import os
import uuid
import aiofiles
from ..models.user import Users
from ..models.posts import Posts
from ..database import get_db
from ..websocket import manager
from typing import Optional
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
from sqlalchemy.ext.asyncio import AsyncSession
from ..schemas.post import PostResponse
from sqlalchemy.orm import selectinload
from sqlalchemy.future import select
from app.utils import get_current_user

router = APIRouter(prefix="/post")

UPLOAD_FOLDER = "uploads/images"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


async def get_post_from_db(db: AsyncSession):
    query = (
        select(Posts)
        .order_by(Posts.created_at.desc())
        .options(selectinload(Posts.user))
    )
    result = await db.execute(query)
    posts = result.scalars().all()
    response = []
    for post in posts:

        response.append(
            {
                "id": str(post.id),
                "text": post.text,
                "created_at": post.created_at.isoformat(),
                "image_path": post.image_path,
                "user": {
                    "first_name": post.user.first_name,
                    "last_name": post.user.last_name,
                },
            }
        )
    return response


@router.get("/", response_model=list[PostResponse])
async def get_all_posts(db: AsyncSession = Depends(get_db)):
    posts = await get_post_from_db(db)
    return posts


@router.websocket("/ws")
async def get_posts(websocket: WebSocket, db: AsyncSession = Depends(get_db)):

    await manager.connect(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            if message.get("type") == "posts":
                posts = await get_post_from_db(db)
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
