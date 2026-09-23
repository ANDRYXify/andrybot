// LA MEMORIA DEL GESTORE DEI RUOLI: la configurazione dello streamer e i
// collegamenti di chi ha detto «questo account Discord sono io».
//
// Le due cose che si misurano qui non sono «il database scrive»:
//
//  · il TOKEN del bot e' un segreto, quindi sul disco non si legge in chiaro.
//    Chi apre il file del database non deve trovarlo scritto li';
//  · il consenso e' PER CANALE. Collegarsi al server di uno streamer non e'
//    un'iscrizione all'anagrafe: un altro canale non vede quel collegamento, e
//    chi si scollega da uno resta collegato all'altro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-discord-');
const { dcRuoli, dcLink } = await import('../../src/db.js');
process.on('exit', () => usaEGetta.pulisci());

const TOKEN = 'MTA5OTk5.finto.token-del-bot-che-non-deve-vedersi';

test('la configurazione nasce, si rilegge e si spegne', () => {
  assert.equal(dcRuoli.get('nessuno'), null, 'chi non ha mai configurato niente non ha una riga');
  const c = dcRuoli.set('tizio', { token: TOKEN, guild: '123456789012345678', guildNome: 'Casa mia', attivo: true });
  assert.equal(c.token, TOKEN, 'a noi il token torna in chiaro');
  assert.equal(c.guild, '123456789012345678');
  assert.equal(c.guild_nome, 'Casa mia');
  assert.equal(c.attivo, 1);
  assert.deepEqual(c.regole, [], 'le regole nascono vuote, non nulle');
  const solo = dcRuoli.set('tizio', { attivo: false });
  assert.equal(solo.token, TOKEN, 'toccare una cosa non cancella le altre');
  assert.equal(solo.attivo, 0);
});

test('l\'id del server passa dal filtro: solo cifre, e non infinite', () => {
  const c = dcRuoli.set('filtro', { guild: ' 123456789012345678/roles ' });
  assert.equal(c.guild, '123456789012345678');
  const lungo = dcRuoli.set('filtro', { guild: '9'.repeat(40) });
  assert.equal(lungo.guild.length, 24);
});

test('il token non si legge sul disco', () => {
  dcRuoli.set('segreto', { token: TOKEN, guild: '123456789012345678' });
  // In WAL le scritture fresche stanno nel file di fianco: si guardano tutti e due.
  const crudo = ['andrybot.db', 'andrybot.db-wal']
    .map((f) => { try { return readFileSync(join(usaEGetta.dir, f), 'latin1'); } catch { return ''; } }).join('');
  assert.ok(crudo.includes('123456789012345678'), 'la prova vale: nel file ci si legge davvero qualcosa');
  assert.ok(!crudo.includes(TOKEN), 'ma il token no');
  assert.equal(dcRuoli.get('segreto').token, TOKEN, 'e a noi torna in chiaro');
});

test('il giro passa da chi e\' acceso e ha un server, col suo bot o con quello della casa', () => {
  dcRuoli.set('acceso', { token: TOKEN, guild: '123456789012345678', attivo: true });
  dcRuoli.set('spento', { token: TOKEN, guild: '123456789012345678', attivo: false });
  dcRuoli.set('mezzo', { token: TOKEN, guild: '', attivo: true });
  // IL BOT DELLA CASA. Chi lo invita col tasto non ha un token suo nella riga:
  // parla quello della piattaforma. Questa prova diceva il contrario — «senza
  // token non gira» — ed era vera prima che il bot della casa esistesse. Dopo,
  // voleva dire che il giro non partiva MAI per quasi tutti, e i ruoli creati
  // dal costruttore restavano addosso a nessuno.
  dcRuoli.set('dellacasa', { token: '', guild: '123456789012345678', attivo: true });
  const attivi = dcRuoli.attivi();
  assert.ok(attivi.includes('acceso'));
  assert.ok(attivi.includes('dellacasa'), 'col bot della casa il giro deve partire');
  for (const c of ['spento', 'mezzo']) assert.ok(!attivi.includes(c), `«${c}» non deve girare`);
});

