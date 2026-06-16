import time
import json
import re
from urllib.parse import urlparse
from bs4 import BeautifulSoup

CTA_WORDS = ['узнать', 'скачать', 'получить', 'попробовать', 'купить', 'заказать', 'начать', 'смотреть', 'читать', 'регистрация', 'бесплатно', 'скидка', 'акция', 'learn', 'download', 'get', 'try', 'buy', 'order', 'start', 'watch', 'read', 'free', 'discount', 'sale', 'register', 'sign up', 'join']

GENERIC_TITLES = ['home', 'index', 'untitled', 'главная', 'страница', 'page', 'site', 'website', 'default', 'new page', 'about', 'about us']


def get_meta_by_name(soup, name):
    el = soup.find('meta', attrs={'name': name}) or soup.find('meta', attrs={'name': name.lower()})
    return el.get('content', '').strip() if el else ''


def get_meta_by_property(soup, prop):
    el = soup.find('meta', attrs={'property': prop})
    return el.get('content', '').strip() if el else ''


def analyze_title(soup):
    el = soup.find('title')
    content = el.get_text(strip=True) if el else ''
    length = len(content)
    issues = []
    recommendations = []

    if not content:
        return {'content': '(отсутствует)', 'length': 0, 'status': 'error', 'issues': ['Тег <title> отсутствует или пуст'], 'recommendations': ['Добавьте уникальный тег <title> на каждую страницу (50-60 символов)']}

    status = 'success'

    if length < 30:
        status = 'error'
        issues.append(f'Слишком короткий: {length} симв. (мин. 50)')
        recommendations.append('Увеличьте заголовок до 50-60 символов')
    elif length < 50:
        status = 'warning'
        issues.append(f'Маловат: {length} симв. (рекомендуется 50-60)')
        recommendations.append('Добавьте ключевые слова в заголовок')
    elif length <= 60:
        recommendations.append('Идеальная длина заголовка')
    elif length <= 70:
        status = 'warning'
        issues.append(f'Немного длинноват: {length} симв. (рекомендуется 50-60)')
        recommendations.append('Сократите заголовок до 60 символов, чтобы он не обрезался в выдаче')
    else:
        status = 'error'
        issues.append(f'Слишком длинный: {length} симв. (рекомендуется 50-60)')
        recommendations.append('Обрежьте заголовок до 60 символов')

    if content.lower() in GENERIC_TITLES:
        status = 'error'
        issues.append('Слишком общий заголовок')
        recommendations.append('Используйте уникальный описательный заголовок')

    return {'content': content, 'length': length, 'status': status, 'issues': issues, 'recommendations': recommendations}


def analyze_description(soup):
    content = get_meta_by_name(soup, 'description')
    length = len(content)
    issues = []
    recommendations = []

    if not content:
        return {'content': '(отсутствует)', 'length': 0, 'status': 'error', 'issues': ['Мета-тег description отсутствует'], 'recommendations': ['Добавьте мета-описание (150-160 символов с ключевыми словами)']}

    status = 'success'

    if length < 120:
        status = 'error'
        issues.append(f'Слишком короткое: {length} симв. (мин. 120)')
        recommendations.append('Увеличьте описание до 150-160 символов')
    elif length < 150:
        status = 'warning'
        issues.append(f'Маловато: {length} симв. (рекомендуется 150-160)')
        recommendations.append('Добавьте больше деталей в описание')
    elif length <= 160:
        recommendations.append('Идеальная длина описания')
    elif length <= 180:
        status = 'warning'
        issues.append(f'Немного длинновато: {length} симв. (рекомендуется 150-160)')
        recommendations.append('Сократите описание до 160 символов')
    else:
        status = 'error'
        issues.append(f'Слишком длинное: {length} симв. (рекомендуется 150-160)')
        recommendations.append('Обрежьте описание до 160 символов')

    lower = content.lower()
    has_cta = any(w in lower for w in CTA_WORDS)
    if not has_cta:
        issues.append('Нет призыва к действию (CTA)')
        recommendations.append('Добавьте призыв к действию: "узнать", "скачать", "купить" и т.д.')

    return {'content': content, 'length': length, 'status': status, 'issues': issues, 'recommendations': recommendations}


