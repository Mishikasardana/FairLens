"""
In-memory dataset store for development.
In production, swap with Google Cloud Storage + BigQuery.
"""
import pandas as pd
import io
import uuid
from typing import Dict, Optional, Tuple

# In-memory stores
_datasets: Dict[str, pd.DataFrame] = {}
_metadata: Dict[str, dict] = {}
_audits: Dict[str, object] = {}


def store_dataset(df: pd.DataFrame, name: str) -> str:
    """Store a dataset and return its ID."""
    dataset_id = str(uuid.uuid4())
    _datasets[dataset_id] = df.copy()
    _metadata[dataset_id] = {
        "dataset_id": dataset_id,
        "name": name,
        "rows": len(df),
        "columns": len(df.columns),
        "column_names": list(df.columns),
        "sample": df.head(5).to_dict(orient="records")
    }
    return dataset_id


def get_dataset(dataset_id: str) -> Optional[pd.DataFrame]:
    return _datasets.get(dataset_id)


def get_metadata(dataset_id: str) -> Optional[dict]:
    return _metadata.get(dataset_id)


def store_audit(audit_id: str, audit_result) -> None:
    _audits[audit_id] = audit_result


def get_audit(audit_id: str):
    return _audits.get(audit_id)


def parse_upload(content: bytes, filename: str) -> Tuple[pd.DataFrame, str]:
    """Parse CSV or JSON file upload into a DataFrame."""
    if filename.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(content))
    elif filename.endswith(".json"):
        df = pd.read_json(io.BytesIO(content))
    else:
        raise ValueError(f"Unsupported file type: {filename}")

    df = df.dropna(how="all").reset_index(drop=True)
    name = filename.rsplit(".", 1)[0]
    return df, name


# Google Cloud Storage integration (production)
async def upload_to_gcs(content: bytes, filename: str, bucket_name: str) -> str:
    """Upload dataset to Google Cloud Storage. Use in production."""
    try:
        from google.cloud import storage
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        blob_name = f"datasets/{uuid.uuid4()}/{filename}"
        blob = bucket.blob(blob_name)
        blob.upload_from_string(content)
        return f"gs://{bucket_name}/{blob_name}"
    except Exception as e:
        raise RuntimeError(f"GCS upload failed: {str(e)}")


async def load_from_gcs(gcs_uri: str) -> pd.DataFrame:
    """Load dataset from Google Cloud Storage."""
    try:
        import gcsfs
        fs = gcsfs.GCSFileSystem()
        with fs.open(gcs_uri) as f:
            if gcs_uri.endswith(".csv"):
                return pd.read_csv(f)
            else:
                return pd.read_json(f)
    except Exception as e:
        raise RuntimeError(f"GCS load failed: {str(e)}")
