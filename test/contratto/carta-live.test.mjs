// LA CARTA DELLA DIRETTA: si guarda, non si descrive.
//
// Il difetto che questo collaudo esiste per impedire non si vede leggendo il
// codice: un carattere che non si carica NON dà errore. Il rasterizzatore
// accetta un `.woff2` e rende un'immagine vuota; accetta un `font-weight` alto
// su un carattere variabile e lo ignora. In tutti e due i casi il programma
// «funziona» e la carta esce muta o sbagliata.
//
// Quindi qui l'immagine si RENDE e si CONTA: quanti pixel sono accesi, e
// cambiano quando il testo cambia. Se il carattere non disegna, il conto non
// cambia — e questo si vede.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  TEMI, NOMI_TEMI, MISURA, SEGNAPOSTO, CARATTERI,
  svgCarta, resaCarta, disegnabile, temaPerPiattaforma, avatarDataUri, normCarta,
} from '../../src/features/cartalive.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const DATI = {
  nome: 'ANDRYXify', titolo: 'Si costruisce il bot, dal vivo',
  gioco: 'Software and Game Dev', login: 'andryxify', avatar: '',
};

// Quanti pixel cambiano fra due rese. È l'unica misura che non fa supposizioni:
// contare «i pixel diversi dal fondo» non funziona, perché il fondo è una
// sfumatura e quasi ogni pixel è diverso da quello prima. Qui invece si toglie
// una cosa dalla carta e si guarda quanto CAMBIA l'immagine: se non cambia
// niente, quella cosa non stava disegnando.
function differenza(a, b) {
  const p = a.pixels, q = b.pixels;
  if (p.length !== q.length) return Infinity;
  let n = 0;
  for (let i = 0; i < p.length; i += 4) {
    if (Math.abs(p[i] - q[i]) > 10 || Math.abs(p[i + 1] - q[i + 1]) > 10 || Math.abs(p[i + 2] - q[i + 2]) > 10) n += 1;
  }
  return n;
}

const soloFondo = (tema) => ({ ...tema, elementi: [] });

test('i caratteri viaggiano con noi, e sono TTF', () => {
  // Il server di produzione non ha caratteri suoi: fidarsi di quelli di sistema
  // vorrebbe dire una carta diversa a ogni macchina, e su alcune nessun testo.
  assert.equal(disegnabile(), true, 'mancano dei caratteri in assets/font');
  const dentro = readdirSync(join(RAD, 'assets/font'));
  for (const [, file] of CARATTERI) {
    assert.ok(dentro.includes(file), `manca ${file}`);
    assert.match(file, /\.ttf$/i, 'i .woff2 qui rendono un’immagine vuota senza dare errore');
  }
  assert.ok(!dentro.some((f) => /\.woff2?$/i.test(f)), 'niente woff in assets/font: non disegnano');
});

test('ogni tema standard si rende, e ci mette sopra qualcosa', async () => {
  for (const nome of NOMI_TEMI) {
    const resa = await resaCarta(TEMI[nome], DATI);
    assert.ok(resa, `${nome}: non si è reso`);
    assert.equal(resa.width, MISURA.larghezza);
    assert.equal(resa.height, MISURA.altezza);
    const nudo = await resaCarta(soloFondo(TEMI[nome]), DATI);
    const q = differenza(resa, nudo) / (resa.width * resa.height);
    assert.ok(q > 0.03, `${nome}: sul fondo non c'è quasi niente (${(q * 100).toFixed(1)}%)`);
    assert.ok(q < 0.75, `${nome}: gli elementi coprono tutta la carta (${(q * 100).toFixed(1)}%)`);
  }
});

test('il testo disegna DAVVERO: togliendolo, l’immagine cambia', async () => {
  // È la prova che i caratteri funzionano. Un carattere che non carica non dà
  // errore: rende un'immagine identica a quella senza testo, e questo confronto
  // è l'unico modo di accorgersene.
  for (const nome of NOMI_TEMI) {
    const tema = TEMI[nome];
    const muta = { ...tema, elementi: tema.elementi.filter((e) => e.tipo !== 'testo') };
    const cambiati = differenza(await resaCarta(tema, DATI), await resaCarta(muta, DATI));
    assert.ok(cambiati > 4000,
      `${nome}: togliendo il testo cambiano solo ${cambiati} pixel — il carattere non sta disegnando`);
  }
});

test('i segnaposto si riempiono coi dati veri', () => {
  const svg = svgCarta(TEMI.twitch, DATI);
  assert.ok(svg.includes('ANDRYXify'), 'il nome finisce nella carta');
  assert.ok(svg.includes('twitch.tv/andryxify'), 'l’indirizzo si compone');
  assert.ok(!svg.includes('{nome}'), 'nessun segnaposto resta scritto così com’è');
  for (const chiave of SEGNAPOSTO) assert.match(chiave, /^[a-z]+$/);
});

