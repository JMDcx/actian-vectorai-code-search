import asyncio
import sys
sys.path.insert(0, '.')

async def test():
    from app.api.visualization import _fetch_all_snippets
    import umap
    import numpy as np

    print("Testing visualization flow...")

    # Fetch snippets
    all_snippets = await _fetch_all_snippets()
    print(f"Found {len(all_snippets)} snippets")

    if not all_snippets:
        print("No snippets found!")
        return

    # Take first 50
    snippets = all_snippets[:50]
    print(f"Processing {len(snippets)} snippets")

    # Extract data
    snippet_ids = []
    vectors = []
    metadata_list = []

    for snippet in snippets:
        snippet_ids.append(snippet["id"])
        vectors.append(snippet["vector"])
        metadata_list.append(snippet["payload"])

    print(f"Valid vectors: {sum(1 for v in vectors if v is not None)}")

    # Apply UMAP
    vectors_array = np.array(vectors)
    print(f"Array shape: {vectors_array.shape}")

    reducer = umap.UMAP(
        n_neighbors=15,
        min_dist=0.1,
        n_components=2,
        random_state=42
    )
    coordinates_2d = reducer.fit_transform(vectors_array)
    print(f"UMAP result shape: {coordinates_2d.shape}")

    # Build nodes
    nodes = []
    for i, (snippet_id, coord, metadata) in enumerate(zip(snippet_ids, coordinates_2d, metadata_list)):
        nodes.append({
            "id": snippet_id,
            "x": float(coord[0]),
            "y": float(coord[1]),
            "language": metadata.get("language", "unknown"),
            "code_type": metadata.get("code_type", "function"),
            "complexity": max(1, metadata.get("end_line", 0) - metadata.get("start_line", 0) + 1),
            "metadata": {
                "file_path": metadata.get("file_path", ""),
                "code": metadata.get("code", ""),
                "start_line": metadata.get("start_line", 0),
                "end_line": metadata.get("end_line", 0),
                "function_name": metadata.get("function_name"),
                "class_name": metadata.get("class_name")
            }
        })

    print(f"Built {len(nodes)} nodes")
    print(f"First node: {nodes[0]}")

asyncio.run(test())
