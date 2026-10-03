// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IMPORTARE UN COMANDO CON TUTTO QUELLO CHE ERA (src/features/importacomandi.js,
// docs/PONTE.md «Chi può usarlo e quando»).
//
// Prima si leggevano solo nome e risposta: un comando solo-mod di
// StreamElements entrava usabile da tutti, $(count) scriveva un numero fermo, e
// «già identico» guardava solo il testo. Qui le promesse:
//  · MAI PIÙ ACCESSO DI PRIMA, per ogni livello che un altro bot può scrivere;
//  · cooldown, alias, diretta/fuori, costo e «menzione» si portano uguali;
//  · quello che qui non si fa (risposta in privato, parole chiave, nascosti)
//    va «da rivedere», col perché;
//  · il contatore si MUOVE come prima, e il suo numero entra dove non c'è;
//  · «identico» vuol dire identico in tutto, e un import sopra un comando
//    tiene le scelte fatte qui.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';
import {
  anteprima, livelloDa, condizioniDi, moduloDa, sopra, GRADINI, traduci,
} from '../../src/features/importacomandi.js';

const IO = { p: 'twitch', id: '901', login: 'canalese', nome: 'CanaleSE' };
const se = (comandi, extra = {}) => JSON.stringify({ commands: comandi, ...extra });
const cmd = (command, reply, altro = {}) => ({
  command, reply, enabled: true, accessLevel: 100, cooldown: { user: 0, global: 0 }, aliases: [],
  enabledOnline: true, enabledOffline: true, cost: 0, type: 'say', keywords: [], regex: '', titleKeywords: [], hidden: false, ...altro,
});
const tutte = (a) => [...a.buoni, ...a.daRivedere];
const per = (a) => Object.fromEntries(tutte(a).map((v) => [v.nome, v]));

// ------------------------------------------------------------ chi può usarlo
// Il gradino di qui, letto come livello di StreamElements: chi entra con quel
// gradino ha ALMENO quel livello. Mai più accesso di prima vuol dire: per
// ogni livello n, il gradino scelto sta a n o sopra.
const LIVELLO_SE_DI = { tutti: 100, sub: 250, vip: 400, mod: 500, tu: 1500 };

test('StreamElements: ogni livello possibile entra uguale o più stretto, mai più largo', () => {
  for (let n = -5; n <= 2000; n++) {
    const { gradino, spento } = livelloDa(n);
    assert.ok(GRADINI.includes(gradino), `${n} → un gradino vero`);
    // sopra il proprietario non c'era nessuno: l'unico «più stretto» è spento
    assert.ok(LIVELLO_SE_DI[gradino] >= n || spento, `${n} → ${gradino}: sarebbe più largo di prima`);
    assert.equal(!!spento, n > 1500, `${n}: spento solo sopra il proprietario`);
  }
  // i gradini che ci sono anche qui entrano esatti, e senza avvisi
  for (const [n, g] of [[100, 'tutti'], [250, 'sub'], [400, 'vip'], [500, 'mod'], [1500, 'tu']]) {
    assert.deepEqual(livelloDa(n), { gradino: g }, `${n}`);
    assert.deepEqual(livelloDa(String(n)), { gradino: g }, `"${n}"`);
  }
  // quelli che qui non ci sono salgono, e lo dicono
  assert.equal(livelloDa(300).gradino, 'vip');
  assert.match(livelloDa(300).avviso, /regular/);
  assert.equal(livelloDa(1000).gradino, 'tu');
  assert.match(livelloDa(1000).avviso, /super moderatori/);
  assert.match(livelloDa(450).avviso, /non conosco \(450\)/);
  assert.equal(per(anteprima(se([cmd('nessuno', 'x', { accessLevel: 2000 })]), { proprietario: IO })).nessuno.attivo, false);
});

test('Nightbot e i file scritti a mano: le parole dei livelli, e una sconosciuta è solo tua', () => {
  const casi = {
    everyone: 'tutti', subscriber: 'sub', twitch_vip: 'vip', soop_vip: 'vip', regular: 'vip', moderator: 'mod', owner: 'tu', admin: 'tu',
    Moderatori: 'mod', 'super moderator': 'tu', VIP: 'vip', abbonati: 'sub', broadcaster: 'tu',
  };
  for (const [parola, g] of Object.entries(casi)) assert.equal(livelloDa(parola).gradino, g, parola);
  assert.ok(livelloDa('regular').avviso && livelloDa('admin').avviso);
  assert.deepEqual(livelloDa('qualcosa di strano').gradino, 'tu', 'non so cos\'è: il più stretto');
  assert.ok(livelloDa('qualcosa di strano').avviso);
  assert.deepEqual(livelloDa(undefined), { gradino: 'tutti' }, 'nessun livello scritto: tutti, come prima');
  assert.deepEqual(livelloDa(''), { gradino: 'tutti' });
});

