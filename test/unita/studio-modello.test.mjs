// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL MODELLO DELLO STUDIO (docs/DIRETTA.md, «Lo Studio come OBS, il verticale
// e la memoria»). Lo usano il pannello e il server: qui si prova che un
// documento qualunque esce valido, che ogni fonte ha sempre le due posizioni,
// che i media sono segnaposto e non file, e che la transizione va da 0 a 1.
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizza, nuovaFonte, migraVecchie, impronteUsate, lega, mescola, dispostoRapido, pesa, formatoDi, dirette, escluse, FORMATI, LIMITI, SCENARI, AUDIO, TESTI_PRONTE, scenePronte, applicaPronte, sceneVuote, scenaAccanto, vincoliAudio, overlayDi, inquadra, modoAdatta, spostaCentro, prossimoZoom, orientamentoStorto, nomeCamera, TAGLIO_MAX, ZOOM_DIGITALE_MAX, INQUADRABILI, microfoniInOnda, scenaProtagonista, scenaDelProtagonista, tallyDi, scenaDiRipiego, copreTutto, AUDIO_SCENA } from '../../src/web/public/js/studio-modello.js';

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
  assert.deepEqual(dirette(soloO, ['twitch', 'kick']), { o: ['twitch', 'kick'], v: [] }, 'con un formato solo ogni destinazione scelta prende quello: Kick, segnato verticale da prima, va in orizzontale');
  const soloV = normalizza({ scelte: { formati: { o: false, v: true } } }).scelte;
  assert.deepEqual(dirette(soloV, ['twitch', 'kick', 'yt']), { o: [], v: ['kick', 'yt'] }, 'col solo verticale le destinazioni vanno in verticale, senza scegliere una per una');
  assert.deepEqual(escluse(soloV, ['twitch', 'kick']), ['twitch'], 'e Twitch, che il verticale non lo riceve, si sa che resta fuori');
  assert.deepEqual(escluse(sc, ['twitch', 'kick', 'yt']), []);
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

const TESTI = Object.fromEntries(TESTI_PRONTE.map((k) => [k, 'T-' + k]));

