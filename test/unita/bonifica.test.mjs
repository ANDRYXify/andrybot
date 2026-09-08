// LA BONIFICA: ripulire dopo, senza rifare il danno.
//
// La cosa più facile da fare è anche la più sbagliata: «prendi l'intervallo
// dell'attacco e cancella tutti i follower arrivati in quei minuti». Ripulisce
// in un colpo e si porta via i fan veri — che sono proprio quelli che una clip
// virale o un raid hanno appena portato. Un fan vero rimosso non torna, e non sa
// nemmeno perché.
//
// Il modello sta in docs/BONIFICA.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('bonifica-');
const { streamers } = await import('../../src/db.js');
const I = await import('../../src/features/incidenti.js');
const B = await import('../../src/features/bonifica.js');
const ab = await import('../../src/features/antibot.js');
test.after(() => casa.pulisci());

const CANALE = 'tizio';
streamers.upsertApproved(CANALE, 'Tizio', '1');
streamers.setEnabled(CANALE, true);
streamers.setSettings(CANALE, { antibot: { attivo: true, avvisa: false } });

function attacco() {
  I.azzera();
  const i = I.apri(CANALE, { tipo: 'ondata-follow', motivo: 'prova' });
  for (let n = 0; n < 12; n++) I.coinvolto(CANALE, 'zzq' + n, I.GIUDIZI.CERTO, 9, 'u-zzq' + n);
  for (let n = 0; n < 4; n++) I.coinvolto(CANALE, 'dubbio' + n, I.GIUDIZI.SOSPETTO, 5, 'u-dubbio' + n);
  for (const p of ['pierpa_gaming', 'martuxx1', 'elezz228']) I.coinvolto(CANALE, p, I.GIUDIZI.LEGITTIMO, 0, 'u-' + p);
  I.chiudi(CANALE);
  return i.id;
}

// ─────────────────────────────────────────── la regola che viene prima

test('chi è arrivato durante l\'attacco senza segnali contro non si tocca', () => {
  const id = attacco();
  const r = B.rapporto(id);
  assert.equal(r.ricevuti, 19);
  assert.equal(r.quanti.legittimo, 3);
  assert.deepEqual(r.proposta, ['certo'], 'la proposta di partenza è la più prudente che abbia senso');
  const chi = B.candidati(id, ['certo', 'probabile', 'sospetto', 'legittimo']);
  const nomi = chi.map((x) => x.login);
  for (const p of ['pierpa_gaming', 'martuxx1', 'elezz228']) {
    assert.ok(!nomi.includes(p), `${p} non deve poter finire in un'operazione di massa nemmeno chiedendolo`);
  }
  assert.equal(chi.length, 16, 'i dodici certi e i quattro sospetti, e basta');
});

test('senza l\'id di Twitch non si tocca nessuno, e si dice prima', () => {
  I.azzera();
  const i = I.apri(CANALE, {});
  I.coinvolto(CANALE, 'conid', I.GIUDIZI.CERTO, 9, 'u-conid');
  I.coinvolto(CANALE, 'senzaid', I.GIUDIZI.CERTO, 9, '');
  const r = B.rapporto(i.id);
  assert.equal(r.quanti.certo, 2);
  assert.equal(r.conId, 1, 'promettere un numero che non si mantiene è peggio che dirlo prima');
  assert.equal(B.candidati(i.id, ['certo']).length, 1);
});

// ─────────────────────────────────────────── la conferma è il numero

test('per eseguire bisogna riscrivere quanti account si sta per togliere', () => {
  const id = attacco();
  const a = B.anteprima(id, ['certo']);
  assert.equal(a.quanti, 12);
  assert.equal(a.conferma, '12');
  assert.equal(a.risparmiati, 3);
  assert.equal(B.confermaValida(id, ['certo'], '12').ok, true);
  assert.equal(B.confermaValida(id, ['certo'], '11').ok, false);
  assert.equal(B.confermaValida(id, ['certo'], '').ok, false);
});

