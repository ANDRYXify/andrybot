// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL CONTO SCRITTO IN UN FILE, E I GIRI CHE DEVONO ANDARE A PANNELLO NASCOSTO.
//
// La regola e' provata in test/unita/morti-file.test.mjs. Qui si prova che sia
// COLLEGATA, e collegata nel modo giusto:
//  · la rotta chiede la sessione e passa per la regola, non per una copia;
//  · dal pannello esce il numero, il nome e il giro: il file no;
//  · i due giri delle morti (la schermata e il file) battono col worker e non
//    con un timer della pagina. Misurato: a scheda nascosta, dopo cinque minuti,
//    Chrome fa partire i timer della pagina una volta al minuto, anche con la
//    regia collegata; quelli di un worker no (scripts/verifica-battito.mjs);
//  · a guardare e' una scheda sola: con due, ognuna ribaserebbe l'altra e
//    nessuna morte si conterebbe (il file), o si conterebbe due volte (la
//    schermata).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const srv = leggi('src/web/server.js');
const app = leggi('src/web/public/app.js');
const pub = leggi('src/web/public/morti.js');
const funzione = (testo, testa) => {
  const i = testo.indexOf(testa);
  assert.ok(i >= 0, `manca ${testa}`);
  const fine = testo.indexOf('\n}\n', i);
  return testo.slice(i, fine + 2);
};

test('la rotta chiede la sessione e passa per la regola', () => {
  const i = srv.indexOf("app.post('/api/streamer/morti/file'");
  assert.ok(i > 0, 'la rotta non c\'e\'');
  const rotta = srv.slice(i, srv.indexOf('}));', i));
  assert.match(rotta, /requireLogin/);
  assert.match(rotta, /morti\.contaDaFile\(login, req\.body, \{/);
  assert.match(rotta, /contatore: cfg\.file/);
  assert.match(rotta, /inOnda: rapporto\.inCorso\(login\)/, 'fuori diretta si legge ma non si conta: la stessa regola della schermata e dei giochi');
  assert.match(rotta, /consolle\.esegui\(login, id,/, 'un secondo modo di far salire un contatore sarebbe un secondo posto in cui si rompe');
  assert.ok(!/salto\(/.test(rotta), 'il conto sta nella regola, non nella rotta');
});

test('dal pannello esce il numero, non il file', () => {
  const l = funzione(app, 'async function _fmLeggi() {');
  assert.match(l, /api\('\/api\/streamer\/morti\/file', \{ method: 'POST', body: \{ totale: letto\.totale, nome: letto\.nome, giro: _fm\.giro \} \}\)/);
  const f = funzione(app, 'async function _fmDaFile() {');
  assert.match(f, /window\.SB_MORTI\.numeroDaFile\(testo\)/);
  assert.match(f, /f\.slice\(0, 256\)\.text\(\)/, 'si legge solo l\'inizio: un numero non e\' lungo');
  const mc = funzione(app, 'async function _fmDaMinecraft() {');
  assert.match(mc, /return \{ totale: _fm\.mc\.morti, nome: 'Minecraft: ' \+ _fm\.mc\.nome \};/, 'da Minecraft escono il conto e il nome del giocatore, non il registro');
  assert.match(mc, /await M\.prepara\(_fm\.mc, _fm\.h, _fm\.risorse\);/);
});

test('i due giri battono col worker, e a guardare e\' una scheda sola', () => {
  const schermo = funzione(app, 'function _mortiRiavvia() {');
  const file = funzione(app, 'function _fmParti(voce) {');
  for (const [nome, corpo, serratura] of [['schermata', schermo, 'sb-morti-schermo'], ['file', file, 'sb-morti-file']]) {
    assert.ok(!/setInterval\(/.test(corpo), `${nome}: un timer della pagina, a scheda nascosta, parte una volta al minuto`);
    assert.match(corpo, /window\.SB_MORTI\.ogni\(/, `${nome}: senza il battito`);
    assert.ok(corpo.includes(`window.SB_MORTI.dasolo('${serratura}'`), `${nome}: senza la serratura`);
  }
  assert.match(file, /_fm\.giro = crypto\.randomUUID\(\);\n\s*_fm\.mc = null;/, 'il giro nuovo nasce quando la serratura e\' presa, e Minecraft riparte da zero col giro');
  assert.match(pub, /new Worker\('\/battito\.js'\)/);
  assert.ok(existsSync(join(RAD, 'src/web/public/battito.js')), 'il battito non c\'e\'');
  assert.match(leggi('src/web/public/battito.js'), /setInterval\(function \(\) \{ postMessage\(0\); \}, ms\)/);
});

test('il lettore parte da solo con il pannello, e la carta ha i suoi pezzi', () => {
  assert.match(app, /_mortiRiavvia\(\);\n\s*_fmAvvia\(\)\.catch\(\(\) => \{\}\);/, 'il file si legge anche senza aprire la scheda dei Comandi');
  for (const id of ['morti-file-conta', 'morti-file-scegli', 'morti-mc-scegli', 'morti-mc-risorse', 'morti-file-riprendi', 'morti-file-togli', 'morti-file-spia']) {
    assert.ok(app.includes(`id="${id}"`), `manca #${id}`);
  }
  assert.match(app, /_g\('morti-file-conta'\)\?\.addEventListener\('change', \(e\) => \{ _mortiSalva\(\{ file: e\.target\.value \}\)/);
  assert.match(app, /requestPermission\(\{ mode: 'read' \}\)/, 'il permesso si ridomanda solo col tasto: il browser lo vuole da un gesto');
});

test('il lettore di Minecraft arriva al pannello, e solo a chi lo usa', () => {
  const mc = leggi('src/web/public/morti-minecraft.js');
  assert.match(mc, /window\.SB_MINECRAFT = \{/);
  assert.match(app, /s\.src = '\/morti-minecraft\.js';/, 'si carica quando serve');
  assert.ok(!/<script src="morti-minecraft\.js"/.test(leggi('src/web/public/index.html')), 'non pesa su chi non gioca a Minecraft');
  const da = funzione(app, 'async function _fmDaMinecraft() {');
  assert.match(da, /await _fmMinecraft\(\);/);
  assert.match(funzione(app, 'async function _fmLeggi() {'), /_fm\.tipo === 'minecraft' \? await _fmDaMinecraft\(\) : await _fmDaFile\(\)/);
});
