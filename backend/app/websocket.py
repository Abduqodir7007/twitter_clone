import json
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections = []
        self.chat_connections = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    async def connect_chat(self, chat_id: str, websocket: WebSocket):
        if chat_id not in self.chat_connections:
            self.chat_connections[chat_id] = set()
        self.chat_connections[chat_id].add(websocket)

    async def disconnect_chat(self, chat_id: str, websocket: WebSocket):
        if chat_id in self.chat_connections:
            self.chat_connections[chat_id].discard(websocket)
            if not self.chat_connections[chat_id]:
                del self.chat_connections[chat_id]

    async def send_personal_message(self, chat_id: str, message: str):
        if chat_id in self.chat_connections:
            for connection in self.chat_connections[chat_id]:
                try:
                    await connection.send_text(message)
                except:
                    pass

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

    async def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

        for chat_id in list(self.chat_connections.keys()):
            if websocket in self.chat_connections[chat_id]:
                self.chat_connections[chat_id].discard(websocket)
                if not self.chat_connections[chat_id]:
                    del self.chat_connections[chat_id]


manager = ConnectionManager()
