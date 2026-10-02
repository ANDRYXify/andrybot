// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// GLI EFFETTI PER GLI EVENTI (src/features/effetti-eventi.js, docs/EFFETTI-SCHERMO.md).
//
// Un follow, un abbonamento, dei bit, un raid, una donazione, il treno che
// parte: ognuno puo' far partire un effetto a tutto schermo. Le promesse,
// provate sul motore vero con gli eventi come arrivano:
//  · parte anche se l'alert lo mostra Twitch, o e' spento;
//  · coi livelli parte quello col «da» piu' alto raggiunto, sotto il primo niente;
//  · un sub regalato non e' un abbonamento: si festeggia la raffica;
//  · la donazione che raggiunge un'offerta col suo effetto non ne fa partire due;
//  · la pausa tiene a bada un'ondata di follow;
//  · il treno festeggia quando parte e quando sale, non a ogni contributo;
//  · l'effetto pronto e' lo stesso di un comando, senza il nome del comando sopra.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('effetti-eventi-');
const { streamers, effects: effectsDb, accessi } = await import('../../src/db.js');
const { AlertsEngine } = await import('../../src/features/alerts.js');
const { EffectsEngine } = await import('../../src/features/effects.js');
const E = await import('../../src/features/effetti-eventi.js');
const { normDisegno } = await import('../../src/web/stile.js');
test.after(() => casa.pulisci());

const pulisci = (x) => E.normalizza(x, { disegno: normDisegno });
const pronto = (nome, extra = {}) => ({ tipo: 'pronto', disegno: { nome, ...extra }, volume: 70 });

test('le scelte ripulite: ogni evento c\'e\', i livelli in ordine, il follow ne ha uno', () => {
  const n = pulisci({ voci: {
    cheer: { attivo: true, livelli: [{ da: 1000, effetto: pronto('fuochi') }, { da: '50', effetto: pronto('coriandoli') }, { da: 1000, effetto: pronto('stelle') }, { da: 5, effetto: { tipo: 'boh' } }] },
    follow: { attivo: true, pausa: 9999, livelli: [{ da: 7, effetto: pronto('cuori') }, { effetto: pronto('neve') }] },
    inventato: { attivo: true },
  } });
  assert.deepEqual(Object.keys(n.voci), E.EVENTI.map((e) => e.id));
  assert.deepEqual(n.voci.cheer.livelli.map((l) => [l.da, l.effetto.disegno.nome]), [[50, 'coriandoli'], [1000, 'stelle']], 'in ordine, uno per soglia (l\'ultimo vince), e quello senza un effetto vero via');
  assert.equal(n.voci.follow.livelli.length, 1);
  assert.equal(n.voci.follow.livelli[0].da, 0, 'il follow non porta un numero');
  assert.equal(n.voci.follow.pausa, E.MAX_PAUSA);
  assert.equal(n.voci.raid.attivo, false, 'un evento mai toccato e\' spento');
  assert.equal(pulisci({}).voci.follow.pausa, 10, 'il follow di serie aspetta 10 secondi fra due effetti');
  const tanti = pulisci({ voci: { raid: { livelli: Array.from({ length: 9 }, (_, i) => ({ da: i, effetto: pronto('bolle') })) } } });
  assert.equal(tanti.voci.raid.livelli.length, E.MAX_LIVELLI);
  const mio = E.normalizza({ voci: { raid: { livelli: [{ effetto: { tipo: 'mio', comando: 'Airhorn' } }, { da: 9, effetto: { tipo: 'mio', comando: 'sparito' } }] } } }, { disegno: normDisegno, comandoOk: (c) => c === 'airhorn' });
  assert.deepEqual(mio.voci.raid.livelli, [{ da: 1, effetto: { tipo: 'mio', comando: 'airhorn' } }], 'un effetto del canale che non c\'e\' piu\' non resta appeso');
  assert.equal(pulisci({ voci: { sub: { livelli: [{ effetto: { ...pronto('cuori'), volume: 400 } }] } } }).voci.sub.livelli[0].effetto.volume, 100);
});

test('il livello: il «da» piu\' alto raggiunto, sotto il primo niente', () => {
  const voce = { attivo: true, livelli: [{ da: 100, effetto: 'a' }, { da: 1000, effetto: 'b' }] };
  assert.equal(E.livelloPer(voce, 99), null);
  assert.equal(E.livelloPer(voce, 100).effetto, 'a');
  assert.equal(E.livelloPer(voce, 999).effetto, 'a');
  assert.equal(E.livelloPer(voce, 5000).effetto, 'b');
  assert.equal(E.livelloPer(voce, null).effetto, 'a', 'un numero che non si sa fa partire il primo');
  assert.equal(E.livelloPer({ ...voce, attivo: false }, 5000), null, 'spento');
});

