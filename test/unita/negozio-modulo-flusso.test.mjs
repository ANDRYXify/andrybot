// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL MODULO DI UN ARTICOLO, dalla chat alla chat (docs/NEGOZIO.md, «Il modulo»):
//  · `!compra torneo` non spende niente: da' il link del modulo;
//  · il modulo da' un codice, e solo chi ha scritto `!compra` lo puo' usare,
//    dallo stesso account e dalla stessa piattaforma, entro il quarto d'ora;
//  · col codice si compra una volta sola, con le risposte di quell'invio;
//  · se non si compra (le monete, l'overlay) il codice vale ancora;
//  · un modulo cambiato nel frattempo si ricompila; un articolo tolto si porta
//    via i suoi moduli; le bozze escono con l'account e se ne vanno con lui.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('negozio-modulo-');
const { streamers, points, negozio: N, db } = await import('../../src/db.js');
const S = await import('../../src/features/negozio.js');
const M = await import('../../src/features/negozio-moduli.js');
test.after(() => casa.pulisci());

const ORA = Date.UTC(2026, 9, 3, 18);
let giro = 0;
function canale(monete = {}) {
  const ch = `modulo${++giro}`;
  streamers.upsertApproved(ch, ch);
  streamers.setSettings(ch, { negozio: { attivo: true } });
  for (const [u, n] of Object.entries(monete)) points.dai(ch, u, n);
  return ch;
}
function articolo(ch, grezzo) {
  const n = S.normArticolo({ nome: 'Torneo', parola: 'torneo', tipo: 'mano', prezzo: 100, ...grezzo });
  assert.ok(n.ok, `articolo valido: ${n.errore}`);
  const r = N.salva(ch, n.articolo);
  assert.ok(r.ok);
  return r.articolo;
}
const CAMPI = [{ etichetta: 'Il tuo nome Discord' }, { etichetta: 'Rank', tipo: 'scelta', opzioni: ['Oro', 'Platino'], obbligatorio: false }];
const msg = (ch, user, extra = {}) => ({ channel: ch, user, display: user.toUpperCase(), userId: `id-${user}`, tags: { 'badge-info': '', badges: '' }, ...extra });
const giroDi = (ch, esecutori = {}) => ({ canale: ch, esecutori, fonti: {}, ora: ORA });
const tokenDa = (frase) => (/\/m\/([\w-]{22})/.exec(frase) || [])[1];
const codiceDi = (ch, token, risposte, ora = ORA) => N.invia(ch, token, risposte, { maxInvii: M.MAX_INVII, codice: () => String(1000 + Math.floor(Math.random() * 9000)), ora });

