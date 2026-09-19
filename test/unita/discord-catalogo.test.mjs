// UN PRESET NON SA IN CHE SERVER FINIRA'.
//
// Percio' parla a parole — «tutti», un ruolo per nome — e le parole diventano
// id solo davanti a un server vero. Qui si prova quella traduzione, e
// soprattutto i due modi in cui puo' andare male in silenzio:
//
//  · un ruolo che in quel server non esiste diventa «nessuno», e un permesso
//    scritto per proteggere un canale lo chiude a tutti;
//  · una riga senza destinatario vale «tutti», e una chiave scritta storta
//    zittisce il server intero.
//
// Tutti e due sembrerebbero funzionare. E' per questo che si provano.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../../src/features/discord-catalogo.js';

const GUILD = '900000000000000001';
const STAFF = '800000000000000007';
const ruoli = [{ id: GUILD, nome: '@everyone' }, { id: STAFF, nome: 'Staff' }];

const unCanale = (permessi) => ({ categorie: [{ nome: 'Prova', canali: [{ nome: 'uno', permessi }] }] });
const permessiDi = (r) => r.preset.categorie[0].canali[0].permessi;

test('i numeri dei permessi sono quelli di Discord, non quelli che ricordiamo', () => {
  // Presi dalla documentazione e fissati qui: se qualcuno li cambia, questa
  // prova lo dice prima che un canale si chiuda a chi non doveva.
  assert.equal(C.PERMESSI.vedere, 1024n);
  assert.equal(C.PERMESSI.scrivere, 2048n);
  assert.equal(C.PERMESSI.reagire, 64n);
  assert.equal(C.PERMESSI.link, 16384n);
  assert.equal(C.PERMESSI.allegare, 32768n);
  assert.equal(C.PERMESSI.storia, 65536n);
  assert.equal(C.PERMESSI.menzionare, 131072n);
  assert.equal(C.PERMESSI.entrare, 1048576n);
  assert.equal(C.PERMESSI.parlare, 2097152n);
  assert.equal(C.PERMESSI.discussioni, 34359738368n);
  // Qui ci sono i numeri e basta: le parole le sa il pannello, e che non ne
  // manchi nessuna lo controlla il cancello dei contratti.
  for (const v of Object.values(C.PERMESSI)) assert.equal(typeof v, 'bigint', 'i permessi si sommano, e si sommano grandi');
});

test('«tutti» e\' @everyone, e @everyone ha l\'id del server', () => {
  const r = C.risolvi(unCanale([{ chi: 'tutti', nega: ['scrivere'] }]), { guildId: GUILD, ruoli });
  assert.deepEqual(permessiDi(r), [{ id: GUILD, tipo: 0, allow: '0', deny: '2048' }]);
  assert.deepEqual(r.mancanti, []);
});

test('piu\' permessi sulla stessa riga si sommano', () => {
  const r = C.risolvi(unCanale([{ chi: { ruolo: 'Staff' }, da: ['vedere', 'scrivere'], nega: ['menzionare'] }]), { guildId: GUILD, ruoli });
  assert.deepEqual(permessiDi(r), [{ id: STAFF, tipo: 0, allow: String(1024n | 2048n), deny: '131072' }]);
});

test('un ruolo nominato che in quel server non c\'e\' NON diventa «nessuno»', () => {
  // Se diventasse l'id vuoto, o peggio @everyone, il canale si chiuderebbe a
  // tutto il server e nessuno capirebbe perche'.
  const r = C.risolvi(unCanale([{ chi: { ruolo: 'Moderatori' }, da: ['vedere'] }]), { guildId: GUILD, ruoli });
  assert.equal(permessiDi(r), null, 'quella riga si salta');
  assert.deepEqual(r.mancanti, ['Moderatori'], 'e si dice quale, invece di far finta di niente');
});

test('una riga senza destinatario non vale «tutti»', () => {
  const r = C.risolvi(unCanale([{ nega: ['scrivere'] }]), { guildId: GUILD, ruoli });
  assert.equal(permessiDi(r), null, 'una chiave scritta storta non deve poter zittire un server');
});

test('una riga che non dice niente non diventa una riga vuota', () => {
  const r = C.risolvi(unCanale([{ chi: 'tutti' }]), { guildId: GUILD, ruoli });
  assert.equal(permessiDi(r), null, 'mandare allow 0 e deny 0 sarebbe scrivere per non dire niente');
});

test('un canale senza permessi resta senza: nessuno gliene inventa', () => {
  const r = C.risolvi(unCanale(null), { guildId: GUILD, ruoli });
  assert.equal(permessiDi(r), null);
});

test('il catalogo e\' fatto di preset completi, e ognuno risponde a una domanda diversa', () => {
  assert.ok(C.CATALOGO.length >= 3);
  const visti = new Set();
  for (const p of C.CATALOGO) {
    assert.ok(p.id && !visti.has(p.id), `id doppio o mancante: ${p.id}`);
    visti.add(p.id);
    assert.ok(p.nome && p.per, `${p.id}: manca il nome o il «per chi e'»`);
    assert.ok(p.per.length < 90, `${p.id}: il «per chi e'» e' una riga, non un paragrafo`);
    assert.ok(p.categorie.length, `${p.id} non ha categorie`);
    for (const c of p.categorie) {
      assert.ok(c.nome, `${p.id}: una categoria senza nome`);
      assert.ok(c.canali.length, `${p.id}/${c.nome}: una categoria vuota non aiuta chi comincia`);
    }
  }
  assert.equal(C.daId('inizio')?.nome, 'Si comincia');
  assert.equal(C.daId('non-esiste'), null);
});

test('nei preset i permessi sono scritti a parole, e le parole esistono tutte', () => {
  // Un nome di permesso sbagliato sommerebbe zero: la riga ci sarebbe, e non
  // farebbe niente. Sarebbe un canale «protetto» che non lo e'.
  for (const p of C.CATALOGO) {
    for (const c of p.categorie) {
      for (const el of [c, ...c.canali]) {
        for (const riga of (el.permessi || [])) {
          assert.ok(riga.chi, `${p.id}/${el.nome}: una riga di permessi senza destinatario`);
          for (const k of [...(riga.da || []), ...(riga.nega || [])]) {
            assert.ok(C.PERMESSI[k], `${p.id}/${el.nome}: «${k}» non e' un permesso che conosciamo`);
          }
        }
      }
    }
  }
});

test('ogni preset del catalogo si risolve senza lasciare pezzi per strada', () => {
  for (const p of C.CATALOGO) {
    const r = C.risolvi(p, { guildId: GUILD, ruoli });
    assert.deepEqual(r.mancanti, [], `${p.id}: nomina un ruolo che non si puo' garantire`);
    const quanti = r.preset.categorie.reduce((t, c) => t + 1 + c.canali.length, 0);
    const attesi = p.categorie.reduce((t, c) => t + 1 + c.canali.length, 0);
    assert.equal(quanti, attesi, `${p.id}: risolvendo si e' perso qualcosa`);
  }
});