test('gli scenari del telefono: ognuno sa che fotocamera, che audio e che scene servono; il gioco si dice non disponibile', () => {
  for (const [k, sc] of Object.entries(SCENARI)) {
    if (!sc.disponibile) { assert.deepEqual(scenePronte(k, TESTI), [], `${k}: niente scene finte`); continue; }
    assert.ok(['user', 'environment'].includes(sc.facing), k);
    assert.ok(sc.scene.length >= 2, `${k}: almeno una scena per stare in onda e una per la pausa`);
    assert.ok(scenePronte(k, TESTI).some((s) => s.muta), `${k}: c'e' una scena che spegne il microfono`);
  }
  assert.equal(SCENARI.gioco.disponibile, false);
  assert.deepEqual(vincoliAudio('musica'), { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, 'la musica passa senza filtri');
  assert.deepEqual(vincoliAudio('giro'), { ...AUDIO.voce });
  assert.deepEqual(vincoliAudio('???'), { ...AUDIO.voce }, 'uno scenario sconosciuto prende la voce');
});

test('le scene pronte sono valide nei due formati: fotocamera e scritte riempiono la tela, l\'overlay sta sopra', () => {
  for (const k of Object.keys(SCENARI)) {
    for (const s of scenePronte(k, TESTI)) {
      const n = normalizza({ scene: [s] }).scene[0];
      assert.equal(n.muta, s.muta); assert.equal(n.camera, s.camera);
      for (const f of s.fonti) for (const fm of ['o', 'v']) {
        assert.deepEqual(f.pos[fm], { x: 0, y: 0, w: FORMATI[fm].W, h: FORMATI[fm].H, vis: true }, `${k}/${s.nome}/${f.tipo}/${fm}`);
      }
      assert.equal(s.fonti.at(-1).tipo, 'overlay', 'l\'overlay e\' l\'ultimo: gli alert stanno sopra a tutto');
      assert.ok(s.fonti.every((f) => f.tipo !== 'testo' || f.testo.startsWith('T-')), 'le scritte sono quelle passate, nella lingua di chi le usa');
    }
  }
});

test('le scene pronte non cancellano mai quelle fatte: entrano da sole solo se le scene sono vuote', () => {
  const vuoto = normalizza({});
  assert.ok(sceneVuote(vuoto));
  assert.ok(sceneVuote(normalizza({ scene: [{ fonti: [{ tipo: 'overlay' }] }] })), 'una scena con solo l\'overlay e\' vuota di contenuto: le pronte entrano');
  assert.ok(!sceneVuote(normalizza({ scene: [{ fonti: [{ tipo: 'overlay' }, { tipo: 'testo' }] }] })));
  assert.equal(applicaPronte(vuoto, 'giro', TESTI), 4);
  assert.equal(vuoto.inOnda, vuoto.scene[0].id, 'in onda va la prima pronta');
  const fatte = normalizza({ scene: [{ nome: 'Mia', fonti: [{ tipo: 'testo', testo: 'ciao' }] }] });
  const prima = JSON.stringify(fatte);
  assert.equal(applicaPronte(fatte, 'giro', TESTI), 0, 'senza chiederlo non tocca le scene di chi le ha fatte');
  assert.equal(JSON.stringify(fatte), prima);
  assert.equal(applicaPronte(fatte, 'giro', TESTI, { aggiungi: true }), 4, 'chiedendolo le aggiunge');
  assert.equal(fatte.scene[0].nome, 'Mia', 'in coda, dopo le sue');
  assert.equal(applicaPronte(fatte, 'giro', TESTI, { aggiungi: true }), 0, 'una seconda volta non le raddoppia');
  const piene = normalizza({ scene: Array.from({ length: LIMITI.scene - 1 }, (_, i) => ({ nome: 'S' + i, fonti: [{ tipo: 'overlay' }] })) });
  assert.equal(applicaPronte(piene, 'giro', TESTI, { aggiungi: true }), 1, 'e non supera il limite delle scene');
  assert.equal(applicaPronte(normalizza({}), 'gioco', TESTI), 0);
});

test('scorrendo si passa alla scena accanto, e si gira in tondo', () => {
  const d = normalizza({ scene: [{ nome: 'A' }, { nome: 'B' }, { nome: 'C' }] });
  const [a, b, c] = d.scene.map((s) => s.id);
  assert.equal(scenaAccanto(d, a, 1), b); assert.equal(scenaAccanto(d, a, -1), c); assert.equal(scenaAccanto(d, c, 1), a);
  assert.equal(scenaAccanto(normalizza({}), normalizza({}).inOnda, 1), null, 'con una scena sola non c\'e\' dove andare');
});

test('le scelte del telefono si ricordano e si normalizzano', () => {
  assert.deepEqual(normalizza({}).scelte.telefono, { scenario: '', chat: 'm', voce: false, vibra: true });
  assert.deepEqual(normalizza({ scelte: { telefono: { scenario: 'mani' } } }).scelte.telefono, { scenario: 'mani', chat: 'm', voce: true, vibra: true }, 'mani al lavoro: la chat a voce di serie');
  assert.deepEqual(normalizza({ scelte: { telefono: { scenario: 'gioco', chat: 'xl', voce: 'si', vibra: false } } }).scelte.telefono, { scenario: '', chat: 'm', voce: false, vibra: false }, 'uno scenario che dal browser non si fa non si ricorda');
  assert.deepEqual(normalizza({ scelte: { telefono: { scenario: 'mani', voce: false } } }).scelte.telefono.voce, false, 'spenta a mano resta spenta');
});

test('la fonte Overlay ricorda quale dei tuoi overlay usa; se quello non c\'e\' piu\', prende quello di serie e poi il primo', () => {
  const n = normalizza({ scene: [{ fonti: [{ tipo: 'overlay', overlay: 'gioco' }, { tipo: 'testo' }] }, { fonti: [{ tipo: 'overlay', overlay: '../x' }] }], scelte: { overlay: 'chiacchiere' } });
  assert.equal(n.scene[0].fonti[0].overlay, 'gioco');
  assert.equal(n.scene[0].fonti[1].overlay, undefined, 'solo l\'overlay ha la scelta');
  assert.equal(n.scene[1].fonti[0].overlay, '', 'un id storto non entra');
  assert.equal(n.scelte.overlay, 'chiacchiere');
  const lista = [{ id: 'gioco' }, { id: 'chiacchiere' }, { id: 'altro' }];
  assert.equal(overlayDi(n.scene[0].fonti[0], n.scelte, lista), 'gioco');
  assert.equal(overlayDi(n.scene[1].fonti[0], n.scelte, lista), 'chiacchiere', 'senza scelta: quello di serie');
  assert.equal(overlayDi({ overlay: 'cancellato' }, { overlay: 'sparito' }, lista), 'gioco', 'overlay cancellati: il primo che c\'e\'');
  assert.equal(overlayDi({ overlay: 'gioco' }, {}, []), 'gioco', 'finche\' l\'elenco non e\' arrivato vale la scelta');
  assert.equal(overlayDi(null, {}, []), '');
  assert.equal(normalizza({ scelte: { overlay: 'a b' } }).scelte.overlay, '');
});

const VICINO = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} contro ${b}`);

test('l\'inquadratura non esce mai dal frame né dal riquadro, e non stira mai l\'immagine', () => {
  const frame = [[1280, 720], [720, 1280], [640, 480], [480, 640], [1920, 1080], [1080, 1080], [3840, 1080]];
  const box = [{ x: 0, y: 0, w: 720, h: 1280 }, { x: 0, y: 0, w: 1280, h: 720 }, { x: 900, y: 500, w: 384, h: 216 }, { x: -50, y: 40, w: 300, h: 300 }];
  let casi = 0;
  for (const [vw, vh] of frame) for (const b of box) for (const adatta of ['auto', 'ritaglia', 'intera']) for (const zoom of [1, 1.7, 3]) for (const cx of [-1, -0.3, 0, 1]) for (const cy of [-1, 0, 0.6]) for (const specchio of [false, true]) {
    const r = inquadra(vw, vh, b, { adatta, cx, cy }, { zoom, specchio });
    casi++;
    assert.ok(r.sx >= -1e-6 && r.sy >= -1e-6 && r.sx + r.sw <= vw + 1e-6 && r.sy + r.sh <= vh + 1e-6, 'la finestra sta nel frame');
    assert.ok(r.dx >= b.x - 1e-6 && r.dy >= b.y - 1e-6 && r.dx + r.dw <= b.x + b.w + 1e-6 && r.dy + r.dh <= b.y + b.h + 1e-6, 'il disegno sta nel riquadro');
    VICINO(r.sw / r.sh, r.dw / r.dh, 'le proporzioni restano quelle vere');
    if (r.modo === 'ritaglia') assert.ok(!r.bande && Math.abs(r.dw - b.w) < 1e-6 && Math.abs(r.dh - b.h) < 1e-6, 'ritaglia riempie tutto il riquadro');
    if (r.modo === 'intera' && zoom === 1) assert.ok(Math.abs(r.sw - vw) < 1e-6 && Math.abs(r.sh - vh) < 1e-6, 'intera senza zoom non taglia niente');
    if (adatta === 'auto' && zoom === 1) assert.ok(Math.min(r.sw / vw, r.sh / vh) >= 1 / TAGLIO_MAX - 1e-6, 'da sola non taglia mai più di un terzo');
    const uno = inquadra(vw, vh, b, { adatta, cx, cy }, { zoom: 1, specchio });
    if (r.modo === 'ritaglia') { VICINO(r.sw, uno.sw / zoom, 'lo zoom stringe la finestra di quanto dice'); VICINO(r.sh, uno.sh / zoom, 'anche in altezza'); }
  }
  assert.equal(casi, 7 * 4 * 3 * 3 * 4 * 3 * 2);
  for (const z of [0.5, -3, 'x', null]) assert.deepEqual(inquadra(1280, 720, box[0], { adatta: 'intera' }, { zoom: z }), inquadra(1280, 720, box[0], { adatta: 'intera' }, { zoom: 1 }), `uno zoom ${z} vale 1×: l'immagine non rimpicciolisce mai sotto il riquadro`);
});

