// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL WALK-ON (docs/WALKON.md): le garanzie, provate dove stanno.
//
//  · una persona, un walk-on per canale (UNIQUE): salvare di nuovo sostituisce;
//  · si approva quello che si vede: ogni salvataggio alza la versione e torna
//    in attesa, e una decisione su una versione vecchia non passa;
//  · una entrata per diretta, sotto il tetto (la chiave primaria);
//  · sospeso e' un segno: chi torna sub torna com'era;
//  · la mail e' cifrata, in una tabella sua, esce una volta sola e poi non c'e';
//  · il tipo di un file lo dicono i byte; un file rifiutato o orfano se ne va.
import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, existsSync, mkdirSync, utimesSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-walkon-');
const { db, walkon } = await import('../../src/db.js');
const W = await import('../../src/features/walkon.js');
const F = await import('../../src/features/walkon-file.js');
test.after(() => usaEGetta.pulisci());

const CH = 'canale';
const dati = (extra = {}) => ({ piattaforma: 'twitch', login: 'luna', nome: 'Luna', scelta: 'file', file: 'wo_0000000000001_aaaaaaaaaaaa.webp', fileTipo: 'immagine', ...extra });

test('le regole di serie: spento, nessun effetto scelto, i motivi di serie, i numeri nei loro limiti', () => {
  const c = W.normWalkon(undefined);
  assert.equal(c.attivo, false);
  assert.deepEqual(c.effetti.voci, [], 'gli effetti li sceglie lo streamer, uno per uno');
  assert.equal(c.motivi.length, 3);
  assert.deepEqual(W.normWalkon({ motivi: [] }).motivi, [], 'uno streamer che li toglie tutti non se li ritrova');
  const x = W.normWalkon({ attivo: true, file: { pesoMb: 999, durataSec: -3, tipi: ['video', 'exe'] }, perDiretta: 0, volume: 300, chi: { persone: '@Pippo, kick:Pluto, twitch:x y, ../a' }, partenza: { modo: 'comando', comando: '!WalkOn' } });
  assert.equal(x.file.pesoMb, 30);
  assert.equal(x.file.durataSec, 1);
  assert.deepEqual(x.file.tipi, ['video']);
  assert.equal(x.perDiretta, 1);
  assert.equal(x.volume, 100);
  assert.deepEqual(x.chi.persone, ['twitch:pippo', 'kick:pluto', 'twitch:x', 'twitch:y'], 'solo nomi validi (gli spazi separano), e «pippo» vuol dire Twitch');
  assert.equal(x.partenza.comando, 'walkon');
});

test('il livello del sub si legge dalla versione del distintivo', () => {
  assert.equal(W.livelloDaBadge('subscriber/12,premium/1'), 1);
  assert.equal(W.livelloDaBadge('vip/1,subscriber/2006'), 2);
  assert.equal(W.livelloDaBadge('subscriber/3024'), 3);
  assert.equal(W.livelloDaBadge('founder/0'), 1);
  assert.equal(W.livelloDaBadge('moderator/1'), 0);
});

test('chi puo\': «non lo so» non diventa mai «no», e il livello conta solo su Twitch', () => {
  const c = W.normWalkon({ chi: { livello: 2, subKick: true, vip: false, mod: true, persone: ['amica', 'kick:amico'] } });
  assert.equal(W.requisiti(c, { piattaforma: 'twitch', sub: true, livello: 2 }), 'si');
  assert.equal(W.requisiti(c, { piattaforma: 'twitch', sub: true, livello: 1, vip: false, mod: false }), 'no', 'sotto il livello');
  assert.equal(W.requisiti(c, { piattaforma: 'twitch', sub: true, livello: null, vip: false, mod: false }), 'non-so');
  assert.equal(W.requisiti(c, { piattaforma: 'twitch', sub: null, livello: null, vip: null, mod: null }), 'non-so');
  assert.equal(W.requisiti(c, { piattaforma: 'twitch', sub: false, livello: 0, vip: false, mod: true }), 'si', 'i mod, se lo streamer li vuole');
  assert.equal(W.requisiti(c, { piattaforma: 'kick', sub: true, livello: null, vip: false, mod: false }), 'si', 'su Kick basta sub');
  assert.equal(W.requisiti(c, { piattaforma: 'twitch', login: 'Amica', sub: false, vip: false, mod: false }), 'si', 'scelta a mano');
  assert.equal(W.requisiti(c, { piattaforma: 'twitch', login: 'amico', sub: false, vip: false, mod: false }), 'no', 'amico e\' scelto su Kick, non su Twitch');
  const msg = { piattaforma: 'twitch', isSub: true, tags: { badges: 'subscriber/2003' }, user: 'x' };
  assert.deepEqual(W.provaDaMessaggio(msg), { piattaforma: 'twitch', login: 'x', sub: true, livello: 2, vip: false, mod: false });
});

