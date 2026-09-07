// IL PUNTEGGIO: quanto un account somiglia a una macchina.
//
// La prova che conta e' sempre la stessa, ed e' quella che lo schema ovvio
// sbaglia: uno spettatore nuovo e timido e un follow-bot vero non devono
// prendere lo stesso numero. Con una somma piatta lo prendono — sette e sette —
// perche' eta', avatar di default e bio vuota non sono tre prove ma una sola.
//
// Il modello e i conti stanno in docs/PUNTEGGIO.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('punteggio-');
const { streamers, memory } = await import('../../src/db.js');
const P = await import('../../src/features/punteggio.js');
const ab = await import('../../src/features/antibot.js');
test.after(() => casa.pulisci());

const giorniFa = (n) => new Date(Date.now() - n * 86400000).toISOString();
const SPOGLIO = { profile_image_url: 'https://x/user-default-pictures/y.png', description: '' };
const CURATO = { profile_image_url: 'https://x/mia-foto.png', description: 'gioco e rido' };

// ─────────────────────────────────────────── il caso che ha motivato tutto

test('lo spettatore nuovo e timido non prende il punteggio di un bot', () => {
  const nuovo = P.punteggio({ utente: { created_at: giorniFa(10), ...SPOGLIO }, maiScritto: true, nonSegue: true });
  const bot = P.punteggio({ utente: { created_at: giorniFa(0), ...SPOGLIO }, nomeNoto: true });
  assert.ok(nuovo.punti < bot.punti, `nuovo ${nuovo.punti}, bot ${bot.punti}: devono stare lontani`);
  assert.equal(nuovo.agisci, false, 'e soprattutto: non lo si tocca');
  assert.equal(bot.agisci, true);
});

test('tre fatti della stessa famiglia contano una volta', () => {
  // Un account creato oggi ha PER FORZA l'avatar di default e la bio vuota.
  const solo = P.punteggio({ utente: { created_at: giorniFa(0), profile_image_url: 'x/foto.png', description: 'ciao' } });
  const tutti = P.punteggio({ utente: { created_at: giorniFa(0), ...SPOGLIO } });
  assert.equal(tutti.famiglie.profilo, solo.famiglie.profilo, 'la stessa notizia detta tre volte resta una notizia');
  assert.equal(tutti.famiglie.profilo, 3, 'e il tetto della famiglia e\' quello');
});

test('senza una famiglia forte non si agisce, per quanto sia alto il numero', () => {
  const g = P.punteggio({
    utente: { created_at: giorniFa(0), ...SPOGLIO },
    nomeGenerato: true, maiScritto: true, nonSegue: true, ondataIngressi: true,
  });
  assert.ok(g.punti >= P.SOGLIA_AGISCI, `${g.punti} punti: il numero c'e'`);
  assert.equal(g.forte, false, 'ma nessun fatto che una persona non possa produrre');
  assert.equal(g.agisci, false, 'quindi si guarda, non si tocca');
  assert.equal(g.segnala, true);
});

test('la soglia per agire non e\' scelta: e\' dove le famiglie deboli non bastano piu\'', () => {
  const soloDeboli = P.famigliaProfilo({ created_at: giorniFa(0), ...SPOGLIO }).punti
    + P.famigliaComportamento({ maiScritto: true, nonSegue: true, ondataIngressi: true }).punti;
  assert.equal(P.SOGLIA_AGISCI, soloDeboli + 1,
    'se un tetto cambia, la soglia deve muoversi con lui invece di restare indietro');
});

test('il nome che sembra generato pesa poco e non da\' forza', () => {
  assert.equal(P.nomeGenerato('xkzptrbnqz'), true, 'muro di consonanti');
  assert.equal(P.nomeGenerato('abc12345678'), true, 'poche lettere e una coda di cifre');
  assert.equal(P.nomeGenerato('andrea_gamer'), false);
  assert.equal(P.nomeGenerato('lucia98'), false);
  assert.equal(P.nomeGenerato('bob'), false, 'i nomi corti non si giudicano');
  const g = P.punteggio({ utente: { created_at: giorniFa(0), ...SPOGLIO }, nomeGenerato: true });
  assert.equal(g.forte, false, 'un nome strano e\' un\'euristica, non un fatto');
});

