import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n/index.js'

export default function LanguageSelector({ reportLang, onReportLangChange }) {
  const { i18n, t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const uiLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0]
  const repLang = LANGUAGES.find(l => l.code === reportLang) || LANGUAGES[0]

  function switchUI(code) {
    i18n.changeLanguage(code)
    const lang = LANGUAGES.find(l => l.code === code)
    document.documentElement.dir = lang?.dir || 'ltr'
    setOpen(false)
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(!open)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '0.5px solid var(--border2)', borderRadius: 8, background: 'var(--paper)', cursor: 'pointer', fontSize: 13, color: 'var(--ink2)', fontFamily: 'var(--font-body)' }}
        >
          <span style={{ fontSize: 14 }}>{uiLang.flag}</span>
          <span>{uiLang.nativeName}</span>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
        {open && (
          <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: 'var(--paper)', border: '0.5px solid var(--border2)', borderRadius: 10, padding: 4, zIndex: 100, minWidth: 180, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink4)', padding: '4px 8px 6px' }}>UI Language</div>
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => switchUI(lang.code)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', border: 'none', borderRadius: 6, background: i18n.language === lang.code ? 'var(--paper2)' : 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-body)', textAlign: 'left' }}
              >
                <span style={{ fontSize: 14 }}>{lang.flag}</span>
                <span style={{ flex: 1 }}>{lang.nativeName}</span>
                {i18n.language === lang.code && <span style={{ fontSize: 10, color: 'var(--accent)' }}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--ink3)' }}>{t('language.reportIn')}:</span>
        <div style={{ display: 'flex', gap: 3 }}>
          {LANGUAGES.slice(0, 6).map(lang => (
            <button
              key={lang.code}
              onClick={() => onReportLangChange(lang.code)}
              title={lang.name}
              style={{ padding: '4px 6px', border: `0.5px solid ${reportLang === lang.code ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 6, background: reportLang === lang.code ? 'var(--accent-light)' : 'transparent', cursor: 'pointer', fontSize: 13 }}
            >
              {lang.flag}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
