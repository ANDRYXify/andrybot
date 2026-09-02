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
  giochi: { nome: ['Giochi in chat', 'Chat games', 'Juegos en el chat'], file: 'games.js', acceso: (s) => s.giochi !== false },
  webcam: { nome: ['Giochi con la webcam', 'Webcam games', 'Juegos con la webcam'], file: 'trackinggiochi.js', acceso: (s) => (s.tracking?.attivo !== false) && (s.tracking?.giochi !== false) },
  puzzle: { nome: ['Puzzle con le mani', 'Hand puzzle', 'Puzle con las manos'], file: 'trackinggiochi.js', acceso: (s) => (s.tracking?.attivo !== false) && s.tracking?.effetti?.puzzle === true },
  sorteggi: { nome: ['Sorteggi', 'Giveaways', 'Sorteos'], file: 'giveaway.js', acceso: (s) => s.giochi !== false },
  ore: { nome: ['Ore guardate', 'Watch time', 'Horas vistas'], file: 'watchtime.js', acceso: (s) => (s.watchtime?.attivo) !== false },
  base: { nome: ['Comandi pronti', 'Built-in commands', 'Comandos de serie'], file: 'comandibase.js', acceso: (s) => (s.comandiBase?.attivo) !== false },
  chat: { nome: ['Gestione dei comandi dalla chat', 'Managing commands from chat', 'Gestión de comandos desde el chat'], file: 'comandichat.js', acceso: (s) => !!(s.comandiChat?.attivo) },
  vip: { nome: ['VIP', 'VIP', 'VIP'], file: 'vip.js', acceso: () => true },
  sondaggi: { nome: ['Sondaggi e predizioni', 'Polls and predictions', 'Encuestas y predicciones'], file: 'sondaggi.js', acceso: () => true },
  musica: { nome: ['Richieste musicali', 'Music requests', 'Peticiones musicales'], file: 'songrequest.js', acceso: () => true },
  sito: { nome: ['Giochi del sito', 'Site games', 'Juegos del sitio'], file: 'gamesbridge.js', acceso: (s) => !!(s.giochiSito?.attivo) },
};

