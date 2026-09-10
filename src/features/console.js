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
const dormi = (ms) => new Promise((r) => setTimeout(r, ms));

// I passi si fanno IN FILA, e uno che va storto non zittisce quelli dopo: se il
// terzo di cinque non riesce, gli altri quattro devono comunque succedere — chi
// ti guarda ha gia' visto i primi due. Quello che torna indietro racconta com'e'
// andata: un passo solo parla da se', da due in su si dice quanti ne sono
// riusciti e qual e' il primo che non ce l'ha fatta.
export async function eseguiTasto(channel, idTasto, dip = {}) {
  const login = norm(channel);
  let tasto = null;
  for (const pg of plancia(login).pagine) {
    for (const t of pg.tasti || []) if (t.id === idTasto) tasto = t;
  }
  if (!tasto) return { ok: false, mostra: 'tasto non trovato' };

  const esiti = [];
  for (const passo of tasto.passi) {
    if (passo.tipo === 'attesa') { await dormi(passo.ms); esiti.push({ ok: true, mostra: '' }); continue; }
    esiti.push(eseguiPasso(login, passo, dip));
  }

  const riusciti = esiti.filter((e) => e.ok).length;
  const primoGuaio = esiti.find((e) => !e.ok);
  if (esiti.length === 1) return esiti[0];
  return {
    ok: !primoGuaio,
    mostra: primoGuaio
      ? `${riusciti}/${esiti.length} · ${primoGuaio.mostra}`
      : (esiti.map((e) => e.mostra).filter(Boolean).pop() || `${riusciti} passi`),
  };
}

function eseguiPasso(login, passo, dip) {
  const { say, comandi } = dip;
  if (passo.tipo === 'azione') return esegui(login, passo.id, { ...dip, testo: passo.testo || dip.testo });
  if (passo.tipo === 'chat') {
    if (typeof say !== 'function') return { ok: false, mostra: 'non riuscito' };
    say(passo.testo);
    return { ok: true, mostra: passo.testo.slice(0, 60) };
  }
  if (passo.tipo === 'media') {
    const eff = dip.effetti;
    if (typeof eff?.mediaUrl !== 'function' || typeof eff?.emit !== 'function') return { ok: false, mostra: 'non riuscito' };
    if (typeof eff.hasClients === 'function' && !eff.hasClients(login)) return { ok: false, mostra: 'nessun overlay collegato' };
    eff.emit(login, {
      comando: '', tipo: passo.genere, url: eff.mediaUrl(login, passo.file),
      volume: passo.volume, durata: passo.durata, posizione: null, da: 'consolify',
    });
    return { ok: true, mostra: passo.genere };
  }
  if (passo.tipo === 'comando') {
    // Il RISULTATO del comando, non la scritta «!comando»: si fa dire al motore
    // dei comandi quello che direbbe in chat, e si manda quello.
    if (typeof comandi?.tryComando !== 'function') return { ok: false, mostra: 'comandi non disponibili' };
    let detto = '';
    const parla = (t) => { detto = String(t || ''); if (typeof say === 'function') say(t); };
    const preso = comandi.tryComando({
      channel: login, text: `!${passo.comando}`, username: login,
      isMod: true, isBroadcaster: true, isSub: true,
    }, parla);
    if (!preso) return { ok: false, mostra: `!${passo.comando} non c'è` };
    return { ok: true, mostra: (detto || `!${passo.comando}`).slice(0, 60) };
  }
  if (passo.tipo === 'scena' || passo.tipo === 'muto') {
    // Il programma con cui si manda in onda ascolta sul computer dello streamer:
    // da qui non lo vediamo, e non fingiamo di poterlo fare. Lo fa la pagina, che
    // sta su quella macchina. Chi preme da fuori (una tastiera fisica) se lo
    // sente dire, invece di veder tornare un «fatto» che non e' successo.
    return { ok: false, mostra: 'questo passo lo fa la pagina', browser: true };
  }
  return { ok: false, mostra: 'passo sconosciuto' };
}

