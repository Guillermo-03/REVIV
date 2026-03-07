from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ReportSubmitterResponse(BaseModel):
    id: str
    display_name: str


class ReportResponse(BaseModel):
    id: str
    submitted_by: str
    submitter: Optional[ReportSubmitterResponse] = None
    location: dict
    location_label: Optional[str] = None
    severity: str
    category: str
    description: Optional[str] = None
    photo_urls: List[str]
    upvotes: List[str]
    upvote_count: int
    status: str
    linked_event_id: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
