// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// L'OVERLAY NELLO STUDIO (src/web/public/js/studio-overlay.js, docs/DIRETTA.md).
//
// Il browser lo prova scripts/verifica-studio-overlay.mjs. Qui i pezzi che si
// possono provare senza: come si riscrivono i selettori della pagina in una
// fotografia, quali emote si animano dai byte, quale fotogramma di una GIF va
// in onda; e il patto fra Studio, overlay e server.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { selettore, kebab, emoteDi, quadroAl, CARATTERI, LATINO } from '../../src/web/public/js/studio-overlay.js';

const leggi = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

test('nella fotografia la pagina e\' un riquadro: html, body e :root diventano le sue classi, e nient\'altro cambia', () => {
  assert.equal(selettore(':root'), '.sbf-html');
  assert.equal(selettore('html, body'), '.sbf-html, .sbf-body');
  assert.equal(selettore('body.scuro > #alert .body'), '.sbf-body.scuro > #alert .body');
  assert.equal(selettore('#html-box, [data-x="body"], .tbody'), '#html-box, [data-x="body"], .tbody');
  assert.equal(selettore(':is(html) body'), ':is(.sbf-html) .sbf-body');
});

test('le proprieta\' animate si scrivono come nel CSS', () => {
  assert.equal(kebab('strokeDashoffset'), 'stroke-dashoffset');
  assert.equal(kebab('cssFloat'), 'float');
  assert.equal(kebab('--fx-s'), '--fx-s');
  assert.equal(kebab('opacity'), 'opacity');
});

test('le emote di 7TV e Twitch si animano coi loro byte, dalla porta del nostro server; le altre no', () => {
  assert.deepEqual(emoteDi('https://cdn.7tv.app/emote/01GB2V8FQ0000ABCDEFGH12345/4x.webp'), { fonte: '7tv', id: '01GB2V8FQ0000ABCDEFGH12345' });
  assert.deepEqual(emoteDi('https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/3.0'), { fonte: 'twitch', id: '25' });
  assert.equal(emoteDi('https://cdn.betterttv.net/emote/abc/3x'), null);
  assert.equal(emoteDi('non un indirizzo'), null);
});

test('i caratteri di Google si leggono da Google: sono gli unici host di fuori, e la CSP li ammette apposta', () => {
  assert.deepEqual([...CARATTERI].sort(), ['fonts.googleapis.com', 'fonts.gstatic.com']);
  const caddy = readFileSync(new URL('../../Caddyfile', import.meta.url), 'utf8');
  const csp = [...caddy.matchAll(/Content-Security-Policy\s+"([^"]+)"/g)].map((m) => m[1]).filter((t) => t.includes("'inline-speculation-rules'"));
  for (const t of csp) for (const h of CARATTERI) assert.ok(t.split(';').find((d) => d.trim().startsWith('connect-src')).includes('https://' + h), h);
});

test('dei caratteri si incorporano il latino e il latino esteso, non gli alfabeti che la pagina non scrive', () => {
  assert.ok(LATINO.test('U+0000-00FF, U+0131, U+0152-0153'));
  assert.ok(LATINO.test('U+0100-02BA, U+02BD-02C5'));
  assert.ok(!LATINO.test('U+0400-045F, U+0490-0491'));
  assert.ok(!LATINO.test('U+0370-0377'));
});

test('una GIF in onda mostra il fotogramma del suo tempo, e ricomincia', () => {
  const tempi = [100, 200, 350];
  assert.equal(quadroAl(tempi, 350, 0), 0);
  assert.equal(quadroAl(tempi, 350, 99), 0);
  assert.equal(quadroAl(tempi, 350, 100), 1);
  assert.equal(quadroAl(tempi, 350, 349), 2);
  assert.equal(quadroAl(tempi, 350, 350), 0);
  assert.equal(quadroAl([], 0, 10), 0);
});

test('il patto: l\'overlay dentro lo Studio passa i suoni, non segna «overlay aperto», e la prova ha il suo overlay senza dati', () => {
  const OV = leggi('src/web/public/overlay-app.js'), SRV = leggi('src/web/server.js'), APP = leggi('src/web/public/app.js');
  assert.match(OV, /get\('studio'\) !== '1' \|\| window\.parent === window\) return null;\n\s*return window\.parent\.SB_STUDIO_OVERLAY \|\| null;/);
  assert.match(OV, /function suonaUrl\(url, vol, dove\) \{\n\s*if \(!url\) return;\n\s*if \(OSPITE\) \{ OSPITE\.suonaUrl\(window\.frameElement, url, vol\); return; \}/, 'un suono va nel mix della diretta, non agli altoparlanti della cornice');
  assert.match(OV, /function avvia\(el, dove\) \{\n\s*if \(OSPITE\) OSPITE\.media\(window\.frameElement, el\);/, 'e anche l\'audio dei video');
  assert.match(OV, /if \(login === 'prova\.socialbot'\) avviaProva\(\);\nelse if \(login\) \{/, 'la prova non chiede niente al server');
  assert.match(SRV, /if \(suo && req\.query\.studio !== '1' && !suo\.settings\?\.overlayVisto\)/, 'l\'avviso «non hai ancora aperto l\'overlay» parla di OBS');
  assert.match(SRV, /if \(req\.params\.login !== 'prova\.socialbot' && !chiaveOk\(req\)\) return notFound\(res\);/);
  assert.match(APP, /const STUDIO_OV_MISURA = \{ o: \{ W: 1920, H: 1080, scala: 1 \}, v: \{ W: 1080, H: 1920, scala: 1\.5 \} \};/, 'la cornice e\' grande come la sorgente di OBS, e il verticale si guarda a 720×1280');
  assert.match(APP, /const u = new URL\(ov\.overlayUrl, location\.origin\);\n\s*studioOverlayBase\(u\.pathname \+ u\.search\);/, 'la cornice e\' sempre della stessa origine dello Studio, anche se il link dell\'overlay porta un altro nome del sito');
});
