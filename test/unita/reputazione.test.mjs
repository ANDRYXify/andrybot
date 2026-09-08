// LA FIDUCIA GUADAGNATA: chi è di casa non si giudica con un'euristica.
//
// Tutto lo scudo guarda indizi CONTRO — il nome, l'età dell'account, la
// cadenza, la presenza in molti canali — e nessuno che sottragga. Basta
// un'euristica infelice e chi scrive nel tuo canale da otto mesi finisce nel
// mucchio.
//
// Il modello sta in docs/REPUTAZIONE.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('reputazione-');
const { streamers, memory } = await import('../../src/db.js');
const R = await import('../../src/features/reputazione.js');
const inc = await import('../../src/features/incidenti.js');
const P = await import('../../src/features/punteggio.js');
const ab = await import('../../src/features/antibot.js');
test.after(() => casa.pulisci());

const giorniFa = (n) => Date.now() - n * 86400000;

// ─────────────────────────────────────────── il decadimento

test('un torto di due anni fa non pesa come uno di ieri', () => {
  // La memoria di un torto svanisce, sennò non è memoria: è una condanna.
  const base = { messaggi: 400, primo: giorniFa(240) };
  const pulito = R.fiducia(base).punti;
  const ieri = R.fiducia({ ...base, colpito: giorniFa(1) }).punti;
  const dueAnni = R.fiducia({ ...base, colpito: giorniFa(730) }).punti;
  assert.ok(ieri < dueAnni, `ieri ${ieri}, due anni fa ${dueAnni}`);
  assert.equal(dueAnni, pulito, 'dopo abbastanza tempo il torto è svanito del tutto');
});

test('e si dimezza nel tempo che diciamo', () => {
  assert.equal(R.decadimento(giorniFa(0)).toFixed(2), '1.00');
  assert.equal(R.decadimento(giorniFa(R.DIMEZZA_GIORNI)).toFixed(2), '0.50');
  assert.ok(R.decadimento(giorniFa(R.DIMEZZA_GIORNI * 4)) < 0.1);
  assert.equal(R.decadimento(0), 0, 'quello che non è mai successo non pesa');
});

test('i fatti buoni invece non scadono: la presenza si accumula', () => {
  const oggi = R.fiducia({ messaggi: 200, primo: giorniFa(200) }).punti;
  const fraUnAnno = R.fiducia({ messaggi: 200, primo: giorniFa(200) }, Date.now() + 365 * 86400000).punti;
  assert.ok(fraUnAnno >= oggi, 'essere stato qui non diventa un demerito col tempo');
});

// ─────────────────────────────────────────── la fiducia viene dal tempo

test('la fiducia viene dal tempo, non dal volume', () => {
  // Un account che scrive quattrocento righe in un'ora è sospetto, non
  // affidabile: il volume da solo non deve bastare.
  const lampo = R.fiducia({ messaggi: 400, primo: giorniFa(0) });
  const lento = R.fiducia({ messaggi: 60, primo: giorniFa(240) });
  assert.ok(R.sconto(lento) > R.sconto(lampo), `lento ${R.sconto(lento)}, lampo ${R.sconto(lampo)}`);
  assert.ok(R.sconto(lampo) < R.DI_CASA, 'quattrocento messaggi in un giorno non fanno di casa');
});

test('uno sconosciuto non ha né credito né debito', () => {
  const f = R.fiducia({});
  assert.equal(f.punti, 0);
  assert.equal(R.sconto(f), 0);
  assert.deepEqual(f.perche, []);
});

test('e ogni punto di fiducia dice da dove viene', () => {
  const f = R.fiducia({ messaggi: 300, primo: giorniFa(200), colpito: giorniFa(10) });
  assert.ok(f.perche.length >= 3);
  assert.ok(f.perche.some((x) => /messaggi/.test(x)));
  assert.ok(f.perche.some((x) => /giorni/.test(x)));
  assert.ok(f.perche.some((x) => /-\d+/.test(x)), 'anche quello che toglie');
});

// ─────────────────────────────────────────── quanto può salvare