// Il motore vero: gli effetti spinti all'overlay si contano qui.
const CH = 'canale';
streamers.request(CH, 'Canale', '1');
streamers.setStatus?.(CH, 'approved');
class Spia extends EffectsEngine { constructor() { super(); this.mandati = []; } emit(ch, p) { this.mandati.push(p); } }
const fx = new Spia();
const motore = new AlertsEngine({ effects: fx });
function imposta(voci, { alerts = { attivo: false }, donazioni = {}, altro = {} } = {}) {
  streamers.setSettings(CH, { ...(streamers.get(CH)?.settings || {}), overlayGoals: [], overlayStato: {}, alerts, donazioni, ...altro, effettiEventi: pulisci({ voci }) });
  fx.mandati.length = 0;
  motore._pausaEventi.clear();
}
const ev = (type, data = {}) => motore.onEvent({ channel: CH, type, data: { user_name: 'Anna', ...data } });
// Gli aggiornamenti dei widget (ultimo follower, ultimo sub), degli obiettivi
// e del conto alla rovescia viaggiano sulla stessa strada: qui non contano.
const DI_STATO = new Set(['widget', 'goal', 'timer', 'treno']);
const visti = () => fx.mandati.filter((p) => !DI_STATO.has(p.tipo));
const nomi = () => visti().map((p) => p.disegno?.nome || p.comando || p.tipo);

test('il follow fa partire il suo effetto anche se l\'alert lo mostra Twitch, e senza il nome di un comando', () => {
  imposta({ follow: { attivo: true, livelli: [{ effetto: pronto('cuori', { suono: 'tada' }) }] } },
    { alerts: { attivo: true, follow: { attivo: true, chi: 'twitch' } } });
  ev('channel.follow');
  assert.deepEqual(nomi(), ['cuori']);
  const p = visti()[0];
  assert.equal(p.tipo, 'disegno');
  assert.equal(p.comando, '', 'sopra un effetto partito da un follow non si scrive «!cuori»');
  assert.equal(p.suonoPreset, 'tada');
  assert.equal(p.volume, 70);
  assert.equal(p.da, 'evento');
  assert.deepEqual(p.disegno, normDisegno({ nome: 'cuori', suono: 'tada' }), 'lo stesso disegno di un effetto a comando');
  imposta({ follow: { attivo: true, livelli: [{ effetto: pronto('cuori') }] } }, { alerts: { attivo: false } });
  ev('channel.follow');
  assert.deepEqual(nomi(), ['cuori'], 'anche con gli alert spenti');
});

test('i bit a livelli, e dopo l\'alert nostro un attimo dopo', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  imposta({ cheer: { attivo: true, livelli: [{ da: 100, effetto: pronto('coriandoli') }, { da: 1000, effetto: pronto('fuochi') }] } });
  for (const bits of [50, 100, 999, 1000]) ev('channel.cheer', { bits });
  assert.deepEqual(nomi(), ['coriandoli', 'coriandoli', 'fuochi'], 'sotto i 100 niente');
  imposta({ cheer: { attivo: true, livelli: [{ da: 1, effetto: pronto('stelle') }] } }, { alerts: { attivo: true, cheer: { attivo: true, chi: 'socialbot' } } });
  ev('channel.cheer', { bits: 10 });
  assert.deepEqual(nomi(), ['alert'], 'prima l\'avviso');
  t.mock.timers.tick(1200);
  assert.deepEqual(nomi(), ['alert', 'stelle'], 'poi l\'effetto');
});

test('un sub regalato non e\' un abbonamento: si festeggia la raffica, coi suoi numeri', () => {
  imposta({ sub: { attivo: true, livelli: [{ da: 1, effetto: pronto('cuori') }, { da: 12, effetto: pronto('fuochi') }] },
    regalo: { attivo: true, livelli: [{ da: 1, effetto: pronto('palloncini') }, { da: 10, effetto: pronto('fuochi') }] } });
  ev('channel.subscription.gift', { total: 5 });
  for (let i = 0; i < 5; i++) ev('channel.subscribe', { is_gift: true });
  assert.deepEqual(nomi(), ['palloncini'], 'cinque regali, una festa');
  ev('channel.subscription.gift', { total: 20 });
  ev('channel.subscribe', {});
  ev('channel.subscription.message', { cumulative_months: 14 });
  assert.deepEqual(nomi(), ['palloncini', 'fuochi', 'cuori', 'fuochi'], 'un sub nuovo e un anno di fila');
});

