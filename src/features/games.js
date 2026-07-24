// Minigiochi in chat + monete (punti fedeltà) + promo social proattiva.
// Tutto procedurale e leggero. Disattivabile per canale (settings.giochi).
//
// Comandi: !dado [NdM] · !moneta · !8ball <domanda> · !slot · !roulette <p> <scelta>
//          · !pesca · !duello @tizio · !furto @tizio · !regala @tizio N
//          · !trivia · !classifica · !monete · !giochi
import { points, streamers, knowledge, giochi } from '../db.js';
import { makeLog } from '../logger.js';

const log = makeLog('giochi');

// --------------------------------------------------------- utilità
const scegli = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').trim();

// cooldown in memoria: chiave → ts di sblocco
const cooldowns = new Map();
function inCooldown(chiave, ms) {
  const ora = Date.now();
  if ((cooldowns.get(chiave) || 0) > ora) return true;
  cooldowns.set(chiave, ora + ms);
  return false;
}

// accredito passivo: throttle per (canale,utente)
const ultimoAccredito = new Map();

function attivi(channel) {
  const s = streamers.get(channel);
  return s?.settings?.giochi !== false;   // di default i giochi sono accesi
}
function nomeMoneta(channel) {
  const n = streamers.get(channel)?.settings?.nomeMonete;
  return (n && String(n).trim()) || 'monete';
}

// Configurazione punti/classifica per canale (personalizzabile dalla dashboard).
// Valori di default = quelli storici, così i canali esistenti non cambiano nulla.
const PUNTI_DEFAULT = { perMessaggio: 2, ogniSecondi: 60, trivia: 25, duello: 15, slotCosto: 10, slotVinci: 200, slotCoppia: 20, topN: 5 };
function numClamp(v, def, lo, hi) { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; }
function cfgPunti(channel) {
  const p = streamers.get(channel)?.settings?.punti || {};
  return {
    perMessaggio: numClamp(p.perMessaggio, PUNTI_DEFAULT.perMessaggio, 0, 1000),
    ogniSecondi:  numClamp(p.ogniSecondi,  PUNTI_DEFAULT.ogniSecondi, 5, 3600),
    trivia:       numClamp(p.trivia,       PUNTI_DEFAULT.trivia, 0, 100000),
    duello:       numClamp(p.duello,       PUNTI_DEFAULT.duello, 0, 100000),
    slotCosto:    numClamp(p.slotCosto,    PUNTI_DEFAULT.slotCosto, 0, 100000),
    slotVinci:    numClamp(p.slotVinci,    PUNTI_DEFAULT.slotVinci, 0, 1000000),
    slotCoppia:   numClamp(p.slotCoppia,   PUNTI_DEFAULT.slotCoppia, 0, 100000),
    topN:         numClamp(p.topN,         PUNTI_DEFAULT.topN, 3, 10),
  };
}
const medaglia = (i) => ['🥇', '🥈', '🥉'][i] || `${i + 1}°`;

// --------------------------------------------------------- monete: accredito passivo
// Chi chatta guadagna qualche moneta (throttle 60s per persona).
export function accredita(msg) {
  try {
    if (!msg) return;
    const u = String(msg.user || '').toLowerCase();
    if (!u || u.startsWith('[')) return;
    if (!attivi(msg.channel)) return;
    const c = cfgPunti(msg.channel);
    if (c.perMessaggio <= 0) return;
    const k = msg.channel + '|' + u;
    if (Date.now() - (ultimoAccredito.get(k) || 0) < c.ogniSecondi * 1000) return;
    ultimoAccredito.set(k, Date.now());
    points.add(msg.channel, u, c.perMessaggio);
  } catch { /* niente */ }
}

