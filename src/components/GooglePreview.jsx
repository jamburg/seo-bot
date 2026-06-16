import { motion } from 'framer-motion'

export default function GooglePreview({ analysis }) {
  if (!analysis) return null

  const displayUrl = analysis.url
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .toLowerCase()

  const path = analysis.url
    .replace(/^https?:\/\//, '')
    .replace(/^[^/]+/, '')

  const truncatedDesc = analysis.description.content.length > 160
    ? analysis.description.content.slice(0, 157) + '...'
    : analysis.description.content

  const truncatedTitle = analysis.title.content.length > 60
    ? analysis.title.content.slice(0, 57) + '...'
    : analysis.title.content

  return (
    <motion.div
      className="google-preview-card"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <h3>Предпросмотр в Google</h3>
      <motion.div
        className="google-preview"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="g-url">
          {displayUrl}
          {path && <span> › {path.slice(0, 30)}{path.length > 30 ? '...' : ''}</span>}
        </div>
        <div className="g-title">{truncatedTitle || '(заголовок отсутствует)'}</div>
        <div className="g-desc">{truncatedDesc || '(описание отсутствует)'}</div>
      </motion.div>
    </motion.div>
  )
}
