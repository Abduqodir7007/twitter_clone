from ..database import get_db
from ..websocket import manager
from fastapi import APIRouter, Depends, WebSocket, status


router = APIRouter(prefix="/chat")


@router.websocket("/ws/chat/")
async def chat_room():
    pass
