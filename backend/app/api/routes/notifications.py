from typing import Annotated, List
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.notification_service import (
    get_user_notifications,
    mark_read,
    mark_all_read,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationResponse(BaseModel):
    id: str
    type: str
    message: str
    is_read: bool
    related_event_id: Optional[str] = None
    related_report_id: Optional[str] = None
    created_at: datetime


@router.get("", response_model=List[NotificationResponse])
async def list_notifications(current_user: Annotated[User, Depends(get_current_user)]):
    notifications = await get_user_notifications(current_user.id)
    return [
        NotificationResponse(
            id=str(n.id),
            type=n.type,
            message=n.message,
            is_read=n.is_read,
            related_event_id=str(n.related_event_id) if n.related_event_id else None,
            related_report_id=str(n.related_report_id) if n.related_report_id else None,
            created_at=n.created_at,
        )
        for n in notifications
    ]


@router.patch("/read-all")
async def read_all(current_user: Annotated[User, Depends(get_current_user)]):
    await mark_all_read(current_user.id)
    return {"detail": "All notifications marked read"}


@router.patch("/{notification_id}/read")
async def read_one(
    notification_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
):
    n = await mark_read(notification_id, current_user.id)
    return NotificationResponse(
        id=str(n.id),
        type=n.type,
        message=n.message,
        is_read=n.is_read,
        related_event_id=str(n.related_event_id) if n.related_event_id else None,
        related_report_id=str(n.related_report_id) if n.related_report_id else None,
        created_at=n.created_at,
    )
