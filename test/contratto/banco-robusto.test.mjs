// IL BANCO DEGLI OVERLAY: COMODO E ROBUSTO PER COSTRUZIONE.
//
// Le cose che si rompevano in silenzio: colori e font cambiati nell'ispettore
// non sporcavano la pagina (ricaricare li perdeva senza un avviso), ogni visita
// alla scheda legava di nuovo gli ascoltatori (N salvataggi per un clic), i
// salvataggi si sorpassavano in rete, un errore di rete non si diceva, la
// griglia non si toglieva, lo zoom scappava in alto a sinistra, e il pannello
// dei livelli si ridisegnava a ogni pixel di trascinamento.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const APP = leggi('src/web/public/app.js');
const SRV = leggi('src/web/server.js');
const ANIME = leggi('src/web/public/anime.css');
const SKIN = leggi('src/web/public/overlay-skin.css');

const corpoDi = (nome) => {
  const i = APP.indexOf(`function ${nome}(`);
  assert.ok(i >= 0, `c'e' ${nome}`);
  let liv = 0, dentro = false;
  for (let j = APP.indexOf('{', i); j < APP.length; j++) {
    if (APP[j] === '{') { liv++; dentro = true; }
    else if (APP[j] === '}') { liv--; if (dentro && liv === 0) return APP.slice(i, j + 1); }
  }
  return '';
};

test('l\'aspetto cambiato nell\'ispettore sporca la pagina; posizioni e configurazioni no, perche\' si salvano da sole', () => {
  assert.ok(/const ASP_SALVA_A_MANO = '\.asp-blocco\[data-asp="alert"\], \.asp-blocco\[data-asp="chat"\], \.asp-blocco\[data-asp="wf"\], \.asp-blocco\[data-asp="ws"\]';/.test(APP),
    'i quattro blocchi che escono solo con «Salva overlay» hanno un nome');
  assert.ok(/if \(t\.closest\('#tg-destinazioni, \.ovl-testa-banco, \.ovl-barra, \.ovl-livelli, \.cerca-guscio'\)\) return;\n\s*if \(t\.closest\('\.ovl-inspector'\) && !t\.closest\(ASP_SALVA_A_MANO\)\) return;/.test(APP),
    'l\'ispettore non e\' piu\' escluso in blocco: lo sono solo le sue parti che si salvano da sole');
  const sc = corpoDi('scegliOverlay');
  assert.ok(/_salvaSporco/.test(sc) && /_chiediPrimaDiUscire\(\)/.test(sc), 'cambiare overlay con l\'aspetto non salvato chiede prima');
});