test('le condizioni del gradino: tier, oppure «Per chi» solo il proprietario; senza sapere chi è, niente', () => {
  assert.deepEqual(condizioniDi('tutti', IO), {});
  assert.deepEqual(condizioniDi('mod', IO), { tier: 'mod' });
  assert.deepEqual(condizioniDi('tu', IO), { chi: { modo: 'solo', persone: [IO], gruppi: [] } });
  assert.equal(condizioniDi('tu', null), null);
  const a = anteprima(se([cmd('solomio', 'solo io', { accessLevel: 1500 })]));
  assert.equal(tutte(a).length, 0);
  assert.match(a.scartati[0].perche, /proprietario/, 'non entra più largo: non entra, e dice perché');
});

// ------------------------------------------------------------ StreamElements per intero
test('un export di StreamElements: livelli, cooldown, alias, diretta, costo e menzione', () => {
  const a = anteprima(se([
    cmd('setgame', 'Gioco cambiato', { accessLevel: 500, cooldown: { user: 15, global: 5 } }),
    cmd('discord', 'Entra: discord.gg/x', { aliases: ['dc', 'DC', '!disc', 'discord'] }),
    cmd('lurk', '$(user) va in lurk', { enabledOffline: false }),
    cmd('notte', 'buonanotte', { enabledOnline: false }),
    cmd('spento', 'mai', { enabledOnline: false, enabledOffline: false }),
    cmd('premio', 'Hai speso', { cost: 95 }),
    cmd('ciao', 'ciao a te', { type: 'mention' }),
    cmd('mio', 'solo io', { accessLevel: 1500 }),
  ]), { proprietario: IO, tasso: 10 });
  const v = per(a);
  assert.deepEqual(v.setgame.condizioni, { tier: 'mod', cooldown: 5, cooldownUtente: 15 });
  assert.deepEqual(v.discord.alias, ['dc', 'disc'], 'puliti, senza doppioni né il nome stesso');
  assert.deepEqual(v.lurk.condizioni, { soloLive: true });
  assert.equal(v.lurk.risposta, '$user va in lurk');
  assert.deepEqual(v.notte.condizioni, { soloOffline: true });
  assert.equal(v.spento.attivo, false, 'spento in diretta e fuori: entra spento');
  assert.equal(v.premio.condizioni.costo, 10, '95 punti col cambio 10: 10 monete, arrotondate in su');
  assert.equal(v.ciao.risposta, '@$user ciao a te');
  assert.equal(v.ciao.menzione, true);
  assert.deepEqual(v.mio.condizioni.chi.persone, [IO]);
  assert.ok(a.buoni.every((x) => !x.avvisi.length), 'portati uguali: nessuno da rivedere');

  const m = moduloDa(v.discord);
  assert.deepEqual(m.trigger, { tipo: 'comando', comando: 'discord', alias: ['dc', 'disc'] });
  assert.deepEqual(moduloDa(v.setgame).condizioni, { tier: 'mod', cooldown: 5, cooldownUtente: 15 });
});

test('quello che qui non si fa va da rivedere, col perché', () => {
  const a = anteprima(se([
    cmd('segreto', 'shh', { type: 'whisper' }),
    cmd('mod', 'che mod è', { keywords: ['what mod is this'] }),
    cmd('re', 'x', { regex: '^ciao.*' }),
    cmd('titolo', 'x', { titleKeywords: ['speedrun'] }),
    cmd('nascosto', 'x', { hidden: true }),
    cmd('regular', 'x', { accessLevel: 300 }),
    cmd('poi', 'x', { startsAt: '2099-01-01T00:00:00Z' }),
    cmd('fino', 'x', { expiresAt: '2099-01-01T00:00:00Z' }),
    cmd('alias', 'x', { aliases: ['segreto'] }),
  ]), { proprietario: IO });
  const v = per(a);
  assert.equal(a.buoni.length, 0);
  for (const [n, re] of [['segreto', /in privato/], ['mod', /what mod is this/], ['re', /espressione/], ['titolo', /titolo/],
    ['nascosto', /nascosto/], ['regular', /regular/], ['poi', /2099-01-01/], ['fino', /2099-01-01/], ['alias', /!segreto è già il nome/]]) {
    assert.match(v[n].avvisi.map((x) => x.cosa).join(' | '), re, n);
  }
  assert.deepEqual(v.alias.alias, [], 'l\'alias che coprirebbe un altro comando non entra');
});

