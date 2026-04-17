# Vector Visualization Page - Design Specification

**Date:** 2026-04-17
**Author:** Claude
**Status:** Approved for Implementation

## Context

The Vector Visualization page is a key feature for the Actian VectorAI DB hackathon submission. It provides an interactive network graph that demonstrates VectorAI DB's semantic search capabilities through visual exploration of code snippet relationships.

**Primary Goals:**
- **Technical Showcase:** Demonstrate VectorAI DB's ability to handle high-dimensional vector data and similarity queries
- **Interactive Exploration:** Allow judges to explore relationships between code snippets through an engaging visual interface
- **Demo Impact:** Create a memorable "wow" moment that differentiates our submission

**Hackathon Scoring Impact:**
- VectorAI DB Usage (30%): Shows advanced filtering, metadata handling, and similarity search
- Technical Execution (25%): Demonstrates sophisticated data pipeline (UMAP reduction, force-directed layout)
- Demo Quality (20%): Creates visually impressive, interactive demo experience

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  VectorVisualization.tsx                                   │  │
│  │  - Manages overall page state                             │  │
│  │  - Orchestrates interactions (search, filter, inspect)    │  │
│  └───────────────────────┬───────────────────────────────────┘  │
│                          │                                       │
│  ┌───────────────────────▼───────────────────────────────────┐  │
│  │  NetworkGraph.tsx (D3.js)                                 │  │
│  │  - Force-directed simulation                              │  │
│  │  - Renders nodes (shape/color/size encoding)              │  │
│  │  - Renders edges (thickness/opacity encoding)             │  │
│  │  - Handles zoom, pan, drag                                │  │
│  └───────────────────────┬───────────────────────────────────┘  │
│                          │                                       │
│  ┌───────────────────────▼───────────────────────────────────┐  │
│  │  NodeDetailPanel.tsx                                       │  │
│  │  - Slide-in panel for selected node                       │  │
│  │  - Monaco Editor for code preview                         │  │
│  │  - Shows metadata and similarity scores                   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP API
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  /api/visualization/graph-data                             │  │
│  │  - Fetches vectors from VectorAI DB                        │  │
│  │  - Applies UMAP dimensionality reduction                   │  │
│  │  - Computes similarity edges                               │  │
│  │  - Returns nodes + edges structure                         │  │
│  └───────────────────────┬───────────────────────────────────┘  │
└──────────────────────────┼───────────────────────────────────────┘
                           │
                           │ gRPC
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Actian VectorAI DB                           │
│  - Stores 768-dim vectors (CodeBERT embeddings)                 │
│  - Stores metadata (language, code_type, file_path, etc.)       │
│  - Similarity search via cosine distance                        │
└─────────────────────────────────────────────────────────────────┘
```

### Data Pipeline

1. **Vector Fetch:** Backend queries VectorAI DB for curated sample of 200 code snippets
2. **Dimensionality Reduction:** UMAP projects 768-dim vectors to 2D coordinates
3. **Edge Computation:** Find nearest neighbors in 2D space, retrieve similarity scores
4. **Graph Rendering:** D3.js force simulation refines layout and renders interactive graph
5. **User Interaction:** Search/filter/inspect operations update visualization state

## Visual Design Specifications

### Node Visual Encoding

**Shape by Code Type:**
| Code Type | Shape | SVG Element |
|-----------|-------|-------------|
| Function  | Circle | `<circle r="10">` |
| Class     | Square | `<rect width="20" height="20">` |
| Import    | Triangle | `<polygon>` |
| Comment   | Diamond | `<polygon>` |

**Color by Language:**
| Language | Color | Hex |
|----------|-------|-----|
| Python   | Blue  | `#3B82F6` |
| JavaScript | Yellow | `#FBBF24` |
| TypeScript | Green | `#10B981` |
| Other    | Gray  | `#6B7280` |

