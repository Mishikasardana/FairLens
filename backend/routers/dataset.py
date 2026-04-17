from fastapi import APIRouter, UploadFile, File, HTTPException, Body
from typing import Optional
import os

from models.schemas import DatasetMetadata, ColumnTagRequest, DetectColumnsRequest, DetectColumnsResult
from services.dataset_store import store_dataset, get_metadata, parse_upload
from services.bias_engine import detect_sensitive_columns_heuristic
from services.gemini_service import detect_columns_with_gemini

router = APIRouter()

MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE_MB", 50)) * 1024 * 1024


@router.post("/upload", response_model=DatasetMetadata)
async def upload_dataset(file: UploadFile = File(...)):
    """Upload a CSV or JSON dataset for analysis."""
    if not file.filename.endswith((".csv", ".json")):
        raise HTTPException(status_code=400, detail="Only .csv and .json files are supported.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large. Max size: {MAX_FILE_SIZE // 1024 // 1024}MB")

    try:
        df, name = parse_upload(content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {str(e)}")

    if len(df) == 0:
        raise HTTPException(status_code=422, detail="Dataset is empty.")
    if len(df.columns) < 2:
        raise HTTPException(status_code=422, detail="Dataset must have at least 2 columns.")

    dataset_id = store_dataset(df, name)
    meta = get_metadata(dataset_id)

    return DatasetMetadata(**meta)


@router.get("/{dataset_id}", response_model=DatasetMetadata)
async def get_dataset_info(dataset_id: str):
    """Get metadata for an uploaded dataset."""
    meta = get_metadata(dataset_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    return DatasetMetadata(**meta)


@router.post("/detect-columns", response_model=DetectColumnsResult)
async def detect_columns(request: DetectColumnsRequest):
    """
    Auto-detect which columns are sensitive attributes vs outcomes.
    Uses Gemini for intelligent multilingual detection with heuristic fallback.
    """
    if not request.column_names:
        raise HTTPException(status_code=400, detail="No column names provided.")

    gemini_key = os.getenv("GEMINI_API_KEY", "")
    if gemini_key:
        try:
            result = await detect_columns_with_gemini(
                column_names=request.column_names,
                language_name=request.language_name,
                sample_values=request.sample_values
            )
            return result
        except Exception:
            pass  # Fall through to heuristic

    # Heuristic fallback (no API key needed)
    tags = detect_sensitive_columns_heuristic(request.column_names)
    sensitive = [c for c, t in tags.items() if t == "sensitive"]
    outcome = [c for c, t in tags.items() if t == "outcome"]
    feature = [c for c, t in tags.items() if t == "feature"]

    return DetectColumnsResult(
        sensitive=sensitive,
        outcome=outcome,
        feature=feature,
        reasoning="Auto-detected using keyword matching (heuristic mode).",
        confidence=0.6
    )
