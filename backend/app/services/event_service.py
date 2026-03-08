from typing import Optional, List
from datetime import datetime, timezone

from fastapi import HTTPException, UploadFile, BackgroundTasks
from beanie import PydanticObjectId

from app.models.event import Event
from app.models.user import User
from app.core.storage import save_file
from app.schemas.event import EventResponse, AttendeeResponse


def event_to_response(event: Event, organizer: Optional[User] = None, attendees: Optional[List[User]] = None) -> EventResponse:
    return EventResponse(
        id=str(event.id),
        organizer_id=str(event.organizer_id),
        organizer=AttendeeResponse(id=str(organizer.id), display_name=organizer.display_name) if organizer else None,
        name=event.name,
        description=event.description,
        what_to_bring=event.what_to_bring,
        location=event.location,
        location_label=event.location_label,
        linked_report_id=str(event.linked_report_id) if event.linked_report_id else None,
        date_time=event.date_time,
        duration_minutes=event.duration_minutes,
        max_volunteers=event.max_volunteers,
        attendee_ids=[str(a) for a in event.attendee_ids],
        waitlist_ids=[str(w) for w in event.waitlist_ids],
        attendee_count=len(event.attendee_ids),
        status=event.status,
        post_cleanup_photos=event.post_cleanup_photos,
        resolution_confirmations=[str(c) for c in event.resolution_confirmations],
        created_at=event.created_at,
        completed_at=event.completed_at,
        attendees=[AttendeeResponse(id=str(a.id), display_name=a.display_name) for a in (attendees or [])],
    )


async def get_all_visible_events(limit: int = 200) -> List[EventResponse]:
    """
    Returns all events currently visible on the map:
    - open / in_progress / full  → always included
    - completed / resolved       → included only if completed within the last 24 h
      (mirrors the 24-h fade-out window enforced on the globe)
    """
    cutoff = datetime.utcnow() - __import__('datetime').timedelta(hours=24)
    query = {
        "$or": [
            {"status": {"$in": ["open", "in_progress", "full"]}},
            {
                "status": {"$in": ["completed", "resolved"]},
                "completed_at": {"$gte": cutoff},
            },
        ]
    }
    events = await Event.find(query).sort(Event.date_time).limit(limit).to_list()
    return [event_to_response(e) for e in events]


async def create_event(
    organizer: User,
    name: str,
    description: Optional[str],
    what_to_bring: Optional[str],
    location_label: Optional[str],
    lat: float,
    lng: float,
    date_time: datetime,
    duration_minutes: int,
    max_volunteers: Optional[int],
    linked_report_id: Optional[str],
    background_tasks: BackgroundTasks,
) -> EventResponse:
    linked_oid = PydanticObjectId(linked_report_id) if linked_report_id else None

    event = Event(
        organizer_id=organizer.id,
        name=name,
        description=description,
        what_to_bring=what_to_bring,
        location={"type": "Point", "coordinates": [lng, lat]},
        location_label=location_label,
        date_time=date_time,
        duration_minutes=duration_minutes,
        max_volunteers=max_volunteers,
        linked_report_id=linked_oid,
    )
    await event.insert()

    # Link report to event
    if linked_oid:
        from app.models.report import Report
        await Report.find_one(Report.id == linked_oid).update(
            {"$set": {"linked_event_id": event.id}}
        )

    # Notify nearby users
    from app.services.notification_service import notify_nearby_users
    background_tasks.add_task(
        notify_nearby_users,
        event.id,
        lat,
        lng,
        f"New cleanup event near you: {name}",
    )

    return event_to_response(event, organizer)


async def get_events_near(
    lat: float,
    lng: float,
    radius_km: float = 50,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    status: Optional[str] = None,
) -> List[EventResponse]:
    query: dict = {
        "location": {
            "$near": {
                "$geometry": {"type": "Point", "coordinates": [lng, lat]},
                "$maxDistance": int(radius_km * 1000),
            }
        }
    }
    if date_from:
        query.setdefault("date_time", {})["$gte"] = date_from
    if date_to:
        query.setdefault("date_time", {})["$lte"] = date_to
    if status:
        query["status"] = status

    events = await Event.find(query).limit(200).to_list()
    return [event_to_response(e) for e in events]


async def get_event_by_id(event_id: str) -> EventResponse:
    event = await Event.get(PydanticObjectId(event_id))
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    organizer = await User.get(event.organizer_id)
    attendees = []
    for aid in event.attendee_ids:
        u = await User.get(aid)
        if u:
            attendees.append(u)
    return event_to_response(event, organizer, attendees)


async def update_event(event_id: str, user: User, data: dict) -> EventResponse:
    event = await Event.get(PydanticObjectId(event_id))
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != user.id:
        raise HTTPException(status_code=403, detail="Only the organizer can update this event")
    for k, v in data.items():
        if v is not None:
            setattr(event, k, v)
    await event.save()
    return event_to_response(event)


