import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Flashcards with AI", version="1.0.0")

cors_origins = os.getenv("CORS_ORIGINS", '["http://localhost:8000"]')
try:
    import json
    allowed_origins = json.loads(cors_origins)
except json.JSONDecodeError:
    allowed_origins = ["http://localhost:8000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="../frontend"), name="static")

from routers import cards, study

app.include_router(cards.router, prefix="/api", tags=["cards"])
app.include_router(study.router, prefix="/api", tags=["study"])


@app.get("/")
async def serve_frontend():
    from fastapi.responses import FileResponse
    return FileResponse("../frontend/index.html")


@app.get("/health")
async def health_check():
    return {"status": "ok"}