// UN PASSO SOLO di un tasto. Serve alla pagina, che percorre la partitura in
// ordine e fa da se' i passi di regia: se il server facesse "tutto il resto" e la
// pagina le scene "dopo", una fila con un'attesa in mezzo andrebbe fuori ordine.
export function eseguiPassoDiTasto(channel, idTasto, k, dip = {}) {
  const login = norm(channel);
  for (const pg of plancia(login).pagine) {
    for (const t of pg.tasti || []) {
      if (t.id !== idTasto) continue;
      const passo = (t.passi || [])[Number(k)];
      if (!passo) return { ok: false, mostra: 'passo non trovato' };
      if (passo.tipo === 'attesa') return { ok: true, mostra: '', attesa: passo.ms };
      return eseguiPasso(login, passo, dip);
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

// UN TASTO E' UNA PARTITURA, non un puntatore a una cosa sola. Prima un tasto
// poteva fare soltanto una cosa che esisteva gia' da un'altra parte: era il
// motivo per cui la plancia stava stretta. Ora porta una fila di passi, e un
// passo e' uno di pochi verbi.
//
// Un passo che non si puo' fare viene tolto, non tenuto li' a fingere; se non ne
// resta nessuno, il tasto sparisce — come prima faceva un tasto che puntava a
// un'azione cancellata.
const PASSI_MAX = 8;
const ATTESA_MAX_MS = 30000;

function passoPulito(p, valide) {
  const tipo = String(p?.tipo || '');
  if (tipo === 'azione') {
    const id = String(p?.id || '');
    if (!valide.has(id)) return null;
    return { tipo, id, testo: testoPulito(p?.testo, 200) };
  }
  if (tipo === 'chat') {
    const testo = testoPulito(p?.testo, 400);
    return testo ? { tipo, testo } : null;
  }
  if (tipo === 'comando') {
    const comando = testoPulito(p?.comando, 40).replace(/^!/, '').toLowerCase();
    return /^[a-z0-9_-]{1,40}$/.test(comando) ? { tipo, comando } : null;
  }
  if (tipo === 'media') {
    // Il file e' stato prodotto dalla stessa catena degli effetti (compressione,
    // limiti, cartella del canale): qui si controlla solo che il nome sia un
    // nome di file e non una strada per uscire dalla cartella.
    const file = String(p?.file || '');
    if (!/^[A-Za-z0-9._-]{1,80}$/.test(file) || file.includes('..')) return null;
    const genere = ['immagine', 'video', 'audio'].includes(String(p?.genere)) ? String(p.genere) : null;
    if (!genere) return null;
    const durata = Math.round(Number(p?.durata));
    const volume = Math.round(Number(p?.volume));
    return {
      tipo, file, genere,
      durata: Number.isFinite(durata) ? Math.max(500, Math.min(30000, durata)) : 5000,
      volume: Number.isFinite(volume) ? Math.max(0, Math.min(100, volume)) : 100,
    };
  }
  if (tipo === 'scena') {
    const scena = testoPulito(p?.scena, 80);
    return scena ? { tipo, scena } : null;
  }
  if (tipo === 'muto') {
    const fonte = testoPulito(p?.fonte, 80);
    const come = ['inverti', 'muta', 'smuta'].includes(String(p?.come)) ? String(p.come) : 'inverti';
    return fonte ? { tipo, fonte, come } : null;
  }
  if (tipo === 'attesa') {
    const ms = Math.round(Number(p?.ms));
    return Number.isFinite(ms) && ms > 0 ? { tipo, ms: Math.min(ms, ATTESA_MAX_MS) } : null;
  }
  return null;
}

// Un tasto di prima aveva `azione`: diventa una partitura di un passo solo. La
// conversione sta QUI, dove si ripulisce, cosi' vale sia leggendo sia salvando e
// non esiste un tasto in mezzo al guado.
function passiDi(t, valide) {
  const grezzi = Array.isArray(t?.passi) && t.passi.length
    ? t.passi
    : (t?.azione ? [{ tipo: 'azione', id: String(t.azione), testo: t?.testo }] : []);
  return grezzi.slice(0, PASSI_MAX).map((p) => passoPulito(p, valide)).filter(Boolean);
}

function tastoPulito(t, valide) {
  const passi = passiDi(t, valide);
  if (!passi.length) return null;
  return {
    id: /^[a-f0-9]{10}$/.test(String(t?.id || '')) ? String(t.id) : nuovoId(),
    passi,
    nome: testoPulito(t?.nome, 24),
    // tre forme, e sono tutte legittime: il nome di un'icona nostra, un carattere
    // scritto da lui, o `img:<file>` — un'immagine SUA, che ha anche un indirizzo
    // pubblico perche' la stessa faccia gli serve sul tasto di uno tastiera fisica.
    icona: testoPulito(t?.icona, 80),
    colore: coloreOk(t?.colore),
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

// Tutti i file che la plancia usa DAVVERO adesso. Serve a chi tiene pulito il
// disco: un media sostituito o un passo tolto lasciano un file che non guarda
// piu' nessuno, e nessuno andrebbe mai a cercarlo.
export function fileUsati(channel) {
  const fuori = new Set();
  for (const pg of plancia(norm(channel)).pagine) {
    for (const t of pg.tasti || []) {
      for (const p of t.passi || []) if (p.tipo === 'media' && p.file) fuori.add(p.file);
      if (String(t.icona || '').startsWith('img:')) fuori.add(String(t.icona).slice(4));
    }
  }
  return fuori;
}

export function salvaPlancia(channel, dati) {
  const login = norm(channel);
  const s = streamers.get(login);
  if (!s) return null;
  const pulita = planciaPulita(login, dati);
  streamers.setSettings(login, { ...(s.settings || {}), plancia: pulita });
  return plancia(login);
}
