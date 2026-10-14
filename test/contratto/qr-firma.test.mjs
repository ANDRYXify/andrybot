// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA FIRMA DEL QR fra pannello e server (src/features/qr-stile.js): le immagini
// che il server tiene per le uscite automatiche e per la storia della diretta
// dicono da quale stile del QR sono nate, e il pannello le rifa' quando lo
// stile non e' piu' quello.
//
// Il patto, dal lato del server:
//  · la vista delle automatiche da' lo stile di adesso (qr), la sua firma
//    (firmaQr), quali immagini sono da rifare, e la storia della diretta con
//    il suo «da rifare»;
//  · le porte che salvano un'immagine accettano la firma di adesso, o nessuna
//    (un pannello di prima: si salva vuota, e resta da rifare); una firma
//    diversa e' un 409 col codice 'qr-cambiato' e la firma di adesso, e
//    l'immagine di prima resta com'era;
//  · le immagini salvate si rileggono, solo dal proprietario e mai da una
//    cache.
//
// Non si finge il server: il codice delle rotte si prende cosi' com'e' da
// src/web/server.js e gira con i moduli veri (automatiche, storia della
// diretta, firma) su una cartella usa e getta. Si sostituisce solo quello che
// sta fuori: il database dei canali, la foto del profilo, Instagram, la posta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-qr-firma-');
const automatiche = await import('../../src/features/automatiche.js');
const storiaIg = await import('../../src/features/storia-ig.js');
const settimana = await import('../../src/features/settimana.js');
const { normStileQr, firmaStileQr, firmaMandata, DISEGNO_QR } = await import('../../src/features/qr-stile.js');
process.on('exit', () => usaEGetta.pulisci());

const SRV = readFileSync(new URL('../../src/web/server.js', import.meta.url), 'utf8');
const pezzo = (da, a) => {
  const i = SRV.indexOf(da), j = SRV.indexOf(a, i + 1);
  assert.ok(i > 0 && j > i, `in server.js non trovo il tratto da «${da.trim()}» a «${a.trim()}»`);
  return SRV.slice(i, j);
};

// ── il server, coi pezzi veri ─────────────────────────────────────────────
const FOTO = 'https://static-cdn.jtvnw.net/jtv_user_pictures/anna-profile_image-300x300.png';
const CANALI = {};
let fotoChieste = 0;
const rotte = new Map();
const fuori = {
  app: { get: (via, ...h) => rotte.set(`GET ${via}`, h), post: (via, ...h) => rotte.set(`POST ${via}`, h) },
  requireOwner: (req, res, next) => (req.proprietario ? next() : res.status(403).json({ errore: 'solo il proprietario del canale può farlo' })),
  wrap: (fn) => fn,
  currentUser: (req) => req.utente,
  streamers: { get: (l) => CANALI[l] || null },
  avatarDi: async (l) => { fotoChieste++; return CANALI[l]?.avatar || ''; },
  normStileQr, firmaStileQr, firmaMandata, storiaIg, automatiche, settimana,
  storiaIgPossibile: async () => null,
  credenzialiInstagram: () => null,
  tgConf: { get: () => null },
  postaStreamer: { get: () => null },
  posta: { attiva: () => false },
};
const codice = [
  pezzo('  const SETTIMANA_MAX = 1_500_000;', '  // Due immagini, una per posto'),
  pezzo('  // LA FIRMA DEL QR (src/features/qr-stile.js).', '  // Il link della mail porta qui'),
].join('\n');
new Function(...Object.keys(fuori), codice)(...Object.values(fuori));

function risposta() {
  const r = { stato: 200, testa: {}, corpo: undefined };
  r.status = (c) => { r.stato = c; return r; };
  r.set = (k, v) => { if (typeof k === 'object') Object.assign(r.testa, k); else r.testa[k] = v; return r; };
  r.type = (t) => { r.testa['Content-Type'] = t; return r; };
  r.json = (b) => { r.corpo = JSON.parse(JSON.stringify(b)); return r; };
  r.send = (b) => { r.corpo = b; return r; };
  r.end = () => r;
  return r;
}

