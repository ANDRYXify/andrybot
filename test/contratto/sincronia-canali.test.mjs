// LA SINCRONIA DEI CANALI, letta nel codice: un giro alla volta, e il posto
// dell'unita' preso PRIMA di aspettare la rete. Due giri insieme avviavano due
// unita' per lo stesso canale: due connessioni, due risposte a ogni comando.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const BOT = readFileSync(join(RAD, 'src/bot.js'), 'utf8');

test('syncChannels non si sovrappone a se stesso', () => {
  const f = BOT.slice(BOT.indexOf('  async syncChannels() {'), BOT.indexOf('  async _syncChannels() {'));
  assert.match(f, /if \(this\._syncInCorso\) return this\._syncInCorso;/, 'un giro in corso si aspetta, non si raddoppia');
  assert.match(f, /\.finally\(\(\) => \{ this\._syncInCorso = null; \}\)/, 'e finito il giro il posto si libera, anche se e\' andato male');
});

test('il posto dell\'unita\' si prende prima di aspettare la rete', () => {
  const f = BOT.slice(BOT.indexOf('  async _syncChannels() {'), BOT.indexOf('  reconcileYoutube('));
  const prende = f.indexOf("this.units.set(login, { chat, connesso: false });");
  const aspetta = f.indexOf('await chat.connect();');
  assert.ok(prende > 0 && aspetta > 0 && prende < aspetta, 'units.set viene PRIMA di await chat.connect()');
  assert.match(f, /catch \(e\) \{ this\.units\.delete\(login\); throw e; \}/, 'e se il collegamento fallisce il posto si restituisce');
});

test('ogni chiamata verso Twitch ha un limite di tempo', () => {
  for (const f of ['src/twitch/helix.js', 'src/twitch/auth.js', 'src/twitch/events.js']) {
    const righe = readFileSync(join(RAD, f), 'utf8').split('\n');
    const chiamate = righe.map((r, i) => [r, i]).filter(([r]) => /\bfetch\(|this\._fetch\(/.test(r) && !/fetchFn \|\|/.test(r));
    assert.ok(chiamate.length > 0, `${f} chiama la rete`);
    for (const [r, i] of chiamate) {
      const finestra = righe.slice(i, i + 14).join('\n');
      assert.match(finestra, /signal: AbortSignal\.timeout\(RETE_MS\)/, `${f}:${i + 1} chiama la rete senza limite di tempo: ${r.trim()}`);
    }
  }
});
