// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE MORTI DI MINECRAFT, DAL REGISTRO DEL GIOCO (src/web/public/morti-minecraft.js).
//
// Minecraft Java scrive ogni messaggio di chat in logs/latest.log, e le frasi di
// morte sono quelle del gioco, nella lingua in cui si gioca. Il pannello le legge
// dai file del gioco dello streamer (l'inglese dal jar, le altre dagli asset) e
// conta le righe che sono una morte SUA. Qui si prova:
//  · una frase diventa un'espressione che trova la vittima ovunque sia nella
//    frase (in italiano quasi mai in testa);
//  · conta solo la vittima: chi uccide, la chat dei giocatori e le frasi senza
//    vittima non contano, e nemmeno un nome in coda a una frase piu' lunga;
//  · il jar si legge saltando al solo file che serve, anche nello zip grande;
//  · il registro si legge dal punto in cui si era rimasti: la prima volta dalla
//    fine, le righe a meta' aspettano, e un registro nuovo si legge da capo;
//  · le frasi seguono la lingua, e con un launcher diverso si cercano nella
//    cartella dei suoi file.
//
// Le frasi qui sono inventate, nel formato del gioco: quelle vere sono di Mojang
// e restano nei file di chi gioca. Sulle 106 frasi vere di inglese, italiano e
// spagnolo il riconoscimento e' stato provato a parte: 104 su 104 prese in ogni
// lingua, nessuna contata a chi uccide.
import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync, crc32 } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

globalThis.window = globalThis;
await import(pathToFileURL(join(process.cwd(), 'src/web/public/morti-minecraft.js')).href);
const M = globalThis.SB_MINECRAFT;

// ── uno zip scritto a mano, come un jar ────────────────────────────────────
function zip(voci, { zip64 = false } = {}) {
  const locali = [];
  const centrali = [];
  let dove = 0;
  for (const { nome, dati, metodo = 8 } of voci) {
    const n = Buffer.from(nome);
    const piena = Buffer.from(dati);
    const corpo = metodo === 8 ? deflateRawSync(piena) : piena;
    const l = Buffer.alloc(30);
    l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(20, 4); l.writeUInt16LE(metodo, 8);
    l.writeUInt32LE(crc32(piena), 14); l.writeUInt32LE(corpo.length, 18); l.writeUInt32LE(piena.length, 22);
    l.writeUInt16LE(n.length, 26); l.writeUInt16LE(3, 28);
    const extraLocale = Buffer.from([0xca, 0xfe, 0x00]);
    locali.push(l, n, extraLocale, corpo);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(metodo, 10);
    c.writeUInt32LE(crc32(piena), 16); c.writeUInt32LE(corpo.length, 20); c.writeUInt32LE(piena.length, 24);
    c.writeUInt16LE(n.length, 28); c.writeUInt32LE(dove, 42);
    centrali.push(c, n);
    dove += 30 + n.length + 3 + corpo.length;
  }
  const cd = Buffer.concat(centrali);
  const fondo = [];
  if (zip64) {
    const z = Buffer.alloc(56);
    z.writeUInt32LE(0x06064b50, 0); z.writeBigUInt64LE(44n, 4);
    z.writeBigUInt64LE(BigInt(voci.length), 24); z.writeBigUInt64LE(BigInt(voci.length), 32);
    z.writeBigUInt64LE(BigInt(cd.length), 40); z.writeBigUInt64LE(BigInt(dove), 48);
    const loc = Buffer.alloc(20);
    loc.writeUInt32LE(0x07064b50, 0); loc.writeBigUInt64LE(BigInt(dove + cd.length), 8); loc.writeUInt32LE(1, 16);
    fondo.push(z, loc);
  }
  const e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0);
  e.writeUInt16LE(zip64 ? 0xffff : voci.length, 8); e.writeUInt16LE(zip64 ? 0xffff : voci.length, 10);
  e.writeUInt32LE(zip64 ? 0xffffffff : cd.length, 12); e.writeUInt32LE(zip64 ? 0xffffffff : dove, 16);
  return Buffer.concat([...locali, cd, ...fondo, e]);
}