// Come Express: la catena di chi sta sulla porta, uno dopo l'altro finche'
// uno non risponde.
async function chiama(metodo, via, { chi = 'anna', proprietario = true, body, params = {} } = {}) {
  const catena = rotte.get(`${metodo} ${via}`);
  assert.ok(catena, `la porta ${metodo} ${via} non c'e'`);
  const req = { body, params, query: {}, utente: { login: chi }, proprietario };
  const res = risposta();
  for (const h of catena) {
    let avanti = false;
    await h(req, res, () => { avanti = true; });
    if (!avanti) break;
  }
  return res;
}

const JPEG = (n = 1) => Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, n, 2, 3]);
const dataUrl = (b) => 'data:image/jpeg;base64,' + b.toString('base64');
const STILE = { moduli: 'penna', occhi: 'tondi', scuro: '#1d2a6b', chiaro: '#fbfaf5', logo: 'foto', logoLato: 70, testo: 'https://socialbot.live/u/anna', cornice: 'Inquadrami' };
CANALI.anna = { login: 'anna', avatar: FOTO, settings: { qr: STILE, grafiche: { rev: 3 } } };
CANALI.bea = { login: 'bea', avatar: FOTO, settings: { grafiche: { rev: 1 } } };

test('la vista delle automatiche da\' lo stile del QR di adesso, la sua firma e cosa e\' da rifare', async () => {
  const r = await chiama('GET', '/api/streamer/automatiche');
  assert.equal(r.stato, 200);
  const v = r.corpo;
  assert.deepEqual(v.qr, normStileQr(STILE), 'lo stile salvato, normalizzato: il pannello disegna con questo');
  assert.equal(v.firmaQr, firmaStileQr(STILE, { avatar: FOTO }), 'col logo «la tua foto» la firma porta l\'indirizzo della foto');
  assert.match(v.firmaQr, /^[0-9a-f]{16}$/);
  assert.equal(v.rev, 3);
  assert.deepEqual(Object.keys(v.daRifare), automatiche.IMMAGINI, 'una voce per ogni immagine');
  assert.ok(Object.values(v.daRifare).every((x) => x === false), 'nessuna immagine, niente da rifare (da fare, e lo dice «pronte»)');
  assert.deepEqual(v.live, { attiva: false, pronta: false, daRifare: false, ultima: null });

  const di = await chiama('GET', '/api/streamer/automatiche', { chi: 'bea' });
  assert.equal(di.corpo.firmaQr, firmaStileQr(undefined), 'chi non ha mai salvato uno stile ha quello di serie');
  const prima = fotoChieste;
  await chiama('GET', '/api/streamer/automatiche', { chi: 'bea' });
  assert.equal(fotoChieste, prima, 'e senza il logo «la tua foto» la foto non si chiede nemmeno');
});

test('un\'immagine si salva con la firma di adesso, o senza; con un\'altra e\' un 409 e non si tocca niente', async () => {
  const v = (await chiama('GET', '/api/streamer/automatiche')).corpo;
  const manda = (firmaQr, n = 1) => chiama('POST', '/api/streamer/automatiche/immagine', {
    body: { nome: 'prima-2', immagine: dataUrl(JPEG(n)), impronta: v.impronta, rev: v.rev, anticipo: v.conf.prima.anticipo, ...(firmaQr === undefined ? {} : { firmaQr }) },
  });

  assert.equal((await manda(v.firmaQr)).stato, 200);
  let w = (await chiama('GET', '/api/streamer/automatiche')).corpo;
  assert.equal(w.pronte['prima-2'], true);
  assert.equal(w.daRifare['prima-2'], false, 'nata dallo stile di adesso');

  // lo stile cambia (salvato da un'altra scheda, o da un telefono)
  CANALI.anna.settings.qr = { ...STILE, scuro: '#000000' };
  w = (await chiama('GET', '/api/streamer/automatiche')).corpo;
  assert.notEqual(w.firmaQr, v.firmaQr);
  assert.equal(w.daRifare['prima-2'], true, 'adesso e\' da rifare');
  assert.equal(w.pronte['prima-2'], true, 'ma resta pronta: esce lo stesso, col QR di prima che si legge');

  const no = await manda(v.firmaQr, 2);
  assert.equal(no.stato, 409, 'disegnata con lo stile di prima: non si tiene');
  assert.deepEqual(Object.keys(no.corpo).sort(), ['codice', 'errore', 'firmaQr']);
  assert.equal(no.corpo.codice, 'qr-cambiato');
  assert.equal(no.corpo.firmaQr, w.firmaQr, 'e il server dice quella di adesso');
  assert.ok(no.corpo.errore.length > 10, 'con una frase, per chi non conosce il codice');
  assert.deepEqual((await chiama('GET', '/api/streamer/automatiche/immagine/:nome', { params: { nome: 'prima-2' } })).corpo, JPEG(1), 'e l\'immagine di prima resta com\'era');

  assert.equal((await manda('nonunafirma', 3)).stato, 409, 'una firma storta e\' una firma diversa');
  assert.equal((await manda(w.firmaQr, 4)).stato, 200, 'riletta la firma e ridisegnata, va');
  assert.equal((await chiama('GET', '/api/streamer/automatiche')).corpo.daRifare['prima-2'], false);

  assert.equal((await manda(undefined, 5)).stato, 200, 'un pannello di prima, senza firma: si accetta');
  assert.equal(automatiche.leggi('anna').immagini['prima-2'].firmaQr, '', 'salvata vuota');
  assert.equal((await chiama('GET', '/api/streamer/automatiche')).corpo.daRifare['prima-2'], true, 'quindi da rifare');
  CANALI.anna.settings.qr = STILE;
});

