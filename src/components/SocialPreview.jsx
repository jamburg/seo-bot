import { motion } from 'framer-motion'

function PlaceholderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  )
}

function FbPreview({ ogTags, url }) {
  const domain = url ? url.replace(/^https?:\/\//, '').split('/')[0] : ''

  return (
    <div className="fb-preview">
      {ogTags.image.content ? (
        <div className="fb-image">
          <img src={ogTags.image.content} alt="og:image" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
          <div className="fb-image-placeholder" style={{ display: 'none' }}>
            <PlaceholderIcon />
            <span>Изображение не загрузилось</span>
          </div>
        </div>
      ) : (
        <div className="fb-image">
          <div className="fb-image-placeholder">
            <PlaceholderIcon />
            <span>og:image отсутствует</span>
          </div>
        </div>
      )}
      <div className="fb-body">
        <div className="fb-domain">{domain || 'domain.com'}</div>
        <div className="fb-title">{ogTags.title.content || '(og:title отсутствует)'}</div>
        <div className="fb-desc">{ogTags.description.content || '(og:description отсутствует)'}</div>
      </div>
    </div>
  )
}

function TwPreview({ twitterTags, url }) {
  const domain = url ? url.replace(/^https?:\/\//, '').split('/')[0] : ''

  return (
    <div className="tw-preview">
      {twitterTags.image.content ? (
        <div className="tw-image">
          <img src={twitterTags.image.content} alt="twitter:image" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
          <div className="tw-image-placeholder" style={{ display: 'none' }}>
            <PlaceholderIcon />
            <span>Изображение не загрузилось</span>
          </div>
        </div>
      ) : (
        <div className="tw-image">
          <div className="tw-image-placeholder">
            <PlaceholderIcon />
            <span>twitter:image отсутствует</span>
          </div>
        </div>
      )}
      <div className="tw-body">
        {twitterTags.card.content && (
          <div className="tw-domain">{twitterTags.card.content}</div>
        )}
        <div className="tw-title">{twitterTags.title.content || '(twitter:title отсутствует)'}</div>
        <div className="tw-desc">{twitterTags.description.content || '(twitter:description отсутствует)'}</div>
        <div className="tw-domain">{domain || 'domain.com'}</div>
      </div>
    </div>
  )
}

export default function SocialPreview({ analysis }) {
  if (!analysis) return null

  const statusIcon = (status) => {
    if (status === 'success') return '✅'
    if (status === 'warning') return '⚠️'
    if (status === 'error') return '❌'
    return 'ℹ️'
  }

  return (
    <motion.div
      className="social-previews"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <div className="social-card">
        <div className="social-card-header fb">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <h4>Facebook / Open Graph</h4>
          <span className="status-badge" style={{
            background: analysis.ogTags.overallStatus === 'success' ? 'var(--success-bg)' :
                        analysis.ogTags.overallStatus === 'warning' ? 'var(--warning-bg)' : 'var(--error-bg)',
            color: analysis.ogTags.overallStatus === 'success' ? 'var(--success)' :
                   analysis.ogTags.overallStatus === 'warning' ? 'var(--warning)' : 'var(--error)'
          }}>
            {statusIcon(analysis.ogTags.overallStatus)}
          </span>
        </div>
        <FbPreview ogTags={analysis.ogTags} url={analysis.url} />
      </div>

      <div className="social-card">
        <div className="social-card-header tw">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <h4>Twitter / X Card</h4>
          <span className="status-badge" style={{
            background: analysis.twitterTags.overallStatus === 'success' ? 'var(--success-bg)' :
                        analysis.twitterTags.overallStatus === 'warning' ? 'var(--warning-bg)' : 'var(--error-bg)',
            color: analysis.twitterTags.overallStatus === 'success' ? 'var(--success)' :
                   analysis.twitterTags.overallStatus === 'warning' ? 'var(--warning)' : 'var(--error)'
          }}>
            {statusIcon(analysis.twitterTags.overallStatus)}
          </span>
        </div>
        <TwPreview twitterTags={analysis.twitterTags} url={analysis.url} />
      </div>
    </motion.div>
  )
}
