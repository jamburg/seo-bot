import threading

tg_bot_thread: threading.Thread = None
vk_bot_thread: threading.Thread = None
vk_bot_error: str = None

last_reports: dict = {}
""" user_id (int) -> {'report_text': str, 'url': str, 'analysis': dict} """

user_email_pending: set = set()
""" user_ids waiting to input email after clicking 'email' button """