test('il telefono dritto in verticale si vede intero; un frame orizzontale non si ritaglia più tre volte da solo', () => {
  const tela = { x: 0, y: 0, w: 720, h: 1280 };
  const dritto = inquadra(720, 1280, tela, { adatta: 'auto' });
  assert.equal(dritto.modo, 'ritaglia'); VICINO(dritto.sw, 720, 'tutta la larghezza'); VICINO(dritto.sh, 1280, 'tutta l\'altezza');
  const storto = inquadra(1280, 720, tela, { adatta: 'auto' });
  assert.equal(storto.modo, 'intera'); assert.ok(storto.bande); VICINO(storto.sw, 1280, 'niente tagliato');
  const chiesto = inquadra(1280, 720, tela, { adatta: 'ritaglia' });
  assert.ok(chiesto.sw / 1280 < 0.32, 'il ritaglio pieno di un frame orizzontale è lo zoom di 3 volte: succede solo se lo chiedi');
  assert.equal(modoAdatta(640, 480, 1280, 720, 'auto'), 'ritaglia', 'una webcam 4:3 in 16:9 riempie');
  assert.equal(modoAdatta(1080, 1080, 720, 1280, 'auto'), 'intera', 'un quadrato in verticale si mostra intero');
});

test('trascinare sposta l\'inquadratura dalla parte giusta, anche specchiata, e non esce mai dal frame', () => {
  const tela = { x: 0, y: 0, w: 720, h: 1280 };
  for (const specchio of [false, true]) {
    const q = { adatta: 'ritaglia', cx: 0, cy: 0 };
    const r = inquadra(1280, 720, tela, q, { specchio });
    const dopo = spostaCentro(r, 1280, 720, q, 100, 0);
    assert.ok(dopo.cx < 0, 'il contenuto segue il dito: si vede quello che stava a sinistra');
    const r2 = inquadra(1280, 720, tela, { ...q, ...dopo }, { specchio });
    if (specchio) assert.ok(r2.sx > r.sx, 'specchiata, la sinistra vista è la destra del frame'); else assert.ok(r2.sx < r.sx);
    assert.equal(spostaCentro(r, 1280, 720, q, 1e6, -1e6).cx, -1);
    assert.equal(spostaCentro(r, 1280, 720, q, 1e6, -1e6).cy, 0, 'dove non c\'è margine non si sposta');
  }
  const dritto = inquadra(720, 1280, tela, { adatta: 'ritaglia', cx: 0.4, cy: 0 });
  assert.equal(spostaCentro(dritto, 720, 1280, { cx: 0.4, cy: 0 }, 300, 0).cx, 0.4, 'senza margine il centro resta dov\'era: uno zoom dopo non salta al bordo');
});

