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

  const st = storia.accendiLive('dario', JPEG, ORA);
  assert.equal(st.attiva, true);
  assert.equal(st.pronta, true, 'accenderla vuol dire avere la grafica');
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
  storia.accendiLive('elena', JPEG, ORA);
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
  storia.accendiLive('franco', JPEG, ORA);
  unlinkSync(join(config.dataDir, 'storie-live', 'franco.jpg'));
  assert.equal(storia.statoLive('franco').pronta, false);
  const f = finta();
  const r = await storia.storiaDellaDiretta('franco', { adesso: ORA, pubblica: f.pubblica });
  assert.equal(r.fatto, true);
  assert.equal(r.ok, false);
  assert.match(r.errore, /non e' pronta/);
  assert.equal(f.chiamate.length, 0);
});

test('spegnerla toglie anche la grafica; e un nome storto non esce dalla cartella', () => {
  storia.accendiLive('gina', JPEG, ORA);
  const st = storia.spegniLive('gina');
  assert.equal(st.attiva, false);
  assert.equal(st.pronta, false);
  assert.ok(!existsSync(join(config.dataDir, 'storie-live', 'gina.jpg')));
  assert.throws(() => storia.accendiLive('../fuori', JPEG, ORA));
  assert.deepEqual(storia.statoLive('../fuori'), { attiva: false, pronta: false, ultima: null });
});
