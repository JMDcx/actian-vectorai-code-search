# GitHub URL Import Feature Design

## Overview

Enable users to import GitHub repositories directly from the frontend by providing a GitHub URL, eliminating the need for backend CLI access.

## Requirements

### Functional Requirements

1. **GitHub Repository Support**
   - Support public GitHub repositories only
   - Accept GitHub URL format: `https://github.com/{owner}/{repo}`
   - Validate URL format before processing

2. **Size Limits**
   - Maximum repository size: 50MB
   - Maximum file count: 500 files
   - Enforce limits before cloning to prevent resource waste

3. **User Interface**
   - Add GitHub import section to HomePage
   - Provide real-time progress feedback
   - Show detailed step-by-step progress (cloning → parsing → indexing)

4. **Progress Feedback**
   - Display current step (cloning, parsing, indexing)
   - Show percentage progress for each step
   - Provide statistics (total files, indexed snippets)
   - Handle errors gracefully with clear messages

5. **Temporary File Management**
   - Clone repository to temporary directory
   - Retain cloned files for 24 hours after successful import
   - Automatic cleanup of expired temporary directories

### Non-Functional Requirements

1. **Performance**
   - Don't block the API during import operations
   - Support concurrent import requests
   - WebSocket connection for real-time updates

2. **Error Handling**
   - Validate input before processing
   - Handle network timeouts gracefully
   - Provide actionable error messages
   - Support WebSocket reconnection

3. **Security**
   - Only support public repositories (no authentication needed)
   - Sanitize file paths to prevent directory traversal
   - Limit resource usage (CPU, memory, disk space)

## Architecture

### Backend Components

```
┌─────────────────────────────────────────────────────────┐
│                     FastAPI Application                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐         ┌──────────────┐             │
│  │ /api/github/ │         │    /ws/      │             │
│  │    import    │────────▶│ websocket    │             │
│  └──────────────┘         └──────────────┘             │
│         │                        │                       │
│         ▼                        ▼                       │
│  ┌──────────────┐         ┌──────────────┐             │
│  │  GitHub      │         │   Progress   │             │
│  │  Importer    │────────▶│   Manager    │             │
│  └──────────────┘         └──────────────┘             │
│         │                                                │
│         ▼                                                │
│  ┌──────────────┐         ┌──────────────┐             │
│  │  Code        │────────▶│  VectorAI    │             │
│  │  Parser      │         │  Client      │             │
│  └──────────────┘         └──────────────┘             │
└─────────────────────────────────────────────────────────┘
```

### Frontend Components

```
HomePage
└── GitHubImportSection
    ├── URL Input Form
    ├── ImportProgressBar
    │   ├── Step 1: Cloning
    │   ├── Step 2: Parsing
    │   ├── Step 3: Indexing
    │   └── Step 4: Complete
    └── useGitHubImport Hook
        └── WebSocket Connection
```

## API Design

### REST Endpoints

#### POST /api/github/import
Import a GitHub repository.

**Request:**
```json
{
  "url": "https://github.com/username/repo"
}
```

**Response (202 Accepted):**
```json
{
  "task_id": "uuid-v4",
  "status": "pending",
  "message": "Import task created"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid URL format
- `404 Not Found` - Repository not found or private
- `413 Payload Too Large` - Repository exceeds size limits
- `504 Gateway Timeout` - Network timeout during clone

#### GET /api/github/status/{task_id}
Get current status of an import task.

**Response:**
```json
{
  "task_id": "uuid-v4",
  "status": "processing",
  "step": "parsing",
  "progress": 60,
  "total_files": 120,
  "indexed_files": 50,
  "created_at": "2026-04-17T10:00:00Z"
}
```

### WebSocket Endpoint

#### WS /ws/github/import/{task_id}
Real-time progress updates for an import task.

**Server → Client Messages:**

Step update:
```json
{
  "type": "step",
  "step": "cloning" | "parsing" | "indexing",
  "message": "克隆仓库中...",
  "progress": 45
}
```

Complete:
```json
{
  "type": "complete",
  "stats": {
    "total_snippets": 450,
    "total_files": 120,
    "duration_ms": 15000
  }
}
```

Error:
```json
{
  "type": "error",
  "error": "repository_too_large",
  "message": "仓库大小超过限制（最大 50MB）",
  "details": {
    "size_mb": 125,
    "limit_mb": 50
  }
}
```

## Data Models

### Backend Models

```python
class GitHubImportRequest(BaseModel):
    url: str = Field(..., pattern=r"^https://github\.com/[^/]+/[^/]+$")

