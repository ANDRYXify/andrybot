// TUTTO QUELLO CHE SI CHIAMA CON UN «!» E' MODIFICABILE.
//
// Prima non lo era, e non per una svista: i comandi predefiniti erano righe di
// programma sparse in dieci moduli — `switch (cmd)` nei giochi, catene di `if`
// nei comandi base, elenchi a mano nei sorteggi. Un comando non ESISTEVA come
// oggetto, quindi non c'era niente da spegnere, rinominare o riservare.
//
// Due conseguenze che si vedevano dalla chat:
//
//  · `!giochi` rispondeva DUE VOLTE — i giochi di chat e, subito sotto, i giochi
//    webcam — perche' due moduli diversi tenevano ognuno il proprio elenco
//    scritto a mano e nessuno dei due sapeva dell'altro. Chi non usa la webcam
//    si trovava in chat una lista di roba che non ha;
//  · il pannello elencava dieci comandi su trenta, e cinque giochi veri non li
//    nominava affatto mentre il bot li annunciava.
//
// Qui ogni comando predefinito e' UNA RIGA. I gestori restano dove sono e
// continuano a rispondere ai nomi canonici: e' il vaglio in cima al bot che
// traduce la parola scritta in chat, applica spento/riservato e si ferma.
//
// Le scelte dello streamer stanno in settings.comandi, una riga per comando:
//   { furto: { off: true }, slot: { nome: 'macchinetta', chi: 'sub' } }
import { streamers } from '../db.js';

export const LIVELLI = ['tutti', 'sub', 'vip', 'mod'];

// I MODULI. Un comando puo' essere acceso e restare muto lo stesso, perche' la
// famiglia a cui appartiene e' spenta: e' giusto, ed e' la ragione per cui lo
// stato di un comando non si legge dal suo solo interruttore.
export const MODULI = {
  giochi: { nome: 'Giochi in chat', file: 'games.js', acceso: (s) => s.giochi !== false },
  webcam: { nome: 'Giochi con la webcam', file: 'trackinggiochi.js', acceso: (s) => (s.tracking?.attivo !== false) && (s.tracking?.giochi !== false) },
  puzzle: { nome: 'Puzzle con le mani', file: 'trackinggiochi.js', acceso: (s) => (s.tracking?.attivo !== false) && s.tracking?.effetti?.puzzle === true },
  sorteggi: { nome: 'Sorteggi', file: 'giveaway.js', acceso: (s) => s.giochi !== false },
  ore: { nome: 'Ore guardate', file: 'watchtime.js', acceso: (s) => (s.watchtime?.attivo) !== false },
  base: { nome: 'Comandi pronti', file: 'comandibase.js', acceso: (s) => (s.comandiBase?.attivo) !== false },
  chat: { nome: 'Gestione dei comandi dalla chat', file: 'comandichat.js', acceso: (s) => !!(s.comandiChat?.attivo) },
  vip: { nome: 'VIP', file: 'vip.js', acceso: () => true },
  sondaggi: { nome: 'Sondaggi e predizioni', file: 'sondaggi.js', acceso: () => true },
  musica: { nome: 'Richieste musicali', file: 'songrequest.js', acceso: () => true },
  sito: { nome: 'Giochi del sito', file: 'gamesbridge.js', acceso: (s) => !!(s.giochiSito?.attivo) },
};