test('col logo «la tua foto», una foto nuova rifa\' le immagini anche se lo stile e\' lo stesso', async () => {
  const v = (await chiama('GET', '/api/streamer/automatiche')).corpo;
  await chiama('POST', '/api/streamer/automatiche/immagine', {
    body: { nome: 'settimana-post', immagine: dataUrl(JPEG(6)), impronta: v.impronta, rev: v.rev, firmaQr: v.firmaQr },
  });
  CANALI.anna.avatar = FOTO.replace('anna-', 'anna-nuova-');
  const w = (await chiama('GET', '/api/streamer/automatiche')).corpo;
  assert.notEqual(w.firmaQr, v.firmaQr);
  assert.equal(w.daRifare['settimana-post'], true);
  CANALI.anna.avatar = FOTO;
  assert.equal((await chiama('GET', '/api/streamer/automatiche')).corpo.daRifare['settimana-post'], false, 'tornata la foto di prima, torna buona');
});

test('la storia della diretta: la firma e la versione delle grafiche, il 409, e «da rifare» anche nella sua porta', async () => {
  const v = (await chiama('GET', '/api/streamer/automatiche')).corpo;
  const accendi = (body) => chiama('POST', '/api/streamer/grafiche/storia-live', { body: { attiva: true, immagine: dataUrl(JPEG(7)), ...body } });

  let r = await accendi({ firmaQr: v.firmaQr, rev: v.rev });
  assert.equal(r.stato, 200);
  assert.deepEqual(r.corpo.live, { attiva: true, pronta: true, daRifare: false, ultima: null });
  assert.equal((await chiama('GET', '/api/streamer/grafiche/storia')).corpo.live.daRifare, false);

  CANALI.anna.settings.grafiche.rev = 4;
  assert.equal((await chiama('GET', '/api/streamer/grafiche/storia')).corpo.live.daRifare, true, 'grafiche salvate: da rifare');
  assert.equal((await chiama('GET', '/api/streamer/automatiche')).corpo.live.daRifare, true, 'e la vista delle automatiche dice lo stesso');
  assert.equal((await chiama('GET', '/api/streamer/grafiche/storia')).corpo.live.pronta, true, 'ma e\' pronta: parte lo stesso');

  CANALI.anna.settings.qr = { ...STILE, moduli: 'quadrati' };
  r = await accendi({ firmaQr: v.firmaQr, rev: 4 });
  assert.equal(r.stato, 409);
  assert.equal(r.corpo.codice, 'qr-cambiato');
  const adesso = r.corpo.firmaQr;
  assert.deepEqual((await chiama('GET', '/api/streamer/grafiche/storia-live.jpg')).corpo, JPEG(7), 'e la grafica di prima resta');

  r = await accendi({ firmaQr: adesso, rev: 4 });
  assert.equal(r.corpo.live.daRifare, false, 'con la firma di adesso e le grafiche di adesso, giusta');
  r = await accendi({});
  assert.equal(r.stato, 200, 'un pannello di prima la accende ancora');
  assert.equal(r.corpo.live.daRifare, true, 'ma resta da rifare');

  r = await chiama('POST', '/api/streamer/grafiche/storia-live', { body: { attiva: false } });
  assert.deepEqual(r.corpo.live, { attiva: false, pronta: false, daRifare: false, ultima: null }, 'spenta, niente da rifare');
  CANALI.anna.settings.qr = STILE;
  CANALI.anna.settings.grafiche.rev = 3;
});

