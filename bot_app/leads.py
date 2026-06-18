import os
import json
import threading
from datetime import datetime

LEADS_FILE = os.path.join(os.path.dirname(__file__), 'leads.json')
_lock = threading.Lock()


def _load_raw():
    if not os.path.exists(LEADS_FILE):
        return None
    try:
        with open(LEADS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return None


def _save_raw(data):
    with open(LEADS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load():
    with _lock:
        data = _load_raw()
        if data is None:
            data = []
            _save_raw(data)
        return data


def save(data):
    with _lock:
        _save_raw(data)


def add_lead(name, phone, site, comment=''):
    data = load()
    entry = {
        'id': int(datetime.now().timestamp() * 1000) % 1000000,
        'date': datetime.now().strftime('%d.%m.%Y %H:%M:%S'),
        'name': name.strip(),
        'phone': phone.strip(),
        'site': site.strip(),
        'comment': comment.strip(),
        'status': 'new',
    }
    data.append(entry)
    save(data)
    return entry


def get_leads(filter_status=None):
    data = load()
    if filter_status == 'new':
        return [l for l in data if l.get('status', 'new') == 'new']
    elif filter_status == 'processed':
        return [l for l in data if l.get('status', 'new') == 'processed']
    return data


def toggle_lead(lead_id):
    data = load()
    for l in data:
        if l['id'] == lead_id:
            l['status'] = 'processed' if l.get('status', 'new') == 'new' else 'new'
            save(data)
            return l
    return None


def delete_lead(lead_id):
    data = load()
    new_data = [l for l in data if l['id'] != lead_id]
    if len(new_data) == len(data):
        return False
    save(new_data)
    return True


def get_lead_stats():
    data = load()
    new_count = sum(1 for l in data if l.get('status', 'new') == 'new')
    return {'total': len(data), 'new': new_count}
