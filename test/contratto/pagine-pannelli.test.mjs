// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE PAGINE DIETRO I PANNELLI, COME SONO CABLATE (docs/STRUMENTI.md, «La pagina
// dietro il pannello»).
//
// Le prove di unita' (test/unita/pagine-pannelli.test.mjs) provano le funzioni;
// qui si fissa che le porte del server le usino, e nel modo giusto:
//  · chi la apre arriva a una pagina solo se e' accesa E il pannello salvato
//    ci porta: il canale e il pannello vengono dall'indirizzo e basta;
//  · i pezzi vivi si leggono adesso, dai blocchi di QUELLA pagina, e solo
//    quelli che la pagina mostra;
//  · chi la modifica e' il proprietario, dalla sessione, e ogni porta controlla
//    l'id del pannello prima di toccare l'archivio;
//  · il pannello parla con la porta del suo pannello, non con quella della
//    pagina link.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const senzaCommenti = (t) => t.replace(/^\s*\/\/.*$/gm, '');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');
const SRV = senzaCommenti(leggi('src/web/server.js'));
const APP = leggi('src/web/public/app.js');
const tratto = (testo, da, a) => {
  const i = testo.indexOf(da);
  assert.ok(i >= 0, `manca ${da}`);
  const j = typeof a === 'number' ? i + a : testo.indexOf(a, i + da.length);
  return testo.slice(i, j < 0 ? undefined : j);
};

test('la pagina pubblica: accesa, col pannello salvato che ci porta, e niente dalla domanda', () => {
  const r = tratto(SRV, "app.get('/u/:user/p/:id', wrap(", "app.get('/u/:user/negozio/media/:id'");
  assert.match(r, /const login = String\(req\.params\.user \|\| ''\)\.toLowerCase\(\);\n\s*const id = String\(req\.params\.id \|\| ''\)\.toLowerCase\(\);/);
  assert.match(r, /if \(!eLoginNostro\(login\) \|\| !paginaPannello\.idOk\(id\)\) return notFound\(res\);/, 'un id che non e\' di un pannello non arriva all\'archivio');
  assert.match(r, /if \(!p \|\| !p\.attiva \|\| !portaAllaPagina\(s, id\)\) return notFound\(res\);/, 'spenta, o senza il pannello che ci porta: non c\'e\'');
  assert.ok(!/req\.(body|query)/.test(r), 'niente arriva dalla domanda');
  assert.match(r, /dietro: \{ url: urlPaginaPannello\(login, id\) \}/, 'si presenta come la pagina di quel pannello');
  assert.match(r, /vivi: viviDi\(login\)\(p\.blocchi\)/, 'i pezzi vivi dai blocchi salvati, letti adesso');
  assert.ok(!/visitePagina/.test(r), 'non conta visite');
  assert.match(SRV, /const portaAllaPagina = \(s, id\) => pannelliTw\.portaAllaPagina\(s\?\.settings\?\.pannelli, id\);/, 'la serie SALVATA dei pannelli, non quella che il pannello sta modificando');
});

test('la sua informativa si apre alla stessa condizione della pagina, e dice di essere della pagina dietro il pannello', () => {
  const r = tratto(SRV, "app.get('/u/:user/p/:id/privacy', wrap(", "app.get('/u/:user/negozio/media/:id'");
  assert.match(r, /if \(!eLoginNostro\(login\) \|\| !paginaPannello\.idOk\(id\)\) return notFound\(res\);/);
  assert.match(r, /if \(!p \|\| !p\.attiva \|\| !portaAllaPagina\(s, id\)\) return notFound\(res\);/, 'chiusa la pagina, chiusa la sua informativa');
  assert.match(r, /quale: 'dietro', urlTorna: urlPaginaPannello\(login, id\),/);
  assert.ok(!/req\.(body|query)/.test(r), 'niente arriva dalla domanda');
});

test('i pezzi vivi si leggono dai dati di adesso, e solo quelli che la pagina mostra', () => {
  const v = tratto(SRV, 'const viviDi = (login) => (blocchi) => {', '\n  };\n');
  assert.match(v, /const usa = \(t\) => \(blocchi \|\| \[\]\)\.some\(\(b\) => b\?\.tipo === t\);/);
  assert.match(v, /if \(usa\('programma'\)\) \{\n\s*const sett = settimana\.settimanaDi\(streamers\.get\(login\)\?\.settings\);/, 'la settimana del canale, adesso');
  assert.match(v, /if \(usa\('comandi'\)\) out\.comandi = pannelliTw\.comandiPubblici\(modulesDb\.list\(login\)\);/, 'i comandi del canale, filtrati da comandiPubblici');
  for (const porta of ["app.get('/u/:user', wrap(", "app.get('/dona/:login', wrap("]) {
    assert.match(tratto(SRV, porta, 4000), /vivi: viviDi\(login\)\(p\.blocchi\)/, `${porta}: anche la pagina link e le donazioni li leggono adesso`);
  }
});

test('chi modifica e\' il proprietario, dalla sessione, e l\'id si controlla a ogni porta', () => {
  const porte = ["app.get('/api/paginapannello/:id', requireOwner,", "app.post('/api/paginapannello/:id', requireOwner,",
    "app.post('/api/paginapannello/:id/anteprima', requireOwner,", "app.delete('/api/paginapannello/:id', requireOwner,"];
  for (const r of porte) assert.ok(SRV.includes(r), r);
  const blocco = tratto(SRV, porte[0], "app.get('/api/paginanegozio', requireOwner,");
  assert.ok(!/req\.(body|query|params)\??\.(login|channel|canale|user)/.test(blocco), 'il canale non arriva mai dalla richiesta');
  assert.equal((blocco.match(/const login = currentUser\(req\)\.login;/g) || []).length, 4, 'ogni porta lo prende dalla sessione');
  assert.equal((blocco.match(/if \(!paginaPannello\.idOk\(id\)\) return res\.status\(400\)/g) || []).length, 4, 'e ogni porta rifiuta un id che non e\' di un pannello');
  assert.match(blocco, /pubblicata: esiste && p\.attiva && portaAllaPagina\(s, id\)/, '«pubblicata» e\' la stessa regola della pagina pubblica');
  assert.match(tratto(blocco, "app.delete('/api/paginapannello/:id'", 500), /paginaPannello\.salva\(login, id, \{ \.\.\.p, attiva: false \}\)/, 'togliere la spegne e la tiene: se torna, torna com\'era');
});

test('il pannello parla con la porta del suo pannello, e i pannelli sanno quali pagine sono accese', () => {
  assert.match(APP, /const lpApi = \(\) => \(LP\.quale === 'pannello' \? '\/api\/paginapannello\/' \+ encodeURIComponent\(LP\.pannello\) : LP_API\[LP\.quale\] \|\| LP_API\.link\);/);
  assert.match(APP, /const _panLink = \(v\) => \(v\.pagina \? \(PAN_STATO\.dati\?\.pagine\?\.\[v\.id\] \|\| ''\) : \(v\.link \|\| ''\)\);/,
    'con la sua pagina il link del pannello e\' calcolato, e vuoto finche\' la pagina non e\' accesa');
  const p = tratto(SRV, "app.get('/api/streamer/pannelli', requireLogin,", "\n  }));\n");
  assert.match(p, /pagine: Object\.fromEntries\(paginaPannello\.accese\(login\)\.map\(\(r\) => \[r\.pannello, urlPaginaPannello\(login, r\.pannello\)\]\)\)/);
});
