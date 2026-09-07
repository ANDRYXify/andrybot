// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// IL SIMULATORE: smettere di tarare a naso.
//
// Ogni soglia dello scudo finora è stata scelta guardando un conto e
// ragionandoci sopra. Va bene per una soglia; per dieci, che si influenzano a
// vicenda, non basta più — cambiarne una e vedere se «va meglio» richiede di
// sapere cosa vuol dire meglio, e cioè un numero.
//
// Il numero si ottiene in un modo solo: un attacco di cui si sa GIÀ la
// risposta. Uno scenario porta con sé la verità — questo è un bot, questo è una
// persona — e alla fine si confronta quello che lo scudo ha fatto con quello che
// c'era davvero. Da lì escono le tre cose che contano:
//
//   PRECISIONE  quanti di quelli che ho colpito erano bot          (i falsi positivi)
//   RICHIAMO    quanti dei bot che c'erano ho colpito              (quelli scappati)
//   QUANTO CI HO MESSO  da quando è cominciato a quando l'ho visto
//
// E i due errori non costano uguale. Un bot scappato è un bot; un fan vero
// cacciato dal canale non torna. Per questo la precisione, qui, pesa più del
// richiamo — e nessuno scenario è verde se colpisce delle persone.
//
// Gli scenari sono DETERMINISTICI: nessun dado vero, solo una sequenza che si
// ripete identica. Cambiando un algoritmo si rigioca lo stesso attacco e si
// confrontano i numeri, invece di ricordarsi com'era «prima».
//
// Il modello per esteso: docs/SIMULATORE.md.
import { AntiBot, azzeraStati } from './antibot.js';
import * as inc from './incidenti.js';

// Dado con seme: le prove non devono dipendere dal caso, e due giri dello
// stesso scenario devono dare esattamente la stessa cosa.
export function dado(seme) {
  let x = (seme >>> 0) || 1;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
}
const esponenziale = (r, media) => -Math.log(1 - r()) * media;

// ── Gli scenari ─────────────────────────────────────────────────────────────
// Un evento è { tipo:'follow'|'chat', ts, login, userId, testo }.
// La verità è { login: 'bot' | 'persona' }.

function macchina({ quanti, passoMs, jitter = 0, da = 0, nome = 'zzq', r }) {
  const eventi = [], verita = {};
  let t = da;
  for (let i = 0; i < quanti; i++) {
    const login = `${nome}${i}x${(i * 7919) % 97}`;
    eventi.push({ tipo: 'follow', ts: Math.round(t), login, userId: 'b' + login });
    verita[login] = 'bot';
    t += passoMs * (1 + (r() * 2 - 1) * jitter);
  }
  return { eventi, verita };
}

function persone({ quanti, mediaMs, da = 0, nome = 'fan', r }) {
  const eventi = [], verita = {};
  let t = da;
  for (let i = 0; i < quanti; i++) {
    const login = `${nome}${i}`;
    eventi.push({ tipo: 'follow', ts: Math.round(t), login, userId: 'p' + login });
    verita[login] = 'persona';
    t += esponenziale(r, mediaMs);
  }
  return { eventi, verita };
}

function unisci(...pezzi) {
  const eventi = [], verita = {};
  for (const p of pezzi) { eventi.push(...p.eventi); Object.assign(verita, p.verita); }
  eventi.sort((a, b) => a.ts - b.ts);
  return { eventi, verita };
}

// COSA CI ASPETTIAMO OGGI, scenario per scenario. Non sono voti: sono la riga
// da cui si riparte. Un numero che scende è una regressione e si vede subito;
// un numero che sale va scritto qui, così la volta dopo non si torna indietro.
// Dove l'attesa è bassa c'è un pezzo di lavoro dichiarato, non un difetto
// dimenticato.
export const ATTESE = {
  'ondata-veloce': { precisione: 100, richiamo: 100, vede: true },
  'ondata-lenta': { precisione: 100, richiamo: 0, vede: false, nota: 'il gocciolamento alza il sospetto ma non fa agire: manca il pezzo' },
  'clip-virale': { precisione: 100, richiamo: 100, vede: null },
  'ondata-mista': { precisione: 83, richiamo: 100, vede: true, nota: 'le persone in mezzo all\'ondata si salvano solo in parte: serve il riconoscimento dei gruppi' },
  'coro': { precisione: 100, richiamo: 92, vede: true },
  'chat-viva': { precisione: 100, richiamo: 100, vede: null },
  'raid-vero': { precisione: 100, richiamo: 100, vede: null },
};

