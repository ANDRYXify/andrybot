// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
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
    deleteMessage: async (c, m) => { f.chiamate.push(['cancella', c, m]); return cancella ? cancella(m) : { ok: true }; },
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

test('quello che si vede di un canale e\' di quel canale: nomi, motivi e conti degli altri restano fuori', async () => {
  const { e } = banco({ timeout: () => ({ ok: false, motivo: 'permesso mancante' }) });
  await e.esegui(v({ canale: 'tizio', login: 'bot1' }));
  await e.esegui(v({ canale: 'caio', login: 'bot2' }));
  await e.esegui(v({ canale: 'caio', login: 'bot3' }));
  assert.deepEqual(e.fallitiInSospeso({ canale: 'tizio' }).map((f) => f.login), ['bot1']);
  assert.deepEqual(e.fallitiInSospeso({ canale: 'caio' }).map((f) => f.login).sort(), ['bot2', 'bot3']);
  assert.equal(e.stato('tizio').inSospeso, 1);
  assert.equal(e.stato('tizio').falliti, 1, 'anche i conti sono del canale');
  assert.equal(e.stato('caio').decisi, 2);
  assert.equal(e.stato('nessuno').inSospeso, 0);
  assert.equal(e.stato().inSospeso, 3, 'il totale resta a chi guarda la macchina');
});

