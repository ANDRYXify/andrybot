// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// «DI CHI» E «QUALI AVVISI» NEI POSTI DI TELEGRAM E DISCORD (docs/TELEGRAM.md,
// «Il filtro che non mente»).
//
// Il filtro vuoto vuol dire «tutto», e «nessuno» non si scrive: un posto che non
// deve ricevere niente si spegne. Il difetto era che il pannello lo scriveva lo
// stesso, per sbaglio, in due modi:
//  · togliendo tutte le spunte di un gruppo si salvava il vuoto, cioe' «tutto»;
//  · un nome uscito dalla lista (un amico tolto, un membro uscito dalla
//    community) restava nel filtro ma non nelle spunte: il posto non riceveva
//    niente, il pannello mostrava tutto spento, e il primo tocco a qualunque
//    cosa del posto lo faceva diventare «tutti».
// Le promesse: l'ultima spunta resta; un nome uscito si vede, segnato, e resta
// finche' non lo togli tu; se il posto non riceve piu' niente il pannello lo
// dice; la matrice conta come arrivato solo quello che arriva davvero a te.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const APP = readFileSync(new URL('../../src/web/public/app.js', import.meta.url), 'utf8');
const pezzo = (da, a) => { const i = APP.indexOf(da); const j = APP.indexOf(a, i + 1); assert.ok(i > 0 && j > i, `c'e': ${da}`); return APP.slice(i, j); };
const SRC = pezzo('function _chiDelPosto(', 'function _rilievoRiga(');
const toast = [];
const F = new Function('L', 'esc', '_bIco', 'ICO', 'toast', `${SRC}; return { _chiDelPosto, _chiTesto, _chiSpunte, _chiNessuno, _ultimaSpunta };`)(
  (it) => it, (s) => String(s), () => '', { avviso: '' }, (m) => toast.push(m));

const persone = [{ login: 'casa', display: 'Io' }, { login: 'amico', display: 'Amico' }];

test('un nome uscito dalla lista si vede nelle spunte, segnato, e resta spuntato', () => {
  const t = { streamer: ['uscito'] };
  const chi = F._chiDelPosto(t, persone);
  assert.deepEqual(chi.map((p) => p.login), ['casa', 'amico', 'uscito']);
  assert.equal(chi[2].via, true);
  const html = F._chiSpunte(t, persone);
  assert.match(html, /data-chi="uscito" checked><span>uscito <span class="tenue">\(non più in lista\)<\/span>/);
  assert.doesNotMatch(html, /data-chi="casa" checked/, 'gli altri restano come sono');
  assert.equal(F._chiTesto(t, persone), 'uscito (non più in lista)');
});

test('se il posto non riceve piu\' niente il pannello lo dice, e solo allora', () => {
  assert.match(F._chiNessuno({ streamer: ['uscito'] }, persone, 'telegram'), /Qui non arriva niente/);
  assert.match(F._chiNessuno({ streamer: ['uscito'] }, persone, 'discord'), /«Acceso»/);
  assert.match(F._chiNessuno({ streamer: ['uscito'] }, persone, 'telegram'), /«Attiva»/);
  assert.equal(F._chiNessuno({ streamer: ['uscito', 'amico'] }, persone, 'telegram'), '');
  assert.equal(F._chiNessuno({ streamer: [] }, persone, 'telegram'), '', 'vuoto vuol dire tutti');
  assert.equal(F._chiTesto({ streamer: [] }, persone), 'tutti');
  assert.equal(F._chiTesto({ streamer: ['amico'] }, persone), 'Amico');
});

// un DOM minimo: la spunta, il suo gruppo, e le altre spunte del gruppo
function spunta({ chi = true, accese = 0, checked = false } = {}) {
  const gruppo = { querySelector: (s) => (s === 'input:checked' && accese > 0 ? {} : null) };
  return { target: { checked, matches: (s) => s.includes(chi ? '[data-chi]' : '[data-pin]'), closest: (s) => (s === '.tg-spunte' ? gruppo : null) } };
}

test('l\'ultima spunta di un gruppo non si toglie: torna accesa e il pannello dice come spegnere il posto', () => {
  toast.length = 0;
  const e = spunta({ accese: 0 });
  assert.equal(F._ultimaSpunta(e, 'telegram'), true);
  assert.equal(e.target.checked, true, 'rimessa');
  assert.match(toast[0], /«Attiva»/);
  F._ultimaSpunta(spunta({ accese: 0 }), 'discord');
  assert.match(toast[1], /«Acceso»/);
});

test('le altre spunte passano: quando ne resta un\'altra, quando si accende, e fuori dai gruppi', () => {
  toast.length = 0;
  assert.equal(F._ultimaSpunta(spunta({ accese: 1 }), 'telegram'), false);
  assert.equal(F._ultimaSpunta(spunta({ checked: true }), 'telegram'), false);
  assert.equal(F._ultimaSpunta(spunta({ chi: false, accese: 0 }), 'telegram'), false, '«Fissa» non e\' un gruppo di spunte');
  assert.equal(toast.length, 0);
});

test('i gestori usano la guardia prima di salvare, Telegram, Discord e matrice', () => {
  assert.match(APP, /const d = e\.target\.closest\('\.tg-dest'\);\n    if \(!d \|\| _ultimaSpunta\(e, 'telegram'\)\) return;/);
  assert.match(APP, /if \(d && !_ultimaSpunta\(e, 'discord'\)\) \{ salva\(d\); _dcaRilievo\(d\); \}/);
  const mx = pezzo("const mx = e.target.closest('[data-mx-dest]');", "const d = e.target.closest('.tg-dest');");
  assert.ok(mx.indexOf('if (!scelti.length) {') > 0 && mx.indexOf('if (!scelti.length) {') < mx.indexOf('conErrore('), 'la matrice si ferma prima di salvare');
  assert.match(mx, /mx\.checked = true;/);
});

test('le spunte «Di chi» passano tutte dallo stesso pezzo, che mostra anche i nomi usciti', () => {
  assert.equal((APP.match(/\$\{_chiSpunte\(t, persone\)\}/g) || []).length, 2, 'Telegram e Discord');
  assert.equal((APP.match(/\$\{_chiNessuno\(t, persone, '(telegram|discord)'\)\}/g) || []).length, 2);
  assert.doesNotMatch(APP, /persone\.map\(\(pp\) => `<label class="tg-spunta"><input type="checkbox" data-chi=/, 'nessuna spunta disegnata a mano dalla sola lista');
  assert.match(APP, /\$\{_chiDelPosto\(t, persone\)\.length \? `<p class="campo spazio-sopra">\$\{L\('Di chi'/, 'su Discord il gruppo compare anche se ci sono solo nomi usciti');
});

test('la matrice conta come arrivato solo quello che arriva a te, e dice quali posti sono solo degli altri', () => {
  const m = pezzo('const accetta = (t, k) =>', 'const matrice = dest.length');
  assert.match(m, /const tuoi = \(t\) => !t\.streamer\.length \|\| t\.streamer\.includes\(d\.io\);/);
  assert.match(m, /const dove = dest\.filter\(\(t\) => t\.attivo && accetta\(t, e\.k\) && tuoi\(t\)\)\.length;/);
  assert.match(m, /\$\{tuoi\(t\) \? '' : `<span class="tgm-sotto">\$\{L\('solo gli altri'/);
});
