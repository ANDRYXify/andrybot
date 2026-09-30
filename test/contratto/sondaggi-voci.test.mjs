// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// QUANTE VOCI HA UN SONDAGGIO: un numero solo, quello di Twitch.
//
// L'etichetta diceva «Opzioni (min 2, max 5)» e «Esiti (min 2, max 10)», ma i
// campi erano quattro per tutti e due. Adesso ce ne sono due, e un «+» ne
// aggiunge fino al massimo vero. Il massimo sta in un posto solo: lo leggono la
// chiamata a Twitch, i comandi in chat, il server (che lo passa al pannello) e
// il manuale. E le due schede, che parlano solo con Twitch, sugli altri canali
// dicono «Solo su Twitch» invece di mostrare tasti che non fanno niente.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('sondaggi-voci-');
const { VOCI } = await import('../../src/features/sondaggi.js');
const { MANUALI } = await import('../../src/web/manuali.js');
test.after(() => casa.pulisci());

const leggi = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const APP = leggi('src/web/public/app.js');

function funzione(nome) {
  const i = APP.search(new RegExp(`(?:async )?function ${nome}\\(`));
  assert.ok(i >= 0, `non trovo ${nome}`);
  let liv = 0;
  // la graffa del corpo: quella dopo la parentesi dei parametri, che possono
  // avere graffe loro (un oggetto destrutturato)
  for (let j = APP.indexOf(') {', i) + 2; j < APP.length; j++) {
    if (APP[j] === '{') liv++;
    else if (APP[j] === '}' && --liv === 0) return APP.slice(i, j + 1);
  }
  throw new Error(`${nome} non si chiude`);
}

test('i limiti sono quelli di Twitch, e la chiamata a Twitch li legge da li\'', () => {
  assert.deepEqual(VOCI, { sondaggio: { min: 2, max: 5 }, predizione: { min: 2, max: 10 } });
  const helix = leggi('src/twitch/helix.js');
  assert.ok(helix.includes('.slice(0, VOCI.sondaggio.max)'));
  assert.ok(helix.includes('.slice(0, VOCI.predizione.max)'));
  const srv = leggi('src/web/server.js');
  assert.ok(srv.includes('res.json({ poll, pred, voci: VOCI_TWITCH });'), 'il server li passa al pannello');
});

test('il «+» aggiunge campi fino al massimo, poi sparisce, e l\'etichetta dice il vero', () => {
  // eslint-disable-next-line no-new-func
  const f = new Function('L', 'esc', `${funzione('_vociVoto')}\nreturn _vociVoto;`);
  for (const [chi, lim] of Object.entries(VOCI)) {
    const campi = [{}, {}];
    const box = {
      querySelectorAll: () => campi,
      insertAdjacentHTML: (dove, html) => { assert.match(html, /data-aggiunto="1"/); campi.push({ html }); },
      get lastElementChild() { return { focus() {} }; },
    };
    const piu = { hidden: true, onclick: null };
    const eti = { textContent: '' };
    f((it) => it, (x) => x)({ box, piu, eti, cls: 'x', lim, titolo: 'Voci', nome: (n) => `Voce ${n}` });
    assert.equal(eti.textContent, `Voci (da ${lim.min} a ${lim.max})`, chi);
    assert.equal(piu.hidden, false);
    for (let i = 0; i < 20; i++) piu.onclick();
    assert.equal(campi.length, lim.max, `${chi}: si arriva al massimo e non oltre`);
    assert.equal(piu.hidden, true, `${chi}: al massimo il «+» sparisce`);
  }
});

test('il pannello parte con due campi per parte, senza numeri scritti a mano', () => {
  const p = funzione('pannelloSondaggi');
  assert.equal((p.match(/campo\('poll-opt'/g) || []).length, 2);
  assert.equal((p.match(/campo\('pred-esito'/g) || []).length, 2);
  assert.ok(!/min 2|max 5|max 10|facolt\./.test(p), 'nessun limite scritto a mano');
  assert.ok(!/almeno 2 /.test(funzione('caricaSondaggi')));
});

test('la prova del pannello (demo) risponde con gli stessi limiti del server', () => {
  const demo = APP.match(/'\/api\/sondaggi\/stato': \{ poll: null, pred: null, voci: (\{[^\n]*\}) \},\n/);
  assert.ok(demo, 'la demo ha la sua risposta');
  // eslint-disable-next-line no-new-func
  assert.deepEqual(new Function(`return ${demo[1]}`)(), JSON.parse(JSON.stringify(VOCI)));
});

test('sondaggi e penitenze sono schede solo Twitch', () => {
  const solo = APP.match(/const SOLO_TWITCH = \[([^\]]*)\]/)[1];
  for (const id of ['sondaggi', 'penitenze']) assert.ok(solo.includes(`'${id}'`), id);
});

test('il manuale dice gli stessi limiti', () => {
  const m = MANUALI.find((x) => x.slug === 'interazione');
  const testo = JSON.stringify(m.corpo);
  assert.ok(testo.includes(`da ${VOCI.sondaggio.min} a ${VOCI.sondaggio.max}; 25 caratteri`));
  assert.ok(testo.includes(`da ${VOCI.predizione.min} a ${VOCI.predizione.max}; 25 caratteri`));
  assert.ok(!testo.includes('quattro campi'));
});

test('se manca un permesso, il messaggio dice dove si concede, non un indirizzo', () => {
  const srv = leggi('src/web/server.js');
  const zona = srv.slice(srv.indexOf("app.post('/api/penitenze/premio'"), srv.indexOf("app.post('/api/predizioni/risolvi'"));
  assert.ok(!zona.includes('da /auth/permessi'), 'penitenze, sondaggi e predizioni');
  assert.equal((zona.match(/nella scheda «Stato» premi «Aggiorna i permessi»/g) || []).length, 4);
  const chat = leggi('src/features/sondaggi.js');
  assert.ok(!chat.includes('/auth/permessi') && chat.includes('lo streamer lo rimette dal pannello, scheda «Stato», con «Aggiorna i permessi»'));
});
