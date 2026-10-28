// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA PAGINA DEI COLPI SU KICK (docs/COLPI.md, «Su Kick»): l'accesso con Kick,
// la chat di Kick a nome dello spettatore, il lettore di Kick, e la pagina che
// parla la valuta di chi e' entrato. Il servizio lo prova colpi-kicks.test.mjs;
// i fili del server test/contratto/colpi-kick-accesso.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';

const { cartellaUsaEGetta } = await import('../aiuto.mjs');
const usaEGetta = cartellaUsaEGetta('andrybot-colpi-kick-pagina-');
process.on('exit', () => usaEGetta.pulisci());
const { registroColpi, pewBit } = await import('../../src/db.js');
const economia = await import('../../src/features/economia.js');
const acc = await import('../../src/features/colpi-accesso.js');
const { htmlPaginaColpo } = await import('../../src/features/colpi-pagina.js');
const { creaServizioColpi } = await import('../../src/features/colpi-servizio.js');
const { creaPortaColpi } = await import('../../src/features/colpi-porta.js');
const kickAuth = await import('../../src/kick/auth.js');

test('l\'accesso ricorda la piattaforma, e il rinnovo va alla piattaforma giusta', async () => {
  const chiesti = [];
  let adesso = 1_000_000;
  const a = acc.creaAccessi({ rinnova: async (r, p) => { chiesti.push([r, p]); return { accessToken: 'nuovo' }; }, ora: () => adesso });
  const k = a.metti({ id: 'k:7', login: 'marta', nome: 'Marta', token: 'vecchio', refresh: 'r1', scade: adesso + 60_000, piattaforma: 'kick' });
  assert.deepEqual(a.chi(k), { id: 'k:7', login: 'marta', nome: 'Marta', piattaforma: 'kick' });
  assert.equal(await a.token(k), 'nuovo', 'sotto i cinque minuti si rinnova');
  assert.deepEqual(chiesti, [['r1', 'kick']], 'con Kick, non con Twitch');
  const t = a.metti({ id: '9', login: 'luca', token: 'x', piattaforma: 'boh' });
  assert.equal(a.chi(t).piattaforma, 'twitch', 'quello che non si conosce e\' Twitch');
  assert.deepEqual([...acc.PERMESSI_KICK], ['user:read', 'chat:write'], 'chi e\' e scrivere in chat: niente di piu\'');
});

test('la chat di Kick a nome dello spettatore: il corpo che Kick vuole, e gli errori detti', async () => {
  const visti = [];
  const fetcher = (risposta) => async (url, o) => { visti.push({ url, o }); return risposta; };
  const ok = await acc.mandaInChatKick({ token: 'T', broadcasterKickId: '123', testo: ' ciao\u0007 a tutti ', fetcher: fetcher({ status: 200, ok: true, json: async () => ({}) }) });
  assert.deepEqual(ok, { ok: true });
  assert.equal(visti[0].url, 'https://api.kick.com/public/v1/chat');
  assert.equal(visti[0].o.headers.Authorization, 'Bearer T');
  assert.deepEqual(JSON.parse(visti[0].o.body), { content: 'ciao  a tutti', type: 'user', broadcaster_user_id: 123 });
  assert.deepEqual(await acc.mandaInChatKick({ token: 'T', broadcasterKickId: '123', testo: 'x', fetcher: fetcher({ status: 401, ok: false, json: async () => ({}) }) }), { ok: false, motivo: 'accesso', scaduto: true });
  assert.deepEqual(await acc.mandaInChatKick({ token: 'T', broadcasterKickId: '123', testo: 'x', fetcher: fetcher({ status: 403, ok: false, json: async () => ({ message: 'You are banned' }) }) }), { ok: false, motivo: 'You are banned' });
  const prima = visti.length;
  assert.deepEqual(await acc.mandaInChatKick({ token: 'T', broadcasterKickId: '12a', testo: 'x', fetcher: fetcher({}) }), { ok: false, motivo: 'canale' });
  assert.deepEqual(await acc.mandaInChatKick({ token: 'T', broadcasterKickId: '1', testo: '   ', fetcher: fetcher({}) }), { ok: false, motivo: 'vuoto' });
  assert.equal(visti.length, prima, 'un canale storto o un testo vuoto non partono');
});

test('lo spettatore chiede a Kick solo i suoi permessi; lo streamer i suoi', () => {
  const sp = new URL(kickAuth.urlAutorizzazione({ challenge: 'c', state: 's', scope: acc.PERMESSI_KICK }));
  assert.equal(sp.searchParams.get('scope'), 'user:read chat:write');
  const st = new URL(kickAuth.urlAutorizzazione({ challenge: 'c', state: 's' }));
  assert.notEqual(st.searchParams.get('scope'), 'user:read chat:write', 'senza `scope` resta quello dello streamer');
});

