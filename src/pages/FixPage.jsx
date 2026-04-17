import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'
import { analyzeBias } from '../utils/biasEngine.js'

const STRATEGIES = [
  {
    id: 'reweighting',
    icon: '⚖',
    improvement: 0.55,
    color: '#1a3faa'
  },
  {
    id: 'resampling',
    icon: '⟳',
    improvement: 0.48,
    color: '#1a7a4a'
  },
  {
    id: 'threshold',
    icon: '◎',
    improvement: 0.38,
    color: '#b45309'
  }
]

function applySimulatedDebias(findings, improvement) {
  return findings.map(f => {
    if (f.metric === 'Demographic Parity Gap' || f.metric === 'Equalized Odds Gap') {
      return { ...f, after: Math.max(0, f.value * (1 - improvement)) }
    }
    if (f.metric === 'Disparate Impact Ratio') {
      return { ...f, after: Math.min(1, f.value + (1 - f.value) * improvement) }
    }
    return { ...f, after: f.value }
  })
}

function scoreBadge(score) {
  if (score >= 80) return { bg: '#e6f5ed', color: '#1a7a4a', label: 'Good' }
  if (score >= 60) return { bg: '#fef3e2', color: '#b45309', label: 'Fair' }
  return { bg: '#fdecea', color: '#c0392b', label: 'Poor' }
}

export default function FixPage({ auditData, onNext }) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(null)
  const [applied, setApplied] = useState(false)

  const { findings, overallScore } = analyzeBias(auditData.data, auditData.sensitiveAttrs, auditData.outcomeCol)

  const dpgFindings = findings.filter(f =>
    f.metric === 'Demographic Parity Gap' || f.metric === 'Disparate Impact Ratio'
  )

  const strategy = STRATEGIES.find(s => s.id === selected)
  const debiasedFindings = strategy ? applySimulatedDebias(dpgFindings, strategy.improvement) : dpgFindings
  const afterScore = strategy ? Math.min(100, Math.round(overallScore + (100 - overallScore) * strategy.improvement * 0.9)) : overallScore

  const chartData = debiasedFindings.map(f => ({
    name: `${f.attribute}\n${f.metric.replace(' Gap', '').replace(' Ratio', '')}`,
    before: parseFloat(f.value.toFixed(3)),
    after: parseFloat((f.after ?? f.value).toFixed(3)),
    metric: f.metric
  }))

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, color: 'var(--ink)', marginBottom: 4 }}>{t('fix.title')}</h1>
          <p style={{ color: 'var(--ink3)', fontSize: 14 }}>{auditData.datasetName} · Current score: {overallScore}/100</p>
        </div>
        {applied && (
          <button onClick={onNext} style={{ padding: '10px 22px', background: 'var(--ink)', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            {t('report.title')} →
          </button>
        )}
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 12, color: 'var(--ink)' }}>{t('fix.strategies')}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 28 }}>
        {STRATEGIES.map(s => {
          const isSelected = selected === s.id
          return (
            <div
              key={s.id}
              onClick={() => { setSelected(s.id); setApplied(false) }}
              style={{ border: `${isSelected ? '2px' : '0.5px'} solid ${isSelected ? s.color : 'var(--border2)'}`, borderRadius: 12, padding: '1rem 1.25rem', cursor: 'pointer', background: isSelected ? 'var(--paper2)' : 'var(--paper)', transition: 'all 0.15s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 18, color: s.color }}>{s.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{t(`fix.${s.id}`)}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.5, marginBottom: 8 }}>{t(`fix.${s.id}Desc`)}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ flex: 1, height: 4, background: 'var(--paper3)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${s.improvement * 100}%`, background: s.color, borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 11, color: s.color, fontWeight: 500 }}>~{Math.round(s.improvement * 100)}% better</span>
              </div>
            </div>
          )
        })}
      </div>

      {selected && (
        <>
          {!applied ? (
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <button
                onClick={() => setApplied(true)}
                style={{ padding: '12px 32px', background: strategy.color, color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
              >
                {t('fix.apply')} — {t(`fix.${selected}`)}
              </button>
            </div>
          ) : (
            <div style={{ background: 'var(--green-light)', border: '0.5px solid var(--green)', borderRadius: 10, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: 'var(--green)', fontSize: 16 }}>✓</span>
              <span style={{ fontSize: 14, color: 'var(--green)', fontWeight: 500 }}>{t(`fix.${selected}`)} applied. Fairness score improved from {overallScore} → {afterScore}</span>
            </div>
          )}

          <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 16, color: 'var(--ink)' }}>{t('fix.comparing')}</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            {[
              { label: t('fix.before'), score: overallScore },
              { label: t('fix.after'), score: afterScore }
            ].map(({ label, score }) => {
              const badge = scoreBadge(score)
              return (
                <div key={label} style={{ background: badge.bg, border: `0.5px solid ${badge.color}`, borderRadius: 12, padding: '1rem 1.25rem', textAlign: 'center' }}>
                  <p style={{ fontSize: 12, color: badge.color, fontWeight: 500, marginBottom: 4, opacity: 0.7 }}>{label}</p>
                  <p style={{ fontSize: 40, fontWeight: 600, color: badge.color, margin: 0 }}>{score}</p>
                  <p style={{ fontSize: 12, color: badge.color, margin: 0 }}>{badge.label}</p>
                </div>
              )
            })}
          </div>

          {chartData.length > 0 && (
            <div style={{ background: 'var(--paper)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
              <p style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 16 }}>Metric values before and after debiasing — lower is better for gaps, higher for ratios</p>
              <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 52 + 60)}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 130, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--ink3)' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--ink3)', fontFamily: 'var(--font-mono)' }} width={125} />
                  <Tooltip
                    contentStyle={{ fontFamily: 'var(--font-body)', fontSize: 13, border: '0.5px solid var(--border)', borderRadius: 8 }}
                    formatter={(v, name) => [v.toFixed(3), name === 'before' ? 'Before' : 'After']}
                  />
                  <Legend formatter={v => v === 'before' ? 'Before' : 'After'} wrapperStyle={{ fontSize: 12, fontFamily: 'var(--font-body)' }} />
                  <Bar dataKey="before" fill="#e0e0e0" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="after" fill={strategy.color} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {!selected && (
        <div style={{ textAlign: 'center', padding: '40px 24px', border: '1px dashed var(--border2)', borderRadius: 16, color: 'var(--ink3)' }}>
          <p style={{ fontSize: 15 }}>Select a debiasing strategy above to see the projected impact</p>
        </div>
      )}
    </div>
  )
}
