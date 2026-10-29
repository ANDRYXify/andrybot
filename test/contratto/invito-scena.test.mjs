// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// L'OVERLAY DEI PEW (docs/OVERLAY.md, «L'overlay dei Pew»). Due pezzi nuovi:
// `pew`, una chiave SENZA POSTO che accende i colpi degli spettatori per
// overlay (un colpo segue lei, non gli effetti), e `invito`, un elemento col
// posto fatto come il nome del comando, che NASCE SPENTO: e' l'unica chiave per
// cui «non scritta» non vuol dire «accesa», e solo nelle basi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normInvito, testoInvito, TESTI_INVITO, xyOk } from '../../src/web/stile.js';

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const APP = leggi('src/web/public/app.js');
const SRV = leggi('src/web/server.js');
const OVL = leggi('src/web/public/overlay-app.js');
const HTML = leggi('src/web/public/overlay.html');
const SKIN = leggi('src/web/public/overlay-skin.css');
const ALERTS = leggi('src/features/alerts.js');
const RIQ = leggi('src/web/public/riquadro.js');

const riga = (testo, nome) => { const m = new RegExp(`const ${nome} = [^;]+;`).exec(testo); assert.ok(m, `manca ${nome}`); return m[0]; };
const corpo = (testo, inizio, fine = '\n}\n') => { const i = testo.indexOf(inizio); assert.ok(i >= 0, `manca ${inizio}`); return testo.slice(i, testo.indexOf(fine, i) + fine.length); };
const oggetto = (testo, inizio) => {
  const i = testo.indexOf(inizio);
  assert.ok(i >= 0, `manca ${inizio}`);
  const da = testo.indexOf('return {', i) + 7;
  let d = 0;
  for (let j = da; j < testo.length; j++) { if (testo[j] === '{') d++; else if (testo[j] === '}') { d--; if (!d) return new Function('return (' + testo.slice(da, j + 1) + ')')(); } }
  return null;
};

// Le regole del server su `mostra`, prese dal sorgente cosi' come sono.
const SERVER = new Function('xyOk', [
  riga(SRV, 'ELEM_OVERLAY'), riga(SRV, 'SPENTI_DI_SERIE'), corpo(SRV, 'const spentiDiSerie = (m) => {', '\n};\n'),
  riga(SRV, 'SENZA_POSTO_EL'), riga(SRV, '_mostraDefault'), riga(SRV, 'EREDITA_MOSTRA'), corpo(SRV, 'const ereditaMostra = (m) => {', '\n};\n'),
  riga(SRV, 'FAMIGLIE_EL'), riga(SRV, 'CHIAVE_EL'), riga(SRV, 'CHAT_DA'), riga(SRV, 'CHIAVE_CHAT'),
  corpo(SRV, 'const _mostraDiOverlay = (m) => {', '\n};\n'), corpo(SRV, 'const _blocchiDiOverlay = (b) => {', '\n};\n'),
  corpo(SRV, 'const _xyDiOverlay = (xy) => {', '\n};\n'), corpo(SRV, 'const _mostraDiffOverlay = (m) => {', '\n};\n'),
  riga(SRV, 'baseDiSerie'), corpo(SRV, 'function overlaysDi(settings) {'),
  'return { _mostraDefault, ereditaMostra, _mostraDiOverlay, _mostraDiffOverlay, _xyDiOverlay, _blocchiDiOverlay, overlaysDi, SPENTI_DI_SERIE };',
].join('\n'))(xyOk);

test('l\'invito nasce spento nelle basi, e solo nelle basi', () => {
  assert.equal(SERVER._mostraDefault().invito, false, 'senza overlay salvati');
  assert.equal(SERVER._mostraDefault().chat, true, 'gli altri restano accesi');
  const [ov] = SERVER.overlaysDi({ overlays: [{ id: 'a', mostra: { chat: true }, occasioni: [{ id: 'o', mostra: { chat: false } }] }] });
  assert.equal(ov.mostra.invito, false, 'un overlay salvato senza la chiave la trova spenta, scritta');
  assert.ok(!('invito' in ov.occasioni[0].mostra), 'un\'occasione senza la chiave resta senza: vuol dire «come la base»');
  const [scritto] = SERVER.overlaysDi({ overlays: [{ id: 'b', mostra: { invito: true } }] });
  assert.equal(scritto.mostra.invito, true, 'scritta accesa, vale accesa');
  assert.equal(SERVER._mostraDiOverlay({}).invito, false, 'salvando una base senza la chiave');
  assert.equal(SERVER._mostraDiOverlay({ invito: true }).invito, true);
  assert.equal(SERVER._mostraDiOverlay({}).etichetta, true, 'la regola del «no» resta per tutti gli altri');
  assert.ok(!('invito' in SERVER._mostraDiffOverlay({ chat: false })), 'le differenze di un\'occasione non si riempiono');
  assert.equal(SERVER._mostraDiffOverlay({ invito: true }).invito, true);
});

