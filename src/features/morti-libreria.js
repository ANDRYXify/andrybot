// LA LIBRERIA DELLE SCHERMATE: il sapere su un gioco, messo in comune.
//
// La schermata di morte di Dark Souls e' la stessa sul computer di chi la
// insegna e su quello di chiunque altro. Quel sapere non ha motivo di restare in
// casa di uno: il primo che insegna un gioco lo puo' insegnare a tutti.
//
// Qui sta SOLO la regola. Il database, le porte e il pannello stanno fuori.
//
// COSA E' UNA SCHEDA, e perche' proprio questo
//
// Gioco + lingua. Non il gioco da solo: «YOU DIED» e «SEI MORTO» sono pixel
// diversi, e una scheda inglese su un gioco in italiano fallirebbe muta — il
// peggiore dei modi di fallire, perche' chi la usa non capisce perche'.
//
// E non la proporzione dello schermo, che pure cambia l'impronta: quella la
// togliamo a monte, ritagliando il 16:9 centrale prima di ridurre (vedi
// src/web/public/morti.js). Se non lo facessimo, la stessa scheda andrebbe rifatta
// per 16:9, 21:9 e 4:3, e una libreria divisa in tre non e' una libreria.
//
// COME SI MIGLIORA, SENZA CHE NESSUNO SI ROMPA
//
// Una scheda non si sovrascrive MAI. Chi la migliora ne pubblica una VERSIONE,
// che dichiara da quale viene; tutte le versioni della stessa cosa condividono
// una RADICE. Le vecchie restano, e chi ha gia' quella che gli funziona non viene
// aggiornato da solo: gli si dice che ce n'e' una nuova, e decide lui.
//
// Cosi' un aggiornamento sbagliato non puo' rompere la diretta di chi stava bene.
// Non per moderazione: perche' non c'e' la scrittura che lo permetterebbe.
//
// LE RETI, CHE NON SONO GUARDIE
//
// La piu' importante non e' qui dentro: e' che le impronte di una scheda si
// COPIANO nelle impostazioni di chi la prende. La sua diretta non dipende dalla
// libreria in nessun momento — se la libreria cade, o qualcuno tocca quella
// scheda, lui continua a contare.
//
// Qui dentro c'e' l'altra: un'impronta PIATTA non si pubblica. Uno schermo nero,
// o quasi uniforme, da' 64 bit quasi tutti uguali, e combacia con mezzo mondo:
// chi la pubblicasse farebbe contare morti a caso a chiunque la prenda. Si guarda
// quanti bit sono a uno, e fuori da una finestra centrale la scheda non entra.
// Non serve accorgersene: non si puo' fare.
import { normComando } from '../db.js';
import { MAX_FIRME } from './morti.js';

export const LINGUE = ['it', 'en', 'es', 'pt', 'fr', 'de', 'nessuna'];
export const MAX_PER_STREAMER = 40;
export const MAX_AL_GIORNO = 10;
export const MAX_GIOCO = 60;

// Quanti dei 64 bit devono essere a uno perche' l'impronta dica qualcosa. Una
// schermata vera sta abbondantemente dentro: quelle che cascano fuori sono il
// nero, il bianco e le sfumature piatte.
export const BIT_MIN = 12;
export const BIT_MAX = 52;

const FIRMA = /^[0-9a-f]{16}$/;
const CONTA = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];

// LA DISTANZA FRA DUE IMPRONTE, anche qui. Nel browser c'e' gia' (serve a
// riconoscere mentre giochi, e li' non puo' passare dal server); qui serve per
// cercare in libreria, e mandare l'intera libreria al browser per farlo cercare a
// lui sarebbe peggio.
//
// Due copie della stessa regola sono un posto in cui divergere, quindi non ci si
// fida della disciplina: test/unita/morti-distanza.test.mjs fa passare le stesse
// coppie da tutte e due e pretende la STESSA risposta. Se una cambia e l'altra no,
// diventa rosso.
export function distanza(a, b) {
  const x = String(a || '').toLowerCase();
  const y = String(b || '').toLowerCase();
  if (!x || !y || x.length !== y.length) return 64;
  if (!/^[0-9a-f]+$/.test(x) || !/^[0-9a-f]+$/.test(y)) return 64;
  let d = 0;
  for (let i = 0; i < x.length; i++) d += CONTA[parseInt(x[i], 16) ^ parseInt(y[i], 16)];
  return d;
}

