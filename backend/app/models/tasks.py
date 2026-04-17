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
