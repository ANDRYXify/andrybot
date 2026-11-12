// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// AGGIORNARE SENZA CHE IL BOT CHE GIRA SE NE ACCORGA (server/aggiorna.sh).
//
// Due cose lo toccavano. Il collaudo, mezz'ora di prove e di Chromium sulla
// stessa macchina, rubava la CPU al bot vivo; e il cambio del container, qualche
// secondo con chat, avvisi e overlay giu', capitava anche in piena diretta.
//
// Qui si prova che:
//  · il bot scrive chi e' in onda in un file suo, e lo riscrive a ogni cambio;
//  · lo script lo legge giusto (si fa girare la sua funzione, non una copia);
//  · il collaudo parte alla priorita' piu' bassa, e un collaudo verde si ricorda;
//  · l'immagine nuova si costruisce prima, col bot vecchio acceso; poi il cambio
//    aspetta la fine delle dirette (anche quelle dallo Studio), salvo --subito;
//  · il segnale di riavvio chiude l'ultimo istante: chi parte mentre si mette
//    il segnale si vede e si aspetta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-in-onda-');
const { statoVivo } = await import('../../src/db.js');
const { BotManager } = await import('../../src/bot.js');
const { config } = await import('../../src/config.js');
process.on('exit', () => usaEGetta.pulisci());

const AGG = readFileSync(new URL('../../server/aggiorna.sh', import.meta.url), 'utf8');
const BOT = readFileSync(new URL('../../src/bot.js', import.meta.url), 'utf8');
const FILE = join(config.dataDir, '.in-onda');
const letto = () => JSON.parse(readFileSync(FILE, 'utf8'));

function bot() {
  const io = Object.create(BotManager.prototype);
  io._liveState = new Map();
  io.syncChannels = async () => {};
  return io;
}

test('il bot scrive chi e\' in onda, su Twitch e su Kick, e nessun altro', () => {
  const io = bot();
  io._liveState.set('anna', true);
  io._liveState.set('bruno', false);
  statoVivo.scrivi('carla', 'diretta:kick', { live: true });
  io._scriviInOnda();
  assert.deepEqual(letto().canali, ['anna', 'carla']);
  statoVivo.togli('carla', 'diretta:kick');
  io._liveState.set('anna', false);
  io._scriviInOnda();
  assert.deepEqual(letto().canali, [], 'finite le dirette, il file lo dice');
  assert.ok(!existsSync(FILE + '.tmp'), 'si scrive accanto e si rinomina: chi legge non trova mai meta\' file');
});

