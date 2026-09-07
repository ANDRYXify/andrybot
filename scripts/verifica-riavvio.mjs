// Cancello del RIAVVIO: cosa deve sopravvivere a una pubblicazione.
//
// Un deploy dura un secondo, una diretta dura ore. Il processo muore, la diretta
// no — e tutto quello che un motore teneva acceso dentro una Map spariva. Non e'
// un difetto di un file: e' una CLASSE di difetti, ed e' saltata fuori quattro
// volte di fila (i moduli a tempo, il giveaway, le penitenze, la serranda dello
// scudo). La quinta volta non deve doverla trovare qualcuno per caso.
//
// Come si decide. Una cosa RESTA se perderla toglie a una persona qualcosa che
// si era gia' guadagnata, oppure lascia il mondo cambiato senza piu' nessuno che
// sappia rimetterlo a posto. Tutto il resto e' VOLATILE — cache, connessioni,
// finestre di pochi secondi, cooldown — e lo si scrive col suo perche'.
//
// Cosa misura. L'inventario si legge dal CODICE: ogni stato vivo dichiarato in
// src/ (una Map o un Set di modulo, un this.x di un motore). Il verdetto sta
// qui sotto. Rosso se: uno stato nuovo compare senza che nessuno abbia deciso;
// una voce dell'elenco non esiste piu'; oppure qualcosa dichiarato «resta» sta
// in un file che non sa nemmeno cos'e' `statoVivo`.
//
// Cosi' l'elenco non e' una copia del codice che invecchia: il codice dice cosa
// c'e', l'elenco dice solo cosa ne abbiamo deciso.
//
// Uso: node scripts/verifica-riavvio.mjs
//      node scripts/verifica-riavvio.mjs --selftest   (deve diventare rosso)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.join(QUI, '..');
const SELFTEST = process.argv.includes('--selftest');

