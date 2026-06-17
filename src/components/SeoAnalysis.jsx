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
    {
      title: 'Структура заголовков',
      icon: '📐',
      defaultOpen: false,
      items: [
        ...(analysis.headings ? ['h1','h2','h3','h4','h5','h6'].filter(t => analysis.headings.counts[t] > 0).map(t => ({
          name: t.toUpperCase(), value: `${analysis.headings.counts[t]} шт.`, status: t === 'h1' && analysis.headings.counts[t] === 1 ? 'success' : t === 'h1' && analysis.headings.counts[t] === 0 ? 'error' : analysis.headings.status === 'error' ? analysis.headings.status : 'success', item: { issues: [], recommendations: [] }
        })) : []),
        { name: 'Иерархия', value: analysis.headings?.status === 'success' ? 'Корректная' : 'Нарушена', status: analysis.headings?.status || 'info', item: analysis.headings || { issues: [], recommendations: [] } },
      ]
    },
    {
      title: 'Ссылки',
      icon: '🔗',
      defaultOpen: false,
      items: [
        { name: 'Всего ссылок', value: `${analysis.links?.total || 0}`, status: analysis.links?.total > 0 ? 'success' : 'warning', item: { issues: [], recommendations: [] } },
        { name: 'Внутренние', value: `${analysis.links?.internal || 0}`, status: analysis.links?.internal > 0 ? 'success' : 'info', item: { issues: [], recommendations: [] } },
        { name: 'Внешние', value: `${analysis.links?.external || 0}`, status: 'info', item: { issues: [], recommendations: [] } },
        { name: 'nofollow', value: `${analysis.links?.nofollow || 0}`, status: analysis.links?.nofollow > analysis.links?.total * 0.5 ? 'warning' : 'info', item: { issues: analysis.links?.nofollow > analysis.links?.total * 0.5 ? ['Более 50% ссылок nofollow'] : [], recommendations: ['Используйте nofollow только для внешних ссылок'] } },
        { name: 'Битые', value: `${analysis.links?.broken || 0}`, status: analysis.links?.broken > 0 ? 'warning' : 'success', item: { issues: analysis.links?.broken > 0 ? [`${analysis.links.broken} битых ссылок`] : [], recommendations: ['Проверьте и исправьте битые ссылки'] } },
      ]
    },
    {
      title: 'Сервер и соединение',
      icon: '🖥️',
      defaultOpen: false,
      items: [
        { name: 'SSL сертификат', value: analysis.server?.ssl?.valid ? 'Действителен' : (analysis.server?.ssl ? 'Проблемы' : 'Н/Д (HTTP)'), status: analysis.server?.ssl?.valid ? 'success' : (analysis.server?.ssl ? 'error' : 'info'), item: { issues: analysis.server?.ssl && !analysis.server?.ssl?.valid ? ['SSL сертификат недействителен'] : [], recommendations: ['Установите действительный SSL сертификат'], ...analysis.server?.ssl } },
        { name: 'Эмитент SSL', value: analysis.server?.ssl?.issuer || '—', status: analysis.server?.ssl?.issuer ? 'info' : 'info', item: { issues: [], recommendations: [] } },
        { name: 'Сжатие', value: analysis.server?.gzip ? `${analysis.server.gzip.toUpperCase()}` : 'Отсутствует', status: analysis.server?.gzip ? 'success' : 'warning', item: { issues: !analysis.server?.gzip ? ['Сжатие не включено'] : [], recommendations: ['Включите GZIP/Deflate/Brotli сжатие на сервере'] } },
        { name: 'robots.txt', value: analysis.server?.robotsTxt?.exists ? 'Доступен' : 'Отсутствует', status: analysis.server?.robotsTxt?.exists ? 'success' : 'warning', item: { issues: !analysis.server?.robotsTxt?.exists ? ['Файл robots.txt не найден'] : [], recommendations: ['Создайте robots.txt для управления индексацией'] } },
        { name: 'sitemap.xml', value: analysis.server?.sitemapXml?.exists ? 'Доступен' : 'Отсутствует', status: analysis.server?.sitemapXml?.exists ? 'success' : 'warning', item: { issues: !analysis.server?.sitemapXml?.exists ? ['Sitemap не найден'] : [], recommendations: ['Создайте sitemap.xml для ускорения индексации'] } },
        { name: 'Content-Type', value: analysis.server?.contentType || '—', status: 'info', item: { issues: [], recommendations: [] } },
        { name: 'Время ответа (сервер)', value: analysis.server?.serverResponseTime ? `${analysis.server.serverResponseTime}мс` : '—', status: analysis.server?.serverResponseTime < 500 ? 'success' : analysis.server?.serverResponseTime < 1500 ? 'warning' : 'error', item: { issues: [], recommendations: [] } },
      ]
    },
    {
      title: 'Контент',
      icon: '📝',
      defaultOpen: false,
      items: [
        { name: 'Content-to-code ratio', value: analysis.contentRatio ? `${analysis.contentRatio.ratio}%` : '—', status: analysis.contentRatio?.status || 'info', item: analysis.contentRatio || { issues: [], recommendations: [] } },
        { name: 'Размер текста', value: analysis.contentRatio ? `${(analysis.contentRatio.textSize / 1024).toFixed(1)}KB` : '—', status: 'info', item: { issues: [], recommendations: [] } },
        { name: 'Meta keywords', value: analysis.metaKeywords?.content || '(отсутствует)', status: analysis.metaKeywords?.status || 'info', item: analysis.metaKeywords || { issues: [], recommendations: [] } },
        { name: 'Частые слова', value: analysis.keywords?.topKeywords?.slice(0, 5).map(([w]) => w).join(', ') || '—', status: analysis.keywords?.status || 'info', item: analysis.keywords || { issues: [], recommendations: [] } },
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
