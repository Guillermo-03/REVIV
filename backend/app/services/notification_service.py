from typing import Optional
from beanie import PydanticObjectId
from fastapi import HTTPException

from app.models.notification import Notification
from app.models.user import User


async def create_notification(
    user_id: PydanticObjectId,
    type: str,
    message: str,
    related_event_id: Optional[PydanticObjectId] = None,
    related_report_id: Optional[PydanticObjectId] = None,
):
    n = Notification(
        user_id=user_id,
        type=type,
        message=message,
        related_event_id=related_event_id,
        related_report_id=related_report_id,
    )
    await n.insert()


async def get_user_notifications(user_id: PydanticObjectId) -> list[Notification]:
    return (
        await Notification.find(Notification.user_id == user_id)
        .sort(-Notification.created_at)
        .limit(50)
        .to_list()
    )


async def mark_read(notification_id: str, user_id: PydanticObjectId):
    n = await Notification.get(PydanticObjectId(notification_id))
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    if n.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not your notification")
    n.is_read = True
    await n.save()
    return n


async def mark_all_read(user_id: PydanticObjectId):
    await Notification.find(
        Notification.user_id == user_id, Notification.is_read == False
    ).update({"$set": {"is_read": True}})


async def notify_nearby_users(
    event_id: PydanticObjectId,
    lat: float,
    lng: float,
    message: str,
    radius_meters: float = 25000,
):
    nearby_users = await User.find(
        {
            "location": {
                "$near": {
                    "$geometry": {"type": "Point", "coordinates": [lng, lat]},
                    "$maxDistance": radius_meters,
                }
            }
        }
    ).limit(100).to_list()

    if not nearby_users:
        return
    notifications = [
        Notification(
            user_id=u.id,
            type="new_nearby_event",
            message=message,
            related_event_id=event_id,
        )
        for u in nearby_users
    ]
    await Notification.insert_many(notifications)
