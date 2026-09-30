// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// GLI AVVISI SU DISCORD CHIEDONO IL PIANO BASE, E LO DICONO.
//
// Gli avvisi veri partono solo col pacchetto «notifiche» (bot.js). La «Prova»
// della scheda Avvisi invece partiva per tutti: faceva vedere un avviso che poi
// non sarebbe mai arrivato. E la scheda non diceva niente del piano. Qui: la
// prova chiede lo stesso piano, e l'etichetta del suo rifiuto e' la stessa che
// la scheda mostra sopra i canali. Il calendario resta di tutti i piani, quindi
// la scheda non si chiude intera.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leggi = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const SRV = leggi('src/web/server.js');
const APP = leggi('src/web/public/app.js');
const BOT = leggi('src/bot.js');

const corpo = (testo, nome) => {
  const i = testo.search(new RegExp(`(async )?function ${nome}\\(`));
  assert.ok(i >= 0, `c'e' ${nome}`);
  return testo.slice(i, testo.indexOf('\n}\n', i));
};

test('gli avvisi veri chiedono il pacchetto «notifiche»', () => {
  const i = BOT.indexOf('async annunciaDiretta(d)');
  assert.ok(i >= 0);
  assert.match(BOT.slice(i, i + 400), /if \(!canaleHa\(login, 'notifiche'\)\) return/);
});

test('la «Prova» degli avvisi Discord chiede lo stesso piano, con la stessa etichetta della scheda', () => {
  const m = SRV.match(/app\.post\('\/api\/streamer\/discord\/avvisi\/:id\/prova', requireOwner, gateFeature\('notifiche', '([^']+)'\)/);
  assert.ok(m, 'la prova passa dal cancello del piano');
  const scheda = corpo(APP, 'pannelloDcAvvisi');
  assert.ok(scheda.includes(`\${muroPacchetto('notifiche', L('${m[1]}',`), `la scheda dice «${m[1]} non è nel tuo piano» con le stesse parole`);
});

test('la scheda dice che gli avvisi partono col Base, e resta aperta per il calendario', () => {
  const scheda = corpo(APP, 'pannelloDcAvvisi');
  assert.ok(scheda.includes('Gli avvisi partono col piano Base'));
  const f = APP.slice(APP.indexOf('const SCHEDA_FUNZ = {'), APP.indexOf('};', APP.indexOf('const SCHEDA_FUNZ = {')));
  assert.ok(!/dcavvisi:/.test(f), 'chiuderla intera spegnerebbe anche il calendario, che è di tutti i piani');
});
