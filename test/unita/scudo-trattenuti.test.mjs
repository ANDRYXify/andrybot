// GLI ACCOUNT APPENA NATI: trattenere non e' cacciare.
//
// Il caso vero: un account nuovo e legittimo scrive, il messaggio sparisce e
// l'avviso dice «Mod, se e' ok fatelo riscrivere». Un mod glielo dice, lui
// riscrive, e sparisce di nuovo, con un altro avviso che lo nomina davanti a
// tutti. Il «fatelo riscrivere» non esisteva. Il ragionamento sta in
// docs/SCUDO.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('scudo-trattenuti-');
const { streamers } = await import('../../src/db.js');
const ab = await import('../../src/features/antibot.js');
const registro = await import('../../src/features/comandi-registro.js');
test.after(() => casa.pulisci());

const ORA_FA = () => new Date(Date.now() - 3600_000).toISOString();

function canale(ch, antibot = {}, altro = {}) {
  streamers.upsertApproved(ch, ch, '1' + ch.length);
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { ...altro, antibot: { attivo: true, avvisa: true, chatNuovi: true, chatMinOre: 24, ...antibot } });
}

function scudoCon(detti) {
  const helix = {
    getUserByLogin: async (login) => ({ login, created_at: ORA_FA() }),
    deleteMessage: async () => ({ ok: true }),
  };
  return new ab.AntiBot({ helix, say: (_ch, t) => detti.push(t) });
}

const msg = (ch, extra = {}) => ({ channel: ch, user: 'ilvecchiogufo', userId: 'g1', id: 'm' + Math.random(), text: 'buonasera a tutti', ...extra });

test('trattenuto: l\'avviso si dice una volta, e dice ai mod come farlo scrivere', async () => {
  const ch = 'mizu1';
  canale(ch);
  const detti = [];
  const scudo = scudoCon(detti);
  for (let i = 0; i < 3; i++) assert.equal(await scudo.controllaChat(msg(ch)), true, 'il messaggio di un account di un\'ora si trattiene');
  assert.equal(detti.length, 1, 'tre messaggi, un avviso: ripeterlo e\' spam e gogna');
  assert.match(detti[0], /@ilvecchiogufo/);
  assert.match(detti[0], /!permetti ilvecchiogufo/, 'il comando esatto, pronto da scrivere');
  assert.ok(!/fatelo riscrivere/.test(detti[0]), 'riscrivere da solo non serviva a niente');
});

test('!permetti da un mod: entra negli esenti, lo si dice, e il messaggio dopo passa', async () => {
  const ch = 'mizu2';
  canale(ch);
  const detti = [];
  const scudo = scudoCon(detti);
  assert.equal(await scudo.controllaChat(msg(ch)), true);
  const risposte = [];
  assert.equal(await scudo.tryComando({ channel: ch, user: 'andryxify', isMod: true, text: '!permetti @IlVecchioGufo' }, (t) => risposte.push(t)), true);
  assert.deepEqual(risposte, ['✓ @ilvecchiogufo ora può scrivere.']);
  assert.ok(streamers.get(ch).settings.antibot.esenti.includes('ilvecchiogufo'), 'nella stessa lista del «permetti» della console');
  assert.equal(await scudo.controllaChat(msg(ch)), false, 'e da li\' scrive');
  assert.equal(await scudo.controllaChat(msg(ch, { text: 'grazie!' })), false, 'sempre');
  assert.equal(streamers.get(ch).settings.antibot.chatNuovi, true, 'il resto delle impostazioni non si tocca');
});

test('!permetti da chi non e\' mod non cambia niente', async () => {
  const ch = 'mizu3';
  canale(ch);
  const scudo = scudoCon([]);
  const risposte = [];
  assert.equal(await scudo.tryComando({ channel: ch, user: 'furbo', text: '!permetti furbo' }, (t) => risposte.push(t)), true);
  assert.deepEqual(risposte, []);
  assert.deepEqual(streamers.get(ch).settings.antibot.esenti || [], []);
});

