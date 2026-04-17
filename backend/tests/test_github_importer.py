# backend/tests/test_github_importer.py
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.github_importer import GitHubImporter, RepositoryTooLarge, RepositoryNotFound
import pytest

def test_parse_github_url_valid():
    importer = GitHubImporter(progress_callback=None)
    result = importer._parse_github_url("https://github.com/user/repo")
    assert result == ("user", "repo")

def test_parse_github_url_invalid():
    importer = GitHubImporter(progress_callback=None)
    result = importer._parse_github_url("invalid-url")
    assert result is None

def test_parse_github_url_with_git_extension():
    importer = GitHubImporter(progress_callback=None)
    result = importer._parse_github_url("https://github.com/user/repo.git")
    assert result == ("user", "repo")

def test_parse_github_url_repo_name_ending_in_g():
    importer = GitHubImporter(progress_callback=None)
    result = importer._parse_github_url("https://github.com/user/testing")
    assert result == ("user", "testing")

@pytest.mark.asyncio
async def test_check_repo_size_within_limit():
    importer = GitHubImporter()
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json = AsyncMock(return_value={"size": 10240})  # 10MB in KB
    mock_response.raise_for_status = MagicMock()

    mock_get = AsyncMock(return_value=mock_response)
    mock_get.__aenter__ = AsyncMock(return_value=mock_response)
    mock_get.__aexit__ = AsyncMock(return_value=None)

    mock_session = MagicMock()
    mock_session.get = MagicMock(return_value=mock_get)
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=None)

    with patch('aiohttp.ClientSession', return_value=mock_session):
        size_mb = await importer._check_repo_size("user", "repo")
    assert size_mb < 50  # Should be ~10MB

@pytest.mark.asyncio
async def test_check_repo_size_exceeds_limit():
    importer = GitHubImporter()
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json = AsyncMock(return_value={"size": 102400})  # 100MB
    mock_response.raise_for_status = MagicMock()

    mock_get = AsyncMock(return_value=mock_response)
    mock_get.__aenter__ = AsyncMock(return_value=mock_response)
    mock_get.__aexit__ = AsyncMock(return_value=None)

    mock_session = MagicMock()
    mock_session.get = MagicMock(return_value=mock_get)
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=None)

    with patch('aiohttp.ClientSession', return_value=mock_session):
        size_mb = await importer._check_repo_size("user", "repo")
    assert size_mb > 50