// ─────────────────────────────────────────── la presenza, il segnale forte

test('la presenza in molti canali vale, e da sotto i tre non dice niente', () => {
  assert.equal(P.famigliaPresenza(0).punti, 0);
  assert.equal(P.famigliaPresenza(2).punti, 0, 'due schede aperte le ha chiunque');
  assert.equal(P.famigliaPresenza(3).punti, 2);
  assert.equal(P.famigliaPresenza(6).punti, 4);
  assert.equal(P.famigliaPresenza(12).punti, 6);
  assert.equal(P.famigliaPresenza(500).punti, 6, 'il tetto e\' un tetto');
  assert.equal(P.punteggio({ utente: { created_at: giorniFa(900), ...CURATO }, canaliInsieme: 12 }).forte, true);
});

test('il censimento conta i canali distinti, e degrada da solo', () => {
  P.azzeraCensimento();
  for (const ch of ['uno', 'due', 'tre', 'quattro']) P.censisci(ch, ['lurker', 'lucia']);
  P.censisci('uno', ['lurker']);                       // stesso canale due volte
  assert.equal(P.canaliInsieme('lurker'), 4, 'quattro canali distinti, non cinque presenze');
  assert.equal(P.canaliInsieme('nessuno'), 0);
  assert.equal(P.statoCensimento().inPiuCanali, 2);
  // Con pochi canali serviti il segnale semplicemente non scatta: resta zitto
  // invece di inventare.
  P.azzeraCensimento();
  P.censisci('uno', ['tizio']);
  assert.equal(P.famigliaPresenza(P.canaliInsieme('tizio')).punti, 0);
});

test('del censimento non resta un registro di chi guarda cosa', () => {
  P.azzeraCensimento();
  P.censisci('canaleuno', ['tizio']);
  P.censisci('canaledue', ['tizio']);
  const fuori = JSON.stringify(P.statoCensimento());
  assert.ok(!fuori.includes('canaleuno') && !fuori.includes('tizio'),
    'esce un conteggio, mai chi era dove');
});

// ─────────────────────────────────────────── la scala vecchia

test('la soglia 70 che gli streamer hanno gia\' salvato resta quello che era', () => {
  assert.equal(P.inCentesimi(P.SOGLIA_AGISCI), 70, 'il punto in cui il motore agisce');
  assert.ok(P.inCentesimi(P.SOGLIA_SEGNALA) < 70);
  assert.equal(P.inCentesimi(P.MASSIMO), 100, 'e non si sfora');
});

test('valutaAccount parla ancora in centesimi, e dice anche se il fatto e\' forte', () => {
  const bot = ab.valutaAccount({ login: 'buy_followers_now', created_at: giorniFa(0), ...SPOGLIO }, {});
  assert.ok(bot.rischio >= 70, `rischio ${bot.rischio}`);
  assert.equal(bot.forte, true);
  const vero = ab.valutaAccount({ login: 'andrea_gamer', created_at: giorniFa(900), ...CURATO }, {});
  assert.ok(vero.rischio < 20, `rischio ${vero.rischio}`);
  assert.equal(vero.forte, false);
});

// ─────────────────────────────────────────── misurare i propri errori

test('chi parla dopo essere stato segnato era una persona, e finisce nel conto', () => {
  let e = [];
  e = P.segnaGiudizio(e, { login: 'lurkerbot', punti: 9, agito: true });
  e = P.segnaGiudizio(e, { login: 'timido', punti: 5, agito: false });
  e = P.segnaGiudizio(e, { login: 'altrapersona', punti: 8, agito: true });
  const haParlato = (l) => l === 'timido' || l === 'altrapersona';
  const r = P.erroriDi(e, haParlato);
  assert.equal(r.segnalati, 3);
  assert.equal(r.agiti, 2);
  assert.equal(r.sbagliati, 2);
  assert.equal(r.sbagliatiAgiti, 1, 'e quello sbagliato su cui si e\' AGITO si conta a parte');
  assert.equal(r.percAgiti, 50);
  assert.ok(r.chi.some((x) => x.login === 'timido'));
});

