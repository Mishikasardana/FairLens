import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Papa from 'papaparse'
import { detectSensitiveColumns } from '../utils/gemini.js'
import { LANGUAGES } from '../i18n/index.js'

const TAG_COLORS = {
  outcome: { bg: '#e8edfb', border: '#1a3faa', text: '#1a3faa', label: 'Outcome' },
  sensitive: { bg: '#fdecea', border: '#c0392b', text: '#c0392b', label: 'Sensitive' },
  feature: { bg: '#e6f5ed', border: '#1a7a4a', text: '#1a7a4a', label: 'Feature' },
  ignore: { bg: 'var(--paper2)', border: 'var(--border)', text: 'var(--ink3)', label: 'Ignore' }
}

export default function UploadPage({ onAuditReady, apiKey, reportLang }) {
  const { t } = useTranslation()
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [tags, setTags] = useState({})
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const langName = LANGUAGES.find(l => l.code === reportLang)?.geminiName || 'English'

  function handleFile(f) {
    if (!f) return
    setFile(f)
    setError('')
    Papa.parse(f, {
      header: true, skipEmptyLines: true, preview: 200,
      complete: async (result) => {
        if (!result.data.length) { setError('File appears empty'); return }
        setParsed(result)
        const cols = result.meta.fields || []
        const autoTags = {}
        cols.forEach(c => { autoTags[c] = 'feature' })
        setTags(autoTags)
        if (apiKey) {
          setDetecting(true)
          try {
            const detected = await detectSensitiveColumns(cols, apiKey, langName)
            const newTags = { ...autoTags }
            detected.sensitive?.forEach(c => { if (newTags[c] !== undefined) newTags[c] = 'sensitive' })
            detected.outcome?.forEach(c => { if (newTags[c] !== undefined) newTags[c] = 'outcome' })
            setTags(newTags)
          } catch {}
          setDetecting(false)
        }
      },
      error: (err) => setError(err.message)
    })
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  function canRun() {
    if (!parsed) return false
    const tagVals = Object.values(tags)
    return tagVals.includes('outcome') && tagVals.includes('sensitive')
  }

  function runAudit() {
    const cols = parsed.meta.fields
    const sensitiveAttrs = cols.filter(c => tags[c] === 'sensitive')
    const outcomeCol = cols.find(c => tags[c] === 'outcome')
    onAuditReady({ data: parsed.data, sensitiveAttrs, outcomeCol, datasetName: file.name.replace(/\.[^.]+$/, ''), rows: parsed.data.length, columns: cols.length })
  }

  const DEMO_CSV = `age,gender,race,education,experience_years,hired
28,male,white,bachelor,3,1
32,female,black,master,5,0
45,male,white,phd,12,1
26,female,hispanic,bachelor,2,0
38,male,asian,master,8,1
29,female,white,bachelor,4,1
52,male,black,bachelor,15,0
33,female,white,master,7,1
41,male,hispanic,phd,9,1
24,female,asian,bachelor,1,0
35,male,white,master,10,1
27,female,black,bachelor,3,0
48,male,white,bachelor,18,1
31,female,hispanic,master,5,1
39,male,asian,phd,11,1
25,female,white,bachelor,2,1
44,male,black,master,14,0
30,female,white,phd,6,1`

  function loadDemo() {
    const blob = new Blob([DEMO_CSV], { type: 'text/csv' })
    const demoFile = new File([blob], 'hiring_demo.csv', { type: 'text/csv' })
    handleFile(demoFile)
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, marginBottom: 8, color: 'var(--ink)' }}>{t('upload.title')}</h1>
      <p style={{ color: 'var(--ink3)', marginBottom: 32, fontSize: 15 }}>{t('upload.tagDesc')}</p>

      {!parsed ? (
        <div>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{ border: `1.5px dashed ${dragOver ? 'var(--accent)' : 'var(--border2)'}`, borderRadius: 16, padding: '60px 40px', textAlign: 'center', cursor: 'pointer', background: dragOver ? 'var(--accent-light)' : 'var(--paper2)', transition: 'all 0.15s' }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>
              <svg viewBox="0 0 48 48" width="48" height="48" fill="none" style={{ margin: '0 auto', display: 'block' }}>
                <rect x="8" y="4" width="32" height="40" rx="4" fill="#e8edfb" stroke="#1a3faa" strokeWidth="1.5"/>
                <path d="M16 20h16M16 27h10" stroke="#1a3faa" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M30 4v10h10" stroke="#1a3faa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>{t('upload.drop')}</p>
            <p style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 16 }}>{t('upload.supported')}</p>
            <input ref={fileRef} type="file" accept=".csv,.json" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            <span style={{ padding: '8px 20px', border: '1px solid var(--accent)', borderRadius: 8, fontSize: 14, color: 'var(--accent)', background: 'white' }}>{t('upload.browse')}</span>
          </div>
          <div style={{ textAlign: 'center', margin: '16px 0' }}>
            <span style={{ color: 'var(--ink4)', fontSize: 13 }}>{t('upload.or')} </span>
            <button onClick={loadDemo} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)', textDecoration: 'underline' }}>{t('hero.demo')}</button>
          </div>
          {error && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{error}</p>}
        </div>
      ) : (
        <div>
          <div style={{ background: 'var(--paper2)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, display: 'flex', gap: 24, alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 13, color: 'var(--ink3)' }}>{t('upload.preview')}</span>
              <p style={{ fontWeight: 500, margin: 0 }}>{file?.name}</p>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink3)' }}>{parsed.data.length} {t('upload.rows')} · {parsed.meta.fields?.length} {t('upload.columns')}</div>
            <button onClick={() => { setParsed(null); setFile(null); setTags({}) }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink3)', fontSize: 13, fontFamily: 'var(--font-body)' }}>✕ {t('common.back')}</button>
          </div>

          <div style={{ overflowX: 'auto', marginBottom: 28, borderRadius: 10, border: '0.5px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--paper2)' }}>
                  {parsed.meta.fields?.slice(0, 8).map(col => (
                    <th key={col} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--ink2)', borderBottom: '0.5px solid var(--border)' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.data.slice(0, 4).map((row, i) => (
                  <tr key={i} style={{ borderBottom: '0.5px solid var(--border)' }}>
                    {parsed.meta.fields?.slice(0, 8).map(col => (
                      <td key={col} style={{ padding: '6px 12px', color: 'var(--ink3)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{String(row[col] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6, color: 'var(--ink)' }}>{t('upload.tagColumns')}</h3>
          {detecting && <p style={{ fontSize: 13, color: 'var(--accent)', marginBottom: 12 }}>✨ {t('upload.detecting')}</p>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginBottom: 28 }}>
            {parsed.meta.fields?.map(col => {
              const tag = tags[col] || 'feature'
              const colors = TAG_COLORS[tag]
              return (
                <div key={col} style={{ border: `1px solid ${colors.border}`, borderRadius: 8, padding: '10px 12px', background: colors.bg }}>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col}</div>
                  <select
                    value={tag}
                    onChange={e => setTags(prev => ({ ...prev, [col]: e.target.value }))}
                    style={{ width: '100%', fontSize: 12, padding: '3px 6px', border: `0.5px solid ${colors.border}`, borderRadius: 5, background: 'white', color: colors.text, fontFamily: 'var(--font-body)', cursor: 'pointer' }}
                  >
                    <option value="outcome">{t('upload.outcome')}</option>
                    <option value="sensitive">{t('upload.sensitive')}</option>
                    <option value="feature">{t('upload.feature')}</option>
                    <option value="ignore">{t('upload.ignore')}</option>
                  </select>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={runAudit}
              disabled={!canRun()}
              style={{ padding: '12px 28px', background: canRun() ? 'var(--ink)' : 'var(--paper3)', color: canRun() ? 'white' : 'var(--ink4)', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: canRun() ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}
            >
              {t('upload.runAudit')} →
            </button>
            {!canRun() && <span style={{ fontSize: 13, color: 'var(--ink3)' }}>Tag at least one "Outcome" and one "Sensitive" column</span>}
          </div>
        </div>
      )}
    </div>
  )
}