test('il tipo lo dicono i byte, non il nome', () => {
  const b = (...p) => Buffer.concat([Buffer.from(...p), Buffer.alloc(16)]);
  assert.deepEqual(W.tipoDaiByte(b([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), { famiglia: 'immagine', mime: 'image/png' });
  assert.equal(W.tipoDaiByte(b([0xff, 0xd8, 0xff, 0xe0])).mime, 'image/jpeg');
  assert.equal(W.tipoDaiByte(b('GIF89a', 'latin1')).famiglia, 'immagine');
  assert.equal(W.tipoDaiByte(b('RIFF\0\0\0\0WEBP', 'latin1')).mime, 'image/webp');
  assert.equal(W.tipoDaiByte(b('RIFF\0\0\0\0WAVE', 'latin1')).famiglia, 'audio');
  assert.equal(W.tipoDaiByte(b('\0\0\0\x18ftypisom', 'latin1')).famiglia, 'video');
  assert.equal(W.tipoDaiByte(b('\0\0\0\x18ftypM4A ', 'latin1')).famiglia, 'audio');
  assert.equal(W.tipoDaiByte(b('\0\0\0\x18ftypheic', 'latin1')), null, 'HEIC: ffmpeg non lo legge sempre, non si promette');
  assert.equal(W.tipoDaiByte(b([0x1a, 0x45, 0xdf, 0xa3])).famiglia, 'video');
  assert.equal(W.tipoDaiByte(b('OggS', 'latin1')).famiglia, 'audio');
  assert.equal(W.tipoDaiByte(b('ID3', 'latin1')).mime, 'audio/mpeg');
  assert.equal(W.tipoDaiByte(b('<html><script>', 'latin1')), null);
  assert.equal(W.tipoDaiByte(Buffer.from('ab')), null);
});

test('una persona, un walk-on: salvare di nuovo sostituisce, alza la versione e torna in attesa', () => {
  const a = walkon.salva(CH, 'p1', dati());
  walkon.decidi(CH, a.riga.id, 1, 'approvato', { chi: 'Mod' });
  const b = walkon.salva(CH, 'p1', dati({ file: 'wo_0000000000002_bbbbbbbbbbbb.webp' }));
  assert.equal(b.riga.id, a.riga.id, 'la stessa riga');
  assert.equal(b.riga.versione, 2);
  assert.equal(b.riga.stato, 'attesa', 'si approva quello che si vede');
  assert.equal(b.vecchioFile, 'wo_0000000000001_aaaaaaaaaaaa.webp', 'il file di prima e\' da togliere');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM walkon WHERE channel=? AND persona=?').get(CH, 'p1').n, 1);
  assert.throws(() => db.prepare("INSERT INTO walkon (channel, persona, creato, aggiornato) VALUES (?, ?, 0, 0)").run(CH, 'p1'), /UNIQUE/, 'lo schema non ne lascia nascere un secondo');
});

test('la decisione vale solo sulla versione vista, e un rifiutato e\' chiuso', () => {
  const a = walkon.salva(CH, 'p2', dati({ file: 'wo_0000000000003_cccccccccccc.webp' }));
  walkon.salva(CH, 'p2', dati({ file: 'wo_0000000000004_dddddddddddd.webp' }));
  assert.deepEqual(walkon.decidi(CH, a.riga.id, 1, 'approvato', { chi: 'Mod' }), { ok: false, perche: 'cambiato' });
  const r = walkon.decidi(CH, a.riga.id, 2, 'rifiutato', { chi: 'Mod', motivo: 'no' });
  assert.equal(r.ok, true);
  assert.equal(r.vecchioFile, 'wo_0000000000004_dddddddddddd.webp', 'il file rifiutato va tolto dal disco');
  assert.equal(r.riga.file, '', 'e la riga non lo nomina piu\'');
  assert.equal(walkon.decidi(CH, a.riga.id, 2, 'approvato', { chi: 'Mod' }).perche, 'gia', 'un rifiutato non si approva: il file non c\'e\' piu\'');
  const c = walkon.salva(CH, 'p3', dati({ file: 'wo_0000000000005_eeeeeeeeeeee.webp' }));
  assert.equal(walkon.decidi(CH, c.riga.id, 1, 'approvato').ok, true);
  assert.equal(walkon.decidi(CH, c.riga.id, 1, 'rifiutato', { motivo: 'ripensato' }).ok, true, 'un approvato si revoca');
  const reg = walkon.registro(CH, 50).map((x) => x.azione);
  assert.ok(reg.includes('rifiutato') && reg.includes('approvato') && reg.includes('salvato'), 'ogni decisione resta nel registro');
});

test('una entrata per diretta, sotto il tetto', () => {
  assert.equal(walkon.entra(CH, 'd1', 'p1', { tetto: 2 }), true);
  assert.equal(walkon.entra(CH, 'd1', 'p1', { tetto: 2 }), false, 'la seconda nella stessa diretta non entra');
  assert.equal(walkon.entra(CH, 'd1', 'p2', { tetto: 2 }), true);
  assert.equal(walkon.entra(CH, 'd1', 'p3', { tetto: 2 }), false, 'oltre il tetto');
  assert.equal(walkon.entra(CH, 'd2', 'p1', { tetto: 2 }), true, 'la diretta dopo, di nuovo');
  assert.throws(() => db.prepare('INSERT INTO walkon_entrate (channel, occasione, persona, ts) VALUES (?,?,?,0)').run(CH, 'd1', 'p1'), /UNIQUE|PRIMARY/);
});

test('sospeso e\' un segno: lo stato resta, e torna com\'era', () => {
  const a = walkon.salva(CH, 'p4', dati({ file: 'wo_0000000000006_ffffffffffff.webp' }));
  walkon.decidi(CH, a.riga.id, 1, 'approvato');
  assert.equal(walkon.sospendi(CH, 'p4', true), true);
  assert.equal(walkon.sospendi(CH, 'p4', true), false, 'gia\' sospeso: niente da scrivere');
  assert.equal(W.rigaPubblica(walkon.get(CH, 'p4')).stato, 'sospeso');
  walkon.sospendi(CH, 'p4', false);
  assert.equal(walkon.get(CH, 'p4').stato, 'approvato', 'torna approvato senza che nessuno se lo ricordi');
});

test('la mail: cifrata, in una tabella sua, una volta sola, e un nuovo walk-on ne chiede una nuova', () => {
  const ind = 'luna.segreta@esempio.it';
  const a = walkon.salva(CH, 'p5', dati({ file: 'wo_0000000000007_000000000000.webp' }), { mail: ind });
  const grezza = db.prepare('SELECT * FROM walkon_posta WHERE channel=? AND persona=?').get(CH, 'p5');
  assert.ok(grezza && !grezza.busta.includes('luna.segreta') && grezza.busta.startsWith('enc:'), 'nel database non c\'e\' in chiaro');
  assert.ok(!JSON.stringify(walkon.get(CH, 'p5')).includes('segreta'), 'la riga del walk-on non la porta');
  assert.ok(!Object.keys(walkon.get(CH, 'p5')).some((k) => /mail|posta|busta/.test(k)), 'nemmeno una colonna che la ricordi');
  assert.equal(walkon.haPosta(CH, 'p5', 1), true);
  walkon.salva(CH, 'p5', dati({ file: 'wo_0000000000007_000000000000.webp' }));
  assert.equal(walkon.haPosta(CH, 'p5', 2), false, 'salvare di nuovo senza mail la toglie');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM walkon_posta WHERE channel=? AND persona=?').get(CH, 'p5').n, 0, 'e l\'indirizzo vecchio non resta nel database ad aspettare');
  walkon.mettiPosta(CH, 'p5', 2, ind);
  const r = walkon.decidi(CH, a.riga.id, 2, 'approvato', { chi: 'Mod' });
  assert.equal(r.mail, ind, 'chi manda l\'esito la riceve');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM walkon_posta WHERE channel=?').get(CH).n, 0, 'e nello stesso momento non c\'e\' piu\'');
  assert.equal(walkon.decidi(CH, a.riga.id, 2, 'rifiutato').mail, '', 'una seconda decisione non la ritrova');
  assert.ok(!JSON.stringify(W.rigaPubblica(walkon.get(CH, 'p5'))).includes('luna.segreta'));
});

