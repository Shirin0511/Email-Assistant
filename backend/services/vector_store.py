"""The email vector store, backed by Chroma.

Chroma holds the vectors, the email ids and their metadata together, and
persists to disk. Syncing is a reconciliation: add what is missing, remove
what is gone. That works the same whether emails come from SQLite today or
from Gmail later.
"""

from pathlib import Path

import chromadb
from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Email
from services.embeddings import MODEL_NAME, embed_documents, embed_query, embedding_text


STORE_PATH = Path(__file__).resolve().parent.parent / "chroma_store"


# Drafts are excluded
SEARCHABLE_FOLDERS = ("inbox", "sent")

COLLECTION = "emails_" + MODEL_NAME.replace("/","_").replace("-","_").replace(".","_")

_client = chromadb.PersistentClient(path=str(STORE_PATH))

def _collection():
    return _client.get_or_create_collection(
        name = COLLECTION,
        metadata = {"hnsw:space":"cosine"},  #Chroma defautls to L2, we need cosine here
    )


def sync(db: Session) -> dict:
    """Make the vector store match the mailbox.

    Embeds emails that are not in the store yet, and removes vectors for
    emails that no longer exist. Safe to call repeatedly -- an email already
    present is skipped, so nothing is embedded twice.
    """

    collection = _collection()

    stmt = select(Email).where(Email.folder.in_(SEARCHABLE_FOLDERS))
    emails = {e.id: e for e in db.scalars(stmt)}

    stored_ids = set(collection.get(include=[])["ids"])
    wanted_ids = set(emails)

    to_add = sorted(wanted_ids-stored_ids)
    to_remove = sorted(stored_ids - wanted_ids)

    if to_remove:
        collection.delete(ids=to_remove)

    if to_add:
        batch = [emails[email_id] for email_id in to_add]   

        collection.upsert(
            ids= [e.id for e in batch],
            embeddings = embed_documents(
                [embedding_text(e.subject, e.body) for e in batch]
            ),
            metadatas=[
                {"folder": e.folder, "thread_id": e.thread_id, "subject": e.subject}
                for e in batch
            ],
        )

    return{
        "added":len(to_add),
        "removed":len(to_remove),
        "total":collection.count(),
    }    



def search(db:Session, query:str, limit: int =10) -> list[tuple[Email, float]]:

    """Return (email, similarity) pairs, most relevant first."""

    collection = _collection()

    if collection.count() ==0:
        return []

    result = collection.query(
        query_embedding = embed_query(query),
        n_results= limit,
    )

    hits = list[tuple[Email, float]] = []

    for email_id, distance in zip(result["ids"][0], result["distances"][0]):
        email = db.get(Email, email_id)
        if email is not None:
            hits.append((email, 1.0- float(distance)))

    return hits        

