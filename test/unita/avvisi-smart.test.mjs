// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// GLI AVVISI CHE LEGGONO LA DIRETTA (docs/AVVISI-SMART.md). Le garanzie:
//  · la frase e' sempre una frase, in ogni combinazione di classe, umore,
//    tono, genere, lingua e community: niente segnaposti o marcatori rimasti,
//    niente spazi o punteggiatura doppi;
//  · col genere neutro nessuna frase dichiara un genere; di un'altra diretta
//    il genere non si sa;
//  · la stessa diretta dice la stessa frase, e diretta diversa puo' cambiarla;
//  · l'umore e la classe si riconoscono per regola, in ordine;
//  · le parole dello streamer vincono su quelle di serie; spento, niente frase.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fraseSmart, fraseDelCanale, umoreDi, classeDi, normSmart, CLASSI, NOMI_UMORI, TONI, LINGUE } from '../../src/features/avvisi-smart.js';
import { messaggio, diretta, SEGNO_NOME } from '../../src/features/avvisi.js';
import { testoDiretta } from '../../src/features/discord.js';

const TITOLO = { incerto: 'boh', domanda: 'chi vince?', prima: 'prima volta', sfida: 'ranked', festa: 'compleanno', calma: 'chill', carica: 'SI PARTE ORA', normale: 'Elden Ring con voi' };
const CATEGORIA = { chiacchiere: 'Just Chatting', musica: 'Music', arte: 'Art', programmazione: 'Software and Game Development', cucina: 'Food & Drink', sport: 'Sports', giro: 'IRL', gioco: 'Elden Ring', '': '' };

test('la frase e\' sempre una frase, in ogni combinazione', () => {
  let n = 0;
  for (const classe of Object.keys(CATEGORIA)) for (const umore of NOMI_UMORI) for (const tono of TONI) for (const lingua of LINGUE) for (const genere of ['neutro', 'femminile', 'maschile']) for (const community of ['', 'Lunatici']) for (const id of Array.from({ length: 20 }, (_, i) => 'd' + i)) {
    const f = fraseSmart({ login: 'luna', id, gioco: CATEGORIA[classe], titolo: TITOLO[umore] }, { nome: 'LUNA', lingua, tono, genere, community });
    const dove = `${classe}/${umore}/${tono}/${lingua}/${genere}/${community}/${id}: «${f}»`;
    assert.ok(f.includes('LUNA'), dove);
    assert.ok(/^[\p{Lu}¡]/u.test(f), 'comincia con una maiuscola, mai con un pezzo che manca: ' + dove);
    assert.ok(!/[{}/]/.test(f), 'niente segnaposti ne\' marcatori: ' + dove);
    assert.ok(!/\s{2}|\s[,.!?:]|[,.:]{2}|\.\s*[.!]/.test(f), 'niente spazi o punteggiatura doppi: ' + dove);
    assert.ok(/[.!]$/.test(f) && /\.\s(¡)?\p{Lu}/u.test(f), 'due frasi, la seconda con la maiuscola: ' + dove);
    if (genere === 'neutro' && lingua !== 'en') assert.ok(!/\bsicur[oa]\b|\bsegur[oa]\b|schiarir(gli|le)\b/.test(f), 'il neutro non dichiara un genere: ' + dove);
    if (classe === 'gioco') assert.ok(f.includes('Elden Ring'), dove);
    n++;
  }
  assert.ok(n > 2000);
});

test('il genere: quello del canale per la sua diretta, neutro per quella di un altro', () => {
  const s = { genere: 'femminile', avvisiSmart: { umori: { incerto: { frase: { it: [', ma non sembra troppo sicur{o/a} di cosa'] } } } } };
  assert.match(fraseDelCanale(s, { login: 'luna', id: '1', gioco: 'Just Chatting', titolo: 'boh' }, { canale: 'luna', nome: 'Luna' }), /sicura di cosa/);
  assert.match(fraseDelCanale({ ...s, genere: 'maschile' }, { login: 'luna', id: '1', gioco: 'Just Chatting', titolo: 'boh' }, { canale: 'luna', nome: 'Luna' }), /sicuro di cosa/);
  // l'unica frase dello streamer dichiara il genere: col neutro esce lo stesso, al maschile (la forma non marcata), mai col marcatore
  const altro = fraseDelCanale(s, { login: 'marco', id: '1', gioco: 'Just Chatting', titolo: 'boh' }, { canale: 'luna', nome: 'Marco' });
  assert.ok(!/sicura/.test(altro) && !/[{}]/.test(altro), 'di un\'altra diretta non si dice il genere del canale: ' + altro);
});

