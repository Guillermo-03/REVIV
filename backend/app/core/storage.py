import uuid
import os
from fastapi import HTTPException, UploadFile

from app.core.config import settings

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE = 5 * 1024 * 1024  # 5MB
EXT_MAP = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


async def save_file(file: UploadFile, resource_type: str) -> str:
    content_type = file.content_type
    if content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail=f"Invalid file type: {content_type}")

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 5MB limit")

    ext = EXT_MAP[content_type]
    filename = f"{uuid.uuid4().hex}.{ext}"
    dir_path = os.path.join(settings.UPLOAD_DIR, resource_type)
    os.makedirs(dir_path, exist_ok=True)
    file_path = os.path.join(dir_path, filename)

    with open(file_path, "wb") as f:
        f.write(data)

    return f"/uploads/{resource_type}/{filename}"
