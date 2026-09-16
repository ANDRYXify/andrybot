// I PIANI: chi ha diritto a cosa. Un errore qui non si vede a schermo — si vede
// sull'estratto conto. Da un lato uno che non paga usa funzioni a pagamento,
// dall'altro uno che paga si trova la porta chiusa e se ne va.
import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../../src/config.js';
import * as ab from '../../src/features/abbonamenti.js';

// Chi lancia i test puo' avere un .env con le chiavi di Stripe (sul server e'
// cosi'): qui il listino si legge con i pagamenti SPENTI, per scelta, cosi'
// l'esito non dipende dalla macchina.
config.stripe.attivo = false;
config.stripe.prezzi = {};

const ha = (piano, chiave) => ab.abilitata(ab.funzioniDi(piano), chiave);

test('senza abbonamento restano solo le cose gratis', () => {
  for (const chiuse of ['clipAuto', 'voce', 'notifiche', 'telegram', 'studio']) {
    assert.equal(ha({}, chiuse), false, `free non deve avere "${chiuse}"`);
  }
  assert.equal(ha({}, 'overlay'), true, "l'overlay è gratis");
  // parita' con gli altri bot: quello che Nightbot, StreamElements e Cloudbot danno gratis, qui e' gratis
  for (const aperte of ['giochi', 'effetti', 'musica']) assert.equal(ha({}, aperte), true, `free deve avere "${aperte}"`);
  assert.equal(ab.limite(ab.funzioniDi({}), 'moduli'), Infinity, 'i moduli sono illimitati anche gratis');
  assert.equal(ab.limite(ab.funzioniDi({}), 'moderatori'), 0);
});

test('un tier inventato non regala niente', () => {
  for (const t of ['premium', 'PRO ', 'admin', null, undefined, 0, {}]) {
    assert.equal(ha({ tier: t }, 'clipAuto'), false, `tier "${String(t)}" non deve aprire le clip`);
  }
});

test('il Base dà quello che promette e non di più', () => {
  assert.equal(ha({ tier: 'base' }, 'notifiche'), true);
  assert.equal(ha({ tier: 'base' }, 'telegram'), true);
  assert.equal(ha({ tier: 'base' }, 'studio'), true);
  assert.equal(ab.limite(ab.funzioniDi({ tier: 'base' }), 'moderatori'), 1);
  assert.equal(ha({ tier: 'base' }, 'clipAuto'), false, 'le clip restano un add-on');
  assert.equal(ha({ tier: 'base' }, 'voce'), false);
});

test('un add-on comprato si aggiunge, senza togliere il Base', () => {
  const f = ab.funzioniDi({ tier: 'base', pacchetti: ['clip'] });
  assert.equal(ab.abilitata(f, 'clipAuto'), true);
  assert.equal(ab.abilitata(f, 'telegram'), true, 'quello che c’era resta');
  assert.equal(ab.abilitata(f, 'voce'), false, 'quello che non hai comprato no');
});

test('gli add-on si sommano in qualunque forma arrivino', () => {
  const a = ab.funzioniDi({ tier: 'base', pacchetti: 'clip,voce' });
  const b = ab.funzioniDi({ tier: 'base', pacchetti: ['voce', 'clip'] });
  assert.deepEqual(a, b, 'CSV e array danno lo stesso risultato');
  assert.equal(ab.abilitata(a, 'clipAuto'), true);
  assert.equal(ab.abilitata(a, 'voce'), true);
});

test('un add-on che non esiste viene ignorato, non apre nulla', () => {
  const f = ab.funzioniDi({ tier: 'base', pacchetti: ['clip', 'inventato', '__proto__', 'constructor'] });
  assert.equal(ab.abilitata(f, 'clipAuto'), true);
  assert.equal(ab.abilitata(f, 'inventato'), false);
  assert.equal(ab.abilitata(f, 'voce'), false);
});

test('gli add-on senza Base non bastano da soli', () => {
  const f = ab.funzioniDi({ pacchetti: ['clip'] });
  assert.equal(ab.abilitata(f, 'clipAuto'), true, "l'add-on comprato vale");
  assert.equal(ab.abilitata(f, 'telegram'), false, 'ma non regala il Base');
});

test('"pro" (vecchio piano) resta tutto incluso', () => {
  const f = ab.funzioniDi({ tier: 'pro' });
  for (const id of ab.ADDON_IDS) {
    const a = ab.addonById(id);
    for (const [k, v] of Object.entries(a.funzioni)) {
      if (v === true || v === Infinity) assert.equal(ab.abilitata(f, k), true, `pro deve avere "${k}" (da ${id})`);
    }
  }
});

