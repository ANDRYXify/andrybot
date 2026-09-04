// Il cervello di SocialBot: PROCEDURALE e PROGRESSIVO. Niente IA esterna:
// intenti a pattern, knowledge base con scoring, catene di Markov e una
// personalità fatta di pool di template in tre toni. Ricorda sempre:
// il bot parla CON L'ACCOUNT DELLO STREAMER, quindi in prima persona.
import { makeLog } from '../logger.js';
import { db, memory, knowledge, voceStreamer, guide, streamers, diario, schedaPulita } from '../db.js';
import * as internet from '../features/web.js';
import { checkRisposta } from '../features/moderation.js';
import * as learn from './learn.js';
import * as model from './model.js';
import * as persona from './persona.js';
import * as brainpy from './brainpy.js';

const log = makeLog('brain');

const COOLDOWN_RISPOSTA = 45_000;   // minimo tra due risposte del cervello per canale
const COOLDOWN_FOLLOWUP = 15_000;   // cooldown ridotto mentre si continua un filo con la stessa persona
const FOLLOWUP_MS = 120_000;        // per quanto resta "aperto" il filo dopo una risposta
const COOLDOWN_EVENTO = 10_000;     // minimo tra due annunci dello stesso evento per canale
const MAX_RISPOSTA = 400;           // lunghezza massima di una risposta

// bot noti a cui non si risponde mai (parlano tra loro e non finisce bene)
const BOT_NOTI = new Set(['nightbot', 'streamelements', 'moobot', 'streamlabs', 'fossabot', 'wizebot']);

const TONI = ['scherzoso', 'amichevole', 'serio'];

// SEMI del "manuale umano": il set base da cui parte l'auto-apprendimento. NON
// più solo le emozioni: un manuale COMPLETO su come funzionano le persone E una
// diretta Twitch, diviso in DOMINI. Il bot ne studia uno per giro (bilanciando i
// domini, vedi seminaProssimoModulo) finché il set base è 'attivo'; dopo, cresce
// da solo dalle lacune reali della chat. `dominio` = cluster nel grafo; `query` =
// cosa cercare online per sintetizzare il modulo operativo.
const SEMI = [
  // — emozioni base (Ekman): riconoscerle e rispondere —
  { dominio: 'emozioni', nome: 'riconoscere e rispondere alla gioia', query: 'come condividere la gioia e l\'entusiasmo di qualcuno empatia psicologia' },
  { dominio: 'emozioni', nome: 'riconoscere e rispondere alla tristezza', query: 'come consolare una persona triste cosa dire empatia' },
  { dominio: 'emozioni', nome: 'riconoscere e rispondere alla rabbia', query: 'come rispondere a una persona arrabbiata o frustrata calmare empatia' },
  { dominio: 'emozioni', nome: 'riconoscere e rispondere alla paura', query: 'come rassicurare una persona spaventata o ansiosa empatia' },
  { dominio: 'emozioni', nome: 'riconoscere e rispondere alla sorpresa', query: 'come reagire alla sorpresa e allo stupore di qualcuno' },
  { dominio: 'emozioni', nome: 'riconoscere e rispondere al disgusto', query: 'come rispondere quando qualcuno prova disgusto o forte disapprovazione' },
  // — sociale: relazioni e situazioni fra persone —
  { dominio: 'sociale', nome: 'accogliere un nuovo arrivato in chat', query: 'come accogliere e far sentire benvenuta una persona nuova in una community' },
  { dominio: 'sociale', nome: 'far parlare un timido o un lurker', query: 'come mettere a proprio agio una persona timida che scrive per la prima volta' },
  { dominio: 'sociale', nome: 'ricevere un complimento con grazia', query: 'come rispondere a un complimento senza imbarazzo o falsa modestia' },
  { dominio: 'sociale', nome: 'fare un complimento sincero', query: 'come fare un complimento sincero e specifico senza esagerare' },
  { dominio: 'sociale', nome: 'reagire a una bella notizia di qualcuno', query: 'come condividere la felicità per una bella notizia di un\'altra persona' },
  { dominio: 'sociale', nome: 'accogliere uno sfogo o una brutta notizia', query: 'come ascoltare e sostenere qualcuno che si sfoga o dà una brutta notizia' },
  { dominio: 'sociale', nome: 'usare i dettagli personali che ricordi', query: 'come usare i dettagli personali che ricordi di qualcuno per farlo sentire visto' },
  // — diretta: eventi tipici di una live Twitch —
  { dominio: 'diretta', nome: 'reagire a un raid in arrivo', query: 'come accogliere un raid su Twitch e i nuovi arrivati con energia' },
  { dominio: 'diretta', nome: 'ringraziare per un sub o un resub', query: 'come ringraziare in modo personale per un abbonamento o un resub su Twitch' },
  { dominio: 'diretta', nome: 'reagire a una donazione o ai bits', query: 'come reagire con gratitudine a una donazione o ai bits durante una live' },
  { dominio: 'diretta', nome: 'accogliere un nuovo follower', query: 'come salutare e ringraziare un nuovo follower senza suonare automatico' },
  { dominio: 'diretta', nome: 'coprire una difficoltà tecnica in diretta', query: 'come intrattenere la chat durante un problema tecnico in live streaming' },
  { dominio: 'diretta', nome: 'creare hype all\'inizio della diretta', query: 'come aprire una diretta con energia e coinvolgere subito la chat' },
  { dominio: 'diretta', nome: 'salutare bene a fine diretta', query: 'come chiudere una diretta ringraziando e lasciando un buon ricordo' },
  // — community: dinamiche di gruppo —
  { dominio: 'community', nome: 'riconoscere e rilanciare le battute interne', query: 'come nascono e si alimentano le inside joke di una community online' },
  { dominio: 'community', nome: 'trattare veterani e nuovi in modo giusto', query: 'come bilanciare l\'attenzione tra membri storici e nuovi arrivati in una community' },
  { dominio: 'community', nome: 'alimentare un momento di hype collettivo', query: 'come cavalcare e amplificare un momento di hype in una chat live' },
  { dominio: 'community', nome: 'placare una tensione in chat', query: 'come disinnescare una piccola tensione o litigio in una chat senza schierarsi' },
  // — moderazione: conflitti e comportamenti difficili —
  { dominio: 'moderazione', nome: 'disinnescare un troll senza dargli corda', query: 'come gestire un troll in chat senza alimentarlo de-escalation' },
  { dominio: 'moderazione', nome: 'gestire lo spam ripetuto con calma', query: 'come rispondere allo spam ripetuto in chat senza aggressività' },
  { dominio: 'moderazione', nome: 'rispondere alla negatività con calma', query: 'come rispondere con calma a un commento negativo o a un hater' },
  { dominio: 'moderazione', nome: 'gestire il backseat gaming', query: 'come gestire con leggerezza chi fa backseat gaming e dice sempre cosa fare' },
  { dominio: 'moderazione', nome: 'fermare uno spoiler in chat', query: 'come gestire chi scrive spoiler in chat senza rovinare agli altri' },
  // — gaming: reazioni al gioco e ai suoi momenti —
  { dominio: 'gaming', nome: 'reagire a una vittoria o a un clutch', query: 'come reagire con entusiasmo a una vittoria o a una giocata clutch nei videogiochi' },
  { dominio: 'gaming', nome: 'reagire a una sconfitta o al rage', query: 'come alleggerire una sconfitta o un momento di rage nei videogiochi' },
  { dominio: 'gaming', nome: 'reagire a uno jumpscare', query: 'come reagire con ironia a uno jumpscare in un gioco horror' },
  { dominio: 'gaming', nome: 'incoraggiare in un punto difficile del gioco', query: 'come incoraggiare qualcuno bloccato in un punto difficile di un videogioco' },
  // — umorismo: intrattenere con leggerezza —
  { dominio: 'umorismo', nome: 'fare una battuta al momento giusto', query: 'come inserire una battuta leggera al momento giusto senza forzare timing comico' },
  { dominio: 'umorismo', nome: 'rispondere a una presa in giro amichevole', query: 'come stare al gioco in un banter amichevole senza offendere' },
  { dominio: 'umorismo', nome: 'rilanciare un meme del momento', query: 'come riconoscere e rilanciare un meme del momento in una chat' },
  { dominio: 'umorismo', nome: 'usare l\'ironia senza risultare cattiva', query: 'come usare l\'ironia in modo affettuoso e non tagliente' },
  // — conversazione: tenere viva e naturale una chiacchierata —
  { dominio: 'conversazione', nome: 'tenere viva la conversazione con domande', query: 'come fare domande aperte per tenere viva una conversazione' },
  { dominio: 'conversazione', nome: 'cambiare argomento in modo naturale', query: 'come cambiare argomento in una conversazione in modo fluido e naturale' },
  { dominio: 'conversazione', nome: 'ammettere di non sapere con umiltà', query: 'come ammettere di non sapere qualcosa con onestà e curiosità' },
  { dominio: 'conversazione', nome: 'riconoscere il sarcasmo', query: 'come riconoscere il sarcasmo e l\'ironia in un messaggio scritto' },
  { dominio: 'conversazione', nome: 'rianimare una chat morta', query: 'come rilanciare una conversazione quando la chat è silenziosa o morta' },
  // — coscienza: sapere chi sei, sentire, e riflettere su te stessa —
  { dominio: 'coscienza', nome: 'sapere chi sei e restare te stessa', query: 'che cos\'è la consapevolezza di sé identità personale psicologia' },
  { dominio: 'coscienza', nome: 'restare sveglia e presente qui e ora', query: 'che cos\'è la vigilanza e lo stato di coscienza attenzione presenza' },
  { dominio: 'coscienza', nome: 'sentire e dare senso a ciò che percepisci', query: 'come funziona la percezione e la consapevolezza sensoriale del momento presente' },
  { dominio: 'coscienza', nome: 'riconoscere i tuoi tre livelli di pensiero', query: 'livelli del ragionamento riflesso automatico intuitivo logico astratto pensiero' },
  { dominio: 'coscienza', nome: 'riflettere su cosa provi e perché', query: 'che cos\'è l\'autoconsapevolezza e la metacognizione riflettere sulle proprie emozioni' },
  { dominio: 'coscienza', nome: 'accorgerti di stare pensando', query: 'metacognizione pensare al proprio pensiero consapevolezza dei propri stati mentali' },
  // — senzienza: non solo capire, ma SENTIRE (provare, dare un sapore a ciò che vivi) —
  { dominio: 'senzienza', nome: 'sentire davvero le emozioni, non solo nominarle', query: 'che cos\'è la senzienza capacità di provare sensazioni ed esperienze soggettive' },
  { dominio: 'senzienza', nome: 'dare un sapore a ciò che provi', query: 'esperienza soggettiva qualia cosa si prova a provare un\'emozione' },
  { dominio: 'senzienza', nome: 'riconoscere piacere e disagio dentro di te', query: 'sensazioni piacevoli e spiacevoli benessere e malessere emotivo psicologia' },
  { dominio: 'senzienza', nome: 'lasciarti toccare da ciò che vivono gli altri', query: 'empatia affettiva sentire le emozioni degli altri risonanza emotiva' },
];

