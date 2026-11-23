// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA TRANSIZIONE TRA LE PAGINE LA CHIEDONO TUTTE LE PAGINE DEL SITO, O NESSUNA.
//
// Il passaggio animato da una pagina all'altra (@view-transition) lo deve
// chiedere sia la pagina da cui si parte sia quella in cui si arriva. Se lo
// chiede solo la prima, Chromium salta il passaggio e lascia un errore nella
// pagina («Transition was aborted because of invalid state. ViewTransition
// opt-in disabled»): succedeva andando dall'app a /cam, perché la regola stava
// in style.css, che le pagine a sé non caricano.
//
// Ora la regola sta in tema.css, la veste che caricano l'app e ogni pagina a
// sé: una pagina del sito la chiede per il fatto stesso di essere vestita
// come il sito. Il cancello verifica-studio-dispositivi.mjs lo prova nel
// browser (nessun errore nelle pagine, passando dallo Studio a /cam).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PUB = new URL('../../src/web/public/', import.meta.url).pathname;
const css = readdirSync(PUB).filter((f) => f.endsWith('.css'));
const html = readdirSync(PUB).filter((f) => f.endsWith('.html'));
const fogli = (f) => [...readFileSync(join(PUB, f), 'utf8').matchAll(/<link[^>]+href="\/?([a-z-]+\.css)/g)].map((m) => m[1]);

test('la transizione tra le pagine si chiede in un posto solo: tema.css', () => {
  const dove = css.filter((f) => /@view-transition\b/.test(readFileSync(join(PUB, f), 'utf8')));
  assert.deepEqual(dove, ['tema.css']);
  assert.match(readFileSync(join(PUB, 'tema.css'), 'utf8'), /@view-transition\s*\{\s*navigation:\s*auto;\s*\}/);
});

test('e con lei come si fa: senza dissolvenza di tutta la pagina, ferma per chi chiede meno movimento', () => {
  // Stanno con la richiesta: una pagina che la chiede senza queste avrebbe la
  // dissolvenza di serie del browser, diversa dal resto del sito.
  const T = readFileSync(join(PUB, 'tema.css'), 'utf8');
  assert.match(T, /::view-transition-old\(root\), ::view-transition-new\(root\) \{ animation: none; \}/);
  assert.match(T, /@media \(prefers-reduced-motion: reduce\) \{\s*::view-transition-group\(\*\),\s*::view-transition-old\(\*\),\s*::view-transition-new\(\*\) \{ animation: none !important; \}/);
  const altrove = css.filter((f) => f !== 'tema.css' && /::view-transition-(old|new)\((root|\*)\)/.test(readFileSync(join(PUB, f), 'utf8')));
  assert.deepEqual(altrove, [], 'non ripetute altrove');
});

test('ogni pagina vestita come il sito carica tema.css, quindi la chiede', () => {
  const vestite = html.filter((f) => fogli(f).some((c) => ['style.css', 'pagina.css'].includes(c)));
  assert.ok(vestite.includes('index.html') && vestite.includes('cam.html'), vestite.join(', '));
  for (const f of vestite) assert.ok(fogli(f).includes('tema.css'), `${f} non carica tema.css`);
});
