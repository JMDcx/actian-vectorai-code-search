"""
Test VectorAIDBClient functionality
"""
import pytest


# Skip tests if actian_vectorai is not installed
pytest.importorskip("actian_vectorai")

from app.core.database import VectorAIDBClient


@pytest.mark.asyncio
async def test_get_similarity():
    """Test similarity computation between two vectors."""
    client = VectorAIDBClient()

    # Insert two test vectors
    await client.insert_vector("test_id_1", [1.0, 0.0, 0.0], {})
    await client.insert_vector("test_id_2", [1.0, 0.0, 0.0], {})

    # Same vectors should have similarity 1.0
    similarity = await client.get_similarity("test_id_1", "test_id_2")
    assert similarity == pytest.approx(1.0, rel=0.01)
