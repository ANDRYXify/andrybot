// UN INDIRIZZO NON E' UN RECORD DNS.
//
// Il caso vero, per intero. Il Caddyfile impara un nome nuovo
// (sostieni.socialbot.live), il codice va in produzione, e il sito comincia a
// offrire quel link. Solo che la porta d'ingresso non ha mai riletto la sua
// configurazione — il file e' montato dentro il container, e cambiarne il
// contenuto non basta a far ricreare il container — quindi per quel nome
// Caddy non ha mai chiesto un certificato. Il browser dice «connessione non
// sicura» e chi guarda pensa a un problema suo.
//
// Due difetti diversi, e da soli non bastava correggerne uno:
//
//  · chi aggiorna il server non ricaricava la porta d'ingresso;
//  · la sonda che accende l'indirizzo corto guardava il DNS, che rispondeva
//    benissimo, invece di bussare all'indirizzo, che non rispondeva affatto.
//
// Il secondo e' il piu' insidioso: non e' che la misura fosse sbagliata, e'
// che misurava un'altra cosa. Qui si fissano tutti e due dove vivono.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const AGG = leggi('server/aggiorna.sh');
const SRV = leggi('src/web/server.js');
const CADDY = leggi('Caddyfile');

test('chi aggiorna il server fa rileggere la configurazione alla porta d\'ingresso', () => {
  assert.match(AGG, /caddy reload --config \/etc\/caddy\/Caddyfile --adapter caddyfile/,
    'senza la ricarica, un nome nuovo nel Caddyfile non esiste per chi arriva da fuori');
  assert.match(AGG, /caddy validate --config \/etc\/caddy\/Caddyfile --adapter caddyfile/,
    'e si valida prima: una configurazione rotta non deve sostituire quella che regge il sito');
  const i = AGG.indexOf('caddy validate');
  const j = AGG.indexOf('caddy reload');
  assert.ok(i > 0 && j > i, 'prima si valida, poi si ricarica — mai il contrario');
  assert.ok(AGG.indexOf('docker compose up -d --build') < i,
    'e si ricarica DOPO aver portato il file nuovo, sennò si ricaricherebbe quello di prima');
});

test('la sonda dell\'indirizzo corto bussa all\'indirizzo, non al DNS', () => {
  assert.ok(!/dns\.lookup/.test(SRV),
    'il DNS risponde anche quando davanti non c\'è niente in ascolto: non dice se l\'indirizzo funziona');
  assert.match(SRV, /const rispondeInHttps = \(host\) =>/, 'si prova la connessione vera');
  assert.match(SRV, /port: 443/, 'in HTTPS, che è il punto: vuol dire che un certificato per quel nome c\'è');
  assert.match(SRV, /const sondaHost = \(candidato, metti, come\) => \{[\s\S]*?await rispondeInHttps\(candidato\)/,
    'e l\'indirizzo si accende solo se ha risposto');
});

test('e se non risponde resta spento, che è il modo giusto di sbagliare', () => {
  const i = SRV.indexOf('const sondaHost = (candidato, metti, come) =>');
  const corpo = SRV.slice(i, i + 700);
  assert.match(corpo, /setTimeout\(prova, 10 \* 60_000\)/, 'si riprova più tardi');
  const chiama = corpo.indexOf('metti(candidato)');
  const riprova = corpo.indexOf('setTimeout(prova');
  assert.ok(chiama > 0 && riprova > chiama,
    'l\'indirizzo si accende PRIMA di rinunciare, non dopo: se si accendesse comunque, manderemmo la gente contro un avviso rosso');
});

test('i nomi che il sito promette sono nomi che la porta d\'ingresso conosce', () => {
  // Un indirizzo corto acceso nel codice e assente dal Caddyfile e' lo stesso
  // difetto visto dall'altra parte: il sito lo offre, e fuori non esiste.
  for (const nome of ['dona.socialbot.live', 'sostieni.socialbot.live']) {
    assert.ok(CADDY.includes(nome), `${nome} non è fra i nomi serviti`);
  }
});

test('la pagina del sostegno si apre a chi NON e\' dentro, che e\' chi dona', async () => {
  // Il difetto piu' brutto dei tre, perche' non somigliava a un difetto: la
  // pagina rispondeva 200 a chi era gia' loggato e 404 a tutti gli altri.
  // Guardandola dal proprio browser funzionava benissimo.
  //
  // Il cancello delle sessioni apre solo gli indirizzi dichiarati. Dichiarare
  // il FILE («sostieni.html») non dichiara l'INDIRIZZO («/sostieni»): sono due
  // cose, e ne mancava una. Adesso si dichiarano insieme, e questa prova
  // guarda proprio la domanda che fa il cancello.
  const { creaGuscio } = await import('../../src/web/vetrina.js');
  const g = creaGuscio(join(RAD, 'src/web/public'));
  g.pagina('sostieni.html', '/sostieni', '/api/sostieni', '/api/sostieni/esito');
  for (const via of ['/sostieni', '/api/sostieni', '/api/sostieni/esito']) {
    assert.equal(g.aperto(via), true, `${via}: chi arriva a donare non ha una sessione, e non deve averne una`);
  }
  assert.equal(g.aperto('/api/streamer/dcserver'), false, 'e il cancello resta un cancello');
  // e le due cose si dichiarano insieme, sennò la prossima pagina rifà la stessa fine
  assert.match(leggi('src/web/vetrina.js'), /pagina\(nome, \.\.\.rotte\) \{[\s\S]*for \(const r of rotte\) ROTTE\.add/,
    'il file e gli indirizzi a cui risponde si dichiarano nello stesso posto');
  assert.match(leggi('src/web/server.js'), /guscio\.pagina\('sostieni\.html', '\/sostieni'/,
    'e la pagina del sostegno li dichiara');
});

test('la pagina del sostegno ha la SUA anteprima, non quella del sito', () => {
  // Chi riceve il link in chat legge l'immagine, non l'indirizzo: con la carta
  // del sito l'anteprima parlava del bot per Twitch, che e' un'altra pagina.
  const HTML = leggi('src/web/public/sostieni.html');
  assert.match(HTML, /property="og:image" content="[^"]*og-sostieni\.png/);
  assert.match(HTML, /name="twitter:image" content="[^"]*og-sostieni\.png/);
  assert.ok(!/og:image:alt[^>]*Twitch e Kick/.test(HTML), 'e il testo alternativo parla di questa pagina');
  const OG = leggi('scripts/og.mjs');
  assert.match(OG, /'og-sostieni\.png': pagina\(\{/, 'e l\'immagine ha un sorgente, non è un file caduto dal cielo');
});
