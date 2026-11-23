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

import { banco, VERO } from '../banco-aggiorna.mjs';

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