test('un comando già scaduto entra spento; uno di un tipo mai visto si dice', () => {
  const a = anteprima(se([cmd('vecchio', 'x', { expiresAt: '2020-01-01T00:00:00Z' }), cmd('strano', 'x', { type: 'banner' })]), { proprietario: IO });
  assert.equal(per(a).vecchio.attivo, false);
  assert.match(per(a).strano.avvisi[0].cosa, /banner/);
});

// ------------------------------------------------------------ i contatori
test('il contatore si muove come prima: l\'azione prima del messaggio, il testo scrive il numero', () => {
  assert.deepEqual(traduci('morto ${count deaths} volte'), { testo: 'morto $count(deaths) volte', avvisi: [], conti: [{ nome: 'deaths', op: 'incrementa' }] });
  assert.deepEqual(traduci('morto $(count) volte', { nome: 'morti' }).conti, [{ nome: 'morti', op: 'incrementa' }]);
  assert.deepEqual(traduci('${count.Deaths +1}').conti, [{ nome: 'deaths', op: 'incrementa' }]);
  assert.deepEqual(traduci('azzerato: ${count binned 0}').conti, [{ nome: 'binned', op: 'imposta', valore: 0 }]);
  assert.deepEqual(traduci('siamo a ${getcount binned}'), { testo: 'siamo a $count(binned)', avvisi: [], conti: [] });
  const meno = traduci('tolto: ${count deaths -1}');
  assert.equal(meno.testo, 'tolto: ${count deaths -1}', 'qui non si fa: resta com\'era');
  assert.match(meno.avvisi[0].cosa, /contatore/);
  assert.deepEqual(meno.conti, []);

  const m = moduloDa(per(anteprima(se([cmd('morti', 'morto ${count deaths} volte, ${count deaths 52}')]), { proprietario: IO })).morti);
  assert.deepEqual(m.azioni, [
    { tipo: 'contatore', op: 'incrementa', nome: 'deaths' },
    { tipo: 'contatore', op: 'imposta', nome: 'deaths', valore: 52 },
    { tipo: 'messaggio', testo: 'morto $count(deaths) volte, $count(deaths)' },
  ]);
});

test('il numero dei contatori entra dove qui non c\'è, e non riscrive quelli che hai', () => {
  const testo = se([cmd('morti', 'morto ${count deaths} volte'), cmd('bin', '${getcount binned}')],
    { counters: [{ counter: 'deaths', value: 61 }, { counter: 'binned', value: 4 }, { counter: 'Deaths', value: 1 }] });
  const a = anteprima(testo, { proprietario: IO, contatoriQui: () => new Map([['binned', 9]]) });
  assert.deepEqual(a.contatori.voci, [
    { nome: 'deaths', valore: 61, qui: null, entra: true, uguale: false },
    { nome: 'binned', valore: 4, qui: 9, entra: false, uguale: false },
  ]);
  // Nightbot tiene il numero nel comando, ed entra solo se il testo lo usa
  const nb = JSON.stringify({ commands: [
    { name: '!morti', message: 'morto $(count) volte', count: 7, userLevel: 'everyone', coolDown: 30 },
    { name: '!ciao', message: 'ciao', count: 12, userLevel: 'moderator', coolDown: 5 },
  ] });
  const b = anteprima(nb, { proprietario: IO });
  assert.deepEqual(b.contatori.voci.map((x) => [x.nome, x.valore]), [['morti', 7]]);
  assert.deepEqual(per(b).ciao.condizioni, { tier: 'mod', cooldown: 5 });
  assert.equal(anteprima('!ciao ciao').contatori, null);
});

