// LA PUBBLICITA', dal modello alla pagina pubblica.
//
// Il ragionamento sta in docs/PUBBLICITA.md. Qui si controlla che i pezzi ci
// siano tutti e dicano la stessa cosa: la sottoscrizione a Twitch, il giro che
// conta i secondi, i comandi nel pannello, e il racconto in vetrina. Una cosa
// che il modello sa fare e nessuno trova e' una cosa fatta a meta'.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as P from '../../src/features/pubblicita.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const EVENTI = leggi('src/twitch/events.js');
const BOT = leggi('src/bot.js');
const SRV = leggi('src/web/server.js');
const APP = leggi('src/web/public/app.js');
const VISTA = leggi('src/web/vetrina-vista.js');

test('la sottoscrizione a Twitch c\'è, ed è quella giusta', () => {
  assert.match(EVENTI, /type: 'channel\.ad_break\.begin', version: '1', condition: \{ broadcaster_user_id: bid \}/);
  // E l'unica che esiste: se un giorno qualcuno ne cercasse una per la fine,
  // qui trova scritto che non c'e'.
  assert.ok(!/ad_break\.end/.test(EVENTI), 'un evento di fine Twitch non ce l\'ha');
});

test('il permesso lo chiediamo già: nessuno deve reinvitare niente', () => {
  const CFG = leggi('src/config.js');
  assert.match(CFG, /'channel:read:ads'/, 'serve alla sottoscrizione e al programma');
  assert.match(CFG, /'moderator:manage:announcements'/, 'serve a parlare evidenziato');
});

test('il bot ascolta l\'evento e tiene il conto', () => {
  assert.match(BOT, /if \(type === 'channel\.ad_break\.begin'\)/);
  assert.match(BOT, /_pubblicitaPartita\(/);
  assert.match(BOT, /this\._pubTimer = setInterval\(\(\) => this\._giroPubblicita\(\), 30_000\)/);
  assert.match(BOT, /clearInterval\(this\._pubTimer\)/, 'e si spegne quando il bot si ferma');
  // Lo stato sta in memoria: un riavvio deve PERDERE il conto, se no il saluto
  // arriverebbe in ritardo ed e' proprio quello che non deve succedere.
  assert.ok(!/pubblicita.*setSettings|setSettings.*finisceA/.test(BOT), 'il conto non si salva su disco');
});

test('fuori diretta non si chiede niente a Twitch', () => {
  const f = BOT.slice(BOT.indexOf('async _giroPubblicita()'), BOT.indexOf('async _annuncio('));
  assert.match(f, /if \(live && pub\.vaGuardato\(/, 'il programma si chiede solo a chi e\' in onda');
  assert.match(f, /for \(const \[ch, live\] of this\._liveState\)/, 'e chi e\' in onda lo dice la fonte unica');
});

test('il pannello ha i comandi, e stanno dove sta già la pubblicità', () => {
  for (const q of ['acceso', 'colore', 'quanto', 'tolleranza']) {
    assert.ok(APP.includes(`data-pub="${q}"`), `manca il comando «${q}»`);
  }
  // I tre momenti li disegna una funzione sola, e i loro comandi nascono da
  // li': cercarli scritti a mano vorrebbe dire pretendere che siano copiati
  // tre volte, che e' il contrario di quello che si vuole.
  assert.match(APP, /data-pub="\$\{q\}-acceso"/);
  assert.match(APP, /data-pub="\$\{q\}-testo"/);
  for (const m of ['prima', 'durante', 'dopo']) {
    assert.ok(APP.includes(`momento('${m}'`), `il momento «${m}» non e' disegnato`);
  }
  // Dentro la scheda della regia: una scheda nuova per tre caselle di testo
  // sarebbe un menu in piu' da cercare.
  const regia = APP.slice(APP.indexOf("pannello('regia'"), APP.indexOf('let _pub = null;'));
  assert.match(regia, /id="pub-box"/, 'la carta sta nella regia');
});

test('i limiti li decide il modello, non il pannello', () => {
  // Scritti due volte, un giorno direbbero due cose diverse: il pannello li
  // riceve e li mostra.
  assert.match(SRV, /limiti: \{ colori: pubblicita\.COLORI, preavvisoMin: pubblicita\.PREAVVISO_MIN/);
  assert.match(APP, /_pub\.limiti/);
  assert.ok(!/preavvisoMax: 300|PREAVVISO_MAX = 300;[\s\S]{0,0}/.test(APP.replace(/preavvisoMax: 300/g, '')), 'e non li riscrive');
});

test('la porta che salva i messaggi non calpesta quella che manda la pubblicità', () => {
  // Express prende la prima che combacia: due porte con lo stesso indirizzo
  // vorrebbero dire che il tasto «Manda pubblicita'» smette di mandarla.
  assert.match(SRV, /app\.post\('\/api\/streamer\/regia\/pubblicita\/messaggi'/);
  assert.match(SRV, /app\.post\('\/api\/streamer\/regia\/pubblicita'/);
  assert.match(APP, /'\/api\/streamer\/regia\/pubblicita\/messaggi'/);
});

test('i testi di serie ci sono, e si possono svuotare', () => {
  const c = P.normalizzaPubblicita({ acceso: true });
  for (const m of P.MOMENTI) assert.ok(c[m].testo.length > 10, `«${m}» nasce con qualcosa da dire`);
  assert.equal(P.normalizzaPubblicita({ acceso: true, dopo: { testo: '' } }).dopo.testo, '');
});

test('e la pagina pubblica lo racconta', () => {
  assert.ok(/pubblicit|ad break|anuncio/i.test(VISTA), 'chi sta decidendo se prenderlo non lo vedrebbe');
  const NOV = leggi('NOVITA.md');
  assert.ok(/pubblicit/i.test(NOV), 'e chi lo usa già nemmeno');
});