test('«!compra torneo» non spende niente: da\' il link del modulo, e il link e\' una bozza di chi l\'ha scritto', async () => {
  const ch = canale({ ada: 500 });
  articolo(ch, { campi: CAMPI });
  const e = await S.compra({ ...giroDi(ch), msg: msg(ch, 'ada'), parola: 'torneo' });
  assert.equal(e.ok, false);
  assert.equal(e.momento, 'modulo');
  assert.equal(points.get(ch, 'ada'), 500);
  const f = S.frase(ch, e.momento, e.dati);
  assert.match(f, /per Torneo c'è un modulo da compilare: \S+\/u\/modulo\d+\/m\/[\w-]{22} Poi scrivi qui il codice che ti dà\. Vale 15 minuti\./);
  const b = N.bozza(ch, tokenDa(f), ORA);
  assert.equal(b.user, 'ada');
  assert.equal(b.piattaforma, 'twitch');
  assert.equal(N.bozza('altrocanale', tokenDa(f), ORA), null, 'la bozza e\' di quel canale');
  assert.equal(N.bozza(ch, tokenDa(f), ORA + M.VITA_BOZZA_MS + 1), null, 'e dura un quarto d\'ora');
  const di_nuovo = await S.compra({ ...giroDi(ch), msg: msg(ch, 'ada'), parola: 'torneo' });
  assert.equal(N.bozza(ch, tokenDa(f), ORA), null, 'chi riscrive !compra riceve un modulo nuovo, e quello di prima non vale piu\'');
  assert.ok(N.bozza(ch, di_nuovo.dati.url.split('/m/')[1], ORA));
});

test('solo chi ha scritto !compra puo\' usare il codice: stesso account, stessa piattaforma, entro il quarto d\'ora', async () => {
  const ch = canale({ ada: 500, ivo: 500 });
  articolo(ch, { campi: CAMPI });
  const e = await S.compra({ ...giroDi(ch), msg: msg(ch, 'ada'), parola: 'torneo' });
  const token = e.dati.url.split('/m/')[1];
  const codice = codiceDi(ch, token, [{ etichetta: 'Il tuo nome Discord', valore: 'ada#1' }]);
  assert.match(codice, /^\d{4}$/);
  const ivo = await S.confermaModulo({ ...giroDi(ch), msg: msg(ch, 'ivo'), codice });
  assert.equal(ivo.momento, 'moduloCodice', 'il codice di un altro non vale');
  const kick = await S.confermaModulo({ ...giroDi(ch), msg: msg(ch, 'ada', { piattaforma: 'kick' }), codice });
  assert.equal(kick.momento, 'moduloCodice', 'ne\' dallo stesso nome su un\'altra piattaforma');
  const tardi = await S.confermaModulo({ ...giroDi(ch), msg: msg(ch, 'ada'), codice, ora: ORA + M.VITA_BOZZA_MS + 1 });
  assert.equal(tardi.momento, 'moduloCodice', 'ne\' dopo la scadenza');
  assert.equal(points.get(ch, 'ivo'), 500);
  assert.equal(points.get(ch, 'ada'), 500, 'nessuno ha speso niente');
  assert.match(S.frase(ch, ivo.momento, ivo.dati), /quel codice non vale: il modulo è scaduto, o il codice non è tuo\. Riscrivi !compra/);
});

test('col codice si compra una volta sola, con le risposte di QUELL\'invio', async () => {
  const ch = canale({ ada: 500 });
  articolo(ch, { campi: CAMPI });
  const e = await S.compra({ ...giroDi(ch), msg: msg(ch, 'ada'), parola: 'torneo' });
  const token = e.dati.url.split('/m/')[1];
  const primo = codiceDi(ch, token, [{ etichetta: 'Il tuo nome Discord', valore: 'sbagliato' }]);
  const secondo = codiceDi(ch, token, [{ etichetta: 'Il tuo nome Discord', valore: 'ada#1' }, { etichetta: 'Rank', valore: 'Oro' }]);
  assert.notEqual(primo, secondo, 'ogni invio ha il suo codice');
  const detti = [];
  await S.tryComando({ ...msg(ch, 'ada'), text: `!compra #${secondo}` }, (t) => detti.push(t), { esecutori: {}, fonti: {} });
  assert.match(detti[0], /Torneo è in coda/);
  const [r] = N.coda(ch);
  assert.deepEqual(JSON.parse(r.risposte), [{ etichetta: 'Il tuo nome Discord', valore: 'ada#1' }, { etichetta: 'Rank', valore: 'Oro' }], 'vale l\'invio del codice scritto');
  assert.equal(points.get(ch, 'ada'), 400);
  assert.equal(N.bozza(ch, token), null, 'comprato, la bozza se ne va con le sue risposte');
  const ancora = [];
  await S.tryComando({ ...msg(ch, 'ada'), text: `!compra #${primo}` }, (t) => ancora.push(t), { esecutori: {}, fonti: {} });
  assert.match(ancora[0], /quel codice non vale/, 'e gli altri codici di quel modulo con lei');
  assert.equal(points.get(ch, 'ada'), 400);
  const vista = S.vistaPannello(ch).coda[0];
  assert.deepEqual(vista.risposte.map((x) => x.valore), ['ada#1', 'Oro'], 'la scheda legge le risposte');
  assert.ok(!('ricevuta' in vista) && !('channel' in vista), 'e non riceve quello che serve solo al database');
});

test('due codici scritti insieme comprano una volta sola', async () => {
  const ch = canale({ ada: 500 });
  articolo(ch, { campi: CAMPI });
  const e = await S.compra({ ...giroDi(ch), msg: msg(ch, 'ada'), parola: 'torneo' });
  const codice = codiceDi(ch, e.dati.url.split('/m/')[1], [{ etichetta: 'Il tuo nome Discord', valore: 'ada#1' }]);
  const lento = { mano: undefined };
  const [x, y] = await Promise.all([
    S.confermaModulo({ ...giroDi(ch, lento), msg: msg(ch, 'ada'), codice }),
    S.confermaModulo({ ...giroDi(ch, lento), msg: msg(ch, 'ada'), codice }),
  ]);
  assert.deepEqual([x.ok, y.ok].sort(), [false, true]);
  assert.equal(points.get(ch, 'ada'), 400);
  assert.equal(N.coda(ch).length, 1);
});

test('se non si compra il codice vale ancora: le monete arrivano, e si riprova', async () => {
  const ch = canale({ ada: 50 });
  articolo(ch, { campi: CAMPI });
  const e = await S.compra({ ...giroDi(ch), msg: msg(ch, 'ada'), parola: 'torneo' });
  assert.equal(e.momento, 'monete', 'quello che dice di no senza toccare niente viene prima del modulo');
  points.dai(ch, 'ada', 100);
  const e2 = await S.compra({ ...giroDi(ch), msg: msg(ch, 'ada'), parola: 'torneo' });
  const token = e2.dati.url.split('/m/')[1];
  const codice = codiceDi(ch, token, [{ etichetta: 'Il tuo nome Discord', valore: 'ada#1' }]);
  articolo(ch, { nome: 'Spada', parola: 'spada', tipo: 'oggetto', prezzo: 100 });
  assert.equal((await S.compra({ ...giroDi(ch), msg: msg(ch, 'ada'), parola: 'spada' })).momento, 'fattoBorsa', 'nel frattempo spende le monete altrove');
  const no = await S.confermaModulo({ ...giroDi(ch), msg: msg(ch, 'ada'), codice });
  assert.equal(no.momento, 'monete', 'i controlli di sempre, alla conferma');
  assert.ok(N.bozza(ch, token, ORA), 'e la bozza resta');
  points.dai(ch, 'ada', 100);
  const si = await S.confermaModulo({ ...giroDi(ch), msg: msg(ch, 'ada'), codice });
  assert.equal(si.momento, 'fattoCoda');
});

test('un modulo cambiato nel frattempo si ricompila; un articolo tolto si porta via i suoi moduli', async () => {
  const ch = canale({ ada: 500 });
  const a = articolo(ch, { campi: CAMPI });
  const e = await S.compra({ ...giroDi(ch), msg: msg(ch, 'ada'), parola: 'torneo' });
  const codice = codiceDi(ch, e.dati.url.split('/m/')[1], [{ etichetta: 'Il tuo nome Discord', valore: 'ada#1' }]);
  N.salva(ch, S.normArticolo({ ...a, campi: [...CAMPI, { etichetta: 'Fuso orario' }] }).articolo);
  const r = await S.confermaModulo({ ...giroDi(ch), msg: msg(ch, 'ada'), codice });
  assert.equal(r.momento, 'modulo', 'le risposte erano di un altro modulo: arriva quello nuovo');
  assert.equal(points.get(ch, 'ada'), 500);
  const token = r.dati.url.split('/m/')[1];
  assert.ok(N.bozza(ch, token, ORA));
  N.togli(ch, a.id);
  assert.equal(N.bozza(ch, token, ORA), null);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM negozio_risposte WHERE channel=?').get(ch).n, 0);
});

test('la riga basta per un campo solo; una scelta che non c\'e\' porta al modulo', async () => {
  const ch = canale({ ada: 500, ivo: 500 });
  articolo(ch, { campi: [{ etichetta: 'Rank', tipo: 'scelta', opzioni: ['Oro', 'Platino'] }] });
  const ok = await S.compra({ ...giroDi(ch), msg: msg(ch, 'ada'), parola: 'torneo', nota: 'platino' });
  assert.equal(ok.momento, 'fattoCoda');
  assert.deepEqual(JSON.parse(N.coda(ch)[0].risposte), [{ etichetta: 'Rank', valore: 'Platino' }]);
  assert.equal(N.coda(ch)[0].nota, '', 'la riga era la risposta, non una nota in piu\'');
  const no = await S.compra({ ...giroDi(ch), msg: msg(ch, 'ivo'), parola: 'torneo', nota: 'bronzo' });
  assert.equal(no.momento, 'modulo');
  assert.match(S.frase(ch, no.momento, no.dati), /Rank: Rispondi così: !compra torneo e la tua risposta, oppure dal modulo:/);
  assert.equal(points.get(ch, 'ivo'), 500);
});

test('per la canzone la riga e\' la canzone: il modulo la tiene, e alla conferma arriva a Spotify', async () => {
  const ch = canale({ ada: 500 });
  articolo(ch, { nome: 'Canzone', parola: 'canzone', tipo: 'musica', campi: [{ etichetta: 'A chi la dedichi' }] });
  const senza = await S.compra({ ...giroDi(ch), msg: msg(ch, 'ada'), parola: 'canzone' });
  assert.equal(senza.momento, 'serveTesto', 'prima la canzone');
  const sentite = [];
  const musica = { puoPartire: () => '', esegui: async ({ nota }) => { sentite.push(nota); return { ok: true, dati: { brano: nota } }; } };
  const e = await S.compra({ ...giroDi(ch, { musica }), msg: msg(ch, 'ada'), parola: 'canzone', nota: 'Bohemian Rhapsody' });
  assert.equal(e.momento, 'modulo', 'una riga non risponde al modulo di chi la usa come contenuto');
  const codice = codiceDi(ch, e.dati.url.split('/m/')[1], [{ etichetta: 'A chi la dedichi', valore: 'alla chat' }]);
  const r = await S.confermaModulo({ ...giroDi(ch, { musica }), msg: msg(ch, 'ada'), codice });
  assert.equal(r.momento, 'fattoMusica');
  assert.deepEqual(sentite, ['Bohemian Rhapsody']);
  const [riga] = N.storico(ch).righe;
  assert.equal(riga.nota, 'Bohemian Rhapsody');
  assert.deepEqual(JSON.parse(riga.risposte), [{ etichetta: 'A chi la dedichi', valore: 'alla chat' }]);
});

test('il modulo si manda un numero limitato di volte, e i codici di chi compra non si ripetono', async () => {
  const ch = canale({ ada: 500 });
  articolo(ch, { campi: CAMPI });
  articolo(ch, { nome: 'Altro', parola: 'altro', campi: CAMPI });
  const t1 = (await S.compra({ ...giroDi(ch), msg: msg(ch, 'ada'), parola: 'torneo' })).dati.url.split('/m/')[1];
  const t2 = (await S.compra({ ...giroDi(ch), msg: msg(ch, 'ada'), parola: 'altro' })).dati.url.split('/m/')[1];
  let n = 0;
  const dammi = () => ['1111', '1111', '2222'][n++ % 3];
  const c1 = N.invia(ch, t1, [], { maxInvii: 3, codice: dammi, ora: ORA });
  const c2 = N.invia(ch, t2, [], { maxInvii: 3, codice: dammi, ora: ORA });
  assert.equal(c1, '1111');
  assert.equal(c2, '2222', 'due moduli vivi della stessa persona non hanno lo stesso codice');
  N.invia(ch, t1, [], { maxInvii: 3, codice: () => '3333', ora: ORA });
  N.invia(ch, t1, [], { maxInvii: 3, codice: () => '4444', ora: ORA });
  assert.equal(N.invia(ch, t1, [], { maxInvii: 3, codice: () => '5555', ora: ORA }), null, 'oltre il tetto, niente');
});

test('le bozze escono con l\'esportazione, se ne vanno con l\'account e con la pulizia', async () => {
  const { tabelleDiCanale } = await import('../../src/features/esporta.js');
  const nomi = tabelleDiCanale().map((t) => t.tabella);
  assert.ok(nomi.includes('negozio_bozze') && nomi.includes('negozio_risposte'));
  const ch = canale({ ada: 500 });
  articolo(ch, { campi: CAMPI });
  const t = (await S.compra({ ...giroDi(ch), msg: msg(ch, 'ada'), parola: 'torneo' })).dati.url.split('/m/')[1];
  codiceDi(ch, t, [{ etichetta: 'Il tuo nome Discord', valore: 'ada#1' }]);
  N.pota(ORA + M.VITA_BOZZA_MS + 1);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM negozio_bozze WHERE channel=?').get(ch).n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM negozio_risposte WHERE channel=?').get(ch).n, 0, 'le risposte non confermate non restano');
});