test('la pausa: un\'ondata di follow, un effetto ogni tanto', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  imposta({ follow: { attivo: true, pausa: 10, livelli: [{ effetto: pronto('neve') }] } });
  for (let i = 0; i < 30; i++) ev('channel.follow', { user_name: `bot${i}` });
  assert.deepEqual(nomi(), ['neve'], 'trenta follow in fila, un effetto');
  t.mock.timers.tick(9_999);
  ev('channel.follow');
  assert.deepEqual(nomi(), ['neve'], 'la pausa non e\' ancora passata');
  t.mock.timers.tick(1);
  ev('channel.follow');
  assert.deepEqual(nomi(), ['neve', 'neve']);
});

test('la donazione: l\'offerta col suo effetto vince, senza offerta l\'evento, in un\'altra valuta il primo livello', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  effectsDb.addDisegno(CH, { comando: 'caffe', disegno: JSON.stringify(normDisegno({ nome: 'stelle' })), tier: 'tutti', cooldown: 0, volume: 50, durata: 5000 });
  const donazioni = { valuta: 'EUR', livelli: [{ da: 5, nome: 'Caffè', effetto: 'effetto:caffe' }] };
  const voci = { donazione: { attivo: true, livelli: [{ da: 1, effetto: pronto('cuori') }, { da: 20, effetto: pronto('fuochi') }] } };
  imposta(voci, { donazioni });
  motore.donazione(CH, { importo: 7, user: 'Anna' });
  t.mock.timers.tick(1200);
  assert.deepEqual(nomi(), ['stelle'], 'parte l\'effetto dell\'offerta, non anche quello dell\'evento');
  motore.donazione(CH, { importo: 3, user: 'Anna' });
  assert.deepEqual(nomi(), ['stelle', 'cuori'], 'sotto la prima offerta, l\'evento');
  imposta(voci, { donazioni: { valuta: 'EUR' } });
  motore.donazione(CH, { importo: 25, user: 'Anna' });
  motore.donazione(CH, { importo: 500, valuta: 'USD', user: 'Bob' });
  assert.deepEqual(nomi(), ['fuochi', 'cuori']);
});

test('il treno: quando parte e quando sale di livello, non a ogni contributo', () => {
  imposta({ treno: { attivo: true, livelli: [{ da: 1, effetto: pronto('coriandoli') }, { da: 3, effetto: pronto('fuochi') }] } });
  ev('channel.hype_train.progress', { id: 'vecchio', level: 2 });
  assert.deepEqual(nomi(), [], 'un treno visto a meta\' non e\' una salita');
  ev('channel.hype_train.begin', { id: 't1', level: 1 });
  ev('channel.hype_train.progress', { id: 't1', level: 1 });
  ev('channel.hype_train.progress', { id: 't1', level: 2 });
  ev('channel.hype_train.progress', { id: 't1', level: 2 });
  ev('channel.hype_train.progress', { id: 't1', level: 3 });
  ev('channel.hype_train.end', { id: 't1', level: 3 });
  assert.deepEqual(nomi(), ['coriandoli', 'coriandoli', 'fuochi']);
});

test('uno degli effetti del canale, e uno cancellato non fa niente', () => {
  imposta({ raid: { attivo: true, livelli: [{ da: 1, effetto: { tipo: 'mio', comando: 'caffe' } }] } });
  ev('channel.raid', { from_broadcaster_user_name: 'Amico', viewers: 30 });
  assert.deepEqual(nomi(), ['stelle']);
  assert.equal(visti()[0].comando, '', 'nemmeno sopra uno dei tuoi effetti si scrive il comando');
  assert.equal(visti()[0].da, 'evento');
  effectsDb.remove(CH, effectsDb.list(CH).find((x) => x.comando === 'caffe').id);
  imposta({ raid: { attivo: true, livelli: [{ da: 1, effetto: { tipo: 'mio', comando: 'caffe' } }] } });
  ev('channel.raid', { from_broadcaster_user_name: 'Amico', viewers: 30 });
  assert.deepEqual(nomi(), [], 'cancellato, non parte niente (e niente al suo posto)');
});

