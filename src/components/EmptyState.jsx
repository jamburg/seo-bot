import { motion } from 'framer-motion'

const features = [
  { icon: '📋', label: 'Title & Description', desc: 'Проверка длины, наличия ключевых слов и CTA' },
  { icon: '🔗', label: 'Open Graph', desc: 'Facebook, VK, Telegram — превью ссылок' },
  { icon: '🐦', label: 'Twitter Cards', desc: 'X/Twitter — карточки с изображением' },
  { icon: '⚙️', label: 'Технический SEO', desc: 'Canonical, H1, Favicon, Robots' },
  { icon: '📊', label: 'Структ. данные', desc: 'JSON-LD для расширенных сниппетов' },
  { icon: '🏆', label: 'Общий балл', desc: 'Оценка SEO-оптимизации от 0 до 100' },
]

function FloatingIcon({ icon, label, index }) {
  return (
    <motion.div
      className="empty-feature-icon"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ scale: 1.15, y: -5 }}
    >
      <motion.div
        className="empty-icon-circle"
        animate={{
          y: [0, -6, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 3 + index * 0.3,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: index * 0.4,
        }}
      >
        <span className="empty-icon-emoji">{icon}</span>
      </motion.div>
      <span className="empty-icon-label">{label}</span>
    </motion.div>
  )
}

export default function EmptyState() {
  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <motion.div
        className="empty-glow"
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.h2
        className="empty-title"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        Начните анализ SEO
      </motion.h2>

      <motion.p
        className="empty-subtitle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Введите URL сайта в поле выше, чтобы проверить его мета-теги,
        <br />
        Open Graph и Twitter Cards на соответствие лучшим практикам SEO
      </motion.p>

      <div className="empty-features">
        {features.map((f, i) => (
          <FloatingIcon key={i} icon={f.icon} label={f.label} index={i} />
        ))}
      </div>

      <motion.div
        className="empty-checklist"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h4>🔍 Что проверяется:</h4>
        <div className="checklist-grid">
          {[
            'Заголовок Title и Meta Description',
            'Open Graph (og:title, og:image, og:url, og:type)',
            'Twitter Cards (card, title, description, image)',
            'Технические теги (Canonical, Viewport, Charset, Robots)',
            'Структурированные данные JSON-LD',
            'Общий балл SEO-оптимизации',
          ].map((item, i) => (
            <motion.div
              key={i}
              className="checklist-item"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + i * 0.08 }}
            >
              <span className="check-dot">✦</span>
              {item}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
