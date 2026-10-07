// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA TUA DIRETTA IN PRIMO PIANO (features/rilievo.js, docs/TELEGRAM.md e
// docs/DISCORD-AVVISI.md, «La tua diretta in primo piano»).
//
// Le promesse:
//  · la regola: casa piena, ospite in sordina dove arriva anche la casa, ospite
//    pieno dove arrivano solo gli altri, tutto come prima a levetta spenta;
//  · Telegram: l'ospite in sordina parte senza suono, senza locandina, con
//    l'anteprima piccola e non si fissa, ma a diretta finita si toglie lo stesso
//    dove il posto fissa; la casa ha locandina, suono e fissato;
//  · Discord: l'ospite in sordina non chiama il ruolo, parte senza notifica e
//    ha l'immagine nell'angolo, anche al ritentativo e alla riscrittura;
//  · le levette (community e primo piano) hanno il loro cassetto e non
//    cancellano le risposte ai piccoli avvisi, ne' ne vengono cancellate.
//
// Telegram e Discord sono finti (fetch sostituito), il bot e' quello vero.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('rilievo-');
const { streamers, tgConf, tgDest, tgMsg, dcDest, accessi, avvisiConf, db, separaLevetteAvvisiUnaTantum } = await import('../../src/db.js');
const { BotManager } = await import('../../src/bot.js');
const avvisi = await import('../../src/features/avvisi.js');
const { rilievo, ospitaCasa, RILIEVI } = await import('../../src/features/rilievo.js');
const telegram = await import('../../src/features/telegram.js');
const discord = await import('../../src/features/discord.js');
const dcApi = await import('../../src/features/discord-api.js');
const cosaManca = await import('../../src/features/cosa-manca.js');
test.after(() => casa.pulisci());

