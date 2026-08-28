// Il browser e il server devono essere d'accordo su quali campi ha uno stile.
//
// Il server ricostruisce lo stile campo per campo: un campo che non elenca lo
// butta via in silenzio. Se il browser ne scrive uno che il server non conosce,
// il salvataggio "riesce" e la modifica sparisce al primo ricaricamento — senza
// un errore, senza un log, senza niente da cui accorgersene.
//
// Questo confronto legge le due liste dai sorgenti e le mette a paragone.
//
//   node scripts/verifica-stile.mjs     → esce 1 se non concordano
import { readFileSync } from 'node:fs';

const app = readFileSync('src/web/public/app.js', 'utf8');
const srv = readFileSync('src/web/stile.js', 'utf8');

const err = [];

// le chiavi di un oggetto letterale, prese dal blocco che lo costruisce
function chiavi(sorgente, inizio, fine) {
  const i = sorgente.indexOf(inizio);
  if (i < 0) return null;
  const j = sorgente.indexOf(fine, i);
  let blocco = sorgente.slice(i, j < 0 ? i + 4000 : j);
  // via le stringhe: dentro ci sono due punti e apostrofi che non sono chiavi
  blocco = blocco.replace(/'(?:\\.|[^'\\])*'/g, "''").replace(/"(?:\\.|[^"\\])*"/g, '""');
  return [...new Set([...blocco.matchAll(/[{,]\s*([a-zA-Z][\w]*)\s*:/g)].map((m) => m[1]))];
}

const coppie = [
  ['alert', chiavi(app, 'function _leggiAlertStile() {', '\n}'), chiavi(srv, 'const normAlertStile = (st) => {', '\n};')],
  ['chat', chiavi(app, 'function _leggiChatStile() {', '\n}'), chiavi(srv, 'const normChatStile = (st) => {', '\n};')],
];

for (const [nome, cliente, server] of coppie) {
  if (!cliente || !server) { err.push(`${nome}: non trovo uno dei due blocchi`); continue; }
  const persi = cliente.filter((k) => !server.includes(k));
  console.log(`${nome.padEnd(6)} browser ${String(cliente.length).padStart(2)} campi · server ${String(server.length).padStart(2)} campi` +
    (persi.length ? `  ✗ buttati via: ${persi.join(', ')}` : '  ✓'));
  if (persi.length) err.push(`${nome}: il server butta via ${persi.join(', ')}`);
}

// e gli elenchi di valori ammessi devono coincidere
// nel browser sono coppie ['chiave', 'Etichetta'] e conta solo la prima;
// nel server sono stringhe nude e contano tutte
function valori(sorgente, re, coppie) {
  const m = sorgente.match(re);
  if (!m) return null;
  const dentro = coppie ? /\[\s*'([a-z-]+)'/g : /'([a-z-]+)'/g;
  return [...m[1].matchAll(dentro)].map((x) => x[1]);
}
const assi = [
  ['forma', /const FORMA_OPTS = \(\) => \[([\s\S]*?)\n\];/, /const FORME_OVL = \[([^\]]*)\]/],
  ['materia', /const MATERIA_OPTS = \(\) => \[([\s\S]*?)\n\];/, /const MATERIE_OVL = \[([^\]]*)\]/],
  ['cornice', /const CORNICE_OPTS = \(\) => \[([\s\S]*?)\n\];/, /const CORNICI_OVL = \[([^\]]*)\]/],
  ['comp', /const COMP_OPTS = \(\) => \[([\s\S]*?)\n\];/, /const COMP_OVL = \[([^\]]*)\]/],
];
for (const [nome, reApp, reSrv] of assi) {
  const a = valori(app, reApp, true);
  const b = valori(srv, reSrv, false);
  if (!a || !b) { err.push(`${nome}: non trovo uno dei due elenchi`); continue; }
  const soloApp = a.filter((v) => !b.includes(v));
  const soloSrv = b.filter((v) => !a.includes(v));
  console.log(`${nome.padEnd(6)} ${a.length} valori` + (soloApp.length || soloSrv.length
    ? `  ✗ solo nel browser: ${soloApp.join(', ') || '—'} · solo nel server: ${soloSrv.join(', ') || '—'}` : '  ✓'));
  if (soloApp.length) err.push(`${nome}: il browser offre ${soloApp.join(', ')} che il server rifiuta`);
  if (soloSrv.length) err.push(`${nome}: il server ammette ${soloSrv.join(', ')} che il browser non offre`);
}

// e il foglio di stile servito deve avere una regola per ognuno
const css = readFileSync('src/web/public/overlay-skin.css', 'utf8');
for (const [nome, reApp] of assi) {
  const a = valori(app, reApp, true) || [];
  const senza = a.filter((v) => !css.includes(`.${nome === 'comp' ? 'comp' : nome}-${v}`));
  if (senza.length) err.push(`${nome}: senza regola CSS ${senza.join(', ')}`);
}

console.log(err.length ? '\n' + err.map((e) => '- ' + e).join('\n') : '\nBrowser e server sono d\'accordo. ✓');
process.exit(err.length ? 1 : 0);
