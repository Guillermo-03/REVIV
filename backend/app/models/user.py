from typing import Optional
from datetime import datetime, timezone
from beanie import Document, Indexed
from pydantic import BaseModel, Field
import pymongo


class UserStats(BaseModel):
    events_attended: int = 0
    events_organized: int = 0
    total_volunteer_hours: int = 0
    reports_submitted: int = 0
    reports_resolved: int = 0


class User(Document):
    email: Indexed(str, unique=True)
    hashed_password: str
    display_name: str
    avatar_url: Optional[str] = None
    location: Optional[dict] = None  # GeoJSON Point
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_verified: bool = False
    stats: UserStats = Field(default_factory=UserStats)

    class Settings:
        name = "users"
        indexes = [
            pymongo.IndexModel(
                [("location", pymongo.GEOSPHERE)],
                sparse=True,
            )
        ]