// --------------------------------------------------------- trivia (round in memoria)
const BANCA_TRIVIA = [
  { q: 'Qual è il pianeta più grande del Sistema Solare?', a: ['giove'] },
  { q: 'Quanti lati ha un esagono?', a: ['6', 'sei'] },
  { q: 'In che continente si trova l\'Egitto?', a: ['africa'] },
  { q: 'Qual è il fiume più lungo d\'Italia?', a: ['po'] },
  { q: 'Chi ha dipinto la Gioconda?', a: ['leonardo', 'leonardo da vinci', 'da vinci'] },
  { q: 'Quante corde ha una chitarra classica?', a: ['6', 'sei'] },
  { q: 'Qual è la capitale del Giappone?', a: ['tokyo'] },
  { q: 'In quale anno è caduto il muro di Berlino?', a: ['1989'] },
  { q: 'Qual è l\'elemento chimico con simbolo O?', a: ['ossigeno'] },
  { q: 'Quanti giocatori ci sono in una squadra di calcio in campo?', a: ['11', 'undici'] },
  { q: 'Come si chiama il papà di Super Mario (il creatore)?', a: ['miyamoto', 'shigeru miyamoto'] },
  { q: 'Qual è il mammifero più grande del mondo?', a: ['balena', 'balenottera', 'balenottera azzurra'] },
  { q: 'Quanti minuti ci sono in un\'ora?', a: ['60', 'sessanta'] },
  { q: 'Di che colore diventa la cartina di tornasole in un acido?', a: ['rosso'] },
  { q: 'Qual è la capitale della Francia?', a: ['parigi'] },
  { q: 'In che gioco esiste la "creeper"?', a: ['minecraft'] },
  { q: 'Quante zampe ha un ragno?', a: ['8', 'otto'] },
  { q: 'Qual è il numero romano per 50?', a: ['l'] },
  { q: 'Come si chiama la nostra galassia?', a: ['via lattea'] },
  { q: 'Quanti colori ha l\'arcobaleno?', a: ['7', 'sette'] },
];
// parole "reflex" di riserva se il canale non ha un gioco-parola personalizzato
const BANCA_PAROLE = ['pizza', 'gg', 'hype', 'clip', 'combo', 'boss', 'jump', 'loot', 'respawn', 'buff', 'nerf', 'poggers', 'raid', 'sub', 'lag'];

// ─────────────────────────────────────────────────── motore delle "manche"
// Una manche è un ROUND a tempo: il bot lancia un gioco in chat, il primo che
// risponde giusto vince i punti. I round sono generalizzati (trivia, parola,
// numero) con una funzione `controlla(testo)` uniforme.
const roundAttivo = new Map();   // channel → { tipo, controlla, premio, soluzione, scadenza, durata }

function giochiCustom(channel, tipo) {
  try { return giochi.listAttivi(channel).filter((g) => g.tipo === tipo); } catch { return []; }
}

// Costruttori di round. Ognuno ritorna un descrittore (o null se non fattibile).
function roundTrivia(channel) {
  const custom = giochiCustom(channel, 'trivia').flatMap((g) => Array.isArray(g.config?.domande) ? g.config.domande : []);
  const banca = custom.length ? (Math.random() < 0.65 ? custom : BANCA_TRIVIA) : BANCA_TRIVIA;
  const d = scegli(banca);
  if (!d?.q || !Array.isArray(d.a) || !d.a.length) return null;
  const ans = d.a.map(norm).filter(Boolean);
  return { tipo: 'trivia', annuncio: `🧠 TRIVIA: ${d.q}`, controlla: (t) => ans.some((a) => t === a || t.split(' ').includes(a)), soluzione: d.a[0], durata: 45000 };
}
function roundParola(channel) {
  const custom = giochiCustom(channel, 'parola').flatMap((g) => Array.isArray(g.config?.parole) ? g.config.parole : []);
  const pool = custom.length ? custom : BANCA_PAROLE;
  const p = String(scegli(pool) || '').trim();
  if (!p) return null;
  const target = norm(p);
  return { tipo: 'parola', annuncio: `⚡ REFLEX: il primo che scrive "${p}" vince!`, controlla: (t) => t === target, soluzione: p, durata: 30000 };
}
function roundNumero() {
  const max = 50;
  const n = rnd(1, max);
  return { tipo: 'numero', annuncio: `🔢 Ho pensato un numero da 1 a ${max}: indovinatelo!`, controlla: (t) => parseInt(t, 10) === n, soluzione: String(n), durata: 40000 };
}

function avviaRound(channel, round, say) {
  if (!round || roundAttivo.has(channel)) return false;
  round.premio = round.premio || cfgPunti(channel).trivia;
  round.scadenza = Date.now() + round.durata;
  roundAttivo.set(channel, round);
  try { say(`${round.annuncio} — rispondete in chat! (${Math.round(round.durata / 1000)}s, +${round.premio} ${nomeMoneta(channel)})`); } catch { /* niente */ }
  setTimeout(() => {
    const r = roundAttivo.get(channel);
    if (r === round) { roundAttivo.delete(channel); try { say(`⏰ Tempo scaduto! La risposta era "${round.soluzione}".`); } catch { /* niente */ } }
  }, round.durata + 1000).unref?.();
  return true;
}

