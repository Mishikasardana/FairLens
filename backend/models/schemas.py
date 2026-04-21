from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from enum import Enum
import math


def clean_float(value):
    """Convert NaN and Inf to None"""
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
    return value


class ColumnRole(str, Enum):
    outcome = "outcome"
    sensitive = "sensitive"
    feature = "feature"
    ignore = "ignore"


class SeverityLevel(str, Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"
    passed = "pass"


class DatasetMetadata(BaseModel):
    dataset_id: str
    name: str
    rows: int
    columns: int
    column_names: List[str]
    sample: List[Dict[str, Any]]


class ColumnTagRequest(BaseModel):
    dataset_id: str
    tags: Dict[str, ColumnRole]


class AuditRequest(BaseModel):
    dataset_id: str
    sensitive_attrs: List[str]
    outcome_col: str
    language: Optional[str] = "English"


class GroupStats(BaseModel):
    group: str
    count: int
    positive_rate: Optional[float] = None
    total_positive: int

    @field_validator('positive_rate', mode='before')
    @classmethod
    def clean_positive_rate(cls, v):
        return clean_float(v)


class FindingDetail(BaseModel):
    attribute: str
    metric: str
    value: Optional[float] = None
    severity: SeverityLevel
    favored_group: Optional[str] = None
    disadvantaged_group: Optional[str] = None
    group_stats: Optional[List[GroupStats]] = None
    threshold_used: Optional[float] = None
    interpretation: Optional[str] = None

    @field_validator('value', 'threshold_used', mode='before')
    @classmethod
    def clean_floats(cls, v):
        return clean_float(v)


class ShapFeature(BaseModel):
    feature: str
    importance: Optional[float] = None
    correlation_with_sensitive: Optional[float] = None

    @field_validator('importance', 'correlation_with_sensitive', mode='before')
    @classmethod
    def clean_floats(cls, v):
        return clean_float(v)


class AuditResult(BaseModel):
    audit_id: str
    dataset_id: str
    overall_score: int
    critical_count: int
    high_count: int
    medium_count: int
    passed_count: int
    findings: List[FindingDetail]
    shap_features: Optional[List[ShapFeature]] = None
    sensitive_attrs: List[str]
    outcome_col: str
    rows_analyzed: int
    timestamp: str


class DebiasStrategy(str, Enum):
    reweighting = "reweighting"
    resampling = "resampling"
    threshold_calibration = "threshold_calibration"


class DebiasRequest(BaseModel):
    audit_id: str
    dataset_id: str
    strategy: DebiasStrategy
    sensitive_attrs: List[str]
    outcome_col: str


class BeforeAfterMetric(BaseModel):
    attribute: str
    metric: str
    before: Optional[float] = None
    after: Optional[float] = None
    improvement_pct: Optional[float] = None

    @field_validator('before', 'after', 'improvement_pct', mode='before')
    @classmethod
    def clean_floats(cls, v):
        return clean_float(v)


class DebiasResult(BaseModel):
    debiased_dataset_id: str
    strategy_used: DebiasStrategy
    before_score: int
    after_score: int
    comparisons: List[BeforeAfterMetric]


class ReportRequest(BaseModel):
    audit_id: str
    language_code: str = "en"
    language_name: str = "English"
    include_technical: bool = False


class ReportSection(BaseModel):
    title: str
    content: str


class ReportResult(BaseModel):
    report_id: str
    audit_id: str
    language_code: str
    language_name: str
    sections: List[ReportSection]
    full_text: str
    generated_at: str
    overall_score: int
    is_rtl: bool = False


class DetectColumnsRequest(BaseModel):
    column_names: List[str]
    language_name: str = "English"
    sample_values: Optional[Dict[str, List[Any]]] = None


class DetectColumnsResult(BaseModel):
    sensitive: List[str]
    outcome: List[str]
    feature: List[str]
    reasoning: str
    confidence: Optional[float] = None

    @field_validator('confidence', mode='before')
    @classmethod
    def clean_confidence(cls, v):
        return clean_float(v)
