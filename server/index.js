import express from 'express';
import cors from 'cors';
import initSqlJs from 'sql.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { URL } from 'url';
import * as dns from 'dns';
import { promisify } from 'util';
import { analyzeSeo } from './seoAnalyzer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'analyses.db');
const dnsLookup = promisify(dns.lookup);

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

let db;

async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      score INTEGER NOT NULL,
      data TEXT NOT NULL,
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    )
  `);
  saveDb();
}

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

const PRIVATE_RANGES = [
  { start: ipToLong('10.0.0.0'), end: ipToLong('10.255.255.255') },
  { start: ipToLong('127.0.0.0'), end: ipToLong('127.255.255.255') },
  { start: ipToLong('172.16.0.0'), end: ipToLong('172.31.255.255') },
  { start: ipToLong('192.168.0.0'), end: ipToLong('192.168.255.255') },
  { start: ipToLong('169.254.0.0'), end: ipToLong('169.254.255.255') },
  { start: ipToLong('0.0.0.0'), end: ipToLong('0.255.255.255') },
  { start: ipToLong('100.64.0.0'), end: ipToLong('100.127.255.255') },
  { start: ipToLong('198.18.0.0'), end: ipToLong('198.19.255.255') },
];

function ipToLong(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isPrivateIP(ip) {
  const long = ipToLong(ip);
  return PRIVATE_RANGES.some(r => long >= r.start && long <= r.end);
}

function isPrivateHostname(hostname) {
  const lower = hostname.toLowerCase();
  const privateKeywords = ['localhost', 'internal', 'private', 'corp', 'intranet', 'home'];
  if (privateKeywords.some(k => lower.includes(k))) return true;
  if (lower.endsWith('.local') || lower.endsWith('.internal') || lower.endsWith('.lan')) return true;
  return false;
}

async function validateUrl(raw) {
  let url;
  try {
    const withProtocol = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
    url = new URL(withProtocol);
  } catch {
    throw new Error('Некорректный URL. Введите валидный адрес (например, https://example.com)');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Допустимы только HTTP и HTTPS протоколы');
  }

  const hostname = url.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '::1') {
    throw new Error('Запросы к localhost запрещены');
  }

  if (isPrivateHostname(hostname)) {
    throw new Error('Запросы к внутренним хостам запрещены');
  }

  try {
    const { address } = await dnsLookup(hostname, { family: 4 });
    if (isPrivateIP(address)) {
      throw new Error(`Запросы к частным IP-адресам запрещены (${address})`);
    }
  } catch (dnsError) {
    if (dnsError.message.includes('запрещены')) throw dnsError;
  }

  return url.href;
}

app.get('/api/fetch', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Параметр URL обязателен' });
  }

  try {
    const targetUrl = await validateUrl(url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru,en;q=0.9',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    const html = await response.text();
    const contentType = response.headers.get('content-type') || '';

    res.json({ html, url: targetUrl, status: response.status, contentType });
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Тайм-аут при загрузке страницы' });
    }
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/analyze', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Параметр URL обязателен' });
  }

  try {
    const targetUrl = await validateUrl(url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru,en;q=0.9',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    const startTime = Date.now();
    const html = await response.text();
    const responseTime = Date.now() - startTime;

    if (html.length < 50) {
      throw new Error('Не удалось получить HTML страницы');
    }

    const result = analyzeSeo(html, targetUrl, responseTime);
    res.json(result);
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Тайм-аут при загрузке страницы' });
    }
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/save', (req, res) => {
  try {
    const { url, score, data } = req.body;
    if (!url || score === undefined || !data) {
      return res.status(400).json({ error: 'Неполные данные' });
    }
    db.run('INSERT INTO analyses (url, score, data) VALUES (?, ?, ?)', [url, score, JSON.stringify(data)]);
    saveDb();
    const result = db.exec('SELECT last_insert_rowid() as id');
    const id = result[0]?.values[0][0];
    res.json({ id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/history', (req, res) => {
  try {
    const result = db.exec('SELECT id, url, score, created_at FROM analyses ORDER BY created_at DESC LIMIT 20');
    const rows = result[0]?.values.map(row => ({
      id: row[0], url: row[1], score: row[2], created_at: row[3],
    })) || [];
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/history/:id', (req, res) => {
  try {
    const result = db.exec('SELECT * FROM analyses WHERE id = ?', [req.params.id]);
    if (!result[0]?.values.length) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }
    const row = result[0].values[0];
    const data = { id: row[0], url: row[1], score: row[2], data: JSON.parse(row[3]), created_at: row[4] };
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/history', (req, res) => {
  try {
    db.run('DELETE FROM analyses');
    saveDb();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/history/:id', (req, res) => {
  try {
    db.run('DELETE FROM analyses WHERE id = ?', [req.params.id]);
    saveDb();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

await initDb();
app.listen(3001, () => {
  console.log('SEO Analyzer API server running on http://localhost:3001');
});