test('la stessa lista di chiavi spente di serie nel server, nel pannello e nella pagina dell\'overlay', () => {
  const lista = (testo, re) => { const m = re.exec(testo); assert.ok(m, String(re)); return JSON.parse(m[1].replace(/'/g, '"')); };
  const srv = lista(SRV, /const SPENTI_DI_SERIE = (\[[^\]]*\]);/);
  assert.deepEqual(lista(APP, /const SPENTI_DI_SERIE = new Set\((\[[^\]]*\])\);/), srv);
  assert.deepEqual(lista(OVL, /const SPENTI_DI_SERIE = (\[[^\]]*\]);/), srv);
  assert.deepEqual(srv, ['invito']);
  assert.ok(/const mostra = \(k\) => \(MIO\.mostra\[k\] === undefined \? SPENTI_DI_SERIE\.indexOf\(k\) < 0 : MIO\.mostra\[k\] !== false\);/.test(OVL), 'in diretta la chiave non scritta vale come nel server');
});

test('nel pannello: si legge con la stessa regola, e accendere nella base scrive invece di cancellare', () => {
  const P = new Function([riga(APP, 'SPENTI_DI_SERIE'), riga(APP, '_acceso'), 'let base = {}; const _occAttuale = () => null; const _baseMostra = () => base;',
    corpo(APP, 'function _accendiQui(k, si) {'), 'return { _acceso, _accendiQui, base: () => base };'].join('\n'))();
  assert.equal(P._acceso({}, 'invito'), false);
  assert.equal(P._acceso({}, 'chat'), true);
  assert.equal(P._acceso({ invito: true }, 'invito'), true);
  P._accendiQui('invito', true);
  assert.equal(P.base().invito, true, 'accesa e scritta: cancellarla vorrebbe dire spegnerla');
  P._accendiQui('chat', false); P._accendiQui('chat', true);
  assert.ok(!('chat' in P.base()), 'per gli altri si scrive solo il «no»');
  for (const fn of ['const _differisce', 'const _mostraOra', 'const _quiDentro']) {
    assert.ok(/_acceso\(/.test(APP.slice(APP.indexOf(fn), APP.indexOf('\n', APP.indexOf(fn) + 40) + 200)), `${fn} legge con _acceso`);
  }
  assert.ok(/mostra: ELEM_OVL\.reduce\(\(o, k\) => \(o\[k\] = !SPENTI_DI_SERIE\.has\(k\), o\), \{\}\),/.test(APP), 'un overlay nuovo nasce con l\'invito spento, scritto');
});

test('l\'invito e\' un elemento come gli altri, di qua e di la\' dal filo', () => {
  assert.deepEqual(oggetto(APP, 'function _defInvito()'), normInvito({}), 'il pannello parte dalla stessa configurazione del server');
  const d = normInvito({});
  assert.deepEqual([d.attivo, d.posizione, d.testo, d.stile.sfondo, d.stile.opacita, d.stile.testo, d.stile.accento, d.stile.bordoRaggio], [true, 'basso-centro', '', '#100d16', 80, '#ffffff', '#f72fa7', 14]);
  assert.equal(normInvito({ testo: 'x'.repeat(300) }).testo.length, 140);
  assert.ok(/const ELEM_OVERLAY = \[[^\]]*'invito'/.test(SRV) && /const ELEM_OVL = \[[^\]]*'invito'/.test(APP));
  assert.ok(/out\.push\(\{ k: 'invito', ico: ICO\.scrivi, n: L\('Invito ai Pew'[^}]*cfg: 'overlayInvito' \}\);/.test(APP));
  assert.ok(/const VESTITORE = \{[^}]*\binvito: _vestiInvito\b/.test(APP) && /\['invito', '#sez-invito'\]/.test(APP) && /id="sez-invito"/.test(APP));
  assert.ok(/data-c="testo" maxlength="140"/.test(APP), 'il testo si scrive nel pannello, col tetto del server');
  assert.ok(/if \(b\.overlayInvito !== undefined\) out\.overlayInvito = normInvito\(b\.overlayInvito\);/.test(SRV));
  assert.ok(/\['overlayCss'[^\]]*'overlayInvito'[^\]]*'colpi'\]\.some\(\(k\) => k in out\)/.test(SRV), 'salvarlo, o salvare i Pew, avvisa gli overlay aperti');
  assert.ok(/invito: \(s\.overlayInvito && typeof s\.overlayInvito === 'object'\) \? s\.overlayInvito : null,/.test(ALERTS), 'il tema del canale lo porta');
  assert.ok(/invito: invitoInScena\(login, base\.invito\),/.test(SRV), 'e il tema dell\'overlay lo porta risolto');
  assert.ok(/'etichetta', 'invito', 'scritta'/.test(RIQ), 'nell\'ordine dei livelli, accanto al nome del comando');
});