test('e il tetto dello sconto viene dal tetto della fiducia, non da un numero a parte', () => {
  // Due tetti scritti a mano finirebbero per dirne uno diverso. Qui il secondo
  // si ricava dal primo, e non possono divergere.
  assert.equal(R.SCONTO_MAX, Math.trunc(R.FIDUCIA_MAX / R.PER_PUNTO));
  const massima = R.fiducia({ messaggi: 99999, primo: Date.now() - 9999 * 86400000 });
  assert.equal(massima.punti, R.FIDUCIA_MAX, 'il tetto è la somma di quello che si può guadagnare');
  assert.equal(R.FIDUCIA_MAX, R.PESI.parlato + R.PESI.presenza, 'e si ricava dai pesi, non è scelto');
  assert.equal(R.PESI.legame, undefined, 'un peso che nessuno può alimentare non sta nel conto');
  const peggio = R.fiducia({ colpito: Date.now(), sospettato: Date.now() });
  assert.equal(peggio.punti, R.FIDUCIA_MIN, 'e il fondo è la somma di quello che si può perdere');
  assert.equal(R.sconto(massima), R.SCONTO_MAX, 'lo sconto segue il tetto');
});

test('e la soglia di casa, in numeri, è trenta messaggi e due mesi', () => {
  // Il tetto e il fondo si ricavano dai pesi, e va bene: ma una relazione fra
  // due cose che si muovono insieme resta vera anche quando un peso cambia. Qui
  // ci sono i numeri veri, così spostare un peso si vede subito e si decide se
  // era voluto.
  assert.equal(R.FIDUCIA_MAX, 50);
  assert.equal(R.FIDUCIA_MIN, -50);
  assert.equal(R.SCONTO_MAX, 4);
  assert.equal(R.DI_CASA, R.SCONTO_MAX, 'essere di casa è il massimo che un canale possa dare');
  const abitue = R.fiducia({ messaggi: 30, primo: giorniFa(60) });
  assert.equal(abitue.punti, 50);
  assert.equal(R.sconto(abitue), R.DI_CASA, 'trenta messaggi in due mesi bastano, e appena');
  const saltuario = R.fiducia({ messaggi: 20, primo: giorniFa(90) });
  assert.equal(R.sconto(saltuario), R.DI_CASA - 1, 'venti messaggi in tre mesi non bastano');
  const anziano = R.fiducia({ messaggi: 10, primo: giorniFa(365) });
  assert.ok(R.sconto(anziano) < R.DI_CASA, 'e nemmeno dieci messaggi in un anno');
});

test('la fiducia sconta, ma non azzera un fatto forte', () => {
  const spoglio = { created_at: new Date().toISOString(), profile_image_url: 'x/user-default-pictures/y.png', description: '' };
  const senza = P.punteggio({ utente: spoglio, nomeNoto: true });
  const con = P.punteggio({ utente: spoglio, nomeNoto: true, sconto: R.SCONTO_MAX });
  assert.ok(con.punti < senza.punti, 'lo sconto si sente');
  assert.equal(con.forte, true, 'ma chi è nella fabbrica ci resta');
  assert.ok(P.punteggio({ utente: spoglio, sconto: 99 }).punti >= 0, 'e il punteggio non va sotto zero');
});

test('e salva chi sarebbe finito nel mucchio per un\'euristica', () => {
  const spoglio = { created_at: new Date().toISOString(), profile_image_url: 'x/user-default-pictures/y.png', description: '' };
  const sfortunato = { utente: spoglio, nomeGenerato: true, maiScritto: false, nonSegue: true, ondataIngressi: true };
  assert.equal(P.punteggio(sfortunato).segnala, true, 'senza fiducia verrebbe segnalato');
  assert.equal(P.punteggio({ ...sfortunato, sconto: R.SCONTO_MAX }).segnala, false);
});

// ─────────────────────────────────────────── il debito

test('la fiducia ha un segno: un precedente recente aggiunge rischio', () => {
  // Senza il segno il modulo può solo perdonare, mai ricordare — e il
  // decadimento, che è la ragione per cui esiste, non decade da niente.
  const nessuno = R.fiducia({});
  assert.equal(R.sconto(nessuno), 0);
  const fermato = R.fiducia({ colpito: giorniFa(2) });
  assert.ok(fermato.punti < 0, `${fermato.punti} punti`);
  assert.ok(R.sconto(fermato) < 0, 'e il rischio sale invece di scendere');
  const vecchio = R.fiducia({ colpito: giorniFa(720) });
  assert.equal(R.sconto(vecchio), 0, 'ma dopo due anni non resta niente');
});

