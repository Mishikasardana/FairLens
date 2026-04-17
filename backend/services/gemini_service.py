import google.generativeai as genai
import os
import json
import re
from typing import List, Optional, Dict, Any

from models.schemas import AuditResult, DetectColumnsResult, ReportResult, ReportSection
import uuid
import datetime

genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))

model = genai.GenerativeModel("gemini-1.5-pro")


LANGUAGE_RTL = {"ar", "he", "fa", "ur"}


async def detect_columns_with_gemini(
    column_names: List[str],
    language_name: str = "English",
    sample_values: Optional[Dict[str, List[Any]]] = None
) -> DetectColumnsResult:
    """Use Gemini to intelligently detect sensitive, outcome, and feature columns."""

    sample_str = ""
    if sample_values:
        sample_str = "\nSample values per column:\n"
        for col, vals in list(sample_values.items())[:10]:
            sample_str += f"  {col}: {vals[:3]}\n"

    prompt = f"""You are a data fairness expert analyzing a dataset for bias auditing.

Column names: {json.dumps(column_names)}
{sample_str}

Classify each column as:
- "sensitive": protected attributes that could cause discrimination (gender, age, race, ethnicity, caste, religion, nationality, disability, marital status, pregnancy, and their equivalents in any language)
- "outcome": the decision or result being made (hired, approved, loan_granted, diagnosis, score, salary, admitted, etc.)
- "feature": neutral predictor features
- "ignore": ID columns, timestamps, free text with no predictive use

IMPORTANT: Look for these attributes in ANY language. For example:
- Hindi: जाति (caste), लिंग (gender), आयु (age)
- Arabic: جنس (gender), عمر (age), دين (religion)
- German: Geschlecht (gender), Alter (age)
- Spanish: género (gender), edad (age), raza (race)

Respond ONLY with valid JSON (no markdown, no code blocks):
{{
  "sensitive": ["col1"],
  "outcome": ["col2"],
  "feature": ["col3", "col4"],
  "ignore": [],
  "reasoning": "brief reasoning in {language_name}",
  "confidence": 0.0
}}"""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        text = re.sub(r'```json|```', '', text).strip()
        data = json.loads(text)
        return DetectColumnsResult(
            sensitive=data.get("sensitive", []),
            outcome=data.get("outcome", []),
            feature=data.get("feature", column_names),
            reasoning=data.get("reasoning", ""),
            confidence=float(data.get("confidence", 0.8))
        )
    except Exception as e:
        # Fallback to returning all as feature
        return DetectColumnsResult(
            sensitive=[], outcome=[], feature=column_names,
            reasoning=f"Auto-detection failed: {str(e)}", confidence=0.0
        )


async def generate_multilingual_report(
    audit: AuditResult,
    language_code: str,
    language_name: str,
    include_technical: bool = False
) -> ReportResult:
    """Generate a full bias audit report in the requested language using Gemini."""

    findings_summary = []
    for f in audit.findings:
        if f.metric in ("Demographic Parity Gap", "Disparate Impact Ratio"):
            findings_summary.append(
                f"- {f.attribute} | {f.metric}: {f.value:.3f} | Severity: {f.severity.value} "
                f"| Favored: {f.favored_group or 'N/A'} | Disadvantaged: {f.disadvantaged_group or 'N/A'}"
            )

    findings_text = "\n".join(findings_summary) if findings_summary else "No significant findings."

    tech_instruction = (
        "Include technical details like p-values, chi-squared statistics, and metric formulas." if include_technical
        else "Avoid technical jargon. Use analogies and plain language a non-expert can understand."
    )

    prompt = f"""You are FairLens, an AI fairness auditor. Write a complete bias audit report in {language_name}.

DATASET: "{audit.dataset_id}"
ROWS ANALYZED: {audit.rows_analyzed:,}
OUTCOME VARIABLE: {audit.outcome_col}
SENSITIVE ATTRIBUTES TESTED: {', '.join(audit.sensitive_attrs)}
OVERALL FAIRNESS SCORE: {audit.overall_score}/100
CRITICAL ISSUES: {audit.critical_count}
HIGH SEVERITY: {audit.high_count}

FINDINGS:
{findings_text}

INSTRUCTIONS:
- Write ENTIRELY in {language_name.upper()}
- {tech_instruction}
- Structure the report with these 5 sections using these exact headings:

## 1. EXECUTIVE SUMMARY
2-3 sentences. What was found and how urgent is it?

## 2. KEY FINDINGS
For each sensitive attribute, explain in plain language:
- What the numbers mean for real people
- Which group is being disadvantaged and how
- A concrete real-world example of the harm

## 3. REAL-WORLD IMPACT
If this system is deployed as-is, what could happen?
Use specific scenarios relevant to {language_name} speakers / their context.

## 4. RECOMMENDED ACTIONS
3-5 specific, actionable steps the organization should take.
Order by priority. Be concrete.

## 5. PRIORITY ACTION
The single most important thing to do immediately.

Be honest, direct, and compassionate. This report will be read by decision-makers who can change things."""

    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.4,
                max_output_tokens=2500,
            )
        )
        full_text = response.text.strip()

        # Parse sections
        sections = []
        section_pattern = re.compile(r'##\s*\d+\.\s*(.+?)\n(.*?)(?=##\s*\d+\.|\Z)', re.DOTALL)
        matches = section_pattern.findall(full_text)
        for title, content in matches:
            sections.append(ReportSection(title=title.strip(), content=content.strip()))

        if not sections:
            sections = [ReportSection(title="Report", content=full_text)]

        return ReportResult(
            report_id=str(uuid.uuid4()),
            audit_id=audit.audit_id,
            language_code=language_code,
            language_name=language_name,
            sections=sections,
            full_text=full_text,
            generated_at=datetime.datetime.utcnow().isoformat(),
            overall_score=audit.overall_score,
            is_rtl=language_code in LANGUAGE_RTL
        )

    except Exception as e:
        raise RuntimeError(f"Gemini report generation failed: {str(e)}")


async def explain_metric_in_language(
    metric_name: str,
    value: float,
    attribute: str,
    language_name: str,
    context: Optional[str] = None
) -> str:
    """Ask Gemini to explain a single metric in plain language."""

    prompt = f"""Explain in 2-3 sentences in {language_name}, for a non-technical audience:

The "{metric_name}" for the attribute "{attribute}" is {value:.3f}.
{f'Context: {context}' if context else ''}

What does this number mean in practice? Is it good or bad?
Use a simple, memorable real-world analogy appropriate for {language_name} speakers."""

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"Could not generate explanation: {str(e)}"


async def suggest_fixes_in_language(
    audit: AuditResult,
    language_name: str
) -> str:
    """Generate targeted fix recommendations in the user's language."""

    critical_findings = [f for f in audit.findings if f.severity.value == "critical"]
    if not critical_findings:
        critical_findings = [f for f in audit.findings if f.severity.value == "high"]

    findings_text = "\n".join([
        f"- {f.attribute}: {f.metric} = {f.value:.3f}" for f in critical_findings[:5]
    ])

    prompt = f"""In {language_name}, suggest 3 specific technical fixes for these bias findings:

{findings_text}

For each fix:
1. Name of the technique
2. How to implement it (2-3 steps)
3. Expected improvement

Keep it practical and actionable. Write entirely in {language_name}."""

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"Could not generate suggestions: {str(e)}"
