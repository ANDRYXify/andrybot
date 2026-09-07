// CHI ESEGUE, E NON È CHI DECIDE.
//
// Finché il pezzo che giudicava chiamava anche Twitch nella stessa riga, quattro
// cose non esistevano: provare a vuoto senza toccare nessuno, disfare, sapere
// cosa si è chiesto e cosa è tornato, e riprendere un'azione caduta. Sembravano
// dettagli finché non servivano — cioè durante un attacco.
//
// Il modello sta in docs/PIATTAFORMA.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('enforce-');
const E = await import('../../src/features/enforcement.js');
test.after(() => casa.pulisci());

function banco({ blocca, timeout, cancella } = {}) {
  const f = { chiamate: [], righe: [] };
  const helix = {
    bloccaUtente: async (c, id) => { f.chiamate.push(['blocca', c, id]); return blocca ? blocca(id) : { ok: true }; },
    timeoutUser: async (c, id, d) => { f.chiamate.push(['timeout', c, id, d]); return timeout ? timeout(id) : { ok: true }; },
    deleteMessage: async (c, m) => { f.chiamate.push(['cancella', c, m]); if (cancella) return cancella(m); },
  };
  const e = new E.Esecutore({ helix, annota: (ch, riga) => f.righe.push({ ch, ...riga }) });
  return { f, e };
}
const v = (o) => E.verdetto({ canale: 'tizio', login: 'bot1', userId: 'u1', azione: E.AZIONI.BAN, motivi: ['prova'], ...o });

// ─────────────────────────────────────────── a vuoto

test('decisi ed eseguiti sono due numeri diversi', () => {
  // Fra i due c'è il rate limit di Twitch, che può essere minuti: chi guarda
  // deve poter distinguere «non l'ha visto» da «non ha ancora fatto in tempo».
  const { e } = banco();
  const molti = Array.from({ length: 5 }, (_, i) => v({ login: 'b' + i, userId: 'u' + i, azione: E.AZIONI.BLOCCA }));
  molti.forEach((x) => e.esegui(x));
  const s = e.stato();
  assert.equal(s.decisi, 5, 'decisi subito');
  assert.ok(s.chiesti < 5, `chiesti ${s.chiesti}: la coda va al suo passo`);
});

test('a vuoto si decide tutto e non si tocca nessuno', async () => {
  const { f, e } = banco();
  const r = await e.esegui(v({ aVuoto: true }));
  assert.equal(r.ok, true);
  assert.equal(r.aVuoto, true);
  assert.equal(f.chiamate.length, 0, 'nessuna chiamata a Twitch');
  assert.equal(f.righe[0].esito, 'a-vuoto', 'ma resta scritto cosa si sarebbe fatto');
  assert.equal(f.righe[0].azione, 'ban');
  assert.equal(e.stato().aVuoto, 1);
});

// ─────────────────────────────────────────── il registro dice cosa e come

test('nel registro c\'è cosa si è chiesto e cosa ha risposto Twitch', async () => {
  const { f, e } = banco({ timeout: () => ({ ok: false, motivo: 'permesso mancante' }) });
  await e.esegui(v({ motivi: ['nome da bot', 'account di oggi'] }));
  const r = f.righe[0];
  assert.equal(r.esito, 'fallito');
  assert.equal(r.risposta, 'permesso mancante', '«fallito» da solo non risponde a nessuno');
  assert.equal(r.motivo, 'nome da bot, account di oggi');
  assert.ok(r.verdetto, 'e la riga porta l\'id del verdetto, per risalire alla decisione');
});

test('decidere di non fare niente è una decisione, e si scrive', async () => {
  const { f, e } = banco();
  await e.esegui(v({ azione: E.AZIONI.OSSERVA }));
  assert.equal(f.chiamate.length, 0);
  assert.equal(f.righe.length, 1, '«non ha fatto niente» e «non se n\'è accorto» non devono leggersi uguali');
});

// ─────────────────────────────────────────── idempotenza

test('lo stesso evento consegnato due volte non banna due volte', async () => {
  const { f, e } = banco();
  const a = await e.esegui(v({}));
  const b = await e.esegui(v({}));
  assert.equal(a.ok, true);
  assert.equal(b.doppione, true);
  assert.equal(f.chiamate.length, 1, 'Twitch chiamato una volta sola');
  assert.equal(e.stato().doppioni, 1);
});

test('ma due azioni diverse sulla stessa persona passano entrambe', async () => {
  const { f, e } = banco();
  await e.esegui(v({ azione: E.AZIONI.CANCELLA, messaggio: 'm1' }));
  await e.esegui(v({ azione: E.AZIONI.BAN }));
  assert.equal(f.chiamate.length, 2);
});

// ─────────────────────────────────────────── niente si perde

