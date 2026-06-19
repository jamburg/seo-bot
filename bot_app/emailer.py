import os
import logging
import asyncio
import re
import requests

logger = logging.getLogger(__name__)

MAIL_PROXY_URL = os.environ.get('MAIL_PROXY_URL', 'https://seo-analiser.j-biz.ru/mail_proxy.php')


def strip_tags(text):
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
    text = re.sub(r'__([^_]+)__', r'\1', text)
    text = re.sub(r'`([^`]+)`', r'\1', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = text.replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&').replace('&quot;', '"')
    return text.strip()


async def send_email_async(to_email: str, subject: str, body: str) -> str:
    clean_body = strip_tags(body)
    try:
        resp = await asyncio.to_thread(
            requests.post,
            MAIL_PROXY_URL,
            data={'email': to_email, 'subject': subject, 'body': clean_body},
            timeout=30,
        )
        data = resp.json()
        if data.get('ok'):
            logger.info(f'Email sent to {to_email}: {subject}')
            return ''
        return data.get('error', 'Неизвестная ошибка')
    except requests.exceptions.Timeout:
        return 'Тайм-аут при отправке'
    except Exception as e:
        logger.exception(f'Email send failed: {e}')
        return f'Ошибка отправки: {e}'
