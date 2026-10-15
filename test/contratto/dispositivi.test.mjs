// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// PIU' DISPOSITIVI, UNA REGIA: le porte (docs/DIRETTA.md).
//
// Il telefono che fa da fotocamera bussa senza sessione: lo riconosce un
// invito, poi la sua chiave. La regia ha la sessione del proprietario. Qui si
// prova che il cancello apre le porte giuste e solo quelle, che l'argine conta
// i segnali come tempo reale e sta sopra ai tetti del salotto, che il server
// monta le rotte coi cancelli veri, e il giro intero via HTTP: invito, entrata,
// biglietto, flusso, segnali nei due sensi, revoca.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import express from 'express';
import { creaGuscio } from '../../src/web/vetrina.js';
import { classifica, CLASSI } from '../../src/web/argine.js';
import { creaSalotto, LIMITI_DISPOSITIVI } from '../../src/features/studio-dispositivi.js';
import { montaDispositivi } from '../../src/web/rotte-dispositivi.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const PUB = join(RAD, 'src/web/public');
const SRV = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');

test('il cancello apre al telefono la sua pagina e i suoi segnali, e niente della regia', () => {
  assert.match(SRV, /camHtml: guscio\.pagina\('cam\.html', '\/cam'\)/, 'la pagina si dichiara col suo indirizzo, nel punto in cui si serve');
  const g = creaGuscio(PUB);
  g.pagina('cam.html', '/cam');
  for (const via of ['/cam', '/cam/AbC_123', '/api/cam/entra', '/api/cam/eventi', '/api/cam/invito/xyz', '/cam.js', '/cam.css', '/js/studio-camera-remota.js', '/flusso.js']) assert.ok(g.aperto(via), `${via} deve aprirsi senza sessione`);
  for (const via of ['/api/studio/dispositivi', '/api/studio/dispositivi/invito', '/api/studio/regia/eventi', '/api/studio/regia/segnale', '/js/studio-remoti.js']) assert.equal(g.aperto(via), false, `${via} e' della regia: serve la sessione`);
});

test('i segnali contano come tempo reale, e il tetto generale sta sopra a quelli del salotto', () => {
  for (const [m, via] of [['POST', '/api/cam/segnale'], ['GET', '/api/cam/eventi'], ['POST', '/api/studio/regia/segnale'], ['GET', '/api/studio/regia/eventi']]) assert.equal(classifica(m, via), 'tempoReale', via);
  assert.ok(CLASSI.tempoReale.max > LIMITI_DISPOSITIVI.messaggiMinuto, 'per il telefono decide il salotto, che sa il ritmo dei segnali');
  assert.ok(CLASSI.tempoReale.max > LIMITI_DISPOSITIVI.messaggiRegiaMinuto, 'anche per la regia');
});