// La scheda piu' vicina a un'impronta, fra tutte quelle della libreria.
export function piuVicina(schede, firma, soglia = 8) {
  let best = null;
  for (const s of (Array.isArray(schede) ? schede : [])) {
    for (const f of (s?.firme || [])) {
      const d = distanza(f, firma);
      if (d > soglia) continue;
      if (!best || d < best.distanza) best = { scheda: s, distanza: d };
    }
  }
  return best;
}

export function bitAUno(firma) {
  const f = String(firma || '').toLowerCase();
  if (!FIRMA.test(f)) return -1;
  let n = 0;
  for (const c of f) n += CONTA[parseInt(c, 16)];
  return n;
}

// Un'impronta che non dice niente: quasi tutto chiaro o quasi tutto scuro.
export const piatta = (firma) => { const n = bitAUno(firma); return n < 0 || n < BIT_MIN || n > BIT_MAX; };

// Il nome del gioco come CHIAVE: minuscolo, senza accenti, senza punteggiatura,
// spazi singoli. Serve perche' «Dark Souls III», «dark souls 3» e «DARK SOULS
// III.» non diventino tre scaffali diversi della stessa libreria.
export function chiaveGioco(nome) {
  return String(nome || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .slice(0, MAX_GIOCO);
}

export const lingua = (l) => (LINGUE.includes(String(l || '')) ? String(l) : 'nessuna');

// Cosa si puo' pubblicare. Quello che arriva da fuori non lo decide chi lo manda.
export function normScheda(b) {
  const o = (b && typeof b === 'object') ? b : {};
  const firme = [...new Set((Array.isArray(o.firme) ? o.firme : [])
    .map((f) => String(f || '').toLowerCase())
    .filter((f) => FIRMA.test(f) && !piatta(f)))].slice(0, MAX_FIRME);
  return {
    gioco: chiaveGioco(o.giocoNome || o.gioco),
    giocoNome: String(o.giocoNome || o.gioco || '').trim().slice(0, MAX_GIOCO),
    lingua: lingua(o.lingua),
    firme,
    contatore: normComando(String(o.contatore || '')),
  };
}

// Perche' NON si puo' pubblicare. Una frase sola, che si puo' far leggere a chi
// ci prova: un rifiuto senza motivo e' un tasto rotto.
export function perche(scheda, { quante = 0, oggi = 0 } = {}) {
  const s = scheda || {};
  if (!s.gioco) return 'senza-gioco';
  if (!s.firme?.length) return 'senza-impronte';
  if (quante >= MAX_PER_STREAMER) return 'troppe';
  if (oggi >= MAX_AL_GIORNO) return 'troppe-oggi';
  return '';
}

// La versione nuova di una scheda che c'e' gia'. La radice e' quella della
// vecchia — se la vecchia non ne ha una, la radice e' la vecchia stessa: la
// prima versione di una cosa e' la cosa.
export function prossima(vecchia, aggiunte) {
  const v = vecchia || null;
  const firme = [...new Set([...(v?.firme || []), ...(Array.isArray(aggiunte) ? aggiunte : [])]
    .map((f) => String(f || '').toLowerCase())
    .filter((f) => FIRMA.test(f) && !piatta(f)))].slice(0, MAX_FIRME);
  return {
    radice: v ? (v.radice || v.id) : '',
    da: v?.id || '',
    versione: (Number(v?.versione) || 0) + 1,
    firme,
  };
}

// Cosa cambia fra quella che hai e quella che c'e'. Serve a DIRLO, non a
// decidere: l'aggiornamento non parte mai da solo.
export function novita(mia, ultima) {
  if (!ultima || !mia) return null;
  if ((Number(ultima.versione) || 0) <= (Number(mia.versione) || 0)) return null;
  const avevo = new Set(mia.firme || []);
  return {
    versione: ultima.versione,
    impronteInPiu: (ultima.firme || []).filter((f) => !avevo.has(f)).length,
    autore: ultima.autore || '',
  };
}

// Prendere una scheda vuol dire COPIARSELA. Da qui in poi e' roba tua: quello che
// succede alla libreria non ti riguarda piu'.
export function copia(scheda, contatore) {
  const s = scheda || {};
  return {
    nome: String(s.giocoNome || s.gioco || 'Schermata').slice(0, 40),
    firme: [...(s.firme || [])],
    contatore: normComando(String(contatore || s.contatore || '')),
    scheda: s.id || '',
    radice: s.radice || s.id || '',
    versione: Number(s.versione) || 1,
  };
}
