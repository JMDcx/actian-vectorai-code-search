import asyncio
import sys
sys.path.insert(0, '.')

async def test():
    from app.core.database import vectorai_client
    import umap
    import numpy as np

    print("Fetching snippets...")
    all_snippets = await vectorai_client.scroll_all(limit=100, with_vectors=True)
    print(f"Found {len(all_snippets)} snippets")

    if all_snippets:
        print(f"First snippet keys: {all_snippets[0].keys()}")
        print(f"First snippet ID: {all_snippets[0]['id']}")
        print(f"Has vector: {all_snippets[0]['vector'] is not None}")
        print(f"Vector length: {len(all_snippets[0]['vector']) if all_snippets[0]['vector'] else 'N/A'}")

        # Try UMAP
        print("\nApplying UMAP...")
        vectors = [s["vector"] for s in all_snippets[:50]]
        print(f"Processing {len(vectors)} vectors")

        try:
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
        except Exception as e:
            import traceback
            print(f"UMAP error: {e}")
            traceback.print_exc()
    else:
        print("No snippets found!")

asyncio.run(test())
