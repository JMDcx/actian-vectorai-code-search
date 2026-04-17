from fastapi import APIRouter, HTTPException, UploadFile, File
import os
from pathlib import Path
from typing import List
import time

from app.models.schemas import IndexRequest, IndexResponse
from app.services.code_parser import code_parser
from app.services.embeddings import embedding_service
from app.core.database import vectorai_client

router = APIRouter(prefix="/api/index", tags=["indexing"])


@router.post("/", response_model=IndexResponse)
async def index_codebase(request: IndexRequest) -> IndexResponse:
    """
    Index a codebase directory by parsing files and storing embeddings in VectorAI DB.

    Args:
        request: Index request with path and options

    Returns:
        IndexResponse with counts and any errors
    """
    if not os.path.exists(request.path):
        raise HTTPException(status_code=404, detail=f"Path not found: {request.path}")

    indexed_files = 0
    total_snippets = 0
    errors = []

    # Find all matching files
    files_to_process = _find_files(
        request.path,
        request.file_patterns,
        request.recursive
    )

    for file_path in files_to_process:
        try:
            # Parse file
            snippets = code_parser.parse_file(file_path)

            if not snippets:
                continue

            # Generate embeddings and store
            for snippet in snippets:
                # Generate embedding
                embedding = embedding_service.generate_embedding(snippet.code)
                snippet.embedding = embedding

                # Store in VectorAI DB
                success = await vectorai_client.insert_vector(
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

                if success:
                    total_snippets += 1

            indexed_files += 1

        except Exception as e:
            errors.append(f"{file_path}: {str(e)}")

    return IndexResponse(
        indexed_files=indexed_files,
        total_snippets=total_snippets,
        errors=errors
    )


def _find_files(
    root_path: str,
    patterns: List[str],
    recursive: bool
) -> List[str]:
    """Find all files matching patterns."""
    files = []
    root = Path(root_path)

    if recursive:
        for pattern in patterns:
            files.extend(root.rglob(pattern))
    else:
        for pattern in patterns:
            files.extend(root.glob(pattern))

    # Filter to supported files and convert to strings
    return [str(f) for f in files if code_parser.is_supported_file(str(f))]


@router.get("/status")
async def indexing_status():
    """Get current indexing status."""
    return {
        "status": "ready",
        "message": "Codebase indexer is ready to process files"
    }
