// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL DISEGNO DEL MEDIA KIT (src/web/public/kit.js): i pezzi che decidono cosa
// ci sta e come, provati con una misura del testo finta ma coerente (ogni
// carattere largo 10). Il foglio intero si guarda nel browser.
import test from 'node:test';
import assert from 'node:assert/strict';

await import('../../src/web/public/kit.js');
const K = globalThis.SB_KIT;
const g = { measureText: (s) => ({ width: String(s).length * 10 }) };

test('il contrasto e\' quello della norma: nero su bianco 21, uguale su uguale 1', () => {
  assert.equal(Math.round(K.contrasto('#000000', '#ffffff')), 21);
  assert.equal(K.contrasto('#777', '#777777'), 1);
  assert.ok(K.contrasto('rgba(255, 255, 255, .5)', '#000') > 20, 'rgba si legge per il colore');
  assert.equal(K.contrasto('non un colore', '#fff'), 1, 'un colore illeggibile non passa per buono');
});

test('bianco o nero puro, quello che contrasta di piu\': su qualunque colore arriva a 4,5', () => {
  // col nero puro il caso peggiore e' 4,58; con un nero morbido (#111) un
  // accento come #6666ff restava sotto con tutti e due
  const passi = [0, 51, 102, 153, 204, 255];
  for (const r of passi) for (const g of passi) for (const b of passi) {
    const c = '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
    assert.ok(K.contrasto(K.inchiostro(c), c) >= 4.5, c);
  }
  assert.equal(K.inchiostro('#6666ff'), '#000000');
  assert.equal(K.inchiostro('#1a1919'), '#ffffff');
});

test('taglia: sta o si accorcia coi puntini, e lo dice', () => {
  assert.deepEqual(K.taglia(g, 'ciao', 40), { testo: 'ciao', tagliato: false });
  const t = K.taglia(g, 'buongiorno', 50);
  assert.equal(t.tagliato, true);
  assert.ok(g.measureText(t.testo).width <= 50 && t.testo.endsWith('…'));
});

test('le righe vanno a capo fra le parole, rispettano gli a capo, e oltre il massimo lo dicono', () => {
  assert.deepEqual(K.righe(g, 'uno due tre quattro', 80, 4).righe, ['uno due', 'tre', 'quattro']);
  assert.deepEqual(K.righe(g, 'uno\ndue', 200, 4).righe, ['uno', 'due']);
  const r = K.righe(g, 'a b c d e f g h', 30, 2);
  assert.equal(r.righe.length, 2);
  assert.equal(r.tagliato, true);
  assert.ok(r.righe[1].endsWith('…'), 'chi legge vede che continua');
  assert.equal(K.righe(g, 'corto', 200, 4).tagliato, false);
});

test('l\'elenco va a capo fra le voci, mai dentro una voce, e il separatore non resta da solo', () => {
  const r = K.elenco(g, ['Ghiro Gear Italia', 'Nebbia', 'Forno'], 260, 3, ' · ');
  assert.deepEqual(r.righe, ['Ghiro Gear Italia · Nebbia', 'Forno']);
  const lunghi = K.elenco(g, ['M'.repeat(40), 'N'.repeat(40)], 200, 3, ' · ');
  assert.equal(lunghi.righe.length, 2);
  assert.ok(lunghi.righe.every((x) => x !== '·' && x.trim() !== '·'), 'nessuna riga fatta del solo separatore');
  assert.equal(lunghi.tagliato, true, 'una voce accorciata si dice');
  const troppi = K.elenco(g, Array.from({ length: 12 }, (_, i) => `Marca${i}`), 150, 2, ' · ');
  assert.equal(troppi.righe.length, 2);
  assert.equal(troppi.tagliato, true);
});

test('le misure del foglio sono quelle di un A4 a 150 punti per pollice', () => {
  assert.deepEqual([K.W, K.H], [1240, 1754]);
  assert.ok(Math.abs(K.W / K.H - 210 / 297) < 0.001);
});

