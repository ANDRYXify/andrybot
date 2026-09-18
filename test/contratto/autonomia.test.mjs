// L'AUTONOMIA DEL BOT, letta nel codice: la decisione sta in un posto solo, il
// pannello e il manuale dicono lo stesso numero, e quello che dice da solo si vede.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const BOT = readFileSync(join(RAD, 'src/bot.js'), 'utf8');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const SRV = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
const MAN = readFileSync(join(RAD, 'src/web/manuali.js'), 'utf8');

test('parlare da solo parte da un momento della chat, non da un dado su un timer', () => {
  const battito = BOT.slice(BOT.indexOf('  _battitoAnima() {'), BOT.indexOf('  _valutaMomenti() {'));
  assert.doesNotMatch(battito, /Math\.random\(\) < auto \* 0\.4|decidiSpontanea|this\.brain\?\.iniziativa/, 'nel battito non si parla piu\' da soli');
  const f = BOT.slice(BOT.indexOf('  _valutaMomenti() {'), BOT.indexOf('  // Premi periodici'));
  assert.match(f, /this\._momenti\.vedi\(login, \{ ora, live, saQualcosa:/, 'i momenti li riconosce la chat');
  assert.match(f, /spontanea\.scegliMomento\(\{/, 'se e cosa dire lo decide la funzione');
  assert.match(f, /this\._ultimaSpontanea\.set\(login, ora\)/, 'il riposo si segna quando si decide');
  assert.match(f, /soloLive: s\.settings\?\.proattivoSoloLive === true/, 'la spunta «solo in diretta» arriva alla decisione');
  assert.match(f, /if \(tipo === 'domanda'\)/, 'una domanda rimasta sola si tratta a parte');
  assert.match(f, /this\.brain\.chatReply\(\{ channel: login, user: q\.user/, 'e si risponde come a una menzione');
  assert.match(f, /rispondiA: q\.id/, 'agganciata alla domanda');
  assert.match(f, /this\.brain\.iniziativa\(login, \{ spunto, aggancio: momento\.aggancio \}\)/,
    'il motivo E la riga a cui agganciarsi arrivano al cervello: la riga la sceglie chi la chat ce l\'ha in mano, non chi scrive la frase');
  assert.equal((f.match(/Promise\.resolve\(\)\.then\(\(\) => this\.brain\./g) || []).length, 2, 'le chiamate al cervello stanno in una promessa: un errore su un canale non spezza il giro degli altri');
  for (const tipo of ['domanda', 'battuta', 'promo']) assert.match(f, new RegExp(`_dettaDaSoloConCalma\\(login, '${tipo}'`), `${tipo} esce con calma e finisce nel registro`);
  assert.match(BOT, /this\._momentiTimer = setInterval\(\(\) => this\._valutaMomenti\(\), 15_000\);/, 'ogni quindici secondi');
  assert.match(BOT, /clearInterval\(this\._momentiTimer\);/, 'e si spegne con il bot');
});

test('la chat osservata comprende le righe dello streamer e del bot: senza, una domanda risposta sembrerebbe ancora sola', () => {
  const say = BOT.slice(BOT.indexOf('  say(channel, text, opzioni) {'), BOT.indexOf('  _dettaDaSolo('));
  assert.match(say, /this\._momenti\.osserva\(channel, \{ ts: Date\.now\(\), user: channel, testo: t, dalBot: true \}\)/);
  const el = BOT.slice(BOT.indexOf('  _elaboraMessaggio('), BOT.indexOf('  async reconcileListeners()'));
  assert.match(el, /this\._momenti\.osserva\(login, \{ ts: Date\.now\(\), user: msg\.user, display: msg\.display, testo: msg\.text, isSelf: !!msg\.isSelf, id: msg\.id, rispostaA: msg\.rispostaA \}\)/,
    'e con l\'informazione che il messaggio e\' appeso a un altro: senza, non si puo\' sapere che e\' roba fra due');
  const CHAT = readFileSync(join(RAD, 'src/twitch/chat.js'), 'utf8');
  assert.match(CHAT, /rispostaA: tags\['reply-parent-msg-id'\] \|\| '',/, 'il tag di Twitch che lo dichiara va letto');
});

test('il cervello del bot accetta un motivo e sa dire se conosce una risposta', () => {
  const BR = readFileSync(join(RAD, 'src/ai/brain.js'), 'utf8');
  assert.match(BR, /async iniziativa\(channel, \{ spunto = '', aggancio = null \} = \{\}\)/);
  // LA RIGA A CUI AGGANCIARSI NON SE LA PESCA PIU' DA SOLO. Si agganciava
  // all'ultima riga vera della chat, qualunque fosse: anche una risposta a un
  // altro, anche una riga che chiamava qualcuno per nome. Da fuori sembrava che
  // parlasse a caso, perche' si stava intromettendo fra due.
  const ini = BR.slice(BR.indexOf('async iniziativa(channel,'), BR.indexOf('  saQualcosa(channel, testo)'));
  assert.ok(!/righe\[righe\.length - 1\]/.test(ini), 'l\'ultima riga qualunque non e\' una riga a cui agganciarsi');
  assert.match(ini, /perLaStanza\(String\(r\.text \|\| ''\)\)/, 'e chi chiama senza passarne una trova la stessa regola come rete');
  assert.match(ini, /if \(!ultima\) return null;/, 'e se non c\'e\' nessuna riga buona, si tace');
  assert.match(BR, /situazione: \[this\._situazione\(channel\), spunto \? String\(spunto\)\.slice\(0, 200\) : ''\]\.filter\(Boolean\)\.join\('\\n'\)/, 'lo spunto entra nella situazione, che il modello legge');
  assert.match(BR, /saQualcosa\(channel, testo\) \{\s*try \{ return !!this\._cercaConoscenza\(channel, testo\); \}/, 'stessa soglia della scorciatoia: sa = e\' gia\' la risposta');
});

test('anche la manche automatica finisce nel registro, ma solo il suo annuncio', () => {
  const f = BOT.slice(BOT.indexOf('  _manche() {'), BOT.indexOf('  _distilla() {'));
  assert.match(f, /_dettaDaSolo\(login, 'manche', t\)/);
  assert.match(f, /if \(prima\) \{ prima = false;/, 'le righe successive del gioco sono risposte, non iniziative');
});

test('il cursore parte da zero: pannello, manuale e bot dicono lo stesso numero', () => {
  assert.match(APP, /spontaneita: typeof s\.spontaneita === 'number' \? s\.spontaneita : 0,/, 'il pannello mostra 0 a chi non ha mai salvato');
  assert.match(MAN, /\['Chat autonoma', '0%', '0–50%'/, 'il manuale dice 0%');
  const sp = readFileSync(join(RAD, 'src/features/spontanea.js'), 'utf8');
  assert.match(sp, /Number\(dose\) \|\| 0/, 'e il bot legge «non impostata» come zero');
  // «a zero non guarda nemmeno i momenti» adesso passa da spontanea.vietato, che
  // e' lo stesso posto da cui lo sa chi decide: prima era scritto due volte.
  const iDose = BOT.indexOf('const dose = Number(s.settings?.spontaneita) || 0;');
  const iMomenti = BOT.indexOf('this._momenti.vedi(', iDose);
  assert.ok(iDose > 0 && iMomenti > iDose, 'la dose si legge prima dei momenti');
  const prima = BOT.slice(iDose, iMomenti);
  assert.match(prima, /spontanea\.vietato\(\{ dose[\s\S]*?continue;/, 'a zero non guarda nemmeno i momenti');
  // e il silenzio che non si e' scelto non diventa credito da spendere dopo
  assert.match(prima, /spontanea\.riposaOra\(riposi, login, ora\);/, 'quando parlare era vietato, i riposi vanno avanti con l\'ora');
  assert.match(BOT, /if \(!momenti\.length\) \{ spontanea\.riposaOra\(riposi, login, ora\); continue; \}/, 'e anche quando non c\'era niente da dire');
});

test('«solo mentre sono in diretta» si disegna, si salva e si accetta', () => {
  assert.match(APP, /id="chk-proattivo-live" \$\{s\.proattivoSoloLive \? 'checked' : ''\}/);
  assert.match(APP, /proattivoSoloLive: s\.proattivoSoloLive === true,/, 'e il pannello lo normalizza come il codice: spento se non detto');
  assert.match(APP, /proattivoSoloLive: document\.getElementById\('chk-proattivo-live'\)\.checked,/);
  assert.match(SRV, /if \(b\.proattivoSoloLive !== undefined\) out\.proattivoSoloLive = !!b\.proattivoSoloLive;/);
  assert.match(MAN, /\['Solo mentre sono in diretta', 'spento'/);
});

test('cosa ha detto da solo si vede, e solo a chi e\' entrato', () => {
  const i = SRV.indexOf("app.get('/api/streamer/autonomia'");
  assert.ok(i > 0, 'la porta esiste');
  const r = SRV.slice(i, SRV.indexOf('}));', i));
  assert.match(r, /requireLogin/);
  assert.match(r, /manager\.spontanee\?\.\(login\)/);
  assert.match(r, /private, no-store/, 'e non finisce in nessuna cache condivisa');
  assert.match(APP, /api\('\/api\/streamer\/autonomia'\)/, 'il pannello la chiede');
  assert.match(APP, /id="lista-spontanee"/, 'e la disegna');
  assert.match(APP, /if \(id === 'personalita'\) \{ caricaGuide\(\); caricaSpontanee\(\); \}/, 'quando si apre la scheda');
});

test('ogni checkbox della scheda del bot mostra lo stesso default che il codice usa', () => {
  // Il pannello normalizza in impostazioni(): «acceso se non detto» per le cose
  // che il codice legge con `=== false`, «spento se non detto» per quelle che il
  // codice legge con `=== true`. Se una nuova manopola sbaglia verso, il
  // pannello mentirebbe a chi non ha mai salvato — e salvando il tono si
  // porterebbe a casa lo stato che vede.
  const norm = APP.slice(APP.indexOf('function impostazioni() {'), APP.indexOf('\n}\n', APP.indexOf('function impostazioni() {')));
  const accese = ['battuteAuto', 'rispostaMenzioni', 'iaLocale', 'proattivo', 'proattivoTg', 'internet', 'adattaCanale', 'giochi', 'promoSocial', 'clipAuto'];
  for (const k of accese) assert.match(norm, new RegExp(`${k}: s\\.${k} !== false,`), `${k}: acceso se non detto`);
  for (const k of ['ascoltoLive', 'proattivoSoloLive']) assert.match(norm, new RegExp(`${k}: s\\.${k} === true,`), `${k}: spento se non detto`);
  const codice = BOT + readFileSync(join(RAD, 'src/features/clips.js'), 'utf8') + readFileSync(join(RAD, 'src/ai/brain.js'), 'utf8');
  for (const k of ['proattivo', 'iaLocale', 'clipAuto', 'proattivoTg']) assert.match(codice, new RegExp(`settings\\??\\.${k} === false`), `il codice legge ${k} come acceso se non detto`);
  assert.match(codice, /settings\?\.ascoltoLive === true/);
  assert.match(codice, /settings\?\.proattivoSoloLive === true/);
});