**Size by Complexity (lines of code):**
| Lines | Radius | Meaning |
|-------|--------|---------|
| < 10  | 8px   | Small snippet |
| 10-30 | 12px  | Medium snippet |
| > 30  | 16px  | Large snippet |

### Edge Visual Encoding

**Thickness by Similarity:**
- 0.75-0.80: 1px (weak connection)
- 0.80-0.85: 2px (medium connection)
- 0.85-0.90: 3px (strong connection)
- 0.90+: 4px (very strong connection)

**Color Gradient:**
- Low similarity (0.75): Gray (`#9CA3AF`)
- Medium similarity (0.85): Light primary (`#60A5FA`)
- High similarity (0.95+): Primary (`#3B82F6`)

**Opacity:**
- Weak connections: 0.3
- Strong connections: 0.8

### Force-Directed Layout Parameters

```javascript
forceSimulation(nodes)
  .force("link", forceLink(edges)
    .id(d => d.id)
    .distance(100)           // ideal edge length
    .strength(0.5)           // edge pull strength
  )
  .force("charge", forceManyBody()
    .strength(-300)          // node repulsion
  )
  .force("center", forceCenter()
    .x(width / 2)
    .y(height / 2)
  )
  .force("collision", forceCollide()
    .radius(d => d.size + 5) // prevent overlap
  )
  .velocityDecay(0.5)        // damping
```

## Interaction Patterns

### Mode 1: Click to Inspect

**Single Click Interaction:**
1. User clicks a node
2. Node highlights with glowing border
3. Direct neighbors (1-hop) remain fully visible
4. Second-degree neighbors (2-hop) dim to 40% opacity
5. Non-neighbors fade to 10% opacity
6. Edge thickness emphasizes connections to selected node
7. NodeDetailPanel slides in from right with:
   - File path and line numbers
   - Function/class name
   - Full code snippet (Monaco Editor with syntax highlighting)
   - Language and code type badges
   - Similarity scores to neighbors (table)

**Double Click Interaction:**
1. View centers on the clicked node
2. Zoom level adjusts to show 2-hop neighborhood
3. 2nd-degree connections become visible

### Mode 2: Search and Highlight

**Search Flow:**
1. User types query in search input (debounced, 300ms)
2. Backend generates query embedding via CodeBERT
3. Backend computes similarity to all nodes
4. Frontend updates node styling:
   - High similarity (0.85+): Glowing primary color, scale 1.2x
   - Medium similarity (0.75-0.85): Subtle highlight, scale 1.1x
   - Low similarity (< 0.75): Dimmed to 30% opacity
5. Animated edges drawn from search icon to top 5 matches
6. Tooltip on each match shows similarity score

**Visual Feedback:**
- Search input: Primary border when active
- Results: Number of matches shown (e.g., "12 matches found")
- Clear button: Resets to original state

### Mode 3: Filter and Re-cluster

**Filter Panel UI:**
```
┌─────────────────────────────────────┐
│ Filters                    [toggle] │
├─────────────────────────────────────┤
│ Language:                           │
│ ☑ Python  ☑ JavaScript  ☑ TypeScript│
│                                     │
│ Code Type:                          │
│ ☑ Function  ☑ Class  ☐ Import      │
│                                     │
│ File Pattern:                       │
│ [src/auth/*              ]          │
└─────────────────────────────────────┘
```

**Filter Behavior:**
1. User toggles filter checkbox
2. Non-matching nodes fade out (opacity 0.1, not removed)
3. Matching nodes remain fully visible
4. Force simulation re-runs with visible nodes
5. Graph reorganizes in real-time (300ms transition)
6. Filter badge shows active count (e.g., "Python: 45")

**Reset:**
- "Clear Filters" button removes all filters
- Graph smoothly returns to full state

## Technical Components

### Backend Components

#### File: `backend/app/api/visualization.py`

