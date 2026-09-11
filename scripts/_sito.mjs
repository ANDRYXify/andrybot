// Il sito servito in locale, per i collaudi che hanno bisogno di un browser.
//
// Ce n'erano nove copie, una per collaudo, e non era un dettaglio: da quando la
// home la compone il SERVER (ci inserisce la vetrina nella lingua giusta, vedi
// src/web/vetrina-vista.js) una copia che serve `index.html` grezzo mostra una
// pagina col buco al posto della vetrina — e il collaudo che ci gira sopra
// misura una pagina che nessuno vedra' mai. E' successo davvero: il cancello
// del contrasto e' diventato rosso perche' cercava un titolo che, nel suo
// finto sito, non c'era piu'.
//
// Qui la home si compone con la STESSA funzione del server. Un posto solo.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inserisciVetrina } from '../src/web/vetrina-vista.js';
import { disegnoPerIlBrowser, CARATTERI_AMMESSI, CARTELLA_CARATTERI } from '../src/features/carta-servita.js';

const RAD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PUB = path.join(RAD, 'src/web/public');

const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.woff2': 'font/woff2',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };

const LINGUE = ['it', 'en', 'es'];

// Il guscio come lo manda il server: vetrina dentro, lingua dichiarata,
// `body.vetrina` gia' messo (che e' quel che tiene ferma la larghezza).
function guscio(lingua, kick) {
  const base = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8');
  return inserisciVetrina(base, lingua, { kick })
    .replace('<body>', '<body class="vetrina">')
    .replace('<html lang="it">', `<html lang="${lingua}">`);
}

// Un finto bot per la PAGINA dell'overlay (overlay.html + overlay-app.js), da
// passare ad apriSito come `overlay`. Serve la pagina, il tema (`tema()`), il
// brano in corso (`musica()`) e il flusso SSE, con quel che serve a un collaudo:
// `manda(ev)` spinge un evento a chi e' collegato, `cadi()` butta giu' i socket,
// `st.giu` fa rispondere 502 come il proxy durante un riavvio, e `st` conta cosa
// la pagina ha chiesto (tema, guai, connessioni).
export function overlayFinto({ login = 'prova', tema = () => ({}), musica = () => ({ stato: 'niente' }) } = {}) {
  const st = { giu: false, stream: [], socket: new Set(), tema: 0, musica: 0, guai: [], connessioni: 0 };
  const base = '/overlay/' + login;
  const json = (res, o) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  return {
    st,
    manda(ev) { for (const r of st.stream) r.write('data: ' + JSON.stringify(ev) + '\n\n'); },
    cadi() { for (const s of st.socket) s.destroy(); },
    gestisci(req, res, q) {
      if (q !== base && !q.startsWith(base + '/')) return false;
      if (q === base + '/stream') {
        st.connessioni++;
        if (st.giu) { res.writeHead(502, { 'content-type': 'text/html' }); res.end('bad gateway'); return true; }
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
        res.write(': connesso\n\n');
        st.stream.push(res); st.socket.add(res.socket);
        req.on('close', () => { st.stream = st.stream.filter((r) => r !== res); st.socket.delete(res.socket); });
        return true;
      }
      if (q === base + '/tema') { st.tema++; json(res, tema()); return true; }
      if (q === base + '/musica') { st.musica++; json(res, musica()); return true; }
      if (q === base + '/guaio') {
        let b = '';
        req.on('data', (c) => { b += c; });
        req.on('end', () => { try { st.guai.push(JSON.parse(b).dove); } catch { /* niente */ } json(res, { ok: true }); });
        return true;
      }
      if (q === base) { res.writeHead(200, { 'content-type': TIPI['.html'] }); res.end(fs.readFileSync(path.join(PUB, 'overlay.html'))); return true; }
      json(res, {});
      return true;
    },
  };
}

// Apre il sito su una porta libera. `api` risponde a /api/* (per finta, o come
// gli si dice); `kick` accende la porta di Kick nella vetrina; `overlay` e' un
// overlayFinto(); `rotte(req, res, q)` serve quel che un collaudo vuole in piu'
// (torna true se ha risposto).
export async function apriSito({ api = () => ({}), kick = true, overlay = null, rotte = null } = {}) {
  const srv = http.createServer((req, res) => {
    const via = new URL(req.url, 'http://x');
    const q = decodeURIComponent(via.pathname);
    if (rotte && rotte(req, res, q)) return;
    if (overlay && overlay.gestisci(req, res, q)) return;
    if (q.startsWith('/api/')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify(api(q, via) ?? {}));
    }
    // Le due cose che il server vero serve da fuori `public/`. Senza, il sito
    // dei collaudi risponderebbe con la HOME al posto di un modulo — e
    // l'editor, che quel modulo lo importa, non partirebbe: un collaudo che
    // fallisce per colpa del banco di prova, non del prodotto.
    if (q === '/js/carta-disegno.js') {
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
      return res.end(disegnoPerIlBrowser());
    }
    if (q.startsWith('/font/')) {
      const nome = q.slice(6);
      if (!CARATTERI_AMMESSI.has(nome)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': 'font/ttf' });
      return res.end(fs.readFileSync(path.join(CARTELLA_CARATTERI, nome)));
    }
    const f = path.join(PUB, q === '/' ? 'index.html' : q);
    const home = q === '/' || q === '/index.html'
      || !f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory();
    if (home) {
      const chiesta = (via.searchParams.get('lang') || '').toLowerCase();
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(guscio(LINGUE.includes(chiesta) ? chiesta : 'it', kick));
    }
    res.writeHead(200, { 'content-type': TIPI[path.extname(f)] || 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  const porta = srv.address().port;
  return { porta, base: `http://127.0.0.1:${porta}`, chiudi: () => srv.close() };
}

// Chromium con le opzioni che servono su questa macchina. Restituisce null se
// Playwright non c'e': il collaudo si salta invece di fallire.
export async function apriBrowser() {
  const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
  const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  let chromium;
  try { ({ chromium } = await import(PLAYWRIGHT)); } catch { return null; }
  return chromium.launch({ executablePath: CHROMIUM,
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
}