// Lancia una manche a caso (gioco scelto a caso tra trivia/parola/numero, con i
// giochi personalizzati mescolati). Chiamata dallo scheduler del bot.
export function avviaManche(channel, say) {
  if (!attivi(channel) || roundAttivo.has(channel)) return false;
  const builders = [roundTrivia, roundParola, roundNumero];
  // prova qualche costruttore finché uno produce un round valido
  for (const b of builders.sort(() => Math.random() - 0.5)) {
    const r = b(channel);
    if (r) return avviaRound(channel, r, say);
  }
  return false;
}

// --------------------------------------------------------- 8ball
const OTTO = [
  'Sì, senza dubbio.', 'Direi proprio di sì.', 'Ci puoi scommettere.', 'Assolutamente.',
  'Mmm… non ci conterei.', 'Meglio di no.', 'Direi di no.', 'Non è detto.',
  'Chiedimelo di nuovo più tardi.', 'Il futuro è nebbioso… riprova.', 'Le probabilità sono buone.',
  'Segui il tuo istinto.', 'Ho i miei dubbi…', 'Ovvio che sì!', 'Nemmeno per sogno 😄',
];
const SLOT_SIMBOLI = ['🍒', '🍋', '🔔', '⭐', '💎', '7️⃣'];
const DUELLO_ESITI = [
  '{a} stende {b} con una mossa leggendaria! 🥊',
  '{b} inciampa e {a} vince senza fatica 😂',
  '{a} e {b} se le danno di santa ragione… vince {a}! 🔥',
  '{a} sconfigge {b} e ruba pure la scena ✨',
];
// pesca: tabella del pescato (peso = probabilità relativa, v = monete vinte)
const PESCA = [
  { n: 'una vecchia ciabatta 🥿', v: 0, peso: 16 },
  { n: 'una lattina arrugginita 🥫', v: 0, peso: 12 },
  { n: 'un pesciolino 🐟', v: 15, peso: 30 },
  { n: 'un granchio 🦀', v: 30, peso: 18 },
  { n: 'un polpo 🐙', v: 60, peso: 10 },
  { n: 'un pesce spada 🗡️', v: 120, peso: 6 },
  { n: 'uno stivale pieno di monete 👢', v: 250, peso: 4 },
  { n: 'uno scrigno del tesoro 🧰', v: 500, peso: 2 },
];
// roulette europea: lo 0 è verde, gli altri numeri sono rossi o neri
const ROULETTE_ROSSI = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

// pesca pesata da una tabella con campo `peso`
function pescaPesata(tab) {
  const tot = tab.reduce((s, x) => s + (x.peso || 0), 0);
  let r = Math.random() * tot;
  for (const x of tab) { if ((r -= (x.peso || 0)) < 0) return x; }
  return tab[tab.length - 1];
}