test('e lo riscrive a ogni cambio, all\'avvio e agli eventi di Kick', () => {
  const FIRMA = "  _setLive(login, isLive, data, fonte = 'evento', piattaforma = 'twitch') {";
  assert.ok(BOT.includes(FIRMA), 'non trovo _setLive');
  const setLive = BOT.slice(BOT.indexOf(FIRMA), BOT.indexOf(FIRMA) + 900);
  assert.match(setLive, /this\._liveState\.set\(ch, isLive\);\n\s*this\._scriviInOnda\(\);/, 'a ogni cambio vero di stato');
  assert.match(BOT, /async start\(\) \{\n\s*if \(this\.running\) return;\n\s*this\._scriviInOnda\(\);/, 'all\'avvio: un file di un processo morto non deve parlare per quello vivo');
  // gli eventi di Kick passano dalla stessa porta del giro, che lo riscrive a ogni cambio vero
  assert.match(BOT, /if \(ev\.tipo === 'live' \|\| ev\.tipo === 'fine-live'\) \{\n\s*await this\._setLiveAltrove\(/);
  const altrove = BOT.slice(BOT.indexOf('  async _setLiveAltrove('), BOT.indexOf('  async _giroKick('));
  assert.match(altrove, /statoVivo\.scrivi\(ch, 'diretta:' \+ piattaforma, \{ live: true, da \}\);\n\s*this\._scriviInOnda\(\);/, 'quando comincia');
  assert.match(altrove, /statoVivo\.togli\(ch, 'diretta:' \+ piattaforma\);\n\s*this\._scriviInOnda\(\);/, 'quando finisce');
});

test('lo script legge il file con la sua funzione, cosi\' com\'e\' scritta', () => {
  const fn = /^in_onda\(\) \{\n[\s\S]*?\n\}/m.exec(AGG)?.[0];
  assert.ok(fn, 'la funzione in_onda c\'e\'');
  const dir = mkdtempSync(join(tmpdir(), 'andrybot-agg-'));
  const prova = (contenuto) => {
    const f = join(dir, '.in-onda');
    if (contenuto === null) rmSync(f, { force: true }); else writeFileSync(f, contenuto);
    return execFileSync('bash', ['-c', `set -euo pipefail\nIN_ONDA_FILE='${f}'\n${fn}\nin_onda`], { encoding: 'utf8' }).trim();
  };
  try {
    assert.equal(prova(JSON.stringify({ canali: ['anna', 'bob_2'], ts: 1 })), 'anna bob_2');
    assert.equal(prova(JSON.stringify({ canali: [], ts: 1 })), '', 'nessuno in onda: niente');
    assert.equal(prova(null), '', 'senza file non si sa, e non si aspetta');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('il collaudo parte alla priorita\' piu\' bassa, e un collaudo verde si ricorda', () => {
  assert.match(AGG, /BASSA=\(nice -n 19\)\ncommand -v ionice >\/dev\/null 2>&1 && BASSA\+=\(ionice -c 3\)/);
  const collaudo = AGG.slice(AGG.indexOf('# ---- 5. il collaudo'), AGG.indexOf('# ---- 5b.'));
  const comandi = collaudo.split('\n').filter((r) => !/^\s*#/.test(r))
    .flatMap((r) => r.split(/&&|\|\|/)).filter((p) => /\bnpm (ci|test|run)\b/.test(p));
  assert.equal(comandi.length, 5, 'installazione, prove e cancelli, di qua e del cervello');
  for (const pezzo of comandi) assert.match(pezzo, /"\$\{BASSA\[@\]\}" npm /, `a priorita' bassa: ${pezzo.trim()}`);
  assert.match(collaudo, /echo "\$FIRMA_CODICE" > "\$COLLAUDATO"\n\s*echo "collaudo verde ✓"/, 'si ricorda solo quando e\' verde');
  assert.match(collaudo, /elif \[ "\$\(cat "\$COLLAUDATO" 2>\/dev\/null \|\| true\)" = "\$FIRMA_CODICE" \]; then/);
});

test('i controlli col browser saltati si dicono una volta sola, e il rosso di un cancello resta rosso', () => {
  const pezzo = (nome) => new RegExp(`^ {2}${nome}\\(\\) \\{\\n[\\s\\S]*?\\n {2}\\}`, 'm').exec(AGG)?.[0];
  const [conta, filtra, salti] = ['conta_salti', 'filtra', 'salti_di'].map(pezzo);
  assert.ok(conta && filtra && salti, 'le tre funzioni ci sono');
  assert.ok(!/\$!/.test(AGG.split('\n').filter((r) => !/^\s*#/.test(r)).join('\n').replace(/lettore=\$!/, '')),
    'l\'unico «$!» e\' quello del lettore lanciato sullo sfondo: quello di una sostituzione di processo sotto «set -u» puo\' non esistere');
  const dir = mkdtempSync(join(tmpdir(), 'andrybot-salti-'));
  const f = join(dir, 'salti');
  // come nello script: «set -euo pipefail», e il comando e' un processo a parte
  const gira = (comando) => execFileSync('bash', ['-c',
    `set -euo pipefail\n${conta}\n${filtra}\n${salti}\ncomando() { ${comando}; }\nESITO=0\nfiltra '${f}' comando || ESITO=$?\necho "esito=$ESITO salti=$(salti_di '${f}')"`],
  { encoding: 'utf8', env: { ...process.env, TMPDIR: dir } });
  try {
    const righe = ['cancello verde ✓', 'Playwright non c\'e\': salto.', 'Chromium non c\'e\' su questa macchina: collaudo saltato.', '  ✓ una promessa',
      'Playwright non c\'e\' su questa macchina: collaudo saltato.', 'Chromium o Playwright non ci sono su questa macchina: collaudo saltato.',
      'Playwright non c\'e\': impossibile generare il marchio.', 'ultima riga'];
    const stampa = righe.map((r) => `echo "${r}"`).join('; ');
    assert.equal(gira(`( ${stampa} )`), ['cancello verde ✓', '  ✓ una promessa', 'Playwright non c\'e\': impossibile generare il marchio.', 'ultima riga', 'esito=0 salti=4', ''].join('\n'),
      'le righe dei salti si tolgono e si contano, le altre passano nell\'ordine');
    assert.match(gira(`( ${stampa}; echo "  ✗ un difetto vero" >&2; exit 7 )`), /ultima riga\n {2}✗ un difetto vero\nesito=7 salti=4\n$/,
      'il rosso passa col suo codice, e dopo le sue righe');
    assert.match(gira('bash -c "exit 3"'), /^esito=3 salti=0\n$/, 'un comando esterno rosso senza righe');
    assert.match(gira('true'), /^esito=0 salti=0\n$/, 'senza salti non c\'e\' niente da dire');
    assert.deepEqual(readdirSync(dir), ['salti'], 'il tubo non resta in giro');
    // senza awk il comando gira lo stesso, con tutte le sue righe e il suo esito
    const senza = execFileSync('bash', ['-c', `set -euo pipefail\ncommand() { return 1; }\n${conta}\n${filtra}\ncomando() { ( echo "Playwright non c'e': salto."; exit 5 ); }\nESITO=0\nfiltra '${f}' comando || ESITO=$?\necho "esito=$ESITO"`],
      { encoding: 'utf8', env: { ...process.env, TMPDIR: dir } });
    assert.equal(senza, 'Playwright non c\'e\': salto.\nesito=5\n', 'il filtro e\' una comodita\': senza, niente si ferma');
  } finally { rmSync(dir, { recursive: true, force: true }); }
  assert.match(AGG, /\n {2}filtra "\$SALTI_QUI" "\$\{BASSA\[@\]\}" npm run --silent cancelli \|\| torna_indietro\n/);
  assert.match(AGG, /\n {4}filtra "\$SALTI_LIA" collaudo_cervello \|\| torna_indietro\n/);
  assert.match(AGG, /if \[ "\$N_SALTI" -gt 0 \]; then\n\s+echo\n\s+echo "\$N_SALTI controlli col browser saltati/);
});

test('l\'immagine si costruisce prima, poi si aspetta la fine delle dirette, poi si cambia', () => {
  const i = AGG.indexOf('# ---- 5b.');
  const costruisci = AGG.indexOf('docker compose build', i);
  const aspetta = AGG.indexOf('while [ -n "$(in_onda)" ]; do', i);
  const segnale = AGG.indexOf('touch "$RIAVVIO_FILE"', i);
  const fermo = AGG.indexOf('FERMO_DA="$(date +%s)"', i);
  const su = AGG.indexOf('docker compose up -d\n', i);
  assert.ok(i > 0 && costruisci > i && aspetta > costruisci && segnale > aspetta && fermo > segnale && su > fermo,
    'prima si costruisce col bot vecchio acceso, poi si aspetta, poi il segnale, poi si cambia: fra «nessuno in onda» e il cambio non ci sono piu\' i minuti della costruzione');
  assert.match(AGG, /--subito\) SUBITO=1 ;;/, 'per le emergenze c\'e\' --subito');
  assert.match(AGG, /if \[ "\$SUBITO" = "1" \]; then\n\s*passo "Riavvio subito, su tua richiesta"/);
  assert.match(AGG, /git reset --hard "\$PRIMA" >\/dev\/null\n[^\n]*\n\s*exit 3/, 'se l\'attesa scade il repository torna com\'era');
  assert.match(AGG, /il bot e' rimasto giu' circa \$\(\( \$\(date \+%s\) - FERMO_DA \)\) secondi\./, 'e alla fine si dice quanto e\' rimasto giu\'');
  assert.match(AGG, /trap togli_segnale EXIT/, 'il segnale non sopravvive allo script, comunque finisca');
  execFileSync('bash', ['-n', new URL('../../server/aggiorna.sh', import.meta.url).pathname]);
});

// Il pezzo dello script fra «nessuno in onda» e il riavvio, fatto girare cosi'
// com'e' scritto. Una diretta parte proprio nell'istante in cui si mette il
// segnale: lo script deve vederla, togliere il segnale, aspettarla, e solo
// dopo riavviare col segnale messo.
test('una diretta partita nell\'istante del segnale si aspetta, e il segnale non resta durante l\'attesa', () => {
  const da = AGG.indexOf('IN_ONDA_FILE="$RADICE/data/.in-onda"');
  const a = AGG.indexOf('passo "Riavvio"\n');
  assert.ok(da > 0 && a > da, 'trovo il pezzo dell\'attesa');
  const pezzo = AGG.slice(da, a);
  const dir = mkdtempSync(join(tmpdir(), 'andrybot-segnale-'));
  try {
    const finto = `set -euo pipefail
RADICE='${dir}'; mkdir -p "$RADICE/data"; SUBITO=0; PRIMA=x; SERVE_LIA=0
passo() { echo "== $*"; }
git() { echo "git $*"; }
echo '{"canali":[],"ts":1}' > "$RADICE/data/.in-onda"
touch() { command touch "$@"; if [ ! -f "$RADICE/partita" ]; then command touch "$RADICE/partita"; echo '{"canali":["anna"],"ts":2}' > "$RADICE/data/.in-onda"; echo PARTE-ANNA; fi; }
sleep() {
  if [ "$1" = "60" ]; then
    if [ -f "$RADICE/data/.riavvio" ]; then echo SEGNALE-DURANTE-ATTESA; fi
    echo '{"canali":[],"ts":3}' > "$RADICE/data/.in-onda"; echo FINISCE-ANNA
  fi
}
${pezzo}
if [ -f "$RADICE/data/.riavvio" ]; then echo RIAVVIO-COL-SEGNALE; fi
`;
    const out = execFileSync('bash', ['-c', finto], { encoding: 'utf8' });
    const righe = out.split('\n').filter(Boolean);
    const dove = (r) => righe.findIndex((x) => x.includes(r));
    assert.ok(dove('PARTE-ANNA') >= 0, out);
    assert.ok(dove("e' appena partita una diretta (anna)") > dove('PARTE-ANNA'), 'la vede dopo il segnale');
    assert.equal(dove('SEGNALE-DURANTE-ATTESA'), -1, 'mentre aspetta, il segnale e\' tolto: le dirette dallo Studio partono');
    assert.ok(dove('FINISCE-ANNA') > dove("e' appena partita"), 'la aspetta');
    assert.ok(dove('RIAVVIO-COL-SEGNALE') > dove('FINISCE-ANNA'), 'e riavvia solo dopo, col segnale messo');
    assert.ok(!existsSync(join(dir, 'data', '.riavvio')), 'a script finito il segnale non c\'e\' piu\'');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// CON PIPEFAIL un tubo con un lettore che esce prima («| grep -q», «| head»)
// fa fallire la riga anche quando la parola c'e': la copia del database
// saltava in silenzio. Nello script si legge tutto prima e si guarda dopo.
test('nello script nessun tubo con un lettore che esce prima di chi scrive', () => {
  const codice = AGG.split('\n').filter((r) => !/^\s*#/.test(r)).join('\n');
  assert.ok(/set -euo pipefail/.test(AGG), 'lo script gira con pipefail');
  assert.doesNotMatch(codice, /\|\s*grep\s+-q/, '«| grep -q»: usa contiene');
  assert.doesNotMatch(codice, /\|\s*head\b/, '«| head»: usa prime');
  assert.match(codice, /contiene\(\) \{ local parola="\$1" out; shift; out="\$\("\$@" 2>\/dev\/null\)" \|\| true;/);
});
