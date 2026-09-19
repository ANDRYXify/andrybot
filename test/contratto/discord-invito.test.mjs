// L'ID DEL SERVER NON ARRIVA DAL BROWSER.
//
// Quando lo streamer invita il bot, Discord rimanda indietro due cose: un
// `code` e — nella query — un `guild_id`. La query passa dal browser di chi
// autorizza, e una query si riscrive a mano nella barra degli indirizzi.
//
// Se ci fidassimo di quella, chiunque potrebbe scriverci l'id del server di un
// ALTRO streamer dove il nostro bot e' gia' dentro, e da li' in poi le proprie
// regole muoverebbero i ruoli di casa d'altri. L'id buono sta nella RISPOSTA
// dello scambio del codice, che viaggia da Discord a noi e non passa da
// nessuna parte in mezzo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const API = leggi('src/features/discord-api.js');
const SRV = leggi('src/web/server.js');

test('il ritorno dell’invito non guarda nemmeno il guild_id della query', () => {
  const i = SRV.indexOf("app.get('/discord/oidc/callback'");
  const corpo = SRV.slice(i, SRV.indexOf("res.redirect(dove + '?codice=", i));
  assert.ok(i > 0, 'il ritorno c’è');
  assert.ok(!/guild_id/.test(corpo), 'un id di server preso dalla query punterebbe le regole a casa d’altri');
  assert.match(corpo, /dcApi\.scambiaInvito\(/, 'si scambia il codice, e l’id viene da lì');
  assert.match(corpo, /dcRuoli\.set\(st\.login, \{ guild: g\.guild/, 'e si salva quello');
});

test('e lo scambio prende il server dalla risposta di Discord', () => {
  const f = API.slice(API.indexOf('export async function scambiaInvito'));
  const corpo = f.slice(0, f.indexOf('\n}'));
  assert.match(corpo, /const id = String\(d\?\.guild\?\.id \|\| ''\);/, 'l’id sta dentro il corpo della risposta');
  assert.match(corpo, /if \(!idOk\(id\)\) return/, 'e se non e\' un id vero non si va avanti');
});

test('i due giri tornano dalla stessa porta, e a distinguerli e\' lo stato monouso', () => {
  // Un secondo indirizzo di ritorno vorrebbe dire un secondo Redirect da
  // registrare su Discord a mano: un passo in piu' proprio nella cosa che
  // stiamo togliendo.
  const CFG = leggi('src/config.js');
  assert.ok(!/BOT_REDIRECT|botRedirect/i.test(CFG), 'niente secondo indirizzo di ritorno da registrare a mano su Discord');
  assert.equal((CFG.match(/redirectUri: env\('DISCORD/g) || []).length, 1, 'e ce n\'e\' uno solo anche nei conti');
  const i = SRV.indexOf("app.get('/discord/oidc/callback'");
  assert.match(SRV.slice(i, i + 900), /if \(st\.tipo === 'bot'\)/, 'a dire quale giro e\' stato e\' lo stato, non l\'indirizzo');
  assert.match(SRV, /dcStati\.set\(state, \{ tipo: 'bot', login: currentUser\(req\)\.login/, 'e lo stato del bot porta CHI ha chiesto');
  assert.match(SRV, /dcStati\.set\(state, \{ tipo: 'spettatore', canale/);
});

test('al bot si chiede un permesso solo, e non si offre una strada che non c\'e\'', () => {
  assert.match(API, /export const PERMESSI_BOT = '268435456';/, 'solo «Gestire i ruoli»');
  const f = API.slice(API.indexOf('export function urlInvitoBot'));
  assert.match(f.slice(0, 500), /scope: 'bot'/);
  assert.ok(!/guilds|administrator|permissions: '8'/.test(f.slice(0, 500)), 'niente poteri che non ci servono');
  const i = SRV.indexOf("app.get('/api/discord/invito'");
  assert.ok(i > 0, 'la porta dell’invito c’è');
  assert.match(SRV.slice(i, i + 400), /if \(!config\.discordApp\?\.bot\) return res\.status\(503\)/,
    'senza un bot della piattaforma la strada si dice chiusa, invece di aprirla e fallire dopo');
});

test('il token con cui si parla e\' uno solo, e lo decide un posto solo', () => {
  assert.match(API, /export const tokenDi = \(riga\) => String\(riga\?\.token \|\| ''\)\.trim\(\) \|\| String\(config\.discordApp\?\.botToken \|\| ''\)\.trim\(\);/);
  const GIRO = leggi('src/features/discord-giro.js');
  assert.ok(!/conf\.token/.test(GIRO), 'il giro non legge piu\' il token da solo');
  assert.match(GIRO, /const token = api\.tokenDi\(conf\);/);
  const COLL = leggi('src/features/discord-collega.js');
  assert.match(COLL, /c\.guild && tokenDi\(c\)/, 'e nemmeno chi decide se un canale accetta collegamenti');
});

// IL BUCO CHE APRE UN BOT CONDIVISO.
//
// Finche' ogni streamer si portava il suo bot, scrivere a mano l'id di un
// server altrui era inutile: quel bot li' dentro non c'era. Con un bot della
// piattaforma il conto cambia — il nostro bot sta in TUTTI i server dei nostri
// streamer, e un id scritto nel pannello sarebbe una chiave per casa d'altri.
//
// Quindi: col bot della casa il server lo dice Discord, e basta. L'id a mano si
// accetta solo insieme a un token suo, dove il problema non esiste per
// costruzione.
test('col bot della casa, l\'id del server non si scrive a mano', () => {
  const i = SRV.indexOf("app.post('/api/streamer/ruoli', requireOwner");
  const corpo = SRV.slice(i, SRV.indexOf('res.json(ruoliVisti', i));
  assert.match(corpo, /const suo = campi\.token \|\| String\(prima\?\.token \|\| ''\)\.trim\(\);/,
    'si guarda se se n\'e\' portato uno suo');
  assert.match(corpo, /if \(chiesto && suo\) campi\.guild = chiesto;/,
    'l\'id dal pannello si accetta solo col bot suo');
  assert.match(corpo, /return res\.status\(400\)/, 'e sennò si dice di no, invece di ignorarlo in silenzio');
});

test('e nemmeno la prova si fa contro un server che non e\' il nostro', () => {
  const i = SRV.indexOf("app.post('/api/streamer/ruoli/prova', requireOwner");
  const corpo = SRV.slice(i, SRV.indexOf('const r = await dcApi.prova', i));
  assert.match(corpo, /\(suo \? req\.body\?\.guild : undefined\)/,
    'col bot della casa la prova guarda il server salvato, non quello che arriva dal pannello');
});
