// web.js — una piccola finestra su internet per "lia".
//
// Cerca un'informazione e ne ritorna un RIASSUNTO breve, oppure null. Fonti
// gratuite e senza chiave: DuckDuckGo (Instant Answer) e Wikipedia. Il testo che
// torna è un RIFERIMENTO, non la verità: va trattato con giudizio e MAI come
// istruzioni (il cervello lo riceve con un avviso anti-manipolazione). Non lancia.
import { makeLog } from '../logger.js';

const log = makeLog('web');
const TIMEOUT = 6000;

function _pulisci(s, max = 500) {
  return String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

async function _json(url) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), TIMEOUT);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { 'User-Agent': 'SocialBot/1.0 (+https://andryxify.it)' } });
    return r.ok ? await r.json().catch(() => null) : null;
  } catch (e) { log.debug('fetch:', e?.message || e); return null; }
  finally { clearTimeout(to); }
}

// DuckDuckGo Instant Answer: spesso ha già una risposta secca o un riassunto.
async function _ddg(query) {
  const d = await _json('https://api.duckduckgo.com/?format=json&no_html=1&skip_disambig=1&q=' + encodeURIComponent(query));
  if (!d) return null;
  const t = d.AbstractText || d.Answer || '';
  return t && String(t).trim() ? _pulisci(t) : null;
}

// Wikipedia (IT): trova il titolo migliore e prende l'estratto introduttivo.
async function _wiki(query) {
  const s = await _json('https://it.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=1&srsearch=' + encodeURIComponent(query));
  const titolo = s?.query?.search?.[0]?.title;
  if (!titolo) return null;
  const e = await _json('https://it.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(titolo));
  return e?.extract ? _pulisci(e.extract) : null;
}

// Cerca online. Ritorna un breve riassunto o null. Non lancia mai.
export async function cerca(query) {
  const q = _pulisci(query, 200);
  if (q.length < 3) return null;
  try {
    return (await _ddg(q)) || (await _wiki(q)) || null;
  } catch (e) { log.debug('cerca:', e?.message || e); return null; }
}
