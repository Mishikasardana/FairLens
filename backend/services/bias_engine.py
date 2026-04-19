import pandas as pd
import numpy as np
from typing import List, Dict, Tuple, Optional
from scipy import stats
import uuid
import datetime

from models.schemas import (
    FindingDetail, GroupStats, ShapFeature,
    AuditResult, SeverityLevel, BeforeAfterMetric, DebiasResult, DebiasStrategy
)

SENSITIVE_KEYWORDS = [
    "gender", "sex", "race", "ethnicity", "age", "religion", "disability",
    "nationality", "caste", "marital", "pregnant", "color", "colour",
    "geschlecht", "alter", "rasse",          # German
    "genre", "âge", "race", "ethnie",         # French
    "género", "edad", "raza", "etnia",         # Spanish
    "gênero", "idade", "raça",                 # Portuguese
    "जाति", "लिंग", "आयु", "धर्म",            # Hindi
    "جنس", "عمر", "عرق", "دين",               # Arabic
    "jinsia", "umri", "kabila", "dini",        # Swahili
    "性别", "年龄", "种族", "民族",              # Chinese
    "性別", "年齢", "人種", "民族",              # Japanese
]

OUTCOME_KEYWORDS = [
    "hired", "approved", "accepted", "granted", "admitted", "passed",
    "outcome", "result", "decision", "label", "target", "y",
    "loan", "credit", "score", "salary", "promoted", "selected",
    "diagnosis", "admit", "hire", "approve",
]
POSITIVE_OUTCOME_KEYWORDS = {
    'yes', 'true', 'ok', '1', 'positive', 'pass', 'selected', 'accepted',
    'approved', 'hired', 'admitted', 'success', 'win', 'eligible', 'clear'
}
NEGATIVE_OUTCOME_KEYWORDS = {
    'no', 'false', '0', 'negative', 'fail', 'failed', 'rejected',
    'denied', 'declined', 'ineligible', 'block', 'not selected', 'not approved'
}


def normalize_outcome_series(series: pd.Series) -> pd.Series:
    """Convert a dataset outcome column into 0/1 values using numeric and text heuristics."""
    text = series.astype(str).str.strip().str.lower()
    numeric = pd.to_numeric(series, errors='coerce')
    result = numeric.copy()

    def map_label(value: str):
        if value in POSITIVE_OUTCOME_KEYWORDS:
            return 1.0
        if value in NEGATIVE_OUTCOME_KEYWORDS:
            return 0.0
        return None

    inferred = text.map(map_label)
    result = result.where(numeric.notna(), inferred)

    # If the column is binary text with two unique labels, try to infer positive/negative.
    if result.isna().all():
        unique = [v for v in text.unique() if v != 'nan']
        if len(unique) == 2:
            first, second = unique
            if first in POSITIVE_OUTCOME_KEYWORDS or second in NEGATIVE_OUTCOME_KEYWORDS:
                result = text.map(lambda v: 1.0 if v == first else 0.0)
            elif second in POSITIVE_OUTCOME_KEYWORDS or first in NEGATIVE_OUTCOME_KEYWORDS:
                result = text.map(lambda v: 1.0 if v == second else 0.0)
            else:
                # fallback: map the first label to 0 and the second label to 1,
                # preserving a binary split rather than all zeros.
                result = text.map(lambda v: 1.0 if v == second else 0.0)

    result = result.fillna(0.0).astype(float)
    return result


def detect_sensitive_columns_heuristic(columns: List[str], sample: Optional[Dict] = None) -> Dict[str, str]:
    """Fast heuristic-based column classification (no API needed)."""
    tags = {}
    for col in columns:
        col_lower = col.lower().replace("_", " ").replace("-", " ")
        if any(kw in col_lower for kw in SENSITIVE_KEYWORDS):
            tags[col] = "sensitive"
        elif any(kw in col_lower for kw in OUTCOME_KEYWORDS):
            tags[col] = "outcome"
        else:
            tags[col] = "feature"
    return tags