test('le viste per il pannello senza un canale non danno niente', async () => {
  const ab = await import('../../src/features/antibot.js');
  assert.equal(ab.statoEsecutore(), null);
  assert.deepEqual(ab.azioniFallite({ limite: 10 }), []);
  assert.deepEqual(ab.codaBan(), { in_attesa: 0, in_sospeso: 0 });
  const srv = (await import('node:fs')).readFileSync(new URL('../../src/web/server.js', import.meta.url), 'utf8');
  assert.ok(!/statoEsecutore\(\)|azioniFallite\(\{ limite: \d+ \}\)/.test(srv), 'il server passa sempre il canale');
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

// ─────────────────────────────────────────── quello che Twitch ha risposto

test('una cancellazione che Twitch rifiuta non risulta fatta', async () => {
  const { f, e } = banco({ cancella: () => ({ ok: false, motivo: 'permesso mancante (ri-concedi i permessi)' }) });
  const r = await e.esegui(v({ azione: E.AZIONI.CANCELLA, messaggio: 'm-rifiutato', login: 'rif', userId: 'urif' }));
  assert.equal(r.ok, false, 'rifiutata');
  assert.match(f.righe.at(-1).motivoTwitch || JSON.stringify(f.righe.at(-1)), /permesso mancante/, 'e il perche\' resta scritto');
  assert.ok(e.stato().falliti >= 1, 'e conta fra quelle da riprendere');
});

test('Twitch detto bene: 403 e\' un permesso, «gia\' bannato» e\' fatto, 409 si riprova', async () => {
  const { streamers } = await import('../../src/db.js');
  streamers.upsertApproved('twcanale', 'TwCanale', '99');
  const { Helix } = await import('../../src/twitch/helix.js');
  const risposta = { status: 0, testo: '' };
  const h = new Helix({ auth: { getToken: async () => 'tok' } });
  h._request = async () => { const err = new Error(`Helix → ${risposta.status} ${risposta.testo}`); err.status = risposta.status; throw err; };
  const prova = async (status, testo = '') => { risposta.status = status; risposta.testo = testo; return [await h.deleteMessage('twcanale', 'm1'), await h.timeoutUser('twcanale', 'u1', 0, 'x')]; };

  let [c, b] = await prova(403);
  assert.match(c.motivo, /permesso/); assert.match(b.motivo, /permesso/);
  [c, b] = await prova(400, '{"message":"The user specified in the user_id field is already banned."}');
  assert.equal(b.ok, true, 'gia\' bannato: il risultato c\'e\'');
  assert.equal(c.ok, false, 'un messaggio che non si puo\' cancellare resta un no');
  [, b] = await prova(409, '{"message":"You may not update the user\'s ban state while someone else is updating the state."}');
  assert.equal(b.ok, false, 'qualcuno la sta cambiando adesso: non e\' fatta');
  assert.equal(b.motivo, 'errore Twitch', 'e l\'esecutore la riprova');
  [c, b] = await prova(429);
  assert.equal(c.motivo, 'troppe richieste'); assert.equal(b.motivo, 'troppe richieste');
});

// ─────────────────────────────────────────── fermarsi

const orologiAccesi = () => process.getActiveResourcesInfo().filter((t) => t === 'Timeout').length;

test('fermarsi durante un rientro: chi aspettava ha subito un esito, e niente si perde', async () => {
  // Il caso peggiore: Twitch ha detto «piu' piano» e la fila dorme cinque
  // secondi. Un riavvio adesso non aspetta il rientro, non lascia un orologio
  // acceso e non perde le azioni in fila: diventano in sospeso, su disco.
  const { f, e } = banco({ timeout: () => ({ ok: false, motivo: 'troppe richieste' }) });
  const prima = orologiAccesi();
  const uno = e.esegui(v({ login: 'fermo1', userId: 'f1' }));
  const due = e.esegui(v({ login: 'fermo2', userId: 'f2' }));
  while (f.chiamate.length < 1) await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  assert.ok(orologiAccesi() > prima, 'la fila sta dormendo il suo rientro');
  const t0 = Date.now();
  await e.ferma();
  const esiti = await Promise.all([uno, due]);
  assert.ok(Date.now() - t0 < 1000, 'non si aspetta la fine del rientro');
  assert.equal(orologiAccesi(), prima, 'e nessun orologio resta acceso a tenere vivo il processo');
  assert.deepEqual(esiti.map((x) => [x.ok, x.motivo]), [[false, 'il bot si è fermato prima di farla'], [false, 'il bot si è fermato prima di farla']]);
  assert.equal(f.chiamate.length, 1, 'dopo lo stop Twitch non si chiama piu\'');
  const sospese = e.fallitiInSospeso({ canale: 'tizio' }).filter((x) => /^fermo/.test(x.login));
  assert.deepEqual(sospese.map((x) => x.login).sort(), ['fermo1', 'fermo2'], 'le azioni in fila restano da riprendere');
  assert.ok(f.righe.some((r) => r.login === 'fermo2' && r.esito === 'in-attesa'), 'e il registro lo dice');
  const tardi = await e.esegui(v({ login: 'fermo3', userId: 'f3' }));
  assert.equal(tardi.ok, false, 'un verdetto arrivato dopo lo stop non parte');
  assert.equal(f.chiamate.length, 1);
  assert.ok(e.fallitiInSospeso({ canale: 'tizio' }).some((x) => x.login === 'fermo3'), 'ma non si perde');
  await e.salvaFalliti();
  const dopo = new E.Esecutore({ helix: {}, annota: () => {} });
  await dopo.caricaFalliti();
  assert.ok(['fermo1', 'fermo2', 'fermo3'].every((l) => dopo.fallitiInSospeso({ canale: 'tizio' }).some((x) => x.login === l)), 'e al riavvio sono ancora li\'');
});

test('fermarsi senza conservare: la fila di una prova finisce con la prova', async () => {
  // E' il simulatore: i suoi verdetti sono un gioco, non un debito con Twitch.
  const { f, e } = banco();
  const fila = Array.from({ length: 30 }, (_, i) => e.esegui(v({ login: 'gioco' + i, userId: 'g' + i, azione: E.AZIONI.BLOCCA })));
  await e.ferma({ conserva: false });
  const esiti = await Promise.all(fila);
  assert.ok(esiti.filter((x) => !x.ok).length >= 28, 'quasi tutta la fila era ancora da fare');
  assert.equal(e.stato().inCoda, 0);
  assert.equal(e.fallitiInSospeso({ canale: 'tizio' }).filter((x) => /^gioco/.test(x.login)).length, 0, 'e niente diventa un debito');
  assert.ok(!f.righe.some((r) => r.esito === 'in-attesa'), 'ne\' una riga del registro');
  assert.ok(f.chiamate.length <= 2);
});

test('un\'azione caduta mentre si legge la lista di prima non sparisce sotto di lei', async () => {
  // All'avvio la lista dei falliti si legge dal disco, e intanto lo scudo
  // lavora gia'. Prima la lettura sostituiva la lista: una caduta nei primi
  // istanti spariva, in memoria e poi sul disco.
  const vecchio = new E.Esecutore({ helix: {}, annota: () => {} });
  vecchio._falliti = [{ ...v({ login: 'vecchio', userId: 'v0' }), motivo: 'permesso mancante', tentativi: 1, quando: Date.now() }];
  await vecchio.salvaFalliti();
  const { e } = banco({ timeout: () => ({ ok: false, motivo: 'permesso mancante' }) });
  const lettura = e.caricaFalliti();
  await e.esegui(v({ login: 'nuovo', userId: 'n0' }));
  await lettura;
  await e.ferma();
  assert.deepEqual(e.fallitiInSospeso({ canale: 'tizio' }).map((x) => x.login).sort(), ['nuovo', 'vecchio'], 'in memoria ci sono tutti e due');
  const dopo = new E.Esecutore({ helix: {}, annota: () => {} });
  await dopo.caricaFalliti();
  assert.deepEqual(dopo.fallitiInSospeso({ canale: 'tizio' }).map((x) => x.login).sort(), ['nuovo', 'vecchio'], 'e anche sul disco');
});