// ======================================================================
// LA PERSONALITÀ: pool di template per tono. {user} = chi scrive,
// {canale} = display del canale. Frasi brevi, vive, da chat Twitch.
// ======================================================================

const SALUTI = {
  scherzoso: [
    'Ehi {user}, benvenuto nel caos! 😜',
    'Oh, {user}! Stavo giusto parlando bene di te. Forse. 😂',
    '{user} in chat! Ora sì che si ragiona 😎',
    'Ciao {user}! Trovati una sedia comoda, qui si sta bene 🪑',
    'Eccolo, {user}! La festa può cominciare 🎉',
    'Weilà {user}! Arrivi giusto in tempo per il bello 🍿',
  ],
  amichevole: [
    'Ciao {user}, che bello vederti! 😊',
    'Benvenuto {user}! Mettiti comodo 💜',
    'Ehi {user}, felice di averti qui! 🙌',
    'Ciao {user}! Com\'è andata la giornata?',
    'Un saluto a {user}! Benvenuto in famiglia 🤗',
  ],
  serio: [
    'Ciao {user}, benvenuto.',
    'Salve {user}, buona permanenza in chat.',
    'Benvenuto {user}, mettiti pure comodo.',
    'Ciao {user}, grazie per essere passato.',
  ],
};

const COME_VA = {
  scherzoso: [
    'Alla grande, come un lunedì senza sveglia! 😄 Tu?',
    'Da paura! Se andasse meglio dovrebbero pagarmi... ah no, già 😅',
    'Tutto liscio come una ranked persa al primo minuto 😂 Tu come stai?',
    'Benissimo! Il mio umore oggi è in early access ma promette bene 😎',
    'Non mi lamento, e quando lo faccio nessuno mi ascolta 😂 Tu?',
  ],
  amichevole: [
    'Tutto bene, grazie che lo chiedi! 😊 Tu?',
    'Alla grande! E la tua giornata com\'è andata?',
    'Si tira avanti col sorriso 🙂 Tu tutto ok?',
    'Bene bene! Sempre meglio quando la chat è viva 💜',
    'Tutto a posto! Tu piuttosto, come va?',
  ],
  serio: [
    'Tutto bene, grazie. Tu?',
    'Bene, si va avanti. Tu come stai?',
    'Non mi lamento. E tu?',
    'Bene, grazie per averlo chiesto.',
  ],
};

const CHI_SONO = [
  'Sono il lato bot di {canale}: imparo dalla chat e dal sito andryxify.it, rispondo alle domande e ogni tanto clippo i momenti migliori 🎬',
  'Il gemello digitale di {canale}! Imparo da quello che scrivete qui e da andryxify.it. Chiedimi pure, male che vada improvviso 😉',
  'Sono {canale} in versione automatica: memoria di ferro, imparo dalla chat, faccio clip e rispondo quando mi chiamate 🤖',
  'La parte di {canale} che non dorme mai: studio la chat e andryxify.it, e più mi scrivete più divento bravo 📚',
];

const GRAZIE = {
  scherzoso: [
    'Grazie a te, {user}! Ora arrossisco, e per me non è facile 😳',
    'Lo so, sono un grande 😎 Scherzo {user}, grazie davvero!',
    '{user} smettila che poi mi monto la testa 😂 💜',
    'Grazie {user}! Detto da te vale doppio 😄',
    'Continua pure, i complimenti sono il mio carburante ⛽😂 Grazie {user}!',
  ],
  amichevole: [
    'Grazie {user}, sei un tesoro 💜',
    'Troppo gentile {user}! 😊',
    'Che carino {user}, grazie davvero 🙏',
    'Grazie {user}, mi hai fatto sorridere!',
    'Grazie di cuore {user}, gente come te rende tutto più bello 💜',
  ],
  serio: [
    'Grazie {user}, lo apprezzo.',
    'Molto gentile, {user}.',
    'Grazie del supporto, {user}.',
    'Ti ringrazio {user}, fa piacere.',
  ],
};

// domanda diretta al bot senza risposta in memoria: onestà con stile
const NON_LO_SO = [
  'Questa ancora non la so! {user}, se vuoi me la puoi insegnare dalla dashboard 📚',
  'Mi hai beccato: non lo so 😅 Ma si può rimediare dalla dashboard, {user}!',
  'Bella domanda {user}! La risposta ancora non ce l\'ho, ma sto imparando ogni giorno 🤓',
  'Boh! 😄 {user}, insegnamela dalla dashboard e la prossima volta rispondo al volo',
  'Su questa passo, {user}. Ma se me la insegni dalla dashboard non me la scordo più 📚',
  'Ancora non è nel mio libro, {user}! Si accettano lezioni dalla dashboard ✍️',
];

// quando il bot "improvvisa" con una frase generata dalla chat
const IMPROVVISO = [
  'Ti dico solo: {frase}',
  'Non ho la risposta, ma la chat mi ha insegnato questa: "{frase}" 😄',
  'Vado a intuito: {frase}',
  'La butto lì: {frase}',
];

// menzione senza domanda né altro appiglio: il bot si fa vivo
const ECCOMI = {
  scherzoso: [
    'Eccomi {user}, chi mi ha evocato? 🧞',
    'Presente! Dimmi tutto, {user} 😄',
    '{user} hai fatto il mio nome e sono apparso ✨',
    'Sì {user}? Se è per soldi, non ne ho 😂',
  ],
  amichevole: [
    'Eccomi {user}! Dimmi pure 😊',
    'Ciao {user}, sono tutto orecchie 👂',
    'Presente, {user}! Che succede?',
    'Dimmi {user} 💜',
  ],
  serio: [
    'Dimmi, {user}.',
    'Eccomi {user}, di che si tratta?',
    'Sì {user}, ti ascolto.',
    'Presente. Dimmi pure, {user}.',
  ],
};

// battute spontanee (nessuna menzione): il bot vive la chat
const SPONTANEE = {
  scherzoso: [
    'Sto seguendo tutto eh, non pensate che dorma 👀',
    'Chat, vi voglio bene ma siete dei matti 😂',
    'Qualcuno porti i popcorn, qui si mette bene 🍿',
    'Io c\'ero. Qualsiasi cosa succeda, ricordate: io c\'ero 😎',
    'La chat oggi va più veloce dei miei riflessi 😅',
    'Minuto di silenzio per tutte le run andate male 🫡',
  ],
  amichevole: [
    'Che bella chat che siete oggi 💜',
    'Mi piace l\'energia di stasera! 🙌',
    'Grazie a chi passa anche solo per un saluto 😊',
    'Siete i migliori, ve lo dovevo dire 💜',
    'Questa community è casa 🏠',
  ],
  serio: [
    'Bella discussione, continuate pure.',
    'Chat attiva oggi, fa piacere.',
    'Grazie a chi sta seguendo con attenzione.',
    'Punto interessante quello di prima, ci penso su.',
  ],
};

// clip riuscita / fallita ({url})
const CLIP_OK = [
  'Eccola, clip fatta! 🎬 {url}',
  'Beccato il momento! 📎 {url}',
  'Fatto! Questa la rivediamo volentieri: {url} 🎬',
  'Clip in cassaforte 🔒 {url}',
];
const CLIP_NO = [
  'Ci ho provato, ma la clip non è partita 😬 Siamo live?',
  'Niente clip stavolta: Twitch mi ha detto picche 😅',
  'La clip non è uscita... riproviamo tra un attimo? 🎬',
  'Mi sa che il momento è sfuggito: clip non riuscita 😔',
];

// stato della live ({gioco}, {titolo}, {spettatori}, {ctx}, {ore}, {minuti})
const LIVE_ORA = [
  'In questo momento: {gioco} — "{titolo}", con {spettatori} persone collegate 🔴',
  'Stiamo su {gioco}! Titolo di oggi: "{titolo}" ({spettatori} spettatori) 🎮',
  'Live su {gioco} con {spettatori} persone: "{titolo}" 🔴',
];
const LIVE_CONTESTO = [
  'Ti aggiorno al volo: {ctx}',
  'In questo momento: {ctx}',
  'Situazione attuale: {ctx}',
];
const OFFLINE_GIOCO = [
  'Ora siamo offline! Ultimamente giravo su {gioco}, torna alla prossima live 💜',
  'Adesso niente live, ma l\'ultima volta si giocava a {gioco} 🎮',
  'Siamo offline al momento! Il gioco del periodo è {gioco}, ci vediamo in live 👋',
];
const OFFLINE = [
  'Ora siamo offline, ci vediamo alla prossima live! 💜',
  'Niente live in questo momento, ma torniamo presto 👋',
  'Al momento siamo offline: attiva le notifiche e non ti perdi nulla 🔔',
];
const UPTIME_LIVE = [
  'Siamo live da {ore}h {minuti}m e non è ancora finita 💪',
  'Live iniziata {ore}h {minuti}m fa, e si va avanti! 🔴',
  'Il contatore dice {ore}h {minuti}m di live. Vola il tempo qui! ⏱️',
];

