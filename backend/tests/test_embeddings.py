import pytest
from app.services.embeddings import embedding_service


def test_embedding_generation():
    """Test that embeddings are generated correctly."""
    code = "def hello_world():\n    print('Hello, World!')"

    embedding = embedding_service.generate_embedding(code)

    assert isinstance(embedding, list)
    assert len(embedding) == 768  # CodeBERT dimension
    assert all(isinstance(x, float) for x in embedding)


def test_query_embedding():
    """Test query embedding generation."""
    query = "function that prints hello"

    embedding = embedding_service.generate_query_embedding(query)

    assert isinstance(embedding, list)
    assert len(embedding) == 768


def test_similarity_calculation():
    """Test similarity calculation between embeddings."""
    code1 = "def add(a, b):\n    return a + b"
    code2 = "def subtract(a, b):\n    return a - b"

    emb1 = embedding_service.generate_embedding(code1)
    emb2 = embedding_service.generate_embedding(code2)

    similarity = embedding_service.similarity(emb1, emb2)

    assert isinstance(similarity, float)
    assert 0 <= similarity <= 1
