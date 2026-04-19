import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { runAudit, explainMetric } from '../utils/api.js'
import { LANGUAGES } from '../i18n/index.js'

const SEV_STYLES = {
  critical: { bg: '#fdecea', text: '#c0392b', border: '#c0392b' },
  high: { bg: '#fef3e2', text: '#b45309', border: '#b45309' },
  medium: { bg: '#fef9e7', text: '#7d6608', border: '#c9a227' },
  low: { bg: '#e6f5ed', text: '#1a7a4a', border: '#1a7a4a' },
  pass: { bg: '#e6f5ed', text: '#1a7a4a', border: '#1a7a4a' }
}

const BAR_COLORS = { critical: '#c0392b', high: '#e67e22', medium: '#f1c40f', low: '#27ae60', pass: '#27ae60' }

function ScoreRing({ score }) {
  const r = 52, cx = 64, cy = 64
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 80 ? '#1a7a4a' : score >= 60 ? '#b45309' : '#c0392b'
  return (
    <svg width="128" height="128" viewBox="0 0 128 128">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--paper3)" strokeWidth="10"/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90, 64, 64)" style={{ transition: 'stroke-dashoffset 1s ease' }}/>
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="28" fontWeight="600" fill={color} fontFamily="var(--font-body)">{score}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="var(--ink3)" fontFamily="var(--font-body)">/100</text>
    </svg>
  )
}

