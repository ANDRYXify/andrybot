// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL SERVER SI AGGIORNA DA SOLO (docs/AGGIORNARE.md, «Il server si aggiorna da
// solo»).
//
// server/aggiorna-da-solo.sh installa un timer di systemd che ogni quarto d'ora
// lancia aggiorna.sh. Un giro che parte da solo non lo guarda nessuno, quindi:
//  · e' un giro prudente: mai --subito, mai --salta-prove;
//  · uno alla volta: flock -n sul lucchetto che usa anche lo script;
//  · lascia scritto cosa ha fatto (data/aggiorna.json), anche e soprattutto
//    quando torna indietro, e il pannello dell'amministratore lo legge;
//  · AGGIORNA_DA_SOLO=0 in .env lo spegne.
// Qui l'installazione gira davvero, in una cartella usa e getta e con un
// systemctl finto; e lo script vero gira sul banco del bot col cervello accanto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, chmodSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync, spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { banco, VERO, git } from '../banco-aggiorna.mjs';
import { esitoAggiornamento } from '../../src/aggiornamento-server.js';

const RAD = new URL('../..', import.meta.url).pathname;

// L'ora la scrive lo script, con date: la si misura con lo stesso orologio, non
// con quello di Node (che verifica-orologio.mjs sposta in avanti).
const oraDelloScript = () => Number(spawnSync('date', ['-u', '+%s'], { encoding: 'utf8' }).stdout.trim()) * 1000;
const fraLeDue = (t, prima, dopo) => Number.isFinite(t) && t >= prima && t <= dopo + 999;
const INSTALLA = readFileSync(join(RAD, 'server/aggiorna-da-solo.sh'), 'utf8');
const SENZA = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_') && !k.startsWith('AGGIORNA_')));

// L'installazione in una cartella usa e getta: la copia del repository serve
// solo come «dove sta», e systemctl, docker e npm sono finti.
function installazione() {
  const dir = mkdtempSync(join(tmpdir(), 'andrybot-da-solo-'));
  const rad = join(dir, 'andrybot'), unita = join(dir, 'systemd'), finto = join(dir, 'finto');
  mkdirSync(join(rad, 'server'), { recursive: true });
  mkdirSync(join(rad, '.git'));
  mkdirSync(finto);
  writeFileSync(join(rad, 'server/aggiorna.sh'), VERO);
  writeFileSync(join(rad, 'server/aggiorna-da-solo.sh'), INSTALLA);
  writeFileSync(join(finto, 'systemctl'), '#!/usr/bin/env bash\necho "$*" >> "$FINTO/systemctl.log"\nexit 0\n');
  for (const f of ['docker', 'npm']) writeFileSync(join(finto, f), '#!/usr/bin/env bash\nexit 0\n');
  for (const f of ['systemctl', 'docker', 'npm']) chmodSync(join(finto, f), 0o755);
  const lancia = (...args) => {
    const r = spawnSync('bash', [join(rad, 'server/aggiorna-da-solo.sh'), ...args], {
      encoding: 'utf8', env: { ...SENZA, AGGIORNA_SYSTEMD_DIR: unita, FINTO: finto, PATH: `${finto}:${process.env.PATH}` },
    });
    return { codice: r.status, uscita: (r.stdout || '') + (r.stderr || '') };
  };
  const leggi = (f) => (existsSync(f) ? readFileSync(f, 'utf8') : '');
  return {
    rad, lancia,
    servizio: () => leggi(join(unita, 'andrybot-aggiorna.service')),
    timer: () => leggi(join(unita, 'andrybot-aggiorna.timer')),
    systemctl: () => leggi(join(finto, 'systemctl.log')),
    azzera: () => writeFileSync(join(finto, 'systemctl.log'), ''),
    unita: () => (existsSync(unita) ? readdirSync(unita) : []),
    pulisci: () => rmSync(dir, { recursive: true, force: true }),
  };
}
const riga = (testo, chiave) => (testo.match(new RegExp(`^${chiave}=(.*)$`, 'm')) || [])[1] || '';