test('lo zoom a tocchi va 1×, 2×, 3× e torna a 1×, senza superare il massimo', () => {
  assert.equal(prossimoZoom(1, ZOOM_DIGITALE_MAX), 2);
  assert.equal(prossimoZoom(2, ZOOM_DIGITALE_MAX), 3);
  assert.equal(prossimoZoom(3, ZOOM_DIGITALE_MAX), 1);
  assert.equal(prossimoZoom(1.4, 10), 2);
  assert.equal(prossimoZoom(1, 1.8), 1, 'se la fotocamera non arriva a 2×, resta a 1×');
  assert.equal(prossimoZoom(1, 2), 2); assert.equal(prossimoZoom(2, 2), 1);
});

test('il telefono storto rispetto al formato si dice, il resto no', () => {
  assert.equal(orientamentoStorto(1280, 720, 'v'), 'dritto');
  assert.equal(orientamentoStorto(720, 1280, 'o'), 'lato');
  assert.equal(orientamentoStorto(720, 1280, 'v'), '');
  assert.equal(orientamentoStorto(1280, 720, 'o'), '');
  assert.equal(orientamentoStorto(0, 0, 'v'), '');
});

test('le fotocamere hanno il nome del sistema; quelle di Android si leggono davanti o dietro', () => {
  const t = { davanti: 'Davanti', dietro: 'Dietro', fotocamera: 'Fotocamera' };
  assert.equal(nomeCamera('camera2 0, facing back', 0, t), 'Dietro 1');
  assert.equal(nomeCamera('camera2 1, facing front', 1, t), 'Davanti 2');
  assert.equal(nomeCamera('Fotocamera posteriore ultra grandangolare', 2, t), 'Fotocamera posteriore ultra grandangolare');
  assert.equal(nomeCamera('', 3, t), 'Fotocamera 4');
});