test('le immagini salvate si rileggono: JPEG, solo il proprietario, mai da una cache', async () => {
  const v = (await chiama('GET', '/api/streamer/automatiche')).corpo;
  await chiama('POST', '/api/streamer/automatiche/immagine', {
    body: { nome: 'prima-4', immagine: dataUrl(JPEG(8)), impronta: v.impronta, rev: v.rev, firmaQr: v.firmaQr },
  });
  let r = await chiama('GET', '/api/streamer/automatiche/immagine/:nome', { params: { nome: 'prima-4' } });
  assert.equal(r.stato, 200);
  assert.equal(r.testa['Content-Type'], 'image/jpeg');
  assert.equal(r.testa['Cache-Control'], 'private, no-store');
  assert.deepEqual(r.corpo, JPEG(8));
  assert.equal((await chiama('GET', '/api/streamer/automatiche/immagine/:nome', { params: { nome: 'prima-5' } })).stato, 404, 'non ancora preparata');
  assert.equal((await chiama('GET', '/api/streamer/automatiche/immagine/:nome', { params: { nome: '../anna' } })).stato, 404, 'un nome che non e\' delle immagini');
  assert.equal((await chiama('GET', '/api/streamer/automatiche/immagine/:nome', { chi: 'bea', params: { nome: 'prima-4' } })).stato, 404, 'e ognuno vede le sue');

  assert.equal((await chiama('GET', '/api/streamer/grafiche/storia-live.jpg')).stato, 404, 'la storia della diretta spenta non ha grafica');
  await chiama('POST', '/api/streamer/grafiche/storia-live', { body: { attiva: true, immagine: dataUrl(JPEG(9)), firmaQr: v.firmaQr, rev: v.rev } });
  r = await chiama('GET', '/api/streamer/grafiche/storia-live.jpg');
  assert.deepEqual([r.stato, r.testa['Content-Type'], r.testa['Cache-Control']], [200, 'image/jpeg', 'private, no-store']);
  assert.deepEqual(r.corpo, JPEG(9));
});

test('le porte delle immagini sono del solo proprietario: un moderatore non legge e non scrive', async () => {
  const porte = [
    ['GET', '/api/streamer/automatiche'], ['POST', '/api/streamer/automatiche'],
    ['POST', '/api/streamer/automatiche/immagine'], ['GET', '/api/streamer/automatiche/immagine/:nome'],
    ['GET', '/api/streamer/grafiche/storia'], ['POST', '/api/streamer/grafiche/storia-live'],
    ['GET', '/api/streamer/grafiche/storia-live.jpg'],
  ];
  for (const [m, via] of porte) {
    const r = await chiama(m, via, { proprietario: false, params: { nome: 'prima-4' }, body: { attiva: true } });
    assert.equal(r.stato, 403, `${m} ${via}`);
  }
});

test('il giro, la foto del profilo e la versione del disegno', () => {
  const giro = pezzo('  const giroAutomatiche = async () => {', '  setInterval(() => { giroAutomatiche()');
  assert.ok(giro.includes('firmaQr: await firmaQrDi(login)'), 'il giro sa la firma di adesso: non ferma niente, ma si ricorda se e\' uscita col QR di prima');
  const foto = pezzo("  app.get('/u/:user/avatar'", '  // ── L\'anteprima del link');
  assert.ok(foto.includes("c.url === (streamers.get(login)?.avatar || '')"), 'la foto in memoria vale finche\' l\'indirizzo e\' quello della firma');
  assert.ok(foto.includes('url: usato'), 'e si ricorda da quale indirizzo e\' arrivata');
  const firma = pezzo('  const firmaQrDi = ', '  const qrCambiato');
  assert.ok(firma.includes("qr.logo === 'foto' ? await avatarDi(login)"), 'la foto della firma e\' quella che il pannello carica da /u/<login>/avatar');
  assert.ok(Number.isInteger(DISEGNO_QR) && DISEGNO_QR >= 1);
});