test('il servizio è un giro prudente: flock -n sul lucchetto dello script, mai --subito né --salta-prove', () => {
  const i = installazione();
  try {
    const r = i.lancia();
    assert.equal(r.codice, 0, r.uscita);
    const s = i.servizio();
    const parte = riga(s, 'ExecStart');
    const lucchetto = (VERO.match(/AGGIORNA_LUCCHETTO_FILE:-([^}]+)\}/) || [])[1];
    assert.ok(lucchetto, 'lo script ha il suo lucchetto');
    assert.match(parte, new RegExp(`(^|/)flock -n ${lucchetto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} /bin/bash ${i.rad}/server/aggiorna\\.sh$`),
      `ExecStart: ${parte}`);
    assert.doesNotMatch(s, /--subito|--salta-prove|--prova/, 'da solo aspetta le dirette e fa il collaudo');
    assert.match(s, /^Type=oneshot$/m);
    assert.match(s, /^TimeoutStartSec=infinity$/m, 'un giro puo\' aspettare ore la fine di una diretta');
    assert.match(s, /^Environment=AGGIORNA_GIRO_DA_SOLO=1$/m, 'lo script sa che parte da solo (l\'interruttore, e «da solo» nell\'esito)');
    assert.match(s, /^Environment=AGGIORNA_HA_LUCCHETTO=1$/m, 'e che il lucchetto ce l\'ha gia\'');
    assert.match(s, /^WorkingDirectory=/m);
    for (const strumento of ['node', 'git']) {
      const dove = spawnSync('bash', ['-c', `command -v ${strumento}`], { encoding: 'utf8' }).stdout.trim();
      assert.ok(riga(s, 'Environment=PATH').split(':').includes(dove.replace(/\/[^/]+$/, '')), `il PATH del servizio trova ${strumento}`);
    }
    const t = i.timer();
    assert.match(t, /^OnCalendar=\*:0\/15$/m, 'ogni quarto d\'ora');
    assert.match(t, /^RandomizedDelaySec=[1-9]\d*min$/m, 'con qualche minuto a caso');
    assert.match(t, /^WantedBy=timers\.target$/m);
    assert.match(i.systemctl(), /daemon-reload\nenable --now andrybot-aggiorna\.timer\n/);
    assert.match(r.uscita, /--togli/, 'dice come si toglie');
    assert.match(r.uscita, /AGGIORNA_DA_SOLO=0/, 'e come si spegne');
  } finally { i.pulisci(); }
});

test('l\'installazione è idempotente, e --togli toglie tutto', () => {
  const i = installazione();
  try {
    i.lancia();
    const prima = i.servizio() + i.timer();
    i.azzera();
    const r = i.lancia();
    assert.equal(r.codice, 0, r.uscita);
    assert.match(r.uscita, /già a posto/);
    assert.equal(i.servizio() + i.timer(), prima);
    assert.doesNotMatch(i.systemctl(), /daemon-reload/, 'niente cambiato, niente da ricaricare');
    const t = i.lancia('--togli');
    assert.equal(t.codice, 0, t.uscita);
    assert.deepEqual(i.unita(), []);
    assert.match(i.systemctl(), /disable --now andrybot-aggiorna\.timer/);
  } finally { i.pulisci(); }
});

test('tornato indietro: l\'esito resta scritto, col motivo e coi commit', () => {
  const b = banco({ botSu: 'A' });
  try {
    b.segna('.deployato', `${b.A} ${b.L1}`);
    const prima = oraDelloScript();
    const r = b.lancia([], { NPM_TEST_ESITO: '1', AGGIORNA_GIRO_DA_SOLO: '1' });
    const dopo = oraDelloScript();
    assert.equal(r.codice, 1, r.uscita);
    assert.equal(b.bot(), b.A, 'il repository e\' tornato dov\'era');
    const e = b.esito();
    assert.ok(e, 'l\'esito c\'e\'');
    assert.equal(e.esito, 'tornato indietro');
    assert.match(e.motivo, /non passa le prove/);
    assert.deepEqual(e.bot, { da: b.A, a: b.B });
    assert.deepEqual(e.cervello, { da: b.L1, a: b.L2 });
    assert.equal(e.come, 'da solo');
    assert.ok(fraLeDue(Date.parse(e.quando), prima, dopo), `quando=${e.quando}: l'ora del giro`);
  } finally { b.pulisci(); }
});