// ── L'impaginazione ─────────────────────────────────────────────────────────
// Una tela finta ma coerente: il testo e' largo mezzo punto per carattere per
// ogni pixel di corpo, e ogni scritta resta segnata col suo posto. Basta per
// provare gli invarianti; il foglio vero si guarda nel browser.
globalThis.Path2D ||= class {};
function tela() {
  let px = 20;
  const scritte = [];
  const nulla = () => {};
  const g = {
    scritte,
    set font(f) { px = Number(/(\d+)px/.exec(f)?.[1]) || 20; }, get font() { return `${px}px x`; },
    measureText: (s) => ({ width: String(s).length * px * 0.5 }),
    fillText: (t, x, y) => scritte.push({ t: String(t), x, y, px }),
    createLinearGradient: () => ({ addColorStop: nulla }),
  };
  for (const k of ['beginPath', 'arc', 'clip', 'fill', 'stroke', 'roundRect', 'fillRect', 'save', 'restore', 'translate', 'scale', 'drawImage']) g[k] = nulla;
  return g;
}
const COLORI = { bg: '#121117', bg2: '#1c1a24', testo: '#f3f0f7', tenue: '#aaa3b8', card: '#1d1b25', bordo: '#302d3b', acc: '#b072ff' };
const lungo = (n) => Array.from({ length: n }, (_, i) => ['parola', 'lunga', 'davvero', 'tanto'][i % 4]).join(' ').slice(0, n);
const PIENE = {
  testa: { tipo: 'testa', riga: 'R'.repeat(80), presentazione: lungo(600) },
  numeri: { tipo: 'numeri', titolo: 'I numeri', voci: Array.from({ length: 7 }, (_, i) => ({ valore: '1.234.567', etichetta: `etichetta lunga numero ${i}` })), nota: lungo(300) },
  categorie: { tipo: 'categorie', titolo: 'Cosa trasmetto', voci: Array.from({ length: 5 }, (_, i) => ({ nome: 'Categoria '.repeat(4) + i, quota: 20 })) },
  settimana: { tipo: 'settimana', titolo: 'Quando', giorni: Array.from({ length: 7 }, (_, i) => ({ giorno: 'Lun', ora: '21:30', off: i === 3 })), fuso: 'Orari in ora italiana' },
  social: { tipo: 'social', titolo: 'Dove trovarmi', voci: Array.from({ length: 8 }, (_, i) => ({ d: '', testo: '@nome' + i, url: 'https://x.it/' + i })) },
  lavori: { tipo: 'lavori', titolo: 'I miei lavori', voci: Array.from({ length: 6 }, (_, i) => ({ titolo: 'T'.repeat(60), testo: lungo(200), url: 'https://lavoro.it/' + i })) },
  collaborazioni: { tipo: 'collaborazioni', titolo: 'Marchi', voci: Array.from({ length: 12 }, (_, i) => ({ nome: 'M'.repeat(40), url: i % 2 ? 'https://m.it' : '' })) },
  offerte: { tipo: 'offerte', titolo: 'Cosa offro', voci: Array.from({ length: 6 }, () => ({ nome: 'N'.repeat(50), testo: lungo(160), prezzo: 'P'.repeat(30) })) },
  testo: { tipo: 'testo', titolo: 'Un testo', testo: lungo(800) },
  link: { tipo: 'link', titolo: 'Link utili', voci: Array.from({ length: 8 }, (_, i) => ({ etichetta: 'E'.repeat(40), mostra: 'sito.it/' + i, url: 'https://sito.it/' + i })) },
  contatti: { tipo: 'contatti', titolo: 'Per lavorare insieme', email: 'collaborazioni.con.un.nome.lungo@dominio.example', altro: { etichetta: 'Prenota una call', mostra: 'cal.example', url: 'https://cal.example' } },
};
const doc = (sezioni, o = {}) => ({ nome: 'Andryx', avatar: null, colori: COLORI, canale: { etichetta: 'twitch.tv/andryx', url: 'https://twitch.tv/andryx' }, sezioni, ...o });
const PAGINA = () => K.BASSO - K.ALTO;

test('ogni sezione, piena fino al tetto, sta in una pagina: piena e a meta\'', () => {
  const largo = K.W - 2 * K.M, meta = (largo - 48) / 2;
  for (const [tipo, s] of Object.entries(PIENE)) {
    for (const w of tipo === 'testa' || tipo === 'contatti' ? [largo] : [largo, meta]) {
      for (const titoli of ['maiuscolo', 'normale']) {
        const h = K.misura(tela(), doc([], { titoli }), { ...s, larghezza: w === meta ? 'meta' : 'piena' }, w);
        assert.ok(h > 0 && h <= PAGINA(), `${tipo} a ${Math.round(w)}px (${titoli}): ${Math.round(h)} su ${PAGINA()}`);
      }
    }
  }
});

