import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import UrlInput from './components/UrlInput'
import GooglePreview from './components/GooglePreview'
import SocialPreview from './components/SocialPreview'
import SeoGauge from './components/SeoGauge'
import EmptyState from './components/EmptyState'
import Footer from './components/Footer'
import { generateTxtReport, generateHtmlReport, generatePdf, downloadFile } from './utils/exportUtils'
import { analyzeSeo } from './utils/seoAnalyzer'

const SeoAnalysis = lazy(() => import('./components/SeoAnalysis'))
const RadarChart = lazy(() => import('./components/RadarChart'))
const CompareView = lazy(() => import('./components/CompareView'))
const HistoryChart = lazy(() => import('./components/HistoryChart'))

const LS = ({ children }) => <Suspense fallback={<div className="skeleton" style={{height:200,borderRadius:20}} />}>{children}</Suspense>

const HISTORY_KEY = 'seo-history'

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
}

function saveHistoryItem(analysis) {
  const history = loadHistory()
  const entry = {
    id: Date.now(),
    url: analysis.url,
    score: analysis.score,
    data: analysis,
    created_at: new Date().toLocaleString('ru-RU'),
  }
  history.unshift(entry)
  if (history.length > 50) history.pop()
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  return entry
}

function Particles() {
  return (
    <div className="particles">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 20}s`,
            animationDuration: `${15 + Math.random() * 20}s`,
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
          }}
        />
      ))}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <motion.div
      className="results"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      <div className="results-header">
        <div className="skeleton skeleton-card" style={{ height: 280, borderRadius: 20 }} />
        <div className="skeleton skeleton-card" style={{ height: 280, borderRadius: 20 }} />
      </div>
      <div className="social-previews">
        <div className="skeleton skeleton-card" style={{ height: 320, borderRadius: 20 }} />
        <div className="skeleton skeleton-card" style={{ height: 320, borderRadius: 20 }} />
      </div>
      <div className="skeleton skeleton-card" style={{ height: 400, borderRadius: 20 }} />
    </motion.div>
  )
}

export default function App() {
  const [analysis, setAnalysis] = useState(null)
  const [analysis2, setAnalysis2] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loading2, setLoading2] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const reportRef = useRef(null)
  const exportRef = useRef(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('seo-theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('seo-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  useEffect(() => {
    const handleClick = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchHtml(url, signal) {
    const proxyUrl = import.meta.env.DEV ? `/api/fetch?url=${encodeURIComponent(url)}` : `proxy.php?url=${encodeURIComponent(url)}`
    const res = await fetch(proxyUrl, { signal })
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      throw new Error(err?.error || `Ошибка ${res.status}`)
    }
    return res.json()
  }

  const handleAnalyze = async (url) => {
    setLoading(true)
    setError(null)
    setAnalysis(null)

    const startTime = Date.now()

    try {
      const data = await fetchHtml(url, AbortSignal.timeout(25000))
      const responseTime = Date.now() - startTime
      const result = analyzeSeo(data.html, data.url || url, responseTime, {
        ssl: data.ssl || null,
        gzip: data.contentEncoding || null,
        robotsTxt: data.extra?.robotsTxt || null,
        sitemapXml: data.extra?.sitemapXml || null,
        serverResponseTime: data.responseTimeMs || null,
        contentType: data.contentType || null,
      })
      setAnalysis(result)
      const entry = saveHistoryItem(result)
      setHistory(loadHistory())
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        setError('Тайм-аут при загрузке страницы. Проверьте URL или попробуйте позже.')
      } else {
        setError(err.message || 'Произошла ошибка при анализе')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze2 = async (url) => {
    setLoading2(true)
    const startTime = Date.now()
    try {
      const data = await fetchHtml(url, AbortSignal.timeout(25000))
      const responseTime = Date.now() - startTime
      const result = analyzeSeo(data.html, data.url || url, responseTime)
      setAnalysis2(result)
      saveHistoryItem(result)
      setHistory(loadHistory())
    } catch (err) {
      setError(err.message)
    }
    setLoading2(false)
  }

  const handleExport = async (format) => {
    setShowExportMenu(false)
    if (!analysis) return

    if (format === 'txt') {
      const content = generateTxtReport(analysis)
      downloadFile(content, `seo-report-${analysis.url.replace(/[^a-z0-9]/gi, '_').slice(0, 40)}.txt`, 'text/plain;charset=utf-8')
    } else if (format === 'html') {
      const content = generateHtmlReport(analysis)
      downloadFile(content, `seo-report-${analysis.url.replace(/[^a-z0-9]/gi, '_').slice(0, 40)}.html`, 'text/html;charset=utf-8')
    } else if (format === 'pdf') {
      setExporting(true)
      try {
        await generatePdf(analysis)
      } catch (err) {
        setError('Ошибка генерации PDF. Попробуйте экспорт в HTML.')
      }
      setExporting(false)
    }
  }

  const loadHistoryItem = (entry) => {
    setAnalysis(entry.data)
    setError(null)
    setShowHistory(false)
  }

  const deleteHistoryItem = (e, id) => {
    e.stopPropagation()
    const h = loadHistory().filter(i => i.id !== id)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h))
    setHistory(h)
  }

  const deleteAllHistory = () => {
    localStorage.removeItem(HISTORY_KEY)
    setHistory([])
  }

  return (
    <div className="app">
      <Particles />

      <motion.header
        className="header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="header-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          SEO Инструменты
        </div>
        <h1>SEO Анализатор</h1>
        <p>Проверка мета-тегов, Open Graph и Twitter Cards</p>
      </motion.header>

      <div className="toolbar">
        <UrlInput
          onSubmit={handleAnalyze}
          loading={loading}
          placeholder="Введите URL сайта для анализа..."
          key="input1"
        />

        {compareMode && (
          <UrlInput
            onSubmit={handleAnalyze2}
            loading={loading2}
            placeholder="Введите второй URL для сравнения..."
            key="input2"
          />
        )}

        <div className="toolbar-actions">
          <motion.button
            className="toolbar-btn"
            onClick={toggleTheme}
            whileTap={{ scale: 0.95 }}
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
                <circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </motion.button>

          <motion.button
            className={`toolbar-btn ${compareMode ? 'active' : ''}`}
            onClick={() => { setCompareMode(!compareMode); if (compareMode) setAnalysis2(null) }}
            whileTap={{ scale: 0.95 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3h5v5" /><path d="M8 3H3v5" /><path d="M3 16v5h5" /><path d="M21 16v5h-5" />
              <path d="M8 8h8v8H8z" />
            </svg>
            {compareMode ? 'Сравнение' : 'Сравнить'}
          </motion.button>

          {history.length > 0 && (
            <motion.div className="history-wrapper" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <button
                className="toolbar-btn"
                onClick={() => setShowHistory(!showHistory)}
                title="История анализов"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                История ({history.length})
              </button>

              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    className="history-dropdown"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <div className="history-header">
                      <span>История анализов</span>
                      <button className="history-clear" onClick={deleteAllHistory}>Очистить</button>
                    </div>
                    {history.map(item => (
                      <div key={item.id} className="history-item" onClick={() => loadHistoryItem(item)}>
                        <div className="history-item-url">{item.url}</div>
                        <div className="history-item-meta">
                          <span className={`history-score score-color-${Math.floor(item.score / 25) * 25}`}>
                            {item.score}
                          </span>
                          <span className="history-date">{item.created_at}</span>
                        </div>
                        <button className="history-del" onClick={(e) => deleteHistoryItem(e, item.id)} title="Удалить">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading && <LoadingSkeleton key="loading" />}

        {error && (
          <motion.div
            key="error"
            className="error-banner"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
            <span>{error}</span>
          </motion.div>
        )}

        {!loading && !analysis && !error && <EmptyState key="empty" />}

        {analysis && !loading && !compareMode && (
          <motion.div
            key="results"
            className="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div ref={reportRef} id="report-content">
              <div className="results-header">
                <div>
                  <SeoGauge score={analysis.score} analysis={analysis} />
                  <LS><HistoryChart history={history} currentUrl={analysis.url} /></LS>
                </div>
                <div className="results-header-right">
                  <GooglePreview analysis={analysis} />
                  <LS><RadarChart analysis={analysis} /></LS>
                </div>
              </div>

              <SocialPreview analysis={analysis} />
              <LS><SeoAnalysis analysis={analysis} /></LS>
            </div>

            <motion.div
              className="export-bar"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <div className="export-bar-inner">
                <span className="export-label">📥 Экспорт результатов</span>
                <div className="export-buttons" ref={exportRef}>
                  <button className="export-btn" onClick={() => handleExport('txt')} disabled={exporting}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <path d="M14 2v6h6" />
                      <path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" />
                    </svg>
                    TXT
                  </button>
                  <button className="export-btn" onClick={() => handleExport('html')} disabled={exporting}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                    HTML
                  </button>
                  <button className="export-btn" onClick={() => handleExport('pdf')} disabled={exporting}>
                    {exporting ? (
                      <svg className="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 11-6.219-8.56" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <path d="M14 2v6h6" />
                        <path d="M12 18v-6" /><path d="M9 15l3-3 3 3" />
                      </svg>
                    )}
                    PDF
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {compareMode && analysis && analysis2 && (
          <LS><CompareView
            left={analysis}
            right={analysis2}
            leftUrl={analysis.url}
            rightUrl={analysis2.url}
          /></LS>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  )
}