test('un commit nuovo solo nel cervello: «aggiornato», e il pannello lo legge così', () => {
  const b = banco();
  try {
    b.segna('.deployato', `${b.B} ${b.L1}`);
    const r = b.lancia([], { AGGIORNA_GIRO_DA_SOLO: '1' });
    assert.equal(r.codice, 0, r.uscita);
    const e = esitoAggiornamento(b.dati);
    assert.equal(e.esito, 'aggiornato');
    assert.deepEqual(e.cervello, { da: b.L1, a: b.L2 }, 'il commit nuovo del cervello');
    assert.deepEqual(e.bot, { da: b.B, a: b.B });
    assert.equal(e.come, 'da solo');
  } finally { b.pulisci(); }
});

test('niente di nuovo: non si scrive niente', () => {
  const b = banco({ cervelloNuovo: false });
  try {
    b.segna('.deployato', `${b.B} ${b.L1}`);
    writeFileSync(join(b.dati, 'aggiorna.json'), '{"esito":"aggiornato","quando":"2026-11-01T00:00:00Z"}\n');
    const r = b.lancia([], { AGGIORNA_GIRO_DA_SOLO: '1' });
    assert.match(r.uscita, /già aggiornato/);
    assert.equal(b.esito().quando, '2026-11-01T00:00:00Z', 'l\'ultimo giro che ha fatto qualcosa resta quello');
  } finally { b.pulisci(); }
});