test('il testo lo risolve il server: quello dello streamer o quello di serie nella lingua della chat, e solo coi Pew accesi', () => {
  const v = { canale: 'Andry', comando: 'pew', pagina: 'pew.socialbot.live/andry' };
  assert.equal(testoInvito('', 'it', v), 'Attacca Andry: scrivi !pew in chat ed entra nella pagina che esce');
  assert.equal(testoInvito('', 'es', v), 'Ataca a Andry: escribe !pew en el chat y entra en la página que aparece');
  assert.equal(testoInvito('', 'de', v), testoInvito('', 'it', v), 'una lingua che non c\'e\' parla italiano');
  assert.equal(testoInvito('Vai su {pagina} e scrivi !{comando}', 'en', v), 'Vai su pew.socialbot.live/andry e scrivi !pew');
  const fn = corpo(SRV, 'function invitoInScena(login, cfg) {', '\n  }\n');
  assert.ok(/colpiMod\.normalizza\(streamers\.get\(login\)\?\.settings\?\.colpi\)/.test(fn) && /acceso: pew\.attivo && !pew\.pausa/.test(fn), 'acceso = i Pew del canale accesi e non in pausa');
  assert.ok(/pew\.comando \|\| colpiMod\.COMANDO_SERIE/.test(fn) && /colpiMod\.urlPaginaColpo\(login\)\.replace\(\/\^https:\\\/\\\/\/, ''\)/.test(fn) && /linguaChat\(login\)/.test(fn));
  const pannello = new Function(corpo(APP, 'const _TESTI_INVITO = () => ({', '\n});\n') + 'return _TESTI_INVITO();')();
  assert.deepEqual(pannello, { ...TESTI_INVITO }, 'la tela scrive gli stessi testi di serie della diretta');
});