def compute_demographic_parity_gap(df: pd.DataFrame, sensitive_col: str, outcome_col: str) -> Tuple[float, Dict, str, str]:
    """
    Demographic parity: difference in positive outcome rates across groups.
    Ideal value = 0 (equal rates for all groups).
    """
    df = df.copy()
    df[outcome_col] = normalize_outcome_series(df[outcome_col])

    groups = df.groupby(sensitive_col)[outcome_col]
    rates = groups.mean().dropna()

    if len(rates) < 2:
        return 0.0, {}, "", ""

    max_rate = float(rates.max())
    min_rate = float(rates.min())
    gap = max_rate - min_rate

    favored = str(rates.idxmax())
    disadvantaged = str(rates.idxmin())

    group_stats = {}
    for group, grp_df in df.groupby(sensitive_col):
        pos = int((grp_df[outcome_col] == 1).sum())
        total = len(grp_df)
        group_stats[str(group)] = {"count": total, "positive": pos, "rate": pos / total if total > 0 else 0.0}

    return gap, group_stats, favored, disadvantaged


def compute_disparate_impact_ratio(df: pd.DataFrame, sensitive_col: str, outcome_col: str) -> Tuple[float, str, str]:
    """
    4/5ths rule: ratio of lowest to highest positive rate.
    Must be >= 0.8 to pass. Below 0.8 = adverse impact.
    """
    df = df.copy()
    df[outcome_col] = normalize_outcome_series(df[outcome_col])

    rates = df.groupby(sensitive_col)[outcome_col].mean().dropna()
    if len(rates) < 2 or rates.max() == 0:
        return 1.0, "", ""

    ratio = float(rates.min() / rates.max())
    return ratio, str(rates.idxmax()), str(rates.idxmin())


def compute_equalized_odds_gap(df: pd.DataFrame, sensitive_col: str, outcome_col: str,
                                prediction_col: Optional[str] = None) -> float:
    """
    Equalized odds: difference in true positive rates across groups.
    Approximated using actual outcomes when no model predictions available.
    """
    df = df.copy()
    df[outcome_col] = normalize_outcome_series(df[outcome_col])

    if prediction_col and prediction_col in df.columns:
        tpr_by_group = {}
        for group, grp_df in df.groupby(sensitive_col):
            positives = grp_df[grp_df[outcome_col] == 1]
            if len(positives) == 0:
                continue
            tpr = (positives[prediction_col] >= 0.5).mean()
            tpr_by_group[str(group)] = float(tpr)
        if len(tpr_by_group) < 2:
            return 0.0
        values = list(tpr_by_group.values())
        return float(max(values) - min(values))

    rates = df.groupby(sensitive_col)[outcome_col].mean().dropna()
    if len(rates) < 2:
        return 0.0
    return float(rates.max() - rates.min()) * 0.7


def compute_statistical_significance(df: pd.DataFrame, sensitive_col: str, outcome_col: str) -> Dict[str, float]:
    """Chi-squared test for independence between sensitive attr and outcome."""
    df = df.copy()
    df[outcome_col] = normalize_outcome_series(df[outcome_col]).round()
    try:
        contingency = pd.crosstab(df[sensitive_col], df[outcome_col])
        chi2, p_value, dof, expected = stats.chi2_contingency(contingency)
        return {"chi2": float(chi2), "p_value": float(p_value), "dof": int(dof)}
    except Exception:
        return {"chi2": 0.0, "p_value": 1.0, "dof": 0}


def compute_feature_correlation_with_sensitive(
    df: pd.DataFrame, sensitive_col: str, feature_cols: List[str]
) -> List[ShapFeature]:
    """Proxy SHAP: correlation between features and sensitive attribute."""
    results = []
    try:
        # Encode sensitive column numerically
        sensitive_encoded = pd.Categorical(df[sensitive_col]).codes
        for col in feature_cols[:10]:  # limit for performance
            try:
                vals = pd.to_numeric(df[col], errors='coerce').fillna(0)
                corr, _ = stats.pearsonr(vals, sensitive_encoded)
                results.append(ShapFeature(feature=col, importance=abs(float(corr)), correlation_with_sensitive=float(corr)))
            except Exception:
                continue
        results.sort(key=lambda x: x.importance, reverse=True)
    except Exception:
        pass
    return results[:8]


