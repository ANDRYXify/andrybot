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
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  TEMI, NOMI_TEMI, MISURA, SEGNAPOSTO, CARATTERI,
  svgCarta, resaCarta, disegnabile, temaPerPiattaforma, avatarDataUri,
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
