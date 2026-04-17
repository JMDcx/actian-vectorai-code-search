import pytest

# Skip tests if dependencies are not installed
pytest.importorskip("actian_vectorai")
pytest.importorskip("umap")

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_graph_data_returns_valid_structure():
    """Test that graph data endpoint returns valid structure."""
    response = client.get("/api/visualization/graph-data?limit=50")

    assert response.status_code == 200
    data = response.json()

    assert "nodes" in data
    assert "edges" in data
    assert isinstance(data["nodes"], list)
    assert isinstance(data["edges"], list)


def test_graph_data_limit_parameter():
    """Test that limit parameter works correctly."""
    response = client.get("/api/visualization/graph-data?limit=100")

    assert response.status_code == 200
    data = response.json()
    assert len(data["nodes"]) <= 100


def test_graph_data_nodes_have_required_fields():
    """Test that nodes have all required fields."""
    response = client.get("/api/visualization/graph-data?limit=10")
    data = response.json()

    if len(data["nodes"]) > 0:
        node = data["nodes"][0]
        assert "id" in node
        assert "x" in node
        assert "y" in node
        assert "language" in node
        assert "code_type" in node
        assert "complexity" in node