// ---- Telegram e Discord finti
const chiamate = [];
let n = 0;
const vero = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const corpo = opts.body;
  const campi = {};
  if (corpo instanceof FormData) for (const [k, v] of corpo.entries()) campi[k] = typeof v === 'string' ? v : '(file)';
  else if (typeof corpo === 'string') { try { Object.assign(campi, JSON.parse(corpo)); } catch { /* */ } }
  const id = ++n;
  if (u.startsWith('https://api.telegram.org/')) {
    const metodo = u.split('/').pop().split('?')[0];
    chiamate.push({ dove: 'tg', metodo, campi });
    return new Response(JSON.stringify({ ok: true, result: { message_id: id } }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (u.startsWith('https://discord.com/')) {
    chiamate.push({ dove: 'dc', metodo: opts.method || 'GET', url: u, campi });
    return new Response(JSON.stringify({ id: `m${id}` }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return new Response('', { status: 404 });
};
test.after(() => { globalThis.fetch = vero; });

const tg = (metodo) => chiamate.filter((c) => c.dove === 'tg' && (!metodo || c.metodo === metodo));
const aChat = (chat) => (c) => String(c.campi.chat_id) === String(chat);
let giro = 0;
function bot() {
  const b = Object.create(BotManager.prototype);
  b.helix = new Proxy({}, { get: () => async () => null });
  b._liveState = new Map();
  b._statoDiretta = new Map();
  return b;
}
const diretta = (login, id = 'S1') => avvisi.diretta({ piattaforma: 'twitch', login, display: login.toUpperCase(), titolo: 'Sera', id });

// ------------------------------------------------------------- la regola
test('la regola: casa piena, ospite in sordina dove arriva anche la casa, pieno dove arrivano solo gli altri', () => {
  const tutti = { streamer: '' };
  const conMe = { streamer: 'amico,Io' };
  const soloAltri = { streamer: 'amico,altro' };
  assert.equal(rilievo({ casa: 'io', chi: 'io', posto: tutti }).ruolo, 'casa');
  assert.equal(rilievo({ casa: 'io', chi: '', posto: tutti }).ruolo, 'casa', 'senza «di chi» e\' la casa');
  assert.equal(rilievo({ casa: 'IO', chi: 'io', posto: soloAltri }).ruolo, 'casa', 'le maiuscole non fanno un ospite');
  assert.equal(rilievo({ casa: 'io', chi: 'amico', posto: tutti }).ruolo, 'ospite');
  assert.equal(rilievo({ casa: 'io', chi: 'amico', posto: conMe }).ruolo, 'ospite');
  assert.equal(rilievo({ casa: 'io', chi: 'amico', posto: soloAltri }).ruolo, 'pari');
  for (const chi of ['io', 'amico']) {
    for (const posto of [tutti, conMe, soloAltri]) assert.equal(rilievo({ casa: 'io', chi, posto, risalto: false }), RILIEVI.pari, 'spenta: tutto come prima');
  }
  assert.equal(ospitaCasa({ streamer: ' amico , io ' }, 'io'), true, 'spazi intorno ai nomi');
  assert.equal(ospitaCasa(null, 'io'), true, 'un posto senza filtro e\' di tutti');
});

test('i tre rilievi dicono quello che promettono, e non si cambiano per sbaglio', () => {
  const { casa: c, ospite: o, pari: p } = RILIEVI;
  assert.deepEqual([c.carta, c.suona, c.fissa, c.chiama, c.piccola, c.anteprima], [true, true, true, true, false, 'grande']);
  assert.deepEqual([o.carta, o.suona, o.fissa, o.chiama, o.piccola, o.anteprima], [false, false, false, false, true, 'piccola']);
  assert.deepEqual([p.carta, p.suona, p.fissa, p.chiama, p.piccola, p.anteprima], [true, true, true, true, false, '']);
  assert.ok(Object.isFrozen(RILIEVI) && Object.isFrozen(o));
});

// ------------------------------------------------------------- Telegram, i pezzi
test('Telegram: il messaggio in sordina parte senza suono, e l\'anteprima ha la misura chiesta', async () => {
  chiamate.length = 0;
  await telegram.inviaMessaggio('t', '-1', 'ciao', { silenzioso: true, media: 'piccola' });
  await telegram.inviaMessaggio('t', '-1', 'ciao', { media: 'grande' });
  await telegram.inviaMessaggio('t', '-1', 'ciao');
  await telegram.inviaMessaggio('t', '-1', 'ciao', { anteprima: false, media: 'grande' });
  const [a, b, c, d] = tg('sendMessage').map((x) => x.campi);
  assert.equal(a.disable_notification, true);
  assert.deepEqual(a.link_preview_options, { prefer_small_media: true });
  assert.equal(a.disable_web_page_preview, undefined, 'le due strade dell\'anteprima non si mescolano');
  assert.deepEqual(b.link_preview_options, { prefer_large_media: true });
  assert.equal(b.disable_notification, undefined, 'la casa suona');
  assert.equal(c.disable_web_page_preview, false, 'senza misura e\' come prima');
  assert.equal(c.link_preview_options, undefined);
  assert.equal(d.disable_web_page_preview, true, 'senza anteprima la misura non conta');
  assert.equal(d.link_preview_options, undefined);
});

test('Telegram: la sordina vale per ogni pezzo, anche per la foto e per il testo che la segue o la sostituisce', async () => {
  chiamate.length = 0;
  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  const lungo = 'x'.repeat(telegram.DIDASCALIA_MAX + 5);
  await telegram.diffondi('t', [{ chat_id: '-1' }], lungo, { foto: PNG, silenzioso: true, media: 'piccola' });
  const pezzi = tg();
  assert.deepEqual(pezzi.map((x) => x.metodo), ['sendPhoto', 'sendMessage']);
  assert.equal(pezzi[0].campi.disable_notification, 'true');
  assert.equal(pezzi[1].campi.disable_notification, true);
  chiamate.length = 0;
  await telegram.diffondi('t', [{ chat_id: '-1' }], 'breve', { foto: PNG });
  assert.equal(tg()[0].campi.disable_notification, undefined, 'senza sordina la foto suona');
});

// ------------------------------------------------------------- Telegram, il giro vero
function canaleTg() {
  const ch = `rilievotg${++giro}`;
  streamers.upsertApproved(ch, ch.toUpperCase());
  accessi.set(ch, { modo: 'tutto' });
  tgConf.set(ch, { token: '123:abc', attivo: true });
  const A = tgDest.aggiungi({ channel: ch, chatId: '-100A', titolo: 'gruppo di casa', tipo: 'supergroup', pin: 1 });
  const B = tgDest.aggiungi({ channel: ch, chatId: '-100B', titolo: 'gruppo degli amici', tipo: 'supergroup', streamer: 'amico', pin: 1 });
  return { ch, A, B };
}

test('Telegram: l\'ospite arriva in sordina dove c\'e\' la casa, e pieno dove ci sono solo gli altri', async () => {
  const { ch } = canaleTg();
  chiamate.length = 0;
  const r = await bot()._diffondi(ch, 'live', 'amico', diretta('amico'), { chiudi: true });
  assert.equal(r.inviati, 2);
  const inA = tg().filter(aChat('-100A'));
  const inB = tg().filter(aChat('-100B'));
  assert.deepEqual(inA.map((x) => x.metodo), ['sendMessage'], 'in casa: niente locandina e niente fissato');
  assert.equal(inA[0].campi.disable_notification, true, 'in casa: senza suono');
  assert.deepEqual(inA[0].campi.link_preview_options, { prefer_small_media: true }, 'in casa: anteprima piccola');
  assert.ok(inB.some((x) => x.metodo === 'sendPhoto'), 'dagli amici: la locandina (e quindi c\'era da disegnarla)');
  assert.ok(inB.some((x) => x.metodo === 'pinChatMessage'), 'dagli amici: fissato');
  assert.ok(inB.every((x) => x.campi.disable_notification !== 'true' && x.campi.disable_notification !== true), 'dagli amici: suona');
  assert.equal(tgMsg.perStreamer(ch, 'amico').length, 2, 'ricordato in tutti e due i posti, anche dove non e\' fissato');
});

test('Telegram: a diretta finita l\'avviso in sordina si toglie lo stesso, dove il posto fissa', async () => {
  const { ch } = canaleTg();
  await bot()._diffondi(ch, 'live', 'amico', diretta('amico'), { chiudi: true });
  chiamate.length = 0;
  await bot()._chiudiLiveEsterna(ch, 'amico');
  const tolti = tg('deleteMessage').map((x) => String(x.campi.chat_id)).sort();
  assert.deepEqual(tolti, ['-100A', '-100B']);
});

test('Telegram: la casa ha tutto, e la locandina non si disegna per chi non la riceve', async () => {
  const { ch } = canaleTg();
  chiamate.length = 0;
  await bot()._diffondi(ch, 'live', ch, diretta(ch), { chiudi: true });
  const inA = tg().filter(aChat('-100A'));
  assert.ok(inA.some((x) => x.metodo === 'sendPhoto'), 'la locandina');
  assert.ok(inA.some((x) => x.metodo === 'pinChatMessage'), 'fissata');
  assert.ok(inA.every((x) => x.campi.disable_notification !== 'true' && x.campi.disable_notification !== true), 'suona');
  assert.equal(tg().filter(aChat('-100B')).length, 0, 'il posto degli amici non riceve la casa');

  // un ospite che arriva solo dove c'e' la casa: nessuna locandina da disegnare
  const solo = `rilievotg${++giro}`;
  streamers.upsertApproved(solo, solo.toUpperCase());
  tgConf.set(solo, { token: '123:abc', attivo: true });
  tgDest.aggiungi({ channel: solo, chatId: '-100C', titolo: 'solo casa', tipo: 'supergroup', pin: 1 });
  const b = bot();
  let disegni = 0;
  b.helix = new Proxy({}, { get: () => async () => { disegni++; return null; } });
  // senza titolo, la locandina chiederebbe a Twitch titolo e faccia: e' il
  // segno che si e' messa a disegnare
  const senzaTitolo = { ...diretta('amico'), titolo: '' };
  chiamate.length = 0;
  await b._diffondi(solo, 'live', 'amico', senzaTitolo, { chiudi: true });
  assert.deepEqual(tg().map((x) => x.metodo), ['sendMessage']);
  assert.equal(disegni, 0, 'per la locandina non si e\' chiesto niente a Twitch');
  // e la misura e' giusta: la casa, senza titolo, la fa chiedere
  chiamate.length = 0;
  await b._diffondi(solo, 'live', solo, { ...diretta(solo), titolo: '' }, { chiudi: true });
  assert.ok(disegni > 0, 'la casa si disegna');
});

test('Telegram: a levetta spenta l\'ospite torna pieno anche dove c\'e\' la casa', async () => {
  const { ch } = canaleTg();
  avvisiConf.set(ch, { risalto: { telegram: false } });
  chiamate.length = 0;
  await bot()._diffondi(ch, 'live', 'amico', diretta('amico'), { chiudi: true });
  const inA = tg().filter(aChat('-100A'));
  assert.ok(inA.some((x) => x.metodo === 'sendPhoto'));
  assert.ok(inA.some((x) => x.metodo === 'pinChatMessage'));
  assert.ok(inA.every((x) => x.campi.link_preview_options === undefined), 'come prima: nessuna misura chiesta');
});

// ------------------------------------------------------------- Discord
const WH = (k) => `https://discord.com/api/webhooks/${k}/tok${k}`;
const dc = (k, metodo) => chiamate.filter((c) => c.dove === 'dc' && c.url.startsWith(WH(k)) && (!metodo || c.metodo === metodo));
function canaleDc() {
  const ch = `rilievodc${++giro}`;
  streamers.upsertApproved(ch, ch.toUpperCase());
  accessi.set(ch, { modo: 'tutto' });
  const k1 = `${giro}01`, k2 = `${giro}02`;
  dcDest.aggiungi({ channel: ch, webhook: WH(k1), ruolo: '111111111111111111', chiudi: 1, attivo: 1 });
  dcDest.aggiungi({ channel: ch, webhook: WH(k2), streamer: 'amico', ruolo: '222222222222222222', chiudi: 1, attivo: 1 });
  return { ch, k1, k2 };
}
const conImmagine = (x) => ({ ...diretta(x), miniatura: 'https://img/1280x720.jpg' });

test('Discord: l\'ospite dove c\'e\' la casa non chiama il ruolo, non notifica e sta nell\'angolo', async () => {
  const { ch, k1, k2 } = canaleDc();
  chiamate.length = 0;
  await bot()._diffondiDiscord(ch, 'live', 'amico', conImmagine('amico'), { chiudi: true });
  const [a] = dc(k1, 'POST');
  assert.ok(!/<@&/.test(a.campi.content), 'nessun ruolo chiamato');
  assert.deepEqual(a.campi.allowed_mentions, { parse: [] });
  assert.equal(a.campi.flags, discord.SENZA_NOTIFICA);
  assert.ok(a.campi.embeds[0].thumbnail && !a.campi.embeds[0].image, 'immagine nell\'angolo');
  const [b] = dc(k2, 'POST');
  assert.match(b.campi.content, /<@&222222222222222222>/, 'dove ci sono solo gli altri il ruolo si chiama');
  assert.equal(b.campi.flags, undefined);
  assert.ok(b.campi.embeds[0].image && !b.campi.embeds[0].thumbnail);
});

test('Discord: la casa chiama il ruolo con l\'immagine grande', async () => {
  const { ch, k1 } = canaleDc();
  chiamate.length = 0;
  await bot()._diffondiDiscord(ch, 'live', ch, conImmagine(ch), { chiudi: true });
  const [a] = dc(k1, 'POST');
  assert.match(a.campi.content, /^<@&111111111111111111> /);
  assert.equal(a.campi.flags, undefined);
  assert.ok(a.campi.embeds[0].image);
});

test('Discord: la sordina resta al ritentativo e alla riscrittura, anche se nel frattempo la levetta cambia', async () => {
  const { ch, k1 } = canaleDc();
  const b = bot();
  await b._diffondiDiscord(ch, 'live', 'amico', conImmagine('amico'), { chiudi: true });
  const rec = db.prepare("SELECT * FROM avvisi_recapiti WHERE channel=? AND dest_id=(SELECT id FROM discord_dest WHERE channel=? AND webhook=?)").get(ch, ch, WH(k1));
  const dati = JSON.parse(rec.dati);
  assert.equal(dati.ospite, true, 'il rilievo sta nel recapito');
  avvisiConf.set(ch, { risalto: { discord: false } });
  chiamate.length = 0;
  const t = dcDest.get(ch, rec.dest_id);
  await b._consegnaDiscord({ ...rec, dati }, t, '');
  const [di] = dc(k1, 'POST');
  assert.equal(di.campi.flags, discord.SENZA_NOTIFICA, 'il ritentativo arriva come il primo invio');
  b.helix = { getStream: async () => ({ id: 'S1', title: 'Sera tardi', game_name: 'Celeste', viewer_count: 30, started_at: new Date(Date.now() - 600_000).toISOString(), thumbnail_url: 'https://x/{width}x{height}.jpg' }) };
  chiamate.length = 0;
  await b._aggiornaAvvisiDiscord(Date.now() + 3600_000);
  const [rs] = dc(k1, 'PATCH');
  assert.ok(rs, 'riscritto');
  assert.ok(rs.campi.embeds[0].thumbnail && !rs.campi.embeds[0].image, 'alla riscrittura l\'immagine resta nell\'angolo');
});

test('Discord dal bot: della porta dei segni passa solo «senza notifica»', async () => {
  chiamate.length = 0;
  await dcApi.mandaMessaggio('tok', '300000000000000001', { content: 'ciao', flags: discord.SENZA_NOTIFICA | 4 });
  await dcApi.mandaMessaggio('tok', '300000000000000001', { content: 'ciao', flags: 4 });
  const [a, b] = chiamate.filter((c) => c.dove === 'dc');
  assert.equal(a.campi.flags, discord.SENZA_NOTIFICA);
  assert.equal(b.campi.flags, undefined);
});

// ------------------------------------------------------------- le levette
test('le levette: il primo piano e\' acceso di serie, e ogni levetta si muove da sola', () => {
  const ch = `levette${++giro}`;
  streamers.upsertApproved(ch, ch.toUpperCase());
  assert.deepEqual(avvisiConf.get(ch).risalto, { telegram: true, discord: true });
  avvisiConf.set(ch, { community: { discord: true } });
  avvisiConf.set(ch, { risalto: { telegram: false } });
  const v = avvisiConf.get(ch);
  assert.deepEqual(v.risalto, { telegram: false, discord: true });
  assert.equal(v.community.discord, true, 'il primo piano non tocca la community');
  avvisiConf.set(ch, { community: { telegram: true } });
  assert.deepEqual(avvisiConf.get(ch).risalto, { telegram: false, discord: true }, 'la community non tocca il primo piano');
});

test('le levette e le risposte ai piccoli avvisi stanno in cassetti diversi, e non si cancellano a vicenda', () => {
  const ch = `levette${++giro}`;
  streamers.upsertApproved(ch, ch.toUpperCase());
  const id = cosaManca.AVVISI_ID?.[0] || 'telegram';
  // una risposta ai piccoli avvisi, salvata come la salva il server
  const s0 = streamers.get(ch).settings || {};
  const risposte = cosaManca.rispondi(s0.avvisi, id, 'mai');
  assert.ok(risposte, 'la risposta e\' valida');
  streamers.setSettings(ch, { ...s0, avvisi: risposte });
  avvisiConf.set(ch, { community: { discord: true }, risalto: { telegram: false } });
  assert.deepEqual(streamers.get(ch).settings.avvisi, risposte, 'la levetta non butta via le risposte');
  // e una risposta dopo non spegne le levette
  const s1 = streamers.get(ch).settings;
  streamers.setSettings(ch, { ...s1, avvisi: cosaManca.rispondi(s1.avvisi, id, 'mai') });
  assert.equal(avvisiConf.get(ch).community.discord, true, 'la risposta non spegne la community');
  assert.equal(avvisiConf.get(ch).risalto.telegram, false);
});

test('il trasloco una tantum porta le levette nel cassetto loro e lascia le risposte dove sono', () => {
  const vecchio = `trasloco${++giro}`;
  const gia = `trasloco${++giro}`;
  for (const c of [vecchio, gia]) streamers.upsertApproved(c, c.toUpperCase());
  const id = cosaManca.AVVISI_ID?.[0] || 'telegram';
  streamers.setSettings(vecchio, { altro: 1, avvisi: { community: { telegram: 0, discord: 1 }, [id]: { mai: true } } });
  streamers.setSettings(gia, { avvisi: { community: { telegram: 1, discord: 1 } }, avvisiConf: { community: { telegram: 0, discord: 0 } } });
  // prima del trasloco la lettura trova lo stesso il posto vecchio
  assert.equal(avvisiConf.get(vecchio).community.discord, true);
  db.prepare("DELETE FROM facts WHERE channel='__migrazioni__' AND key='levette_avvisi_separate_v1'").run();
  assert.equal(separaLevetteAvvisiUnaTantum(), 2);
  const sv = streamers.get(vecchio).settings;
  assert.deepEqual(sv.avvisiConf, { community: { telegram: 0, discord: 1 } });
  assert.deepEqual(sv.avvisi, { [id]: { mai: true } }, 'le risposte restano, la community se ne va');
  assert.equal(sv.altro, 1, 'il resto non si tocca');
  assert.equal(avvisiConf.get(vecchio).community.discord, true, 'dopo il trasloco la levetta e\' quella di prima');
  assert.deepEqual(streamers.get(gia).settings.avvisiConf, { community: { telegram: 0, discord: 0 } }, 'chi ha gia\' il cassetto nuovo non si tocca');
  assert.equal(separaLevetteAvvisiUnaTantum(), 0, 'una volta sola');
});

// ------------------------------------------------------------- il pannello dice la stessa regola
test('la riga del pannello in ogni posto dice quello che il bot fa davvero', async () => {
  const { readFileSync } = await import('node:fs');
  const APP = readFileSync(new URL('../../src/web/public/app.js', import.meta.url), 'utf8');
  const src = APP.slice(APP.indexOf('function _rilievoRiga('), APP.indexOf('async function caricaTgDestinazioni'));
  const riga = new Function('L', `${src}; return _rilievoRiga;`)((it) => it);
  const io = 'casa';
  const amiciTutti = [[], ['amico'], ['amico', 'altro']];
  const filtri = [[], ['casa'], ['amico'], ['casa', 'amico'], ['altro']];
  const eventi = [[], ['live'], ['ig'], ['live', 'ig']];
  let casi = 0;
  for (const dove of ['telegram', 'discord']) for (const risalto of [true, false]) for (const am of amiciTutti) for (const streamer of filtri) for (const ev of eventi) {
    const d = { io, risalto, ospitiSu: 'live', amici: am.map((login) => ({ login })) };
    const t = { streamer, eventi: ev };
    const detto = riga(t, d, dove);
    const arrivano = am.filter((g) => (!ev.length || ev.includes('live')) && (!streamer.length || streamer.includes(g)));
    let atteso = '';
    if (risalto && arrivano.length) atteso = rilievo({ casa: io, chi: arrivano[0], posto: { streamer: streamer.join(',') }, risalto }).ruolo;
    const visto = !detto ? '' : /in sordina/.test(detto) ? 'ospite' : /solo gli altri/.test(detto) ? 'pari' : '?';
    assert.equal(visto, atteso, `${dove} · levetta ${risalto} · altri ${am} · di chi [${streamer}] · eventi [${ev}]`);
    casi++;
  }
  assert.equal(casi, 2 * 2 * 3 * 5 * 4);
});
