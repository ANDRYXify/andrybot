// CHIEDERE UNA VOLTA E' ONESTO, CHIEDERE DUE E' ELEMOSINARE.
//
// «Sostieni il progetto» deve essere PRESENTE e non FASTIDIOSO, e le due cose
// litigano: il modo semplice di renderlo presente e' metterlo in cinque posti,
// e da quel momento il sito chiede l'elemosina. Il limite, allora, non e' una
// buona intenzione scritta in un commento — e' un numero che si conta.
//
// Una richiesta per pagina. Quella che compare da sola compare UNA volta, dopo
// che qualcosa ha funzionato, e non torna piu'.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { vetrinaHtml } from '../../src/web/vetrina-vista.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');
const quante = (t) => (t.match(/href="\/sostieni"/g) || []).length;

const PIANI = {
  free: { nome: 'Essenziale' },
  base: { nome: 'Base', prezzo: 2.99, sommario: 'il canone' },
  addon: [{ id: 'clip', nome: 'Clip', sommario: 'le clip', prezzo: 1.99 }],
  bundle: [],
};

test('la vetrina lo dice una volta, e lo dice', () => {
  for (const l of ['it', 'en', 'es']) {
    const h = vetrinaHtml(l, { kick: true, youtube: false, piani: PIANI });
    assert.equal(quante(h), 1, `${l}: una richiesta di sostegno in pagina, ne' zero ne' due`);
  }
  // Zero era il difetto vero: la pagina del sostegno esisteva e dalla home non
  // ci arrivava nessuno.
  assert.ok(vetrinaHtml('it', { piani: PIANI }).includes('/sostieni'));
});

test('il pannello lo dice una volta, in fondo, sempre uguale', () => {
  assert.equal(quante(leggi('src/web/public/index.html')), 1, 'un posto solo, e fisso: niente che compare e sparisce');
});

test('l\'invito che compare da solo: una volta, dopo, e mai piu\'', () => {
  const SRV = leggi('src/web/server.js').replace(/^\s*\/\/.*$/gm, '');
  assert.match(SRV, /\['sostieni', \(req, user\) => piattaformaDi\(user\.login\) === 'discord'/,
    'lo vede solo chi usa SocialBot senza trasmettere: per lui i piani non esistono');
  assert.match(SRV, /dcGiri\.ultimi\(user\.login, 1\)/,
    'e solo dopo che il costruttore e\' passato almeno una volta: prima di essere stati utili non si chiede');

  const APP = leggi('src/web/public/app.js');
  assert.equal((APP.match(/\n  sostieni: \(\) => \(\{/g) || []).length, 1, 'un invito solo, non due');
  const inv = APP.slice(APP.indexOf('  sostieni: () => ({'), APP.indexOf('  vetrina: () => ({'));
  // Non una lista di parole proibite — quella prende anche la frase onesta
  // «niente si sblocca» — ma quello che la frase DEVE dire: che dopo il caffe'
  // il prodotto e' identico a prima.
  assert.match(inv, /niente si sblocca, niente si spegne/, 'dice che non cambia niente di quello che hai');
  assert.match(inv, /non te lo richiedo pi\u00f9|non te lo richiedo più/, 'e che non torna');
  assert.ok(!/scade|scadenza|ultima occasione|offerta/i.test(inv), 'e non mette fretta a nessuno');

  // Marcato come visto alla CHIUSURA, non alla risposta: chi dice di no non se
  // lo ritrova domani.
  const f = APP.slice(APP.indexOf('function invito()'), APP.indexOf('function invito()') + 1600);
  assert.match(f, /f\.addEventListener\('close', \(\) => \{[\s\S]*?api\('\/api\/streamer\/invito\/'/);
  assert.match(f, /document\.querySelector\('dialog\[open\]'\)/,
    'e non si apre sopra un\'altra finestra: mai in mezzo a una cosa che stai facendo');
});

test('la pagina del sostegno ha un indirizzo solo: il sottodominio', async () => {
  // Due indirizzi per la stessa pagina sono due pagine per chi guarda da fuori:
  // il motore ne sceglie una a caso, e i link che la gente si passa sono meta'
  // e meta'. Ne resta uno, e l'altro ci manda.
  const SRV = leggi('src/web/server.js').replace(/^\s*\/\/.*$/gm, '');
  const i = SRV.indexOf("app.get('/sostieni', (req, res, next)");
  assert.ok(i > 0, 'il rimando c\'e\'');
  const r = SRV.slice(i, i + 420);
  assert.match(r, /res\.redirect\(301, 'https:\/\/' \+ config\.sostieniHost \+ '\/' \+ \(q >= 0 \? req\.originalUrl\.slice\(q\) : ''\)\)/,
    'e si porta dietro la domanda: chi torna da Stripe ha ?ok=<sessione>, e senza la pagina non gli dice grazie');
  assert.match(r, /if \(!config\.sostieniHost\) return next\(\);/,
    'finche\' il sottodominio non risponde la pagina resta qui: spento e\' il modo giusto di sbagliare');
  assert.match(r, /req\.hostname[\s\S]{0,40}=== config\.sostieniHost\) return next\(\);/,
    'e sul sottodominio si serve, sennò si rimanderebbe a se stessa all\'infinito');
  assert.ok(SRV.indexOf("app.get('/sostieni', (req, res) => res.sendFile") > i,
    'e il rimando viene PRIMA di chi serve il file, sennò non lo vedrebbe nessuno');

  const html = leggi('src/web/public/sostieni.html');
  assert.match(html, /rel="canonical" href="https:\/\/sostieni\.socialbot\.live\/"/, 'e la pagina dichiara quello vero');
  assert.match(leggi('src/features/donazioni.js'), /export const urlSostieni = \(\) =>/,
    'l\'indirizzo si compone in un posto solo');
});
