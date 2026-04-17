from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class CodeType(str, Enum):
    """Types of code elements."""
    FUNCTION = "function"
    CLASS = "class"
    VARIABLE = "variable"
    IMPORT = "import"
    COMMENT = "comment"


class Language(str, Enum):
    """Supported programming languages."""
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    TYPESCRIPT = "typescript"


class CodeSnippetMetadata(BaseModel):
    """Metadata for a code snippet."""
    function_name: Optional[str] = None
    parameters: List[str] = []
    returns: Optional[str] = None
    dependencies: List[str] = []
    class_name: Optional[str] = None
    decorators: List[str] = []


class CodeSnippet(BaseModel):
    """A code snippet with vector embedding."""
    id: str
    file_path: str
    language: Language
    code_type: CodeType
    code: str
    start_line: int
    end_line: int
    embedding: Optional[List[float]] = None
    metadata: CodeSnippetMetadata = Field(default_factory=CodeSnippetMetadata)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class IndexRequest(BaseModel):
    """Request to index a codebase."""
    path: str
    recursive: bool = True
    file_patterns: List[str] = ["*.py", "*.js", "*.ts", "*.tsx"]


class IndexResponse(BaseModel):
    """Response from indexing operation."""
    indexed_files: int
    total_snippets: int
    errors: List[str] = []


class SearchRequest(BaseModel):
    """Request to search codebase."""
    query: str
    limit: int = Field(default=10, ge=1, le=100)
    threshold: float = Field(default=0.7, ge=0.0, le=1.0)

    # Filter fields
    language: Optional[str] = Field(default=None, pattern="^(python|javascript|typescript)$")
    code_type: Optional[str] = Field(default=None, pattern="^(function|class|import)$")
    file_path_pattern: Optional[str] = Field(default=None, max_length=200)
    sort_by: Optional[str] = Field(
        default="similarity",
        pattern="^(similarity|file_path|complexity)$"
    )


class SearchResultItem(BaseModel):
    """A single search result."""
    snippet: CodeSnippet
    similarity_score: float
    explanation: Optional[str] = None


class SearchResponse(BaseModel):
    """Response from search operation."""
    query: str
    results: List[SearchResultItem]
    total_results: int
    execution_time_ms: float


class ExplainRequest(BaseModel):
    """Request to explain code."""
    code: str
    language: Language
    context: Optional[str] = None


class ExplainResponse(BaseModel):
    """Response from code explanation."""
    explanation: str
    complexity: str
    suggestions: List[str] = []


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    vectorai_connected: bool
    version: str = "1.0.0"
