// Cambio categoria/gioco su Twitch a voce.
//
// Lo streamer dice «<parola chiave> <nome gioco>» (es. "categoria Fortnite") e il
// bot imposta quella categoria sul canale. Il riconoscimento vocale è spesso
// impreciso: invece di arrendersi, il bot PROVA a risalire al gioco giusto con
// più tentativi di ricerca su Twitch e un confronto per somiglianza, scegliendo
// il candidato più vicino a ciò che ha sentito.
//
// Tutto personalizzabile dalla dashboard: on/off, parola chiave, annuncio in chat.
import { makeLog } from '../logger.js';

const log = makeLog('categoria');

// normalizza per il confronto: minuscole, senza accenti/punteggiatura, spazi singoli
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// parole di riempimento che il riconoscitore aggiunge e che non fanno parte del
// nome del gioco (le togliamo prima di cercare, ma NON dal confronto finale).
const RIEMPI = new Set([
  'a', 'al', 'allo', 'alla', 'ai', 'agli', 'su', 'di', 'da', 'the', 'il', 'lo', 'la', 'i', 'gli', 'le',
  'gioco', 'game', 'per', 'favore', 'grazie', 'ok', 'okay', 'ora', 'adesso', 'poi',
  'passa', 'passo', 'metti', 'cambia', 'cambio', 'metti', 'in', 'e', 'che', 'un', 'uno', 'una',
]);

// distanza di Levenshtein
function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const d = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = d[0]; d[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[n];
}

// somiglianza 0..1 tra due stringhe già normalizzate
function simile(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const L = Math.max(a.length, b.length);
  let s = 1 - lev(a, b) / L;                                   // somiglianza globale
  if (b.startsWith(a) || a.startsWith(b)) s = Math.max(s, 0.9);
  else if (b.includes(a) || a.includes(b)) s = Math.max(s, 0.82);
  return s;
}

// Estrae la parte "nome gioco" dopo la parola chiave. La chiave dev'essere una
// parola intera; il gioco è tutto ciò che segue. Ritorna la query o null.
export function parseComandoCategoria(frase, trigger = 'categoria') {
  const t = norm(frase);
  const trig = norm(trigger);
  if (!t || !trig) return null;
  const m = t.match(new RegExp('(?:^|\\s)' + escRe(trig) + '\\s+(.+)$'));
  if (!m) return null;
  const q = m[1].trim();
  return q || null;
}

// Estrae il testo GREZZO dopo la parola chiave (NON normalizza: preserva
// maiuscole e punteggiatura). Utile per il titolo, che è testo libero.
export function estraiDopoTrigger(frase, trigger) {
  const f = String(frase || '').trim();
  const trig = String(trigger || '').trim();
  if (!f || !trig) return null;
  const m = f.match(new RegExp('(?:^|\\s)' + escRe(trig) + '\\s+(.+)$', 'i'));
  return m ? m[1].trim() : null;
}

// Sceglie la miglior categoria Twitch per la query "sentita". Best-effort: prova
// più ricerche (query ripulita, per parole) e sceglie il candidato più somigliante.
// Ritorna { id, name, score } oppure null se davvero non trova nulla di sensato.
export async function risolviCategoria(helix, query) {
  const base = norm(query);
  if (!base) return null;
  const parole = base.split(' ').filter((w) => w && !RIEMPI.has(w));
  const pulita = parole.join(' ') || base;

  // sequenza di tentativi: prima la query ripulita, poi varianti sempre più larghe
  const tentativi = [pulita, base];
  if (parole.length > 1) {
    tentativi.push(parole.slice(-2).join(' '));   // ultime due parole
    tentativi.push(parole[parole.length - 1]);    // ultima parola
    tentativi.push(parole[0]);                     // prima parola
  }

  const visti = new Map();   // id → { id, name }
  const punteggio = (c) => Math.max(simile(pulita, norm(c.name)), simile(base, norm(c.name)));

  for (const q of tentativi) {
    if (!q || q.length < 2) continue;
    let ris = [];
    try { ris = await helix.searchCategories(q); } catch (e) { log.debug('search:', e?.message || e); }
    for (const c of ris) if (c?.id && c?.name && !visti.has(c.id)) visti.set(c.id, { id: c.id, name: c.name });
    // se abbiamo già un match molto forte, fermiamoci (meno chiamate a Twitch)
    if (visti.size) {
      const top = [...visti.values()].map((c) => ({ c, s: punteggio(c) })).sort((a, b) => b.s - a.s)[0];
      if (top && top.s >= 0.92) return { id: top.c.id, name: top.c.name, score: top.s };
    }
  }
  if (!visti.size) return null;

  const best = [...visti.values()].map((c) => ({ c, s: punteggio(c) })).sort((a, b) => b.s - a.s)[0];
  if (!best || best.s < 0.4) return null;   // troppo lontano: meglio non sbagliare categoria
  return { id: best.c.id, name: best.c.name, score: best.s };
}