def analyze_og_tags(soup, url):
    tags = {
        'title': {'content': get_meta_by_property(soup, 'og:title')},
        'description': {'content': get_meta_by_property(soup, 'og:description')},
        'image': {'content': get_meta_by_property(soup, 'og:image')},
        'url': {'content': get_meta_by_property(soup, 'og:url')},
        'type': {'content': get_meta_by_property(soup, 'og:type')},
        'siteName': {'content': get_meta_by_property(soup, 'og:site_name')},
    }
    issues = []
    recommendations = []

    for tag in tags.values():
        tag['status'] = 'success' if tag['content'] else 'warning'

    if not tags['title']['content']:
        issues.append('og:title отсутствует')
        recommendations.append('Добавьте og:title для правильного отображения в соцсетях')
    if not tags['description']['content']:
        issues.append('og:description отсутствует')
        recommendations.append('Добавьте og:description (до 200 символов)')
    if not tags['image']['content']:
        issues.append('og:image отсутствует')
        recommendations.append('Добавьте og:image (минимум 1200x630px)')
        tags['image']['status'] = 'error'
    elif not tags['image']['content'].startswith('http'):
        tags['image']['status'] = 'warning'
        issues.append('og:image должен быть абсолютным URL')
        recommendations.append('Укажите полный URL изображения')
    if not tags['url']['content']:
        issues.append('og:url отсутствует')
        recommendations.append('Добавьте og:url с каноническим URL страницы')
    elif url:
        def norm_url(u):
            return re.sub(r'/$', '', re.sub(r'^https?://', '', u)).split('?')[0]
        if norm_url(tags['url']['content']) != norm_url(url):
            tags['url']['status'] = 'warning'
            issues.append('og:url не совпадает с URL страницы')
            recommendations.append('Укажите текущий URL страницы')
    if not tags['type']['content']:
        tags['type']['status'] = 'info'
        issues.append('og:type не указан (рекомендуется)')
        recommendations.append('Добавьте og:type (website, article, product и т.д.)')

    present_count = sum(1 for t in tags.values() if t['content'])
    if present_count >= 4:
        overall_status = 'success'
    elif present_count >= 2:
        overall_status = 'warning'
    else:
        overall_status = 'error'

    return {**tags, 'overallStatus': overall_status, 'issues': issues, 'recommendations': recommendations, 'presentCount': present_count}


def analyze_twitter_tags(soup):
    tags = {
        'card': {'content': get_meta_by_name(soup, 'twitter:card')},
        'site': {'content': get_meta_by_name(soup, 'twitter:site')},
        'title': {'content': get_meta_by_name(soup, 'twitter:title')},
        'description': {'content': get_meta_by_name(soup, 'twitter:description')},
        'image': {'content': get_meta_by_name(soup, 'twitter:image')},
    }
    issues = []
    recommendations = []

    for tag in tags.values():
        tag['status'] = 'success' if tag['content'] else 'warning'

    if not tags['card']['content']:
        issues.append('twitter:card отсутствует')
        recommendations.append('Добавьте twitter:card (summary_large_image)')
        tags['card']['status'] = 'error'
    elif tags['card']['content'] not in ['summary', 'summary_large_image', 'app', 'player']:
        tags['card']['status'] = 'warning'
        issues.append(f'Нестандартное значение twitter:card: "{tags["card"]["content"]}"')
        recommendations.append('Используйте: summary_large_image')
    if not tags['title']['content']:
        issues.append('twitter:title отсутствует')
        recommendations.append('Добавьте twitter:title')
    if not tags['description']['content']:
        issues.append('twitter:description отсутствует')
        recommendations.append('Добавьте twitter:description')
    if not tags['image']['content']:
        tags['image']['status'] = 'error'
        issues.append('twitter:image отсутствует')
        recommendations.append('Добавьте twitter:image для отображения картинки')

    present_count = sum(1 for t in tags.values() if t['content'])
    if present_count >= 3:
        overall_status = 'success'
    elif present_count >= 2:
        overall_status = 'warning'
    else:
        overall_status = 'error'

    return {**tags, 'overallStatus': overall_status, 'issues': issues, 'recommendations': recommendations, 'presentCount': present_count}


