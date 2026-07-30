// Pre-addestramento automatico: quando uno streamer viene abilitato (o su
// richiesta dalla dashboard), il bot "studia" il PROPRIO profilo pubblico
// dello streamer e il suo profilo Twitch, e riempie la knowledge base con
// voci di fonte 'auto'. Niente librerie: solo fetch globale. Non lancia MAI.
//
// IMPORTANTE — perché NON scarichiamo più l'HTML della pagina profilo.
// Il sito madre è una single-page app: chiedendo SITE_URL/u/<login> il
// server risponde SEMPRE con lo stesso guscio HTML dell'app, con <title>,
// meta description e link generici del sito (di fatto quelli del
// PROPRIETARIO). Estraendo descrizione/social da lì, il bot finiva per
// assegnare a OGNI streamer la descrizione e i social dell'owner — "per il
// bot erano tutti andryxify". Adesso leggiamo i dati SOLO dall'API JSON
// per-streamer (SITE_URL/api/streamer-verify?action=link_page&login=<login>),
// che ritorna i dati REALI di quello streamer oppure 404 se non ha una
// pagina pubblica: in quel caso non seminiamo NULLA dal sito.
import { config } from '../config.js';
import { makeLog } from '../logger.js';
import { knowledge, memory, linkPage } from '../db.js';

const log = makeLog('pretrain');

// nome piattaforma → etichetta leggibile. Le chiavi combaciano con i social
// della vetrina restituiti dall'API (youtube/instagram/tiktok/discord/spotify);
// le altre restano per robustezza se l'API un giorno ne aggiungesse.
const ETICHETTE = {
  youtube:   'YouTube',
  instagram: 'Instagram',
  tiktok:    'TikTok',
  discord:   'Discord',
  spotify:   'Spotify',
  twitter:   'Twitter/X',
  telegram:  'Telegram',
  kick:      'Kick',
  facebook:  'Facebook',
  twitch:    'Twitch',
};

// --------------------------------------------------------------- utilità

// GET JSON con timeout e User-Agent dedicato. Ritorna:
//   { stato: 200, dati }  se ok
//   { stato: 404 }        se la pagina non esiste (profilo senza vetrina)
//   { stato: 0 }          se rete/timeout/altro (trattato come "non disponibile")
async function scaricaJson(url, timeoutMs = 10_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'SocialBot/1.0', Accept: 'application/json' },
    });
    if (res.status === 404) return { stato: 404 };
    if (!res.ok) return { stato: 0 };
    const dati = await res.json().catch(() => null);
    return dati ? { stato: 200, dati } : { stato: 0 };
  } catch {
    return { stato: 0 };
  } finally {
    clearTimeout(timer);
  }
}

// taglia un testo a ~max caratteri senza spezzare le parole
function accorcia(testo, max = 400) {
  const t = String(testo || '').replace(/\s+/g, ' ').trim();
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

    // ---- (a) profilo pubblico dello streamer sul sito madre --------------
    // SOLO via API JSON per-streamer: dati REALI di QUESTO streamer, o 404.
    const url = `${config.siteUrl}/api/streamer-verify?action=link_page&login=${encodeURIComponent(canale)}`;
    const risp = await scaricaJson(url);
    if (risp.stato === 404) {
      dettagli.push('nessuna pagina profilo pubblica (niente da imparare dal sito)');
    } else if (risp.stato !== 200 || !risp.dati || String(risp.dati.login || '').toLowerCase() !== canale) {
      // difesa extra: se per qualunque motivo il login non combacia, NON usiamo i dati
      dettagli.push('pagina profilo non disponibile');
    } else {
      const p = risp.dati;
      const lp = p.linkPage || {};

      // descrizione / bio: la bio della vetrina, oppure headline+tagline della link-page
      const descrizione = String(p.bio || '').trim()
        || [lp.headline, lp.tagline].map((x) => String(x || '').trim()).filter(Boolean).join(' — ');
      if (descrizione) {
        aggiungi(
          `descrizione di ${canale} / chi è ${canale} / di cosa parla il canale / che contenuti fai / parlami di te / bio`,
          accorcia(descrizione, 400),
        );
      }

      // programmazione / orari
      if (String(p.programmazione || '').trim()) {
        aggiungi(
          `quando è live ${canale} / orari / che giorni streamma / programmazione`,
          accorcia(p.programmazione, 300),
        );
      }

      // social della vetrina — per-streamer, MAI del sito
      const socials = p.socials && typeof p.socials === 'object' ? p.socials : {};
      let nSocial = 0;
      for (const [nome, urlSocial] of Object.entries(socials)) {
        const u = String(urlSocial || '').trim();
        if (!/^https?:\/\//i.test(u)) continue;
        const etichetta = ETICHETTE[nome] || (nome.charAt(0).toUpperCase() + nome.slice(1));
        aggiungi(
          `dove trovo ${canale} su ${nome} / link ${nome} / canale ${nome}`,
          `Mi trovi su ${etichetta} qui: ${u}`,
        );
        nSocial++;
      }

      dettagli.push(`pagina profilo letta (${nSocial} social)`);
    }

    // ---- (a2) i link della SUA pagina /u/<login>, dal NOSTRO DB -----------
    // La pagina link è di SocialBot, quindi i link li leggiamo in casa: così il
    // bot sa rispondere "dove ti trovo" anche se sul sito non c'è nulla.
    try {
      const mia = linkPage.get(canale);
      let nLink = 0;
      for (const l of (mia?.links || [])) {
        const u = String(l?.url || '').trim();
        const label = String(l?.label || '').trim();
        if (!label || !/^https?:\/\//i.test(u)) continue;
        aggiungi(`link ${label} di ${canale} / ${label}`, `${label}: ${u}`);
        if (++nLink >= 12) break;   // niente muri di link
      }
      if (nLink) {
        aggiungi(
          `tutti i link di ${canale} / dove ti trovo / i tuoi social / linktree`,
          `Trovi tutti i miei link qui: ${config.baseUrl}/u/${canale}`,
        );
        dettagli.push(`${nLink} link dalla tua pagina /u/${canale}`);
      }
    } catch (e) { dettagli.push('pagina link non leggibile'); }

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