// AGGIUNGERE UN COMANDO E' UNA RIGA. Questa e' la forma completa: quel che non
// scrivi prende il valore fra parentesi, quindi il caso normale sta in quattro
// campi.
//
//   { id: 'x',                  il nome canonico: i gestori sono scritti su questo
//     modulo: 'giochi',         la famiglia (MODULI qui sopra)
//     nomi: ['x', 'ics'],       come si chiama in chat; il primo e' l'id
//     titolo: [it, en, es],     come lo chiama il pannello
//     cosa:   [it, en, es],     una riga di spiegazione, sempre tre lingue
//     chi: 'mod',               livello minimo (di serie: 'tutti')
//     costa: true,              lo dice il pannello con una pastiglia (false)
//     attesa: 5,                secondi di attesa a testa (nessuna)
//     spegnibile: false,        non si puo' spegnere (si puo')
//     rinominabile: false }     non si puo' rinominare (si puo')
//
// Poi servono due cose sole, e i cancelli te le ricordano:
//   · un gestore che conosca quell'id nel file della famiglia;
//   · la stessa riga nella copia finta della demo (app.js), che si rigenera.
//
// Ogni riga: come si chiama di serie, cosa fa, di chi e', e chi puo' usarlo.
// `chi` e' il minimo di serie; lo streamer puo' alzarlo, mai abbassarlo sotto
// quello che il gestore pretende comunque.
export const COMANDI = [
  { id: 'giochi', modulo: 'giochi', nomi: ['giochi'], titolo: ['Elenco dei giochi', 'Games list', 'Lista de juegos'],
    cosa: ['Elenca in chat i giochi accesi, quelli di chat e quelli con la webcam.', 'Lists the games that are on in chat, both chat games and webcam ones.', 'Lista en el chat los juegos activos, los de chat y los de webcam.'], spegnibile: false },

  { id: 'dado', modulo: 'giochi', nomi: ['dado', 'roll'], titolo: ['Dado', 'Dice', 'Dado'],
    cosa: ['Tira un dado. Con !dado 2d20 ne tira altri.', 'Rolls a die. With !dado 2d20 it rolls others.', 'Tira un dado. Con !dado 2d20 tira otros.'], attesa: 3 },
  { id: 'moneta', modulo: 'giochi', nomi: ['moneta', 'coin'], titolo: ['Testa o croce', 'Heads or tails', 'Cara o cruz'],
    cosa: ['Lancia una moneta.', 'Flips a coin.', 'Lanza una moneda.'], attesa: 3 },
  { id: '8ball', modulo: 'giochi', nomi: ['8ball', 'palla8'], titolo: ['Palla magica', 'Magic 8-ball', 'Bola mágica'],
    cosa: ['Risponde a una domanda. Serve la domanda.', 'Answers a question. The question is required.', 'Responde a una pregunta. Hace falta la pregunta.'], attesa: 3 },
  { id: 'monete', modulo: 'giochi', nomi: ['monete', 'punti', 'bilancio'], titolo: ['Il mio saldo', 'My balance', 'Mi saldo'],
    cosa: ['Dice quante monete ha chi lo scrive.', 'Says how many coins the writer has.', 'Dice cuántas monedas tiene quien lo escribe.'] },
  { id: 'classifica', modulo: 'giochi', nomi: ['classifica', 'top', 'classificamod', 'classificastaff', 'topmod'], titolo: ['Classifica', 'Leaderboard', 'Clasificación'],
    cosa: ['I primi del pubblico. Con «mod» la gara dello staff, con «tutti» le due insieme.', 'The top viewers. With «mod» the staff race, with «tutti» both together.', 'Los primeros del público. Con «mod» la carrera del staff, con «tutti» las dos juntas.'] },
  { id: 'slot', modulo: 'giochi', nomi: ['slot'], titolo: ['Slot machine', 'Slot machine', 'Tragaperras'],
    cosa: ['Gioca alla slot: costa monete, il tris paga.', 'Play the slot: it costs coins, three of a kind pays.', 'Juega a la tragaperras: cuesta monedas, el trío paga.'], costa: true, attesa: 5 },
  { id: 'duello', modulo: 'giochi', nomi: ['duello', 'duel'], titolo: ['Duello', 'Duel', 'Duelo'],
    cosa: ['Sfida un\'altra persona in chat.', 'Challenge someone else in chat.', 'Reta a otra persona en el chat.'], costa: true },
  { id: 'trivia', modulo: 'giochi', nomi: ['trivia', 'quiz'], titolo: ['Trivia', 'Trivia', 'Trivia'],
    cosa: ['Domanda a sorpresa: il primo che risponde vince.', 'Surprise question: the first to answer wins.', 'Pregunta sorpresa: el primero que responde gana.'] },
  { id: 'manche', modulo: 'giochi', nomi: ['manche', 'gioca'], titolo: ['Manche al volo', 'Round on the fly', 'Ronda al vuelo'],
    cosa: ['Lancia subito una manche invece di aspettare quella automatica.', 'Starts a round right away instead of waiting for the automatic one.', 'Lanza una ronda enseguida en vez de esperar la automática.'] },
  { id: 'pesca', modulo: 'giochi', nomi: ['pesca', 'fish'], titolo: ['Pesca', 'Fishing', 'Pesca'],
    cosa: ['Getta la lenza: si pesca qualcosa, o niente.', 'Cast the line: you catch something, or nothing.', 'Echa el sedal: pescas algo, o nada.'], costa: true },
  { id: 'roulette', modulo: 'giochi', nomi: ['roulette', 'rul'], titolo: ['Roulette', 'Roulette', 'Ruleta'],
    cosa: ['Punta le monete su rosso o nero.', 'Bet your coins on red or black.', 'Apuesta las monedas al rojo o al negro.'], costa: true },
  { id: 'furto', modulo: 'giochi', nomi: ['furto', 'rapina'], titolo: ['Furto', 'Heist', 'Robo'],
    cosa: ['Prova a rubare monete a un\'altra persona. Può andare male.', 'Try to steal coins from someone else. It can go wrong.', 'Intenta robar monedas a otra persona. Puede salir mal.'], costa: true },
  { id: 'regala', modulo: 'giochi', nomi: ['regala', 'dona'], titolo: ['Regala monete', 'Gift coins', 'Regala monedas'],
    cosa: ['Passa monete tue a qualcun altro.', 'Pass your coins to someone else.', 'Pasa monedas tuyas a otra persona.'], costa: true },

  { id: 'mima', modulo: 'webcam', nomi: ['mima', 'mimo'], titolo: ['Mima', 'Charades', 'Mímica'], chi: 'mod',
    cosa: ['Avvia il gioco della mimica nell\'overlay della webcam.', 'Starts the charades game in the webcam overlay.', 'Inicia el juego de mímica en el overlay de la webcam.'] },
  { id: 'nonridere', modulo: 'webcam', nomi: ['nonridere', 'nonrido'], titolo: ['Non ridere', 'Don\'t laugh', 'No te rías'], chi: 'mod',
    cosa: ['Avvia la sfida «non ridere» nell\'overlay della webcam.', 'Starts the «don\'t laugh» challenge in the webcam overlay.', 'Inicia el reto «no te rías» en el overlay de la webcam.'] },
  { id: 'reaction', modulo: 'webcam', nomi: ['reaction', 'reactionrush', 'rush'], titolo: ['Reaction rush', 'Reaction rush', 'Reaction rush'], chi: 'mod',
    cosa: ['Avvia la prova di reazione nell\'overlay della webcam.', 'Starts the reaction test in the webcam overlay.', 'Inicia la prueba de reacción en el overlay de la webcam.'] },
  { id: 'battaglia', modulo: 'webcam', nomi: ['battaglia', 'battle'], titolo: ['Battaglia con la chat', 'Battle with chat', 'Batalla con el chat'], chi: 'mod',
    cosa: ['Avvia la battaglia: la chat sfida con i gesti.', 'Starts the battle: chat challenges you with gestures.', 'Inicia la batalla: el chat te reta con gestos.'] },
  { id: 'sfida', modulo: 'webcam', nomi: ['sfida'], titolo: ['Sfida un gesto', 'Challenge a gesture', 'Reta con un gesto'],
    cosa: ['Durante la battaglia, manda un gesto da imitare.', 'During the battle, sends a gesture to imitate.', 'Durante la batalla, manda un gesto para imitar.'] },
  { id: 'puzzle', modulo: 'puzzle', nomi: ['puzzle'], titolo: ['Puzzle con le mani', 'Hand puzzle', 'Puzle con las manos'], chi: 'mod',
    cosa: ['Avvia il puzzle nell\'overlay della webcam.', 'Starts the puzzle in the webcam overlay.', 'Inicia el puzle en el overlay de la webcam.'] },
  { id: 'puzzlestop', modulo: 'puzzle', nomi: ['puzzlestop'], titolo: ['Ferma il puzzle', 'Stop the puzzle', 'Para el puzle'], chi: 'mod',
    cosa: ['Ferma il puzzle in corso.', 'Stops the puzzle in progress.', 'Para el puzle en curso.'] },

  { id: 'giveaway', modulo: 'sorteggi', nomi: ['giveaway', 'sorteggio', 'gw'], titolo: ['Apri un sorteggio', 'Open a giveaway', 'Abre un sorteo'], chi: 'mod',
    cosa: ['Apre il sorteggio e annuncia il premio.', 'Opens the giveaway and announces the prize.', 'Abre el sorteo y anuncia el premio.'] },
  { id: 'join', modulo: 'sorteggi', nomi: ['join', 'partecipa', 'entra'], titolo: ['Entra nel sorteggio', 'Enter the giveaway', 'Entra en el sorteo'], rinominabile: false,
    cosa: ['Entra nel sorteggio aperto. La parola d\'ingresso si sceglie all\'apertura.', 'Enters the open giveaway. The entry word is chosen when it opens.', 'Entra en el sorteo abierto. La palabra de entrada se elige al abrirlo.'] },
  { id: 'biglietti', modulo: 'sorteggi', nomi: ['biglietti', 'ticket', 'tickets'], titolo: ['Regala biglietti', 'Gift tickets', 'Regala boletos'], chi: 'mod',
    cosa: ['Dà biglietti in più a una persona.', 'Gives extra tickets to someone.', 'Da boletos extra a una persona.'] },
  { id: 'estrai', modulo: 'sorteggi', nomi: ['estrai', 'draw', 'vincitore'], titolo: ['Estrai', 'Draw', 'Sortea'], chi: 'mod',
    cosa: ['Estrae un vincitore. Con un numero ne estrae più d\'uno.', 'Draws a winner. With a number it draws more than one.', 'Saca un ganador. Con un número saca más de uno.'] },

  { id: 'ore', modulo: 'ore', nomi: ['ore', 'oreguardate', 'tempo', 'watchtime'], titolo: ['Ore guardate', 'Watch time', 'Horas vistas'],
    cosa: ['Dice da quanto tempo guarda chi lo scrive.', 'Says how long the writer has been watching.', 'Dice cuánto lleva viendo quien lo escribe.'] },
  { id: 'classificaore', modulo: 'ore', nomi: ['classificaore', 'classificatempo', 'oretop', 'topore'], titolo: ['Classifica delle ore', 'Watch time leaderboard', 'Clasificación de horas'],
    cosa: ['Chi ha guardato di più.', 'Who has watched the most.', 'Quién ha visto más.'] },

  { id: 'so', modulo: 'base', nomi: ['so', 'shoutout'], titolo: ['Shoutout', 'Shoutout', 'Shoutout'], chi: 'mod',
    cosa: ['Fa lo shoutout a un altro canale.', 'Gives a shoutout to another channel.', 'Hace un shoutout a otro canal.'] },
  { id: 'followage', modulo: 'base', nomi: ['followage', 'daquanto'], titolo: ['Da quanto segui', 'How long you\'ve followed', 'Desde cuándo sigues'],
    cosa: ['Dice da quanto tempo una persona segue il canale.', 'Says how long someone has followed the channel.', 'Dice desde cuándo una persona sigue el canal.'] },
  { id: 'uptime', modulo: 'base', nomi: ['uptime'], titolo: ['Da quanto sei in diretta', 'How long you\'ve been live', 'Cuánto llevas en directo'],
    cosa: ['Dice da quanto è cominciata la diretta.', 'Says how long ago the stream started.', 'Dice cuándo empezó el directo.'] },
  { id: 'bot', modulo: 'base', nomi: ['bot', 'socialbot', 'ia', 'ai'], titolo: ['Parla col bot', 'Talk to the bot', 'Habla con el bot'],
    cosa: ['Chiama il bot e gli fa una domanda.', 'Calls the bot and asks it a question.', 'Llama al bot y le hace una pregunta.'] },

  { id: 'comando', modulo: 'chat', nomi: ['comando', 'cmd', 'comandi', 'command', 'commands'], titolo: ['Gestisci i comandi', 'Manage commands', 'Gestiona los comandos'], chi: 'mod',
    cosa: ['Aggiunge, cambia e toglie comandi senza aprire il pannello.', 'Adds, changes and removes commands without opening the panel.', 'Añade, cambia y quita comandos sin abrir el panel.'] },
  { id: 'addcom', modulo: 'chat', nomi: ['addcom'], titolo: ['Aggiungi un comando', 'Add a command', 'Añade un comando'], chi: 'mod',
    cosa: ['Scorciatoia per aggiungere un comando.', 'Shortcut to add a command.', 'Atajo para añadir un comando.'] },
  { id: 'delcom', modulo: 'chat', nomi: ['delcom'], titolo: ['Togli un comando', 'Remove a command', 'Quita un comando'], chi: 'mod',
    cosa: ['Scorciatoia per togliere un comando.', 'Shortcut to remove a command.', 'Atajo para quitar un comando.'] },
  { id: 'editcom', modulo: 'chat', nomi: ['editcom'], titolo: ['Cambia un comando', 'Edit a command', 'Cambia un comando'], chi: 'mod',
    cosa: ['Scorciatoia per cambiare la risposta di un comando.', 'Shortcut to change a command\'s reply.', 'Atajo para cambiar la respuesta de un comando.'] },

  { id: 'vip', modulo: 'vip', nomi: ['vip'], titolo: ['Dà il VIP', 'Give VIP', 'Da el VIP'], chi: 'mod',
    cosa: ['Dà il VIP a una persona, per una settimana o per un mese.', 'Gives VIP to someone, for a week or a month.', 'Da el VIP a una persona, por una semana o un mes.'] },
  { id: 'unvip', modulo: 'vip', nomi: ['unvip'], titolo: ['Togli il VIP', 'Remove VIP', 'Quita el VIP'], chi: 'mod',
    cosa: ['Toglie il VIP a una persona.', 'Removes VIP from someone.', 'Quita el VIP a una persona.'] },
  { id: 'viplista', modulo: 'vip', nomi: ['viplista', 'viplist'], titolo: ['Chi ha il VIP', 'Who has VIP', 'Quién tiene VIP'], chi: 'mod',
    cosa: ['Elenca chi ha il VIP e fino a quando.', 'Lists who has VIP and until when.', 'Lista quién tiene VIP y hasta cuándo.'] },

  { id: 'sondaggio', modulo: 'sondaggi', nomi: ['sondaggio', 'poll'], titolo: ['Sondaggio', 'Poll', 'Encuesta'], chi: 'mod',
    cosa: ['Apre un sondaggio di Twitch. Con «chiudi» lo chiude.', 'Opens a Twitch poll. With «chiudi» it closes it.', 'Abre una encuesta de Twitch. Con «chiudi» la cierra.'] },
  { id: 'predizione', modulo: 'sondaggi', nomi: ['predizione', 'prediction', 'pronostico'], titolo: ['Predizione', 'Prediction', 'Predicción'], chi: 'mod',
    cosa: ['Apre una predizione. Con «vince» la risolve, con «annulla» rimborsa.', 'Opens a prediction. With «vince» it resolves, with «annulla» it refunds.', 'Abre una predicción. Con «vince» la resuelve, con «annulla» reembolsa.'] },

  { id: 'sr', modulo: 'musica', nomi: ['sr', 'songrequest', 'richiedi', 'canzone'], titolo: ['Richiedi una canzone', 'Request a song', 'Pide una canción'],
    cosa: ['Mette un brano nella coda di Spotify.', 'Puts a track in the Spotify queue.', 'Pone un tema en la cola de Spotify.'] },
  { id: 'song', modulo: 'musica', nomi: ['song', 'brano', 'np', 'nowplaying'], titolo: ['Cosa sta suonando', 'What\'s playing', 'Qué está sonando'],
    cosa: ['Dice il brano in riproduzione.', 'Says the track that is playing.', 'Dice el tema que está sonando.'] },

  { id: 'ag', modulo: 'sito', nomi: ['ag', 'agentify'], titolo: ['Giochi del sito', 'Site games', 'Juegos del sitio'],
    cosa: ['Manda il comando ai giochi di andryxify.it.', 'Sends the command to the andryxify.it games.', 'Manda el comando a los juegos de andryxify.it.'] },
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
