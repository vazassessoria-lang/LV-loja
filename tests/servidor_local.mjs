// Sobe a loja localmente (worker + arquivos de public/) com D1 falso e catalogo REAL do painel.
// Uso: node --no-warnings tests/servidor_local.mjs [porta]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import worker from '../src/index.js';
import { sincronizar } from '../src/catalogo.js';
import { d1Falso } from './d1_falso.mjs';
const env = { DB: d1Falso(), DASHBOARD_URL: 'https://lv-dashboard.vazassessoria.workers.dev', LOJA_NOINDEX: '1', FRETE_GRATIS_ACIMA: '599' };
const t0 = Date.now();
const r = await sincronizar(env, { maxPaginas: Number(process.env.PAGINAS || 40) });
console.log('sync', JSON.stringify(r), ((Date.now() - t0) / 1000).toFixed(1) + 's');
const tipos = { '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp' };
const porta = Number(process.argv[2] || 8787);
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost:' + porta);
  const arq = path.join('public', u.pathname);
  if (u.pathname.startsWith('/static/') && fs.existsSync(arq)) { res.writeHead(200, { 'content-type': tipos[path.extname(arq)] || 'application/octet-stream' }); return res.end(fs.readFileSync(arq)); }
  const r = await worker.fetch(new Request(u.href, { method: req.method, headers: req.headers }), env, { waitUntil() {} });
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
}).listen(porta, () => console.log('loja local em http://localhost:' + porta));
