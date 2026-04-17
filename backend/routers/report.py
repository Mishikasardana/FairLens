from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from models.schemas import ReportRequest, ReportResult
from services.dataset_store import get_audit
from services.gemini_service import generate_multilingual_report, explain_metric_in_language, suggest_fixes_in_language
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class ExplainRequest(BaseModel):
    metric_name: str
    value: float
    attribute: str
    language_name: str = "English"
    context: Optional[str] = None


class SuggestRequest(BaseModel):
    audit_id: str
    language_name: str = "English"


@router.post("/generate", response_model=ReportResult)
async def generate_report(request: ReportRequest):
    """
    Generate a plain-language bias audit report in the requested language using Gemini.
    Supports 10+ languages including Hindi, Arabic (RTL), Swahili, and more.
    """
    audit = get_audit(request.audit_id)
    if audit is None:
        raise HTTPException(status_code=404, detail="Audit not found. Run an audit first.")

    try:
        report = await generate_multilingual_report(
            audit=audit,
            language_code=request.language_code,
            language_name=request.language_name,
            include_technical=request.include_technical
        )
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return report


@router.post("/explain-metric")
async def explain_metric(request: ExplainRequest):
    """Ask Gemini to explain a single bias metric in plain language."""
    try:
        explanation = await explain_metric_in_language(
            metric_name=request.metric_name,
            value=request.value,
            attribute=request.attribute,
            language_name=request.language_name,
            context=request.context
        )
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/suggest-fixes")
async def suggest_fixes(request: SuggestRequest):
    """Get AI-generated fix recommendations in the user's language."""
    audit = get_audit(request.audit_id)
    if audit is None:
        raise HTTPException(status_code=404, detail="Audit not found.")

    try:
        suggestions = await suggest_fixes_in_language(audit, request.language_name)
        return {"suggestions": suggestions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{report_id}/download")
async def download_report_text(report_id: str):
    """Download a report as plain text."""
    # In production, retrieve from Cloud Storage
    return PlainTextResponse(
        content=f"Report {report_id} - download from Cloud Storage in production",
        media_type="text/plain"
    )