// ── una cartella finta, con le maniglie del browser ────────────────────────
const F = (dati, mod = 1000) => ({ __file: true, dati, mod });
const eFile = (x) => x && x.__file;
function cartella(albero, nome = '.minecraft') {
  const maniglia = (k, v) => (eFile(v)
    ? { kind: 'file', name: k, getFile: async () => new File([v.dati], k, { lastModified: v.mod }) }
    : cartella(v, k));
  return {
    kind: 'directory',
    name: nome,
    async getDirectoryHandle(k) { const v = albero[k]; if (v && !eFile(v)) return cartella(v, k); throw new DOMException('non c\'e\'', 'NotFoundError'); },
    async getFileHandle(k) { const v = albero[k]; if (eFile(v)) return maniglia(k, v); throw new DOMException('non c\'e\'', 'NotFoundError'); },
    async *entries() { for (const [k, v] of Object.entries(albero)) yield [k, maniglia(k, v)]; },
  };
}

const EN = {
  'death.prova.cavo': '%1$s tripped over a test cable',
  'death.prova.bonk': '%1$s was bonked by %2$s',
  'death.prova.bonk.item': '%1$s was bonked by %2$s using %3$s',
  'death.prova.lungo': 'Too long, here is the short one: %s',
  'death.prova.cento': '%1$s gave 100%% (and then some)',
  'chat.type.text': '<%s> %s',
};
const IT = {
  'death.prova.cavo': 'Un cavo di prova ha fatto inciampare %1$s',
  'death.prova.bonk': '%2$s ha bonkato %1$s',
  'death.prova.bonk.item': '%2$s ha bonkato %1$s con %3$s',
  'death.prova.lotta': 'Un\'incudine di prova ha schiacciato %1$s',
};
const HASH = 'ab'.repeat(20);
const minecraft = ({ lingua = 'it_it', log = '', dove = 'versions' } = {}) => {
  const jar = F(zip([{ nome: 'pack.png', dati: 'x'.repeat(500) }, { nome: 'assets/minecraft/lang/en_us.json', dati: JSON.stringify(EN) }]));
  const risorse = {
    assets: { indexes: { '5.json': F(JSON.stringify({ objects: { 'minecraft/lang/it_it.json': { hash: HASH } } })) }, objects: { ab: { [HASH]: F(JSON.stringify(IT)) } } },
  };
  if (dove === 'versions') risorse.versions = { '1.0': { '1.0.jar': jar } };
  else risorse.libraries = { com: { mojang: { minecraft: { '1.0': { 'minecraft-1.0-client.jar': jar } } } } };
  const gioco = { 'options.txt': F(`version:3465\nlang:${lingua}\n`), logs: { 'latest.log': F(log) } };
  return { albero: dove === 'versions' ? { ...gioco, ...risorse } : gioco, risorse };
};
const riga = (msg, ora = '12:00:00') => `[${ora}] [Render thread/INFO]: [System] [CHAT] ${msg}\n`;
const AVVIO = '[11:59:00] [main/INFO]: Setting user: Steve\n';

test('una frase diventa un\'espressione che trova la vittima ovunque sia', () => {
  const trova = (frase, msg) => M.espressione(frase)?.exec(msg)?.groups?.vittima ?? null;
  assert.equal(trova('%2$s ha bonkato %1$s', 'Zombie ha bonkato Steve'), 'Steve');
  assert.equal(trova('%1$s was bonked by %2$s using %3$s', 'Steve was bonked by Zombie using [Arco (raro)]'), 'Steve');
  assert.equal(trova('%1$s gave 100%% (and then some)', 'Steve gave 100% (and then some)'), 'Steve', 'i caratteri speciali restano lettere');
  assert.equal(trova('%1$s e poi ancora %1$s', 'Steve e poi ancora Steve'), 'Steve', 'la vittima scritta due volte');
  assert.equal(trova('%1$s e poi ancora %1$s', 'Steve e poi ancora Alex'), null, 'due volte, la stessa persona');
  assert.equal(M.espressione('Too long, here is the short one: %s'), null, 'una frase senza vittima non puo\' dire di chi e\' la morte');
  assert.equal(M.espressione('Intentional Game Design'), null);
});

