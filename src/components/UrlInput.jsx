import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function UrlInput({ onSubmit, loading }) {
  const [url, setUrl] = useState('')
  const [focused, setFocused] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (url.trim() && !loading) {
      onSubmit(url.trim())
    }
  }

  return (
    <motion.form
      className="url-input-wrapper"
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <motion.div
        className="url-input-container"
        animate={{
          scale: focused ? 1.02 : 1,
          boxShadow: focused ? '0 0 40px rgba(99, 102, 241, 0.15)' : 'none',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <div className="url-input-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
          </svg>
        </div>
        <input
          className="url-input"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Введите URL сайта для анализа..."
          disabled={loading}
        />
        <motion.button
          className="url-submit-btn"
          type="submit"
          disabled={loading || !url.trim()}
          whileHover={!loading && url.trim() ? { scale: 1.02 } : {}}
          whileTap={!loading && url.trim() ? { scale: 0.98 } : {}}
        >
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.svg
                key="spinner"
                className="spinner"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                initial={{ opacity: 0, rotate: -180 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0 }}
              >
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </motion.svg>
            ) : (
              <motion.svg
                key="search"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <path d="M10 3a7 7 0 100 14 7 7 0 000-14z" />
                <path d="M21 21l-6-6" />
              </motion.svg>
            )}
          </AnimatePresence>
          {loading ? 'Анализ...' : 'Анализировать'}
        </motion.button>
      </motion.div>
    </motion.form>
  )
}