```python
from fastapi import APIRouter, Query, HTTPException
from typing import List, Dict, Any, Optional
from app.core.database import vectorai_client
from app.services.embeddings import embedding_service
import umap
import numpy as np
from scipy.spatial.distance import cdist

router = APIRouter(prefix="/api/visualization", tags=["visualization"])

@router.get("/graph-data")
async def get_graph_data(
    limit: int = Query(200, ge=50, le=500, description="Number of nodes to fetch")
) -> Dict[str, Any]:
    """
    Fetch vectors and compute graph structure for network visualization.
    
    Returns:
        Nodes with 2D coordinates from UMAP reduction
        Edges with similarity scores for nearby nodes
    """
    try:
        # Step 1: Fetch sample vectors from VectorAI DB
        all_snippets = await _fetch_curated_snippets(limit * 2)  # Get more, filter later
        
        if not all_snippets:
            return {"nodes": [], "edges": []}
        
        # Step 2: Extract vectors and metadata
        vectors = []
        metadata_list = []
        for snippet in all_snippets[:limit]:
            vectors.append(snippet["vector"])
            metadata_list.append(snippet["payload"])
        
        vectors_array = np.array(vectors)  # Shape: (limit, 768)
        
        # Step 3: Apply UMAP dimensionality reduction
        reducer = umap.UMAP(
            n_neighbors=15,
            min_dist=0.1,
            n_components=2,
            random_state=42
        )
        coordinates_2d = reducer.fit_transform(vectors_array)  # Shape: (limit, 2)
        
        # Step 4: Build nodes with coordinates
        nodes = []
        for i, (coord, metadata) in enumerate(zip(coordinates_2d, metadata_list)):
            nodes.append({
                "id": metadata["id"],
                "x": float(coord[0]),
                "y": float(coord[1]),
                "language": metadata.get("language", "unknown"),
                "code_type": metadata.get("code_type", "function"),
                "complexity": _calculate_complexity(metadata),
                "metadata": metadata
            })
        
        # Step 5: Compute edges (k-nearest neighbors in 2D space)
        edges = await _compute_similarity_edges(nodes, max_edges_per_node=5)
        
        return {"nodes": nodes, "edges": edges}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Visualization data error: {str(e)}")


async def _fetch_curated_snippets(limit: int) -> List[Dict[str, Any]]:
    """Fetch a diverse sample of snippets from VectorAI DB.
    
    Strategy: Query in batches to ensure diverse representation:
    - 50% Python, 30% JavaScript, 20% TypeScript
    - 70% functions, 20% classes, 10% imports
    
    This creates visually interesting clusters in the graph.
    """
    try:
        # Fetch samples with diversity in mind
        samples = []
        
        # Get Python snippets
        python_samples = await vectorai_client.search_by_filter(
            filter=Filter(must=[Field("payload.language").match("python")]),
            limit=limit // 2
        )
        samples.extend(python_samples)
        
        # Get JavaScript snippets
        js_samples = await vectorai_client.search_by_filter(
            filter=Filter(must=[Field("payload.language").match("javascript")]),
            limit=limit // 3
        )
        samples.extend(js_samples)
        
        # Get TypeScript snippets
        ts_samples = await vectorai_client.search_by_filter(
            filter=Filter(must=[Field("payload.language").match("typescript")]),
            limit=limit // 5
        )
        samples.extend(ts_samples)
        
        return samples[:limit]
    except Exception as e:
        print(f"Error fetching curated snippets: {e}")
        return []


def _calculate_complexity(metadata: Dict[str, Any]) -> int:
    """Calculate complexity score based on lines of code."""
    start_line = metadata.get("start_line", 0)
    end_line = metadata.get("end_line", 0)
    return end_line - start_line + 1


async def _compute_similarity_edges(
    nodes: List[Dict],
    max_edges_per_node: int = 5
) -> List[Dict[str, Any]]:
    """Compute edges between nearby nodes with actual similarity scores."""
    from scipy.spatial import KDTree
    
    # Extract coordinates
    coords = np.array([[n["x"], n["y"]] for n in nodes])
    tree = KDTree(coords)
    
    edges = []
    edge_set = set()  # Avoid duplicate edges
    
    for i, node in enumerate(nodes):
        # Find k-nearest neighbors in 2D space
        distances, indices = tree.query([node["x"], node["y"]], k=max_edges_per_node + 1)
        
        for j, idx in enumerate(indices[0][1:]):  # Skip self
            neighbor = nodes[idx]
            
            # Create edge key to avoid duplicates
            edge_key = tuple(sorted([node["id"], neighbor["id"]]))
            if edge_key in edge_set:
                continue
            edge_set.add(edge_key)
            
            # Retrieve actual similarity from VectorAI DB
            similarity = await vectorai_client.get_similarity(node["id"], neighbor["id"])
            
            # Filter by threshold
            if similarity >= 0.75:
                edges.append({
                    "source": node["id"],
                    "target": neighbor["id"],
                    "similarity": similarity
                })
    
    return edges
```

