import json
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections = []
        self.chat_connections = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    async def connect_chat(self, chat_id: int, websocket: WebSocket):
        if chat_id not in self.chat_connections:
            self.chat_connections[chat_id] = set()
        self.chat_connections[chat_id].add(websocket)

    async def disconnect_chat(self, chat_id: int):
        del self.chat_connections[chat_id]

    async def send_personal_message(self, chat_id: int, message: str):
        if chat_id in self.chat_connections:
            await self.chat_connections[chat_id].send_json({"message": message})
        for connection in self.chat_connections.get(chat_id, []):
            await connection.send_json({"message": message})

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

    async def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

        for chat_id, connection in list(self.chat_connections.items()):
            if connection == websocket:
                del self.chat_connections[chat_id]


manager = ConnectionManager()
