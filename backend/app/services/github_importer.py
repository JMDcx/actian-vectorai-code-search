# backend/app/services/github_importer.py
import re
import aiohttp
from pathlib import Path
from typing import Tuple, Optional, Callable, Awaitable
import asyncio


class RepositoryTooLarge(Exception):
    """Repository exceeds size limit."""
    def __init__(self, size_mb: float, limit_mb: float):
        self.size_mb = size_mb
        self.limit_mb = limit_mb
        super().__init__(f"Repository size ({size_mb:.1f}MB) exceeds limit ({limit_mb}MB)")


class TooManyFiles(Exception):
    """Repository has too many files."""
    def __init__(self, file_count: int, limit: int):
        self.file_count = file_count
        self.limit = limit
        super().__init__(f"Repository has {file_count} files, exceeds limit of {limit}")


class RepositoryNotFound(Exception):
    """Repository not found or is private."""
    pass


class GitHubImporter:
    """Service for importing GitHub repositories."""

    MAX_SIZE_MB = 50
    MAX_FILES = 500
    SUPPORTED_EXTENSIONS = {'.py', '.js', '.ts', '.tsx'}

    def __init__(self, progress_callback: Optional[Callable[[str, int, str], Awaitable[None]]] = None):
        self.progress_callback = progress_callback

    def _parse_github_url(self, url: str) -> Optional[Tuple[str, str]]:
        """Parse GitHub URL to extract owner and repo.

        Args:
            url: GitHub URL (e.g., https://github.com/user/repo)

        Returns:
            Tuple of (owner, repo) or None if invalid
        """
        # Remove .git suffix if present
        url = url.removesuffix('.git')
        pattern = r"^https://github\.com/([^/]+)/([^/]+)$"
        match = re.match(pattern, url)
        return (match.group(1), match.group(2)) if match else None

    async def _check_repo_size(self, owner: str, repo: str) -> float:
        """Check repository size using GitHub API.

        Args:
            owner: Repository owner
            repo: Repository name

        Returns:
            Size in MB

        Raises:
            RepositoryNotFound: If repo not found or is private
        """
        url = f"https://api.github.com/repos/{owner}/{repo}"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status == 404:
                        raise RepositoryNotFound()
                    resp.raise_for_status()
                    data = await resp.json()
                    # GitHub API returns size in KB
                    size_kb = data.get("size", 0)
                    return size_kb / 1024  # Convert to MB
        except asyncio.TimeoutError:
            raise RepositoryNotFound("Request timeout")
        except aiohttp.ClientError as e:
            raise RepositoryNotFound(f"Failed to fetch repository info: {str(e)}")

    async def _emit_progress(self, step: str, progress: int, message: str):
        """Emit a progress update if callback is provided."""
        if self.progress_callback:
            await self.progress_callback(step, progress, message)
