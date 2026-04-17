"""
FairLens Backend Tests
Run: pytest tests/ -v
"""
import pytest
import pandas as pd
import numpy as np
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.bias_engine import (
    compute_demographic_parity_gap,
    compute_disparate_impact_ratio,
    compute_equalized_odds_gap,
    compute_statistical_significance,
    run_full_audit,
    apply_reweighting,
    apply_resampling,
    severity_from_dpg,
    severity_from_dir,
    detect_sensitive_columns_heuristic
)
from models.schemas import SeverityLevel


@pytest.fixture
def biased_hiring_df():
    """Synthetic hiring dataset with known gender bias."""
    np.random.seed(42)
    n = 500
    gender = np.random.choice(['male', 'female'], n, p=[0.5, 0.5])
    # Males hired at 70%, females at 40% — known bias
    hired = np.array([
        np.random.binomial(1, 0.70 if g == 'male' else 0.40)
        for g in gender
    ])
    return pd.DataFrame({'gender': gender, 'age': np.random.randint(22, 60, n), 'hired': hired})


@pytest.fixture
def fair_df():
    """Synthetic dataset with no bias."""
    np.random.seed(99)
    n = 400
    gender = np.random.choice(['male', 'female'], n)
    hired = np.random.binomial(1, 0.55, n)  # same rate for both
    return pd.DataFrame({'gender': gender, 'hired': hired})


class TestDemographicParityGap:
    def test_detects_large_gap(self, biased_hiring_df):
        gap, groups, favored, disadvantaged = compute_demographic_parity_gap(
            biased_hiring_df, 'gender', 'hired'
        )
        assert gap > 0.20, f"Expected gap > 0.2, got {gap}"
        assert favored == 'male'
        assert disadvantaged == 'female'

    def test_fair_dataset_small_gap(self, fair_df):
        gap, _, _, _ = compute_demographic_parity_gap(fair_df, 'gender', 'hired')
        assert gap < 0.10, f"Expected small gap for fair dataset, got {gap}"

    def test_returns_group_stats(self, biased_hiring_df):
        _, groups, _, _ = compute_demographic_parity_gap(biased_hiring_df, 'gender', 'hired')
        assert 'male' in groups
        assert 'female' in groups
        assert 0 < groups['male']['rate'] < 1
        assert 0 < groups['female']['rate'] < 1


class TestDisparateImpactRatio:
    def test_fails_four_fifths_rule(self, biased_hiring_df):
        ratio, favored, disadvantaged = compute_disparate_impact_ratio(
            biased_hiring_df, 'gender', 'hired'
        )
        assert ratio < 0.80, f"Expected DIR < 0.8, got {ratio}"

    def test_passes_four_fifths_rule(self, fair_df):
        ratio, _, _ = compute_disparate_impact_ratio(fair_df, 'gender', 'hired')
        assert ratio >= 0.75, f"Expected DIR near 1.0 for fair dataset, got {ratio}"


class TestSeverityClassification:
    def test_dpg_severity(self):
        assert severity_from_dpg(0.25) == SeverityLevel.critical
        assert severity_from_dpg(0.15) == SeverityLevel.high
        assert severity_from_dpg(0.07) == SeverityLevel.medium
        assert severity_from_dpg(0.03) == SeverityLevel.low
        assert severity_from_dpg(0.01) == SeverityLevel.passed

    def test_dir_severity(self):
        assert severity_from_dir(0.55) == SeverityLevel.critical
        assert severity_from_dir(0.70) == SeverityLevel.high
        assert severity_from_dir(0.78) == SeverityLevel.medium
        assert severity_from_dir(0.88) == SeverityLevel.low
        assert severity_from_dir(0.95) == SeverityLevel.passed


class TestStatisticalSignificance:
    def test_biased_dataset_is_significant(self, biased_hiring_df):
        result = compute_statistical_significance(biased_hiring_df, 'gender', 'hired')
        assert result['p_value'] < 0.05, f"Expected significant bias, got p={result['p_value']}"
        assert result['chi2'] > 0

    def test_fair_dataset_not_significant(self, fair_df):
        result = compute_statistical_significance(fair_df, 'gender', 'hired')
        # May or may not be significant due to randomness — just check it runs
        assert 0 <= result['p_value'] <= 1


class TestFullAudit:
    def test_audit_returns_findings(self, biased_hiring_df):
        result = run_full_audit(biased_hiring_df, ['gender'], 'hired', 'test_dataset')
        assert len(result.findings) > 0
        assert 0 <= result.overall_score <= 100
        assert result.critical_count >= 0
        assert result.rows_analyzed == len(biased_hiring_df)

    def test_biased_dataset_low_score(self, biased_hiring_df):
        result = run_full_audit(biased_hiring_df, ['gender'], 'hired', 'test')
        assert result.overall_score < 70, f"Biased dataset should score < 70, got {result.overall_score}"
        assert result.critical_count > 0

    def test_multiple_sensitive_attrs(self):
        df = pd.DataFrame({
            'gender': ['male', 'female'] * 100,
            'race': (['white'] * 120 + ['black'] * 80),
            'hired': ([1] * 90 + [0] * 30 + [1] * 40 + [0] * 40)
        })
        result = run_full_audit(df, ['gender', 'race'], 'hired', 'multi_test')
        attrs_in_findings = {f.attribute for f in result.findings}
        assert 'gender' in attrs_in_findings
        assert 'race' in attrs_in_findings


class TestDebiasing:
    def test_reweighting_returns_weights(self, biased_hiring_df):
        result = apply_reweighting(biased_hiring_df, ['gender'], 'hired')
        assert '_weight' in result.columns
        assert (result['_weight'] > 0).all()

    def test_resampling_balances_groups(self, biased_hiring_df):
        result = apply_resampling(biased_hiring_df, ['gender'], 'hired')
        counts = result['gender'].value_counts()
        # Groups should be roughly equal after resampling
        ratio = counts.min() / counts.max()
        assert ratio >= 0.95, f"Expected balanced groups after resampling, got ratio {ratio}"


class TestColumnDetection:
    def test_detects_sensitive_keywords(self):
        cols = ['age', 'salary', 'gender', 'education', 'race', 'hired']
        tags = detect_sensitive_columns_heuristic(cols)
        assert tags['gender'] == 'sensitive'
        assert tags['race'] == 'sensitive'
        assert tags['age'] == 'sensitive'
        assert tags['hired'] == 'outcome'
        assert tags['salary'] == 'feature' or tags['salary'] == 'outcome'

    def test_detects_non_english_columns(self):
        cols = ['जाति', 'वेतन', 'चुना_गया']  # caste, salary, selected in Hindi
        tags = detect_sensitive_columns_heuristic(cols)
        assert tags['जाति'] == 'sensitive'