export default function AuditPage({ auditData, onNext, apiKey, reportLang }) {
  const { t } = useTranslation()
  const [auditResult, setAuditResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [explanations, setExplanations] = useState({})
  const [loadingExp, setLoadingExp] = useState({})

  const langName = LANGUAGES.find(l => l.code === reportLang)?.geminiName || 'English'

  useEffect(() => {
    async function fetchAudit() {
      try {
        setLoading(true)
        const result = await runAudit(auditData.datasetId, auditData.sensitiveAttrs, auditData.outcomeCol, langName)
        setAuditResult(result)
      } catch (e) {
        setError(e.message || 'Failed to run audit')
      }
      setLoading(false)
    }
    fetchAudit()
  }, [auditData, langName])

  async function explainFinding(finding) {
    const key = `${finding.attribute}-${finding.metric}`
    if (explanations[key] || loadingExp[key]) return
    setLoadingExp(prev => ({ ...prev, [key]: true }))
    try {
      const text = await explainMetric(finding.metric, finding.value, finding.attribute, langName)
      setExplanations(prev => ({ ...prev, [key]: text }))
    } catch { setExplanations(prev => ({ ...prev, [key]: 'Could not load explanation.' })) }
    setLoadingExp(prev => ({ ...prev, [key]: false }))
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <p>{t('common.loading') || 'Loading...'}</p>
      </div>
    )
  }

  if (error || !auditResult) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--red)' }}>{error || 'Failed to load audit'}</p>
      </div>
    )
  }

  const findings = auditResult.findings || []
  const overallScore = auditResult.overall_score || 0
  const criticalCount = auditResult.critical_count || 0
  const highCount = auditResult.high_count || 0
  const passCount = auditResult.passed_count || 0

  const dpgFindings = findings.filter(f => f.metric === 'Demographic Parity Gap')
  const dirFindings = findings.filter(f => f.metric === 'Disparate Impact Ratio')

  const dpgChartData = dpgFindings.map(f => ({
    name: f.attribute,
    value: parseFloat(f.value.toFixed(3)),
    severity: f.severity,
    favored: f.favored_group,
    disadvantaged: f.disadvantaged_group
  }))

  const groupChartData = dpgFindings.flatMap(f => {
    return (f.group_stats || []).map(stat => ({
      name: `${f.attribute}: ${stat.group}`,
      rate: parseFloat((stat.positive_rate * 100).toFixed(1)),
      attr: f.attribute
    }))
  })

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, color: 'var(--ink)', marginBottom: 4 }}>{t('audit.title')}</h1>
          <p style={{ color: 'var(--ink3)', fontSize: 14 }}>{auditData.datasetName} · {auditData.rows} rows · {auditData.columns} columns</p>
        </div>
        <button onClick={() => onNext(auditResult)} style={{ padding: '10px 22px', background: 'var(--ink)', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          {t('report.title')} →
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 32 }}>
        <div style={{ background: 'var(--paper2)', borderRadius: 12, padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <ScoreRing score={overallScore} />
          <p style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 6, textAlign: 'center' }}>{t('audit.overall')}</p>
        </div>
        {[
          { label: t('audit.critical'), value: criticalCount, style: SEV_STYLES.critical },
          { label: t('audit.warnings'), value: highCount, style: SEV_STYLES.high },
          { label: t('audit.passed'), value: passCount, style: SEV_STYLES.pass }
        ].map(({ label, value, style }) => (
          <div key={label} style={{ background: style.bg, border: `0.5px solid ${style.border}`, borderRadius: 12, padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontSize: 36, fontWeight: 500, color: style.text, margin: 0 }}>{value}</p>
            <p style={{ fontSize: 12, color: style.text, margin: 0, opacity: 0.8 }}>{label}</p>
          </div>
        ))}
      </div>

      {dpgChartData.length > 0 && (
        <div style={{ background: 'var(--paper)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '1.5rem', marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 16, color: 'var(--ink)' }}>{t('audit.demographic')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dpgChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--ink3)', fontFamily: 'var(--font-body)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--ink3)', fontFamily: 'var(--font-body)' }} />
              <Tooltip contentStyle={{ fontFamily: 'var(--font-body)', fontSize: 13, border: '0.5px solid var(--border)', borderRadius: 8 }} formatter={(v) => [v.toFixed(3), 'Gap']}/>
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {dpgChartData.map((entry, i) => <Cell key={i} fill={BAR_COLORS[entry.severity] || '#999'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            {Object.entries(BAR_COLORS).map(([sev, color]) => (
              <span key={sev} style={{ fontSize: 11, color: 'var(--ink3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }}></span>{sev}
              </span>
            ))}
          </div>
        </div>
      )}

      {groupChartData.length > 0 && (
        <div style={{ background: 'var(--paper)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '1.5rem', marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 16, color: 'var(--ink)' }}>Positive outcome rate by group</h3>
          <ResponsiveContainer width="100%" height={Math.max(180, groupChartData.length * 36 + 40)}>
            <BarChart data={groupChartData} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false}/>
              <XAxis type="number" unit="%" tick={{ fontSize: 11, fill: 'var(--ink3)' }} domain={[0, 100]}/>
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--ink3)', fontFamily: 'var(--font-mono)' }} width={95}/>
              <Tooltip formatter={(v) => [`${v}%`, 'Rate']} contentStyle={{ fontFamily: 'var(--font-body)', fontSize: 13, border: '0.5px solid var(--border)', borderRadius: 8 }}/>
              <Bar dataKey="rate" fill="#1a3faa" radius={[0, 4, 4, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div>
        <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 12, color: 'var(--ink)' }}>All findings</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {findings.filter(f => f.metric !== 'Feature influence score').map((finding, i) => {
            const style = SEV_STYLES[finding.severity] || SEV_STYLES.low
            const key = `${finding.attribute}-${finding.metric}`
            return (
              <div key={i} style={{ border: `0.5px solid ${style.border}`, borderRadius: 10, padding: '12px 16px', background: style.bg }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 5, background: style.text, color: 'white' }}>{t(`audit.severity.${finding.severity}`)}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{finding.attribute}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink3)' }}>{finding.metric}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500, color: style.text }}>{finding.value.toFixed(3)}</span>
                  {apiKey && !explanations[key] && (
                    <button onClick={() => explainFinding(finding)} style={{ fontSize: 11, padding: '3px 10px', border: '0.5px solid var(--border2)', borderRadius: 6, background: 'white', cursor: 'pointer', fontFamily: 'var(--font-body)', color: 'var(--accent)' }}>
                      {loadingExp[key] ? '...' : `${t('audit.explanation')} ✨`}
                    </button>
                  )}
                </div>
                {finding.disadvantaged && (
                  <p style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 6 }}>
                    Favored: <strong style={{ color: 'var(--green)' }}>{finding.favored}</strong> · Disadvantaged: <strong style={{ color: 'var(--red)' }}>{finding.disadvantaged}</strong>
                  </p>
                )}
                {explanations[key] && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: 'white', borderRadius: 8, border: '0.5px solid var(--border)', fontSize: 13, color: 'var(--ink2)', lineHeight: 1.6 }}>
                    {explanations[key]}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
