import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect } from 'react'

export default function SeoGauge({ score, analysis }) {
  const circumference = 2 * Math.PI * 78
  const motionScore = useMotionValue(0)
  const dashOffset = useTransform(motionScore, (v) => circumference - (v / 100) * circumference)
  const displayScore = useTransform(motionScore, (v) => Math.round(v))

  const getColor = (s) => {
    if (s >= 90) return '#10b981'
    if (s >= 70) return '#6366f1'
    if (s >= 50) return '#f59e0b'
    return '#ef4444'
  }

  const getLabel = (s) => {
    if (s >= 90) return 'Отлично'
    if (s >= 70) return 'Хорошо'
    if (s >= 50) return 'Средне'
    return 'Плохо'
  }

  const getGrade = (s) => {
    if (s >= 90) return 'A'
    if (s >= 80) return 'B'
    if (s >= 70) return 'C'
    if (s >= 60) return 'D'
    return 'F'
  }

  useEffect(() => {
    const controls = animate(motionScore, score, {
      duration: 1.5,
      ease: [0.34, 1.56, 0.64, 1],
    })
    return controls.stop
  }, [score])

  const color = getColor(score)
  const successCount = [analysis?.title, analysis?.description, analysis?.viewport, analysis?.charset, analysis?.h1, analysis?.lang, analysis?.favicon, analysis?.structuredData, analysis?.canonical].filter(c => c?.status === 'success').length
  const totalChecks = 10

  return (
    <motion.div
      className="score-card"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="gauge-container">
        <svg viewBox="0 0 180 180">
          <circle className="gauge-bg" cx="90" cy="90" r="78" />
          <motion.circle
            className="gauge-fill"
            cx="90" cy="90" r="78"
            style={{
              stroke: color,
              strokeDasharray: circumference,
              strokeDashoffset: dashOffset,
              '--gauge-color': color,
            }}
          />
        </svg>
        <div className="gauge-center">
          <motion.span className="gauge-value" style={{ color }}>
            {displayScore}
          </motion.span>
          <span className="gauge-label">{getLabel(score)}</span>
        </div>
      </div>

      <div className="score-meta">
        <div className="score-meta-item">
          <span className="score-meta-value" style={{ color: 'var(--success)' }}>{successCount}</span>
          <span className="score-meta-label">Успешно</span>
        </div>
        <div className="score-meta-item">
          <span className="score-meta-value" style={{ color: 'var(--warning)' }}>
            {[analysis?.title, analysis?.description, analysis?.viewport, analysis?.charset, analysis?.h1, analysis?.lang, analysis?.favicon, analysis?.structuredData, analysis?.canonical].filter(c => c?.status === 'warning').length +
             (analysis?.ogTags?.overallStatus === 'warning' ? 1 : 0) +
             (analysis?.twitterTags?.overallStatus === 'warning' ? 1 : 0)}
          </span>
          <span className="score-meta-label">Предупрежд.</span>
        </div>
        <div className="score-meta-item">
          <span className="score-meta-value" style={{ color: 'var(--error)' }}>
            {[analysis?.title, analysis?.description, analysis?.viewport, analysis?.charset, analysis?.h1, analysis?.lang, analysis?.favicon, analysis?.structuredData, analysis?.canonical].filter(c => c?.status === 'error').length +
             (analysis?.ogTags?.overallStatus === 'error' ? 1 : 0) +
             (analysis?.twitterTags?.overallStatus === 'error' ? 1 : 0)}
          </span>
          <span className="score-meta-label">Ошибки</span>
        </div>
      </div>
    </motion.div>
  )
}
