from fastapi import APIRouter
from app.api.routes import health, auth, tasks, habits, analytics

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(tasks.router)
api_router.include_router(habits.router)
api_router.include_router(analytics.router)