// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LO SCUDO ALL'INGRESSO DEL GRUPPO TELEGRAM, i fili che lo legano al resto,
// letti nel codice (docs/TELEGRAM.md, «Lo scudo all'ingresso»).
//
// La regola e i gesti hanno le loro prove (test/unita/tg-scudo*.test.mjs) e la
// pagina il suo collaudo in un browser (scripts/verifica-scudo-tg.mjs). Qui
// c'e' quello che sta in mezzo e che nessuna delle due vede: se uno di questi
// fili si stacca, lo scudo e' acceso nel pannello e spento nei fatti.
//  · Telegram ci manda le richieste di ingresso solo se gliele chiediamo;
//  · nel webhook la richiesta passa per prima (il guardiano aspetta dieci
//    secondi), chi entra chiude la sua richiesta prima del cancello, e
//    nessuna delle due cose scende nella strada dei messaggi;
//  · la porta aperta dentro Telegram e le chiamate della prova non restano da
//    nessuna parte;
//  · chi sei lo dice SOLO la firma di Telegram, e del corpo arrivano ai gesti
//    solo i quattro campi della pagina; il tetto al minuto viene prima di tutto;
//  · sulla porta (docs/TELEGRAM.md, «Una porta sola») chi sei lo dice SOLO il
//    codice che il server ha dato alla pagina, la porta dev'essere pubblicata,
//    e prima di aprire una prova nuova ci sono il tetto al minuto, lo scudo
//    acceso e il tetto all'ora;
//  · le richieste scadute si chiudono da sole, le righe vecchie si potano, e
//    lo scarico dei dati non le porta via;
//  · la Mini App si puo' aprire dentro Telegram (Caddy), e il sito sa che
//    quelle strade sono sue (vetrina).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { UPDATE_VOLUTI } from '../../src/features/telegram.js';
import { NEGATE } from '../../src/features/esporta.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const SRV = leggi('src/web/server.js');
const BOT = leggi('src/bot.js');
const PAG = leggi('src/web/public/telegram-porta.js');

const tratto = (testo, da, fine) => {
  const i = testo.indexOf(da);
  assert.ok(i >= 0, `c'e' ${da}`);
  const j = testo.indexOf(fine, i + da.length);
  return testo.slice(i, j < 0 ? undefined : j);
};

test('Telegram ci manda le richieste di ingresso', () => {
  assert.ok(UPDATE_VOLUTI.includes('chat_join_request'), 'senza, il guardiano non ci porta nessuno');
  assert.ok(UPDATE_VOLUTI.includes('chat_member'), 'e chi entra');
});

test('nel webhook: prima la richiesta, poi chi entra (scudo, poi cancello), poi i messaggi', () => {
  const w = tratto(SRV, "app.post('/tg/:secret'", '\n  }));');
  const richiesta = w.indexOf('req.body?.chat_join_request');
  const entra = w.indexOf('req.body?.chat_member');
  const messaggi = w.indexOf('req.body?.message');
  assert.ok(richiesta > 0 && entra > richiesta && messaggi > entra, 'l\'ordine: richiesta, chi entra, messaggi');
  const ramoR = w.slice(richiesta, entra);
  assert.match(ramoR, /scudoTg\.richiesta\(conf, req\.body\)/, 'la richiesta va allo scudo');
  assert.match(ramoR, /return;/, 'e non scende nei messaggi');
  const ramoE = w.slice(entra, w.indexOf('req.body?.callback_query'));
  const s = ramoE.indexOf('scudoTg.entrato('), c = ramoE.indexOf('cancello.entrato(');
  assert.ok(s > 0 && c > s, 'chi entra chiude la sua richiesta, poi passa dal cancello');
  assert.match(ramoE, /return;/, 'e non scende nei messaggi');
});

test('la porta dentro Telegram e le chiamate della prova non restano da nessuna parte', () => {
  const senza = tratto(SRV, 'const scudoSenzaTracce', '\n');
  assert.match(senza, /'Cache-Control': 'private, no-store'/);
  assert.match(senza, /'Referrer-Policy': 'no-referrer'/);
  assert.match(senza, /'X-Robots-Tag': 'noindex, nofollow'/);
  assert.match(tratto(SRV, "app.get('/telegram/:canale/verifica'", '\n  }));'), /scudoSenzaTracce\(res\)/, 'la pagina');
  assert.match(tratto(SRV, "app.post('/api/tg-scudo/:canale/:azione'", '\n  }));'), /scudoSenzaTracce\(res\)/, 'le chiamate');
  assert.match(tratto(SRV, "app.post('/api/tg-porta/:canale/:azione'", '\n  }));'), /scudoSenzaTracce\(res\)/, 'e quelle della porta');
});

