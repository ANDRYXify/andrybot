// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE MONETE DI PRESENZA SOLO IN DIRETTA, PER COSTRUZIONE.
//
// C'era una casella «Solo mentre sei in diretta» sotto i punti, e non cambiava
// niente: il giro delle presenze parte solo quando il canale e' in diretta, e
// le monete per messaggio la ignoravano. Adesso la casella non c'e' piu', e il
// giro a canale spento non da' niente anche a chi aveva salvato la casella
// spenta. Le monete per messaggio restano come sono: arrivano sempre.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('monete-diretta-');
const { streamers, points } = await import('../../src/db.js');
const games = await import('../../src/features/games.js');
test.after(() => casa.pulisci());

const leggi = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const CANALE = 'alfa';
streamers.upsertApproved(CANALE, 'Alfa', '1');
streamers.setEnabled(CANALE, true);

test('a canale spento il giro non da\' niente, anche con la vecchia casella salvata spenta', () => {
  streamers.setSettings(CANALE, { punti: { soloLive: false, perPresenza: 5, perAttivita: 5 } });
  const spento = games.giroMonete(CANALE, ['lucia', 'marco'], { live: false });
  assert.equal(spento.monete, 0);
  assert.equal(points.get(CANALE, 'lucia'), 0);
  const acceso = games.giroMonete(CANALE, ['lucia', 'marco'], { live: true });
  assert.ok(acceso.monete > 0, 'in diretta la presenza arriva');
  assert.ok(points.get(CANALE, 'lucia') > 0);
});

test('le monete per messaggio non guardano la diretta', () => {
  streamers.setSettings(CANALE, { punti: { perMessaggio: 2, ogniSecondi: 60 } });
  const prima = points.get(CANALE, 'nina');
  games.accredita({ channel: CANALE, user: 'nina', text: 'ciao a tutti' });
  assert.equal(points.get(CANALE, 'nina'), prima + 2);
});

test('il giro parte solo quando il canale e\' in diretta, su Twitch o su Kick', () => {
  const bot = leggi('src/bot.js');
  const giro = bot.slice(bot.indexOf('async _tickWatchtime() {'), bot.indexOf('  _giro() {'));
  assert.ok(giro.includes('const chatters = stream ? await this.helix.getChatters(login) : [];'), 'l\'elenco di Twitch solo se Twitch dice che e\' in diretta');
  assert.ok(giro.includes("const daKick = this.inDirettaSu(login, 'kick') ? scriventi.giro(login, 'kick', { ora }) : [];"), 'chi scrive su Kick solo se Kick e\' in diretta');
  const vuoto = giro.indexOf('if (!presenti.length) continue;');
  assert.ok(vuoto > 0 && giro.indexOf('games.giroMonete(login, presenti, { live: true, diretta: diretta.corrente })') > vuoto,
    'e porta l\'id della diretta: e\' la chiave del tetto per diretta (docs/ECONOMIA.md), la stessa delle presenze');
});

test('la casella non c\'e\' piu\': ne\' nel pannello, ne\' fra i punti che il server salva', () => {
  const app = leggi('src/web/public/app.js');
  const srv = leggi('src/web/server.js');
  assert.ok(!app.includes('pt-soloLive'), 'il pannello non la disegna e non la salva');
  const punti = srv.slice(srv.indexOf('if (b.punti !== undefined) {'), srv.indexOf('// richieste musicali (!sr)'));
  assert.ok(punti.includes('out.punti = {'), 'trovo il salvataggio dei punti');
  assert.ok(!punti.includes('soloLive'), 'il server non la salva piu\'');
});