test('e il debito è limitato quanto il credito, dagli stessi pesi', () => {
  assert.equal(R.AGGRAVIO_MAX, Math.trunc(R.FIDUCIA_MIN / R.PER_PUNTO));
  assert.equal(R.AGGRAVIO_MAX, -4);
  const peggio = R.fiducia({ colpito: Date.now(), sospettato: Date.now() });
  assert.equal(R.sconto(peggio), R.AGGRAVIO_MAX);
});

test('un precedente pesa, ma non può far agire da solo', () => {
  // Questa è la garanzia che l'errore di ieri non diventi la condanna di
  // domani: la fiducia non è una famiglia forte, quindi al massimo fa guardare.
  const spoglio = { created_at: new Date().toISOString(), profile_image_url: 'x/user-default-pictures/y.png', description: '' };
  const g = P.punteggio({ utente: spoglio, maiScritto: true, nonSegue: true, ondataIngressi: true, sconto: R.AGGRAVIO_MAX });
  assert.ok(g.punti >= P.SOGLIA_AGISCI, `${g.punti} punti: il numero da solo basterebbe`);
  assert.equal(g.forte, false);
  assert.equal(g.agisci, false, 'e senza un fatto forte non si tocca nessuno');
  assert.ok(g.motivi.some((m) => /precedente/.test(m)), 'ma si dice perché');
});

test('un abitué con un precedente resta di casa', () => {
  // L'asimmetria è voluta: un solo sospetto non cancella mesi di presenza.
  const f = R.fiducia({ messaggi: 60, primo: giorniFa(240), sospettato: giorniFa(3) });
  assert.ok(R.sconto(f) > 0, 'la fiducia regge');
  const grave = R.fiducia({ messaggi: 60, primo: giorniFa(240), colpito: giorniFa(1) });
  assert.ok(R.sconto(grave) < R.DI_CASA, 'ma essere stati fermati qui si sente');
  assert.ok(R.sconto(grave) >= 0, 'senza diventare un debito');
});

test('il precedente lo leggono gli incidenti, non chi chiama', () => {
  // Se dovesse portarlo il chiamante, il primo che se ne dimentica ottiene una
  // reputazione che non può peggiorare mai — e non se ne accorge nessuno.
  const ch = 'precedenti1';
  inc.azzera();
  inc.apri(ch, { tipo: 'ondata', motivo: 'prova' });
  inc.coinvolto(ch, 'fermato', inc.GIUDIZI.CERTO, 9, 'u1');
  inc.coinvolto(ch, 'presente', inc.GIUDIZI.SOSPETTO, 0, 'u2');
  inc.coinvolto(ch, 'assolto', inc.GIUDIZI.LEGITTIMO, 0, 'u3');
  inc.chiudi(ch, 'finito');
  assert.ok(R.di(ch, 'fermato').sconto < 0, 'chi lo scudo ha fermato');
  assert.ok(R.di(ch, 'presente').sconto < 0, 'e chi c\'era durante l\'attacco');
  assert.equal(R.di(ch, 'assolto').sconto, 0, 'essere stati assolti non è un precedente');
  assert.equal(R.di(ch, 'mai-visto').sconto, 0);
  assert.equal(R.di('altrocanale', 'fermato').sconto, 0, 'e vale solo nel canale dov\'è successo');
  inc.azzera();
});

test('di un precedente conta la volta più recente, non la prima', () => {
  // Tenere la prima vorrebbe dire che chi torna a farlo ogni mese si vede il
  // peso scendere lo stesso, come se non fosse più successo niente.
  const ch = 'precedenti2';
  inc.azzera();
  inc.apri(ch, { tipo: 'ondata' });
  inc.coinvolto(ch, 'tizio', inc.GIUDIZI.CERTO, 0, 'u1');
  const primo = inc.aperto(ch);
  inc.chiudi(ch);
  primo.chiuso = giorniFa(60);
  primo.coinvolti.tizio.ts = giorniFa(300);
  inc.apri(ch, { tipo: 'ondata' });
  inc.coinvolto(ch, 'tizio', inc.GIUDIZI.CERTO, 0, 'u1');
  const secondo = inc.aperto(ch);
  inc.chiudi(ch);
  secondo.coinvolti.tizio.ts = giorniFa(5);
  assert.notEqual(primo.id, secondo.id, 'sono due incidenti diversi');
  assert.equal(inc.precedenti(ch, ['tizio']).get('tizio').colpito, secondo.coinvolti.tizio.ts);
  assert.ok(R.di(ch, 'tizio').sconto < 0, 'e cinque giorni fa si sente ancora');
  inc.azzera();
});

