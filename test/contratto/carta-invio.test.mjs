// LA CARTA CHE PARTE: come l'immagine arriva nel gruppo.
//
// Tre cose che, se cedono, non danno nessun errore — fanno solo la cosa
// sbagliata in silenzio:
//   1. una didascalia più lunga del limite di Telegram: tagliarla vorrebbe dire
//      spezzare un tag HTML e farsi rifiutare il messaggio;
//   2. la foto che non parte: se l'annuncio si perde con lei, un guasto della
//      GRAFICA spegne l'AVVISO — e nessuno se ne accorge finché non è tardi;
//   3. la carta mandata su eventi che non sono una diretta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DIDASCALIA_MAX, diffondi } from '../../src/features/telegram.js';
import { EVENTI_LIVE, eUnaDiretta, CHIAVI, eventoDi, PIATTAFORME, diretta, messaggio } from '../../src/features/avvisi.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');

const DEST = [{ chat_id: '-100', titolo: 'gruppo' }];
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

// Quello che si legge davvero: senza i tag, che si vedono solo nel codice.
const letto = (t) => String(t).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

// Telegram finto: registra le chiamate e risponde come gli si dice.
function telegramFinto({ fotoOk = true } = {}) {
  const fatte = [];
  const vero = globalThis.fetch;
  globalThis.fetch = async (url, opt) => {
    const metodo = String(url).split('/').pop().split('?')[0];
    const corpo = opt?.body;
    const campi = {};
    if (corpo instanceof FormData) for (const [k, v] of corpo.entries()) campi[k] = typeof v === 'string' ? v : '(file)';
    else if (typeof corpo === 'string') Object.assign(campi, JSON.parse(corpo));
    fatte.push({ metodo, campi });
    const ok = metodo === 'sendPhoto' ? fotoOk : true;
    return new Response(JSON.stringify(ok ? { ok: true, result: { message_id: 1 } } : { ok: false, description: 'foto rifiutata' }),
      { status: ok ? 200 : 400, headers: { 'content-type': 'application/json' } });
  };
  return { fatte, basta: () => { globalThis.fetch = vero; } };
}

test('con la carta, il messaggio diventa la didascalia della foto', async () => {
  const t = telegramFinto();
  try {
    await diffondi('tok', DEST, '<b>Sono live!</b>', { foto: PNG });
    assert.equal(t.fatte.length, 1);
    assert.equal(t.fatte[0].metodo, 'sendPhoto');
    assert.equal(t.fatte[0].campi.caption, '<b>Sono live!</b>');
    assert.equal(t.fatte[0].campi.parse_mode, 'HTML');
  } finally { t.basta(); }
});

test('un messaggio troppo lungo non si taglia: la foto va sola e il testo la segue', async () => {
  // Il testo è HTML. Tagliarlo a 1024 caratteri spezzerebbe un tag a metà, e
  // Telegram rifiuterebbe tutto — cioè l'annuncio non partirebbe affatto.
  const t = telegramFinto();
  const lungo = '<b>' + 'a'.repeat(DIDASCALIA_MAX + 50) + '</b>';
  try {
    await diffondi('tok', DEST, lungo, { foto: PNG });
    assert.deepEqual(t.fatte.map((x) => x.metodo), ['sendPhoto', 'sendMessage']);
    assert.equal(t.fatte[0].campi.caption, undefined, 'nessuna didascalia mutilata');
    assert.equal(t.fatte[1].campi.text, lungo, 'e il testo arriva intero');
  } finally { t.basta(); }
});

test('se la foto non parte, l’annuncio parte lo stesso', async () => {
  // Un guasto della grafica non deve spegnere l'avviso: chi aspetta in gruppo
  // vuole sapere che sei live, la locandina è un di più.
  const t = telegramFinto({ fotoOk: false });
  try {
    const esiti = await diffondi('tok', DEST, 'Sono live!', { foto: PNG });
    assert.deepEqual(t.fatte.map((x) => x.metodo), ['sendPhoto', 'sendMessage']);
    assert.equal(esiti[0].ok, true, 'l’esito è quello del testo, che è arrivato');
  } finally { t.basta(); }
});

test('senza carta non cambia niente di come si mandava prima', async () => {
  const t = telegramFinto();
  try {
    await diffondi('tok', DEST, 'Sono live!');
    assert.deepEqual(t.fatte.map((x) => x.metodo), ['sendMessage']);
  } finally { t.basta(); }
});