function controllaPagine(d) {
  const g = tela();
  const imp = K.impagina(g, d);
  assert.ok(imp.pagine.length >= 1 && imp.pagine.length <= K.PAGINE, `${imp.pagine.length} pagine`);
  imp.pagine.forEach((pag, n) => {
    for (const a of pag) {
      assert.ok(a.y >= K.ALTO && a.y + a.h <= K.BASSO + 0.01, `${a.s.tipo} dentro la pagina ${n + 1}: ${a.y}..${a.y + a.h}`);
      for (const b of pag) {
        if (a === b) continue;
        const insiemeX = a.x < b.x + b.w && b.x < a.x + a.w, insiemeY = a.y < b.y + b.h && b.y < a.y + a.h;
        assert.ok(!(insiemeX && insiemeY), `${a.s.tipo} e ${b.s.tipo} non si sovrappongono a pagina ${n + 1}`);
      }
    }
    const t = tela();
    const R = K.disegnaPagina(t, d, imp, n);
    for (const sc of t.scritte) {
      if (sc.y > K.BASSO) continue;
      assert.ok(pag.some((p) => sc.x >= p.x - 1 && sc.x <= p.x + p.w + 1 && sc.y >= p.y && sc.y <= p.y + p.h + 1), `«${sc.t}» a ${Math.round(sc.x)},${Math.round(sc.y)} e' dentro la sua sezione (pagina ${n + 1})`);
    }
    for (const l of R.link) {
      assert.ok(l.x >= 0 && l.y >= 0 && l.x + l.w <= K.W && l.y + l.h <= K.H, `il link ${l.url} sta nella pagina`);
      assert.match(l.url, /^(https?:\/\/|mailto:)/);
    }
    assert.ok(R.testi.length > 0 && R.testi.every((x) => x.w > 0 && x.px > 0 && x.testo), 'ogni testo registrato ha forma, per lo strato del PDF');
  });
  const ultima = imp.pagine[imp.pagine.length - 1];
  const contatti = ultima.find((p) => p.s.tipo === 'contatti');
  if (contatti) {
    assert.equal(ultima.at(-1), contatti, 'i contatti sono l\'ultima cosa dell\'ultima pagina');
    for (const p of ultima) if (p !== contatti) assert.ok(p.y + p.h + 56 <= contatti.y + 0.01, `${p.s.tipo} sta sopra i contatti, con lo stacco di ogni sezione`);
  }
  return imp;
}

test('le sezioni vanno di pagina in pagina senza sovrapporsi, i contatti per ultimi', () => {
  const tutte = Object.values(PIENE);
  const imp = controllaPagine(doc(tutte.map((s) => ({ ...s, larghezza: 'piena' }))));
  assert.ok(imp.problemi.includes('pagine'), 'tutto pieno al tetto non ci sta in tre pagine, e lo dice');
  assert.equal(imp.pagine.length, K.PAGINE);
  const poche = controllaPagine(doc([PIENE.testa, PIENE.numeri, PIENE.lavori, PIENE.contatti]));
  assert.ok(!poche.problemi.includes('pagine'));
  assert.ok(poche.pagine.length >= 2, 'una sezione che non ci sta passa alla pagina dopo');
  const corte = controllaPagine(doc([PIENE.testa, { ...PIENE.testo, testo: 'Due righe.' }, PIENE.contatti]));
  assert.equal(corte.pagine.length, 1);
});

test('due meta\' di fila stanno affiancate; una meta\' da sola sta a sinistra', () => {
  const d = doc([PIENE.testa, { ...PIENE.categorie, larghezza: 'meta' }, { ...PIENE.social, larghezza: 'meta' }, { ...PIENE.settimana, larghezza: 'meta' }, PIENE.contatti]);
  const imp = controllaPagine(d);
  const tutte = imp.pagine.flat();
  const [cat, soc, set] = ['categorie', 'social', 'settimana'].map((t) => tutte.find((p) => p.s.tipo === t));
  assert.equal(cat.y, soc.y, 'sulla stessa riga');
  assert.ok(cat.x < soc.x && cat.x + cat.w < soc.x, 'una accanto all\'altra');
  assert.equal(set.x, K.M, 'la terza va a capo, a sinistra');
  assert.ok(set.y > cat.y);
});

test('nascoste e vuote non occupano posto, e una meta\' vuota non si porta via la compagna', () => {
  const d = doc([PIENE.testa, { ...PIENE.lavori, voci: [], larghezza: 'meta' }, { ...PIENE.categorie, larghezza: 'meta' }, { ...PIENE.social, larghezza: 'meta' }, { ...PIENE.offerte, visibile: false }, { ...PIENE.testo, testo: '   ' }, PIENE.contatti]);
  const tipi = K.impagina(tela(), d).pagine.flat().map((p) => p.s.tipo);
  assert.deepEqual(tipi, ['testa', 'categorie', 'social', 'contatti']);
  const tutte = K.impagina(tela(), d).pagine.flat();
  assert.equal(tutte.find((p) => p.s.tipo === 'categorie').y, tutte.find((p) => p.s.tipo === 'social').y, 'si affiancano le due che hanno qualcosa');
});

