from contextlib import asynccontextmanager

from fastapi import FastAPI

from database import SessionLocal
from routers import emails
from services import vector_store


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Bring the vector store in line with the mailbox before serving traffic.
    with SessionLocal() as db:
        stats = vector_store.sync(db)
        print(f"Vector Store stats: {stats}")

    yield





app= FastAPI(title="Email Assistant", lifespan=lifespan)
app.include_router(emails.router)

