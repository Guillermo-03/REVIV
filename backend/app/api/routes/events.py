from typing import Annotated, Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, Form, File, UploadFile, BackgroundTasks

from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.event import EventResponse
from app.services import event_service

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=List[EventResponse])
async def list_events(
    lat: float,
    lng: float,
    radius_km: float = 50,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    status: Optional[str] = None,
):
    return await event_service.get_events_near(lat, lng, radius_km, date_from, date_to, status)


@router.post("", response_model=EventResponse)
async def create_event(
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    name: str,
    lat: float,
    lng: float,
    date_time: datetime,
    duration_minutes: int,
    description: Optional[str] = None,
    what_to_bring: Optional[str] = None,
    location_label: Optional[str] = None,
    max_volunteers: Optional[int] = None,
    linked_report_id: Optional[str] = None,
):
    return await event_service.create_event(
        organizer=current_user,
        name=name,
        description=description,
        what_to_bring=what_to_bring,
        location_label=location_label,
        lat=lat,
        lng=lng,
        date_time=date_time,
        duration_minutes=duration_minutes,
        max_volunteers=max_volunteers,
        linked_report_id=linked_report_id,
        background_tasks=background_tasks,
    )


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: str):
    return await event_service.get_event_by_id(event_id)


@router.patch("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    name: Optional[str] = None,
    description: Optional[str] = None,
    what_to_bring: Optional[str] = None,
    location_label: Optional[str] = None,
    max_volunteers: Optional[int] = None,
):
    return await event_service.update_event(event_id, current_user, {
        "name": name,
        "description": description,
        "what_to_bring": what_to_bring,
        "location_label": location_label,
        "max_volunteers": max_volunteers,
    })


@router.post("/{event_id}/join", response_model=EventResponse)
async def join_event(
    event_id: str,
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
):
    return await event_service.join_event(event_id, current_user, background_tasks)


@router.post("/{event_id}/leave", response_model=EventResponse)
async def leave_event(
    event_id: str,
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
):
    return await event_service.leave_event(event_id, current_user, background_tasks)


@router.post("/{event_id}/complete", response_model=EventResponse)
async def complete_event(
    event_id: str,
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    photos: List[UploadFile] = File(default=[]),
):
    return await event_service.complete_event(event_id, current_user, photos, background_tasks)


@router.post("/{event_id}/confirm", response_model=EventResponse)
async def confirm_event(
    event_id: str,
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
):
    return await event_service.confirm_event(event_id, current_user, background_tasks)
