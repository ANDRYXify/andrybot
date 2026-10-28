// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE DESTINAZIONI DELLA DIRETTA (docs/DIRETTA.md, «Partire senza sorprese, e le
// destinazioni in un gesto»).
//
//  · Si incolla quello che da' la piattaforma: indirizzo e chiave nei loro
//    campi, o l'indirizzo intero con la chiave in fondo (`leggiIndirizzo`).
//  · Solo indirizzi pubblici: il server non si collega mai alla sua rete, ne'
//    ffmpeg ne' la prova (`controllaIndirizzo`, `ipPubblico`).
//  · «Prova»: la stretta di mano RTMP e basta, senza pubblicare niente
//    (`provaRtmp`). La prova si collega all'indirizzo che ha controllato, non
//    risolve il nome una seconda volta.
import net from 'node:net';
import tls from 'node:tls';
import { randomBytes } from 'node:crypto';
import { promises as dnsP } from 'node:dns';

const MAX = 300;
const SPAZI = /[\s\u0000-\u001f]/g;

// rtmp(s)://host[:porta]/... → { sicuro, host, porta, percorso, ricerca } o null
export function hostDi(url) {
  const m = /^((rtmps?):\/\/(\[[0-9a-f:.]+\]|[^/:?#\s]+)(?::(\d{1,5}))?)(\/[^?#]*)?(\?[^#]*)?$/i.exec(String(url || ''));
  if (!m) return null;
  const sicuro = m[2].toLowerCase() === 'rtmps';
  const porta = m[4] ? Number(m[4]) : (sicuro ? 443 : 1935);
  if (!(porta > 0 && porta < 65536)) return null;
  return { origine: m[1], sicuro, host: m[3].replace(/^\[|\]$/g, '').toLowerCase(), porta, percorso: m[5] || '', ricerca: m[6] || '' };
}

// L'indirizzo e la chiave come li incolla lo streamer. Senza chiave, se
// l'indirizzo ne porta una (`rtmp://host/app/chiave?…`), la prima parte del
// percorso e' l'applicazione e il resto e' la chiave.
export function leggiIndirizzo(server, chiave = '') {
  let s = String(server || '').replace(SPAZI, '').replace(/\/+$/, '');
  let k = String(chiave || '').replace(SPAZI, '');
  const h = hostDi(s);
  if (!h) return { ok: false, motivo: 'forma' };
  if (!k) {
    const parti = h.percorso.split('/').filter(Boolean);
    if (parti.length < 2) return { ok: false, motivo: 'chiave' };
    s = h.origine + '/' + parti[0];
    k = parti.slice(1).join('/') + h.ricerca;
  }
  if (!k || k.length > MAX || s.length > MAX) return { ok: false, motivo: 'chiave' };
  return { ok: true, server: s, chiave: k };
}

// Il nome di una piattaforma dal suo host, solo dove e' sicuro.
const NOMI = [
  [/(^|\.)youtube\.com$/, 'YouTube'], [/(^|\.)facebook\.com$/, 'Facebook'], [/(^|\.)twitch\.tv$|^ingest\.global-contribute\.live-video\.net$/, 'Twitch'],
  [/(^|\.)(tiktok|tiktokcdn|tiktokcdn-us)\.com$/, 'TikTok'], [/(^|\.)restream\.io$/, 'Restream'], [/(^|\.)trovo\.live$/, 'Trovo'], [/(^|\.)dlive\.tv$/, 'DLive'],
];
export function nomeDaHost(url) {
  const h = hostDi(url);
  if (!h) return '';
  for (const [re, nome] of NOMI) if (re.test(h.host)) return nome;
  return '';
}

// Un indirizzo IP e' pubblico? Niente loopback, reti private, link-local,
// CGNAT, multicast, riservati e documentazione; per l'IPv6 anche ULA, e gli
// IPv4 dentro (mappati, NAT64) si guardano come IPv4.
export function ipPubblico(ip) {
  const v = net.isIP(String(ip || ''));
  if (v === 4) {
    const [a, b, c] = String(ip).split('.').map(Number);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 192 && b === 0 && (c === 0 || c === 2)) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    if (a === 198 && b === 51 && c === 100) return false;
    if (a === 203 && b === 0 && c === 113) return false;
    return true;
  }
  if (v === 6) {
    const x = String(ip).toLowerCase();
    const v4 = /^(?:::ffff:|64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/.exec(x);
    if (v4) return ipPubblico(v4[1]);
    const gruppi = espandi6(x);
    if (!gruppi) return false;
    if (gruppi.every((g) => g === 0)) return false;
    if (gruppi.slice(0, 7).every((g) => g === 0) && gruppi[7] === 1) return false;
    if (gruppi.slice(0, 5).every((g) => g === 0) && gruppi[5] === 0xffff) return false;
    if ((gruppi[0] & 0xfe00) === 0xfc00) return false;
    if ((gruppi[0] & 0xffc0) === 0xfe80) return false;
    if ((gruppi[0] & 0xff00) === 0xff00) return false;
    if (gruppi[0] === 0x2001 && gruppi[1] === 0x0db8) return false;
    if (gruppi[0] === 0x64 && gruppi[1] === 0xff9b) return false;
    return true;
  }
  return false;
}
function espandi6(x) {
  if (x.includes('.')) return null;
  const [sx, dx] = x.split('::');
  if (x.split('::').length > 2) return null;
  const a = sx ? sx.split(':') : [], b = dx !== undefined && dx ? dx.split(':') : [];
  const zeri = dx === undefined ? 0 : 8 - a.length - b.length;
  const tutti = [...a, ...Array(Math.max(0, zeri)).fill('0'), ...b];
  if (tutti.length !== 8 || tutti.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return tutti.map((g) => parseInt(g, 16));
}

const NOMI_INTERNI = /(^|\.)(localhost|local|internal|lan|home|intranet|corp|localdomain)$/;
// Il controllo di un indirizzo: { ok, ip } (l'indirizzo controllato, per
// collegarsi proprio li') o { ok: false, motivo: 'forma'|'interno'|'nome'|'privato' }.
export async function controllaIndirizzo(url, { risolvi = (h) => dnsP.lookup(h, { all: true, verbatim: true }) } = {}) {
  const h = hostDi(url);
  if (!h) return { ok: false, motivo: 'forma' };
  if (net.isIP(h.host)) return ipPubblico(h.host) ? { ok: true, ip: h.host, h } : { ok: false, motivo: 'privato' };
  if (!h.host.includes('.') || NOMI_INTERNI.test(h.host)) return { ok: false, motivo: 'interno' };
  let indirizzi;
  try { indirizzi = (await risolvi(h.host)).map((x) => x.address); } catch { return { ok: false, motivo: 'nome' }; }
  if (!indirizzi.length) return { ok: false, motivo: 'nome' };
  if (!indirizzi.every(ipPubblico)) return { ok: false, motivo: 'privato' };
  return { ok: true, ip: indirizzi[0], h };
}

// LA PROVA: risolve, si collega (TLS per rtmps, col nome giusto), manda C0+C1
// e aspetta S0+S1. Poi chiude: niente si pubblica, niente va in onda.
// → { ok, ms } o { ok: false, passo: 'forma'|'interno'|'nome'|'privato'|'irraggiungibile'|'tls'|'rtmp'|'tempo' }
export async function provaRtmp(url, { risolvi, connetti = null, timeoutMs = 6000, ora = () => Date.now() } = {}) {
  const c = await controllaIndirizzo(url, risolvi ? { risolvi } : {});
  if (!c.ok) return { ok: false, passo: c.motivo };
  const inizio = ora();
  return new Promise((ok) => {
    let finito = false, ricevuti = Buffer.alloc(0), sock;
    const chiudi = (r) => { if (finito) return; finito = true; clearTimeout(t); try { sock?.destroy(); } catch { /* gia' chiuso */ } ok(r); };
    const t = setTimeout(() => chiudi({ ok: false, passo: 'tempo' }), timeoutMs);
    const apri = connetti || ((o) => (o.sicuro
      ? tls.connect({ host: o.ip, port: o.porta, servername: net.isIP(o.host) ? undefined : o.host, ALPNProtocols: [] })
      : net.connect({ host: o.ip, port: o.porta })));
    try { sock = apri({ ip: c.ip, host: c.h.host, porta: c.h.porta, sicuro: c.h.sicuro }); } catch { chiudi({ ok: false, passo: 'irraggiungibile' }); return; }
    const c1 = Buffer.concat([Buffer.from([3]), Buffer.alloc(8), randomBytes(1528)]);
    sock.once(c.h.sicuro && !connetti ? 'secureConnect' : 'connect', () => { try { sock.write(c1); } catch { /* lo dice l'errore */ } });
    sock.on('data', (d) => {
      ricevuti = Buffer.concat([ricevuti, d]);
      if (ricevuti[0] !== 3) chiudi({ ok: false, passo: 'rtmp' });
      else if (ricevuti.length >= 1537) chiudi({ ok: true, ms: ora() - inizio });
    });
    sock.on('error', (e) => {
      const codice = String(e?.code || '');
      chiudi({ ok: false, passo: /CERT|TLS|SSL|EPROTO|ERR_SSL|HOSTNAME/i.test(codice + ' ' + (e?.message || '')) ? 'tls' : 'irraggiungibile' });
    });
    sock.on('close', () => chiudi({ ok: false, passo: ricevuti.length ? 'rtmp' : 'irraggiungibile' }));
  });
}