// ------------------------------------------------------------ identico e sopra
test('«già identico» guarda tutto: un comando entrato per tutti quando era dei mod si corregge', () => {
  const testo = se([cmd('setgame', 'fatto', { accessLevel: 500 }), cmd('ciao', 'ciao'), cmd('dado', 'tira', { cooldown: { user: 10, global: 0 } })]);
  const esistenti = [
    { id: 1, trigger: { tipo: 'comando', comando: 'setgame' }, condizioni: {}, azioni: [{ tipo: 'messaggio', testo: 'fatto' }] },
    { id: 2, trigger: { tipo: 'comando', comando: 'ciao' }, condizioni: { probabilita: 50, piattaforme: ['twitch'] }, azioni: [{ tipo: 'messaggio', testo: 'ciao' }] },
    { id: 3, trigger: { tipo: 'comando', comando: 'dado' }, condizioni: { cooldownUtente: 10 }, azioni: [{ tipo: 'messaggio', testo: 'tira' }] },
  ];
  const v = per(anteprima(testo, { proprietario: IO, esistenti }));
  assert.deepEqual([v.setgame.uguale, v.setgame.sovrascrive], [false, true], 'il livello è cambiato: si corregge');
  assert.deepEqual([v.ciao.uguale, v.ciao.sovrascrive], [true, false], 'le scelte fatte qui non contano come differenza');
  assert.equal(v.dado.uguale, true);
});

test('un import sopra un comando tiene le scelte fatte qui', () => {
  const esistente = {
    id: 7, nome: '!ciao', attivo: true, telegram: true, altrimenti: [{ tipo: 'messaggio', testo: 'no' }],
    trigger: { tipo: 'comando', comando: 'ciao', senzaBang: true, alias: ['hey'] },
    condizioni: { probabilita: 50, tier: 'sub', cooldown: 99 },
    azioni: [{ tipo: 'messaggio', testo: 'vecchio' }],
  };
  const nuovo = moduloDa({ nome: 'ciao', risposta: 'nuovo', condizioni: { tier: 'mod' } });
  const m = sopra(esistente, nuovo);
  assert.equal(m.id, 7);
  assert.equal(m.telegram, true);
  assert.deepEqual(m.altrimenti, esistente.altrimenti);
  assert.deepEqual(m.trigger, { tipo: 'comando', comando: 'ciao', senzaBang: true });
  assert.deepEqual(m.condizioni, { probabilita: 50, tier: 'mod' }, 'quelle dell\'import si rifanno da capo, le altre restano');
  assert.deepEqual(m.azioni, [{ tipo: 'messaggio', testo: 'nuovo' }]);
});

test('un foglio di calcolo con livello, cooldown e alias', () => {
  const csv = 'command,response,userlevel,cooldown,aliases\n!mod,solo mod,moderator,30,\n!dc,discord.gg/x,everyone,,"disc, server"';
  const v = per(anteprima(csv, { proprietario: IO }));
  assert.deepEqual(v.mod.condizioni, { tier: 'mod', cooldown: 30 });
  assert.deepEqual(v.dc.alias, ['disc', 'server']);
});

// ------------------------------------------------------------ nel motore vero
test('nel motore: il comando dei mod non risponde alla chat, il contatore sale', async () => {
  const casa = cartellaUsaEGetta('importa-livelli-');
  try {
    const db = await import('../../src/db.js');
    const { ModulesEngine } = await import('../../src/features/modules.js');
    const CH = 'canalese';
    db.streamers.upsertApproved(CH, 'CanaleSE', '901');
    const v = per(anteprima(se([
      cmd('setgame', 'cambiato', { accessLevel: 500 }),
      cmd('morti', 'morto ${count deaths} volte'),
      cmd('mio', 'solo io', { accessLevel: 1500 }),
    ]), { proprietario: IO }));
    for (const x of Object.values(v)) db.modules.save(CH, moduloDa(x));
    const motore = new ModulesEngine({});
    const detto = [];
    const scrive = (user, id, text, extra = {}) => motore.onMessage({ channel: CH, user, display: user, userId: id, text, piattaforma: 'twitch', tags: {}, ...extra }, (t) => detto.push(t));
    await scrive('tizio', '42', '!setgame');
    await scrive('moda', '43', '!setgame', { isMod: true });
    await scrive('tizio', '42', '!morti');
    await scrive('caio', '44', '!morti');
    await scrive('moda', '43', '!mio', { isMod: true });
    await scrive('canalese', '901', '!mio', { isBroadcaster: true });
    assert.deepEqual(detto, ['cambiato', 'morto 1 volte', 'morto 2 volte', 'solo io']);
  } finally { casa.pulisci(); }
});
