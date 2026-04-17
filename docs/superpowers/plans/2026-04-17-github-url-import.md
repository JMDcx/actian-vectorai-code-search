# GitHub URL Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to import GitHub repositories directly from the frontend by providing a GitHub URL, with real-time progress feedback via WebSocket.

**Architecture:** Async task-based backend using GitPython for cloning, with WebSocket pushing progress to frontend. Frontend uses React components with WebSocket connection managed by custom hook.

**Tech Stack:** FastAPI (WebSocket), GitPython, React, TypeScript, WebSocket API

---

## File Structure Overview

### Backend Files (Create)
- `app/services/github_importer.py` - GitHub import service (clone, parse, index)
- `app/api/github.py` - GitHub REST API routes
- `app/api/websocket.py` - WebSocket connection manager
- `app/models/tasks.py` - Task-related Pydantic models

### Frontend Files (Create)
- `src/components/GitHubImportSection.tsx` - Import form component
- `src/components/ImportProgressBar.tsx` - Progress display component
- `src/hooks/useGitHubImport.ts` - WebSocket connection hook
- `src/types/github.ts` - GitHub-related TypeScript types

### Files (Modify)
- `app/main.py` - Register new routes
- `src/pages/HomePage.tsx` - Add GitHubImportSection
- `requirements.txt` - Add gitpython and aiohttp

---

## Task 1: Add Backend Dependencies

**Files:**
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Add new dependencies to requirements.txt**

```bash
cd backend
echo "gitpython>=3.1.40" >> requirements.txt
echo "aiohttp>=3.9.0" >> requirements.txt
```

- [ ] **Step 2: Install the new dependencies**

```bash
pip install gitpython aiohttp
```

Expected: Output showing successful installation

- [ ] **Step 3: Verify GitPython installation**

```bash
python -c "import git; print(git.__version__)"
```

Expected: Version number printed (e.g., 3.1.40)

- [ ] **Step 4: Commit dependency changes**

```bash
git add requirements.txt
git commit -m "feat: add gitpython and aiohttp dependencies for GitHub import"
```

---

## Task 2: Create Task Models

**Files:**
- Create: `backend/app/models/tasks.py`
- Test: `backend/tests/test_tasks.py`

- [ ] **Step 1: Write the failing test for task models**

```python
# backend/tests/test_tasks.py
from app.models.tasks import GitHubImportRequest, ImportTaskStatus

def test_github_import_request_valid_url():
    request = GitHubImportRequest(url="https://github.com/user/repo")
    assert request.url == "https://github.com/user/repo"

def test_github_import_request_invalid_url():
    import pytest
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        GitHubImportRequest(url="invalid-url")

def test_import_task_status():
    status = ImportTaskStatus(
        task_id="test-123",
        status="pending",
        step=None,
        progress=0
    )
    assert status.task_id == "test-123"
    assert status.status == "pending"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_tasks.py -v
```

Expected: FAIL with "ModuleNotFoundError: No module named 'app.models.tasks'"

- [ ] **Step 3: Create the task models file**

```python
# backend/app/models/tasks.py
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime
import re


class GitHubImportRequest(BaseModel):
    """Request to import a GitHub repository."""
    url: str = Field(..., description="GitHub repository URL")

    @field_validator('url')
    @classmethod
    def validate_github_url(cls, v: str) -> str:
        """Validate GitHub URL format."""
        pattern = r"^https://github\.com/[^/]+/[^/]+$"
        if not re.match(pattern, v):
            raise ValueError("Invalid GitHub URL format. Expected: https://github.com/owner/repo")
        return v


class GitHubImportResponse(BaseModel):
    """Response when starting an import task."""
    task_id: str
    status: Literal["pending", "processing", "completed", "failed"]
    message: str


class ImportTaskStatus(BaseModel):
    """Status of an import task."""
    task_id: str
    status: Literal["pending", "processing", "completed", "failed"]
    step: Optional[Literal["cloning", "parsing", "indexing"]] = None
    progress: int = Field(default=0, ge=0, le=100)
    total_files: Optional[int] = None
    indexed_files: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ImportStats(BaseModel):
    """Statistics for completed import."""
    total_snippets: int
    total_files: int
    duration_ms: int
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_tasks.py -v
```