def analyze_canonical(soup, url):
    el = soup.find('link', rel='canonical')
    content = el.get('href', '').strip() if el else ''
    issues = []
    recommendations = []

    if not content:
        return {'content': '(отсутствует)', 'status': 'warning', 'issues': ['Канонический URL не указан'], 'recommendations': ['Добавьте <link rel="canonical"> для предотвращения дублирования контента']}

    status = 'success'

    if not content.startswith('http'):
        status = 'warning'
        issues.append('Канонический URL должен быть абсолютным')
        recommendations.append('Укажите полный URL в canonical')

    if url:
        def norm_url(u):
            u = re.sub(r'/$', '', re.sub(r'^https?://', '', u))
            u = u.split('?')[0].split('#')[0]
            return u
        if norm_url(content) != norm_url(url):
            status = 'info'
            issues.append('Канонический URL отличается от URL страницы')
            recommendations.append('Убедитесь, что это корректный canonical (если страница имеет дубли)')

    return {'content': content, 'status': status, 'issues': issues, 'recommendations': recommendations}


def analyze_viewport(soup):
    content = get_meta_by_name(soup, 'viewport')

    if not content:
        return {'content': '(отсутствует)', 'status': 'error', 'issues': ['Мета-тег viewport не указан'], 'recommendations': ['Добавьте <meta name="viewport" content="width=device-width, initial-scale=1">']}

    has_width = 'width=device-width' in content
    has_scale = 'initial-scale' in content

    if not has_width or not has_scale:
        return {'content': content, 'status': 'warning', 'issues': ['viewport настроен некорректно'], 'recommendations': ['Используйте: width=device-width, initial-scale=1']}

    return {'content': content, 'status': 'success', 'issues': [], 'recommendations': ['Viewport настроен правильно']}


def analyze_charset(soup):
    meta1 = soup.find('meta', attrs={'charset': True})
    meta2 = soup.find('meta', attrs={'http-equiv': 'Content-Type'})

    content = ''
    if meta1:
        content = meta1.get('charset', '')
    elif meta2:
        content = meta2.get('content', '')

    if not content:
        return {'content': '(отсутствует)', 'status': 'error', 'issues': ['Кодировка не указана'], 'recommendations': ['Добавьте <meta charset="UTF-8">']}

    is_utf8 = 'utf-8' in content.lower() or 'utf8' in content.lower()
    return {
        'content': 'UTF-8' if is_utf8 else content,
        'status': 'success' if is_utf8 else 'warning',
        'issues': [] if is_utf8 else [f'Используется {content}, рекомендуется UTF-8'],
        'recommendations': ['UTF-8 — отличный выбор'] if is_utf8 else ['Переключитесь на UTF-8'],
    }


def analyze_robots(soup):
    content = get_meta_by_name(soup, 'robots')
    issues = []
    recommendations = []

    if not content:
        return {'content': '(отсутствует)', 'status': 'info', 'issues': ['Мета-тег robots не указан (используется поведение по умолчанию)'], 'recommendations': ['Добавьте <meta name="robots" content="index, follow"> для важных страниц']}

    lower = content.lower()
    status = 'success'

    if 'noindex' in lower:
        status = 'info'
        issues.append('Страница закрыта от индексации (noindex)')
        recommendations.append('Убедитесь, что это намеренно')
    if 'nofollow' in lower:
        issues.append('Ссылки на странице не передают вес (nofollow)')

    return {'content': content, 'status': status, 'issues': issues, 'recommendations': recommendations}