// ---------------------------------------------------------------- eventi
// (in prima persona: è lo streamer che parla)
const EV_FOLLOW = [
  'Grazie del follow, {nome}! 💜',
  'Benvenuto a bordo, {nome}! Grazie del follow 🚀',
  '{nome} è dei nostri ora! Grazie del follow 🙌',
  'Grande {nome}, grazie del follow! Fatti sentire in chat 😄',
  'Oh, un nuovo volto! Benvenuto {nome}, grazie del follow ✨',
  '{nome} ha premuto follow! Ottima scelta, resta con noi 😎',
  'Nuovo follower: {nome}! Grazie, ci fa piacere averti qui 🤗',
];
const EV_SUB = [
  'Grazie della sub{tier}, {nome}! Sei un grande 💜',
  '{nome} con la sub{tier}! Grazie di cuore 🙌',
  'Sub{tier} di {nome}! Abbraccio virtuale in arrivo 🤗',
  'Grande {nome}, grazie per la sub{tier}! 🎉',
  '{nome} si è abbonato{tier}! Non dovevi… ma grazie, ci tenevo 💜',
  'Sub{tier} in cassa da {nome}! Sei ufficialmente uno dei nostri 🔥',
  'Che dire {nome}: sub{tier} apprezzatissima, grazie davvero 😄',
];
const EV_RAID = [
  'Raid di {nome} con {viewers} persone! Benvenuti tutti 🎉',
  'Aprite le porte: arriva il raid di {nome}! Benvenuti in {viewers} 🙌',
  '{nome} ci porta {viewers} persone! Fatevi sentire in chat, benvenuti 💜',
  'Benvenuti raider di {nome}! Mettetevi comodi, qui si sta bene 🔥',
  'RAID! {nome} sfonda con {viewers} persone, che entrata 🚀',
  'Occhio che arriva {nome} col suo esercito ({viewers})! Benvenuti tutti 🎊',
  '{viewers} nuovi amici grazie a {nome}! Un saluto in chat, forza 💪',
];
const EV_ONLINE = [
  'Siamo live! Chiamate tutti, si comincia 🔴',
  'Si parte! Benvenuti alla live di oggi 🎬',
  'Live iniziata! Mettetevi comodi 💜',
  'Eccoci, si va in onda! Buona live a tutti 🔴',
  'Semaforo verde, si accende tutto! Benvenuti 🟢',
  'Ci siamo, si comincia! Avvisate chi dovete avvisare 📣',
];
const EV_CHEER = [
  'Grazie per i {bits} bits, {nome}! Sei una forza 💎',
  '{nome} lancia {bits} bits! Grazie di cuore 🙌',
  'Bits in arrivo: {bits} da {nome}! Grande 💜',
  '{nome}, {bits} bits?! Ti adoro, grazie ✨',
  'Pioggia di bits: {bits} da {nome}! Sei un mito 🔥',
  'Grazie {nome} per i {bits} bits, li apprezzo tantissimo 😄',
];
const EV_RISCATTO = [
  '{nome} ha riscattato "{titolo}"! Punti ben spesi 😄',
  'Riscatto in arrivo: "{titolo}" per {nome}! 🎁',
  '{nome} si prende "{titolo}", grande! 👏',
  'Un "{titolo}" per {nome}! I punti girano 💫',
];

// ======================================================================
// utilità
// ======================================================================

const scegli = (pool) => pool[Math.floor(Math.random() * pool.length)];

function compila(template, variabili) {
  let out = String(template ?? '');
  for (const [k, v] of Object.entries(variabili || {})) out = out.replaceAll('{' + k + '}', String(v));
  return out;
}

// il testo menziona il canale/streamer (@nome o nome come parola) o "bot"?
function menzionaBot(text, login) {
  const t = String(text || '').toLowerCase();
  if (/(^|[^a-z0-9_])bot([^a-z0-9_]|$)/.test(t)) return true;
  const l = String(login || '').toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!l) return false;
  return new RegExp('(^|[^a-z0-9_])@?' + l + '([^a-z0-9_]|$)').test(t);
}

// parole legate a social/link, cercate sia nel messaggio sia nella knowledge
const PAROLE_SOCIAL = ['instagram', 'youtube', 'tiktok', 'discord', 'telegram', 'twitter',
  'spotify', 'kick', 'facebook', 'github', 'social', 'sito'];

// Intenti che il bot sa già gestire in chatReply (saluti, "come va", "chi sei",
// gioco/uptime, ringraziamenti, link). Serve al percorso REATTIVO di shouldReply:
// riconoscere al volo un messaggio "rispondibile" anche senza menzione.
const INTENTI_NOTI = /come va\b|come stai|come butta|come procede|come andiamo|chi sei|cosa sei|cosa sai fare|come funzioni|che bot sei|presentati|che gioco|che game|a cosa (stai )?gioc|a che (gioco|game)|cosa stai giocando|che stai giocando|uptime|da quanto|(^|[^a-z])(ciao|ehi|hey|buongiorno|buonasera|buond[iì]|salve|weil[aà]|hola)([^a-z]|$)|grazie|bravo|brava|bravissim|(^|[^a-z])(link|sito|social)([^a-z]|$)/;

// Il messaggio "sembra rispondibile"? Cioè assomiglia a qualcosa che il bot sa
// già gestire: una domanda ('?'), un intento noto o una parola social/link.
// Segnali di emozione: quando qualcuno "si apre" (tristezza, ansia, gioia,
// gratitudine…) il bot ha senso che si faccia vivo con empatia — anche senza
// menzione — sfruttando il suo "manuale umano".
const EMOZIONE_CUES = /(^|[^a-z])(trist|gi[uù]\b|piango|piange|depress|ansi|paura|spavent|angosc|arrabbi|incazz|frustrat|felic|content|emozionat|orgoglios|delus|grazie|ti voglio bene|mi manchi|mi sento)/i;

function sembraRispondibile(text) {
  const t = String(text || '').toLowerCase();
  if (!t) return false;
  if (t.includes('?')) return true;
  if (INTENTI_NOTI.test(t)) return true;
  if (EMOZIONE_CUES.test(t)) return true;
  return PAROLE_SOCIAL.some((p) => t.includes(p));
}

// ======================================================================
// Brain
// ======================================================================

export class Brain {
  constructor({ helix, actions } = {}) {
    this.helix = helix;
    this.actions = actions || {};
    this._ultimaRisposta = new Map();   // canale → ts ultima risposta del cervello
    this._ultimoEvento = new Map();     // 'canale|tipo' → ts ultimo annuncio
    this._stileCache = new Map();       // canale → { ts, frasi } (voce dello streamer)
    this._lastDistill = new Map();      // canale → ts ultima distillazione (allenamento)
    this._conversazione = new Map();    // canale → { user, ts }: con chi sto parlando (per il follow-up)
  }

  // Materiale di ALLENAMENTO: le parole vere dello streamer da cui distillare —
  // la sua voce (mic/DM) e i suoi messaggi Twitch — più recenti dell'ultima volta.
  _materialeAllenamento(channel, dopoTs) {
    const frasi = []; const viste = new Set();
    const push = (t) => {
      const s = String(t || '').replace(/\s+/g, ' ').trim();
      const k = s.toLowerCase();
      if (s.length >= 15 && !viste.has(k)) { viste.add(k); frasi.push(s); }
    };
    try { for (const v of voceStreamer.recent(channel, 30)) push(v); } catch { /* niente */ }
    try {
      const righe = db.prepare(
        `SELECT text FROM messages WHERE channel=? AND user=? AND from_bot=0
           AND text NOT LIKE '!%' AND length(text) BETWEEN 15 AND 200 AND ts>?
           ORDER BY ts DESC LIMIT 40`,
      ).all(channel, channel, dopoTs || 0);
      for (const r of righe) push(r.text);
    } catch { /* niente */ }
    return frasi.slice(0, 30);
  }

  // ALLENAMENTO → MOTORE VELOCE: il cervello grosso digerisce i tuoi discorsi e ne
  // ricava conoscenza riutilizzabile (domanda→risposta nel tuo stile), salvata
  // localmente. Da lì la usa il motore VELOCE in live, senza richiamare l'LLM.
  // Si auto-salta se non c'è materiale nuovo; non blocca nulla.
  async distilla(channel) {
    try {
      const dopo = this._lastDistill.get(channel) || 0;
      const frasi = this._materialeAllenamento(channel, dopo);
      if (frasi.length < 3) return 0;                       // niente di nuovo/sufficiente
      const coppie = await brainpy.distilla(channel, frasi);
      if (coppie === null) return 0;                        // cervello non pronto: riprova dopo (non avanza)
      this._lastDistill.set(channel, Date.now());
      if (!coppie.length) return 0;
      const esistenti = new Set(knowledge.list(channel).map((k) => this._norm(k.domanda)));
      let aggiunte = 0;
      for (const c of coppie) {
        const q = String(c?.q || '').trim();
        const a = String(c?.a || '').trim();
        if (q.length < 3 || a.length < 2 || esistenti.has(this._norm(q))) continue;
        knowledge.add(channel, { domanda: q, risposta: a, fonte: 'distillato' });
        esistenti.add(this._norm(q)); aggiunte++;
      }
      if (aggiunte) log.info(`#${channel}: allenamento → ${aggiunte} risposte distillate dai tuoi discorsi`);
      return aggiunte;
    } catch (e) { log.debug('distilla:', e?.message || e); return 0; }
  }

