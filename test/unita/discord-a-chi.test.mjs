// A CHI VANNO I RUOLI DELLA TRACCIA.
//
// Il difetto da cui nasce, visto dal vivo: la traccia creava «Streamer»,
// «Moderatori», «VIP», «Abbonati» — e poi non li dava nessuno. Il server si
// riempiva di etichette appese al muro, e «Streamer» non l'aveva nemmeno lo
// streamer.
//
// Le cose che devono restare vere:
//  · il ruolo «tuo» va a chi ha il server, e uno solo puo' esserlo;
//  · gli altri scrivono una regola nella scheda dei Ruoli, che li da' a chi e'
//    collegato — non si danno di nascosto per una strada laterale;
//  · non si riscrive l'uguale: il ruolo che hai gia' non te lo si ridà, la
//    regola che c'e' gia' non si riscrive;
//  · un ruolo ambiguo o sopra il bot non diventa «tuo» qui dentro, visto che
//    la' non si puo' nemmeno toccare.
import test from 'node:test';
import assert from 'node:assert/strict';
import { aChiVanno, aChiDi, A_CHI, differenzaRuoli, vuota, improntaDi } from '../../src/features/discord-preset.js';

const PROPRIETARIO = '200000000000000001';
const foto = (ruoli = [], extra = {}) => ({ guild: { id: '1', proprietario: PROPRIETARIO }, ruoli, caratteristiche: [], ...extra });
const ruolo = (id, nome, x = {}) => ({ id, nome, position: 1, managed: false, colore: 0, sfuma: null, olografico: false,
  icona: '', emoji: '', permessi: '0', separato: false, citabile: false, ...x });
const TRACCIA = { ruoli: [
  { nome: 'Streamer', aChi: 'tu' },
  { nome: 'Moderatori', aChi: 'mod' },
  { nome: 'Abbonati', aChi: 'sub' },
  { nome: 'Amici' },
] };
const vanno = (f, p, x = {}) => aChiVanno(f, p, differenzaRuoli(f, p), x);

test('una risposta sola per ruolo, e solo fra quelle che sappiamo fare', () => {
  assert.deepEqual(A_CHI, ['', 'tu', 'follower', 'sub', 'vip', 'mod']);
  assert.equal(aChiDi('tu'), 'tu');
  assert.equal(aChiDi('amministratore'), '', 'una risposta che non sappiamo dare diventa «a nessuno», non un errore');
  assert.equal(aChiDi(undefined), '');
});

test('su un server nuovo: «Streamer» a te, e le regole per gli altri', () => {
  const v = vanno(foto([]), TRACCIA, { ruoliDelProprietario: [] });
  assert.deepEqual(v.aTe, { nome: 'Streamer' }, 'nasce adesso: l\'id si sapra\' dopo averlo creato');
  assert.deepEqual(v.regole.map((r) => `${r.nome}:${r.tipo}`), ['Moderatori:mod', 'Abbonati:sub']);
  assert.ok(!v.regole.some((r) => r.nome === 'Amici'), 'un ruolo senza risposta resta a mano');
});

test('il ruolo che hai gia\' non te lo si ridà', () => {
  const f = foto([ruolo('300000000000000001', 'Streamer')]);
  assert.equal(vanno(f, TRACCIA, { ruoliDelProprietario: ['300000000000000001'] }).aTe, null);
  assert.deepEqual(vanno(f, TRACCIA, { ruoliDelProprietario: [] }).aTe, { nome: 'Streamer', id: '300000000000000001' });
});

test('la regola che c\'e\' gia\' non si riscrive', () => {
  const f = foto([ruolo('300000000000000002', 'Moderatori'), ruolo('300000000000000003', 'Abbonati')]);
  const v = vanno(f, TRACCIA, { ruoliDelProprietario: [], regoleOra: [{ tipo: 'mod', ruolo: '300000000000000002' }] });
  assert.deepEqual(v.regole.map((r) => r.nome), ['Abbonati'], 'Moderatori ce l\'ha gia\'');
});

test('un server gia\' a posto non ha niente da fare: l\'anteprima non mente', () => {
  const f = foto([ruolo('300000000000000001', 'Streamer'), ruolo('300000000000000002', 'Moderatori'), ruolo('300000000000000003', 'Abbonati'), ruolo('300000000000000004', 'Amici')]);
  const v = vanno(f, TRACCIA, { ruoliDelProprietario: ['300000000000000001'],
    regoleOra: [{ tipo: 'mod', ruolo: '300000000000000002' }, { tipo: 'sub', ruolo: '300000000000000003' }] });
  assert.equal(v.aTe, null);
  assert.deepEqual(v.regole, []);
  // E «niente da fare» lo dice anche il conto generale, se no il tasto
  // resterebbe acceso per un lavoro che non c'e'.
  assert.equal(vuota({ ruoli: { crea: [], sistema: [], togli: [] } }), true);
  assert.equal(vuota({ ruoli: { crea: [], sistema: [], togli: [], aTe: { nome: 'Streamer' } } }), false,
    'e il ruolo che ti manca e\' una cosa da fare');
});

test('il ruolo tuo e\' uno: se la traccia ne nomina due, vale il primo', () => {
  const p = { ruoli: [{ nome: 'Streamer', aChi: 'tu' }, { nome: 'Capo', aChi: 'tu' }] };
  const v = vanno(foto([]), p, { ruoliDelProprietario: [] });
  assert.equal(v.aTe.nome, 'Streamer');
  assert.ok(!v.regole.some((r) => r.nome === 'Capo'), 'e il secondo non diventa niente di strano');
});

test('sopra il bot non si da\', e si dice quale', () => {
  // Il bot tocca solo i ruoli sotto il suo: un «Streamer» piu' in alto non si
  // puo' dare, ed e' meglio dirlo che provarci e incassare il rifiuto.
  const f = foto([ruolo('300000000000000001', 'Streamer', { position: 9 }), ruolo('300000000000000009', 'SocialBot', { position: 5 })],
    { bot: { id: '400000000000000001', ruoli: ['300000000000000009'], livello: 5 } });
  const v = vanno(f, { ruoli: [{ nome: 'Streamer', aChi: 'tu' }] }, { ruoliDelProprietario: [] });
  assert.equal(v.aTe, null);
  assert.equal(v.nonATe, 'Streamer');
});

test('senza proprietario conosciuto non si inventa a chi darlo', () => {
  const f = { guild: { id: '1', proprietario: '' }, ruoli: [], caratteristiche: [] };
  assert.equal(vanno(f, TRACCIA, { ruoliDelProprietario: [] }).aTe, null);
});

test('a chi va un ruolo entra nell\'impronta di quello che hai visto', () => {
  // Un «si'» dato guardando «Streamer va a te» non deve valere per un altro
  // ruolo arrivato nel frattempo.
  const a = improntaDi({ ruoli: { aTe: { nome: 'Streamer', id: '1' } } });
  const b = improntaDi({ ruoli: { aTe: { nome: 'Capo', id: '2' } } });
  const c = improntaDi({ ruoli: {} });
  assert.notEqual(a, b);
  assert.notEqual(a, c);
});
