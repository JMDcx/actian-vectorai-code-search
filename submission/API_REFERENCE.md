# API Reference

Semantic Codebase Navigator provides a comprehensive REST API for code indexing, semantic search, and code analysis. All endpoints return JSON responses and follow REST conventions.

## Base URL
```
http://localhost:8000/api
```

## Authentication
Currently, no authentication is required for local development. In production, API key authentication will be implemented.

## Response Format
All API responses follow this structure:

```json
{
  "success": true,
  "data": {},
  "message": "Operation successful",
  "timestamp": "2026-04-17T10:25:19Z"
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message",
  "error_code": "ERROR_CODE",
  "timestamp": "2026-04-17T10:25:19Z"
}
```

---

## 📚 Endpoints

### 1. Code Indexing

#### `POST /api/index`
Index a codebase directory and store code snippets in VectorAI DB.

**Request Body:**
```json
{
  "path": "/path/to/codebase",
  "recursive": true,
  "include_patterns": ["*.py", "*.js", "*.ts"],
  "exclude_patterns": ["__pycache__", "node_modules", "*.test.*"]
}
```

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `path` | string | Yes | - | Absolute path to codebase directory |
| `recursive` | boolean | No | true | Whether to index subdirectories |
| `include_patterns` | array | No | ["*.py", "*.js", "*.ts"] | File patterns to include |
| `exclude_patterns` | array | No | ["__pycache__", "node_modules"] | File patterns to exclude |

**Response:**
```json
{
  "success": true,
  "data": {
    "indexed_files": 42,
    "total_snippets": 156,
    "processing_time": 2.34,
    "languages_found": ["python", "javascript", "typescript"],
    "file_types": {
      "python": 24,
      "javascript": 12,
      "typescript": 6
    }
  },
  "message": "Codebase indexed successfully",
  "timestamp": "2026-04-17T10:25:19Z"
}
```

**Error Codes:**
- `INVALID_PATH`: Path does not exist or is not accessible
- `PERMISSION_DENIED`: No read permissions for the path
- `INDEXING_FAILED`: General indexing error

---

### 2. Semantic Search

#### `POST /api/search`
Perform semantic search using natural language queries.

**Request Body:**
```json
{
  "query": "how to implement user authentication",
  "limit": 10,
  "threshold": 0.7,
  "filters": {
    "language": ["python"],
    "code_type": ["function"]
  }
}
```

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | - | Natural language search query |
| `limit` | integer | No | 10 | Maximum number of results |
| `threshold` | float | No | 0.5 | Similarity threshold (0.0-1.0) |
| `filters` | object | No | {} | Additional search filters |

**Filter Options:**
```json
{
  "language": ["python", "javascript", "typescript"],
  "code_type": ["function", "class", "variable", "import"],
  "file_path": "src/*"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "how to implement user authentication",
    "results": [
      {
        "snippet": {
          "id": "snippet_123",
          "file_path": "src/auth.py",
          "language": "python",
          "code_type": "function",
          "code": "def authenticate_user(username, password):\n    # Implementation...",
          "start_line": 15,
          "end_line": 28,
          "metadata": {
            "function_name": "authenticate_user",
            "parameters": ["username", "password"],
            "returns": "User",
            "dependencies": ["database", "hashing"]
          }
        },
        "similarity_score": 0.92,
        "explanation": "This function handles user authentication by validating credentials against the database...",
        "related_snippets": [
          {
            "id": "snippet_124",
            "relationship": "dependency",
            "description": "Database connection function used by authenticate_user"
          }
        ]
      }
    ],
    "total_results": 5,
    "execution_time": 0.234,
    "search_metadata": {
      "vectorai_search_time": 0.156,
      "embedding_generation_time": 0.078,
      "results_filtered": true
    }
  },
  "message": "Search completed successfully",
  "timestamp": "2026-04-17T10:25:19Z"
}
```