test('un\'azione fallita resta scritta e si può riprendere', async () => {
  let va = false;
  const { f, e } = banco({ timeout: () => (va ? { ok: true } : { ok: false, motivo: 'permesso mancante' }) });
  await e.esegui(v({}));
  assert.equal(e.stato().inSospeso, 1, 'non finisce in una riga di log e via');
  const in_sospeso = e.fallitiInSospeso();
  assert.equal(in_sospeso[0].login, 'bot1');
  assert.equal(in_sospeso[0].motivo, 'permesso mancante');

  va = true;
  const ripresi = e.riprovaFalliti('tizio');
  assert.equal(ripresi, 1);
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(e.stato().inSospeso, 0, 'ripresa e andata a buon fine');
  assert.equal(e.stato().fatti, 1);
});

test('la coda dei falliti sopravvive a un riavvio', async () => {
  const { e } = banco({ blocca: () => ({ ok: false, motivo: 'permesso mancante' }), timeout: () => ({ ok: false, motivo: 'permesso mancante' }) });
  await e.esegui(v({ azione: E.AZIONI.BLOCCA }));
  await e.salvaFalliti();
  const dopo = new E.Esecutore({ helix: {}, annota: () => {} });
  assert.equal(dopo.stato().inSospeso, 0);
  await dopo.caricaFalliti();
  assert.equal(dopo.stato().inSospeso, 1, 'un\'azione non riuscita è un debito, non una finestra di trenta secondi');
});

// ─────────────────────────────────────────── il rientro sul 429

test('un 429 non è un fallimento: si rientra e si riprova', async () => {
  let giri = 0;
  const { f, e } = banco({ timeout: () => (++giri === 1 ? { ok: false, motivo: 'errore Twitch' } : { ok: true }) });
  const r = await e.esegui(v({}));
  assert.equal(r.ok, true, 'al secondo giro passa');
  assert.equal(f.chiamate.length, 2);
  assert.equal(e.stato().inSospeso, 0);
});

// ─────────────────────────────────────────── l'ordine

test('un messaggio di spam si toglie prima di ripulire mille follow', async () => {
  // Quello che è già partito non si può disfare: l'ordine vale su chi è ancora
  // in fila. Il primo blocco è gia' in volo, la cancellazione passa davanti a
  // tutti gli altri quattro.
  const { f, e } = banco();
  const fatti = [];
  for (let i = 0; i < 5; i++) fatti.push(e.esegui(v({ login: 'onda' + i, userId: 'o' + i, azione: E.AZIONI.BLOCCA })));
  fatti.push(e.esegui(v({ login: 'spammer', userId: 's1', azione: E.AZIONI.CANCELLA, messaggio: 'm9' })));
  await Promise.all(fatti);
  assert.equal(f.chiamate[1][0], 'cancella', 'con mille blocchi davanti, una cancellazione arriverebbe a cose fatte');
  assert.equal(f.chiamate.length, 6);
});

// ─────────────────────────────────────────── il blocco e il suo ripiego

test('se il blocco non si può fare si ripiega sul ban, e resta scritto', async () => {
  const { f, e } = banco({ blocca: () => ({ ok: false, motivo: 'permesso mancante' }) });
  const r = await e.esegui(v({ azione: E.AZIONI.BLOCCA }));
  assert.equal(r.ok, true);
  assert.equal(r.ripiego, 'ban');
  assert.deepEqual(f.chiamate.map((c) => c[0]), ['blocca', 'timeout']);
  assert.match(f.righe[0].risposta, /ripiego/, 'chi legge deve sapere che il follow è rimasto');
});

test('il timeout porta la sua durata, il ban no', async () => {
  const { f, e } = banco();
  await e.esegui(v({ azione: E.AZIONI.TIMEOUT, durata: 600 }));
  await e.esegui(v({ azione: E.AZIONI.BAN }));
  assert.equal(f.chiamate[0][3], 600);
  assert.equal(f.chiamate[1][3], 0);
});

test('cancellare senza l\'id del messaggio non chiama niente', async () => {
  const { f, e } = banco();
  const r = await e.esegui(v({ azione: E.AZIONI.CANCELLA }));
  assert.equal(r.ok, false);
  assert.equal(f.chiamate.length, 0);
});

test('un errore che scoppia non ferma la coda', async () => {
  const { f, e } = banco({ timeout: () => { throw new Error('rete storta'); } });
  const r = await e.esegui(v({}));
  assert.equal(r.ok, false);
  assert.match(r.motivo, /rete storta/);
  const dopo = await e.esegui(v({ login: 'altro', userId: 'u2', azione: E.AZIONI.CANCELLA, messaggio: 'm1' }));
  assert.equal(dopo.ok, true, 'la fila va avanti');
});
