// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// CHI ARRIVA IN CHAT (src/features/arrivi-regola.js e arrivi.js): quello che
// promette, provato.
//  · una persona si riconosce per id, anche dopo un cambio di nome, e un nome
//    passato a un altro non la confonde;
//  · la persona batte il gruppo, il gruppo batte tutti;
//  · un'occasione, un'accoglienza: due messaggi di fila no, una diretta nuova
//    si', un riavvio no;
//  · «dopo un'assenza» vuole un messaggio di prima, abbastanza lontano;
//  · la fila: una alla volta, con la pausa, e chi aspetta troppo si salta;
//  · chi entra senza scrivere e poi scrive non e' accolto due volte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('arrivi-');
const R = await import('../../src/features/arrivi-regola.js');
const A = await import('../../src/features/arrivi.js');
const db = await import('../../src/db.js');
test.after(() => casa.pulisci());

const GIORNO = 86_400_000;
const tw = (login, id, extra = {}) => ({ channel: 'canale', user: login, display: login.toUpperCase(), userId: id, text: 'ciao', piattaforma: 'twitch', tags: {}, ...extra });

// ── la regola ──────────────────────────────────────────────────────────────

test('«Per chi» si ripulisce: nomi veri, niente doppioni, «tranne tutti» non esiste', () => {
  const c = R.normChi({ modo: 'solo', persone: [{ login: '@Tizio' }, { p: 'twitch', login: 'tizio' }, { login: 'non va!' }, { p: 'kick', login: 'tizio' }], gruppi: ['vip', 'boh'] });
  assert.deepEqual(c.persone.map((q) => q.p + ':' + q.login), ['twitch:tizio', 'kick:tizio']);
  assert.deepEqual(c.gruppi, ['vip']);
  assert.equal(R.normChi({ modo: 'solo', gruppi: ['tutti'] }), null, '«solo tutti» = nessuna condizione');
  assert.equal(R.normChi({ modo: 'tranne', gruppi: ['tutti'] }), null, '«tranne tutti» non si tiene');
  assert.equal(R.normChi({ modo: 'solo', persone: [{ login: '!!' }] }), null);
});

test('una persona si riconosce per id, anche col nome cambiato; un nome passato a un altro no', () => {
  const scelta = { p: 'twitch', id: '42', login: 'vecchionome' };
  assert.ok(R.stessa(scelta, { p: 'twitch', id: '42', login: 'nuovonome' }), 'stesso id, nome nuovo: e\' lei');
  assert.ok(!R.stessa(scelta, { p: 'twitch', id: '99', login: 'vecchionome' }), 'stesso nome, id diverso: e\' un altro');
  assert.ok(R.stessa({ p: 'twitch', id: '', login: 'tizio' }, { p: 'twitch', id: '7', login: 'tizio' }), 'senza id si guarda il nome');
  assert.ok(!R.stessa({ p: 'kick', id: '', login: 'tizio' }, { p: 'twitch', id: '', login: 'tizio' }), 'piattaforme diverse: persone diverse');
});

test('la persona batte il gruppo, il gruppo batte tutti; «tranne» non nomina nessuno', () => {
  const chi = { p: 'twitch', id: '1', login: 'tizio' };
  const vip = new Set(['tutti', 'vip']);
  const perTizio = { id: 1, condizioni: { chi: R.normChi({ persone: [{ login: 'tizio' }] }) } };
  const perVip = { id: 2, condizioni: { chi: R.normChi({ gruppi: ['vip'] }) } };
  const perTutti = { id: 3, condizioni: {} };
  const tranneTizio = { id: 4, condizioni: { chi: R.normChi({ modo: 'tranne', persone: [{ login: 'tizio' }] }) } };
  assert.deepEqual(R.chiVince([perTizio, perVip, perTutti, tranneTizio], chi, vip).moduli.map((m) => m.id), [1]);
  assert.deepEqual(R.chiVince([perVip, perTutti, tranneTizio], chi, vip).moduli.map((m) => m.id), [2]);
  assert.deepEqual(R.chiVince([perTutti, tranneTizio], chi, vip).moduli.map((m) => m.id), [3]);
  assert.deepEqual(R.chiVince([perTutti, tranneTizio], { p: 'twitch', id: '9', login: 'caio' }, new Set(['tutti'])).moduli.map((m) => m.id), [3, 4], 'due regole dello stesso livello scattano tutte e due');
  assert.equal(R.livello(tranneTizio.condizioni.chi, chi, vip), -1);
});