test('l\'attesa di una diretta che non finisce, la costruzione che non riesce, un\'uscita imprevista: l\'esito c\'è sempre', () => {
  const casi = [
    { nome: 'attesa scaduta', prepara: (b) => writeFileSync(join(b.dati, '.in-onda'), '{"canali":["anna"],"ts":1}\n'), env: { ATTESA_MAX_MIN: '0' }, codice: 3, esito: 'aspetta una diretta', motivo: /anna/ },
    { nome: 'costruzione', env: { DOCKER_BUILD_ESITO: '1' }, codice: 1, esito: 'tornato indietro', motivo: /non si costruisce/ },
    { nome: 'imprevisto dopo il segnale', env: { DOCKER_UP_ESITO: '1' }, codice: 1, esito: 'fermo', motivo: /«Riavvio»/ },
    // GitHub irraggiungibile: il fetch fallisce sotto set -e, prima di ogni
    // altra trappola. E' la trappola d'uscita principale a scrivere.
    { nome: 'imprevisto al fetch', prepara: (b) => git(b.srv, 'remote', 'set-url', 'origin', join(b.dir, 'non-c-e')), codice: 128, esito: 'fermo', motivo: /«Guardo cosa c'è di nuovo»/ },
  ];
  for (const c of casi) {
    const b = banco({ botSu: 'A' });
    try {
      b.segna('.deployato', `${b.A} ${b.L1}`);
      c.prepara?.(b);
      const r = b.lancia([], c.env);
      assert.equal(r.codice, c.codice, `${c.nome}: ${r.uscita}`);
      const e = b.esito();
      assert.equal(e?.esito, c.esito, `${c.nome}: ${JSON.stringify(e)}`);
      assert.match(e.motivo, c.motivo, c.nome);
      if (c.esito !== 'fermo') assert.equal(b.bot(), b.A, `${c.nome}: il repository torna dov'era`);
    } finally { b.pulisci(); }
  }
});

test('un codice bocciato il giro da solo non lo riprova; quello a mano sì', () => {
  const b = banco({ botSu: 'A' });
  try {
    b.segna('.deployato', `${b.A} ${b.L1}`);
    const r1 = b.lancia([], { NPM_TEST_ESITO: '1', AGGIORNA_GIRO_DA_SOLO: '1' });
    assert.equal(r1.codice, 1, r1.uscita);
    const quando = b.esito().quando;
    writeFileSync(join(b.dir, 'finto', 'npm.log'), '');
    const r2 = b.lancia([], { AGGIORNA_GIRO_DA_SOLO: '1' });
    assert.equal(r2.codice, 0, r2.uscita);
    assert.match(r2.uscita, /ha già fallito il collaudo/);
    assert.equal(b.npm(), '', 'mezz\'ora di collaudo non si rifà ogni quarto d\'ora');
    assert.equal(b.esito().quando, quando, 'l\'esito resta quello del giro che ha bocciato');
    const r3 = b.lancia();
    assert.equal(r3.codice, 0, r3.uscita);
    assert.match(b.npm(), /test/, 'a mano si riprova');
    assert.equal(b.esito().esito, 'aggiornato');
    assert.ok(!existsSync(join(b.dati, '.bocciato')), 'un collaudo verde toglie il ricordo');
  } finally { b.pulisci(); }
});

test('ogni giro che guarda lascia l\'ora dell\'ultimo controllo, anche quando non trova niente', () => {
  const b = banco({ cervelloNuovo: false });
  try {
    b.segna('.deployato', `${b.B} ${b.L1}`);
    const prima = oraDelloScript();
    const r = b.lancia([], { AGGIORNA_GIRO_DA_SOLO: '1' });
    const dopo = oraDelloScript();
    assert.match(r.uscita, /già aggiornato/);
    assert.equal(b.esito(), null, 'l\'esito no');
    const e = esitoAggiornamento(b.dati);
    assert.equal(e.esito, null);
    assert.ok(fraLeDue(e.controllato, prima, dopo), 'l\'ultimo controllo si, con l\'ora del giro');
  } finally { b.pulisci(); }
});

test('AGGIORNA_DA_SOLO=0 spegne il giro da solo, non quello a mano', () => {
  const b = banco();
  try {
    b.env('AGGIORNA_DA_SOLO=0\n');
    b.segna('.deployato', `${b.B} ${b.L1}`);
    const r = b.lancia([], { AGGIORNA_GIRO_DA_SOLO: '1' });
    assert.equal(r.codice, 0, r.uscita);
    assert.match(r.uscita, /spento/);
    assert.equal(b.cervello(), b.L1, 'non ha preso niente');
    assert.equal(b.docker(), '');
    assert.equal(b.esito(), null);
    const aMano = b.lancia();
    assert.equal(aMano.codice, 0, aMano.uscita);
    assert.equal(b.cervello(), b.L2, 'a mano si aggiorna');
    assert.equal(b.esito().come, 'a mano');
  } finally { b.pulisci(); }
});

test('un giro alla volta: con il lucchetto preso, il secondo non parte', async () => {
  const b = banco();
  try {
    b.segna('.deployato', `${b.B} ${b.L1}`);
    const tiene = spawn('flock', [b.lucchetto, 'sleep', '30'], { stdio: 'ignore' });
    try {
      for (let i = 0; i < 50 && !existsSync(b.lucchetto); i++) await new Promise((ok) => setTimeout(ok, 50));
      await new Promise((ok) => setTimeout(ok, 200));
      const r = b.lancia();
      assert.equal(r.codice, 0, r.uscita);
      assert.match(r.uscita, /già un aggiornamento in corso/);
      assert.equal(b.cervello(), b.L1);
      assert.equal(b.docker(), '');
    } finally { tiene.kill(); }
  } finally { b.pulisci(); }
});

test('il lettore del pannello prende solo la forma nota', () => {
  const dir = mkdtempSync(join(tmpdir(), 'andrybot-esito-'));
  try {
    assert.equal(esitoAggiornamento(dir), null, 'senza file: niente da dire');
    writeFileSync(join(dir, 'aggiorna.json'), 'non json');
    assert.equal(esitoAggiornamento(dir), null);
    writeFileSync(join(dir, 'aggiorna.json'), JSON.stringify({ esito: 'boh' }));
    assert.equal(esitoAggiornamento(dir), null, 'un esito che non si conosce non si mostra');
    writeFileSync(join(dir, 'aggiorna.json'), JSON.stringify({ quando: '2026-11-23T10:00:00Z', come: 'x', esito: 'tornato indietro', motivo: 'm'.repeat(900), bot: { da: 'abc1234', a: '<b>' }, cervello: [1] }));
    const e = esitoAggiornamento(dir);
    assert.equal(e.come, 'a mano');
    assert.equal(e.motivo.length, 400);
    assert.deepEqual(e.bot, { da: 'abc1234', a: '' });
    assert.equal(e.cervello, null);
    assert.equal(e.quando, Date.parse('2026-11-23T10:00:00Z'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
  const SERVER = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
  assert.match(SERVER, /aggiornamento: esitoAggiornamento\(config\.dataDir\),/, 'la salute dell\'amministratore lo porta');
  const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  assert.match(APP, /\$\{saluteAggiornamento\(d\.aggiornamento\)\}/, 'e il pannello lo mostra');
  assert.match(APP, /aggiornato: \[L\('aggiornato', 'updated', 'actualizado'\), BADGE\.ok\]/, 'verde se e\' andato');
  assert.match(APP, /'tornato indietro': \[L\('tornato indietro', 'rolled back', 'vuelto atrás'\), BADGE\.attenzione\]/, 'ambra se e\' tornato indietro');
});
