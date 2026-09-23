// LA STORIA DI INSTAGRAM, da un posto solo. La pubblicano «Manda» della
// Settimana, il tasto «Metti nella storia» delle Grafiche e, se lo streamer
// l'ha accesa, la diretta quando comincia: tre strade, un modo solo di farlo.
// Il ragionamento sta in docs/GRAFICHE.md.
//
// Meta scarica l'immagine da un indirizzo pubblico nel momento in cui pubblica:
// nome casuale, cancellata appena pubblicata, e uno spazzino per quelle rimaste
// da un giro interrotto. Pubblica abbastanza per Meta, non per chi prova a
// indovinare.
import crypto from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config.js';
import * as instagram from './instagram.js';
import { credenzialiInstagram } from './instagram-credenziali.js';

export const PUBBLICO_RE = /^[a-f0-9]{32}\.jpg$/;
const PUBBLICO_VITA_MS = 30 * 60_000;
export const cartellaPubblici = () => join(config.dataDir, 'pubblici');

export function spazzaPubblici(adesso = Date.now()) {
  const dir = cartellaPubblici();
  try {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (adesso - statSync(p).mtimeMs > PUBBLICO_VITA_MS) unlinkSync(p);
    }
  } catch { /* cartella non ancora nata */ }
}

// `pubblica` si cambia solo nelle prove: di serie e' la chiamata vera.
export async function pubblicaStoria(login, byte, { pubblica = instagram.pubblicaStoria } = {}) {
  const ig = credenzialiInstagram(login);
  if (!ig) return { ok: false, errore: 'Instagram non e\' collegato' };
  spazzaPubblici();
  const dir = cartellaPubblici();
  mkdirSync(dir, { recursive: true });
  const nome = crypto.randomBytes(16).toString('hex') + '.jpg';
  const p = join(dir, nome);
  writeFileSync(p, byte);
  try {
    const r = await pubblica({ ...ig, url: `${config.baseUrl.replace(/\/$/, '')}/pubblici/${nome}` });
    instagram.ricorda(login, r);
    return r;
  } finally { try { unlinkSync(p); } catch { /* gia' andata */ } }
}

// ── la storia della diretta ────────────────────────────────────────────────
// Accesa dallo streamer, parte da sola quando comincia la diretta. L'immagine
// la prepara il pannello, perche' il server non ha un browser per disegnarla:
// la manda quando la accendi e ogni volta che salvi le grafiche, e qui si
// tiene fino al momento giusto. Una per diretta: se la diretta cade e riparte
// entro tre ore, la storia c'e' gia', e una seconda uguale sarebbe rumore.
//
// Lo stato sta accanto all'immagine, in un file per streamer: accesa o no,
// l'ultima volta che e' partita (o perche' no). Niente nelle impostazioni, che
// si riscrivono da altre strade: un interruttore che un salvataggio altrui
// potesse spegnere in silenzio sarebbe peggio di nessun interruttore.
export const STORIA_LIVE_DISTANZA_MS = 3 * 3600_000;
const LOGIN_RE = /^[a-z0-9_]{1,40}$/;
const cartellaLive = () => join(config.dataDir, 'storie-live');
function file(login, est) {
  const l = String(login || '').toLowerCase();
  if (!LOGIN_RE.test(l)) throw new Error('nome non valido');
  return join(cartellaLive(), `${l}.${est}`);
}

function leggiStato(login) {
  try { return JSON.parse(readFileSync(file(login, 'json'), 'utf8')) || {}; } catch { return {}; }
}

function scrivi(p, dati) {
  mkdirSync(cartellaLive(), { recursive: true });
  writeFileSync(p + '.tmp', dati);
  renameSync(p + '.tmp', p);
}

const scriviStato = (login, s) => scrivi(file(login, 'json'), JSON.stringify(s));

export function statoLive(login) {
  const s = leggiStato(login);
  let pronta = false;
  try { pronta = existsSync(file(login, 'jpg')); } catch { pronta = false; }
  return { attiva: !!s.attiva, pronta, ultima: s.ultima || null };
}

export function accendiLive(login, byte, adesso = Date.now()) {
  scrivi(file(login, 'jpg'), byte);
  scriviStato(login, { ...leggiStato(login), attiva: true, preparata: adesso });
  return statoLive(login);
}

export function spegniLive(login) {
  try { unlinkSync(file(login, 'jpg')); } catch { /* non c'era */ }
  scriviStato(login, { ...leggiStato(login), attiva: false });
  return statoLive(login);
}

// Al passaggio in diretta. Dice cosa ha fatto, cosi' chi chiama sa se avvisare
// lo streamer: accesa ma senza immagine e' un guaio da dire, quanto una storia
// che Instagram rifiuta.
export async function storiaDellaDiretta(login, { adesso = Date.now(), pubblica } = {}) {
  const s = leggiStato(login);
  if (!s.attiva) return { fatto: false, motivo: 'spenta' };
  if (s.riuscita && adesso - s.riuscita < STORIA_LIVE_DISTANZA_MS) return { fatto: false, motivo: 'gia\' fatta' };
  let byte = null;
  try { byte = readFileSync(file(login, 'jpg')); } catch { byte = null; }
  const r = byte
    ? await pubblicaStoria(login, byte, pubblica ? { pubblica } : {})
    : { ok: false, errore: 'la grafica non e\' pronta: riaccendi la storia automatica dalle Grafiche' };
  const ultima = { ts: adesso, ok: !!r.ok, errore: r.ok ? '' : String(r.errore || '') };
  scriviStato(login, { ...leggiStato(login), ultima, ...(r.ok ? { riuscita: adesso } : {}) });
  return { fatto: true, ...ultima };
}