test('il server monta le rotte coi cancelli veri, e cancellare l\'account dimentica i dispositivi', () => {
  assert.match(SRV, /montaDispositivi\(app, \{\s*salotto, proprietario: \[requireOwner, studioAperto\]/);
  assert.equal((SRV.match(/cancellaDati\(login, \{ conferma: req\.body\?\.conferma \}\); salotto\.dimentica\(login\);/g) || []).length, 2, 'tutte e due le strade della cancellazione');
});

// ---------------------------------------------------------------- il giro via HTTP
function archivioFinto() {
  const righe = new Map();
  const k = (l, id) => l + '/' + id;
  return {
    elenco: (l) => [...righe.values()].filter((r) => r.login === l).map((r) => ({ ...r })),
    trova: (l, id) => { const r = righe.get(k(l, id)); return r ? { ...r } : null; },
    salva: (l, r) => righe.set(k(l, r.id), { ...r, login: l }),
    aggiorna: (l, id, c) => { const r = righe.get(k(l, id)); if (r) Object.assign(r, c); },
    visto: (l, id, t) => { const r = righe.get(k(l, id)); if (r) r.visto = t; },
    togli: (l, id) => righe.delete(k(l, id)),
  };
}

async function banco() {
  const app = express();
  app.use(express.json());
  const salotto = creaSalotto({ archivio: archivioFinto() });
  const srv = http.createServer(app);
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${srv.address().port}`;
  montaDispositivi(app, {
    salotto, proprietario: [(req, res, next) => (req.get('x-prova') === 'proprietario' ? next() : res.status(401).json({ errore: 'sessione' }))],
    loginDi: () => 'andrea', studioPerMe: () => true, eLoginNostro: (l) => l === 'andrea',
    camHtml: join(PUB, 'cam.html'), baseUrl: base,
  });
  const chiama = async (via, corpo, proprietario) => {
    const r = await fetch(base + via, { method: corpo ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(proprietario ? { 'x-prova': 'proprietario' } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
    return { stato: r.status, dati: await r.json().catch(() => null) };
  };
  // Un flusso letto come lo legge flusso.js: messaggi senza nome, {e, d}.
  const ascolta = (via, proprietario) => new Promise((ok, no) => {
    const msg = [], attese = [];
    const req = http.get(base + via, { headers: proprietario ? { 'x-prova': 'proprietario' } : {} }, (res) => {
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', (c) => {
        buf += c;
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const blocco = buf.slice(0, i); buf = buf.slice(i + 2);
          const riga = blocco.split('\n').find((l) => l.startsWith('data: '));
          if (!riga) continue;
          const m = JSON.parse(riga.slice(6));
          msg.push(m);
          for (const a of attese.splice(0)) a();
        }
      });
      res.on('end', () => { f.finito = true; for (const a of attese.splice(0)) a(); });
      const f = {
        stato: res.statusCode, msg, finito: false, chiudi: () => req.destroy(),
        aspetta: (e, cond = () => true) => new Promise((si, mai) => {
          const t = setTimeout(() => mai(new Error(`niente «${e}» (arrivati: ${msg.map((x) => x.e).join(', ')})`)), 3000);
          const guarda = () => { const x = msg.find((m) => m.e === e && !m.letto && cond(m.d)); if (x) { x.letto = true; clearTimeout(t); si(x.d); } else if (f.finito) { clearTimeout(t); mai(new Error('flusso finito')); } else attese.push(guarda); };
          guarda();
        }),
      };
      ok(f);
    });
    req.on('error', no);
  });
  return { srv, base, chiama, ascolta, chiudi: () => new Promise((ok) => { srv.closeAllConnections?.(); srv.close(ok); }) };
}

test('il giro intero: invito, entrata, biglietto, flusso, segnali nei due sensi e revoca', async () => {
  const B = await banco();
  try {
    assert.equal((await B.chiama('/api/studio/dispositivi/invito', {})).stato, 401, 'l\'invito lo crea solo la regia');
    assert.equal((await B.chiama('/api/cam/entra', { codice: '000000' })).dati.motivo, 'invito', 'senza invito non si entra');
    const inv = (await B.chiama('/api/studio/dispositivi/invito', {}, true)).dati;
    assert.equal(inv.url, `${B.base}/cam/${inv.token}`);
    assert.equal((await B.chiama('/api/cam/invito/' + inv.token)).dati.canale, 'andrea');
    const pagina = await fetch(`${B.base}/cam/${inv.token}`);
    assert.equal(pagina.headers.get('referrer-policy'), 'no-referrer', 'l\'invito sta nell\'indirizzo: non deve uscire come referer');
    assert.match(pagina.headers.get('cache-control') || '', /no-store/);
    const d = (await B.chiama('/api/cam/entra', { token: inv.token, nome: 'Telefono' })).dati;
    assert.ok(d.id && d.chiave && d.comanda === false, 'chi entra col QR non comanda');
    assert.equal((await B.chiama('/api/cam/entra', { token: inv.token })).stato, 404, 'l\'invito vale una volta');

    const cred = { canale: 'andrea', id: d.id, chiave: d.chiave };
    const storta = await B.chiama('/api/cam/biglietto', { ...cred, chiave: d.chiave + 'x' });
    assert.ok(storta.stato === 401 && storta.dati.tolto === true, 'una chiave sbagliata non passa');
    const b1 = (await B.chiama('/api/cam/biglietto', cred)).dati.biglietto;
    const tel = await B.ascolta('/api/cam/eventi?b=' + encodeURIComponent(b1));
    const pronto = await tel.aspetta('pronto');
    assert.equal(pronto.regia, false);
    assert.equal((await B.chiama('/api/cam/biglietto', { ...cred })).stato, 200);
    const due = await new Promise((ok) => http.get(`${B.base}/api/cam/eventi?b=${encodeURIComponent(b1)}`, (r) => { r.resume(); ok(r.statusCode); }));
    assert.equal(due, 401, 'il biglietto vale una volta');
    assert.equal((await B.chiama('/api/cam/segnale', { ...cred, tipo: 'offerta', dati: { s: 'a', sdp: 'v=0' } })).dati.motivo, 'nessuna-regia');

    assert.equal((await B.ascolta('/api/studio/regia/eventi?r=finestra0001')).stato, 401, 'la regia vuole la sessione');
    const regia = await B.ascolta('/api/studio/regia/eventi?r=finestra0001', true);
    await regia.aspetta('pronto');
    const presente = await regia.aspetta('presenza');
    assert.equal(presente.id, d.id);
    const giro = (await tel.aspetta('regia')).giro;
    assert.ok(giro, 'il telefono sa che la regia c\'e\', e con che giro');

    assert.equal((await B.chiama('/api/cam/segnale', { ...cred, tipo: 'offerta', dati: { s: 'a', sdp: 'v=0' } })).stato, 200);
    const off = await regia.aspetta('segnale');
    assert.deepEqual(off, { da: d.id, tipo: 'offerta', dati: { s: 'a', sdp: 'v=0' } });
    assert.equal((await B.chiama('/api/studio/regia/segnale', { r: 'finestra0001', a: d.id, tipo: 'risposta', dati: { s: 'a', sdp: 'v=1' } }, true)).stato, 200);
    assert.deepEqual(await tel.aspetta('segnale'), { tipo: 'risposta', dati: { s: 'a', sdp: 'v=1' } });
    assert.equal((await B.chiama('/api/studio/regia/segnale', { r: 'finestra0002', a: d.id, tipo: 'risposta', dati: {} }, true)).dati.motivo, 'non-regia', 'una finestra che non e\' la regia non parla');
    assert.equal((await B.chiama('/api/cam/segnale', { ...cred, tipo: 'risposta', dati: {} })).dati.motivo, 'messaggio', 'il telefono offre, non risponde');

    assert.equal((await B.chiama(`/api/studio/dispositivi/${d.id}`, { comanda: true }, true)).dati.comanda, true);
    assert.equal((await tel.aspetta('tu')).comanda, true, 'il telefono sa subito che ora comanda');

    const elenco = (await B.chiama('/api/studio/dispositivi', null, true)).dati;
    assert.equal(elenco.elenco.length, 1);
    assert.equal(elenco.elenco[0].collegato, true);
    assert.equal('chiave' in elenco.elenco[0] || 'impronta' in elenco.elenco[0], false, 'la regia non vede ne\' la chiave ne\' la sua impronta');

    assert.equal((await B.chiama(`/api/studio/dispositivi/${d.id}/togli`, {}, true)).stato, 200);
    await tel.aspetta('tolto');
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(tel.finito, true, 'tolto, il flusso si chiude: non resta appeso al server');
    assert.equal((await B.chiama('/api/cam/biglietto', cred)).stato, 401, 'e la chiave non vale piu\'');
    assert.equal((await regia.aspetta('presenza', (x) => x.collegato === false)).id, d.id, 'e la regia lo sa');
    regia.chiudi();
  } finally { await B.chiudi(); }
});

test('una regia in diretta non si ruba; ferma, passa alla finestra nuova e la vecchia chiude il suo flusso', async () => {
  const B = await banco();
  try {
    const a = await B.ascolta('/api/studio/regia/eventi?r=finestra0001&live=1', true);
    await a.aspetta('pronto');
    const b = await B.ascolta('/api/studio/regia/eventi?r=finestra0002', true);
    await b.aspetta('occupata');
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(b.finito, true, 'chi trova la regia occupata non resta appeso');
    assert.equal((await B.chiama('/api/studio/regia/stato', { r: 'finestra0001', live: false }, true)).dati.ok, true);
    const c = await B.ascolta('/api/studio/regia/eventi?r=finestra0003', true);
    await c.aspetta('pronto');
    await a.aspetta('altrove');
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(a.finito, true, 'la vecchia regia lo sa, e il suo flusso si chiude');
    c.chiudi();
  } finally { await B.chiudi(); }
});
