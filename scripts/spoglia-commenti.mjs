// Toglie (o verifica l'assenza di) i commenti nei file che il browser scarica.
//
// Regola di riservatezza: tutto ciò che si legge con F12 o scaricando i file
// del sito non deve contenere commenti. La sola eccezione sono le due righe di
// filigrana. Le spiegazioni stanno in docs/, non nel codice servito.
//
//   node scripts/spoglia-commenti.mjs --verifica   → elenca e esce 1 se trova
//   node scripts/spoglia-commenti.mjs              → toglie
//
// Il motore (il lexer, e la regola «via solo le righe che sono commento per
// intero») sta in src/spoglia.js, perché lo usa anche il server per spogliare
// al volo il modulo del disegno che manda al browser. Scritto qui e là,
// prima o poi direbbe due cose diverse.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { righeCommento, spoglia } from '../src/spoglia.js';

const CARTELLA = 'src/web/public';

const verifica = process.argv.includes('--verifica');
let trovati = 0;

for (const nome of readdirSync(CARTELLA).sort()) {
  if (!/\.(js|css|html)$/.test(nome)) continue;
  const via = join(CARTELLA, nome);
  const s = readFileSync(via, 'utf8');
  const tipo = nome.endsWith('.js') ? 'js' : nome.endsWith('.css') ? 'css' : 'html';
  const righe = righeCommento(s, tipo);
  trovati += righe.length;
  if (verifica) for (const r of righe) console.log(`${nome}: ${r.riga.trim().slice(0, 120)}`);
  else if (righe.length) {
    writeFileSync(via, spoglia(s, tipo));
    console.log(`${nome.padEnd(28)} -${righe.length}`);
  }
  if (!s.includes('ANDRYX-IP') && nome !== 'index.html') console.log(`  ⚠ senza filigrana: ${nome}`);
}

// LE PAGINE CHE NON SONO FILE.
//
// Fin qui si sono guardati i FILE sotto src/web/public. Ma il sito serve anche
// pagine che nessun file contiene: la pagina link di ognuno, la sua informativa,
// il 404, la manutenzione — si compongono al momento, e le spiegazioni scritte
// dentro ai loro fogli di stile arrivavano al browser tali e quali. La pagina
// link ne portava TRENTASETTE, ognuna, e questo cancello non le ha mai viste
// perche' cercava fra i file e quelle pagine non sono file.
//
// Qui si guarda cio' che ESCE. E' l'unica domanda che conta: cosa legge chi
// apre F12.
if (verifica) {
  const composte = [];
  try {
    const { renderLinkPage, renderInformativa } = await import('../src/features/linkpagina.js');
    const { pagina404, paginaManutenzione } = await import('../src/web/pagine-servizio.js');
    const finta = { attiva: true, titolo: 'P', blocchi: [{ tipo: 'link', label: 'A', url: 'https://a.example' }], tema: {} };
    const dove = { login: 'x', display: 'X', avatar: '', baseUrl: 'http://x' };
    composte.push(['pagina link', renderLinkPage(finta, dove)]);
    composte.push(['informativa della pagina link', renderInformativa(finta, dove)]);
    composte.push(['404', pagina404('it')]);
    composte.push(['manutenzione', paginaManutenzione()]);
  } catch (e) {
    console.log(`  ⚠ non riesco a comporre le pagine servite: ${e.message}`);
    trovati++;
  }
  for (const [nome, html] of composte) {
    for (const c of html.match(/\/\*[\s\S]*?\*\//g) || []) {
      trovati++;
      console.log(`${nome} (composta): ${c.replace(/\s+/g, ' ').trim().slice(0, 110)}`);
    }
  }
  console.log(trovati ? `\n${trovati} righe di commento da togliere.` : 'Nessun commento nei file serviti. ✓');
  process.exit(trovati ? 1 : 0);
}