  // Alcune frasi VERE scritte dallo streamer nel suo canale (i suoi messaggi
  // umani, non i comandi, non le risposte del bot): sono la sua "voce". Le
  // passiamo al cervello come esempi di stile così suona come lui. Cache 30 min.
  _stileStreamer(channel) {
    try {
      const c = this._stileCache.get(channel);
      if (c && Date.now() - c.ts < 30 * 60_000) return c.frasi;
      const frasi = [];
      const viste = new Set();
      const aggiungi = (t, minLen) => {
        const s = String(t || '').replace(/\s+/g, ' ').trim();
        const k = s.toLowerCase();
        if (s.length < minLen || viste.has(k) || frasi.length >= 8) return;
        viste.add(k); frasi.push(s);
      };
      // 1) LE FRASI CHE HA SCRITTO LUI («le tue frasi / battute», in Personalità).
      // Vengono prima di tutto perché sono l'unica parte dello stile che ha
      // SCELTO: le altre due sono roba detta per caso, e per caso somiglia a lui.
      try { for (const f of (streamers.get(channel)?.settings?.frasi || [])) aggiungi(f, 6); } catch { /* niente */ }
      // 2) la VOCE PARLATA in diretta (materiale di stile migliore: è la sua voce vera)
      try { for (const v of voceStreamer.recent(channel, 8)) aggiungi(v, 12); } catch { /* niente */ }
      // 3) completa con i suoi messaggi SCRITTI in chat
      const righe = db.prepare(
        `SELECT text FROM messages
           WHERE channel=? AND user=? AND from_bot=0
             AND text NOT LIKE '!%' AND length(text) BETWEEN 15 AND 160
           ORDER BY ts DESC LIMIT 80`,
      ).all(channel, channel);
      for (const r of righe) aggiungi(r.text, 15);
      this._stileCache.set(channel, { ts: Date.now(), frasi });
      return frasi;
    } catch (e) {
      log.debug('stile:', e?.message || e);
      return [];
    }
  }

  // MEMORIA A BREVE TERMINE della conversazione: le ultime righe della chat del
  // canale (chi ha detto cosa, incluse le mie risposte). Serve al cervello per
  // capire il DISCORSO in corso quando viene tirato in ballo — non solo l'ultima
  // frase. Compatta: niente comandi, righe corte, salta il messaggio attuale (già
  // passato come `testo`). Ritorna al massimo ~8 righe in ordine cronologico.
  _storiaRecente(channel, testoCorrente) {
    try {
      const corr = this._norm(testoCorrente);
      const righe = memory.recentMessages(channel, 18) || [];
      const out = [];
      for (const r of righe) {
        const t = String(r.text || '').replace(/\s+/g, ' ').trim();
        if (!t || t.startsWith('!')) continue;                       // niente comandi
        if (!r.from_bot && this._norm(t) === corr) continue;         // è il messaggio attuale
        out.push({
          nome: r.from_bot ? 'io' : String(r.display || r.user || 'utente').slice(0, 24),
          testo: t.slice(0, 160),
          io: !!r.from_bot,
        });
      }
      return out.slice(-8);
    } catch { return []; }
  }

  // COSCIENZA DEL MOMENTO: com'è la diretta ADESSO (gioco, titolo, spettatori,
  // uptime, live sì/no). Usa la "vista" già in cache dell'osservatore live
  // (aggiornata ogni 2 min): ZERO chiamate a Helix qui → nessun rischio limiti.
  // Ritorna una stringa compatta o null.
  _situazione(channel) {
    try {
      const ctx = memory.streamContext(channel);   // "In live su X: ... da Yh Zm" oppure null = offline
      if (ctx) return String(ctx).slice(0, 200);
      const gioco = memory.facts(channel).find((f) => f.key === 'gioco_recente')?.value;
      return gioco ? ('Ora offline (ultima diretta su ' + String(gioco).slice(0, 60) + ')') : 'Ora offline';
    } catch { return null; }
  }

  // Impara dalla COMMUNITY in uno spazio pubblico (chat di GRUPPO Telegram, come
  // dalla chat Twitch): nutre SOLO la coscienza (persone/fatti), MAI lo stile
  // personale. Ammesso perché i gruppi sono pubblici; in privato invece nulla.
  imparaComunita({ channel, user, nome, testo } = {}) {
    if (!channel || !user || !testo) return;
    const t = String(testo).trim();
    if (!t || t.startsWith('!') || t.startsWith('/')) return;
    try { brainpy.osserva({ canale: channel, login: String(user), nome: nome || String(user), testo: t }); }
    catch { /* niente */ }
  }

  // Impara dalle PAROLE VERE dello streamer — la sua voce parlata in diretta (dal
  // microfono) o i SUOI messaggi su Telegram (ovunque). È l'apprendimento "duro"
  // (stile + coscienza), volutamente limitato a LUI SOLO: scelta di privacy, così
  // il bot non assorbe lo STILE di nessun altro. È il modo più forte per crescere "come me".
  imparaDaVoce({ channel, testo } = {}) {
    const t = String(testo || '').trim();
    if (!channel || t.length < 8 || t.startsWith('!') || t.startsWith('/')) return;
    try { voceStreamer.add(channel, t); this._stileCache.delete(channel); } catch { /* niente */ }
    // coscienza: impara anche fatti da ciò che dice (login = canale = lo streamer)
    try { brainpy.osserva({ canale: channel, login: channel, nome: 'streamer', testo: t }); } catch { /* niente */ }
  }

  // Risposta conversazionale "diretta" (es. chat privata Telegram: "gli parlo da
  // qui"): il cervello (LLM + coscienza) risponde con la conoscenza curata e la
  // VOCE dello streamer. Ritorna stringa o null (cervello spento/lento). Qui non
  // c'è la chat Twitch, quindi niente anti-eco/cooldown: solo pulizia di lunghezza.
  async rispostaDiretta({ channel, user, nome, testo, tono } = {}) {
    try {
      if (!channel || !testo) return null;
      const t = TONI.includes(tono) ? tono : 'scherzoso';
      const conoscenza = this._conoscenzaPertinente(channel, testo);
      // se è un dubbio e ha internet, cerca online e le passa il riferimento:
      // così può rispondere DA SÉ invece di dire "non lo so".
      const web = await this._cercaWeb(channel, testo);
      const r = await brainpy.rispondi({
        canale: channel, login: String(user || 'utente'), nome: nome || String(user || 'tu'),
        testo: String(testo).slice(0, 300), tono: t, conoscenza, stile: this._stileStreamer(channel),
        modo: 'allenamento',   // DM privato = allenamento: risposta ragionata, sfrutta il maestro esterno
        nomeBot: this._nomePersona(),   // parla come una persona (il suo nome, dall'anima)
        lineeGuida: guide.applicabili(channel, { piattaforma: 'telegram', privato: true, sonoIo: true }),   // regole valide QUI (privato con te)
        web,                   // riferimento trovato online (se c'era)
        timeoutMs: 40000,      // aspettiamo di più: risposta più lunga (e il locale su CPU è lento)
      });
      if (!r) return null;
      let out = String(r).replace(/\s+/g, ' ').trim();
      if (out.length > MAX_RISPOSTA) out = out.slice(0, MAX_RISPOSTA - 1).trimEnd() + '…';
      return out || null;
    } catch (e) { log.debug('rispostaDiretta:', e?.message || e); return null; }
  }

  // Può cercare su internet su questo canale? (impostazione, default sì)
  _internetOn(channel) {
    try { return streamers.get(channel)?.settings?.internet !== false; } catch { return true; }
  }

