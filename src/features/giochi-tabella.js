// I GIOCHI SONO UNA TABELLA, NON UNO SWITCH.
//
// Prima erano quattordici blocchi `case` dentro games.js. Il guaio non era il
// codice: era che un gioco NON ESISTEVA come oggetto. Non lo si poteva spegnere,
// rinominare o riservare ai soli abbonati, perche' non c'era niente da spegnere
// — c'erano righe di programma. E il pannello, per elencarli, se li riscriveva a
// mano: ne mostrava dieci su trenta, e quattro giochi veri (pesca, roulette,
// furto, regala) non li nominava, mentre il bot in chat li annunciava.
//
// Qui il gioco e' una riga. Il motore ci dispaccia dentro, il pannello la legge,
// il manuale la verifica: un gioco nuovo nasce una volta sola e compare ovunque
// da se'.
//
// Le scelte dello streamer stanno in settings.giochiComandi:
//   { dado: { off: true }, slot: { nome: 'macchinetta', chi: 'sub' } }
//
// RINOMINARE SOSTITUISCE. Se dai un nome tuo a un gioco, i nomi di serie non
// rispondono piu': un gioco ha UN nome, e sei tu a deciderlo. Gli alias sono una
// comodita' finche' non ti serve la tua parola.
import { streamers } from '../db.js';

export const LIVELLI = ['tutti', 'sub', 'vip', 'mod'];

export const GIOCHI = [
  { id: 'giochi', nomi: ['giochi'], titolo: 'Elenco dei giochi',
    cosa: 'Elenca in chat i giochi accesi.', costa: false, spegnibile: false },
  { id: 'dado', nomi: ['dado', 'roll'], titolo: 'Dado',
    cosa: 'Tira un dado. Con !dado 2d20 ne tira altri.', costa: false, attesa: 3 },
  { id: 'moneta', nomi: ['moneta', 'coin'], titolo: 'Testa o croce',
    cosa: 'Lancia una moneta.', costa: false, attesa: 3 },
  { id: '8ball', nomi: ['8ball', 'palla8'], titolo: 'Palla magica',
    cosa: 'Risponde a una domanda. Serve la domanda.', costa: false, attesa: 3 },
  { id: 'monete', nomi: ['monete', 'punti', 'bilancio'], titolo: 'Il mio saldo',
    cosa: 'Dice quante monete ha chi lo scrive.', costa: false },
  { id: 'classifica', nomi: ['classifica', 'top', 'classificamod', 'classificastaff', 'topmod'], titolo: 'Classifica',
    cosa: 'I primi del pubblico. Con «mod» la gara dello staff, con «tutti» le due insieme.', costa: false },
  { id: 'slot', nomi: ['slot'], titolo: 'Slot machine',
    cosa: 'Gioca alla slot: costa monete, il tris paga.', costa: true, attesa: 5 },
  { id: 'duello', nomi: ['duello', 'duel'], titolo: 'Duello',
    cosa: 'Sfida un\'altra persona in chat.', costa: true },
  { id: 'trivia', nomi: ['trivia', 'quiz'], titolo: 'Trivia',
    cosa: 'Domanda a sorpresa: il primo che risponde vince.', costa: false },
  { id: 'manche', nomi: ['manche', 'gioca'], titolo: 'Manche al volo',
    cosa: 'Lancia subito una manche invece di aspettare quella automatica.', costa: false },
  { id: 'pesca', nomi: ['pesca', 'fish'], titolo: 'Pesca',
    cosa: 'Getta la lenza: si pesca qualcosa, o niente.', costa: true },
  { id: 'roulette', nomi: ['roulette', 'rul'], titolo: 'Roulette',
    cosa: 'Punta le monete su rosso o nero.', costa: true },
  { id: 'furto', nomi: ['furto', 'rapina'], titolo: 'Furto',
    cosa: 'Prova a rubare monete a un\'altra persona. Puo\' andare male.', costa: true },
  { id: 'regala', nomi: ['regala', 'dona'], titolo: 'Regala monete',
    cosa: 'Passa monete tue a qualcun altro.', costa: true },
];

