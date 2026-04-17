from typing import Optional, Dict, Any, List
import numpy as np
from actian_vectorai import AsyncVectorAIClient, VectorParams, Distance, PointStruct
from app.core.config import settings


class VectorAIDBClient:
    """Client for interacting with Actian VectorAI DB using official SDK."""

    def __init__(self):
        self.endpoint = settings.vectorai_endpoint
        self.collection = settings.vectorai_collection
        self._client: Optional[AsyncVectorAIClient] = None

    async def __aenter__(self):
        """Async context manager entry."""
        self._client = AsyncVectorAIClient(self.endpoint)
        await self._client.__aenter__()
        return self

    async def __aexit__(self, *args):
        """Async context manager exit."""
        if self._client:
            await self._client.__aexit__(*args)

    async def _ensure_client(self):
        """Ensure client is initialized."""
        if self._client is None:
            self._client = AsyncVectorAIClient(self.endpoint)
            await self._client.__aenter__()

    async def health_check(self) -> bool:
        """Check if VectorAI DB is accessible."""
        try:
            await self._ensure_client()
            info = await self._client.health_check()
            return info is not None
        except Exception:
            return False

    async def initialize_collection(self, vector_size: int = 768):
        """Initialize collection if it doesn't exist."""
        try:
            await self._ensure_client()
            exists = await self._client.collections.exists(self.collection)
            if not exists:
                await self._client.collections.create(
                    self.collection,
                    vectors_config=VectorParams(
                        size=vector_size,
                        distance=Distance.Cosine
                    )
                )
        except Exception as e:
            print(f"Error initializing collection: {e}")

    async def insert_vector(
        self,
        id: str,
        vector: List[float],
        metadata: Dict[str, Any]
    ) -> bool:
        """Insert a vector with metadata into VectorAI DB."""
        try:
            await self._ensure_client()
            point = PointStruct(
                id=id,
                vector=vector,
                payload=metadata
            )
            await self._client.points.upsert(self.collection, [point])
            return True
        except Exception as e:
            print(f"Error inserting vector: {e}")
            return False

    async def search_vectors(
        self,
        query_vector: List[float],
        limit: int = 10,
        threshold: float = 0.7,
        search_filter: Optional[Any] = None
    ) -> List[Dict[str, Any]]:
        """Search for similar vectors in VectorAI DB."""
        try:
            await self._ensure_client()
            results = await self._client.points.search(
                self.collection,
                vector=query_vector,
                limit=limit,
                filter=search_filter
            )
            # Filter by threshold and convert to dict format
            filtered = [
                {
                    "id": r.id,
                    "score": r.score,
                    "payload": r.payload
                }
                for r in results
                if r.score >= threshold
            ]
            return filtered
        except Exception as e:
            print(f"Error searching vectors: {e}")
            return []

    async def get_by_id(self, id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a document by its ID."""
        try:
            await self._ensure_client()
            points = await self._client.points.get(self.collection, ids=[id])
            if points and len(points) > 0:
                return {
                    "id": points[0].id,
                    "vector": points[0].vector,
                    "payload": points[0].payload
                }
            return None
        except Exception:
            return None

    async def get_similarity(self, id1: str, id2: str) -> float:
        """Get similarity score between two vectors by their IDs."""
        try:
            await self._ensure_client()
            points = await self._client.points.get(
                self.collection,
                ids=[id1, id2],
                with_vectors=True
            )

            if len(points) < 2:
                return 0.0

            # Handle RetrievedPoint which uses 'vectors' attribute
            vec1 = np.array(points[0].vectors) if hasattr(points[0], 'vectors') and points[0].vectors else None
            vec2 = np.array(points[1].vectors) if hasattr(points[1], 'vectors') and points[1].vectors else None

            if vec1 is None or vec2 is None:
                return 0.0

            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)

            if norm1 == 0 or norm2 == 0:
                return 0.0

            similarity = dot_product / (norm1 * norm2)
            return float(similarity)

        except Exception as e:
            print(f"Error computing similarity: {e}")
            return 0.0

    async def delete_by_id(self, id: str) -> bool:
        """Delete a document by its ID."""
        try:
            await self._ensure_client()
            await self._client.points.delete(self.collection, ids=[id])
            return True
        except Exception:
            return False

    async def close(self):
        """Close the client."""
        if self._client:
            await self._client.__aexit__(None, None, None)

    async def scroll_all(
        self,
        limit: int = 1000,
        with_vectors: bool = True
    ) -> List[Dict[str, Any]]:
        """Scroll through all points in the collection."""
        try:
            await self._ensure_client()
            # Use scroll to get all points
            results = await self._client.points.scroll(
                self.collection,
                limit=limit,
                with_payload=True,
                with_vectors=with_vectors
            )

            # VectorAI scroll returns a tuple: (points_list, offset_id)
            if isinstance(results, tuple):
                points, offset_id = results
            elif isinstance(results, list):
                points = results
            else:
                print(f"Unexpected result format: {type(results)}")
                return []

            # Process the points list
            if len(points) > 0:
                first = points[0]
                if hasattr(first, 'id'):
                    return [
                        {
                            "id": r.id,
                            "vector": list(r.vectors) if with_vectors and hasattr(r, 'vectors') and r.vectors else None,
                            "payload": r.payload if hasattr(r, 'payload') else {}
                        }
                        for r in points
                    ]
                else:
                    print(f"Unexpected point format: {type(first)}")
                    return []
            return []
        except Exception as e:
            print(f"Error scrolling points: {e}")
            return []


# Global instance
vectorai_client = VectorAIDBClient()
