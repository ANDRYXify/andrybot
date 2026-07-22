// Pre-addestramento automatico: quando uno streamer viene abilitato (o
// su richiesta dalla dashboard), il bot "studia" la sua pagina profilo
// sul sito madre (SITE_URL/u/<login>) e il suo profilo Twitch, e riempie
// la knowledge base con voci di fonte 'auto'. Niente librerie: fetch
// globale e parsing HTML con regex prudenti. Non lancia MAI.
import { config } from '../config.js';
import { makeLog } from '../logger.js';
import { knowledge, memory } from '../db.js';

const log = makeLog('pretrain');

// Piattaforme riconosciute nei link della pagina profilo.
const PIATTAFORME = [
  { nome: 'youtube',   etichetta: 'YouTube',   host: ['youtube.com', 'youtu.be'] },
  { nome: 'instagram', etichetta: 'Instagram', host: ['instagram.com'] },
  { nome: 'tiktok',    etichetta: 'TikTok',    host: ['tiktok.com'] },
  { nome: 'twitter',   etichetta: 'Twitter/X', host: ['twitter.com', 'x.com'] },
  { nome: 'discord',   etichetta: 'Discord',   host: ['discord.gg', 'discord.com'] },
  { nome: 'telegram',  etichetta: 'Telegram',  host: ['t.me', 'telegram.me'] },
  { nome: 'kick',      etichetta: 'Kick',      host: ['kick.com'] },
  { nome: 'facebook',  etichetta: 'Facebook',  host: ['facebook.com', 'fb.com'] },
  { nome: 'twitch',    etichetta: 'Twitch',    host: ['twitch.tv'] },
  { nome: 'spotify',   etichetta: 'Spotify',   host: ['spotify.com'] },
  { nome: 'github',    etichetta: 'GitHub',    host: ['github.com'] },
];

// host da ignorare quando cerchiamo il "sito personale" generico
const HOST_TECNICI = ['cdn', 'fonts.', 'gstatic', 'googleapis', 'cloudflare', 'jsdelivr', 'unpkg'];

// --------------------------------------------------------------- utilità

// fetch con timeout e User-Agent dedicato; null se non ok o errore
async function scaricaPagina(url, timeoutMs = 10_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'AndryBot/1.0' },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// decodifica le entità HTML più comuni (incluse quelle numeriche)
function decodificaEntita(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(0x10ffff, +n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Math.min(0x10ffff, parseInt(n, 16))))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ');
}

// contenuto del <title>, o ''
function estraiTitolo(html) {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? decodificaEntita(m[1]).replace(/\s+/g, ' ').trim() : '';
}

// meta description oppure og:description, o ''
function estraiDescrizione(html) {
  let normale = '';
  let og = '';
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attr = {};
    for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      attr[m[1].toLowerCase()] = m[2] ?? m[3] ?? '';
    }
    const chiave = attr.name || attr.property || '';
    if (chiave === 'description' && attr.content) normale = attr.content;
    if (chiave === 'og:description' && attr.content) og = attr.content;
  }
  return decodificaEntita(normale || og).replace(/\s+/g, ' ').trim();
}

