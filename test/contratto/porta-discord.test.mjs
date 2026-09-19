// LA PORTA D'INGRESSO, E LE PAROLE CHE LA ACCOMPAGNANO.
//
// Prima si arrivava al Discord di uno streamer per due strade storte: un
// indirizzo lungo da leggere a voce in diretta, e un link d'invito da cercare
// da qualche parte — quando non era scaduto. Adesso l'indirizzo e' uno,
// `discord.<dominio>/<canale>`, e chi lo apre si ritrova DENTRO il server nello
// stesso momento in cui dice a Discord che e' lui.
//
// Due cose vanno tenute ferme, e sono il motivo di questo collaudo.
//
// La prima: il permesso che Discord ci da' per farlo entrare e' SUO, vale
// qualche minuto e apre il suo account. Non deve uscire dal modulo che lo usa —
// se girasse per il codice del sito, un giorno finirebbe in un log.
//
// La seconda: il codice va sempre dal web alla chat, mai il contrario. La chat
// e' pubblica: un link personale scritto li' lo aprirebbe chi sta guardando, e
// si prenderebbe i ruoli di un altro. La porta nuova non cambia quel verso.
//
// E in mezzo, quello che il bot DICE: e' dello streamer, non nostro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const senzaCommenti = (t) => t.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const leggi = (p) => senzaCommenti(readFileSync(join(RAD, p), 'utf8'));
const SRV = leggi('src/web/server.js');
const API = leggi('src/features/discord-api.js');

cartellaUsaEGetta('andrybot-porta-dc-');
const { config } = await import('../../src/config.js');
const dc = await import('../../src/features/discord-collega.js');

test('l\'indirizzo e\' uno solo, corto dove c\'e\' e lungo dove non c\'e\'', () => {
  const prima = config.discordHost;
  config.discordHost = '';
  assert.match(dc.indirizzo('andryxify'), /\/collega\/andryxify$/, 'senza il nome corto si usa quello lungo');
  config.discordHost = 'discord.socialbot.live';
  assert.equal(dc.indirizzo('ANDRYXify'), 'https://discord.socialbot.live/andryxify', 'e il canale e\' sempre minuscolo');
  config.discordHost = prima;
});

test('il nome corto porta al collegamento di QUEL canale, e a nient\'altro', () => {
  const m = SRV.slice(SRV.indexOf('config.discordHost && String(req.hostname'));
  assert.match(m, /req\.url = '\/collega\/' \+ d\[1\]\.toLowerCase\(\)/);
  assert.match(m, /\^\\\/\(\[a-z0-9_\]\{1,30\}\)\\\/\?\$/, 'un canale, non un percorso qualunque');
  assert.match(m.slice(0, 700), /res\.redirect\(302, config\.baseUrl \+ '\/'\)/, 'la radice non e\' una pagina: rimanda al sito');
  assert.match(m.slice(0, 700), /req\.path === '\/privacy'\) return next\(\);/,
    'e l\'informativa e\' un indirizzo, non un canale: la pagina ci linka');
});

test('il permesso della persona non esce dal modulo che lo usa', () => {
  assert.match(API, /export async function entraNelServer\(token, guild, utente, accessToken\)/);
  assert.match(API, /corpo: \{ access_token: String\(accessToken\) \}/);
  assert.ok(!/access_token/.test(SRV), 'il sito non deve nemmeno nominarlo');
  assert.match(SRV, /entraIn: c\?\.guild \? \{ guild: c\.guild, botToken: dcApi\.tokenDi\(c\) \} : null/,
    'il server passa il SERVER, non il permesso');
  assert.match(SRV, /urlAutorizzazione\(\{ \.\.\.config\.discordApp, state, entrare: true \}\)/,
    'e lo chiede solo dove un server collegato c\'e\'');
});

test('far entrare si chiede all\'invito, e si sa dire quando manca', () => {
  assert.match(API, /export const CREATE_INSTANT_INVITE = 1n << 0n;/);
  assert.match(API, /export const PERMESSI_BOT = String\([^)]*CREATE_INSTANT_INVITE/);
  assert.match(API, /export const puoFarEntrare = \(bits\) => puo\(bits, CREATE_INSTANT_INVITE\);/);
  assert.match(API, /puoFarEntrare: puoFarEntrare\(bits\)/, 'e la fotografia del server lo riporta');
});

test('il codice resta nel verso giusto: nasce sul web, si chiude in chat', () => {
  const cmd = leggi('src/features/discord-collega.js');
  assert.ok(!/parla\(`[^`]*\$\{codice\}/.test(cmd), 'il bot non scrive mai un codice in chat');
  assert.match(SRV, /dove \+ '\?codice=' \+ encodeURIComponent\(a\.codice\)/, 'il codice torna sulla pagina di chi ha autorizzato');
});

