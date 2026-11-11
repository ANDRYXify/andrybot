// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA SONDA: il sito guardato da fuori, come lo vede chiunque (docs/GUARDIA.md).
//
// Non entra e non insiste: nessuna credenziale, una richiesta per controllo, in
// fila. Guarda che quello che il progetto promette sia vero SUL SITO VERO, non
// nel codice: i cancelli provano il codice, questa prova quello che gira.
//
//  · HTTPS risponde, e l'HTTP ci rimanda;
//  · il certificato non sta per scadere;
//  · le intestazioni di sicurezza ci sono;
//  · le porte private non si aprono senza sessione;
//  · i file pubblici ci sono, e dicono quello che devono;
//  · l'ingresso con la mail non parte senza la prova di lavoro;
//  · l'esca e' ancora un'esca.
//
// Uso: node scripts/sonda-sito.mjs [https://socialbot.live] [--selftest]
// Esce con 1 se qualcosa non torna. Gira ogni notte in .github/workflows/guardia.yml.
import tls from 'node:tls';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const GIORNO = 86400_000;
export const CERTIFICATO_GIORNI = 14;
export const SECURITY_TXT_GIORNI = 30;
export const HSTS_MINIMO = 15552000;
// Le porte che devono restare chiuse senza sessione (letture con la loro
// guardia nel codice) e i file che devono esserci per tutti. Un contratto
// (test/contratto/guardia.test.mjs) controlla che esistano davvero cosi'.
export const PRIVATE = ['/api/sicurezza', '/api/streamer/walkon', '/api/streamer/subathon', '/api/streamer/partita', '/api/admin/aiuti', '/admin/lia.js'];
export const PUBBLICI = ['/robots.txt', '/sitemap.xml', '/llms.txt', '/llm.txt', '/ai.txt', '/ads.txt', '/humans.txt', '/.well-known/security.txt', '/.well-known/tdmrep.json'];

// ── i giudizi, puri: una risposta entra, i guai escono ─────────────────────
const h = (r, nome) => String(r?.intestazioni?.[nome.toLowerCase()] ?? '');

export function guaiIntestazioni(r) {
  const guai = [];
  const hsts = /max-age=(\d+)/i.exec(h(r, 'strict-transport-security'));
  if (!hsts || Number(hsts[1]) < HSTS_MINIMO) guai.push('HSTS manca o dura meno di sei mesi');
  const csp = h(r, 'content-security-policy');
  if (!csp) guai.push('la CSP manca');
  else {
    const script = (/script-src([^;]*)/i.exec(csp) || /default-src([^;]*)/i.exec(csp) || [])[1] || '';
    if (/'unsafe-inline'|'unsafe-eval'|(^|\s)\*(\s|$)/.test(script)) guai.push('la CSP lascia passare script liberi');
    if (!/default-src\s+'self'/i.test(csp)) guai.push('la CSP non parte da «solo casa nostra»');
  }
  if (!/nosniff/i.test(h(r, 'x-content-type-options'))) guai.push('manca X-Content-Type-Options: nosniff');
  if (!/deny|sameorigin/i.test(h(r, 'x-frame-options')) && !/frame-ancestors/i.test(csp)) guai.push('la pagina si puo\' mettere in una cornice altrui');
  if (!h(r, 'referrer-policy')) guai.push('manca Referrer-Policy');
  if (h(r, 'tdm-reservation').trim() !== '1') guai.push('manca la riserva sull\'addestramento (tdm-reservation)');
  return guai;
}

export function guaiRimando(r, base) {
  const dove = h(r, 'location');
  return r.stato >= 301 && r.stato <= 308 && dove.startsWith(base.replace(/^http:/, 'https:')) ? [] : [`l'HTTP non rimanda all'HTTPS (${r.stato} ${dove || 'senza destinazione'})`];
}

export function guaiPrivata(via, r) {
  if (r.stato === 401 || r.stato === 403 || r.stato === 404) return [];
  return [`${via} risponde ${r.stato} senza sessione: deve restare chiusa`];
}