class GitHubImportResponse(BaseModel):
    task_id: str
    status: Literal["pending", "processing", "completed", "failed"]
    message: str

class ImportTaskStatus(BaseModel):
    task_id: str
    status: Literal["pending", "processing", "completed", "failed"]
    step: Optional[Literal["cloning", "parsing", "indexing"]]
    progress: int = Field(default=0, ge=0, le=100)
    total_files: Optional[int] = None
    indexed_files: Optional[int] = None
    created_at: datetime
```

### Frontend Types

```typescript
interface ImportState {
  status: 'idle' | 'importing' | 'completed' | 'error'
  currentStep: 'cloning' | 'parsing' | 'indexing' | null
  progress: number
  error: string | null
  stats: ImportStats | null
}

interface ImportStats {
  total_snippets: number
  total_files: number
  duration_ms: number
}

interface WebSocketMessage {
  type: 'step' | 'complete' | 'error'
  step?: 'cloning' | 'parsing' | 'indexing'
  message?: string
  progress?: number
  stats?: ImportStats
  error?: string
  details?: Record<string, any>
}
```

## Implementation Details

### Backend: GitHub Importer Service

**File:** `backend/app/services/github_importer.py`

```python
import git
import tempfile
import aiohttp
from pathlib import Path
from typing import Tuple, Optional

class GitHubImporter:
    MAX_SIZE_MB = 50
    MAX_FILES = 500

    def __init__(self, progress_callback):
        self.progress_callback = progress_callback

    def _parse_github_url(self, url: str) -> Optional[Tuple[str, str]]:
        """Parse GitHub URL to extract owner and repo."""
        # https://github.com/{owner}/{repo}
        pattern = r"^https://github\.com/([^/]+)/([^/]+)$"
        match = re.match(pattern, url)
        return (match.group(1), match.group(2)) if match else None

    async def _check_repo_size(self, owner: str, repo: str) -> int:
        """Check repository size using GitHub API."""
        url = f"https://api.github.com/repos/{owner}/{repo}"
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as resp:
                if resp.status == 404:
                    raise RepositoryNotFound()
                data = await resp.json()
                return data.get("size", 0) / 1024  # KB to MB

    async def import_repo(self, url: str, task_id: str):
        """Main import workflow."""
        try:
            # Step 1: Validate and check size
            await self._emit_progress("cloning", 0, "验证仓库...")
            owner, repo = self._parse_github_url(url)
            size_mb = await self._check_repo_size(owner, repo)

            if size_mb > self.MAX_SIZE_MB:
                raise RepositoryTooLarge(size_mb, self.MAX_SIZE_MB)

            # Step 2: Clone repository
            await self._emit_progress("cloning", 10, "克隆仓库...")
            temp_dir = tempfile.mkdtemp(prefix="github_import_")
            repo_path = f"{temp_dir}/{repo}"

            git.Repo.clone_from(url, repo_path)

            # Step 3: Count files
            await self._emit_progress("cloning", 50, "统计文件...")
            file_count = self._count_files(repo_path)
            if file_count > self.MAX_FILES:
                raise TooManyFiles(file_count, self.MAX_FILES)

            # Step 4: Parse and index (reusing existing logic)
            await self._emit_progress("parsing", 60, "解析代码...")
            await self._index_directory(repo_path, task_id)

            await self._emit_progress("indexing", 90, "生成向量...")

            # Step 5: Complete
            await self._emit_complete(stats)

        except Exception as e:
            await self._emit_error(str(e))
            raise
```

### Backend: WebSocket Manager

**File:** `backend/app/api/websocket.py`

```python
from fastapi import WebSocket
from typing import Dict

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, task_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[task_id] = websocket

    def disconnect(self, task_id: str):
        self.active_connections.pop(task_id, None)

    async def send_message(self, task_id: str, message: dict):
        if task_id in self.active_connections:
            await self.active_connections[task_id].send_json(message)

manager = ConnectionManager()

