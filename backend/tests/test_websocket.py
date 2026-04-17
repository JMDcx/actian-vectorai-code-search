# backend/tests/test_websocket.py
from app.api.websocket import ConnectionManager
import pytest


@pytest.mark.asyncio
async def test_connection_manager_connect():
    manager = ConnectionManager()
    assert len(manager.active_connections) == 0


@pytest.mark.asyncio
async def test_connection_manager_disconnect():
    manager = ConnectionManager()
    manager.disconnect("test-task-id")
    # Should not raise error


@pytest.mark.asyncio
async def test_send_message_no_connection():
    manager = ConnectionManager()
    # Should not raise error when no connection exists
    await manager.send_message("test-task-id", {"test": "message"})
