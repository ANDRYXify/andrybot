// LA TUA SETTIMANA: le cose che il modello non puo' dire da solo, perche'
// stanno nelle rotte, nel pannello e nel giro delle sei ore.
//
// Il ragionamento sta in docs/SETTIMANA.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cartellaUsaEGetta } from '../aiuto.mjs';
import { creaGuscio } from '../../src/web/vetrina.js';

const usaEGetta = cartellaUsaEGetta('andrybot-settimana-');
const { SCOPES } = await import('../../src/config.js');
test.after(() => usaEGetta.pulisci());

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');
const SRV = leggi('src/web/server.js');
const BOT = leggi('src/bot.js');
const APP = leggi('src/web/public/app.js');
const rotta = (inizio, lungo = 4000) => { const i = SRV.indexOf(inizio); assert.ok(i >= 0, `manca ${inizio}`); return SRV.slice(i, i + lungo); };

test('la settimana si legge da un posto solo: nessuno legge piu\' i giorni dalle grafiche', () => {
  const letture = [...SRV.matchAll(/grafiche\?\.giorni/g)].length;
  assert.equal(letture, 1, 'resta solo la riga che li lascia dove sono per chi non ha ancora salvato');
  assert.match(SRV, /const giorni = Array\.isArray\(s\.settings\?\.grafiche\?\.giorni\) \? s\.settings\.grafiche\.giorni : \[\];/,
    'e salvare le grafiche non li riscrive con quello che arriva dal pannello');
  assert.ok(!/grafiche\?\.giorni/.test(BOT), 'il giro delle sei ore chiede alla settimana');
  assert.match(BOT, /settimanaFeat\.perIlCalendario\(s\?\.settings\)/);
  assert.match(rotta("app.get('/api/streamer/dcserver/eventi'"), /settimana\.perIlCalendario\(s\?\.settings\)/, 'e anche il calendario di Discord');
  assert.match(SRV, /settimana: settimana\.vistaSettimana\(settimana\.settimanaDi\(s\.settings\)\)/, 'il pannello la riceve gia\' letta');
});

test('le rotte sono dello streamer, e «Manda» vuole un JPEG vero e piccolo', () => {
  for (const r of ["app.get('/api/streamer/settimana'", "app.post('/api/streamer/settimana'", "app.post('/api/streamer/settimana/manda'"]) {
    assert.match(rotta(r, 200), /requireOwner/, `${r} senza guardiano`);
  }
  const manda = rotta("app.post('/api/streamer/settimana/manda'", 5000);
  assert.match(manda, /byte\[0\] === 0xFF && byte\[1\] === 0xD8 && byte\[2\] === 0xFF/, 'il JPEG si riconosce dai byte, non dal nome');
  assert.match(manda, /byte\.length > SETTIMANA_MAX/);
  assert.match(manda, /_mandando\.has\(login\)/, 'un doppio clic non manda due volte');
  assert.match(manda, /finally \{ _mandando\.delete\(login\); \}/, 'e un errore a meta\' non blocca il giro dopo');
  assert.match(manda, /mieTg\.get\(id\)/, 'si manda solo nei posti che sono suoi');
  assert.match(manda, /mieDc\.get\(id\)/);
});

