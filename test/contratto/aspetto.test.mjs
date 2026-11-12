// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// L'ASPETTO SU MISURA: LE GARANZIE STANNO NELLA FUNZIONE (docs/ASPETTO.md).
//
// Sopra la tavolozza di fabbrica c'e' la veste di chi usa il pannello. La
// calcola una funzione pura, `veste(scelte, tema)`, la stessa nel browser e
// sul server. Qui la si prova senza aprire niente: qualunque cosa uno scelga
// (o qualunque cosa sia rimasta salvata), la veste e' completa, si legge, non
// scrive niente quando non c'e' niente da scrivere, e il suo CSS non chiama
// nessun altro sito.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

cartellaUsaEGetta('andrybot-aspetto-');

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const { pulisci, diSerie, scelteDi, salvaScelte } = await import('../../src/features/aspetto-persona.js');
const { streamers } = await import('../../src/db.js');
const { TAVOLOZZA } = await import('../../src/web/tavolozza.js');
const A = globalThis.SB_ASPETTO;
const TEMA_CSS = leggi('src/web/public/tema.css');

const fondi = (x) => [x['--bg'], x['--surface'], x['--surface-2-tinta'], x['--surface-3-tinta']];
const peggiore = (c, su) => Math.min(...su.map((f) => A.contrasto(c, f)));

// Le promesse di lettura del punto 8, misurate su una veste gia' calcolata.
function siLegge(v, dove) {
  const x = v.vars, f = fondi(x);
  const lato = f.map((c) => A.luce(c) < 0.18);
  assert.ok(lato.every((s) => s === lato[0]), `${dove}: pagina, carta e superfici stanno dalla stessa parte`);
  assert.equal(v.tema, lato[0] ? 'dark' : 'light', `${dove}: il tema dipinto lo decide il colore`);
  const chiedi = (nome, c, su, soglia) => assert.ok(peggiore(c, su) >= soglia - 1e-9, `${dove}: ${nome} ${c} a ${peggiore(c, su).toFixed(2)} (minimo ${soglia})`);
  chiedi('il testo', x['--testo'], f, 4.5);
  chiedi('il testo tenue', x['--testo-2'], f, 4.5);
  chiedi('l\'evidenza', x['--acc'], f, 4.5);
  // l'evidenza si scrive anche sopra il suo velo (--acc-soft, --acc-tint): fino al 14% di se stessa su ogni fondo
  chiedi('l\'evidenza sul suo velo', x['--acc'], f.map((c) => A.mescola(c, x['--acc'], 0.14)).concat(x['--acc-soft']), 4.5);
  chiedi('la scritta sopra l\'evidenza', x['--su-acc'], [x['--acc'], x['--acc-600']], 4.5);
  chiedi('l\'inchiostro', x['--contorno'], f, 4.5);
  chiedi('la scritta sulla didascalia', x['--didascalia-testo'], [x['--contorno']], 4.5);
  chiedi('la scritta sopra il rosso', x['--su-rosso'], [x['--rosso']], 4.5);
  for (const k of ['verde', 'rosso', 'ambra']) chiedi(`il ${k}`, x['--' + k], f.concat(x[`--${k}-soft`]), 4.5);
  for (const k of ['vivo', 'caldo', 'vino']) chiedi(`la rampa (${k})`, x['--acc-' + k], f, 3);
  for (const g of ['def', 'bot', 'account']) assert.equal(x['--g-' + g], x['--testo-2']);
}

test('senza scelte, o con scelte guaste, non si scrive niente: resta la fabbrica', () => {
  for (const guasto of [undefined, null, 7, 'x', [], { chiaro: 'no', scuro: [1], carattere: 9, titoli: 'comic', grandezza: 'grande', angoli: {}, css: 12, estranea: 1 },
    { chiaro: { preset: 'constructor', pagina: 'rosso', acc: '#12', testo: 'rgb(0,0,0)' }, grandezza: 400 }]) {
    assert.ok(diSerie(guasto), JSON.stringify(guasto));
    for (const t of A.TEMI) {
      const v = A.veste(guasto, t);
      assert.deepEqual(v.vars, {});
      assert.equal(v.tema, t === 'scuro' ? 'dark' : 'light');
      assert.equal(v.grandezza, 100);
    }
    assert.equal(A.copia(guasto), null, 'niente da tenere nel browser');
  }
});

