# backend/app/api/github.py
from fastapi import APIRouter, HTTPException
from app.models.tasks import GitHubImportRequest, GitHubImportResponse
from app.services.github_importer import GitHubImporter, cleanup_old_temp_dirs
from app.services.code_parser import code_parser
from app.core.database import vectorai_client
from app.api.websocket import manager
import uuid
import asyncio
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/github", tags=["github"])


# Store task status in memory (in production, use Redis or database)
_task_status = {}
# Keep references to background tasks to prevent garbage collection
_background_tasks = set()


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
    logger.info(f"Starting import task {task_id} for URL: {url}")
    try:
        _task_status[task_id] = {
            "task_id": task_id,
            "status": "processing",
            "step": None,
            "progress": 0,
            "created_at": datetime.utcnow()
        }
        logger.info(f"Task status set to processing")

        async def wrapper_callback(step: str, progress: int, message: str):
            logger.info(f"Progress callback: step={step}, progress={progress}, message={message}")
            await progress_callback(task_id, step, progress, message)

        logger.info(f"Creating GitHubImporter")
        importer = GitHubImporter(progress_callback=wrapper_callback)
        logger.info(f"Starting import_repo")
        stats = await importer.import_repo(url, task_id, code_parser, vectorai_client)
        logger.info(f"Import completed: {stats}")

        _task_status[task_id].update({
            "status": "completed",
            "progress": 100,
            "total_files": stats["total_files"]
        })

        await manager.send_message(task_id, {
            "type": "complete",
            "stats": stats
        })
        logger.info(f"Task {task_id} completed successfully")

    except Exception as e:
        logger.error(f"Task {task_id} failed: {type(e).__name__}: {e}", exc_info=True)
        _task_status[task_id].update({
            "status": "failed",
            "error": str(e)
        })

        await manager.send_message(task_id, {
            "type": "error",
            "error": type(e).__name__,
            "message": str(e)
        })
        logger.info(f"Error message sent for task {task_id}")


@router.options("/import")
async def import_options():
    """Handle OPTIONS preflight request for /import endpoint."""
    from fastapi import Response
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "600"
        }
    )


@router.post("/import", response_model=GitHubImportResponse, status_code=202)
async def import_github_repo(request: GitHubImportRequest):
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

    # Create and schedule the background task
    task = asyncio.ensure_future(run_import_task(task_id, request.url))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)

    # Give the event loop a chance to start the task
    await asyncio.sleep(0)

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