test('un canale che non ha piu\' gli Effetti nel piano: le scelte restano, l\'effetto no', () => {
  imposta({ follow: { attivo: true, livelli: [{ effetto: pronto('cuori') }] } });
  accessi.set(CH, { modo: 'blocco', funzioni: { effetti: true } }, 'prova');
  try {
    ev('channel.follow');
    assert.deepEqual(nomi(), []);
  } finally { accessi.togli(CH, 'prova'); }
  ev('channel.follow');
  assert.deepEqual(nomi(), ['cuori'], 'col piano di nuovo, riparte');
});

// Kick, YouTube e le altre entrano dalla stessa porta, coi nomi di Twitch
// (bot.js, suEventoPiattaforma): l'effetto c'e' anche per loro.
test('gli eventi di Kick: stessi effetti, stessi numeri', () => {
  imposta({ sub: { attivo: true, livelli: [{ da: 1, effetto: pronto('cuori') }, { da: 6, effetto: pronto('stelle') }] },
    regalo: { attivo: true, livelli: [{ da: 1, effetto: pronto('palloncini') }] } });
  ev('channel.subscribe', { user_name: 'kicker', cumulative_months: 7, total: undefined });
  ev('channel.subscription.gift', { user_name: 'kicker', cumulative_months: undefined, total: 3 });
  assert.deepEqual(nomi(), ['stelle', 'palloncini']);
});

// Un obiettivo dello Studio che arriva al traguardo: il totale che si vede e'
// la partenza piu' gli eventi contati.
test('un obiettivo al traguardo fa partire il suo effetto, una volta per passaggio, dopo quello dell\'evento', () => {
  const goal = { id: 'g1', attivo: true, tipo: 'follower', obiettivo: 10, partenza: 8 };
  imposta({ follow: { attivo: true, pausa: 0, livelli: [{ effetto: pronto('cuori') }] }, obiettivo: { attivo: true, livelli: [{ effetto: pronto('fuochi') }] } },
    { altro: { overlayGoals: [goal] } });
  ev('channel.follow', { user_name: 'a' });
  assert.deepEqual(nomi(), ['cuori'], '9 su 10: non ancora');
  ev('channel.follow', { user_name: 'b' });
  assert.deepEqual(nomi(), ['cuori', 'cuori', 'fuochi'], '10 su 10: prima il follow, poi l\'obiettivo');
  ev('channel.follow', { user_name: 'c' });
  assert.deepEqual(nomi(), ['cuori', 'cuori', 'fuochi', 'cuori'], 'oltre il traguardo non riparte');
  motore.azzeraGoal(CH, 'g1');
  fx.mandati.length = 0;
  ev('channel.follow', { user_name: 'd' });
  ev('channel.follow', { user_name: 'e' });
  assert.deepEqual(nomi(), ['cuori', 'cuori', 'fuochi'], 'azzerato e raggiunto di nuovo, riparte');
  imposta({ obiettivo: { attivo: true, livelli: [{ effetto: pronto('fuochi') }] } },
    { altro: { overlayGoals: [{ ...goal, tipo: 'bit', obiettivo: 500, partenza: 0 }] } });
  ev('channel.cheer', { bits: 499 });
  ev('channel.cheer', { bits: 1 });
  assert.deepEqual(nomi(), ['fuochi'], 'i bit contano coi loro numeri');
});

