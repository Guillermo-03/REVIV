from typing import Optional, Literal
from datetime import datetime, timezone
from beanie import Document, PydanticObjectId
from pydantic import Field
import pymongo


class Notification(Document):
    user_id: PydanticObjectId
    type: Literal[
        "event_reminder",
        "new_nearby_event",
        "event_updated",
        "report_linked",
        "post_event_confirm",
    ]
    message: str
    is_read: bool = False
    related_event_id: Optional[PydanticObjectId] = None
    related_report_id: Optional[PydanticObjectId] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "notifications"
        indexes = [
            # Compound index covers "get notifications for user" and
            # "get unread notifications for user" in a single index scan
            pymongo.IndexModel(
                [("user_id", pymongo.ASCENDING), ("is_read", pymongo.ASCENDING)]
            ),
            pymongo.IndexModel([("created_at", pymongo.DESCENDING)]),
        ]
