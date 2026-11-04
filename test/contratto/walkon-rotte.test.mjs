// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE ROTTE DEL WALK-ON, su un'app vera (docs/WALKON.md). Le rotte di
// src/web/rotte-walkon.js si montano su express con dei finti attorno (la
// sessione, lo streamer, la posta) e si chiamano davvero, via HTTP:
//
//  · la mail non esce da nessuna rotta del pannello, dei mod o della pagina,
//    ne' in chiaro ne' cifrata, e nemmeno dall'esportazione: la riceve solo
//    la posta, alla decisione, una volta;
//  · senza posta accesa la mail non si puo' dare;
//  · un file col nome di un'immagine e dentro una pagina HTML non entra, e il
//    temporaneo se ne va;
//  · chi non ha i requisiti non salva; chi non ha l'accesso nemmeno.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-walkon-rotte-');
const { default: express } = await import('express');
const { db, walkon } = await import('../../src/db.js');
const { montaWalkon } = await import('../../src/web/rotte-walkon.js');
const { creaServizioWalkon } = await import('../../src/features/walkon.js');
const { esporta } = await import('../../src/features/esporta.js');
const leggi = (via) => readFileSync(new URL(`../../${via}`, import.meta.url), 'utf8');

const CH = 'canale';
const MAIL = 'chi.scrive@esempio.it';
const tmpDir = join(usaEGetta.dir, 'tmp');
mkdirSync(tmpDir, { recursive: true });
const st = {
  postaAccesa: true, mandate: [], sub: { sub: true, livello: 1 },
  cfg: { attivo: true, chi: { subTwitch: true }, effetti: { voci: ['applausi'] }, file: { tipi: ['immagine'], pesoMb: 1 }, testo: { max: 80 } },
};
const persone = { a: { id: '101', login: 'anna', nome: 'Anna', piattaforma: 'twitch' }, b: { id: '202', login: 'bruno', nome: 'Bruno', piattaforma: 'twitch' }, c: { id: '303', login: 'carla', nome: 'Carla', piattaforma: 'twitch' } };
const app = express();
app.use(express.json());
app.use((req, res, next) => { req.session = { spettatoreWon: req.get('x-persona') || undefined }; next(); });
const servizio = creaServizioWalkon({ store: walkon, impostazioni: () => st.cfg });
montaWalkon(app, {
  requireLogin: (req, res, next) => (req.get('x-pannello') ? next() : res.status(401).json({ errore: 'non autenticato' })),
  currentUser: (req) => ({ login: CH, display: req.get('x-pannello') === 'mod' ? 'Mod_Ale' : 'Canale', role: req.get('x-pannello') === 'mod' ? 'moderatore' : 'proprietario' }),
  wrap: (fn) => (req, res, next) => fn(req, res, next).catch(next),
  notFound: (res) => res.status(404).end(), extRateOk: () => true, eLoginNostro: (l) => l === CH,
  streamers: { get: (l) => (l === CH ? { status: 'approved', display: 'Canale', settings: { walkon: st.cfg } } : null) },
  store: walkon, servizio,
  effettoDi: (l, c) => (c === 'applausi' ? { comando: 'applausi', tipo: 'audio', file: 'x.ogg' } : null), effetti: () => [{ comando: 'applausi', tipo: 'audio', file: 'x.ogg' }],
  mediaEffetti: { servi: async (req, res) => res.status(204).end() }, firmaDi: () => '',
  posta: { attiva: () => st.postaAccesa, invia: async (m) => { st.mandate.push(m); return { ok: true }; } },
  spazioEsaurito: () => false, tmpDir, chiaveOk: () => false,
  accessi: { chi: (k) => persone[k] || null, togli: () => {} }, spettatorePew: () => null,
  accessoTwitch: () => true, accessoKick: () => false, authUrl: () => '/', apriKick: () => '/', abbonamento: async () => st.sub,
});
const server = await new Promise((ok) => { const s = app.listen(0, '127.0.0.1', () => ok(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
test.after(() => { server.close(); usaEGetta.pulisci(); });

const chiama = async (via, { persona, pannello, metodo = 'GET', corpo, form } = {}) => {
  const headers = {};
  if (persona) headers['x-persona'] = persona;
  if (pannello) headers['x-pannello'] = pannello;
  let body;
  if (form) body = form;
  else if (corpo) { headers['content-type'] = 'application/json'; body = JSON.stringify(corpo); }
  const r = await fetch(base + via, { method: metodo, headers, body });
  return { stato: r.status, testo: await r.text() };
};
const modulo = (campi, file) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campi)) f.append(k, v);
  if (file) f.append('file', new Blob([file.dati], { type: file.tipo }), file.nome);
  return f;
};
const buste = () => db.prepare('SELECT busta FROM walkon_posta').all().map((r) => r.busta);

test('la mail non esce da nessuna rotta del pannello, dei mod, della pagina o dall\'esportazione', async () => {
  const s = await chiama('/won/canale/salva', { persona: 'a', metodo: 'POST', form: modulo({ scelta: 'effetto', effetto: 'applausi', testo: 'eccomi {nome}', mail: MAIL, lingua: 'en' }) });
  assert.equal(s.stato, 200, s.testo);
  const segreti = [MAIL, 'chi.scrive', ...buste()];
  assert.equal(buste().length, 1, 'la mail c\'e\', cifrata');
  const viste = [
    await chiama('/api/streamer/walkon', { pannello: 'streamer' }),
    await chiama('/api/streamer/walkon', { pannello: 'mod' }),
    await chiama('/won/canale/dati'),
    await chiama('/won/canale/dati', { persona: 'b' }),
    await chiama('/won/canale/dati', { persona: 'a' }),
    await chiama('/won/canale'),
    { testo: s.testo },
    { testo: JSON.stringify(esporta(CH)) },
  ];
  for (const v of viste) for (const x of segreti) assert.ok(!v.testo.includes(x), `una risposta contiene la mail o la sua busta: ${v.testo.slice(0, 120)}`);
  assert.equal(JSON.parse(viste[4].testo).mio.mail, true, 'a chi l\'ha data si dice solo che c\'e\'');
  assert.ok(esporta(CH).saltate.some((x) => x.tabella === 'walkon_posta'), 'l\'esportazione la nega di proposito');
  const riga = JSON.parse(viste[0].testo).voci[0];
  const d = await chiama(`/api/streamer/walkon/${riga.id}/decidi`, { pannello: 'mod', metodo: 'POST', corpo: { versione: riga.versione, esito: 'approvato' } });
  assert.equal(d.stato, 200, d.testo);
  for (const x of segreti) assert.ok(!d.testo.includes(x), 'nemmeno la risposta alla decisione');
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(st.mandate.length, 1, 'l\'esito parte una volta');
  assert.equal(st.mandate[0].a, MAIL, 'all\'indirizzo che ha dato');
  assert.match(st.mandate[0].oggetto, /approved/, 'nella lingua con cui ha salvato');
  assert.equal(buste().length, 0, 'e l\'indirizzo non c\'e\' piu\'');
});

test('nessun\'altra parte del codice legge la tabella della mail', () => {
  const chi = [];
  const giro = (dir) => {
    for (const d of readdirSync(new URL(`../../${dir}`, import.meta.url), { withFileTypes: true })) {
      const via = dir + '/' + d.name;
      // chi la tocca davvero: una riga di SQL che la nomina (i commenti che la citano non contano)
      if (d.isDirectory()) giro(via); else if (d.name.endsWith('.js') && /\b(FROM|INTO|UPDATE|JOIN|TABLE IF NOT EXISTS)\s+walkon_posta\b|walkon_posta:\s*'/.test(leggi(via))) chi.push(via);
    }
  };
  giro('src');
  assert.deepEqual(chi.sort(), ['src/db.js', 'src/features/esporta.js'], 'solo il database (che la scrive e la prende) e l\'esportazione (che la nega)');
  const DB = leggi('src/db.js');
  const usi = [...DB.matchAll(/_wo\.(prendiPosta|haPosta)\b/g)].map((m) => m[1]);
  assert.deepEqual(usi.filter((x) => x === 'prendiPosta').length, 1, 'l\'indirizzo si legge in un punto solo: la decisione');
});

test('senza posta accesa la mail non si da\'', async () => {
  st.postaAccesa = false;
  const s = await chiama('/won/canale/salva', { persona: 'b', metodo: 'POST', form: modulo({ scelta: 'effetto', effetto: 'applausi', mail: MAIL }) });
  assert.equal(s.stato, 400);
  assert.equal(JSON.parse(s.testo).errore, 'mail');
  const m = await chiama('/won/canale/mail', { persona: 'a', metodo: 'POST', corpo: { mail: MAIL } });
  assert.equal(m.stato, 400);
  assert.equal(JSON.parse((await chiama('/won/canale/dati', { persona: 'a' })).testo).posta, false, 'e la pagina lo sa: il campo non compare');
  st.postaAccesa = true;
});

test('un file che si spaccia per un\'immagine non entra, e il temporaneo se ne va', async () => {
  const s = await chiama('/won/canale/salva', { persona: 'b', metodo: 'POST', form: modulo({ scelta: 'file' }, { dati: '<html><script>alert(1)</script></html>', tipo: 'image/png', nome: 'gatto.png' }) });
  assert.equal(s.stato, 400);
  assert.equal(JSON.parse(s.testo).errore, 'tipo');
  assert.deepEqual(readdirSync(tmpDir), [], 'niente resta nella cartella dei temporanei');
  assert.equal(walkon.get(CH, '202'), null);
  const peso = await chiama('/won/canale/salva', { persona: 'b', metodo: 'POST', form: modulo({ scelta: 'file' }, { dati: Buffer.alloc(2 * 1024 * 1024), tipo: 'image/png', nome: 'grosso.png' }) });
  assert.equal(JSON.parse(peso.testo).errore, 'peso', 'oltre il peso dello streamer');
  assert.deepEqual(readdirSync(tmpDir), []);
});

test('senza accesso o senza requisiti non si salva; la persona e\' quella della sessione', async () => {
  const senza = await chiama('/won/canale/salva', { metodo: 'POST', form: modulo({ scelta: 'effetto', effetto: 'applausi' }) });
  assert.equal(senza.stato, 401);
  // una persona che Helix non ha ancora visto (la risposta di Helix si tiene un minuto)
  st.sub = { sub: false, livello: 0 };
  const no = await chiama('/won/canale/salva', { persona: 'c', metodo: 'POST', form: modulo({ scelta: 'effetto', effetto: 'applausi' }) });
  assert.equal(no.stato, 403);
  assert.equal(JSON.parse(no.testo).errore, 'requisiti');
  st.sub = { sub: true, livello: 1 };
  const altro = await chiama('/won/canale/salva', { persona: 'b', metodo: 'POST', form: modulo({ scelta: 'effetto', effetto: 'applausi', persona: '101' }) });
  assert.equal(altro.stato, 200);
  assert.equal(walkon.get(CH, '202').nome, 'Bruno', 'il corpo non sceglie la persona');
  const eff = await chiama('/won/canale/salva', { persona: 'b', metodo: 'POST', form: modulo({ scelta: 'effetto', effetto: 'segreto' }) });
  assert.equal(JSON.parse(eff.testo).errore, 'effetto', 'solo gli effetti che lo streamer offre');
  assert.equal((await chiama('/api/streamer/walkon')).stato, 401, 'il pannello vuole la sessione');
  const t = await chiama('/won/canale/togli', { persona: 'b', metodo: 'POST', corpo: {} });
  assert.equal(t.stato, 200);
  assert.equal(walkon.get(CH, '202'), null);
});

test('una decisione su una versione vecchia non passa', async () => {
  await chiama('/won/canale/salva', { persona: 'b', metodo: 'POST', form: modulo({ scelta: 'effetto', effetto: 'applausi', testo: 'uno' }) });
  const vista = JSON.parse((await chiama('/api/streamer/walkon', { pannello: 'mod' })).testo).voci.find((v) => v.nome === 'Bruno');
  await chiama('/won/canale/salva', { persona: 'b', metodo: 'POST', form: modulo({ scelta: 'effetto', effetto: 'applausi', testo: 'due' }) });
  const d = await chiama(`/api/streamer/walkon/${vista.id}/decidi`, { pannello: 'mod', metodo: 'POST', corpo: { versione: vista.versione, esito: 'approvato' } });
  assert.equal(d.stato, 409);
  assert.equal(JSON.parse(d.testo).perche, 'cambiato');
  assert.equal(walkon.get(CH, '202').stato, 'attesa');
});


test('l\'elemento walkon sta in tutti gli elenchi della scena, ed eredita gli effetti', () => {
  const SRV = leggi('src/web/server.js'), APP = leggi('src/web/public/app.js'), OVL = leggi('src/web/public/overlay-app.js');
  assert.match(SRV, /const ELEM_OVERLAY = \[[^\]]*'walkon'/, 'il server lo conosce');
  assert.match(SRV, /const EREDITA_MOSTRA = \{[^}]*walkon: 'effetti'/, 'un overlay con gli effetti spenti non se lo trova in scena');
  assert.match(APP, /const ELEM_OVL = \[[^\]]*'walkon'/, 'il pannello lo conosce');
  assert.match(APP, /const VESTITORE = \{[^}]*walkon: _vestiWalkon/, 'la tela lo disegna');
  assert.match(leggi('src/web/public/riquadro.js'), /ORDINE_BASE = \[[^\]]*'walkon'/, 'ha un posto nell\'ordine dei livelli');
  assert.match(leggi('src/web/public/overlay.html'), /<div id="walkon" class="basso-centro" data-el="walkon"><\/div>/, 'e un contenitore in onda');
  assert.match(OVL, /dati\.tipo === 'walkon'\) mostraWalkon\(dati\)/, 'e l\'overlay lo mostra');
  assert.match(SRV, /walkon: normOverlayWalkon\(/, 'il tema porta la sua veste');
});