// verdetto: 'resta' (ha una casa nel database) | 'volatile' (muore col processo, e va bene)
const DECISO = [
  ['features/giveaway.js', 'attivi', 'resta', 'i biglietti sono una cosa che qualcuno si e\' guadagnato scrivendo !join'],
  ['features/penitenze.js', 'attive', 'resta', 'il premio a punti canale e\' gia\' stato pagato: la sfida non puo\' sparire a meta\''],
  ['features/antibot.js', 'assetti', 'resta', 'la serranda: quello che il bot ha chiuso su Twitch va riaperto, il livello di allarme no'],
  ['features/antibot.js', 'ritmi', 'resta', 'il ritmo del canale si impara in trenta follow, e in memoria non ci arrivava mai'],

  ['features/antibot.js', 'listaEsterna', 'volatile', 'lista di bot conosciuti, si riscarica da sola'],
  ['features/antibot.js', 'finestre', 'volatile', 'finestra di trenta secondi: dopo un riavvio la raffica si rivede subito'],
  ['features/antibot.js', 'raffiche', 'volatile', 'idem, e l\'allarme si rialza da solo se l\'attacco continua'],
  ['features/antibot.js', 'nascita', 'volatile', 'eta\' degli account gia\' chiesta a Twitch: si richiede'],
  ['features/antibot.js', 'registriMem', 'volatile', 'la coda recente di un registro gia\' scritto su disco a parte'],
  ['features/antibot.js', 'finestreLunghe', 'volatile', 'dieci minuti di gocciolamento: si riempie di nuovo da sola'],
  ['features/antibot.js', 'cori', 'volatile', 'messaggi uguali in pochi secondi'],
  ['features/antibot.js', 'ondate', 'volatile', 'ondata in corso, misurata su una finestra corta'],
  ['features/antibot.js', 'code', 'volatile', 'ban in attesa: un ban deciso su prove di dieci minuti fa e\' peggio di un ban non dato'],
  ['features/rete.js', 'nomi', 'volatile', 'la lista che i canali hanno costruito insieme: sta su disco a parte e si riprende all\'avvio'],
  ['features/rete.js', 'quote', 'volatile', 'quanto un canale ha gia\' aggiunto oggi: un tetto giornaliero che riparte, e va bene'],
  ['features/punteggio.js', 'visti', 'volatile', 'chi e\' in chat e in quanti canali: si ricostruisce da solo al primo giro, cioe\' in cinque minuti'],
  ['features/antispam.js', 'recenti', 'volatile', 'ultimi messaggi per rilevare flood, finestra di quaranta secondi'],
  ['features/antispam.js', 'reati', 'volatile', 'la recidivita\' decade da sola dopo dieci minuti'],
  ['features/badges.js', 'cacheTw', 'volatile', 'cache dei badge'],
  ['features/badges.js', 'cache7', 'volatile', 'cache dei badge 7TV'],
  ['features/cartalive.js', '_facce', 'volatile', 'cache degli avatar'],
  ['features/cartalive.js', '_cercati', 'volatile', 'cache delle facce cercate su Helix'],
  ['features/clips.js', '_inCorso', 'volatile', 'clip gia\' in volo: al riavvio nessuna e\' in volo'],
  ['features/clips.js', '_buf', 'volatile', 'ritmo recente della chat, finestra corta'],
  ['features/clips.js', '_boost', 'volatile', 'evento recente che alza la soglia'],
  ['features/effects.js', '_clients', 'volatile', 'connessioni SSE aperte: muoiono col processo per forza'],
  ['features/effects.js', '_trkClients', 'volatile', 'idem, overlay del tracking'],
  ['features/effects.js', '_cooldown', 'volatile', 'perderlo vale un effetto in piu\' subito dopo un deploy; scriverlo costa a ogni comando'],
  ['features/emotes.js', 'cacheCanale', 'volatile', 'cache delle emote'],
  ['features/games.js', 'cooldowns', 'volatile', 'come sopra: un giro in piu\', non un danno'],
  ['features/games.js', 'ultimoAccredito', 'volatile', 'anti-doppione a finestra corta'],
  ['features/games.js', 'attiviGiro', 'volatile', 'chi ha scritto in questo giro di watchtime'],
  ['features/games.js', 'fermiDa', 'volatile', 'da quanti giri uno e\' fermo'],
  ['features/games.js', 'ruoliVisti', 'volatile', 'ruoli visti passare in chat, si rivedono al messaggio dopo'],
  ['features/games.js', 'visti', 'volatile', 'chi e\' passato di recente'],
  ['features/games.js', 'roundAttivo', 'volatile', 'una manche dura meno di un minuto e il premio si paga alla risposta, non alla fine'],
  ['features/modules.js', '_cooldown', 'volatile', 'un modulo in piu\' subito dopo un deploy'],
  ['features/modules.js', '_cooldownUtente', 'volatile', 'idem, per persona'],
  ['features/modules.js', '_streamCache', 'volatile', 'stato live con cache di trenta secondi'],
  ['features/modules.js', '_inCoda', 'volatile', 'la fila dei timer scaduti; l\'ora dell\'ultimo giro invece sta nel database'],
  ['features/personalizzati.js', 'cache', 'volatile', 'cache dei comandi, con revisione'],
  ['features/plugins.js', '_handlers', 'volatile', 'funzioni registrate all\'avvio'],
  ['features/ruoli.js', 'chiesto', 'volatile', 'anti-ripetizione di una domanda a Helix'],
  ['features/songrequest.js', 'inSospeso', 'volatile', 'richieste in attesa di conferma, vita di pochi secondi'],
  ['features/spotify.js', 'battiti', 'volatile', 'battito del polling'],
  ['features/studio.js', 'sessioni', 'volatile', 'sessioni di trasmissione: sono connessioni, muoiono col processo'],
  ['features/trackinggiochi.js', '_ultimoSfida', 'volatile', 'anti-spam di !sfida, finestra corta'],
  ['bot.js', 'units', 'volatile', 'connessioni chat: si riaprono all\'avvio'],
  ['bot.js', '_chatKO', 'volatile', 'chi ha la chat scollegata: si riscopre al primo tentativo'],
  ['bot.js', 'listeners', 'volatile', 'ascolto audio: e\' una connessione'],
  ['bot.js', '_liveState', 'volatile', 'chi e\' in diretta adesso: si richiede a Twitch'],
  ['bot.js', '_tiktokLive', 'volatile', 'stato TikTok, si richiede'],
  ['bot.js', '_tiktokUltima', 'volatile', 'anti-doppione a breve; il post gia\' annunciato sta nel database'],
  ['bot.js', '_ytId', 'volatile', 'cache dell\'id canale YouTube'],
  ['bot.js', '_mancheProx', 'volatile', 'quando tocca alla prossima manche: si ricalcola'],
  ['bot.js', '_tgProattivoUltimo', 'volatile', 'ultimo messaggio proattivo, anti-ripetizione a breve'],
  ['db.js', '_revComandi', 'volatile', 'numero di revisione per invalidare una cache'],
  ['segreti.js', '_maestre', 'volatile', 'chiavi maestre tenute in memoria, mai su disco: e\' il punto'],
];

