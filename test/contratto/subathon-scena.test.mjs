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

test('i due pezzi della subathon ci sono in ogni overlay, anche in quelli gia\' fatti, e si possono nascondere', () => {
  for (const k of ['subathon', 'subregole']) {
    assert.equal(SERVER._mostraDefault()[k], true, `${k}: senza overlay salvati`);
    const [ov] = SERVER.overlaysDi({ overlays: [{ id: 'a', mostra: { chat: true }, occasioni: [{ id: 'o', mostra: { chat: false } }] }] });
    assert.notEqual(ov.mostra[k], false, `${k}: un overlay salvato senza la chiave la mostra`);
    assert.equal(SERVER._mostraDiOverlay({})[k], true, `${k}: salvando una base senza la chiave non diventa spenta`);
    const [nascosta] = SERVER.overlaysDi({ overlays: [{ id: 'b', mostra: { [k]: false } }] });
    assert.equal(nascosta.mostra[k], false, `${k}: nascosta dallo streamer resta nascosta`);
    assert.ok(SERVER.CHIAVE_EL.test(k), `${k}: ha la sua posizione per overlay`);
    assert.ok(Object.keys(SERVER._xyDiOverlay({ [k]: { x: 10, y: 20 } })).includes(k));
  }
  assert.ok(/const SPENTI_DI_SERIE = new Set\(\['invito'\]\);/.test(APP) && /const SPENTI_DI_SERIE = \['invito'\];/.test(OVL), 'la stessa regola nel pannello e nella pagina');
});

test('la subathon non conosce il conto alla rovescia: nel suo codice non c\'e\' un riferimento a overlayStato.timer', () => {
  for (const f of ['src/features/subathon.js', 'src/web/public/subathon.js']) {
    const t = leggi(f).replace(/setTimeout|clearTimeout/g, '');
    assert.doesNotMatch(t, /\btimer\b|overlayTimer|timerDi/i, `${f} non legge ne\' scrive il conto alla rovescia`);
  }
  const corpoSb = ALERTS.slice(ALERTS.indexOf('  _subathonInScena(channel, s) {'), ALERTS.indexOf('  // Prova dal pannello.'));
  assert.doesNotMatch(corpoSb, /overlayStato\?*\.timer|tipo: 'timer'|impostaTimer|_partiTimer/, 'nemmeno la parte della subathon nel motore degli alert');
  const conto = corpo(ALERTS, '  impostaTimer(channel, minuti) {', '\n  }\n');
  assert.doesNotMatch(conto, /subathon/i, 'e il «Fai partire» del conto non apre una sessione della subathon');
});

test('la configurazione di serie e\' la stessa nel pannello e nel server', () => {
  const vuoti = new Function(riga(APP, 'SB_TESTI_VUOTI') + ' return SB_TESTI_VUOTI;')();
  const window = { SB_SUBATHON: globalThis.SB_SUBATHON };
  const val = (inizio) => new Function('window', 'SB_TESTI_VUOTI', 'SB_PEZZI_DEF', 'return (' + ritorno(APP, inizio) + ')')(window, vuoti, () => ({ titolo: true, conto: true, sale: true, pausa: true, felice: true, totale: true, durata: false, traguardo: true, ultimi: true, migliori: false }));
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

test('in scena la subathon legge il suo orologio dalla vista, e si vede da sola solo mentre corre', () => {
  const acceso = corpo(OVL, 'function sbInCorsa() {') + corpo(OVL, 'function subathonAcceso() {') + corpo(OVL, 'function disegnaSubathon() {');
  assert.doesNotMatch(acceso, /timerFine|timerPausa/, 'l\'elemento non legge l\'istante del conto alla rovescia');
  assert.ok(/window\.SB_SUBATHON\.inPausa\(v\) \|\| \(Number\(v\.fine\) \|\| 0\) > oraScena\(\)/.test(acceso), 'in corsa o in pausa, e se ne va a zero');
  assert.ok(/window\.SB_SUBATHON\.disegna\(el, cfg, MIO\.sbVista,/.test(acceso));
  assert.ok(/case 'subathon': return d\.tipo;/.test(OVL) && /if \(vale\('subathon', t\)\) MIO\.sbVista =/.test(OVL), 'la vista ha il suo numero d\'ordine: un tema vecchio non la riporta indietro');
  assert.doesNotMatch(OVL.slice(OVL.indexOf("else if (dati.tipo === 'timer')"), OVL.indexOf('\n', OVL.indexOf("else if (dati.tipo === 'timer')"))), /Subathon/, 'il conto alla rovescia che si muove non ridisegna la subathon');
  assert.ok(/\.\.\.subathonQui\(login, base, vis\),/.test(SRV), 'il tema porta il posto gia\' scelto per quell\'overlay');
  assert.ok(/<div class="wbox alto-centro" data-ang="alto-centro"><\/div>/.test(HTML), 'l\'angolo in alto al centro c\'e\'');
  assert.ok(/if \(\(k === 'subathon' \|\| k === 'subregole'\) && _cfgEl\(k\)\.posizione === 'auto'\) return _sbPostoAuto\(k\);/.test(APP), 'la tela usa la stessa regola');
  assert.ok(/S\.postiAuto\(_sbOccupati\(\), c\('subathon'\), c\('subregole'\)\)/.test(APP) && /const scelto = postiSubathon\(/.test(SRV) && /export const postiSubathon = \(s, vis, contatori, sub, regole\) => SB\.postiAuto\(occupatiInScena\(s, vis, contatori\), sub, regole\);/.test(leggi('src/web/stile.js')), 'una regola sola, SB_SUBATHON.postiAuto, di qua e di la\'');
});

test('le rotte della scheda hanno il loro guardiano, e i tasti portano un id', () => {
  for (const r of ["app.get('/api/streamer/subathon', requireLogin", "app.post('/api/streamer/subathon/azione', requireLogin", "app.post('/api/streamer/subathon/avvia', requireLogin", "app.post('/api/streamer/subathon/ferma', requireLogin", "app.post('/api/streamer/subathon/prova', requireLogin"]) assert.ok(SRV.includes(r), r);
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
