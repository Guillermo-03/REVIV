from typing import Optional, Literal
from datetime import datetime, timezone
from beanie import Document, PydanticObjectId
from pydantic import Field
import pymongo


class Report(Document):
    submitted_by: PydanticObjectId
    location: dict  # GeoJSON Point
    location_label: Optional[str] = None
    severity: Literal["low", "medium", "high"]
    category: Literal["roadside", "park", "waterway", "construction", "illegal_dump"]
    description: Optional[str] = None
    photo_urls: list[str] = Field(default_factory=list)
    upvotes: list[PydanticObjectId] = Field(default_factory=list)
    upvote_count: int = 0
    status: Literal["active", "resolved"] = "active"
    linked_event_id: Optional[PydanticObjectId] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None

    class Settings:
        name = "reports"
        indexes = [
            pymongo.IndexModel([("location", pymongo.GEOSPHERE)]),
            pymongo.IndexModel([("status", pymongo.ASCENDING)]),
            pymongo.IndexModel([("submitted_by", pymongo.ASCENDING)]),
        ]