// tutti gli href assoluti (http/https) trovati nei tag <a>
function estraiLink(html) {
  const link = [];
  for (const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    const url = decodificaEntita(m[1] ?? m[2] ?? '').trim();
    if (/^https?:\/\//i.test(url)) link.push(url);
  }
  return link;
}

// testo "visibile" della pagina: via script/style/tag, spazi compressi
function estraiTesto(html) {
  return decodificaEntita(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim();
}

// true se hostname appartiene a uno dei domini indicati (o a un sottodominio)
function stessoDominio(hostname, dominio) {
  return hostname === dominio || hostname.endsWith('.' + dominio);
}

// taglia un testo a ~max caratteri senza spezzare le parole
function accorcia(testo, max = 400) {
  const t = String(testo || '').trim();
  if (t.length <= max) return t;
  const taglio = t.lastIndexOf(' ', max);
  return t.slice(0, taglio > max * 0.6 ? taglio : max).trim() + '…';
}

// --------------------------------------------------------------- pretrain

// Pre-addestra il bot per uno streamer. Rieseguibile in ogni momento:
// le voci 'auto' precedenti vengono azzerate e ricreate da capo.
// Ritorna sempre { ok, voci, dettaglio } — mai un'eccezione.
export async function pretrain(login, helix) {
  const canale = String(login || '').toLowerCase().trim();
  let voci = 0;
  const dettagli = [];

  try {
    if (!canale) return { ok: false, voci: 0, dettaglio: 'login mancante' };

    // il pre-addestramento si può rieseguire: si riparte puliti
    knowledge.clearBySource(canale, 'auto');

    const aggiungi = (domanda, risposta) => {
      const r = String(risposta || '').trim();
      if (!r) return;
      knowledge.add(canale, { domanda, risposta: r, fonte: 'auto' });
      voci++;
    };

    // ---- (a) pagina profilo sul sito madre -------------------------------
    const html = await scaricaPagina(`${config.siteUrl}/u/${canale}`);
    if (!html) {
      dettagli.push('pagina profilo non trovata');
    } else {
      const titolo = estraiTitolo(html);
      const descrizione = estraiDescrizione(html);
      if (descrizione) {
        aggiungi(
          `descrizione di ${canale} / di cosa parla il canale / che contenuti fai`,
          accorcia(descrizione),
        );
      }

      // link alle piattaforme social
      let hostSito = '';
      try { hostSito = new URL(config.siteUrl).hostname; } catch { /* pazienza */ }
      const trovate = new Map();   // nome piattaforma → url (il primo trovato vince)
      let sitoPersonale = '';
      for (const url of estraiLink(html)) {
        let hostname = '';
        try { hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { continue; }
        if (!hostname || (hostSito && stessoDominio(hostname, hostSito.replace(/^www\./, '')))) continue;

        const piattaforma = PIATTAFORME.find((p) => p.host.some((h) => stessoDominio(hostname, h)));
        if (piattaforma) {
          if (!trovate.has(piattaforma.nome)) trovate.set(piattaforma.nome, url);
        } else if (!sitoPersonale && !HOST_TECNICI.some((t) => hostname.includes(t))) {
          sitoPersonale = url;   // primo link esterno non riconosciuto = sito personale
        }
      }
      for (const [nome, url] of trovate) {
        const p = PIATTAFORME.find((x) => x.nome === nome);
        aggiungi(
          `dove trovo ${canale} su ${nome} / link ${nome} / canale ${nome}`,
          `Mi trovi su ${p.etichetta} qui: ${url}`,
        );
      }
      if (sitoPersonale) {
        aggiungi(
          `sito di ${canale} / sito ufficiale / dove trovo ${canale} sul web`,
          `Il mio sito: ${sitoPersonale}`,
        );
      }

      // bio dal testo visibile della pagina
      const testo = estraiTesto(html);
      if (testo.length > 80) {
        aggiungi(`chi è ${canale} / parlami di te / bio`, accorcia(testo, 400));
      }

      dettagli.push(`pagina profilo letta${titolo ? ` ("${accorcia(titolo, 60)}")` : ''}, ${trovate.size + (sitoPersonale ? 1 : 0)} link social`);
    }

    // ---- (b) profilo Twitch ---------------------------------------------
    try {
      const utente = await helix?.getUserByLogin?.(canale);
      if (utente) {
        if (String(utente.description || '').trim()) {
          aggiungi(
            `chi è ${canale} su twitch / bio twitch / descrizione twitch`,
            accorcia(utente.description.trim(), 400),
          );
        }
        try {
          const info = await helix.getChannelInfo(utente.id);
          if (info?.game_name) {
            memory.setFact(canale, 'gioco_recente', info.game_name);
            dettagli.push(`gioco recente: ${info.game_name}`);
          }
        } catch { /* la categoria non è indispensabile */ }
        dettagli.push('profilo twitch letto');
      } else {
        dettagli.push('utente twitch non trovato');
      }
    } catch (e) {
      dettagli.push('twitch non raggiungibile');
      log.warn(`pretrain ${canale}: helix:`, e?.message || e);
    }

    // ---- (c) traccia dell'esito -----------------------------------------
    const dettaglio = `${voci} voci create — ${dettagli.join('; ')}`;
    memory.setFact(canale, 'preaddestramento_ts', String(Date.now()));
    memory.setFact(canale, 'preaddestramento_esito', accorcia(dettaglio, 300));
    log.info(`pretrain ${canale}: ${dettaglio}`);

    return { ok: voci > 0, voci, dettaglio };
  } catch (e) {
    log.error(`pretrain ${canale}:`, e?.message || e);
    return { ok: false, voci, dettaglio: 'errore inatteso: ' + (e?.message || e) };
  }
}
