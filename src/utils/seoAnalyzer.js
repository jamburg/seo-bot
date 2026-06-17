const CTA_WORDS = ['узнать', 'скачать', 'получить', 'попробовать', 'купить', 'заказать', 'начать', 'смотреть', 'читать', 'регистрация', 'бесплатно', 'скидка', 'акция', 'learn', 'download', 'get', 'try', 'buy', 'order', 'start', 'watch', 'read', 'free', 'discount', 'sale', 'register', 'sign up', 'join'];

const GENERIC_TITLES = ['home', 'index', 'untitled', 'главная', 'страница', 'page', 'site', 'website', 'default', 'new page', 'about', 'about us'];

function getMetaByName(doc, name) {
  const el = doc.querySelector(`meta[name="${name}"], meta[name="${name.toLowerCase()}"]`);
  return el?.getAttribute('content')?.trim() || '';
}

function getMetaByProperty(doc, property) {
  const el = doc.querySelector(`meta[property="${property}"]`);
  return el?.getAttribute('content')?.trim() || '';
}

function analyzeTitle(doc) {
  const el = doc.querySelector('title');
  const content = el?.textContent?.trim() || '';
  const length = content.length;
  const issues = [];
  const recommendations = [];

  if (!content) {
    return { content: '(отсутствует)', length: 0, status: 'error', issues: ['Тег <title> отсутствует или пуст'], recommendations: ['Добавьте уникальный тег <title> на каждую страницу (50-60 символов)'] };
  }

  let status = 'success';

  if (length < 30) {
    status = 'error';
    issues.push(`Слишком короткий: ${length} симв. (мин. 50)`);
    recommendations.push('Увеличьте заголовок до 50-60 символов');
  } else if (length < 50) {
    status = 'warning';
    issues.push(`Маловат: ${length} симв. (рекомендуется 50-60)`);
    recommendations.push('Добавьте ключевые слова в заголовок');
  } else if (length <= 60) {
    recommendations.push('Идеальная длина заголовка');
  } else if (length <= 70) {
    status = 'warning';
    issues.push(`Немного длинноват: ${length} симв. (рекомендуется 50-60)`);
    recommendations.push('Сократите заголовок до 60 символов, чтобы он не обрезался в выдаче');
  } else {
    status = 'error';
    issues.push(`Слишком длинный: ${length} симв. (рекомендуется 50-60)`);
    recommendations.push('Обрежьте заголовок до 60 символов');
  }

  if (content.length > 0 && GENERIC_TITLES.some(t => content.toLowerCase() === t)) {
    status = 'error';
    issues.push('Слишком общий заголовок');
    recommendations.push('Используйте уникальный описательный заголовок');
  }

  return { content, length, status, issues, recommendations };
}

function analyzeDescription(doc) {
  const content = getMetaByName(doc, 'description');
  const length = content.length;
  const issues = [];
  const recommendations = [];

  if (!content) {
    return { content: '(отсутствует)', length: 0, status: 'error', issues: ['Мета-тег description отсутствует'], recommendations: ['Добавьте мета-описание (150-160 символов с ключевыми словами)'] };
  }

  let status = 'success';

  if (length < 120) {
    status = 'error';
    issues.push(`Слишком короткое: ${length} симв. (мин. 120)`);
    recommendations.push('Увеличьте описание до 150-160 символов');
  } else if (length < 150) {
    status = 'warning';
    issues.push(`Маловато: ${length} симв. (рекомендуется 150-160)`);
    recommendations.push('Добавьте больше деталей в описание');
  } else if (length <= 160) {
    recommendations.push('Идеальная длина описания');
  } else if (length <= 180) {
    status = 'warning';
    issues.push(`Немного длинновато: ${length} симв. (рекомендуется 150-160)`);
    recommendations.push('Сократите описание до 160 символов');
  } else {
    status = 'error';
    issues.push(`Слишком длинное: ${length} симв. (рекомендуется 150-160)`);
    recommendations.push('Обрежьте описание до 160 символов');
  }

  const hasCta = CTA_WORDS.some(w => content.toLowerCase().includes(w));
  if (!hasCta) {
    issues.push('Нет призыва к действию (CTA)');
    recommendations.push('Добавьте призыв к действию: "узнать", "скачать", "купить" и т.д.');
  }

  return { content, length, status, issues, recommendations };
}

