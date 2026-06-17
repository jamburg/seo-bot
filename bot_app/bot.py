import os
import time
import html
import json
import logging
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime
import requests
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from telegram.constants import ParseMode

from analyzer import analyze_seo
from stats import track_analysis, track_error, get_summary

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

TOKEN = os.environ.get('BOT_TOKEN', '')
PROXY_URL = os.environ.get('PROXY_URL', 'https://seo-analiser.j-biz.ru/proxy.php')
PORT = int(os.environ.get('PORT', 8080))


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
        '• Open Graph (Facebook, VK, Telegram)\n'
        '• Twitter Cards\n'
        '• Технический SEO (H1, canonical, viewport и др.)\n'
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

    except requests.exceptions.Timeout:
        await msg.edit_text('⏱ <b>Тайм-аут</b> при загрузке страницы. Проверьте URL.', parse_mode=ParseMode.HTML)
        track_error(f'Timeout: {url}')
    except Exception as e:
        await msg.edit_text(f'❌ <b>Ошибка:</b> {fmt(str(e))}', parse_mode=ParseMode.HTML)
        track_error(f'{e}: {url}')


HTML_ADMIN = '''<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bot Admin</title>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family:-apple-system,'Segoe UI',sans-serif; background:#07071a; color:#f0f0f5; padding:40px; }}
h1 {{ font-size:1.6rem; margin-bottom:24px; }}
.cards {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px; margin-bottom:32px; }}
.card {{ background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:20px; }}
.card .num {{ font-size:2rem; font-weight:700; color:#a78bfa; }}
.card .label {{ font-size:0.85rem; color:#8888a8; margin-top:4px; }}
table {{ width:100%; border-collapse:collapse; font-size:0.9rem; }}
th,td {{ text-align:left; padding:10px 12px; border-bottom:1px solid rgba(255,255,255,0.06); }}
th {{ color:#8888a8; font-weight:600; font-size:0.8rem; text-transform:uppercase; }}
tr:hover td {{ background:rgba(255,255,255,0.03); }}
.section-title {{ color:#8888a8; font-size:0.85rem; text-transform:uppercase; letter-spacing:0.5px; margin:24px 0 12px; }}
</style>
</head>
<body>
<h1>&#x1F916; Bot Admin &mdash; SEO &#x410;&#x43D;&#x430;&#x43B;&#x438;&#x437;&#x430;&#x442;&#x43E;&#x440;</h1>
<div class="cards">
  <div class="card"><div class="num">{total}</div><div class="label">&#x420;&#x430;&#x437;&#x43E;&#x431;&#x440;&#x430;&#x43D;&#x43E; &#x441;&#x430;&#x439;&#x442;&#x43E;&#x432;</div></div>
  <div class="card"><div class="num">{users}</div><div class="label">&#x41F;&#x43E;&#x43B;&#x44C;&#x437;&#x43E;&#x432;&#x430;&#x442;&#x435;&#x43B;&#x435;&#x439;</div></div>
  <div class="card"><div class="num">{errors}</div><div class="label">&#x41E;&#x448;&#x438;&#x431;&#x43E;&#x43A;</div></div>
  <div class="card"><div class="num">{uptime}&#x434;&#x43D;</div><div class="label">&#x410;&#x43F;&#x442;&#x438;&#x43C;&#x430;</div></div>
</div>
<div class="section-title">&#x41F;&#x43E;&#x441;&#x43B;&#x435;&#x434;&#x43D;&#x438;&#x435; &#x430;&#x43D;&#x430;&#x43B;&#x438;&#x437;&#x44B; (&#x43F;&#x43E;&#x441;&#x43B;&#x435;&#x434;&#x43D;&#x438;&#x435; 7 &#x434;&#x43D;&#x435;&#x439;)</div>
<table>
<thead><tr><th>&#x414;&#x435;&#x43D;&#x44C;</th><th>&#x41A;&#x43E;&#x43B;-&#x432;&#x43E;</th><th>&#x413;&#x440;&#x430;&#x444;&#x438;&#x43A;</th></tr></thead>
<tbody>
{daily_rows}
</tbody>
</table>
<p style="opacity:0.4;font-size:0.8rem;margin-top:32px;">&#x410;&#x43F;&#x43F; &#x437;&#x430;&#x43F;&#x443;&#x449;&#x435;&#x43D;: {started}</p>
</body>
</html>'''


class AdminHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'OK')
        elif self.path == '/admin' or self.path == '/':
            try:
                s = get_summary()
                daily = s.get('dailyStats', {})
                days = list(daily.keys())[-7:]
                rows = []
                max_v = max(daily[d] for d in days) or 1
                for d in days:
                    bar = '█' * int(daily[d] / max_v * 10) or '▏'
                    rows.append(f'<tr><td>{d[-5:]}</td><td>{daily[d]}</td><td style="color:#a78bfa;">{bar}</td></tr>')
                if not rows:
                    rows.append('<tr><td colspan="3" style="color:#555570;text-align:center;">&#x41D;&#x435;&#x442; &#x434;&#x430;&#x43D;&#x43D;&#x44B;&#x445;</td></tr>')
                html_out = HTML_ADMIN.format(
                    total=s['totalAnalyses'],
                    users=s['uniqueUsers'],
                    errors=s['errors'],
                    uptime=s['uptime'],
                    started=s['startedAt'][:19].replace('T', ' '),
                    daily_rows='\n'.join(rows),
                )
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.end_headers()
                self.wfile.write(html_out.encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(f'Error: {e}'.encode())
        elif self.path == '/stats':
            try:
                s = get_summary()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(s, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(f'Error: {e}'.encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass


def run_http_server():
    server = HTTPServer(('0.0.0.0', PORT), AdminHandler)
    logger.info(f'HTTP server running on port {PORT}')
    server.serve_forever()


def main():
    if not TOKEN:
        logger.error('BOT_TOKEN не задан!')
        return

    http_thread = threading.Thread(target=run_http_server, daemon=True)
    http_thread.start()

    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler('start', start))
    app.add_handler(CommandHandler('stats', stats_command))
    app.add_handler(CommandHandler('help', start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, analyze_url))

    logger.info('Бот запущен (polling)')
    app.run_polling(drop_pending_updates=True)


if __name__ == '__main__':
    main()