const PER_ID = new Map(GIOCHI.map((g) => [g.id, g]));

export const giocoDi = (id) => PER_ID.get(id) || null;

function scelte(channel) {
  const s = streamers.get(channel)?.settings?.giochiComandi;
  return (s && typeof s === 'object') ? s : {};
}

// Come si chiama oggi un gioco, e con quali parole risponde.
export function nomiDi(gioco, scelta = {}) {
  const mio = String(scelta.nome || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
  return mio ? [mio] : gioco.nomi;
}

export function livelloDi(gioco, scelta = {}) {
  return LIVELLI.includes(scelta.chi) ? scelta.chi : 'tutti';
}

export function spento(gioco, scelta = {}) {
  return gioco.spegnibile !== false && !!scelta.off;
}

const RANGO = { tutti: 0, sub: 1, vip: 2, mod: 3 };

function rangoDi(msg) {
  if (msg?.isBroadcaster || msg?.isMod) return 3;
  if (msg?.isVip) return 2;
  if (msg?.isSub || msg?.isSubscriber) return 1;
  return 0;
}

// La riga del pannello e del manuale: com'e' configurato QUESTO canale.
export function elenco(channel) {
  const s = scelte(channel);
  return GIOCHI.map((g) => {
    const mia = s[g.id] || {};
    return {
      id: g.id,
      titolo: g.titolo,
      cosa: g.cosa,
      costa: !!g.costa,
      attesa: g.attesa || 0,
      spegnibile: g.spegnibile !== false,
      acceso: !spento(g, mia),
      nomi: nomiDi(g, mia),
      rinominato: !!nomiDi(g, mia)[0] && nomiDi(g, mia)[0] !== g.nomi[0],
      chi: livelloDi(g, mia),
    };
  });
}

// Da una parola scritta in chat al gioco, con lo stato di questo canale.
export function risolvi(channel, parola) {
  const p = String(parola || '').toLowerCase();
  const s = scelte(channel);
  for (const g of GIOCHI) {
    const mia = s[g.id] || {};
    if (!nomiDi(g, mia).includes(p)) continue;
    return { gioco: g, spento: spento(g, mia), chi: livelloDi(g, mia), parola: p };
  }
  return null;
}

// Puo' usarlo chi ha scritto? (le esenzioni dei ruoli alti valgono sempre)
export const puoUsare = (livello, msg) => rangoDi(msg) >= (RANGO[livello] ?? 0);

// L'elenco che !giochi scrive in chat: quello vero, non una copia a mano.
export function elencoInChat(channel) {
  const vivi = elenco(channel).filter((g) => g.acceso && g.id !== 'giochi');
  return vivi.map((g) => '!' + g.nomi[0]).join(', ');
}

// Cosa il pannello puo' scrivere, e come si ripulisce.
export function normalizza(dati) {
  const fuori = {};
  if (!dati || typeof dati !== 'object') return fuori;
  for (const g of GIOCHI) {
    const v = dati[g.id];
    if (!v || typeof v !== 'object') continue;
    const riga = {};
    if (g.spegnibile !== false && v.off) riga.off = true;
    const nome = String(v.nome || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
    if (nome && nome !== g.nomi[0]) riga.nome = nome;
    if (LIVELLI.includes(v.chi) && v.chi !== 'tutti') riga.chi = v.chi;
    if (Object.keys(riga).length) fuori[g.id] = riga;
  }
  return fuori;
}

// Due giochi non possono rispondere alla stessa parola: il secondo non partirebbe
// mai, e nessuno capirebbe perche'.
export function collisioni(dati) {
  const visti = new Map();
  const scontri = [];
  const s = normalizza(dati);
  for (const g of GIOCHI) {
    for (const n of nomiDi(g, s[g.id] || {})) {
      if (visti.has(n)) scontri.push({ nome: n, fra: [visti.get(n), g.id] });
      else visti.set(n, g.id);
    }
  }
  return scontri;
}
