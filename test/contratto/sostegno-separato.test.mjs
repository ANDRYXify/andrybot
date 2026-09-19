// I SOLDI DI CASA E QUELLI DEGLI STREAMER NON SI MESCOLANO.
//
// Un sostegno al progetto e una donazione a uno streamer si somigliano
// tantissimo — stessa forma, stesso Stripe, stesse quattro colonne — e proprio
// per questo la tentazione di farli passare dalla stessa porta e' forte. Ma
// quella porta e' fatta per un CANALE: da li' passano l'avviso in diretta,
// l'obiettivo in overlay, l'immagine da approvare, il rimborso dal pannello e
// il blocco «chi ha donato» sulla pagina di qualcuno.
//
// Un login finto la' dentro vorrebbe dire ricordarsi di escluderlo in sei
// posti. Questo cancello controlla che restino due strade: due tabelle, due
// chiavi, e nessun incrocio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');

// I COMMENTI NON SONO CODICE, e qui si guarda il codice. La prima stesura di
// questo cancello cercava le parole nel file intero, e diventava rossa perche'
// un commento SPIEGAVA perche' quelle due strade restano separate. Un cancello
// che si offende per la prosa e' un cancello che fa smettere di scrivere la
// prosa: le spiegazioni sono la parte che salva chi arriva dopo.
const senzaCommenti = (t) => t
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*--.*$/gm, '');
const leggi = (f) => senzaCommenti(readFileSync(join(RAD, f), 'utf8'));
const SOS = leggi('src/features/sostegno.js');
const DON = leggi('src/features/donazioni-stripe.js');
const FILO = leggi('src/features/stripe-filo.js');
const DB = leggi('src/db.js');
const SRV = leggi('src/web/server.js');

test('il sostegno non tocca la tabella delle donazioni, ne\' viceversa', () => {
  assert.match(SOS, /import \{ sostegni \} from '\.\.\/db\.js'/, 'il sostegno ha la sua tabella');
  assert.ok(!/registroDonazioni|contiDonazioni/.test(SOS), 'e non conosce quella degli streamer');
  assert.ok(!/\bsostegni\b/.test(DON), 'e le donazioni non conoscono la sua');
  assert.match(DB, /CREATE TABLE IF NOT EXISTS sostegni/, 'due tabelle, non una con un login finto');
  assert.ok(!/INSERT[^;]*INTO donazioni[^;]*sostegn/is.test(DB));
});

test('nel sostegno non esiste un login: non c\'e\' nessuno streamer da confondere', () => {
  // Se comparisse un login, comparirebbe anche la domanda «di chi sono questi
  // soldi?» — e la risposta giusta e' «di nessuno streamer».
  assert.ok(!/\blogin\b/.test(SOS), 'niente login nel modulo del sostegno');
  const tabella = DB.slice(DB.indexOf('CREATE TABLE IF NOT EXISTS sostegni'));
  assert.ok(!/login/.test(tabella.slice(0, tabella.indexOf(');'))), 'ne\' nella sua tabella');
});

test('la chiamata a Stripe e\' UNA, e la chiave gliela passa chi chiama', () => {
  // Era scritta due volte e stava per diventare tre. Ogni copia decide da se'
  // cosa fare quando Stripe risponde male, e due posti che parlano con lo
  // stesso servizio prima o poi raccontano due storie diverse.
  assert.match(FILO, /export async function chiama\(chiave, metodo, path/);
  assert.ok(!/secretKey|config\.stripe/.test(FILO), 'il filo non conosce nessun conto: la chiave arriva da fuori');
  assert.match(DON, /import \{ chiama as chiamaStripe \} from '\.\/stripe-filo\.js'/);
  assert.match(SOS, /import \{ chiama \} from '\.\/stripe-filo\.js'/);
  assert.ok(!/async function stripe\(chiave/.test(DON), 'e la copia vecchia non c\'e\' piu\'');
});

test('il sostegno paga sul conto della piattaforma, la donazione su quello dello streamer', () => {
  assert.match(SOS, /chiama\(config\.stripe\.secretKey,/, 'il sostegno usa la chiave di casa');
  assert.ok(!/contiDonazioni/.test(SOS));
  assert.match(DON, /stripe\(c\.chiave,/, 'la donazione usa quella dello streamer');
  assert.ok(!/config\.stripe\.secretKey/.test(DON), 'e non deve mai poter toccare quella di casa');
});

test('sostenere non chiede un account, ma non e\' una porta aperta a fare rumore', () => {
  const i = SRV.indexOf("app.post('/api/sostieni'");
  assert.ok(i > 0, 'la porta c\'e\'');
  const corpo = SRV.slice(i, i + 700);
  assert.ok(!/requireLogin|requireOwner/.test(corpo), 'chi sostiene non si iscrive a niente');
  assert.match(corpo, /extRateOk\('sostieni:'/, 'ma c\'e\' un tetto al minuto: aprire un pagamento costa una chiamata');
});

test('la pagina del sostegno sta su un indirizzo solo, e quello corto', () => {
  // Due indirizzi che mostrano la stessa cosa, per i motori di ricerca, sono un
  // doppione: ne scelgono uno a caso, e i link che la gente si passa sono meta'
  // e meta'. Ne vale UNO, e vale quello corto — e' quello che si detta a voce
  // in diretta, ed e' quello che la gente si ricorda.
  const HTML = readFileSync(join(RAD, 'src/web/public/sostieni.html'), 'utf8');
  assert.match(HTML, /<link rel="canonical" href="https:\/\/sostieni\.socialbot\.live\/">/);
  assert.match(SRV, /if \(req\.path === '\/'\) \{ req\.url = '\/sostieni'; \}/,
    'sull\'indirizzo corto la radice E\' la pagina');
  // e il resto del sito deve continuare a passare, sennò quella pagina si
  // aprirebbe senza fogli di stile e senza script
  const i = SRV.indexOf("config.sostieniHost && String(req.hostname");
  assert.ok(i > 0);
  assert.match(SRV.slice(i, i + 300), /return next\(\);/, 'tutto il resto passa');
  // E l'altro indirizzo rimanda qui, invece di essere una seconda pagina.
  assert.match(SRV, /res\.redirect\(301, 'https:\/\/' \+ config\.sostieniHost \+ '\/'\)/,
    '/sostieni manda al sottodominio');
});

test('il ritorno dal pagamento non crede all\'indirizzo', () => {
  const i = SRV.indexOf("app.get('/api/sostieni/esito'");
  const corpo = SRV.slice(i, i + 600);
  assert.match(corpo, /sostegno\.conferma\(req\.query\?\.id\)/, 'si rilegge la sessione da Stripe');
  assert.ok(!/stato: 'pagato'[^}]*req\.query/.test(corpo), 'e non si prende per buono quello che c\'e\' scritto nell\'indirizzo');
  assert.match(SOS, /const r = sostegni\.get\(id\);\n  if \(!r\) return null;/,
    'una sessione che non abbiamo aperto noi non esiste: chi scrive un id a mano non si regala niente');
});
