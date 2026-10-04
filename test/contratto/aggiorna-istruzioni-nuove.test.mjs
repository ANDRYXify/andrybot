// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// AGGIORNA.SH GIRA CON LE ISTRUZIONI DEL CODICE CHE ARRIVA, E LA PORTA
// D'INGRESSO E' PARTE DI QUELLO CHE GIRA (docs/COLLAUDO.md, «Le istruzioni
// nuove e la porta d'ingresso»).
//
// Successo davvero: il giro che portava la correzione per il Caddyfile ha
// girato con le istruzioni di prima (bash legge lo script mentre lo esegue, e
// git lo sostituisce con un file nuovo), quindi l'ha saltata; e il giro dopo
// diceva «già aggiornato» guardando solo il bot, con la porta ancora vecchia.
//
// Qui lo script VERO gira davvero, su un repository e un'«origine» usa e
// getta, con un docker e un npm finti che registrano cosa gli si chiede. Il
// docker finto fa come quello vero (provato con Docker e Caddy veri): un
// Caddyfile arrivato con git, Caddy non lo vede finché il container non si
// riavvia; `up -d` e `reload` non bastano.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, chmodSync, existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const VERO = readFileSync(new URL('../../server/aggiorna.sh', import.meta.url), 'utf8');
const impronta = (t) => createHash('sha256').update(t).digest('hex');
const CADDY_UNO = ':8080 {\n\trespond "uno"\n}\n';
const CADDY_DUE = ':8080 {\n\trespond "due"\n}\n';
// la versione «arrivata» dello script: quella vera, più un segno che dice chi gira
const SEGNO_NUOVE = 'echo "ISTRUZIONI-NUOVE"';
const NUOVO = VERO.replace('set -euo pipefail\n', `set -euo pipefail\n${SEGNO_NUOVE}\n`);

// «ps» scrive le righe a pezzi, con un attimo in mezzo, come un docker vero
// che non scrive tutto in una volta: chi legge e se ne va alla prima riga
// («| grep -q») fa ricevere SIGPIPE a chi scrive, e con pipefail la riga fallisce.
// Senza l'attimo il difetto c'era lo stesso, ma usciva solo sotto carico.
const FINTO_DOCKER = `#!/usr/bin/env bash
echo "$*" >> "$FINTO/docker.log"
[ "$1" = compose ] || exit 0
shift
case "$1" in
  ps) echo "bot-1 running"; /bin/sleep 0.05; [ -f "$FINTO/caddy-gira" ] && echo "caddy-1 running"; exit 0 ;;
  exec)
    case "$*" in
      *backup.js*) echo "copia fatta e riaperta ok" ;;
      */health*) echo '{"stato":"sano"}' ;;
      *"caddy sha256sum /etc/caddy/Caddyfile"*) echo "$(cat "$FINTO/caddy-vede")  /etc/caddy/Caddyfile" ;;
    esac
    exit 0 ;;
  restart) [ "$2" = caddy ] && sha256sum Caddyfile | cut -d' ' -f1 > "$FINTO/caddy-vede"; exit 0 ;;
  *) exit 0 ;;
esac
`;
const FINTO_NPM = `#!/usr/bin/env bash
echo "$*" >> "$FINTO/npm.log"
case "$*" in *test*) exit "\${NPM_TEST_ESITO:-0}" ;; esac
exit 0
`;

// L'ambiente di git che c'e' fuori NON entra qui. Dentro un gancio di git (il
// pre-push lancia queste prove) GIT_DIR punta al repository vero: con quello
// ereditato, `git init` e i commit del banco sarebbero finiti nel repository
// del progetto (e' successo: core.bare acceso, commit «A» e «B» sul suo HEAD).
const SENZA_GIT = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
const GIT_ENV = { ...SENZA_GIT, GIT_AUTHOR_NAME: 'prova', GIT_AUTHOR_EMAIL: 'p@p', GIT_COMMITTER_NAME: 'prova', GIT_COMMITTER_EMAIL: 'p@p', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', HOME: tmpdir() };
const git = (cwd, ...a) => execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'init.defaultBranch=main', ...a], { cwd, env: GIT_ENV, encoding: 'utf8' }).trim();

