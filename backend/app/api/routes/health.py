from fastapi import APIRouter
from sqlalchemy import text

from app.db.session import engine

router = APIRouter(tags=["health"])

@router.get("/health")
def health():
    return {"status": "ok"}

@router.get("/health/db")
def health_db():
    with engine.connect() as conn:
        val = conn.execute(text("SELECT 1")).scalar_one()
    return {"db": "ok", "select_1": val}

@router.get("/")
def root():
    return {"name": "habit-tracker", "status": "ok"}