test('ogni fonte con un\'immagine ha l\'inquadratura nei due formati; le immagini nascono intere, il resto automatico', () => {
  for (const tipo of INQUADRABILI) {
    const f = tipo === 'immagine' || tipo === 'video' ? nuovaFonte(tipo, { media: { impronta: IMP, nome: 'x', mime: 'image/png', w: 10, h: 10, byte: 1 } }) : nuovaFonte(tipo);
    for (const k of ['o', 'v']) assert.deepEqual(f.inq[k], { adatta: tipo === 'immagine' ? 'intera' : 'auto', cx: 0, cy: 0 });
  }
  assert.equal(nuovaFonte('testo').inq, undefined); assert.equal(nuovaFonte('overlay').inq, undefined);
  const d = normalizza({ scene: [{ nome: 'S', fonti: [{ tipo: 'webcam', inq: { o: { adatta: 'boh', cx: 9, cy: 'x' }, v: { adatta: 'ritaglia', cx: -0.25, cy: 0.5 } } }] }] });
  assert.deepEqual(d.scene[0].fonti[0].inq, { o: { adatta: 'auto', cx: 1, cy: 0 }, v: { adatta: 'ritaglia', cx: -0.25, cy: 0.5 } });
  assert.deepEqual(normalizza(d), d);
});

const TEL = 'abcdefghij', ALTRO = 'klmnopqrst';
const remota = (id, pos) => normalizza({ scene: [{ nome: 'x', fonti: [{ tipo: 'remota', dispositivo: id, ...(pos ? { pos } : {}) }] }] }).scene[0].fonti[0];

test('la fonte «dispositivo» ricorda quale dispositivo mostra; un id storto non passa; nasce piccola, nell\'angolo, nei due formati', () => {
  const f = remota(TEL);
  assert.equal(f.dispositivo, TEL);
  assert.deepEqual(f.inq.o, { adatta: 'auto', cx: 0, cy: 0 });
  assert.ok(f.pos.o.w < FORMATI.o.W / 2 && f.pos.v.w < FORMATI.v.W / 2, 'come inquadratura in più non copre tutto');
  assert.equal(remota('../../x').dispositivo, '');
  assert.equal(nuovaFonte('remota', { dispositivo: TEL }).dispositivo, TEL);
});

test('ogni scena dice da dove viene l\'audio: di serie dal computer, come prima', () => {
  const d = normalizza({ scene: [{ nome: 'a' }, { nome: 'b', audio: 'dispositivi' }, { nome: 'c', audio: 'boh' }] });
  assert.deepEqual(d.scene.map((s) => s.audio), ['computer', 'dispositivi', 'computer']);
  assert.deepEqual([...AUDIO_SCENA], ['computer', 'dispositivi', 'tutti']);
});

test('i microfoni in onda: il computer, quelli dei dispositivi che si vedono e sono collegati, e la scena muta che spegne tutto', () => {
  const prot = scenaProtagonista('Telefono', TEL);
  assert.deepEqual(microfoniInOnda(prot, [TEL]), { computer: false, dispositivi: [TEL] }, 'il protagonista parla, il computer tace');
  assert.deepEqual(microfoniInOnda(prot, []), { computer: false, dispositivi: [] }, 'un dispositivo che non c\'e\' non va in onda');
  const pip = normalizza({ scene: [{ nome: 'p', fonti: [{ tipo: 'webcam' }, { tipo: 'remota', dispositivo: TEL }] }] }).scene[0];
  assert.deepEqual(microfoniInOnda(pip, [TEL]), { computer: true, dispositivi: [] }, 'un\'inquadratura in piu\' non porta la sua voce: niente eco col computer nella stessa stanza');
  assert.deepEqual(microfoniInOnda({ ...pip, audio: 'tutti' }, [TEL, ALTRO]), { computer: true, dispositivi: [TEL] }, 'tutti: il computer e chi si vede');
  pip.fonti[1].pos.o.vis = false; pip.fonti[1].pos.v.vis = false;
  assert.deepEqual(microfoniInOnda({ ...pip, audio: 'tutti' }, [TEL]), { computer: true, dispositivi: [] }, 'chi e\' nascosto non parla');
  assert.deepEqual(microfoniInOnda({ ...prot, muta: true }, [TEL]), { computer: false, dispositivi: [] });
  assert.deepEqual(microfoniInOnda(null, [TEL]), { computer: false, dispositivi: [] });
});

