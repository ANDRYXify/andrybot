// LA RETE: quello che un canale riconosce diventa noto agli altri.
//
// È la sola cosa che ci porta davvero verso gli strumenti di riferimento: loro
// vedono migliaia di canali insieme, noi vediamo i nostri — ma solo se li
// mettiamo in comune. È anche il modo più veloce di propagare un errore a tutti
// i canali insieme, quindi le prove qui sono quasi tutte contro di noi.
//
// Il modello sta in docs/RETE.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('rete-');
const { streamers, memory } = await import('../../src/db.js');
const rete = await import('../../src/features/rete.js');
const P = await import('../../src/features/punteggio.js');
const ab = await import('../../src/features/antibot.js');
test.after(() => casa.pulisci());

const giorniFa = (n) => new Date(Date.now() - n * 86400000).toISOString();
const SPOGLIO = { profile_image_url: 'https://x/user-default-pictures/y.png', description: '' };

// ─────────────────────────────────────────── la regola dei tre

test('un canale solo non fa una verità', () => {
  rete.azzera();
  assert.equal(rete.segnala('uno', 'zzbot', 'ondata').confermato, false);
  assert.equal(rete.segnala('due', 'zzbot', 'ondata').confermato, false);
  assert.equal(rete.quantiLoSegnalano('zzbot'), 2);
  assert.equal(rete.confermato('zzbot'), false);
  assert.equal(rete.segnala('tre', 'zzbot', 'ondata').confermato, true);
});

test('lo stesso canale che insiste non conta per tre', () => {
  rete.azzera();
  for (let i = 0; i < 10; i++) rete.segnala('uno', 'zzbot', 'ondata');
  assert.equal(rete.quantiLoSegnalano('zzbot'), 1, 'conta chi lo dice, non quante volte lo dice');
  assert.equal(rete.confermato('zzbot'), false);
});

test('e nemmeno dopo che il nome e\' stato confermato da altri', () => {
  // Il conteggio decide anche lo scalino alto, quello che da solo fa agire
  // tutti. Se dopo la conferma un canale potesse continuare a contare per se'
  // stesso, uno solo porterebbe un nome da tre a sei.
  rete.azzera();
  for (const c of ['uno', 'due', 'tre']) rete.segnala(c, 'zzbot', 'ondata');
  for (let i = 0; i < 20; i++) rete.segnala('uno', 'zzbot', 'ondata');
  assert.equal(rete.quantiLoSegnalano('zzbot'), 3, 'resta a tre: uno solo non porta un nome allo scalino alto');
});

test('e nemmeno dopo che il nome ha fatto il pieno di conferme', () => {
  rete.azzera();
  for (const c of ['uno', 'due', 'tre', 'quattro', 'cinque', 'sei']) rete.segnala(c, 'zzbot', 'ondata');
  assert.equal(rete.quantiLoSegnalano('zzbot'), 6);
  for (let i = 0; i < 30; i++) rete.segnala('uno', 'zzbot', 'ondata');
  assert.equal(rete.quantiLoSegnalano('zzbot'), 6, 'sopra il massimo non si conta piu\': non c\'e\' niente da guadagnare');
});

test('ridire una cosa gia\' detta non consuma la quota del canale', () => {
  // Sennò un canale che rivede lo stesso bot cento volte in una diretta
  // finirebbe la sua quota giornaliera su un nome solo.
  rete.azzera();
  for (let i = 0; i < 250; i++) rete.segnala('uno', 'zzbot', 'ondata');
  assert.ok(rete.segnala('uno', 'unaltronome', 'ondata'), 'la quota e\' ancora sua');
});

test('finché non è confermato non tocca il punteggio', () => {
  const conProfilo = { utente: { created_at: giorniFa(900), profile_image_url: 'x/f.png', description: 'gioco' } };
  assert.equal(P.punteggio({ ...conProfilo, reteCanali: 1 }).punti, 0);
  assert.equal(P.punteggio({ ...conProfilo, reteCanali: 2 }).punti, 0, 'due canali fanno guardare, non agire');
  assert.ok(P.punteggio({ ...conProfilo, reteCanali: 3 }).punti > 0);
});

test('tre conferme confermano, sei bastano da sole', () => {
  const pulito = { utente: { created_at: giorniFa(900), profile_image_url: 'x/f.png', description: 'gioco' } };
  const tre = P.punteggio({ ...pulito, reteCanali: 3 });
  assert.equal(tre.agisci, false, 'tre canali sommano a un altro indizio, da soli no');
  assert.equal(tre.forte, true);
  const sei = P.punteggio({ ...pulito, reteCanali: 6 });
  assert.equal(sei.agisci, true, 'sei posti che hanno misurato la stessa cosa sono una prova');
});

// ─────────────────────────────────────────── cosa può entrare

test('entra solo quello che un canale ha misurato e su cui ha agito', () => {
  rete.azzera();
  assert.ok(rete.segnala('uno', 'zzbot', 'ondata'));
  assert.ok(rete.segnala('uno', 'zzcoro', 'coro'));
  // Un giudizio sul profilo descrive uno spettatore appena arrivato: non si
  // spedisce agli altri canali.
  assert.equal(rete.segnala('uno', 'timido', 'profilo'), null);
  assert.equal(rete.segnala('uno', 'timido', 'punteggio'), null);
  assert.equal(rete.segnala('uno', 'timido', ''), null);
  assert.equal(rete.quantiLoSegnalano('timido'), 0);
});

test('un canale impazzito non riempie la lista di tutti', () => {
  rete.azzera();
  let presi = 0;
  for (let i = 0; i < 400; i++) if (rete.segnala('matto', 'nome' + i, 'ondata')) presi++;
  assert.equal(presi, 200, 'il tetto giornaliero per canale è un tetto');
  assert.ok(rete.segnala('sano', 'nomealtro', 'ondata'), 'e vale per quel canale, non per gli altri');
});

