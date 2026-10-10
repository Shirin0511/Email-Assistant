"""Local text embeddings. No API call, no quota, no network."""

import numpy as np
from fastembed import TextEmbedding

MODEL_NAME = "BAAI/bge-small-en-v1.5"

# Loaded once at import. The first run downloads the model to a local cache.
_model = TextEmbedding(model_name=MODEL_NAME)

def embedding_text(subject:str, body:str) ->str:
    """The text we actually embed for an email."""

    return f"{subject}\n\n{body}"


def _normalize(vectors: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return vectors / norms


def embed_documents(text:list[str]) -> list[list[float]]:
    vectors= np.array(list(_model.embed(text)), dtype="flaot32")
    return _normalize(vectors).tolist()


def embed_query(text:str)-> list[float]:
    """Embed a search query.

    BGE models use a different prefix for queries than for documents, and
    query_embed applies it. Using embed() here would quietly give worse
    results rather than an error.
    """

    query_vector = np.array(list(_model.query_embed([text])), dtype="float32")
    return _normalize(query_vector)[0].tolist()