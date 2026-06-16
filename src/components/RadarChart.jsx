import { motion } from 'framer-motion'

const scoreToValue = (status) => {
  if (status === 'success') return 100
  if (status === 'warning') return 50
  if (status === 'error') return 0
  return 75
}

export default function RadarChart({ analysis }) {
  if (!analysis) return null

  const categories = [
    { label: 'Title', value: scoreToValue(analysis.title.status), full: analysis.title.content || '' },
    { label: 'Description', value: scoreToValue(analysis.description.status), full: analysis.description.content || '' },
    { label: 'Open Graph', value: analysis.ogTags.overallStatus === 'success' ? 100 : analysis.ogTags.overallStatus === 'warning' ? 50 : 0, full: '' },
    { label: 'Twitter', value: analysis.twitterTags.overallStatus === 'success' ? 100 : analysis.twitterTags.overallStatus === 'warning' ? 50 : 0, full: '' },
    { label: 'Technical', value: Math.round((
      scoreToValue(analysis.canonical.status) +
      scoreToValue(analysis.viewport.status) +
      scoreToValue(analysis.charset.status) +
      scoreToValue(analysis.h1.status) +
      scoreToValue(analysis.lang.status)
    ) / 5), full: '' },
    { label: 'Structured', value: scoreToValue(analysis.structuredData.status), full: '' },
  ]

  const size = 220
  const cx = size / 2
  const cy = size / 2
  const radius = 90
  const levels = 4

  const angleStep = (2 * Math.PI) / categories.length

  const getPoint = (index, value) => {
    const angle = angleStep * index - Math.PI / 2
    const r = (value / 100) * radius
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  const polygonPoints = categories.map((cat, i) => {
    const p = getPoint(i, cat.value)
    return `${p.x},${p.y}`
  }).join(' ')

  return (
    <motion.div
      className="radar-chart-card"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.35 }}
    >
      <h3 className="radar-title">Распределение баллов</h3>
      <svg viewBox={`0 0 ${size} ${size}`} className="radar-svg">
        {Array.from({ length: levels }).map((_, level) => {
          const r = (radius / levels) * (level + 1)
          const pts = categories.map((_, i) => {
            const angle = angleStep * i - Math.PI / 2
            return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
          }).join(' ')
          return <polygon key={level} points={pts} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        })}

        {categories.map((_, i) => {
          const p = getPoint(i, 100)
          return (
            <line
              key={i}
              x1={cx} y1={cy}
              x2={p.x} y2={p.y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          )
        })}

        <motion.polygon
          points={polygonPoints}
          fill="rgba(99, 102, 241, 0.2)"
          stroke="url(#radarGrad)"
          strokeWidth="2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        />

        {categories.map((cat, i) => {
          const p = getPoint(i, cat.value)
          return (
            <motion.g key={i}>
              <circle cx={p.x} cy={p.y} r="4" fill="#6366f1" stroke="#8b5cf6" strokeWidth="2" />
              <text
                x={getPoint(i, 115).x}
                y={getPoint(i, 115).y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#8888a8"
                fontSize="10"
                fontFamily="Inter, sans-serif"
              >
                {cat.label}
              </text>
            </motion.g>
          )
        })}

        <defs>
          <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
      </svg>

      <div className="radar-legend">
        {categories.map((cat, i) => (
          <div key={i} className="radar-legend-item">
            <div className="radar-legend-dot" style={{
              background: cat.value >= 80 ? '#10b981' : cat.value >= 50 ? '#f59e0b' : '#ef4444'
            }} />
            <span className="radar-legend-label">{cat.label}</span>
            <span className="radar-legend-value" style={{
              color: cat.value >= 80 ? '#10b981' : cat.value >= 50 ? '#f59e0b' : '#ef4444'
            }}>{cat.value}%</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