test('la carta esce per OGNI piattaforma, non solo per Twitch', () => {
  // Le chiavi degli eventi sono storiche e diverse fra loro: 'live' per Twitch,
  // ma 'kick', 'ytlive', 'tiktok' per le altre. Chi controlla `evento ===
  // 'live'` copre Twitch e lascia fuori tutte le altre — senza dare errore:
  // semplicemente non manda la grafica, e nessuno capisce perché.
  for (const p of CHIAVI) {
    assert.equal(eUnaDiretta(eventoDi(p)), true, `${p}: la sua diretta non viene riconosciuta`);
  }
  assert.equal(eUnaDiretta('follow'), false, 'un follow non è una diretta');
  assert.equal(eUnaDiretta('sub'), false);
  assert.ok(EVENTI_LIVE.size >= 4, `le dirette conosciute sono ${EVENTI_LIVE.size}`);

  // e chi decide se mandare la carta deve usare QUESTO elenco, non una stringa
  const deciso = leggi('src/features/cartalive.js');
  const f = deciso.slice(deciso.indexOf('export async function fotoPerEvento'));
  assert.match(f.slice(0, f.indexOf('\n}')), /eUnaDiretta\(evento\)/,
    'la decisione passa dall’elenco unico: scritta a mano, coprirebbe una piattaforma sola');
});