// Ogni riga: come si chiama di serie, cosa fa, di chi e', e chi puo' usarlo.
// `chi` e' il minimo di serie; lo streamer puo' alzarlo, mai abbassarlo sotto
// quello che il gestore pretende comunque.
export const COMANDI = [
  { id: 'giochi', modulo: 'giochi', nomi: ['giochi'], titolo: 'Elenco dei giochi',
    cosa: 'Elenca in chat i giochi accesi, quelli di chat e quelli con la webcam.', spegnibile: false },

  { id: 'dado', modulo: 'giochi', nomi: ['dado', 'roll'], titolo: 'Dado',
    cosa: 'Tira un dado. Con !dado 2d20 ne tira altri.', attesa: 3 },
  { id: 'moneta', modulo: 'giochi', nomi: ['moneta', 'coin'], titolo: 'Testa o croce',
    cosa: 'Lancia una moneta.', attesa: 3 },
  { id: '8ball', modulo: 'giochi', nomi: ['8ball', 'palla8'], titolo: 'Palla magica',
    cosa: 'Risponde a una domanda. Serve la domanda.', attesa: 3 },
  { id: 'monete', modulo: 'giochi', nomi: ['monete', 'punti', 'bilancio'], titolo: 'Il mio saldo',
    cosa: 'Dice quante monete ha chi lo scrive.' },
  { id: 'classifica', modulo: 'giochi', nomi: ['classifica', 'top', 'classificamod', 'classificastaff', 'topmod'], titolo: 'Classifica',
    cosa: 'I primi del pubblico. Con «mod» la gara dello staff, con «tutti» le due insieme.' },
  { id: 'slot', modulo: 'giochi', nomi: ['slot'], titolo: 'Slot machine',
    cosa: 'Gioca alla slot: costa monete, il tris paga.', costa: true, attesa: 5 },
  { id: 'duello', modulo: 'giochi', nomi: ['duello', 'duel'], titolo: 'Duello',
    cosa: 'Sfida un\'altra persona in chat.', costa: true },
  { id: 'trivia', modulo: 'giochi', nomi: ['trivia', 'quiz'], titolo: 'Trivia',
    cosa: 'Domanda a sorpresa: il primo che risponde vince.' },
  { id: 'manche', modulo: 'giochi', nomi: ['manche', 'gioca'], titolo: 'Manche al volo',
    cosa: 'Lancia subito una manche invece di aspettare quella automatica.' },
  { id: 'pesca', modulo: 'giochi', nomi: ['pesca', 'fish'], titolo: 'Pesca',
    cosa: 'Getta la lenza: si pesca qualcosa, o niente.', costa: true },
  { id: 'roulette', modulo: 'giochi', nomi: ['roulette', 'rul'], titolo: 'Roulette',
    cosa: 'Punta le monete su rosso o nero.', costa: true },
  { id: 'furto', modulo: 'giochi', nomi: ['furto', 'rapina'], titolo: 'Furto',
    cosa: 'Prova a rubare monete a un\'altra persona. Puo\' andare male.', costa: true },
  { id: 'regala', modulo: 'giochi', nomi: ['regala', 'dona'], titolo: 'Regala monete',
    cosa: 'Passa monete tue a qualcun altro.', costa: true },

  { id: 'mima', modulo: 'webcam', nomi: ['mima', 'mimo'], titolo: 'Mima', chi: 'mod',
    cosa: 'Avvia il gioco della mimica nell\'overlay della webcam.' },
  { id: 'nonridere', modulo: 'webcam', nomi: ['nonridere', 'nonrido'], titolo: 'Non ridere', chi: 'mod',
    cosa: 'Avvia la sfida «non ridere» nell\'overlay della webcam.' },
  { id: 'reaction', modulo: 'webcam', nomi: ['reaction', 'reactionrush', 'rush'], titolo: 'Reaction rush', chi: 'mod',
    cosa: 'Avvia la prova di reazione nell\'overlay della webcam.' },
  { id: 'battaglia', modulo: 'webcam', nomi: ['battaglia', 'battle'], titolo: 'Battaglia con la chat', chi: 'mod',
    cosa: 'Avvia la battaglia: la chat sfida con i gesti.' },
  { id: 'sfida', modulo: 'webcam', nomi: ['sfida'], titolo: 'Sfida un gesto',
    cosa: 'Durante la battaglia, manda un gesto da imitare.' },
  { id: 'puzzle', modulo: 'puzzle', nomi: ['puzzle'], titolo: 'Puzzle con le mani', chi: 'mod',
    cosa: 'Avvia il puzzle nell\'overlay della webcam.' },
  { id: 'puzzlestop', modulo: 'puzzle', nomi: ['puzzlestop'], titolo: 'Ferma il puzzle', chi: 'mod',
    cosa: 'Ferma il puzzle in corso.' },

  { id: 'giveaway', modulo: 'sorteggi', nomi: ['giveaway', 'sorteggio', 'gw'], titolo: 'Apri un sorteggio', chi: 'mod',
    cosa: 'Apre il sorteggio e annuncia il premio.' },
  { id: 'join', modulo: 'sorteggi', nomi: ['join', 'partecipa', 'entra'], titolo: 'Entra nel sorteggio', rinominabile: false,
    cosa: 'Entra nel sorteggio aperto. La parola d\'ingresso si sceglie all\'apertura.' },
  { id: 'biglietti', modulo: 'sorteggi', nomi: ['biglietti', 'ticket', 'tickets'], titolo: 'Regala biglietti', chi: 'mod',
    cosa: 'Da\' biglietti in piu\' a una persona.' },
  { id: 'estrai', modulo: 'sorteggi', nomi: ['estrai', 'draw', 'vincitore'], titolo: 'Estrai', chi: 'mod',
    cosa: 'Estrae un vincitore. Con un numero ne estrae piu\' d\'uno.' },

  { id: 'ore', modulo: 'ore', nomi: ['ore', 'oreguardate', 'tempo', 'watchtime'], titolo: 'Ore guardate',
    cosa: 'Dice da quanto tempo guarda chi lo scrive.' },
  { id: 'classificaore', modulo: 'ore', nomi: ['classificaore', 'classificatempo', 'oretop', 'topore'], titolo: 'Classifica delle ore',
    cosa: 'Chi ha guardato di piu\'.' },

  { id: 'so', modulo: 'base', nomi: ['so', 'shoutout'], titolo: 'Shoutout', chi: 'mod',
    cosa: 'Fa lo shoutout a un altro canale.' },
  { id: 'followage', modulo: 'base', nomi: ['followage', 'daquanto'], titolo: 'Da quanto segui',
    cosa: 'Dice da quanto tempo una persona segue il canale.' },
  { id: 'uptime', modulo: 'base', nomi: ['uptime'], titolo: 'Da quanto sei in diretta',
    cosa: 'Dice da quanto e\' cominciata la diretta.' },
  { id: 'bot', modulo: 'base', nomi: ['bot', 'socialbot', 'ia', 'ai'], titolo: 'Parla col bot',
    cosa: 'Chiama il bot e gli fa una domanda.' },

  { id: 'comando', modulo: 'chat', nomi: ['comando', 'cmd', 'comandi', 'command', 'commands'], titolo: 'Gestisci i comandi', chi: 'mod',
    cosa: 'Aggiunge, cambia e toglie comandi senza aprire il pannello.' },
  { id: 'addcom', modulo: 'chat', nomi: ['addcom'], titolo: 'Aggiungi un comando', chi: 'mod',
    cosa: 'Scorciatoia per aggiungere un comando.' },
  { id: 'delcom', modulo: 'chat', nomi: ['delcom'], titolo: 'Togli un comando', chi: 'mod',
    cosa: 'Scorciatoia per togliere un comando.' },
  { id: 'editcom', modulo: 'chat', nomi: ['editcom'], titolo: 'Cambia un comando', chi: 'mod',
    cosa: 'Scorciatoia per cambiare la risposta di un comando.' },

  { id: 'vip', modulo: 'vip', nomi: ['vip'], titolo: 'Da\' il VIP', chi: 'mod',
    cosa: 'Da\' il VIP a una persona, per una settimana o per un mese.' },
  { id: 'unvip', modulo: 'vip', nomi: ['unvip'], titolo: 'Togli il VIP', chi: 'mod',
    cosa: 'Toglie il VIP a una persona.' },
  { id: 'viplista', modulo: 'vip', nomi: ['viplista', 'viplist'], titolo: 'Chi ha il VIP', chi: 'mod',
    cosa: 'Elenca chi ha il VIP e fino a quando.' },

  { id: 'sondaggio', modulo: 'sondaggi', nomi: ['sondaggio', 'poll'], titolo: 'Sondaggio', chi: 'mod',
    cosa: 'Apre un sondaggio di Twitch. Con «chiudi» lo chiude.' },
  { id: 'predizione', modulo: 'sondaggi', nomi: ['predizione', 'prediction', 'pronostico'], titolo: 'Predizione', chi: 'mod',
    cosa: 'Apre una predizione. Con «vince» la risolve, con «annulla» rimborsa.' },

  { id: 'sr', modulo: 'musica', nomi: ['sr', 'songrequest', 'richiedi', 'canzone'], titolo: 'Richiedi una canzone',
    cosa: 'Mette un brano nella coda di Spotify.' },
  { id: 'song', modulo: 'musica', nomi: ['song', 'brano', 'np', 'nowplaying'], titolo: 'Cosa sta suonando',
    cosa: 'Dice il brano in riproduzione.' },

  { id: 'ag', modulo: 'sito', nomi: ['ag', 'agentify'], titolo: 'Giochi del sito',
    cosa: 'Manda il comando ai giochi di andryxify.it.' },
];

