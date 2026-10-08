// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA SCHEDA «I TUOI FOLLOWER» (docs/FOLLOWER.md): le porte, il bot, il pannello.
//
// Le porte sono del solo proprietario e solo per Twitch, e ognuna passa da
// features/follower.js. Il bot mette in lista i follow che arrivano, riprende
// giri e lavori dopo un riavvio, pota gli usciti. Il pannello ha la scheda nel
// gruppo dello scudo, dice i motivi con le stesse parole del server, e la prova
// del sito ha una lista finta da guardare, che si comporta come quella vera.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as G from '../../src/features/follower-giudizio.js';

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const SRV = leggi('src/web/server.js');
const APP = leggi('src/web/public/app.js');
const BOT = leggi('src/bot.js');
const rotta = (inizio, n = 900) => { const i = SRV.indexOf(inizio); assert.ok(i > 0, `c'e': ${inizio}`); return SRV.slice(i, i + n); };
const pezzo = (da, a) => { const i = APP.indexOf(da); const j = APP.indexOf(a, i + 1); assert.ok(i > 0 && j > i, `c'e': ${da}`); return APP.slice(i, j); };

const PORTE = [
  "app.get('/api/follower/stato', ",
  "app.post('/api/follower/giro', ",
  "app.get('/api/follower/elenco', ",
  "app.post('/api/follower/azione', ",
  "app.post('/api/follower/lavoro', ",
  "app.get('/api/follower/lavoro', ",
  "app.post('/api/follower/lavoro/ferma', ",
  "app.post('/api/follower/lavoro/riprendi', ",
  "app.get('/api/follower/controlla', ",
  "app.get('/api/follower/esporta.csv', ",
];

