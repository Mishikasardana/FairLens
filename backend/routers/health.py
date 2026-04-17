from fastapi import APIRouter
import os

router = APIRouter()

@router.get("/health")
async def health():
    return {
        "status": "ok",
        "version": "1.0.0",
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
        "gcs_configured": bool(os.getenv("GCS_BUCKET_NAME")),
    }
