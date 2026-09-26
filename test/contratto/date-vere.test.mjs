// LE DATE DELLA SITEMAP SONO VERE, O NON CI SONO.
//
// La sitemap dava «oggi» come lastmod a ogni pagina che non ne aveva una sua,
// a ogni richiesta. Google lo nota e smette di fidarsi di lastmod su tutto il
// sito, anche dove e' giusto (guide e manuali hanno la loro data vera). Il
// rapporto SEO lo metteva fra i difetti da chiudere.
//
// Adesso: la home ha la data dell'ultima novita' pubblica (cambia quando cambia
// il prodotto), privacy e termini dicono da se' quando sono cambiati, con la
// stessa data che legge chi li apre, e chi non ha una data non ha lastmod. La
// data dichiarata non puo' restare indietro rispetto all'ultimo cambio del
// TESTO: una modifica ai termini senza aggiornare la data e' rossa.
//
// Il testo, non il file. Una description accorciata o un dato strutturato in
// piu' stanno nella testata: i termini restano quelli, e la data che legge chi
// li apre non si deve spostare. Si confronta il corpo della pagina senza la riga
// della data, commit per commit, e una modifica non ancora registrata conta come
// fatta oggi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAD = fileURLToPath(new URL('../../', import.meta.url));
const leggi = (via) => readFileSync(new URL(`../../${via}`, import.meta.url), 'utf8');
const SERVER = leggi('src/web/server.js');
const SITEMAP = leggi('src/web/sitemap.js');

test('la sitemap non inventa date', () => {
  const i = SERVER.indexOf("app.get('/sitemap.xml'");
  const rotta = SERVER.slice(i, SERVER.indexOf('\n  }));', i));
  assert.match(rotta, /vociPubbliche\(\{ base: b,/, 'le voci pubbliche vengono dalla stessa funzione che apre il cancello SEO');
  assert.match(rotta, /sitemapXml\(voci\)/);
  for (const t of [rotta, SITEMAP]) assert.doesNotMatch(t, /\|\| oggi|const oggi|Date\.now\(\)\)\.toISOString|new Date\(\)\.toISOString/, 'nessuna data di ripiego');
  assert.match(SITEMAP, /\+ \(v\.m \? `    <lastmod>\$\{v\.m\}<\/lastmod>\\n` : ''\)/, 'senza una data vera, niente lastmod');
  assert.match(SITEMAP, /\(\{ u, p: '1\.0', f: 'weekly', alt: home, m: pubbliche\[0\]\?\.data \}\)/, 'la home ha la data dell\'ultima novita\' pubblica');
  for (const pagina of ['privacy', 'termini']) assert.ok(SITEMAP.includes(`m: dataDichiarata(publicDir, '${pagina}.html')`), `${pagina} ha la data che dichiara`);
});

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

export const testo = (h) => {
  const i = h.search(/<body\b/i), j = h.search(/<\/body>/i);
  return (i < 0 ? '' : h.slice(i, j < 0 ? undefined : j)).replace(/Ultimo aggiornamento:[^<]*(?:<time\b[^>]*>[^<]*<\/time>)?[^<]*/g, '');
};

const git = (...a) => execFileSync('git', a, { cwd: RAD, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

// Il giorno in cui il testo di `via` e' cambiato l'ultima volta, o '' se la
// storia non c'e' (una copia senza .git non si misura).
function ultimoCambioDelTesto(via) {
  let storia;
  try { storia = git('log', '--format=%H %cs', '--', via).trim().split('\n').filter(Boolean).map((r) => r.split(' ')); } catch { return ''; }
  if (!storia.length) return '';
  const versione = (h) => { try { return testo(git('show', `${h}:${via}`)); } catch { return ''; } };
  if (testo(leggi(via)) !== versione(storia[0][0])) return new Date().toISOString().slice(0, 10);
  for (let i = 0; i < storia.length; i++) {
    if (versione(storia[i][0]) !== (i + 1 < storia.length ? versione(storia[i + 1][0]) : '')) return storia[i][1];
  }
  return '';
}

for (const pagina of ['privacy', 'termini']) {
  test(`${pagina}: la data che si legge e' quella dell'ultimo cambio del testo`, () => {
    const via = `src/web/public/${pagina}.html`;
    const h = leggi(via);
    const m = h.match(/<time class="aggiornato-il" datetime="(\d{4})-(\d{2})-(\d{2})">([^<]+)<\/time>/);
    assert.ok(m, 'la pagina dichiara la sua data, leggibile da una persona e da una macchina');
    const data = `${m[1]}-${m[2]}-${m[3]}`;
    assert.equal(m[4], `${Number(m[3])} ${MESI[Number(m[2]) - 1]} ${m[1]}`, 'le due scritture dicono lo stesso giorno');
    const ld = JSON.parse((h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1] || '{}');
    assert.equal(ld.dateModified, data, 'e i dati strutturati dicono lo stesso giorno');
    const ultimo = ultimoCambioDelTesto(via);
    if (ultimo) assert.ok(data >= ultimo, `il testo di ${via} e' cambiato il ${ultimo} ma dice ${data}: aggiorna la data`);
  });
}

test('una testata che cambia non sposta la data, un testo che cambia si', () => {
  const h = leggi('src/web/public/termini.html');
  const conTestata = h.replace(/(<meta name="description" content=")[^"]*"/, '$1Un\'altra descrizione."');
  assert.equal(testo(conTestata), testo(h), 'la description sta nella testata: i termini sono gli stessi');
  const conData = h.replace(/(<time class="aggiornato-il" datetime=")[^"]*(">)[^<]*/, '$12030-01-01$21 gennaio 2030');
  assert.equal(testo(conData), testo(h), 'e la riga della data non conta come testo, sennò ogni data ne chiederebbe un\'altra');
  const conTesto = h.replace('</footer>', '<p>Una clausola nuova.</p></footer>');
  assert.notEqual(testo(conTesto), testo(h), 'una frase nuova nel corpo e\' un cambio del documento');
});
