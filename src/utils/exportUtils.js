const statusLabel = { success: '✅ Успешно', warning: '⚠️ Внимание', error: '❌ Ошибка', info: 'ℹ️ Информация' };

function itemLine(name, value, status) {
  return `${name}: ${value || '(отсутствует)'} [${statusLabel[status] || status}]`;
}

function repeat(char, n) {
  return char.repeat(n);
}

export function generateTxtReport(analysis) {
  const d = new Date();
  const dateStr = d.toLocaleString('ru-RU');
  const lines = [
    `SEO АНАЛИЗАТОР — ОТЧЕТ`,
    repeat('=', 50),
    `URL: ${analysis.url}`,
    `Дата: ${dateStr}`,
    `Общий балл: ${analysis.score}/100`,
    '',
    `ОСНОВНЫЕ МЕТА-ТЕГИ`,
    repeat('-', 40),
    itemLine('Title', analysis.title.content, analysis.title.status),
    `  Длина: ${analysis.title.length} симв.`,
    itemLine('Description', analysis.description.content, analysis.description.status),
    `  Длина: ${analysis.description.length} симв.`,
    itemLine('Charset', analysis.charset.content, analysis.charset.status),
    itemLine('Viewport', analysis.viewport.content, analysis.viewport.status),
    itemLine('Language', analysis.lang.content, analysis.lang.status),
    itemLine('Robots', analysis.robots.content, analysis.robots.status),
    '',
    `OPEN GRAPH (Facebook, VK, Telegram)`,
    repeat('-', 40),
    itemLine('og:title', analysis.ogTags.title.content, analysis.ogTags.title.status),
    itemLine('og:description', analysis.ogTags.description.content, analysis.ogTags.description.status),
    itemLine('og:image', analysis.ogTags.image.content, analysis.ogTags.image.status),
    itemLine('og:url', analysis.ogTags.url.content, analysis.ogTags.url.status),
    itemLine('og:type', analysis.ogTags.type.content, analysis.ogTags.type.status),
    '',
    `TWITTER CARDS`,
    repeat('-', 40),
    itemLine('twitter:card', analysis.twitterTags.card.content, analysis.twitterTags.card.status),
    itemLine('twitter:title', analysis.twitterTags.title.content, analysis.twitterTags.title.status),
    itemLine('twitter:description', analysis.twitterTags.description.content, analysis.twitterTags.description.status),
    itemLine('twitter:image', analysis.twitterTags.image.content, analysis.twitterTags.image.status),
    '',
    `ТЕХНИЧЕСКИЙ SEO`,
    repeat('-', 40),
    itemLine('Canonical URL', analysis.canonical.content, analysis.canonical.status),
    itemLine('H1 заголовок', analysis.h1.content, analysis.h1.status),
    `  Количество H1: ${analysis.h1.count}`,
    itemLine('Favicon', analysis.favicon.content, analysis.favicon.status),
    itemLine('Structured Data', analysis.structuredData.present ? `JSON-LD (${analysis.structuredData.count})` : 'Отсутствуют', analysis.structuredData.status),
    '',
    ...(analysis.title.issues.length ? ['', 'ЗАМЕЧАНИЯ ПО TITLE:', ...analysis.title.recommendations.map(r => `  → ${r}`)] : []),
    ...(analysis.description.issues.length ? ['', 'ЗАМЕЧАНИЯ ПО DESCRIPTION:', ...analysis.description.recommendations.map(r => `  → ${r}`)] : []),
    ...(analysis.ogTags.issues.length ? ['', 'ЗАМЕЧАНИЯ ПО OPEN GRAPH:', ...analysis.ogTags.recommendations.map(r => `  → ${r}`)] : []),
    ...(analysis.twitterTags.issues.length ? ['', 'ЗАМЕЧАНИЯ ПО TWITTER:', ...analysis.twitterTags.recommendations.map(r => `  → ${r}`)] : []),
    '',
    repeat('=', 50),
    'Сгенерировано SEO Анализатором',
  ].join('\n');
  return lines;
}

