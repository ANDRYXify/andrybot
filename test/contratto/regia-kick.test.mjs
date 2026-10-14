// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA REGIA PER CHI STA SU KICK.
//
// La Regia parlava solo con Twitch: chi stava solo su Kick riceveva «concedi il
// permesso» di Twitch per cambiare titolo e categoria, e chi stava su tutte e
// due aggiornava solo Twitch. Ora titolo e categoria passano dalla regola unica
// (cambiaIlCanale, la stessa della voce e del privato Telegram), con un esito
// per piattaforma; tag, clip, marker, pubblicita' e raid restano di Twitch, e
// dove Twitch non c'e' non si mostrano.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leggi = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const SRV = leggi('src/web/server.js');
const APP = leggi('src/web/public/app.js');
const tratto = (src, da, a) => { const i = src.indexOf(da); assert.ok(i >= 0, da); return src.slice(i, src.indexOf(a, i + da.length)); };

test('il server cambia titolo e categoria su ogni piattaforma, un esito per ciascuna', () => {
  const r = tratto(SRV, "app.post('/api/streamer/regia/canale'", '\n  }));');
  assert.ok(r.includes("await cambiaIlCanale(login, 'titolo', titolo)"));
  assert.ok(r.includes("await cambiaIlCanale(login, 'categoria', gioco)"));
  assert.ok(!r.includes('helix.searchCategories'), 'la categoria non si cerca piu\' solo su Twitch');
  assert.ok(!/if \(!canaleOk\(login\)\) return res\.status\(403\)/.test(r), 'niente piu\' «permesso di Twitch» per chi sta su Kick');
  assert.ok(r.includes("if (Object.keys(patch).length && tokens.get('broadcaster', login)?.accessToken)"), 'tag e lingua solo dove c\'e\' Twitch');
  assert.ok(r.includes('res.json({ ok: esiti.some((e) => e.ok), esiti });'));
});

test('lo stato dice le piattaforme, e chi sta solo su Kick vede la sua diretta e il suo canale', () => {
  const r = tratto(SRV, "app.get('/api/streamer/regia', requireLogin", '\n  }));');
  assert.ok(r.includes('await kickApi.statoCanale(login)'));
  assert.ok(r.includes('if (!twitch) {') && r.includes("canale = { ...canale, title: kick.titolo, gameName: kick.categoria };"));
  assert.ok(r.includes('res.json({ permessi, piattaforme, live, canale,'));
  const g = tratto(SRV, "app.get('/api/streamer/regia/giochi'", '\n  }));');
  assert.ok(g.includes('kickApi.cercaCategorie(login, q)'), 'chi non ha Twitch cerca fra le categorie di Kick');
});

test('il pannello: niente tasti di Twitch dove Twitch non c\'e\', avviso di Kick, categoria per nome', () => {
  const p = tratto(APP, 'function pannelloRegia() {', '\n}\n');
  assert.equal((p.match(/data-solo-twitch/g) || []).length, 3, 'tag, azioni rapide e pubblicita\'');
  assert.ok(p.includes('id="regia-kick-nota"'));
  const c = tratto(APP, 'async function caricaRegia() {', '\nfunction _regiaTic');
  assert.ok(c.includes("soloTwitch.forEach((el) => { el.hidden = !tw; });"));
  assert.ok(c.includes('if (tw && !p.broadcast)'), 'il banner dei permessi di Twitch solo a chi ha Twitch');
  const s = tratto(APP, 'async function salvaRegiaCanale() {', '\n}\n');
  assert.ok(s.includes('if (_regiaGameNome) body.giocoNome = _regiaGameNome;'));
  assert.ok(!s.includes('giocoId'), 'l\'id di Twitch non vale su Kick');
});

test('l\'esito si dice per piattaforma', () => {
  const src = tratto(APP, 'const _REGIA_DOVE = ', '\n}\n') + '\n}\n';
  const L = (it) => it;
  const esiti = new Function('L', src + 'return _regiaEsiti;')(L);
  assert.equal(esiti([{ dove: 'twitch', ok: true }, { dove: 'kick', ok: true }]), 'Aggiornato su Twitch e Kick.');
  assert.equal(esiti([{ dove: 'twitch', ok: true }, { dove: 'kick', permesso: true }]), 'Aggiornato su Twitch. Su Kick manca il permesso: ricollegalo.');
  assert.equal(esiti([{ dove: 'kick', nonTrovata: true }]), 'Su Kick non trovo questa categoria.');
  assert.equal(esiti([{ dove: 'kick', errore: true }]), 'Su Kick non è andato: riprova fra poco.');
  assert.equal(esiti([{ dove: 'twitch', cosa: 'titolo', ok: true }, { dove: 'twitch', cosa: 'tag', ok: true }]), 'Aggiornato su Twitch.');
});