test('l\'occasione: la diretta su Twitch, poi Kick, poi il giorno; «ogni giorno» e\' sempre il giorno', () => {
  assert.equal(R.occasione('diretta', { twitchInizio: 1000, kickDa: 5, giorno: '2026-10-03' }), 'd:tw:1000');
  assert.equal(R.occasione('diretta', { kickDa: 5, giorno: '2026-10-03' }), 'd:kick:5');
  assert.equal(R.occasione('diretta', { giorno: '2026-10-03' }), 'g:2026-10-03');
  assert.equal(R.occasione('giorno', { twitchInizio: 1000, giorno: '2026-10-03' }), 'g:2026-10-03');
});

test('«dopo un\'assenza» vuole un messaggio di prima, abbastanza lontano', () => {
  const ora = 100 * GIORNO;
  const t = R.normTriggerArrivo({ quando: 'assenza', giorni: 21 });
  assert.ok(R.eAssente(t, ora - 30 * GIORNO, ora));
  assert.ok(!R.eAssente(t, ora - 2 * GIORNO, ora));
  assert.ok(!R.eAssente(t, 0, ora), 'chi non ha mai scritto non «torna»');
  assert.ok(R.eAssente(R.normTriggerArrivo({ quando: 'diretta' }), 0, ora), 'le altre non guardano l\'assenza');
  assert.equal(R.normTriggerArrivo({ quando: 'assenza', giorni: 9999 }).giorni, R.LIMITI.giorniMax);
});

test('la fila: oltre il tetto non si entra, e chi aspetta troppo si salta', () => {
  let fila = [];
  for (let i = 0; i < R.LIMITI.fila + 3; i++) fila = R.inFila(fila, { ts: 1000, n: i }, { ora: 1000 }).fila;
  assert.equal(fila.length, R.LIMITI.fila);
  const r = R.inFila(fila, { ts: 1000 + R.LIMITI.attesaMaxMs + 5 }, { ora: 1000 + R.LIMITI.attesaMaxMs + 5 });
  assert.equal(r.saltate, R.LIMITI.fila, 'quelli di prima aspettavano da troppo');
  assert.equal(r.fila.length, 1);
});

// ── i gesti, con un motore finto ───────────────────────────────────────────

function finti({ moduli, ora = 1_800_000_000_000, pausa = 5 } = {}) {
  const fatte = [], appunti = [], sonni = [];
  let adesso = ora;
  const stato = new Map();
  const segni = new Map();
  const deps = {
    moduli: {
      list: () => moduli,
      appuntaPersona: (_c, id, vecchia, nuova) => { appunti.push({ id, vecchia, nuova }); return true; },
    },
    segni: {
      // stessa forma di db.arrivi.segna: una per occasione
      segna: (ch, m, chi, occ) => {
        const k = ch + '|' + m + '|' + chi;
        const r = segni.get(k);
        if (r && r.occasione === occ) return 0;
        const volte = (r?.volte || 0) + 1;
        segni.set(k, { occasione: occ, volte });
        return volte;
      },
    },
    stato: { leggi: (ch, k) => stato.get(k) || null },
    ePersona: (ch, u) => !['unbot', 'altrobot'].includes(u),
    ora: () => adesso,
    // il tempo passa quando il sonno finisce, non quando comincia: intanto
    // possono arrivare altri messaggi
    dormi: (ms) => new Promise((ok) => setImmediate(() => { sonni.push(ms); adesso += ms; ok(); })),
    giorno: () => '2026-10-03',
    pausa: () => pausa,
    presenza: () => null,
  };
  const engine = {
    ctxArrivo: (msg, vars) => ({ user: msg.display, autore: msg.user, _vars: vars }),
    ctxPersona: (ch, q, vars) => ({ user: q.nome || q.login, autore: q.login, _vars: vars }),
    esegui: async (m, ctx) => { fatte.push({ modulo: m.id, chi: ctx.autore, vars: ctx._vars, quando: adesso }); return true; },
  };
  return { deps, engine, fatte, appunti, sonni, stato, avanti: (ms) => { adesso += ms; } };
}
const modulo = (id, chi, trigger = { quando: 'diretta' }, extra = {}) => ({
  id, attivo: true, trigger: R.normTriggerArrivo(trigger), condizioni: chi ? { chi: R.normChi(chi) } : {}, azioni: [{ tipo: 'messaggio', testo: 'ciao' }], ...extra,
});