#### File: `backend/requirements.txt` (additions)

```
# Add for vector visualization
umap-learn>=0.5.0
scipy>=1.10.0
```

### Frontend Components

#### File: `frontend/src/pages/VectorVisualization.tsx`

```typescript
import { useState, useEffect, useRef } from 'react'
import { NetworkGraph } from '../components/NetworkGraph'
import { NodeDetailPanel } from '../components/NodeDetailPanel'
import { Search } from 'lucide-react'
import axios from 'axios'

interface GraphData {
  nodes: Node[]
  edges: Edge[]
}

interface Node {
  id: string
  x: number
  y: number
  language: string
  code_type: string
  complexity: number
  metadata: any
}

interface Edge {
  source: string
  target: string
  similarity: number
}

export default function VectorVisualization() {
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    languages: [] as string[],
    codeTypes: [] as string[]
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGraphData()
  }, [])

  const fetchGraphData = async () => {
    try {
      const response = await axios.get('/api/visualization/graph-data?limit=200')
      setGraphData(response.data)
    } catch (error) {
      console.error('Failed to fetch graph data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    // Backend generates query embedding and returns similarity scores
    // Frontend updates node highlights based on scores
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="text-xl">Loading vector space visualization...</div>
    </div>
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header with search */}
      <header className="p-4 border-b border-gray-800 flex items-center gap-4">
        <h1 className="text-2xl font-bold">Vector Space Visualization</h1>
        
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search code semantics..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
        >
          Filters
        </button>
      </header>

      {/* Main visualization area */}
      <div className="flex-1 relative">
        {graphData && (
          <NetworkGraph
            nodes={graphData.nodes}
            edges={graphData.edges}
            selectedNode={selectedNode}
            onNodeSelect={setSelectedNode}
            searchQuery={searchQuery}
            filters={filters}
          />
        )}
      </div>

      {/* Detail panel */}
      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  )
}
```

#### File: `frontend/src/components/NetworkGraph.tsx`

