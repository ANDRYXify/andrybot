// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I PREMI DEL CANALE NEL PANNELLO, PER PIATTAFORMA (docs/PIATTAFORME.md, «I
// premi del canale su Kick»). Chi premia per il canale lo decide un posto solo
// nel server (premiDi): le rotte dei premi chiedono a lui, mai a helix a mano,
// e al pannello danno il rimedio della stessa piattaforma. I cinque riquadri
// dei premi lo mostrano con una funzione sola, e segnano la piattaforma di un
// premio quando nella lista ce ne sono di due.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leggi = (via) => readFileSync(new URL(`../../${via}`, import.meta.url), 'utf8');
const SRV = leggi('src/web/server.js');
const APP = leggi('src/web/public/app.js');
const tra = (testo, da, a) => {
  const i = testo.indexOf(da);
  assert.ok(i >= 0, `manca: ${da}`);
  const j = testo.indexOf(a, i + da.length);
  assert.ok(j > i, `manca la fine: ${a}`);
  return testo.slice(i, j);
};

test('una regola sola: la piattaforma del canale, col suo permesso e il suo rimedio', () => {
  const r = tra(SRV, 'const premiDi = (login) => {', '\n  };');
  assert.match(r, /p === 'twitch'\) return \{ piattaforma: 'twitch', premiatore: helix, permessoOk: redemptionsOk\(login\), rimedio: '\/auth\/permessi' \}/);
  assert.match(r, /p === 'kick'\) return \{ piattaforma: 'kick', premiatore: kickApi\.premiKick\(login\), permessoOk: kickApi\.puoPremiare\(login\), rimedio: kickApi\.puoModerare\(login\) \? '\/auth\/kick\?mod=1' : '\/auth\/kick' \}/);
  assert.match(r, /return \{ piattaforma: p, premiatore: null, permessoOk: false, rimedio: '' \}/, 'altrove nessuno');
});

test('le rotte dei premi chiedono a premiDi, mai a helix a mano', () => {
  assert.doesNotMatch(SRV, /helix\.(creaReward|listaRewardsTutti|listaRewards|eliminaReward)\(/, 'nessun premio chiesto a Twitch a mano');
  assert.equal((SRV.match(/pd\.premiatore\.creaReward\(/g) || []).length, 4, 'contatori, musica, penitenze, avvisi');
  assert.equal((SRV.match(/await tuttiIPremi\(login\)/g) || []).length, 5, 'musica, penitenze, avvisi, premi a tempo e la loro prova');
  assert.match(SRV, /const chi = kickApi\.eIdKick\(rid\) \? kickApi\.premiKick\(login\) : helix;/, 'si toglie da chi l\'ha dato');
  for (const rotta of ["app.get('/api/musica/premi'", "app.get('/api/penitenze/premi'", "app.get('/api/streamer/premi'"]) {
    const corpo = tra(SRV, rotta, '}));');
    assert.match(corpo, /rimedio/, `${rotta} dice il rimedio`);
    assert.match(corpo, /piattaforma/, `${rotta} dice la piattaforma`);
  }
});

test('un canale di Twitch con Kick collegato vede anche i premi di Kick', () => {
  const r = tra(SRV, 'const tuttiIPremi = async (login) => {', '\n  };');
  assert.match(r, /pd\.piattaforma === 'twitch' && kickApi\.puoPremiare\(login\)/);
  assert.match(r, /\.\.\.r, piattaforma: pd\.piattaforma/, 'ogni premio con la sua piattaforma');
});

test('i sei riquadri dei premi dicono il rimedio della piattaforma, e la scheda penitenze si apre su Kick', () => {
  assert.equal((APP.match(/_premiFuoriDaTwitch\(d\) \? /g) || []).length, 6, 'premi, effetti sui premi, premi a tempo, musica, penitenze, muro');
  assert.match(APP, /const ANCHE_SU = \{[^}]*penitenze: \['kick'\][^}]*\};/);
  const f = tra(APP, 'function _premiFuoriDaTwitch(d) {', '\n}\n');
  assert.match(f, /href="\$\{esc\(d\.rimedio \|\| '\/auth\/kick'\)\}">\$\{L\('Aggiorna i permessi di Kick'/);
  assert.doesNotMatch(f, /\/auth\/permessi/, 'chi e\' su Kick non va mai ai permessi di Twitch');
});
