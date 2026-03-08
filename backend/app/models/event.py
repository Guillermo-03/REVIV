from typing import Optional, Literal
from datetime import datetime, timezone
from beanie import Document, PydanticObjectId
from pydantic import Field
import pymongo


class Event(Document):
    organizer_id: PydanticObjectId
    name: str
    description: Optional[str] = None
    what_to_bring: Optional[str] = None
    location: dict  # GeoJSON Point
    location_label: Optional[str] = None
    linked_report_id: Optional[PydanticObjectId] = None
    date_time: datetime
    duration_minutes: int
    max_volunteers: Optional[int] = None
    attendee_ids: list[PydanticObjectId] = Field(default_factory=list)
    waitlist_ids: list[PydanticObjectId] = Field(default_factory=list)
    status: Literal["open", "full", "in_progress", "completed", "resolved"] = "open"
    post_cleanup_photos: list[str] = Field(default_factory=list)
    resolution_confirmations: list[PydanticObjectId] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

    class Settings:
        name = "events"
        indexes = [
            pymongo.IndexModel([("location", pymongo.GEOSPHERE)]),
            pymongo.IndexModel([("status", pymongo.ASCENDING)]),
            pymongo.IndexModel([("organizer_id", pymongo.ASCENDING)]),
            pymongo.IndexModel([("attendee_ids", pymongo.ASCENDING)]),
            pymongo.IndexModel([("date_time", pymongo.ASCENDING)]),
        ]
