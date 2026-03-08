import asyncio
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.classifier import load_classifier
from app.db.database import init_db
from app.api.routes import auth, users, reports, events, notifications


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    load_classifier()
    yield


app = FastAPI(title="REVIV API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}


_stats_cache: dict = {}
_STATS_TTL = 60  # seconds


@app.get("/api/stats")
async def stats():
    now = time.monotonic()
    if _stats_cache.get("ts", 0) + _STATS_TTL > now:
        return _stats_cache["data"]

    from app.models.report import Report
    from app.models.event import Event
    from app.models.user import User

    total_reports, resolved_reports, total_events, total_volunteers = await asyncio.gather(
        Report.count(),
        Report.find(Report.status == "resolved").count(),
        Event.count(),
        User.count(),
    )

    data = {
        "total_reports": total_reports,
        "resolved_reports": resolved_reports,
        "total_events": total_events,
        "total_volunteers": total_volunteers,
    }
    _stats_cache["data"] = data
    _stats_cache["ts"] = now
    return data


# Mount AFTER routers
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
