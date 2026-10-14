// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA STORIA DI INSTAGRAM DA UN POSTO SOLO, e quella che parte da sola quando
// comincia la diretta. Si prova senza Instagram: la chiamata vera si sostituisce
// con una che si ricorda cosa le e' stato chiesto. Il ragionamento sta in
// docs/GRAFICHE.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-storia-ig-');
const { config } = await import('../../src/config.js');
const { streamers } = await import('../../src/db.js');
const storia = await import('../../src/features/storia-ig.js');
process.on('exit', () => usaEGetta.pulisci());

const JPEG = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3]);
const ORA = Date.UTC(2026, 8, 23, 19, 0);

function finta(esito = { ok: true, id: '9' }) {
  const chiamate = [];
  return {
    chiamate,
    pubblica: async (arg) => {
      const nome = arg.url.split('/').pop();
      chiamate.push({ ...arg, nome, cera: existsSync(join(storia.cartellaPubblici(), nome)) });
      return esito;
    },
  };
}

function collegato(login) {
  streamers.upsertApproved(login, login);
  streamers.setSettings(login, { instagram: { userId: '17841', token: 'tok' } });
}

test('una storia passa da un indirizzo pubblico che c\'e\' solo mentre Meta la scarica', async () => {
  collegato('anna');
  const f = finta();
  const r = await storia.pubblicaStoria('anna', JPEG, { pubblica: f.pubblica });
  assert.equal(r.ok, true);
  assert.equal(f.chiamate.length, 1);
  const c = f.chiamate[0];
  assert.match(c.nome, storia.PUBBLICO_RE, 'un nome casuale da 128 bit');
  assert.equal(c.url, `${config.baseUrl.replace(/\/$/, '')}/pubblici/${c.nome}`);
  assert.ok(c.cera, 'mentre Meta la chiede, il file c\'e\'');
  assert.ok(!existsSync(join(storia.cartellaPubblici(), c.nome)), 'e dopo non c\'e\' piu\'');
  assert.equal(c.userId, '17841');
});

test('anche quando Instagram dice di no, il file se ne va; e senza Instagram non si comincia', async () => {
  collegato('bruno');
  const f = finta({ ok: false, errore: 'rifiutata', codice: 10 });
  const r = await storia.pubblicaStoria('bruno', JPEG, { pubblica: f.pubblica });
  assert.equal(r.ok, false);
  assert.deepEqual(readdirSync(storia.cartellaPubblici()), [], 'niente resta pubblico');
  streamers.upsertApproved('carla', 'carla');
  const g = finta();
  const s = await storia.pubblicaStoria('carla', JPEG, { pubblica: g.pubblica });
  assert.equal(s.ok, false);
  assert.equal(g.chiamate.length, 0, 'senza credenziali Instagram non si chiama');
});

test('la storia della diretta: spenta non parte, accesa parte, e una sola per diretta', async () => {
  collegato('dario');
  assert.deepEqual(storia.statoLive('dario'), { attiva: false, pronta: false, ultima: null });
  const f = finta();
  assert.deepEqual(await storia.storiaDellaDiretta('dario', { adesso: ORA, pubblica: f.pubblica }), { fatto: false, motivo: 'spenta' });
  assert.equal(f.chiamate.length, 0);

  const st = storia.accendiLive('dario', JPEG, { adesso: ORA });
  assert.equal(st.attiva, true);
  assert.equal(st.pronta, true, 'accenderla vuol dire avere la grafica');
  assert.equal('daRifare' in st, false, 'senza la firma di adesso, «da rifare» non si dice');
  const r = await storia.storiaDellaDiretta('dario', { adesso: ORA, pubblica: f.pubblica });
  assert.equal(r.fatto, true);
  assert.equal(r.ok, true);
  assert.equal(f.chiamate.length, 1);
  assert.deepEqual(storia.statoLive('dario').ultima, { ts: ORA, ok: true, errore: '' }, 'e si ricorda com\'e\' andata');

  const dopo = ORA + storia.STORIA_LIVE_DISTANZA_MS - 1;
  assert.equal((await storia.storiaDellaDiretta('dario', { adesso: dopo, pubblica: f.pubblica })).fatto, false,
    'la diretta caduta e ripartita non fa una seconda storia');
  assert.equal(f.chiamate.length, 1);
  const altra = ORA + storia.STORIA_LIVE_DISTANZA_MS + 1;
  assert.equal((await storia.storiaDellaDiretta('dario', { adesso: altra, pubblica: f.pubblica })).ok, true, 'la diretta dopo, si');
  assert.equal(f.chiamate.length, 2);
});

test('una storia che non parte si dice, e alla diretta dopo si riprova', async () => {
  collegato('elena');
  storia.accendiLive('elena', JPEG, { adesso: ORA });
  const no = finta({ ok: false, errore: 'permesso mancante', codice: 10 });
  const r = await storia.storiaDellaDiretta('elena', { adesso: ORA, pubblica: no.pubblica });
  assert.deepEqual(r, { fatto: true, ts: ORA, ok: false, errore: 'permesso mancante' });
  assert.equal(storia.statoLive('elena').ultima.ok, false, 'il pannello lo vede');
  const si = finta();
  assert.equal((await storia.storiaDellaDiretta('elena', { adesso: ORA + 60_000, pubblica: si.pubblica })).ok, true,
    'un fallimento non conta come storia fatta');
});

