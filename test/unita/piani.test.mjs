// I PIANI: chi ha diritto a cosa. Un errore qui non si vede a schermo — si vede
// sull'estratto conto. Da un lato uno che non paga usa funzioni a pagamento,
// dall'altro uno che paga si trova la porta chiusa e se ne va.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as ab from '../../src/features/abbonamenti.js';

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
