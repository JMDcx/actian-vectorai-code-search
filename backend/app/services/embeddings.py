from typing import List
from sentence_transformers import SentenceTransformer
import numpy as np
import hashlib


class EmbeddingService:
    """Service for generating code embeddings using sentence transformers."""

    def __init__(self):
        # Initialize with CodeBERT or similar model for code
        self.model = SentenceTransformer('microsoft/codebert-base')
        self.dimension = 768  # CodeBERT embedding dimension
        self._cache = {}

    def generate_embedding(self, code: str) -> List[float]:
        """Generate embedding for code snippet."""
        # Check cache
        code_hash = hashlib.md5(code.encode()).hexdigest()
        if code_hash in self._cache:
            return self._cache[code_hash]

        # Generate embedding
        embedding = self.model.encode(
            code,
            convert_to_numpy=True,
            show_progress_bar=False
        )

        # Normalize
        embedding = embedding / np.linalg.norm(embedding)

        # Cache and return
        self._cache[code_hash] = embedding.tolist()
        return embedding.tolist()

    def generate_query_embedding(self, query: str) -> List[float]:
        """Generate embedding for natural language query."""
        return self.generate_embedding(query)

    def similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Calculate cosine similarity between two embeddings."""
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)
        return float(np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2)))


# Global instance
embedding_service = EmbeddingService()
