from ..database import get_db
from ..websocket import manager
from ..models.messages import Chat, Message
from ..models.user import Users
from sqlalchemy import and_, or_, select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.utils import get_current_user
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, status
from pydantic import BaseModel
from uuid import UUID, uuid4
from datetime import datetime
from typing import Optional
import json


router = APIRouter(prefix="/chat")


class CreateChatRequest(BaseModel):
    recipient_id: UUID


class SendMessageRequest(BaseModel):
    content: str


# Get all chats for the current user
@router.get("/")
async def get_user_chats(
    user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Chat).where(
            or_(Chat.user1_id == user.id, Chat.user2_id == user.id)
        ).order_by(desc(Chat.created_at))
    )
    chats = result.scalars().all()
    
    chat_list = []
    for chat in chats:
        # Get the other user in the chat
        other_user_id = chat.user2_id if chat.user1_id == user.id else chat.user1_id
        
        # Fetch other user details
        user_result = await db.execute(
            select(Users).where(Users.id == other_user_id)
        )
        other_user = user_result.scalars().first()
        
        # Get last message
        msg_result = await db.execute(
            select(Message)
            .where(Message.chat_id == chat.id)
            .order_by(desc(Message.created_at))
            .limit(1)
        )
        last_message = msg_result.scalars().first()
        
        chat_list.append({
            "id": str(chat.id),
            "other_user": {
                "id": str(other_user.id) if other_user else None,
                "first_name": other_user.first_name if other_user else "Unknown",
                "last_name": other_user.last_name if other_user else "User",
                "image_path": other_user.image_path if other_user else None,
            },
            "last_message": {
                "content": last_message.content if last_message else None,
                "created_at": last_message.created_at.isoformat() if last_message else None,
                "sender_id": str(last_message.sender_id) if last_message else None,
            } if last_message else None,
            "created_at": chat.created_at.isoformat() if chat.created_at else None,
        })
    
    return chat_list


# Create or get existing chat with a user
@router.post("/create")
async def create_or_get_chat(
    request: CreateChatRequest,
    user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check if chat already exists
    result = await db.execute(
        select(Chat).where(
            or_(
                and_(Chat.user1_id == user.id, Chat.user2_id == request.recipient_id),
                and_(Chat.user1_id == request.recipient_id, Chat.user2_id == user.id),
            )
        )
    )
    chat = result.scalars().first()

    if not chat:
        chat = Chat(
            id=uuid4(),
            user1_id=user.id, 
            user2_id=request.recipient_id,
            created_at=datetime.now()
        )
        db.add(chat)
        await db.commit()
        await db.refresh(chat)

    # Get other user details
    user_result = await db.execute(
        select(Users).where(Users.id == request.recipient_id)
    )
    other_user = user_result.scalars().first()

    return {
        "id": str(chat.id),
        "other_user": {
            "id": str(other_user.id) if other_user else None,
            "first_name": other_user.first_name if other_user else "Unknown",
            "last_name": other_user.last_name if other_user else "User",
            "image_path": other_user.image_path if other_user else None,
        },
        "created_at": chat.created_at.isoformat() if chat.created_at else None,
    }


# Get messages for a specific chat
@router.get("/{chat_id}/messages")
async def get_chat_messages(
    chat_id: UUID,
    user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify user is part of this chat
    chat_result = await db.execute(
        select(Chat).where(
            and_(
                Chat.id == chat_id,
                or_(Chat.user1_id == user.id, Chat.user2_id == user.id)
            )
        )
    )
    chat = chat_result.scalars().first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Get messages
    result = await db.execute(
        select(Message)
        .where(and_(Message.chat_id == chat_id, Message.is_deleted == False))
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()
    
    message_list = []
    for msg in messages:
        # Get sender info
        sender_result = await db.execute(
            select(Users).where(Users.id == msg.sender_id)
        )
        sender = sender_result.scalars().first()
        
        message_list.append({
            "id": str(msg.id),
            "content": msg.content,
            "sender_id": str(msg.sender_id),
            "sender": {
                "id": str(sender.id) if sender else None,
                "first_name": sender.first_name if sender else "Unknown",
                "last_name": sender.last_name if sender else "User",
                "image_path": sender.image_path if sender else None,
            } if sender else None,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
            "is_own": msg.sender_id == user.id,
        })
    
    return message_list


# Send a message to a chat (REST endpoint)
@router.post("/{chat_id}/messages")
async def send_message(
    chat_id: UUID,
    request: SendMessageRequest,
    user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify user is part of this chat
    chat_result = await db.execute(
        select(Chat).where(
            and_(
                Chat.id == chat_id,
                or_(Chat.user1_id == user.id, Chat.user2_id == user.id)
            )
        )
    )
    chat = chat_result.scalars().first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Create message
    message = Message(
        id=uuid4(),
        chat_id=chat_id,
        sender_id=user.id,
        content=request.content,
        created_at=datetime.now(),
        is_deleted=False,
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)
    
    # Broadcast to WebSocket connections
    await manager.send_personal_message(
        str(chat_id),
        json.dumps({
            "type": "new_message",
            "message": {
                "id": str(message.id),
                "content": message.content,
                "sender_id": str(message.sender_id),
                "sender": {
                    "id": str(user.id),
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "image_path": user.image_path,
                },
                "created_at": message.created_at.isoformat(),
                "is_own": False,  # Will be determined client-side
            }
        })
    )
    
    return {
        "id": str(message.id),
        "content": message.content,
        "sender_id": str(message.sender_id),
        "created_at": message.created_at.isoformat(),
    }


# WebSocket endpoint for real-time chat
@router.websocket("/ws/{chat_id}")
async def websocket_chat(
    websocket: WebSocket,
    chat_id: str,
):
    await websocket.accept()
    await manager.connect_chat(chat_id, websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            # Broadcast message to all connections in this chat
            await manager.send_personal_message(chat_id, data)
    except WebSocketDisconnect:
        await manager.disconnect_chat(chat_id, websocket)