test('la pagina del modulo: solo la bozza viva di quel canale, gli errori accanto ai campi, e il codice', async () => {
  const P = await import('../../src/features/negozio-pagina.js');
  const ch = canale({ ada: 500 });
  const a = articolo(ch, { campi: CAMPI });
  const e = await S.compra({ ...giroDi(ch), msg: msg(ch, 'ada'), parola: 'torneo' });
  const token = e.dati.url.split('/m/')[1];
  const ora = ORA + 1000;
  const vista = P.paginaModulo(ch, token, { ora });
  assert.equal(vista.stato, 'modulo');
  assert.match(vista.html, /Prima di comprare «Torneo»/);
  assert.match(vista.html, /Compri come ADA su Twitch\./);
  assert.match(vista.html, new RegExp(`<form method="post" action="/u/${ch}/m/${token}" novalidate>`));
  assert.equal(P.paginaModulo('altrocanale', token, { ora }).stato, 'fine', 'la chiave di un canale non apre un altro canale');
  assert.equal(P.paginaModulo(ch, token, { ora: ORA + M.VITA_BOZZA_MS + 1 }).stato, 'fine', 'scaduta, non c\'e\' piu\'');
  const male = P.paginaModulo(ch, token, { invio: { c1: '', c2: 'Bronzo' }, ora });
  assert.deepEqual(male.errori, { c1: 'obbligatorio', c2: 'scelta' });
  assert.match(male.html, /aria-invalid="true"/);
  const bene = P.paginaModulo(ch, token, { invio: { c1: 'ada#1', c2: 'oro' }, ora });
  assert.equal(bene.stato, 'codice');
  assert.match(bene.codice, /^\d{4}$/);
  const dopo = P.paginaModulo(ch, token, { codice: bene.codice, ora });
  assert.match(dopo.html, new RegExp(`!compra #${bene.codice}`));
  assert.equal(P.paginaModulo(ch, token, { codice: '0000', ora }).stato, 'modulo', 'un codice inventato non mostra niente');
  N.salva(ch, S.normArticolo({ ...a, campi: [{ etichetta: 'Altro' }] }).articolo);
  assert.equal(P.paginaModulo(ch, token, { ora }).stato, 'fine', 'cambiate le domande, quel modulo non c\'e\' piu\'');
});

test('la pagina del negozio dice cosa chiede ogni articolo, e come funziona il modulo', async () => {
  const P = await import('../../src/features/negozio-pagina.js');
  const ch = canale();
  articolo(ch, { campi: CAMPI });
  articolo(ch, { nome: 'Spada', parola: 'spada', tipo: 'oggetto' });
  const o = P.opzioniNegozio(ch, { baseUrl: 'https://x.it' });
  const griglia = o.blocco({ tipo: 'articoli', colonne: 2, formato: 'quadrato', prezzo: true, scorte: true, requisiti: true }, { anteprima: false, ritardo: '' });
  assert.equal((griglia.match(/class="ng-chiede"/g) || []).length, 1, 'solo l\'articolo che chiede qualcosa');
  assert.match(griglia, /Ti chiede: Il tuo nome Discord, Rank/);
  assert.match(o.blocco({ tipo: 'comecompra' }, { anteprima: false, ritardo: '' }), /il bot ti dà il link di un modulo/);
  assert.equal(S.potaModuli(ORA), 0);
});