// Un'origine con due commit (A, poi B: lo script e il Caddyfile che porta) e
// un server fermo su A (o già su B).
function banco({ scriptB = VERO, caddyB = CADDY_UNO, serverSu = 'A' } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'andrybot-aggiorna-'));
  try { return bancoIn(dir, { scriptB, caddyB, serverSu }); } catch (e) { rmSync(dir, { recursive: true, force: true }); throw e; }
}
function bancoIn(dir, { scriptB, caddyB, serverSu }) {
  const ori = join(dir, 'origine'), srv = join(dir, 'server'), finto = join(dir, 'finto');
  mkdirSync(join(ori, 'server'), { recursive: true });
  mkdirSync(finto);
  git(dir, 'init', '-q', ori);
  // il banco e' suo: se git avesse scritto altrove, ci si ferma qui, prima di ogni commit
  assert.ok(existsSync(join(ori, '.git')), 'il repository del banco sta nel banco');
  assert.equal(git(ori, 'rev-parse', '--show-toplevel'), ori);
  writeFileSync(join(ori, '.gitignore'), 'data/\n');
  writeFileSync(join(ori, 'server/aggiorna.sh'), VERO);
  writeFileSync(join(ori, 'Caddyfile'), CADDY_UNO);
  git(ori, 'add', '-A'); git(ori, 'commit', '-qm', 'A');
  const A = git(ori, 'rev-parse', 'HEAD');
  writeFileSync(join(ori, 'server/aggiorna.sh'), scriptB);
  writeFileSync(join(ori, 'Caddyfile'), caddyB);
  git(ori, 'add', '-A'); git(ori, 'commit', '-qm', 'B', '--allow-empty');
  const B = git(ori, 'rev-parse', 'HEAD');
  git(dir, 'clone', '-q', ori, srv);
  if (serverSu === 'A') git(srv, 'reset', '-q', '--hard', A);
  mkdirSync(join(srv, 'data'));
  writeFileSync(join(finto, 'docker'), FINTO_DOCKER);
  writeFileSync(join(finto, 'npm'), FINTO_NPM);
  writeFileSync(join(finto, 'sleep'), '#!/usr/bin/env bash\nexit 0\n');
  for (const f of ['docker', 'npm', 'sleep']) chmodSync(join(finto, f), 0o755);
  // Caddy gira e vede il Caddyfile del commit su cui sta il server
  writeFileSync(join(finto, 'caddy-gira'), '');
  writeFileSync(join(finto, 'caddy-vede'), impronta(readFileSync(join(srv, 'Caddyfile'), 'utf8')) + '\n');
  return {
    dir, srv, finto, A, B,
    segna: (file, sha) => writeFileSync(join(srv, 'data', file), sha + '\n'),
    lancia: (env = {}) => {
      const r = spawnSync('bash', [join(srv, 'server/aggiorna.sh')], {
        cwd: dir, encoding: 'utf8',
        env: { ...GIT_ENV, ...env, PATH: `${finto}:${process.env.PATH}`, FINTO: finto },
      });
      return { codice: r.status, uscita: (r.stdout || '') + (r.stderr || '') };
    },
    docker: () => (existsSync(join(finto, 'docker.log')) ? readFileSync(join(finto, 'docker.log'), 'utf8') : ''),
    caddyVede: () => readFileSync(join(finto, 'caddy-vede'), 'utf8').trim(),
    testa: () => git(srv, 'rev-parse', 'HEAD'),
    pulisci: () => rmSync(dir, { recursive: true, force: true }),
  };
}
const quante = (testo, pezzo) => testo.split(pezzo).length - 1;