```typescript
import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { Node, Edge } from '../types/visualization'

interface NetworkGraphProps {
  nodes: Node[]
  edges: Edge[]
  selectedNode: Node | null
  onNodeSelect: (node: Node) => void
  searchQuery: string
  filters: { languages: string[]; codeTypes: string[] }
}

export function NetworkGraph({
  nodes,
  edges,
  selectedNode,
  onNodeSelect,
  searchQuery,
  filters
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<Node, undefined> | null>(null)

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove()

    // Setup SVG
    const svg = d3.select(svgRef.current)
    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight

    // Create force simulation
    const simulation = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink(edges)
        .id(d => d.id)
        .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide()
        .radius(d => getNodeSize(d) + 5)
      )

    simulationRef.current = simulation

    // Create container
    const g = svg.append('g')

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })
    svg.call(zoom)

    // Draw edges
    const link = g.append('g')
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('stroke', d => getEdgeColor(d.similarity))
      .attr('stroke-opacity', d => getEdgeOpacity(d.similarity))
      .attr('stroke-width', d => getEdgeWidth(d.similarity))

    // Draw nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, Node>()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded)
      )

    // Node shapes based on code_type
    node.each(function(d) {
      const nodeGroup = d3.select(this)
      const size = getNodeSize(d)
      const color = getNodeColor(d.language)

      if (d.code_type === 'function') {
        nodeGroup.append('circle')
          .attr('r', size)
          .attr('fill', color)
      } else if (d.code_type === 'class') {
        nodeGroup.append('rect')
          .attr('width', size * 2)
          .attr('height', size * 2)
          .attr('x', -size)
          .attr('y', -size)
          .attr('fill', color)
      }
      // ... other shapes
    })

    // Click handler
    node.on('click', (event, d) => {
      onNodeSelect(d)
    })

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as Node).x!)
        .attr('y1', d => (d.source as Node).y!)
        .attr('x2', d => (d.target as Node).x!)
        .attr('y2', d => (d.target as Node).y!)

      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    // Drag functions
    function dragStarted(event: d3.D3DragEvent<SVGGElement, Node, any>, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, Node, any>, d: Node) {
      d.fx = event.x
      d.fy = event.y
    }

    function dragEnded(event: d3.D3DragEvent<SVGGElement, Node, any>, d: Node) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }

    return () => {
      simulation.stop()
    }

  }, [nodes, edges, filters])

  // Helper functions
  function getNodeSize(node: Node): number {
    if (node.complexity < 10) return 8
    if (node.complexity < 30) return 12
    return 16
  }

  function getNodeColor(language: string): string {
    const colors: Record<string, string> = {
      python: '#3B82F6',
      javascript: '#FBBF24',
      typescript: '#10B981'
    }
    return colors[language] || '#6B7280'
  }

  function getEdgeWidth(similarity: number): number {
    if (similarity >= 0.90) return 4
    if (similarity >= 0.85) return 3
    if (similarity >= 0.80) return 2
    return 1
  }

  function getEdgeColor(similarity: number): string {
    if (similarity >= 0.90) return '#3B82F6'
    if (similarity >= 0.85) return '#60A5FA'
    return '#9CA3AF'
  }

  function getEdgeOpacity(similarity: number): number {
    if (similarity >= 0.85) return 0.8
    return 0.3
  }

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{ background: '#111827' }}
    />
  )
}
```

#### File: `frontend/src/components/NodeDetailPanel.tsx`

```typescript
import { Node } from '../types/visualization'
import { X } from 'lucide-react'
import Editor from '@monaco-editor/react'

interface NodeDetailPanelProps {
  node: Node
  onClose: () => void
}

export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-gray-800 border-l border-gray-700 shadow-xl overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Code Snippet</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-700 rounded"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Metadata */}
      <div className="p-4 space-y-3">
        <div>
          <span className="text-sm text-gray-400">File:</span>
          <p className="font-mono text-sm">{node.metadata.file_path}</p>
        </div>

        <div className="flex gap-2">
          <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
            {node.language}
          </span>
          <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
            {node.code_type}
          </span>
        </div>

        {node.metadata.function_name && (
          <div>
            <span className="text-sm text-gray-400">Function:</span>
            <p className="font-mono">{node.metadata.function_name}</p>
          </div>
        )}

        {node.metadata.class_name && (
          <div>
            <span className="text-sm text-gray-400">Class:</span>
            <p className="font-mono">{node.metadata.class_name}</p>
          </div>
        )}

        <div>
          <span className="text-sm text-gray-400">Lines:</span>
          <p>{node.metadata.start_line} - {node.metadata.end_line}</p>
        </div>
      </div>

      {/* Code Preview */}
      <div className="border-t border-gray-700">
        <div className="p-2 bg-gray-900 text-xs text-gray-400">
          Code Preview
        </div>
        <Editor
          height={400}
          language={node.language}
          value={node.metadata.code}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: 'on',
            scrollBeyondLastLine: false
          }}
        />
      </div>
    </div>
  )
}
```