// --------------------------------------------------------- comando principale
// Ritorna true se il messaggio era un comando/azione di gioco (gestito).
export function tryGame(msg, say) {
  try {
    // Niente skip su isSelf: lo streamer (che il bot impersona) può giocare/
    // testare i minigiochi dal suo account. Nessun loop: gli echi non tornano.
    if (!msg) return false;
    const channel = msg.channel;
    if (!attivi(channel)) return false;
    const nome = msg.display || msg.user;
    const moneta = () => nomeMoneta(channel);

    // risposta a una manche (round) in corso: messaggio normale, non comando
    const round = roundAttivo.get(channel);
    if (round) {
      if (Date.now() > round.scadenza) { roundAttivo.delete(channel); }
      else if (!String(msg.text).startsWith('!') && round.controlla(norm(msg.text))) {
        roundAttivo.delete(channel);
        points.add(channel, msg.user, round.premio);
        say(`🎉 Esatto ${nome}! (${round.soluzione}) +${round.premio} ${moneta()}!`);
        return true;
      }
    }

    const testo = String(msg.text || '').trim();
    if (!testo.startsWith('!')) return false;
    const parti = testo.slice(1).split(/\s+/);
    const cmd = (parti.shift() || '').toLowerCase();
    const args = parti;

    switch (cmd) {
      case 'giochi':
        say('🎮 Giochi: !dado, !moneta, !8ball, !slot, !roulette, !pesca, !duello @nome, !furto @nome, !regala @nome N, !trivia, !classifica, !monete');
        return true;

      case 'dado':
      case 'roll': {
        if (inCooldown(channel + '|dado|' + msg.user, 3000)) return true;
        let n = 1, facce = 6;
        const m = /^(\d{0,2})d(\d{1,3})$/i.exec(args[0] || '');
        if (m) { n = Math.min(10, Math.max(1, parseInt(m[1] || '1', 10))); facce = Math.min(1000, Math.max(2, parseInt(m[2], 10))); }
        const tiri = Array.from({ length: n }, () => rnd(1, facce));
        const tot = tiri.reduce((a, b) => a + b, 0);
        say(`🎲 ${nome} tira ${n}d${facce}: ${tiri.join(' + ')}${n > 1 ? ' = ' + tot : ''}`);
        return true;
      }

      case 'moneta':
      case 'coin': {
        if (inCooldown(channel + '|coin|' + msg.user, 3000)) return true;
        say(`🪙 ${nome}: è uscito ${Math.random() < 0.5 ? 'TESTA' : 'CROCE'}!`);
        return true;
      }

      case '8ball':
      case 'palla8': {
        if (inCooldown(channel + '|8ball|' + msg.user, 3000)) return true;
        if (!args.length) { say(`🎱 Fammi una domanda, ${nome}! (es. !8ball vinco stasera?)`); return true; }
        say(`🎱 ${scegli(OTTO)}`);
        return true;
      }

      case 'monete':
      case 'punti':
      case 'bilancio': {
        say(`💰 ${nome}, hai ${points.get(channel, msg.user)} ${moneta()}.`);
        return true;
      }

      case 'classifica':
      case 'top': {
        const top = points.top(channel, cfgPunti(channel).topN);
        if (!top.length) { say(`Nessuno ha ancora ${moneta()}: chattate e giocate! 🎮`); return true; }
        const riga = top.map((r, i) => `${medaglia(i)} ${r.user} (${r.monete})`).join('  ');
        say(`🏆 Classifica ${moneta()}: ${riga}`);
        return true;
      }

      case 'slot': {
        if (inCooldown(channel + '|slot|' + msg.user, 5000)) return true;
        const cp = cfgPunti(channel);
        const costo = cp.slotCosto;
        if (points.get(channel, msg.user) < costo) { say(`🎰 Ti servono ${costo} ${moneta()} per giocare, ${nome}. Chatta un po' e torna!`); return true; }
        points.add(channel, msg.user, -costo);
        const r = [scegli(SLOT_SIMBOLI), scegli(SLOT_SIMBOLI), scegli(SLOT_SIMBOLI)];
        let vincita = 0, msgWin = '';
        // tris: 💎 = vincita piena, 7️⃣ = 75%, altro = 40% (scala su slotVinci)
        if (r[0] === r[1] && r[1] === r[2]) { vincita = r[0] === '💎' ? cp.slotVinci : r[0] === '7️⃣' ? Math.round(cp.slotVinci * 0.75) : Math.round(cp.slotVinci * 0.4); msgWin = ' JACKPOT!! 🎉'; }
        else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) { vincita = cp.slotCoppia; msgWin = ' bella coppia!'; }
        if (vincita) points.add(channel, msg.user, vincita);
        say(`🎰 [ ${r.join(' | ')} ] ${vincita ? `${nome} vince ${vincita} ${moneta()}!${msgWin}` : `niente, ritenta ${nome}!`}`);
        return true;
      }

      case 'duello':
      case 'duel': {
        const sfidato = (args[0] || '').replace(/^@/, '').toLowerCase();
        if (!sfidato) { say(`⚔️ Sfida qualcuno: !duello @nome`); return true; }
        if (sfidato === msg.user.toLowerCase()) { say(`${nome}, non puoi sfidare te stesso 😄`); return true; }
        if (inCooldown(channel + '|duello', 15000)) { say('⚔️ Un duello alla volta, aspettate un attimo!'); return true; }
        const vince = Math.random() < 0.5;
        const a = vince ? nome : sfidato, b = vince ? sfidato : nome;
        const premio = cfgPunti(channel).duello;
        points.add(channel, vince ? msg.user : sfidato, premio);
        say('⚔️ ' + scegli(DUELLO_ESITI).replace('{a}', a).replace('{b}', b) + ` (+${premio} ${moneta()})`);
        return true;
      }

      case 'trivia':
      case 'quiz': {
        if (roundAttivo.has(channel)) { say('🧠 C\'è già una manche in corso, rispondete!'); return true; }
        if (inCooldown(channel + '|trivia', 15000)) return true;
        avviaRound(channel, roundTrivia(channel), say);
        return true;
      }

      case 'manche':
      case 'gioca': {
        // avvia una manche a caso al volo (utile per provare / mod)
        if (roundAttivo.has(channel)) { say('🎮 C\'è già una manche in corso!'); return true; }
        if (inCooldown(channel + '|manche', 10000)) return true;
        if (!avviaManche(channel, say)) say('🎮 Nessuna manche disponibile al momento.');
        return true;
      }

      case 'pesca':
      case 'fish': {
        if (inCooldown(channel + '|pesca|' + msg.user, 60000)) { say(`🎣 ${nome}, la canna è ancora in acqua… riprova tra poco.`); return true; }
        const c = pescaPesata(PESCA);
        if (c.v > 0) { points.add(channel, msg.user, c.v); say(`🎣 ${nome} pesca ${c.n} e guadagna ${c.v} ${moneta()}!`); }
        else say(`🎣 ${nome} pesca ${c.n}… niente ${moneta()}, ritenta!`);
        return true;
      }

      case 'roulette':
      case 'rul': {
        if (inCooldown(channel + '|roulette|' + msg.user, 5000)) return true;
        const punta = Math.round(Number(args[0]));
        const scelta = (args[1] || '').toLowerCase();
        if (!Number.isFinite(punta) || punta <= 0 || !scelta) { say(`🎡 Uso: !roulette <puntata> <rosso|nero|verde|numero 0-36>`); return true; }
        const saldo = points.get(channel, msg.user);
        if (saldo < punta) { say(`🎡 ${nome}, non hai abbastanza ${moneta()} (${saldo}).`); return true; }
        const numScelto = /^\d{1,2}$/.test(scelta) ? parseInt(scelta, 10) : null;
        if (numScelto === null && !['rosso', 'nero', 'verde', 'red', 'black', 'green'].includes(scelta)) { say(`🎡 Punta su rosso, nero, verde o un numero da 0 a 36.`); return true; }
        if (numScelto !== null && (numScelto < 0 || numScelto > 36)) { say(`🎡 Il numero va da 0 a 36, ${nome}.`); return true; }
        points.add(channel, msg.user, -punta);
        const uscito = rnd(0, 36);
        const colore = uscito === 0 ? 'verde' : (ROULETTE_ROSSI.has(uscito) ? 'rosso' : 'nero');
        let vincita = 0;
        if (numScelto !== null) { if (numScelto === uscito) vincita = punta * 36; }         // pieno: 35x + puntata
        else { const s = { red: 'rosso', black: 'nero', green: 'verde' }[scelta] || scelta;
          if (s === colore) vincita = colore === 'verde' ? punta * 14 : punta * 2; }
        const pallina = `${uscito} ${colore === 'rosso' ? '🔴' : colore === 'nero' ? '⚫' : '🟢'}`;
        if (vincita) { points.add(channel, msg.user, vincita); say(`🎡 La pallina cade sul ${pallina} — ${nome} vince ${vincita} ${moneta()}! 🎉`); }
        else say(`🎡 La pallina cade sul ${pallina} — niente da fare, ${nome}.`);
        return true;
      }

      case 'furto':
      case 'rapina': {
        const vittima = (args[0] || '').replace(/^@/, '').toLowerCase();
        if (!vittima) { say(`🦝 Uso: !furto @nome`); return true; }
        if (vittima === msg.user.toLowerCase()) { say(`${nome}, non puoi derubare te stesso 😄`); return true; }
        if (inCooldown(channel + '|furto|' + msg.user, 45000)) { say(`🦝 ${nome}, aspetta prima di tentare un altro colpo.`); return true; }
        const gruzzolo = points.get(channel, vittima);
        if (gruzzolo < 20) { say(`🦝 ${vittima} ha le tasche vuote, niente da rubare.`); return true; }
        if (Math.random() < 0.45) {                                   // colpo riuscito
          const bottino = rnd(10, Math.min(gruzzolo, 150));
          points.add(channel, vittima, -bottino); points.add(channel, msg.user, bottino);
          say(`🦝 Colpo riuscito! ${nome} sgraffigna ${bottino} ${moneta()} a ${vittima}! 😈`);
        } else {                                                       // beccato: multa
          const multa = Math.min(points.get(channel, msg.user), rnd(10, 60));
          if (multa > 0) { points.add(channel, msg.user, -multa); points.add(channel, vittima, multa); }
          say(`🚓 ${nome} viene beccato e paga ${multa} ${moneta()} di multa a ${vittima}! 😂`);
        }
        return true;
      }

      case 'regala':
      case 'dona': {
        const dest = (args[0] || '').replace(/^@/, '').toLowerCase();
        const q = Math.round(Number(args[1]));
        if (!dest || !Number.isFinite(q) || q <= 0) { say(`💝 Uso: !regala @nome quantità`); return true; }
        if (dest === msg.user.toLowerCase()) { say(`${nome}, non puoi regalarti ${moneta()} da solo 😄`); return true; }
        if (points.get(channel, msg.user) < q) { say(`${nome}, non hai abbastanza ${moneta()} (ne hai ${points.get(channel, msg.user)}).`); return true; }
        points.add(channel, msg.user, -q); points.add(channel, dest, q);
        say(`💝 ${nome} ha regalato ${q} ${moneta()} a ${dest}! Che generosità ✨`);
        return true;
      }

      default:
        return false;   // non è un comando di gioco
    }
  } catch (e) {
    log.error('tryGame:', e?.message || e);
    return false;
  }
}

