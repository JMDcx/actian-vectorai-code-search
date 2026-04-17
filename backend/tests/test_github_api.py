# backend/tests/test_github_api.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_github_import_invalid_url():
    response = client.post("/api/github/import", json={"url": "invalid-url"})
    assert response.status_code == 422  # Validation error

def test_github_import_valid_url_starts_task():
    response = client.post("/api/github/import", json={"url": "https://github.com/user/repo"})
    assert response.status_code == 202  # Accepted
    assert "task_id" in response.json()