const PER_ID = new Map(COMANDI.map((c) => [c.id, c]));
export const comandoDi = (id) => PER_ID.get(id) || null;

function impostazioni(channel) {
  return streamers.get(channel)?.settings || {};
}

function scelte(channel) {
  const s = impostazioni(channel).comandi;
  return (s && typeof s === 'object') ? s : {};
}

export const rinominabile = (c) => c.rinominabile !== false;
export const spegnibile = (c) => c.spegnibile !== false;

export function nomiDi(c, scelta = {}) {
  if (!rinominabile(c)) return c.nomi;
  const mio = String(scelta.nome || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
  return mio ? [mio] : c.nomi;
}

export function livelloDi(c, scelta = {}) {
  const base = LIVELLI.includes(c.chi) ? c.chi : 'tutti';
  const mio = LIVELLI.includes(scelta.chi) ? scelta.chi : base;
  return LIVELLI.indexOf(mio) > LIVELLI.indexOf(base) ? mio : base;
}

export const moduloAcceso = (modulo, settings) => {
  const m = MODULI[modulo];
  try { return m ? !!m.acceso(settings || {}) : true; } catch { return true; }
};

const RANGO = { tutti: 0, sub: 1, vip: 2, mod: 3 };

function rangoDi(msg) {
  if (msg?.isBroadcaster || msg?.isMod) return 3;
  if (msg?.isVip) return 2;
  if (msg?.isSub || msg?.isSubscriber) return 1;
  return 0;
}

export const puoUsare = (livello, msg) => rangoDi(msg) >= (RANGO[livello] ?? 0);

// La riga come la vede il pannello: com'e' configurato QUESTO canale.
export function elenco(channel) {
  const s = scelte(channel);
  const cfg = impostazioni(channel);
  return COMANDI.map((c) => {
    const mia = s[c.id] || {};
    const nomi = nomiDi(c, mia);
    const suo = spegnibile(c) ? !mia.off : true;
    const modulo = moduloAcceso(c.modulo, cfg);
    return {
      id: c.id,
      modulo: c.modulo,
      moduloNome: MODULI[c.modulo]?.nome || c.modulo,
      moduloAcceso: modulo,
      titolo: c.titolo,
      cosa: c.cosa,
      costa: !!c.costa,
      attesa: c.attesa || 0,
      spegnibile: spegnibile(c),
      rinominabile: rinominabile(c),
      acceso: suo,
      vivo: suo && modulo,
      nomi,
      rinominato: nomi[0] !== c.nomi[0],
      chi: livelloDi(c, mia),
      chiMinimo: LIVELLI.includes(c.chi) ? c.chi : 'tutti',
    };
  });
}

// Da una parola scritta in chat al comando, con lo stato di questo canale.
export function risolvi(channel, parola) {
  const p = String(parola || '').toLowerCase();
  const s = scelte(channel);
  const cfg = impostazioni(channel);
  for (const c of COMANDI) {
    const mia = s[c.id] || {};
    if (!nomiDi(c, mia).includes(p)) continue;
    const suo = spegnibile(c) ? !mia.off : true;
    return {
      comando: c,
      parola: p,
      spento: !suo,
      moduloSpento: !moduloAcceso(c.modulo, cfg),
      chi: livelloDi(c, mia),
    };
  }
  return null;
}

// IL VAGLIO. Lo chiama il bot una volta sola, prima di far girare i gestori.
//
//   null           non e' un comando predefinito: passa tutto com'e'
//   { salta }      e' predefinito ma spento (suo, o del suo modulo): i gestori
//                  predefiniti non devono rispondere
//   { rifiuta }    riservato, e chi ha scritto non ci arriva
//   { testo }      il testo tradotto nel nome canonico, per i gestori
export function preparaComando(channel, msg) {
  const testo = String(msg?.text || '').trim();
  if (testo[0] !== '!') return null;
  const sp = testo.search(/\s/);
  const parola = (sp < 0 ? testo.slice(1) : testo.slice(1, sp)).toLowerCase();
  const resto = sp < 0 ? '' : testo.slice(sp);
  const r = risolvi(channel, parola);
  if (!r) return null;
  if (r.spento || r.moduloSpento) return { id: r.comando.id, salta: true, motivo: r.spento ? 'spento' : 'modulo' };
  if (!puoUsare(r.chi, msg)) {
    return { id: r.comando.id, rifiuta: r.chi, messaggio: `!${parola} qui e' riservato a ${ETICHETTA[r.chi]}.` };
  }
  return { id: r.comando.id, testo: '!' + r.comando.id + resto };
}

const ETICHETTA = { sub: 'chi e\' abbonato', vip: 'i VIP', mod: 'moderatori e streamer', tutti: 'tutti' };

// L'elenco che !giochi scrive in chat: uno solo, e dice quello che RISPONDE
// davvero. Prima erano due moduli con due liste scritte a mano, e chi non usa la
// webcam si trovava in chat una lista di roba che non ha.
export function elencoGiochiInChat(channel) {
  const righe = elenco(channel).filter((r) => r.vivo && r.id !== 'giochi');
  const chat = righe.filter((r) => r.modulo === 'giochi').map((r) => '!' + r.nomi[0]);
  const webcam = righe.filter((r) => r.modulo === 'webcam' || r.modulo === 'puzzle').map((r) => '!' + r.nomi[0]);
  const pezzi = [];
  if (chat.length) pezzi.push(`🎮 Giochi: ${chat.join(', ')}`);
  if (webcam.length) pezzi.push(`🎥 Con la webcam: ${webcam.join(', ')}`);
  return pezzi.join(' — ');
}

// Cosa il pannello puo' scrivere, e come si ripulisce.
export function normalizza(dati) {
  const fuori = {};
  if (!dati || typeof dati !== 'object') return fuori;
  for (const c of COMANDI) {
    const v = dati[c.id];
    if (!v || typeof v !== 'object') continue;
    const riga = {};
    if (spegnibile(c) && v.off) riga.off = true;
    if (rinominabile(c)) {
      const nome = String(v.nome || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
      if (nome && nome !== c.nomi[0]) riga.nome = nome;
    }
    const base = LIVELLI.includes(c.chi) ? c.chi : 'tutti';
    if (LIVELLI.includes(v.chi) && LIVELLI.indexOf(v.chi) > LIVELLI.indexOf(base)) riga.chi = v.chi;
    if (Object.keys(riga).length) fuori[c.id] = riga;
  }
  return fuori;
}

// Due comandi non possono rispondere alla stessa parola: il secondo non
// partirebbe mai, e nessuno capirebbe perche'.
export function collisioni(dati) {
  const visti = new Map();
  const scontri = [];
  const s = normalizza(dati);
  for (const c of COMANDI) {
    for (const n of nomiDi(c, s[c.id] || {})) {
      if (visti.has(n)) scontri.push({ nome: n, fra: [visti.get(n), c.id] });
      else visti.set(n, c.id);
    }
  }
  return scontri;
}
