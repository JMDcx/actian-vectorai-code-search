from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import vectorai_client
from app.api import index, search, visualization, github
from app.models.schemas import HealthResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    print("Starting Semantic Codebase Navigator API...")
    print(f"VectorAI Endpoint: {settings.vectorai_endpoint}")
    print(f"VectorAI Collection: {settings.vectorai_collection}")

    # Initialize VectorAI DB collection
    try:
        await vectorai_client.initialize_collection(vector_size=768)
        print("VectorAI DB collection initialized")
    except Exception as e:
        print(f"Warning: Could not initialize VectorAI DB: {e}")

    yield

    # Shutdown
    print("Shutting down...")
    await vectorai_client.close()


# Create FastAPI app
app = FastAPI(
    title="Semantic Codebase Navigator",
    description="AI-powered code search and understanding tool",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(index.router)
app.include_router(search.router)
app.include_router(visualization.router)
app.include_router(github.router)


@app.get("/", response_model=HealthResponse)
async def root() -> HealthResponse:
    """Root endpoint with health check."""
    from app.core.database import vectorai_client

    return HealthResponse(
        status="healthy",
        vectorai_connected=await vectorai_client.health_check()
    )


@app.get("/health")
async def health():
    """Detailed health check endpoint."""
    from app.core.database import vectorai_client

    return {
        "status": "healthy",
        "vectorai_connected": await vectorai_client.health_check(),
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