test('la pagina: il lettore e l\'accesso di Kick solo se il canale e\' su Kick, e lo slug pulito', () => {
  const base = { login: 'andry', display: 'Andry', pagina: { blocchi: [{ tipo: 'colpo' }] }, baseUrl: 'https://socialbot.live' };
  const senza = htmlPaginaColpo(base);
  assert.ok(!senza.includes('player.kick.com') && senza.includes('data-accesso-kick=""'));
  const con = htmlPaginaColpo({ ...base, kick: 'andry_k', accessoKick: true });
  assert.ok(con.includes('https://player.kick.com/andry_k?muted=true&amp;autoplay=true'), 'il lettore di Kick');
  assert.ok(con.includes('data-accesso-kick="1"') && con.includes('Twitch · Kick'));
  // (i testi stanno tutti anche in data-t, per lo script: si guarda quello che si vede)
  assert.ok(con.includes('data-t="Twitch">Guarda su Twitch</button>') && senza.includes('data-t="Twitch">Guarda la diretta</button>'), 'con due lettori ognuno dice la sua piattaforma');
  assert.ok(/<p class="cp-nota">[^<]*i Kicks si regalano su Kick/.test(con) && !/<p class="cp-nota">[^<]*Kicks/.test(senza), 'la nota sotto parla anche di Kick, solo se il canale c\'e\'');
  const storto = htmlPaginaColpo({ ...base, kick: 'x"><script>alert(1)</script>' });
  assert.ok(!storto.includes('player.kick.com') && !storto.includes('<script>alert'), 'uno slug che non e\' uno slug non entra');
});

// il servizio e la porta, coi Kicks accesi
function banco({ suKick = true } = {}) {
  let adesso = Date.parse('2026-10-28T09:00:00Z');
  const cfg = { attivo: true, attesaSec: 0, alMinuto: 60, voci: [{ comando: 'torta', nome: 'Torta', bit: 100, kicks: 80, monete: 40, misti: { kicks: { monete: 10, kicks: 30 }, bit: { monete: 10, bit: 30 } } }], bitPew: { attivo: true }, kicksPew: { attivo: true } };
  const s = creaServizioColpi({
    registro: registroColpi, effects: { fireConOpzioni: () => true }, effettoDi: () => ({ tipo: 'immagine' }), impostazioni: () => cfg,
    inOnda: () => true, overlay: () => true, chiudiPremio: async () => true,
    monete: { punta: economia.punta, rendi: economia.rendi, saldo: economia.saldo }, crediti: pewBit, ora: () => adesso,
  });
  const p = creaPortaColpi({ servizio: s, registro: registroColpi, streamers: { get: () => ({ settings: { colpi: cfg } }) },
    effettoDi: () => ({ tipo: 'immagine', file: 'p.png' }), mezziEuro: () => [], apriPagamento: async () => ({}), inOnda: () => true, overlay: () => true,
    ora: () => adesso, kick: () => (suKick ? { slug: 'andry_k', live: true } : null) });
  return { s, p, cfg };
}
let n = 0;

test('la porta: i Kicks esistono solo se il canale e\' su Kick; il saldo e\' nella valuta di chi e\' entrato', () => {
  const c = 'kpag' + (++n);
  const { p } = banco();
  pewBit.entra(c, 'k:7', 300, 'regalo:a');
  pewBit.entra(c, '21', 500, 'cheer:a');
  const d = p.dati(c);
  assert.deepEqual([d.kicksPew, d.kick], [true, { slug: 'andry_k', live: true }]);
  assert.equal(d.voci[0].prezzi.kicks, 80);
  assert.deepEqual(p.saldi(c, { id: 'k:7', login: 'marta' }).daSpendere, 300, 'chi e\' entrato con Kick vede i suoi Kicks');
  assert.deepEqual(p.saldi(c, { id: '21', login: 'luca' }).daSpendere, 500, 'chi con Twitch i suoi Bit');
  const c2 = 'kpag' + (++n);
  const fuori = banco({ suKick: false }).p;
  assert.deepEqual([fuori.dati(c2).kicksPew, fuori.dati(c2).kick, fuori.dati(c2).voci[0].prezzi.kicks], [false, null, 0], 'un canale non su Kick non offre Kicks');
  // su Kick, ma nessun colpo si paga in Kicks: i Kicks da spendere non si promettono
  const { p: senzaPrezzo, cfg } = banco();
  cfg.voci = [{ comando: 'torta', nome: 'Torta', bit: 100, monete: 40 }];
  assert.equal(senzaPrezzo.dati('kpag' + (++n)).kicksPew, false, 'niente da pagarci: niente promessa');
});

test('si paga solo nella propria valuta: Kicks per chi e\' entrato con Kick, Bit per chi con Twitch', () => {
  const c = 'kpag' + (++n);
  const { p } = banco();
  pewBit.entra(c, 'k:7', 300, 'regalo:b');
  pewBit.entra(c, '21', 500, 'cheer:b');
  const kick = { id: 'k:7', login: 'marta' }, twitch = { id: '21', login: 'luca' };
  assert.equal(p.lancia(c, { voce: 'torta', con: 'bit', x: 10, y: 10 }, 'a', kick).motivo, 'voce', 'una persona di Kick non spende Bit');
  assert.equal(p.lancia(c, { voce: 'torta', con: 'kicks', x: 10, y: 10 }, 'b', twitch).motivo, 'voce', 'una persona di Twitch non spende Kicks');
  assert.equal(p.lancia(c, { voce: 'torta', con: 'misto-bit', x: 10, y: 10 }, 'd', kick).motivo, 'voce', 'nemmeno nel modo misto: un modo che dice Bit non si paga in Kicks');
  assert.equal(p.lancia(c, { voce: 'torta', con: 'misto-kicks', x: 10, y: 10 }, 'e', twitch).motivo, 'voce');
  assert.equal(p.lancia(c, { voce: 'torta', con: 'kicks', x: 10, y: 10 }, 'c', kick).ok, true);
  assert.equal(pewBit.saldo(c, 'k:7'), 220, '80 Kicks dal suo saldo');
  assert.equal(pewBit.saldo(c, '21'), 500, 'i Bit di un altro non si toccano');
});