test('la stessa diretta dice la stessa frase; dirette diverse cambiano', () => {
  const d = (id) => ({ login: 'luna', id, gioco: 'Elden Ring', titolo: 'ranked' });
  assert.equal(fraseSmart(d('x'), { nome: 'L' }), fraseSmart(d('x'), { nome: 'L' }));
  const viste = new Set(Array.from({ length: 30 }, (_, i) => fraseSmart(d(String(i)), { nome: 'L', tono: 'scherzoso' })));
  assert.ok(viste.size >= 3, `le varianti girano (${viste.size})`);
});

test('l\'umore e la classe, per regola e in ordine', () => {
  const casi = { boh: 'incerto', '': 'incerto', '🙂': 'incerto', 'Boh?': 'incerto', 'chi vince?': 'domanda', 'Prima volta su Hades': 'prima', 'first time!': 'prima',
    'RANKED fino a diamante': 'sfida', 'speedrun any%': 'sfida', subathon: 'festa', 'Festeggiamo i 1000': 'festa', 'tranquilla serata': 'calma',
    'RUN COMPLETA': 'carica', 'Run!!!': 'carica', 'Elden Ring con voi': 'normale', 'testa a testa': 'normale', 'protesta': 'normale' };
  for (const [t, u] of Object.entries(casi)) assert.equal(umoreDi(t), u, t);
  assert.equal(umoreDi('serata zen', { calma: ['zen'] }), 'calma', 'le parole dello streamer');
  assert.deepEqual([classeDi('Just Chatting'), classeDi('just chatting'), classeDi('Elden Ring'), classeDi(''), classeDi('Pittura', { arte: ['pittura'] })],
    ['chiacchiere', 'chiacchiere', 'gioco', '', 'arte']);
  for (const [k, c] of Object.entries(CLASSI)) for (const cat of c.categorie) assert.equal(classeDi(cat), k, cat);
});

test('le frasi dello streamer vincono; spento, niente frase; la ripulitura', () => {
  const smart = { frasi: { chiacchiere: { it: ['farà quattro chiacchiere'] } }, umori: { normale: { chiusa: { it: ['Ci si vede!'] } } } };
  const f = fraseSmart({ login: 'l', id: '1', gioco: 'Just Chatting', titolo: 'serata' }, { nome: 'L', smart });
  assert.match(f, /farà quattro chiacchiere/);
  assert.match(f, /Ci si vede!$/);
  assert.equal(fraseSmart({ login: 'l', id: '1' }, { nome: 'L', smart: { attivo: false } }), '');
  const n = normSmart({ categorie: { arte: 'a\nb\n\na' }, frasi: { arte: { it: ['x\u0007y', '  '] } }, aperture: { serio: { it: Array(20).fill('z') } } });
  assert.deepEqual([n.categorie.arte, n.frasi.arte.it, n.aperture.serio.it], [['a', 'b'], ['x y'], ['z']]);
  assert.equal(normSmart({}).attivo, true, 'acceso di serie: e\' la prima riga, non un messaggio in piu\'');
});

test('{frase} nei testi scritti dallo streamer, su Telegram e su Discord', () => {
  const d = { ...diretta({ piattaforma: 'twitch', login: 'luna', display: 'Luna', titolo: 'boh', gioco: 'Just Chatting' }), voce: `Oggi ${SEGNO_NOME} parlerà. Venite <3` };
  assert.equal(messaggio(d, '{frase}\n{link}'), 'Oggi <b>Luna</b> parlerà. Venite &lt;3\nhttps://twitch.tv/luna');
  assert.equal(testoDiretta(d, '{frase}'), 'Oggi **Luna** parlerà. Venite <3');
});
