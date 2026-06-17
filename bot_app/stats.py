import os
import json
import threading
from datetime import datetime

STATS_FILE = os.path.join(os.path.dirname(__file__), 'stats.json')
_lock = threading.Lock()


def _defaults():
    return {
        'totalAnalyses': 0,
        'uniqueUsers': [],
        'lastAnalysis': None,
        'errors': [],
        'startedAt': datetime.now().isoformat(),
        'dailyStats': {},
    }


def _load_raw():
    if not os.path.exists(STATS_FILE):
        return None
    try:
        with open(STATS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return None


def _save_raw(data):
    with open(STATS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load():
    with _lock:
        data = _load_raw()
        if data is None:
            data = _defaults()
            _save_raw(data)
        return data


def save(data):
    with _lock:
        _save_raw(data)


def track_analysis(user_id, username, url):
    data = load()
    data['totalAnalyses'] += 1
    if user_id not in data['uniqueUsers']:
        data['uniqueUsers'].append(user_id)
    data['lastAnalysis'] = {
        'userId': user_id,
        'username': username,
        'url': url,
        'time': datetime.now().isoformat(),
    }
    day = datetime.now().strftime('%Y-%m-%d')
    data['dailyStats'][day] = data['dailyStats'].get(day, 0) + 1
    save(data)


def track_error(error_msg):
    data = load()
    data['errors'].append({
        'msg': str(error_msg)[:200],
        'time': datetime.now().isoformat(),
    })
    if len(data['errors']) > 100:
        data['errors'] = data['errors'][-100:]
    save(data)


def get_summary():
    data = load()
    return {
        'totalAnalyses': data['totalAnalyses'],
        'uniqueUsers': len(data['uniqueUsers']),
        'lastAnalysis': data['lastAnalysis'],
        'errors': len(data['errors']),
        'startedAt': data['startedAt'],
        'uptime': (datetime.now() - datetime.fromisoformat(data['startedAt'])).days,
        'dailyStats': dict(list(data['dailyStats'].items())[-30:]),
    }
