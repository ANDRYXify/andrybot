// COLLEGARSI SENZA FARSI RUBARE IL POSTO.
//
// Il codice va dal web alla chat, e non viceversa. La prova che conta e' che un
// codice valga UNA volta: chi lo legge in chat lo legge gia' bruciato, perche'
// e' stato il messaggio del legittimo proprietario a consumarlo. Se valesse due
// volte, la chat pubblica diventerebbe una bacheca di chiavi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-dccollega-');
const { config } = await import('../../src/config.js');
config.baseUrl = 'https://socialbot.live';
config.discordApp.clientId = 'x'; config.discordApp.clientSecret = 'y'; config.discordApp.attivo = true;
const { dcRuoli, dcLink, dcAttesa } = await import('../../src/db.js');
const dc = await import('../../src/features/discord-collega.js');
process.on('exit', () => usaEGetta.pulisci());

const G = '123456789012345678';
const DC = '222222222222222222';
const acceso = (ch) => dcRuoli.set(ch, { token: 'tok', guild: G, attivo: true, regole: [{ tipo: 'sub', ruolo: '800000000000000000', soglia: 0 }] });
const detto = [];
const parla = (t) => detto.push(t);
const msg = (ch, user, text) => ({ channel: ch, user, display: user, text, userId: '77' });

test('il codice si legge ad alta voce senza sbagliarsi', () => {
  for (let i = 0; i < 200; i++) {
    const c = dc.nuovoCodice();
    assert.equal(c.length, dc.LUNGHEZZA);
    assert.match(c, /^[A-HJ-NP-Z2-9]+$/, `«${c}» ha dentro un carattere che si confonde`);
  }
});

test('un canale che non ha i ruoli accesi non raccoglie consensi', () => {
  assert.equal(dc.apertoA('nessuno'), false);
  assert.equal(dc.apri('nessuno', { dcId: DC }), null);
  dcRuoli.set('spento', { token: 'tok', guild: G, attivo: false });
  assert.equal(dc.apri('spento', { dcId: DC }), null, 'raccogliere un consenso per una cosa spenta non ha senso');
});

test('ricominciare da capo sostituisce il codice di prima', () => {
  acceso('uno');
  const a = dc.apri('uno', { dcId: DC, dcNome: 'Ludo' });
  const b = dc.apri('uno', { dcId: DC, dcNome: 'Ludo' });
  assert.ok(a.codice && b.codice && a.codice !== b.codice);
  assert.equal(dcAttesa.prendi(a.codice), null, 'il primo non resta in giro');
  assert.ok(dcAttesa.prendi(b.codice));
});

test('il codice scritto in chat collega, e vale una volta sola', () => {
  acceso('due');
  const a = dc.apri('due', { dcId: DC, dcNome: 'Ludo' });
  detto.length = 0;
  assert.equal(dc.tryComando(msg('due', 'ludo', '!discord ' + a.codice), parla), true);
  assert.match(detto[0], /collegato/i);
  const l = dcLink.prendi('due', 'ludo');
  assert.equal(l.dc_id, DC);
  assert.equal(l.dc_nome, 'Ludo');

  detto.length = 0;
  dc.tryComando(msg('due', 'ladro', '!discord ' + a.codice), parla);
  assert.match(detto[0], /non vale piu/i, 'chi lo ricopia dalla chat trova un codice bruciato');
  assert.equal(dcLink.prendi('due', 'ladro'), null);
});

test('un codice di un altro canale non vale qui', () => {
  acceso('tre'); acceso('quattro');
  const a = dc.apri('tre', { dcId: DC });
  detto.length = 0;
  dc.tryComando(msg('quattro', 'ludo', '!discord ' + a.codice), parla);
  assert.match(detto[0], /non vale piu/i);
  assert.equal(dcLink.prendi('quattro', 'ludo'), null);
  // e muore lo stesso: scritto nella chat sbagliata e' comunque finito in
  // pubblico, quindi non deve valere piu' nemmeno a casa sua.
  assert.equal(dcAttesa.prendi(a.codice), null);
});

test('un codice scaduto non collega', () => {
  acceso('cinque');
  const a = dc.apri('cinque', { dcId: DC, ora: 1000 });
  detto.length = 0;
  dc.tryComando(msg('cinque', 'ludo', '!discord ' + a.codice), parla, { ora: 1000 + dc.SCADENZA_MS + 1 });
  assert.match(detto[0], /non vale piu/i);
  assert.equal(dcLink.prendi('cinque', 'ludo'), null);
});

test('lo stesso account Discord non resta appeso a due persone', () => {
  acceso('sei');
  const a = dc.apri('sei', { dcId: DC });
  dc.tryComando(msg('sei', 'primo', '!discord ' + a.codice), parla);
  assert.equal(dcLink.prendi('sei', 'primo').dc_id, DC);
  const b = dc.apri('sei', { dcId: DC });
  dc.tryComando(msg('sei', 'secondo', '!discord ' + b.codice), parla);
  assert.equal(dcLink.prendi('sei', 'secondo').dc_id, DC);
  assert.equal(dcLink.prendi('sei', 'primo'), null, 'il primo non puo\' restare collegato a un account che adesso e\' di un altro');
});

test('«!discord» da solo dice dove si comincia, e «via» stacca', () => {
  acceso('sette');
  detto.length = 0;
  dc.tryComando(msg('sette', 'ludo', '!discord'), parla);
  assert.match(detto[0], /socialbot\.live\/collega\/sette/);

  const a = dc.apri('sette', { dcId: DC });
  dc.tryComando(msg('sette', 'ludo', '!discord ' + a.codice), parla);
  assert.ok(dcLink.prendi('sette', 'ludo'));
  detto.length = 0;
  dc.tryComando(msg('sette', 'ludo', '!discord via'), parla);
  assert.match(detto[0], /scollegato/i);
  assert.match(detto[0], /restano tuoi/i, 'si dice anche che i ruoli non glieli togliamo per ripicca');
  assert.equal(dcLink.prendi('sette', 'ludo'), null);
});

test('su un canale senza ruoli accesi il comando non risponde nemmeno', () => {
  detto.length = 0;
  assert.equal(dc.tryComando(msg('muto', 'ludo', '!discord'), parla), false);
  assert.equal(detto.length, 0);
});
