# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Python 3.11+ / FastAPI)

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env with VectorAI DB credentials

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
python -m pytest tests/ -v

# Run specific test file
python -m pytest tests/test_code_parser.py -v

# Run specific test function
python -m pytest tests/test_embeddings.py::test_generate_embedding -v
```

### Frontend (React 18 / Vite / TypeScript)

```bash
cd frontend

# Install dependencies
npm install

# Run development server (runs on http://localhost:5173)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

### Docker Deployment

```bash
cd backend
docker-compose up --build
```

## Architecture Overview

This is a full-stack semantic code search application built for the Actian VectorAI DB Build Challenge.

**Backend (FastAPI):**
- `app/main.py` - FastAPI application entry point with CORS and router configuration
- `app/api/` - API route handlers (index.py, search.py)
- `app/services/` - Business logic (code_parser.py, embeddings.py)
- `app/core/` - Configuration and database client (config.py, database.py)
- `app/models/schemas.py` - Pydantic models for request/response validation

**Frontend (React + Vite):**
- `src/services/api.ts` - Axios client with `/api` proxy to backend
- `src/pages/` - Page components (HomePage, SearchPage)
- `src/components/` - Reusable UI components (Layout)
- `src/types/api.ts` - TypeScript types for API contracts
- Uses Monaco Editor for code display with syntax highlighting
- Vite dev server proxies `/api` requests to `http://localhost:8000`

## API Endpoints

- `POST /api/index/` - Index a codebase directory (scans files, parses code, generates embeddings)
- `POST /api/search/` - Semantic search with natural language query
- `GET /health` - Health check with VectorAI DB connection status
- `GET /` - Root health check endpoint

## Known Critical Issues

**Backend:**
- Embeddings service has torch/transformers version compatibility issues (semantic search blocked)
- VectorAI DB requires real API credentials for full functionality

**Frontend:**
- TypeScript compilation errors prevent production builds
- Development mode required (use `npm run dev`)

## Environment Configuration

Backend requires `.env` file with:
- `VECTORAI_API_KEY` - Actian VectorAI DB API credentials
- `VECTORAI_ENDPOINT` - API endpoint URL
- `VECTORAI_COLLECTION` - Collection name for code snippets
- `HOST` / `PORT` - Server binding
- `CORS_ORIGINS` - Allowed frontend origins

Frontend uses Vite environment variable `VITE_API_URL` (defaults to `http://localhost:8000`)

## Code Organization Notes

- Backend follows FastAPI conventions with async route handlers
- Code parser supports Python, JavaScript, TypeScript (extensible via AST)
- Uses sentence-transformers for code embeddings (CodeBERT-based)
- Frontend uses React Router for navigation and Axios for API calls
