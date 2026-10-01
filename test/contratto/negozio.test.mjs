// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL NEGOZIO E' CABLATO DOVE DEVE: nel tubo dei comandi, all'avvio, e nella pulizia.
//
// Le regole dell'acquisto si provano in test/unita/negozio.test.mjs. Qui si
// guarda che il bot le usi davvero: un gestore scritto bene e mai chiamato, o
// chiamato fuori dal vaglio dei comandi pronti, sarebbe verde nelle prove e
// muto (o sordo ai nomi scelti dallo streamer) in chat.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bot = readFileSync('src/bot.js', 'utf8');

test('i comandi del negozio passano dal vaglio, con la voce del messaggio', () => {
  const dentro = bot.slice(bot.indexOf('if (!suo && !vaglio?.salta) {'), bot.indexOf('// Il conteggio automatico delle parole non e\' un comando'));
  assert.match(dentro, /negozio\.tryComando\(cmdMsg, parla, \{/, 'col testo gia\' tradotto nel nome di serie, e la voce di chi ha scritto');
  assert.match(dentro, /helix: this\.helix, effetti: this\.effects, moduli: this\.modules,/, 'con i motori che fanno partire quello che si compra');
  assert.match(dentro, /live: msg\.piattaforma && msg\.piattaforma !== 'twitch' \? true : this\._liveState\.get\(login\) === true,/);
});

test('all\'avvio si rende quello rimasto a meta\', e lo storico si pulisce anche se il bot si riavvia spesso', () => {
  assert.match(bot, /for \(const r of negozio\.rimborsaSospesi\(\)\)/);
  const avvio = bot.slice(bot.indexOf('const potaNegozio = '), bot.indexOf('this._negozioTimer = setInterval(potaNegozio'));
  assert.match(avvio, /^ {4}potaNegozio\(\);$/m, 'una volta subito, non solo dopo sei ore');
  assert.match(bot, /clearInterval\(this\._negozioTimer\)/);
});

// LA SCHEDA. Nasce registrata per intero (menu, nome nelle tre lingue, icona,
// descrizione, guida, parti), porta la sua sotto-scheda per ognuna delle tre
// parti del piano, e la porta del server la serve dal canale di chi e' entrato.
const app = readFileSync('src/web/public/app.js', 'utf8');
const srv = readFileSync('src/web/server.js', 'utf8');

test('la scheda Negozio sta nel gruppo della chat, registrata per intero', () => {
  const gruppo = app.slice(app.indexOf("{ id: 'pubblico', nome: 'Chat e pubblico'"), app.indexOf("{ id: 'diretta', nome:"));
  assert.match(gruppo, /\['negozio', 'Negozio'\]/);
  assert.match(app, /negozio: \['Negozio', 'Shop', 'Tienda'\],/, 'il nome nelle tre lingue, come le altre (T_SCHEDA)');
  assert.match(app, /\n {2}negozio: \s*_ico\(/, 'l\'icona nel menu');
  assert.match(app, /SCHEDA_FUNZ = \{[^}]*negozio: 'giochi'/, 'si apre con il piano che ha le monete');
  assert.match(app, /\$\{pannelloNegozio\(\)\}/);
  assert.match(app, /if \(id === 'negozio'\) \{ caricaNegozio\(\); caricaPaginaLink\(false, 'negozio'\); requestAnimationFrame\(\(\) => applicaSottoSchede\('negozio'\)\); \}/);
  const sotto = app.slice(app.indexOf('const SOTTO_SCHEDE = {'), app.indexOf('function sottoScelta('));
  for (const z of ['articoli', 'consegnare', 'storico', 'pagina']) {
    assert.match(sotto, new RegExp(`\\['${z}', \\[`), `la parte «${z}» fra le sotto-schede`);
    assert.ok(app.includes(`<div data-zona="${z}">`), `e la sua zona nella scheda`);
  }
});

test('la porta del server passa dal negozio, col canale di chi e\' entrato', () => {
  const porte = [...srv.matchAll(/app\.(get|post|delete)\('(\/api\/streamer\/negozio[^']*)', (requireLogin|requireOwner)/g)].map((m) => `${m[1]} ${m[2]}`);
  assert.deepEqual(porte.sort(), [
    'delete /api/streamer/negozio/articoli/:id', 'get /api/streamer/negozio', 'get /api/streamer/negozio/ruoli',
    'post /api/streamer/negozio/articoli', 'post /api/streamer/negozio/attivo', 'post /api/streamer/negozio/coda/:id',
  ].sort());
  const blocco = srv.slice(srv.indexOf("app.get('/api/streamer/negozio'"), srv.indexOf('// crea/aggiorna un gioco personalizzato'));
  assert.ok(!/req\.(body|query|params)\??\.(login|channel|canale)/.test(blocco), 'il canale non arriva mai dalla richiesta');
  assert.equal(blocco.match(/currentUser\(req\)\.login/g).length, 6, 'ogni porta prende il canale dalla sessione');
  assert.match(blocco, /manager\.say\(login, r\.frase\)/, 'chi viene rimborsato a mano lo sa in chat');
});

test('in demo la scheda ha i suoi dati, e il manuale la racconta', async () => {
  assert.match(app, /if \(via\.startsWith\('\/api\/streamer\/negozio'\)\) return Promise\.resolve\(_demoNegozio\(metodo, via, opzioni\.body\)\);/);
  const { MANUALI } = await import('../../src/web/manuali.js');
  const { sezioneManuale } = await import('../aiuto.mjs');
  const sez = sezioneManuale(MANUALI, 'negozio');
  for (const eti of ['Negozio aperto', 'Nuovo articolo', 'Salva l’articolo', 'Rifiuta e rimborsa', 'Da consegnare', 'Storico', 'Com’è andata']) {
    assert.ok(app.includes(eti), `«${eti}» e\' un\'etichetta vera del pannello`);
    assert.ok(sez.includes(`«${eti}»`), `e il manuale la cita com\'e\': «${eti}»`);
  }
});