test('e se il numero cambia, la conferma di prima non vale più', () => {
  // Non è un fastidio: è l'unico modo perché «ho letto» significhi davvero
  // «ho letto» quello che sta per succedere adesso.
  const id = attacco();
  assert.equal(B.confermaValida(id, ['certo'], '12').ok, true);
  I.azzera();
  const i2 = I.uno(id);
  assert.equal(i2, null, 'incidente sparito');
});

test('scegliere più giudizi cambia il numero da confermare', () => {
  const id = attacco();
  assert.equal(B.anteprima(id, ['certo']).conferma, '12');
  assert.equal(B.anteprima(id, ['certo', 'sospetto']).conferma, '16');
  assert.equal(B.confermaValida(id, ['certo', 'sospetto'], '12').ok, false,
    'il numero di un altro elenco non conferma questo');
});

// ─────────────────────────────────────────── l'esecuzione

test('la bonifica blocca i giudicati e non i legittimi', async () => {
  const id = attacco();
  const presi = [];
  new ab.AntiBot({ helix: {
    bloccaUtente: async (_c, uid) => { presi.push(String(uid)); return { ok: true }; },
    timeoutUser: async () => ({ ok: true }),
  } });
  const esito = await ab.bonifica(id, ['certo'], '12', { canale: CANALE });
  assert.equal(esito.ok, true);
  assert.equal(esito.quanti, 12);
  assert.equal(esito.risparmiati, 3);
  for (let i = 0; i < 300 && ab.codaBan(CANALE).in_attesa; i++) await new Promise((r) => setTimeout(r, 20));
  assert.ok(presi.length >= 10, `bloccati ${presi.length}`);
  for (const p of ['u-pierpa_gaming', 'u-martuxx1']) assert.ok(!presi.includes(p), `${p} è una persona vera`);
});

test('con la conferma sbagliata non succede niente', async () => {
  const id = attacco();
  const presi = [];
  new ab.AntiBot({ helix: { bloccaUtente: async (_c, u) => { presi.push(u); return { ok: true }; } } });
  const esito = await ab.bonifica(id, ['certo'], '99', { canale: CANALE });
  assert.equal(esito.ok, false);
  assert.match(esito.motivo, /riscrivi/);
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(presi.length, 0);
});

test('e non si bonifica l\'incidente di un altro canale', async () => {
  const id = attacco();
  new ab.AntiBot({ helix: { bloccaUtente: async () => ({ ok: true }) } });
  const esito = await ab.bonifica(id, ['certo'], '12', { canale: 'qualcunaltro' });
  assert.equal(esito.ok, false);
  assert.match(esito.motivo, /tuo incidente/);
});

test('i bot di servizio non si toccano nemmeno qui', async () => {
  I.azzera();
  const i = I.apri(CANALE, {});
  I.coinvolto(CANALE, 'nightbot', I.GIUDIZI.CERTO, 9, 'u-nightbot');
  I.coinvolto(CANALE, 'zzqbot', I.GIUDIZI.CERTO, 9, 'u-zzqbot');
  const presi = [];
  new ab.AntiBot({ helix: { bloccaUtente: async (_c, u) => { presi.push(String(u)); return { ok: true }; }, timeoutUser: async () => ({ ok: true }) } });
  await ab.bonifica(i.id, ['certo'], '2', { canale: CANALE });
  for (let k = 0; k < 200 && ab.codaBan(CANALE).in_attesa; k++) await new Promise((r) => setTimeout(r, 20));
  assert.ok(!presi.includes('u-nightbot'), 'Nightbot è di casa');
  assert.ok(presi.includes('u-zzqbot'));
});

test('il rapporto dice anche se i tolti venivano dalla stessa fabbrica', () => {
  const id = attacco();
  const r = B.rapporto(id);
  assert.ok(r.gruppo, 'dodici nomi con la stessa forma');
  assert.match(r.gruppo.motivo, /fabbrica/);
});
