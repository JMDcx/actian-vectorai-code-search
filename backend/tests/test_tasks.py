import pytest
from pydantic import ValidationError


def test_github_import_request_valid():
    """Test valid GitHub URL."""
    from app.models.tasks import GitHubImportRequest
    request = GitHubImportRequest(url="https://github.com/tiangolo/fastapi")
    assert request.url == "https://github.com/tiangolo/fastapi"


def test_github_import_request_invalid():
    """Test invalid GitHub URL format."""
    from app.models.tasks import GitHubImportRequest
    with pytest.raises(ValidationError):
        GitHubImportRequest(url="invalid-url")


def test_import_task_status():
    from app.models.tasks import ImportTaskStatus
    status = ImportTaskStatus(
        task_id="test-123",
        status="pending",
        step=None,
        progress=0
    )
    assert status.task_id == "test-123"
    assert status.status == "pending"