test('la scena del protagonista: lui a tutta tela nei due formati, l\'overlay sopra, la sua voce; e si ritrova', () => {
  const s = scenaProtagonista('Cucina', TEL);
  assert.equal(s.nome, 'Cucina'); assert.equal(s.audio, 'dispositivi');
  assert.equal(s.fonti[0].tipo, 'remota'); assert.ok(copreTutto(s.fonti[0]));
  assert.equal(s.fonti.at(-1).tipo, 'overlay');
  const d = normalizza({ scene: [{ nome: 'Io', fonti: [{ tipo: 'webcam' }] }, s] });
  assert.equal(scenaDelProtagonista(d, TEL)?.nome, 'Cucina');
  assert.equal(scenaDelProtagonista(d, ALTRO), null);
  const piccola = normalizza({ scene: [{ nome: 'pip', fonti: [{ tipo: 'remota', dispositivo: TEL }] }] });
  assert.equal(scenaDelProtagonista(piccola, TEL), null, 'un riquadro piccolo non e\' la scena del protagonista');
});

test('il tally: rosso se si vede nel programma, verde se e\' in anteprima, con i formati che vanno davvero in onda', () => {
  const s = scenaProtagonista('Tel', TEL);
  const d = normalizza({ scene: [{ nome: 'Io', fonti: [{ tipo: 'webcam' }] }, s], scelte: { formati: { o: true, v: false } } });
  d.inOnda = d.scene[0].id; d.anteprima = d.scene[1].id;
  assert.deepEqual(tallyDi(d, TEL, { live: true, modalita: true }), { onda: false, anteprima: true });
  assert.deepEqual(tallyDi(d, TEL, { live: true, modalita: false }), { onda: false, anteprima: false }, 'senza modalita\' studio l\'anteprima non c\'e\'');
  d.inOnda = d.scene[1].id;
  assert.deepEqual(tallyDi(d, TEL, { live: true, modalita: true }), { onda: true, anteprima: false });
  d.scene[1].fonti[0].pos.o.vis = false;
  assert.equal(tallyDi(d, TEL, { live: true }).onda, false, 'nascosto nel formato che va in onda: non e\' in onda');
  assert.equal(tallyDi(d, TEL, { live: false, lavoro: 'v' }).onda, true, 'fuori diretta conta il formato su cui si lavora');
});

test('la scena di ripiego: quella di prima se non mostra il dispositivo perso, sennò la prima che non lo mostra', () => {
  const s = scenaProtagonista('Tel', TEL);
  const d = normalizza({ scene: [{ nome: 'Io', fonti: [{ tipo: 'webcam' }] }, s, { nome: 'Due', fonti: [{ tipo: 'remota', dispositivo: TEL }] }] });
  const [io, prot, due] = d.scene.map((x) => x.id);
  assert.equal(scenaDiRipiego(d, TEL, io), io);
  assert.equal(scenaDiRipiego(d, TEL, due), io, 'la scena di prima mostra anche lei il dispositivo: si va su una che non lo mostra');
  assert.equal(scenaDiRipiego(d, TEL, 'boh'), io);
  const sola = normalizza({ scene: [s] });
  assert.equal(scenaDiRipiego(sola, TEL, prot), '', 'se non c\'e\' dove andare lo si dice, non si inventa');
});