test('ogni porta dei follower e\' del solo proprietario, e solo per Twitch', () => {
  for (const p of PORTE) {
    const r = rotta(p);
    assert.match(r, /^app\.(get|post)\('[^']+', requireOwner, /, p);
    assert.match(r, /const login = followerDi\(req, res\); if \(!login\) return;/, `${p}: solo Twitch`);
  }
  assert.match(rotta('const followerDi = (req, res) => {', 400), /piattaformaDi\(login\) !== 'twitch'/);
});

test('il lavoro in massa passa il numero di conferma e il filtro ripulito; la foto di Controlla e\' solo di Twitch', () => {
  const l = rotta("app.post('/api/follower/lavoro', ", 900);
  assert.match(l, /conferma: req\.body\?\.conferma/);
  assert.match(l, /filtro: filtroFollower\(req\.body\?\.filtro \|\| \{\}\)/);
  assert.match(l, /\.slice\(0, followerFeat\.LAVORO_MAX\)/, 'gli id non passano il tetto');
  const c = rotta("app.get('/api/follower/controlla', ", 1200);
  assert.match(c, /if \(r\.profilo && !\/\^https:\\\/\\\/static-cdn\\\.jtvnw\\\.net\\\/\/\.test\(r\.profilo\.foto\)\) r\.profilo\.foto = '';/);
  const csv = rotta("app.get('/api/follower/esporta.csv', ", 700);
  assert.match(csv, /'Cache-Control', 'private, no-store'/);
});

test('il bot: il follow entra in lista subito, giri e lavori ripartono, gli usciti vecchi si potano', () => {
  assert.match(BOT, /if \(type === 'channel\.follow'\) \{\n\s+\/\/[^\n]*\n\s+try \{ followerFeat\.arrivato\(channel, data \|\| \{\}\); \}/, 'prima di decidere se e\' ripetuto: segue adesso');
  assert.match(BOT, /followerFeat\.configura\(\{ helix: this\.helix \}\);\n\s+followerFeat\.riprendiTutto\(\);/);
  assert.match(BOT, /try \{ followerFeat\.pota\(\); \} catch/);
});

test('il pannello: una scheda nel gruppo dello scudo, solo Twitch, coi suoi nomi e la sua guida', () => {
  assert.match(APP, /\['attacchi', 'Gli attacchi'\],\n\s+\['follower', 'I tuoi follower'\],\n\s+\['registro', 'Registro'\],/);
  assert.match(APP, /const SOLO_TWITCH = \[[^\]]*'follower'/);
  assert.match(APP, /  follower: \['I tuoi follower', 'Your followers', 'Tus seguidores'\],/);
  assert.match(APP, /  follower:    _ico\(/);
  assert.match(APP, /if \(id === 'follower'\) caricaFollower\(\);/);
  assert.match(APP, /\$\{pannelloAttacchi\(\)\}\n\s+\$\{pannelloFollower\(\)\}/);
  const g = pezzo('  follower: { serve: [', '\n  registro: { serve: [');
  const pan = pezzo('function pannelloFollower() {', 'function folQuery(');
  for (const [, ancora] of g.matchAll(/'(#[a-z-]+)'\]/g)) assert.ok(pan.includes(`id="${ancora.slice(1)}"`), `la guida punta a ${ancora}, che c'e' nella scheda`);
});

test('il pannello dice i motivi con le stesse parole del server, per ogni codice', () => {
  const m = pezzo('const FOL_MOTIVO = {', 'const folLivello =');
  for (const k of Object.keys(G.TESTI_MOTIVO)) assert.match(m, new RegExp(`\\n  ${k}: \\(`), `il pannello ha il motivo «${k}»`);
  const nomi = pezzo('const FOL_LIVELLO = {', 'const FOL_FILTRI');
  for (const l of G.LIVELLI_FOLLOWER) assert.match(nomi, new RegExp(`\\n  ${l}: \\[`), `e il livello «${l}»`);
  const filtri = pezzo('const FOL_FILTRI = [', 'const FOL_MOTIVO');
  for (const f of G.LIVELLI_FILTRO) assert.match(filtri, new RegExp(`\\['${f}', `), `e il filtro «${f}»`);
});

test('il pannello conferma col numero, chiede prima di toccare un protetto, e la veglia si ferma a scheda chiusa', () => {
  assert.match(APP, /api\('\/api\/follower\/lavoro', \{ method: 'POST', body: \{ azione, filtro: \{ \.\.\._folFiltro \}, conferma: n \} \}\)/);
  assert.match(APP, /if \(e\.dati\?\.errore === 'protetto' && !forza\) \{/);
  assert.match(APP, /api\('\/api\/follower\/azione', \{ method: 'POST', body: \{ azione, userId, forza \} \}\)/);
  const v = pezzo('function folVeglia() {', 'function folBarra(');
  assert.match(v, /if \(!inCorso \|\| DEMO\) return;/);
  assert.match(v, /if \(document\.hidden \|\| schedaAttiva !== 'follower'\)/);
  assert.match(APP, /<div id="fol-massa" data-non-salva><\/div>/, 'il numero di conferma non accende la barra del salvataggio');
  assert.match(APP, /<div class="fol-filtri" data-non-salva>/);
});

test('la prova del sito ha la sua lista, risponde a ogni porta, e il CSV non porta fuori', () => {
  assert.match(APP, /if \(via\.startsWith\('\/api\/follower\/'\)\) \{\n\s+try \{ const r = _demoFollower\(metodo, via, percorso, opzioni\.body \|\| \{\}\);/);
  const d = pezzo('function _demoFollower(', 'function _demoAttacchi(');
  for (const p of ['/api/follower/stato', '/api/follower/elenco', '/api/follower/azione', '/api/follower/lavoro', '/api/follower/controlla']) assert.ok(d.includes(`'${p}'`), p);
  assert.match(APP, /if \(DEMO && ev\.target\.closest\('#fol-csv'\)\) \{ ev\.preventDefault\(\);/);
});

test('la prova del sito filtra, ordina, conta e sceglie chi toccare come il server, su ogni combinazione', () => {
  // La prova del sito non puo' importare il giudizio: ne ha una copia. Qui la
  // copia si confronta con l'originale su tutto quello che il pannello manda,
  // all'inizio e dopo le azioni che chi la prova puo' fare, cosi' quello che si
  // vede nella prova e' quello che farebbe il server.
  const i = APP.indexOf('let _demoFol = null;');
  const k = APP.indexOf('function _demoAttacchi(', i);
  assert.ok(i > 0 && k > i);
  const D = new Function(`${APP.slice(i, k)}; return { _demoFolLista, _demoFolFiltra, _demoFolAzionabile, _demoFolConti, _demoFollower };`)();
  const righe = D._demoFolLista().righe;
  for (const livello of G.LIVELLI_FOLLOWER) for (const stato of ['', 'tolto', 'bloccato', 'apposto']) for (const uscito of [0, 1]) for (const chiuso of [false, true]) for (const a of G.AZIONI_FOLLOWER) {
    const x = { livello, stato, uscito, chiuso };
    assert.equal(!!D._demoFolAzionabile(x, a), !!G.azionabile(x, a), `chi toccare: ${JSON.stringify({ ...x, a })}`);
  }
  const motivi = new Set(righe.flatMap((x) => x.motivi.map((m) => m.k)));
  for (const m of motivi) assert.ok(G.TESTI_MOTIVO[m], `il motivo «${m}» della prova e' uno vero`);
  const ondate = ['', ...D._demoFolLista().ondate.map((o) => `${o.inizio}-${o.fine}`)];
  const confronta = (quando) => {
    assert.deepEqual(D._demoFolConti(), G.contiDi(righe), `i conti, ${quando}`);
    for (const livello of G.LIVELLI_FILTRO) for (const eta of ['', '1', '7', '30', '365']) for (const foto of [false, true]) for (const ondata of ondate) for (const cerca of ['', 'bot', 'xkqz']) for (const ordine of G.ORDINI) {
      const q = new URLSearchParams(Object.entries({ livello, eta, foto, ondata, cerca, ordine }).filter(([, v]) => v !== '' && v !== false).map(([c, v]) => [c, v === true ? '1' : String(v)]));
      const ora = Date.now();
      assert.deepEqual(D._demoFolFiltra(q).map((x) => x.user_id), G.filtra(righe, G.filtroDa(Object.fromEntries(q)), ora).map((x) => x.user_id), `${quando}: ${q}`);
    }
  };
  confronta('all\'inizio');
  const di = (cond) => righe.find((x) => !x.uscito && cond(x)).user_id;
  const fai = (azione, userId) => D._demoFollower('POST', '/api/follower/azione', '/api/follower/azione', { azione, userId });
  // dopo ogni azione la riga e' come la lascia il server (follower.js, esegui)
  const come = (id) => { const x = righe.find((r) => r.user_id === id); return [x.stato, x.uscito > 0]; };
  const bloccato = di((x) => x.livello === 'noto');
  fai('blocca', bloccato);
  assert.deepEqual(come(bloccato), ['bloccato', true], 'bloccato: non segue piu\'');
  const tolto = di((x) => x.livello === 'probabile');
  fai('togli', tolto);
  assert.deepEqual(come(tolto), ['tolto', true], 'tolto: non segue piu\'');
  const guardato = di((x) => x.livello === 'dubbio');
  const prima = righe.find((x) => x.user_id === guardato);
  const [livello, motiviPrima] = [prima.livello, JSON.stringify(prima.motivi)];
  fai('apposto', guardato);
  assert.deepEqual(come(guardato), ['apposto', false]);
  confronta('dopo un blocco, un follow tolto e un «a posto»');
  fai('nonapposto', guardato);
  assert.deepEqual([prima.livello, JSON.stringify(prima.motivi), prima.stato], [livello, motiviPrima, ''], '«non piu\' a posto» torna com\'era, come lo rigiudica il server');
  fai('sblocca', bloccato);
  assert.deepEqual(come(bloccato), ['', true], 'sbloccato non vuol dire che segue di nuovo');
  confronta('dopo «non piu\' a posto» e uno sblocco');
});

test('la privacy dice della lista dei follower, nelle tre lingue', () => {
  for (const f of ['privacy.html', 'privacy-en.html', 'privacy-es.html']) {
    const t = leggi('src/web/public/' + f);
    assert.match(t, /<li id="lista-follower">/, f);
    assert.match(t, /(trenta giorni|thirty days|treinta días)/, `${f}: quanto restano gli usciti`);
  }
});

test('la lista esce nei dati dello streamer e non e\' fra le tabelle negate', async () => {
  const { NEGATE } = await import('../../src/features/esporta.js');
  assert.equal(NEGATE.follower_elenco, undefined);
});
