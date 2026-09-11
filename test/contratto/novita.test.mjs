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
import { analizza, pubbliche, tutte, inItaliano, ultima, segnalibro, daVedere, segnoValido, taglia, destinazioni, inSezioni } from '../../src/web/novita.js';

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
  assert.deepEqual(pubbliche(uno), [{ data: '2026-01-02', voci: [{ testo: 'prima cosa', vai: null }, { testo: 'seconda cosa', vai: null }] }]);
});

test('le righe scritte prima di qualsiasi giornata si ignorano', () => {
  assert.deepEqual(analizza('- orfana\n'), []);
});

test('la data si legge come la direbbe una persona', () => {
  assert.equal(inItaliano('2026-09-02'), '2 settembre 2026');
  assert.equal(inItaliano('2026-01-31'), '31 gennaio 2026');
});

// ── quello che è tuo non esce di casa ──────────────────────────────────────
// Non tutto quello che cambia riguarda chi usa il bot: la crescita di Lia e il suo
// computer sono cose del direttore. Il rischio non è che si veda male: è che si
// veda, e a chiunque.

test('una riga marcata privata non arriva mai alla forma pubblica', () => {
  const g = analizza([
    '## 2026-01-02',
    '- questa la vedono tutti',
    '- [privato] questa è solo mia',
  ].join('\n'));
  assert.deepEqual(pubbliche(g), [{ data: '2026-01-02', voci: [{ testo: 'questa la vedono tutti', vai: null }] }]);
  // e a chi ha diritto arriva, marcata per quello che è
  assert.deepEqual(tutte(g), [{ data: '2026-01-02', voci: [
    { testo: 'questa la vedono tutti', privata: false, vai: null },
    { testo: 'questa è solo mia', privata: true, vai: null },
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

test('nel file vero, quello che è marcato privato resta fuori', () => {
  const mie = gruppi.flatMap((g) => g.voci).filter((v) => v.privata).map((v) => v.testo);
  assert.ok(mie.length > 0, 'ci sono righe private da proteggere');
  const fuori = JSON.stringify(pubbliche(gruppi));
  for (const t of mie) assert.ok(!fuori.includes(t), `è uscita di casa: ${t.slice(0, 60)}`);
});

// ── IL SEGNAPOSTO ──────────────────────────────────────────────────────────
// Il difetto vero, misurato: una giornata resta aperta e si allunga. Segnata col
// solo nome del giorno, le righe arrivate dopo non si vedono MAI PIU', perche'
// quel giorno non sara' mai «piu' recente di se stesso». Il 2026-09-10 aveva 18
// righe al mattino e 47 la sera: 29 righe perse per sempre.

const GIORNATA = (data, n, da = 0) => ({ data, voci: Array.from({ length: n }, (_, i) => `riga ${da + i}`) });

test('il segnaposto dice il giorno E quante righe aveva', () => {
  assert.equal(segnalibro([GIORNATA('2026-09-10', 18)]), '2026-09-10#18');
  assert.equal(segnalibro([]), null);
});

test('una riga aggiunta a una giornata gia\' vista si vede lo stesso', () => {
  // le righe nuove entrano IN CIMA alla giornata: le non viste sono le prime
  const prima = [GIORNATA('2026-09-10', 18)];
  assert.deepEqual(daVedere(prima, segnalibro(prima)), [], 'appena segnata, niente da vedere');

  const dopo = [{ data: '2026-09-10', voci: ['nuova A', 'nuova B', ...prima[0].voci] }];
  const persi = daVedere(dopo, segnalibro(prima));
  assert.deepEqual(persi, [{ data: '2026-09-10', voci: ['nuova A', 'nuova B'] }]);
});

test('una giornata nuova intera si vede, e quella sotto no', () => {
  const segno = segnalibro([GIORNATA('2026-09-10', 3)]);
  const ora = [GIORNATA('2026-09-11', 2, 100), GIORNATA('2026-09-10', 3), GIORNATA('2026-09-08', 9)];
  assert.deepEqual(daVedere(ora, segno).map((g) => g.data), ['2026-09-11']);
});

test('giornata nuova E righe in piu\' in quella segnata: escono tutte e due', () => {
  const segno = segnalibro([GIORNATA('2026-09-10', 3)]);
  const ora = [GIORNATA('2026-09-11', 1, 100), { data: '2026-09-10', voci: ['coda', ...GIORNATA('2026-09-10', 3).voci] }];
  assert.deepEqual(daVedere(ora, segno), [
    { data: '2026-09-11', voci: ['riga 100'] },
    { data: '2026-09-10', voci: ['coda'] },
  ]);
});

test('un segnaposto vecchio — la sola data — rimostra quella giornata, non la inghiotte', () => {
  // Non dice quante righe c'erano e non si puo' inventare. Rivedere qualche riga
  // e' una seccatura; perderne ventinove no.
  const ora = [GIORNATA('2026-09-10', 5), GIORNATA('2026-09-08', 2)];
  assert.deepEqual(daVedere(ora, '2026-09-10'), [GIORNATA('2026-09-10', 5)]);
});

test('senza segnaposto non si perde niente, e le porcherie non passano', () => {
  const ora = [GIORNATA('2026-09-10', 2)];
  assert.deepEqual(daVedere(ora, ''), ora);
  assert.deepEqual(daVedere(ora, 'domani'), ora);
  assert.equal(segnoValido('2026-09-10#47'), true);
  assert.equal(segnoValido('2026-09-10'), true);
  assert.equal(segnoValido('2026-9-10'), false);
  assert.equal(segnoValido("2026-09-10#47' or 1=1"), false);
});

test('il conto segue quello che quella persona VEDE, non il file', () => {
  // A chi vede anche le righe sue il segnaposto le comprende; a chi vede solo le
  // pubbliche no. Altrimenti il numero conterebbe righe che quella persona non ha
  // davanti, e la giornata risulterebbe vista quando non lo e'.
  const g = analizza(['## 2026-09-10', '- pubblica', '- [privato] sua', '- altra pubblica'].join('\n'));
  assert.equal(segnalibro(tutte(g)), '2026-09-10#3');
  assert.equal(segnalibro(pubbliche(g)), '2026-09-10#2');
});

test('il giorno segnato che sparisce dal file non fa uscire la storia vecchia', () => {
  const ora = [GIORNATA('2026-09-08', 4)];
  assert.deepEqual(daVedere(ora, '2026-09-10#2'), []);
});

test('la pagina ridà indietro il segnaposto che le è stato dato, non il giorno', () => {
  // Il conto lo fa il server sulla forma che mostra a quella persona. Se la
  // pagina rispondesse col solo giorno, il server sarebbe giusto e il difetto
  // resterebbe: una riga che sembra fare una cosa e non la fa.
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  const f = app.slice(app.indexOf('async function mostraNovita('), app.indexOf('function pannelloConsolify('));
  assert.match(f, /const fin = d\.segnalibro \|\| d\.ultima;/, 'il popup usa il segnaposto');
  assert.match(f, /segna\(fin\)/, 'e segna quello');
  assert.doesNotMatch(f, /segna\(d\.ultima\)/, 'e non il solo giorno');

  const c = app.slice(app.indexOf('async function caricaNovita('), app.indexOf('function cardKickHtml('));
  assert.match(c, /d\.segnalibro \|\| d\.ultima/, 'la carta in cima fa lo stesso');
  assert.doesNotMatch(c, /d\.ultima === novitaViste\(\)/, 'e non confronta il solo giorno');
});

test('il server manda il segnaposto da tutte e tre le porte che lo servono', () => {
  const srv = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
  for (const via of ['/api/novita', '/api/admin/novita', '/api/novita/da-vedere']) {
    const i = srv.indexOf(`app.get('${via}'`);
    assert.ok(i > 0, `la porta ${via} esiste`);
    const blocco = srv.slice(i, srv.indexOf('});', i));
    assert.match(blocco, /segnalibro/, `${via} manda il segnaposto`);
  }
  const j = srv.indexOf("app.post('/api/novita/viste'");
  const post = srv.slice(j, srv.indexOf('}));', j));
  assert.match(post, /novita\.segnoValido\(/, 'e chi lo riceve lo valida con la stessa regola');
});

test('il tetto è sulle righe, non sulle giornate: una sola giornata lunga è un muro uguale', () => {
  const uno = taglia([GIORNATA('2026-09-10', 47)], { righe: 12, giorni: 6 });
  assert.equal(uno.gruppi.length, 1);
  assert.equal(uno.gruppi[0].voci.length, 12);
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
  assert.deepEqual(t, { gruppi: [GIORNATA('2026-09-10', 3)], altre: 0 });
});

test('la finestra conta tutte le novità, anche quelle che non ci stanno dentro', () => {
  // «12 cose nuove» mentre ne sono successe 47 e' una bugia per omissione.
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  const f = app.slice(app.indexOf('async function mostraNovita('), app.indexOf('function pannelloConsolify('));
  assert.match(f, /const quante = gruppi\.reduce\([^\n]*\+ restanti;/, 'il conto comprende quelle che restano fuori');
  assert.match(f, /sezioniDi\(g\)\.reduce/, 'e le conta dentro le sezioni, non nel vecchio elenco piatto');
  assert.doesNotMatch(f, /altriGiorni/, 'le giornate non si contano piu\': si contano le righe');
});

// ── DOVE E' SUCCESSA ───────────────────────────────────────────────────────
// Una riga dice cosa e' cambiato; senza la destinazione chi legge deve mettersi
// a cercare la scheda giusta. La destinazione sta nella riga, quindi nasce e
// muore con la cosa che racconta.

test('la riga porta la sua destinazione, e la destinazione non finisce nel testo', () => {
  const g = analizza('## 2026-01-02\n- una cosa nuova. [vai: consolify]\n- un\'altra senza\n');
  assert.deepEqual(g[0].voci, [
    { testo: 'una cosa nuova.', privata: false, vai: 'consolify' },
    { testo: 'un\'altra senza', privata: false, vai: null },
  ]);
});

test('privato e destinazione stanno insieme senza pestarsi', () => {
  const g = analizza('## 2026-01-02\n- [privato] roba sua [vai: stato]\n');
  assert.deepEqual(g[0].voci[0], { testo: 'roba sua', privata: true, vai: 'stato' });
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

  const clic = app.slice(app.indexOf("const dove = ev.target.closest?.('[data-nov-vai]')"), app.indexOf("const viste = ev.target.closest"));
  assert.match(clic, /f\.close\(\)/, 'chiude la finestra');
  assert.match(clic, /vaiAScheda\(dove\.dataset\.novVai\)/, 'e apre la scheda');
});

test('la pagina pubblica manda alla pagina che spiega quella sezione', () => {
  const g = readFileSync(join(RAD, 'src/web/guide.js'), 'utf8');
  const f = g.slice(g.indexOf('export function paginaNovita('), g.indexOf('function dataItaliana('));
  assert.match(f, /sezioni\(g\.voci\)/, 'anche qui a sezioni');
  assert.match(f, /g-dove-tit/, 'col titolo');
  assert.match(f, /href="\$\{esc\(a\.via\)\}"/, 'che e\' un collegamento vero');
  assert.doesNotMatch(f, /data-nov-vai/, 'fuori dal pannello non si apre una scheda: si apre una pagina');
});
