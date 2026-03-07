from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.db.database import init_db
from app.api.routes import auth, users, reports, events, notifications


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="REVIV API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/stats")
async def stats():
    from app.models.report import Report
    from app.models.event import Event
    from app.models.user import User
    total_reports = await Report.count()
    resolved_reports = await Report.find(Report.status == "resolved").count()
    total_events = await Event.count()
    total_volunteers = await User.count()
    return {
        "total_reports": total_reports,
        "resolved_reports": resolved_reports,
        "total_events": total_events,
        "total_volunteers": total_volunteers,
    }


# Mount AFTER routers
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