test('la prova dal pannello passa dalla stessa strada dell’annuncio vero', async () => {
  // Il difetto: la prova è un'altra rotta, e se decide per conto suo se
  // allegare la locandina prova qualcosa che non è quello che parte. Premi
  // «manda una prova», arriva il testo, sei contento, e alla diretta arriva
  // un'immagine che non hai mai visto — o il contrario. Nessuno dei due
  // sintomi si vede finché non è tardi.
  const rotte = leggi('src/web/server.js');
  const prova = rotte.slice(rotte.indexOf("app.post('/api/streamer/telegram/prova'"));
  const corpo = prova.slice(0, prova.indexOf('}));') + 4);
  assert.match(corpo, /cartaLive\.fotoPerEvento\(/, 'la prova decide la locandina con la funzione unica');
  assert.match(corpo, /telegram\.diffondi\(/, 'e la spedisce con la stessa funzione dell’annuncio');
  assert.doesNotMatch(corpo, /telegram\.inviaMessaggio\(/,
    'mandarla con inviaMessaggio salterebbe la foto: la prova non proverebbe la cosa vera');
});

test('la locandina esce solo per una diretta, e la decisione è una sola', async () => {
  const { fotoPerEvento } = await import('../../src/features/cartalive.js');
  // Solo i casi che si fermano SUBITO: qui si prova la decisione, non il
  // disegno. Chiedere una diretta vera vorrebbe dire far rasterizzare
  // un'immagine per ogni piattaforma, e un collaudo lento è un collaudo che
  // prima o poi qualcuno smette di far girare.
  assert.equal(await fotoPerEvento('nessuno-che-esiste', 'follow'), null, 'un follow non porta la locandina');
  assert.equal(await fotoPerEvento('nessuno-che-esiste', 'sub'), null);
  assert.equal(await fotoPerEvento('nessuno-che-esiste', ''), null, 'e nemmeno un evento senza nome');
  const bot = leggi('src/bot.js');
  assert.match(bot, /cartaLive\.fotoPerEvento\(/, 'anche l’annuncio vero passa di lì');
});


test('con la locandina il testo non ripete l’immagine', () => {
  // La locandina disegna nome, titolo, gioco e indirizzo. Scriverli anche sotto
  // vuol dire mandare due volte la stessa cosa, e un messaggio alto il doppio.
  // Restano le due cose che l'immagine non sa fare: dire CHI nella notifica del
  // telefono (che dell'immagine non vede niente) e dare qualcosa da premere.
  for (const p of CHIAVI) {
    const d = diretta({ piattaforma: p, login: 'tizio', display: 'Tizio',
      titolo: 'Un titolo lunghissimo che si vede benissimo', gioco: 'Una Categoria', spettatori: 42, id: '1' });
    const lungo = messaggio(d);
    const corto = messaggio(d, '', { conLocandina: true });
    // Si conta quello che si LEGGE, non i segni del codice: `<a href="...">`
    // allunga la stringa e accorcia il messaggio. Contare i caratteri grezzi
    // misurava la cosa sbagliata, e infatti diceva che TikTok si allungava.
    assert.ok(letto(corto).length <= letto(lungo).length, `${p}: col disegno il messaggio si allunga`);
    assert.ok(!corto.includes('Un titolo lunghissimo'), `${p}: il titolo è già nell’immagine`);
    assert.ok(!corto.includes('Una Categoria'), `${p}: la categoria è già nell’immagine`);
    assert.ok(corto.includes('Tizio'), `${p}: senza il nome la notifica del telefono non dice chi è`);
    assert.ok(corto.includes(d.url), `${p}: senza link non c’è niente da premere: una foto non è cliccabile`);
    assert.ok(!corto.includes('\n'), `${p}: una riga sola, sennò non è più corto di prima`);
  }
});

test('ogni piattaforma ha il suo testo corto: nessuna resta indietro', () => {
  for (const p of CHIAVI) {
    assert.ok(PIATTAFORME[p].conLocandina, `${p}: manca il testo per quando parte la locandina`);
  }
});

test('il testo scritto dallo streamer vince comunque', () => {
  // La forma corta è il testo DI CASA. Se qualcuno ha scritto il suo, quello
  // resta: accendere la locandina non deve cancellargli il messaggio.
  const d = diretta({ piattaforma: 'twitch', login: 'tizio', display: 'Tizio', titolo: 'T', id: '1' });
  assert.equal(messaggio(d, 'Ciao {nome}', { conLocandina: true }), 'Ciao Tizio');
});

test('la locandina vale anche per le dirette degli amici', () => {
  // Un canale che annuncia gli amici deve annunciarli come annuncia se stesso:
  // stessa strada, stesso disegno, stesso testo corto. Con un compositore suo,
  // gli amici sarebbero rimasti col messaggio lungo e senza immagine — e
  // nessuno se ne accorge, perché il messaggio arriva lo stesso.
  const bot = leggi('src/bot.js');
  const amici = bot.slice(bot.indexOf('for (const a of tgAmici.daGuardare('));
  const corpo = amici.slice(0, 2200);
  assert.match(corpo, /_diffondiTelegram\(/, 'passa dalla strada comune');
  assert.match(corpo, /chi: a\.login/, 'e la locandina prende i dati di CHI è live, non del padrone del gruppo');
  assert.match(corpo, /avvisi\.messaggio\(/, 'e il testo lo compone la stessa funzione');
  assert.doesNotMatch(corpo, /costruisciMessaggioLive/, 'un compositore suo lascerebbe gli amici col testo lungo');
  assert.doesNotMatch(corpo, /_diffondiTelegram\(ch, conf, 'live'/, 'l’evento non si scrive a mano');
});

test('tutte e due le prove mandano quello che partirà davvero', () => {
  // Ce ne sono DUE: quella del gruppo e quella per singola destinazione. La
  // seconda era rimasta indietro — mandava con inviaMessaggio, cioè senza
  // locandina — e il difetto non si vedeva perché il messaggio arrivava.
  const rotte = leggi('src/web/server.js');
  const prove = [...rotte.matchAll(/app\.post\('\/api\/streamer\/telegram\/[^']*prova'/g)];
  assert.ok(prove.length >= 2, `le prove trovate sono ${prove.length}`);
  for (const m of prove) {
    const corpo = rotte.slice(m.index, m.index + 1600);
    const fine = corpo.indexOf('}));');
    const solo = corpo.slice(0, fine > 0 ? fine : 1600);
    assert.match(solo, /cartaLive\.fotoPerEvento\(/, 'questa prova non decide la locandina con la funzione unica');
    assert.match(solo, /telegram\.diffondi\(/, 'questa prova non spedisce come l’annuncio vero');
    assert.doesNotMatch(solo, /telegram\.inviaMessaggio\(/, 'mandarla con inviaMessaggio salta la foto');
  }
});

test('il titolo si trova anche a canale spento', async () => {
  // Alla prova il canale è quasi sempre spento: «la diretta in corso» non
  // esiste e la locandina usciva col titolo vuoto, come rotta. Il titolo però
  // c'è, un passo più in là: quello del CANALE, che resta scritto.
  const cl = leggi('src/features/cartalive.js');
  const f = cl.slice(cl.indexOf('async function completaInfo'));
  const corpo = f.slice(0, f.indexOf('\n}') + 2);
  assert.match(corpo, /getStream/, 'prima prova la diretta in corso');
  assert.match(corpo, /getChannelInfo/, 'e se è spento chiede il titolo del canale');
  assert.match(leggi('src/bot.js'), /helix: this\.helix/, 'l’annuncio vero passa helix, sennò non può chiedere niente');
});
