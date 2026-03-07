from typing import Optional, List
from datetime import datetime, timezone

from fastapi import HTTPException, UploadFile
from beanie import PydanticObjectId

from app.models.report import Report
from app.models.user import User
from app.core.storage import save_file
from app.schemas.report import ReportResponse, ReportSubmitterResponse


def report_to_response(report: Report, submitter: Optional[User] = None) -> ReportResponse:
    return ReportResponse(
        id=str(report.id),
        submitted_by=str(report.submitted_by),
        submitter=ReportSubmitterResponse(id=str(submitter.id), display_name=submitter.display_name) if submitter else None,
        location=report.location,
        location_label=report.location_label,
        severity=report.severity,
        category=report.category,
        description=report.description,
        photo_urls=report.photo_urls,
        upvotes=[str(u) for u in report.upvotes],
        upvote_count=report.upvote_count,
        status=report.status,
        linked_event_id=str(report.linked_event_id) if report.linked_event_id else None,
        created_at=report.created_at,
        resolved_at=report.resolved_at,
    )


async def create_report(
    submitted_by: User,
    lat: float,
    lng: float,
    location_label: Optional[str],
    severity: str,
    category: str,
    description: Optional[str],
    photos: List[UploadFile],
) -> ReportResponse:
    photo_urls = []
    for photo in photos:
        if photo.filename:
            url = await save_file(photo, "reports")
            photo_urls.append(url)

    report = Report(
        submitted_by=submitted_by.id,
        location={"type": "Point", "coordinates": [lng, lat]},
        location_label=location_label,
        severity=severity,
        category=category,
        description=description,
        photo_urls=photo_urls,
    )
    await report.insert()

    # Increment user stat
    await User.find_one(User.id == submitted_by.id).update(
        {"$inc": {"stats.reports_submitted": 1}}
    )

    return report_to_response(report, submitted_by)


async def get_reports_near(
    lat: float,
    lng: float,
    radius_km: float = 50,
    severity: Optional[str] = None,
    status: Optional[str] = "active",
) -> List[ReportResponse]:
    query: dict = {
        "location": {
            "$near": {
                "$geometry": {"type": "Point", "coordinates": [lng, lat]},
                "$maxDistance": int(radius_km * 1000),
            }
        }
    }
    if severity:
        query["severity"] = severity
    if status:
        query["status"] = status

    reports = await Report.find(query).limit(200).to_list()
    return [report_to_response(r) for r in reports]


async def get_report_by_id(report_id: str) -> ReportResponse:
    report = await Report.get(PydanticObjectId(report_id))
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    submitter = await User.get(report.submitted_by)
    return report_to_response(report, submitter)


async def upvote_report(report_id: str, user: User) -> ReportResponse:
    report = await Report.get(PydanticObjectId(report_id))
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if user.id in report.upvotes:
        report.upvotes.remove(user.id)
        report.upvote_count = max(0, report.upvote_count - 1)
    else:
        report.upvotes.append(user.id)
        report.upvote_count += 1

    await report.save()
    return report_to_response(report)


async def resolve_report(report_id: str, user: User) -> ReportResponse:
    from app.models.event import Event
    report = await Report.get(PydanticObjectId(report_id))
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if report.linked_event_id:
        event = await Event.get(report.linked_event_id)
        if not event or event.organizer_id != user.id:
            raise HTTPException(status_code=403, detail="Only the linked event organizer can resolve this report")
    elif report.submitted_by != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    report.status = "resolved"
    report.resolved_at = datetime.now(timezone.utc)
    await report.save()
    return report_to_response(report)
