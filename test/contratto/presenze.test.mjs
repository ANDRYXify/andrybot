// LE PRESENZE DA FUORI: il bot le conta nello stesso giro delle ore, saluta al
// messaggio, risponde ai comandi del registro; il pannello le regola e le
// mostra; il manuale e la vetrina le raccontano.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { COMANDI, MODULI } from '../../src/features/comandi-registro.js';
import { MANUALI } from '../../src/web/manuali.js';
import { FUNZIONI_VETRINA } from '../../src/web/vetrina-vista.js';
const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');
const BOT = leggi('src/bot.js');
const APP = leggi('src/web/public/app.js');
const SRV = leggi('src/web/server.js');
const MOD = leggi('src/features/modules.js');

test('il bot: stesso giro delle ore, saluto al messaggio, comandi nel vaglio', () => {
  const tick = BOT.slice(BOT.indexOf('async _tickWatchtime() {'), BOT.indexOf('_prossimaManche(m) {'));
  assert.ok(tick.includes('presenze.giroDiretta(login, { streamId: stream.id, chatters })'), 'la lista di chi e\' in chat e\' la stessa, nessuna chiamata in piu\'');
  assert.ok(tick.includes('for (const t of presenze.annunciDi(login, esito)) this.say(login, t);'));
  const msg = BOT.slice(BOT.indexOf('_elaboraMessaggio(login, msg, onMessage, parla'), BOT.indexOf('const suo = personalizzati.suoComando(login, msg.text);'));
  assert.ok(msg.includes('presenze.suMessaggio(msg, parla, { live });'), 'il saluto sta sul messaggio, prima dei comandi');
  assert.ok(BOT.includes('try { presenze.tryComando(cmdMsg, parla); }'), 'i comandi passano dal vaglio (rinomini, spento, riservato)');
});

test('il registro: famiglia con il suo file, due comandi, e la demo li copre', () => {
  assert.equal(MODULI.presenze?.file, 'presenze.js');
  const ids = COMANDI.filter((c) => c.modulo === 'presenze').map((c) => c.id).sort();
  assert.deepEqual(ids, ['classificaserie', 'serie']);
  for (const id of ids) assert.ok(APP.includes(`{ id: "${id}", modulo: "presenze"`), `demo senza ${id}`);
  assert.ok(MOD.includes("serie: serieText,") && MOD.includes("recordserie: recordText,"), 'le variabili dei Moduli');
});

test('il pannello: la carta con i due testi, il salvataggio, la lista in Memoria; il server normalizza e risponde', () => {
  for (const id of ['pr-attivo', 'pr-bonus', 'pr-tetto', 'pr-annuncia', 'pr-saluti', 'pr-primaVolta', 'pr-bentornato', 'pr-giorni', 'pr-soloLive', 'btn-salva-presenze', 'lista-presenze']) {
    assert.ok(APP.includes(`id="${id}"`), `manca #${id}`);
  }
  assert.ok(APP.includes("await salvaImpostazioni({ presenze: {"));
  assert.ok(SRV.includes("if (b.presenze !== undefined) out.presenze = presenze.normalizza(b.presenze, s.settings?.presenze);"));
  assert.ok(SRV.includes("presenze: presenze.classifica(login, 5)"), 'la scheda Memoria legge dalle statistiche');
  assert.ok(APP.includes("presenze: [\n        { user: 'il_nonno', serie: 27"), 'la demo mostra chi c\'e\' sempre');
});

test('il manuale e la vetrina lo raccontano', () => {
  const testo = JSON.stringify(MANUALI);
  for (const parola of ['!serie', '!classificaserie', '$serie', '$dirette', '$recordserie', 'Presenze e saluti', "Chi c'è sempre", 'dieci minuti']) {
    assert.ok(testo.includes(parola), `il manuale non dice «${parola}»`);
  }
  const voci = FUNZIONI_VETRINA.flatMap((g) => g.voci);
  assert.ok(voci.some((v) => v.t[0] === 'Serie di presenze' && v.scheda === 'giochi'));
  assert.ok(voci.some((v) => v.t[0] === 'Si ricorda chi c’era' && /Saluta chi scrive per la prima volta/.test(v.d[0])));
});
