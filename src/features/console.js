// console.js — le AZIONI del canale, e la porta da cui si premono.
//
// CONSOLify (la webapp) e uno tastiera fisica fisico guardano la stessa cosa: questo
// registro. Non e' una scelta di eleganza — un elenco di bottoni scritto a mano
// sarebbe un SECONDO elenco accanto a quello dei comandi e dei contatori, e i due
// si scollerebbero al primo contatore nuovo. Qui il registro si RICAVA da cio' che
// il canale ha davvero: aggiungi un contatore e il tasto compare da solo.
//
// COS'E' DAVVERO UNA TASTIERA DI COMANDO PER CHI STREAMA. Non e' una tastiera di
// scorciatoie: e' un tasto che DICE cosa fa e si aggiorna. Percio' ogni azione
// porta con se' `mostra` — la riga corta che il tasto stampa — e chi la esegue
// risponde con quella: il valore viene da li', non dal fatto che il tasto esista.
//
// La porta funziona con qualunque superficie che sappia fare una chiamata web: una
// tastiera fisica con un componente HTTP, il browser di un telefono. Nessuna
// dipendenza da nessuno.
import { contatori as storeContatori, effects as storeEffetti, streamers } from '../db.js';
import * as contatori from './contatori.js';
import * as battute from './battute.js';
import * as motoreBattute from './battute-motore.js';
import { makeLog } from '../logger.js';
import crypto from 'node:crypto';

const log = makeLog('console');
const norm = (c) => String(c || '').toLowerCase().trim();

// ── La chiave del canale ────────────────────────────────────────────────────
// Stessa forma collaudata dell'overlay, con una differenza che conta: da questa
// porta non si GUARDA, si AGISCE. Quindi si puo' revocare, e c'e' un tetto di
// frequenza — una chiave finita in una clip non deve poter diventare un giocattolo.
// Se il canale non esiste, NON c'e' una chiave — e si dice. La prima versione ne
// generava una nuova a ogni chiamata: `setSettings` su una riga che non c'e' non
// scrive niente, e la funzione tornava una chiave fresca fingendo di averla
// salvata. In produzione non si sarebbe visto (lo streamer c'e' sempre) e nessuna
// chiave emessa avrebbe piu' combaciato con se stessa. Una funzione che non puo'
// mantenere la promessa deve dirlo, non restituire qualcosa che ha l'aria giusta.
function scrivi(login, k) {
  const s = streamers.get(login);
  if (!s) return null;
  streamers.setSettings(login, { ...(s.settings || {}), consoleKey: k });
  return streamers.get(login)?.settings?.consoleKey === k ? k : null;   // c'e' rimasta?
}

export function chiave(channel) {
  const login = norm(channel);
  const s = streamers.get(login);
  if (!s) return null;
  if (s.settings?.consoleKey) return s.settings.consoleKey;
  return scrivi(login, crypto.randomBytes(24).toString('hex'));
}

export function revoca(channel) {
  const login = norm(channel);
  const k = scrivi(login, crypto.randomBytes(24).toString('hex'));
  if (k) log.info(`#${login}: chiave della console rigenerata (quella vecchia non vale piu')`);
  return k;
}

// Confronto a tempo costante: due chiavi diverse devono metterci lo stesso tempo a
// essere rifiutate, se no la differenza racconta quanti caratteri erano giusti.
export function chiaveOk(channel, data) {
  const k = chiave(channel);
  if (!k) return false;                       // nessun canale, nessuna chiave, nessun sì
  const vera = Buffer.from(k);
  const arrivata = Buffer.from(String(data || ''));
  if (vera.length !== arrivata.length) return false;
  return crypto.timingSafeEqual(vera, arrivata);
}

// ── Il tetto di frequenza ───────────────────────────────────────────────────
const MAX_AL_MINUTO = 40;
const _colpi = new Map();
export function troppiColpi(channel) {
  const login = norm(channel);
  const adesso = Date.now();
  const suoi = (_colpi.get(login) || []).filter((t) => adesso - t < 60_000);
  suoi.push(adesso);
  _colpi.set(login, suoi);
  return suoi.length > MAX_AL_MINUTO;
}

