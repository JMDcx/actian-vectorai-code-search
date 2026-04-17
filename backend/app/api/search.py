from fastapi import APIRouter, HTTPException
import time

from app.models.schemas import SearchRequest, SearchResponse, SearchResultItem, CodeSnippet
from app.services.embeddings import embedding_service
from app.core.database import vectorai_client

router = APIRouter(prefix="/api/search", tags=["search"])


@router.post("/", response_model=SearchResponse)
async def search_codebase(request: SearchRequest) -> SearchResponse:
    """
    Search codebase using natural language query with semantic similarity.

    Args:
        request: Search request with query and parameters

    Returns:
        SearchResponse with ranked results
    """
    start_time = time.time()

    # Generate query embedding
    query_embedding = embedding_service.generate_query_embedding(request.query)

    # Search VectorAI DB
    search_results = await vectorai_client.search_vectors(
        query_vector=query_embedding,
        limit=request.limit,
        threshold=request.threshold
    )

    # Convert to search response format
    results = []
    for result in search_results:
        snippet = _result_to_snippet(result)
        similarity_score = result.get("score", 0.0)

        result_item = SearchResultItem(
            snippet=snippet,
            similarity_score=similarity_score,
            explanation=_generate_explanation(snippet, request.query)
        )
        results.append(result_item)

    execution_time = (time.time() - start_time) * 1000

    return SearchResponse(
        query=request.query,
        results=results,
        total_results=len(results),
        execution_time_ms=execution_time
    )


def _result_to_snippet(result: dict) -> CodeSnippet:
    """Convert VectorAI DB result to CodeSnippet model."""
    payload = result.get("payload", {})

    return CodeSnippet(
        id=result.get("id", ""),
        file_path=payload.get("file_path", ""),
        language=payload.get("language", "python"),
        code_type=payload.get("code_type", "function"),
        code=payload.get("code", ""),
        start_line=payload.get("start_line", 0),
        end_line=payload.get("end_line", 0),
        metadata={
            "function_name": payload.get("function_name"),
            "class_name": payload.get("class_name"),
            "parameters": payload.get("parameters", []),
            "returns": payload.get("returns"),
            "dependencies": payload.get("dependencies", []),
            "decorators": payload.get("decorators", [])
        }
    )


def _generate_explanation(snippet: CodeSnippet, query: str) -> str:
    """Generate a simple explanation for the search result."""
    if snippet.metadata.function_name:
        return f"Function '{snippet.metadata.function_name}' appears relevant to your query about '{query}'"
    elif snippet.metadata.class_name:
        return f"Class '{snippet.metadata.class_name}' appears relevant to your query about '{query}'"
    else:
        return f"Code from {snippet.file_path} matches your query about '{query}'"


@router.get("/health")
async def search_health():
    """Health check for search endpoint."""
    return {
        "status": "healthy",
        "vectorai_connected": await vectorai_client.health_check()
    }