// --------------------------------------------------------- promo social proattiva
// Pesca un link social dalla conoscenza del canale (imparata dal profilo
// andryxify.it) e lo propone con calore. Ruota per non ripetere lo stesso.
const ultimoSocial = new Map();   // channel → domanda già usata di recente
const APERTURE = [
  'Se ti va, mi trovi anche qui:', 'Piccolo promemoria:', 'Passa a trovarmi anche su:',
  'Per non perderti nulla:', 'Ci trovi anche qui:',
];
export function promoSociale(channel) {
  try {
    const voci = knowledge.list(channel).filter((k) =>
      k.fonte === 'auto' && /https?:\/\//.test(k.risposta) &&
      /(youtube|instagram|tiktok|discord|telegram|twitter|(^|[^a-z])x([^a-z]|$)|kick|facebook|spotify)/i.test(k.domanda + ' ' + k.risposta));
    if (!voci.length) return null;
    // evita di ripetere l'ultima usata
    const disponibili = voci.filter((v) => v.domanda !== ultimoSocial.get(channel));
    const v = scegli(disponibili.length ? disponibili : voci);
    ultimoSocial.set(channel, v.domanda);
    // la risposta della voce spesso contiene già una frase + link: la usiamo,
    // altrimenti componiamo con un'apertura calda.
    const url = (v.risposta.match(/https?:\/\/\S+/) || [])[0];
    if (!url) return null;
    return /https?:\/\//.test(v.risposta) && v.risposta.length > url.length + 3
      ? v.risposta
      : `${scegli(APERTURE)} ${url}`;
  } catch { return null; }
}