test('la ripulitura e\' una sola, arriva a un punto fermo e tiene solo la forma nota', () => {
  const sporca = { chiaro: { preset: 'neon', pagina: '#ABC', testo: ' #102030 ', acc: 'url(x)', estraneo: 1 }, scuro: { preset: 'boh', carta: '#12345' },
    carattere: 'serif', titoli: 'testo', grandezza: 117, angoli: 'tondi', tratto: 'marcato', ombre: 'nessuna', trama: 'liscia', puntatore: 'sistema', moto: 'leggero', css: 'a { color: red }', altro: true };
  const p = pulisci(sporca);
  assert.deepEqual(pulisci(p), p, 'ripulire due volte non cambia niente');
  assert.deepEqual(Object.keys(p).sort(), ['angoli', 'carattere', 'chiaro', 'css', 'grandezza', 'moto', 'ombre', 'puntatore', 'scuro', 'titoli', 'trama', 'tratto']);
  assert.deepEqual(p.chiaro, { preset: 'neon', pagina: '#aabbcc', carta: '', testo: '#102030', tenue: '', bordo: '', acc: '', inchiostro: '' });
  assert.deepEqual(p.scuro, { preset: '', pagina: '', carta: '', testo: '', tenue: '', bordo: '', acc: '', inchiostro: '' });
  assert.equal(p.grandezza, 115, 'la grandezza sta sui passi');
  assert.equal(pulisci({ grandezza: 84 }).grandezza, 85, 'al passo piu\' vicino');
  assert.equal(pulisci({ grandezza: 80 }).grandezza, 100);
  assert.equal(pulisci({ grandezza: 135 }).grandezza, 100);
  assert.ok(JSON.stringify(pulisci({ css: 'x'.repeat(50000) })).length < 12000, 'tutto sta in 12 kB');
  for (const k of Object.keys(A.MANOPOLE)) assert.equal(A.MANOPOLE[k][0], 'serie', `«${k}» parte da «di serie»`);
});

test('i preset sono quelli della pagina link, in un posto solo', () => {
  const pagina = leggi('src/features/linkpagina.js');
  assert.match(pagina, /import '\.\.\/web\/public\/aspetto\.js';\nconst \{ PRESET, PILE \} = globalThis\.SB_ASPETTO;/);
  assert.doesNotMatch(pagina, /const (PRESET|PILE) = \{/, 'nessuna seconda copia');
  assert.equal(Object.keys(A.PRESET).length, 15);
  for (const p of Object.values(A.PRESET)) assert.deepEqual(Object.keys(p), ['bg', 'bg2', 'testo', 'tenue', 'card', 'bordo', 'acc']);
  assert.deepEqual(Object.keys(A.PILE), ['system', 'inter', 'mono', 'serif', 'condensato', 'tondo', 'manga']);
  assert.ok(!A.MANOPOLE.carattere.includes('manga') && A.MANOPOLE.titoli.includes('testo'));
});

test('la copia dei colori di fabbrica combacia con tema.css', () => {
  const t = TAVOLOZZA;
  const da = { pagina: 'bg', carta: 'surface', testo: 'testo', tenue: 'testo-2', bordo: 'border', acc: 'acc', inchiostro: 'contorno', verde: 'verde', rosso: 'rosso', ambra: 'ambra' };
  for (const tema of A.TEMI) {
    for (const [ruolo, token] of Object.entries(da)) assert.equal(A.FABBRICA[tema][ruolo], t[tema][token], `${tema}.${ruolo} ↔ --${token}`);
  }
});

test('una veste e\' completa: ogni colore della radice e\' derivato, o dichiarato neutro', () => {
  // Chi porta un colore scritto (un esadecimale, un rgb) nella radice di
  // tema.css. Una veste che ne lasciasse fuori uno lo terrebbe di fabbrica
  // accanto a colori scelti, senza nessuna garanzia che si leggano insieme.
  const NEUTRI = {
    '--om-s': 'ombra sfocata: nero trasparente, sta sotto', '--om-m': 'come sopra', '--om-l': 'come sopra',
    '--sheen': 'riflesso: bianco trasparente',
    '--retino': 'nel tema scuro mescola l\'evidenza col bianco: segue --acc', '--cinetiche': 'come sopra',
    '--cursore': 'il disegno del puntatore: ha la sua manopola', '--cursore-mano': 'come sopra',
    '--ax-1': 'la firma, non un colore',
  };
  const veste = A.veste({ chiaro: { preset: 'neon' } }, 'chiaro').vars;
  const colorati = new Set();
  for (const m of TEMA_CSS.matchAll(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/gm)) {
    if (/#[0-9a-f]{3,8}\b|rgba?\(/i.test(m[2])) colorati.add(m[1]);
  }
  // sulla stessa riga ce ne possono stare tre (--verde: …; --verde-soft: …;)
  for (const m of TEMA_CSS.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-f]{3,8}|rgba?\([^)]*\))\s*;/gi)) colorati.add(m[1]);
  assert.ok(colorati.size >= 30, `trovo i colori di tema.css (${colorati.size})`);
  for (const nome of colorati) {
    assert.ok(nome in veste || nome in NEUTRI, `${nome} porta un colore e la veste non lo deriva: derivalo in aspetto.js o dichiaralo neutro qui, col perche'`);
  }
  for (const nome of Object.keys(NEUTRI)) assert.ok(!(nome in veste), `${nome} e' dichiarato neutro ma la veste lo scrive`);
  for (const nome of Object.keys(veste)) assert.ok(A.NOMI.includes(nome), `${nome} si scrive ma non si saprebbe togliere`);
  for (const nome of A.NOMI) assert.ok(new RegExp(`${nome}\\s*:`).test(TEMA_CSS), `${nome} non e' un token di tema.css: la manopola sarebbe finta`);
});

