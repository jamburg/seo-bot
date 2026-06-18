import os
import logging
import smtplib
import asyncio
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

SMTP_HOST = 'smtp.yandex.ru'
SMTP_PORT = 587
FROM_EMAIL = 'jamburg@yandex.ru'


def send_email(to_email: str, subject: str, body: str) -> str:
    password = os.environ.get('EMAIL_PASSWORD', '')
    if not password:
        return 'EMAIL_PASSWORD не задан'
    try:
        msg = MIMEText(body, 'plain', 'utf-8')
        msg['Subject'] = subject
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as s:
            s.starttls()
            s.login(FROM_EMAIL, password)
            s.send_message(msg)
        logger.info(f'Email sent to {to_email}: {subject}')
        return ''
    except smtplib.SMTPAuthenticationError:
        return 'Ошибка авторизации SMTP. Проверьте пароль приложения.'
    except smtplib.SMTPRecipientsRefused:
        return f'Адрес {to_email} отклонён сервером.'
    except Exception as e:
        logger.exception(f'Email send failed: {e}')
        return f'Ошибка отправки: {e}'


async def send_email_async(to_email: str, subject: str, body: str) -> str:
    return await asyncio.to_thread(send_email, to_email, subject, body)
