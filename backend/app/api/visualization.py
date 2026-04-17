from fastapi import APIRouter, Query, HTTPException
from typing import List, Dict, Any
from app.core.database import vectorai_client
import umap
import numpy as np
from scipy.spatial import KDTree

router = APIRouter(prefix="/api/visualization", tags=["visualization"])


@router.get("/graph-data")
async def get_graph_data(
    limit: int = Query(200, ge=50, le=500, description="Number of nodes")
) -> Dict[str, Any]:
    """
    Fetch vectors and compute graph structure for network visualization.

    Returns nodes with 2D coordinates from UMAP reduction
    and edges with similarity scores for nearby nodes.
    """
    try:
        # Fetch all snippets (we'll filter for diversity)
        from app.core.database import vectorai_client

        # Get sample using scroll/scan - for now get first N
        # In production, implement diversity sampling
        all_snippets = await _fetch_all_snippets()

        if not all_snippets:
            return {"nodes": [], "edges": []}

        # Limit and extract data
        snippets = all_snippets[:limit]
        vectors = []
        metadata_list = []

        for snippet in snippets:
            vectors.append(snippet["vector"])
            metadata_list.append(snippet["payload"])

        # Apply UMAP
        vectors_array = np.array(vectors)
        reducer = umap.UMAP(
            n_neighbors=15,
            min_dist=0.1,
            n_components=2,
            random_state=42
        )
        coordinates_2d = reducer.fit_transform(vectors_array)

        # Build nodes
        nodes = []
        for i, (coord, metadata) in enumerate(zip(coordinates_2d, metadata_list)):
            nodes.append({
                "id": metadata.get("id", f"node_{i}"),
                "x": float(coord[0]),
                "y": float(coord[1]),
                "language": metadata.get("language", "unknown"),
                "code_type": metadata.get("code_type", "function"),
                "complexity": _calculate_complexity(metadata),
                "metadata": {
                    "file_path": metadata.get("file_path", ""),
                    "code": metadata.get("code", ""),
                    "start_line": metadata.get("start_line", 0),
                    "end_line": metadata.get("end_line", 0),
                    "function_name": metadata.get("function_name"),
                    "class_name": metadata.get("class_name")
                }
            })

        # Compute edges
        edges = await _compute_similarity_edges(nodes, max_edges_per_node=5)

        return {"nodes": nodes, "edges": edges}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Visualization error: {str(e)}")


async def _fetch_all_snippets() -> List[Dict[str, Any]]:
    """Fetch all snippets from VectorAI DB."""
    try:
        await vectorai_client._ensure_client()
        # Use scroll to get all points
        # For MVP, we'll use a simple approach
        collection_info = await vectorai_client._client.collections.get(vectorai_client.collection)
        # Return empty if we can't fetch - will implement proper scroll
        return []
    except Exception:
        return []


def _calculate_complexity(metadata: Dict[str, Any]) -> int:
    """Calculate complexity based on lines of code."""
    start = metadata.get("start_line", 0)
    end = metadata.get("end_line", 0)
    return max(1, end - start + 1)


async def _compute_similarity_edges(
    nodes: List[Dict],
    max_edges_per_node: int = 5
) -> List[Dict[str, Any]]:
    """Compute edges between nearby nodes."""
    coords = np.array([[n["x"], n["y"]] for n in nodes])
    tree = KDTree(coords)

    edges = []
    edge_set = set()

    for i, node in enumerate(nodes):
        distances, indices = tree.query(
            [node["x"], node["y"]],
            k=min(max_edges_per_node + 1, len(nodes))
        )

        for idx in indices[0][1:]:
            neighbor = nodes[idx]
            edge_key = tuple(sorted([node["id"], neighbor["id"]]))
            if edge_key in edge_set:
                continue
            edge_set.add(edge_key)

            # Get actual similarity
            similarity = await vectorai_client.get_similarity(
                node["id"], neighbor["id"]
            )

            if similarity >= 0.75:
                edges.append({
                    "source": node["id"],
                    "target": neighbor["id"],
                    "similarity": float(similarity)
                })

    return edges