test('ogni preset si legge, in tutti e due i temi', () => {
  for (const p of Object.keys(A.PRESET)) {
    for (const t of A.TEMI) siLegge(A.veste({ [t]: { preset: p } }, t), `${p} nel tema ${t}`);
  }
});

test('qualunque colore si scelga, anche apposta per non leggersi, la veste si legge', () => {
  // Una griglia fissa, non un dado: i toni che mettono in difficolta' (i grigi
  // di mezzo, dove ne' il bianco ne' il nero bastano da soli) e i colori pieni.
  const TONI = ['#000000', '#ffffff', '#777777', '#808080', '#5a5a5a', '#9a9a9a', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#7a3b00', '#102a43', '#f2efe8', '#0f0a0e'];
  let quante = 0;
  for (const pagina of TONI) {
    for (const carta of ['', '#000000', '#ffffff', '#808080', pagina]) {
      for (const scritta of ['', pagina, '#808080', '#ffffff', '#000000']) {
        for (const t of A.TEMI) {
          const scelte = { [t]: { pagina, carta, testo: scritta, tenue: scritta, acc: scritta, inchiostro: scritta } };
          siLegge(A.veste(scelte, t), `pagina ${pagina}, carta ${carta || '—'}, scritte ${scritta || '—'}, tema ${t}`);
          quante++;
        }
      }
    }
  }
  assert.equal(quante, 16 * 5 * 5 * 2);
  // E su ogni preset, cambiando un colore solo.
  for (const p of Object.keys(A.PRESET)) {
    for (const ruolo of ['pagina', 'carta', 'testo', 'tenue', 'acc', 'inchiostro']) {
      for (const c of ['#000000', '#ffffff', '#808080']) siLegge(A.veste({ scuro: { preset: p, [ruolo]: c } }, 'scuro'), `${p} con ${ruolo} ${c}`);
    }
  }
});

test('un colore ritoccato si dice, uno lasciato com\'e\' no', () => {
  const buona = A.veste({ chiaro: { testo: '#102030' } }, 'chiaro');
  assert.deepEqual(buona.corretti, []);
  assert.equal(buona.ruoli.testo, '#102030', 'un colore che si legge resta quello scelto');
  const cattiva = A.veste({ chiaro: { testo: '#fdfbf6' } }, 'chiaro');
  assert.deepEqual(cattiva.corretti, ['testo']);
  assert.notEqual(cattiva.ruoli.testo, '#fdfbf6');
});

test('il tema dipinto lo decide il colore della pagina, non il posto', () => {
  assert.equal(A.veste({ chiaro: { preset: 'neon' } }, 'chiaro').tema, 'dark');
  assert.equal(A.veste({ scuro: { preset: 'minimal' } }, 'scuro').tema, 'light');
  assert.equal(A.veste({ chiaro: { preset: 'neon' } }, 'scuro').tema, 'dark', 'il tema che non ha una veste resta di fabbrica');
  assert.deepEqual(A.veste({ chiaro: { preset: 'neon' } }, 'scuro').vars, {});
});

test('le manopole della forma scrivono solo token veri, e «di serie» non scrive', () => {
  for (const [k, valori] of Object.entries(A.MANOPOLE)) {
    if (k === 'moto') continue;
    for (const val of valori) {
      const vars = A.veste({ [k]: val }, 'chiaro').vars;
      if (val === 'serie') assert.deepEqual(vars, {}, `${k}: di serie`);
      else assert.ok(Object.keys(vars).length > 0, `${k}=${val} non muove niente: e' una manopola finta`);
    }
  }
  // «Con le grazie» per il testo e' la pila con le grazie, non il testo senza
  // grazie che la pagina link mette sotto i titoli con le grazie; e due scelte
  // non fanno mai la stessa cosa (sarebbe una manopola finta a meta').
  assert.equal(A.veste({ carattere: 'serif' }, 'chiaro').vars['--testo-font'], A.PILE.serif.d);
  for (const k of ['carattere', 'titoli']) {
    const token = k === 'carattere' ? '--testo-font' : '--mano';
    const visti = A.MANOPOLE[k].filter((x) => x !== 'serie').map((x) => A.veste({ [k]: x }, 'chiaro').vars[token]);
    assert.equal(new Set(visti).size, visti.length, `le scelte di «${k}» sono tutte diverse`);
  }
  assert.ok(!A.MANOPOLE.carattere.includes('condensato') && A.MANOPOLE.titoli.includes('condensato'), 'il condensato e\' da titoli: sotto, la sua pila ha il testo del sistema');
  assert.equal(A.veste({ titoli: 'mono' }, 'chiaro').vars['--mano'], A.PILE.mono.d);
  assert.equal(A.veste({ titoli: 'testo' }, 'chiaro').vars['--mano'], 'var(--testo-font)');
  assert.equal(A.veste({ grandezza: 120 }, 'scuro').grandezza, 120);
  assert.deepEqual(A.veste({ moto: 'leggero' }, 'chiaro').vars, {}, 'il movimento non e\' un colore: lo porta l\'interruttore che c\'era');
});

test('il CSS della persona non apre connessioni, nemmeno a strati', () => {
  const VIETATI = /@import|url\s*\(|image-set\s*\(|src\s*\(|image\s*\(|expression\s*\(|javascript:|<\/?style|\\/i;
  const casi = [
    'a { background: url(https://altrove.example/x) }',
    'a { background: URL( "https://altrove.example/x" ) }',
    '@import "https://altrove.example/x.css";',
    '@im@importport url(x);',
    'a { background: ur\\6c (x) }',
    'a { background: u/**/rl(x) }',
    'a { background: uurl(rl(x) }',
    'a { background-image: image-set("x.png" 1x) }',
    'a { background: -webkit-image-set(url(x) 1x) }',
    '@font-face { font-family: x; src: src("x") }',
    'input[value^="a"] { background: image("https://altrove.example/a") }',
    '</sty</stylele><script>alert(1)</script>',
    'a { width: expression(alert(1)) } b { x: javajavascript:script:alert(1) }',
  ];
  for (const c of casi) {
    const pulito = A.cssSicuro(c);
    assert.doesNotMatch(pulito, VIETATI, `${c} → ${pulito}`);
    assert.equal(A.cssSicuro(pulito), pulito, 'e\' un punto fermo');
  }
  const buono = '.carta { border-style: dashed; color: color-mix(in srgb, red 20%, var(--testo)); }\n@media (min-width: 60rem) { .btn { letter-spacing: .02em } }';
  assert.equal(A.cssSicuro(buono), buono, 'un CSS che non chiama nessuno passa intero');
  assert.equal(A.cssSicuro(null), '');
  assert.ok(A.cssSicuro('a{}'.repeat(5000)).length <= A.CSS_MAX);
  assert.equal(pulisci({ css: 'a { background: url(x) }' }).css, 'a { background: x) }', 'la ripulitura delle scelte passa di li\'');
});

test('la copia per il primo disegno porta le variabili gia\' calcolate e le scelte', () => {
  const scelte = { chiaro: { preset: 'retro' }, grandezza: 110, css: '.x { color: red }' };
  const c = A.copia(scelte);
  assert.equal(c.v, 1);
  assert.equal(c.grandezza, 110);
  assert.deepEqual(c.chiaro, { tema: 'light', vars: A.veste(scelte, 'chiaro').vars });
  assert.deepEqual(c.scuro, { tema: 'dark', vars: {} });
  assert.deepEqual(c.scelte, pulisci(scelte));
  for (const t of A.TEMI) for (const val of Object.values(c[t].vars)) assert.doesNotMatch(String(val), /url\(|\\/i, 'niente che tema.js debba scartare');
  const TEMA_JS = leggi('src/web/public/tema.js');
  assert.match(TEMA_JS, /localStorage\.getItem\('aspetto'\)/);
  assert.match(TEMA_JS, /aspetto=serie/, 'l\'uscita di sicurezza vale gia\' al primo disegno');
  assert.match(TEMA_JS, /\(aspetto=serie\|demo=1\)/, 'e la demo non prende la veste di chi la guarda');
  const APP = leggi('src/web/public/app.js');
  assert.match(APP, /return q && q\.chi === stato\?\.identita && q\.scelte \? q\.scelte : null;/, 'la copia tenuta nel browser vale solo per chi l\'ha fatta');
  assert.match(APP, /if \(stato && !DEMO\) SB_ASPETTO\.conserva\(scelte\);/, 'e la demo non tocca la copia per il primo disegno');
});

test('il server tiene le scelte della persona e basta', async () => {
  const SERVER = leggi('src/web/server.js');
  assert.match(SERVER, /aspetto: aspettoPersona\.scelteDi\(ident\),/);
  assert.match(SERVER, /app\.post\('\/api\/persona\/aspetto', requireLogin, \(req, res\) => \{\n\s+const salvate = aspettoPersona\.salvaScelte\(identitaDi\(currentUser\(req\)\), req\.body\?\.aspetto\);/);
  streamers.upsertApproved('vesteprova', 'VesteProva');
  streamers.setSettings('vesteprova', { tono: 'allegro' });
  assert.equal(scelteDi('vesteprova'), null);
  const salvate = salvaScelte('VesteProva', { scuro: { preset: 'oro', acc: '#ABCDEF' }, angoli: 'tondi', css: '@import "x"; .a { color: red }', estranea: 1 });
  assert.deepEqual(salvate, pulisci(salvate));
  assert.deepEqual(scelteDi('vesteprova'), salvate);
  assert.equal(salvate.scuro.acc, '#abcdef');
  assert.doesNotMatch(salvate.css, /@import/);
  assert.equal(streamers.get('vesteprova').settings.tono, 'allegro', 'il resto delle impostazioni non si tocca');
  salvaScelte('vesteprova', {});
  assert.equal(scelteDi('vesteprova'), null);
  assert.ok(!('aspetto' in streamers.get('vesteprova').settings), '«di serie» toglie la chiave');
  assert.equal(salvaScelte('chi-non-ha-un-conto', { angoli: 'vivi' }), null, 'senza un conto suo si salva nel browser');
});

test('il documento dice quello che il codice fa', () => {
  const DOC = leggi('docs/ASPETTO.md');
  for (const k of Object.keys(A.MANOPOLE)) {
    const nome = { carattere: 'carattere', titoli: 'titoli', angoli: 'angoli', tratto: 'tratto', ombre: 'ombre', trama: 'trama', puntatore: 'puntatore', moto: 'movimento' }[k];
    assert.ok(new RegExp(`\\| ${nome} \\|`).test(DOC), `la manopola «${k}» e' nella tabella`);
  }
  assert.ok(DOC.includes(`${A.GRANDEZZA.min}–${A.GRANDEZZA.max} %`));
  assert.ok(DOC.includes('/?aspetto=serie'));
});