// --------------------------------------------------------- comando !social
// Elenco DETERMINISTICO e immediato di tutti i social del canale (a differenza
// della promo proattiva che ne pesca uno solo, a caso, e a tempo). I link sono
// quelli imparati dal profilo del sito + quelli aggiunti a mano alla conoscenza.
const PIATTAFORME = [
  [/youtube\.com|youtu\.be/i, 'YouTube'],
  [/instagram\.com|instagr\.am/i, 'Instagram'],
  [/tiktok\.com/i, 'TikTok'],
  [/discord\.(gg|com)/i, 'Discord'],
  [/(^|\/\/)(t\.me)|telegram\.(me|org)/i, 'Telegram'],
  [/twitch\.tv/i, 'Twitch'],
  [/kick\.com/i, 'Kick'],
  [/twitter\.com|(^|\/\/)x\.com/i, 'X'],
  [/facebook\.com|fb\.com/i, 'Facebook'],
  [/spotify\.com/i, 'Spotify'],
];
function nomePiattaforma(url) {
  for (const [re, nome] of PIATTAFORME) if (re.test(url)) return nome;
  return null;
}
// Ritorna una riga "🔗 Social: YouTube <url> · TikTok <url> · …" o null se
// non c'è nessun social conosciuto per il canale.
export function elencoSocial(channel) {
  try {
    const parti = [];
    const visti = new Set();
    for (const k of knowledge.list(channel)) {
      const testo = String(k?.risposta || '');
      for (const url of testo.match(/https?:\/\/\S+/g) || []) {
        const pulito = url.replace(/[),.;]+$/, '');            // togli punteggiatura finale
        const nome = nomePiattaforma(pulito);
        if (!nome || visti.has(nome)) continue;                // solo social noti, uno per piattaforma
        visti.add(nome);
        parti.push(`${nome}: ${pulito}`);
      }
    }
    if (!parti.length) return null;
    return '🔗 Social: ' + parti.join(' · ');
  } catch { return null; }
}
