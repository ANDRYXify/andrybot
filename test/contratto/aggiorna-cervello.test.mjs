// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// AGGIORNA.SH GUARDA IL CERVELLO PRIMA DI DECIDERE (docs/COLLAUDO.md, «Il
// cervello è parte di quello che gira»).
//
// Successo il 22 novembre: il clone del cervello sul server è stato portato su
// una storia nuova, e aggiorna.sh non ha aggiornato niente. Decideva guardando
// solo il bot (commit nuovi, commit persi, il segno di cosa gira), e con il bot
// fermo usciva con «già aggiornato» prima di guardare il cervello. E se la
// storia del cervello divergeva, se ne accorgeva al merge, dopo aver già
// portato avanti il bot: l'aggiornamento restava a metà.
//
// Qui lo script VERO gira davvero, su due repository e due «origini» usa e
// getta (il bot e il cervello, accanto come sul server), con un docker e un
// npm finti che registrano cosa gli si chiede.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, chmodSync, existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const VERO = readFileSync(new URL('../../server/aggiorna.sh', import.meta.url), 'utf8');

const FINTO_DOCKER = `#!/usr/bin/env bash
echo "$*" >> "$FINTO/docker.log"
[ "$1" = compose ] || exit 0
shift
case "$1" in
  ps) echo "bot-1 running"; exit 0 ;;
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
const SENZA_GIT = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
const GIT_ENV = { ...SENZA_GIT, GIT_AUTHOR_NAME: 'prova', GIT_AUTHOR_EMAIL: 'p@p', GIT_COMMITTER_NAME: 'prova', GIT_COMMITTER_EMAIL: 'p@p', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', HOME: tmpdir() };
const git = (cwd, ...a) => execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'init.defaultBranch=main', ...a], { cwd, env: GIT_ENV, encoding: 'utf8' }).trim();

// Il bot: un'origine con A e B, il server fermo su A o su B. Il cervello:
// un'origine con L1 (e, se si vuole, L2), il clone del server su L1.
function banco({ botSu = 'B', cervelloNuovo = true, cervelloDiverge = false } = {}) {
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
      bot: () => git(srv, 'rev-parse', 'HEAD'),
      cervello: () => git(lia, 'rev-parse', 'HEAD'),
      pulisci: () => rmSync(dir, { recursive: true, force: true }),
    };
  } catch (e) { rmSync(dir, { recursive: true, force: true }); throw e; }
}
const corto = (sha) => sha.slice(0, 7);

test('il bot fermo e un commit nuovo solo nel cervello: non è «già aggiornato», il cervello arriva', () => {
  // Il caso del 22 novembre: il segno di cosa gira e' ancora del formato di
  // prima (solo il bot) e combacia col bot.
  const b = banco();
  try {
    b.segna('.deployato', b.B);
    b.segna('.collaudato', `${b.B} ${b.L1}`);
    const r = b.lancia();
    assert.equal(r.codice, 0, r.uscita);
    assert.doesNotMatch(r.uscita, /già aggiornato/);
    assert.match(r.uscita, new RegExp(`cervello ora su ${corto(b.L2)}`));
    assert.equal(b.cervello(), b.L2);
    assert.match(b.npm(), /test/, 'il codice nuovo del cervello passa dal collaudo');
    assert.equal(b.segno(), `${b.B} ${b.L2}`, 'il segno dice tutti e due: il bot e il cervello');
  } finally { b.pulisci(); }
});

test('con il segno nuovo che combacia, un commit solo nel cervello si vede da LIA_NUOVI', () => {
  const b = banco();
  try {
    b.segna('.deployato', `${b.B} ${b.L1}`);
    const r = b.lancia();
    assert.equal(r.codice, 0, r.uscita);
    assert.doesNotMatch(r.uscita, /già aggiornato/);
    assert.match(r.uscita, /1 commit in arrivo per il cervello/);
    assert.match(r.uscita, new RegExp(`cervello ora su ${corto(b.L2)}`));
    assert.equal(b.segno(), `${b.B} ${b.L2}`);
  } finally { b.pulisci(); }
});

test('«aggiorna.sh --prova» con il bot fermo dice «cervello ora su …»', () => {
  const b = banco();
  try {
    b.segna('.deployato', `${b.B} ${b.L1}`);
    const r = b.lancia(['--prova']);
    assert.equal(r.codice, 0, r.uscita);
    assert.match(r.uscita, new RegExp(`cervello ora su ${corto(b.L2)}`));
    assert.doesNotMatch(b.docker(), /compose (build|up)/, 'la prova non tocca il container');
  } finally { b.pulisci(); }
});

test('tutto in pari, il bot e il cervello: «già aggiornato», e non si tocca niente', () => {
  const b = banco({ cervelloNuovo: false });
  try {
    b.segna('.deployato', `${b.B} ${b.L1}`);
    const r = b.lancia();
    assert.equal(r.codice, 0, r.uscita);
    assert.match(r.uscita, /già aggiornato/);
    assert.equal(b.npm(), '', 'niente collaudo');
    assert.doesNotMatch(b.docker(), /backup|compose (build|up)/, 'niente copia, niente container');
  } finally { b.pulisci(); }
});

test('il passaggio: il segno di prima (solo il bot) fa ricostruire una volta, e lo dice', () => {
  const b = banco({ cervelloNuovo: false });
  try {
    b.segna('.deployato', b.B);
    b.segna('.collaudato', `${b.B} ${b.L1}`);
    const r = b.lancia();
    assert.equal(r.codice, 0, r.uscita);
    assert.match(r.uscita, /segno .* formato di prima/);
    assert.match(b.docker(), /compose up -d/, 'ricostruisce una volta');
    assert.equal(b.segno(), `${b.B} ${b.L1}`);
    // e il giro dopo e' «già aggiornato»
    const r2 = b.lancia();
    assert.match(r2.uscita, /già aggiornato/, r2.uscita);
  } finally { b.pulisci(); }
});

test('la storia del cervello diverge: ci si ferma subito, e il bot NON va avanti', () => {
  const b = banco({ botSu: 'A', cervelloDiverge: true });
  try {
    b.segna('.deployato', `${b.A} ${b.L1}`);
    const r = b.lancia();
    assert.notEqual(r.codice, 0, r.uscita);
    assert.equal(b.bot(), b.A, 'il bot resta dov\'era: niente aggiornamento a metà');
    assert.equal(b.cervello(), b.L1);
    assert.match(r.uscita, /cervello .*DIVERSE/s);
    assert.ok(r.uscita.includes(`git -C ${b.lia} fetch origin && git -C ${b.lia} reset --hard origin/main`), r.uscita);
    assert.doesNotMatch(b.docker(), /backup|compose (build|up)/, 'prima di toccare qualunque cosa');
    assert.equal(b.npm(), '');
  } finally { b.pulisci(); }
});

test('una firma sola di cosa gira, calcolata in un posto solo', () => {
  // ATTESO, il segno e la firma del collaudo sono la stessa domanda: si
  // chiedono alla stessa funzione, non a tre copie.
  const usi = VERO.match(/firma_codice\b/g) || [];
  assert.ok(usi.length >= 4, `firma_codice definita e usata da ATTESO, collaudo e segno (${usi.length})`);
  assert.match(VERO, /ATTESO="\$\(firma_codice\)"/);
  assert.match(VERO, /FIRMA_CODICE="\$\(firma_codice\)"/);
  assert.match(VERO, /firma_codice > "\$SEGNO"/);
  assert.doesNotMatch(VERO, /git rev-parse HEAD > "\$SEGNO"/, 'il segno non scrive piu\' il solo bot');
});