test('la community ha tutto', () => {
  const f = ab.funzioniDi({ tier: 'community' });
  for (const k of ['giochi', 'effetti', 'clipAuto', 'voce', 'notifiche', 'telegram', 'studio', 'overlay']) {
    assert.equal(ab.abilitata(f, k), true, `community deve avere "${k}"`);
  }
});

test('ogni add-on ha un id, un prezzo e un nome nelle tre lingue', () => {
  assert.ok(ab.ADDON.length >= 5);
  for (const a of ab.ADDON) {
    assert.match(a.id, /^[a-z]+$/, 'id pulito');
    assert.ok(a.prezzo > 0, `${a.id} ha un prezzo`);
    assert.equal(a.nome3.length, 3, `${a.id}: nome in tre lingue`);
    assert.equal(a.sommario3.length, 3, `${a.id}: sommario in tre lingue`);
    assert.ok(Object.keys(a.funzioni).length, `${a.id} sblocca qualcosa`);
  }
  assert.equal(new Set(ab.ADDON_IDS).size, ab.ADDON_IDS.length, 'nessun id ripetuto');
});

test('gli add-on ritirati non si vendono più, ma chi li aveva li tiene', () => {
  const p = ab.pianiPubblici();
  const offerti = p.addon.map((a) => a.id);
  for (const id of ['giochi', 'effetti', 'musica']) {
    assert.ok(!offerti.includes(id), `${id} non va più offerto`);
    assert.ok(p.ritirati.includes(id));
    assert.ok(ab.addonById(id).ritirato === true);
  }
  for (const id of ['clip', 'voce', 'squadra']) assert.ok(offerti.includes(id), `${id} resta in vendita`);
  // chi ha ancora 'giochi' nei metadata non perde niente e non rompe niente
  assert.equal(ab.abilitata(ab.funzioniDi({ tier: 'base', pacchetti: ['giochi', 'clip'] }), 'clipAuto'), true);
  assert.deepEqual(ab.normalizzaPacchetti('giochi,clip'), ['clip', 'giochi'].sort((x, y) => ab.ADDON_IDS.indexOf(x) - ab.ADDON_IDS.indexOf(y)));
});

test('il pacchetto «Tutto» copre solo ciò che si vende ancora, e costa meno della somma', () => {
  const b = ab.bundleById('tutto');
  assert.deepEqual([...b.addon].sort(), ['clip', 'squadra', 'voce']);
  assert.ok(b.prezzo < b.prezzoPieno, `${b.prezzo} < ${b.prezzoPieno}`);
  assert.equal(ab.bundleById('creator').ritirato, true);
  assert.equal(ab.bundleById('interazione').ritirato, true);
  assert.deepEqual(ab.pianiPubblici().bundle.map((x) => x.id), ['tutto']);
});

test('«illimitato» esce di casa come -1 anche da /api/me', () => {
  assert.deepEqual(ab.funzioniPubbliche({ moduli: Infinity, giochi: true, moderatori: 1 }), { moduli: -1, giochi: true, moderatori: 1 });
});

test('la vetrina pubblica non manda Infinity al browser', () => {
  const v = JSON.stringify(ab.pianiPubblici());
  assert.doesNotMatch(v, /null,"moduli"|Infinity/);
  assert.ok(v.includes('"moduli":-1') || v.includes('"moduli": -1'), 'illimitato viaggia come -1');
});

// ── I PREZZI SI TROVANO DA SOLI IN STRIPE ──────────────────────────────────
// Un finto elenco di prezzi come lo restituisce Stripe (con il prodotto espanso).
const prezzo = (id, nomeProd, cent, extra = {}, prod = {}) => ({
  id, unit_amount: cent, currency: 'eur', active: true, created: 100, recurring: { interval: 'month', interval_count: 1 },
  product: { id: 'prod_' + id, name: nomeProd, active: true, metadata: {}, ...prod }, ...extra,
});
const voceClip = ab.addonById('clip'), voceTutto = ab.bundleById('tutto');
const cent = (v) => Math.round(v.prezzo * 100);

