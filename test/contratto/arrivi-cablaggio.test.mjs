// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// CHI ARRIVA IN CHAT, i fili che lo legano al resto (docs/moduli.md, «Quando
// arriva in chat»), letti nel codice.
//
// La regola e i gesti hanno le loro prove (test/unita/arrivi.test.mjs,
// moduli-arrivi.test.mjs). Qui quello che sta in mezzo:
//  · nel tubo del messaggio l'accoglienza viene dopo l'antispam (chi e' stato
//    appena fermato non si accoglie) e prima del saluto generico, che tace per
//    chi ha la sua: una persona, un benvenuto;
//  · chi entra senza scrivere passa dal giro da cinque minuti, con l'inizio
//    della diretta che dice Twitch;
//  · Kick segna quando comincia la diretta: un riavvio non la ricomincia;
//  · il server non lascia passare una persona scritta storta in «Per chi» (la
//    regola varrebbe per tutti), ne' un comando che esegue se stesso;
//  · i suggerimenti di «Per chi» vengono dal canale della sessione, e la prova
//    «come se arrivasse…» ripulisce la persona che riceve;
//  · un modulo che se ne va porta via i segni delle sue accoglienze.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const BOT = leggi('src/bot.js');
const SRV = leggi('src/web/server.js');
const DB = leggi('src/db.js');
const PRES = leggi('src/features/presenze.js');

const tratto = (testo, da, fine) => {
  const i = testo.indexOf(da);
  assert.ok(i >= 0, `c'e' ${da}`);
  const j = testo.indexOf(fine, i + da.length);
  return testo.slice(i, j < 0 ? undefined : j);
};

test('nel tubo: dopo l\'antispam, prima del saluto generico, che tace per chi ha la sua accoglienza', () => {
  const gestisci = tratto(BOT, 'async _gestisciMessaggio(login, msg, onMessage, dire = null) {', '\n  }\n');
  assert.ok(gestisci.indexOf('antispam.tryAntispam') > 0, 'l\'antispam e\' nel primo tratto');
  assert.ok(!gestisci.includes('arrivi.suMessaggio'), 'l\'accoglienza non sta prima dell\'antispam');
  const elabora = tratto(BOT, '_elaboraMessaggio(login, msg, onMessage, parla = this.vocePer(msg), arrivo = undefined) {', '\n  }\n');
  const a = elabora.indexOf('arrivi.suMessaggio(msg, { engine: this.modules, say: parla, arrivo, twitchInizio: this._inizioTwitch(login) })');
  const p = elabora.indexOf('presenze.suMessaggio(msg, parla, { live, arrivo, tace: accolto.riguarda })');
  assert.ok(a > 0 && p > a, 'prima l\'accoglienza, poi il saluto generico che lo sa');
  assert.match(PRES, /if \(tace\) return null;/, 'e il saluto generico tace');
});

test('chi entra senza scrivere: lo stesso giro della presenza, con l\'inizio della diretta di Twitch', () => {
  const giro = tratto(BOT, 'async _tickWatchtime() {', '\n  }\n');
  assert.match(giro, /arrivi\.suGiro\(login, chatters, \{ engine: this\.modules, say: \(t\) => this\.say\(login, t\), twitchInizio: Date\.parse\(stream\.started_at\)/);
  assert.match(BOT, /_inizioTwitch\(login\) \{\n\s*if \(this\._liveState\.get\(login\) !== true\) return 0;\n\s*return Number\(rapporto\.inCorso\(login\)\?\.inizio\) \|\| 0;/, 'fuori diretta, nessun inizio: vale il giorno');
});

test('i segni delle accoglienze si potano dopo 90 giorni', () => {
  assert.match(BOT, /arriviDb\.pota\(Date\.now\(\) - 90 \* 86_400_000\)/);
});

test('Kick segna quando comincia la diretta, nel database', () => {
  assert.match(BOT, /statoVivo\.scrivi\(ev\.channel, 'diretta:' \+ ev\.piattaforma, \{ live: true, da: Date\.now\(\) \}\)/);
});

test('il server: persone scritte storte no, un comando che esegue se stesso no, i giochi del giro si', () => {
  const v = tratto(SRV, 'function validaModulo(m) {', '\n  }\n\n');
  assert.match(v, /const storta = persone\.find\(\(q\) => !arriviRegola\.normPersona\(q\)\);/, 'una persona storta ferma il salvataggio, invece di sparire');
  assert.match(v, /arriviRegola\.LIMITI\.persone/);
  assert.match(v, /Number\(m\.id\) === id\) return 'un comando non può eseguire se stesso'/);
  assert.match(v, /a\.gioco !== 'caso' && !giroRegole\.voceDi\(/);
  assert.match(SRV, /const MOD_TRIGGER = \[[^\]]*'arrivo'/);
  assert.match(SRV, /const MOD_AZIONI = \[[^\]]*'gioco', 'modulo'\]/);
});

test('suggerimenti dal canale della sessione; la prova ripulisce la persona; la pausa si limita', () => {
  const r = tratto(SRV, "app.get('/api/streamer/persone/recenti', requireLogin,", '\n  }));');
  assert.match(r, /const login = currentUser\(req\)\.login;/);
  assert.doesNotMatch(r, /req\.(query|body|params)/, 'il canale non arriva dalla richiesta');
  const prova = tratto(SRV, "app.post('/api/streamer/moduli/:id/prova', requireLogin,", '\n  }));');
  assert.match(prova, /arriviRegola\.normPersona\(req\.body\.persona\)/);
  assert.match(SRV, /out\.arrivi = \{ pausa: arriviRegola\.pausaDi\(b\.arrivi\?\.pausa\) \}/);
});

test('un modulo che se ne va porta via i segni; quello che si salva passa dalla stessa pulizia', () => {
  const rem = tratto(DB, '  // Con il modulo se ne vanno i segni delle sue accoglienze', '\n  },');
  assert.match(rem, /DELETE FROM arrivi WHERE channel=\? AND modulo=\?/);
  assert.match(DB, /trigger: m\?\.trigger\?\.tipo === 'arrivo' \? normTriggerArrivo\(m\.trigger\)/);
  assert.match(DB, /const chi = normChi\(out\.chi\);/);
  assert.match(DB, /WHERE arrivi\.occasione != excluded\.occasione/, 'il segno e\' uno per occasione, in un\'istruzione sola');
});