Expected: PASS (3 tests passed)

- [ ] **Step 5: Commit task models**

```bash
git add backend/app/models/tasks.py backend/tests/test_tasks.py
git commit -m "feat: add task models for GitHub import"
```

---

## Task 3: Create WebSocket Connection Manager

**Files:**
- Create: `backend/app/api/websocket.py`
- Test: `backend/tests/test_websocket.py`

- [ ] **Step 1: Write the failing test for connection manager**

```python
# backend/tests/test_websocket.py
from app.api.websocket import ConnectionManager
import asyncio

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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_websocket.py -v
```

Expected: FAIL with "ModuleNotFoundError: No module named 'app.api.websocket'"

- [ ] **Step 3: Create WebSocket connection manager**

```python
# backend/app/api/websocket.py
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict


class ConnectionManager:
    """Manage WebSocket connections for real-time progress updates."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, task_id: str, websocket: WebSocket):
        """Accept and store a WebSocket connection."""
        await websocket.accept()
        self.active_connections[task_id] = websocket

    def disconnect(self, task_id: str):
        """Remove a WebSocket connection."""
        self.active_connections.pop(task_id, None)

    async def send_message(self, task_id: str, message: dict):
        """Send a JSON message to a specific task connection."""
        if task_id in self.active_connections:
            try:
                await self.active_connections[task_id].send_json(message)
            except Exception:
                # Connection may be closed, remove it
                self.disconnect(task_id)

    async def broadcast(self, message: dict):
        """Broadcast a message to all active connections."""
        for task_id in list(self.active_connections.keys()):
            await self.send_message(task_id, message)


# Global instance
manager = ConnectionManager()
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_websocket.py -v
```

Expected: PASS (3 tests passed)

- [ ] **Step 5: Commit WebSocket manager**

```bash
git add backend/app/api/websocket.py backend/tests/test_websocket.py
git commit -m "feat: add WebSocket connection manager"
```

---

## Task 4: Create GitHub Importer Service

**Files:**
- Create: `backend/app/services/github_importer.py`
- Test: `backend/tests/test_github_importer.py`

- [ ] **Step 1: Write the failing test for URL parsing**

```python
# backend/tests/test_github_importer.py
from app.services.github_importer import GitHubImporter
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_github_importer.py::test_parse_github_url_valid -v
```

Expected: FAIL with "ModuleNotFoundError: No module named 'app.services.github_importer'"

- [ ] **Step 3: Create GitHub importer service with URL parsing**

```python
# backend/app/services/github_importer.py
import re
import git
import tempfile
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
        url = url.rstrip('.git')
        pattern = r"^https://github\.com/([^/]+)/([^/]+)$"
        match = re.match(pattern, url)
        return (match.group(1), match.group(2)) if match else None

    async def _emit_progress(self, step: str, progress: int, message: str):
        """Emit a progress update if callback is provided."""
        if self.progress_callback:
            await self.progress_callback(step, progress, message)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_github_importer.py::test_parse_github_url_valid -v
cd backend && python -m pytest tests/test_github_importer.py::test_parse_github_url_invalid -v
cd backend && python -m pytest tests/test_github_importer.py::test_parse_github_url_with_git_extension -v
```

Expected: PASS (3 tests passed)

- [ ] **Step 5: Write test for repository size checking**