test('conta solo la vittima, mai chi uccide, la chat dei giocatori o un nome in coda', () => {
  const esp = [...Object.values(IT), ...Object.values(EN)].map(M.espressione).filter(Boolean);
  const morte = (msg, nome = 'Steve') => M.morteDi(msg, esp, nome);
  assert.equal(morte('Zombie ha bonkato Steve'), true);
  assert.equal(morte('Steve ha bonkato Alex'), false, 'chi uccide non e\' morto');
  assert.equal(morte('Steve ha bonkato Alex con [Spada di Steve]'), false);
  assert.equal(morte('[VIP] Steve was bonked by Zombie'), true, 'un\'etichetta di squadra davanti al nome e\' sempre lui');
  assert.equal(morte('Un\'incudine di prova ha schiacciato Alex mentre lottava con Steve'), false, 'la frase corta prende tutto il resto come vittima: il nome in coda non basta');
  assert.equal(morte('[Rank] Alex: Steve was bonked by Zombie'), false, 'un altro che scrive la frase in chat');
  assert.equal(morte('Steve2 was bonked by Zombie'), false);
  assert.equal(morte('Zombie ha bonkato Steve', ''), false, 'senza sapere chi sei non si conta');
  for (const r of ['[12:00:00] [Render thread/INFO]: [Not Secure] [CHAT] <Alex> Steve was bonked by Zombie',
    '[12:00:00] [Client thread/INFO]: [CHAT] <Alex> Steve was bonked by Zombie',
    '[12:00:00] [Server thread/INFO]: Steve was bonked by Zombie']) {
    assert.equal(M.rigaChat(r), null, r);
  }
  assert.equal(M.rigaChat('[12:00:00] [Render thread/INFO]: [System] [CHAT] §cSteve was bonked by Zombie\r'), 'Steve was bonked by Zombie');
  assert.equal(M.rigaChat('[12:00:00] [Client thread/INFO]: [CHAT] Steve tripped over a test cable'), 'Steve tripped over a test cable', 'il formato di prima del 1.19');
  assert.equal(M.utente(AVVIO + '[12:00:00] [main/INFO]: Setting user: Alex\n'), 'Alex', 'vale l\'ultimo avvio');
  assert.equal(M.lingua('version:1\nlang:es_mx\n'), 'es_mx');
  assert.equal(M.lingua('version:1\n'), 'en_us');
});

test('il jar si legge saltando al solo file che serve, anche nello zip grande', async () => {
  for (const zip64 of [false, true]) {
    const jar = new Blob([zip([{ nome: 'a.txt', dati: 'ciao', metodo: 0 }, { nome: 'assets/minecraft/lang/en_us.json', dati: JSON.stringify(EN) }], { zip64 })]);
    const v = await M.cercaVoce(jar, 'assets/minecraft/lang/en_us.json');
    assert.deepEqual(JSON.parse(await M.leggiVoce(jar, v)), EN, `zip64 ${zip64}`);
    assert.equal(await M.leggiVoce(jar, await M.cercaVoce(jar, 'a.txt')), 'ciao', 'anche una voce non compressa');
    assert.equal(await M.cercaVoce(jar, 'assets/minecraft/lang/it_it.json'), null);
  }
  assert.equal(await M.cercaVoce(new Blob(['non sono uno zip']), 'x'), null);
});