@router.websocket("/ws/github/import/{task_id}")
async def github_import_websocket(websocket: WebSocket, task_id: str):
    await manager.connect(task_id, websocket)
    try:
        while True:
            # Keep connection alive, receive ping/pong
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(task_id)
```

### Frontend: GitHub Import Component

**File:** `frontend/src/components/GitHubImportSection.tsx`

```tsx
export function GitHubImportSection() {
  const [url, setUrl] = useState('')
  const { state, startImport, reset } = useGitHubImport()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    startImport(url)
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-xl font-semibold mb-4">📥 导入 GitHub 仓库</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="url"
          placeholder="https://github.com/username/repo"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={state.status === 'importing'}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg"
        />

        {state.error && (
          <div className="text-red-400 text-sm">{state.error}</div>
        )}

        <button
          type="submit"
          disabled={state.status === 'importing'}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 rounded-lg font-medium"
        >
          {state.status === 'importing' ? '导入中...' : '开始导入'}
        </button>
      </form>

      {state.status === 'importing' && <ImportProgressBar state={state} />}

      {state.status === 'completed' && (
        <div className="mt-4 p-4 bg-green-900/20 rounded-lg">
          <p>✅ 导入完成！共索引 {state.stats?.total_snippets} 个代码片段</p>
          <Link to="/search" className="text-primary-400">开始搜索</Link>
        </div>
      )}
    </div>
  )
}
```

### Frontend: Progress Bar Component

**File:** `frontend/src/components/ImportProgressBar.tsx`

```tsx
interface Props {
  state: ImportState
}

const STEPS = [
  { key: 'cloning', label: '📥 克隆仓库', icon: Loader2 },
  { key: 'parsing', label: '🔍 解析代码', icon: FileCode },
  { key: 'indexing', label: '🧠 生成向量', icon: Brain },
  { key: 'completed', label: '✅ 完成', icon: CheckCircle },
]