test('senza suono se suona gia\' l\'alert; e «nessun suono» nell\'alert e\' davvero il silenzio', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const voci = { follow: { attivo: true, pausa: 0, muto: true, livelli: [{ effetto: pronto('cuori', { suono: 'tada' }) }] } };
  imposta(voci, { alerts: { attivo: true, follow: { attivo: true, chi: 'socialbot' } } });
  ev('channel.follow');
  t.mock.timers.tick(1200);
  const [alert, effetto] = visti();
  assert.equal(alert.tipo, 'alert');
  assert.equal(alert.suono, 'campanello', 'un alert che non ha scelto suona col suono di serie, come sempre');
  assert.equal(effetto.volume, 0, 'l\'alert suona: l\'effetto parte muto');
  imposta(voci, { alerts: { attivo: true, follow: { attivo: true, chi: 'socialbot', suono: 'nessuno' } } });
  ev('channel.follow');
  t.mock.timers.tick(1200);
  assert.equal(visti()[0].suono, '', '«nessun suono» e\' il silenzio');
  assert.equal(visti()[1].volume, 70, 'l\'alert non suona: l\'effetto tiene il suo suono');
  imposta(voci, { alerts: { attivo: true, follow: { attivo: true, chi: 'socialbot', volume: 0 } } });
  ev('channel.follow');
  t.mock.timers.tick(1200);
  assert.equal(visti()[1].volume, 70, 'un alert a volume zero non suona');
  imposta({ follow: { ...voci.follow, muto: false } }, { alerts: { attivo: true, follow: { attivo: true, chi: 'socialbot' } } });
  ev('channel.follow');
  t.mock.timers.tick(1200);
  assert.equal(visti()[1].volume, 70, 'senza la scelta, suonano tutti e due');
  effectsDb.add(CH, { comando: 'trombone', tipo: 'audio', file: 'trombone.mp3', tier: 'tutti', cooldown: 0, volume: 60, durata: 0 });
  imposta({ follow: { attivo: true, pausa: 0, muto: true, livelli: [{ effetto: { tipo: 'mio', comando: 'trombone' } }] } }, { alerts: { attivo: true, follow: { attivo: true, chi: 'socialbot' } } });
  ev('channel.follow');
  t.mock.timers.tick(1200);
  assert.deepEqual(nomi(), ['alert'], 'un tuo effetto che e\' solo un suono, muto, non parte');
});

test('la prova di un evento e\' l\'evento vero, con le scelte non salvate, senza conti e senza pausa', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const goal = { id: 'g1', attivo: true, tipo: 'bit', obiettivo: 100, partenza: 0 };
  imposta({ cheer: { attivo: true, pausa: 600, livelli: [{ da: 100, effetto: pronto('coriandoli') }] } },
    { alerts: { attivo: true, cheer: { attivo: true, chi: 'socialbot', minBits: 0 } }, altro: { overlayGoals: [goal] } });
  const nonSalvata = pulisci({ voci: { cheer: { attivo: true, pausa: 600, livelli: [{ da: 100, effetto: pronto('coriandoli') }, { da: 1000, effetto: pronto('fuochi') }] } } }).voci.cheer;
  let r = motore.provaEvento(CH, 'cheer', 1500, nonSalvata);
  t.mock.timers.tick(1200);
  assert.equal(r.avviso, true);
  assert.deepEqual(r.effetto, { parte: true, da: 1000, muto: false });
  assert.deepEqual(nomi(), ['alert', 'fuochi'], 'il livello delle scelte non salvate, dopo l\'alert');
  assert.deepEqual(streamers.get(CH).settings.overlayStato?.goals || {}, {}, 'la prova non conta per l\'obiettivo');
  fx.mandati.length = 0;
  ev('channel.cheer', { bits: 150 });
  t.mock.timers.tick(1200);
  assert.deepEqual(nomi(), ['alert', 'coriandoli'], 'la prova non lascia una pausa all\'evento vero');
  r = motore.provaEvento(CH, 'cheer', 1500, nonSalvata);
  assert.equal(r.effetto.parte, true, 'e non la rispetta: l\'evento vero ha appena acceso la sua, la prova parte lo stesso');
  assert.deepEqual(motore.provaEvento(CH, 'cheer', 50, nonSalvata).effetto, { parte: false, perche: 'sotto' });
  assert.deepEqual(motore.provaEvento(CH, 'cheer', 500, { ...nonSalvata, attivo: false }).effetto, { parte: false, perche: 'spento' });
  effectsDb.addDisegno(CH, { comando: 'caffe', disegno: JSON.stringify(normDisegno({ nome: 'stelle' })), tier: 'tutti', cooldown: 0, volume: 50, durata: 5000 });
  imposta({}, { donazioni: { valuta: 'EUR', livelli: [{ da: 5, nome: 'Caffè', effetto: 'effetto:caffe' }] } });
  r = motore.provaEvento(CH, 'donazione', 7, pulisci({ voci: { donazione: { attivo: true, livelli: [{ da: 1, effetto: pronto('cuori') }] } } }).voci.donazione);
  assert.equal(r.offerta, true, 'la donazione che raggiunge un\'offerta col suo effetto: parte quello');
  assert.equal(r.effetto, null);
  r = motore.provaEvento(CH, 'obiettivo', 0, pulisci({ voci: { obiettivo: { attivo: true, livelli: [{ effetto: pronto('fuochi') }] } } }).voci.obiettivo);
  assert.deepEqual(r.effetto, { parte: true, da: 0, muto: false });
  assert.equal(motore.provaEvento(CH, 'inventato', 1), null);
});
