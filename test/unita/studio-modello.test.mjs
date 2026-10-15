// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL MODELLO DELLO STUDIO (docs/DIRETTA.md, «Lo Studio come OBS, il verticale
// e la memoria»). Lo usano il pannello e il server: qui si prova che un
// documento qualunque esce valido, che ogni fonte ha sempre le due posizioni,
// che i media sono segnaposto e non file, e che la transizione va da 0 a 1.
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizza, nuovaFonte, migraVecchie, impronteUsate, lega, mescola, dispostoRapido, pesa, formatoDi, dirette, FORMATI, LIMITI } from '../../src/web/public/js/studio-modello.js';

const IMP = 'a'.repeat(64), IMP2 = 'b'.repeat(64);

test('un documento qualunque esce valido: almeno una scena, la scena in onda esiste, le scelte hanno un senso', () => {
  for (const d of [null, 42, 'x', {}, { scene: 'no' }, { scene: [null, { fonti: 'no' }] }, { inOnda: 'fantasma', scelte: { formati: { o: false, v: false } } }]) {
    const n = normalizza(d);
    assert.ok(n.scene.length >= 1);
    assert.ok(n.scene.some((s) => s.id === n.inOnda) && n.scene.some((s) => s.id === n.anteprima));
    assert.ok(n.scelte.formati.o || n.scelte.formati.v, 'almeno un formato acceso');
    assert.deepEqual(normalizza(n), n, 'normalizzare due volte non cambia niente');
  }
});

test('ogni fonte ha sempre la posizione orizzontale E quella verticale, dentro la sua tela', () => {
  const n = normalizza({ scene: [{ nome: 'A', fonti: [
    { tipo: 'webcam', pos: { o: { x: 5000, y: -9000, w: 100, h: 100 } } },
    { tipo: 'testo', testo: 'ciao', pos: { v: { x: 10, y: 10, w: 'x', h: 50 } } },
    { tipo: 'immagine', media: { impronta: IMP, nome: 'logo.png', w: 400, h: 400 } },
    { tipo: 'sconosciuto' },
  ] }] });
  const f = n.scene[0].fonti;
  assert.equal(f.length, 3, 'un tipo sconosciuto non entra');
  for (const x of f) for (const k of ['o', 'v']) {
    const p = x.pos[k], { W, H } = FORMATI[k];
    assert.ok(p && p.w >= 20 && p.h >= 20, `${x.tipo} ${k}: misure`);
    assert.ok(p.x <= W - 20 && p.x >= -p.w + 20 && p.y <= H - 20 && p.y >= -p.h + 20, `${x.tipo} ${k}: resta raggiungibile sulla tela`);
  }
  assert.equal(f[2].pos.v.w / f[2].pos.v.h, 1, 'un\'immagine quadrata nasce quadrata anche in verticale');
});

test('un media e\' un segnaposto: impronta, nome e misure, mai il file', () => {
  const n = normalizza({ scene: [{ fonti: [
    { tipo: 'video', media: { impronta: IMP, nome: 'intro.mp4', dati: 'AAAA', blob: {}, url: 'blob:x' } },
    { tipo: 'immagine', media: { impronta: 'non-esadecimale', nome: 'x.png' } },
    { tipo: 'immagine' },
  ] }] });
  const [v, i] = n.scene[0].fonti;
  assert.deepEqual(Object.keys(v.media).sort(), ['byte', 'h', 'impronta', 'mime', 'nome', 'w']);
  assert.equal(i.media.impronta, '', 'un\'impronta storta diventa «da ricollegare»');
  assert.equal(n.scene[0].fonti.length, 2, 'un media senza segnaposto non entra');
});

test('i limiti tengono: scene, fonti, un overlay per scena, testi, e il peso resta piccolo anche al massimo', () => {
  const fonti = Array.from({ length: 80 }, (_, i) => ({ tipo: i % 2 ? 'overlay' : 'testo', testo: 'x'.repeat(500), nome: 'n'.repeat(200) }));
  const n = normalizza({ scene: Array.from({ length: 50 }, () => ({ nome: 'z'.repeat(300), fonti })), preset: Array.from({ length: 50 }, () => ({ nome: 'p', scene: [{ fonti }] })) });
  assert.equal(n.scene.length, LIMITI.scene);
  assert.equal(n.preset.length, LIMITI.preset);
  for (const s of n.scene) {
    assert.ok(s.fonti.length <= LIMITI.fonti);
    assert.equal(s.fonti.filter((f) => f.tipo === 'overlay').length, 1);
    assert.ok(s.nome.length <= LIMITI.nome && s.fonti.every((f) => (f.testo || '').length <= LIMITI.testo));
  }
  const ids = n.scene.flatMap((s) => s.fonti.map((f) => f.id));
  assert.equal(new Set(ids).size, ids.length, 'gli id restano unici anche copiando la stessa fonte');
  assert.ok(pesa(normalizza({ scene: [{ fonti: fonti.slice(0, 40) }] })) < LIMITI.byte);
});

