from typing import Annotated, Optional, List
from fastapi import APIRouter, Depends, Form, File, UploadFile

from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.report import ReportResponse
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("", response_model=List[ReportResponse])
async def list_reports(
    lat: float,
    lng: float,
    radius_km: float = 50,
    severity: Optional[str] = None,
    status: Optional[str] = "active",
):
    return await report_service.get_reports_near(lat, lng, radius_km, severity, status)


@router.post("", response_model=ReportResponse)
async def create_report(
    current_user: Annotated[User, Depends(get_current_user)],
    lat: float = Form(...),
    lng: float = Form(...),
    location_label: Optional[str] = Form(None),
    category: str = Form(...),
    description: Optional[str] = Form(None),
    photos: List[UploadFile] = File(default=[]),
):
    return await report_service.create_report(
        submitted_by=current_user,
        lat=lat,
        lng=lng,
        location_label=location_label,
        category=category,
        description=description,
        photos=photos,
    )


@router.get("/heatmap")
async def get_heatmap(
    lat: float,
    lng: float,
    radius_km: float = 100,
):
    return await report_service.get_heatmap_points(lat, lng, radius_km)


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(report_id: str):
    return await report_service.get_report_by_id(report_id)


@router.patch("/{report_id}/upvote", response_model=ReportResponse)
async def upvote_report(
    report_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
):
    return await report_service.upvote_report(report_id, current_user)


@router.patch("/{report_id}/resolve", response_model=ReportResponse)
async def resolve_report(
    report_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
):
    return await report_service.resolve_report(report_id, current_user)
