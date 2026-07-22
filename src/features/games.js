// Minigiochi in chat + monete (punti fedeltà) + promo social proattiva.
// Tutto procedurale e leggero. Disattivabile per canale (settings.giochi).
//
// Comandi: !dado [NdM] · !moneta · !8ball <domanda> · !slot · !duello @tizio
//          · !trivia · !classifica · !monete · !giochi
import { points, streamers, knowledge } from '../db.js';
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

// --------------------------------------------------------- monete: accredito passivo
// Chi chatta guadagna qualche moneta (throttle 60s per persona).
export function accredita(msg) {
  try {
    if (!msg || msg.isSelf) return;
    const u = String(msg.user || '').toLowerCase();
    if (!u || u.startsWith('[')) return;
    if (!attivi(msg.channel)) return;
    const k = msg.channel + '|' + u;
    if (Date.now() - (ultimoAccredito.get(k) || 0) < 60_000) return;
    ultimoAccredito.set(k, Date.now());
    points.add(msg.channel, u, 2);
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
const triviaRound = new Map();   // channel → { answers:[], scadenza, question }

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

// --------------------------------------------------------- comando principale
// Ritorna true se il messaggio era un comando/azione di gioco (gestito).
export function tryGame(msg, say) {
  try {
    if (!msg || msg.isSelf) return false;
    const channel = msg.channel;
    if (!attivi(channel)) return false;
    const nome = msg.display || msg.user;
    const moneta = () => nomeMoneta(channel);

    // risposta a una trivia in corso (messaggio normale, non comando)
    const round = triviaRound.get(channel);
    if (round) {
      if (Date.now() > round.scadenza) { triviaRound.delete(channel); }
      else if (!String(msg.text).startsWith('!')) {
        const risposta = norm(msg.text);
        if (round.answers.some((a) => risposta === a || risposta.split(' ').includes(a))) {
          triviaRound.delete(channel);
          const premio = 25;
          points.add(channel, msg.user, premio);
          say(`🧠 Esatto ${nome}! La risposta era "${round.answers[0]}". +${premio} ${moneta()}!`);
          return true;
        }
      }
    }

    const testo = String(msg.text || '').trim();
    if (!testo.startsWith('!')) return false;
    const parti = testo.slice(1).split(/\s+/);
    const cmd = (parti.shift() || '').toLowerCase();
    const args = parti;

    switch (cmd) {
      case 'giochi':
        say('🎮 Giochi: !dado, !moneta, !8ball, !slot, !duello @nome, !trivia, !classifica, !monete');
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
        const top = points.top(channel, 5);
        if (!top.length) { say(`Nessuno ha ancora ${moneta()}: chattate e giocate! 🎮`); return true; }
        const riga = top.map((r, i) => `${['🥇', '🥈', '🥉', '4°', '5°'][i]} ${r.user} (${r.monete})`).join('  ');
        say(`🏆 Classifica ${moneta()}: ${riga}`);
        return true;
      }

      case 'slot': {
        if (inCooldown(channel + '|slot|' + msg.user, 5000)) return true;
        const costo = 10;
        if (points.get(channel, msg.user) < costo) { say(`🎰 Ti servono ${costo} ${moneta()} per giocare, ${nome}. Chatta un po' e torna!`); return true; }
        points.add(channel, msg.user, -costo);
        const r = [scegli(SLOT_SIMBOLI), scegli(SLOT_SIMBOLI), scegli(SLOT_SIMBOLI)];
        let vincita = 0, msgWin = '';
        if (r[0] === r[1] && r[1] === r[2]) { vincita = r[0] === '💎' ? 200 : r[0] === '7️⃣' ? 150 : 80; msgWin = ' JACKPOT!! 🎉'; }
        else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) { vincita = 20; msgWin = ' bella coppia!'; }
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
        const premio = 15;
        points.add(channel, vince ? msg.user : sfidato, premio);
        say('⚔️ ' + scegli(DUELLO_ESITI).replace('{a}', a).replace('{b}', b) + ` (+${premio} ${moneta()})`);
        return true;
      }

      case 'trivia':
      case 'quiz': {
        if (triviaRound.has(channel)) { say('🧠 C\'è già una domanda in corso, rispondete!'); return true; }
        if (inCooldown(channel + '|trivia', 15000)) return true;
        const d = scegli(BANCA_TRIVIA);
        triviaRound.set(channel, { answers: d.a.map(norm), scadenza: Date.now() + 45000, question: d.q });
        say(`🧠 TRIVIA: ${d.q} — rispondete in chat! (45s)`);
        // pulizia automatica se nessuno risponde
        setTimeout(() => {
          const r = triviaRound.get(channel);
          if (r && r.question === d.q) { triviaRound.delete(channel); try { say(`⏰ Tempo scaduto! La risposta era "${d.a[0]}".`); } catch { /* niente */ } }
        }, 46000).unref?.();
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