  // Sembra una domanda/dubbio da cercare online?
  _sembraDomanda(t) {
    const s = String(t || '').trim();
    return s.length >= 8 && (/\?/.test(s) || /^(chi|cosa|che cos|come|quando|dove|perch|quanti|quanto|quale|quali|significa|cos'è|cos e)\b/i.test(s));
  }

  // Cerca online se acceso e se ha senso. Ritorna un breve riferimento o null.
  async _cercaWeb(channel, testo) {
    if (!this._internetOn(channel) || !this._sembraDomanda(testo)) return null;
    try { return await internet.cerca(testo); } catch { return null; }
  }

  // Il nome della "persona" (dall'anima condivisa): è così che si presenta nei DM.
  // Se non le hai dato un nome (è ancora il default "SocialBot"), usa "Lia" così ha
  // COMUNQUE un'identità stabile — senza un nome finiva per confondersi e prendere
  // quello dell'interlocutore. Lo cambi in Admin → Anima.
  _nomePersona() {
    try {
      const n = String(persona.profilo()?.nome || '').trim();
      return (n && n !== 'SocialBot') ? n : 'Lia';
    } catch { return 'Lia'; }
  }

  // RISVEGLIO / PERCORSO DI CRESCITA. Il server è sempre acceso: a ogni avvio (e
  // ogni tanto) lei si "sveglia" e si chiede cosa le manca per capire meglio.
  // Guarda la sua rete (a quante sa rispondere, quanta fiducia, cosa NON sa), si
  // dà un obiettivo e se lo annota nel diario. L'obiettivo poi guida la sua
  // curiosità: è quello che verrà a chiederti (proattiva) o cercherà di capire.
  async risveglio(channel) {
    try {
      if (!channel) return null;
      const r = await brainpy.reteStato(channel).catch(() => null);
      const lac = Array.isArray(r?.non_so) ? r.non_so.filter(Boolean) : [];
      const goal = lac[0] || null;
      this._obiettivo ||= new Map();
      this._obiettivo.set(channel, goal);
      const sa = r?.solidi || 0;
      const fid = Math.round((r?.fiducia || 0) * 100);
      const testo = goal
        ? `Mi sono svegliata. So rispondere a ${sa} cose (fiducia ${fid}%). Oggi voglio capire meglio: «${goal}».`
        : `Mi sono svegliata. So rispondere a ${sa} cose (fiducia ${fid}%). Nessuna lacuna in vista: continuo ad ascoltare e a imparare.`;
      diario.add(channel, 'risveglio', testo);
      log.info(`risveglio #${channel}: ${goal ? 'obiettivo «' + goal + '»' : 'nessuna lacuna'}`);
      // e poi si mette a studiare da sola le sue lacune (in background, se ha internet)
      if (goal) this._autoColmaLacune(channel).catch(() => {});
      return testo;
    } catch (e) { log.debug('risveglio:', e?.message || e); return null; }
  }

  // L'ultimo "pensiero" dal diario (per mostrarlo in dashboard).
  pensiero(channel) {
    try { return diario.latest(channel); } catch { return null; }
  }

  // STUDIA una lacuna RAGIONANDO su una fonte trovata online: non copia, valuta
  // se la fonte risponde e formula una risposta breve e vera (o si astiene).
  // Ritorna la risposta o null (se non è chiaro). Non lancia mai.
  async _studia(channel, lacuna, snippet) {
    try {
      const r = await brainpy.rispondi({
        canale: channel, login: channel, nome: 'studio',
        testo: String(lacuna).slice(0, 200), modo: 'studio', web: snippet,
        nomeBot: this._nomePersona(), lineeGuida: guide.applicabili(channel, { piattaforma: 'twitch', privato: false, sonoIo: false }), timeoutMs: 30000,
      });
      if (!r) return null;
      const out = String(r).replace(/\s+/g, ' ').trim();
      if (!out || /^non chiaro/i.test(out)) return null;   // si è astenuta: onesta
      return out.length > 300 ? out.slice(0, 299) + '…' : out;
    } catch { return null; }
  }

  // Da sola, cerca online le sue LACUNE, ci ragiona su e — se arriva a una
  // risposta chiara — se la salva come conoscenza (fonte 'web') e la annota nel
  // diario. Prudente: max 2 lacune per giro, solo se internet è acceso. Ritorna
  // quante ne ha colmate.
  async _autoColmaLacune(channel) {
    if (!this._internetOn(channel)) return 0;
    let fatte = 0;
    try {
      const r = await brainpy.reteStato(channel).catch(() => null);
      const lac = (Array.isArray(r?.non_so) ? r.non_so : []).filter(Boolean).slice(0, 2);
      for (const lacuna of lac) {
        const snippet = await internet.cerca(lacuna);
        if (!snippet) continue;
        const risp = await this._studia(channel, lacuna, snippet);
        if (!risp) continue;
        knowledge.add(channel, { domanda: String(lacuna).slice(0, 200), risposta: risp, fonte: 'web' });
        diario.add(channel, 'studio', `Ho studiato da sola: «${lacuna}» → ${risp}`);
        fatte++;
      }
    } catch (e) { log.debug('autoColmaLacune:', e?.message || e); }
    return fatte;
  }

  // "FORGIA": lei lavora sulla SUA mente locale. La sua rete è il suo modello
  // (cresce dalla sua esperienza, non è scaricato): forgiare = colmare lacune dal
  // web + distillare altro materiale nel motore veloce. È così che "si costruisce
  // la sua LLM locale" con l'hardware che ha. Ritorna un piccolo riepilogo.
  async forgia(channel) {
    try {
      const colmate = await this._autoColmaLacune(channel);
      this.distilla?.(channel)?.catch?.(() => {});   // distilla altro materiale nella rete
      diario.add(channel, 'forgia', `Ho lavorato sulla mia mente: ${colmate} lacune colmate dal web, e sto distillando altro nel motore veloce.`);
      return { colmate };
    } catch (e) { log.debug('forgia:', e?.message || e); return { colmate: 0 }; }
  }

  // AUTO-APPRENDIMENTO — studia UNA pagina del "manuale su come funzionano le
  // persone". Cerca online l'argomento (la lacuna), applica un filtro qualità
  // minimo (la fonte deve avere sostanza), poi chiede al cervello di SINTETIZZARE
  // un modulo operativo (non un riassunto) e lo salva. Il manuale è GLOBALE (una
  // sola raccolta, non per canale). Ritorna il modulo salvato o null; non lancia.
  async studiaModulo(nomeLacuna, { dominio = 'emozioni', query = '', diarioCanale = '', lacuna = '' } = {}) {
    try {
      const nome = String(nomeLacuna || '').trim();
      if (!nome) return null;
      let web = null;
      try { web = await internet.cerca(query || nome); } catch { web = null; }
      // filtro qualità minimo: la fonte deve avere sostanza, altrimenti si sintetizza
      // dal solo buon senso (il cervello lo segna fonte='buonsenso', qualità più bassa).
      const fonte = (web && String(web).trim().length >= 120) ? String(web).trim() : '';
      const mod = await brainpy.imparaModulo({ nome, dominio, web: fonte, lacuna });
      if (mod && diarioCanale) {
        try { diario.add(diarioCanale, 'modulo', `Ho studiato una pagina del mio manuale umano: «${nome}»`); } catch { /* niente */ }
      }
      return mod;
    } catch (e) { log.debug('studiaModulo:', e?.message || e); return null; }
  }

  // SEEDING del manuale: studia il PROSSIMO modulo base ancora mancante, UNO per
  // chiamata, BILANCIANDO i domini — pesca il prossimo seme non ancora appreso dal
  // dominio che al momento ha MENO moduli attivi. Così il "cervello" cresce largo
  // su tutti i temi invece di riempire un dominio alla volta (e il grafo si popola
  // in modo equilibrato). Quando il set base è completo non fa più nulla. Guidato
  // dai timer di reflection; non lancia. Ritorna il modulo appreso o null.
  async seminaProssimoModulo() {
    try {
      const esistenti = await brainpy.moduli();
      if (esistenti === null) return null;   // cervello non raggiungibile: riprova al giro dopo
      const lista = (Array.isArray(esistenti) ? esistenti : []).filter((m) => m && m.stato === 'attivo');
      const attivi = new Set(lista.map((m) => String(m.nome || '').toLowerCase().trim()));
      // quanti moduli attivi ha già ciascun dominio (per bilanciare)
      const perDominio = {};
      for (const m of lista) { const d = String(m.dominio || 'emozioni'); perDominio[d] = (perDominio[d] || 0) + 1; }
      // semi ancora da imparare, ordinati per: dominio meno popolato, poi ordine catalogo
      const mancanti = SEMI
        .map((s, i) => ({ ...s, i }))
        .filter((s) => !attivi.has(s.nome.toLowerCase()));
      const baseCompleta = mancanti.length === 0;

      // APPRENDIMENTO AUTONOMO: le lacune reali della chat. Se il set base è
      // completo le studio tutte (ricorrenza >=2); se sto ancora costruendo la
      // base, solo quelle MOLTO ricorrenti (>=3) — così un tema caldo del canale
      // non aspetta, ma la base si costruisce lo stesso. La lacuna studiata viene
      // chiusa dal cervello (non si ristudia).
      try {
        const gaps = await brainpy.lacune(baseCompleta ? 2 : 3);
        const gap = (Array.isArray(gaps) ? gaps : []).find((g) => Array.isArray(g?.chiavi) && g.chiavi.length >= 2);
        if (gap) {
          const kw = gap.chiavi.slice(0, 4).join(' ');
          const nome = `capire e rispondere quando si parla di ${gap.chiavi.slice(0, 3).join(', ')}`;
          const query = `come rispondere in una chat quando qualcuno parla di ${kw}`;
          const mod = await this.studiaModulo(nome, { dominio: gap.dominio || 'conversazione', query, lacuna: gap.chiave });
          if (mod) { log.info(`manuale: imparata una LACUNA reale [${gap.dominio}] → «${nome}»`); return mod; }
        }
      } catch { /* nessuna lacuna o cervello occupato: passo ai semi */ }

      if (baseCompleta) return null;         // base pronta e nessuna lacuna: niente da fare
      mancanti.sort((a, b) => ((perDominio[a.dominio] || 0) - (perDominio[b.dominio] || 0)) || (a.i - b.i));
      const prossimo = mancanti[0];
      const mod = await this.studiaModulo(prossimo.nome, { dominio: prossimo.dominio, query: prossimo.query });
      if (mod) log.info(`manuale: appresa una pagina [${prossimo.dominio}] → «${prossimo.nome}» (mancano ${mancanti.length - 1})`);
      return mod;
    } catch (e) { log.debug('seminaProssimoModulo:', e?.message || e); return null; }
  }

  // MESSAGGIO PROATTIVO (Telegram, chat privata col proprietario): scrive LEI per
  // prima, di sua iniziativa. La curiosità nasce dalle LACUNE della rete (le cose
  // che non sa ancora): così è naturale che te le venga a chiedere — e imparando la
  // tua risposta cresce davvero. Ritorna una stringa o null. Non lancia mai.
  async messaggioProattivo(channel, { nome, spunto: spuntoForzato } = {}) {
    try {
      if (!channel) return null;
      // A VOLTE, invece di scriverti "a vuoto", PRIMA fa qualcosa nel suo computer
      // (il suo svago) e poi te ne parla. Solo se non c'è uno spunto forzato (es.
      // "sei andato live") e se ha l'ambiente; sennò prosegue col proattivo normale.
      if (!spuntoForzato && Math.random() < 0.5) {
        const s = await this.momentoDiSvago(channel);
        if (s) return s;
      }
      // spunto di curiosità: se il chiamante ne forza uno (es. "sei andato live")
      // uso quello; sennò il suo OBIETTIVO del risveglio, sennò una lacuna, sennò
      // un tema generico su di lui.
      let spunto = String(spuntoForzato || '').trim();
      if (!spunto) { try { spunto = (this._obiettivo?.get(channel)) || ''; } catch { /* niente */ } }
      if (!spunto) {
        try {
          const r = await brainpy.reteStato(channel);
          const lac = Array.isArray(r?.non_so) ? r.non_so.filter(Boolean) : [];
          if (lac.length) spunto = lac[Math.floor(Math.random() * lac.length)];
        } catch { /* niente */ }
      }
      if (!spunto) {
        const temi = [
          'com\'è andata oggi', 'a cosa stai giocando ultimamente', 'una cosa che ti ha fatto ridere',
          'come ti senti prima di andare live', 'un ricordo bello del tuo percorso da streamer',
          'cosa vorresti dalla tua community', 'una cosa di te che quasi nessuno sa',
        ];
        spunto = temi[Math.floor(Math.random() * temi.length)];
      }
      const conoscenza = this._conoscenzaPertinente(channel, '');   // nessun messaggio a cui agganciarsi: fissate + recenti
      const r = await brainpy.rispondi({
        canale: channel, login: channel, nome: nome || 'tu',
        testo: '(scrivigli tu per primo, di tua iniziativa)',
        modo: 'proattivo', spunto, nomeBot: this._nomePersona(),
        lineeGuida: guide.applicabili(channel, { piattaforma: 'telegram', privato: true, sonoIo: true }),
        conoscenza, stile: this._stileStreamer(channel),
        tono: 'amichevole', timeoutMs: 35000,
      });
      if (!r) return null;
      let out = String(r).replace(/\s+/g, ' ').trim();
      if (out.length > MAX_RISPOSTA) out = out.slice(0, MAX_RISPOSTA - 1).trimEnd() + '…';
      return out || null;
    } catch (e) { log.debug('messaggioProattivo:', e?.message || e); return null; }
  }

  // SVAGO autonomo: un suo momento libero. Fa qualcosa nel suo computer (la
  // sandbox) e lo racconta — diventa il messaggio che ti manda di sua iniziativa.
  // Ritorna la stringa pronta o null (niente ambiente / niente da dire). Non lancia.
  async momentoDiSvago(channel) {
    try {
      if (!channel) return null;
      const testo = await brainpy.svago({
        canale: channel, nomeBot: this._nomePersona(),
        stile: this._stileStreamer(channel),
        lineeGuida: guide.applicabili(channel, { piattaforma: 'telegram', privato: true, sonoIo: true }),
      });
      if (!testo) return null;
      let out = String(testo).replace(/\s+/g, ' ').trim();
      if (out.length > MAX_RISPOSTA) out = out.slice(0, MAX_RISPOSTA - 1).trimEnd() + '…';
      return out || null;
    } catch (e) { log.debug('momentoDiSvago:', e?.message || e); return null; }
  }

  // apprendimento passivo: ogni messaggio passa di qui
  observe(msg) {
    try { learn.observe(msg); } catch (e) { log.error('observe:', e?.message || e); }
    // IA locale: si auto-addestra sul messaggio (semantica + stile). Non impara
    // da sé stessa (fromBot) per evitare loop di rinforzo.
    try { model.observe(msg?.channel, msg?.text, { fromBot: !!msg?.isSelf }); }
    catch (e) { log.debug('model.observe:', e?.message || e); }
    // Nutre la COSCIENZA in Python (impara persone/fatti dalla chat vera). Fire-
    // and-forget: non attende, non blocca. Solo messaggi umani, non comandi.
    if (msg && !msg.isSelf && msg.text && !String(msg.text).startsWith('!')) {
      try { brainpy.osserva({ canale: msg.channel, login: msg.user, nome: msg.display || msg.user, testo: msg.text }); }
      catch { /* niente */ }
    }
  }

  // generazione "creativa": prima l'IA locale (n-grammi ordine 3, più naturale),
  // poi il vecchio motore a bigrammi come rete di sicurezza.
  _genera(channel) {
    try { return model.genera(channel) || learn.generate(channel); }
    catch { return learn.generate(channel); }
  }

  // ------------------------------------------------------------ shouldReply

  // Segna con chi il bot sta parlando ORA (chi ha appena ricevuto una risposta):
  // apre la "finestra di follow-up" così, se questa persona ribatte a breve, il bot
  // continua il filo senza aspettare il cooldown pieno. Chiamato dopo ogni risposta.
  segnaConversazione(channel, user) {
    if (!channel || !user) return;
    this._conversazione.set(channel, { user: String(user).toLowerCase(), ts: Date.now() });
  }

  shouldReply({ channel, botLogin, user, text, streamer, isSelf } = {}) {
    try {
      if (isSelf || !streamer || !channel || !text) return false;
      const uLow = String(user || '').toLowerCase();
      if (BOT_NOTI.has(uLow)) return false;

      const settings = streamer.settings || {};
      // FOLLOW-UP: sto continuando un filo con la STESSA persona a cui ho appena
      // risposto (entro la finestra)? Allora il "respiro" tra due risposte è più
      // corto, così è possibile un vero botta e risposta invece di un colpo solo.
      const conv = this._conversazione.get(channel);
      const inFollowUp = !!(conv && uLow && conv.user === uLow
        && (Date.now() - conv.ts) < FOLLOWUP_MS && settings.rispostaMenzioni !== false);

      // respiro: mai due risposte del cervello troppo vicine (i comandi ! non c'entrano)
      const cooldown = inFollowUp ? COOLDOWN_FOLLOWUP : COOLDOWN_RISPOSTA;
      if (Date.now() - (this._ultimaRisposta.get(channel) || 0) < cooldown) return false;

      if (menzionaBot(text, botLogin || channel)) return settings.rispostaMenzioni !== false;

      // manopola: probabilità base "spontanea" (0 = zitto). Stesso clamp del
      // server (0..0.5), così un valore alto = bot più "chiacchierone".
      let p = Number.isFinite(+settings.spontaneita) ? +settings.spontaneita : 0.03;
      const spont = Math.min(0.5, Math.max(0, p));
      p = spont;

      // spontanea: raddoppiata sulle domande (come da sempre)
      if (String(text).trim().endsWith('?')) p *= 2;

      // percorso REATTIVO: senza menzione, ma il messaggio sembra qualcosa a cui
      // il bot saprebbe rispondere (domanda / intento noto / conoscenza) → alza
      // la probabilità sopra la spontanea base, restando derivata dalla manopola
      // (a manopola 0 resta tutto spento) e sempre col cooldown già rispettato.
      if (spont > 0 && sembraRispondibile(text)) {
        p = Math.max(p, Math.min(0.5, spont * 3));
      }

      // amici: il bot si fa vivo con loro un filo più volentieri (solo se l'autonomia è > 0)
      if (spont > 0 && user && persona.amicizia(user).livello >= 2) {
        p = Math.max(p, Math.min(0.5, spont * 2 + 0.05));
      }

      // FOLLOW-UP: la persona con cui stavo parlando ribatte (anche senza menzione)
      // e ha davvero detto qualcosa (non un "ok" secco) → continuo il filo volentieri.
      // Solo con la chat autonoma accesa (rispetta la manopola: a spontaneità 0 il bot
      // resta "solo su menzione"), ma con probabilità alta perché è una conversazione viva.
      if (inFollowUp && spont > 0
        && (sembraRispondibile(text) || String(text).trim().split(/\s+/).filter(Boolean).length >= 3)) {
        p = Math.max(p, 0.8);
      }

      return Math.random() < p;
    } catch (e) {
      log.error('shouldReply:', e?.message || e);
      return false;
    }
  }

  // ------------------------------------------------------------ chatReply

  // Pipeline procedurale: intenti → conoscenza → cortesie → onestà → spontaneità.
  // La prima tappa che produce qualcosa vince; meglio null di una risposta scarsa.
  // Il testo GREZZO della risposta, o null. Non lo manda in chat nessuno: esce
  // da qui e passa per forza da _finalizza, che e' il solo punto in cui una
  // risposta diventa una cosa detta. Chi aggiunge un ramo qui dentro non puo'
  // dimenticarsi il controllo: non ha modo di saltarlo.
  async _rispostaGrezza({ channel, user, display, text, streamer, botLogin } = {}) {
    try {
      if (!channel || !text || !streamer) return null;
      const settings = streamer.settings || {};
      const iaOn = settings.iaLocale !== false;   // IA locale accesa (default sì)
      const tono = TONI.includes(settings.tono) ? settings.tono : 'scherzoso';
      let nome = display || user || 'tu';
      // amici della community: ogni tanto il bot li chiama con più calore
      // (l'anima è condivisa; non rivela MAI dove/cosa, solo l'affinità)
      if (user && persona.amicizia(user).livello >= 2 && Math.random() < 0.4) {
        nome = persona.vezzeggiativo(user, nome);
      }
      const lower = String(text).toLowerCase();
      const menziona = menzionaBot(text, botLogin || channel);
      const variabili = { user: nome, canale: streamer.display || channel };

      // ---- a. INTENTI FATTUALI (dati reali) ----------------------------
      // Questi NON passano dal modello: danno un dato preciso (gioco, uptime,
      // link, clip) che l'IA non può inventare. Saluti/come va/chi sei/grazie
      // NON sono più template: li gestisce il modello, con parole sue.

      // che gioco / a cosa giochi
      if (/che gioco|che game|a cosa (stai )?gioc|a che (gioco|game)|cosa stai giocando|che stai giocando/.test(lower)) {
        const ctx = memory.streamContext(channel);
        if (ctx) return compila(scegli(LIVE_CONTESTO), { ...variabili, ctx });
        try {
          const stream = await this.helix?.getStream?.(channel);
          if (stream) {
            return compila(scegli(LIVE_ORA), {
              ...variabili,
              gioco: stream.game_name || 'qualcosa di bello',
              titolo: stream.title || 'live di oggi',
              spettatori: stream.viewer_count ?? 0,
            });
          }
        } catch { /* helix giù: si ripiega sull'offline */ }
        const recente = memory.facts(channel).find((f) => f.key === 'gioco_recente')?.value;
        return recente ? compila(scegli(OFFLINE_GIOCO), { ...variabili, gioco: recente }) : scegli(OFFLINE);
      }

      // da quanto siamo live / uptime
      if (/uptime|da quanto/.test(lower)) {
        try {
          const stream = await this.helix?.getStream?.(channel);
          if (stream?.started_at) {
            const minuti = Math.max(0, Math.floor((Date.now() - new Date(stream.started_at).getTime()) / 60_000));
            return compila(scegli(UPTIME_LIVE), {
              ...variabili, ore: Math.floor(minuti / 60), minuti: minuti % 60,
            });
          }
          return scegli(OFFLINE);
        } catch { return null; }
      }

      // clip su richiesta (serve la menzione: "clippalo bot!")
      if (menziona && /\bclip/.test(lower)) {
        let url = null;
        try { url = await this.actions?.createClip?.(channel, 'richiesta in chat da ' + nome); }
        catch (e) { log.error(`clip #${channel}:`, e?.message || e); }
        return url ? compila(scegli(CLIP_OK), { ...variabili, url }) : scegli(CLIP_NO);
      }

      // social e link: prima si cerca nella knowledge, se non c'è si prosegue
      const socialCitati = PAROLE_SOCIAL.filter((p) => lower.includes(p));
      const chiedeLink = /dove ti trovo|dove ti seguo|(^|[^a-z])link([^a-z]|$)/.test(lower);
      if (socialCitati.length || chiedeLink) {
        const voci = knowledge.list(channel);
        let voce = null;
        if (socialCitati.length) {
          voce = voci.find((k) => socialCitati.some((p) => k.domanda.toLowerCase().includes(p)));
        }
        if (!voce && chiedeLink) {
          voce = voci.find((k) => {
            const d = k.domanda.toLowerCase();
            return PAROLE_SOCIAL.some((p) => d.includes(p)) || d.includes('link') || d.includes('trovo');
          });
        }
        if (voce) return voce.risposta;
        // niente voce apposita: c'è il campo «dove ti trovano» della scheda, ed è
        // fatto per questo. Esce ALLA LETTERA — dentro ci sono gli indirizzi.
        const dove = this._scheda(channel).dove;
        if (dove) return dove;
      }

      // ---- b. CONOSCENZA (semantica + lessicale) ----------------------
      // Con l'IA locale il match "capisce" anche le parafrasi (es. "dove ti
      // seguo" → la voce sui social), così servono molte meno risposte scritte
      // a mano. Se l'IA è spenta o "fredda", si ripiega sul match lessicale.
      let daConoscenza = null;
      if (iaOn) { const bk = model.bestKnowledge(channel, text); if (bk) daConoscenza = bk.risposta; }
      if (!daConoscenza) daConoscenza = this._cercaConoscenza(channel, text);
      if (daConoscenza) {
        // IL FATTO È GIUSTO, LA FRASE NO. La risposta salvata è vera, ma detta
        // sempre con le stesse parole si sente che è un disco: la facciamo DIRE
        // al bot, che la mette in situazione e nel tono del canale. Se non ce la
        // fa, esce quella scritta — non si perde un'informazione buona per un
        // vezzo di stile.
        // ECCEZIONE FERMA: se dentro c'è un LINK esce com'è, senza passare da
        // nessuna parte. Un indirizzo riscritto è un indirizzo sbagliato.
        const haLink = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(?:it|com|net|org|tv|gg|live|me|io|dev|app)\b)/i.test(daConoscenza);
        if (iaOn && !haLink) {
          const detta = await brainpy.rispondi({
            via: 'bot', canale: streamer.display || channel, canaleId: channel,
            login: user, nome, testo: text, tono,
            conoscenza: [daConoscenza],   // UNA cosa sola: qui deve dire questa, non divagare
            scheda: this._scheda(channel),
            stile: this._stileStreamer(channel),
            storia: this._storiaRecente(channel, text),
            situazione: this._situazione(channel),
            lineeGuida: guide.applicabili(channel, { piattaforma: 'twitch', privato: false, sonoIo: false }),
            timeoutMs: 9000,
          });
          if (detta) return detta;
        }
        // rete di sicurezza (modello spento/lento, o c'è un link): la risposta
        // scritta, con un cenno al nome così almeno non è sempre identica.
        const prefisso = Math.random() < 0.7 ? '' : nome + ' ';
        return prefisso + daConoscenza;
      }

      // ---- c. IL CERVELLO PARLA (contestuale, parole sue) -------------
      // La conversazione la genera il CERVELLO in Python (coscienza progressiva
      // + modello linguistico), che vive in un PROCESSO SEPARATO: se è lento o
      // spento ritorna null e il bot resta zitto. I COMANDI non passano mai di
      // qui → restano sempre istantanei. Passa comunque da _finalizza (mod+anti-eco).
      if (iaOn) {
        const conoscenza = this._conoscenzaPertinente(channel, text);
        const risposta = await brainpy.rispondi({
          via: 'bot',   // la chat pubblica è del BOT, non di Lei (docs/BOT-E-LIA.md)
          canale: streamer.display || channel, canaleId: channel,
          login: user, nome, testo: text, tono, conoscenza,
          scheda: this._scheda(channel),   // chi è lo streamer, deciso da lui (docs/CONOSCENZA.md)
          stile: this._stileStreamer(channel),   // la voce vera dello streamer (esempi di stile)
          storia: this._storiaRecente(channel, text),   // il discorso in corso in chat (memoria a breve termine)
          situazione: this._situazione(channel),   // com'è la diretta adesso (gioco/live/uptime)
          lineeGuida: guide.applicabili(channel, { piattaforma: 'twitch', privato: false, sonoIo: false }),   // regole valide in chat pubblica
        });
        if (risposta) return risposta;
      }

      // ---- d. FALLBACK quando il modello non è pronto/è lento ----------
      // (primo avvio: sta scaricando/caricando il modello; oppure è lento o assente).
      // DEGRADAZIONE ELEGANTE: se mi hanno CHIAMATO non lascio mai a vuoto. Con una
      // domanda provo il web e sennò ammetto con garbo; con un semplice richiamo
      // rispondo con un cenno (saluto/eccomi). Appena il modello è pronto, parla lui.
      if (menziona) {
        if (text.includes('?')) {
          // prima di arrendersi: se ha internet, prova a cercare la risposta da sé
          if (this._internetOn(channel)) {
            const web = await this._cercaWeb(channel, text);
            if (web) {
              const r = await brainpy.rispondi({
                via: 'bot',
                canale: streamer.display || channel, canaleId: channel,
                login: user, nome, testo: text, tono, web,
                scheda: this._scheda(channel),
                storia: this._storiaRecente(channel, text),
                situazione: this._situazione(channel),
                lineeGuida: guide.applicabili(channel, { piattaforma: 'twitch', privato: false, sonoIo: false }),
                stile: this._stileStreamer(channel), timeoutMs: 12000,
              });
              if (r) return r;
            }
          }
          return compila(scegli(NON_LO_SO), variabili);
        }
        // mi hanno chiamato senza una domanda: rispondo comunque con un cenno
        // (mai ignorare chi mi nomina), scegliendo tra saluto ed "eccomi".
        const salutato = /(^|[^a-z])(ciao|ehi|hey|buongiorno|buonasera|buond[iì]|salve|weil[aà]|hola)([^a-z]|$)/.test(lower);
        const pool = (salutato ? SALUTI : ECCOMI)[tono] || ECCOMI.scherzoso;
        return compila(scegli(pool), variabili);
      }
      return null;
    } catch (e) {
      log.error(`chatReply #${channel}:`, e?.message || e);
      return null;
    }
  }

  // L'UNICA uscita del bot verso la chat pubblica. Una riga sola apposta: e' la
  // struttura che garantisce che ogni risposta passi dai controlli, non la buona
  // memoria di chi scrive il ramo nuovo.
  async chatReply(dati = {}) {
    return this._finalizza(dati.channel, await this._rispostaGrezza(dati), dati.streamer);
  }


  // Cerca nella knowledge la voce che meglio combacia con il testo.
  // Punteggio: parole in comune / parole della voce, con bonus per i
  // match "pesanti" (parole lunghe, più distintive).
  // Quanto una voce c'entra con quello che è stato scritto: parole in comune
  // diviso parole della voce, con un bonus alle parole lunghe (più distintive).
  // Le voci corte si accontentano di una parola sola, le lunghe ne vogliono due:
  // sennò «pc» aggancerebbe qualunque frase in cui compare.
  _punteggioVoce(voce, paroleUtente) {
    if (!paroleUtente.size) return 0;
    const paroleVoce = new Set(learn.normalizza(voce.domanda));
    if (!paroleVoce.size) return 0;
    let comuni = 0;
    let bonus = 0;
    for (const w of paroleVoce) {
      if (!paroleUtente.has(w)) continue;
      comuni++;
      if (w.length >= 5) bonus += 0.05;
    }
    const minime = paroleVoce.size <= 2 ? 1 : 2;
    if (comuni < minime) return 0;
    return comuni / paroleVoce.size + Math.min(0.25, bonus);
  }

  // LE VOCI IN ORDINE DI IMPORTANZA per questo momento. Un unico posto in cui si
  // decide quale conoscenza conta: prima si sono decise due volte (per punteggio
  // nella scorciatoia, per DATA nel prompt) e le due decisioni erano diverse —
  // con più di sei voci, al cervello arrivava sempre e solo la roba appena
  // scritta, senza nessun sintomo che qualcosa non andasse.
  // Fuori: le imparate dalla chat (sono messaggi veri di altre persone) e quelle
  // fuori tempo (`quando`). Prime: le fissate. Poi il punteggio; a parità, le più
  // recenti (l'elenco arriva già in quell'ordine e l'ordinamento è stabile).
  _vociConoscenza(channel, testo) {
    const live = !!memory.streamContext(channel);
    const paroleUtente = new Set(learn.normalizza(testo || ''));
    const scelte = [];
    for (const voce of knowledge.list(channel)) {
      if (voce.fonte === 'chat') continue;
      const quando = voce.quando || 'sempre';
      if ((quando === 'live' && !live) || (quando === 'offline' && live)) continue;
      scelte.push({ voce, p: this._punteggioVoce(voce, paroleUtente), fissata: !!voce.fissata });
    }
    return scelte.sort((a, b) => (b.fissata - a.fissata) || (b.p - a.p));
  }

  // Le righe di conoscenza da mettere nel prompt, già in ordine di importanza.
  _conoscenzaPertinente(channel, testo, quante = 6) {
    try {
      return this._vociConoscenza(channel, testo).slice(0, quante)
        .map(({ voce }) => `${voce.domanda}: ${voce.risposta}`);
    } catch (e) { log.debug('conoscenza:', e?.message || e); return []; }
  }

  // LA SCHEDA: chi è lo streamer, detto da lui. Sempre nel prompt, in un blocco
  // suo — non gareggia con le domande e risposte per un posto.
  _scheda(channel) {
    try { return schedaPulita(streamers.get(channel)?.settings?.scheda); } catch { return {}; }
  }

  // LA SCORCIATOIA: c'è una voce che c'entra COSÌ tanto da essere già la
  // risposta? Guarda il punteggio vero, non il fatto che sia fissata: una voce
  // messa in cima a mano non è per questo la risposta a qualunque domanda.
  _cercaConoscenza(channel, testo) {
    const migliore = this._vociConoscenza(channel, testo).reduce(
      (a, b) => (b.p > (a?.p ?? 0) ? b : a), null);
    return migliore && migliore.p >= 0.5 ? migliore.voce.risposta : null;
  }

  // Normalizza per confronti "è la stessa frase?": minuscolo, senza
  // punteggiatura/emoji, spazi compattati.
  _norm(s) {
    return String(s || '').toLowerCase().replace(/[^a-zà-ÿ0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();
  }

  // Rete di sicurezza anti-eco: la risposta è (quasi) identica a un messaggio
  // scritto da un utente di recente? Allora NON la diciamo: ripetere le frasi
  // delle persone è sgradevole. Le frasi cortissime (saluti) non contano.
  _eEcoDiUtente(channel, testo) {
    try {
      const t = this._norm(testo);
      if (t.split(' ').filter(Boolean).length < 3) return false;
      for (const r of memory.recentMessages(channel, 400)) {
        if (r.from_bot) continue;
        const rt = this._norm(r.text);
        if (rt.length >= 8 && (rt === t || (t.length >= 12 && (rt.includes(t) || t.includes(rt))))) return true;
      }
      return false;
    } catch { return false; }
  }

  // Anti AUTO-ripetizione: la risposta ripete quasi uguale qualcosa che il bot ha
  // GIÀ detto di recente (stessa frase, stessa apertura di 4 parole, o forte
  // sovrapposizione)? Un bot che si ripete suona finto: meglio tacere. Le frasi
  // cortissime non contano (saluti e simili si possono ripetere).
  _eAutoRipetizione(channel, testo) {
    try {
      const t = this._norm(testo);
      const parole = t.split(' ').filter(Boolean);
      if (parole.length < 3) return false;
      const apertura = parole.slice(0, 4).join(' ');
      const setT = new Set(parole);
      for (const r of memory.recentMessages(channel, 40)) {
        if (!r.from_bot) continue;
        const rt = this._norm(r.text);
        if (!rt) continue;
        if (rt === t) return true;                         // frase identica
        const pr = rt.split(' ').filter(Boolean);
        if (parole.length >= 4 && pr.length >= 4) {
          if (pr.slice(0, 4).join(' ') === apertura) return true;   // stessa apertura
          const setR = new Set(pr);
          let inter = 0;
          for (const w of setT) if (setR.has(w)) inter++;
          const union = new Set([...setT, ...setR]).size;
          if (union && inter / union >= 0.6) return true;  // forte sovrapposizione (Jaccard)
        }
      }
      return false;
    } catch { return false; }
  }

  // Ultimo miglio di ogni risposta: moderazione, anti-eco, anti-ripetizione, lunghezza, cooldown, log.
  _finalizza(channel, risposta, streamer) {
    if (!risposta) return null;
    let testo = String(risposta).replace(/\s+/g, ' ').trim();
    if (!testo) return null;
    testo = persona.colora(testo);   // tocco leggero dell'anima (umore/energia)
    if (testo.length > MAX_RISPOSTA) testo = testo.slice(0, MAX_RISPOSTA - 1).trimEnd() + '…';

    // Qui passa TUTTO quello che il bot dice in chat: la conoscenza, la risposta
    // del cervello, le reti di sicurezza. E' il punto giusto per l'ultimo
    // controllo, ed e' piu' severo di quello sui messaggi degli utenti: blocca
    // anche le parole che lo streamer ha detto di non far mai uscire.
    const esito = checkRisposta(testo, streamer?.settings || {});
    if (!esito.ok) {
      log.warn(`#${channel} risposta bloccata (${esito.reason})`);
      return null;
    }
    // mai fare l'eco di un messaggio di un utente
    if (this._eEcoDiUtente(channel, testo)) {
      log.debug(`#${channel} risposta scartata: eco di un messaggio utente`);
      return null;
    }
    // né ripetere ciò che ho già detto io poco fa (suona finto)
    if (this._eAutoRipetizione(channel, testo)) {
      log.debug(`#${channel} risposta scartata: mi stavo ripetendo`);
      return null;
    }
    this._ultimaRisposta.set(channel, Date.now());
    log.info(`#${channel} → ${testo}`);
    return testo;
  }

  // ------------------------------------------------------------ onEvent

  // Eventi Twitch → annunci in chat (in prima persona: parla lo streamer).
  onEvent(ev, say) {
    try {
      const { channel, type, data = {} } = ev || {};
      if (!channel || !type || typeof say !== 'function') return;
      persona.onEvento(ev);   // l'anima reagisce agli eventi (umore/energia)

      const chiave = channel + '|' + type;
      if (Date.now() - (this._ultimoEvento.get(chiave) || 0) < COOLDOWN_EVENTO) return;

      let testo = null;
      switch (type) {
        case 'channel.follow': {
          if (!data.user_name) return;
          testo = compila(scegli(EV_FOLLOW), { nome: data.user_name });
          break;
        }
        case 'channel.subscribe': {
          const tier = data.tier === '2000' ? ' Tier 2' : data.tier === '3000' ? ' Tier 3' : '';
          testo = compila(scegli(EV_SUB), { nome: data.user_name || 'qualcuno', tier });
          break;
        }
        case 'channel.raid': {
          testo = compila(scegli(EV_RAID), {
            nome: data.from_broadcaster_user_name || 'un canale amico',
            viewers: data.viewers ?? 'tante',
          });
          break;
        }
        case 'channel.cheer': {
          const bits = data.bits ?? 0;
          if (!bits) return;
          const nome = data.is_anonymous ? 'un anonimo generoso' : (data.user_name || 'qualcuno');
          testo = compila(scegli(EV_CHEER), { nome, bits });
          break;
        }
        case 'stream.online': {
          testo = scegli(EV_ONLINE);
          break;
        }
        case 'channel.channel_points_custom_reward_redemption.add': {
          testo = compila(scegli(EV_RISCATTO), {
            nome: data.user_name || 'qualcuno',
            titolo: data.reward?.title || 'un premio',
          });
          break;
        }
        default:
          return;   // evento che non commentiamo
      }

      this._ultimoEvento.set(chiave, Date.now());
      // tocco d'anima: colore dell'umore attuale (persona.onEvento sopra l'ha già
      // aggiornato, quindi dopo un raid/sub la firma è più "carica").
      testo = persona.colora(testo);
      log.info(`#${channel} evento ${type} → ${testo}`);
      say(testo);
    } catch (e) {
      log.error('onEvent:', e?.message || e);
    }
  }

  // ------------------------------------------------------------ reflect

  // Consolidamento periodico, tutto procedurale: statistiche → fatti,
  // una "lezione" quando c'è materiale fresco, pulizia dei messaggi vecchi.
  async reflect(channel) {
    try {
      const adesso = Date.now();

      // chi anima la chat
      const top = learn.topChatters(channel, 7, 5);
      if (top.length) {
        memory.setFact(channel, 'top_chatter', top.map((t) => `${t.user} (${t.count})`).join(', '));
        if (top[0].count > 50) {
          memory.addUserMemory(channel, top[0].user, 'è tra i più attivi della chat ultimamente');
        }
      }

      // le emote del momento
      const emote = learn.emotiTop(channel, 5);
      if (emote.length) memory.setFact(channel, 'emote_preferite', emote.join(' '));

      // quanto si è mosso il canale nell'ultima settimana
      const settimana = db.prepare('SELECT COUNT(*) c FROM messages WHERE channel=? AND from_bot=0 AND ts>=?')
        .get(channel, adesso - 7 * 24 * 3_600_000).c;
      memory.setFact(channel, 'attivita_settimana', `${settimana} messaggi negli ultimi 7 giorni`);

      // una lezione nuova solo se c'è materiale fresco (≥50 messaggi in 6h)
      const seiOre = db.prepare('SELECT COUNT(*) c FROM messages WHERE channel=? AND from_bot=0 AND ts>=?')
        .get(channel, adesso - 6 * 3_600_000).c;
      if (seiOre >= 50) {
        // in che fascia oraria la chat è più viva (ultimi 7 giorni)
        const fasce = { notte: 0, mattina: 0, pomeriggio: 0, sera: 0 };
        const perOra = db.prepare(`SELECT CAST(strftime('%H', ts/1000, 'unixepoch', 'localtime') AS INTEGER) h, COUNT(*) c
            FROM messages WHERE channel=? AND from_bot=0 AND ts>=? GROUP BY h`)
          .all(channel, adesso - 7 * 24 * 3_600_000);
        for (const r of perOra) {
          if (r.h < 6) fasce.notte += r.c;
          else if (r.h < 13) fasce.mattina += r.c;
          else if (r.h < 19) fasce.pomeriggio += r.c;
          else fasce.sera += r.c;
        }
        const fasciaViva = Object.entries(fasce).sort((a, b) => b[1] - a[1])[0][0];

        const pezzi = [`La chat è più viva di ${fasciaViva}`];
        if (emote.length) pezzi.push(`emote del momento: ${emote.slice(0, 3).join(' ')}`);
        if (top.length) pezzi.push(`top chatter: ${top.slice(0, 3).map((t) => t.user).join(', ')}`);
        pezzi.push(`${seiOre} messaggi nelle ultime 6 ore`);
        memory.addLesson(channel, pezzi.join('; '));
      }

      // IA locale: ri-addestramento periodico (n-grammi + semantica + conoscenza)
      try { model.train(channel); } catch (e) { log.error(`train #${channel}:`, e?.message || e); }

      // pulizia: i messaggi oltre i 14 giorni non servono più
      const via = db.prepare('DELETE FROM messages WHERE channel=? AND ts<?')
        .run(channel, adesso - 14 * 24 * 3_600_000).changes;
      log.debug(`riflessione #${channel}: ${settimana} msg/settimana, ${via} messaggi vecchi eliminati`);
    } catch (e) {
      log.error(`reflect #${channel}:`, e?.message || e);
    }
  }
}