```python
# backend/tests/test_github_importer.py (add to existing file)
import pytest
from app.services.github_importer import RepositoryTooLarge, RepositoryNotFound

@pytest.mark.asyncio
async def test_check_repo_size_within_limit(mocker):
    importer = GitHubImporter()
    # Mock GitHub API response
    mock_response = mocker.Mock()
    mock_response.status = 200
    mock_response.json = asyncio.coroutine(lambda: {"size": 10240})  # 10MB in KB

    mock_session = mocker.Mock()
    mock_session.get.return_value.__aenter__.return_value = mock_response
    mocker.patch('aiohttp.ClientSession', return_value=mock_session)

    size_mb = await importer._check_repo_size("user", "repo")
    assert size_mb < 50  # Should be ~10MB

@pytest.mark.asyncio
async def test_check_repo_size_exceeds_limit(mocker):
    importer = GitHubImporter()
    mock_response = mocker.Mock()
    mock_response.status = 200
    mock_response.json = asyncio.coroutine(lambda: {"size": 102400})  # 100MB

    mock_session = mocker.Mock()
    mock_session.get.return_value.__aenter__.return_value = mock_response
    mocker.patch('aiohttp.ClientSession', return_value=mock_session)

    size_mb = await importer._check_repo_size("user", "repo")
    assert size_mb > 50
```

- [ ] **Step 6: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_github_importer.py::test_check_repo_size_within_limit -v
```

Expected: FAIL with "AttributeError: 'GitHubImporter' object has no attribute '_check_repo_size'"

- [ ] **Step 7: Add repository size checking method**

```python
# backend/app/services/github_importer.py (add to existing class)

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
        except aiohttp.ClientError as e:
            if isinstance(e, asyncio.TimeoutError):
                raise RepositoryNotFound("Request timeout")
            raise RepositoryNotFound(f"Failed to fetch repository info: {str(e)}")
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_github_importer.py -v
```

Expected: PASS (5 tests passed)

- [ ] **Step 9: Commit GitHub importer service (part 1)**

```bash
git add backend/app/services/github_importer.py backend/tests/test_github_importer.py
git commit -m "feat: add GitHub importer service with URL parsing and size check"
```

---

## Task 5: Complete GitHub Importer Service

**Files:**
- Modify: `backend/app/services/github_importer.py`

- [ ] **Step 1: Add file counting method**

```python
# backend/app/services/github_importer.py (add to existing class)

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
```

- [ ] **Step 2: Add main import workflow method**

```python
# backend/app/services/github_importer.py (add to existing class)

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
            # Note: temp_dir is automatically cleaned up when context exits
            # but we want to keep it for 24 hours, so we don't clean it here
            pass
```

- [ ] **Step 3: Update service to keep temp directory for 24 hours**

```python
# backend/app/services/github_importer.py (modify import_repo method)

import time
from datetime import datetime, timedelta

# At the top of the file, add a global registry
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


# In import_repo method, replace the finally block:
        finally:
            # Register temp directory for cleanup after 24 hours
            register_temp_dir(task_id, temp_dir)
```

- [ ] **Step 4: Commit GitHub importer service (complete)**

```bash
git add backend/app/services/github_importer.py
git commit -m "feat: add main import workflow to GitHub importer"
```

---

## Task 6: Create GitHub API Routes

**Files:**
- Create: `backend/app/api/github.py`
- Test: `backend/tests/test_github_api.py`

- [ ] **Step 1: Write the failing test for import endpoint**

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_github_api.py -v
```

