// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA SUBATHON IN SCENA E NEL PANNELLO (docs/OVERLAY.md, «La subathon in scena»;
// docs/SUBATHON.md). Due elementi col posto fatti come gli altri, che nascono
// spenti negli overlay che ci sono gia'; un disegno solo per la tela e la
// diretta; la configurazione di serie uguale di qua e di la' dal filo; le rotte
// con il loro guardiano; la scheda registrata in ogni elenco.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-subathon-scena-');
const { normOverlaySubathon, normOverlaySubathonRegole, normSubathon, xyOk } = await import('../../src/web/stile.js');
test.after(() => usaEGetta.pulisci());

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const APP = leggi('src/web/public/app.js');
const SRV = leggi('src/web/server.js');
const OVL = leggi('src/web/public/overlay-app.js');
const HTML = leggi('src/web/public/overlay.html');
const INDEX = leggi('src/web/public/index.html');
const SKIN = leggi('src/web/public/overlay-skin.css');
const ALERTS = leggi('src/features/alerts.js');
const RIQ = leggi('src/web/public/riquadro.js');
const CERCA = leggi('src/web/public/cerca.js');

const riga = (testo, nome) => { const m = new RegExp(`const ${nome} = [^;]+;`).exec(testo); assert.ok(m, `manca ${nome}`); return m[0]; };
const corpo = (testo, inizio, fine = '\n}\n') => { const i = testo.indexOf(inizio); assert.ok(i >= 0, `manca ${inizio}`); return testo.slice(i, testo.indexOf(fine, i) + fine.length); };
const ritorno = (testo, inizio) => {
  const i = testo.indexOf(inizio);
  assert.ok(i >= 0, `manca ${inizio}`);
  const da = testo.indexOf('return {', i) + 7;
  let d = 0;
  for (let j = da; j < testo.length; j++) { if (testo[j] === '{') d++; else if (testo[j] === '}') { d--; if (!d) return testo.slice(da, j + 1); } }
  return null;
};

const SERVER = new Function('xyOk', [
  riga(SRV, 'ELEM_OVERLAY'), riga(SRV, 'SPENTI_DI_SERIE'), corpo(SRV, 'const spentiDiSerie = (m) => {', '\n};\n'),
  riga(SRV, 'SENZA_POSTO_EL'), riga(SRV, '_mostraDefault'), riga(SRV, 'EREDITA_MOSTRA'), corpo(SRV, 'const ereditaMostra = (m) => {', '\n};\n'),
  riga(SRV, 'FAMIGLIE_EL'), riga(SRV, 'CHIAVE_EL'), riga(SRV, 'CHAT_DA'), riga(SRV, 'CHIAVE_CHAT'),
  corpo(SRV, 'const _mostraDiOverlay = (m) => {', '\n};\n'), corpo(SRV, 'const _blocchiDiOverlay = (b) => {', '\n};\n'),
  corpo(SRV, 'const _xyDiOverlay = (xy) => {', '\n};\n'), corpo(SRV, 'const _mostraDiffOverlay = (m) => {', '\n};\n'),
  riga(SRV, 'baseDiSerie'), corpo(SRV, 'function overlaysDi(settings) {'),
  'return { _mostraDefault, _mostraDiOverlay, _mostraDiffOverlay, _xyDiOverlay, overlaysDi, CHIAVE_EL };',
].join('\n'))(xyOk);

test('i due pezzi della subathon nascono spenti nelle basi, e solo nelle basi', () => {
  for (const k of ['subathon', 'subregole']) {
    assert.equal(SERVER._mostraDefault()[k], false, `${k}: senza overlay salvati`);
    const [ov] = SERVER.overlaysDi({ overlays: [{ id: 'a', mostra: { chat: true }, occasioni: [{ id: 'o', mostra: { chat: false } }] }] });
    assert.equal(ov.mostra[k], false, `${k}: un overlay salvato senza la chiave la trova spenta, scritta`);
    assert.ok(!(k in ov.occasioni[0].mostra), `${k}: un\'occasione senza la chiave resta «come la base»`);
    assert.equal(SERVER._mostraDiOverlay({ [k]: true })[k], true);
    assert.ok(SERVER.CHIAVE_EL.test(k), `${k}: ha la sua posizione per overlay`);
    assert.ok(Object.keys(SERVER._xyDiOverlay({ [k]: { x: 10, y: 20 } })).includes(k));
  }
});

