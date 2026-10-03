// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA PAGINA DEL NEGOZIO (src/features/negozio-pagina.js, docs/NEGOZIO.md «La pagina»).
//
// Le promesse che si provano qui:
//  · quello che lo streamer salva e' quello che chi apre la pagina vede: tema,
//    caratteri, larghezza, pezzi e il loro ordine, le scelte della griglia;
//  · la pagina di un canale non porta mai niente di un altro: articoli,
//    immagini, aspetto. Nemmeno la porta delle immagini, che controlla il
//    canale insieme al media;
//  · un media esce dalla porta pubblica solo se un articolo in vetrina lo usa;
//  · un canale col negozio chiuso non ha pagina, e la pagina «non c'e'» non
//    dice niente di nessuno;
//  · le parole sono nella lingua del canale, e il prezzo regge con ogni numero.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('negozio-pagina-');
const { streamers, effects, paginaNegozio, linkPage, negozio: N, db } = await import('../../src/db.js');
const S = await import('../../src/features/negozio.js');
const P = await import('../../src/features/negozio-pagina.js');
const { config } = await import('../../src/config.js');
const { cartaPaginaDi } = await import('../../src/features/carta-disegno.js');
const { pagina404 } = await import('../../src/web/pagine-servizio.js');
test.after(() => casa.pulisci());

