// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I LANCI E GLI ADESIVI (src/features/lanci.js, docs/LANCI.md): il catalogo e'
// l'unica fonte, e quello che promette c'e' davvero. Ogni voce ha il suo
// disegno, grande quanto dice (la pagina dei colpi ci misura l'ombra), i suoi
// suoni e le sue animazioni; in public/vendor/lanci non c'e' niente che il
// catalogo non conosca, e ogni fonte e' nelle licenze. Poi il suono caricato
// dallo streamer e il green screen salvato su un video.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { CATALOGO, LIBRERIE, MATERIALI, IMPATTI, MACCHIE, FUMI, TONDA, SUONI, RESTA, oggettoDi, normLancio, payloadLancio, durataLancio, disegnoDi, VOLO_MS, DOPO_MS, PASSO_RAFFICA_MS, SCENA_MS, SPAVENTO_MS, catalogoPubblico } from '../../src/features/lanci.js';

const PUB = new URL('../../src/web/public/', import.meta.url);
const HEX = /^#[0-9a-f]{6}$/i;
const esiste = (via) => existsSync(new URL('.' + via, PUB));

// Le misure di un WebP dall'intestazione (VP8, VP8L o VP8X), senza librerie.
function misuraWebp(b) {
  assert.equal(b.toString('ascii', 0, 4), 'RIFF'); assert.equal(b.toString('ascii', 8, 12), 'WEBP');
  const tipo = b.toString('ascii', 12, 16);
  if (tipo === 'VP8X') return { l: 1 + b.readUIntLE(24, 3), a: 1 + b.readUIntLE(27, 3) };
  if (tipo === 'VP8L') { const v = b.readUInt32LE(21); return { l: 1 + (v & 0x3fff), a: 1 + ((v >> 14) & 0x3fff) }; }
  if (tipo === 'VP8 ') return { l: b.readUInt16LE(26) & 0x3fff, a: b.readUInt16LE(28) & 0x3fff };
  throw new Error('WebP sconosciuto: ' + tipo);
}

test('ogni voce del catalogo e\' completa: libreria, nome nelle tre lingue, materiale, colori, suono', () => {
  const ids = new Set();
  const librerie = new Set(LIBRERIE.map((b) => b.id));
  for (const o of CATALOGO) {
    assert.match(o.id, /^[a-z]{2,20}$/, o.id);
    assert.ok(!ids.has(o.id), 'id doppio: ' + o.id); ids.add(o.id);
    assert.ok(librerie.has(o.libreria), `${o.id}: libreria ${o.libreria}`);
    assert.equal(o.nome.length, 3); o.nome.forEach((n) => assert.ok(n && n.length <= 30, `${o.id}: nome`));
    assert.ok(MATERIALI.includes(o.materiale), `${o.id}: materiale`);
    if (o.suono) assert.ok(SUONI[o.suono], `${o.id}: suono ${o.suono}`);
    if (['spiaccica', 'spruzza'].includes(o.materiale)) assert.ok(o.colori?.length === 2 && o.colori.every((c) => HEX.test(c)), `${o.id}: due colori`);
    if (o.materiale === 'appare') { assert.match(o.noto, /^[0-9a-f_]+$/, `${o.id}: animazione`); assert.ok(o.posa >= 0 && o.posa < 1, `${o.id}: posa`); }
    if (o.impatto) assert.ok(IMPATTI[o.impatto], `${o.id}: impatto`);
    if (o.tuorlo) assert.match(o.tuorlo, HEX);
  }
  for (const b of LIBRERIE) assert.ok(CATALOGO.some((o) => o.libreria === b.id), 'una libreria vuota: ' + b.id);
  assert.ok(CATALOGO.length >= 80, 'una libreria cicciotta');
  for (const m of MATERIALI) assert.ok(CATALOGO.some((o) => o.materiale === m), 'nessuna voce ' + m);
});

test('il disegno di ogni voce c\'e\', ed e\' grande quanto si vede: il lato lungo e\' il suo `lato`', () => {
  for (const o of CATALOGO) {
    const via = disegnoDi(o);
    assert.ok(esiste(via), 'manca il disegno di ' + o.id);
    const { l, a } = misuraWebp(readFileSync(new URL('.' + via, PUB)));
    assert.equal(Math.max(l, a), o.lato, `${o.id}: ${l}×${a}, lato ${o.lato}`);
  }
});