test('il registro si legge da dove si era rimasti, e un registro nuovo da capo', async () => {
  const { albero } = minecraft({ log: AVVIO + riga('Zombie ha bonkato Steve') });
  const log = albero.logs['latest.log'];
  const gioco = cartella(albero);
  const st = M.lettore();
  await M.prepara(st, gioco, null);
  assert.equal(st.lingua, 'it_it');
  assert.equal(await M.giro(st, gioco), 'legge');
  assert.deepEqual([st.nome, st.morti], ['Steve', 0], 'la morte gia\' scritta non e\' successa adesso');

  log.dati += riga('Zombie ha bonkato Steve');
  await M.giro(st, gioco);
  assert.equal(st.morti, 1);
  log.dati += riga('Steve ha bonkato Alex') + '[12:00:01] [Render thread/INFO]: [Not Secure] [CHAT] <Alex> Zombie ha bonkato Steve\n';
  await M.giro(st, gioco);
  assert.equal(st.morti, 1, 'chi uccide e la chat dei giocatori non contano');

  const spezzata = riga('Un cavo di prova ha fatto inciampare Steve');
  log.dati += spezzata.slice(0, 40);
  await M.giro(st, gioco);
  assert.equal(st.morti, 1, 'mezza riga aspetta');
  log.dati += spezzata.slice(40);
  await M.giro(st, gioco);
  assert.equal(st.morti, 2, 'e intera conta una volta');
  log.dati += riga('Steve was bonked by Zombie');
  await M.giro(st, gioco);
  assert.equal(st.morti, 3, 'anche in inglese, se arriva cosi\'');

  log.dati = '[13:00:00] [main/INFO]: Setting user: Steve\n' + riga('Zombie ha bonkato Steve', '13:00:05') + 'x'.repeat(5000) + '\n';
  await M.giro(st, gioco);
  assert.equal(st.morti, 4, 'il gioco e\' ripartito: il registro nuovo e\' tutto nuovo, anche la morte scritta prima del punto dove era arrivato quello vecchio');
  log.dati = '[14:00:00] [main/INFO]: Setting user: Alex\n' + riga('Zombie ha bonkato Steve', '14:00:05');
  await M.giro(st, gioco);
  assert.deepEqual([st.nome, st.morti], ['Alex', 4], 'con un altro account le morti di Steve non sono tue');
});

test('la prima lettura parte da una riga intera, non da meta\'', async () => {
  const { albero } = minecraft({ log: AVVIO + riga('Zombie ha bonkato Steve') + riga('Zombie ha bonkato Steve').slice(0, 30) });
  const gioco = cartella(albero);
  const st = M.lettore();
  await M.prepara(st, gioco, null);
  await M.giro(st, gioco);
  albero.logs['latest.log'].dati += riga('Zombie ha bonkato Steve').slice(30);
  await M.giro(st, gioco);
  assert.equal(st.morti, 0, 'la morte a meta\' mentre si cominciava a guardare era gia\' successa');
});

test('le frasi seguono la lingua, e con un altro launcher si cercano nei suoi file', async () => {
  const inglese = minecraft({ lingua: 'en_us' });
  const st = M.lettore();
  await M.prepara(st, cartella(inglese.albero), null);
  assert.deepEqual([st.lingua, st.frasiSue, st.espressioni.length], ['en_us', 0, 4]);

  const altro = minecraft({ dove: 'libraries' });
  const solo = M.lettore();
  await M.prepara(solo, cartella(altro.albero), null);
  assert.equal(await M.giro(solo, cartella(altro.albero)), 'frasi', 'senza i file del gioco non si indovina');
  const con = M.lettore();
  await M.prepara(con, cartella(altro.albero), cartella(altro.risorse, 'Prism'));
  assert.deepEqual([con.lingua, con.frasiSue, con.espressioni.length], ['it_it', 4, 8], 'l\'inglese dal jar di libraries, l\'italiano dagli asset');

  const { albero } = minecraft({ lingua: 'en_us' });
  const gioco = cartella(albero);
  const cambia = M.lettore();
  await M.prepara(cambia, gioco, null);
  albero['options.txt'] = F('lang:it_it\n', 2000);
  await M.prepara(cambia, gioco, null);
  assert.equal(cambia.lingua, 'it_it', 'cambi lingua nel gioco, cambiano le frasi');
  assert.equal(cambia.frasiSue, 4);
});