test('gli ascoltatori dell\'editor si legano una volta sola, e un elemento si rende trascinabile una volta sola', () => {
  const ca = corpoDi('caricaAlert');
  const iGuardia = ca.indexOf("if (scheda?.dataset.collegato) { scalaAnteprima(); aggiornaAnteprima(); return; }");
  assert.ok(iGuardia >= 0, 'la guardia c\'e\'');
  const dopo = ca.slice(iGuardia);
  const prima = ca.slice(0, iGuardia);
  assert.ok(!/addEventListener\(/.test(prima), 'prima della guardia nessun ascoltatore');
  assert.ok((dopo.match(/addEventListener\(/g) || []).length > 20, 'dopo la guardia stanno tutti');
  assert.ok(/function rendiTrascinabile\(el, chiave\) \{\n  if \(!el \|\| el\.dataset\.trascinabile\) return;\n  el\.dataset\.trascinabile = '1';/.test(APP), 'rendiTrascinabile non si ripete');
});

test('i salvataggi dell\'overlay passano da una coda sola, e la rete che cade si dice', () => {
  assert.ok(/function _spingiOverlays\(extra\)/.test(APP), 'c\'e\' la coda');
  assert.ok(/if \(_codaOverlay\) \{ _codaAncora = true; return _codaOverlay; \}/.test(APP), 'una richiesta in volo per volta: le altre si accodano e si fondono');
  assert.ok(!/salvaImpostazioni\(\{ overlays: _overlaysPayload\(\) \}/.test(APP), 'nessuno spedisce gli overlay saltando la coda');
  assert.ok(/const ok = await _spingiOverlays\(\{ alerts: alertsCanale, chatOverlay: chatCanale \}\);/.test(APP), 'anche «Salva overlay» passa dalla coda');
  assert.ok(/if \(!ok\) \{ _salvaSporco = true; _salvaChiusa = false; aggiornaBarraSalva\(\); return; \}/.test(APP), 'se non riesce, la pagina resta sporca');
  assert.ok(!/\.catch\(\(\) => \{\s*\}\)/.test(corpoDi('salvaCfgElemento') + corpoDi('salvaGoalDaScena') + corpoDi('salvaContoDaScena')), 'nessun errore di rete ingoiato in silenzio');
  assert.equal((APP.match(/(?<!function )_avvisaSalvataggio\(\)/g) || []).length, 4, 'l\'avviso e\' uno, usato da tutti (coda + tre salvataggi a tempo)');
  assert.equal((APP.match(/await _spingiOverlays\(\);/g) || []).length, 5, 'nuovo, duplica, rinomina, elimina e il layout passano tutti dalla coda');
  assert.ok(!/function _salvaFamiglia/.test(APP), 'niente funzione morta');
  assert.ok(/function _salvaPos\(chiave\) \{\n  const e = chiave \? ELEM\(chiave\) : null;\n  if \(e && e\.cont\) salvaContoDaScena\(e\.cont\);/.test(APP), 'il ripristino di un contatore si salva davvero');
});

test('l\'annulla non spara una raffica, la griglia si toglie, lo zoom gira attorno al centro', () => {
  const ai = corpoDi('_applicaIstantanea');
  assert.ok(ai.indexOf('_storiaInCorso = true;') < ai.indexOf('for (const e of ELEMENTI())'), 'la storia si ferma prima di toccare gli interruttori');
  assert.ok(/#ovl-preview\.senza-griglia \{ background-image: none; \}/.test(ANIME), 'la regola della griglia tocca chi ha la griglia');
  assert.ok(!/#ovl-preview\.senza-griglia \.ap-stage/.test(ANIME));
  const az = corpoDi('_applicaZoom');
  assert.ok(/scrollLeft = px \* _zoomOvl - cx/.test(az) && /scrollTop = py \* _zoomOvl - cy/.test(az), 'lo zoom tiene fermo il punto sotto il centro (o il puntatore)');
  assert.ok(/_g\('ovl-tela'\)\?\.addEventListener\('wheel'/.test(APP) && /e\.ctrlKey \&\& !e\.metaKey\) return;\n\s*e\.preventDefault\(\);\n\s*const r = _g\('ovl-tela'\)/.test(APP), 'Ctrl+rotella sulla tela');
});

test('durante il trascinamento si aggiorna la riga del livello, non tutto il pannello', () => {
  const rt = corpoDi('rendiTrascinabile');
  const move = rt.slice(rt.indexOf('const move = (ev) => {'), rt.indexOf('const partenza'));
  assert.ok(!/aggiornaInspector\(\)/.test(move) && /_mostraProp\(\); _aggiornaRigaLivello\(chiave\);/.test(move), 'nel movimento niente innerHTML del pannello');
  assert.ok(/const up = \(\) => \{ chiudi\(\); aggiornaInspector\(\); _ricorda\(\); _salvaPos\(chiave\); \};/.test(rt), 'al rilascio il pannello si ridisegna una volta');
  const dm = corpoDi('_dragManiglia');
  assert.ok(/_posElemento\(el, st\); _mostraProp\(\); _aggiornaRigaLivello\(chiave\);/.test(dm) && /aggiornaInspector\(\); _ricorda\(\); _salvaPos\(chiave\);/.test(dm), 'anche le maniglie, e ricordano il passo per l\'annulla');
});

test('un livello bloccato non si sposta, e il lucchetto viaggia con l\'overlay', () => {
  assert.ok(/function _bloccato\(k\) \{ return !!\(\(_ovAttuale\(\) \|\| \{\}\)\.blocchi \|\| \{\}\)\[k\]; \}/.test(APP));
  const rt = corpoDi('rendiTrascinabile');
  assert.ok(/seleziona\(chiave\);\n\s*if \(_bloccato\(chiave\)\) return;/.test(rt), 'il trascinamento si ferma dopo la selezione');
  assert.ok(/e\.preventDefault\(\);\n\s*if \(_bloccato\(chiave\)\) return;\n\s*const st = _statoXY\(chiave\);/.test(rt), 'la rotella no');
  assert.ok(/function _spostaTasti\(chiave, dx, dy, grande\) \{\n  if \(_bloccato\(chiave\)\) return;/.test(APP), 'le frecce no');
  assert.ok(/if \(!selezione \|\| _bloccato\(selezione\)\) return;/.test(corpoDi('allineaOvl')), 'l\'allineamento no');
  assert.ok(/blocchi: o\.blocchi \|\| \{\}/.test(corpoDi('_overlaysPayload')), 'il lucchetto si salva con l\'overlay');
  assert.ok(/blocchi: _blocchiDiOverlay\(o\?\.blocchi\)/.test(SRV) && /if \(CHIAVE_EL\.test\(k\) && b\[k\] === true\) q\[k\] = true;/.test(SRV), 'il server lo tiene, con le chiavi degli elementi');
  assert.ok(/blocchi: o\.blocchi \|\| \{\}, css: o\.css/.test(SRV), 'e lo rimanda al pannello');
  assert.ok(/data-lucchetto="\$\{l\.k\}"/.test(APP) && /id="insp-blocca"/.test(APP), 'si chiude dal livello e dalle proprieta\'');
  assert.ok(/\.ap-stage \.ap-el\.bloccato \.ap-handle \{ display: none; \}/.test(SKIN), 'un livello bloccato non mostra le maniglie');
});

test('l\'aggancio si spegne con una spunta che si ricorda', () => {
  assert.ok(/id="ovl-aggancia" checked/.test(APP));
  assert.ok(/if \(!ev\.altKey && !fine && _agganciaOn\)/.test(APP), 'il trascinamento la rispetta');
  assert.ok(/localStorage\.setItem\('banco:aggancia'/.test(APP) && /localStorage\.getItem\('banco:aggancia'\) !== '0'/.test(APP), 'e si ricorda');
});
