// IL PAYWALL DA FUORI: chi paga arriva in fondo (il ritorno dal Checkout si
// conferma da Stripe, un extra entra nell'abbonamento che c'e'), chi non paga
// vede dove sta il muro e come lo apre (la scheda Abbonamento vende, i muri
// portano li'), e nessuno resta senza bot per una questione di soldi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');
const SRV = leggi('src/web/server.js');
const APP = leggi('src/web/public/app.js');
const AB = leggi('src/features/abbonamenti.js');
const GATE = leggi('src/web/gate.js');
const DB = leggi('src/db.js');
const fra = (testo, da, a) => { const i = testo.indexOf(da); assert.ok(i >= 0, da); const j = testo.indexOf(a, i); return testo.slice(i, j > 0 ? j : undefined); };

test('il ritorno dal Checkout porta l\'id della sessione e si conferma da Stripe, non dalla query', () => {
  assert.ok(AB.includes("success_url: base + '/abbonamento/ritorno?sessione={CHECKOUT_SESSION_ID}',"));
  assert.ok(SRV.includes("app.get('/abbonamento/ritorno', wrap(async (req, res) => {"));
  const rotta = fra(SRV, "app.get('/abbonamento/ritorno'", '}));');
  assert.ok(rotta.includes('abbonamenti.leggiCheckout(req.query.sessione)'));
  assert.ok(rotta.includes("if (esito === 'ok') {") && rotta.includes('attivaDaCheckout(s)'));
  assert.ok(rotta.includes("res.redirect('/?abbonato=' + (esito === 'ok' ? '1' : esito));"));
  assert.ok(leggi('scripts/verifica-porte.mjs').includes("['GET /abbonamento/ritorno',"), 'porta dichiarata pubblica, col motivo');
  assert.ok(leggi('src/web/vetrina.js').includes("'/abbonamento/ritorno',"), 'il guscio la lascia passare senza sessione');
  const hook = fra(SRV, 'async function gestisciEventoStripe(ev) {', '\n  }\n');
  assert.ok(hook.includes('attivaDaCheckout(o);'), 'webhook e ritorno attivano con la stessa funzione');
  assert.ok(!APP.includes("q.get('abbonato') === '1') toast("), 'il pannello non dice piu\' «attivo» sulla sola query');
  assert.ok(APP.includes("if (ab === 'attesa') toast("));
});

test('chi ha gia\' una sottoscrizione riceve gli extra dentro quella: rotta e login self-service passano dallo stesso posto', () => {
  assert.equal((SRV.match(/(?:await|return) avviaAcquisto\(\{ login/g) || []).length, 2, 'la rotta del pannello, e il gesto che riscuote il carrello');
  assert.match(fra(SRV, 'async function riscuotiAcquisto(', '\n  }\n'), /return avviaAcquisto\(\{ login/,
    'tutte le porte d\'ingresso passano di li\': vedi test/contratto/carrello-porte');
  const f = fra(SRV, 'async function avviaAcquisto(', '\n  }\n');
  assert.ok(f.includes('abbonamenti.aggiungiAlAbbonamento({ subId: s.stripe_sub'));
  assert.ok(f.includes("['past_due', 'unpaid', 'incomplete'].includes(s.status)"), 'con un pagamento non riuscito prima si sistema quello');
  assert.ok(f.includes('codice: 409'));
  assert.ok(APP.includes('else if (r?.ok) await dopoAcquisto(r);'), 'il pannello capisce «aggiunto» oltre a «vai a pagare»');
});

test('il bot non si spegne mai per una questione di soldi: ne\' il webhook ne\' la ronda del sito', () => {
  assert.ok(!SRV.includes("streamers.setEnabled(login, false);   // disdetta"), 'la disdetta non spegne il bot');
  const hook = fra(SRV, 'async function gestisciEventoStripe(ev) {', '\n  }\n');
  assert.ok(!hook.includes('setEnabled('));
  assert.ok(GATE.includes('export function giroCancello(attivi, { ora = Date.now() } = {})'), 'la ronda si collauda a parte');
  assert.ok(!GATE.includes("setStatus(s.login, 'disabled')"), 'la lista del sito non disabilita nessuno');
  assert.ok(GATE.includes('streamers.unmarkCommunity(s.login)'), 'toglie il flag community, e basta');
  assert.ok(!GATE.includes('setEnabled('), 'ne\' accende ne\' spegne interruttori altrui');
  assert.ok(DB.includes('attivo(login, ora = now()) {'), 'una prova finisce quando finisce, non quando passa la ronda');
  assert.ok(SRV.includes("attivo: subscriptions.attivo(user.login), cliente: !!s.stripe_customer"), 'il pannello sa se e\' attivo e se c\'e\' un cliente Stripe');
});

test('chi non paga vede il muro e la strada: la scheda Abbonamento vende, i muri portano li\', senza «stanno arrivando»', () => {
  assert.ok(!APP.includes('stanno arrivando'), 'un testo che invecchia male');
  assert.ok(!APP.includes('href="#stato" data-scheda="stato">${L(\'Vedi'), 'i muri non mandano piu\' alla scheda Stato');
  assert.equal((APP.match(/href="#sottoscrizione" data-scheda="sottoscrizione"/g) || []).length >= 3, true, 'muro dentro la scheda, scheda murata, scheda Stato');
  const card = fra(APP, 'async function caricaSottoscrizione() {', '\nconst MARCHI = {');
  assert.ok(card.includes('configuratoreHtml(piani, { gia: [...mieiPacchetti], titolo: titoloComp })'), 'lo stesso compositore della vetrina');
  assert.ok(card.includes('if (vende) montaConfiguratore(box, piani, { gia: [...mieiPacchetti], suOk:'));
  assert.ok(card.includes("api('/api/abbonamento/checkout', { method: 'POST', body: { pacchetti, bundle } })"));
  for (const stato of ['guasto', 'pausa', 'finito', 'provaFinita']) assert.ok(card.includes(`} else if (${stato}) {`), `la scheda racconta lo stato «${stato}»`);
  assert.ok(card.includes("const mieiPacchetti = new Set(abAttivo && !prova ? (ab.pacchetti || []) : []);"), 'un extra di un abbonamento finito non e\' «attivo»');
  assert.ok(card.includes('cliente\n      ? `<p><button class="btn" id="sott-portale">'), 'il portale c\'e\' ogni volta che c\'e\' un cliente Stripe');
  assert.ok(!card.includes('—'), 'nella scheda niente trattini lunghi');
  for (const fn of ['function esitoAcquistoDaIndirizzo()', 'async function dopoAcquisto(r)', 'function sbloccaAddon(addon)']) {
    assert.ok(!fra(APP, fn, '\n}\n').includes('—'), `${fn}: niente trattini lunghi`);
  }
  assert.ok(!/non è incluso nel tuo piano —/.test(SRV), 'il 403 dice dove si apre, senza trattino');
  assert.ok(SRV.includes('non è nel tuo piano: lo apri dalla scheda «Abbonamento».'));
});