Expected: FAIL with 404 Not Found (route doesn't exist)

- [ ] **Step 3: Create GitHub API routes**

```python
# backend/app/api/github.py
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models.tasks import GitHubImportRequest, GitHubImportResponse
from app.services.github_importer import GitHubImporter, cleanup_old_temp_dirs
from app.services.code_parser import code_parser
from app.core.database import vectorai_client
from app.api.websocket import manager
import uuid
from datetime import datetime


router = APIRouter(prefix="/api/github", tags=["github"])


# Store task status in memory (in production, use Redis or database)
_task_status = {}


async def progress_callback(task_id: str, step: str, progress: int, message: str):
    """Send progress update via WebSocket."""
    await manager.send_message(task_id, {
        "type": "step",
        "step": step,
        "progress": progress,
        "message": message
    })


async def run_import_task(task_id: str, url: str):
    """Background task to import GitHub repository."""
    try:
        _task_status[task_id] = {
            "task_id": task_id,
            "status": "processing",
            "step": None,
            "progress": 0,
            "created_at": datetime.utcnow()
        }

        importer = GitHubImporter(progress_callback=lambda s, p, m: progress_callback(task_id, s, p, m))
        stats = await importer.import_repo(url, task_id, code_parser, vectorai_client)

        _task_status[task_id].update({
            "status": "completed",
            "progress": 100,
            "total_files": stats["total_files"]
        })

        await manager.send_message(task_id, {
            "type": "complete",
            "stats": stats
        })

    except Exception as e:
        _task_status[task_id].update({
            "status": "failed",
            "error": str(e)
        })

        await manager.send_message(task_id, {
            "type": "error",
            "error": type(e).__name__,
            "message": str(e)
        })


@router.post("/import", response_model=GitHubImportResponse, status_code=202)
async def import_github_repo(request: GitHubImportRequest, background_tasks: BackgroundTasks):
    """Import a GitHub repository.

    Creates an async task to clone, parse, and index the repository.
    Returns immediately with a task_id for progress tracking.
    """
    task_id = str(uuid.uuid4())

    _task_status[task_id] = {
        "task_id": task_id,
        "status": "pending",
        "step": None,
        "progress": 0,
        "created_at": datetime.utcnow()
    }

    # Run import in background
    background_tasks.add_task(run_import_task, task_id, request.url)

    return GitHubImportResponse(
        task_id=task_id,
        status="pending",
        message="Import task created"
    )


@router.get("/status/{task_id}")
async def get_import_status(task_id: str):
    """Get the current status of an import task."""
    if task_id not in _task_status:
        raise HTTPException(status_code=404, detail="Task not found")
    return _task_status[task_id]


@router.post("/cleanup")
async def cleanup_temp_dirs():
    """Manually trigger cleanup of old temporary directories."""
    cleanup_old_temp_dirs()
    return {"status": "cleanup completed"}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_github_api.py -v
```

Expected: PASS (2 tests passed)

- [ ] **Step 5: Commit GitHub API routes**

```bash
git add backend/app/api/github.py backend/tests/test_github_api.py
git commit -m "feat: add GitHub API routes for repository import"
```

---

## Task 7: Add WebSocket Route

**Files:**
- Modify: `backend/app/api/websocket.py`

- [ ] **Step 1: Add WebSocket endpoint**

```python
# backend/app/api/websocket.py (add to existing file)

from fastapi import APIRouter

router = APIRouter()


@router.websocket("/ws/github/import/{task_id}")
async def github_import_websocket(websocket: WebSocket, task_id: str):
    """WebSocket endpoint for real-time import progress updates."""
    await manager.connect(task_id, websocket)
    try:
        while True:
            # Keep connection alive, receive ping/pong
            data = await websocket.receive_text()
            # Echo back or handle client messages if needed
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(task_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(task_id)
```

- [ ] **Step 2: Register GitHub and WebSocket routes in main.py**

```python
# backend/app/main.py (add to existing imports)
from app.api import github, websocket

# In the app setup, add:
app.include_router(github.router)
app.include_router(websocket.router)
```

- [ ] **Step 3: Commit WebSocket route**

```bash
git add backend/app/api/websocket.py backend/app/main.py
git commit -m "feat: add WebSocket route for real-time progress updates"
```

---

## Task 8: Create Frontend TypeScript Types

**Files:**
- Create: `frontend/src/types/github.ts`

- [ ] **Step 1: Create GitHub TypeScript types**

```typescript
// frontend/src/types/github.ts
export interface GitHubImportRequest {
  url: string
}

export interface GitHubImportResponse {
  task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  message: string
}

export interface ImportTaskStatus {
  task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  step: 'cloning' | 'parsing' | 'indexing' | null
  progress: number
  total_files?: number
  indexed_files?: number
  created_at: string
}

export interface ImportStats {
  total_snippets: number
  total_files: number
  duration_ms: number
}

export interface WebSocketMessage {
  type: 'step' | 'complete' | 'error'
  step?: 'cloning' | 'parsing' | 'indexing'
  message?: string
  progress?: number
  stats?: ImportStats
  error?: string
  details?: Record<string, any>
}

export interface ImportState {
  status: 'idle' | 'importing' | 'completed' | 'error'
  currentStep: 'cloning' | 'parsing' | 'indexing' | null
  progress: number
  error: string | null
  stats: ImportStats | null
}
```

- [ ] **Step 2: Commit TypeScript types**

```bash
git add frontend/src/types/github.ts
git commit -m "feat: add TypeScript types for GitHub import"
```

---

## Task 9: Create useGitHubImport Hook

**Files:**
- Create: `frontend/src/hooks/useGitHubImport.ts`

- [ ] **Step 1: Create useGitHubImport hook**

```typescript
// frontend/src/hooks/useGitHubImport.ts
import { useState, useCallback } from 'react'
import axios from 'axios'
import { ImportState, ImportStats, WebSocketMessage } from '../types/github'

const initialState: ImportState = {
  status: 'idle',
  currentStep: null,
  progress: 0,
  error: null,
  stats: null
}

export function useGitHubImport() {
  const [state, setState] = useState<ImportState>(initialState)

  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  const startImport = useCallback(async (url: string) => {
    try {
      setState({ status: 'importing', currentStep: null, progress: 0, error: null, stats: null })

      // Start import task
      const resp = await axios.post('/api/github/import', { url })
      const taskId = resp.data.task_id

      // Connect WebSocket
      const wsUrl = `ws://localhost:8000/ws/github/import/${taskId}`
      const ws = new WebSocket(wsUrl)

      ws.onmessage = (event) => {
        try {
          const msg: WebSocketMessage = JSON.parse(event.data)

          switch (msg.type) {
            case 'step':
              setState(s => ({
                ...s,
                currentStep: msg.step || null,
                progress: msg.progress || s.progress
              }))
              break
            case 'complete':
              setState({
                status: 'completed',
                currentStep: 'completed',
                progress: 100,
                error: null,
                stats: msg.stats || null
              })
              ws.close()
              break
            case 'error':
              setState({
                status: 'error',
                currentStep: null,
                progress: 0,
                error: msg.message || '导入失败',
                stats: null
              })
              ws.close()
              break
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      ws.onerror = () => {
        setState(s => ({
          ...s,
          status: 'error',
          error: '连接中断，请重试'
        }))
        ws.close()
      }

      ws.onclose = () => {
        if (state.status === 'importing') {
          // Connection closed unexpectedly
          setState(s => ({
            ...s,
            status: 'error',
            error: '连接已关闭'
          }))
        }
      }

      // Keep WebSocket reference for cleanup
      ;(state as any)._ws = ws

    } catch (err: any) {
      setState({
        status: 'error',
        currentStep: null,
        progress: 0,
        error: err.response?.data?.detail || '导入失败',
        stats: null
      })
    }
  }, [state])

  return { state, startImport, reset }
}
```

- [ ] **Step 2: Commit useGitHubImport hook**

```bash
git add frontend/src/hooks/useGitHubImport.ts
git commit -m "feat: add useGitHubImport hook with WebSocket support"
```

---

## Task 10: Create ImportProgressBar Component

**Files:**
- Create: `frontend/src/components/ImportProgressBar.tsx`

- [ ] **Step 1: Create ImportProgressBar component**

```tsx
// frontend/src/components/ImportProgressBar.tsx
import { ImportState } from '../types/github'
import { Loader2, FileCode, Brain, CheckCircle } from 'lucide-react'

