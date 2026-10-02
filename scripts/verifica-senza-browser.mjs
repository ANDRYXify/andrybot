// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello del server: i collaudi col browser, dove il browser non c'e'.
//
// Sul server l'aggiornamento rifa' tutti i cancelli, e li' Chromium non c'e'.
// Un collaudo col browser deve accorgersene e saltarsi, con esito 0: se invece
// cade, l'aggiornamento intero si ferma e il server resta al codice di prima.
// E' successo: verifica-battito lanciava Chromium da se', senza guardare se
// c'era, e sul server usciva con un ENOENT.
//
// Qui si rifa' il server, non lo si immagina:
//  · ogni collaudo dei `cancelli` che usa il browser si lancia con Chromium e
//    Playwright che non esistono, e deve uscire con 0 dicendo che si salta.
//    Si lancia COME STA nei cancelli, opzioni comprese: la prima versione
//    prendeva solo i comandi senza opzioni, e un'autoprova (`--selftest`) che
//    senza browser usciva con 1 e' arrivata fino al server e ha fermato
//    l'aggiornamento (verifica-fondo, ottobre 2026);
//  · il percorso di Chromium lo conosce un posto solo, scripts/_sito.mjs
//    (chromiumQui): un collaudo che se lo scrive da se' e' uno che puo' non
//    guardare se c'e'.
//
// Uso: node scripts/verifica-senza-browser.mjs   (esce 1 se qualcosa non torna)

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

// Un figlio lanciato da qui che fosse questo stesso cancello non rilancia
// niente: esce subito. Non dipende da come si chiama o da cosa c'e' scritto nel
// file. La prima versione sceglieva i collaudi leggendone il testo, trovava se
// stessa (qui dentro c'e' scritto chromiumQui) e si rilanciava all'infinito,
// quattro alla volta, fino a mettere in ginocchio la macchina.
if (process.env.SB_SENZA_BROWSER === '1') process.exit(0);

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPTS = join(RAD, 'scripts');
const esiti = [];
const dice = (ok, msg) => esiti.push({ ok, msg });

const cancelli = JSON.parse(readFileSync(join(RAD, 'package.json'), 'utf8')).scripts.cancelli;
const comandi = [...new Map([...cancelli.matchAll(/node scripts\/(verifica-[a-z-]+\.mjs)((?: --[a-z][a-z0-9=-]*)*)/g)]
  .map((m) => { const args = m[2].trim().split(/\s+/).filter(Boolean); return [[m[1], ...args].join(' '), { f: m[1], args }]; })).values()];
const usaIlBrowser = (f) => /chromiumQui|apriBrowser|import\(PLAYWRIGHT\)/.test(readFileSync(join(SCRIPTS, f), 'utf8'));
const colBrowser = comandi.filter((c) => c.f !== 'verifica-senza-browser.mjs' && usaIlBrowser(c.f));

const daSe = readdirSync(SCRIPTS).filter((f) => /^verifica-.*\.mjs$/.test(f) && f !== 'verifica-senza-browser.mjs')
  .filter((f) => readFileSync(join(SCRIPTS, f), 'utf8').includes('/opt/pw-browsers'));
dice(!daSe.length, `il percorso di Chromium lo conosce solo _sito.mjs${daSe.length ? ': lo scrivono da se\' ' + daSe.join(', ') : ''}`);
dice(colBrowser.length >= 20, `trovati ${colBrowser.length} collaudi col browser fra i cancelli`);
const conOpzioni = colBrowser.filter((c) => c.args.length);
dice(conOpzioni.length >= 1, `anche quelli con le opzioni, come le autoprove: ${conOpzioni.length}`);

const SENZA = { ...process.env, CHROMIUM: '/non/esiste/chrome', PLAYWRIGHT: '/non/esiste/playwright.mjs', SB_SENZA_BROWSER: '1' };
const lancia = ({ f, args }) => new Promise((ok) => {
  let uscita = '';
  const p = spawn(process.execPath, [join(SCRIPTS, f), ...args], { cwd: RAD, env: SENZA, stdio: ['ignore', 'pipe', 'pipe'] });
  const basta = setTimeout(() => { p.kill('SIGKILL'); }, 120_000);
  p.stdout.on('data', (d) => { uscita += d; });
  p.stderr.on('data', (d) => { uscita += d; });
  p.on('close', (codice) => { clearTimeout(basta); ok({ f: [f, ...args].join(' '), codice, uscita }); });
});

const coda = [...colBrowser];
const fatti = [];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (coda.length) fatti.push(await lancia(coda.shift()));
}));
const caduti = fatti.filter((r) => r.codice !== 0 || !/saltat|salto/i.test(r.uscita));
for (const r of caduti) {
  const riga = r.uscita.split('\n').map((x) => x.trim()).filter(Boolean).slice(-2).join(' · ');
  dice(false, `${r.f} senza browser esce con ${r.codice}: ${riga.slice(0, 200)}`);
}
dice(!caduti.length, `${fatti.length - caduti.length} su ${fatti.length} si saltano da soli, come sul server`);

for (const x of esiti) console.log(`${x.ok ? '✓' : '✗'} ${x.msg}`);
const rotti = esiti.filter((x) => !x.ok).length;
console.log(rotti ? `\n${rotti} cose non tornano. ✗` : '\nSul server, senza browser, i cancelli passano. ✓');
process.exit(rotti ? 1 : 0);