test('le scene di prima si portano dentro: orizzontale com\'era, verticale calcolata, media da ricollegare', () => {
  const vecchie = [{ nome: 'Vecchia', fonti: [{ tipo: 'webcam', nome: 'Cam', x: 10, y: 20, w: 300, h: 200, visibile: false }, { tipo: 'immagine', nome: 'logo.png', dataId: 'm3', x: 0, y: 0, w: 100, h: 100 }] }];
  const n = normalizza({ scene: migraVecchie(vecchie) });
  const [cam, img] = n.scene[0].fonti;
  assert.deepEqual(cam.pos.o, { x: 10, y: 20, w: 300, h: 200, vis: false });
  assert.equal(cam.pos.v.w, FORMATI.v.W, 'in verticale la webcam di serie riempie');
  assert.deepEqual([img.media.impronta, img.media.nome], ['', 'logo.png']);
});

test('ricollegare un file lo rimette a posto in tutte le scene e nei preset; i file che non usa nessuno si sanno', () => {
  const doc = normalizza({ scene: [{ fonti: [{ tipo: 'immagine', media: { impronta: IMP, nome: 'a.png' } }] }], preset: [{ nome: 'p', scene: [{ fonti: [{ tipo: 'immagine', media: { impronta: IMP, nome: 'a.png' } }] }] }] });
  assert.deepEqual([...impronteUsate(doc)], [IMP]);
  lega(doc, { impronta: IMP }, { impronta: IMP2, nome: 'b.png' });
  assert.equal(doc.scene[0].fonti[0].media.impronta, IMP2);
  assert.equal(doc.preset[0].scene[0].fonti[0].media.impronta, IMP2);
  const orfani = normalizza({ scene: [{ fonti: [{ id: 'f1', tipo: 'immagine', media: { nome: 'x' } }, { id: 'f2', tipo: 'immagine', media: { nome: 'y' } }] }] });
  lega(orfani, { impronta: '', id: 'f2' }, { impronta: IMP });
  assert.deepEqual(orfani.scene[0].fonti.map((f) => f.media.impronta), ['', IMP], 'un media senza impronta si lega solo dove lo si sceglie');
});

test('la transizione va da 0 a 1 nel tempo scelto; il taglio e\' subito', () => {
  assert.equal(mescola(1000, 300, 1000), 0);
  assert.equal(mescola(1000, 300, 1150), 0.5);
  assert.equal(mescola(1000, 300, 5000), 1);
  assert.equal(mescola(1000, 0, 1000), 1);
  const n = normalizza({ scelte: { transizione: { tipo: 'esplosione', ms: 99999 } } });
  assert.deepEqual(n.scelte.transizione, { tipo: 'dissolvenza', ms: 3000 });
});

test('le disposizioni rapide valgono per il formato in cui si lavora, e non toccano l\'altro', () => {
  const n = normalizza({ scene: [{ fonti: [{ tipo: 'schermo' }, { tipo: 'webcam' }] }] });
  const s = n.scene[0], primaO = JSON.stringify(s.fonti.map((f) => f.pos.o));
  dispostoRapido(s, 'pip', 'v');
  assert.equal(JSON.stringify(s.fonti.map((f) => f.pos.o)), primaO);
  const cam = s.fonti.find((f) => f.tipo === 'webcam'), scr = s.fonti.find((f) => f.tipo === 'schermo');
  assert.ok(cam.pos.v.y + cam.pos.v.h <= scr.pos.v.y, 'in verticale la webcam sta sopra il gioco');
  assert.equal(s.fonti.at(-1), cam, 'e davanti');
});

test('ogni destinazione ha il suo formato; Twitch resta orizzontale; un formato spento non trasmette', () => {
  const sc = normalizza({ scelte: { formati: { o: true, v: true }, destFormato: { twitch: 'v', kick: 'v', yt: 'o' } } }).scelte;
  assert.equal(sc.destFormato.twitch, undefined, 'il verticale su Twitch non si puo\' scegliere');
  assert.equal(formatoDi('twitch', sc), 'o');
  assert.equal(formatoDi('twitch', { destFormato: { twitch: 'v' } }), 'o', 'anche da scelte non passate da normalizza');
  assert.deepEqual(dirette(sc, ['twitch', 'kick', 'yt']), { o: ['twitch', 'yt'], v: ['kick'] });
  const soloO = normalizza({ scelte: { formati: { o: true, v: false }, destFormato: { kick: 'v' } } }).scelte;
  assert.deepEqual(dirette(soloO, ['twitch', 'kick']), { o: ['twitch'], v: [] }, 'col verticale spento Kick verticale non parte');
  assert.deepEqual(normalizza({}).scelte.dest, ['twitch', 'kick'], 'di serie le piattaforme collegate');
  assert.deepEqual(normalizza({ scelte: { dest: ['yt', 'yt', 'NO!', 'kick'] } }).scelte.dest, ['yt', 'kick']);
});

test('una fonte nuova nasce valida nei due formati', () => {
  for (const t of ['webcam', 'schermo', 'testo', 'overlay']) {
    const f = nuovaFonte(t);
    assert.ok(f.pos.o.w > 0 && f.pos.v.w > 0, t);
  }
  assert.equal(nuovaFonte('immagine'), null, 'un\'immagine senza file non nasce');
});
