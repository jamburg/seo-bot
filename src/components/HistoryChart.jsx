import { motion } from 'framer-motion'

export default function HistoryChart({ history, currentUrl }) {
  const urlHistory = history.filter(h => h.url === currentUrl).reverse()
  if (urlHistory.length < 2) return null

  const scores = urlHistory.map(h => h.score)
  const maxScore = 100
  const minScore = 0
  const margin = { top: 10, right: 10, bottom: 20, left: 10 }
  const w = 280, h = 80
  const iw = w - margin.left - margin.right
  const ih = h - margin.top - margin.bottom

  const xScale = (i) => margin.left + (i / (scores.length - 1)) * iw
  const yScale = (v) => margin.top + ih - (v / maxScore) * ih

  const points = scores.map((s, i) => `${xScale(i)},${yScale(s)}`).join(' ')
  const color = scores[scores.length - 1] >= 70 ? '#10b981' : scores[scores.length - 1] >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <motion.div
      className="history-chart"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.4 }}
    >
      <div className="history-chart-title">📈 Динамика баллов</div>
      <svg viewBox={`0 0 ${w} ${h}`} className="history-chart-svg">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[25, 50, 75].map(g => (
          <line key={g} x1={margin.left} y1={yScale(g)} x2={margin.left + iw} y2={yScale(g)}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="3,3" />
        ))}

        <polygon fill="url(#areaGrad)" points={`${xScale(0)},${yScale(0)} ${points} ${xScale(scores.length - 1)},${yScale(0)}`} />
        <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />

        {scores.map((s, i) => (
          <circle key={i} cx={xScale(i)} cy={yScale(s)} r="3" fill={color} stroke="#0a0a1a" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="history-chart-labels">
        <span>{urlHistory[0].created_at?.slice(0, 10) || ''}</span>
        <span>{urlHistory[urlHistory.length - 1].created_at?.slice(0, 10) || ''}</span>
      </div>
    </motion.div>
  )
}
