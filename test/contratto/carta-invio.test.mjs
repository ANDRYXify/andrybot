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
import { EVENTI_LIVE, eUnaDiretta, CHIAVI, eventoDi } from '../../src/features/avvisi.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');

const DEST = [{ chat_id: '-100', titolo: 'gruppo' }];
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

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
  const bot = leggi('src/bot.js');
  assert.match(bot, /eUnaDiretta\(evento\)/,
    'la decisione passa dall’elenco unico: scritta a mano, coprirebbe una piattaforma sola');
});

test('la grafica si accende da sé solo se lo streamer l’ha accesa', async () => {
  const { pngPerDiretta } = await import('../../src/features/cartalive.js');
  const png = await pngPerDiretta('nessuno-che-esiste', {});
  assert.equal(png, null, 'senza la levetta accesa non si disegna niente');
});