export function ImportProgressBar({ state }: Props) {
  const currentStepIndex = STEPS.findIndex(s => s.key === state.currentStep)

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between text-sm">
        {STEPS.map((step, index) => (
          <div
            key={step.key}
            className={`flex items-center space-x-2 ${
              index <= currentStepIndex ? 'text-primary-400' : 'text-gray-600'
            }`}
          >
            <step.icon className="h-4 w-4" />
            <span>{step.label}</span>
          </div>
        ))}
      </div>

      <div className="w-full bg-gray-800 rounded-full h-2">
        <div
          className="bg-primary-600 h-2 rounded-full transition-all"
          style={{ width: `${state.progress}%` }}
        />
      </div>

      <p className="text-sm text-gray-400 text-center">
        {state.progress}% 完成
      </p>
    </div>
  )
}
```

### Frontend: WebSocket Hook

**File:** `frontend/src/hooks/useGitHubImport.ts`

```tsx
export function useGitHubImport() {
  const [state, setState] = useState<ImportState>({
    status: 'idle',
    currentStep: null,
    progress: 0,
    error: null,
    stats: null
  })

  const startImport = async (url: string) => {
    try {
      // Start import task
      const resp = await axios.post('/api/github/import', { url })
      const taskId = resp.data.task_id

      setState({ status: 'importing', currentStep: null, progress: 0, error: null, stats: null })

      // Connect WebSocket
      const ws = new WebSocket(`ws://localhost:8000/ws/github/import/${taskId}`)

      ws.onmessage = (event) => {
        const msg: WebSocketMessage = JSON.parse(event.data)

        switch (msg.type) {
          case 'step':
            setState(s => ({ ...s, currentStep: msg.step!, progress: msg.progress! }))
            break
          case 'complete':
            setState({ status: 'completed', currentStep: 'completed', progress: 100, error: null, stats: msg.stats! })
            ws.close()
            break
          case 'error':
            setState({ status: 'error', currentStep: null, progress: 0, error: msg.message!, stats: null })
            ws.close()
            break
        }
      }

      ws.onerror = () => {
        setState(s => ({ ...s, error: '连接中断，请重试' }))
      }

    } catch (err: any) {
      setState({ status: 'error', currentStep: null, progress: 0, error: err.response?.data?.detail || '导入失败', stats: null })
    }
  }

  return { state, startImport, reset: () => setState(initialState) }
}
```

## Error Handling

### Error Categories

1. **Input Validation Errors**
   - Invalid GitHub URL format → 400 Bad Request
   - Empty URL → 400 Bad Request

2. **Repository Access Errors**
   - Repository not found → 404 Not Found
   - Private repository → 403 Forbidden (with message)
   - Network timeout → 504 Gateway Timeout

3. **Resource Limit Errors**
   - Repository too large (>50MB) → 413 Payload Too Large
   - Too many files (>500) → 413 Payload Too Large

4. **Processing Errors**
   - Unsupported file types → Skip with warning
   - Encoding errors → Skip file with warning
   - Git clone failure → 500 Internal Server Error

### Error Message Format

```json
{
  "error": "repository_too_large",
  "message": "仓库大小超过限制（最大 50MB）",
  "details": {
    "size_mb": 125,
    "limit_mb": 50,
    "suggestion": "请选择较小的仓库或联系支持"
  }
}
```

## Testing Strategy

### Unit Tests

**Backend:**
- `test_parse_github_url()` - URL parsing validation
- `test_check_repo_size()` - Size limit checking
- `test_count_files()` - File counting logic
- `test_import_workflow()` - Mock full import flow

**Frontend:**
- `test_url_validation()` - URL format validation
- `test_progress_bar_steps()` - Progress steps display
- `test_websocket_connection()` - WebSocket lifecycle
- `test_error_handling()` - Error state handling

### Integration Tests

**Full workflow:**
1. POST to `/api/github/import` with test repository
2. Verify task_id is returned
3. Connect to WebSocket
4. Verify progress messages are received
5. Verify final status is "completed"
6. Search the indexed code

### Manual Testing Scenarios

| Scenario | Expected Result |
|----------|----------------|
| Import public repo (tiangolo/fastapi) | Success |
| Import private repo | Friendly error message |
| Import repo >50MB | Rejected with size error |
| Invalid URL format | Validation error |
| WebSocket disconnect | Auto-reconnect or manual retry |
| Import during processing | Queue or reject |

## File Structure

### New Files

**Backend:**
```
backend/
├── app/
│   ├── services/
│   │   └── github_importer.py    # GitHub import service
│   ├── api/
│   │   ├── github.py              # GitHub API routes
│   │   └── websocket.py           # WebSocket management
│   └── models/
│       └── tasks.py               # Task models
└── tests/
    └── test_github_import.py      # Tests
```

**Frontend:**
```
frontend/
├── src/
│   ├── components/
│   │   ├── GitHubImportSection.tsx  # Import form
│   │   └── ImportProgressBar.tsx    # Progress display
│   ├── hooks/
│   │   └── useGitHubImport.ts       # WebSocket hook
│   └── types/
│       └── github.ts                # TypeScript types
```

### Modified Files

- `frontend/src/pages/HomePage.tsx` - Add `<GitHubImportSection />`
- `backend/main.py` - Register WebSocket route

## Dependencies

### Backend Additions
```txt
gitpython>=3.1.40
fastapi[websocket]>=0.104.0
aiohttp>=3.9.0
```

### Frontend
No new dependencies (uses native WebSocket API)

## Security Considerations

1. **URL Validation**
   - Strict regex pattern for GitHub URLs
   - Prevent SSRF attacks

2. **File Path Sanitization**
   - Use `tempfile` for isolated temporary directories
   - Validate no path traversal in repository paths

3. **Resource Limits**
   - Enforce size and file count limits
   - Timeout for git clone operations
   - Cleanup old temporary files

4. **No Authentication**
   - Only public repositories (no tokens needed)
   - Future extension for private repos with PAT

## Future Enhancements

1. **Private Repository Support**
   - Accept GitHub Personal Access Token
   - Secure token storage
   - Token management UI

2. **More Git Platforms**
   - GitLab public repositories
   - Bitbucket public repositories
   - Generic Git URLs

3. **Import History**
   - Show previously imported repositories
   - Re-index without re-cloning
   - Delete old imports

4. **Advanced Options**
   - Select specific branches/tags
   - File pattern filtering
   - Recursive directory selection

5. **Bulk Import**
   - Import multiple repositories
   - Queue management
   - Batch progress tracking