def analyze_h1(soup):
    h1s = soup.find_all('h1')
    count = len(h1s)
    content = h1s[0].get_text(strip=True) if h1s else ''
    issues = []
    recommendations = []

    if count == 0:
        return {'content': '(отсутствует)', 'count': 0, 'status': 'error', 'issues': ['Тег H1 не найден'], 'recommendations': ['Добавьте один H1 с основным ключевым словом']}

    if count > 1:
        return {'content': content, 'count': count, 'status': 'warning', 'issues': [f'Найдено {count} H1 (должен быть 1)'], 'recommendations': ['Оставьте только один H1 на странице']}

    if len(content) < 10:
        return {'content': content, 'count': count, 'status': 'warning', 'issues': ['H1 слишком короткий'], 'recommendations': ['Сделайте H1 более информативным (10-70 символов)']}

    return {'content': content, 'count': count, 'status': 'success', 'issues': [], 'recommendations': ['Один H1 — отлично']}


def analyze_lang(soup):
    html = soup.find('html')
    lang = html.get('lang', '') if html else ''

    if not lang:
        return {'content': '(отсутствует)', 'status': 'warning', 'issues': ['Атрибут lang у <html> не указан'], 'recommendations': ['Добавьте lang="ru" для русскоязычных страниц']}

    return {'content': lang, 'status': 'success', 'issues': [], 'recommendations': ['Атрибут lang присутствует']}


def analyze_favicon(soup):
    selectors = ['link[rel="icon"]', 'link[rel="shortcut icon"]', 'link[rel="apple-touch-icon"]']
    favicons = []
    for sel in selectors:
        for el in soup.select(sel):
            favicons.append({'rel': el.get('rel', [''])[0] if el.get('rel') else '', 'href': el.get('href', '')})

    if not favicons:
        return {'content': '(отсутствует)', 'count': 0, 'status': 'warning', 'issues': ['Favicon не найден'], 'recommendations': ['Добавьте favicon для узнаваемости вкладки']}

    return {'content': favicons[0]['href'], 'count': len(favicons), 'status': 'success', 'issues': [], 'recommendations': ['Favicon присутствует']}


def analyze_structured_data(soup):
    scripts = soup.find_all('script', type='application/ld+json')
    count = len(scripts)
    types = []

    if count == 0:
        return {'present': False, 'count': 0, 'types': [], 'status': 'warning', 'issues': ['Структурированные данные (JSON-LD) не найдены'], 'recommendations': ['Добавьте JSON-LD разметку для расширенных сниппетов']}

    for script in scripts:
        try:
            data = json.loads(script.get_text())
            if isinstance(data, list):
                for item in data:
                    if '@type' in item:
                        types.append(item['@type'])
            else:
                if '@type' in data:
                    types.append(data['@type'])
                if '@graph' in data:
                    for item in data['@graph']:
                        if '@type' in item:
                            types.append(item['@type'])
        except json.JSONDecodeError:
            pass

    types = list(set(types))
    return {
        'present': True,
        'count': count,
        'types': types,
        'status': 'success',
        'issues': [],
        'recommendations': [f'Найдены типы: {", ".join(types)}' if types else 'Структурированные данные присутствуют'],
    }


def analyze_performance(soup, html, response_time):
    scripts = soup.find_all('script', src=True)
    stylesheets = soup.find_all('link', rel='stylesheet')
    images = soup.find_all('img')
    images_with_alt = soup.find_all('img', alt=True)
    images_without_alt = [img for img in images if not img.get('alt')]
    async_scripts = soup.find_all('script', src=True, async=True)
    defer_scripts = soup.find_all('script', src=True, defer=True)
    lazy_images = soup.find_all('img', loading='lazy')

    total_size = len(html)
    if total_size > 500000:
        size_label = 'large'
    elif total_size > 100000:
        size_label = 'medium'
    else:
        size_label = 'small'

    image_count = len(images)
    no_alt_count = len(images_without_alt)

    blocking_links = len(stylesheets)
    blocking_scripts = len(scripts) - len(async_scripts) - len(defer_scripts)

    score = min(100, round(
        (40 if response_time < 500 else 25 if response_time < 1500 else 10) +
        (20 if total_size < 50000 else 10 if total_size < 150000 else 0) +
        (10 if no_alt_count == 0 else 5 if no_alt_count < image_count / 2 else 0) +
        (15 if blocking_scripts == 0 else 10 if blocking_scripts < 5 else 0) +
        (15 if blocking_links < 3 else 10)
    ))

    return {
        'responseTime': round(response_time, 0),
        'htmlSize': total_size,
        'sizeLabel': size_label,
        'externalScripts': len(scripts),
        'externalStylesheets': len(stylesheets),
        'totalImages': image_count,
        'imagesWithAlt': len(images_with_alt),
        'imagesWithoutAlt': no_alt_count,
        'hasAsyncScripts': len(async_scripts) > 0,
        'hasDeferScripts': len(defer_scripts) > 0,
        'hasLazyImages': len(lazy_images) > 0,
        'blockingResources': blocking_scripts + blocking_links,
        'score': score,
        'status': 'success' if score >= 70 else 'warning' if score >= 40 else 'error',
    }


