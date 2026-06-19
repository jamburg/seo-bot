import os
import re
import logging
import asyncio
import time

import requests
import shared

from analyzer import analyze_seo
from stats import track_analysis, track_error
from emailer import send_email_async
from urllib.parse import quote

logger = logging.getLogger(__name__)

VK_TOKEN = os.environ.get('VK_BOT_TOKEN', '')
PROXY_URL = os.environ.get('PROXY_URL', 'https://seo-analiser.j-biz.ru/proxy.php')


def status_emoji(status):
    return {'success': '\u2705', 'warning': '\u26a0\ufe0f', 'error': '\u274c', 'info': '\u2139\ufe0f'}.get(status, '\u2795')


def fmt(s):
    import html
    return html.unescape(str(s).replace('<', '&lt;').replace('>', '&gt;'))


def format_vk_report(analysis):
    s = analysis['score']
    emoji = '\U0001f7e2' if s >= 80 else '\U0001f7e1' if s >= 50 else '\U0001f534'
    url = analysis['url']
    h = analysis['headings']
    l = analysis['links']
    c = analysis['contentRatio']
    k = analysis['keywords']
    p = analysis['performance']

    lines = [
        f'{emoji} **SEO \u0410\u043d\u0430\u043b\u0438\u0437:** {url}',
        '\u2501' * 30,
        f'**\u041e\u0431\u0449\u0438\u0439 \u0431\u0430\u043b\u043b: {s}/100**',
        '',
        f'{status_emoji(analysis["title"]["status"])} **Title:** {analysis["title"]["content"][:60]}',
        f'   \u0414\u043b\u0438\u043d\u0430: {analysis["title"]["length"]} \u0441\u0438\u043c\u0432.',
        f'{status_emoji(analysis["description"]["status"])} **Description:** {analysis["description"]["length"]} \u0441\u0438\u043c\u0432.',
        f'{status_emoji(analysis["charset"]["status"])} **\u041a\u043e\u0434\u0438\u0440\u043e\u0432\u043a\u0430:** {analysis["charset"]["content"]}',
        f'{status_emoji(analysis["viewport"]["status"])} **Viewport**',
        f'{status_emoji(analysis["lang"]["status"])} **\u042f\u0437\u044b\u043a:** {analysis["lang"]["content"]}',
        f'{status_emoji(analysis["robots"]["status"])} **Robots:** {analysis["robots"]["content"][:30]}',
        f'{status_emoji(analysis["canonical"]["status"])} **Canonical**',
        '\u2501',
        f'{status_emoji(analysis["h1"]["status"])} **H1:** {analysis["h1"]["content"][:50] if analysis["h1"]["content"] != "(\u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442)" else "\u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442"}',
        f'{status_emoji(analysis["favicon"]["status"])} **Favicon**',
        '',
        f'\U0001f4d0 **\u0417\u0430\u0433\u043e\u043b\u043e\u0432\u043a\u0438:** ' + ' | '.join(f'{t.upper()}: {h["counts"][t]}' for t in ['h1', 'h2', 'h3', 'h4'] if h['counts'][t] > 0),
        '',
        f'\U0001f517 **\u0421\u0441\u044b\u043b\u043a\u0438:** \u0412\u0441\u0435\u0433\u043e: {l["total"]} | \u0412\u043d\u0443\u0442\u0440.: {l["internal"]} | \u0412\u043d\u0435\u0448\u043d.: {l["external"]}',
        '',
        f'\U0001f4dd **\u041a\u043e\u043d\u0442\u0435\u043d\u0442:** Text/code ratio: {c["ratio"]}%',
        f'   meta keywords: {analysis["metaKeywords"]["content"][:40] if analysis["metaKeywords"]["content"] != "(\u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442)" else "\u043d\u0435\u0442"}',
        f'   \u0422\u043e\u043f \u0441\u043b\u043e\u0432: {", ".join(w for w, _ in k["topKeywords"][:5])}' if k['topKeywords'] else '   \u0422\u043e\u043f \u0441\u043b\u043e\u0432: \u2014',
        '',
        f'\U0001f4e2 **Open Graph:** {status_emoji(analysis["ogTags"]["overallStatus"])} ({analysis["ogTags"]["presentCount"]}/6)',
        f'\U0001f426 **Twitter Cards:** {status_emoji(analysis["twitterTags"]["overallStatus"])} ({analysis["twitterTags"]["presentCount"]}/5)',
        '',
        f'\u2699\ufe0f **\u0422\u0435\u0445\u043d\u0438\u0447\u0435\u0441\u043a\u0438\u0439 SEO:**',
        f'{status_emoji(analysis["structuredData"]["status"])} **\u0421\u0442\u0440\u0443\u043a\u0442. \u0434\u0430\u043d\u043d\u044b\u0435** | \u041c\u0435\u0442\u0430-\u0442\u0435\u0433\u043e\u0432: {analysis["metaCount"]}',
        '',
        f'\U0001f680 **\u041f\u0440\u043e\u0438\u0437\u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c:** {status_emoji(p["status"])} ({p["score"]}/100)',
        f'   {p["responseTime"]:.0f}\u043c\u0441 | {p["htmlSize"] // 1024} \u041a\u0411 | {p["externalScripts"]} \u0441\u043a\u0440. | {p["externalStylesheets"]} CSS | {p["totalImages"]} \u0438\u0437\u043e\u0431\u0440.',
        '',
        '\u2501' * 30,
        '\U0001f916 **SEO \u0410\u043d\u0430\u043b\u0438\u0437\u0430\u0442\u043e\u0440** | audit-seo.j-biz.ru',
    ]
    return '\n'.join(lines)


