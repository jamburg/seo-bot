import threading

tg_bot_thread: threading.Thread = None
vk_bot_thread: threading.Thread = None
vk_bot_error: str = None

last_reports: dict = {}
""" user_id (int) -> {'report_text': str, 'url': str, 'analysis': dict} """