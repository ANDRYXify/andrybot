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
  ['musica', chiavi(app, 'function _defMusica() {', '\n}'), chiavi(srv, 'export const normMusica = (m) => {', '\n};')],
  ['timer', chiavi(app, 'function _defTimer() {', '\n}'), chiavi(srv, 'export const normTimer = (t) => {', '\n};')],
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


// ---- I MODIFICATORI DI CLASSE ESISTONO DAVVERO? --------------------------
// Un modificatore scritto a mano che nel CSS non c'è non dà nessun errore: il
// pezzo si disegna, solo grigio. È come si è persa la differenza fra un badge
// «degradato» e uno «sano» — scritto `ambra`, mentre la regola si chiama
// `giallo`. Qui si contano, invece di accorgersene per caso in uno screenshot.
{
  const css = readFileSync('src/web/public/style.css', 'utf8') + readFileSync('src/web/public/anime.css', 'utf8');
  const app = readFileSync('src/web/public/app.js', 'utf8');
  const FAMIGLIE = ['badge', 'btn', 'tag'];
  const mancanti = [];
  for (const fam of FAMIGLIE) {
    const definiti = new Set();
    for (const m of css.matchAll(new RegExp(`\\.${fam}\\.([a-z][a-z0-9-]*)`, 'g'))) definiti.add(m[1]);
    if (!definiti.size) continue;
    const usati = new Set();
    for (const m of app.matchAll(new RegExp(`class="${fam} ([a-z][a-z0-9-]*)`, 'g'))) usati.add(m[1]);
    // valori scritti dentro un ternario o una mappa: `'verde'`, `'rosso'`…
    for (const m of app.matchAll(new RegExp(`class="${fam} \\$\\{([^}]*)\\}`, 'g'))) {
      for (const q of m[1].matchAll(/'([a-z][a-z0-9-]*)'/g)) usati.add(q[1]);
    }
    // Una classe vale come definita se esiste NEL CSS, in qualunque forma:
    // può essere un modificatore (.btn.mini) o una utilità autonoma
    // (.spazio-sopra). Cercare solo la prima forma segnalava le seconde come
    // mancanti — un difetto della misura, non del prodotto.
    // I colori che arrivano da una mappa non si vedono nell'attributo: per
    // questo il vocabolario ha UN nome solo (const BADGE) e si controlla lui.
    if (fam === 'badge') {
      const voc = /const BADGE = \{([^}]*)\}/.exec(app);
      if (!voc) mancanti.push('badge: manca il vocabolario `const BADGE`');
      else for (const q of voc[1].matchAll(/'([a-z][a-z0-9-]*)'/g)) usati.add(q[1]);
    }
    for (const u of usati) {
      if (definiti.has(u)) continue;
      if (new RegExp(`\\.${u}\\b`).test(css)) continue;
      mancanti.push(`${fam}.${u}`);
    }
    console.log(`${fam.padEnd(6)} ${definiti.size} modificatori definiti · ${usati.size} usati  ${mancanti.length ? '' : '✓'}`);
  }
  if (mancanti.length) {
    console.error('\nUsati ma non definiti nel CSS (si disegnano senza colore, in silenzio):');
    for (const m of mancanti) console.error('  · ' + m);
    err.push('modificatori di classe usati ma non definiti: ' + mancanti.join(', '));
  }
}


// I caratteri del contatore sono elencati in TRE posti, ognuno con la sua parte:
// la chiave in stile.js (che valida), la famiglia CSS in presets.js (che
// disegna), l'etichetta in app.js (che si legge). Le parti sono diverse ma le
// CHIAVI devono essere le stesse, sennò si può scegliere un carattere che il
// server rifiuta, o validarne uno che il browser non sa disegnare.
{
  const presets = readFileSync('src/web/public/presets.js', 'utf8');
  const chiavi = (t, re) => {
    const m = re.exec(t);
    return m ? new Set([...m[1].matchAll(/'?([A-Za-z][A-Za-z0-9]*)'?\s*:/g)].map((q) => q[1])) : null;
  };
  const daStile = /export const CONT_FONT = \[([^\]]*)\]/.exec(srv);
  const inStile = daStile ? new Set([...daStile[1].matchAll(/'([A-Za-z][A-Za-z0-9]*)'/g)].map((q) => q[1])) : null;
  const inPresets = chiavi(presets, /window\.FONT_CONT = \{([\s\S]*?)\n {2}\};/);
  const daApp = /const FONT_CONT_OPTS = \(\) => \[([\s\S]*?)\];/.exec(app);
  const inApp = daApp ? new Set([...daApp[1].matchAll(/\['([A-Za-z][A-Za-z0-9]*)'/g)].map((q) => q[1])) : null;
  if (!inStile || !inPresets || !inApp) err.push('caratteri del contatore: non trovo uno dei tre elenchi');
  else {
    const fuori = [];
    for (const [nome, ins] of [['presets.js', inPresets], ['app.js', inApp]]) {
      for (const k of ins) if (!inStile.has(k)) fuori.push(`${k} sta in ${nome} ma il server lo rifiuta`);
      for (const k of inStile) if (!ins.has(k)) fuori.push(`${k} lo accetta il server ma non c'è in ${nome}`);
    }
    console.log(`font contatore: ${inStile.size} chiavi in tre elenchi  ${fuori.length ? '' : '✓'}`);
    if (fuori.length) err.push('caratteri del contatore: ' + fuori.join(', '));
  }
}

console.log(err.length ? '\n' + err.map((e) => '- ' + e).join('\n') : '\nBrowser e server sono d\'accordo. ✓');
process.exit(err.length ? 1 : 0);