import { motion } from 'framer-motion'

export default function Footer() {
  return (
    <motion.footer
      className="app-footer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.6 }}
    >
      <div className="footer-inner">
        <div className="footer-brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="footer-logo">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span className="footer-title">SEO Анализатор</span>
        </div>

        <div className="footer-links">
          <span className="footer-version">v1.0</span>
          <span className="footer-dot">•</span>
          <span className="footer-tech">React + Vite + Express</span>
          <span className="footer-dot">•</span>
          <span className="footer-tech">SQLite</span>
        </div>

        <div className="footer-copy">
          &copy; {new Date().getFullYear()} SEO Анализатор. Все права защищены.
        </div>
      </div>
    </motion.footer>
  )
}
