import os
import time
import html
import json
import logging
import threading
import asyncio

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

TOKEN = os.environ.get('BOT_TOKEN', '')
PROXY_URL = os.environ.get('PROXY_URL', 'https://seo-analiser.j-biz.ru/proxy.php')

import uvicorn
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from telegram.constants import ParseMode

import shared
from vk_bot import run_vk_bot_polling
import requests as reqlib
from analyzer import analyze_seo
from stats import track_analysis, track_error, get_summary


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
    h = analysis['headings']
    l = analysis['links']
    c = analysis['contentRatio']
    k = analysis['keywords']
    p = analysis['performance']

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
        f'📐 <b>Заголовки:</b> {status_emoji(h["status"])}',
        f'   {" | ".join(f"{t.upper()}: {h["counts"][t]}" for t in ["h1","h2","h3","h4"] if h["counts"][t] > 0)}',
        '',
        f'🔗 <b>Ссылки:</b>',
        f'   Всего: {l["total"]} | Внутр.: {l["internal"]} | Внешн.: {l["external"]} | nofollow: {l["nofollow"]}',
        '',
        f'📝 <b>Контент:</b>',
        f'   Text/code ratio: {c["ratio"]}%',
        f'   meta keywords: {analysis["metaKeywords"]["content"][:40] if analysis["metaKeywords"]["content"] != "(отсутствует)" else "нет"}',
        f'   Топ слов: {", ".join(w for w, _ in k["topKeywords"][:5])}' if k['topKeywords'] else '   Топ слов: —',
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
        f'🚀 <b>Производительность:</b> {status_emoji(p["status"])} ({p["score"]}/100)',
        f'   Время: {p["responseTime"]:.0f}мс',
        f'   HTML: {p["htmlSize"] // 1024} КБ',
        f'   Скрипты: {p["externalScripts"]} | CSS: {p["externalStylesheets"]}',
        f'   Изобр.: {p["totalImages"]}',
        f'   Блокир.: {p["blockingResources"]}',
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
        '• Open Graph, Twitter Cards\n'
        '• Технический SEO (H1, canonical, viewport)\n'
        '• Заголовки, ссылки, контент\n'
        '• Структурированные данные\n'
        '• Производительность\n\n'
        'Команды:\n'
        '/stats — статистика бота\n'
        '/help — справка\n\n'
        'Пример: <code>https://example.com</code>'
    )


async def stats_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    s = get_summary()
    daily = s.get('dailyStats', {})
    days = list(daily.keys())[-7:]
    chart = ''
    if days:
        max_v = max(daily[d] for d in days) or 1
        for d in days:
            bar = '█' * int(daily[d] / max_v * 10) or '▏'
            chart += f'\n{d[-5:]} {bar} {daily[d]}'
    await update.message.reply_html(
        '📊 <b>Статистика бота</b>\n'
        '━━━━━━━━━━━━━━━━━━\n'
        f'📈 Всего анализов: <b>{s["totalAnalyses"]}</b>\n'
        f'👥 Уникальных пользователей: <b>{s["uniqueUsers"]}</b>\n'
        f'❌ Ошибок: <b>{s["errors"]}</b>\n'
        f'⏱ Запущен: <b>{s["startedAt"][:10]}</b> ({s["uptime"]} дн.)\n'
        f'━━━\n'
        f'📅 <b>Последние 7 дней:</b>{chart}'
    )


async def analyze_url(update: Update, context: ContextTypes.DEFAULT_TYPE):
    url = update.message.text.strip()
    user = update.effective_user
    user_id = user.id if user else 0
    username = user.username or user.first_name or 'unknown'

    if not url.startswith('http://') and not url.startswith('https://'):
        url = 'https://' + url

    msg = await update.message.reply_text('🔍 Анализирую сайт...')

    try:
        start_time = time.time()
        resp = reqlib.get(
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
        track_analysis(user_id, username, actual_url)

        if analysis['hasErrors'] or analysis['hasWarnings']:
            issues = []
            for section in ['ogTags', 'twitterTags', 'headings', 'links', 'contentRatio']:
                if analysis.get(section, {}).get('issues'):
                    issues.extend(analysis[section]['issues'][:1])
            if analysis['title']['issues']:
                issues.extend(analysis['title']['issues'][:1])
            if issues:
                await update.message.reply_html(
                    '💡 <b>Рекомендации:</b>\n' + '\n'.join(f'• {fmt(i)}' for i in issues[:5])
                )
    except reqlib.exceptions.Timeout:
        await msg.edit_text('⏱ <b>Тайм-аут</b> при загрузке страницы.', parse_mode=ParseMode.HTML)
        track_error(f'Timeout: {url}')
    except Exception as e:
        await msg.edit_text(f'❌ <b>Ошибка:</b> {fmt(str(e))}', parse_mode=ParseMode.HTML)
        track_error(f'{e}: {url}')


def run_bot_polling():
    try:
        if not TOKEN:
            logger.warning('BOT_TOKEN не задан — бот не запущен')
            return

        logger.info('Запуск Telegram бота...')
        app = Application.builder().token(TOKEN).build()
        app.add_handler(CommandHandler('start', start))
        app.add_handler(CommandHandler('stats', stats_command))
        app.add_handler(CommandHandler('help', start))
        app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, analyze_url))

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        async def start_bot():
            await app.initialize()
            await app.start()
            await app.updater.start_polling(drop_pending_updates=True)
            logger.info('Telegram бот запущен (polling)')
            while True:
                await asyncio.sleep(3600)

        loop.run_until_complete(start_bot())
    except Exception as e:
        logger.exception(f'Ошибка в боте: {e}')


PORT = int(os.environ.get('PORT', 10000))


def main():
    from api import app as fastapi_app
    PORT = int(os.environ.get('PORT', 10000))

    shared.tg_bot_thread = threading.Thread(target=run_bot_polling, daemon=True)
    shared.tg_bot_thread.start()

    shared.vk_bot_thread = threading.Thread(target=run_vk_bot_polling, daemon=True)
    shared.vk_bot_thread.start()

    logger.info(f'FastAPI сервер запущен на порту {PORT}')
    uvicorn.run(fastapi_app, host='0.0.0.0', port=PORT, log_level='info')


if __name__ == '__main__':
    main()