test('la configurazione di serie e\' la stessa nel pannello e nel server', () => {
  const vuoti = new Function(riga(APP, 'SB_TESTI_VUOTI') + ' return SB_TESTI_VUOTI;')();
  const window = { SB_SUBATHON: globalThis.SB_SUBATHON };
  const val = (inizio) => new Function('window', 'SB_TESTI_VUOTI', 'SB_PEZZI_DEF', 'return (' + ritorno(APP, inizio) + ')')(window, vuoti, () => ({ titolo: true, conto: true, sale: true, pausa: true, felice: true, totale: true, durata: false, traguardo: true, ultimi: true }));
  assert.deepEqual(val('function _defSubathon()'), normOverlaySubathon({}));
  assert.deepEqual(val('function _defSubregole()'), normOverlaySubathonRegole({}));
  const pezzi = new Function('return (' + /const SB_PEZZI_DEF = \(\) => (\(\{[^)]*\}\));/.exec(APP)[1] + ')')();
  assert.deepEqual(pezzi, normOverlaySubathon({}).pezzi);
  const testo = APP.slice(APP.indexOf('const _sbRegoleDiSerie = '), APP.indexOf('\n\nconst SB_FONTI_CAMPI'));
  const regole = new Function('window', 'SB_TESTI_VUOTI', testo + '\nreturn _sbRegoleDiSerie();')(window, vuoti);
  assert.deepEqual(regole, normSubathon({}), 'la demo e la scheda partono dalle regole di serie del server');
  assert.equal(normOverlaySubathon({}).attivo, true, 'acceso come pezzo: e\' `mostra` che lo tiene spento negli overlay di prima');
});

test('sono elementi come gli altri, di qua e di la\' dal filo', () => {
  for (const [k, cfg] of [['subathon', 'overlaySubathon'], ['subregole', 'overlaySubathonRegole']]) {
    assert.ok(new RegExp(`const ELEM_OVERLAY = \\[[^\\]]*'${k}'`).test(SRV) && new RegExp(`const ELEM_OVL = \\[[^\\]]*'${k}'`).test(APP), `${k}: la chiave`);
    assert.ok(new RegExp(`out\\.push\\(\\{ k: '${k}', [^}]*cfg: '${cfg}' \\}\\);`).test(APP), `${k}: nella colonna dei livelli, con la sua configurazione`);
    assert.ok(new RegExp(`\\['${k}', '#sez-${k}'\\]`).test(APP) && APP.includes(`id="sez-${k}"`), `${k}: la sezione nello Studio`);
    assert.ok(new RegExp(`if \\(b\\.${cfg} !== undefined\\) out\\.${cfg} = norm`).test(SRV), `${k}: il server la ripulisce`);
    assert.ok(new RegExp(`'${k}'`).test(RIQ.match(/var ORDINE_BASE = \[[^\]]*\]/)[0]), `${k}: nell'ordine dei livelli`);
  }
  assert.ok(/const VESTITORE = \{[^}]*\bsubathon: _vestiSubathon, subregole: _vestiSubregole\b/.test(APP));
  assert.ok(/const _DEF_EL = \{[^}]*subathon: _defSubathon, subregole: _defSubregole/.test(APP));
  assert.ok(/'overlayInvito', 'subathon', 'overlaySubathon', 'overlaySubathonRegole',[^\]]*\]\.some\(\(k\) => k in out\)/.test(SRV), 'salvarli, o salvare le regole, ricarica gli overlay aperti');
  assert.ok(/subathon: this\._subathonInScena\(channel, s\),\n\s+subregole: this\._subregoleInScena\(channel, s\),/.test(ALERTS), 'il tema li porta');
  assert.ok(/<script src="\/subathon\.js"><\/script>/.test(HTML) && /<script src="subathon\.js" defer><\/script>/.test(INDEX), 'il disegno condiviso e\' caricato da tutte e due le pagine');
  assert.ok(/^\.ovl-subathon \[hidden\] \{ display: none !important; \}/m.test(SKIN), 'un pezzo spento resta spento anche con un display suo');
  for (const d of ['piccola', 'media', 'grande', 'enorme']) assert.ok(new RegExp(`\\.ovl-subathon\\.dim-${d} \\{`).test(SKIN) && new RegExp(`\\.ovl-subregole\\.dim-${d} \\{`).test(SKIN), `la veste in ogni grandezza: ${d}`);
});