const BASE = 'https://socialbot.live';
let giro = 0;
function canale(settings = {}) {
  const ch = `bottega${++giro}`;
  streamers.upsertApproved(ch, ch.toUpperCase());
  streamers.setSettings(ch, { negozio: { attivo: true }, ...settings });
  return ch;
}
function immagine(ch, comando) {
  effects.add(ch, { comando, tipo: 'immagine', file: `${comando}.webp`, tier: 'tutti', cooldown: 0, volume: 100, durata: 5000 });
  return effects.get(ch, comando);
}
function articolo(ch, grezzo) {
  const r = S.salvaArticolo(ch, { tipo: 'oggetto', prezzo: 100, ...grezzo });
  assert.ok(r.ok, `articolo salvato: ${r.errore}`);
  return r.articolo;
}
const pagina = (ch) => P.htmlPaginaNegozio(ch, { baseUrl: BASE, display: ch.toUpperCase() });
const testo = (html) => html.replace(/<style>[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&#39;/g, '\'').replace(/\s+/g, ' ');

test('una personalizzazione salvata arriva identica nella pagina servita', () => {
  const ch = canale();
  articolo(ch, { nome: 'Corona', requisiti: [{ tipo: 'mesi', soglia: 3 }], scorte: { modo: 'tutto', n: 4 } });
  paginaNegozio.salva(ch, {
    headline: 'La bottega di Lia', tagline: 'Solo cose belle', template: 'neon',
    tema: { accent: '#ff00aa', bg: '#101820', font: 'serif', raggio: 4, larghezza: 40, effetto: 'aurora', stileBtn: 'contorno' },
    blocchi: [
      { tipo: 'comecompra', titolo: 'Si fa così', testo: 'Le monete non scadono.' },
      { tipo: 'articoli', titolo: 'Tutto', colonne: 3, formato: 'alto', prezzo: false, scorte: false, requisiti: false },
      { tipo: 'intestazione' },
    ],
    aspetto: 'suo',
  });
  const h = pagina(ch);
  const t = testo(h);
  assert.ok(t.includes('La bottega di Lia') && t.includes('Solo cose belle'), 'titolo e sottotitolo');
  assert.match(h, /--acc:#ff00aa/, 'il colore principale');
  assert.match(h, /background:#101820/, 'lo sfondo');
  assert.match(h, /--r:4px/, 'gli angoli');
  assert.match(h, /--w:40rem/, 'la larghezza');
  assert.match(h, /Palatino/, 'il carattere con le grazie');
  assert.match(h, /radial-gradient\(ellipse 50% 40% at 20% 10%,#ff00aa44/, 'l\'effetto aurora, nel colore scelto');
  const i = (s) => h.indexOf(s);
  assert.ok(i('class="ng-come"') > 0 && i('class="ng-come"') < i('class="ng-articoli"') && i('class="ng-articoli"') < i('class="testa-b"'),
    'i pezzi nell\'ordine in cui li ha messi');
  assert.ok(t.includes('Si fa così') && t.includes('Le monete non scadono.') && t.includes('Tutto'), 'i titoli e il testo dei pezzi');
  assert.match(h, /class="ng-griglia c3" style="--ng-col:3"/, 'tre colonne');
  assert.match(h, /--ng-forma:3 \/ 4/, 'le immagini alte');
  assert.ok(!h.includes('class="ng-prezzo"') && !h.includes('class="ng-scorte"') && !h.includes('ng-chip req'), 'prezzo, scorte e requisiti spenti restano spenti');
  assert.equal((h.match(/<h1[\s>]/g) || []).length, 1, 'un titolo solo, quello del pezzo «intestazione»');
});

test('con l\'aspetto «come la pagina link» la pagina prende il tema di quella, e niente di un altro canale', () => {
  const ch = canale();
  const altro = canale();
  articolo(ch, { nome: 'Spilla' });
  linkPage.salva(ch, { headline: 'x', template: 'oro', tema: { accent: '#e8c400' }, blocchi: [] });
  linkPage.salva(altro, { headline: 'y', template: 'lava', tema: { accent: '#00ff11' }, blocchi: [] });
  paginaNegozio.salva(ch, { headline: 'Bottega', template: 'minimal', tema: { accent: '#123456' }, blocchi: P.PEZZI_DI_SERIE, aspetto: 'link' });
  const h = pagina(ch);
  assert.match(h, /--acc:#e8c400/, 'il colore della SUA pagina link');
  assert.ok(!h.includes('#00ff11') && !h.includes('#123456'), 'non quello di un altro canale, e non quello lasciato da parte');
});

test('dalla pagina di un canale non si arriva mai ai dati di un altro', () => {
  const a = canale({ nomeMonete: 'Gemme' });
  const b = canale({ nomeMonete: 'Gettoni' });
  // Lo stesso nome di effetto in due canali: e' il caso in cui la porta, se
  // guardasse solo l'effetto usato in vetrina, darebbe il file dell'altro.
  const imgA = immagine(a, 'corona');
  const imgB = immagine(b, 'corona');
  articolo(a, { nome: 'Corona di Anna', immagine: 'effetto:corona' });
  articolo(b, { nome: 'Corona di Bruno', immagine: 'effetto:corona' });
  paginaNegozio.salva(b, { headline: 'Il negozio segreto di Bruno', tema: { accent: '#abcdef' }, blocchi: P.PEZZI_DI_SERIE });
  const h = pagina(a);
  assert.ok(h.includes('Corona di Anna') && !h.includes('Corona di Bruno'), 'gli articoli sono solo i suoi');
  assert.ok(h.includes(`/u/${a}/negozio/media/${imgA.id}`) && !h.includes(`/media/${imgB.id}`), 'le immagini sono solo le sue, dalla sua porta');
  assert.ok(!h.includes('Il negozio segreto di Bruno') && !h.includes('#abcdef') && !h.includes('Gettoni'), 'l\'aspetto e la moneta sono i suoi');
  assert.ok(!new RegExp(`\\b${b}\\b`).test(h), 'il nome dell\'altro canale non compare da nessuna parte');
  assert.ok(P.mediaPubblico(a, imgA.id), 'la sua immagine esce dalla sua porta');
  assert.equal(P.mediaPubblico(a, imgB.id), null, 'l\'immagine di un altro canale non esce dalla porta di questo');
  assert.equal(P.mediaPubblico(b, imgA.id), null, 'e nemmeno al contrario');
});

test('la porta delle immagini non da\' media fuori dalla vetrina', () => {
  const ch = canale();
  const usata = immagine(ch, 'usata');
  const libera = immagine(ch, 'libera');
  const nascosta = immagine(ch, 'nascosta');
  const spenta = immagine(ch, 'spenta');
  effects.add(ch, { comando: 'suono', tipo: 'audio', file: 'suono.mp3', tier: 'tutti', cooldown: 0, volume: 100, durata: 5000 });
  const suono = effects.get(ch, 'suono');
  articolo(ch, { nome: 'Visibile', immagine: 'effetto:usata' });
  articolo(ch, { nome: 'Per pochi', immagine: 'effetto:nascosta', siVede: 'chi_puo' });
  const off = articolo(ch, { nome: 'Spento', immagine: 'effetto:spenta' });
  N.salva(ch, { ...N.articolo(ch, off.id), attivo: false });
  assert.deepEqual(P.mediaPubblico(ch, usata.id), { channel: ch, file: 'usata.webp' });
  assert.equal(P.mediaPubblico(ch, libera.id), null, 'un media del canale che nessun articolo usa');
  assert.equal(P.mediaPubblico(ch, nascosta.id), null, 'un articolo che si vede solo a chi lo puo\' comprare non sta in vetrina');
  assert.equal(P.mediaPubblico(ch, spenta.id), null, 'un articolo non in vendita non sta in vetrina');
  assert.equal(P.mediaPubblico(ch, suono.id), null, 'solo immagini');
  const cambiata = immagine(ch, 'cambiata');
  articolo(ch, { nome: 'Cambiata', immagine: 'effetto:cambiata' });
  assert.ok(P.mediaPubblico(ch, cambiata.id));
  db.prepare("UPDATE effects SET tipo='audio', file='cambiata.mp3' WHERE id=?").run(cambiata.id);
  assert.equal(P.mediaPubblico(ch, cambiata.id), null, 'un effetto che non e\' piu\' un\'immagine non esce, anche se un articolo lo nomina ancora');
  assert.equal(P.mediaPubblico(ch, 'abc'), null);
  assert.equal(P.mediaPubblico(ch, 999999), null);
  streamers.setSettings(ch, { ...streamers.get(ch).settings, negozio: { attivo: false } });
  assert.equal(P.mediaPubblico(ch, usata.id), null, 'a negozio chiuso non esce niente');
});

test('negozio chiuso o canale che non c\'e\': nessuna pagina, e «non c\'e\'» non dice niente di nessuno', () => {
  const ch = canale();
  articolo(ch, { nome: 'Spilla' });
  streamers.setSettings(ch, { ...streamers.get(ch).settings, negozio: { attivo: false } });
  assert.equal(pagina(ch), null, 'a negozio chiuso la pagina non c\'e\'');
  assert.equal(P.htmlPaginaNegozio('nessunocosi', { baseUrl: BASE }), null);
  const nc = P.paginaNonCe('it', BASE);
  assert.ok(!nc.includes(ch) && !nc.includes('Spilla') && /noindex/.test(nc), 'non nomina canali ne\' articoli, e non si indicizza');
  assert.match(nc, new RegExp(`href="${BASE}/"`), 'porta solo al sito');
  assert.match(nc, new RegExp(`href="${BASE}/#negozio"`), 'e al pannello, per chi il negozio ce l\'ha');
  // Due persone, tenute separate: la didascalia e' per chi arriva da un link
  // (cosa fare: chiedere in chat), il riquadro «E' il tuo negozio?» per chi il
  // negozio ce l'ha, col tasto del pannello DENTRO, accanto alla sua frase.
  // Nessun tasto acceso: non c'e' un'azione giusta per tutti.
  const tuo = nc.match(/<div class="tuo">[\s\S]*?<\/div>/)?.[0] || '';
  assert.ok(tuo.includes('È il tuo negozio?') && tuo.includes('Lo apri dal pannello') && new RegExp(`href="${BASE}/#negozio"`).test(tuo),
    'la nota e il tasto del pannello stanno insieme, nel riquadro di chi il negozio ce l\'ha');
  assert.ok(!(nc.match(/<div class="vie">[\s\S]*?<\/div>/)?.[0] || '').includes('#negozio'), 'e non in fondo fra le strade di tutti');
  assert.ok(/chiedi in chat/.test(nc.match(/<p class="dida">[^<]*<\/p>/)?.[0] || ''), 'chi arriva da un link sa cosa fare');
  assert.ok(!/class="primo"/.test(nc), 'nessun tasto acceso');
  assert.ok(nc.indexOf('<h1') < nc.indexOf('class="dida"') && nc.indexOf('class="dida"') < nc.indexOf('class="tuo"'), 'si legge in ordine: cosa, perche\', e poi chi e\' il proprietario');
  // Il vestito e' quello del 404 del sito, non uno suo: lo stesso foglio di
  // stile, la stessa forma (titolo a pennarello, didascalia, strade).
  const stile = (h) => h.match(/<style>[\s\S]*?<\/style>/)?.[0];
  assert.equal(stile(nc), stile(pagina404('it')), 'il vestito e\' quello del 404 del sito');
  for (const pezzo of ['class="vignetta"', 'class="dida"', 'class="tuo"', 'class="vie"', 'href="/font.css"']) assert.ok(nc.includes(pezzo), pezzo);
  assert.equal(P.linguaDiChiApre('es-ES,es;q=0.9,en;q=0.8'), 'es');
  assert.equal(P.linguaDiChiApre('de-DE,fr;q=0.8'), 'it');
  assert.match(P.paginaNonCe('en', BASE), /There’s no shop here/);
  assert.ok(P.htmlPaginaNegozio(ch, { baseUrl: BASE, anteprima: true }), 'l\'anteprima del pannello si vede anche a negozio chiuso');
});

test('negozio aperto ma vuoto: la pagina lo dice', () => {
  const ch = canale();
  const t = testo(pagina(ch));
  assert.ok(t.includes('Il negozio per ora è vuoto'), t.slice(0, 300));
});

test('senza foto, nel cerchio c\'e\' l\'iniziale del canale e non quella del titolo', () => {
  const ch = canale();
  const h = P.htmlPaginaNegozio(ch, { baseUrl: BASE, display: 'Zeno' });
  assert.match(testo(h), /Il negozio di Zeno/, 'il titolo di partenza comincia con «Il»');
  assert.match(h, /<div class="avatar" aria-hidden="true">Z<\/div>/, 'il cerchio dice di chi e\' il negozio');
});

test('le parole sono nella lingua del canale, il prezzo regge con ogni numero, la moneta si accorda', () => {
  const ch = canale({ nomeMonete: 'Semi di girasole', preferenze: { lingua: 'it' } });
  articolo(ch, { nome: 'Spilla', prezzo: 1, requisiti: [{ tipo: 'ruolo', soglia: 1 }, { tipo: 'ore', soglia: 5 }], scorte: { modo: 'persona', n: 1 } });
  let h = pagina(ch);
  let t = testo(h);
  assert.match(h, /<html lang="it">/);
  assert.match(t, /Semi di girasole 1 /, 'il prezzo: il nome della moneta e il numero, mai «1 monete»');
  assert.ok(t.includes('Solo VIP e moderatori') && t.includes('Almeno 5 ore guardate'), 'i requisiti scritti in chiaro');
  assert.ok(t.includes('Una volta a testa.'));
  assert.ok(t.includes('Si paga con i tuoi Semi di girasole, quelli che guadagni stando in chat.'), 'l\'accordo con la forma della moneta');
  assert.ok(t.includes('!compra spilla'), 'il comando per comprare');
  streamers.setSettings(ch, { ...streamers.get(ch).settings, comandi: { compra: { nome: 'prendi' } } });
  assert.ok(testo(pagina(ch)).includes('!prendi spilla'), 'col nome vero del comando, se lo streamer l\'ha rinominato');
  streamers.setSettings(ch, { ...streamers.get(ch).settings, preferenze: { lingua: 'es' }, nomeMonete: 'Oro', formaMonete: 'ms' });
  h = pagina(ch);
  t = testo(h);
  assert.match(h, /<html lang="es">/);
  assert.ok(t.includes('Solo VIP y moderadores') && t.includes('Se paga con tu Oro, el que ganas estando en el chat.'), t.slice(0, 900));
  streamers.setSettings(ch, { ...streamers.get(ch).settings, preferenze: { lingua: 'en' }, nomeMonete: '', formaMonete: '' });
  t = testo(pagina(ch));
  assert.ok(t.includes('Coins 1 ') && t.includes('VIPs and moderators only') && t.includes('How to buy'), t.slice(0, 900));
});

test('anteprime del link: titolo, descrizione, immagine, scheda di twitter, indirizzo canonico, robots', () => {
  const ch = canale();
  immagine(ch, 'foto');
  articolo(ch, { nome: 'Spilla', immagine: 'effetto:foto' });
  const h = pagina(ch);
  for (const re of [/<meta property="og:title" content="[^"]+">/, /<meta property="og:description" content="[^"]+">/,
    /<meta property="og:image" content="https:\/\/socialbot\.live\/u\/[^"]+">/, /<meta name="twitter:card" content="summary(_large_image)?">/,
    /<meta name="robots" content="index, follow">/]) assert.match(h, re);
  const prima = config.negozioHost;
  config.negozioHost = '';
  assert.match(pagina(ch), new RegExp(`<link rel="canonical" href="${config.baseUrl}/u/${ch}/negozio">`), 'senza il nome corto, l\'indirizzo lungo');
  config.negozioHost = 'negozio.socialbot.live';
  assert.match(pagina(ch), new RegExp(`<link rel="canonical" href="https://negozio\\.socialbot\\.live/${ch}">`), 'col nome corto, quello');
  config.negozioHost = prima;
});

test('!negozio risponde col link: quello corto se acceso, se no quello lungo', async () => {
  const ch = canale();
  articolo(ch, { nome: 'Spilla' });
  const detti = [];
  const prima = config.negozioHost;
  config.negozioHost = '';
  await S.tryComando({ channel: ch, user: 'lia', display: 'Lia', text: '!negozio' }, (x) => detti.push(x), {});
  assert.match(detti.pop(), new RegExp(`Tutto il negozio: ${config.baseUrl.replace(/[.]/g, '\\.')}/u/${ch}/negozio$`));
  config.negozioHost = 'negozio.socialbot.live';
  await S.tryComando({ channel: ch, user: 'lia', display: 'Lia', text: '!negozio' }, (x) => detti.push(x), {});
  assert.match(detti.pop(), new RegExp(`Tutto il negozio: https://negozio\\.socialbot\\.live/${ch}$`));
  config.negozioHost = prima;
});

test('la pagina ammette solo i suoi pezzi, e le altre pagine non prendono i suoi', () => {
  const p = paginaNegozio.pulisci({ blocchi: [{ tipo: 'embed', url: 'https://youtube.com/watch?v=x' }, { tipo: 'sostieni' }, { tipo: 'vetrina', articolo: 7 },
    { tipo: 'articoli', colonne: 9, formato: 'strano' }, { tipo: 'piede', link: false }] });
  assert.deepEqual(p.blocchi.map((b) => b.tipo), ['vetrina', 'articoli', 'piede']);
  assert.equal(p.blocchi[1].colonne, 3, 'le colonne stanno fra 1 e 3');
  assert.equal(p.blocchi[1].formato, 'quadrato');
  assert.equal(p.blocchi[2].link, false);
  assert.deepEqual(linkPage.pulisci({ blocchi: [{ tipo: 'vetrina' }, { tipo: 'articoli' }, { tipo: 'link', url: 'x.it', label: 'x' }] }).blocchi.map((b) => b.tipo), ['link']);
  const nuova = P.paginaDiPartenza('nessuno', 'Lia');
  assert.deepEqual(nuova.blocchi.map((b) => b.tipo), ['intestazione', 'vetrina', 'articoli', 'comecompra', 'piede'], 'una pagina nuova ha i cinque pezzi');
  assert.equal(nuova.tema.larghezza, P.LARGHEZZA_DI_SERIE);
});

test('la carta dell\'anteprima del link del negozio parla la lingua del canale', () => {
  const targa = (l) => cartaPaginaDi({ quale: 'negozio', lingua: l }).elementi.find((e) => e.id === 'targhetta').testo;
  assert.deepEqual(['it', 'en', 'es'].map(targa), ['IL NEGOZIO', 'SHOP', 'LA TIENDA']);
});

test('la carta dell\'anteprima del link: il nome del canale, e una riga mai vuota', () => {
  // La targhetta dice gia' «il negozio»: il nome grande e' quello del canale.
  // La riga sotto non resta mai vuota, sennò lascia un buco nella carta.
  const ch = canale();
  const di = P.righeCarta(ch, 'Bottega');
  assert.equal(di.nome, 'Bottega', 'il nome del canale, non «Il negozio di …»');
  assert.equal(di.titolo, 'Cosa si compra in chat, e quanto costa', 'senza parole sue, la riga dice cosa ci si trova');
  paginaNegozio.salva(ch, { headline: 'Il bazar del lunedì', tagline: '', attiva: true });
  assert.equal(P.righeCarta(ch, 'Bottega').titolo, 'Il bazar del lunedì', 'un titolo cambiato dallo streamer va sotto al nome');
  paginaNegozio.salva(ch, { headline: 'Il bazar del lunedì', tagline: 'Premi veri, monete finte', attiva: true });
  assert.equal(P.righeCarta(ch, 'Bottega').titolo, 'Premi veri, monete finte', 'e la sua riga vince su tutto');
});