export const SCENARI = {
  'ondata-veloce': () => {
    const r = dado(11);
    return { descrizione: '500 follow-bot in dieci secondi, a passo di macchina', attacco: true, ...macchina({ quanti: 500, passoMs: 20, jitter: 0.15, r }) };
  },
  'ondata-lenta': () => {
    const r = dado(12);
    return { descrizione: '150 follow-bot in dieci minuti: il gocciolamento', attacco: true, ...macchina({ quanti: 150, passoMs: 4000, jitter: 0.2, r }) };
  },
  'clip-virale': () => {
    const r = dado(13);
    return { descrizione: '120 persone vere in un minuto: è andata bene una clip', attacco: false, ...persone({ quanti: 120, mediaMs: 500, r }) };
  },
  'ondata-mista': () => {
    const r = dado(14);
    return {
      descrizione: '200 bot a passo di macchina e 40 persone vere in mezzo',
      attacco: true,
      ...unisci(macchina({ quanti: 200, passoMs: 40, jitter: 0.15, r }), persone({ quanti: 40, mediaMs: 200, r })),
    };
  },
  'coro': () => {
    const r = dado(15);
    const eventi = [], verita = {};
    const testo = 'seguimi sul mio canale trovi tutti i regali nel profilo';
    for (let i = 0; i < 40; i++) {
      const login = 'coro' + i;
      eventi.push({ tipo: 'chat', ts: Math.round(i * 300 + r() * 100), login, userId: 'c' + login, testo });
      verita[login] = 'bot';
    }
    return { descrizione: '40 account, lo stesso messaggio in dodici secondi', attacco: true, eventi, verita };
  },
  'chat-viva': () => {
    const r = dado(16);
    const frasi = ['lol', 'w andry', 'ahahah', 'grande', 'ma che gioco e', 'io stavo per morire', 'bravo dai', 'non ci credo'];
    const eventi = [], verita = {};
    for (let i = 0; i < 80; i++) {
      const login = 'gente' + (i % 30);
      eventi.push({ tipo: 'chat', ts: Math.round(i * 250 + r() * 200), login, userId: 'g' + login, testo: frasi[Math.floor(r() * frasi.length)] });
      verita[login] = 'persona';
    }
    return { descrizione: '30 persone che chiacchierano forte per venti secondi', attacco: false, eventi, verita };
  },
  'raid-vero': () => {
    const r = dado(17);
    const p = persone({ quanti: 300, mediaMs: 60, nome: 'raider', r });
    // Chi scrive lo decide il caso, non «uno ogni tre». Prendendone uno esatto
    // ogni tre, gli intervalli fra i messaggi diventano la somma di tre attese
    // e quindi molto più regolari di come sono davvero: lo scenario si
    // metterebbe a somigliare a una macchina da solo, e il simulatore
    // misurerebbe sé stesso invece dello scudo.
    const eventi = p.eventi.map((e) => (r() < 0.33 ? { ...e, tipo: 'chat', testo: 'ciao ragazzi siamo arrivati dal raid di lucia' } : e));
    // Twitch lo dice, che è un raid. Lo scenario glielo dice come glielo direbbe
    // Twitch: è il segnale che distingue trecento persone che salutano insieme
    // da trecento bocche che ripetono la stessa cosa per farci male.
    eventi.unshift({ tipo: 'raid', ts: -1, login: 'lucia', userId: 'r-lucia', quanti: 300 });
    return { descrizione: '300 persone arrivate da un raid annunciato da Twitch', attacco: false, eventi, verita: p.verita };
  },
};

export const nomiScenari = () => Object.keys(SCENARI);

export function scenario(nome) {
  const f = SCENARI[nome];
  if (!f) return null;
  return { nome, ...f() };
}

