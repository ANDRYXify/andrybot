// Il cervello di SocialBot: PROCEDURALE e PROGRESSIVO. Niente IA esterna:
// intenti a pattern, knowledge base con scoring, catene di Markov e una
// personalità fatta di pool di template in tre toni. Ricorda sempre:
// il bot parla CON L'ACCOUNT DELLO STREAMER, quindi in prima persona.
import { makeLog } from '../logger.js';
import { db, memory, knowledge, voceStreamer, guide, streamers, diario } from '../db.js';
import * as internet from '../features/web.js';
import { checkMessage } from '../features/moderation.js';
import * as learn from './learn.js';
import * as model from './model.js';
import * as persona from './persona.js';
import * as brainpy from './brainpy.js';

const log = makeLog('brain');

const COOLDOWN_RISPOSTA = 45_000;   // minimo tra due risposte del cervello per canale
const COOLDOWN_EVENTO = 10_000;     // minimo tra due annunci dello stesso evento per canale
const MAX_RISPOSTA = 400;           // lunghezza massima di una risposta

// bot noti a cui non si risponde mai (parlano tra loro e non finisce bene)
const BOT_NOTI = new Set(['nightbot', 'streamelements', 'moobot', 'streamlabs', 'fossabot', 'wizebot']);

const TONI = ['scherzoso', 'amichevole', 'serio'];

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
];
const EV_SUB = [
  'Grazie della sub{tier}, {nome}! Sei un grande 💜',
  '{nome} con la sub{tier}! Grazie di cuore 🙌',
  'Sub{tier} di {nome}! Abbraccio virtuale in arrivo 🤗',
  'Grande {nome}, grazie per la sub{tier}! 🎉',
];
const EV_RAID = [
  'Raid di {nome} con {viewers} persone! Benvenuti tutti 🎉',
  'Aprite le porte: arriva il raid di {nome}! Benvenuti in {viewers} 🙌',
  '{nome} ci porta {viewers} persone! Fatevi sentire in chat, benvenuti 💜',
  'Benvenuti raider di {nome}! Mettetevi comodi, qui si sta bene 🔥',
];
const EV_ONLINE = [
  'Siamo live! Chiamate tutti, si comincia 🔴',
  'Si parte! Benvenuti alla live di oggi 🎬',
  'Live iniziata! Mettetevi comodi 💜',
  'Eccoci, si va in onda! Buona live a tutti 🔴',
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
function sembraRispondibile(text) {
  const t = String(text || '').toLowerCase();
  if (!t) return false;
  if (t.includes('?')) return true;
  if (INTENTI_NOTI.test(t)) return true;
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
      // 1) la VOCE PARLATA in diretta (materiale di stile migliore: è la sua voce vera)
      try { for (const v of voceStreamer.recent(channel, 8)) aggiungi(v, 12); } catch { /* niente */ }
      // 2) completa con i suoi messaggi SCRITTI in chat
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
      const conoscenza = knowledge.list(channel)
        .filter((k) => k.fonte !== 'chat').slice(0, 6)
        .map((k) => `${k.domanda}: ${k.risposta}`);
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

  // MESSAGGIO PROATTIVO (Telegram, chat privata col proprietario): scrive LEI per
  // prima, di sua iniziativa. La curiosità nasce dalle LACUNE della rete (le cose
  // che non sa ancora): così è naturale che te le venga a chiedere — e imparando la
  // tua risposta cresce davvero. Ritorna una stringa o null. Non lancia mai.
  async messaggioProattivo(channel, { nome, spunto: spuntoForzato } = {}) {
    try {
      if (!channel) return null;
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
      const conoscenza = knowledge.list(channel).filter((k) => k.fonte !== 'chat').slice(0, 6)
        .map((k) => `${k.domanda}: ${k.risposta}`);
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

  shouldReply({ channel, botLogin, user, text, streamer, isSelf } = {}) {
    try {
      if (isSelf || !streamer || !channel || !text) return false;
      if (BOT_NOTI.has(String(user || '').toLowerCase())) return false;

      // respiro: mai due risposte del cervello troppo vicine (i comandi ! non c'entrano)
      if (Date.now() - (this._ultimaRisposta.get(channel) || 0) < COOLDOWN_RISPOSTA) return false;

      const settings = streamer.settings || {};
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

      return Math.random() < p;
    } catch (e) {
      log.error('shouldReply:', e?.message || e);
      return false;
    }
  }

  // ------------------------------------------------------------ chatReply

  // Pipeline procedurale: intenti → conoscenza → cortesie → onestà → spontaneità.
  // La prima tappa che produce qualcosa vince; meglio null di una risposta scarsa.
  async chatReply({ channel, user, display, text, streamer, botLogin } = {}) {
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
        if (ctx) return this._finalizza(channel, compila(scegli(LIVE_CONTESTO), { ...variabili, ctx }), streamer);
        try {
          const stream = await this.helix?.getStream?.(channel);
          if (stream) {
            return this._finalizza(channel, compila(scegli(LIVE_ORA), {
              ...variabili,
              gioco: stream.game_name || 'qualcosa di bello',
              titolo: stream.title || 'live di oggi',
              spettatori: stream.viewer_count ?? 0,
            }), streamer);
          }
        } catch { /* helix giù: si ripiega sull'offline */ }
        const recente = memory.facts(channel).find((f) => f.key === 'gioco_recente')?.value;
        return this._finalizza(channel,
          recente ? compila(scegli(OFFLINE_GIOCO), { ...variabili, gioco: recente }) : scegli(OFFLINE),
          streamer);
      }

      // da quanto siamo live / uptime
      if (/uptime|da quanto/.test(lower)) {
        try {
          const stream = await this.helix?.getStream?.(channel);
          if (stream?.started_at) {
            const minuti = Math.max(0, Math.floor((Date.now() - new Date(stream.started_at).getTime()) / 60_000));
            return this._finalizza(channel, compila(scegli(UPTIME_LIVE), {
              ...variabili, ore: Math.floor(minuti / 60), minuti: minuti % 60,
            }), streamer);
          }
          return this._finalizza(channel, scegli(OFFLINE), streamer);
        } catch { return null; }
      }

      // clip su richiesta (serve la menzione: "clippalo bot!")
      if (menziona && /\bclip/.test(lower)) {
        let url = null;
        try { url = await this.actions?.createClip?.(channel, 'richiesta in chat da ' + nome); }
        catch (e) { log.error(`clip #${channel}:`, e?.message || e); }
        return this._finalizza(channel,
          url ? compila(scegli(CLIP_OK), { ...variabili, url }) : scegli(CLIP_NO),
          streamer);
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
        if (voce) return this._finalizza(channel, voce.risposta, streamer);
      }

      // ---- b. CONOSCENZA (semantica + lessicale) ----------------------
      // Con l'IA locale il match "capisce" anche le parafrasi (es. "dove ti
      // seguo" → la voce sui social), così servono molte meno risposte scritte
      // a mano. Se l'IA è spenta o "fredda", si ripiega sul match lessicale.
      let daConoscenza = null;
      if (iaOn) { const bk = model.bestKnowledge(channel, text); if (bk) daConoscenza = bk.risposta; }
      if (!daConoscenza) daConoscenza = this._cercaConoscenza(channel, text);
      if (daConoscenza) {
        const r = Math.random();
        const prefisso = r < 0.6 ? '' : r < 0.85 ? nome + ' ' : 'Se parli di questo: ';
        return this._finalizza(channel, prefisso + daConoscenza, streamer);
      }

      // ---- c. IL CERVELLO PARLA (contestuale, parole sue) -------------
      // La conversazione la genera il CERVELLO in Python (coscienza progressiva
      // + modello linguistico), che vive in un PROCESSO SEPARATO: se è lento o
      // spento ritorna null e il bot resta zitto. I COMANDI non passano mai di
      // qui → restano sempre istantanei. Passa comunque da _finalizza (mod+anti-eco).
      if (iaOn) {
        const conoscenza = knowledge.list(channel)
          .filter((k) => k.fonte !== 'chat')
          .slice(0, 6)
          .map((k) => `${k.domanda}: ${k.risposta}`);
        const risposta = await brainpy.rispondi({
          canale: streamer.display || channel, login: user, nome, testo: text, tono, conoscenza,
          stile: this._stileStreamer(channel),   // la voce vera dello streamer (esempi di stile)
          lineeGuida: guide.applicabili(channel, { piattaforma: 'twitch', privato: false, sonoIo: false }),   // regole valide in chat pubblica
        });
        if (risposta) return this._finalizza(channel, risposta, streamer);
      }

      // ---- d. FALLBACK quando il modello non è pronto ------------------
      // (primo avvio: sta ancora scaricando/caricando il modello, oppure non è
      // installato). Niente personalità finta: solo un'onestà se ci citano con
      // una domanda; altrimenti silenzio. Appena il modello è pronto, parla lui.
      if (menziona && text.includes('?')) {
        // prima di arrendersi: se ha internet, prova a cercare la risposta da sé
        if (this._internetOn(channel)) {
          const web = await this._cercaWeb(channel, text);
          if (web) {
            const r = await brainpy.rispondi({
              canale: streamer.display || channel, login: user, nome, testo: text, tono, web,
              lineeGuida: guide.applicabili(channel, { piattaforma: 'twitch', privato: false, sonoIo: false }), stile: this._stileStreamer(channel), timeoutMs: 12000,
            });
            if (r) return this._finalizza(channel, r, streamer);
          }
        }
        return this._finalizza(channel, compila(scegli(NON_LO_SO), variabili), streamer);
      }
      return null;
    } catch (e) {
      log.error(`chatReply #${channel}:`, e?.message || e);
      return null;
    }
  }

  // Cerca nella knowledge la voce che meglio combacia con il testo.
  // Punteggio: parole in comune / parole della voce, con bonus per i
  // match "pesanti" (parole lunghe, più distintive).
  _cercaConoscenza(channel, testo) {
    const paroleUtente = new Set(learn.normalizza(testo));
    if (!paroleUtente.size) return null;

    let migliore = null;
    let migliorPunteggio = 0;
    for (const voce of knowledge.list(channel)) {
      // niente risposte "imparate dalla chat" (sono messaggi veri degli utenti:
      // ripeterli è sgradevole). Solo conoscenza curata: profilo del sito / dashboard.
      if (voce.fonte === 'chat') continue;
      const paroleVoce = new Set(learn.normalizza(voce.domanda));
      if (!paroleVoce.size) continue;

      let comuni = 0;
      let bonus = 0;
      for (const w of paroleVoce) {
        if (!paroleUtente.has(w)) continue;
        comuni++;
        if (w.length >= 5) bonus += 0.05;   // le parole lunghe pesano di più
      }
      const minime = paroleVoce.size <= 2 ? 1 : 2;   // le voci corte si accontentano di 1 parola
      if (comuni < minime) continue;

      const punteggio = comuni / paroleVoce.size + Math.min(0.25, bonus);
      if (punteggio > migliorPunteggio) { migliorPunteggio = punteggio; migliore = voce; }
    }
    return migliorPunteggio >= 0.5 ? migliore.risposta : null;
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

  // Ultimo miglio di ogni risposta: moderazione, anti-eco, lunghezza, cooldown, log.
  _finalizza(channel, risposta, streamer) {
    if (!risposta) return null;
    let testo = String(risposta).replace(/\s+/g, ' ').trim();
    if (!testo) return null;
    testo = persona.colora(testo);   // tocco leggero dell'anima (umore/energia)
    if (testo.length > MAX_RISPOSTA) testo = testo.slice(0, MAX_RISPOSTA - 1).trimEnd() + '…';

    const esito = checkMessage(testo, streamer?.settings || {});
    if (!esito.ok) {
      log.warn(`#${channel} risposta bloccata dalla moderazione (${esito.reason})`);
      return null;
    }
    // mai fare l'eco di un messaggio di un utente
    if (this._eEcoDiUtente(channel, testo)) {
      log.debug(`#${channel} risposta scartata: eco di un messaggio utente`);
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
