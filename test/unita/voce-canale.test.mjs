// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// LA VOCE DI UN CANALE (docs/VOCE.md): il motore, provato su quello che promette.
//  · due canali non partono dalla stessa frase, e il punto di partenza si
//    sposta davvero col canale;
//  · dentro un giro nessuna frase torna prima che siano uscite tutte, e il
//    giro dopo non comincia dall'ultima;
//  · dopo un riavvio il canale riprende dalla frase dopo (processi veri);
//  · la lingua e il tono cambiano la frase;
//  · un dato che manca non lascia un {nome} in chat: la frase non esce.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-voce-');
const { streamers, memory } = await import('../../src/db.js');
const voce = await import('../../src/features/voce.js');
test.after(() => usaEGetta.pulisci());

let n = 0;
function canale(settings = {}, nome = '') {
  const login = nome || `voce${++n}`;
  streamers.upsertApproved(login, login, String(1000 + (++n)));
  streamers.setSettings(login, settings);
  return login;
}

const stesa = (t) => t.replace(/\{:([^}]+)\}/g, '$1');
const nostre = (momento, lingua, tono) => voce.MOMENTI[momento].frasi[lingua][tono];
const senzaOpzionali = (momento, lingua, tono) => {
  const dati = voce.MOMENTI[momento].dati;
  return nostre(momento, lingua, tono).filter((f) => voce.segniDi(f).dati.every((k) => dati[k] === 'sempre'));
};

test('due canali non iniziano con la stessa frase', () => {
  const a = canale({}, 'andryxify');
  const b = canale({}, 'rossella_live');
  const primaA = voce.di(a, 'follow', { nome: 'Luna' });
  const primaB = voce.di(b, 'follow', { nome: 'Luna' });
  assert.ok(primaA && primaB);
  assert.notEqual(primaA, primaB);
});

test('il punto di partenza si sposta col canale: su trenta canali escono molte frasi diverse', () => {
  const prime = new Set();
  for (let i = 0; i < 30; i++) prime.add(voce.di(canale(), 'follow', { nome: 'Luna' }));
  const quante = nostre('follow', 'it', 'scherzoso').length;
  assert.ok(prime.size >= Math.ceil(quante / 2), `solo ${prime.size} frasi di partenza su ${quante}`);
});

test('nessuna ripetizione prima del giro completo, e il giro dopo non comincia dall\'ultima', () => {
  const c = canale();
  const tutte = nostre('follow', 'it', 'scherzoso');
  const giro1 = tutte.map(() => voce.di(c, 'follow', { nome: 'Luna' }));
  assert.equal(new Set(giro1).size, tutte.length, 'nel primo giro ogni frase esce una volta');
  const attese = new Set(tutte.map((f) => stesa(f).replace('{nome}', 'Luna')));
  assert.deepEqual(new Set(giro1), attese, 'e sono proprio le nostre');
  const giro2 = tutte.map(() => voce.di(c, 'follow', { nome: 'Luna' }));
  assert.notEqual(giro2[0], giro1.at(-1), 'mai due uguali di fila fra un giro e l\'altro');
  assert.equal(new Set(giro2).size, tutte.length, 'anche il secondo giro le dice tutte');
  assert.notDeepEqual(giro2, giro1, 'e in un altro ordine');
});

test('fra un giro e l\'altro mai la stessa frase due volte di fila, anche con due frasi sole', () => {
  const c = canale({ voce: { momenti: { follow: { modo: 'sue', frasi: ['Uno {nome}', 'Due {nome}'] } } } });
  const fila = Array.from({ length: 40 }, () => voce.di(c, 'follow', { nome: 'Luna' }));
  for (let i = 1; i < fila.length; i++) assert.notEqual(fila[i], fila[i - 1], `ripetuta al passo ${i}`);
});