**Error Codes:**
- `INVALID_QUERY`: Query is empty or too short
- `SEARCH_FAILED`: VectorAI DB search error
- `EMBEDDING_ERROR**: Failed to generate query embedding

---

### 3. Code Snippet Retrieval

#### `GET /api/snippet/{id}`
Retrieve a specific code snippet by ID.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Unique snippet identifier |

**Response:**
```json
{
  "success": true,
  "data": {
    "snippet": {
      "id": "snippet_123",
      "file_path": "src/auth.py",
      "language": "python",
      "code_type": "function",
      "code": "def authenticate_user(username, password):\n    return validate_credentials(username, password)",
      "start_line": 15,
      "end_line": 16,
      "metadata": {
        "function_name": "authenticate_user",
        "parameters": ["username", "password"],
        "returns": "User",
        "dependencies": ["database", "hashing"]
      },
      "created_at": "2026-04-17T10:25:19Z",
      "updated_at": "2026-04-17T10:25:19Z"
    }
  },
  "message": "Snippet retrieved successfully",
  "timestamp": "2026-04-17T10:25:19Z"
}
```

**Error Codes:**
- `SNIPPET_NOT_FOUND`: Snippet with given ID does not exist
- `INVALID_ID`: Invalid snippet ID format

---

### 4. Code Explanation

#### `POST /api/explain`
Get AI-generated explanation for a code snippet.

**Request Body:**
```json
{
  "code": "def authenticate_user(username, password):\n    return validate_credentials(username, password)",
  "context": "user authentication system",
  "language": "python",
  "detail_level": "detailed"
}
```

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `code` | string | Yes | - | Code snippet to explain |
| `context` | string | No | "" | Additional context for better explanation |
| `language` | string | No | "python" | Programming language |
| `detail_level` | string | No | "medium" | Explanation detail level |

**Detail Levels:**
- `basic`: Simple explanation for beginners
- `medium`: Standard explanation with some technical details
- `detailed`: Comprehensive explanation with technical depth

**Response:**
```json
{
  "success": true,
  "data": {
    "explanation": "This function authenticates users by validating their username and password credentials. It takes two parameters: username (string) and password (string), and returns a User object if authentication is successful. The function delegates the actual validation to a separate validate_credentials function, which likely handles password hashing and database lookup.",
    "complexity": "low",
    "suggestions": [
      "Consider adding rate limiting to prevent brute force attacks",
      "Add input validation for username and password formats",
      "Implement password hashing before storing in database"
    ],
    "related_concepts": [
      "authentication",
      "credential validation",
      "user management"
    ],
    "execution_time": 0.456
  },
  "message": "Explanation generated successfully",
  "timestamp": "2026-04-17T10:25:19Z"
}
```

**Error Codes:**
- `INVALID_CODE`: Code is empty or invalid
- `EXPLANATION_FAILED`: AI model failed to generate explanation
- `UNSUPPORTED_LANGUAGE`: Language not supported for explanation

---

### 5. Related Code Discovery

#### `POST /api/related`
Find code snippets related to a given snippet.

**Request Body:**
```json
{
  "snippet_id": "snippet_123",
  "limit": 5,
  "relationship_types": ["dependency", "similar", "usage"]
}
```

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `snippet_id` | string | Yes | - | Reference snippet ID |
| `limit` | integer | No | 5 | Maximum related snippets |
| `relationship_types` | array | No | ["all"] | Types of relationships to find |

**Relationship Types:**
- `dependency`: Code that the snippet depends on
- `similar`: Semantically similar code
- `usage`: Code that uses this snippet
- `all`: All relationship types

**Response:**
```json
{
  "success": true,
  "data": {
    "reference_snippet": {
      "id": "snippet_123",
      "file_path": "src/auth.py",
      "function_name": "authenticate_user"
    },
    "related_snippets": [
      {
        "snippet": {
          "id": "snippet_124",
          "file_path": "src/database.py",
          "function_name": "validate_credentials"
        },
        "relationship_type": "dependency",
        "similarity_score": 0.85,
        "description": "Database validation function used by authenticate_user"
      },
      {
        "snippet": {
          "id": "snippet_125",
          "file_path": "src/models.py",
          "class_name": "User"
        },
        "relationship_type": "usage",
        "similarity_score": 0.72,
        "description": "User model returned by authenticate_user"
      }
    ],
    "total_related": 2,
    "execution_time": 0.189
  },
  "message": "Related snippets found successfully",
  "timestamp": "2026-04-17T10:25:19Z"
}
```

**Error Codes:**
- `SNIPPET_NOT_FOUND`: Reference snippet not found
- `RELATIONSHIP_SEARCH_FAILED`: Failed to find related snippets

---

### 6. System Health

#### `GET /api/health`
Check system health and status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "components": {
      "database": {
        "status": "connected",
        "vectorai_db": {
          "status": "connected",
          "collection": "code_snippets",
          "document_count": 156
        }
      },
      "ai_models": {
        "codebert": {
          "status": "loaded",
          "model": "microsoft/codebert-base"
        },
        "sentence_transformers": {
          "status": "loaded",
          "model": "all-MiniLM-L6-v2"
        }
      },
      "storage": {
        "status": "available",
        "indexed_files": 42,
        "total_snippets": 156
      }
    },
    "uptime": 86400,
    "last_indexed": "2026-04-17T10:25:19Z"
  },
  "message": "System is healthy",
  "timestamp": "2026-04-17T10:25:19Z"
}
```

