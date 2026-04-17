from fastapi import APIRouter, HTTPException

from models.schemas import AuditRequest, AuditResult, DebiasRequest, DebiasResult
from services.dataset_store import get_dataset, get_metadata, store_dataset, store_audit, get_audit
from services.bias_engine import run_full_audit, run_debiasing

router = APIRouter()


@router.post("/run", response_model=AuditResult)
async def run_audit(request: AuditRequest):
    """Run a complete bias audit on an uploaded dataset."""
    df = get_dataset(request.dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    meta = get_metadata(request.dataset_id)
    dataset_name = meta.get("name", request.dataset_id) if meta else request.dataset_id

    # Validate columns exist
    missing = [a for a in request.sensitive_attrs if a not in df.columns]
    if missing:
        raise HTTPException(status_code=400, detail=f"Columns not found: {missing}")
    if request.outcome_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Outcome column not found: {request.outcome_col}")

    try:
        audit_result = run_full_audit(
            df=df,
            sensitive_attrs=request.sensitive_attrs,
            outcome_col=request.outcome_col,
            dataset_id=dataset_name,
            language=request.language
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audit failed: {str(e)}")

    # Store audit result for report generation
    store_audit(audit_result.audit_id, audit_result)

    return audit_result


@router.get("/{audit_id}", response_model=AuditResult)
async def get_audit_result(audit_id: str):
    """Retrieve a previously run audit result."""
    audit = get_audit(audit_id)
    if audit is None:
        raise HTTPException(status_code=404, detail="Audit not found.")
    return audit


@router.post("/debias", response_model=DebiasResult)
async def debias_dataset(request: DebiasRequest):
    """Apply a debiasing strategy and return before/after comparison."""
    df = get_dataset(request.dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    original_audit = get_audit(request.audit_id)
    if original_audit is None:
        # Run a fresh audit if not found
        original_audit = run_full_audit(df, request.sensitive_attrs, request.outcome_col, request.dataset_id)

    try:
        debiased_df, result = run_debiasing(
            df=df,
            strategy=request.strategy,
            sensitive_attrs=request.sensitive_attrs,
            outcome_col=request.outcome_col,
            original_audit=original_audit
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Debiasing failed: {str(e)}")

    # Store the debiased dataset
    meta = get_metadata(request.dataset_id)
    name = (meta.get("name", "dataset") if meta else "dataset") + "_debiased"
    store_dataset(debiased_df, name)

    return result
