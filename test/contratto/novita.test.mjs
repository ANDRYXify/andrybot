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
import { analizza, pubbliche, tutte, unisci, inItaliano, ultima, segnalibro, daVedere, segnoValido, taglia, destinazioni, inSezioni, idVoce, EVIDENZA_MAX, SEGNO_MAX } from '../../src/web/novita.js';

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
  assert.deepEqual(pubbliche(uno), [{ data: '2026-01-02', voci: [{ testo: 'prima cosa', vai: null, importante: false }, { testo: 'seconda cosa', vai: null, importante: false }] }]);
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
  assert.deepEqual(pubbliche(g), [{ data: '2026-01-02', voci: [{ testo: 'questa la vedono tutti', vai: null, importante: false }] }]);
  // e a chi ha diritto arriva, marcata per quello che è
  assert.deepEqual(tutte(g), [{ data: '2026-01-02', voci: [
    { testo: 'questa la vedono tutti', privata: false, importante: false, vai: null },
    { testo: 'questa è solo mia', privata: true, importante: false, vai: null },
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
  const f = g.slice(g.indexOf('export function paginaNovita('), g.indexOf('function dataItaliana('));
  assert.match(f, /sezioni\(g\.voci\.filter\(\(v\) => !\(v && v\.importante\)\)\)/, 'anche qui a sezioni, le importanti a parte');
  assert.match(f, /\$\{evidenza\(g\.voci\)\}/, 'e le importanti in cima alla giornata');
  assert.match(f, /g-dove-tit/, 'col titolo');
  assert.match(f, /href="\$\{esc\(a\.via\)\}"/, 'che e\' un collegamento vero');
  assert.doesNotMatch(f, /data-nov-vai/, 'fuori dal pannello non si apre una scheda: si apre una pagina');
});