---

### 7. Statistics

#### `GET /api/stats`
Get system statistics and usage metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "codebase": {
      "total_files": 42,
      "indexed_files": 42,
      "total_snippets": 156,
      "languages": {
        "python": 24,
        "javascript": 12,
        "typescript": 6
      },
      "code_types": {
        "function": 89,
        "class": 34,
        "variable": 21,
        "import": 12
      }
    },
    "search": {
      "total_queries": 1234,
      "average_response_time": 0.234,
      "most_searched_terms": [
        "authentication",
        "database",
        "api"
      ]
    },
    "performance": {
      "indexing_time": 2.34,
      "search_time": 0.234,
      "embedding_generation_time": 0.078
    },
    "vectorai_db": {
      "total_vectors": 156,
      "vector_dimension": 384,
      "collection_size": "2.4MB"
    }
  },
  "message": "Statistics retrieved successfully",
  "timestamp": "2026-04-17T10:25:19Z"
}
```

---

## 🔄 Webhook Events (Future)

The system will support webhook events for real-time notifications:

### Event Types
- `snippet.indexed`: New code snippet indexed
- `search.completed`: Search operation completed
- `system.health_changed`: System health status changed

### Webhook Payload
```json
{
  "event": "snippet.indexed",
  "timestamp": "2026-04-17T10:25:19Z",
  "data": {
    "snippet_id": "snippet_123",
    "file_path": "src/auth.py",
    "language": "python"
  }
}
```

---

## 📝 API Usage Examples

### Python Example
```python
import requests
import json

# Base URL
BASE_URL = "http://localhost:8000/api"

# Index a codebase
index_response = requests.post(
    f"{BASE_URL}/index",
    json={"path": "/path/to/codebase", "recursive": True}
)
print(index_response.json())

# Search code
search_response = requests.post(
    f"{BASE_URL}/search",
    json={"query": "how to implement user authentication", "limit": 5}
)
results = search_response.json()["data"]["results"]
for result in results:
    print(f"{result['snippet']['file_path']}: {result['similarity_score']}")
```

### JavaScript Example
```javascript
// Search code
const searchCode = async (query) => {
  const response = await fetch('http://localhost:8000/api/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: query,
      limit: 10
    })
  });
  
  const data = await response.json();
  return data.data.results;
};

// Usage
searchCode("how to implement user authentication")
  .then(results => console.log(results))
  .catch(error => console.error('Error:', error));
```

---

## 🚨 Rate Limiting

Currently, no rate limiting is implemented for local development. In production, the following limits will apply:

- **Search Requests**: 100 requests per minute
- **Indexing Requests**: 10 requests per hour
- **Explanation Requests**: 60 requests per minute

Rate limit headers will be included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1642347600
```

---

This API reference provides complete documentation for all available endpoints. For interactive testing, visit the Swagger UI at `http://localhost:8000/docs`.