test('ogni pezzo che il payload nomina esiste: animazioni, macchie, fumi, pezzi, suoni', () => {
  for (const o of CATALOGO) {
    const p = payloadLancio({ oggetto: o.id });
    for (const via of [p.sprite, p.animazione, p.impatto?.url, p.pezzi, p.bruciatura, p.suono, p.tuorlo?.macchia, ...p.macchie, ...p.fumi].filter(Boolean)) assert.ok(esiste(via), `${o.id}: manca ${via}`);
    if (p.impatto) {
      const d = JSON.parse(readFileSync(new URL('.' + p.impatto.url, PUB), 'utf8'));
      assert.ok(p.impatto.da >= d.ip && p.impatto.a <= d.op && p.impatto.da < p.impatto.a, `${o.id}: il tratto dell'impatto sta nell'animazione`);
    }
  }
  assert.ok(esiste('/vendor/lottie/lottie_light.min.js') && esiste('/vendor/lottie/LICENSE.md'), 'il lettore delle animazioni, con la sua licenza');
});

test('in vendor/lanci non c\'e\' niente che il catalogo non conosca, e ogni fonte e\' nelle licenze', () => {
  const dir = (d) => readdirSync(new URL(`vendor/lanci/${d}/`, PUB));
  const oggetti = new Set(CATALOGO.filter((o) => o.materiale !== 'appare').map((o) => o.id + '.webp'));
  assert.deepEqual(dir('oggetti').filter((f) => !oggetti.has(f)), [], 'disegni di oggetti che nessuno usa');
  const noto = new Set([...CATALOGO.filter((o) => o.noto).flatMap((o) => [o.id + '.webp', o.noto + '.json']), ...Object.values(IMPATTI).map((x) => x.noto + '.json')]);
  assert.deepEqual(dir('noto').filter((f) => !noto.has(f)), [], 'animazioni che nessuno usa');
  assert.deepEqual(dir('macchie').sort(), MACCHIE.map((m) => m + '.webp').sort());
  assert.deepEqual(dir('fumo').sort(), [...FUMI.map((m) => m + '.webp'), 'bruciatura.webp'].sort());
  assert.deepEqual(dir('suoni').sort(), Object.values(SUONI).sort(), 'i suoni sono quelli del catalogo');
  assert.ok(MACCHIE.includes(TONDA));
  const lic = readFileSync(new URL('vendor/lanci/LICENZE.md', PUB), 'utf8');
  for (const fonte of ['Fluent Emoji', 'MIT License', 'Noto Emoji Animation', 'CC BY 4.0', 'Kenney', 'EZduzziteh', 'WuxiaScrub', 'CC0']) assert.ok(lic.includes(fonte), 'licenze: manca ' + fonte);
  assert.match(catalogoPubblico().crediti, /Noto Emoji Animation © Google \(CC BY 4\.0\)/, 'Noto chiede di essere citata, e il pannello lo fa');
});

test('i parametri di un lancio si puliscono, e il payload porta tutto quello che serve all\'overlay', () => {
  assert.deepEqual(normLancio({}), { oggetto: CATALOGO[0].id, quanti: 1, resta: RESTA[CATALOGO[0].materiale], suono: true, audio: '' });
  assert.deepEqual(normLancio({ oggetto: 'bomba', quanti: 9, resta: 99, suono: false }), { oggetto: 'bomba', quanti: 5, resta: 15, suono: false, audio: '' });
  assert.equal(normLancio({ oggetto: 'non-esiste' }).oggetto, CATALOGO[0].id, 'una voce che non c\'e\' non diventa niente di strano');
  assert.equal(normLancio({ oggetto: 'risata', quanti: 4 }).quanti, 1, 'un adesivo non va in raffica');
  assert.equal(normLancio({ audio: '../x' }).audio, '', 'il suono caricato e\' un comando, mai un percorso');
  assert.equal(normLancio({ audio: 'mio_urlo' }).audio, 'mio_urlo');
  const p = payloadLancio({ oggetto: 'uovo', quanti: 2 });
  assert.equal(p.sprite, '/vendor/lanci/oggetti/uovo.webp');
  assert.equal(p.materiale, 'spiaccica');
  assert.deepEqual(p.tuorlo, { colore: '#f6a313', macchia: `/vendor/lanci/macchie/${TONDA}.webp` });
  assert.equal(p.suono, '/vendor/lanci/suoni/splat.ogg');
  assert.equal(payloadLancio({ oggetto: 'ciabatta' }).impatto.url, '/vendor/lanci/noto/1f4a5.json', 'chi rimbalza fa lo scoppio di Noto');
  assert.equal(payloadLancio({ oggetto: 'uovo', suono: false }).suono, '');
  const u = payloadLancio({ oggetto: 'urlo' });
  assert.ok(u.spavento && u.animazione.endsWith('/1f631.json') && u.posa > 0, 'uno spavento parte gia\' dalla faccia che urla');
  assert.equal(durataLancio(normLancio({ quanti: 3 })), VOLO_MS + 2 * PASSO_RAFFICA_MS + DOPO_MS);
  assert.equal(durataLancio(normLancio({ oggetto: 'risata' })), SCENA_MS);
  assert.equal(durataLancio(normLancio({ oggetto: 'urlo' })), SPAVENTO_MS);
  assert.ok(oggettoDi('fulmine').materiale === 'appare', 'il fulmine e\' l\'animazione di Noto, non un disegno nostro');
});

