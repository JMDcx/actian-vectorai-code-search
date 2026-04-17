"""
Test search filters and sorting functionality
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.schemas import Language, CodeType


@pytest.fixture
def client():
    """Test client fixture."""
    return TestClient(app)


def test_search_with_language_filter(client):
    """Test language filter returns only results with that language."""
    response = client.post(
        "/api/search/",
        json={
            "query": "test function",
            "language": "python",
            "limit": 10
        }
    )

    # Should get 200 response
    assert response.status_code == 200

    data = response.json()

    # Verify response structure
    assert "query" in data
    assert "results" in data
    assert "total_results" in data
    assert "execution_time_ms" in data

    # If there are results, they should all be Python
    if data["total_results"] > 0:
        for result in data["results"]:
            assert result["snippet"]["language"] == "python"


def test_search_with_code_type_filter(client):
    """Test code_type filter returns only results with that type."""
    response = client.post(
        "/api/search/",
        json={
            "query": "test",
            "code_type": "function",
            "limit": 10
        }
    )

    # Should get 200 response
    assert response.status_code == 200

    data = response.json()

    # Verify response structure
    assert "query" in data
    assert "results" in data
    assert "total_results" in data
    assert "execution_time_ms" in data

    # If there are results, they should all be functions
    if data["total_results"] > 0:
        for result in data["results"]:
            assert result["snippet"]["code_type"] == "function"


def test_search_with_combined_filters(client):
    """Test multiple filters work together."""
    response = client.post(
        "/api/search/",
        json={
            "query": "test",
            "language": "python",
            "code_type": "class",
            "limit": 10
        }
    )

    # Should get 200 response
    assert response.status_code == 200

    data = response.json()

    # Verify response structure
    assert "query" in data
    assert "results" in data
    assert "total_results" in data
    assert "execution_time_ms" in data

    # If there are results, they should match both filters
    if data["total_results"] > 0:
        for result in data["results"]:
            assert result["snippet"]["language"] == "python"
            assert result["snippet"]["code_type"] == "class"


def test_search_sort_by_similarity(client):
    """Test sorting by similarity works."""
    response = client.post(
        "/api/search/",
        json={
            "query": "test search",
            "sort_by": "similarity",
            "limit": 10
        }
    )

    # Should get 200 response
    assert response.status_code == 200

    data = response.json()

    # Verify response structure
    assert "query" in data
    assert "results" in data
    assert "total_results" in data
    assert "execution_time_ms" in data

    # If there are multiple results, verify they're sorted by similarity (descending)
    if data["total_results"] > 1:
        similarity_scores = [
            result["similarity_score"] for result in data["results"]
        ]
        # Verify scores are in descending order
        assert similarity_scores == sorted(similarity_scores, reverse=True)


def test_search_with_invalid_language(client):
    """Test invalid values return 422 validation error."""
    response = client.post(
        "/api/search/",
        json={
            "query": "test",
            "language": "invalid_language",
            "limit": 10
        }
    )

    # Should get 422 validation error
    assert response.status_code == 422

    data = response.json()

    # Verify error response structure
    assert "detail" in data


def test_search_with_invalid_code_type(client):
    """Test invalid code_type returns 422 validation error."""
    response = client.post(
        "/api/search/",
        json={
            "query": "test",
            "code_type": "invalid_type",
            "limit": 10
        }
    )

    # Should get 422 validation error
    assert response.status_code == 422

    data = response.json()

    # Verify error response structure
    assert "detail" in data


def test_search_with_invalid_sort_by(client):
    """Test invalid sort_by returns 422 validation error."""
    response = client.post(
        "/api/search/",
        json={
            "query": "test",
            "sort_by": "invalid_sort",
            "limit": 10
        }
    )

    # Should get 422 validation error
    assert response.status_code == 422

    data = response.json()

    # Verify error response structure
    assert "detail" in data


def test_search_sort_by_file_path(client):
    """Test sorting by file_path works."""
    response = client.post(
        "/api/search/",
        json={
            "query": "test",
            "sort_by": "file_path",
            "limit": 10
        }
    )

    # Should get 200 response
    assert response.status_code == 200

    data = response.json()

    # Verify response structure
    assert "query" in data
    assert "results" in data
    assert "total_results" in data
    assert "execution_time_ms" in data

    # If there are multiple results, verify they're sorted by file_path
    if data["total_results"] > 1:
        file_paths = [
            result["snippet"]["file_path"] for result in data["results"]
        ]
        # Verify file paths are in ascending order
        assert file_paths == sorted(file_paths)


def test_search_sort_by_complexity(client):
    """Test sorting by complexity works."""
    response = client.post(
        "/api/search/",
        json={
            "query": "test",
            "sort_by": "complexity",
            "limit": 10
        }
    )

    # Should get 200 response
    assert response.status_code == 200

    data = response.json()

    # Verify response structure
    assert "query" in data
    assert "results" in data
    assert "total_results" in data
    assert "execution_time_ms" in data

    # If there are multiple results, verify they're sorted by complexity (descending)
    if data["total_results"] > 1:
        complexities = [
            (result["snippet"]["end_line"] - result["snippet"]["start_line"] + 1)
            for result in data["results"]
        ]
        # Verify complexities are in descending order
        assert complexities == sorted(complexities, reverse=True)


def test_search_with_file_path_pattern(client):
    """Test file_path_pattern filter works."""
    response = client.post(
        "/api/search/",
        json={
            "query": "test",
            "file_path_pattern": "test",
            "limit": 10
        }
    )

    # Should get 200 response
    assert response.status_code == 200

    data = response.json()

    # Verify response structure
    assert "query" in data
    assert "results" in data
    assert "total_results" in data
    assert "execution_time_ms" in data


def test_search_with_all_filters(client):
    """Test all filters combined together."""
    response = client.post(
        "/api/search/",
        json={
            "query": "test",
            "language": "python",
            "code_type": "function",
            "file_path_pattern": "app",
            "sort_by": "similarity",
            "limit": 5,
            "threshold": 0.8
        }
    )

    # Should get 200 response
    assert response.status_code == 200

    data = response.json()

    # Verify response structure
    assert "query" in data
    assert "results" in data
    assert "total_results" in data
    assert "execution_time_ms" in data


def test_search_with_limit_validation(client):
    """Test limit validation (must be between 1 and 100)."""
    # Test limit too low
    response = client.post(
        "/api/search/",
        json={
            "query": "test",
            "limit": 0
        }
    )
    assert response.status_code == 422

    # Test limit too high
    response = client.post(
        "/api/search/",
        json={
            "query": "test",
            "limit": 101
        }
    )
    assert response.status_code == 422


def test_search_with_threshold_validation(client):
    """Test threshold validation (must be between 0.0 and 1.0)."""
    # Test threshold too low
    response = client.post(
        "/api/search/",
        json={
            "query": "test",
            "threshold": -0.1
        }
    )
    assert response.status_code == 422

    # Test threshold too high
    response = client.post(
        "/api/search/",
        json={
            "query": "test",
            "threshold": 1.1
        }
    )
    assert response.status_code == 422