URL_RE = re.compile(r'https?://[^\s]+')


async def run_vk_bot():
    from vkbottle import Bot, Keyboard, KeyboardButtonColor, Text, OpenLink
    from vkbottle.bot import Message

    bot = Bot(token=VK_TOKEN)

    @bot.on.message(text='/start')
    async def start_handler(message: Message):
        await message.answer(
            '\U0001f44b **\u041f\u0440\u0438\u0432\u0435\u0442! \u042f \u2014 SEO \u0410\u043d\u0430\u043b\u0438\u0437\u0430\u0442\u043e\u0440 \u0411\u043e\u0442**\n\n'
            '\u041f\u0440\u043e\u0441\u0442\u043e \u043e\u0442\u043f\u0440\u0430\u0432\u044c \u043c\u043d\u0435 URL \u0441\u0430\u0439\u0442\u0430, '
            '\u0438 \u044f \u043f\u0440\u043e\u0432\u0435\u0440\u044e \u0435\u0433\u043e \u043c\u0435\u0442\u0430-\u0442\u0435\u0433\u0438\n\n'
            '\u041a\u043e\u043c\u0430\u043d\u0434\u044b:\n'
            '/stats \u2014 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 \u0431\u043e\u0442\u0430\n'
            '/help \u2014 \u0441\u043f\u0440\u0430\u0432\u043a\u0430\n\n'
            '\u041f\u0440\u0438\u043c\u0435\u0440: https://example.com'
        )

    @bot.on.message(text='/help')
    async def help_handler(message: Message):
        await start_handler(message)

    @bot.on.message(text='/stats')
    async def stats_handler(message: Message):
        from stats import get_summary
        s = get_summary()
        daily = s.get('dailyStats', {})
        days = list(daily.keys())[-7:]
        chart = ''
        if days:
            max_v = max(daily[d] for d in days) or 1
            for d in days:
                bar = '\u2588' * int(daily[d] / max_v * 10) or '\u258f'
                chart += f'\n{d[-5:]} {bar} {daily[d]}'
        await message.answer(
            '\U0001f4ca **\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 \u0431\u043e\u0442\u0430**\n'
            '\u2501' * 30 + '\n'
            f'\U0001f4c8 \u0412\u0441\u0435\u0433\u043e \u0430\u043d\u0430\u043b\u0438\u0437\u043e\u0432: **{s["totalAnalyses"]}**\n'
            f'\U0001f465 \u0423\u043d\u0438\u043a\u0430\u043b\u044c\u043d\u044b\u0445 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435\u0439: **{s["uniqueUsers"]}**\n'
            f'\u274c \u041e\u0448\u0438\u0431\u043e\u043a: **{s["errors"]}**\n'
            f'\u23f1 \u0417\u0430\u043f\u0443\u0449\u0435\u043d: **{s["startedAt"][:10]}** ({s["uptime"]} \u0434\u043d.)\n'
            f'\u2501\u2501\u2501\n'
            f'\U0001f4c5 **\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0435 7 \u0434\u043d\u0435\u0439:**{chart}'
        )



    @bot.on.raw_event('message_new', dataclass=None)
    async def raw_msg(event):
        logger.info(f'VK raw event: type=message_new data={str(event)[:200]}')

    @bot.on.message()
    async def any_message(message: Message):
        text = (message.text or '').strip()
        logger.info(f'VK message received: id={message.from_id} text="{text[:50] if text else "(empty)"}"')

        if text == '\U0001f4e7 \u041f\u043e\u043b\u043d\u044b\u0439 \u043e\u0442\u0447\u0451\u0442 \u043d\u0430 email':
            shared.user_email_pending.add(message.from_id)
            await message.answer('\u2709\ufe0f \u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0432\u0430\u0448 email \u0434\u043b\u044f \u043f\u043e\u043b\u0443\u0447\u0435\u043d\u0438\u044f \u043e\u0442\u0447\u0451\u0442\u0430:')
            return

        if message.from_id in shared.user_email_pending:
            shared.user_email_pending.discard(message.from_id)
            entry = shared.last_reports.get(message.from_id)
            if not entry:
                await message.answer('\u26a0\ufe0f \u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0441\u0434\u0435\u043b\u0430\u0439\u0442\u0435 \u0430\u043d\u0430\u043b\u0438\u0437 \u2014 \u043e\u0442\u043f\u0440\u0430\u0432\u044c\u0442\u0435 URL \u0441\u0430\u0439\u0442\u0430')
                return
            if not text or '@' not in text:
                await message.answer('\u2709\ufe0f \u042d\u0442\u043e \u043d\u0435 email. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437:')
                return
            err = await send_email_async(text, f'SEO \u043e\u0442\u0447\u0451\u0442: {entry["url"]}', entry['report_text'])
            if err:
                await message.answer(f'\u274c \u041e\u0448\u0438\u0431\u043a\u0430: {err}')
            else:
                await message.answer('\u2705 \u041e\u0442\u0447\u0451\u0442 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d \u043d\u0430 email! \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u043f\u043e\u0447\u0442\u0443.')
            return

        if text.startswith('/email'):
            email_text = text.replace('/email', '', 1).strip()
            entry = shared.last_reports.get(message.from_id)
            if not entry:
                await message.answer('\u26a0\ufe0f \u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0441\u0434\u0435\u043b\u0430\u0439\u0442\u0435 \u0430\u043d\u0430\u043b\u0438\u0437 \u2014 \u043e\u0442\u043f\u0440\u0430\u0432\u044c\u0442\u0435 URL \u0441\u0430\u0439\u0442\u0430')
                return
            if not email_text or '@' not in email_text:
                await message.answer('\U0001f4e7 \u0423\u043a\u0430\u0436\u0438\u0442\u0435 email: /email your@email.ru')
                return
            err = await send_email_async(email_text, f'SEO \u043e\u0442\u0447\u0451\u0442: {entry["url"]}', entry['report_text'])
            if err:
                await message.answer(f'\u274c \u041e\u0448\u0438\u0431\u043a\u0430: {err}')
            else:
                await message.answer('\u2705 \u041e\u0442\u0447\u0451\u0442 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d \u043d\u0430 email! \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u043f\u043e\u0447\u0442\u0443.')
            return

        if text.startswith('/'):
            return

        match = URL_RE.search(text)
        if not match:
            await message.answer(
                '\u042f \u043d\u0435 \u043d\u0430\u0448\u0435\u043b URL \u0432 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0438.\n'
                '\u041e\u0442\u043f\u0440\u0430\u0432\u044c\u0442\u0435 \u0441\u0441\u044b\u043b\u043a\u0443 \u043d\u0430 \u0441\u0430\u0439\u0442 \u0434\u043b\u044f \u0430\u043d\u0430\u043b\u0438\u0437\u0430.'
            )
            return

        url = match.group(0)
        if not url.startswith('http'):
            url = 'https://' + url

        await message.answer('\U0001f50d \u0410\u043d\u0430\u043b\u0438\u0437\u0438\u0440\u0443\u044e \u0441\u0430\u0439\u0442...')

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
            report = format_vk_report(analysis)

            shared.last_reports[message.from_id] = {'report_text': report, 'url': actual_url}
            landing_url = f'https://audit-seo.j-biz.ru/?url={quote(actual_url, safe="")}'
            keyboard = (
                Keyboard(inline=True)
                .add(Text('\U0001f4e7 \u041f\u043e\u043b\u043d\u044b\u0439 \u043e\u0442\u0447\u0451\u0442 \u043d\u0430 email'), color=KeyboardButtonColor.PRIMARY)
                .add(OpenLink(landing_url), color=KeyboardButtonColor.SECONDARY)
            )
            await message.answer(report, keyboard=keyboard)
            track_analysis(message.from_id, f'vk_{message.from_id}', actual_url)

            if analysis['hasErrors'] or analysis['hasWarnings']:
                issues = []
                for section in ['ogTags', 'twitterTags', 'headings', 'links', 'contentRatio']:
                    if analysis.get(section, {}).get('issues'):
                        issues.extend(analysis[section]['issues'][:1])
                if analysis['title'].get('issues'):
                    issues.extend(analysis['title']['issues'][:1])
                if issues:
                    rec_text = '\U0001f4a1 **\u0420\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0430\u0446\u0438\u0438:**\n' + '\n'.join(f'\u2022 {i}' for i in issues[:5])
                    await message.answer(rec_text)
        except requests.exceptions.Timeout:
            await message.answer('\u23f1 **\u0422\u0430\u0439\u043c-\u0430\u0443\u0442** \u043f\u0440\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0435 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u044b.')
            track_error(f'Timeout: {url}')
        except Exception as e:
            await message.answer(f'\u274c **\u041e\u0448\u0438\u0431\u043a\u0430:** {str(e)}')
            track_error(f'{e}: {url}')

    logger.info('VK \u0431\u043e\u0442 \u0437\u0430\u043f\u0443\u0449\u0435\u043d (polling)')
    await bot.run_polling()


def run_vk_bot_polling():
    try:
        if not VK_TOKEN:
            logger.warning('VK_BOT_TOKEN \u043d\u0435 \u0437\u0430\u0434\u0430\u043d \u2014 VK \u0431\u043e\u0442 \u043d\u0435 \u0437\u0430\u043f\u0443\u0449\u0435\u043d')
            return

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(run_vk_bot())
    except Exception as e:
        shared.vk_bot_error = str(e)
        logger.exception(f'\u041e\u0448\u0438\u0431\u043a\u0430 \u0432 VK \u0431\u043e\u0442\u0435: {e}')