// ── Il registro, RICAVATO ───────────────────────────────────────────────────
// `id` e' stabile e sta in un indirizzo: gruppo:cosa[:parametro].
export function azioni(channel) {
  const login = norm(channel);
  const fuori = [];
  let cont = [];
  try { cont = storeContatori.list(login) || []; } catch (e) { log.debug('contatori:', e?.message || e); }
  for (const c of cont) {
    const nome = c.etichetta || c.comando;
    const passo = Number(c.step) || 1;
    fuori.push({
      id: `contatore:piu:${c.comando}`, gruppo: 'contatori',
      titolo: `${nome} +${passo}`, icona: 'piu',
      mostra: `${nome}: ${c.valore}`, valore: Number(c.valore) || 0,
    });
    fuori.push({
      id: `contatore:meno:${c.comando}`, gruppo: 'contatori',
      titolo: `${nome} −${passo}`, icona: 'meno',
      mostra: `${nome}: ${c.valore}`, valore: Number(c.valore) || 0,
    });
    fuori.push({
      id: `contatore:azzera:${c.comando}`, gruppo: 'contatori',
      titolo: `${nome} a zero`, icona: 'aggiorna',
      mostra: `${nome}: ${c.valore}`, valore: Number(c.valore) || 0,
      conferma: true,
    });
  }
  let eff = [];
  try { eff = storeEffetti.list(login) || []; } catch (e) { log.debug('effetti:', e?.message || e); }
  for (const e of eff) {
    // Un effetto NON ha un'etichetta: ha il comando con cui lo chiama la chat, e il
    // tipo (suono, immagine, video). Leggere un `etichetta` inesistente sarebbe una
    // riga che sembra scegliere un nome e cade sempre sul ripiego.
    // NOMI di icone nostre, non emoji: la grafica del sito non usa emoji, e
    // un'emoji e' anche disegnata diversa su ogni sistema.
    const icone = { audio: 'altoparlante', suono: 'altoparlante', immagine: 'immagine', video: 'video' };
    fuori.push({
      id: `effetto:${e.comando}`, gruppo: 'effetti',
      titolo: `!${e.comando}`, icona: icone[e.tipo] || 'effetti',
      mostra: `!${e.comando}`,
    });
  }

  fuori.push({ id: 'battuta', gruppo: 'chat', titolo: 'Racconta una battuta', icona: 'chat', mostra: 'battuta' });
  // «Di'» e' l'unico tasto che porta con se' del testo: il testo lo scrive chi
  // costruisce il tasto, e viaggia come `?testo=`. Senza, non fa niente e lo dice.
  fuori.push({ id: 'di', gruppo: 'chat', titolo: 'Fai dire una frase', icona: 'megafono', mostra: 'dice una frase', testo: true });
  return fuori;
}

// ── Premere un tasto ────────────────────────────────────────────────────────
// `dipendenze` porta dentro cio' che serve per agire davvero (dire in chat,
// aggiornare l'overlay) senza che questo file conosca il bot: cosi' si puo'
// provare per davvero, con un finto `say` e un finto `emit`.
// Premere un tasto della plancia PER IDENTITA'. Si va a vedere cosa fa ADESSO:
// se lo streamer ieri gli ha cambiato azione, il tasto fisico fa la cosa nuova.
export function eseguiTasto(channel, idTasto, dip = {}) {
  const login = norm(channel);
  for (const pg of plancia(login).pagine) {
    for (const t of pg.tasti || []) {
      if (t.id !== idTasto) continue;
      return esegui(login, t.azione, { ...dip, testo: t.testo || dip.testo });
    }
  }
  return { ok: false, mostra: 'tasto non trovato' };
}