interface Props {
  state: ImportState
}

const STEPS = [
  { key: 'cloning', label: '克隆仓库', icon: Loader2 },
  { key: 'parsing', label: '解析代码', icon: FileCode },
  { key: 'indexing', label: '生成向量', icon: Brain },
  { key: 'completed', label: '完成', icon: CheckCircle },
] as const

export default function ImportProgressBar({ state }: Props) {
  const currentStepIndex = STEPS.findIndex(s => s.key === state.currentStep)
  const Icon = STEPS[Math.max(0, currentStepIndex)]?.icon || Loader2

  return (
    <div className="mt-6 space-y-4">
      {/* Step Indicators */}
      <div className="flex items-center justify-between text-sm">
        {STEPS.map((step, index) => {
          const StepIcon = step.icon
          const isActive = index <= currentStepIndex
          const isCurrent = index === currentStepIndex

          return (
            <div
              key={step.key}
              className={`flex items-center space-x-2 transition-colors ${
                isActive ? 'text-primary-400' : 'text-gray-600'
              }`}
            >
              <StepIcon className={`h-4 w-4 ${isCurrent ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{step.label}</span>
            </div>
          )
        })}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
        <div
          className="bg-primary-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${state.progress}%` }}
        />
      </div>

      {/* Progress Text */}
      <p className="text-sm text-gray-400 text-center">
        {state.progress}% 完成
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Commit ImportProgressBar component**

```bash
git add frontend/src/components/ImportProgressBar.tsx
git commit -m "feat: add ImportProgressBar component"
```

---

## Task 11: Create GitHubImportSection Component

**Files:**
- Create: `frontend/src/components/GitHubImportSection.tsx`

- [ ] **Step 1: Create GitHubImportSection component**

```tsx
// frontend/src/components/GitHubImportSection.tsx
import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useGitHubImport } from '../hooks/useGitHubImport'
import ImportProgressBar from './ImportProgressBar'
import { GitHub, ArrowRight } from 'lucide-react'

export default function GitHubImportSection() {
  const [url, setUrl] = useState('')
  const { state, startImport, reset } = useGitHubImport()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    try {
      await startImport(url)
    } catch (err) {
      console.error('Failed to start import:', err)
    }
  }

  const handleReset = () => {
    setUrl('')
    reset()
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-primary-500/10 rounded-lg">
          <GitHub className="h-6 w-6 text-primary-400" />
        </div>
        <h2 className="text-xl font-semibold">导入 GitHub 仓库</h2>
      </div>

      {state.status === 'idle' || state.status === 'error' ? (
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="url"
                placeholder="https://github.com/username/repo"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-500"
                disabled={state.status === 'importing'}
              />
              <p className="text-xs text-gray-500 mt-2">
                支持公开仓库，最大 50MB 或 500 个文件
              </p>
            </div>

            {state.error && (
              <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg">
                <p className="text-red-300 text-sm">{state.error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!url.trim() || state.status === 'importing'}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <span>开始导入</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </>
      ) : state.status === 'importing' ? (
        <ImportProgressBar state={state} />
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg">
            <p className="text-green-300">
              ✅ 导入完成！共索引 {state.stats?.total_snippets || 0} 个代码片段
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              to="/search"
              className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 rounded-lg font-medium text-center transition-colors"
            >
              开始搜索
            </Link>
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
            >
              导入另一个
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit GitHubImportSection component**

```bash
git add frontend/src/components/GitHubImportSection.tsx
git commit -m "feat: add GitHubImportSection component"
```

---

## Task 12: Integrate GitHubImportSection into HomePage

**Files:**
- Modify: `frontend/src/pages/HomePage.tsx`

- [ ] **Step 1: Add GitHubImportSection to HomePage**

```tsx
// frontend/src/pages/HomePage.tsx (add import)
import GitHubImportSection from '../components/GitHubImportSection'

// In the component, add after the Hero section (around line 33):
      </section>

      {/* GitHub Import Section */}
      <section>
        <GitHubImportSection />
      </section>

      {/* Features Section */}
      <section className="grid md:grid-cols-3 gap-8">
```

- [ ] **Step 2: Commit HomePage integration**

```bash
git add frontend/src/pages/HomePage.tsx
git commit -m "feat: integrate GitHubImportSection into HomePage"
```

---

## Task 13: Manual Testing and Verification

- [ ] **Step 1: Start both servers**

```bash
# Terminal 1: Backend
cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd frontend && npm run dev
```

- [ ] **Step 2: Test with a small real repository**

Visit: http://localhost:5173

1. Enter URL: `https://github.com/pallets/flask` (or another small repo)
2. Click "开始导入"
3. Verify progress bar shows steps
4. Verify completion message appears
5. Click "开始搜索" and verify search works

- [ ] **Step 3: Test error cases**

1. Invalid URL: `not-a-url` → Should show validation error
2. Private repo: `https://github.com/private/test` → Should show "not found" error
3. Large repo: Try a repo >50MB → Should show size error

- [ ] **Step 4: Verify temporary files**

```bash
ls -la /tmp/github_import_*
# Should see temporary directories
```

- [ ] **Step 5: Test cleanup endpoint**

```bash
curl -X POST http://localhost:8000/api/github/cleanup
# Should return cleanup completed
```

---

## Task 14: Final Polish and Documentation

- [ ] **Step 1: Add GitHub import section to README**

```markdown
## GitHub Import

Import public GitHub repositories directly from the web interface:

1. Navigate to the home page
2. Enter a GitHub repository URL (e.g., https://github.com/pallets/flask)
3. Click "开始导入" to start the import process
4. Monitor real-time progress
5. Search the indexed code using semantic search

**Limits:**
- Maximum repository size: 50MB
- Maximum file count: 500 files
- Only public repositories supported
```

- [ ] **Step 2: Add FAQ entry**

```markdown
### How do I import my code?

Currently, you can import public GitHub repositories by URL. For private repositories or local files, use the backend API directly:

\`\`\`bash
curl -X POST "http://localhost:8000/api/index/" \\
  -H "Content-Type: application/json" \\
  -d '{"path": "./my-project", "recursive": true}'
\`\`\`
```

- [ ] **Step 3: Commit documentation updates**

```bash
git add README.md
git commit -m "docs: add GitHub import documentation"
```

---

## Task 15: Final Integration Test

- [ ] **Step 1: Run full backend test suite**

```bash
cd backend && python -m pytest tests/ -v
```

Expected: All tests pass

- [ ] **Step 2: Verify frontend TypeScript compilation**

```bash
cd frontend && npm run build
```

Expected: Build succeeds without errors

- [ ] **Step 3: Check git status and create summary commit**

```bash
git status
git add -A
git commit -m "feat: complete GitHub URL import feature

- Add GitHub repository import via URL
- Real-time progress updates via WebSocket
- File count and size limits (50MB, 500 files)
- Temporary files retained for 24 hours
- Frontend components for import UI
- Comprehensive error handling

Closes #github-import"
```

---

## Verification Checklist

Before considering this feature complete:

- [ ] Can import a small public GitHub repository
- [ ] Progress bar shows real-time updates
- [ ] Search works on imported code
- [ ] Invalid URLs show validation errors
- [ ] Repository size limits are enforced
- [ ] Private repositories show helpful error messages
- [ ] Temporary files are created and cleaned up
- [ ] WebSocket connections close properly
- [ ] All tests pass
- [ ] TypeScript compiles without errors
- [ ] Documentation is updated

---

## Expected Results

After completion, users will be able to:

1. **Import from web** - No backend CLI access needed
2. **Real-time feedback** - See import progress step-by-step
3. **Smart limits** - Prevent oversized repositories
4. **Error handling** - Clear error messages for failures
5. **Quick search** - Immediately search imported code

The feature is production-ready with proper error handling, progress tracking, and cleanup mechanisms.