#### File: `frontend/src/types/visualization.ts`

```typescript
export interface Node {
  id: string
  x: number
  y: number
  language: string
  code_type: 'function' | 'class' | 'import' | 'comment'
  complexity: number
  metadata: {
    file_path: string
    code: string
    start_line: number
    end_line: number
    function_name?: string
    class_name?: string
  }
}

export interface Edge {
  source: string
  target: string
  similarity: number
}

export interface GraphData {
  nodes: Node[]
  edges: Edge[]
}
```

### Frontend Dependencies

```bash
cd frontend
npm install d3@7 @types/d3
```

## Data Flow Implementation

### Backend Processing Steps

```python
# Step 1: Fetch curated sample from VectorAI DB
async def _fetch_curated_snippets(limit: int) -> List[Dict]:
    """Fetch diverse sample ensuring language and type distribution."""
    # Strategy: Query in batches, ensure we get:
    # - 50% Python, 30% JavaScript, 20% TypeScript
    # - 70% functions, 20% classes, 10% imports
    # This creates visually interesting clusters
    pass

# Step 2: UMAP dimensionality reduction
reducer = umap.UMAP(
    n_neighbors=15,    # Local neighborhood size
    min_dist=0.1,      # Minimum distance in 2D (tighter clusters)
    n_components=2,    # Output dimensions
    random_state=42    # Reproducible results
)
coordinates_2d = reducer.fit_transform(vectors_array)

# Step 3: Compute similarity edges
async def _compute_similarity_edges(nodes, max_edges_per_node=5):
    # Find k-nearest neighbors in 2D space using KDTree
    from scipy.spatial import KDTree
    coords = np.array([[n['x'], n['y']] for n in nodes])
    tree = KDTree(coords)
    
    edges = []
    for i, node in enumerate(nodes):
        # Query 5 nearest neighbors
        distances, indices = tree.query([node['x'], node['y']], k=max_edges_per_node+1)
        
        for j, idx in enumerate(indices[0][1:]):  # Skip self
            neighbor = nodes[idx]
            # Retrieve actual similarity from VectorAI DB
            similarity = await vectorai_client.get_similarity(
                node['id'], neighbor['id']
            )
            if similarity > 0.75:
                edges.append({
                    'source': node['id'],
                    'target': neighbor['id'],
                    'similarity': similarity
                })
    
    return edges
```

### Frontend State Management

```typescript
// Main state in VectorVisualization.tsx
interface VisualizationState {
  // Graph data
  graphData: GraphData | null
  
  // Selection state
  selectedNode: Node | null
  highlightedNodes: Set<string>  // From search
  
  // Search state
  searchQuery: string
  searchResults: Map<string, number>  // nodeId -> similarity score
  
  // Filter state
  filters: {
    languages: string[]
    codeTypes: string[]
  }
  
  // UI state
  showFilters: boolean
  loading: boolean
}
```

## Edge Cases & Error Handling

### Backend Error Handling

1. **No vectors in database:**
   - Return empty nodes/edges
   - Frontend shows "No code indexed yet" message

2. **UMAP fails (insufficient data):**
   - Fall back to random 2D projection
   - Log error for monitoring

3. **VectorAI DB connection failure:**
   - Return 503 Service Unavailable
   - Include retry-after header

### Frontend Error Handling

1. **Graph data fetch fails:**
   - Show error banner with retry button
   - Display last successful data if available

2. **Node detail fetch fails:**
   - Show loading state
   - Display error message in panel

3. **Search query fails:**
   - Show error toast
   - Maintain current state (no crash)