const { cartellaUsaEGetta } = await import('../aiuto.mjs');
const usaEGetta = cartellaUsaEGetta('andrybot-lanci-');
process.on('exit', () => usaEGetta.pulisci());

test('un lancio si mira e porta il suono caricato dallo streamer; un video porta il suo green screen', async () => {
  const { MIRABILE } = await import('../../src/features/colpi-servizio.js');
  assert.ok(MIRABILE({ tipo: 'lancio', schermo: '' }));
  const { effects: effectsDb } = await import('../../src/db.js');
  const { EffectsEngine, normChroma, chromaDi } = await import('../../src/features/effects.js');
  const e = new EffectsEngine();
  const p = e.payload('canale', { comando: 'pomodoro', tipo: 'lancio', disegno: JSON.stringify({ oggetto: 'pomodoro', quanti: 2 }), volume: 70, posx: 30, posy: 40, scala: 120 });
  assert.equal(p.tipo, 'lancio');
  assert.equal(p.durata, durataLancio(normLancio({ quanti: 2 })));
  assert.deepEqual(p.posizione, { x: 30, y: 40, s: 120, r: 0, centro: true }, 'dall\'Overlay Studio, col centro nel punto');
  assert.equal(e.payload('canale', { comando: 'x', tipo: 'lancio', disegno: '{rotto', volume: 100 }).lancio.oggetto, CATALOGO[0].id, 'un JSON rotto non rompe l\'overlay');
  effectsDb.add('lanciaudio', { comando: 'miourlo', tipo: 'audio', file: 'urlo.ogg', tier: 'tutti', cooldown: 0, volume: 100, durata: 1000 });
  const conMio = e.payload('lanciaudio', { comando: 'bomba', tipo: 'lancio', disegno: JSON.stringify({ oggetto: 'bomba', audio: 'miourlo' }), volume: 100 });
  assert.match(conMio.lancio.suono, /\/overlay\/lanciaudio\/media\/urlo\.ogg\?key=/, 'il suono caricato al posto di quello di serie');
  const senza = e.payload('lanciaudio', { comando: 'bomba', tipo: 'lancio', disegno: JSON.stringify({ oggetto: 'bomba', audio: 'non_ce' }), volume: 100 });
  assert.equal(senza.lancio.suono, '/vendor/lanci/suoni/botto.ogg', 'un suono che non c\'e\' piu\' lascia quello di serie');
  assert.deepEqual(normChroma({ colore: '#00FF00', soglia: 999 }), { colore: '#00ff00', soglia: 300 });
  assert.equal(normChroma({ attivo: false }), null);
  assert.equal(chromaDi({ chroma: '' }), null);
  const v = e.payload('canale', { comando: 'v', tipo: 'video', file: 'v.webm', volume: 100, durata: 3000, chroma: JSON.stringify({ colore: '#0000ff', soglia: 100 }) });
  assert.deepEqual(v.chroma, { colore: '#0000ff', soglia: 100 }, 'il green screen salvato sul video parte con lui');
  assert.equal(e.payload('canale', { comando: 'i', tipo: 'immagine', file: 'i.png', volume: 100, durata: 3000, chroma: '{"colore":"#00ff00"}' }).chroma, undefined, 'solo i video si scontornano');
});
