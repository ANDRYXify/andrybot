// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// QUANTO DURA UN VIP DATO DAL BOT: dirette, una data, o per sempre.
//
// Il difetto: «per sempre» si decideva guardando solo la scadenza. Un premio a
// dirette non ha scadenza, quindi la lista del pannello e !viplista lo dicevano
// «per sempre», e il premio seguente lo trattava da VIP perenne: lo saltava, o
// con «Salta chi ha gia' il VIP per sempre» spento glielo dava per sempre.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('vip-durata-');
const { vips, streamers } = await import('../../src/db.js');
const vip = await import('../../src/features/vip.js');
test.after(() => casa.pulisci());

const leggi = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const CANALE = 'alfa';
streamers.upsertApproved(CANALE, 'Alfa', '1');
const twitch = {
  getVips: async () => [],
  getUserByLogin: async (l) => ({ id: 'id-' + l, display_name: l.toUpperCase() }),
  addVip: async () => ({ ok: true }),
};

test('per sempre e\' solo chi non ha ne\' scadenza ne\' dirette', () => {
  assert.equal(vip.perSempre({ until: 0, dirette: 0 }), true);
  assert.equal(vip.perSempre({ until: 0, dirette: 3 }), false, 'un premio a dirette non e\' per sempre');
  assert.equal(vip.perSempre({ until: Date.now() + 1000, dirette: 0 }), false);
  assert.equal(vip.quantoDura({ until: 0, dirette: 3 }), 'ancora per 3 dirette');
  assert.equal(vip.quantoDura({ until: 0, dirette: 1 }), 'ancora per una diretta');
  assert.equal(vip.quantoDura({ until: 0, dirette: 0 }), 'per sempre');
});

test('chi ha un premio a dirette non e\' fra i perenni, e rivincendo non lo prende per sempre', async () => {
  vips.set(CANALE, { user: 'anna', userId: 'a', display: 'Anna', dirette: 2, motivo: 'premio' });
  vips.set(CANALE, { user: 'bruno', userId: 'b', display: 'Bruno', motivo: 'comando' });
  const perenni = await vip.giaPerSempre(twitch, CANALE);
  assert.equal(perenni.has('anna'), false);
  assert.equal(perenni.has('bruno'), true);
  const vinti = await vip.premia(twitch, CANALE, { gente: ['anna'], posti: [{ dirette: 4 }], saltaPerenni: false });
  assert.equal(vinti.length, 1);
  assert.equal(vips.get(CANALE, 'anna').dirette, 4, 'il premio si rinnova a dirette');
  assert.equal(vip.perSempre(vips.get(CANALE, 'anna')), false, 'e non diventa per sempre');
});

test('il pannello riceve le dirette e dice «ancora N dirette», in tre lingue', () => {
  const srv = leggi('src/web/server.js');
  const app = leggi('src/web/public/app.js');
  assert.ok(srv.includes('until: v.until, dirette: v.dirette, motivo: v.motivo'), 'il server passa le dirette');
  const lista = app.slice(app.indexOf('async function caricaClassifica() {'), app.indexOf('function medaglia(i)'));
  assert.ok(lista.includes("L(`ancora ${n} dirette`, `${n} more streams`, `${n} directos más`)"));
  assert.ok(lista.includes("L('per sempre', 'forever', 'para siempre')"));
  assert.ok(!/'<li class="vuoto">Nessun VIP|v\.until \? `fino al|: 'per sempre'|>Errore:/.test(lista), 'nessun testo solo in italiano');
});

test('le citazioni arrivano al pannello con autore e data, e i testi sono nelle tre lingue', () => {
  const srv = leggi('src/web/server.js');
  const app = leggi('src/web/public/app.js');
  const rotta = srv.slice(srv.indexOf("app.get('/api/streamer/citazioni'"), srv.indexOf("app.post('/api/streamer/citazioni'"));
  assert.ok(rotta.includes('autore: q.autore, data: q.data'), 'il server le passa');
  const lista = app.slice(app.indexOf('async function caricaCitazioni() {'), app.indexOf('async function caricaBattute() {'));
  assert.ok(lista.includes('q.autore') && lista.includes('q.data'), 'il pannello le mostra');
  assert.ok(lista.includes("L('Rimuovi', 'Remove', 'Quitar')"));
  assert.ok(!/>Rimuovi<|'<li class="vuoto">Ancora|>Errore:/.test(lista), 'nessun testo solo in italiano');
});