test('le frasi in chat sono dello streamer: le nostre sono solo il fondo', () => {
  assert.deepEqual(dc.CHIAVI_FRASI, ['inizio', 'fatto', 'scaduto', 'via', 'estraneo']);
  for (const k of dc.CHIAVI_FRASI) assert.ok(dc.FRASI[k], `manca la frase di casa: ${k}`);

  const pulite = dc.normalizzaFrasi({ inizio: '  ciao   {nome}  ', altro: 'non esiste', fatto: '' });
  assert.deepEqual(pulite, { inizio: 'ciao {nome}' }, 'solo le chiavi che conosciamo, e un campo vuoto non e\' una frase');
  assert.equal(dc.normalizzaFrasi({ inizio: 'x'.repeat(500) }).inizio.length, 300, 'e corta abbastanza per un messaggio di chat');

  assert.equal(dc.riempi('@{nome} vai su {link} e scrivi {codice}', { nome: 'ale', link: 'qui', codice: 'AB12' }),
    '@ale vai su qui e scrivi AB12');
  assert.equal(dc.riempi('{nome} {sconosciuto}', { nome: 'ale' }), 'ale {sconosciuto}',
    'un segnaposto che non esiste resta scritto com\'e\': non si inventa un vuoto');
});

test('il comando usa le frasi, non le scrive dentro di se\'', () => {
  const cmd = leggi('src/features/discord-collega.js');
  const dentro = cmd.slice(cmd.indexOf('export function tryComando'));
  assert.match(dentro, /const frasi = frasiDi\(ch\);/);
  assert.ok(!/parla\(`@\$\{nome\}/.test(dentro), 'nessuna risposta scritta a mano nel comando');
  assert.match(SRV, /campi\.frasi = dcCollega\.normalizzaFrasi\(b\.frasi\)/, 'e dal pannello si salvano passando di li\'');
});

test('la porta si apre a chi NON e\' di casa, che e\' chi ci passa', async () => {
  // Il difetto che non somigliava a un difetto, la seconda volta. La pagina del
  // collegamento rispondeva a chi era gia' dentro e 404 a tutti gli altri —
  // cioe' a TUTTI quelli a cui serve, perche' chi si collega una sessione non
  // ce l'ha. E sul nome corto non ce l'ha nemmeno chi e' loggato sul sito: il
  // cookie e' legato all'host.
  const { creaGuscio } = await import('../../src/web/vetrina.js');
  const g = creaGuscio(join(RAD, 'src/web/public'));
  for (const via of ['/collega/andryxify', '/api/discord/collega/andryxify', '/discord/oidc/callback']) {
    assert.equal(g.aperto(via), true, `${via}: chi arriva qui non ha una sessione, e non deve averne una`);
  }
  assert.equal(g.aperto('/api/streamer/ruoli'), false, 'e il cancello resta un cancello');
});

test('la pagina dice cosa succede PRIMA di mandarti da Discord', () => {
  const html = readFileSync(join(RAD, 'src/web/public/collega.html'), 'utf8');
  const passi = [...html.matchAll(/<li><strong>([^<]+)<\/strong>/g)].map((m) => m[1]);
  assert.equal(passi.length, 3, 'i tre passi del giro, scritti');
  assert.match(html, /id="btn"[^>]*hidden/, 'e il tasto non parte da solo: lo si preme');
  assert.match(html, /id="scelta"/, 'chi non vuole collegarsi deve poter dire di no e andarsene');
  const js = readFileSync(join(RAD, 'src/web/public/collega.js'), 'utf8');
  assert.match(js, /\$\('via'\)\.href = '\/u\/' \+ encodeURIComponent\(canale\)/, 'e il «no» porta da qualche parte di suo');
});

// IL LINK NON SI MANGIA LA PUNTEGGIATURA.
//
// «apri {link}: ti faccio entrare» diventava «…/andryxify: ti», e i due punti
// finivano DENTRO l'indirizzo: il tasto c'era, la pagina no. E' un errore che
// puo' ricomparire in ogni frase, comprese quelle scritte dallo streamer.
test('dopo il link ci va sempre uno spazio, anche nelle frasi di chi ha il canale', () => {
  const v = { nome: 'tizio', link: 'https://esempio.tld/pinco', codice: 'ABC123' };
  const reso = dc.riempi('apri {link}: e poi vedi', v);
  assert.ok(!reso.includes('/pinco:'), 'i due punti sono finiti dentro l\'indirizzo');
  assert.match(reso, /\/pinco\s/, 'il link deve finire su uno spazio');
});

test('le frasi di casa non hanno bisogno della rete: il link sta in fondo', () => {
  for (const k of ['inizio', 'scaduto']) {
    const t = dc.FRASI[k];
    if (!t.includes('{link}')) continue;
    assert.ok(t.trimEnd().endsWith('{link}'), `«${k}»: il link non e' in fondo alla frase`);
  }
});