// ─────────────────────────────────────────── si esce

test('si può disfare un errore adesso, non fra novanta giorni', () => {
  rete.azzera();
  for (const c of ['uno', 'due', 'tre']) rete.segnala(c, 'sbagliato', 'ondata');
  assert.equal(rete.confermato('sbagliato'), true);
  assert.equal(rete.dimentica('sbagliato'), true);
  assert.equal(rete.quantiLoSegnalano('sbagliato'), 0);
  assert.equal(rete.dimentica('mai-esistito'), false);
});

// ─────────────────────────────────────────── quello che non esce di lì

test('di chi ha segnalato chi non esce niente', () => {
  rete.azzera();
  for (const c of ['canalerosso', 'canaleverde', 'canaleblu']) rete.segnala(c, 'zzbot', 'ondata');
  const fuori = JSON.stringify({ stato: rete.stato(), elenco: rete.elenco() });
  for (const c of ['canalerosso', 'canaleverde', 'canaleblu']) {
    assert.ok(!fuori.includes(c), `${c} non deve uscire: e' un registro di chi ha visto chi`);
  }
  assert.ok(fuori.includes('zzbot'), 'il nome riconosciuto invece si');
  assert.equal(rete.elenco()[0].canali, 3, 'e il conteggio resta');
});

test('arrivato al massimo, l\'elenco dei canali viene buttato e resta il numero', async () => {
  rete.azzera();
  for (const c of ['uno', 'due', 'tre', 'quattro', 'cinque', 'sei']) rete.segnala(c, 'zzbot', 'ondata');
  await rete.salva();
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const { config } = await import('../../src/config.js');
  const su = await readFile(join(config.dataDir, 'rete-bot.json'), 'utf8');
  assert.ok(su.includes('zzbot'));
  assert.ok(!su.includes('quattro'), 'nemmeno su disco resta chi ha visto chi');
  assert.ok(!su.includes('"uno"'));
  assert.equal(rete.quantiLoSegnalano('zzbot'), 6);
});

test('la rete torna dal disco dopo un riavvio', async () => {
  rete.azzera();
  for (const c of ['uno', 'due', 'tre'] ) rete.segnala(c, 'zzsopravvive', 'coro');
  await rete.salva();
  rete.azzera();
  assert.equal(rete.quantiLoSegnalano('zzsopravvive'), 0);
  await rete.carica();
  assert.equal(rete.confermato('zzsopravvive'), true, 'e\' conoscenza guadagnata: perderla e\' ricominciare');
});

// ─────────────────────────────────────────── lo scudo ci scrive dentro

test('un coro finisce nella rete; un messaggio normale no', async () => {
  rete.azzera();
  const ch = 'retecoro';
  streamers.upsertApproved(ch, 'ReteCoro', '41');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false } });
  const scudo = new ab.AntiBot({ helix: {
    deleteMessage: async () => {}, chatSoloFollower: async () => ({ ok: true }),
    chatLenta: async () => ({ ok: true }), shieldMode: async () => ({ ok: true }),
  } });
  const testo = 'venite tutti sul canale che vi regalo le monete gratis';
  for (let i = 0; i < 4; i++) {
    await scudo.controllaChat({ channel: ch, user: 'bocca' + i, userId: 'b' + i, id: 'm' + i, text: testo });
  }
  assert.equal(rete.quantiLoSegnalano('bocca3'), 1, 'chi ha fatto scattare il coro entra');
  await scudo.controllaChat({ channel: ch, user: 'normale', userId: 'n1', id: 'z', text: 'ma che sta succedendo qui' });
  assert.equal(rete.quantiLoSegnalano('normale'), 0);
});

test('un blocco riuscito entra nella rete, uno fallito no', async () => {
  rete.azzera();
  const ch = 'reteonda';
  streamers.upsertApproved(ch, 'ReteOnda', '42');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false, rafficaQuanti: 10 } });
  let quanti = 0;
  const scudo = new ab.AntiBot({ helix: {
    chatSoloFollower: async () => ({ ok: true }), chatLenta: async () => ({ ok: true }),
    shieldMode: async () => ({ ok: true }), timeoutUser: async () => ({ ok: false }),
    // il primo blocco fallisce, gli altri vanno
    bloccaUtente: async () => (++quanti === 1 ? { ok: false } : { ok: true }),
  } });
  for (let i = 0; i < 16; i++) await scudo.onFollow({ channel: ch, data: { user_id: 'u' + i, user_login: 'zzq' + i } });
  for (let i = 0; i < 200 && ab.codaBan(ch).in_attesa; i++) await new Promise((r) => setTimeout(r, 50));
  assert.equal(rete.quantiLoSegnalano('zzq0'), 0, 'un tentativo andato male non e\' un fatto');
  assert.equal(rete.quantiLoSegnalano('zzq5'), 1);
});

test('e quello che la rete sa torna dentro al punteggio', () => {
  rete.azzera();
  for (const c of ['a', 'b', 'c', 'd', 'e', 'f'] ) rete.segnala(c, 'zznoto', 'ondata');
  const g = ab.valutaAccount({ login: 'zznoto', created_at: giorniFa(900), profile_image_url: 'x/f.png', description: 'ciao' }, {});
  assert.equal(g.famiglie.rete, 7);
  assert.equal(g.forte, true);
  assert.ok(g.rischio >= 70, `rischio ${g.rischio}`);
  const pulito = ab.valutaAccount({ login: 'lucia98', created_at: giorniFa(900), profile_image_url: 'x/f.png', description: 'ciao' }, {});
  assert.equal(pulito.famiglie.rete, 0);
});