test('e la lettura in blocco legge le stesse cose di quella singola', () => {
  // Durante un\'ondata i nomi sono centinaia e si passa di qui. Se questa
  // strada saltasse i precedenti, il debito non esisterebbe proprio quando
  // serve.
  const ch = 'precedenti3';
  inc.azzera();
  inc.apri(ch, { tipo: 'ondata' });
  inc.coinvolto(ch, 'sporco', inc.GIUDIZI.CERTO, 0, 'u1');
  inc.chiudi(ch);
  const m = R.diMolti(ch, ['sporco', 'pulito']);
  assert.ok(m.get('sporco').sconto < 0, 'il precedente c\'è anche qui');
  assert.equal(m.get('sporco').sconto, R.di(ch, 'sporco').sconto, 'e vale lo stesso delle due strade');
  assert.equal(m.get('pulito').sconto, 0);
  inc.azzera();
});

// ─────────────────────────────────────────── dentro un'ondata

test('chi scrive qui da mesi non finisce nell\'ondata, anche col nome sfortunato', async () => {
  const ch = 'fedeli1';
  streamers.upsertApproved(ch, 'Fedeli', 'A1');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false, rafficaQuanti: 10, rafficaSecondi: 30 } });
  ab.azzeraStati();
  // tre persone con la stessa forma di nome dei bot, ma con una storia qui
  const abitue = ['zzq900x11', 'zzq901x22', 'zzq902x33'];
  for (const l of abitue) {
    for (let i = 0; i < 60; i++) memory.logMessage(ch, l, l, 'ciao ragazzi come va ' + i, false, giorniFa(240 - i * 4));
  }
  const presi = [];
  const scudo = new ab.AntiBot({ helix: {
    bloccaUtente: async (_c, uid) => { presi.push(String(uid).replace(/^[bp]/, '')); return { ok: true }; },
    timeoutUser: async () => ({ ok: true }),
    chatSoloFollower: async () => ({ ok: true }), chatLenta: async () => ({ ok: true }), shieldMode: async () => ({ ok: true }),
  } });
  const fila = [];
  for (let i = 0; i < 24; i++) fila.push(`zzq${i}x${(i * 7919) % 97}`);
  fila.splice(6, 0, abitue[0]); fila.splice(13, 0, abitue[1]); fila.splice(20, 0, abitue[2]);
  for (let i = 0; i < fila.length; i++) {
    await scudo.onFollow({ channel: ch, ts: i * 30, data: { user_id: 'b' + fila[i], user_login: fila[i] } });
  }
  for (let i = 0; i < 300 && ab.codaBan(ch).in_attesa; i++) await new Promise((r) => setTimeout(r, 20));
  for (const l of abitue) assert.ok(!presi.includes(l), `${l} scrive qui da otto mesi e non si tocca`);
  assert.ok(presi.length >= 18, `e i bot invece si prendono (${presi.length})`);
});

test('ma una storia di un giorno non salva nessuno', async () => {
  const ch = 'fedeli2';
  streamers.upsertApproved(ch, 'Fedeli2', 'A2');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false, rafficaQuanti: 10, rafficaSecondi: 30 } });
  ab.azzeraStati();
  const finto = 'zzq900x11';
  for (let i = 0; i < 300 && i < 300; i++) memory.logMessage(ch, finto, finto, 'ciao ' + i, false);
  const presi = [];
  const scudo = new ab.AntiBot({ helix: {
    bloccaUtente: async (_c, uid) => { presi.push(String(uid).replace(/^b/, '')); return { ok: true }; },
    timeoutUser: async () => ({ ok: true }),
    chatSoloFollower: async () => ({ ok: true }), chatLenta: async () => ({ ok: true }), shieldMode: async () => ({ ok: true }),
  } });
  const fila = Array.from({ length: 24 }, (_, i) => `zzq${i}x${(i * 7919) % 97}`);
  fila.splice(6, 0, finto);
  for (let i = 0; i < fila.length; i++) {
    await scudo.onFollow({ channel: ch, ts: i * 30, data: { user_id: 'b' + fila[i], user_login: fila[i] } });
  }
  for (let i = 0; i < 300 && ab.codaBan(ch).in_attesa; i++) await new Promise((r) => setTimeout(r, 20));
  assert.ok(presi.includes(finto), 'trecento messaggi in un giorno non sono una storia');
});
