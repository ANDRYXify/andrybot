// DUE SEZIONI DISTINTE, UN GIRO SOLO.
//
// Un avviso e' il prodotto di CHI va in diretta per DOVE deve arrivare. Le due
// cose sono indipendenti, e il difetto da cui nasce questa prova e' che erano
// state incollate: il giro che scopre le dirette degli amici apparteneva a
// Telegram, e cominciava chiedendo il token di Telegram. Chi ha solo Discord
// non aveva il giro spento — non ce l'aveva proprio, e nessun errore lo diceva.
//
// Quindi: il giro e' UNO (chiedere a Twitch due volte come sta lo stesso canale
// e' il doppio delle chiamate per la stessa risposta), ma le due sezioni
// restano distinte e ognuna funziona senza l'altra:
//
//  · Discord ha le SUE destinazioni, coi suoi filtri, il suo testo, il suo ruolo
//    da menzionare — non una configurazione sola come prima;
//  · «annuncia anche la community» e' per trasporto: accenderla su Discord non
//    deve far partire gli annunci nel gruppo Telegram;
//  · la lista di chi guardare e' condivisa, e si vede da tutte e due.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');

test('il giro degli amici non chiede piu\' il token di Telegram per partire', () => {
  const bot = leggi('src/bot.js');
  const giro = bot.slice(bot.indexOf('async _giroAmici()'));
  const corpo = giro.slice(0, giro.indexOf('\n  _haDoveAvvisare('));
  assert.ok(corpo.length > 200, 'non trovo il corpo del giro');
  assert.ok(!/if \(!conf\?\.attivo \|\| !conf\.token\) continue/.test(corpo),
    'il giro riparte a chiedere il token di Telegram: chi ha solo Discord non guarda nessuno');
  assert.match(corpo, /_haDoveAvvisare\(ch\)/,
    'il giro deve partire se c\'e\' una destinazione QUALSIASI, non un trasporto preciso');
});

test('chi ha solo Discord ha comunque dove far arrivare gli avvisi', () => {
  const bot = leggi('src/bot.js');
  const f = bot.slice(bot.indexOf('_haDoveAvvisare(login) {'));
  const corpo = f.slice(0, f.indexOf('\n  }'));
  assert.match(corpo, /tgDest\.lista\(login\)/, 'non guarda le destinazioni Telegram');
  assert.match(corpo, /dcDest\.lista\(login\)/, 'non guarda le destinazioni Discord');
});

