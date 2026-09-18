// «NON LO SO» NON E' «NO», e deve restare vero in tutti e tre gli strati.
//
// E' l'invariante che tiene in piedi il gestore dei ruoli. Se si rompe in UNO
// solo dei tre posti, il risultato e' lo stesso: un momento di silenzio di
// Twitch diventa un giro che spoglia il server. E si rompe in silenzio — il
// codice continua a funzionare, i ruoli spariscono e basta.
//
// Qui si guarda il sorgente perche' quello che conta non e' il valore di
// ritorno di una chiamata andata bene: e' cosa si torna quando va MALE. Una
// prova che finge Twitch proverebbe il caso buono; questa fissa il caso cattivo
// dove e' scritto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const HELIX = leggi('src/twitch/helix.js');
const GIRO = leggi('src/features/discord-giro.js');
const BOT = leggi('src/bot.js');

const corpoDi = (testo, nome) => {
  const i = testo.indexOf(nome);
  assert.ok(i > 0, `manca ${nome}`);
  const resto = testo.slice(i);
  const fine = resto.indexOf('\n  }\n');
  return resto.slice(0, fine > 0 ? fine : 2000);
};

test('quando Twitch non risponde, lo strato di Twitch dice «non lo so»', () => {
  for (const nome of ['async getVips(channelLogin)', 'async abbonati(channelLogin', 'async seguono(channelLogin']) {
    const corpo = corpoDi(HELIX, nome);
    assert.match(corpo, /catch[^}]*return null;/s, `${nome}: un guasto deve tornare null, non un elenco vuoto`);
    assert.ok(!/catch[^}]*return \[\];/s.test(corpo), `${nome}: torna [] su errore, e [] vuol dire «non c'e' nessuno»`);
  }
});

test('e chi non ha nemmeno un id da chiedere non inventa una risposta', () => {
  for (const nome of ['async getVips(channelLogin)', 'async abbonati(channelLogin', 'async seguono(channelLogin']) {
    const corpo = corpoDi(HELIX, nome);
    assert.match(corpo, /if \(!s\?\.user_id\) return null;/, `${nome}: senza canale la risposta e' «non lo so»`);
  }
});

test('nella fotografia un fatto che non sappiamo non c\'e\' proprio', () => {
  const corpo = corpoDi(HELIX, 'async ruoliDi(channelLogin');
  // la forma e' sempre «chiedo, e SOLO se ho una risposta metto la chiave»
  for (const [chiave, fonte] of [['mod', 'mods'], ['vip', 'vip'], ['sub', 'sub'], ['follower', 'seg']]) {
    assert.match(corpo, new RegExp(`if \\(${fonte}\\) foto\\.${chiave} =`),
      `${chiave}: la chiave si mette solo se la risposta c'è`);
  }
  assert.ok(!/foto\.\w+ = new Set\(\);/.test(corpo), 'un insieme vuoto messo «per sicurezza» direbbe «nessuno di loro»');
});

test('e nel giro una condizione che non so valutare non e\' una regola', () => {
  assert.match(GIRO, /const DA_TWITCH = \['follower', 'sub', 'vip', 'mod'\];/);
  assert.match(GIRO, /export const sappiamo = \(tipo, dati\) => \(DA_TWITCH\.includes\(tipo\) \? \(dati \|\| \{\}\)\[tipo\] !== undefined : true\);/,
    'i quattro fatti di Twitch si sanno o non si sanno; monete, ore, serie e dirette sono sempre noti');
  assert.match(GIRO, /const mie = regole\.filter\(\(r\) => sappiamo\(r\.tipo, dati\)\);/,
    'si filtra PRIMA di fare la differenza: se la regola resta dentro, il suo ruolo diventa togliibile');
  assert.match(GIRO, /differenza\(\{ regole: mie,/, 'e la differenza si fa su quelle filtrate, non su tutte');
});

test('la fotografia la fa chi parla con Twitch, non il giro', () => {
  const importa = GIRO.split('\n').filter((r) => r.startsWith('import ')).join('\n');
  assert.ok(!/twitch|helix/i.test(importa),
    `il giro non deve tirarsi dentro Twitch: la fotografia gli arriva da fuori\n${importa}`);
  assert.match(GIRO, /quadro \? await quadro\(gente\) : \{\}/, 'e se non gliela danno, non se la va a prendere');
  assert.match(BOT, /dcGiro\.giroTutti\(\{ quadro: \(canale, gente\) => this\.helix\.ruoliDi\(canale, gente\) \}\)/,
    'ed e\' il bot a mettere insieme i due mondi');
});

test('la prova non scrive, e non si segna come giro fatto', () => {
  assert.match(GIRO, /if \(prova\) \{ esito\[conta\]\+\+; continue; \}/, 'conta cosa farebbe');
  assert.match(GIRO, /if \(!prova\) dcRuoli\.esito\(ch, e\);/, 'ma non lascia scritto che il giro e\' passato');
});

test('il giro si ferma quando Discord chiede una lunga attesa', () => {
  assert.match(GIRO, /if \(x\.attesa\) \{ fermo = true; break; \}/, 'non si insiste contro un limite dichiarato');
  assert.match(GIRO, /if \(m\.attesa\) break;/, 'nemmeno in lettura');
});
