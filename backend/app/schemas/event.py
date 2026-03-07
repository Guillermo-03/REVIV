from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class AttendeeResponse(BaseModel):
    id: str
    display_name: str


class EventResponse(BaseModel):
    id: str
    organizer_id: str
    organizer: Optional[AttendeeResponse] = None
    name: str
    description: Optional[str] = None
    what_to_bring: Optional[str] = None
    location: dict
    location_label: Optional[str] = None
    linked_report_id: Optional[str] = None
    date_time: datetime
    duration_minutes: int
    max_volunteers: Optional[int] = None
    attendee_ids: List[str]
    waitlist_ids: List[str]
    attendee_count: int
    status: str
    post_cleanup_photos: List[str]
    resolution_confirmations: List[str]
    created_at: datetime
    completed_at: Optional[datetime] = None
    attendees: Optional[List[AttendeeResponse]] = None