test('un\'occasione, un\'accoglienza: due messaggi di fila no, una diretta nuova si\'', async () => {
  A._azzera();
  const f = finti({ moduli: [modulo(1, { persone: [{ login: 'tizio' }] })] });
  const ctx = { engine: f.engine, say: () => {}, twitchInizio: 5000 };
  assert.equal(A.suMessaggio(tw('tizio', '42'), ctx, f.deps).accolte, 1);
  assert.deepEqual(A.suMessaggio(tw('tizio', '42'), ctx, f.deps), { riguarda: true, accolte: 0 }, 'gia\' accolto: riguarda (il saluto generico tace), ma niente seconda volta');
  await A._finita('canale');
  assert.equal(A.suMessaggio(tw('tizio', '42'), { ...ctx, twitchInizio: 9000 }, f.deps).accolte, 1, 'diretta nuova, accoglienza nuova');
  await A._finita('canale');
  assert.deepEqual(f.fatte.map((x) => x.vars.volte), ['1', '2']);
  assert.deepEqual(A.suMessaggio(tw('caio', '7'), ctx, f.deps), { riguarda: false, accolte: 0 }, 'chi non e\' scelto non e\' riguardato');
});

test('la persona batte il gruppo anche nei gesti, e un bot si accoglie solo per nome', async () => {
  A._azzera();
  const f = finti({ moduli: [modulo(1, { gruppi: ['vip'] }), modulo(2, { persone: [{ login: 'tizio' }, { login: 'unbot' }] }), modulo(3, null)] });
  const ctx = { engine: f.engine, say: () => {}, twitchInizio: 5000 };
  const vip = { isVip: true };
  A.suMessaggio(tw('tizio', '42', vip), ctx, f.deps);
  A.suMessaggio(tw('sempronio', '43', vip), ctx, f.deps);
  A.suMessaggio(tw('caio', '44'), ctx, f.deps);
  A.suMessaggio(tw('unbot', '45'), ctx, f.deps);
  assert.deepEqual(A.suMessaggio(tw('altrobot', '46', vip), ctx, f.deps), { riguarda: false, accolte: 0 }, 'un bot noto non scelto per nome: niente, nemmeno da VIP');
  await A._finita('canale');
  assert.deepEqual(f.fatte.map((x) => x.modulo + ':' + x.chi), ['2:tizio', '1:sempronio', '3:caio', '2:unbot']);
});

test('«dopo un\'assenza»: da quanto mancava arriva in $assenza', async () => {
  A._azzera();
  const f = finti({ moduli: [modulo(1, null, { quando: 'assenza', giorni: 21 })] });
  const ctx = { engine: f.engine, say: () => {}, twitchInizio: 5000 };
  const ora = f.deps.ora();
  assert.equal(A.suMessaggio(tw('caio', '7'), { ...ctx, arrivo: { r: { ultimo_msg: ora - 2 * GIORNO } } }, f.deps).accolte, 0);
  assert.equal(A.suMessaggio(tw('tizio', '8'), { ...ctx, arrivo: { r: { ultimo_msg: ora - 30 * GIORNO } } }, f.deps).accolte, 1);
  await A._finita('canale');
  assert.equal(f.fatte[0].vars.assenza, '30');
});

test('scelta per nome: al primo messaggio si appunta l\'id, e un nome nuovo si aggiorna', () => {
  A._azzera();
  const f = finti({ moduli: [modulo(1, { persone: [{ login: 'tizio' }, { id: '50', login: 'vecchio' }] })] });
  const ctx = { engine: f.engine, say: () => {}, twitchInizio: 5000 };
  A.suMessaggio(tw('tizio', '42'), ctx, f.deps);
  A.suMessaggio(tw('nuovo', '50'), ctx, f.deps);
  assert.deepEqual(f.appunti.map((a) => [a.vecchia.login, a.nuova.id, a.nuova.login]), [['tizio', '42', 'tizio'], ['vecchio', '50', 'nuovo']]);
});

test('la fila: una alla volta, dopo il messaggio, con la pausa del canale', async () => {
  A._azzera();
  const f = finti({ moduli: [modulo(1, null)], pausa: 5 });
  const ctx = { engine: f.engine, say: () => {}, twitchInizio: 5000 };
  const t0 = f.deps.ora();
  for (const u of ['a1', 'a2', 'a3']) A.suMessaggio(tw(u, u.slice(1)), ctx, f.deps);
  await A._finita('canale');
  const quando = f.fatte.map((x) => x.quando - t0);
  assert.equal(quando[0], R.LIMITI.ritardoMs, 'la prima dopo il ritardo: prima si risponde a quello che ha scritto');
  assert.equal(quando[1] - quando[0], 5000);
  assert.equal(quando[2] - quando[1], 5000);
});