test('un nome storto si spiega, una lista piena si dice invece di perdere il nome', async () => {
  const ch = 'mizu4';
  const piena = Array.from({ length: ab.ESENTI_MAX }, (_, i) => 'amico' + i);
  canale(ch, { esenti: piena });
  const scudo = scudoCon([]);
  const r = [];
  await scudo.tryComando({ channel: ch, user: 'mod1', isMod: true, text: '!permetti' }, (t) => r.push(t));
  assert.match(r[0], /Si usa così: !permetti nome/);
  await scudo.tryComando({ channel: ch, user: 'mod1', isMod: true, text: '!permetti nuovo_arrivato' }, (t) => r.push(t));
  assert.match(r[1], /piena/);
  assert.equal(streamers.get(ch).settings.antibot.esenti.length, ab.ESENTI_MAX);
  assert.ok(!streamers.get(ch).settings.antibot.esenti.includes('nuovo_arrivato'));
});

test('un nome entra nelle liste da una porta sola, col tetto del salvataggio', async () => {
  // Il pannello e «Da rivedere» accettavano fino a 2000 nomi, e il salvataggio
  // dopo li tagliava a 200 senza dirlo: l'ultimo aggiunto spariva in silenzio.
  const piena = Array.from({ length: ab.ESENTI_MAX }, (_, i) => 'amico' + i);
  assert.deepEqual(ab.conNome(['uno'], '@Due'), { lista: ['uno', 'due'], valido: true, piena: false, nuovo: true });
  assert.deepEqual(ab.conNome(['uno'], 'UNO'), { lista: ['uno'], valido: true, piena: false, nuovo: false }, 'chi c\'e\' gia\' non si ripete');
  assert.deepEqual(ab.conNome(undefined, 'uno'), { lista: ['uno'], valido: true, piena: false, nuovo: true });
  assert.equal(ab.conNome(['uno'], 'x').valido, false, 'un nome che il salvataggio scarterebbe non entra');
  const r = ab.conNome(piena, 'nuovo_arrivato');
  assert.equal(r.piena, true);
  assert.equal(r.lista.length, ab.ESENTI_MAX);
  assert.equal(ab.conNome(piena, 'amico7').piena, false, 'una lista piena non rifiuta chi c\'e\' gia\'');

  const { readFileSync } = await import('node:fs');
  const leggi = (f) => readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8');
  const SRV = leggi('src/web/server.js'), APP = leggi('src/web/public/app.js');
  const rotta = (via) => { const i = SRV.indexOf(`app.post('${via}'`); return SRV.slice(i, SRV.indexOf('\n  }));', i)); };
  for (const via of ['/api/antibot/lista', '/api/antibot/segnalazione']) {
    const corpo = rotta(via);
    assert.ok(corpo.includes('conNome(ab[campo], '), `${via}: aggiunge con conNome`);
    assert.ok(corpo.includes("codice: 'lista-piena', massimo: ESENTI_MAX"), `${via}: la lista piena si dice, col suo tetto`);
    assert.ok(!/slice\(0, 2000\)/.test(corpo), `${via}: nessun tetto suo`);
  }
  const seg = rotta('/api/antibot/segnalazione');
  assert.ok(seg.indexOf("'lista-piena'") < seg.indexOf('risolviSegnalazione('), 'una lista piena non chiude il caso: resta da decidere');
  assert.equal(APP.split("e.dati?.codice === 'lista-piena' ? testoListaPiena(e.dati.massimo)").length - 1, 2, 'il pannello lo dice in tutte e due le strade');
  const { normalizzaAntibot } = await import('../../src/web/impostazioni-moderazione.js');
  const salvata = normalizzaAntibot({}, { esenti: [...piena, 'nuovo_arrivato'], extra: piena });
  assert.equal(salvata.esenti.length, ab.ESENTI_MAX, 'il salvataggio taglia allo stesso tetto dell\'aggiunta');
  assert.deepEqual(salvata.extra, piena, 'e una lista piena accettata dall\'aggiunta si salva intera');
});

