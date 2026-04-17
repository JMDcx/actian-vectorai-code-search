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