test('il servizio: parte al primo messaggio della diretta, una volta, solo approvato, uno alla volta', async () => {
  const usciti = [], detti = [];
  let occ = 'diretta-1';
  const cfg = { attivo: true, chi: { subTwitch: true }, effetti: { voci: ['applausi'] }, attesaSec: 0, durataSec: 2, partenza: { modo: 'messaggio' } };
  const S = W.creaServizioWalkon({ store: walkon, impostazioni: () => cfg, effettoDi: (l, c) => (c === 'applausi' ? { comando: 'applausi', tipo: 'audio', file: 'x.ogg' } : null),
    payloadEffetto: () => ({ tipo: 'audio', url: '/o/x.ogg', durata: 1500 }), urlFile: (l, f) => '/overlay/' + l + '/walkon/' + f,
    emit: (l, p) => usciti.push(p), inOnda: () => true, overlay: () => true, occasione: () => occ });
  const msg = (id, extra = {}) => ({ userId: id, user: 'u' + id, isSub: true, tags: { badges: 'subscriber/1' }, text: 'ciao', ...extra });
  const a = walkon.salva('ch2', '10', dati({ nome: 'Dieci', file: 'wo_0000000000008_111111111111.webp' }));
  assert.equal(S.suMessaggio('ch2', msg('10')), 'attesa', 'non approvato: non parte');
  assert.equal(walkon.entrate('ch2', occ), 0, 'e l\'entrata non si brucia');
  walkon.decidi('ch2', a.riga.id, 1, 'approvato');
  assert.equal(S.suMessaggio('ch2', msg('10'), (t) => detti.push(t)), 'in-scena');
  assert.equal(usciti[0].media.url, '/overlay/ch2/walkon/wo_0000000000008_111111111111.webp');
  assert.equal(detti.length, 1, 'la riga in chat');
  assert.equal(S.suMessaggio('ch2', msg('10')), 'gia', 'una volta per diretta');
  const b = walkon.salva('ch2', '11', dati({ scelta: 'effetto', effetto: 'applausi', file: '' }));
  walkon.decidi('ch2', b.riga.id, 1, 'approvato');
  assert.equal(S.suMessaggio('ch2', msg('11')), 'in-scena');
  assert.equal(usciti.length, 1, 'il secondo aspetta: mai due insieme');
  assert.equal(S.inFila('ch2'), 1);
  // l'immagine resta durataSec (2 s), l'attesa e' zero: il secondo parte dopo 2 s
  await new Promise((r) => setTimeout(r, 2300));
  assert.equal(usciti.length, 2, 'e parte quando il primo e\' finito');
  assert.equal(S.suMessaggio('ch2', msg('10', { isSub: false, tags: { badges: '' } })), 'sospeso', 'non piu\' sub');
  assert.equal(walkon.get('ch2', '10').stato, 'approvato');
  occ = 'diretta-2';
  assert.equal(S.suMessaggio('ch2', msg('10', { isSub: false, tags: { badges: '' } })), 'sospeso', 'chi non ha piu\' i requisiti non entra in scena');
  assert.equal(walkon.entrate('ch2', occ), 0);
  assert.equal(S.suMessaggio('ch2', msg('10')), 'in-scena', 'tornato sub, torna com\'era');
  assert.equal(walkon.get('ch2', '10').sospeso, 0);
  cfg.effetti.voci = [];
  occ = 'diretta-3';
  assert.equal(S.suMessaggio('ch2', msg('11')), 'media', 'un effetto tolto dalla scelta non parte');
  assert.equal(walkon.entrate('ch2', occ), 0, 'e non brucia l\'entrata');
  cfg.partenza = { modo: 'comando', comando: 'entro' };
  assert.equal(S.suMessaggio('ch2', msg('10')), 'comando');
  assert.equal(S.suMessaggio('ch2', msg('10', { text: '!entro' })), 'in-scena');
});

