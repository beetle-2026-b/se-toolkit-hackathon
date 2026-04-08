import os
import pathlib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.database import engine, Base

# Import models BEFORE creating tables (they register with Base)
from app.models import Card, StudySession, Deck

# Now create tables with all models registered
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

frontend_dir = pathlib.Path(__file__).parent.parent / "frontend" / "dist"

if frontend_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dir / "assets")), name="assets")

from app.routers import cards, study, ai

app.include_router(cards.router, prefix="/api", tags=["cards"])
app.include_router(study.router, prefix="/api", tags=["study"])
app.include_router(ai.router, prefix="/api", tags=["ai"])


@app.get("/")
@app.get("/api/{path:path}")
async def serve_frontend():
    index_file = frontend_dir / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"status": "Backend is running. Frontend not built."}


@app.get("/health")
async def health_check():
    return {"status": "ok"}
