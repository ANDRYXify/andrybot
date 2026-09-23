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
import { existsSync, readFileSync } from 'node:fs';
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

test('al bot si chiedono solo i permessi che usiamo, e il numero non si scrive a mano', () => {
  // Il numero dei permessi di Discord e' una somma di potenze di due: scritto a
  // mano non si legge, e aggiungerne uno diventa una cifra che cambia senza che
  // nessuno sappia cosa e' entrato. Qui si compone da permessi che hanno un
  // nome, e la prova puo' leggerli uno per uno.
  const r = /export const PERMESSI_BOT = String\(([A-Z_ |]+)\);/.exec(API);
  assert.ok(r, 'i permessi dell\'invito si compongono da costanti con un nome');
  const chiesti = r[1].split('|').map((x) => x.trim()).sort();
  assert.deepEqual(chiesti, ['CREATE_EVENTS', 'CREATE_INSTANT_INVITE', 'DA_DARE', 'EMBED_LINKS', 'MANAGE_CHANNELS', 'MANAGE_GUILD', 'MANAGE_ROLES', 'SEND_MESSAGES', 'VIEW_CHANNEL'],
    'quello che il bot usa, piu\' quello che deve poter passare: nient\'altro');

  // MANAGE_GUILD e' entrato dopo, ed e' il piu' largo dei cinque: con quello si
  // cambiano le impostazioni del server, la schermata di benvenuto, le domande
  // d'ingresso e la moderazione automatica — cioe' meta' di cosa vuol dire
  // tenere su un server. Sta nell'invito NORMALE, non fra i pieni poteri,
  // perche' chi entra col solo Discord non ha altro: senza, per lui meta' del
  // prodotto non esisterebbe.
  //
  // Il prezzo: permetterebbe anche di rifare il vestito del server (nome,
  // icona, stendardo) e di cancellare inviti altrui. Non lo facciamo, e non e'
  // una promessa: `scripts/verifica-poteri.mjs` controlla i CAMPI che finiscono
  // in PATCH /guilds/{id}, non solo quale porta si chiama.
  assert.match(API, /export const MANAGE_GUILD = 1n << 5n;/, 'il bit si scrive come potenza, non come numero');
  const poteri = readFileSync(join(RAD, 'scripts/verifica-poteri.mjs'), 'utf8');
  assert.match(poteri, /VIETATI_SUL_SERVER = \[/, 'niente cancello sui campi che rifanno il server');
  for (const campo of ['name', 'icon', 'vanity_url_code', 'owner_id']) {
    assert.ok(poteri.includes(`'${campo}'`), `il cancello non guarda «${campo}»`);
  }

  // CREATE_EVENTS e' entrato per ultimo, ed e' l'unico che si chiede perche' e'
  // il PIU' STRETTO dei due che servirebbero. Discord ne ha una coppia:
  // MANAGE_EVENTS tocca gli appuntamenti di tutti, CREATE_EVENTS lascia creare
  // e poi modificare o cancellare soltanto i propri.
  //
  // Prendiamo il secondo, e non e' un ripiego: e' quello che rende gli
  // appuntamenti scritti a mano dallo streamer intoccabili PER COSTRUZIONE. Il
  // giro che riallinea il calendario ogni sei ore potrebbe voler cancellare
  // qualcosa di suo — con questo permesso Discord non glielo lascia fare, e non
  // dipende dal fatto che il nostro codice ricordi di non farlo.
  //
  // MANAGE_EVENTS resta dov'era: dentro `DA_DARE`, cioe' fra i privilegi che il
  // bot passa al ruolo dei moderatori e non esercita mai.
  assert.match(API, /export const CREATE_EVENTS = 1n << 44n;/, 'anche questo bit si scrive come potenza');
  assert.match(API, /eventi: 1n << 33n,\s+\/\/ MANAGE_EVENTS/, 'e il permesso largo sugli eventi resta roba da passare ai moderatori');

  // DUE MOTIVI DIVERSI PER CHIEDERE UN PERMESSO, e non vanno confusi.
  //
  // Quelli con un nome proprio il bot li ADOPERA, e ognuno deve servire a
  // qualcosa: un permesso che non usiamo mai e' potere tenuto in tasca per
  // niente, e su casa d'altri. Qui non si conta quanti sono — un numero scritto
  // in una prova invecchia da solo — si controlla che nessuno stia fermo.
  const usati = chiesti.filter((p) => p !== 'DA_DARE');
  for (const p of usati) {
    assert.match(API, new RegExp(`puo\\(bits, ${p}\\)`), `${p} si chiede all'invito ma non lo usa nessuno`);
  }

  // `DA_DARE` e' l'altro motivo: privilegi che il bot non usa MAI e tiene solo
  // per poterli passare ai ruoli che gli si chiede di creare — Discord non
  // lascia dare a un ruolo un privilegio che chi lo crea non ha. Percio' qui
  // non si chiede che siano usati: si chiede che siano esattamente quelli
  // distribuibili, calcolati e non battuti a mano, e che nessuno li eserciti.
  assert.match(API, /export const DA_DARE = Object\.values\(PRIVILEGI\)\.reduce\(\(t, v\) => t \| v, 0n\);/,
    'la somma e\' quella esatta dei privilegi, cosi\' aggiungerne uno lo fa entrare da solo');
  assert.ok(!/DA_DARE = \d/.test(API), 'e non un numero scritto a mano, che un giorno non coincide piu\'');
  assert.ok(existsSync(join(RAD, 'scripts/verifica-poteri.mjs')),
    'e c\'e\' un cancello che controlla che quei poteri si passino soltanto, non si usino');
  // Allargare i permessi ha un prezzo: chi aveva gia' invitato il bot non ce
  // li ha. Non lo deve scoprire da un errore a meta' costruzione.
  const COS = leggi('src/features/discord-costruisci.js');
  assert.match(COS, /if \(!a\.foto\.puoCanali\) \{/, 'il costruttore guarda il permesso PRIMA di scrivere');
  assert.match(COS, /reinvito: true/, 'e la cura che dice e\' ripassare dal tasto dell\'invito');
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

  // NEMMENO CHI SCEGLIE SU QUALI CANALI GIRARE. Il filtro «token non vuoto»
  // nella query dei canali accesi era una seconda risposta alla stessa domanda,
  // scritta prima che esistesse il bot della casa: con quello la riga non ha
  // un token suo, e il giro dei ruoli non partiva mai per quasi nessuno.
  const DB = leggi('src/db.js');
  const q = DB.slice(DB.indexOf('attivi() {', DB.indexOf('export const dcRuoli')));
  assert.ok(!/token<>''/.test(q.slice(0, 200)), 'la scelta dei canali non guarda il token: lo decide tokenDi');
  const BOT = leggi('src/bot.js');
  const cal = BOT.slice(BOT.indexOf('async _giroEventiDiscord()'), BOT.indexOf('async _giroEventiDiscord()') + 1200);
  assert.ok(!/r\??\.token/.test(cal), 'e il calendario non legge il token della riga');
  assert.match(cal, /dcApi\.tokenDi\(r\)/);
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
