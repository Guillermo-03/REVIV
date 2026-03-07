from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException
from beanie import PydanticObjectId

from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.event import Event
from app.models.report import Report
from app.schemas.auth import UserResponse, user_to_response
from app.schemas.event import EventResponse
from app.schemas.report import ReportResponse
from app.services.event_service import event_to_response
from app.services.report_service import report_to_response

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user_to_response(user)


from pydantic import BaseModel

class UpdateUserRequest(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    data: UpdateUserRequest,
    current_user: Annotated[User, Depends(get_current_user)],
):
    if str(current_user.id) != user_id:
        raise HTTPException(status_code=403, detail="Cannot update another user's profile")
    if data.display_name:
        current_user.display_name = data.display_name
    if data.avatar_url:
        current_user.avatar_url = data.avatar_url
    await current_user.save()
    return user_to_response(current_user)


@router.get("/{user_id}/events")
async def get_user_events(user_id: str):
    user_oid = PydanticObjectId(user_id)
    events = await Event.find(
        {"$or": [{"organizer_id": user_oid}, {"attendee_ids": user_oid}]}
    ).sort(-Event.created_at).limit(50).to_list()
    return [event_to_response(e) for e in events]


@router.get("/{user_id}/reports")
async def get_user_reports(user_id: str):
    user_oid = PydanticObjectId(user_id)
    reports = await Report.find(Report.submitted_by == user_oid).sort(-Report.created_at).limit(50).to_list()
    return [report_to_response(r) for r in reports]
