import os
import time
import html
import logging
import asyncio
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import requests
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from telegram.constants import ParseMode

from bot_app.analyzer import analyze_seo

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

TOKEN = os.environ.get('BOT_TOKEN', '')
PROXY_URL = os.environ.get('PROXY_URL', 'https://seo-analiser.j-biz.ru/proxy.php')
PORT = int(os.environ.get('PORT', 8080))

PTB_APP = None


def status_emoji(status):
    return {'success': '✅', 'warning': '⚠️', 'error': '❌', 'info': 'ℹ️'}.get(status, '➖')


def fmt(s):
    return html.escape(str(s))


def status_line(label, status, value=''):
    v = f': {value}' if value else ''
    return f'{status_emoji(status)} <b>{fmt(label)}</b>{fmt(v)}'


def format_report(analysis):
    s = analysis['score']
    score_emoji = '🟢' if s >= 80 else '🟡' if s >= 50 else '🔴'
    url = analysis['url']

    lines = [
        f'{score_emoji} <b>SEO Анализ:</b> <a href="{url}">{fmt(url)}</a>',
        '━━━━━━━━━━━━━━━━━━',
        f'<b>Общий балл: {s}/100</b>\n',
        status_line('Title', analysis['title']['status'], analysis['title']['content'][:60]),
        f'   Длина: {analysis["title"]["length"]} симв.',
        status_line('Description', analysis['description']['status']),
        f'   Длина: {analysis["description"]["length"]} симв.',
        status_line('Кодировка', analysis['charset']['status'], analysis['charset']['content']),
        status_line('Viewport', analysis['viewport']['status']),
        status_line('Язык', analysis['lang']['status'], analysis['lang']['content']),
        status_line('Robots', analysis['robots']['status'], analysis['robots']['content'][:30]),
        status_line('Canonical', analysis['canonical']['status']),
        '━',
        status_line('H1', analysis['h1']['status'], analysis['h1']['content'][:50] if analysis['h1']['content'] != '(отсутствует)' else 'отсутствует'),
        status_line('Favicon', analysis['favicon']['status']),
        '',
        f'📢 <b>Open Graph:</b> {status_emoji(analysis["ogTags"]["overallStatus"])} ({analysis["ogTags"]["presentCount"]}/6)',
        status_line('og:title', analysis['ogTags']['title']['status']),
        status_line('og:description', analysis['ogTags']['description']['status']),
        status_line('og:image', analysis['ogTags']['image']['status']),
        status_line('og:url', analysis['ogTags']['url']['status']),
        '',
        f'🐦 <b>Twitter Cards:</b> {status_emoji(analysis["twitterTags"]["overallStatus"])} ({analysis["twitterTags"]["presentCount"]}/5)',
        status_line('twitter:card', analysis['twitterTags']['card']['status']),
        status_line('twitter:title', analysis['twitterTags']['title']['status']),
        status_line('twitter:description', analysis['twitterTags']['description']['status']),
        '',
        f'⚙️ <b>Технический SEO:</b>',
        status_line('Структ. данные', analysis['structuredData']['status']),
        f'   Мета-тегов: {analysis["metaCount"]}',
        '',
        f'🚀 <b>Производительность:</b> {status_emoji(analysis["performance"]["status"])} ({analysis["performance"]["score"]}/100)',
        f'   Время: {analysis["performance"]["responseTime"]:.0f}мс',
        f'   HTML: {analysis["performance"]["htmlSize"] // 1024} КБ',
        f'   Скрипты: {analysis["performance"]["externalScripts"]} | CSS: {analysis["performance"]["externalStylesheets"]}',
        f'   Изобр.: {analysis["performance"]["totalImages"]}',
        f'   Блокир.: {analysis["performance"]["blockingResources"]}',
        '',
        '━━━━━━━━━━━━━━━━━━',
        '🤖 <b>SEO Анализатор</b> | <a href="https://audit-seo.j-biz.ru">audit-seo.j-biz.ru</a>',
    ]

    return '\n'.join(lines)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html(
        '👋 <b>Привет! Я — SEO Анализатор Бот</b>\n\n'
        'Просто отправь мне URL сайта, и я проверю его мета-теги:\n'
        '• Title и Description\n'
        '• Open Graph (Facebook, VK, Telegram)\n'
        '• Twitter Cards\n'
        '• Технический SEO (H1, canonical, viewport и др.)\n'
        '• Структурированные данные\n'
        '• Производительность\n\n'
        'Пример: <code>https://example.com</code>'
    )


async def analyze_url(update: Update, context: ContextTypes.DEFAULT_TYPE):
    url = update.message.text.strip()

    if not url.startswith('http://') and not url.startswith('https://'):
        url = 'https://' + url

    msg = await update.message.reply_text('🔍 Анализирую сайт...')

    try:
        start_time = time.time()
        resp = requests.get(
            PROXY_URL,
            params={'url': url},
            timeout=25,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        data = resp.json()

        if 'error' in data:
            raise Exception(data['error'])

        response_time = (time.time() - start_time) * 1000
        html_content = data['html']
        actual_url = data.get('url', url)

        analysis = analyze_seo(html_content, actual_url, response_time)
        report = format_report(analysis)

        await msg.edit_text(report, parse_mode=ParseMode.HTML, disable_web_page_preview=True)

        if analysis['hasErrors'] or analysis['hasWarnings']:
            issues = []
            if analysis['ogTags']['issues']:
                issues.extend(analysis['ogTags']['issues'][:2])
            if analysis['twitterTags']['issues']:
                issues.extend(analysis['twitterTags']['issues'][:2])
            if analysis['title']['issues']:
                issues.extend(analysis['title']['issues'][:1])
            if issues:
                await update.message.reply_html(
                    '💡 <b>Рекомендации:</b>\n' + '\n'.join(f'• {fmt(i)}' for i in issues[:5])
                )

    except requests.exceptions.Timeout:
        await msg.edit_text('⏱ <b>Тайм-аут</b> при загрузке страницы. Проверьте URL.', parse_mode=ParseMode.HTML)
    except Exception as e:
        await msg.edit_text(f'❌ <b>Ошибка:</b> {fmt(str(e))}', parse_mode=ParseMode.HTML)


class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'OK')
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass


def run_health_server():
    server = HTTPServer(('0.0.0.0', PORT), HealthHandler)
    logger.info(f'Health server running on port {PORT}')
    server.serve_forever()


async def run_bot():
    global PTB_APP
    PTB_APP = Application.builder().token(TOKEN).build()
    PTB_APP.add_handler(CommandHandler('start', start))
    PTB_APP.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, analyze_url))

    logger.info('Бот запущен (polling)')
    await PTB_APP.run_polling()


def main():
    if not TOKEN:
        logger.error('BOT_TOKEN не задан!')
        return

    health_thread = threading.Thread(target=run_health_server, daemon=True)
    health_thread.start()

    asyncio.run(run_bot())


if __name__ == '__main__':
    main()