test('la fila: chi aspetta piu\' di tre minuti si salta', async () => {
  A._azzera();
  const f = finti({ moduli: [modulo(1, null)], pausa: 60 });
  const ctx = { engine: f.engine, say: () => {}, twitchInizio: 5000 };
  for (let i = 0; i < 6; i++) A.suMessaggio(tw('p' + i, String(100 + i)), ctx, f.deps);
  await A._finita('canale');
  // 1,2 s, poi 60 s a testa: la quarta partirebbe a 181,2 s, oltre i tre minuti
  assert.deepEqual(f.fatte.map((x) => x.chi), ['p0', 'p1', 'p2']);
});

test('chi entra senza scrivere (solo per nome): l\'id si chiede a Twitch, e quando poi scrive non si riaccoglie', async () => {
  A._azzera();
  const m = modulo(1, { persone: [{ login: 'tizio' }] }, { quando: 'diretta', zitti: true });
  const f = finti({ moduli: [m] });
  const chiesti = [];
  f.deps.helix = { getUsersByLogin: async (l) => { chiesti.push(...l); return [{ id: '42', display_name: 'Tizio' }]; } };
  const ctx = { engine: f.engine, say: () => {}, twitchInizio: 5000 };
  assert.equal(await A.suGiro('canale', ['tizio', 'caio'], ctx, f.deps), 1);
  assert.deepEqual(chiesti, ['tizio']);
  assert.equal(f.appunti[0].nuova.id, '42', 'l\'id si appunta nel modulo');
  m.condizioni.chi.persone[0].id = '42';   // com'e' dopo l'appunto
  assert.equal(A.suMessaggio(tw('tizio', '42'), ctx, f.deps).accolte, 0, 'stessa persona, stessa occasione: gia\' accolta');
  await A._finita('canale');
  assert.equal(f.fatte.length, 1);
  const g = finti({ moduli: [modulo(1, { gruppi: ['vip'] }, { quando: 'diretta', zitti: true })] });
  assert.equal(await A.suGiro('canale', ['tizio'], ctx, g.deps), 0, 'un gruppo non si saluta in silenzio');
  const h = finti({ moduli: [modulo(1, { persone: [{ id: '42', login: 'tizio' }] }, { quando: 'diretta' })] });
  assert.equal(await A.suGiro('canale', ['tizio'], ctx, h.deps), 0, 'senza «anche se non scrive» si aspetta che scriva');
});

test('il bot, il canale stesso e chi viene dal bot non si accolgono', () => {
  A._azzera();
  const f = finti({ moduli: [modulo(1, null)] });
  const ctx = { engine: f.engine, say: () => {}, twitchInizio: 5000 };
  for (const m of [tw('canale', '1'), tw('x', '2', { isSelf: true }), tw('y', '3', { from_bot: true }), tw('[sistema]', '4')]) {
    assert.deepEqual(A.suMessaggio(m, ctx, f.deps), { riguarda: false, accolte: 0 });
  }
});

// ── il segno vero, nel database ────────────────────────────────────────────

test('il segno nel database: una per occasione, anche fra due «motori»; con il modulo se ne va', () => {
  const id = db.modules.save('canale', { nome: 'per tizio', trigger: { tipo: 'arrivo' }, condizioni: { chi: { persone: [{ login: 'tizio' }] } }, azioni: [{ tipo: 'messaggio', testo: 'ciao' }] });
  assert.equal(db.arrivi.segna('canale', id, 'twitch:42', 'd:tw:1'), 1);
  assert.equal(db.arrivi.segna('canale', id, 'twitch:42', 'd:tw:1'), 0, 'stessa occasione');
  assert.equal(db.arrivi.segna('canale', id, 'twitch:42', 'd:tw:2'), 2);
  assert.equal(db.arrivi.quante('canale', id), 2);
  db.modules.remove('canale', id);
  assert.equal(db.arrivi.quante('canale', id), 0);
  assert.equal(db.arrivi.segna('canale', id, 'twitch:42', 'd:tw:2'), 1, 'un modulo nuovo con lo stesso numero non trova i segni vecchi');
});