test('l\'immagine per Instagram e\' pubblica solo quanto serve', () => {
  const via = rotta("app.get('/pubblici/:nome'", 600);
  assert.match(SRV, /const PUBBLICO_RE = \/\^\[a-f0-9\]\{32\}\\\.jpg\$\//, 'solo nomi casuali da 128 bit');
  assert.match(via, /!PUBBLICO_RE\.test\(nome\)/, 'nessun altro nome passa, niente percorsi');
  assert.ok(creaGuscio(join(RAD, 'src/web/public')).aperto('/pubblici/' + 'a'.repeat(32) + '.jpg'),
    'Meta la scarica senza sessione: se il cancello non la lascia passare, Instagram riceve 404');
  const manda = rotta("app.post('/api/streamer/settimana/manda'", 5000);
  assert.match(manda, /crypto\.randomBytes\(16\)\.toString\('hex'\)/);
  assert.match(manda, /finally \{ try \{ unlinkSync\(p\); \}/, 'si cancella appena pubblicata, anche se Instagram dice di no');
  assert.match(manda, /spazzaPubblici\(\);/, 'e quelle rimaste da un giro interrotto se ne vanno');
});

test('il Programma di Twitch: il permesso si chiede, e il giro scrive solo la memoria di cosa e\' nostro', () => {
  assert.ok(SCOPES.broadcaster.includes('channel:manage:schedule'));
  assert.match(APP, /'channel:manage:schedule': L\('il Programma del canale'/, 'e il pannello sa dire perche\' lo chiede');
  const giro = BOT.slice(BOT.indexOf('async _giroProgramma()'), BOT.indexOf('async _giroProgramma()') + 1400);
  assert.match(giro, /improntaSettimana\(adesso\) !== settimanaFeat\.improntaSettimana\(sett\)\) continue;/,
    'se nel frattempo la settimana e\' stata salvata, il giro vecchio non riscrive niente');
  assert.match(giro, /scritti: e\.scritti/);
  assert.match(BOT, /this\._giroEventiDiscord\(\); this\._giroProgramma\(\);/, 'allo stesso passo del calendario di Discord');
});

test('i tasti «Vai a…» portano tutti da qualche parte', () => {
  assert.match(APP, /const b = ev\.target\.closest\?\.\('button\[data-vai\]'\);\s+const id = b\?\.dataset\.vai;\s+if \(!id \|\| !schedaValida\(id\)\) return;/,
    'uno solo per tutti: prima alcuni avevano l\'attributo e nessuno che li ascoltasse');
  const mete = [...APP.matchAll(/data-vai="([a-z0-9]+)"/g)].map((m) => m[1]);
  assert.ok(mete.length >= 5);
  const schede = new Set([
    ...[...APP.matchAll(/\['([a-z0-9]+)', '[^']+'\]/g)].map((m) => m[1]),
    ...[...APP.matchAll(/parti: \[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/'([a-z0-9]+)'/g)].map((x) => x[1])),
  ]);
  for (const m of mete) assert.ok(schede.has(m), `«Vai a» verso una scheda che non c'e': ${m}`);
});

test('nel pannello la settimana ha una scheda sua, e le grafiche non la riscrivono', () => {
  assert.match(APP, /\['settimana', 'Settimana'\],\n\s+\['grafiche', 'Grafiche'\],/);
  assert.ok(!/gr-riga-giorno/.test(APP), 'i giorni non si scrivono piu\' nelle grafiche');
  assert.match(APP, /function grafGiorni\(giorni\) \{\n\s+const gg = GIORNI_CORTI\(\);/, 'e sulla grafica escono nella lingua del pannello');
  assert.ok(!/GR_GIORNI/.test(APP), 'non c\'e\' piu\' l\'elenco in italiano e basta');
});

test('«cosa fai» accetta un gioco o un titolo, e la categoria si vede mentre si scrive', () => {
  assert.match(APP, /placeholder="\$\{esc\(L\('un gioco o un titolo', 'a game or a title', 'un juego o un título'\)\)\}"/, 'il campo dice che va bene l\'uno o l\'altro');
  const r = rotta("app.get('/api/streamer/settimana/categoria'", 600);
  assert.match(r, /requireOwner/);
  assert.match(r, /categoria\.risolviCategoria\(helix, q\)/, 'mentre si scrive, la stessa ricerca del salvataggio');
  assert.match(SRV, /sett\.twitch\.categorie = await settimana\.categorieDi\(helix, sett\)/, 'e il salvataggio passa da quella');
  assert.match(APP, /api\('\/api\/streamer\/settimana\/categoria\?q=' \+ encodeURIComponent\(t\)\)/);
});

test('nel pannello le categorie di Twitch si cercano in un posto solo', () => {
  assert.ok(!/cercaGiochiRegia/.test(APP), 'la Regia non ha piu\' la sua ricerca');
  const usi = [...APP.matchAll(/_cercaCategorie\((\w+|document\.getElementById\('[\w-]+'\))/g)].map((m) => m[1]);
  assert.ok(usi.includes('gCerca'), 'la Regia usa la ricerca di tutti');
  assert.ok(usi.includes('campo'), 'e i giorni della settimana anche');
  assert.equal([...APP.matchAll(/api\('\/api\/streamer\/regia\/giochi\?q='/g)].length, 1, 'una chiamata sola alla ricerca dei giochi');
});
