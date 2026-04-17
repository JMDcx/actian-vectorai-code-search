# backend/app/services/github_importer.py
import re
import time
import tempfile
import aiohttp
import git
from pathlib import Path
from typing import Tuple, Optional, Callable, Awaitable
from datetime import datetime, timedelta
import asyncio


_temp_dirs = {}  # task_id -> (dir_path, created_at)


def register_temp_dir(task_id: str, dir_path: str):
    """Register a temporary directory for delayed cleanup."""
    _temp_dirs[task_id] = (dir_path, time.time())


def cleanup_old_temp_dirs():
    """Remove temporary directories older than 24 hours."""
    now = time.time()
    to_remove = []
    for task_id, (dir_path, created_at) in _temp_dirs.items():
        if now - created_at > 86400:  # 24 hours
            import shutil
            try:
                shutil.rmtree(dir_path, ignore_errors=True)
                to_remove.append(task_id)
            except Exception:
                pass
    for task_id in to_remove:
        _temp_dirs.pop(task_id, None)


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

    def _count_files(self, repo_path: str) -> int:
        """Count supported files in repository.

        Args:
            repo_path: Path to cloned repository

        Returns:
            Number of supported files
        """
        count = 0
        repo_path = Path(repo_path)
        for file_path in repo_path.rglob("*"):
            if file_path.is_file() and file_path.suffix in self.SUPPORTED_EXTENSIONS:
                count += 1
        return count

    async def import_repo(self, url: str, task_id: str, code_parser, vectorai_client) -> dict:
        """Import a GitHub repository.

        Args:
            url: GitHub repository URL
            task_id: Unique task identifier
            code_parser: Code parser instance
            vectorai_client: VectorAI client instance

        Returns:
            Dictionary with import statistics

        Raises:
            ValueError: If URL is invalid
            RepositoryTooLarge: If repo exceeds size limit
            TooManyFiles: If repo has too many files
            RepositoryNotFound: If repo not found
        """
        # Step 1: Parse URL
        await self._emit_progress("cloning", 0, "验证仓库...")
        parsed = self._parse_github_url(url)
        if not parsed:
            raise ValueError("Invalid GitHub URL format")
        owner, repo = parsed

        # Step 2: Check size
        await self._emit_progress("cloning", 5, "检查仓库大小...")
        size_mb = await self._check_repo_size(owner, repo)
        if size_mb > self.MAX_SIZE_MB:
            raise RepositoryTooLarge(size_mb, self.MAX_SIZE_MB)

        # Step 3: Clone repository
        await self._emit_progress("cloning", 10, "克隆仓库中...")
        temp_dir = tempfile.mkdtemp(prefix="github_import_")
        repo_path = str(Path(temp_dir) / repo)

        try:
            git.Repo.clone_from(url, repo_path, depth=1)

            # Step 4: Count files
            await self._emit_progress("cloning", 50, "统计文件...")
            file_count = self._count_files(repo_path)
            if file_count > self.MAX_FILES:
                raise TooManyFiles(file_count, self.MAX_FILES)

            # Step 5: Parse and index
            await self._emit_progress("parsing", 60, "解析代码...")

            indexed_files = 0
            total_snippets = 0

            for file_path in Path(repo_path).rglob("*"):
                if not file_path.is_file():
                    continue
                if file_path.suffix not in self.SUPPORTED_EXTENSIONS:
                    continue

                try:
                    snippets = code_parser.parse_file(str(file_path))
                    if not snippets:
                        continue

                    for snippet in snippets:
                        # Generate embedding using existing service
                        from app.services.embeddings import embedding_service
                        embedding = embedding_service.generate_embedding(snippet.code)

                        # Store in VectorAI DB
                        await vectorai_client.insert_vector(
                            id=snippet.id,
                            vector=embedding,
                            metadata={
                                "file_path": snippet.file_path,
                                "language": snippet.language.value,
                                "code_type": snippet.code_type.value,
                                "code": snippet.code,
                                "start_line": snippet.start_line,
                                "end_line": snippet.end_line,
                                "function_name": snippet.metadata.function_name,
                                "class_name": snippet.metadata.class_name
                            }
                        )
                        total_snippets += 1

                    indexed_files += 1
                    progress = 60 + int((indexed_files / min(file_count, 100)) * 20)
                    await self._emit_progress("parsing", progress, f"已解析 {indexed_files}/{file_count} 个文件")

                except Exception as e:
                    print(f"Error processing file {file_path}: {e}")
                    continue

            await self._emit_progress("indexing", 90, "完成...")

            return {
                "total_snippets": total_snippets,
                "total_files": indexed_files
            }

        finally:
            # Register temp directory for cleanup after 24 hours
            register_temp_dir(task_id, temp_dir)
