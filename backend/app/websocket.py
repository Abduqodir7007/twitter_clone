import json
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            connection.send_json(message)
            

    async def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

manager = ConnectionManager()