async def join_event(event_id: str, user: User, background_tasks: BackgroundTasks) -> EventResponse:
    event = await Event.get(PydanticObjectId(event_id))
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if user.id in event.attendee_ids or user.id in event.waitlist_ids:
        raise HTTPException(status_code=400, detail="Already joined or waitlisted")

    if event.status not in ("open", "full"):
        raise HTTPException(status_code=400, detail="Cannot join event with status: " + event.status)

    if event.max_volunteers and len(event.attendee_ids) >= event.max_volunteers:
        event.waitlist_ids.append(user.id)
    else:
        event.attendee_ids.append(user.id)
        if event.max_volunteers and len(event.attendee_ids) >= event.max_volunteers:
            event.status = "full"

    await event.save()

    # Notify organizer
    from app.services.notification_service import create_notification
    background_tasks.add_task(
        create_notification,
        event.organizer_id,
        "event_updated",
        f"{user.display_name} joined your event: {event.name}",
        event.id,
    )

    organizer = await User.get(event.organizer_id)
    return event_to_response(event, organizer)


async def leave_event(event_id: str, user: User, background_tasks: BackgroundTasks) -> EventResponse:
    event = await Event.get(PydanticObjectId(event_id))
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    was_attendee = user.id in event.attendee_ids
    was_waitlisted = user.id in event.waitlist_ids

    if was_attendee:
        event.attendee_ids.remove(user.id)
        # Promote from waitlist
        if event.waitlist_ids:
            promoted_id = event.waitlist_ids.pop(0)
            event.attendee_ids.append(promoted_id)
            if event.status == "full":
                event.status = "open"
            # Notify promoted user
            from app.services.notification_service import create_notification
            background_tasks.add_task(
                create_notification,
                promoted_id,
                "event_updated",
                f"You've been moved from the waitlist to {event.name}!",
                event.id,
            )
        else:
            if event.status == "full":
                event.status = "open"
    elif was_waitlisted:
        event.waitlist_ids.remove(user.id)
    else:
        raise HTTPException(status_code=400, detail="Not attending or waitlisted")

    await event.save()
    organizer = await User.get(event.organizer_id)
    return event_to_response(event, organizer)


async def complete_event(event_id: str, user: User, photos: List[UploadFile], background_tasks: BackgroundTasks) -> EventResponse:
    event = await Event.get(PydanticObjectId(event_id))
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != user.id:
        raise HTTPException(status_code=403, detail="Only the organizer can complete this event")

    photo_urls = []
    for photo in photos:
        if photo.filename:
            url = await save_file(photo, "events")
            photo_urls.append(url)

    event.post_cleanup_photos.extend(photo_urls)
    event.status = "completed"
    event.completed_at = datetime.now(timezone.utc)
    await event.save()

    # Notify attendees
    from app.services.notification_service import create_notification
    for attendee_id in event.attendee_ids:
        background_tasks.add_task(
            create_notification,
            attendee_id,
            "post_event_confirm",
            f"Please confirm the cleanup at {event.name or event.location_label} is complete!",
            event.id,
        )

    organizer = await User.get(event.organizer_id)
    return event_to_response(event, organizer)


async def confirm_event(event_id: str, user: User, background_tasks: BackgroundTasks) -> EventResponse:
    event = await Event.get(PydanticObjectId(event_id))
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if user.id not in event.attendee_ids:
        raise HTTPException(status_code=403, detail="Only attendees can confirm")

    if user.id in event.resolution_confirmations:
        raise HTTPException(status_code=400, detail="Already confirmed")

    event.resolution_confirmations.append(user.id)
    await event.save()

    # Check majority
    attendee_count = len(event.attendee_ids)
    confirm_count = len(event.resolution_confirmations)
    if attendee_count > 0 and confirm_count >= attendee_count * 0.5:
        event.status = "resolved"
        await event.save()

        # Resolve linked report
        if event.linked_report_id:
            from app.models.report import Report
            report = await Report.get(event.linked_report_id)
            if report:
                report.status = "resolved"
                report.resolved_at = datetime.now(timezone.utc)
                await report.save()
                # Increment report submitter stat
                await User.find_one(User.id == report.submitted_by).update(
                    {"$inc": {"stats.reports_resolved": 1}}
                )

        # Increment stats for all attendees
        hours = event.duration_minutes
        for aid in event.attendee_ids:
            await User.find_one(User.id == aid).update(
                {"$inc": {"stats.events_attended": 1, "stats.total_volunteer_hours": hours}}
            )
        # Increment organizer stat
        await User.find_one(User.id == event.organizer_id).update(
            {"$inc": {"stats.events_organized": 1}}
        )

        # Notify organizer
        from app.services.notification_service import create_notification
        background_tasks.add_task(
            create_notification,
            event.organizer_id,
            "post_event_confirm",
            f"Your event '{event.name}' has been confirmed resolved!",
            event.id,
        )

    organizer = await User.get(event.organizer_id)
    return event_to_response(event, organizer)