function analyzeOGTags(doc, url) {
  const tags = {
    title: { content: getMetaByProperty(doc, 'og:title') },
    description: { content: getMetaByProperty(doc, 'og:description') },
    image: { content: getMetaByProperty(doc, 'og:image') },
    url: { content: getMetaByProperty(doc, 'og:url') },
    type: { content: getMetaByProperty(doc, 'og:type') },
    siteName: { content: getMetaByProperty(doc, 'og:site_name') },
  };
  const issues = [];
  const recommendations = [];

  for (const [, tag] of Object.entries(tags)) {
    tag.status = tag.content ? 'success' : 'warning';
  }

  if (!tags.title.content) {
    issues.push('og:title отсутствует');
    recommendations.push('Добавьте og:title для правильного отображения в соцсетях');
  }
  if (!tags.description.content) {
    issues.push('og:description отсутствует');
    recommendations.push('Добавьте og:description (до 200 символов)');
  }
  if (!tags.image.content) {
    issues.push('og:image отсутствует');
    recommendations.push('Добавьте og:image (минимум 1200x630px)');
    tags.image.status = 'error';
  } else if (!tags.image.content.startsWith('http')) {
    tags.image.status = 'warning';
    issues.push('og:image должен быть абсолютным URL');
    recommendations.push('Укажите полный URL изображения');
  }
  if (!tags.url.content) {
    issues.push('og:url отсутствует');
    recommendations.push('Добавьте og:url с каноническим URL страницы');
  } else if (url) {
    const normUrl = (u) => u.replace(/\/$/, '').replace(/^https?:\/\//, '').replace(/\?.*$/, '');
    if (normUrl(tags.url.content) !== normUrl(url)) {
      tags.url.status = 'warning';
      issues.push('og:url не совпадает с URL страницы');
      recommendations.push('Укажите текущий URL страницы');
    }
  }
  if (!tags.type.content) {
    tags.type.status = 'info';
    issues.push('og:type не указан (рекомендуется)');
    recommendations.push('Добавьте og:type (website, article, product и т.д.)');
  }

  const presentCount = Object.values(tags).filter(t => t.content).length;
  const overallStatus = presentCount >= 4 ? 'success' : presentCount >= 2 ? 'warning' : 'error';

  return { ...tags, overallStatus, issues, recommendations, presentCount };
}

function analyzeTwitterTags(doc) {
  const tags = {
    card: { content: getMetaByName(doc, 'twitter:card') },
    site: { content: getMetaByName(doc, 'twitter:site') },
    title: { content: getMetaByName(doc, 'twitter:title') },
    description: { content: getMetaByName(doc, 'twitter:description') },
    image: { content: getMetaByName(doc, 'twitter:image') },
  };
  const issues = [];
  const recommendations = [];

  for (const [, tag] of Object.entries(tags)) {
    tag.status = tag.content ? 'success' : 'warning';
  }

  if (!tags.card.content) {
    issues.push('twitter:card отсутствует');
    recommendations.push('Добавьте twitter:card (summary_large_image)');
    tags.card.status = 'error';
  } else if (!['summary', 'summary_large_image', 'app', 'player'].includes(tags.card.content)) {
    tags.card.status = 'warning';
    issues.push(`Нестандартное значение twitter:card: "${tags.card.content}"`);
    recommendations.push('Используйте: summary_large_image');
  }
  if (!tags.title.content) {
    issues.push('twitter:title отсутствует');
    recommendations.push('Добавьте twitter:title');
  }
  if (!tags.description.content) {
    issues.push('twitter:description отсутствует');
    recommendations.push('Добавьте twitter:description');
  }
  if (!tags.image.content) {
    tags.image.status = 'error';
    issues.push('twitter:image отсутствует');
    recommendations.push('Добавьте twitter:image для отображения картинки');
  }

  const presentCount = Object.values(tags).filter(t => t.content).length;
  const overallStatus = presentCount >= 3 ? 'success' : presentCount >= 2 ? 'warning' : 'error';

  return { ...tags, overallStatus, issues, recommendations, presentCount };
}

function analyzeCanonical(doc, url) {
  const el = doc.querySelector('link[rel="canonical"]');
  const content = el?.getAttribute('href')?.trim() || '';
  const issues = [];
  const recommendations = [];

  if (!content) {
    return { content: '(отсутствует)', status: 'warning', issues: ['Канонический URL не указан'], recommendations: ['Добавьте <link rel="canonical"> для предотвращения дублирования контента'] };
  }

  let status = 'success';

  if (!content.startsWith('http')) {
    status = 'warning';
    issues.push('Канонический URL должен быть абсолютным');
    recommendations.push('Укажите полный URL в canonical');
  }

  if (url) {
    const normUrl = (u) => u.replace(/\/$/, '').replace(/^https?:\/\//, '').split('?')[0].split('#')[0];
    if (normUrl(content) !== normUrl(url)) {
      status = 'info';
      issues.push('Канонический URL отличается от URL страницы');
      recommendations.push('Убедитесь, что это корректный canonical (если страница имеет дубли)');
    }
  }

  return { content, status, issues, recommendations };
}

function analyzeViewport(doc) {
  const content = getMetaByName(doc, 'viewport');

  if (!content) {
    return { content: '(отсутствует)', status: 'error', issues: ['Мета-тег viewport не указан'], recommendations: ['Добавьте <meta name="viewport" content="width=device-width, initial-scale=1">'] };
  }

  const hasWidth = content.includes('width=device-width');
  const hasScale = content.includes('initial-scale');

  if (!hasWidth || !hasScale) {
    return { content, status: 'warning', issues: ['viewport настроен некорректно'], recommendations: ['Используйте: width=device-width, initial-scale=1'] };
  }

  return { content, status: 'success', issues: [], recommendations: ['Viewport настроен правильно'] };
}

function analyzeCharset(doc) {
  const meta1 = doc.querySelector('meta[charset]');
  const meta2 = doc.querySelector('meta[http-equiv="Content-Type"]');

  const content = meta1?.getAttribute('charset') || meta2?.getAttribute('content') || '';

  if (!content) {
    return { content: '(отсутствует)', status: 'error', issues: ['Кодировка не указана'], recommendations: ['Добавьте <meta charset="UTF-8">'] };
  }

  const isUtf8 = content.toLowerCase().includes('utf-8') || content.toLowerCase().includes('utf8');
  return {
    content: isUtf8 ? 'UTF-8' : content,
    status: isUtf8 ? 'success' : 'warning',
    issues: isUtf8 ? [] : [`Используется ${content}, рекомендуется UTF-8`],
    recommendations: isUtf8 ? ['UTF-8 — отличный выбор'] : ['Переключитесь на UTF-8'],
  };
}

function analyzeRobots(doc) {
  const content = getMetaByName(doc, 'robots');
  const issues = [];
  const recommendations = [];

  if (!content) {
    return { content: '(отсутствует)', status: 'info', issues: ['Мета-тег robots не указан (используется поведение по умолчанию)'], recommendations: ['Добавьте <meta name="robots" content="index, follow"> для важных страниц'] };
  }

  const lower = content.toLowerCase();
  let status = 'success';

  if (lower.includes('noindex')) {
    status = 'info';
    issues.push('Страница закрыта от индексации (noindex)');
    recommendations.push('Убедитесь, что это намеренно');
  }
  if (lower.includes('nofollow')) {
    issues.push('Ссылки на странице не передают вес (nofollow)');
  }

  return { content, status, issues, recommendations };
}

function analyzeH1(doc) {
  const h1s = doc.querySelectorAll('h1');
  const count = h1s.length;
  const content = h1s[0]?.textContent?.trim() || '';
  const issues = [];
  const recommendations = [];

  if (count === 0) {
    return { content: '(отсутствует)', count: 0, status: 'error', issues: ['Тег H1 не найден'], recommendations: ['Добавьте один H1 с основным ключевым словом'] };
  }

  if (count > 1) {
    return { content, count, status: 'warning', issues: [`Найдено ${count} H1 (должен быть 1)`], recommendations: ['Оставьте только один H1 на странице'] };
  }

  if (content.length < 10) {
    return { content, count, status: 'warning', issues: ['H1 слишком короткий'], recommendations: ['Сделайте H1 более информативным (10-70 символов)'] };
  }

  return { content, count, status: 'success', issues: [], recommendations: ['Один H1 — отлично'] };
}

function analyzeLang(doc) {
  const html = doc.querySelector('html');
  const lang = html?.getAttribute('lang') || '';

  if (!lang) {
    return { content: '(отсутствует)', status: 'warning', issues: ['Атрибут lang у <html> не указан'], recommendations: ['Добавьте lang="ru" для русскоязычных страниц'] };
  }

  return { content: lang, status: 'success', issues: [], recommendations: ['Атрибут lang присутствует'] };
}

function analyzeFavicon(doc) {
  const links = doc.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
  const favicons = Array.from(links).map(el => ({ rel: el.getAttribute('rel'), href: el.getAttribute('href') }));

  if (favicons.length === 0) {
    return { content: '(отсутствует)', count: 0, status: 'warning', issues: ['Favicon не найден'], recommendations: ['Добавьте favicon для узнаваемости вкладки'] };
  }

  return { content: favicons[0].href, count: favicons.length, status: 'success', issues: [], recommendations: ['Favicon присутствует'] };
}

function analyzeStructuredData(doc) {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  const count = scripts.length;
  const types = [];

  if (count === 0) {
    return { present: false, count: 0, types: [], status: 'warning', issues: ['Структурированные данные (JSON-LD) не найдены'], recommendations: ['Добавьте JSON-LD разметку для расширенных сниппетов'] };
  }

  scripts.forEach(el => {
    try {
      const data = JSON.parse(el.textContent);
      if (data['@type']) types.push(data['@type']);
      if (data['@graph']) {
        for (const item of data['@graph']) {
          if (item['@type']) types.push(item['@type']);
        }
      }
    } catch {}
  });

  return {
    present: true,
    count,
    types: [...new Set(types)],
    status: 'success',
    issues: [],
    recommendations: [types.length > 0 ? `Найдены типы: ${[...new Set(types)].join(', ')}` : 'Структурированные данные присутствуют'],
  };
}

function analyzeHeadings(doc) {
  const tags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  const counts = {};
  const contents = {};
  let maxLevel = 0;
  const issues = [];
  const recommendations = [];

  for (const tag of tags) {
    const els = doc.querySelectorAll(tag);
    counts[tag] = els.length;
    if (els.length > 0) {
      contents[tag] = Array.from(els).map(e => e.textContent.trim());
      maxLevel = Math.max(maxLevel, parseInt(tag[1]));
    }
  }

  if (maxLevel === 0) {
    return { counts, contents, status: 'error', issues: ['Ни одного заголовка h1-h6 не найдено'], recommendations: ['Добавьте иерархию заголовков (h1, h2, h3...)'] };
  }

  let status = 'success';
  if (counts['h1'] === 0) {
    status = 'error';
    issues.push('Нет h1');
    recommendations.push('Каждая страница должна иметь один h1');
  }
  if (counts['h1'] > 1) {
    status = 'warning';
    issues.push(`h1 встречается ${counts['h1']} раз`);
  }
  if (counts['h2'] === 0 && counts['h3'] > 0) {
    status = 'warning';
    issues.push('Есть h3, но нет h2 — нарушена иерархия');
    recommendations.push('Соблюдайте иерархию: h1 → h2 → h3');
  }

  return { counts, contents, status, issues, recommendations };
}

function analyzeLinks(doc, baseUrl) {
  const allLinks = doc.querySelectorAll('a[href]');
  const base = baseUrl ? new URL(baseUrl) : null;
  const internal = [];
  const external = [];
  const nofollow = [];
  const broken = [];
  const issues = [];
  const recommendations = [];

  for (const link of allLinks) {
    const href = link.getAttribute('href').trim();
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue;

    let isExternal = false;
    try {
      const url = new URL(href, baseUrl);
      isExternal = base && url.hostname !== base.hostname;
    } catch {
      broken.push(href);
      continue;
    }

    if (isExternal) {
      external.push(href);
    } else {
      internal.push(href);
    }

    const rel = link.getAttribute('rel') || '';
    if (rel.includes('nofollow')) {
      nofollow.push(href);
    }
  }

  if (internal.length === 0 && external.length > 0) {
    issues.push('Нет внутренних ссылок');
    recommendations.push('Добавьте ссылки на другие страницы сайта');
  }
  if (external.length === 0 && internal.length > 0) {
    issues.push('Нет внешних ссылок');
  }
  if (nofollow.length > internal.length * 0.5) {
    issues.push('Более 50% ссылок с nofollow');
    recommendations.push('Используйте nofollow только для внешних ссылок');
  }

  const total = internal.length + external.length;
  const status = total > 0 ? 'success' : 'warning';
  return { total, internal: internal.length, external: external.length, nofollow: nofollow.length, broken: broken.length, status, issues, recommendations };
}

function analyzeContentRatio(doc, html) {
  const body = doc.querySelector('body');
  const textContent = body ? body.textContent.replace(/\s+/g, ' ').trim() : '';
  const textSize = new Blob([textContent]).size;
  const htmlSize = html.length;
  const ratio = htmlSize > 0 ? Math.round((textSize / htmlSize) * 100) : 0;

  const issues = [];
  const recommendations = [];
  let status = 'success';

  if (ratio < 5) {
    status = 'warning';
    issues.push(`Текст занимает только ${ratio}% от HTML`);
    recommendations.push('Увеличьте количество уникального контента на странице');
  } else if (ratio < 10) {
    status = 'info';
    issues.push(`Content-to-code ratio: ${ratio}%`);
  } else if (ratio > 70) {
    status = 'warning';
    issues.push(`Очень высокое соотношение текста (${ratio}%) — возможен тонкий контент`);
  }

  return { textSize, htmlSize, ratio, status, issues, recommendations };
}

function analyzeKeywords(doc) {
  const body = doc.querySelector('body');
  if (!body) return { topKeywords: [], status: 'info', issues: [], recommendations: [] };

  const text = body.textContent.toLowerCase();
  const words = text.split(/[^а-яa-zё]+/).filter(w => w.length > 3 && w.length < 30);
  const stopWords = ['что', 'это', 'для', 'все', 'ещё', 'когда', 'может', 'чтобы', 'такие', 'также', 'меня', 'того', 'more', 'this', 'that', 'with', 'from', 'your', 'have', 'been', 'will', 'they', 'their', 'what', 'about', 'which', 'there'];
  const freq = {};

  for (const word of words) {
    if (stopWords.includes(word)) continue;
    freq[word] = (freq[word] || 0) + 1;
  }

  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10);

  if (sorted.length === 0) {
    return { topKeywords: [], status: 'info', issues: ['Не удалось извлечь ключевые слова'], recommendations: [] };
  }

  const topKeyword = sorted[0];
  const maxFreq = topKeyword[1];
  const issues = [];
  if (maxFreq > sorted.length > 1 ? sorted[1][1] * 5 : 100) {
    issues.push(`Возможен переспам: "${topKeyword[0]}" (${maxFreq} раз)`);
  }

  return { topKeywords: sorted, status: issues.length > 0 ? 'warning' : 'info', issues, recommendations: [] };
}

function analyzeMetaKeywords(doc) {
  const content = getMetaByName(doc, 'keywords');
  if (!content) {
    return { content: '(отсутствует)', status: 'info', issues: ['Мета-тег keywords не используется (это нормально, он устарел)'], recommendations: [] };
  }
  return { content: content.slice(0, 200), status: 'info', issues: ['Мета-тег keywords устарел и не влияет на ранжирование'], recommendations: ['Удалите keywords, сосредоточьтесь на качестве контента'] };
}

function analyzePerformance(doc, html, responseTime) {
  const scripts = doc.querySelectorAll('script[src]');
  const stylesheets = doc.querySelectorAll('link[rel="stylesheet"]');
  const images = doc.querySelectorAll('img');
  const imagesWithAlt = doc.querySelectorAll('img[alt]');
  const imagesWithoutAlt = doc.querySelectorAll('img:not([alt])');
  const asyncScripts = doc.querySelectorAll('script[src][async]');
  const deferScripts = doc.querySelectorAll('script[src][defer]');
  const lazyImages = doc.querySelectorAll('img[loading="lazy"]');

  const totalSize = html.length;
  const sizeLabel = totalSize > 500000 ? 'large' : totalSize > 100000 ? 'medium' : 'small';

  const imageCount = images.length;
  const noAltCount = imagesWithoutAlt.length;

  const blockingLinks = doc.querySelectorAll('link[rel="stylesheet"]').length;
  const blockingScripts = scripts.length - asyncScripts.length - deferScripts.length;

  const score = Math.min(100, Math.round(
    (responseTime < 500 ? 40 : responseTime < 1500 ? 25 : 10) +
    (totalSize < 50000 ? 20 : totalSize < 150000 ? 10 : 0) +
    (noAltCount === 0 ? 10 : noAltCount < imageCount / 2 ? 5 : 0) +
    (blockingScripts === 0 ? 15 : blockingScripts < 5 ? 10 : 0) +
    (blockingLinks < 3 ? 15 : 10)
  ));

  return {
    responseTime,
    htmlSize: totalSize,
    sizeLabel,
    externalScripts: scripts.length,
    externalStylesheets: stylesheets.length,
    totalImages: imageCount,
    imagesWithAlt: imagesWithAlt.length,
    imagesWithoutAlt: noAltCount,
    hasAsyncScripts: asyncScripts.length > 0,
    hasDeferScripts: deferScripts.length > 0,
    hasLazyImages: lazyImages.length > 0,
    blockingResources: blockingScripts + blockingLinks,
    score,
    status: score >= 70 ? 'success' : score >= 40 ? 'warning' : 'error',
  };
}

function calculateScore(analysis) {
  let score = 50;
  const weights = {
    title: 18,
    description: 18,
    ogTags: 12,
    twitterTags: 8,
    canonical: 4,
    viewport: 4,
    charset: 4,
    h1: 8,
    lang: 2,
    favicon: 2,
    structuredData: 4,
    headings: 4,
    links: 4,
    contentRatio: 4,
    keywords: 4,
    metaKeywords: 2,
  };

  const w = (v) => v.status === 'success' ? 1 : v.status === 'warning' ? 0.5 : 0;

  score += weights.title * w(analysis.title);
  score += weights.description * w(analysis.description);
  score += weights.ogTags * w({ status: analysis.ogTags.overallStatus });
  score += weights.twitterTags * w({ status: analysis.twitterTags.overallStatus });
  score += weights.canonical * w(analysis.canonical);
  score += weights.viewport * w(analysis.viewport);
  score += weights.charset * w(analysis.charset);
  score += weights.h1 * w(analysis.h1);
  score += weights.lang * w(analysis.lang);
  score += weights.favicon * w(analysis.favicon);
  score += weights.structuredData * w(analysis.structuredData);
  score += weights.headings * w(analysis.headings);
  score += weights.links * w(analysis.links);
  score += weights.contentRatio * w(analysis.contentRatio);
  score += weights.keywords * w(analysis.keywords);
  score += weights.metaKeywords * w(analysis.metaKeywords);

  return Math.min(100, Math.max(0, Math.round(score)));
}

function checkHasErrors(analysis) {
  const checks = [analysis.title, analysis.description, analysis.viewport, analysis.charset, analysis.h1, analysis.headings, analysis.links];
  return checks.some(c => c.status === 'error') ||
    analysis.ogTags.overallStatus === 'error' ||
    analysis.twitterTags.overallStatus === 'error';
}

function checkHasWarnings(analysis) {
  const checks = [analysis.title, analysis.description, analysis.canonical, analysis.lang, analysis.favicon, analysis.structuredData, analysis.viewport, analysis.charset, analysis.h1, analysis.headings, analysis.links, analysis.contentRatio, analysis.keywords];
  return checks.some(c => c.status === 'warning') ||
    analysis.ogTags.overallStatus === 'warning' ||
    analysis.twitterTags.overallStatus === 'warning';
}

export function analyzeSeo(html, url, responseTime, extraData) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const titleResult = analyzeTitle(doc);
  const descriptionResult = analyzeDescription(doc);
  const ogResult = analyzeOGTags(doc, url);
  const twitterResult = analyzeTwitterTags(doc);

  const analysis = {
    url,
    title: titleResult,
    description: descriptionResult,
    ogTags: ogResult,
    twitterTags: twitterResult,
    canonical: analyzeCanonical(doc, url),
    viewport: analyzeViewport(doc),
    charset: analyzeCharset(doc),
    robots: analyzeRobots(doc),
    h1: analyzeH1(doc),
    lang: analyzeLang(doc),
    favicon: analyzeFavicon(doc),
    structuredData: analyzeStructuredData(doc),
    performance: analyzePerformance(doc, html, responseTime),
    headings: analyzeHeadings(doc),
    links: analyzeLinks(doc, url),
    contentRatio: analyzeContentRatio(doc, html),
    keywords: analyzeKeywords(doc),
    metaKeywords: analyzeMetaKeywords(doc),
    server: extraData || null,
    metaCount: doc.querySelectorAll('meta').length,
    hasErrors: false,
    hasWarnings: false,
  };

  analysis.score = calculateScore(analysis);
  analysis.hasErrors = checkHasErrors(analysis);
  analysis.hasWarnings = checkHasWarnings(analysis);

  return analysis;
}
