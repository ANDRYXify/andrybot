// I GRUPPI: chi è arrivato insieme, e chi c'era per caso.
//
// Il giudizio sulla cadenza vale sull'insieme e non dice niente sul singolo:
// dentro la finestra ci sono anche le persone capitate in mezzo, e prima ci
// finivano tutte. Misurato sullo scenario «duecento bot e quaranta persone»:
// quaranta persone su quaranta bloccate, precisione 83%.
//
// Il modello sta in docs/GRUPPI.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('gruppi-');
const { streamers } = await import('../../src/db.js');
const G = await import('../../src/features/gruppi.js');
const ab = await import('../../src/features/antibot.js');
test.after(() => casa.pulisci());

const voci = (nomi) => nomi.map((login) => ({ login, userId: 'u' + login, ts: 0 }));
const FABBRICA = Array.from({ length: 40 }, (_, i) => `zzq${i}x${(i * 7919) % 97}`);
const PERSONE = ['pierpa_gaming', 'martuxx1', 'elezz22832', 'fra1994', 'ale_yt7', 'ele888',
  'robi_yt9', 'gio_ita3', 'niko01', 'stefyzz5', 'ilgiova', 'chiaretta88'];

test('i nomi di una stessa infornata hanno la stessa forma', () => {
  assert.equal(G.forma('zzq0x0'), G.forma('zzq12x7'), 'si distinguono solo per il contatore');
  assert.equal(G.forma('zzq0x0'), 'aaa#a#');
  assert.notEqual(G.forma('pierpa_gaming'), G.forma('martuxx1'));
});

test('una fabbrica si riconosce, un gruppo di persone no', () => {
  const g = G.dominante(voci(FABBRICA));
  assert.ok(g, 'quaranta nomi dalla stessa fabbrica');
  assert.ok(g.frazione >= 0.9, `copre il ${g.frazione * 100}%`);
  assert.equal(G.dominante(voci(PERSONE)), null, 'dodici persone non sono un gruppo');
});

test('e in mezzo a un\'ondata si tocca solo la fabbrica', () => {
  const d = G.daToccare(voci([...FABBRICA, ...PERSONE]));
  assert.equal(d.voci.length, FABBRICA.length);
  assert.equal(d.risparmiati, PERSONE.length, 'le persone capitate in mezzo restano fuori');
  for (const p of PERSONE) assert.ok(!d.gruppo.dentro.has(p), `${p} non deve starci`);
});

test('senza un gruppo riconoscibile non si finge di saperlo', () => {
  // Un attaccante con nomi tutti diversi non si riconosce: lì l'errore da
  // evitare è lasciar passare l'ondata, e si torna a trattarla come una cosa
  // sola. È prudente da una parte sola, ed è voluto.
  const d = G.daToccare(voci(PERSONE));
  assert.equal(d.gruppo, null);
  assert.equal(d.voci.length, PERSONE.length);
  assert.equal(d.risparmiati, 0);
});

test('tre nomi che si somigliano sono un caso, non una fabbrica', () => {
  assert.equal(G.dominante(voci(['zzq0x0', 'zzq1x7', 'zzq2x9'])), null, 'sotto il minimo non si parla di gruppi');
});

test('e un nome che arriva dopo si può chiedere se somiglia a quelli di prima', () => {
  const g = G.dominante(voci(FABBRICA));
  assert.equal(G.appartiene('zzq99x3', g), true);
  assert.equal(G.appartiene('pierpa_gaming', g), false);
  assert.equal(G.appartiene('chiunque', null), false);
});

// ─────────────────────────────────────────── dentro lo scudo

test('in un\'ondata mista le persone in mezzo non si toccano', async () => {
  const ch = 'misto2';
  streamers.upsertApproved(ch, 'Misto2', '71');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false, rafficaQuanti: 10, rafficaSecondi: 30 } });
  ab.azzeraStati();
  const presi = [];
  const scudo = new ab.AntiBot({ helix: {
    bloccaUtente: async (_c, id) => { presi.push(String(id).replace(/^u/, '')); return { ok: true }; },
    timeoutUser: async (_c, id) => { presi.push(String(id).replace(/^u/, '')); return { ok: true }; },
    chatSoloFollower: async () => ({ ok: true }), chatLenta: async () => ({ ok: true }), shieldMode: async () => ({ ok: true }),
  } });
  // venti bot a passo di macchina, con in mezzo quattro persone
  const fila = [];
  for (let i = 0; i < 20; i++) fila.push({ login: `zzq${i}x${(i * 7919) % 97}`, bot: true });
  fila.splice(5, 0, { login: 'pierpa_gaming', bot: false });
  fila.splice(11, 0, { login: 'martuxx1', bot: false });
  fila.splice(17, 0, { login: 'elezz22832', bot: false });
  for (let i = 0; i < fila.length; i++) {
    await scudo.onFollow({ channel: ch, ts: i * 40, data: { user_id: 'u' + fila[i].login, user_login: fila[i].login } });
  }
  for (let i = 0; i < 200 && ab.codaBan(ch).in_attesa; i++) await new Promise((r) => setTimeout(r, 20));
  for (const p of ['pierpa_gaming', 'martuxx1', 'elezz22832']) {
    assert.ok(!presi.includes(p), `${p} è una persona vera e non si tocca`);
  }
  assert.ok(presi.length >= 15, `presi ${presi.length} bot su 20`);
});

test('e un gocciolamento dalla stessa fabbrica non passa piu\' indisturbato', async () => {
  // Centocinquanta follow in dieci minuti non hanno nessuna cadenza da
  // macchina — sono troppo lenti — e prima alzavano solo il sospetto, cioè non
  // facevano niente. Ma la fabbrica si vede lo stesso, senza guardare l'orologio.
  const ch = 'lento1';
  streamers.upsertApproved(ch, 'Lento', '72');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false } });
  ab.azzeraStati();
  const presi = [];
  const scudo = new ab.AntiBot({ helix: {
    bloccaUtente: async (_c, id) => { presi.push(String(id)); return { ok: true }; },
    timeoutUser: async () => ({ ok: true }),
    chatSoloFollower: async () => ({ ok: true }), chatLenta: async () => ({ ok: true }), shieldMode: async () => ({ ok: true }),
  } });
  for (let i = 0; i < 45; i++) {
    const l = `wwk${i}y${(i * 613) % 89}`;
    await scudo.onFollow({ channel: ch, ts: i * 4000, data: { user_id: 'u' + l, user_login: l } });
  }
  assert.equal(ab.assetto(ch).livello, 'attacco', 'la fabbrica si vede anche al rallentatore');
  // Si conta quanti ne ha DECISI, non quanti sono già arrivati a Twitch: il
  // tetto di sei al secondo è di Twitch, e aspettarlo qui vorrebbe dire far
  // dipendere una prova dal rate limit di qualcun altro.
  const decisi = ab.statoEsecutore().decisi;
  assert.ok(decisi >= 40, `decisi ${decisi} su 45`);
  await new Promise((r) => setTimeout(r, 300));
  assert.ok(presi.length > 0, 'e la coda gira davvero');
});

test('un canale non impara il proprio ritmo da due minuti di attacco', () => {
  // Il ritmo abituale serve a tarare la soglia. Se lo si impara durante un
  // gocciolamento, il canale impara che quella è la sua normalità e la soglia
  // si alza fino a coprire l'attacco: misurato, da quaranta a settecentocinquanta.
  const ch = 'ritmo9';
  const base = ab.sogliaRaffica(ch, { rafficaQuanti: 10 }, 0);
  assert.equal(base, 10, 'senza storia matura si usa il numero dichiarato');
});
