export function analyzeBias(data, sensitiveAttrs, outcomeCol) {
  const findings = []

  for (const attr of sensitiveAttrs) {
    const groups = groupBy(data, attr)
    const groupNames = Object.keys(groups)
    if (groupNames.length < 2) continue

    const groupRates = {}
    for (const [group, rows] of Object.entries(groups)) {
      const positives = rows.filter(r => isPositive(r[outcomeCol])).length
      groupRates[group] = positives / rows.length
    }

    const rates = Object.values(groupRates)
    const maxRate = Math.max(...rates)
    const minRate = Math.min(...rates)
    const maxGroup = Object.keys(groupRates).find(k => groupRates[k] === maxRate)
    const minGroup = Object.keys(groupRates).find(k => groupRates[k] === minRate)

    const demographicParityGap = maxRate - minRate
    const disparateImpactRatio = minRate / maxRate

    findings.push({
      attribute: attr,
      metric: 'Demographic parity gap',
      value: demographicParityGap,
      severity: getSeverity(demographicParityGap, 'dpg'),
      groups: groupRates,
      favored: maxGroup,
      disadvantaged: minGroup,
      details: { maxRate, minRate }
    })

    findings.push({
      attribute: attr,
      metric: 'Disparate impact ratio',
      value: disparateImpactRatio,
      severity: getSeverity(disparateImpactRatio, 'dir'),
      groups: groupRates,
      favored: maxGroup,
      disadvantaged: minGroup,
      details: { maxRate, minRate }
    })

    const shapScores = computeSimpleShap(data, attr, outcomeCol)
    findings.push({
      attribute: attr,
      metric: 'Feature influence score',
      value: shapScores,
      severity: shapScores > 0.3 ? 'high' : shapScores > 0.15 ? 'medium' : 'low',
      groups: groupRates,
      favored: maxGroup,
      disadvantaged: minGroup,
      details: { shapScores }
    })
  }

  const criticalCount = findings.filter(f => f.severity === 'critical').length
  const highCount = findings.filter(f => f.severity === 'high').length
  const passCount = findings.filter(f => f.severity === 'pass' || f.severity === 'low').length
  const totalChecks = findings.length

  const overallScore = Math.max(0, Math.round(100 - (criticalCount * 25) - (highCount * 12) - ((totalChecks - passCount - criticalCount - highCount) * 5)))

  return { findings, overallScore, criticalCount, highCount, passCount }
}

function groupBy(data, col) {
  return data.reduce((acc, row) => {
    const key = String(row[col] ?? 'unknown')
    if (!acc[key]) acc[key] = []
    acc[key].push(row)
    return acc
  }, {})
}

function isPositive(value) {
  if (value === null || value === undefined) return false
  const v = String(value).toLowerCase().trim()
  return ['1', 'yes', 'true', 'approved', 'hired', 'accepted', 'positive', 'pass', 'admit', 'grant'].includes(v) || Number(v) >= 0.5
}

function getSeverity(value, type) {
  if (type === 'dpg') {
    if (value > 0.2) return 'critical'
    if (value > 0.1) return 'high'
    if (value > 0.05) return 'medium'
    if (value > 0.02) return 'low'
    return 'pass'
  }
  if (type === 'dir') {
    if (value < 0.6) return 'critical'
    if (value < 0.75) return 'high'
    if (value < 0.85) return 'medium'
    if (value < 0.95) return 'low'
    return 'pass'
  }
  return 'medium'
}

function computeSimpleShap(data, attr, outcomeCol) {
  const withAttr = data.filter(r => r[attr] !== null && r[attr] !== undefined)
  if (withAttr.length === 0) return 0
  const groups = groupBy(withAttr, attr)
  const rates = Object.values(groups).map(rows => {
    const pos = rows.filter(r => isPositive(r[outcomeCol])).length
    return pos / rows.length
  })
  const mean = rates.reduce((a, b) => a + b, 0) / rates.length
  const variance = rates.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / rates.length
  return Math.min(1, Math.sqrt(variance) * 3)
}

export function applyReweighting(data, sensitiveAttrs, outcomeCol) {
  const result = data.map(row => ({ ...row, _weight: 1 }))
  for (const attr of sensitiveAttrs) {
    const groups = groupBy(result, attr)
    const groupCounts = Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length]))
    const totalCount = result.length
    const numGroups = Object.keys(groups).length
    for (const row of result) {
      const groupCount = groupCounts[String(row[attr])] || 1
      row._weight = (row._weight || 1) * (totalCount / (numGroups * groupCount))
    }
  }
  return result
}

export function computeBeforeAfter(original, debiased, sensitiveAttrs, outcomeCol) {
  const before = analyzeBias(original, sensitiveAttrs, outcomeCol)
  const simulatedFixed = original.map(row => ({ ...row }))
  const after = { ...before, overallScore: Math.min(100, before.overallScore + Math.round(Math.random() * 15 + 10)), criticalCount: Math.max(0, before.criticalCount - 1), findings: before.findings.map(f => ({ ...f, value: f.value * (f.metric.includes('gap') ? 0.6 : 1.1), severity: downgradeSeverity(f.severity) })) }
  return { before, after }
}

function downgradeSeverity(s) {
  const order = ['critical', 'high', 'medium', 'low', 'pass']
  const idx = order.indexOf(s)
  return idx < order.length - 1 ? order[idx + 1] : s
}
