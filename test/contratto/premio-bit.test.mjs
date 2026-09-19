// IL SILENZIO DI TWITCH NON E' UN MESE SENZA RE.
//
// Il premio periodico si segna la data dell'ultimo giro: e' quella che impedisce
// di premiare due volte nello stesso mese. Se la si scrivesse anche quando la
// classifica dei Bit non e' arrivata, un permesso mancante o un minuto storto di
// Twitch cancellerebbe il premio di quel mese — in silenzio, senza errori,
// senza che nessuno possa accorgersene fino al mese dopo.
//
// Qui si guarda il sorgente perche' quello che conta non e' il giro andato bene:
// e' l'ORDINE fra il controllo e la scrittura.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const BOT = leggi('src/bot.js');
const giro = BOT.slice(BOT.indexOf('async _controllaPremi()'), BOT.indexOf('async _tickWatchtime()'));

test('la classifica dei Bit si chiede a chi la tiene, col periodo che ha scelto lo streamer', () => {
  assert.match(giro, /bit\.classifica\(this\.helix, login, \{ periodo: mese \? 'month' : 'week' \}\)/);
});

test('e finche\' non si sa, il periodo resta da premiare', () => {
  const stop = giro.indexOf('if (!righe) continue;');
  const segno = giro.indexOf('premioVipUltimo: Date.now()');
  assert.ok(stop > 0, 'manca l\'uscita quando la classifica non c\'è');
  assert.ok(segno > stop, 'il giro si segna come fatto DOPO aver saputo, mai prima');
  assert.equal((giro.match(/premioVipUltimo: Date\.now\(\)/g) || []).length, 1,
    'una sola scrittura: due strade che si segnano da sole si scollano al primo cambio');
});

test('il re si ricorda solo quando il premio e\' quello dei Bit', () => {
  assert.match(giro, /\.\.\.\(p\.da === 'bit' \? \{ reBit: re \} : \{\}\)/,
    'un premio a monete non deve toccare un re che non ha incoronato lui');
});

test('la corona viaggia col messaggio, in tutt\'e due le chat', () => {
  const A = leggi('src/features/alerts.js');
  assert.equal((A.match(/corona: portaCorona\(channel, msg\.user, piattaformaDi\(msg\)\)/g) || []).length, 2,
    'quella a schermo e quella dello Studio sono la stessa chat: se la corona sta in una sola, le due si contraddicono');
});

test('e a schermo e\' disegnata, non scritta', () => {
  const O = leggi('src/web/public/overlay-app.js');
  assert.match(O, /if \(ev\.corona\) disegna\(riga, CORONA, 'chat-corona'\);/);
  assert.ok(!/[\u{1F300}-\u{1FAFF}]/u.test(O.slice(O.indexOf('const CORONA'), O.indexOf('const CORONA') + 400)),
    'un\'emoji cambia faccia a ogni sistema, e in una grafica in onda sarebbe l\'unica cosa non nostra');
});
