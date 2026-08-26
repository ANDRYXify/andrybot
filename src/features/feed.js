// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// Lettore di FEED generici: RSS 2.0, Atom e JSON Feed.
//
// A cosa serve. Instagram non ha un modo onesto e stabile di sapere "e uscito un
// post nuovo" senza la Graph API: qualunque scraper si rompe. Invece di fingere
// il contrario, qui c'e una PRESA: lo streamer incolla l'indirizzo di un feed
// (RSSHub, RSS-Bridge, un ponte suo, o qualunque servizio che gliene dia uno) e
// noi lo leggiamo. Vale per Instagram come per qualunque altra cosa.
//
// Sicurezza. L'indirizzo lo scrive l'utente, quindi il server diventerebbe un
// "fetcher" di URL arbitrari: senza guardia si potrebbe farlo bussare a indirizzi
// interni (SSRF). Percio prima di ogni richiesta si risolve il nome e si
// rifiutano gli indirizzi privati, e si rifiutano i redirect verso host diversi.

import dns from 'node:dns/promises';
import net from 'node:net';
import { makeLog } from '../logger.js';

const log = makeLog('feed');
const TIMEOUT_MS = 12000;
const MAX_BYTE = 2_000_000;
const UA = 'SocialBot/1.0 (+https://socialbot.live)';

function privato(ip) {
  if (net.isIPv4(ip)) {
    const p = ip.split('.').map(Number);
    if (p[0] === 10 || p[0] === 127 || p[0] === 0) return true;
    if (p[0] === 169 && p[1] === 254) return true;              // link-local / metadati cloud
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // CGNAT
    return false;
  }
  const s = String(ip).toLowerCase();
  if (s === '::1' || s === '::') return true;
  if (s.startsWith('fc') || s.startsWith('fd')) return true;    // ULA
  if (s.startsWith('fe80')) return true;                        // link-local
  if (s.startsWith('::ffff:')) return privato(s.slice(7));
  return false;
}

export async function indirizzoAmmesso(url) {
  let u;
  try { u = new URL(String(url || '').trim()); } catch { return { ok: false, errore: 'indirizzo non valido' }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false, errore: 'servono http o https' };
  if (!u.hostname) return { ok: false, errore: 'manca il nome del sito' };
  if (/^localhost$/i.test(u.hostname) || u.hostname.endsWith('.local') || u.hostname.endsWith('.internal')) {
    return { ok: false, errore: 'indirizzo interno non ammesso' };
  }
  try {
    const ind = await dns.lookup(u.hostname, { all: true });
    if (!ind.length) return { ok: false, errore: 'nome non risolto' };
    if (ind.some((a) => privato(a.address))) return { ok: false, errore: 'indirizzo interno non ammesso' };
  } catch { return { ok: false, errore: 'nome non risolto' }; }
  return { ok: true, url: u.toString() };
}

async function scarica(url) {
  const via = await indirizzoAmmesso(url);
  if (!via.ok) return { ok: false, errore: via.errore };
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(via.url, {
      signal: ac.signal,
      redirect: 'manual',
      headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/atom+xml, application/json, text/xml, */*' },
    });
    if (r.status >= 300 && r.status < 400) {
      const dove = r.headers.get('location') || '';
      const seg = await indirizzoAmmesso(new URL(dove, via.url).toString());
      if (!seg.ok) return { ok: false, errore: 'reindirizzamento non ammesso' };
      const r2 = await fetch(seg.url, { signal: ac.signal, redirect: 'manual', headers: { 'User-Agent': UA } });
      if (!r2.ok) return { ok: false, errore: `il sito risponde ${r2.status}` };
      return { ok: true, testo: (await r2.text()).slice(0, MAX_BYTE) };
    }
    if (!r.ok) return { ok: false, errore: `il sito risponde ${r.status}` };
    return { ok: true, testo: (await r.text()).slice(0, MAX_BYTE) };
  } catch (e) {
    return { ok: false, errore: e?.name === 'AbortError' ? 'il sito non risponde (troppo lento)' : (e?.message || 'errore di rete') };
  } finally { clearTimeout(to); }
}

const ent = (s) => String(s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const dentro = (blocco, tag) => {
  const m = blocco.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? ent(m[1]) : '';
};

function daXml(testo) {
  const voci = [];
  const pezzi = testo.split(/<item[\s>]/i).slice(1);
  if (pezzi.length) {
    for (const p of pezzi.slice(0, 12)) {
      const titolo = dentro(p, 'title');
      const url = dentro(p, 'link') || (p.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || '';
      const id = dentro(p, 'guid') || url || titolo;
      if (id) voci.push({ id, titolo, url, data: dentro(p, 'pubDate') });
    }
    return voci;
  }
  for (const p of testo.split(/<entry[\s>]/i).slice(1).slice(0, 12)) {
    const titolo = dentro(p, 'title');
    const url = (p.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i) || p.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || '';
    const id = dentro(p, 'id') || url || titolo;
    if (id) voci.push({ id, titolo, url, data: dentro(p, 'published') || dentro(p, 'updated') });
  }
  return voci;
}

function daJson(testo) {
  try {
    const d = JSON.parse(testo);
    const items = Array.isArray(d.items) ? d.items : (Array.isArray(d) ? d : []);
    return items.slice(0, 12).map((i) => ({
      id: String(i.id || i.guid || i.url || i.link || i.title || ''),
      titolo: ent(i.title || i.content_text || i.summary || ''),
      url: String(i.url || i.external_url || i.link || ''),
      data: String(i.date_published || i.published || i.date || ''),
    })).filter((v) => v.id);
  } catch { return []; }
}

// Legge un feed e restituisce le voci, dalla piu recente. Non decide nulla:
// chi chiama confronta con l'ultima vista e decide se avvisare.
export async function leggi(url) {
  const r = await scarica(url);
  if (!r.ok) return { ok: false, errore: r.errore };
  const t = (r.testo || '').trim();
  if (!t) return { ok: false, errore: 'risposta vuota' };
  const voci = /^[[{]/.test(t) ? daJson(t) : daXml(t);
  if (!voci.length) return { ok: false, errore: 'non ho trovato voci: e davvero un feed RSS, Atom o JSON?' };
  return { ok: true, voci };
}

export async function prova(url) {
  const r = await leggi(url);
  if (!r.ok) return r;
  log.debug(`feed ok: ${r.voci.length} voci da ${url}`);
  return { ok: true, quante: r.voci.length, prima: r.voci[0] };
}