test('chi ha un interruttore suo si sceglie senza quello dei ruoli', () => {
  // Il calendario ha il suo «acceso»: legarlo all'interruttore dei ruoli
  // voleva dire che spegnendo i ruoli si spegneva anche il calendario.
  dcRuoli.set('soloCalendario', { token: '', guild: '123456789012345678', attivo: false });
  dcRuoli.set('senzaServer', { token: '', guild: '', attivo: true });
  const con = dcRuoli.conServer();
  assert.ok(con.includes('solocalendario'), 'un server basta');
  assert.ok(!con.includes('senzaserver'), 'senza server non c\'e\' dove andare');
});

test('l\'esito dell\'ultimo giro si ricorda, e non porta via il resto', () => {
  dcRuoli.set('esiti', { token: TOKEN, guild: '123456789012345678', regole: [{ tipo: 'sub', ruolo: '1', soglia: 0 }] });
  dcRuoli.esito('esiti', { visti: 3, dati: 1, tolti: 0, bloccati: ['1'] });
  const c = dcRuoli.get('esiti');
  assert.deepEqual(c.ultimo_esito, { visti: 3, dati: 1, tolti: 0, bloccati: ['1'] });
  assert.ok(c.ultimo_giro > 0, 'e quando e\' successo');
  assert.equal(c.regole.length, 1, 'le regole sono ancora li\'');
  assert.equal(c.token, TOKEN);
});

test('un collegamento vale per un canale solo', () => {
  dcLink.metti('uno', { login: 'ludo', userId: '777', dcId: '999999999999999999', dcNome: 'Ludo' });
  assert.equal(dcLink.prendi('uno', 'LUDO').dc_id, '999999999999999999', 'il login non guarda le maiuscole');
  assert.equal(dcLink.prendi('due', 'ludo'), null, 'l\'altro canale non ne sa niente');
  assert.equal(dcLink.perDc('uno', '999999999999999999').login, 'ludo');
  assert.equal(dcLink.perDc('due', '999999999999999999'), null);
});

test('scollegarsi da uno non scollega dall\'altro', () => {
  dcLink.metti('a', { login: 'gio', dcId: '111111111111111111' });
  dcLink.metti('b', { login: 'gio', dcId: '111111111111111111' });
  dcLink.togli('a', 'gio');
  assert.equal(dcLink.prendi('a', 'gio'), null);
  assert.ok(dcLink.prendi('b', 'gio'), 'l\'altro consenso non l\'ha dato via nessuno');
});

test('ricollegarsi cambia l\'account, non ne aggiunge un secondo', () => {
  dcLink.metti('c', { login: 'ari', dcId: '222222222222222222', dcNome: 'vecchio' });
  dcLink.metti('c', { login: 'ari', dcId: '333333333333333333', dcNome: 'nuovo' });
  assert.equal(dcLink.quanti('c'), 1);
  assert.equal(dcLink.prendi('c', 'ari').dc_id, '333333333333333333');
  assert.equal(dcLink.prendi('c', 'ari').dc_nome, 'nuovo');
});

test('un collegamento senza le due meta\' non si scrive', () => {
  assert.equal(dcLink.metti('d', { login: 'senza', dcId: '' }), null);
  assert.equal(dcLink.metti('d', { login: '', dcId: '444444444444444444' }), null);
  assert.equal(dcLink.quanti('d'), 0);
});

test('spegnere tutto porta via anche i collegamenti: non si tengono consensi di un servizio che non c\'e\' piu\'', () => {
  dcRuoli.set('via', { token: TOKEN, guild: '123456789012345678', attivo: true });
  dcLink.metti('via', { login: 'tal', dcId: '555555555555555555' });
  dcRuoli.scorda('via');
  assert.equal(dcRuoli.get('via'), null);
  assert.equal(dcLink.quanti('via'), 0);
});
