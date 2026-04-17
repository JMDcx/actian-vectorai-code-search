import asyncio
import sys
sys.path.insert(0, '.')

async def test():
    from app.core.database import vectorai_client
    import umap
    import numpy as np

    print("Fetching snippets...")
    all_snippets = await vectorai_client.scroll_all(limit=50, with_vectors=True)
    print(f"Found {len(all_snippets)} snippets")

    if all_snippets:
        print(f"First snippet ID: {all_snippets[0]['id']}")
        print(f"Has vector: {all_snippets[0]['vector'] is not None}")

        # Check if all have vectors
        non_vector_count = sum(1 for s in all_snippets if s['vector'] is None)
        print(f"Snippets without vectors: {non_vector_count}")

        # Extract vectors
        vectors = [s["vector"] for s in all_snippets if s["vector"] is not None]
        print(f"Valid vectors: {len(vectors)}")

        if len(vectors) >= 10:  # Need at least 10 for UMAP
            print("\nApplying UMAP...")
            vectors_array = np.array(vectors)
            print(f"Array shape: {vectors_array.shape}")

            reducer = umap.UMAP(
                n_neighbors=min(15, len(vectors) - 1),
                min_dist=0.1,
                n_components=2,
                random_state=42
            )
            coordinates_2d = reducer.fit_transform(vectors_array)
            print(f"UMAP result shape: {coordinates_2d.shape}")
            print(f"First 5 coordinates: {coordinates_2d[:5]}")
        else:
            print("Not enough vectors for UMAP")
    else:
        print("No snippets found!")

asyncio.run(test())
