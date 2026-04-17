const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent'

export async function callGemini(prompt, apiKey) {
  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 2048 }
    })
  })
  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`)
  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

export async function detectSensitiveColumns(columns, apiKey, languageName = 'English') {
  const prompt = `You are a data fairness expert. Given these column names from a dataset: ${JSON.stringify(columns)}

Identify which columns likely represent:
1. "sensitive" - protected attributes (gender, age, race, ethnicity, religion, disability, caste, nationality, marital status, etc.)
2. "outcome" - decision outcomes (hired, approved, salary, score, accepted, etc.)
3. "feature" - neutral predictor features

Respond ONLY with valid JSON in this exact format:
{
  "sensitive": ["col1", "col2"],
  "outcome": ["col3"],
  "feature": ["col4", "col5"],
  "reasoning": "brief explanation in ${languageName}"
}
Do not include any text outside the JSON.`

  const text = await callGemini(prompt, apiKey)
  try {
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return { sensitive: [], outcome: [], feature: columns, reasoning: '' }
  }
}

export async function generateBiasReport(auditResults, languageName, apiKey) {
  const { datasetName, rows, columns, findings, overallScore, sensitiveAttrs, outcomeCol } = auditResults

  const prompt = `You are an expert in AI fairness and algorithmic bias. Generate a comprehensive bias audit report in ${languageName}.

Dataset: "${datasetName}" (${rows} rows, ${columns} columns)
Outcome variable: ${outcomeCol}
Sensitive attributes analyzed: ${sensitiveAttrs.join(', ')}
Overall fairness score: ${overallScore}/100

Findings:
${findings.map(f => `- ${f.attribute}: ${f.metric} = ${f.value.toFixed(3)} (${f.severity})`).join('\n')}

Write a clear, non-technical audit report IN ${languageName.toUpperCase()} with these sections:
1. Executive Summary (2-3 sentences, what was found and how serious)
2. Key Findings (for each sensitive attribute, explain what the numbers mean in plain language - no jargon)
3. Real-World Impact (what could happen to real people if this system is deployed)
4. Recommended Fixes (specific, actionable steps)
5. Priority Action (the single most important thing to do first)

Write as if explaining to a manager with no technical background. Use the local context appropriate for ${languageName} speakers. Be direct and honest about severity.`

  return callGemini(prompt, apiKey)
}

export async function explainMetric(metricName, value, attribute, languageName, apiKey) {
  const prompt = `Explain in 2-3 sentences in ${languageName}, for a non-technical audience:
The "${metricName}" for attribute "${attribute}" is ${value.toFixed(3)}.
What does this number mean in practice? Is it good or bad? Use a simple real-world analogy.`
  return callGemini(prompt, apiKey)
}
