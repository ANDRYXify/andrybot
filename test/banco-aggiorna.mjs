// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// IL BANCO DI AGGIORNA.SH: il server con il bot e il cervello accanto, come sul
// server vero, e due «origini» usa e getta. Lo script VERO gira davvero, con un
// docker e un npm finti che registrano cosa gli si chiede. Lo usano
// test/contratto/aggiorna-cervello.test.mjs e aggiorna-da-solo.test.mjs.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, chmodSync, existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const VERO = readFileSync(new URL('../server/aggiorna.sh', import.meta.url), 'utf8');

const FINTO_DOCKER = `#!/usr/bin/env bash
echo "$*" >> "$FINTO/docker.log"
[ "$1" = compose ] || exit 0
shift
case "$1" in
  ps) echo "bot-1 running"; exit 0 ;;
  build) exit "\${DOCKER_BUILD_ESITO:-0}" ;;
  up) exit "\${DOCKER_UP_ESITO:-0}" ;;
  exec)
    case "$*" in
      *backup.js*) echo "copia fatta e riaperta ok" ;;
      */health*) echo '{"stato":"sano"}' ;;
    esac
    exit 0 ;;
  *) exit 0 ;;
esac
`;
const FINTO_NPM = `#!/usr/bin/env bash
echo "$(pwd) $*" >> "$FINTO/npm.log"
case "$*" in *test*) exit "\${NPM_TEST_ESITO:-0}" ;; esac
exit 0
`;

// L'ambiente di git che c'e' fuori NON entra qui (vedi aggiorna-istruzioni-nuove).
const SENZA_GIT = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_') && !k.startsWith('AGGIORNA_')));
const GIT_ENV = { ...SENZA_GIT, GIT_AUTHOR_NAME: 'prova', GIT_AUTHOR_EMAIL: 'p@p', GIT_COMMITTER_NAME: 'prova', GIT_COMMITTER_EMAIL: 'p@p', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', HOME: tmpdir() };
export const git = (cwd, ...a) => execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'init.defaultBranch=main', ...a], { cwd, env: GIT_ENV, encoding: 'utf8' }).trim();

// Il bot: un'origine con A e B, il server fermo su A o su B. Il cervello:
// un'origine con L1 (e, se si vuole, L2), il clone del server su L1.
export function banco({ botSu = 'B', cervelloNuovo = true, cervelloDiverge = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'andrybot-aggiorna-cervello-'));
  try {
    const ori = join(dir, 'origine'), srv = join(dir, 'server'), finto = join(dir, 'finto');
    const liaOri = join(dir, 'lia-origine'), lia = join(dir, 'lia');
    mkdirSync(join(ori, 'server'), { recursive: true });
    mkdirSync(finto);
    git(dir, 'init', '-q', ori);
    assert.equal(git(ori, 'rev-parse', '--show-toplevel'), ori, 'il repository del banco sta nel banco');
    writeFileSync(join(ori, '.gitignore'), 'data/\n.env\n');
    writeFileSync(join(ori, 'server/aggiorna.sh'), VERO);
    // il codice che arriva chiede il cervello: e' cosi' che lo script sa che serve
    writeFileSync(join(ori, 'docker-compose.yml'), 'services:\n  brain:\n    build: ${LIA_DIR:-../lia}/brain\n');
    git(ori, 'add', '-A'); git(ori, 'commit', '-qm', 'A');
    const A = git(ori, 'rev-parse', 'HEAD');
    git(ori, 'commit', '-qm', 'B', '--allow-empty');
    const B = git(ori, 'rev-parse', 'HEAD');
    git(dir, 'clone', '-q', ori, srv);
    if (botSu === 'A') git(srv, 'reset', '-q', '--hard', A);
    mkdirSync(join(srv, 'data'));

    git(dir, 'init', '-q', liaOri);
    writeFileSync(join(liaOri, 'cervello.txt'), 'uno\n');
    git(liaOri, 'add', '-A'); git(liaOri, 'commit', '-qm', 'L1');
    const L1 = git(liaOri, 'rev-parse', 'HEAD');
    git(dir, 'clone', '-q', liaOri, lia);
    let L2 = L1;
    if (cervelloDiverge) {
      // la storia dell'origine riscritta: il commit che il server ha non c'e' piu' la'
      writeFileSync(join(liaOri, 'cervello.txt'), 'riscritto\n');
      git(liaOri, 'add', '-A'); git(liaOri, 'commit', '-q', '--amend', '-m', 'L1 riscritto');
      L2 = git(liaOri, 'rev-parse', 'HEAD');
    } else if (cervelloNuovo) {
      writeFileSync(join(liaOri, 'cervello.txt'), 'due\n');
      git(liaOri, 'add', '-A'); git(liaOri, 'commit', '-qm', 'L2');
      L2 = git(liaOri, 'rev-parse', 'HEAD');
    }

    writeFileSync(join(finto, 'docker'), FINTO_DOCKER);
    writeFileSync(join(finto, 'npm'), FINTO_NPM);
    writeFileSync(join(finto, 'sleep'), '#!/usr/bin/env bash\nexit 0\n');
    for (const f of ['docker', 'npm', 'sleep']) chmodSync(join(finto, f), 0o755);
    const leggi = (f) => (existsSync(f) ? readFileSync(f, 'utf8') : '');
    return {
      dir, srv, lia, A, B, L1, L2,
      segna: (file, testo) => writeFileSync(join(srv, 'data', file), testo + '\n'),
      lancia: (args = [], env = {}) => {
        const r = spawnSync('bash', [join(srv, 'server/aggiorna.sh'), ...args], {
          cwd: dir, encoding: 'utf8',
          env: { ...GIT_ENV, AGGIORNA_LUCCHETTO_FILE: join(dir, 'lucchetto'), ...env, PATH: `${finto}:${process.env.PATH}`, FINTO: finto },
        });
        return { codice: r.status, uscita: (r.stdout || '') + (r.stderr || '') };
      },
      docker: () => leggi(join(finto, 'docker.log')),
      npm: () => leggi(join(finto, 'npm.log')),
      segno: () => leggi(join(srv, 'data/.deployato')).trim(),
      lucchetto: join(dir, 'lucchetto'),
      dati: join(srv, 'data'),
      env: (testo) => writeFileSync(join(srv, '.env'), testo),
      esito: () => (existsSync(join(srv, 'data/aggiorna.json')) ? JSON.parse(readFileSync(join(srv, 'data/aggiorna.json'), 'utf8')) : null),
      bot: () => git(srv, 'rev-parse', 'HEAD'),
      cervello: () => git(lia, 'rev-parse', 'HEAD'),
      pulisci: () => rmSync(dir, { recursive: true, force: true }),
    };
  } catch (e) { rmSync(dir, { recursive: true, force: true }); throw e; }
}
