// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// CHI MOSTRA UN ALERT: SocialBot, Twitch o tutti e due.
//
// Twitch ha i suoi alert per gli eventi che manda lui, e non da' un modo per
// cambiarli o farli partire da fuori. Quindi per ogni evento lo streamer sceglie
// solo se il NOSTRO parte. Qui si prova sul motore vero, con gli eventi come li
// manda Twitch:
//  · con «Twitch» il nostro alert non parte, ma widget e obiettivi contano;
//  · con «SocialBot» o «Tutti e due» parte come prima;
//  · la donazione non passa da Twitch e parte sempre;
//  · gli eventi che si possono lasciare a Twitch sono esattamente quelli che
//    arrivano da Twitch, non una lista scritta a parte che puo' restare indietro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('andrybot-alert-chi-');
const { streamers } = await import('../../src/db.js');
const { AlertsEngine } = await import('../../src/features/alerts.js');
const { CHI_ALERT, EVENTI_TWITCH, chiAlertOk } = await import('../../src/web/stile.js');
test.after(() => casa.pulisci());

const CH = 'canale';
streamers.request(CH, 'Canale', '1');

const mandati = [];
const motore = new AlertsEngine({ effects: { emit: (ch, p) => mandati.push(p), hasClients: () => true } });

// Tutti gli eventi di Twitch che il motore conosce, con quello che serve a ognuno.
const DA_TWITCH = [
  ['channel.follow', {}],
  ['channel.subscribe', {}],
  ['channel.subscription.message', { cumulative_months: 4 }],
  ['channel.subscription.gift', { total: 5 }],
  ['channel.cheer', { bits: 100 }],
  ['channel.raid', { from_broadcaster_user_name: 'Amico', viewers: 12 }],
];

function imposta(chi) {
  const ev = (x = {}) => ({ attivo: true, ...(chi === undefined ? {} : { chi }), ...x });
  streamers.setSettings(CH, {
    ...(streamers.get(CH)?.settings || {}),
    alerts: { attivo: true, follow: ev(), sub: ev(), cheer: ev({ minBits: 0 }), raid: ev({ minViewers: 0 }), donazione: ev({ minImporto: 0 }) },
    overlayGoals: [{ id: 'f', attivo: true, tipo: 'follower', obiettivo: 100 }],
    overlayStato: {},
  });
  mandati.length = 0;
}
const alert = () => mandati.filter((p) => p.tipo === 'alert');
const tutti = () => { for (const [type, data] of DA_TWITCH) motore.onEvent({ channel: CH, type, data: { user_name: 'tizio', ...data } }); };

test('tre scelte, e «Twitch» solo per gli eventi che Twitch sa mostrare', () => {
  for (const kind of EVENTI_TWITCH) {
    for (const v of CHI_ALERT) assert.equal(chiAlertOk(kind, v), v, `${kind}: «${v}» resta`);
    assert.equal(chiAlertOk(kind, 'boh'), 'socialbot', `${kind}: una scelta inventata torna quella di serie`);
    assert.equal(chiAlertOk(kind, undefined), 'socialbot', `${kind}: chi non ha mai scelto resta com'era`);
  }
  for (const v of CHI_ALERT) assert.equal(chiAlertOk('donazione', v), 'socialbot', 'la donazione non passa da Twitch');
});

test('gli eventi che si lasciano a Twitch sono quelli che arrivano da Twitch', () => {
  imposta('socialbot');
  tutti();
  const visti = new Set(alert().map((p) => p.kind));
  assert.deepEqual([...visti].sort(), [...EVENTI_TWITCH].sort());
});

test('con «Twitch» il nostro alert non parte, ma widget e obiettivi contano', () => {
  imposta('twitch');
  tutti();
  assert.equal(alert().length, 0, `partiti: ${alert().map((p) => p.kind).join(', ')}`);
  const stato = streamers.get(CH).settings.overlayStato;
  assert.equal(stato.goals?.f, 1, 'il follow conta nell\'obiettivo');
  assert.equal(stato.ultimoFollower, 'tizio', 'e l\'ultimo follower si aggiorna');
  assert.ok(mandati.some((p) => p.tipo === 'widget' && p.id === 'ultimoFollower'), 'e il widget in scena lo mostra');
});

test('con «SocialBot», con «Tutti e due» e senza scelta, il nostro parte per ogni evento', () => {
  for (const chi of ['socialbot', 'entrambi', undefined]) {
    imposta(chi);
    tutti();
    assert.equal(alert().length, DA_TWITCH.length, `con ${chi ?? 'nessuna scelta'}`);
  }
});

test('la donazione parte anche con un «twitch» scritto a mano', () => {
  imposta('twitch');
  assert.equal(motore.donazione(CH, { importo: 5, user: 'amica' }), true);
  assert.deepEqual(alert().map((p) => p.kind), ['donazione']);
});

test('l\'interruttore dell\'evento comanda sempre: spento non parte, qualunque sia la scelta', () => {
  for (const chi of CHI_ALERT) {
    imposta(chi);
    const s = streamers.get(CH).settings;
    streamers.setSettings(CH, { ...s, alerts: { ...s.alerts, follow: { ...s.alerts.follow, attivo: false } } });
    motore.onEvent({ channel: CH, type: 'channel.follow', data: { user_name: 'tizio' } });
    assert.equal(alert().length, 0, `con «${chi}»`);
  }
});