test('chi sei lo dice solo la firma; del corpo passano solo i campi della pagina; il tetto prima di tutto', () => {
  const r = tratto(SRV, "app.post('/api/tg-scudo/:canale/:azione'", '\n  }));');
  assert.match(r, /scudoTg\.identifica\(conf, req\.body\?\.initData, req\.body\?\.c\)/, 'la persona viene dalla firma');
  assert.doesNotMatch(r, /req\.body\?\.(user|userId|chatId|chat_id|tg_user_id|channel|login)\b/, 'niente dal corpo decide chi sei');
  assert.match(r, /rispostaScudo\(res, azione, conf, id, corpoScudo\(req\.body\)\)/, 'ai gesti arriva il corpo filtrato');
  assert.ok(r.indexOf('extRateOk(') < r.indexOf('scudoTg.identifica('), 'il tetto al minuto prima di ogni conto');
  const corpo = tratto(SRV, 'const corpoScudo', '\n');
  const campi = [...corpo.matchAll(/(\w+): b\?\.\w+/g)].map((m) => m[1]).sort();
  assert.deepEqual(campi, ['codice', 'firma', 'regole', 'risposte']);
  // e la pagina, fuori dall'anteprima, non manda cookie
  assert.match(PAG, /credentials: modo === 'anteprima' \? 'same-origin' : 'omit'/);
  assert.doesNotMatch(PAG, /localStorage|sessionStorage|document\.cookie/, 'la pagina non tiene niente');
});

test('sulla porta chi sei lo dice solo il codice della pagina; prima di una prova nuova, i tetti e lo scudo', () => {
  const r = tratto(SRV, "app.post('/api/tg-porta/:canale/:azione'", '\n  }));');
  assert.match(r, /scudoTg\.identificaPorta\(conf, req\.body\?\.s, lingua\)/, 'la persona e\' il codice della pagina');
  assert.doesNotMatch(r, /req\.body\?\.(user|userId|chatId|chat_id|tg_user_id|channel|login|initData|url|invito)\b/, 'niente dal corpo decide chi sei o dove si entra');
  assert.match(r, /rispostaScudo\(res, azione, conf, id, corpoScudo\(req\.body\)\)/, 'ai gesti arriva il corpo filtrato');
  assert.match(r, /const login = eLoginNostro\(nome\) && tgPorta\.aperta\(nome\) \? nome : '';/, 'solo una porta pubblicata');
  const tetto = r.indexOf('extRateOk('), nuova = r.indexOf("if (azione === 'nuova')");
  const spento = r.indexOf('scudoTg.acceso(conf)'), ora = r.indexOf('provaNuovaOk('), apre = r.indexOf('scudoTg.nuovaPorta(');
  assert.ok(tetto > 0 && tetto < nuova, 'il tetto al minuto prima di ogni conto');
  assert.ok(nuova < spento && spento < ora && ora < apre, 'scudo spento: niente da aprire, e non conta nel tetto; poi il tetto all\'ora; poi la prova');
  // la pagina: il codice della pagina sta solo in memoria, e va solo al nostro server
  assert.match(PAG, /var segreto = '';/);
  assert.match(PAG, /\{ s: segreto, lingua: lingua \}/);
  assert.doesNotMatch(PAG, /location\.(hash|search)\s*=|history\.(push|replace)State/, 'il codice non finisce nell\'indirizzo');
});

test('le richieste scadute si chiudono da sole, le righe vecchie si potano, lo scarico non le porta', () => {
  assert.match(BOT, /scudoTg\.giroScadenze\(/, 'il giro delle scadenze');
  assert.match(BOT, /tgScudo\.pota\(Date\.now\(\) - 7 \* 86_400_000\)/, 'sette giorni');
  assert.match(BOT, /clearInterval\(this\._scudoPota\)/, 'e si ferma col bot');
  assert.ok(NEGATE.tg_scudo, 'le richieste di ingresso non vanno nello scarico dei dati');
});

test('la Mini App si apre dentro Telegram, e il sito sa che quelle strade sono sue', () => {
  const caddy = leggi('Caddyfile');
  const m = /@tgapp expression `([^`]+)`/.exec(caddy);
  assert.ok(m, 'il matcher della Mini App');
  assert.match(m[1], /'\/telegram\/\*\/verifica'/, 'la prova sotto /telegram/');
  assert.match(m[1], /path\('\/\*\/verifica'\)/, 'e sull\'indirizzo telegram.<dominio>');
  const vetrina = leggi('src/web/vetrina.js');
  const pref = tratto(vetrina, 'const PREFISSI = [', '];');
  assert.match(pref, /'\/telegram\/'/);
  assert.match(pref, /'\/api\/tg-scudo\/'/);
  assert.match(pref, /'\/api\/tg-porta\/'/);
});