test('un titolo lunghissimo viene tagliato, non lasciato uscire dal bordo', () => {
  const lungo = 'x'.repeat(400);
  const svg = svgCarta(TEMI.twitch, { ...DATI, titolo: lungo });
  const m = svg.match(/>(x+…?)</);
  assert.ok(m, 'il titolo c’è');
  assert.ok(m[1].length < 60, `il titolo non è stato tagliato (${m[1].length} segni): uscirebbe dalla carta`);
  assert.ok(m[1].endsWith('…'), 'e si vede che continua');
});

test('quello che scrive lo streamer non può rompere il disegno', () => {
  // Il titolo e il nome vengono da fuori. Senza fuga, un `"` o un `<` chiudono
  // un attributo e da lì in poi la carta non è più la nostra.
  const cattivo = '"><script>x</script>';
  const svg = svgCarta(TEMI.twitch, { ...DATI, nome: cattivo, titolo: cattivo });
  assert.ok(!svg.includes('<script>'), 'un tag scritto nel titolo non diventa un tag');
  assert.ok(!/y="\d+"[^>]*"><\//.test(svg), 'nessun attributo si chiude prima del tempo');
});

test('l’avatar arriva solo se è un’immagine vera, e da https', async () => {
  const finto = async (u) => {
    if (u.includes('grande')) return { ok: true, headers: new Map([['content-type', 'image/png']]), arrayBuffer: async () => new ArrayBuffer(4_000_000) };
    if (u.includes('html')) return { ok: true, headers: new Map([['content-type', 'text/html']]), arrayBuffer: async () => new ArrayBuffer(10) };
    return { ok: true, headers: new Map([['content-type', 'image/png']]), arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer };
  };
  const g = (m) => ({ get: (k) => m.get(k) });
  const fetchImpl = async (u) => { const r = await finto(u); return { ...r, headers: g(r.headers) }; };
  assert.equal(await avatarDataUri('http://esempio.it/a.png', { fetchImpl }), '', 'niente http in chiaro');
  assert.equal(await avatarDataUri('https://esempio.it/html', { fetchImpl }), '', 'una pagina non è un avatar');
  assert.equal(await avatarDataUri('https://esempio.it/grande.png', { fetchImpl }), '', 'un file enorme non entra nella carta');
  assert.match(await avatarDataUri('https://esempio.it/a.png', { fetchImpl }), /^data:image\/png;base64,/);
});

test('a ogni piattaforma il suo tema, e due temi diversi davvero', async () => {
  assert.equal(temaPerPiattaforma('kick'), 'kick');
  assert.equal(temaPerPiattaforma('youtube'), 'twitch', 'chi non ha un tema suo ricade su quello di casa');
  // e non sono lo stesso disegno ricolorato: devono differire nella FORMA
  const a = TEMI.twitch.elementi.find((e) => e.tipo === 'avatar');
  const b = TEMI.kick.elementi.find((e) => e.tipo === 'avatar');
  assert.notEqual(a.forma, b.forma, 'la geometria dell’avatar distingue le due piattaforme');
  const fa = TEMI.twitch.elementi.find((e) => e.id === 'nome').carattere;
  const fb = TEMI.kick.elementi.find((e) => e.id === 'nome').carattere;
  assert.notEqual(fa, fb, 'e anche la voce tipografica');
});

test('la carta è fatta di dati: nessun disegno scritto a mano nel codice', () => {
  // È la condizione che rende possibile l'editor. Se un tema fosse una stringa
  // SVG, l'editor non potrebbe cambiarlo: potrebbe solo riscriverlo.
  for (const nome of NOMI_TEMI) {
    const t = TEMI[nome];
    assert.ok(Array.isArray(t.elementi) && t.elementi.length >= 4, `${nome}: ha i suoi elementi`);
    for (const e of t.elementi) {
      assert.ok(e.id && e.tipo, `${nome}: ogni elemento ha nome e tipo`);
      assert.ok(!JSON.stringify(e).includes('<'), `${nome}/${e.id}: nessun pezzo di disegno dentro i dati`);
    }
  }
});

test('un tema scelto resta quel tema anche dopo il giro dal database', () => {
  // Il difetto che questo impedisce non dà nessun errore: scegli «Twitch», la
  // carta va nel database passando dalla ripulitura, e al ricarico il confronto
  // col tema GREZZO non torna più — il pannello dice «stai usando la tua
  // grafica» e il tasto che avevi appena premuto si spegne da solo.
  for (const nome of NOMI_TEMI) {
    const salvata = JSON.parse(JSON.stringify(normCarta(TEMI[nome])));
    assert.deepEqual(normCarta(salvata), salvata, `${nome}: ripulirla due volte dà due carte diverse`);
    const quale = NOMI_TEMI.find((t) => JSON.stringify(normCarta(TEMI[t])) === JSON.stringify(normCarta(salvata)));
    assert.equal(quale, nome, `${nome}: dopo il salvataggio non si riconosce più come tema standard`);
  }
});

test('due temi diversi non si confondono fra loro', () => {
  // Se la ripulitura appiattisse le differenze, ogni tema si riconoscerebbe come
  // il primo dell'elenco, e il pannello mostrerebbe sempre lo stesso scelto.
  const impronte = new Set(NOMI_TEMI.map((t) => JSON.stringify(normCarta(TEMI[t]))));
  assert.equal(impronte.size, NOMI_TEMI.length, 'due temi standard danno la stessa carta ripulita');
});

test('la grafica segue la piattaforma della DIRETTA, non quella del login', async () => {
  // Il difetto vero, e si vedeva solo guardando l'immagine arrivata: un canale
  // Kick entra col suo nome e basta — niente nel login dice «Kick» — quindi
  // chiedere la piattaforma al login rispondeva «Twitch», e a una diretta su
  // Kick arrivava la grafica viola. Nessun errore da nessuna parte.
  const { piattaformaDiEvento, CHIAVI, PIATTAFORME } = await import('../../src/features/avvisi.js');
  for (const p of CHIAVI) {
    assert.equal(piattaformaDiEvento(PIATTAFORME[p].evento), p, `${p}: l’evento non riporta alla sua piattaforma`);
  }
  assert.equal(piattaformaDiEvento('follow'), '', 'un evento che non è una diretta non ha piattaforma');

  // e chi disegna deve usare QUELLA, non il login
  const cl = readFileSync(join(RAD, 'src/features/cartalive.js'), 'utf8');
  const f = cl.slice(cl.indexOf('export async function fotoPerEvento'));
  assert.match(f.slice(0, 600), /piattaformaDiEvento\(evento\)/,
    'la piattaforma si ricava dall’evento: dal login sarebbe sbagliata per Kick');
  const png = cl.slice(cl.indexOf('export async function pngPerDiretta'));
  assert.match(png.slice(0, 900), /piattaforma \|\| piattaformaDi\(diChi\)/,
    'chi la sa la dice, e il login resta solo come ultima spiaggia');
});

test('l’indirizzo scritto sulla carta è quello della piattaforma giusta', () => {
  // Stesso difetto, altro sintomo: la riga in fondo diceva «twitch.tv/nome»
  // sotto una grafica Kick.
  const carte = { twitch: 'twitch.tv/', kick: 'kick.com/', youtube: 'youtube.com/@' };
  const cl = readFileSync(join(RAD, 'src/features/cartalive.js'), 'utf8');
  const d = cl.slice(cl.indexOf('export async function datiDiretta'));
  const corpo = d.slice(0, d.indexOf('\n}') + 2);
  assert.match(corpo, /dettaFuori \|\| piattaformaDi\(l\)/, 'anche l’indirizzo segue la piattaforma detta da chi chiama');
  for (const [, pezzo] of Object.entries(carte)) {
    assert.ok(corpo.includes(pezzo), `manca l’indirizzo di ${pezzo}`);
  }
});

test('la faccia ha una scadenza: un CDN appeso non tiene appeso l’annuncio', async () => {
  // Questa chiamata sta sulla strada dell'annuncio. Senza scadenza, un server
  // che non risponde non dà errore: resta lì, e con lui resta lì l'avviso «sono
  // in diretta» — l'unica cosa che doveva partire in fretta.
  const { AVATAR_ATTESA_MS } = await import('../../src/features/cartalive.js');
  assert.ok(AVATAR_ATTESA_MS > 0 && AVATAR_ATTESA_MS <= 10_000, `l’attesa è ${AVATAR_ATTESA_MS}ms`);

  let firmato = false;
  const fetchImpl = async (u, opt) => {
    firmato = !!opt?.signal;
    return { ok: true, headers: { get: () => 'image/png' }, arrayBuffer: async () => new Uint8Array([9, 9, 9]).buffer };
  };
  await avatarDataUri('https://esempio.it/con-scadenza.png', { fetchImpl });
  assert.equal(firmato, true, 'la richiesta parte senza qualcosa che la interrompa');
});

test('la stessa faccia non si riscarica a ogni disegno', async () => {
  // Anteprima, prova e annuncio disegnano la stessa carta a distanza di secondi.
  // Riscaricare ogni volta la stessa immagine è tempo speso su una cosa che non
  // è cambiata, proprio mentre serve andare veloci.
  let quante = 0;
  const fetchImpl = async () => {
    quante += 1;
    return { ok: true, headers: { get: () => 'image/png' }, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer };
  };
  const u = 'https://esempio.it/ricordata-' + process.pid + '.png';
  const a = await avatarDataUri(u, { fetchImpl });
  const b = await avatarDataUri(u, { fetchImpl });
  assert.equal(a, b);
  assert.equal(quante, 1, `scaricata ${quante} volte invece di una`);

  // ma non per sempre: passato il tempo, si torna a chiedere
  await avatarDataUri(u, { fetchImpl, ora: Date.now() + 60 * 60 * 1000 });
  assert.equal(quante, 2, 'il ricordo non scade mai: una faccia cambiata non si vedrebbe più');
});