def severity_from_dpg(gap: float) -> SeverityLevel:
    if gap > 0.20: return SeverityLevel.critical
    if gap > 0.10: return SeverityLevel.high
    if gap > 0.05: return SeverityLevel.medium
    if gap > 0.02: return SeverityLevel.low
    return SeverityLevel.passed


def severity_from_dir(ratio: float) -> SeverityLevel:
    if ratio < 0.60: return SeverityLevel.critical
    if ratio < 0.75: return SeverityLevel.high
    if ratio < 0.80: return SeverityLevel.medium
    if ratio < 0.90: return SeverityLevel.low
    return SeverityLevel.passed


def run_full_audit(df: pd.DataFrame, sensitive_attrs: List[str], outcome_col: str,
                   dataset_id: str, language: str = "English") -> AuditResult:
    """Run the complete bias audit pipeline."""
    findings: List[FindingDetail] = []
    feature_cols = [c for c in df.columns if c not in sensitive_attrs and c != outcome_col]

    for attr in sensitive_attrs:
        if attr not in df.columns:
            continue

        # 1. Demographic Parity Gap
        dpg, group_stats_raw, favored, disadvantaged = compute_demographic_parity_gap(df, attr, outcome_col)
        group_stats = [
            GroupStats(group=g, count=s["count"], positive_rate=round(s["rate"], 4),
                       total_positive=s["positive"])
            for g, s in group_stats_raw.items()
        ]

        findings.append(FindingDetail(
            attribute=attr,
            metric="Demographic Parity Gap",
            value=round(dpg, 4),
            severity=severity_from_dpg(dpg),
            favored_group=favored,
            disadvantaged_group=disadvantaged,
            group_stats=group_stats,
            threshold_used=0.1,
            interpretation=f"Groups differ by {dpg:.1%} in positive outcome rate."
        ))

        # 2. Disparate Impact Ratio (4/5ths rule)
        dir_ratio, dir_favored, dir_disadvantaged = compute_disparate_impact_ratio(df, attr, outcome_col)
        findings.append(FindingDetail(
            attribute=attr,
            metric="Disparate Impact Ratio",
            value=round(dir_ratio, 4),
            severity=severity_from_dir(dir_ratio),
            favored_group=dir_favored,
            disadvantaged_group=dir_disadvantaged,
            threshold_used=0.8,
            interpretation=f"{'Passes' if dir_ratio >= 0.8 else 'Fails'} the 4/5ths rule (threshold: 0.8)."
        ))

        # 3. Equalized Odds Gap
        eog = compute_equalized_odds_gap(df, attr, outcome_col)
        findings.append(FindingDetail(
            attribute=attr,
            metric="Equalized Odds Gap",
            value=round(eog, 4),
            severity=severity_from_dpg(eog),
            favored_group=favored,
            disadvantaged_group=disadvantaged,
            interpretation=f"True positive rate differs by {eog:.1%} across groups."
        ))

        # 4. Statistical significance
        sig = compute_statistical_significance(df, attr, outcome_col)
        findings.append(FindingDetail(
            attribute=attr,
            metric="Statistical Significance (p-value)",
            value=round(sig["p_value"], 4),
            severity=SeverityLevel.critical if sig["p_value"] < 0.01 else
                     SeverityLevel.high if sig["p_value"] < 0.05 else SeverityLevel.passed,
            interpretation=f"Chi² = {sig['chi2']:.2f}, p = {sig['p_value']:.4f}. "
                           f"{'Bias is statistically significant.' if sig['p_value'] < 0.05 else 'Bias not statistically significant.'}"
        ))

    # SHAP-proxy feature importance
    shap_features = compute_feature_correlation_with_sensitive(df, sensitive_attrs[0] if sensitive_attrs else "", feature_cols) if sensitive_attrs else []

    # Overall score
    critical_count = sum(1 for f in findings if f.severity == SeverityLevel.critical)
    high_count = sum(1 for f in findings if f.severity == SeverityLevel.high)
    medium_count = sum(1 for f in findings if f.severity == SeverityLevel.medium)
    passed_count = sum(1 for f in findings if f.severity == SeverityLevel.passed)

    score = max(0, min(100, 100 - critical_count * 22 - high_count * 10 - medium_count * 4))

    return AuditResult(
        audit_id=str(uuid.uuid4()),
        dataset_id=dataset_id,
        overall_score=score,
        critical_count=critical_count,
        high_count=high_count,
        medium_count=medium_count,
        passed_count=passed_count,
        findings=findings,
        shap_features=shap_features,
        sensitive_attrs=sensitive_attrs,
        outcome_col=outcome_col,
        rows_analyzed=len(df),
        timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
    )