test('un giudizio nuovo sostituisce il vecchio sullo stesso account', () => {
  let e = [];
  e = P.segnaGiudizio(e, { login: 'tizio', punti: 5, agito: false });
  e = P.segnaGiudizio(e, { login: 'tizio', punti: 9, agito: true });
  assert.equal(e.length, 1);
  assert.equal(e[0].punti, 9);
  assert.deepEqual(P.segnaGiudizio(e, { login: '', punti: 3 }).length, 1, 'senza nome non si segna niente');
});

test('lo scudo sa dire quanto ha sbagliato, guardando la chat che c\'e\' gia\'', () => {
  const ch = 'misura1';
  streamers.upsertApproved(ch, 'Misura', '31');
  streamers.setEnabled(ch, true);
  return import('../../src/db.js').then(({ statoVivo }) => {
    statoVivo.scrivi(ch, P.GIUDIZI_CHIAVE, [
      { login: 'zitto', punti: 9, agito: true, ts: Date.now() - 60000 },
      { login: 'parlante', punti: 8, agito: true, ts: Date.now() - 60000 },
    ]);
    memory.logMessage(ch, 'parlante', 'Parlante', 'ciao a tutti', false);
    const r = ab.erroriScudo(ch);
    assert.equal(r.agiti, 2);
    assert.equal(r.sbagliatiAgiti, 1, 'chi ha parlato dopo era una persona');
    assert.equal(r.percAgiti, 50);
  });
});

// ─────────────────────────────────────────── il giro delle presenze

test('il giro guarda solo chi sta in piu\' canali e non ha mai scritto qui', async () => {
  const ch = 'giro1';
  streamers.upsertApproved(ch, 'Giro', '32');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false } });
  P.azzeraCensimento();
  for (const c of ['a', 'b', 'c', 'd']) P.censisci(c, ['lurkerbot', 'chiacchierone', 'nightbot']);
  P.censisci(ch, ['lurkerbot', 'chiacchierone', 'nightbot', 'solitario']);
  memory.logMessage(ch, 'chiacchierone', 'Chiacchierone', 'io scrivo eccome', false);

  const chiesti = [];
  const scudo = new ab.AntiBot({ helix: {
    getUsersByLogin: async (l) => { chiesti.push(...l); return l.map((x) => ({ id: 'i' + x, login: x, created_at: giorniFa(0), ...SPOGLIO })); },
  } });
  const esito = await scudo.giroPresenze(ch, ['lurkerbot', 'chiacchierone', 'nightbot', 'solitario']);
  assert.deepEqual(chiesti, ['lurkerbot'], 'chi ha scritto qui e\' una persona; Nightbot e\' di casa; il solitario sta in un canale solo');
  assert.equal(esito.segnalati, 1);
  const voci = ab.registro(ch).filter((v) => v.azione === 'presenza');
  assert.equal(voci.length, 1);
  assert.equal(voci[0].stato, 'aperto', 'si segnala e si lascia decidere a chi guarda');
});

test('il giro segnala e non tocca nessuno', async () => {
  const ch = 'giro2';
  streamers.upsertApproved(ch, 'Giro2', '33');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false, azione: 'ban' } });
  P.azzeraCensimento();
  for (const c of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'l', 'm', 'n']) P.censisci(c, ['lurkerbot']);
  const tocchi = [];
  const scudo = new ab.AntiBot({ helix: {
    getUsersByLogin: async (l) => l.map((x) => ({ id: 'i' + x, login: x, created_at: giorniFa(0), ...SPOGLIO })),
    timeoutUser: async (...a) => { tocchi.push(a); return { ok: true }; },
    bloccaUtente: async (...a) => { tocchi.push(a); return { ok: true }; },
  } });
  await scudo.giroPresenze(ch, ['lurkerbot']);
  assert.equal(tocchi.length, 0, 'un lurker silenzioso non fa danno mentre lo si guarda');
});

test('con l\'interruttore delle presenze spento il giro non parte', async () => {
  const ch = 'giro3';
  streamers.upsertApproved(ch, 'Giro3', '34');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, presenze: false } });
  P.azzeraCensimento();
  for (const c of ['a', 'b', 'c', 'd']) P.censisci(c, ['lurkerbot']);
  let chiesto = false;
  const scudo = new ab.AntiBot({ helix: { getUsersByLogin: async () => { chiesto = true; return []; } } });
  await scudo.giroPresenze(ch, ['lurkerbot']);
  assert.equal(chiesto, false);
});
