# backend/app/api/websocket.py
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict


class ConnectionManager:
    """Manage WebSocket connections for real-time progress updates."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, task_id: str, websocket: WebSocket):
        """Accept and store a WebSocket connection."""
        # Close existing connection if present to prevent leaks
        if task_id in self.active_connections:
            try:
                await self.active_connections[task_id].close()
            except Exception:
                pass  # Old connection may already be dead
        await websocket.accept()
        self.active_connections[task_id] = websocket

    def disconnect(self, task_id: str):
        """Remove a WebSocket connection."""
        self.active_connections.pop(task_id, None)

    async def send_message(self, task_id: str, message: dict):
        """Send a JSON message to a specific task connection."""
        websocket = self.active_connections.get(task_id)
        if websocket is None:
            return
        try:
            await websocket.send_json(message)
        except (WebSocketDisconnect, RuntimeError):
            # Connection died or was closed, clean up
            self.disconnect(task_id)

    async def broadcast(self, message: dict):
        """Broadcast a message to all active connections."""
        for task_id in list(self.active_connections.keys()):
            await self.send_message(task_id, message)


# Global instance
manager = ConnectionManager()