test('il comando rinominato: l\'avviso dice il nome nuovo, e il vaglio lo porta al gestore', async () => {
  const ch = 'mizu5';
  canale(ch, {}, { comandi: { permetti: { nome: 'lascia' } } });
  const detti = [];
  const scudo = scudoCon(detti);
  await scudo.controllaChat(msg(ch));
  assert.match(detti[0], /!lascia ilvecchiogufo/, 'il nome che la chat puo\' scrivere davvero');
  const v = registro.preparaComando(ch, { channel: ch, isMod: true, text: '!lascia ilvecchiogufo' });
  assert.equal(v.testo, '!permetti ilvecchiogufo');
  const r = [];
  await scudo.tryComando({ channel: ch, user: 'mod1', isMod: true, text: v.testo }, (t) => r.push(t));
  assert.ok(streamers.get(ch).settings.antibot.esenti.includes('ilvecchiogufo'));
  // Non si spegne: l'avviso lo promette.
  assert.equal(registro.risolvi(ch, 'lascia').comando.spegnibile, false);
});

test('un messaggio con i Bit non si trattiene: e\' pagato', async () => {
  const ch = 'mizu6';
  canale(ch);
  const detti = [];
  const scudo = scudoCon(detti);
  assert.equal(await scudo.controllaChat(msg(ch, { bits: 100, text: 'Cheer100 forza mizu' })), false);
  assert.deepEqual(detti, []);
});

test('anche la sola segnalazione si dice una volta per persona', async () => {
  const ch = 'mizu7';
  canale(ch, { chatNuoviAzione: 'segnala' });
  const detti = [];
  const scudo = scudoCon(detti);
  for (let i = 0; i < 3; i++) assert.equal(await scudo.controllaChat(msg(ch)), false, 'segnalato, lasciato passare');
  assert.equal(detti.length, 1);
});

test('l\'assetto stringe, non allarga: a «osservo» chi aveva scelto di trattenere trattiene', async () => {
  const ch = 'mizu8';
  canale(ch, { chatNuoviAzione: 'elimina' });
  const scudo = scudoCon([]);
  await scudo._alza(ch, 'osservo', 'prova', scudo.cfg(ch));
  assert.equal(ab.assetto(ch).livello, 'osservo');
  assert.equal(scudo.cfg(ch).chatNuoviAzione, 'elimina', 'la scelta dello streamer resta');
  // Se il controllo non l'aveva acceso lo streamer, lo accende l'assetto ad
  // «allerta», e li' segnala soltanto.
  const ch2 = 'mizu9';
  canale(ch2, { chatNuovi: false });
  await scudo._alza(ch2, 'allerta', 'prova', scudo.cfg(ch2));
  assert.equal(scudo.cfg(ch2).chatNuovi, true);
  assert.equal(scudo.cfg(ch2).chatNuoviAzione, 'segnala');
  await scudo._alza(ch2, 'difesa', 'prova', scudo.cfg(ch2));
  assert.equal(scudo.cfg(ch2).chatNuoviAzione, 'elimina', 'da «difesa» si trattiene');
});

test('il bot passa allo scudo il comando gia\' tradotto dal vaglio', async () => {
  const { readFileSync } = await import('node:fs');
  const BOT = readFileSync(new URL('../../src/bot.js', import.meta.url), 'utf8');
  const i = BOT.indexOf('const vaglio = suo ? null : registro.preparaComando(login, msg);');
  const j = BOT.indexOf('this.antibot?.tryComando?.(cmdMsg, parla)');
  assert.ok(i > 0 && j > i, 'dopo il vaglio, col testo tradotto: un nome rinominato arriva come !permetti');
});