export function generateHtmlReport(analysis) {
  const d = new Date();
  const dateStr = d.toLocaleString('ru-RU');

  const section = (title, items) => `
    <div class="section">
      <h2>${title}</h2>
      ${items.map(i => `
        <div class="item ${i.status || 'info'}">
          <div class="item-name">${i.name}</div>
          <div class="item-value">${i.value || '<span class="missing">(отсутствует)</span>'}</div>
          <div class="item-status">${statusLabel[i.status] || i.status}</div>
          ${i.issues && i.issues.length ? `<div class="item-issues">${i.issues.map(x => `<div>• ${x}</div>`).join('')}</div>` : ''}
          ${i.recommendations && i.recommendations.length ? `<div class="item-rec">💡 ${i.recommendations[0]}</div>` : ''}
        </div>
      `).join('')}
    </div>`;

  const sections = [
    section('Основные мета-теги', [
      { name: 'Title', value: analysis.title.content, status: analysis.title.status, issues: analysis.title.issues, recommendations: analysis.title.recommendations },
      { name: 'Meta Description', value: analysis.description.content, status: analysis.description.status, issues: analysis.description.issues, recommendations: analysis.description.recommendations },
      { name: 'Charset', value: analysis.charset.content, status: analysis.charset.status },
      { name: 'Viewport', value: analysis.viewport.content, status: analysis.viewport.status },
      { name: 'Language', value: analysis.lang.content, status: analysis.lang.status },
      { name: 'Robots', value: analysis.robots.content, status: analysis.robots.status },
    ]),
    section('Open Graph', [
      { name: 'og:title', value: analysis.ogTags.title.content, status: analysis.ogTags.title.status },
      { name: 'og:description', value: analysis.ogTags.description.content, status: analysis.ogTags.description.status },
      { name: 'og:image', value: analysis.ogTags.image.content, status: analysis.ogTags.image.status },
      { name: 'og:url', value: analysis.ogTags.url.content, status: analysis.ogTags.url.status },
      { name: 'og:type', value: analysis.ogTags.type.content, status: analysis.ogTags.type.status },
    ]),
    section('Twitter Cards', [
      { name: 'twitter:card', value: analysis.twitterTags.card.content, status: analysis.twitterTags.card.status },
      { name: 'twitter:title', value: analysis.twitterTags.title.content, status: analysis.twitterTags.title.status },
      { name: 'twitter:description', value: analysis.twitterTags.description.content, status: analysis.twitterTags.description.status },
      { name: 'twitter:image', value: analysis.twitterTags.image.content, status: analysis.twitterTags.image.status },
    ]),
    section('Технический SEO', [
      { name: 'Canonical URL', value: analysis.canonical.content, status: analysis.canonical.status },
      { name: 'H1 заголовок', value: analysis.h1.content, status: analysis.h1.status },
      { name: 'Favicon', value: analysis.favicon.content, status: analysis.favicon.status },
      { name: 'Structured Data', value: analysis.structuredData.present ? `JSON-LD (${analysis.structuredData.count})` : 'Отсутствуют', status: analysis.structuredData.status },
    ]),
  ];

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>SEO Отчет — ${analysis.url}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; background: #0a0a1a; color: #f0f0f5; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; }
    .header h1 { font-size: 2rem; background: linear-gradient(135deg, #6366f1, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .header .score { font-size: 3rem; font-weight: 800; margin: 10px 0; }
    .header .score-90 { color: #10b981; } .header .score-70 { color: #6366f1; } .header .score-50 { color: #f59e0b; } .header .score-0 { color: #ef4444; }
    .header .meta { color: #8888a8; font-size: 0.85rem; }
    .section { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 24px; margin-bottom: 20px; }
    .section h2 { font-size: 1.1rem; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.08); color: #c0c0e0; }
    .item { padding: 12px 14px; margin-bottom: 8px; border-radius: 8px; background: rgba(255,255,255,0.03); border-left: 3px solid #555; }
    .item.success { border-left-color: #10b981; } .item.warning { border-left-color: #f59e0b; } .item.error { border-left-color: #ef4444; } .item.info { border-left-color: #3b82f6; }
    .item-name { font-weight: 600; font-size: 0.9rem; margin-bottom: 4px; }
    .item-value { font-size: 0.82rem; color: #aaa; word-break: break-all; font-family: 'SF Mono', monospace; background: rgba(0,0,0,0.2); padding: 4px 8px; border-radius: 4px; display: inline-block; max-width: 100%; }
    .item-status { font-size: 0.75rem; margin-top: 4px; }
    .item-issues { font-size: 0.78rem; color: #f59e0b; margin-top: 6px; }
    .item-rec { font-size: 0.78rem; color: #a78bfa; margin-top: 4px; }
    .missing { color: #666; font-style: italic; }
    .footer { text-align: center; color: #555; font-size: 0.8rem; margin-top: 40px; }
    @media print { body { background: #fff; color: #111; } .header h1 { -webkit-text-fill-color: #6366f1; } .section { background: #f5f5f5; border-color: #ddd; } .item-value { background: #eee; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>SEO Анализатор — Отчет</h1>
    <div class="score ${analysis.score >= 90 ? 'score-90' : analysis.score >= 70 ? 'score-70' : analysis.score >= 50 ? 'score-50' : 'score-0'}">${analysis.score}/100</div>
    <div class="meta">${analysis.url} • ${dateStr}</div>
  </div>
  ${sections.join('')}
  <div class="footer">Сгенерировано SEO Анализатором • ${dateStr}</div>
</body>
</html>`;
}

export function generatePdf(analysis) {
  const html = generateHtmlReport(analysis);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    downloadFile(html, `seo-report.html`, 'text/html;charset=utf-8');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.document.title = `SEO Отчет — ${analysis.url}`;
  printWindow.addEventListener('load', () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  });
}

export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