export function guaiRobots(testo) {
  const guai = [];
  const gruppi = String(testo).split(/\n\s*\n/);
  const di = (ua) => gruppi.find((g) => g.split('\n').some((x) => x.trim().toLowerCase() === `user-agent: ${ua.toLowerCase()}`)) || '';
  for (const ua of ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot']) if (!/^Disallow:\s*\/\s*$/m.test(di(ua))) guai.push(`robots.txt non chiude tutto a ${ua}`);
  if (!/^Disallow:\s*\/api\//m.test(di('*'))) guai.push('robots.txt non chiude /api/ a tutti');
  if (!/^Sitemap:\s*https:\/\//m.test(testo)) guai.push('robots.txt non dice dov\'e\' la sitemap');
  return guai;
}

export function guaiSecurityTxt(testo, ora = Date.now()) {
  const m = /^Expires:\s*(\S+)/mi.exec(String(testo));
  if (!m) return ['security.txt non dice quando scade'];
  const scade = Date.parse(m[1]);
  if (!Number.isFinite(scade)) return ['security.txt ha una scadenza che non si legge'];
  const giorni = Math.floor((scade - ora) / GIORNO);
  return giorni >= SECURITY_TXT_GIORNI ? [] : [`security.txt scade fra ${giorni} giorni: va rinnovato (RFC 9116)`];
}

export function guaiCertificato(scadeIl, ora = Date.now()) {
  const giorni = Math.floor((Date.parse(scadeIl) - ora) / GIORNO);
  if (!Number.isFinite(giorni)) return ['il certificato non dice quando scade'];
  return giorni >= CERTIFICATO_GIORNI ? [] : [`il certificato scade fra ${giorni} giorni`];
}

// L'esca: se /.env risponde, dev'essere quello finto (porta il canarino).
// Il canarino si legge dal sorgente per riconoscerlo: non si spedisce mai.
export function guaiEsca(r, canarino) {
  if (r.stato !== 200) return [];
  return canarino && String(r.corpo).includes(canarino) ? [] : ['/.env risponde, e non e\' l\'esca: guardalo SUBITO'];
}

export function guaiIngresso(r) {
  return r.stato !== 200 ? [] : ['il codice per mail parte senza la prova di lavoro'];
}

// ── l'autoprova: ogni giudizio, rotto apposta ───────────────────────────────
async function autoprova() {
  const buone = { 'strict-transport-security': 'max-age=31536000; includeSubDomains', 'content-security-policy': "default-src 'self'; script-src 'self'", 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY', 'referrer-policy': 'strict-origin-when-cross-origin', 'tdm-reservation': '1' };
  const senza = (k) => { const c = { ...buone }; delete c[k]; return { intestazioni: c }; };
  const robots = 'User-agent: *\nDisallow: /api/\nAllow: /\n\nSitemap: https://x/sitemap.xml\n\nUser-agent: GPTBot\nUser-agent: ClaudeBot\nUser-agent: Google-Extended\nUser-agent: CCBot\nDisallow: /\n';
  const ora = Date.parse('2026-11-11T00:00:00Z');
  const PROVE = [
    ['intestazioni buone: nessun guaio', guaiIntestazioni({ intestazioni: buone }).length === 0],
    ...Object.keys(buone).map((k) => [`senza ${k}`, guaiIntestazioni(senza(k)).length >= 1]),
    ['una CSP con script liberi', guaiIntestazioni({ intestazioni: { ...buone, 'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline'" } }).length === 1],
    ['un HSTS di un giorno', guaiIntestazioni({ intestazioni: { ...buone, 'strict-transport-security': 'max-age=86400' } }).length === 1],
    ['l\'HTTP che non rimanda', guaiRimando({ stato: 200, intestazioni: {} }, 'http://x').length === 1 && guaiRimando({ stato: 308, intestazioni: { location: 'https://x/' } }, 'http://x').length === 0],
    ['una porta privata aperta', guaiPrivata('/api/x', { stato: 200 }).length === 1 && guaiPrivata('/api/x', { stato: 401 }).length === 0],
    ['robots buono: nessun guaio', guaiRobots(robots).length === 0],
    ['robots senza il blocco di GPTBot', guaiRobots(robots.replace('User-agent: GPTBot\n', '')).length === 1],
    ['robots che lascia /api/', guaiRobots(robots.replace('Disallow: /api/\n', '')).length === 1],
    ['security.txt scaduto o quasi', guaiSecurityTxt('Expires: 2026-11-20T00:00:00Z', ora).length === 1 && guaiSecurityTxt('Expires: 2027-08-29T00:00:00Z', ora).length === 0 && guaiSecurityTxt('Contact: x', ora).length === 1],
    ['un certificato che scade fra una settimana', guaiCertificato('2026-11-18T00:00:00Z', ora).length === 1 && guaiCertificato('2027-01-30T00:00:00Z', ora).length === 0],
    ['un /.env che non e\' l\'esca', guaiEsca({ stato: 200, corpo: 'DB_PASSWORD=vera' }, 'canarino').length === 1 && guaiEsca({ stato: 200, corpo: 'DB_PASSWORD=canarino' }, 'canarino').length === 0 && guaiEsca({ stato: 404, corpo: '' }, 'canarino').length === 0],
    ['il codice per mail senza prova', guaiIngresso({ stato: 200 }).length === 1 && guaiIngresso({ stato: 400 }).length === 0],
  ];
  let cieche = 0;
  for (const [che, visto] of PROVE) { console.log((visto ? '  ✓  ' : '  ✗  ') + che + (visto ? '' : '  → PASSA INOSSERVATO')); if (!visto) cieche++; }
  console.log(cieche ? `\n${cieche} ${cieche === 1 ? 'rottura non vista' : 'rotture non viste'}.` : "\nOgni rottura e' vista. ✓");
  process.exit(cieche ? 1 : 0);
}

// ── il giro vero ────────────────────────────────────────────────────────────
async function giro() {
const BASE = (process.argv.slice(2).find((a) => /^https:\/\//.test(a)) || 'https://socialbot.live').replace(/\/+$/, '');
const HOST = new URL(BASE).hostname;

async function chiedi(url, opzioni = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 20_000);
  try {
    const r = await fetch(url, { redirect: 'manual', signal: ac.signal, headers: { 'User-Agent': 'SocialBot-sonda/1 (+https://socialbot.live/.well-known/security.txt)' }, ...opzioni });
    const intestazioni = {};
    r.headers.forEach((v, k) => { intestazioni[k.toLowerCase()] = v; });
    return { stato: r.status, intestazioni, corpo: await r.text() };
  } catch (e) { return { stato: 0, intestazioni: {}, corpo: '', errore: e?.name === 'AbortError' ? 'nessuna risposta in 20 secondi' : (e?.cause?.code || e?.message || 'errore') }; } finally { clearTimeout(t); }
}

// La scadenza del certificato, chiesta a mano: fetch non la da'. Dietro un
// proxy che rifa' il TLS non si puo' misurare, e lo si dice.
function scadenzaCertificato(host) {
  return new Promise((ok) => {
    if (process.env.HTTPS_PROXY || process.env.https_proxy) { ok({ saltato: 'dietro un proxy il certificato che si vede non e\' quello del sito' }); return; }
    const s = tls.connect({ host, port: 443, servername: host, timeout: 15_000 }, () => {
      const c = s.getPeerCertificate();
      ok(s.authorized ? { scade: c.valid_to } : { errore: `il certificato non e' valido: ${s.authorizationError}` });
      s.end();
    });
    s.on('error', (e) => ok({ errore: `nessuna stretta di mano TLS: ${e.code || e.message}` }));
    s.on('timeout', () => { s.destroy(); ok({ errore: 'nessuna stretta di mano TLS in 15 secondi' }); });
  });
}

const esiti = [];
const dice = (guai, che, nota = '') => { esiti.push({ ok: !guai.length, che, guai, nota }); };

console.log(`\nLa sonda guarda ${BASE} da fuori.\n`);
const casa = await chiedi(BASE + '/');
dice(casa.stato === 200 ? [] : [`la pagina iniziale risponde ${casa.stato || casa.errore}`], 'il sito risponde in HTTPS', (casa.intestazioni['server-timing'] || '').replace(/^sbv;desc=/, 'versione '));
if (casa.stato === 200) dice(guaiIntestazioni(casa), 'le intestazioni di sicurezza ci sono');
dice(guaiRimando(await chiedi(BASE.replace(/^https:/, 'http:') + '/'), BASE.replace(/^https:/, 'http:')), 'l\'HTTP rimanda all\'HTTPS');
const cert = await scadenzaCertificato(HOST);
if (cert.saltato) dice([], 'il certificato', 'non misurabile da qui: ' + cert.saltato);
else dice(cert.errore ? [cert.errore] : guaiCertificato(cert.scade), 'il certificato non sta per scadere', cert.scade ? `scade il ${new Date(cert.scade).toISOString().slice(0, 10)}` : '');
for (const via of PRIVATE) dice(guaiPrivata(via, await chiedi(BASE + via)), `${via} resta chiusa senza sessione`);
for (const via of PUBBLICI) { const r = await chiedi(BASE + via); dice(r.stato === 200 ? [] : [`${via} risponde ${r.stato || r.errore}`], `${via} c'e'`); if (via === '/robots.txt' && r.stato === 200) dice(guaiRobots(r.corpo), 'robots.txt chiude a chi addestra e le aree private'); if (via === '/.well-known/security.txt' && r.stato === 200) dice(guaiSecurityTxt(r.corpo), 'security.txt non e\' scaduto'); }
dice(guaiIngresso(await chiedi(BASE + '/api/ingresso/mail/codice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"mail":"sonda@example.invalid"}' })), 'il codice per mail non parte senza la prova di lavoro');
let canarino = '';
try { canarino = (/const CANARINO = '([^']+)'/.exec(readFileSync(join(RAD, 'src/web/esche.js'), 'utf8')) || [])[1] || ''; } catch { /* senza il sorgente si guarda solo che non risponda */ }
dice(guaiEsca(await chiedi(BASE + '/.env'), canarino), 'l\'esca e\' ancora un\'esca');

let rossi = 0;
for (const e of esiti) {
  console.log(`  ${e.ok ? '✓' : '✗'} ${e.che}${e.nota ? `  (${e.nota})` : ''}`);
  for (const g of e.guai) { console.log(`      ${g}`); rossi++; }
}
console.log(rossi ? `\n${rossi} ${rossi === 1 ? 'cosa non torna' : 'cose non tornano'} sul sito vero.` : '\nIl sito, da fuori, e\' come deve essere. ✓');
process.exit(rossi ? 1 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--selftest')) await autoprova(); else await giro();
}