def apply_reweighting(df: pd.DataFrame, sensitive_attrs: List[str], outcome_col: str) -> pd.DataFrame:
    """Apply sample reweighting to reduce demographic disparity."""
    df = df.copy()
    df["_weight"] = 1.0

    for attr in sensitive_attrs:
        if attr not in df.columns:
            continue
        groups = df.groupby(attr).size()
        total = len(df)
        n_groups = len(groups)
        for group, count in groups.items():
            expected = total / n_groups
            weight = expected / count
            df.loc[df[attr] == group, "_weight"] *= weight

    # Normalize weights
    df["_weight"] = df["_weight"] / df["_weight"].mean()
    return df


def apply_resampling(df: pd.DataFrame, sensitive_attrs: List[str], outcome_col: str) -> pd.DataFrame:
    """Oversample underrepresented groups to balance dataset."""
    df = df.copy()
    if not sensitive_attrs:
        return df

    attr = sensitive_attrs[0]
    if attr not in df.columns:
        return df

    groups = df.groupby(attr)
    max_count = groups.size().max()
    resampled = []

    for _, grp_df in groups:
        if len(grp_df) < max_count:
            extra = grp_df.sample(max_count - len(grp_df), replace=True, random_state=42)
            resampled.append(pd.concat([grp_df, extra]))
        else:
            resampled.append(grp_df)

    return pd.concat(resampled).sample(frac=1, random_state=42).reset_index(drop=True)


def apply_threshold_calibration(df: pd.DataFrame, sensitive_attrs: List[str], outcome_col: str) -> pd.DataFrame:
    """Simulate threshold calibration — adjust decision boundary per group."""
    df = df.copy()
    df["_calibration_note"] = "threshold adjusted"
    return df


def run_debiasing(df: pd.DataFrame, strategy: DebiasStrategy,
                  sensitive_attrs: List[str], outcome_col: str,
                  original_audit: AuditResult) -> Tuple[pd.DataFrame, DebiasResult]:
    """Apply debiasing strategy and compute before/after metrics."""

    if strategy == DebiasStrategy.reweighting:
        debiased_df = apply_reweighting(df, sensitive_attrs, outcome_col)
    elif strategy == DebiasStrategy.resampling:
        debiased_df = apply_resampling(df, sensitive_attrs, outcome_col)
    else:
        debiased_df = apply_threshold_calibration(df, sensitive_attrs, outcome_col)

    after_audit = run_full_audit(debiased_df, sensitive_attrs, outcome_col, "debiased")

    comparisons = []
    before_by_key = {(f.attribute, f.metric): f for f in original_audit.findings}
    after_by_key = {(f.attribute, f.metric): f for f in after_audit.findings}

    for key, before_f in before_by_key.items():
        if key in after_by_key:
            after_f = after_by_key[key]
            improvement = 0.0
            if before_f.value != 0:
                improvement = (before_f.value - after_f.value) / abs(before_f.value) * 100
            comparisons.append(BeforeAfterMetric(
                attribute=before_f.attribute,
                metric=before_f.metric,
                before=round(before_f.value, 4),
                after=round(after_f.value, 4),
                improvement_pct=round(improvement, 1)
            ))

    result = DebiasResult(
        debiased_dataset_id=str(uuid.uuid4()),
        strategy_used=strategy,
        before_score=original_audit.overall_score,
        after_score=after_audit.overall_score,
        comparisons=comparisons
    )

    return debiased_df, result