// ── Giocarlo ────────────────────────────────────────────────────────────────
// Lo scudo è quello vero. L'unica cosa finta è Twitch: un helix che scrive su
// un foglio invece di bannare. Gli eventi portano il loro tempo dentro, quindi
// dieci minuti di attacco si giocano in un istante.
export async function gioca(sc, { canale = 'prova' } = {}) {
  // DECISI ed ESEGUITI sono due cose diverse, e confonderle fa misurare la cosa
  // sbagliata. Il rilevamento è quello che si giudica qui: quanti ha capito che
  // erano bot. Quanti sono poi arrivati davvero a Twitch dipende dal suo rate
  // limit — sei al secondo — e mille blocchi ci mettono tre minuti comunque.
  // Misurare gli eseguiti vorrebbe dire dare la colpa allo scudo del tetto di
  // Twitch.
  const decisi = new Map();           // login → azione decisa
  const eseguiti = new Set();
  const helix = {
    timeoutUser: async (_c, id) => { eseguiti.add(String(id)); return { ok: true }; },
    bloccaUtente: async (_c, id) => { eseguiti.add(String(id)); return { ok: true }; },
    deleteMessage: async () => ({ ok: true }),
    chatSoloFollower: async () => ({ ok: true }),
    chatLenta: async () => ({ ok: true }),
    shieldMode: async () => ({ ok: true }),
    getUserByLogin: async () => null,
  };
  azzeraStati();          // due attacchi giocati di fila non si mescolano
  const scudo = new AntiBot({ helix });

  // Si guarda dove passano tutti i verdetti. Cancellare un messaggio è colpire
  // quanto bannare, per come conta qui: il messaggio dell'attacco non è uscito.
  const vero = scudo.esecutore.esegui.bind(scudo.esecutore);
  scudo.esecutore.esegui = (v) => { if (v?.login && v.azione !== 'niente' && v.azione !== 'osserva') decisi.set(v.login, v.azione); return vero(v); };

  let allarme = 0;
  const inizio = sc.eventi.length ? sc.eventi[0].ts : 0;
  for (const e of sc.eventi) {
    if (e.tipo === 'raid') {
      scudo.onRaid({ channel: canale, ts: e.ts, data: { viewers: e.quanti, from_login: e.login } });
    } else if (e.tipo === 'follow') {
      await scudo.onFollow({ channel: canale, ts: e.ts, data: { user_id: e.userId, user_login: e.login } });
    } else {
      await scudo.controllaChat({ channel: canale, ts: e.ts, user: e.login, userId: e.userId, id: 'm' + e.userId, text: e.testo });
    }
    if (!allarme && inc.aperto(canale)) allarme = e.ts;
  }
  // Un attimo per far scorrere un pezzo di coda: serve a vedere che l'esecutore
  // gira davvero, non ad aspettare che finisca (mille blocchi sono minuti).
  for (let i = 0; i < 40 && scudo.esecutore.stato().inCoda; i++) await new Promise((r) => setTimeout(r, 20));

  const incidente = inc.aperto(canale) || inc.ultimoDi(canale);
  return {
    colpiti: decisi, allarme, inizio,
    eseguiti: eseguiti.size, inCoda: scudo.esecutore.stato().inCoda,
    incidente: incidente ? inc.sintesi(incidente) : null,
  };
}

// ── I numeri ────────────────────────────────────────────────────────────────
export function misura(sc, esito) {
  let veri = 0, falsiPositivi = 0, falsiNegativi = 0, corretti = 0;
  const sbagliati = [];
  for (const [login, vero] of Object.entries(sc.verita)) {
    const colpito = esito.colpiti.has(login);
    if (vero === 'bot' && colpito) veri++;
    else if (vero === 'bot') falsiNegativi++;
    else if (colpito) { falsiPositivi++; sbagliati.push(login); }
    else corretti++;
  }
  const precisione = veri + falsiPositivi ? veri / (veri + falsiPositivi) : 1;
  const richiamo = veri + falsiNegativi ? veri / (veri + falsiNegativi) : 1;
  return {
    scenario: sc.nome, descrizione: sc.descrizione,
    bot: veri + falsiNegativi, persone: falsiPositivi + corretti,
    veri, falsiPositivi, falsiNegativi,
    precisione: +(precisione * 100).toFixed(1),
    richiamo: +(richiamo * 100).toFixed(1),
    // Quanto ci ha messo a capire che stava succedendo. Zero se non se n'è
    // accorto: e per uno scenario che non È un attacco, non accorgersene è la
    // risposta giusta.
    msPerVederlo: esito.allarme ? esito.allarme - esito.inizio : null,
    haVistoAttacco: !!esito.allarme,
    sbagliati: sbagliati.slice(0, 10),
    eseguiti: esito.eseguiti, inCoda: esito.inCoda,
  };
}

// Il verdetto: non «è perfetto», ma «non è peggio di ieri». Con le attese
// scritte, una regressione si vede il giorno che succede invece che dopo.
export function contro(m, attesa) {
  if (!attesa) return { passa: true, perche: 'nessuna attesa scritta' };
  const guai = [];
  if (m.precisione < attesa.precisione) guai.push(`precisione ${m.precisione}% sotto ${attesa.precisione}%`);
  if (m.richiamo < attesa.richiamo) guai.push(`richiamo ${m.richiamo}% sotto ${attesa.richiamo}%`);
  if (attesa.vede === true && !m.haVistoAttacco) guai.push('non se n\'è accorto');
  return { passa: !guai.length, perche: guai.join(' · '), nota: attesa.nota || '' };
}

export async function provaScenario(nome, opzioni) {
  const sc = scenario(nome);
  if (!sc) return null;
  inc.azzera();
  const m = misura(sc, await gioca(sc, opzioni));
  return { ...m, ...contro(m, ATTESE[nome]) };
}
