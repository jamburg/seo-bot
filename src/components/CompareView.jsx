import { motion } from 'framer-motion'

const statusScore = { success: 3, info: 2, warning: 1, error: 0 }

function CompareRow({ label, leftVal, leftStatus, rightVal, rightStatus }) {
  const leftScore = statusScore[leftStatus] || 0
  const rightScore = statusScore[rightStatus] || 0
  const better = leftScore > rightScore ? 'left' : rightScore > leftScore ? 'right' : 'tie'

  return (
    <div className="compare-row">
      <div className="compare-label">{label}</div>
      <div className={`compare-cell ${better === 'left' ? 'is-better' : ''} ${leftStatus === 'error' ? 'is-error' : leftStatus === 'warning' ? 'is-warn' : ''}`}>
        <div className="compare-val">{leftVal || '(—)'}</div>
        <div className="compare-status">{leftStatus}</div>
      </div>
      <div className={`compare-cell ${better === 'right' ? 'is-better' : ''} ${rightStatus === 'error' ? 'is-error' : rightStatus === 'warning' ? 'is-warn' : ''}`}>
        <div className="compare-val">{rightVal || '(—)'}</div>
        <div className="compare-status">{rightStatus}</div>
      </div>
    </div>
  )
}

export default function CompareView({ left, right, leftUrl, rightUrl }) {
  if (!left || !right) return null

  const leftScore = left.score
  const rightScore = right.score
  const winner = leftScore > rightScore ? 'left' : rightScore > leftScore ? 'right' : 'tie'

  const rows = [
    { label: 'Score', leftVal: `${left.score}`, leftStatus: left.score >= 70 ? 'success' : left.score >= 50 ? 'warning' : 'error', rightVal: `${right.score}`, rightStatus: right.score >= 70 ? 'success' : right.score >= 50 ? 'warning' : 'error' },
    { label: 'Title', leftVal: left.title.content, leftStatus: left.title.status, rightVal: right.title.content, rightStatus: right.title.status },
    { label: 'Description', leftVal: left.description.content, leftStatus: left.description.status, rightVal: right.description.content, rightStatus: right.description.status },
    { label: 'OG Title', leftVal: left.ogTags.title.content, leftStatus: left.ogTags.title.status, rightVal: right.ogTags.title.content, rightStatus: right.ogTags.title.status },
    { label: 'OG Image', leftVal: left.ogTags.image.content ? '✓' : '—', leftStatus: left.ogTags.image.status, rightVal: right.ogTags.image.content ? '✓' : '—', rightStatus: right.ogTags.image.status },
    { label: 'Twitter Card', leftVal: left.twitterTags.card.content, leftStatus: left.twitterTags.card.status, rightVal: right.twitterTags.card.content, rightStatus: right.twitterTags.card.status },
    { label: 'Twitter Image', leftVal: left.twitterTags.image.content ? '✓' : '—', leftStatus: left.twitterTags.image.status, rightVal: right.twitterTags.image.content ? '✓' : '—', rightStatus: right.twitterTags.image.status },
    { label: 'Canonical', leftVal: left.canonical.content, leftStatus: left.canonical.status, rightVal: right.canonical.content, rightStatus: right.canonical.status },
    { label: 'H1', leftVal: left.h1.content, leftStatus: left.h1.status, rightVal: right.h1.content, rightStatus: right.h1.status },
    { label: 'Structured Data', leftVal: left.structuredData.present ? '✓' : '—', leftStatus: left.structuredData.status, rightVal: right.structuredData.present ? '✓' : '—', rightStatus: right.structuredData.status },
  ]

  return (
    <motion.div
      className="compare-view"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="compare-header">
        <h2>📊 Сравнение URL</h2>
        <div className={`compare-winner ${winner}`}>
          {winner === 'tie' ? '🤝 Ничья' : `🏆 ${winner === 'left' ? leftUrl : rightUrl}`}
        </div>
      </div>

      <div className="compare-urls">
        <div className="compare-url-block left">
          <span className="compare-url-label">URL 1</span>
          <span className="compare-url-value">{leftUrl}</span>
          <span className="compare-url-score">{left.score}/100</span>
        </div>
        <div className="compare-url-block right">
          <span className="compare-url-label">URL 2</span>
          <span className="compare-url-value">{rightUrl}</span>
          <span className="compare-url-score">{right.score}/100</span>
        </div>
      </div>

      <div className="compare-table">
        <div className="compare-row compare-row-header">
          <div className="compare-label">Параметр</div>
          <div className="compare-cell">URL 1</div>
          <div className="compare-cell">URL 2</div>
        </div>
        {rows.map((row, i) => (
          <CompareRow key={i} {...row} />
        ))}
      </div>
    </motion.div>
  )
}