test('quando arriva uno script nuovo, il resto del giro lo fa lo script nuovo, una volta sola', () => {
  const b = banco({ scriptB: NUOVO, caddyB: CADDY_DUE });
  try {
    b.segna('.deployato', b.A);
    const r = b.lancia();
    assert.equal(r.codice, 0, r.uscita);
    assert.equal(quante(r.uscita, 'riparto con quelle nuove'), 1, 'si riparte una volta');
    assert.equal(quante(r.uscita, 'ISTRUZIONI-NUOVE'), 1, 'e dopo il merge gira la versione arrivata, una volta sola');
    assert.match(r.uscita, new RegExp(`ripreso con le istruzioni nuove: da ${b.A.slice(0, 7)}`));
    assert.equal(quante(b.docker(), 'backup.js'), 1, 'la copia del database si fa una volta, prima di ripartire');
    assert.ok(r.uscita.indexOf('ISTRUZIONI-NUOVE') > r.uscita.indexOf('riparto con quelle nuove'));
    // e lo script nuovo porta a termine anche la porta
    assert.equal(b.caddyVede(), impronta(CADDY_DUE), 'Caddy legge il Caddyfile arrivato');
    assert.equal(readFileSync(join(b.srv, 'data/.deployato'), 'utf8').trim(), b.B);
  } finally { b.pulisci(); }
});

test('lo script ripreso torna al punto di PARTENZA se il collaudo è rosso, non al codice arrivato', () => {
  const b = banco({ scriptB: NUOVO });
  try {
    b.segna('.deployato', b.A);
    const r = b.lancia({ NPM_TEST_ESITO: '1' });
    assert.equal(r.codice, 1, r.uscita);
    assert.match(r.uscita, /ISTRUZIONI-NUOVE/, 'il collaudo l\'ha fatto lo script nuovo');
    assert.equal(b.testa(), b.A, 'il repository torna dov\'era prima del giro');
    assert.doesNotMatch(b.docker(), /compose (build|up)/, 'e il container non si tocca');
  } finally { b.pulisci(); }
});

test('uno script che non cambia non riparte', () => {
  const b = banco({ caddyB: CADDY_DUE });
  try {
    b.segna('.deployato', b.A);
    const r = b.lancia();
    assert.equal(r.codice, 0, r.uscita);
    assert.doesNotMatch(r.uscita, /riparto con quelle nuove|ripreso con/);
    assert.equal(b.testa(), b.B);
  } finally { b.pulisci(); }
});

test('«già aggiornato» guarda anche la porta: un Caddyfile rimasto indietro si rimette in pari', () => {
  // il caso vero: il bot gira B, ma Caddy legge ancora il Caddyfile di A
  const b = banco({ caddyB: CADDY_DUE, serverSu: 'B' });
  try {
    b.segna('.deployato', b.B);
    b.segna('.collaudato', b.B);
    writeFileSync(join(b.finto, 'caddy-vede'), impronta(CADDY_UNO) + '\n');
    const r = b.lancia();
    assert.equal(r.codice, 0, r.uscita);
    assert.doesNotMatch(r.uscita, /già aggiornato/);
    assert.match(r.uscita, /la porta\nd'ingresso \(Caddy\) legge ancora un Caddyfile diverso/);
    assert.match(r.uscita, /Caddyfile nuovo caricato ✓/);
    assert.equal(b.caddyVede(), impronta(CADDY_DUE));
    assert.ok(!existsSync(join(b.finto, 'npm.log')), 'il collaudo già verde non si rifà');
    const v = b.docker().indexOf('caddy caddy validate'), s = b.docker().indexOf('compose restart caddy');
    assert.ok(v > 0 && s > v, 'si valida il file nuovo prima di riavviare');

    // rimessa in pari, il giro dopo è davvero «già aggiornato», e non tocca niente
    writeFileSync(join(b.finto, 'docker.log'), '');
    const r2 = b.lancia();
    assert.equal(r2.codice, 0, r2.uscita);
    assert.match(r2.uscita, /già aggiornato/);
    assert.doesNotMatch(b.docker(), /restart|compose up|compose build/);
  } finally { b.pulisci(); }
});

test('con Caddy fermo non c\'è una porta da mettere in pari', () => {
  const b = banco({ serverSu: 'B' });
  try {
    b.segna('.deployato', b.B);
    rmSync(join(b.finto, 'caddy-gira'));
    const r = b.lancia();
    assert.equal(r.codice, 0, r.uscita);
    assert.match(r.uscita, /già aggiornato/);
  } finally { b.pulisci(); }
});