export function esegui(channel, id, { say, emit, effetti, testo } = {}) {
  const login = norm(channel);
  const pezzi = String(id || '').split(':');
  if (pezzi[0] === 'contatore') {
    const [, cosa, comando] = pezzi;
    const c = storeContatori.get(login, comando);
    if (!c) return { ok: false, mostra: 'non c\'è' };
    const passo = Number(c.step) || 1;
    const delta = cosa === 'piu' ? passo : cosa === 'meno' ? -passo : cosa === 'azzera' ? null : undefined;
    if (delta === undefined) return { ok: false, mostra: 'non so farlo' };
    const nuovo = contatori.cambia(login, comando, delta, say, emit);
    if (!nuovo) return { ok: false, mostra: 'non riuscito' };
    return { ok: true, mostra: `${c.etichetta || c.comando}: ${nuovo.valore}`, valore: nuovo.valore };
  }
  if (pezzi[0] === 'effetto') {
    const comando = pezzi.slice(1).join(':');
    const e = storeEffetti.get(login, comando);
    if (!e) return { ok: false, mostra: 'non c\'è' };
    // PREMERE UN TASTO DEVE FAR PARTIRE QUELLO CHE PREMI. Se non c'e' nessun
    // overlay collegato l'effetto non ha dove andare: veniva buttato via in
    // silenzio e il tasto rispondeva lo stesso «fatto». Un tasto che mente e'
    // peggio di un tasto che non c'e', perche' ti fa credere di aver mandato una
    // cosa in diretta. Qui si guarda PRIMA di sparare, e si dice com'e'.
    if (typeof effetti?.hasClients === 'function' && !effetti.hasClients(login)) {
      return { ok: false, mostra: 'nessun overlay collegato' };
    }
    // Lo spara il motore vero, quello che lo sparerebbe la chat: un secondo modo
    // di mandare un effetto vorrebbe dire un secondo posto dove si rompe.
    const andato = typeof effetti?.fire === 'function' ? effetti.fire(login, comando, { da: 'consolify' }) : false;
    return andato ? { ok: true, mostra: `!${comando}` } : { ok: false, mostra: 'non partito' };
  }

  if (id === 'battuta') {
    let detta = null;
    const parla = (t) => { detta = t; if (typeof say === 'function') say(t); };
    const b = battute.diUna(login, parla, motoreBattute);
    return b ? { ok: true, mostra: String(detta || b.testo).slice(0, 60) } : { ok: false, mostra: 'niente da dire' };
  }

  if (id === 'di') {
    const t = String(testo || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    if (!t) return { ok: false, mostra: 'manca il testo' };
    if (typeof say !== 'function') return { ok: false, mostra: 'non riuscito' };
    say(t);
    return { ok: true, mostra: t.slice(0, 60) };
  }

  return { ok: false, mostra: 'azione sconosciuta' };
}

// ── La plancia: quali tasti, dove, con che faccia ───────────────────────────
// Sono scelte dello streamer, non dati del bot. E si RIPULISCE in ingresso: un
// tasto che punta a un'azione che non esiste piu' (un contatore cancellato) non
// deve restare li' a non fare niente quando lo premi — sparisce, ed e' onesto.
//
// REGOLA DEL PROGETTO: tutto e' modificabile. Percio' qui dentro non c'e' niente
// di deciso da noi che non si possa cambiare da fuori — nome, icona, colore,
// testo, conferma, ordine, pagina, formato della griglia e misura dei tasti. Se
// un giorno si aggiunge un campo, si aggiunge anche il modo di cambiarlo.
const PAGINE_MAX = 8;
const TASTI_MAX = 48;
const MISURE = ['s', 'm', 'l'];

// I FORMATI, come una tastiera vera: righe per colonne. Non e' un vezzo — con le
// caselle FISSE si parte gia' con una disposizione, e le vuote si vedono e si
// riempiono. Una griglia che si allunga da sola non e' un deck: e' un elenco.
// Chi non ha mai scelto parte da 3x4: e' il senso della cosa, arrivare e trovare
// gia' una plancia. `{righe: 0, colonne: 0}` vuol dire libera, e vale solo se
// qualcuno l'ha scelta davvero — non e' piu' anche il ripiego di un valore
// storto, perche' un valore che significa due cose finisce per dire quella
// sbagliata.
export const FORMATI = [
  { id: '3x3', righe: 3, colonne: 3 },
  { id: '3x4', righe: 3, colonne: 4 },
  { id: '3x5', righe: 3, colonne: 5 },
  { id: '4x4', righe: 4, colonne: 4 },
  { id: '4x6', righe: 4, colonne: 6 },
  { id: '5x8', righe: 5, colonne: 8 },
];

export const FORMATO_INIZIALE = { righe: 3, colonne: 4 };

function formatoPulito(f) {
  const righe = Number(f?.righe);
  const colonne = Number(f?.colonne);
  const ok = (n) => Number.isInteger(n) && n >= 2 && n <= 10;
  if (ok(righe) && ok(colonne)) return { righe, colonne };
  if (righe === 0 && colonne === 0) return { righe: 0, colonne: 0 };
  return { ...FORMATO_INIZIALE };
}

const testoPulito = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const coloreOk = (v) => (/^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v).toLowerCase() : '');