test('accesa ma senza grafica e\' un guaio da dire, non un silenzio', async () => {
  collegato('franco');
  storia.accendiLive('franco', JPEG, { adesso: ORA });
  unlinkSync(join(config.dataDir, 'storie-live', 'franco.jpg'));
  assert.equal(storia.statoLive('franco').pronta, false);
  const f = finta();
  const r = await storia.storiaDellaDiretta('franco', { adesso: ORA, pubblica: f.pubblica });
  assert.equal(r.fatto, true);
  assert.equal(r.ok, false);
  assert.match(r.errore, /non e' pronta: apri le Grafiche, si prepara da sola/, 'col rimedio che funziona: spegnerla e riaccenderla non serve');
  assert.equal(f.chiamate.length, 0);
});

test('spegnerla toglie anche la grafica; e un nome storto non esce dalla cartella', () => {
  storia.accendiLive('gina', JPEG, { adesso: ORA });
  const st = storia.spegniLive('gina');
  assert.equal(st.attiva, false);
  assert.equal(st.pronta, false);
  assert.ok(!existsSync(join(config.dataDir, 'storie-live', 'gina.jpg')));
  assert.throws(() => storia.accendiLive('../fuori', JPEG, { adesso: ORA }));
  assert.deepEqual(storia.statoLive('../fuori'), { attiva: false, pronta: false, ultima: null });
});

// LA FIRMA DEL QR E LA VERSIONE DELLE GRAFICHE (src/features/qr-stile.js): la
// grafica della diretta porta da dove e' nata. Se una delle due non e' piu'
// quella di adesso e' «da rifare»: parte lo stesso, e il pannello la riprepara.
const F1 = 'a1b2c3d4e5f60718', F2 = '0f1e2d3c4b5a6978';

test('la storia della diretta sa se e\' da rifare: firma del QR o grafiche cambiate', () => {
  storia.accendiLive('ivo', JPEG, { firmaQr: F1, rev: 4, adesso: ORA });
  assert.deepEqual(storia.statoLive('ivo', { firmaQr: F1, rev: 4 }), { attiva: true, pronta: true, daRifare: false, ultima: null });
  assert.equal(storia.statoLive('ivo', { firmaQr: F2, rev: 4 }).daRifare, true, 'lo stile del QR e\' cambiato');
  assert.equal(storia.statoLive('ivo', { firmaQr: F1, rev: 5 }).daRifare, true, 'le grafiche sono cambiate');
  assert.equal(storia.statoLive('ivo', { firmaQr: F1 }).daRifare, false, 'chi non sa la versione guarda solo la firma');
  assert.equal('daRifare' in storia.statoLive('ivo', { rev: 5 }), false, 'senza la firma non si dice');

  storia.accendiLive('ivo', JPEG, { rev: 4, adesso: ORA });
  assert.equal(storia.statoLive('ivo', { firmaQr: F1, rev: 4 }).daRifare, true, 'senza firma (un pannello di prima) e\' da rifare');
  assert.equal(storia.statoLive('ivo', { firmaQr: '', rev: 4 }).daRifare, true, 'anche per chi non ha una firma da confrontare: assente non e\' uguale');
  storia.accendiLive('ivo', JPEG, { firmaQr: 'storta', rev: 4, adesso: ORA });
  assert.equal(storia.statoLive('ivo', { firmaQr: F1, rev: 4 }).daRifare, true, 'una firma storta vale come nessuna');
  assert.equal(storia.statoLive('ivo', { firmaQr: 'storta', rev: 4 }).daRifare, true, 'nemmeno con se\' stessa: non si tiene');
  storia.accendiLive('ivo', JPEG, { firmaQr: F1, adesso: ORA });
  assert.equal(storia.statoLive('ivo', { firmaQr: F1, rev: 4 }).daRifare, true, 'senza versione (un pannello di prima) anche');

  storia.spegniLive('ivo');
  assert.deepEqual(storia.statoLive('ivo', { firmaQr: F1, rev: 4 }), { attiva: false, pronta: false, daRifare: false, ultima: null },
    'spenta non c\'e\' niente da rifare');
});

test('da rifare parte lo stesso: il QR di prima si legge e porta allo stesso posto', async () => {
  collegato('luca');
  storia.accendiLive('luca', JPEG, { firmaQr: F1, rev: 1, adesso: ORA });
  assert.equal(storia.statoLive('luca', { firmaQr: F2, rev: 2 }).daRifare, true);
  const f = finta();
  const r = await storia.storiaDellaDiretta('luca', { adesso: ORA, pubblica: f.pubblica });
  assert.equal(r.ok, true);
  assert.equal(f.chiamate.length, 1);
});

test('l\'immagine che partira\' si rilegge cosi\' com\'e\'', () => {
  assert.equal(storia.immagineLive('mara'), null, 'mai accesa');
  storia.accendiLive('mara', JPEG, { firmaQr: F1, rev: 1, adesso: ORA });
  assert.deepEqual(storia.immagineLive('mara'), JPEG);
  storia.spegniLive('mara');
  assert.equal(storia.immagineLive('mara'), null, 'spenta, non c\'e\' piu\'');
  assert.equal(storia.immagineLive('../fuori'), null, 'e un nome storto non esce dalla cartella');
});