test('i file: il tipo dai byte, i limiti dello streamer, il temporaneo che se ne va sempre, gli orfani tolti', async () => {
  const tmp = join(usaEGetta.dir, 'tmp');
  mkdirSync(tmp, { recursive: true });
  const t = (nome, contenuto) => { const p = join(tmp, nome); writeFileSync(p, contenuto); return p; };
  const finta = async (temp, mime, dir, id) => { writeFileSync(join(dir, id + '.webp'), 'x'); return { tipo: 'immagine', file: id + '.webp', durata: 5000 }; };
  const html = t('falsa.png', '<html><script>alert(1)</script></html>');
  await assert.rejects(F.accogli(CH, html, { tipi: ['immagine'], comprimi: finta }), (e) => e.codice === 'tipo');
  assert.equal(existsSync(html), false, 'il temporaneo se ne va anche quando e\' rifiutato');
  const wav = t('suono.png', Buffer.concat([Buffer.from('RIFF\0\0\0\0WAVE', 'latin1'), Buffer.alloc(32)]));
  await assert.rejects(F.accogli(CH, wav, { tipi: ['immagine'], comprimi: finta }), (e) => e.codice === 'tipo-no', 'un audio col nome di un\'immagine resta un audio');
  const lungo = t('lungo', Buffer.concat([Buffer.from('OggS', 'latin1'), Buffer.alloc(32)]));
  await assert.rejects(F.accogli(CH, lungo, { tipi: ['audio'], maxSec: 5, durata: async () => 9000, comprimi: finta }), (e) => e.codice === 'lungo');
  const png = t('vera', Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]));
  const r = await F.accogli(CH, png, { tipi: ['immagine'], comprimi: finta, ora: 1700000000000 });
  assert.match(r.file, F.NOME_FILE, 'il nome lo fa il server');
  assert.equal(existsSync(png), false);
  assert.ok(F.percorso(CH, r.file));
  assert.equal(F.percorso(CH, '../../x.webp'), '', 'un nome che non e\' nostro non apre niente');
  const orfano = 'wo_0000000000009_222222222222.webp';
  writeFileSync(join(F.cartella(CH), orfano), 'x');
  const vecchio = (Date.now() - F.ORFANO_DOPO_MS - 1000) / 1000;
  utimesSync(join(F.cartella(CH), orfano), vecchio, vecchio);
  utimesSync(join(F.cartella(CH), r.file), vecchio, vecchio);
  assert.equal(await F.pulisci(CH, new Set([r.file])), 1, 'solo quello che nessuna riga nomina');
  assert.deepEqual(readdirSync(F.cartella(CH)), [r.file]);
});

test('con ffmpeg vero: un PNG entra e diventa un WebP nostro', { skip: !existsSync('/usr/bin/ffmpeg') }, async () => {
  const { spawnSync } = await import('node:child_process');
  const p = join(usaEGetta.dir, 'prova.bin');
  spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=red:s=64x64', '-frames:v', '1', '-f', 'image2', '-c:v', 'png', p]);
  const r = await F.accogli(CH, p, { tipi: ['immagine'] });
  assert.equal(r.tipo, 'immagine');
  assert.match(r.file, /\.webp$/);
});

test('la mail dell\'esito: nella lingua di chi ha salvato, col motivo se rifiutato', () => {
  const m = W.mailEsito({ esito: 'rifiutato', motivo: 'Too loud.', lingua: 'en', canale: 'Andryx', nome: 'Luna', link: 'https://x/won/andryx' });
  assert.match(m.oggetto, /not approved/);
  assert.match(m.testo, /The reason: Too loud\./);
  assert.match(W.mailEsito({ esito: 'approvato', lingua: 'es', canale: 'A' }).oggetto, /aprobado/);
});