// OGNI TASTO HA UN SUO INDIRIZZO, e questo cambia il disegno. Il tasto fisico non
// punta a un'azione: punta a QUESTO tasto. Percio' quando lo streamer cambia cosa
// fa, come si chiama o che faccia ha, il tasto fisico lo segue da solo — non c'e'
// niente da rifare la' sopra. Ed e' anche il motivo per cui l'elenco separato di
// «scorciatoie» che avevo fatto e' sparito: era il solito secondo elenco.
const nuovoId = () => crypto.randomBytes(5).toString('hex');

function tastoPulito(t, valide) {
  const azione = String(t?.azione || '');
  if (!valide.has(azione)) return null;
  return {
    id: /^[a-f0-9]{10}$/.test(String(t?.id || '')) ? String(t.id) : nuovoId(),
    azione,
    nome: testoPulito(t?.nome, 24),
    // tre forme, e sono tutte legittime: il nome di un'icona nostra, un carattere
    // scritto da lui, o `img:<file>` — un'immagine SUA, che ha anche un indirizzo
    // pubblico perche' la stessa faccia gli serve sul tasto di uno tastiera fisica.
    icona: testoPulito(t?.icona, 80),
    colore: coloreOk(t?.colore),
    testo: testoPulito(t?.testo, 200),
    conferma: !!t?.conferma,
  };
}

// LEGGERE E SALVARE DEVONO DARE LA STESSA IDENTICA COSA. Prima leggere
// restituiva i tasti cosi' com'erano sul disco, e solo salvare li ripuliva. Da
// li' un difetto che si vedeva solo premendo: un tasto salvato prima che
// esistessero gli id non ne aveva uno, il suo indirizzo veniva fuori «/tasto/»
// senza niente, quella rotta non esiste, la richiesta finiva su un'altra e
// tornava «azione sconosciuta». Premevi e non partiva niente.
//
// Percio' qui si ripulisce come al salvataggio, e se la ripulitura ha cambiato
// qualcosa la si SCRIVE: un id assegnato e non salvato cambierebbe a ogni
// lettura, e l'indirizzo che hai incollato sulla tastiera fisica varrebbe fino
// al prossimo aggiornamento di pagina.
function planciaPulita(login, grezza) {
  const valide = new Set(azioni(login).map((a) => a.id));
  const pagine = (Array.isArray(grezza?.pagine) ? grezza.pagine : []).slice(0, PAGINE_MAX).map((pg) => ({
    nome: testoPulito(pg?.nome, 24) || 'Pagina',
    tasti: (Array.isArray(pg?.tasti) ? pg.tasti : []).slice(0, TASTI_MAX)
      .map((t) => tastoPulito(t, valide))
      .filter(Boolean),
  }));
  return {
    misura: MISURE.includes(String(grezza?.misura)) ? String(grezza.misura) : 'm',
    formato: formatoPulito(grezza?.formato),
    pagine: pagine.length ? pagine : [{ nome: 'Principale', tasti: [] }],
  };
}

export function plancia(channel) {
  const login = norm(channel);
  const s = streamers.get(login);
  if (!s) return planciaPulita(login, null);
  const grezza = s.settings?.plancia;
  const pulita = planciaPulita(login, grezza);
  if (grezza && JSON.stringify(grezza) !== JSON.stringify(pulita)) {
    try { streamers.setSettings(login, { ...(s.settings || {}), plancia: pulita }); }
    catch (e) { log.debug('plancia non riscritta:', e?.message || e); }
  }
  return pulita;
}

export function salvaPlancia(channel, dati) {
  const login = norm(channel);
  const s = streamers.get(login);
  if (!s) return null;
  const pulita = planciaPulita(login, dati);
  streamers.setSettings(login, { ...(s.settings || {}), plancia: pulita });
  return plancia(login);
}