def calculate_score(analysis):
    score = 50
    weights = {
        'title': 20,
        'description': 20,
        'ogTags': 15,
        'twitterTags': 10,
        'canonical': 5,
        'viewport': 5,
        'charset': 5,
        'h1': 10,
        'lang': 3,
        'favicon': 2,
        'structuredData': 5,
    }

    def weight_val(status):
        return 1 if status == 'success' else 0.5 if status == 'warning' else 0

    score += weights['title'] * weight_val(analysis['title']['status'])
    score += weights['description'] * weight_val(analysis['description']['status'])
    score += weights['ogTags'] * weight_val(analysis['ogTags']['overallStatus'])
    score += weights['twitterTags'] * weight_val(analysis['twitterTags']['overallStatus'])
    score += weights['canonical'] * weight_val(analysis['canonical']['status'])
    score += weights['viewport'] * weight_val(analysis['viewport']['status'])
    score += weights['charset'] * weight_val(analysis['charset']['status'])
    score += weights['h1'] * weight_val(analysis['h1']['status'])
    score += weights['lang'] * weight_val(analysis['lang']['status'])
    score += weights['favicon'] * weight_val(analysis['favicon']['status'])
    score += weights['structuredData'] * weight_val(analysis['structuredData']['status'])

    return min(100, max(0, round(score)))


def check_has_errors(analysis):
    checks = [analysis['title'], analysis['description'], analysis['viewport'], analysis['charset'], analysis['h1']]
    return any(c['status'] == 'error' for c in checks) or \
        analysis['ogTags']['overallStatus'] == 'error' or \
        analysis['twitterTags']['overallStatus'] == 'error'


def check_has_warnings(analysis):
    checks = [analysis['title'], analysis['description'], analysis['canonical'], analysis['lang'],
              analysis['favicon'], analysis['structuredData'], analysis['viewport'], analysis['charset'], analysis['h1']]
    return any(c['status'] == 'warning' for c in checks) or \
        analysis['ogTags']['overallStatus'] == 'warning' or \
        analysis['twitterTags']['overallStatus'] == 'warning'


def analyze_seo(html, url, response_time):
    soup = BeautifulSoup(html, 'html.parser')

    analysis = {
        'url': url,
        'title': analyze_title(soup),
        'description': analyze_description(soup),
        'ogTags': analyze_og_tags(soup, url),
        'twitterTags': analyze_twitter_tags(soup),
        'canonical': analyze_canonical(soup, url),
        'viewport': analyze_viewport(soup),
        'charset': analyze_charset(soup),
        'robots': analyze_robots(soup),
        'h1': analyze_h1(soup),
        'lang': analyze_lang(soup),
        'favicon': analyze_favicon(soup),
        'structuredData': analyze_structured_data(soup),
        'performance': analyze_performance(soup, html, response_time),
        'metaCount': len(soup.find_all('meta')),
        'hasErrors': False,
        'hasWarnings': False,
    }

    analysis['score'] = calculate_score(analysis)
    analysis['hasErrors'] = check_has_errors(analysis)
    analysis['hasWarnings'] = check_has_warnings(analysis)

    return analysis