function stati() {
  const out = [];
  const guarda = (dir) => {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) continue;
      if (!f.endsWith('.js')) continue;
      const rel = path.relative(path.join(RADICE, 'src'), p);
      fs.readFileSync(p, 'utf8').split('\n').forEach((r) => {
        let m = r.match(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*new (?:Map|Set)\(/);
        let dentro = false;
        if (!m) { m = r.match(/^\s{2,8}this\.([A-Za-z_$][\w$]*)\s*=\s*new (?:Map|Set)\(/); dentro = !!m; }
        if (!m) return;
        if (!dentro && /^[A-Z0-9_]+$/.test(m[1])) return;
        out.push({ file: rel.split(path.sep).join('/'), nome: m[1] });
      });
    }
  };
  guarda(path.join(RADICE, 'src'));
  guarda(path.join(RADICE, 'src', 'features'));
  return out;
}

const trovati = stati();
if (SELFTEST) trovati.push({ file: 'features/prova-nuova.js', nome: 'unaCosaViva' });

const mappa = new Map(DECISO.map((d) => [d[0] + '|' + d[1], d]));
const senzaDecisione = trovati.filter((x) => !mappa.has(x.file + '|' + x.nome));
const chiavi = new Set(trovati.map((x) => x.file + '|' + x.nome));
const fantasmi = DECISO.filter((d) => !chiavi.has(d[0] + '|' + d[1]));

const senzaCasa = [];
for (const d of DECISO) {
  if (d[2] !== 'resta') continue;
  const p = path.join(RADICE, 'src', d[0]);
  if (!fs.existsSync(p)) continue;
  if (!/statoVivo/.test(fs.readFileSync(p, 'utf8'))) senzaCasa.push(d);
}
const senzaPerche = DECISO.filter((d) => !d[3] || String(d[3]).trim().length < 12);

const esiti = [];
const dice = (ok, msg, extra = '') => { esiti.push(ok); console.log(`  ${ok ? '✓' : '✗'} ${msg}${!ok && extra ? `  → ${extra}` : ''}`); };

const quantiRestano = DECISO.filter((d) => d[2] === 'resta').length;
console.log(`\n${trovati.length} stati vivi in src/: ${quantiRestano} devono sopravvivere a un riavvio, gli altri no.\n`);
dice(!senzaDecisione.length, 'ogni stato vivo ha un verdetto: nessuno e\' comparso di nascosto',
  senzaDecisione.slice(0, 6).map((x) => `${x.file}:${x.nome}`).join(' · '));
dice(!fantasmi.length, 'e nell\'elenco non restano voci di roba che non esiste piu\'',
  fantasmi.slice(0, 6).map((d) => `${d[0]}:${d[1]}`).join(' · '));
dice(!senzaCasa.length, 'chi deve sopravvivere ha una casa fuori dal processo',
  senzaCasa.map((d) => `${d[0]}:${d[1]} non conosce statoVivo`).join(' · '));
dice(!senzaPerche.length, 'e ogni verdetto dice il suo perche\'',
  senzaPerche.slice(0, 4).map((d) => `${d[0]}:${d[1]}`).join(' · '));

const rossi = esiti.filter((x) => !x).length;
if (SELFTEST) {
  if (rossi) { console.log('\nAutoprova: uno stato vivo nuovo senza verdetto si vede. ✓\n'); process.exit(0); }
  console.log('\nAutoprova FALLITA: il cancello non vede uno stato nuovo.\n');
  process.exit(1);
}
console.log(rossi ? '\ncancello ROSSO ✗\n' : '\nQuello che deve sopravvivere a una pubblicazione, sopravvive. ✓\n');
process.exit(rossi ? 1 : 0);
