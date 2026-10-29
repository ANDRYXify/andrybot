// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// UN ACCOUNT CANCELLATO A META' DI UN ATTACCO.
//
// La fila dello scudo lavora al ritmo di Twitch: possono essere minuti. Se
// l'account si cancella nel mezzo, quello che era in fila non si fa, le azioni
// in sospeso (nomi e motivi, su disco) vanno via, e la chiamata gia' partita
// torna senza scrivere niente. E il registro e gli attacchi si scrivono solo
// per un canale che c'e'.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('scudo-cancellato-');
const { streamers } = await import('../../src/db.js');
const { Esecutore, verdetto, dimenticaCanale, sospeseDi } = await import('../../src/features/enforcement.js');
const ab = await import('../../src/features/antibot.js');
const inc = await import('../../src/features/incidenti.js');
const { cancella, restiDi } = await import('../../src/features/cancella.js');
test.after(() => casa.pulisci());

const FILE = join(process.env.DATA_DIR, 'azioni-fallite.json');
const sui = (righe, ch) => righe.filter((r) => r.canale === ch);

test('la chiamata in volo torna a vuoto, la fila e le sospese del canale spariscono, gli altri canali no', async () => {
  let sblocca;
  const ferma = new Promise((r) => { sblocca = r; });
  const chiamate = [];
  const helix = { bloccaUtente: async (ch, id) => { chiamate.push([ch, id]); if (chiamate.length === 1) await ferma; return { ok: false, motivo: 'non trovato' }; } };
  const annotate = [];
  const e = new Esecutore({ helix, annota: (ch, riga) => annotate.push([ch, riga]) });
  e._falliti.push({ ...verdetto({ canale: 'via', login: 'vecchio', userId: '9', azione: 'blocca' }), motivo: 'prima', quando: 1 });
  const v = (ch, i) => verdetto({ canale: ch, login: ch + i, userId: String(i), azione: 'blocca', motivi: ['prova'] });
  const esiti = [e.esegui(v('via', 1)), e.esegui(v('via', 2)), e.esegui(v('resta', 3))];
  while (!chiamate.length) await new Promise((r) => setImmediate(r));
  await e.salvaFalliti();
  assert.equal(sui(JSON.parse(readFileSync(FILE, 'utf8')).righe, 'via').length, 1, 'la sospesa e\' sul disco');
  assert.equal(sospeseDi('via'), 2, 'una in fila e una in sospeso');
  assert.equal(dimenticaCanale('via'), 2, 'la voce in fila e la sospesa');
  await e._scrittura;
  assert.equal(sui(JSON.parse(readFileSync(FILE, 'utf8')).righe, 'via').length, 0, 'via dal disco subito, senza aspettare altro');
  sblocca();
  const [primo, secondo, terzo] = await Promise.all(esiti);
  assert.equal(primo.motivo, 'l\'account è stato cancellato', 'quella in volo');
  assert.equal(secondo.motivo, 'l\'account è stato cancellato', 'quella in fila');
  assert.equal(terzo.motivo, 'non trovato', 'l\'altro canale va avanti');
  assert.deepEqual(chiamate.map((c) => c[0]), ['via', 'resta'], 'la seconda di «via» non e\' mai partita');
  assert.deepEqual(annotate.map((a) => a[0]), ['resta'], 'niente scritto per «via»');
  assert.equal(sui(e._falliti, 'via').length, 0);
  assert.equal(sui(e._falliti, 'resta').length, 1);
  assert.equal(sospeseDi('via'), 0);
  await e._scrittura;   // la scrittura delle sospese di «resta» finisce qui, non sopra la prova dopo
  await e.ferma({ conserva: false });
});

test('al riavvio le sospese di un canale che non c\'e\' piu\' non tornano, e spariscono dal disco', async () => {
  const righe = ['vivo', 'morto'].map((ch) => ({ ...verdetto({ canale: ch, login: 'x', userId: '1', azione: 'ban' }), motivo: 'm', quando: 1 }));
  writeFileSync(FILE, JSON.stringify({ v: 1, righe }));
  const e = new Esecutore({ helix: {} });
  await e.caricaFalliti({ esiste: (ch) => ch === 'vivo' });
  assert.deepEqual(e._falliti.map((f) => f.canale), ['vivo']);
  await e._scrittura;
  assert.deepEqual(JSON.parse(readFileSync(FILE, 'utf8')).righe.map((f) => f.canale), ['vivo']);
  await e.ferma({ conserva: false });
});

test('il registro e gli attacchi si scrivono solo per un canale che c\'e\'', () => {
  assert.equal(ab.registra('nessuno', { azione: 'segnala', motivo: 'x' }), null);
  assert.equal(ab.registro('nessuno').length, 0);
  assert.equal(inc.apri('nessuno', { tipo: 'follow' }), null);
  assert.equal(inc.diCanale('nessuno').length, 0);
  streamers.request('qualcuno', 'qualcuno', '1');
  assert.ok(ab.registra('qualcuno', { azione: 'segnala', motivo: 'x' }));
  assert.ok(inc.apri('qualcuno', { tipo: 'follow' }));
});

test('cancellare l\'account a meta\' di un attacco non lascia niente, nemmeno quello che torna dopo', async () => {
  const CH = 'sotto';
  streamers.upsertApproved(CH, CH, '1');
  let sblocca;
  const ferma = new Promise((r) => { sblocca = r; });
  let partiti = 0;
  const helix = { bloccaUtente: async () => { partiti++; await ferma; return { ok: true }; } };
  const scudo = new ab.AntiBot({ helix });
  inc.apri(CH, { tipo: 'follow' });
  ab.registra(CH, { azione: 'raffica', motivo: 'tanti follow' });
  const esiti = [1, 2, 3].map((i) => scudo.esecutore.esegui(verdetto({ canale: CH, login: 'bot' + i, userId: String(i), azione: 'blocca', motivi: ['ondata'] })));
  // si aspetta il fatto, non un giro: il primo blocco e' partito (e aspetta
  // Twitch), gli altri due sono in fila. Un giro solo, sotto il carico di
  // tutta la suite, a volte non bastava alla fila per prendere il primo.
  while (!partiti) await new Promise((r) => setImmediate(r));
  assert.equal(restiDi(CH).righe.fila_scudo, 2, 'prima di cancellare si vede cosa aspetta');
  const fatto = cancella(CH, { conferma: CH });
  assert.equal(fatto.righe.fila_scudo, 2, 'le due ancora in fila');
  sblocca();
  await Promise.all(esiti);
  ab.registra(CH, { azione: 'segnala', motivo: 'arriva dopo' });
  inc.apri(CH, { tipo: 'follow' });
  assert.deepEqual(restiDi(CH), { righe: {}, cartelle: [] }, 'ne\' il registro ne\' l\'attacco ne\' la fila rinascono');
  await scudo.esecutore.ferma({ conserva: false });
});