test('ogni cosa con un indirizzo e\' un link: il canale, i lavori, i marchi, i link, l\'email, il secondo contatto', () => {
  const d = doc([PIENE.testa, { ...PIENE.lavori, voci: PIENE.lavori.voci.slice(0, 2) }, { ...PIENE.collaborazioni, voci: PIENE.collaborazioni.voci.slice(0, 2) }, { ...PIENE.link, voci: PIENE.link.voci.slice(0, 2) }, PIENE.contatti]);
  const imp = K.impagina(tela(), d);
  const url = imp.pagine.flatMap((_, n) => K.disegnaPagina(tela(), d, imp, n).link.map((l) => l.url));
  for (const atteso of ['https://twitch.tv/andryx', 'https://lavoro.it/0', 'https://lavoro.it/1', 'https://m.it', 'https://sito.it/0', 'https://sito.it/1', 'mailto:collaborazioni.con.un.nome.lungo@dominio.example', 'https://cal.example']) {
    assert.ok(url.includes(atteso), atteso);
  }
  assert.equal(url.filter((u) => u === 'https://m.it').length, 1, 'un marchio senza link non diventa un link');
});

test('i titoli in maiuscolo spaziato finiscono nello strato di testo, interi', () => {
  const d = doc([PIENE.testa, { ...PIENE.testo, testo: 'ciao', titolo: 'Chi sono' }, PIENE.contatti]);
  const imp = K.impagina(tela(), d);
  const R = K.disegnaPagina(tela(), d, imp, 0);
  assert.ok(R.testi.some((x) => x.testo === 'CHI SONO'), 'si cerca la parola, non le lettere una per una');
  assert.ok(R.testi.some((x) => x.testo === 'PER LAVORARE INSIEME'));
});

test('i miei colori: il testo si legge sempre, l\'accento si vede o prende il colore del testo', () => {
  const passi = ['00', '44', '88', 'cc', 'ff'];
  for (const f of passi) for (const t of passi) for (const a of passi) {
    const fondo = `#${f}${t}${a}`, testo = `#${a}${f}${t}`, accento = `#${t}${a}${f}`;
    const v = K.veste({ fondo, testo, accento });
    assert.ok(K.contrasto(v.testo, v.bg) >= 4.5, `testo ${testo} su ${fondo}`);
    assert.ok(K.contrasto(v.tenue, v.bg) >= 4.5, `il grigio dei dettagli su ${fondo}`);
    assert.ok(v.acc === v.testo || K.contrasto(v.acc, v.bg) >= 3, `accento ${accento} su ${fondo}`);
    assert.equal(v.corretti.testo, v.testo !== testo);
  }
});

test('i numeri non lasciano un riquadro da solo nell\'ultima riga', () => {
  for (let n = 2; n <= 7; n++) {
    const voci = Array.from({ length: n }, (_, i) => ({ valore: `V${i}`, etichetta: 'x' }));
    const t = tela();
    const d = doc([{ tipo: 'numeri', titolo: 'I numeri', voci, larghezza: 'piena' }]);
    const imp = K.impagina(t, d);
    K.disegnaPagina(t, d, imp, 0);
    const righe = new Map();
    for (const sc of t.scritte.filter((x) => /^V\d$/.test(x.t))) righe.set(sc.y, (righe.get(sc.y) || 0) + 1);
    const ultima = righe.get(Math.max(...righe.keys()));
    assert.ok(ultima >= 2, `${n} numeri: l'ultima riga ne ha ${ultima}`);
  }
});

test('lo strato di testo segue l\'ordine di lettura: sulla stessa riga, da sinistra a destra', () => {
  // Chi copia dal PDF deve leggere «Just Chatting 38%», non «38%Just Chatting».
  const d = doc(Object.values(PIENE).map((s) => ({ ...s, voci: s.voci?.slice(0, 2) })), { titoli: 'maiuscolo' });
  const imp = K.impagina(tela(), d);
  imp.pagine.forEach((_, n) => {
    const R = K.disegnaPagina(tela(), d, imp, n);
    for (let i = 1; i < R.testi.length; i++) {
      const a = R.testi[i - 1], b = R.testi[i];
      if (Math.abs(a.y - b.y) < 1) assert.ok(b.x > a.x, `pagina ${n + 1}: «${b.testo}» viene dopo «${a.testo}» ma sta alla sua sinistra`);
    }
  });
});