test('un disegno solo: la tela e la diretta chiamano la stessa funzione, con la stessa veste', () => {
  const tela = corpo(APP, 'function _vestiSubathon(box, cfg) {');
  const onda = corpo(OVL, 'function disegnaSubathon() {');
  assert.ok(/window\.SB_SUBATHON\.disegna\(box, /.test(tela) && /window\.SB_SUBATHON\.disegna\(el, cfg, /.test(onda));
  assert.ok(/'ovl-widget ovl-subathon dentro dim-' \+ \(st\.dim \|\| 'media'\) \+ ' ' \+ classiIdentita\(st, 'nessuna'\)/.test(tela));
  assert.ok(/'ovl-widget ovl-subathon dim-' \+ \(st\.dim \|\| 'media'\) \+ ' ' \+ classiIdentita\(st, 'nessuna'\)/.test(onda));
  for (const v of ['--bg', '--op', '--fg', '--acc', '--radius', '--font', '--dim-ico']) assert.ok(tela.includes(`'${v}'`), `la tela mette ${v}`);
  assert.ok(/vestiElemento\(el, cfg, 'nessuna', 'subathon'\);/.test(onda), 'la diretta la veste e la posa come gli altri');
  assert.ok(/\bS\.disegnaRegole\(box, cfg, righe, /.test(corpo(APP, 'function _vestiSubregole(box, cfg) {')) && /window\.SB_SUBATHON\.disegnaRegole\(el, cfg, cfg\.righe/.test(corpo(OVL, 'function disegnaSubregole() {')));
});

test('un orologio solo: l\'elemento legge l\'istante del conto alla rovescia, e il conto sa della pausa', () => {
  assert.ok(/function vistaSub\(\) \{ return Object\.assign\(\{\}, MIO\.sbVista \|\| \{\}, \{ fine: Number\(MIO\.timerFine\) \|\| 0, pausa: MIO\.timerPausa \|\| null \}\); \}/.test(OVL));
  assert.ok(/MIO\.timerPausa = pausaDi\(dati\.pausa\); disegnaTimer\(\); disegnaSubathon\(\);/.test(OVL), 'l\'istante e la pausa arrivano insieme');
  assert.ok(/if \(vale\('timer', t\)\) MIO\.timerPausa = pausaDi\(stato\.timer && stato\.timer\.pausa\);/.test(OVL), 'e dal tema, con il numero d\'ordine');
  assert.ok(/case 'subathon': return d\.tipo;/.test(OVL) && /if \(vale\('subathon', t\)\) MIO\.sbVista =/.test(OVL), 'la vista ha il suo numero d\'ordine: un tema vecchio non la riporta indietro');
  const timer = corpo(OVL, 'function disegnaTimer() {');
  assert.ok(/const manca = pausa \? pausa\.resta : fine - oraScena\(\);/.test(timer) && /\(!fine && !pausa\)/.test(timer), 'in pausa il conto resta fermo, non sparisce');
  assert.ok(/MIO\.timer\.partiDaSolo && mostra\('timer'\) && !MIO\.timerPausa && MIO\.timerFine <= adesso\(\)/.test(OVL), 'l\'apertura non fa ripartire un conto in pausa');
});

test('le rotte della scheda hanno il loro guardiano, e i tasti portano un id', () => {
  for (const r of ["app.get('/api/streamer/subathon', requireLogin", "app.post('/api/streamer/subathon/azione', requireLogin", "app.post('/api/streamer/subathon/avvia', requireLogin", "app.post('/api/streamer/subathon/prova', requireLogin"]) assert.ok(SRV.includes(r), r);
  assert.ok(/if \(!id\) return res\.status\(400\)/.test(corpo(SRV, "app.post('/api/streamer/subathon/azione'", '\n  }));\n')), 'un tasto senza id non muove niente: riprovare deve poter essere riconosciuto');
  assert.ok(/const body = \{ azione: az, id: _sbIdTasto\(\) \};/.test(APP), 'il pannello genera l\'id una volta per tasto');
});

test('la scheda Subathon e\' registrata in ogni elenco', () => {
  assert.ok(/\['subathon', 'Subathon'\]/.test(corpo(APP, 'const GRUPPI = [', '\n];\n')));
  for (const nome of ['T_SCHEDA', 'ICONA', 'DESC', 'GUIDE']) assert.ok(new RegExp(`^  subathon:`, 'm').test(corpo(APP, `const ${nome} = {`, '\n};\n')), nome);
  assert.ok(/^ {4}subathon: '/m.test(CERCA));
  assert.ok(/if \(id === 'subathon'\) avviaSubathon\(\);/.test(APP) && /\$\{pannelloSubathon\(\)\}/.test(APP));
  assert.ok(/schede: \[[^\]]*'subathon'/.test(leggi('src/web/manuali/it/diretta.js')) && /scheda: 'subathon'/.test(leggi('src/web/manuali/it/diretta.js')));
});
