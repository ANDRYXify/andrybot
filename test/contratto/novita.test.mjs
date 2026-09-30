// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Le novità: il file che le racconta e il modo in cui vengono lette.
//
// La fonte è scritta a mano, quindi il rischio non è un bug: è una svista di
// scrittura che non si vede finché non è in pagina — un trattino diverso, una
// data storta, un gruppo vuoto. Qui si legge il file vero con il codice vero.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { analizza, pubbliche, tutte, unisci, inItaliano, ultima, segnalibro, daVedere, segnoValido, taglia, destinazioni, inSezioni, idVoce, righeSperse, EVIDENZA_MAX, SEGNO_MAX } from '../../src/web/novita.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const gruppi = analizza(readFileSync(join(RAD, 'NOVITA.md'), 'utf8'));

test('il file vero si legge, ed è fatto di giornate con righe dentro', () => {
  assert.ok(gruppi.length >= 1, `giornate: ${gruppi.length}`);
  for (const g of gruppi) {
    assert.match(g.data, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(g.voci.length > 0, `${g.data} ha righe`);
    for (const v of g.voci) assert.ok(v.testo.length > 10, `riga sensata: ${v.testo}`);
  }
});

test('le giornate vanno dalla più recente alla più vecchia', () => {
  const date = gruppi.map((g) => g.data);
  assert.deepEqual(date, [...date].sort().reverse());
  assert.equal(ultima(gruppi), date[0]);
});

test('la prosa attorno non finisce fra le novità', () => {
  const uno = analizza([
    '# Novità',
    'Una spiegazione che non è una voce.',
    '## 2026-01-02',
    '- prima cosa',
    '* seconda cosa',
    'un paragrafo in mezzo',
    '## 2026-01-01',
    '',            // giornata vuota: non deve comparire
  ].join('\n'));
  const id = (t) => idVoce('2026-01-02', t);
  assert.deepEqual(pubbliche(uno), [{ data: '2026-01-02', voci: [{ id: id('prima cosa'), testo: 'prima cosa', vai: null, importante: false }, { id: id('seconda cosa'), testo: 'seconda cosa', vai: null, importante: false }] }]);
});

test('le righe scritte prima di qualsiasi giornata si ignorano', () => {
  assert.deepEqual(analizza('- orfana\n'), []);
});

test('la data si legge come la direbbe una persona', () => {
  assert.equal(inItaliano('2026-09-02'), '2 settembre 2026');
  assert.equal(inItaliano('2026-01-31'), '31 gennaio 2026');
});

// ── quello che è tuo non esce di casa ──────────────────────────────────────
// Non tutto quello che cambia riguarda chi usa il bot: la crescita del cervello privato e il suo
// computer sono cose private. Il rischio non è che si veda male: è che si
// veda, e a chiunque.

test('una riga marcata privata non arriva mai alla forma pubblica', () => {
  const g = analizza([
    '## 2026-01-02',
    '- questa la vedono tutti',
    '- [privato] questa è solo mia',
  ].join('\n'));
  const id = (t) => idVoce('2026-01-02', t);
  assert.deepEqual(pubbliche(g), [{ data: '2026-01-02', voci: [{ id: id('questa la vedono tutti'), testo: 'questa la vedono tutti', vai: null, importante: false }] }]);
  // e a chi ha diritto arriva, marcata per quello che è
  assert.deepEqual(tutte(g), [{ data: '2026-01-02', voci: [
    { id: id('questa la vedono tutti'), testo: 'questa la vedono tutti', privata: false, importante: false, vai: null },
    { id: id('questa è solo mia'), testo: 'questa è solo mia', privata: true, importante: false, vai: null },
  ] }]);
});

test('un giorno fatto solo di cose tue non compare nemmeno come giorno', () => {
  const g = analizza('## 2026-01-03\n- [privato] solo mia\n\n## 2026-01-02\n- pubblica\n');
  assert.deepEqual(pubbliche(g).map((x) => x.data), ['2026-01-02'],
    'il 3 gennaio non deve esistere per il pubblico: la data stessa direbbe che è successo qualcosa');
  assert.equal(ultima(pubbliche(g)), '2026-01-02',
    'e nemmeno il pallino «c’è qualcosa di nuovo» deve accendersi per una cosa tua');
});

test('il marcatore si scrive come viene, e non si porta dietro le parentesi', () => {
  for (const riga of ['- [privato] cosa', '- [PRIVATO] cosa', '- [privata] cosa']) {
    const g = analizza('## 2026-01-02\n' + riga + '\n');
    assert.equal(g[0].voci[0].privata, true, riga);
    assert.equal(g[0].voci[0].testo, 'cosa', riga);
  }
});

// Le righe private non vivono piu' nel file pubblico: stanno nel NOVITA.md del
// repository del cervello, accanto a questo. Due invarianti al posto di uno, e
// tutti e due piu' forti: qui ZERO righe private; la', SOLO righe private, e
// nessuna esce dalla porta pubblica nemmeno passandoci.
test('nel file pubblico non c\'e\' nessuna riga privata', () => {
  const mie = gruppi.flatMap((g) => g.voci).filter((v) => v.privata);
  assert.equal(mie.length, 0, `una riga privata nel file pubblico: ${(mie[0] || {}).testo}`);
});

test('nel file del cervello, accanto a questo, tutto e\' privato e niente esce', (t) => {
  let testo = null;
  try { testo = readFileSync(join(RAD, '..', 'lia', 'NOVITA.md'), 'utf8'); }
  catch { t.skip('il repository del cervello non e\' accanto a questo: non si misura'); return; }
  const suoi = analizza(testo);
  const voci = suoi.flatMap((g) => g.voci);
  assert.ok(voci.length > 0, 'il file del cervello ha righe');
  const scoperte = voci.filter((v) => !v.privata);
  assert.equal(scoperte.length, 0, `una riga del cervello senza [privato]: ${(scoperte[0] || {}).testo}`);
  assert.equal(pubbliche(suoi).length, 0, 'una riga del cervello uscirebbe dalla porta pubblica');
  const unite = unisci(gruppi, suoi);
  assert.equal(unite.flatMap((g) => g.voci).length, gruppi.flatMap((g) => g.voci).length + voci.length,
    'l\'unione per il proprietario perde righe');
  for (let i = 1; i < unite.length; i++) assert.ok(unite[i - 1].data > unite[i].data, 'i giorni uniti non sono in ordine');
});

// ── IL SEGNAPOSTO ──────────────────────────────────────────────────────────
// Due difetti veri, uno dopo l'altro. Il primo: una giornata resta aperta e si
// allunga, e segnata col solo nome del giorno le righe arrivate dopo non si
// vedevano MAI PIU'. Il secondo: il conto («giorno#quante») supponeva le righe
// nuove in cima, mentre si scrivono in fondo, e per chi vede anche le private
// quelle stanno dopo le pubbliche. Il conto indicava le righe vecchie: le stesse
// novita' tornavano, e quelle nuove non uscivano mai. Adesso ogni riga ha la sua
// impronta, e la posizione non conta.

const GIORNATA = (data, n, da = 0) => ({ data, voci: Array.from({ length: n }, (_, i) => `riga ${da + i}`) });
const voci = (fuori) => fuori.map((g) => [g.data, g.voci.map((v) => (typeof v === 'string' ? v : v.testo))]);

test('ogni riga ha la sua impronta: data e testo, non il posto dove sta', () => {
  assert.equal(idVoce('2026-09-10', 'una cosa'), idVoce('2026-09-10', 'una cosa'));
  assert.notEqual(idVoce('2026-09-10', 'una cosa'), idVoce('2026-09-11', 'una cosa'), 'la stessa frase un altro giorno e\' un\'altra riga');
  assert.notEqual(idVoce('2026-09-10', 'una cosa'), idVoce('2026-09-10', 'una cosa.'), 'una riga riscritta va riletta');
  const g = [GIORNATA('2026-09-10', 2)];
  assert.equal(segnalibro(g), `v2:2026-09-10:${idVoce('2026-09-10', 'riga 0')}.${idVoce('2026-09-10', 'riga 1')}`);
  assert.equal(segnalibro([]), null);
});

test('una riga aggiunta in fondo, in cima o in mezzo a una giornata vista esce, e le altre no', () => {
  const prima = [GIORNATA('2026-09-10', 18)];
  const segno = segnalibro(prima);
  assert.deepEqual(daVedere(prima, segno), [], 'appena segnata, niente da vedere');
  const righe = prima[0].voci;
  for (const [dove, dopo] of [
    ['in fondo', [...righe, 'nuova A', 'nuova B']],
    ['in cima', ['nuova A', 'nuova B', ...righe]],
    ['in mezzo', [...righe.slice(0, 7), 'nuova A', ...righe.slice(7), 'nuova B']],
  ]) {
    assert.deepEqual(voci(daVedere([{ data: '2026-09-10', voci: dopo }], segno)), [['2026-09-10', ['nuova A', 'nuova B']]], dove);
  }
});

test('le righe private accodate alle pubbliche non fanno rivedere le pubbliche', () => {
  // Il difetto di chi guarda da amministratore: le sue righe stanno dopo quelle
  // di tutti, e ogni riga sua spostava il conto sulle righe pubbliche gia' viste.
  const ieri = analizza(['## 2026-09-10', '- pubblica uno', '- pubblica due', '- [privato] sua uno'].join('\n'));
  const segno = segnalibro(tutte(ieri));
  const oggi = analizza(['## 2026-09-10', '- pubblica uno', '- pubblica due', '- pubblica tre', '- [privato] sua uno', '- [privato] sua due'].join('\n'));
  assert.deepEqual(voci(daVedere(tutte(oggi), segno)), [['2026-09-10', ['pubblica tre', 'sua due']]]);
  assert.equal(segnalibro(tutte(oggi)).split('.').length, 5, 'chi vede anche le sue le conta');
  assert.equal(segnalibro(pubbliche(oggi)).split('.').length, 3, 'chi vede solo le pubbliche no');
});

test('una giornata nuova intera si vede, e quella sotto no', () => {
  const segno = segnalibro([GIORNATA('2026-09-10', 3)]);
  const ora = [GIORNATA('2026-09-11', 2, 100), GIORNATA('2026-09-10', 3), GIORNATA('2026-09-08', 9)];
  assert.deepEqual(daVedere(ora, segno).map((g) => g.data), ['2026-09-11']);
});

test('giornata nuova E righe in piu\' in quella segnata: escono tutte e due', () => {
  const segno = segnalibro([GIORNATA('2026-09-10', 3)]);
  const ora = [GIORNATA('2026-09-11', 1, 100), { data: '2026-09-10', voci: [...GIORNATA('2026-09-10', 3).voci, 'coda'] }];
  assert.deepEqual(voci(daVedere(ora, segno)), [['2026-09-11', ['riga 100']], ['2026-09-10', ['coda']]]);
});

test('il segnaposto tiene le ultime tre giornate: quelle prima sono viste', () => {
  const ora = [GIORNATA('2026-09-12', 1, 40), GIORNATA('2026-09-11', 1, 30), GIORNATA('2026-09-10', 1, 20), GIORNATA('2026-09-08', 1, 10)];
  const segno = segnalibro(ora);
  assert.match(segno, /^v2:2026-09-10:/);
  const dopo = ora.map((g) => (g.data === '2026-09-08' ? { ...g, voci: [...g.voci, 'scritta tardi'] } : g));
  assert.deepEqual(daVedere(dopo, segno), [], 'le righe si scrivono nella giornata di oggi: quelle prima della finestra non cambiano');
});

test('col segnaposto vecchio si rimostra la sua giornata e le importanti della settimana prima', () => {
  // Il conto vecchio indicava le righe sbagliate: non si sa cosa e' stato visto
  // davvero. Meglio rivedere qualche riga che perdere una cosa nuova.
  const ora = analizza([
    '## 2026-09-23', '- oggi uno', '- oggi due',
    '## 2026-09-19', '- [importante] instagram con un tasto', '- una rifinitura',
    '## 2026-09-10', '- [importante] troppo vecchia per il recupero',
  ].join('\n'));
  for (const segno of ['2026-09-23#2', '2026-09-23']) {
    assert.deepEqual(voci(daVedere(ora, segno)), [['2026-09-23', ['oggi uno', 'oggi due']], ['2026-09-19', ['instagram con un tasto']]], segno);
  }
});

test('senza segnaposto non si perde niente, e le porcherie non passano', () => {
  const ora = [GIORNATA('2026-09-10', 2)];
  assert.deepEqual(daVedere(ora, ''), ora);
  assert.deepEqual(daVedere(ora, 'domani'), ora);
  assert.equal(segnoValido(segnalibro(ora)), true);
  assert.equal(segnoValido('v2:2026-09-10:'), true, 'una giornata vista vuota e\' un segno valido');
  assert.equal(segnoValido('2026-09-10#47'), true, 'il formato vecchio si accetta ancora');
  assert.equal(segnoValido('2026-09-10'), true);
  assert.equal(segnoValido('2026-9-10'), false);
  assert.equal(segnoValido("2026-09-10#47' or 1=1"), false);
  assert.equal(segnoValido('v2:2026-09-10:abc.<script>'), false);
  assert.equal(segnoValido('v2:2026-09-10:' + 'abcdefg.'.repeat(SEGNO_MAX / 8) + 'x'), false, 'e non oltre la misura');
});

test('il giorno segnato che sparisce dal file non fa uscire la storia vecchia', () => {
  assert.deepEqual(daVedere([GIORNATA('2026-09-08', 4)], '2026-09-10#2'), []);
  assert.deepEqual(daVedere([GIORNATA('2026-09-08', 4)], segnalibro([GIORNATA('2026-09-10', 2)])), []);
});

test('la pagina ridà indietro il segnaposto che le è stato dato, e le novità hanno un posto solo', () => {
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  const f = app.slice(app.indexOf('async function mostraNovita('), app.indexOf('function pannelloConsolify('));
  assert.match(f, /const fin = d\.segnalibro \|\| d\.ultima;/, 'il popup usa il segnaposto');
  assert.match(f, /segna\(fin\)/, 'e segna quello');
  assert.doesNotMatch(f, /segna\(d\.ultima\)/, 'e non il solo giorno');
  // La carta in cima al pannello mostrava le prime quattro righe dell'ultima
  // giornata, con un «visto» tenuto dal solo browser: tornava a ogni riga
  // nuova con le stesse quattro righe. Le novita' da vedere stanno nel popup.
  assert.doesNotMatch(app, /caricaNovita|cardNovitaHtml|sb-novita-viste/);
});

test('il server manda il segnaposto dalle porte che lo servono, e lo riceve intero', () => {
  const srv = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
  for (const via of ['/api/novita', '/api/novita/da-vedere']) {
    const i = srv.indexOf(`app.get('${via}'`);
    assert.ok(i > 0, `la porta ${via} esiste`);
    const blocco = srv.slice(i, srv.indexOf('});', i));
    assert.match(blocco, /segnalibro/, `${via} manda il segnaposto`);
  }
  assert.ok(!srv.includes("app.get('/api/admin/novita'"), 'la porta della carta tolta non resta aperta per niente');
  const j = srv.indexOf("app.post('/api/novita/viste'");
  const post = srv.slice(j, srv.indexOf('}));', j));
  assert.match(post, /novita\.segnoValido\(/, 'e chi lo riceve lo valida con la stessa regola');
  assert.doesNotMatch(post, /slice\(0, 16\)/, 'e non lo taglia a meta\': un segnaposto tagliato e\' un segnaposto sbagliato');
});

// ── IL TETTO, E LE IMPORTANTI ──────────────────────────────────────────────

test('il tetto è sulle righe, non sulle giornate: una sola giornata lunga è un muro uguale', () => {
  const uno = taglia([GIORNATA('2026-09-10', 47)], { righe: 12, giorni: 6 });
  assert.equal(uno.gruppi.length, 1);
  assert.equal(uno.gruppi[0].voci.length, 12);
  assert.deepEqual(uno.gruppi[0].voci.slice(0, 2), ['riga 46', 'riga 45'], 'dalla piu\' nuova: le righe si scrivono in fondo');
  assert.equal(uno.altre, 35, 'e dice quante ne restano');
});

test('il tetto prende dalla più recente in giù, e non perde il conto', () => {
  const tanti = [GIORNATA('2026-09-11', 5, 0), GIORNATA('2026-09-10', 5, 10), GIORNATA('2026-09-09', 5, 20)];
  const t = taglia(tanti, { righe: 12, giorni: 6 });
  assert.deepEqual(t.gruppi.map((g) => [g.data, g.voci.length]), [['2026-09-11', 5], ['2026-09-10', 5], ['2026-09-09', 2]]);
  assert.equal(t.altre, 3);
  assert.equal(t.gruppi.reduce((n, g) => n + g.voci.length, 0) + t.altre, 15, 'niente si perde per strada');
});

test('sotto il tetto non taglia niente e non dice che ci sono altre', () => {
  const t = taglia([GIORNATA('2026-09-10', 3)], { righe: 12, giorni: 6 });
  assert.deepEqual(t, { evidenza: [], gruppi: [{ data: '2026-09-10', voci: ['riga 2', 'riga 1', 'riga 0'] }], altre: 0 });
});

test('le importanti escono per prime, a parte, e il tetto delle altre non le taglia', () => {
  const g = analizza([
    '## 2026-09-23', ...Array.from({ length: 30 }, (_, i) => `- rifinitura ${i}`), '- [importante] i giochi nuovi', '- [importante] [privato] una cosa sua grossa',
    '## 2026-09-19', '- [importante] instagram con un tasto', '- vecchia rifinitura',
  ].join('\n'));
  const t = taglia(tutte(g), { righe: 12, giorni: 6 });
  assert.deepEqual(t.evidenza.map((v) => [v.data, v.testo, v.privata]), [
    ['2026-09-23', 'una cosa sua grossa', true],
    ['2026-09-23', 'i giochi nuovi', false],
    ['2026-09-19', 'instagram con un tasto', false],
  ], 'la piu\' nuova prima, e la privata resta segnata privata');
  assert.equal(t.gruppi.flatMap((x) => x.voci).length, 9, 'le altre riempiono il posto che resta sotto il tetto');
  assert.ok(t.gruppi.flatMap((x) => x.voci).every((v) => !v.importante));
  assert.equal(t.evidenza.length + 9 + t.altre, 34, 'niente si perde per strada');
});

test('le importanti hanno anche loro un tetto, e quelle oltre si contano', () => {
  const g = analizza(['## 2026-09-23', ...Array.from({ length: EVIDENZA_MAX + 3 }, (_, i) => `- [importante] grossa ${i}`)].join('\n'));
  const t = taglia(pubbliche(g));
  assert.equal(t.evidenza.length, EVIDENZA_MAX);
  assert.equal(t.altre, 3);
});

test('[importante] si legge con [privato] in qualunque ordine, e non entra nel testo né nell\'impronta', () => {
  for (const riga of ['- [importante] cosa [vai: giochi]', '- [IMPORTANTE] cosa [vai: giochi]', '- [privato] [importante] cosa [vai: giochi]', '- [importante] [privato] cosa [vai: giochi]']) {
    const v = analizza('## 2026-01-02\n' + riga + '\n')[0].voci[0];
    assert.equal(v.importante, true, riga);
    assert.equal(v.testo, 'cosa', riga);
    assert.equal(v.vai, 'giochi', riga);
  }
  assert.equal(analizza('## 2026-01-02\n- cosa\n')[0].voci[0].importante, false);
  // Marcare importante una riga gia' vista non la fa tornare nuova.
  const prima = analizza('## 2026-01-02\n- cosa\n');
  const dopo = analizza('## 2026-01-02\n- [importante] cosa\n');
  assert.deepEqual(daVedere(pubbliche(dopo), segnalibro(pubbliche(prima))), []);
});

test('nel file vero le importanti ci sono, e sono poche per giornata', () => {
  const imp = gruppi.flatMap((g) => g.voci.filter((v) => v.importante).map((v) => [g.data, v.testo]));
  assert.ok(imp.length > 0, 'qualche riga e\' importante');
  for (const g of gruppi) {
    const n = g.voci.filter((v) => v.importante).length;
    assert.ok(n <= EVIDENZA_MAX, `${g.data}: ${n} importanti non ci stanno nel riquadro`);
  }
});

test('la finestra conta tutte le novità, anche quelle che non ci stanno dentro, e mette prima le importanti', () => {
  // «12 cose nuove» mentre ne sono successe 47 e' una bugia per omissione.
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  const f = app.slice(app.indexOf('async function mostraNovita('), app.indexOf('function pannelloConsolify('));
  assert.match(f, /const quante = evidenza\.length \+ gruppi\.reduce\([^\n]*\+ restanti;/, 'il conto comprende le importanti e quelle che restano fuori');
  assert.match(f, /sezioniDi\(g\)\.reduce/, 'e le conta dentro le sezioni, non nel vecchio elenco piatto');
  assert.match(f, /const corpo = cartaEvidenza \+ gruppi\.map/, 'il riquadro delle importanti sta sopra');
  assert.match(f, /class="nov-evidenza"/);
});

// ── DOVE E' SUCCESSA ───────────────────────────────────────────────────────
// Una riga dice cosa e' cambiato; senza la destinazione chi legge deve mettersi
// a cercare la scheda giusta. La destinazione sta nella riga, quindi nasce e
// muore con la cosa che racconta.

test('la riga porta la sua destinazione, e la destinazione non finisce nel testo', () => {
  const g = analizza('## 2026-01-02\n- una cosa nuova. [vai: consolify]\n- un\'altra senza\n');
  assert.deepEqual(g[0].voci, [
    { testo: 'una cosa nuova.', privata: false, importante: false, vai: 'consolify' },
    { testo: 'un\'altra senza', privata: false, importante: false, vai: null },
  ]);
});

test('privato e destinazione stanno insieme senza pestarsi', () => {
  const g = analizza('## 2026-01-02\n- [privato] roba sua [vai: stato]\n');
  assert.deepEqual(g[0].voci[0], { testo: 'roba sua', privata: true, importante: false, vai: 'stato' });
  assert.deepEqual(pubbliche(g), [], 'e resta comunque in casa');
});

test('la destinazione si scrive come viene, e una storta non diventa una voce', () => {
  assert.equal(analizza('## 2026-01-02\n- cosa [VAI: Consolify]\n')[0].voci[0].vai, 'consolify');
  assert.equal(analizza('## 2026-01-02\n- cosa [vai: con solify]\n')[0].voci[0].vai, null,
    'con uno spazio dentro non e\' un nome di scheda: meglio niente freccia che una rotta');
  assert.equal(analizza('## 2026-01-02\n- [vai: consolify] cosa\n')[0].voci[0].vai, null,
    'sta in fondo, non in mezzo: in mezzo sarebbe testo');
});

test('nel file vero, ogni destinazione e\' una scheda che esiste', async () => {
  // La stessa mappa che dice quale pagina spiega quella scheda: se il nome c'e'
  // dentro, la freccia funziona sia nel pannello sia sulla pagina pubblica.
  const { aiutiPerScheda } = await import('../../src/web/manuali.js');
  const schede = aiutiPerScheda();
  const dove = destinazioni(gruppi);
  assert.ok(dove.length > 0, 'qualche riga dice dove andare');
  for (const d of dove) assert.ok(schede[d], `${d} e' una scheda vera, con la sua pagina`);
});

test('le righe si raccolgono sotto il punto del pannello di cui parlano', () => {
  const v = [
    { testo: 'a', vai: 'consolify' }, { testo: 'b', vai: null },
    { testo: 'c', vai: 'consolify' }, { testo: 'd', vai: 'effetti' }, { testo: 'e', vai: null },
  ];
  assert.deepEqual(inSezioni(v).map((s) => [s.vai, s.voci.map((x) => x.testo)]), [
    ['consolify', ['a', 'c']],
    [null, ['b', 'e']],
    ['effetti', ['d']],
  ]);
});

test('lo stesso titolo non compare due volte nella stessa giornata', () => {
  // Raggruppare per vicinanza darebbe «CONSOLify» due volte a tre righe di
  // distanza, e un titolo ripetuto si legge come un difetto.
  const v = [{ testo: 'a', vai: 'consolify' }, { testo: 'b', vai: null }, { testo: 'c', vai: 'consolify' }];
  const titoli = inSezioni(v).map((s) => s.vai).filter(Boolean);
  assert.equal(new Set(titoli).size, titoli.length);
});

test('niente si perde e niente si duplica nel raggruppare', () => {
  const v = gruppi[0].voci;
  const dentro = inSezioni(v).flatMap((s) => s.voci);
  assert.equal(dentro.length, v.length);
  assert.deepEqual(new Set(dentro.map((x) => x.testo)).size, new Set(v.map((x) => x.testo)).size);
});

test('la finestra disegna il titolo della sezione, e quel titolo porta li\'', () => {
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  const f = app.slice(app.indexOf('function novScheda('), app.indexOf('function pannelloConsolify('));
  assert.match(f, /class="nov-sez-tit"/, 'il titolo c\'e\'');
  assert.match(f, /nov-sez-area/, 'con l\'area a cui appartiene');
  assert.match(f, /data-nov-vai="\$\{esc\(id\)\}"/, 'e porta un indirizzo');
  assert.match(f, /schedaValida\(id\) \|\| schedaBloccata\(id\)/, 'niente titolo verso una scheda che non c\'e\' o e\' chiusa');
  // il nome NON si riscrive: si prende dall'elenco del pannello
  assert.match(f, /g\.schede\.find\(\(\[sid\]\) => sid === id\)/, 'il nome viene dall\'elenco vero delle schede');

  const clic = app.slice(app.indexOf("const dove = ev.target.closest?.('[data-nov-vai]')"), app.indexOf("if (ev.target.id === 'btn-richiesta')"));
  assert.match(clic, /f\.close\(\)/, 'chiude la finestra');
  assert.match(clic, /vaiAScheda\(dove\.dataset\.novVai\)/, 'e apre la scheda');
});

test('la pagina pubblica manda alla pagina che spiega quella sezione', () => {
  const g = readFileSync(join(RAD, 'src/web/guide.js'), 'utf8');
  const f = g.slice(g.indexOf('export function paginaNovita('), g.indexOf('function dataIn('));
  assert.ok(f.length > 0 && g.indexOf('function dataIn(') > 0, 'la pagina sta dove la si cerca');
  assert.match(f, /sezioni\(g\.voci\.filter\(\(v\) => !\(v && v\.importante\)\)\)/, 'anche qui a sezioni, le importanti a parte');
  assert.match(f, /\$\{evidenza\(g\.voci, aiuti, x\)\}/, 'e le importanti in cima alla giornata');
  assert.match(f, /<h3 class="g-dove-tit">\$\{versoAiuto\(a, x\)\}<\/h3>/, 'col titolo');
  const verso = g.slice(g.indexOf('function versoAiuto('), g.indexOf('\n}', g.indexOf('function versoAiuto(')));
  assert.match(verso, /<a href="\$\{esc\(a\.via\)\}"/, 'che e\' un collegamento vero');
  assert.doesNotMatch(f, /data-nov-vai/, 'fuori dal pannello non si apre una scheda: si apre una pagina');
});

// LE IMPORTANTI SI PRESENTANO PER INTERO. Sotto la riga, due righe rientrate:
// il titolo e il perche'. La riga resta la stessa, e con lei l'impronta di «gia'
// vista»: chi l'aveva gia' letta non se la vede tornare davanti.
test('un\'importante porta il suo titolo e il suo perché, e resta la stessa riga', () => {
  const md = '## 2026-09-26\n\n- [importante] Il muro. [vai: alert]\n  > Il muro delle emote\n  > Le emote volano.\n  > E poi esplodono.\n- Una correzione.\n\n  > Staccata, non attacca\n';
  const [g] = analizza(md);
  assert.deepEqual(g.voci[0], { testo: 'Il muro.', privata: false, importante: true, vai: 'alert', titolo: 'Il muro delle emote', perche: 'Le emote volano. E poi esplodono.' });
  assert.equal(g.voci[1].titolo, undefined, 'una citazione dopo una riga vuota non si attacca a nessuno');
  assert.equal(idVoce(g.data, g.voci[0].testo), idVoce(g.data, 'Il muro.'), 'l\'impronta e\' quella della riga');
  const [p] = pubbliche([g]);
  assert.equal(p.voci[0].titolo, 'Il muro delle emote', 'escono di casa col resto');
  assert.equal(p.voci[0].perche, 'Le emote volano. E poi esplodono.');
  for (const v of gruppi.flatMap((x) => x.voci)) {
    if (v.importante) assert.ok(v.titolo && v.perche, `«${v.testo.slice(0, 50)}…» si presenta per intero`);
    else assert.ok(!v.titolo && !v.perche, `«${v.testo.slice(0, 50)}…» non e\' importante: niente titolo`);
  }
});

test('nel pannello un\'importante e\' una carta: titolo, perché, riga, e «Provala»', () => {
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  const f = app.slice(app.indexOf('async function mostraNovita('), app.indexOf('function pannelloConsolify('));
  assert.match(f, /<article class="nov-grande">/);
  assert.match(f, /<h4 class="nov-grande-tit">\$\{solo\(v\)\}\$\{esc\(v\.titolo \|\| v\.testo\)\}<\/h4>/, 'il titolo in grande');
  assert.match(f, /<p class="nov-grande-perche">\$\{esc\(v\.perche\)\}<\/p>/, 'poi il perche\'');
  assert.match(f, /data-nov-vai="\$\{esc\(id\)\}">\$\{L\('Provala'/, 'e il tasto che porta dove si prova');
  assert.match(f, /\$\{evidenza\.map\(grande\)\.join\(''\)\}/, 'per ognuna');
  const anime = readFileSync(join(RAD, 'src/web/public/anime.css'), 'utf8');
  assert.match(anime, /\.nov-grande \{\n  border: 1px solid var\(--contorno\); border-width: var\(--tratto-2\);/, 'con il suo contorno a china');
});

test('sulla pagina pubblica un\'importante ha il suo titolo, e dove si prova', async () => {
  const { paginaNovita } = await import('../../src/web/guide.js');
  const h = paginaNovita([{ data: '2026-09-26', voci: [{ testo: 'Il muro.', importante: true, vai: 'alert', titolo: 'Il muro delle emote', perche: 'Le emote volano.' }, { testo: 'Una correzione.', importante: false, vai: null }] }],
    { alert: { titolo: 'Manuale dell\'overlay', via: '/manuale/overlay' } });
  assert.match(h, /<article class="g-ev"><h3 class="g-ev-tit">Il muro delle emote<\/h3><p class="g-ev-perche">Le emote volano\.<\/p><p class="g-ev-riga">Il muro\.<\/p><p class="g-ev-dove"><a href="\/manuale\/overlay">/);
  assert.equal((h.match(/<h1[\s>]/g) || []).length, 1, 'e la pagina resta con un h1 solo');
});

// ── LE TRE LINGUE ──────────────────────────────────────────────────────────
// Una riga, tre lingue, nello stesso posto: sotto la riga italiana, rientrate,
// `en:` ed `es:`; per un'importante anche `en>` ed `es>` (titolo, poi perché).
// Chi legge sceglie la lingua; l'impronta resta quella italiana.

const TRE = [
  '## 2026-09-30',
  '',
  '- [importante] Il muro delle emote. [vai: alert]',
  '  en: The emote wall.',
  '  es: El muro de emotes.',
  '  > Il muro',
  '  > Le emote volano.',
  '  en> The wall',
  '  en> Emotes fly.',
  '  es> El muro',
  '  es> Los emotes vuelan.',
  '- Una correzione. [vai: stato]',
  '  es: Una corrección.',
  '  en: A fix.',
  '- Una riga ancora da tradurre.',
].join('\n');

test('le traduzioni stanno sotto la riga, e non entrano nel testo né nella destinazione', () => {
  const [g] = analizza(TRE);
  assert.equal(g.voci.length, 3, 'le righe rientrate non diventano voci');
  const [muro, corr, sola] = g.voci;
  assert.equal(muro.testo, 'Il muro delle emote.');
  assert.equal(muro.vai, 'alert', 'il [vai:] della riga italiana vale per tutte');
  assert.deepEqual(muro.lingue, {
    en: { testo: 'The emote wall.', titolo: 'The wall', perche: 'Emotes fly.' },
    es: { testo: 'El muro de emotes.', titolo: 'El muro', perche: 'Los emotes vuelan.' },
  });
  assert.equal(muro.titolo, 'Il muro', 'il titolo italiano resta il suo');
  assert.equal(muro.perche, 'Le emote volano.');
  assert.deepEqual(corr.lingue, { en: { testo: 'A fix.' }, es: { testo: 'Una corrección.' } }, 'in qualunque ordine');
  assert.equal(sola.lingue, undefined, 'una riga senza traduzioni non ne inventa');
});

test('chi legge sceglie la lingua: testo, titolo e perché arrivano in quella', () => {
  const g = analizza(TRE);
  const [en] = pubbliche(g, 'en');
  assert.deepEqual(en.voci.slice(0, 2).map((v) => [v.testo, v.titolo, v.perche, v.vai]), [
    ['The emote wall.', 'The wall', 'Emotes fly.', 'alert'],
    ['A fix.', undefined, undefined, 'stato'],
  ]);
  const [es] = pubbliche(g, 'es');
  assert.deepEqual(es.voci.slice(0, 2).map((v) => [v.testo, v.titolo, v.perche]), [
    ['El muro de emotes.', 'El muro', 'Los emotes vuelan.'],
    ['Una corrección.', undefined, undefined],
  ]);
  const [it] = pubbliche(g, 'it');
  assert.equal(it.voci[0].testo, 'Il muro delle emote.');
  assert.deepEqual(pubbliche(g), pubbliche(g, 'it'), 'senza lingua, l\'italiano');
  for (const storta of ['fr', 'EN', '', null, ['en']]) assert.deepEqual(pubbliche(g, storta), pubbliche(g, 'it'), `una lingua che non c'e' (${storta}) vale italiano`);
  assert.ok(!('lingue' in en.voci[0]), 'fuori di casa esce la lingua scelta, non tutte e tre');
});

test('l\'impronta resta quella italiana: cambiare lingua non fa rivedere niente', () => {
  const g = analizza(TRE);
  const vecchio = segnalibro(pubbliche(analizza(TRE.split('\n').filter((r) => !/^\s+(en|es)[:>]/.test(r)).join('\n'))));
  for (const l of ['it', 'en', 'es']) {
    const f = pubbliche(g, l);
    for (const v of f[0].voci) assert.equal(v.id, idVoce('2026-09-30', analizza(TRE)[0].voci[f[0].voci.indexOf(v)].testo), `${l}: l'impronta e' della riga italiana`);
    assert.equal(segnalibro(f), vecchio, `${l}: lo stesso segnaposto di chi le leggeva solo in italiano`);
    for (const altra of ['it', 'en', 'es']) {
      assert.deepEqual(daVedere(pubbliche(g, altra), segnalibro(f)), [], `lette in ${l}, non tornano in ${altra}`);
    }
  }
  assert.equal(segnalibro(tutte(g, 'es')), segnalibro(tutte(g, 'it')), 'e cosi\' per chi vede anche le sue');
  // una riga italiana riscritta torna, in qualunque lingua la si legga
  const riscritta = analizza(TRE.replace('- Una correzione.', '- Una correzione diversa.'));
  assert.deepEqual(daVedere(pubbliche(riscritta, 'en'), segnalibro(pubbliche(g, 'en'))).flatMap((x) => x.voci.map((v) => v.testo)), ['A fix.']);
});

test('una traduzione a metà non si mostra: la voce resta intera in italiano, e lo dice', () => {
  const g = analizza(TRE);
  const sola = pubbliche(g, 'en')[0].voci[2];
  assert.equal(sola.testo, 'Una riga ancora da tradurre.');
  assert.equal(sola.lingua, 'it', 'dice in che lingua e\', cosi\' chi la mostra la marca');
  assert.equal(pubbliche(g, 'it')[0].voci[2].lingua, undefined, 'in italiano non c\'e\' niente da dire');
  assert.equal(pubbliche(g, 'en')[0].voci[1].lingua, undefined, 'una voce tradotta non porta il segno');
  const senzaTitolo = analizza(TRE.replace('  en> The wall\n  en> Emotes fly.\n', ''));
  const muro = pubbliche(senzaTitolo, 'en')[0].voci[0];
  assert.deepEqual([muro.testo, muro.titolo, muro.perche, muro.lingua], ['Il muro delle emote.', 'Il muro', 'Le emote volano.', 'it'],
    'un\'importante senza titolo inglese resta tutta italiana, non meta\' e meta\'');
});

test('le righe private restano in italiano anche per chi ha il pannello in un\'altra lingua', () => {
  const g = analizza('## 2026-09-30\n- pubblica\n  en: public\n  es: pública\n- [privato] solo mia\n');
  assert.deepEqual(tutte(g, 'en')[0].voci.map((v) => [v.testo, v.privata, v.lingua]), [['public', false, undefined], ['solo mia', true, 'it']]);
  assert.deepEqual(pubbliche(g, 'es')[0].voci.map((v) => v.testo), ['pública'], 'e fuori di casa non escono in nessuna lingua');
});

test('una traduzione staccata o doppia non si perde in silenzio', () => {
  assert.deepEqual(righeSperse(TRE), [], 'il file scritto bene non lascia niente');
  const staccata = TRE.replace('- Una correzione. [vai: stato]\n', '- Una correzione. [vai: stato]\n\n');
  assert.deepEqual(righeSperse(staccata).map((x) => [x.perche, x.testo.trim()]), [['staccata', 'es: Una corrección.'], ['staccata', 'en: A fix.']]);
  assert.equal(analizza(staccata)[0].voci[1].lingue, undefined, 'e non si attacca a nessuno');
  const doppia = TRE.replace('  en: A fix.', '  en: A fix.\n  en: Another fix.');
  assert.deepEqual(righeSperse(doppia).map((x) => [x.perche, x.riga]), [['doppia', 15]]);
  assert.equal(analizza(doppia)[0].voci[1].lingue.en.testo, 'A fix.', 'la prima resta, la seconda e\' segnalata');
  assert.deepEqual(righeSperse(TRE.replace('  en: A fix.', '  en:')).map((x) => x.perche), ['vuota']);
  assert.deepEqual(righeSperse('# Novità\n\n- esempio\n  en: example\n\n## 2026-09-30\n- vera\n  en: real\n'), [], 'la prosa in testa al file non e\' letta, e quindi non e\' persa');
});

// ── LE PAGINE, LE PORTE E IL PANNELLO IN TRE LINGUE ─────────────────────────

test('una pagina delle novità per lingua: la sua lingua, il suo indirizzo, e le altre due accanto', async () => {
  const { paginaNovita, VIE, T } = await import('../../src/web/guide.js');
  const g = analizza(TRE);
  const aiuti = { alert: { titolo: 'Overlay', via: '/x/overlay' }, stato: { titolo: 'Stato', via: '/x/stato' } };
  const alt = { it: 'https://socialbot.live/novita', en: 'https://socialbot.live/en/news', es: 'https://socialbot.live/es/novedades' };
  const date = { it: '30 settembre 2026', en: '30 September 2026', es: '30 de septiembre de 2026' };
  for (const l of ['it', 'en', 'es']) {
    const h = paginaNovita(pubbliche(g, l), aiuti, l);
    assert.ok(h.includes(`<html lang="${l}">`), `${l}: la lingua della pagina`);
    assert.ok(h.includes(`<link rel="canonical" href="${alt[l]}">`), `${l}: canonica a se stessa`);
    for (const [x, u] of Object.entries(alt)) assert.ok(h.includes(`<link rel="alternate" hreflang="${x}" href="${u}">`), `${l}: accanto ${x}`);
    assert.ok(h.includes(`<link rel="alternate" hreflang="x-default" href="${alt.it}">`), `${l}: x-default sull'italiano`);
    assert.ok(h.includes(`<title>${T[l].novitaTitolo.replace(/&/g, '&amp;')}</title>`), `${l}: il titolo nella sua lingua`);
    assert.ok(h.includes(`<h1>${T[l].novita}</h1>`), `${l}: l'h1`);
    assert.ok(h.includes(`<h2>${date[l]}</h2>`), `${l}: la data come la dice chi legge (${date[l]})`);
    assert.ok(h.includes(`<p class="g-evidenza-tit">${T[l].novitaProva}</p>`), `${l}: il riquadro delle importanti`);
    assert.ok(h.includes(`href="${VIE[l].novita}" aria-current="page"`), `${l}: la testata segna le novità della sua lingua`);
    assert.equal(VIE[l].novita, new URL(alt[l]).pathname);
  }
  const en = paginaNovita(pubbliche(g, 'en'), aiuti, 'en');
  assert.match(en, /<h3 class="g-ev-tit">The wall<\/h3><p class="g-ev-perche">Emotes fly\.<\/p><p class="g-ev-riga">The emote wall\.<\/p>/, 'l\'importante in inglese');
  assert.match(en, /<li>A fix\.<\/li>/, 'la riga in inglese');
  assert.match(en, /<li lang="it">Una riga ancora da tradurre\.<\/li>/, 'e una riga rimasta in italiano lo dice');
  assert.doesNotMatch(paginaNovita(pubbliche(g, 'it'), aiuti, 'it'), /<(li|article class="g-ev") lang=/, 'in italiano nessuna riga porta il segno');
  const conAiuti = (l) => paginaNovita(pubbliche(g, l), { alert: { titolo: 'Manuale dell\'overlay', via: '/manuale/overlay' }, stato: { titolo: 'Status manual', via: '/en/manual/status' } }, l);
  assert.match(conAiuti('en'), /<a href="\/manuale\/overlay" lang="it" hreflang="it">Manuale dell'overlay<\/a>/, 'un collegamento a una pagina ancora solo italiana lo dice');
  assert.match(conAiuti('en'), /<a href="\/en\/manual\/status">Status manual<\/a>/, 'uno nella lingua della pagina no');
  assert.match(conAiuti('it'), /<a href="\/manuale\/overlay">Manuale dell'overlay<\/a>/, 'e in italiano niente segno');
  const es = paginaNovita(pubbliche(g, 'es'), aiuti, 'es');
  assert.match(es, /<li>Una corrección\.<\/li>/);
  assert.doesNotMatch(es, /Una correzione\./, 'niente italiano dove c\'e\' la traduzione');
});

test('la sitemap ha le novità in ogni lingua, col loro gruppo', async () => {
  const { urlGuide } = await import('../../src/web/guide.js');
  const voci = urlGuide(pubbliche(analizza(TRE))).filter((v) => /\/(novita|news|novedades)$/.test(v.loc));
  assert.deepEqual(voci.map((v) => v.loc), ['https://socialbot.live/novita', 'https://socialbot.live/en/news', 'https://socialbot.live/es/novedades']);
  for (const v of voci) {
    assert.equal(v.lastmod, '2026-09-30');
    assert.deepEqual(v.alt, { it: voci[0].loc, en: voci[1].loc, es: voci[2].loc }, `${v.loc}: il gruppo intero`);
  }
});

test('le porte delle novità danno la lingua chiesta, e il pannello chiede la sua', () => {
  const srv = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
  assert.match(srv, /const linguaNovita = \(req\) => \(novita\.LINGUE\.includes\(req\.query\.lang\) \? req\.query\.lang : 'it'\);/, 'una lingua valida, o l\'italiano');
  const pezzo = (via) => { const i = srv.indexOf(`app.get('${via}'`); return srv.slice(i, srv.indexOf('\n  });', i)); };
  assert.match(pezzo('/api/novita'), /novita\.pubbliche\(novita\.leggi\(NOVITA_MD\), l\)/, '/api/novita nella lingua chiesta');
  assert.match(pezzo('/api/novita'), /res\.json\(\{ lingua: l,/, 'e dice quale');
  const dv = pezzo('/api/novita/da-vedere');
  assert.match(dv, /const l = linguaNovita\(req\);/);
  assert.match(dv, /novita\.tutte\(novita\.unisci\(letti, novita\.leggi\(LIA_NOVITA\)\), l\) : novita\.pubbliche\(letti, l\)/, 'per tutti e per chi vede anche le sue');
  const i = srv.indexOf("app.get(['/novita', '/en/news', '/es/novedades']");
  const pag = srv.slice(i, srv.indexOf('\n  });', i));
  assert.match(pag, /const l = linguaDi\(req\.path, 'novita'\);/, 'la pagina prende la lingua dall\'indirizzo');
  assert.match(pag, /paginaNovita\(novita\.pubbliche\(letti, l\), AIUTI_LINGUE\[l\], l\)/, 'con le righe e le pagine d\'aiuto di quella lingua');
  assert.match(pag, /fatta\.letti !== letti/, 'e si rifa\' quando il file e\' stato riletto');
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  const f = app.slice(app.indexOf('async function mostraNovita('), app.indexOf('function pannelloConsolify('));
  assert.match(f, /api\(`\/api\/novita\/da-vedere\?lang=\$\{LINGUA\}`\)/, 'il pannello chiede le novità nella sua lingua');
  assert.match(f, /href="\$\{esc\(viaPagina\('novita'\)\)\}"/, 'e «Tutte le novità» porta alla pagina della sua lingua');
  assert.doesNotMatch(f, /href="\/novita"/);
});

test('nel file vero ogni riga pubblica si legge nelle tre lingue, e niente di scritto va perso', () => {
  // Il cancello (verifica-novita.mjs) misura anche la forma delle traduzioni;
  // qui si guarda la cosa che la pagina e il pannello danno per scontata: che
  // chi legge in inglese o in spagnolo non si trovi una riga in italiano.
  const testo = readFileSync(join(RAD, 'NOVITA.md'), 'utf8');
  assert.deepEqual(righeSperse(testo), [], 'una traduzione staccata dalla sua riga, o scritta due volte');
  for (const l of ['en', 'es']) {
    const rimaste = pubbliche(gruppi, l).flatMap((g) => g.voci.filter((v) => v.lingua).map((v) => `${g.data} «${v.testo.slice(0, 50)}…»`));
    assert.deepEqual(rimaste, [], `${l}: righe rimaste in italiano`);
  }
});
