import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function StatusIcon({ status }) {
  const icons = {
    success: '✅',
    warning: '⚠️',
    error: '❌',
    info: 'ℹ️',
  }
  return <span>{icons[status] || 'ℹ️'}</span>
}

function AnalysisItem({ item, name, value, status }) {
  return (
    <motion.div
      className={`analysis-item status-${status}`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="analysis-item-icon">
        <StatusIcon status={status} />
      </div>
      <div className="analysis-item-content">
        <div className="analysis-item-title">{name}</div>
        {value !== undefined && value !== null && value !== '' && (
          <div className={`analysis-item-value ${!value || value === '(отсутствует)' ? 'none' : ''}`}>
            {value}
          </div>
        )}
        {item?.issues?.length > 0 && (
          <div className="analysis-item-desc">
            {item.issues.map((issue, i) => (
              <div key={i}>{issue}</div>
            ))}
          </div>
        )}
        {item?.recommendations?.length > 0 && (
          <div className="analysis-item-rec">
            {item.recommendations[0]}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function Section({ title, icon, children, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <motion.div
      className="analysis-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="analysis-header" onClick={() => setOpen(!open)}>
        <div className="analysis-header-left">
          <span>{icon}</span>
          <h3>{title}</h3>
        </div>
        <svg className={`chevron ${open ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            className="analysis-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="analysis-items">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function SeoAnalysis({ analysis }) {
  if (!analysis) return null

  const sections = [
    {
      title: 'Основные мета-теги',
      icon: '📋',
      items: [
        { name: 'Заголовок (Title)', value: analysis.title.content, status: analysis.title.status, item: analysis.title },
        { name: 'Мета-описание', value: analysis.description.content, status: analysis.description.status, item: analysis.description },
        { name: 'Кодировка', value: analysis.charset.content, status: analysis.charset.status, item: analysis.charset },
        { name: 'Viewport', value: analysis.viewport.content, status: analysis.viewport.status, item: analysis.viewport },
        { name: 'Язык страницы', value: analysis.lang.content, status: analysis.lang.status, item: analysis.lang },
        { name: 'Robots', value: analysis.robots.content, status: analysis.robots.status, item: analysis.robots },
      ]
    },
    {
      title: 'Open Graph (Facebook, VK, Telegram)',
      icon: '🔗',
      items: [
        { name: 'og:title', value: analysis.ogTags.title.content, status: analysis.ogTags.title.status, item: analysis.ogTags.title },
        { name: 'og:description', value: analysis.ogTags.description.content, status: analysis.ogTags.description.status, item: analysis.ogTags.description },
        { name: 'og:image', value: analysis.ogTags.image.content, status: analysis.ogTags.image.status, item: analysis.ogTags.image },
        { name: 'og:url', value: analysis.ogTags.url.content, status: analysis.ogTags.url.status, item: analysis.ogTags.url },
        { name: 'og:type', value: analysis.ogTags.type.content, status: analysis.ogTags.type.status, item: analysis.ogTags.type },
      ]
    },
    {
      title: 'Twitter Cards',
      icon: '🐦',
      items: [
        { name: 'twitter:card', value: analysis.twitterTags.card.content, status: analysis.twitterTags.card.status, item: analysis.twitterTags.card },
        { name: 'twitter:title', value: analysis.twitterTags.title.content, status: analysis.twitterTags.title.status, item: analysis.twitterTags.title },
        { name: 'twitter:description', value: analysis.twitterTags.description.content, status: analysis.twitterTags.description.status, item: analysis.twitterTags.description },
        { name: 'twitter:image', value: analysis.twitterTags.image.content, status: analysis.twitterTags.image.status, item: analysis.twitterTags.image },
      ]
    },
    {
      title: 'Технический SEO',
      icon: '⚙️',
      items: [
        { name: 'Канонический URL', value: analysis.canonical.content, status: analysis.canonical.status, item: analysis.canonical },
        { name: 'H1 заголовок', value: analysis.h1.content || '(отсутствует)', status: analysis.h1.status, item: { ...analysis.h1, issues: analysis.h1.count > 1 ? [`Найдено H1: ${analysis.h1.count}`] : analysis.h1.issues } },
        { name: 'Favicon', value: analysis.favicon.content, status: analysis.favicon.status, item: analysis.favicon },
        { name: 'Структурированные данные', value: analysis.structuredData.present ? `JSON-LD (${analysis.structuredData.count})` : 'Отсутствуют', status: analysis.structuredData.status, item: analysis.structuredData },
      ]
    },
    {
      title: 'Производительность',
      icon: '⚡',
      defaultOpen: false,
      items: [
        { name: 'Время ответа', value: analysis.performance ? `${analysis.performance.responseTime}мс` : '—', status: analysis.performance?.responseTime < 500 ? 'success' : analysis.performance?.responseTime < 1500 ? 'warning' : 'error', item: { issues: [], recommendations: [] } },
        { name: 'Размер HTML', value: analysis.performance ? `${(analysis.performance.htmlSize / 1024).toFixed(1)}KB` : '—', status: analysis.performance?.sizeLabel === 'small' ? 'success' : analysis.performance?.sizeLabel === 'medium' ? 'warning' : 'error', item: { issues: analysis.performance?.sizeLabel === 'large' ? ['Большой размер HTML'] : [], recommendations: analysis.performance?.sizeLabel === 'large' ? ['Оптимизируйте HTML, удалите лишние пробелы и комментарии'] : [] } },
        { name: 'Скрипты', value: analysis.performance ? `внешних: ${analysis.performance.externalScripts}${analysis.performance.hasDeferScripts ? ', defer ✓' : ''}${analysis.performance.hasAsyncScripts ? ', async ✓' : ''}` : '—', status: analysis.performance?.blockingResources <= 2 ? 'success' : 'warning', item: { issues: analysis.performance?.blockingResources > 2 ? [`${analysis.performance.blockingResources} блокирующих ресурсов`] : [], recommendations: ['Используйте async/defer для скриптов'] } },
        { name: 'CSS', value: analysis.performance ? `${analysis.performance.externalStylesheets} файлов` : '—', status: analysis.performance?.externalStylesheets <= 3 ? 'success' : 'warning', item: { issues: [], recommendations: [] } },
        { name: 'Изображения', value: analysis.performance ? `всего: ${analysis.performance.totalImages}, без alt: ${analysis.performance.imagesWithoutAlt}${analysis.performance.hasLazyImages ? ', lazy ✓' : ''}` : '—', status: analysis.performance?.imagesWithoutAlt === 0 ? 'success' : 'warning', item: { issues: analysis.performance?.imagesWithoutAlt > 0 ? [`${analysis.performance.imagesWithoutAlt} изображений без alt`] : [], recommendations: ['Добавьте alt-текст для всех изображений'] } },
      ]
    },
  ]

  return (
    <motion.div
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>
        📊 Детальный анализ
      </h2>
      {sections.map((section, idx) => (
        <Section key={idx} title={section.title} icon={section.icon} defaultOpen={idx === 0}>
          {section.items.map((item, i) => (
            <AnalysisItem key={i} {...item} />
          ))}
        </Section>
      ))}
    </motion.div>
  )
}
