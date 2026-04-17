import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import './i18n/index.js'
import UploadPage from './pages/UploadPage.jsx'
import AuditPage from './pages/AuditPage.jsx'
import FixPage from './pages/FixPage.jsx'
import ReportPage from './pages/ReportPage.jsx'
import LanguageSelector from './components/LanguageSelector.jsx'

const STEPS = ['upload', 'audit', 'fix', 'report']

export default function App() {
  const { t } = useTranslation()
  const [step, setStep] = useState('upload')
  const [auditData, setAuditData] = useState(null)
  const [apiKey, setApiKey] = useState(localStorage.getItem('fl_apikey') || '')
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [tempKey, setTempKey] = useState('')
  const [reportLang, setReportLang] = useState('en')

  function saveKey() {
    localStorage.setItem('fl_apikey', tempKey)
    setApiKey(tempKey)
    setShowKeyModal(false)
  }

  function handleAuditReady(data) {
    setAuditData(data)
    setStep('audit')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <nav style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--paper)', padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: 16, height: 56, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, cursor: 'pointer' }} onClick={() => setStep('upload')}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--ink)', letterSpacing: '-0.02em' }}>FairLens</span>
          <span style={{ fontSize: 10, background: 'var(--accent-light)', color: 'var(--accent)', padding: '1px 6px', borderRadius: 4, fontWeight: 500 }}>BETA</span>
        </div>

        <div style={{ display: 'flex', gap: 4, marginLeft: 24 }}>
          {STEPS.map((s, i) => {
            const isActive = step === s
            const isDone = STEPS.indexOf(step) > i
            const canGo = (s === 'audit' || s === 'report') ? !!auditData : true
            return (
              <button key={s} onClick={() => canGo && setStep(s)}
                style={{ padding: '5px 14px', border: 'none', borderRadius: 8, background: isActive ? 'var(--ink)' : 'transparent', color: isActive ? 'white' : isDone ? 'var(--accent)' : 'var(--ink3)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: isActive ? 500 : 400, cursor: canGo ? 'pointer' : 'default', transition: 'all 0.1s' }}>
                {isDone && !isActive ? '✓ ' : ''}{t(`nav.${s}`)}
              </button>
            )
          })}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <LanguageSelector reportLang={reportLang} onReportLangChange={setReportLang} />
          <button onClick={() => { setTempKey(apiKey); setShowKeyModal(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', border: `0.5px solid ${apiKey ? 'var(--green)' : 'var(--border2)'}`, borderRadius: 8, background: apiKey ? 'var(--green-light)' : 'var(--paper2)', cursor: 'pointer', fontSize: 12, color: apiKey ? 'var(--green)' : 'var(--ink3)', fontFamily: 'var(--font-body)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: apiKey ? 'var(--green)' : '#ccc', display: 'inline-block' }}></span>
            {apiKey ? 'API key set' : 'Add API key'}
          </button>
        </div>
      </nav>

      {step === 'upload' && !auditData && (
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '4rem 1rem 1rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: 'var(--accent-light)', color: 'var(--accent)', fontSize: 12, fontWeight: 500, padding: '4px 14px', borderRadius: 20, marginBottom: 20, letterSpacing: '0.05em' }}>
            SDG 10 · Reduced Inequalities
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 400, color: 'var(--ink)', marginBottom: 16, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            {t('hero.title')}
          </h1>
          <p style={{ fontSize: 18, color: 'var(--ink3)', maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.6 }}>{t('hero.subtitle')}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--ink3)', background: 'var(--paper2)', padding: '6px 14px', borderRadius: 20 }}>
              <span>10 languages</span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--ink3)', background: 'var(--paper2)', padding: '6px 14px', borderRadius: 20 }}>
              <span>Gemini 1.5 Pro</span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--ink3)', background: 'var(--paper2)', padding: '6px 14px', borderRadius: 20 }}>
              <span>No ML expertise needed</span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--ink3)', background: 'var(--paper2)', padding: '6px 14px', borderRadius: 20 }}>
              <span>Plain-language reports</span>
            </div>
          </div>
        </div>
      )}

      <main>
        {step === 'upload' && <UploadPage onAuditReady={handleAuditReady} apiKey={apiKey} reportLang={reportLang} />}
        {step === 'audit' && auditData && <AuditPage auditData={auditData} onNext={() => setStep('fix')} apiKey={apiKey} reportLang={reportLang} />}
        {step === 'fix' && auditData && <FixPage auditData={auditData} onNext={() => setStep('report')} />}
        {step === 'report' && auditData && <ReportPage auditData={auditData} apiKey={apiKey} reportLang={reportLang} />}
      </main>

      {showKeyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--paper)', borderRadius: 16, padding: '2rem', maxWidth: 440, width: '90%', border: '0.5px solid var(--border2)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, marginBottom: 8 }}>Gemini API Key</h3>
            <p style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 16, lineHeight: 1.6 }}>
              Get your free API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Google AI Studio</a>. Your key is stored only in your browser.
            </p>
            <input
              type="password"
              value={tempKey}
              onChange={e => setTempKey(e.target.value)}
              placeholder="AIza..."
              style={{ width: '100%', padding: '10px 12px', border: '0.5px solid var(--border2)', borderRadius: 8, fontSize: 14, fontFamily: 'var(--font-mono)', marginBottom: 12, background: 'var(--paper)' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveKey} style={{ flex: 1, padding: '10px', background: 'var(--ink)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Save key</button>
              <button onClick={() => setShowKeyModal(false)} style={{ padding: '10px 16px', background: 'transparent', border: '0.5px solid var(--border2)', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)', color: 'var(--ink3)' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