4. **Large graph performance:**
   - Limit nodes to 500 max
   - Show warning if approaching limit
   - Implement virtual rendering if needed

## Testing Strategy

### Backend Tests

```python
# tests/test_visualization.py

def test_get_graph_data_returns_nodes_and_edges():
    """Test that graph data endpoint returns valid structure."""
    response = client.get("/api/visualization/graph-data?limit=50")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) <= 50

def test_umap_dimensionality_reduction():
    """Test UMAP reduces dimensions correctly."""
    vectors = np.random.rand(100, 768)
    reducer = umap.UMAP(n_components=2, random_state=42)
    result = reducer.fit_transform(vectors)
    assert result.shape == (100, 2)

def test_edge_similarity_threshold():
    """Test that low-similarity edges are filtered."""
    edges = _compute_similarity_edges(nodes, threshold=0.75)
    for edge in edges:
        assert edge["similarity"] >= 0.75
```

### Frontend Tests

```typescript
// NetworkGraph.test.tsx

describe('NetworkGraph', () => {
  it('renders nodes with correct shapes', () => {
    const nodes = [
      { id: '1', code_type: 'function', ... },
      { id: '2', code_type: 'class', ... }
    ]
    render(<NetworkGraph nodes={nodes} edges={[]} />)
    expect(screen.getByRole('img')).toHaveAttribute('data-shapes', 'circle,rect')
  })

  it('calls onNodeSelect when node is clicked', () => {
    const onNodeSelect = jest.fn()
    render(<NetworkGraph nodes={nodes} edges={[]} onNodeSelect={onNodeSelect} />)
    fireEvent.click(screen.getByTestId('node-1'))
    expect(onNodeSelect).toHaveBeenCalledWith(nodes[0])
  })
})
```

### Integration Tests

```bash
# Manual testing checklist

□ Graph loads with 200 nodes
□ All nodes are visible within viewport
□ Clicking a node highlights neighbors
□ Double-clicking centers on node
□ Search query highlights matching nodes
□ Filter toggles show/hide nodes
□ Dragging a node works smoothly
□ Zoom and pan work correctly
□ Node detail panel shows correct code
□ Monaco editor highlights syntax correctly
```

## Performance Considerations

### Backend Optimization

- **UMAP caching:** Cache reducer and 2D coordinates for 1 hour
- **Edge computation:** Limit to 5 edges per node to reduce complexity
- **Query optimization:** Use VectorAI DB scroll API for efficient fetching

### Frontend Optimization

- **D3 simulation:** Limit alpha iterations to 300 (balance speed vs quality)
- **Node rendering:** Use SVG for < 500 nodes, consider Canvas for larger
- **Memoization:** Memo node and edge components to prevent re-renders
- **Debounce search:** 300ms debounce to reduce API calls

## Future Enhancements

### Phase 2 Features (Post-Hackathon)

1. **3D Visualization:** Add option to view vectors in 3D using Three.js
2. **Cluster Detection:** Automatically detect and label semantic clusters
3. **Time Evolution:** Animate how vectors change over code iterations
4. **Export Feature:** Export graph as PNG/SVG for presentations
5. **Comparison Mode:** View two codebases side-by-side

### Performance Improvements

1. **Web Worker:** Move D3 simulation to web worker for non-blocking UI
2. **Incremental Loading:** Load nodes progressively as user explores
3. **Virtual Scrolling:** For node detail panel with many nodes

## Summary

This design creates an impressive, interactive visualization that:

- ✅ Demonstrates VectorAI DB's semantic search capabilities
- ✅ Provides engaging hands-on exploration for judges
- ✅ Creates memorable visual impact through network graph
- ✅ Supports multiple interaction modes (inspect, search, filter)
- ✅ Balances performance with visual sophistication

**Estimated Implementation Time:** 2-3 days
**Risk Level:** Medium (D3.js learning curve, UMAP integration)
**Hackathon Impact:** High (differentiates from basic search demos)
