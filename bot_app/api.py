import time
import json
import html
import logging
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional

import shared
from analyzer import analyze_seo
from stats import track_analysis, track_error, get_summary
from leads import add_lead, get_leads, toggle_lead, delete_lead, get_lead_stats

logger = logging.getLogger(__name__)

app = FastAPI(title='SEO Analyzer API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)

PROXY_URL = 'https://seo-analiser.j-biz.ru/proxy.php'


class AnalyzeRequest(BaseModel):
    url: str


class LeadRequest(BaseModel):
    name: str
    phone: str
    site: str
    comment: Optional[str] = ''


@app.get('/health')
async def health():
    return {'status': 'ok'}


@app.get('/api/bot/status')
async def bot_status():
    tg = shared.tg_bot_thread
    vk = shared.vk_bot_thread
    return {
        'telegram': {
            'alive': tg is not None and tg.is_alive(),
            'thread': tg.name if tg else None,
        },
        'vk': {
            'alive': vk is not None and vk.is_alive(),
            'thread': vk.name if vk else None,
            'error': shared.vk_bot_error,
        },
    }


@app.post('/api/analyze')
async def api_analyze(req: AnalyzeRequest):
    url = req.url.strip()
    if not url.startswith('http://') and not url.startswith('https://'):
        url = 'https://' + url

    import requests as http_req
    try:
        start = time.time()
        resp = http_req.get(
            PROXY_URL,
            params={'url': url},
            timeout=25,
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        data = resp.json()
        if 'error' in data:
            raise HTTPException(400, data['error'])

        response_time = (time.time() - start) * 1000
        result = analyze_seo(data['html'], data.get('url', url), response_time, {
            'ssl': data.get('ssl'),
            'gzip': data.get('contentEncoding'),
            'robotsTxt': data.get('extra', {}).get('robotsTxt'),
            'sitemapXml': data.get('extra', {}).get('sitemapXml'),
            'serverResponseTime': data.get('responseTimeMs'),
            'contentType': data.get('contentType'),
        })
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get('/api/stats')
async def api_stats():
    s = get_summary()
    leads = get_lead_stats()
    s['leads'] = leads
    return s


@app.get('/api/leads')
async def api_leads(filter: str = Query('all', regex='^(all|new|processed)$')):
    return get_leads(None if filter == 'all' else filter)


@app.post('/api/leads')
async def api_add_lead(req: LeadRequest):
    if not req.name or not req.phone or not req.site:
        raise HTTPException(400, 'name, phone и site обязательны')
    entry = add_lead(req.name, req.phone, req.site, req.comment or '')
    return {'ok': True, 'id': entry['id']}


@app.post('/api/leads/{lead_id}/toggle')
async def api_toggle_lead(lead_id: int):
    l = toggle_lead(lead_id)
    if not l:
        raise HTTPException(404, 'Заявка не найдена')
    return {'ok': True, 'status': l['status']}


@app.delete('/api/leads/{lead_id}')
async def api_delete_lead(lead_id: int):
    if not delete_lead(lead_id):
        raise HTTPException(404, 'Заявка не найдена')
    return {'ok': True}


ADMIN_HTML = '''<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Заявки на SEO аудит</title>
<link rel="icon" type="image/svg+xml" href="https://audit-seo.j-biz.ru/favicon.svg">
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family:-apple-system,'Segoe UI',sans-serif; background:#07071a; color:#f0f0f5; padding:40px; }}
h1 {{ font-size:1.6rem; }}
.stats {{ color:#8888a8; margin:16px 0 24px; display:flex; flex-wrap:wrap; gap:8px; }}
.stats span {{ background:rgba(99,102,241,0.15); padding:4px 12px; border-radius:8px; }}
table {{ width:100%; border-collapse:collapse; }}
th,td {{ text-align:left; padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.06); font-size:0.9rem; }}
th {{ color:#8888a8; font-weight:600; font-size:0.8rem; text-transform:uppercase; }}
tr:hover td {{ background:rgba(255,255,255,0.03); }}
tr.processed {{ opacity:0.5; }}
.status-new {{ color:#f59e0b; font-weight:600; }}
.status-processed {{ color:#22c55e; }}
.site-link {{ color:#a78bfa; text-decoration:none; }}
.action-btn {{ text-decoration:none; font-size:0.8rem; padding:2px 8px; border-radius:4px; }}
.delete-btn {{ color:#ef4444; }}
.toggle-btn {{ color:#22c55e; }}
.empty {{ text-align:center; padding:60px; color:#555570; }}
a {{ color:#a78bfa; text-decoration:none; }}
a:hover {{ text-decoration:underline; }}
.nav {{ margin-bottom:24px; display:flex; gap:16px; flex-wrap:wrap; align-items:center; }}
.nav a {{ padding:6px 14px; border-radius:8px; background:rgba(255,255,255,0.04); font-size:0.9rem; }}
.nav a:hover {{ background:rgba(99,102,241,0.15); }}
</style>
</head>
<body>
<h1>&#x1F916; Bot Admin &mdash; SEO &#x410;&#x43D;&#x430;&#x43B;&#x438;&#x437;&#x430;&#x442;&#x43E;&#x440;</h1>
<div class="nav">
  <a href="/admin">&#x1F4CB; &#x417;&#x430;&#x44F;&#x432;&#x43A;&#x438;</a>
  <a href="/admin/stats">&#x1F4CA; &#x421;&#x442;&#x430;&#x442;&#x438;&#x441;&#x442;&#x438;&#x43A;&#x430;</a>
  <a href="/docs" target="_blank">&#x1F4BB; API</a>
</div>
{content}
</body>
</html>'''


def _admin_page(content):
    return HTMLResponse(ADMIN_HTML.format(content=content))


@app.get('/admin', response_class=HTMLResponse)
async def admin_leads(filter: str = Query('all', regex='^(all|new|processed)$')):
    leads = get_leads(None if filter == 'all' else filter)
    stats = get_lead_stats()
    s = get_summary()

    filters_html = ''.join(
        f'<a href="/admin?filter={k}"{" style=background:rgba(99,102,241,0.25);color:#a78bfa" if v else ""}>{"📅 Новые" if k == "new" else "✅ Обработанные" if k == "processed" else "📋 Все"}</a> '
        for k, v in [('all', filter == 'all'), ('new', filter == 'new'), ('processed', filter == 'processed')]
    )

    rows = ''
    for l in reversed(leads):
        st = l.get('status', 'new')
        rows += f'''<tr class="{"processed" if st == "processed" else ""}">
<td>{l.get("date", "")}</td>
<td><span class="status-{st}">{"Новая" if st == "new" else "Обработана"}</span></td>
<td>{html.escape(l["name"])}</td>
<td>{html.escape(l["phone"])}</td>
<td><a class="site-link" href="{html.escape(l["site"])}" target="_blank">{html.escape(l["site"][:40])}</a></td>
<td>{html.escape(l.get("comment", "")[:50])}</td>
<td>
<a class="action-btn toggle-btn" href="/admin/toggle/{l["id"]}?filter={filter}" title="Переключить">&#x2705;</a>
<a class="action-btn delete-btn" href="/admin/delete/{l["id"]}?filter={filter}" onclick="return confirm(\'Удалить?\')" title="Удалить">&#x274C;</a>
</td></tr>'''

    if not rows:
        rows = '<tr><td colspan="7" class="empty">Нет заявок</td></tr>'

    content = f'''
<div class="stats">
  <span>&#x1F4C5; Новых: {stats["new"]}</span>
  <span>&#x1F4CA; Всего: {stats["total"]}</span>
  <span>&#x1F441; Посещений: {s.get("totalAnalyses", 0)}</span>
</div>
<div class="nav">{filters_html}</div>
<table><thead><tr><th>Дата</th><th>Статус</th><th>Имя</th><th>Контакт</th><th>Сайт</th><th>Комментарий</th><th></th></tr></thead>
<tbody>{rows}</tbody></table>'''
    return _admin_page(content)


@app.get('/admin/toggle/{lead_id}')
async def admin_toggle(lead_id: int, filter: str = 'all'):
    toggle_lead(lead_id)
    from fastapi.responses import RedirectResponse
    return RedirectResponse(f'/admin?filter={filter}')


@app.get('/admin/delete/{lead_id}')
async def admin_delete(lead_id: int, filter: str = 'all'):
    delete_lead(lead_id)
    from fastapi.responses import RedirectResponse
    return RedirectResponse(f'/admin?filter={filter}')


@app.get('/admin/stats', response_class=HTMLResponse)
async def admin_stats():
    s = get_summary()
    daily = s.get('dailyStats', {})
    days = list(daily.keys())[-14:]

    rows = ''
    max_v = max(daily.values()) if daily else 1
    for d in days:
        bar = '█' * int(daily[d] / max_v * 20) or '▏'
        rows += f'<tr><td>{d[-5:]}</td><td>{daily[d]}</td><td style="color:#a78bfa;">{bar}</td></tr>'
    if not rows:
        rows = '<tr><td colspan="3" style="text-align:center;color:#555570;">Нет данных</td></tr>'

    content = f'''
<div class="stats">
  <span>&#x1F4C8; Анализов: {s["totalAnalyses"]}</span>
  <span>&#x1F465; Пользователей: {s["uniqueUsers"]}</span>
  <span>&#x274C; Ошибок: {s["errors"]}</span>
  <span>&#x23F1; Аптайм: {s["uptime"]} дн.</span>
</div>
<table><thead><tr><th>День</th><th>Кол-во</th><th>График</th></tr></thead>
<tbody>{rows}</tbody></table>
<p style="opacity:0.4;font-size:0.8rem;margin-top:16px;">Запущен: {s.get("startedAt", "")[:19].replace("T", " ")}</p>
<p style="margin-top:8px;"><a href="/api/stats">JSON</a></p>'''
    return _admin_page(content)
