# Advanced Search Filters for VectorAI DB - Design Document

**Date:** 2026-04-17
**Goal:** Enhance VectorAI DB usage score (30%) by implementing metadata filtering and hybrid queries
**English UI:** All frontend text in English

## Architecture Overview

Three-tier architecture extension:
- **Frontend** - Modal dialog on search page with filter controls
- **Backend API** - Extend `/api/search/` endpoint to support filter parameters
- **VectorAI DB** - Use metadata filtering capabilities for hybrid queries

**Data Flow:**
1. User clicks "Filters" button → Open modal dialog
2. User selects filter criteria → Click "Apply Filters"
3. Frontend sends POST to `/api/search/` with filter parameters
4. Backend builds VectorAI DB filter query → Return results
5. Frontend displays results + active filter tags

## Component Design

### Frontend Components

**1. SearchFiltersModal.tsx** (New)
- Modal dialog component containing all filter form controls
- Form fields:
  - Language (dropdown: python, javascript, typescript, all)
  - Code Type (checkbox group: function, class, import)
  - File Path Pattern (text input with wildcard support)
  - Min Similarity (slider: 0.0 - 1.0, step 0.05)
  - Max Results (slider: 10 - 100, step 10)
  - Sort By (dropdown: similarity, file_path, complexity)
- Buttons: Apply Filters, Reset, Cancel
- Display count of active filters

**2. ActiveFilterTags.tsx** (New)
- Display applied filter tags above search results
- Each tag has "×" button to remove individually
- "Clear All" button to reset all filters

**3. SearchPage.tsx** (Modify)
- Add "Filters" button next to search box (with count badge)
- Integrate SearchFiltersModal and ActiveFilterTags
- Update search request to include filter parameters

### Backend Components

**1. app/models/schemas.py** (Modify)
```python
class SearchRequest(BaseModel):
    query: str
    limit: int = Field(default=10, ge=1, le=100)
    threshold: float = Field(default=0.7, ge=0.0, le=1.0)

    # New filter fields
    language: Optional[Language] = None
    code_type: Optional[CodeType] = None
    file_path_pattern: Optional[str] = None
    sort_by: Optional[str] = Field(
        default="similarity",
        pattern="^(similarity|file_path|complexity)$"
    )
```

**2. app/api/search.py** (Modify)
```python
async def search_codebase(request: SearchRequest):
    # Generate query embedding
    query_embedding = embedding_service.generate_query_embedding(request.query)

    # Build VectorAI DB filter
    from actian_vectorai import Filter
    filter_conditions = []

    if request.language:
        filter_conditions.append(
            Field("payload.language").match(request.language)
        )
    if request.code_type:
        filter_conditions.append(
            Field("payload.code_type").match(request.code_type)
        )
    if request.file_path_pattern:
        filter_conditions.append(
            Field("payload.file_path").match(request.file_path_pattern)
        )

    search_filter = Filter(must=filter_conditions) if filter_conditions else None

    # Execute filtered search
    results = await vectorai_client.search_vectors(
        query_vector=query_embedding,
        limit=request.limit,
        threshold=request.threshold,
        search_filter=search_filter
    )

    # Sort results
    if request.sort_by == "similarity":
        results.sort(key=lambda x: x["score"], reverse=True)
    elif request.sort_by == "file_path":
        results.sort(key=lambda x: x["payload"]["file_path"])
    elif request.sort_by == "complexity":
        results.sort(key=lambda x: x["payload"].get("complexity", 0), reverse=True)

    return SearchResponse(...)
```

**3. app/core/database.py** (Modify)
Update `search_vectors` method to accept `search_filter` parameter and pass to VectorAI DB.

## Frontend Type Definitions

```typescript
// frontend/src/types/api.ts
export interface SearchRequest {
  query: string
  limit?: number
  threshold?: number
  language?: string
  code_type?: string
  file_path_pattern?: string
  sort_by?: 'similarity' | 'file_path' | 'complexity'
}
```

## Error Handling & Edge Cases

### Frontend Error Handling

1. **No Results**
   - Display friendly message: "No results match your filters. Try adjusting your criteria."
   - Don't show error, suggest relaxing conditions

2. **Input Validation**
   - File Path Pattern: Max length 200 characters
   - Min Similarity: Slider ensures 0-1 range
   - Max Results: Constrained to 1-100

3. **Loading States**
   - Apply button shows loading state, disabled during request
   - Filters remain editable during search

### Backend Error Handling

1. **Invalid Filter Parameters**
   - Return 400 error + specific message
   - Example: `{"detail": "Invalid file path pattern: contains illegal characters"}`

2. **VectorAI DB Query Failures**
   - Catch connection errors, return 500
   - Log detailed errors for debugging

3. **Fallback Handling**
   - If VectorAI DB doesn't support certain filter operations, filter in Python

### Edge Cases
- Special characters in file path pattern (`*`, `?`, regex)
- Empty result sets from aggressive filtering
- User selects language with no indexed code

## Testing Strategy

### Backend Tests

**Unit Tests** (`tests/test_search_filters.py`)
- Test each filter parameter individually
- Test filter combinations
- Test boundary values (similarity=0, 1; limit=1, 100)
- Test invalid inputs

**Integration Tests**
- Test VectorAI DB filtering
- Test sorting (similarity, file_path, complexity)
- Test fallback to Python-level filtering

### Frontend Tests

**Component Tests** (Vitest)
- SearchFiltersModal: form validation, Apply/Reset/Cancel
- ActiveFilterTags: tag display and removal
- SearchPage: filter state management

**Manual Test Scenarios**
1. Language only: `language=python`
2. Combined: `language=python` + `code_type=function` + `min_similarity=0.8`
3. File path: `file_path_pattern=**/auth/**`
4. Sorting: Verify all three sort methods work correctly

## Implementation Milestones

**Phase 1: Backend API Extension** (~1 hour)
- Extend SearchRequest model
- Implement VectorAI DB filter logic
- Implement sorting logic
- Write unit tests

**Phase 2: Frontend Components** (~1.5 hours)
- Create SearchFiltersModal component
- Create ActiveFilterTags component
- Update SearchPage integration
- Update type definitions

**Phase 3: Integration & Testing** (~0.5 hours)
- Frontend-backend integration
- Manual test scenarios
- Performance testing

## Deliverables

- Functional filter modal dialog
- Active filter tags system
- Extended search API with 6 new parameters
- Complete unit test coverage
- All UI text in English

## Success Criteria

- ✅ VectorAI DB metadata filtering demonstrated
- ✅ Hybrid semantic + structured queries working
- ✅ Filters correctly narrow search results
- ✅ Sorting by multiple criteria functional
- ✅ No performance degradation (searches < 1s)
- ✅ Clean error handling for edge cases