test('il prezzo di una voce e\' quello del prodotto con il suo nome e con l\'importo del listino', () => {
  const lista = [
    prezzo('price_clip_vecchio', 'Clip Automatiche', 99, { created: 50 }),          // importo vecchio, ancora attivo
    prezzo('price_clip', 'Clip Automatiche', cent(voceClip)),
    prezzo('price_base', 'Base', cent(ab.BASE)),
    prezzo('price_tutto_vecchio', 'Bundle Tutto', 1249),
    prezzo('price_tutto', 'Bundle Tutto', cent(voceTutto)),
  ];
  const e = ab.abbinaPrezzi([ab.BASE, voceClip, voceTutto], lista);
  assert.deepEqual(e.get('base'), { ok: true, price: 'price_base', motivo: '' });
  assert.deepEqual(e.get('addon_clip'), { ok: true, price: 'price_clip', motivo: '' }, 'fra due prezzi dello stesso prodotto vince l\'importo del listino, non il piu\' recente');
  assert.deepEqual(e.get('bundle_tutto'), { ok: true, price: 'price_tutto', motivo: '' }, '«Bundle Tutto» in Stripe e\' il pacchetto «Tutto»');
});

test('il nome si confronta senza maiuscole, accenti e segni; la chiave nei metadata vince sul nome', () => {
  const voceSquadra = ab.addonById('squadra');
  const lista = [
    prezzo('price_sq', '  squadra ', cent(voceSquadra)),
    prezzo('price_clip', 'Le mie clip', cent(voceClip), {}, { metadata: { socialbot: 'addon_clip' } }),
    prezzo('price_finto', 'Clip Automatiche', cent(voceClip), {}, { metadata: { socialbot: 'bundle_tutto' } }),
  ];
  const e = ab.abbinaPrezzi([voceSquadra, voceClip], lista);
  assert.equal(e.get('addon_squadra').price, 'price_sq');
  assert.equal(e.get('addon_clip').price, 'price_clip', 'il prodotto marcato «addon_clip» e\' il suo, anche con un altro nome');
});

test('un importo che non torna, un prodotto che manca o un prezzo archiviato non si vendono, e il motivo dice cosa c\'e\'', () => {
  const lista = [
    prezzo('price_clip_sbagliato', 'Clip Automatiche', 99),
    prezzo('price_base_arch', 'Base', cent(ab.BASE), { active: false }),
    prezzo('price_tutto_anno', 'Bundle Tutto', cent(voceTutto), { recurring: { interval: 'year', interval_count: 1 } }),
  ];
  const e = ab.abbinaPrezzi([ab.BASE, voceClip, voceTutto, ab.addonById('voce')], lista);
  assert.equal(e.get('addon_clip').ok, false);
  assert.match(e.get('addon_clip').motivo, /Stripe ha 99 eur\/month ≠ listino 199 eur\/month/);
  assert.equal(e.get('base').ok, false, 'un prezzo archiviato non vale');
  assert.equal(e.get('bundle_tutto').ok, false, 'un prezzo annuale non e\' il canone mensile');
  assert.equal(e.get('addon_voce').ok, false);
  assert.match(e.get('addon_voce').motivo, /nessun prodotto «Comandi Vocali»/);
  for (const [, x] of e) assert.equal(x.price, '', 'una voce non confermata non ha un id da vendere');
});

test('un id forzato dal .env vince sul nome, ma si verifica lo stesso', () => {
  const lista = [
    prezzo('price_a', 'Clip Automatiche', cent(voceClip)),
    prezzo('price_b', 'Altro nome', cent(voceClip)),
    prezzo('price_c', 'Clip Automatiche', 99),
  ];
  assert.equal(ab.abbinaPrezzi([voceClip], lista, { addon_clip: 'price_b' }).get('addon_clip').price, 'price_b');
  const c = ab.abbinaPrezzi([voceClip], lista, { addon_clip: 'price_c' }).get('addon_clip');
  assert.equal(c.ok, false, 'forzato ma con l\'importo sbagliato: non si vende');
  const z = ab.abbinaPrezzi([voceClip], lista, { addon_clip: 'price_zzz' }).get('addon_clip');
  assert.equal(z.ok, false); assert.match(z.motivo, /price_zzz/);
});

test('si cercano solo le voci in vendita: niente ritirati; con Stripe spento il listino si legge e basta', () => {
  const chiavi = ab.vociVendute().map((v) => v.id);
  assert.deepEqual(chiavi, ['base', 'clip', 'voce', 'squadra', 'tutto']);
  for (const id of ['giochi', 'effetti', 'musica']) assert.ok(!chiavi.includes(id));
  assert.equal(ab.vendibile(voceClip), true, 'senza Stripe non c\'e\' niente da confermare: il listino si mostra');
  assert.equal(ab.priceDi(voceClip), '', 'ma senza conferma non c\'e\' un id da mandare al checkout');
  assert.equal(ab.addonById('clip').prezzo + ab.addonById('voce').prezzo + ab.addonById('squadra').prezzo, 4.97, 'la somma dei tre extra e\' quella scritta ovunque');
});
