import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { generateBiasReport } from '../utils/gemini.js'
import { analyzeBias } from '../utils/biasEngine.js'
import { LANGUAGES } from '../i18n/index.js'

export default function ReportPage({ auditData, apiKey, reportLang }) {
  const { t } = useTranslation()
  const [report, setReport] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generated, setGenerated] = useState(false)

  const langObj = LANGUAGES.find(l => l.code === reportLang) || LANGUAGES[0]
  const results = analyzeBias(auditData.data, auditData.sensitiveAttrs, auditData.outcomeCol)

  async function generate() {
    if (!apiKey) { setError('No API key set. Please add your Gemini API key in Settings.'); return }
    setLoading(true); setError(''); setReport('')
    try {
      const text = await generateBiasReport({
        datasetName: auditData.datasetName,
        rows: auditData.rows,
        columns: auditData.columns,
        findings: results.findings.filter(f => f.metric !== 'Feature influence score'),
        overallScore: results.overallScore,
        sensitiveAttrs: auditData.sensitiveAttrs,
        outcomeCol: auditData.outcomeCol
      }, langObj.geminiName, apiKey)
      setReport(text)
      setGenerated(true)
    } catch (e) {
      setError(e.message || 'Failed to generate report')
    }
    setLoading(false)
  }

  function downloadReport() {
    const content = `FAIRLENS BIAS AUDIT REPORT
Generated: ${new Date().toLocaleDateString()}
Dataset: ${auditData.datasetName}
Language: ${langObj.name}
Overall Fairness Score: ${results.overallScore}/100

${report}`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `fairlens-report-${auditData.datasetName}.txt`
    a.click(); URL.revokeObjectURL(url)
  }

  const isRTL = langObj.dir === 'rtl'

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, color: 'var(--ink)', marginBottom: 4 }}>{t('report.title')}</h1>
          <p style={{ color: 'var(--ink3)', fontSize: 14 }}>{auditData.datasetName} · Score: {results.overallScore}/100</p>
        </div>
        {generated && (
          <button onClick={downloadReport} style={{ padding: '10px 20px', background: 'var(--ink)', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            ↓ {t('report.download')}
          </button>
        )}
      </div>

      <div style={{ background: 'var(--paper2)', borderRadius: 12, padding: '1.25rem', marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 2 }}>{t('language.reportIn')}</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {LANGUAGES.map(lang => (
              <button key={lang.code} disabled={reportLang !== lang.code}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: reportLang === lang.code ? '1.5px solid var(--accent)' : '0.5px solid var(--border)', borderRadius: 8, background: reportLang === lang.code ? 'var(--accent-light)' : 'transparent', cursor: 'default', fontSize: 13, color: reportLang === lang.code ? 'var(--accent)' : 'var(--ink3)', fontFamily: 'var(--font-body)' }}>
                <span style={{ fontSize: 14 }}>{lang.flag}</span> {lang.nativeName}
                {reportLang === lang.code && <span style={{ fontSize: 10, fontWeight: 600 }}>✓</span>}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 8 }}>Change report language using the selector in the top navigation.</p>
        </div>
      </div>

      {!generated && !loading && (
        <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px dashed var(--border2)', borderRadius: 16, background: 'var(--paper2)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>
            <svg viewBox="0 0 48 48" width="48" height="48" fill="none" style={{ margin: '0 auto', display: 'block' }}>
              <circle cx="24" cy="24" r="20" fill="#e8edfb" stroke="#1a3faa" strokeWidth="1.5"/>
              <path d="M16 24h16M24 16v16" stroke="#1a3faa" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>Generate your {langObj.name} report</p>
          <p style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 20, maxWidth: 360, margin: '0 auto 20px' }}>
            Gemini will analyze your audit results and write a plain-language report in <strong>{langObj.nativeName}</strong> — no technical jargon, just clear findings and actions.
          </p>
          <button onClick={generate} style={{ padding: '12px 32px', background: 'var(--ink)', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            ✨ Generate in {langObj.nativeName}
          </button>
          {error && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 12 }}>{error}</p>}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--paper3)', borderTopColor: 'var(--accent)', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }}></div>
          <p style={{ color: 'var(--ink3)', fontSize: 14 }}>{t('report.generating', { language: langObj.nativeName })}</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {report && (
        <div style={{ background: 'var(--paper)', border: '0.5px solid var(--border)', borderRadius: 16, padding: '2rem', direction: isRTL ? 'rtl' : 'ltr' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: '0.5px solid var(--border)' }}>
            <span style={{ fontSize: 18 }}>{langObj.flag}</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', margin: 0 }}>{t('report.generatedBy')}</p>
              <p style={{ fontSize: 11, color: 'var(--ink3)', margin: 0 }}>{t('report.date')}: {new Date().toLocaleDateString()} · {langObj.name}</p>
            </div>
            <div style={{ marginLeft: isRTL ? 0 : 'auto', marginRight: isRTL ? 'auto' : 0, background: 'var(--green-light)', color: 'var(--green)', fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 6 }}>
              Powered by Gemini 1.5 Pro
            </div>
          </div>
          <div style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-body)' }}>
            {report}
          </div>
        </div>
      )}
    </div>
  )
}
