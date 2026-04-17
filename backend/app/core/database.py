from typing import Optional, Dict, Any, List
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
        threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """Search for similar vectors in VectorAI DB."""
        try:
            await self._ensure_client()
            results = await self._client.points.search(
                self.collection,
                vector=query_vector,
                limit=limit
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


# Global instance
vectorai_client = VectorAIDBClient()
