import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, extname } from 'node:path';
import { openDatabase } from './database.mjs';
import { createCrawler, EDITIONS } from './crawler.mjs';
import { summarize, trends, toCsv } from './analytics.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif' };

async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > 1024 * 1024) throw Object.assign(new Error('请求体超过1MB'), { status: 413 });
  }
  try { return JSON.parse(body || '{}'); } catch { throw new Error('请求不是有效 JSON'); }
}

export function createApp({ database = openDatabase(process.env.DB_PATH || resolve(ROOT, 'var/papers.sqlite')),
  crawler = createCrawler({ cacheDir: resolve(ROOT, 'var/cache') }), token = process.env.ADMIN_TOKEN || '' } = {}) {
  let crawling = false;
  const send = (res, status, data, type = 'application/json; charset=utf-8') => {
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(type.startsWith('application/json') ? JSON.stringify(data) : data);
  };
  function requireWrite(req) {
    const origin = req.headers.origin;
    if (origin && origin !== `http://${req.headers.host}` && origin !== `https://${req.headers.host}`) {
      throw Object.assign(new Error('拒绝跨站写入'), { status: 403 });
    }
    if (token) {
      const given = Buffer.from((req.headers.authorization || '').replace(/^Bearer /, ''));
      const expected = Buffer.from(token);
      if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw Object.assign(new Error('需要管理员口令：点击左下角管理权限设置'), { status: 401 });
    } else {
      const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
      const host = req.headers.host?.split(':')[0];
      if (!local || !['127.0.0.1', 'localhost', '['].includes(host)) throw Object.assign(new Error('公网写入必须配置 ADMIN_TOKEN'), { status: 403 });
    }
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const url = new URL(req.url, 'http://localhost');
      const path = url.pathname;
      const options = Object.fromEntries(url.searchParams);
      options.exact = options.exact === 'true';
      if (req.method === 'GET' && path === '/api/health') return send(res, 200, { ok: true, version: '1.0.0' });
      if (req.method === 'GET' && path === '/api/config') return send(res, 200, { editions: EDITIONS, writeTokenRequired: Boolean(token) });
      if (req.method === 'GET' && path === '/api/papers') {
        const papers = database.list(options);
        const page = Math.max(1, Math.floor(Number(options.page) || 1));
        const pageSize = Math.min(100, Math.max(1, Math.floor(Number(options.pageSize) || 12)));
        return send(res, 200, { papers: papers.slice((page - 1) * pageSize, page * pageSize), total: papers.length, page, pageSize });
      }
      if (req.method === 'GET' && path === '/api/stats') return send(res, 200, summarize(database.list(options)));
      if (req.method === 'GET' && path === '/api/trends') return send(res, 200, trends(database.list(), options.keyword || 'Diffusion models', Number(options.start || 2022), Number(options.end || 2025)));
      if (req.method === 'GET' && path === '/api/export') {
        res.setHeader('Content-Disposition', 'attachment; filename="vision-trends-papers.csv"');
        return send(res, 200, toCsv(database.list(options)), 'text/csv; charset=utf-8');
      }
      if (req.method === 'GET' && path === '/api/provenance') {
        const file = resolve(ROOT, 'data/provenance.json');
        return send(res, 200, existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { editions: [], failures: [] });
      }
      const match = path.match(/^\/api\/papers\/(\d+)$/);
      if (match && req.method === 'GET') {
        const paper = database.get(Number(match[1]));
        return send(res, paper ? 200 : 404, paper || { error: '论文不存在' });
      }
      if (path.startsWith('/api/') && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
        requireWrite(req);
        if (match && req.method === 'DELETE') return send(res, database.remove(Number(match[1])) ? 200 : 404, { ok: true });
        const body = await readJson(req);
        if (path === '/api/papers' && req.method === 'POST') {
          const result = database.save(body);
          return send(res, result.created ? 201 : 200, result);
        }
        if (match && req.method === 'PUT') {
          const id = Number(match[1]);
          const old = database.get(id);
          if (!old) return send(res, 404, { error: '论文不存在' });
          const result = database.save({ ...old, ...body }, id);
          return send(res, result.duplicate ? 409 : 200, result.duplicate ? { error: '修改后与已有论文重复' } : result);
        }
        if (req.method === 'POST' && ['/api/crawl', '/api/search-online', '/api/crawl-edition'].includes(path)) {
          if (crawling) return send(res, 409, { error: '已有采集任务，请等待其完成' });
          crawling = true;
          try {
            if (path === '/api/search-online') {
              const query = String(body.q || '').trim();
              if (query.length > 600) throw new Error('查询过长');
              const result = await crawler.search(query, { conference: body.conference, year: body.year, exact: body.exact === true, limit: 5 });
              const papers = result.papers.map(p => database.save(p).paper);
              return send(res, 200, { papers, warnings: result.warnings });
            }
            if (path === '/api/crawl-edition') {
              const limit = Number(body.limit || 10);
              if (!Number.isInteger(limit) || limit < 1 || limit > 30) throw new Error('每次会议采集数量需为1—30篇');
              const entries = await crawler.list(body.conference, Number(body.year));
              const results = [];
              for (const entry of entries.slice(0, limit)) {
                try { results.push({ title: entry.title, ok: true, ...database.save(await crawler.detail(entry)) }); }
                catch (error) { results.push({ title: entry.title, ok: false, error: error.message }); }
              }
              return send(res, 200, { listed: entries.length, results });
            }
            if (!Array.isArray(body.titles) || !body.titles.length || body.titles.length > 30) throw new Error('每次导入需为1—30个标题');
            const results = [];
            for (const raw of body.titles) {
              const title = String(raw).trim();
              try {
                if (title.length < 3 || title.length > 600) throw new Error('标题需为3—600字符');
                const found = await crawler.search(title, { conference: body.conference, year: body.year, exact: true, limit: 1 });
                if (!found.papers.length) throw new Error(`未找到精确标题，请核对会议/年份或使用论文库模糊在线搜索。${found.warnings.join('；')}`);
                results.push({ title, ok: true, ...database.save(found.papers[0]), warnings: found.warnings });
              } catch (error) { results.push({ title, ok: false, error: error.message }); }
            }
            return send(res, 200, { results });
          } finally { crawling = false; }
        }
      }
      if (path.startsWith('/api/')) return send(res, 404, { error: '接口不存在' });
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: '不支持的方法' });
      const files = { '/': 'index.html', '/index.html': 'index.html', '/app.js': 'app.js', '/styles.css': 'styles.css', '/charts.js': 'charts.js', '/import.js': 'import.js', '/favicon.svg': 'favicon.svg' };
      const file = files[path];
      if (!file || !existsSync(resolve(ROOT, 'public', file))) return send(res, 404, { error: '页面不存在' });
      return send(res, 200, readFileSync(resolve(ROOT, 'public', file)), MIME[extname(file)] || 'application/octet-stream');
    } catch (error) {
      console.error(`${req.method} ${req.url}: ${error.message}`);
      send(res, error.status || 400, { error: error.message });
    }
  });
  server.requestTimeout = 180000;
  return { server, database };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const host = process.env.HOST || '127.0.0.1';
  if (!['127.0.0.1', 'localhost', '::1'].includes(host) && (!process.env.ADMIN_TOKEN || process.env.ADMIN_TOKEN.length < 16)) {
    throw new Error('公网监听需要至少16字符的 ADMIN_TOKEN');
  }
  const { server, database } = createApp();
  server.listen(Number(process.env.PORT || 3000), host, () => console.log(`Vision Trends: http://${host}:${process.env.PORT || 3000}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { database.close(); process.exit(0); }));
}
