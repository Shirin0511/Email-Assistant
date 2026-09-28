from fastapi import FastAPI

from routers import emails, threads

app= FastAPI(title="Email Assistant")
app.include_router(emails.router)
app.include_router(threads.router)