function diInUnProcesso(login, quante) {
  const url = new URL('../../src/features/voce.js', import.meta.url).href;
  const codice = `const v = await import(${JSON.stringify(url)});
    const out = []; for (let i = 0; i < ${quante}; i++) out.push(v.di(${JSON.stringify(login)}, 'follow', { nome: 'Luna' }));
    process.stdout.write(JSON.stringify(out));`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', codice], { encoding: 'utf8', env: process.env });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}

test('stesso canale, stessa sequenza dopo un riavvio: il giro sta nel database', () => {
  const c = canale({}, 'sempre_uguale');
  // Il riferimento e' l'anteprima, che non consuma: le prossime dieci, prese
  // prima di cominciare. Poi due processi separati ne dicono quattro e sei.
  const attese = voce.anteprima(c, 'follow', { nome: 'Luna' }, 10);
  assert.equal(attese.length, 10);
  const primo = diInUnProcesso(c, 4);
  const secondo = diInUnProcesso(c, 6);
  assert.deepEqual([...primo, ...secondo], attese, 'il processo nuovo riprende dalla frase dopo');
});

test('la lingua del canale cambia la frase, e la legge da linguaChat', () => {
  const it = canale({ tono: 'amichevole' });
  const en = canale({ tono: 'amichevole', preferenze: { lingua: 'en' } });
  const es = canale({ tono: 'amichevole', linguaTwitch: 'es' });
  const fra = (lingua) => new Set(nostre('follow', lingua, 'amichevole').map((f) => stesa(f).replace('{nome}', 'Luna')));
  const inIt = voce.di(it, 'follow', { nome: 'Luna' });
  const inEn = voce.di(en, 'follow', { nome: 'Luna' });
  const inEs = voce.di(es, 'follow', { nome: 'Luna' });
  assert.ok(fra('it').has(inIt), inIt);
  assert.ok(fra('en').has(inEn), inEn);
  assert.ok(fra('es').has(inEs), inEs);
});

test('il tono della scheda Personalità sceglie il mazzo', () => {
  const c = canale({ tono: 'serio' });
  const f = voce.di(c, 'follow', { nome: 'Luna' });
  assert.ok(nostre('follow', 'it', 'serio').map((x) => x.replace('{nome}', 'Luna')).includes(f), f);
});

test('un segnaposto mancante non esce come {nome}: la frase che lo chiede non si dice', () => {
  const c = canale();
  assert.equal(voce.di(c, 'follow', {}), '', 'un follow senza nome non ha frase');
  assert.equal(voce.di(c, 'follow', { nome: '   ' }), '', 'e un nome vuoto non e\' un nome');
  const senza = new Set(senzaOpzionali('pubblicita-parte', 'it', 'scherzoso')
    .map((f) => stesa(f).replace('{canale}', 'Canale')));
  for (let i = 0; i < 12; i++) {
    const t = voce.di(c, 'pubblicita-parte', { canale: 'Canale' });
    assert.ok(!/[{}]/.test(t), t);
    assert.ok(senza.has(t), `senza i secondi esce solo una frase che non li chiede: ${t}`);
  }
  const sua = canale({ voce: { momenti: { follow: { modo: 'sue', frasi: ['Evviva {nome}!'] } } } });
  assert.equal(voce.di(sua, 'follow', {}), '', 'anche una frase sua senza il dato tace');
  assert.equal(voce.di(sua, 'follow', { nome: 'Luna' }), 'Evviva Luna!');
});

test('singolare e plurale: il numero sceglie la forma, e si scrive come nella lingua', () => {
  const c = canale({ tono: 'serio', preferenze: { lingua: 'en' } });
  for (let i = 0; i < 6; i++) {
    const uno = voce.di(c, 'regalo-anonimo', { quanti: 1 });
    assert.ok(uno && !/\b1 subs\b|\b1 subscriptions\b/.test(uno), uno);
  }
  const tanti = voce.anteprima(c, 'bit', { nome: 'Luna', bit: 1500 }, 6);
  assert.ok(tanti.some((t) => t.includes('1,500')), tanti.join(' | '));
});

test('le frasi dello streamer: si mescolano, le sostituiscono, o il momento tace', () => {
  const miste = canale({ voce: { momenti: { follow: { modo: 'miste', frasi: ['Benvenuta ciurma, {nome}!'] } } } });
  const giro = nostre('follow', 'it', 'scherzoso').length + 1;
  const uscite = Array.from({ length: giro }, () => voce.di(miste, 'follow', { nome: 'Luna' }));
  assert.ok(uscite.includes('Benvenuta ciurma, Luna!'), 'la sua esce nel giro');
  assert.equal(new Set(uscite).size, giro, 'insieme alle nostre, senza ripetersi');

  const spento = canale({ voce: { momenti: { follow: { modo: 'spento' } } } });
  assert.equal(voce.di(spento, 'follow', { nome: 'Luna' }), '');
  assert.equal(voce.acceso(spento, 'follow'), false);

  const vuote = canale({ voce: { momenti: { follow: { modo: 'sue', frasi: [] } } } });
  assert.ok(voce.di(vuote, 'follow', { nome: 'Luna' }), '«solo le sue» senza frasi resta con le nostre');

  const avviso = canale({ voce: { momenti: { 'avviso-diretta': { modo: 'spento' } } } });
  assert.ok(voce.di(avviso, 'avviso-diretta', { nome: 'A', piattaforma: 'Twitch' }), 'un avviso non si spegne da qui');
});

test('la community: senza articolo, e solo nelle frasi che la chiamano', () => {
  const c = canale({ voce: { community: 'la ciurma' } });
  assert.equal(voce.community(c), 'ciurma');
  const giro = nostre('inizio-diretta', 'it', 'scherzoso').length;
  const uscite = Array.from({ length: giro }, () => voce.di(c, 'inizio-diretta', {}));
  assert.ok(uscite.some((t) => t.includes('ciurma')), 'con la community c\'e\' la frase che la chiama');
  const senza = canale();
  const altre = Array.from({ length: giro }, () => voce.di(senza, 'inizio-diretta', {}));
  assert.ok(altre.every((t) => t && !/[{}]/.test(t)), 'senza community quella frase non esce');
});

test('le emote allegre della chat prendono il posto delle faccine, le altre no', () => {
  const c = canale({ tono: 'scherzoso' });
  for (let i = 0; i < 12; i++) {
    memory.logMessage(c, 'u' + i, 'U', 'andryxHype che bello andryxHype', false);
    memory.logMessage(c, 'v' + i, 'V', 'Sadge Sadge Kappa', false);
  }
  assert.deepEqual(voce.emoteDi(c), ['andryxHype']);
  const giro = nostre('follow', 'it', 'scherzoso').length;
  const uscite = Array.from({ length: giro }, () => voce.di(c, 'follow', { nome: 'Luna' }));
  assert.ok(uscite.every((t) => / andryxHype$/.test(t)), uscite.join(' | '));
  assert.ok(uscite.every((t) => !/Sadge|Kappa/.test(t)));
  const fuori = voce.di(c, 'avviso-diretta', { nome: 'A', piattaforma: 'Twitch' });
  assert.ok(fuori && !/andryxHype/.test(fuori), 'fuori dalla chat le emote non si vedono');
  const s = streamers.get(c).settings;
  streamers.setSettings(c, { ...s, voce: { momenti: { 'avviso-diretta': { modo: 'sue', frasi: ['{nome} in diretta {:🎉}'] } } } });
  assert.equal(voce.di(c, 'avviso-diretta', { nome: 'A', piattaforma: 'Twitch' }), 'A in diretta 🎉',
    'anche una faccina scritta dallo streamer, fuori dalla chat, resta la sua');
});

test('la forma di chi scrive fuori dalla chat: il testo si sfugge, i dati restano come sono', () => {
  const c = canale({ voce: { momenti: { 'avviso-diretta': { modo: 'sue', frasi: ['Rock & roll: {nome} su {piattaforma}'] } } } });
  const esc = (s) => s.replace(/&/g, '&amp;');
  const t = voce.di(c, 'avviso-diretta', { nome: '<b>Luna</b>', piattaforma: 'Twitch' }, { forma: esc });
  assert.equal(t, 'Rock &amp; roll: <b>Luna</b> su Twitch');
});

test('la scelta salvata si ripulisce: segnaposti che il momento non ha non entrano', () => {
  const v = voce.normVoce({
    community: '  la {ciurma}  ',
    momenti: {
      follow: { modo: 'miste', frasi: ['Ciao {nome}', 'Ciao {gioco}', 'Ciao {nome}', ''] },
      bit: { modo: 'sue', frasi: [] },
      inventato: { modo: 'sue', frasi: ['x'] },
      'avviso-diretta': { modo: 'spento' },
    },
  });
  assert.equal(v.community, 'la ciurma');
  assert.deepEqual(v.momenti.follow, { modo: 'miste', frasi: ['Ciao {nome}'] });
  assert.equal(v.momenti.bit, undefined, '«solo le sue» senza frasi torna alle nostre, e non serve scriverlo');
  assert.equal(v.momenti.inventato, undefined);
  assert.equal(v.momenti['avviso-diretta'], undefined, 'un avviso non si spegne');
});

test('le emote: si riconoscono le allegre, si scartano le altre e quelle di umore ignoto', () => {
  for (const si of ['PogChamp', 'andryxHype', 'lunaLove', 'catJAM']) assert.equal(voce.allegra(si), true, si);
  for (const no of ['Sadge', 'Kappa', 'KEKW', 'andryxSad', 'lunaRage', 'andryxBoh', 'GG']) assert.equal(voce.allegra(no), false, no);
});