test('in diretta si vede finche\' e\' acceso qui, acceso il pezzo e accesi i Pew; e si posa come gli altri', () => {
  assert.ok(/function invitoAcceso\(\) \{ return mostra\('invito'\) && !!MIO\.invito && MIO\.invito\.attivo !== false && MIO\.invito\.acceso === true && !!MIO\.invito\.testo; \}/.test(OVL));
  assert.ok(/function posaInvito\(\) \{ posizionaContenitore\(invitoBox, MIO\.xy\.invito, 'basso-centro'\); \}/.test(OVL));
  assert.ok(/MIO\.invito = t\.invito \|\| null;\n  disegnaInvito\(\);/.test(OVL));
  const dis = corpo(OVL, 'function disegnaInvito() {');
  assert.ok(dis.indexOf('el.textContent = MIO.invito.testo') < dis.indexOf('posaInvito()'), 'la posa dopo il contenuto');
  assert.ok(/<div id="invito" class="basso-centro" data-el="invito"><\/div>/.test(HTML) && /#invito\.basso-centro \{ bottom: 10vh; left: 50%; transform: translateX\(-50%\); \}/.test(HTML), 'il contenitore all\'angolo che lo Studio conosce');
  assert.ok(/^\.ovl-invito \{/m.test(SKIN) && ['piccola', 'media', 'grande', 'enorme'].every((d) => new RegExp(`\\.ovl-invito\\.dim-${d} \\{ font-size:`).test(SKIN)), 'la veste nella pelle, in ogni grandezza');
});

test('un colpo segue pew, in tutto; e pew dove gli effetti erano spenti resta spento', () => {
  assert.ok(/const ELEM_OVERLAY = \[[^\]]*'pew'/.test(SRV) && /const ELEM_OVL = \[[^\]]*'pew'/.test(APP));
  assert.equal(SERVER.ereditaMostra({ effetti: false }).pew, false, 'la «Solo chat» resta senza colpi');
  assert.equal(SERVER.ereditaMostra({ effetti: false, pew: true }).pew, true, 'scritto, vale per conto suo');
  assert.ok(/if \(dati\.tipo === 'audio'\) \{ if \(mostra\(eColpo\(dati\) \? 'pew' : 'effetti'\)\) suona\(dati\); \}/.test(OVL), 'anche il suono di un colpo');
  assert.ok(/\{ if \(mostra\(eColpo\(dati\) \? 'pew' : 'effetti'\) && colpoNuovo\(dati\)\) \{ codaVisiva\.push\(dati\);/.test(OVL), 'immagini, video, disegni, lanci');
  assert.ok(/if \(!mostra\(eColpo\(codaVisiva\[i\]\) \? 'pew' : 'effetti'\)\) codaVisiva\.splice\(i, 1\);/.test(OVL), 'la coda');
  assert.ok(/return mostra\('pew'\) && obsAttivo/.test(OVL), 'e il «sono pronto» al server');
  assert.ok(/'effetti', 'pew', 'pen'/.test(RIQ), 'nell\'ordine, subito dopo gli effetti');
});

test('pew non ha posto: il server non ne scrive la posizione, il pannello ne salta le parti posizionali', () => {
  assert.deepEqual(Object.keys(SERVER._xyDiOverlay({ pew: { x: 10, y: 10 }, chat: { x: 10, y: 10 } })), ['chat']);
  assert.deepEqual(SERVER._blocchiDiOverlay({ pew: true, chat: true }), { chat: true });
  assert.ok(/const SENZA_POSTO = new Set\(\['pew'\]\);/.test(APP));
  assert.ok(/out\.push\(\{ k: 'pew', ico: ICO\.target, n: L\('Pew \(i colpi degli spettatori\)'[^}]*\) \}\);/.test(APP), 'nella colonna dei livelli, senza configurazione: niente nodo sulla tela');
  assert.ok(/pew: \['colpi', T_SCHEDA\.colpi, 'mira'\],/.test(APP), 'l\'ispettore porta alla scheda Pew');
  for (const [nome, fine] of [['function _rendiLivelli()', '\n}\n'], ['function _aggiornaRigaLivello(', '\n}\n'], ['function aggiornaInspector()', '\n}\n'], ['function aggiornaPiedeBanco()', '\n}\n'],
    ['function _spostaTasti(', '\n}\n'], ['function allineaOvl(', '\n}\n'], ['function _scriviProp(', '\n}\n'], ['function _riquadroOn(', '\n}\n'], ['function _azzeraPos(', '\n}\n'],
    ['function _dragManiglia(', '\n}\n'], ['function _occMini(', '\n}\n'], ['function _passoLivello(', '\n}\n']]) {
    assert.ok(/SENZA_POSTO\.has\(/.test(corpo(APP, nome, fine)), `${nome} salta le chiavi senza posto`);
  }
  assert.ok(/\.ovl-inspector\.senza-posto \.ovl-insp-num/.test(leggi('src/web/public/anime.css')), 'l\'ispettore non mostra i campi di posizione');
});

test('l\'overlay dei Pew si crea per la strada di sempre, una volta sola', () => {
  const fn = corpo(APP, 'async function creaOverlayPew() {');
  assert.ok(/const voluto = \(k\) => k === 'pew' \|\| k === 'invito';/.test(fn));
  assert.ok(/overlays\.find\(\(o\) => ELEM_OVL\.every\(\(k\) => _acceso\(o\?\.mostra, k\) === voluto\(k\)\)\)/.test(fn) && /if \(gia\) return gia\.id;/.test(fn), 'se c\'e\' gia\' ridà quello');
  assert.ok(fn.indexOf("api('/api/streamer/overlays')") < fn.indexOf('overlays.push('), 'parte dagli overlay salvati, non da una lista vuota');
  assert.ok(/await _spingiOverlays\(\);\n  await caricaOverlays\(\);/.test(fn) && /return id;/.test(fn));
});