test('un avviso passa da un punto solo, e serve tutti e due i trasporti', () => {
  const bot = leggi('src/bot.js');
  const f = bot.slice(bot.indexOf('async _diffondi(login, evento, chi, d,'));
  const corpo = f.slice(0, f.indexOf('\n  }'));
  assert.match(corpo, /_diffondiTelegram\(/, 'il punto unico non serve Telegram');
  assert.match(corpo, /_diffondiDiscord\(/, 'il punto unico non serve Discord');
  // e chi scopre la notizia non parla piu' a un trasporto per conto suo
  const quanti = (re) => (bot.match(re) || []).length;
  assert.equal(quanti(/this\._diffondiTelegram\(/g), 1,
    'qualcuno chiama Telegram scavalcando il punto unico: quel qualcuno non arrivera\' mai su Discord');
});

test('«anche la community» si accende per trasporto, non per tutti insieme', () => {
  const db = leggi('src/db.js');
  const f = db.slice(db.indexOf('export const avvisiConf = {'));
  const corpo = f.slice(0, f.indexOf('\n};'));
  assert.match(corpo, /telegram:/, 'manca la levetta di Telegram');
  assert.match(corpo, /discord:/, 'manca la levetta di Discord');
  // e chi l'aveva accesa su Telegram se la ritrova accesa
  assert.match(corpo, /community_live/, 'la vecchia levetta di Telegram non fa piu\' da ripiego');

  const bot = leggi('src/bot.js');
  const d = bot.slice(bot.indexOf('async _diffondi(login, evento, chi, d,'));
  const corpo2 = d.slice(0, d.indexOf('\n  }'));
  assert.match(corpo2, /fonteDi\(login, altrui\) === 'community'/,
    'non si distingue chi arriva dalla community da chi hai aggiunto a mano');
  assert.match(corpo2, /ammesso\.telegram/, 'Telegram non rispetta la sua levetta');
  assert.match(corpo2, /ammesso\.discord/, 'Discord non rispetta la sua levetta');
});

test('Discord ha le sue destinazioni, con testo e ruolo per ognuna', () => {
  const db = leggi('src/db.js');
  assert.match(db, /CREATE TABLE IF NOT EXISTS discord_dest/, 'manca la tabella delle destinazioni Discord');
  for (const campo of ['canale', 'eventi', 'streamer', 'messaggio', 'ruolo', 'chiudi', 'attivo']) {
    assert.match(db, new RegExp(`^\\s*${campo} `, 'm'), `la destinazione Discord non sa niente di «${campo}»`);
  }
  const f = db.slice(db.indexOf('export const dcDest = {'));
  const corpo = f.slice(0, f.indexOf('\n};'));
  for (const m of ['lista', 'get', 'perEvento', 'aggiungi', 'aggiorna', 'rimuovi', 'setMsgId', 'migra']) {
    assert.ok(corpo.includes(`  ${m}(`), `dcDest non sa fare «${m}» come la sua gemella tgDest`);
  }
});

test('chi aveva gia\' un canale acceso non deve rifare niente', () => {
  const db = leggi('src/db.js');
  const f = db.slice(db.indexOf('export const dcDest = {'));
  const migra = f.slice(f.indexOf('  migra(channel, conf) {'));
  const corpo = migra.slice(0, migra.indexOf('\n  },'));
  assert.match(corpo, /if \(n > 0\) return;/, 'la migrazione non e\' idempotente: gira due volte e duplica');
  assert.match(corpo, /conf\.canale/, 'il vecchio canale unico non diventa la prima destinazione');
});

test('la menzione non sveglia mai piu\' gente di quella scelta', () => {
  const dc = leggi('src/features/discord.js');
  const f = dc.slice(dc.indexOf('export async function diffondi('));
  const corpo = f.slice(0, f.indexOf('\n}'));
  assert.match(corpo, /allowed_mentions: ruolo \? \{ roles: \[ruolo\] \} : \{ parse: \[\] \}/,
    'un @everyone scritto per sbaglio nel testo sveglierebbe tutto il server');
});

test('un avviso si chiude riscrivendolo, mai cancellandolo', () => {
  // Il bot TIENE «pulire» (MANAGE_MESSAGES) per poterlo passare al ruolo
  // Moderatori: con quello in mano, DELETE su un messaggio cancella quello di
  // chiunque. Riscrivere invece Discord lo permette solo su cio' che ha scritto
  // il bot — la stessa chiamata puntata altrove non fa niente.
  const api = leggi('src/features/discord-api.js');
  assert.match(api, /PRIVILEGI = Object\.freeze\(\{[\s\S]*?pulire:/, 'il privilegio che rende pericoloso il DELETE non c\'e\' piu\': ricontrolla il ragionamento');
  // nessuna chiamata a Discord che cancelli un messaggio, in nessun file nostro
  for (const f of ['src/features/discord-api.js', 'src/features/discord.js', 'src/bot.js']) {
    const codice = leggi(f).replace(/^\s*\/\/.*$/gm, '');
    assert.ok(!/\/messages\/[^'"`\n]*`,\s*\{\s*metodo: 'DELETE'/.test(codice),
      `${f}: e' tornata la porta che cancella i messaggi altrui`);
    assert.ok(!/\/messages\/[\s\S]{0,60}method: 'DELETE'/.test(codice),
      `${f}: un messaggio si cancella ancora, invece di riscriversi`);
  }
  assert.match(api, /export async function modificaMessaggio\(/, 'manca la strada sicura: riscrivere');

  const dc = leggi('src/features/discord.js');
  assert.match(dc, /export async function chiudiMessaggio\(/, 'manca la chiusura dell\'avviso');
  const f = dc.slice(dc.indexOf('export async function chiudiMessaggio('));
  const corpo = f.slice(0, f.indexOf('\n}'));
  assert.ok(!/method: 'DELETE'/.test(corpo), 'il webhook torna a cancellare invece di riscrivere');
  assert.match(corpo, /method: 'PATCH'/, 'il webhook deve riscrivere il suo messaggio');
});

test('l\'avviso si toglie dove era stato messo, e solo quello dello streamer giusto', () => {
  const bot = leggi('src/bot.js');
  const f = bot.slice(bot.indexOf('async _chiudiLiveEsterna(login, chi) {'));
  const corpo = f.slice(0, f.indexOf('\n  }'));
  assert.match(corpo, /tgMsg\.perStreamer\(login, chi\)/, 'non chiude l\'avviso su Telegram');
  assert.match(corpo, /dcMsg\.perStreamer\(login, chi\)/, 'non chiude l\'avviso su Discord');
});
