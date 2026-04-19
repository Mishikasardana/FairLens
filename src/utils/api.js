const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export async function uploadDataset(file) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(`${API_URL}/dataset/upload`, {
    method: 'POST',
    body: formData
  })
  if (!response.ok) throw new Error(`Upload failed: ${response.status}`)
  return response.json()
}

export async function getDatasetInfo(datasetId) {
  const response = await fetch(`${API_URL}/dataset/${datasetId}`)
  if (!response.ok) throw new Error(`Failed to get dataset: ${response.status}`)
  return response.json()
}

export async function detectColumns(datasetId, language = 'English') {
  // First get the dataset metadata to extract column names
  const metaResponse = await fetch(`${API_URL}/dataset/${datasetId}`)
  if (!metaResponse.ok) throw new Error(`Failed to get dataset: ${metaResponse.status}`)
  const metadata = await metaResponse.json()
  
  // Now call detect-columns with the column names
  const response = await fetch(`${API_URL}/dataset/detect-columns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      column_names: metadata.column_names,
      language_name: language
    })
  })
  if (!response.ok) throw new Error(`Detection failed: ${response.status}`)
  return response.json()
}

export async function runAudit(datasetId, sensitiveAttrs, outcomeCol, language = 'English') {
  const response = await fetch(`${API_URL}/audit/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dataset_id: datasetId,
      sensitive_attrs: sensitiveAttrs,
      outcome_col: outcomeCol,
      language: language
    })
  })
  if (!response.ok) throw new Error(`Audit failed: ${response.status}`)
  return response.json()
}

export async function generateReport(auditId, languageCode = 'en', languageName = 'English', includeTechnical = false) {
  const response = await fetch(`${API_URL}/report/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audit_id: auditId,
      language_code: languageCode,
      language_name: languageName,
      include_technical: includeTechnical
    })
  })
  if (!response.ok) throw new Error(`Report generation failed: ${response.status}`)
  return response.json()
}

export async function explainMetric(metricName, value, attribute, languageName = 'English', context = null) {
  const response = await fetch(`${API_URL}/report/explain-metric`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      metric_name: metricName,
      value,
      attribute,
      language_name: languageName,
      context
    })
  })
  if (!response.ok) throw new Error(`Explanation failed: ${response.status}`)
  const data = await response.json()
  return data.explanation || ''
}

export async function suggestFixes(auditId, languageName = 'English') {
  const response = await fetch(`${API_URL}/report/suggest-fixes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audit_id: auditId,
      language_name: languageName
    })
  })
  if (!response.ok) throw new Error(`Suggestions failed: ${response.status}`)
  const data = await response.json()
  return data.suggestions || ''
}

export async function checkHealth() {
  try {
    const response = await fetch(`${API_URL}/health`)
    return response.ok ? response.json() : null
  } catch {
    return null
  }
}
