// LA REGIA DAI MODULI, SUL PONTE CHE C'ERA GIA'.
//
// Un raid non aspetta che si apra CONSOLify, e «torno subito» lo si dice in
// chat. Percio' un Modulo puo' fare un passo di regia. La cosa da tenere ferma
// e' l'invariante del ponte: dal ponte passa SOLO un passo gia' salvato dallo
// streamer (in un tasto o in un Modulo), mai un ordine che arrivi da una
// richiesta. E la pagina deve essere di guardia dall'avvio del pannello, non
// dall'apertura della scheda.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cartellaUsaEGetta, testoManuali } from '../aiuto.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');

const usaEGetta = cartellaUsaEGetta('andrybot-regiamod-');
const { streamers } = await import('../../src/db.js');
const consolle = await import('../../src/features/console.js');

let n = 0;
const canale = () => { const ch = `regia-mod-${++n}`; streamers.upsertApproved(ch, ch); return ch; };

test('un passo di regia dai Moduli esce dallo stesso ponte, ripulito come quelli dei tasti', async () => {
  const ch = canale();
  assert.deepEqual(consolle.TIPI_REGIA, ['scena', 'muto', 'transizione']);

  // nessuna pagina di guardia: non si finge di averlo fatto
  const e0 = await consolle.passoDiRegia(ch, { tipo: 'scena', scena: 'Gioco' });
  assert.equal(e0.ok, false);
  assert.match(e0.mostra, /pagina/i);

  // con una pagina di guardia, arriva il passo pulito e l'esito torna
  const arrivati = [];
  const chiudi = consolle.apriPonte(ch, (m) => {
    arrivati.push(m);
    setTimeout(() => consolle.esitoDalPonte(ch, m.lavoro, { ok: true, mostra: m.passo.scena || m.passo.fonte }), 0);
  });
  const e1 = await consolle.passoDiRegia(ch, { tipo: 'scena', scena: '  Gioco  ', extra: 'via' });
  assert.equal(e1.ok, true);
  assert.deepEqual(arrivati[0].passo, { tipo: 'scena', scena: 'Gioco' }, 'ripulito: niente campi in piu\', niente spazi');
  assert.equal(arrivati[0].tipo, 'regia');

  const e2 = await consolle.passoDiRegia(ch, { tipo: 'muto', fonte: 'Mic/Aux', come: 'esplodi' });
  assert.equal(e2.ok, true);
  assert.deepEqual(arrivati[1].passo, { tipo: 'muto', fonte: 'Mic/Aux', come: 'inverti' }, 'una maniera sconosciuta diventa «inverti», come nei tasti');
  chiudi();
});

test('dal ponte dei Moduli non passa niente che non sia regia', async () => {
  const ch = canale();
  const arrivati = [];
  const chiudi = consolle.apriPonte(ch, (m) => arrivati.push(m));
  for (const passo of [
    { tipo: 'chat', testo: 'ciao' },
    { tipo: 'azione', id: 'battuta' },
    { tipo: 'comando', comando: 'so' },
    { tipo: 'attesa', ms: 100 },
    { tipo: 'scena' },
    { tipo: 'regia', scena: 'x' },
    null,
  ]) {
    const e = await consolle.passoDiRegia(ch, passo);
    assert.equal(e.ok, false, JSON.stringify(passo));
    assert.equal(e.mostra, 'passo non valido');
  }
  assert.equal(arrivati.length, 0, 'alla pagina non e\' arrivato niente');
  chiudi();
});

test('il motore riceve il ponte dall\'avvio, il server valida l\'azione, e il ponte resta com\'era', () => {
  const idx = leggi('src/index.js');
  assert.match(idx, /new ModulesEngine\(\{ effects, helix, regia: passoDiRegia \}\)/, 'il ponte entra nel motore come gli effetti e Helix');
  const motore = leggi('src/features/modules.js');
  assert.ok(!/console\.js/.test(motore), 'il motore non importa il ponte: lo riceve');
  assert.match(motore, /case 'regia': \{[\s\S]*?await this\.regia\(ctx\.channel, passo\)/, 'l\'azione chiama la funzione ricevuta');

  const srv = leggi('src/web/server.js');
  assert.match(srv, /const MOD_AZIONI = \[[^\]]*'regia'[^\]]*\]/);
  const valida = srv.slice(srv.indexOf('function validaModulo('), srv.indexOf("app.get('/api/streamer/moduli'"));
  assert.match(valida, /a\.tipo === 'regia'/, 'il server valida l\'azione');
  assert.match(valida, /MOD_REGIA\.includes\(a\.cosa\)/, 'la cosa da fare e\' una delle tre');
  assert.match(valida, /MOD_MUTO\.includes\(a\.come\)/, 'e la maniera di mutare una delle tre');
  for (const campo of ['scena', 'fonte', 'transizione']) assert.match(valida, new RegExp(`a\\.${campo} \\|\\| ''`), `${campo} non puo\' essere vuoto`);

  // il ponte in se' non e' cambiato: viaggia il passo, e basta
  const cons = leggi('src/features/console.js');
  const f = cons.slice(cons.indexOf('function chiediAlPonte('), cons.indexOf('export async function eseguiPassoDiTasto('));
  assert.match(f, /manda\(\{ tipo: 'regia', lavoro: idLavoro, passo \}\)/);
  const mio = cons.slice(cons.indexOf('export function passoDiRegia('), cons.indexOf('export function esegui('));
  assert.match(mio, /passoPulito\(passo, new Set\(\)\)/, 'stessa pulizia dei tasti');
  assert.match(mio, /TIPI_REGIA\.includes\(p\.tipo\)/, 'e solo i tre tipi di regia');
  assert.match(mio, /chiediAlPonte\(norm\(channel\), p\)/, 'stessa uscita');
});

test('il pannello e\' di guardia dall\'avvio, e riprova finche\' il collegamento e\' ricordato', () => {
  const app = leggi('src/web/public/app.js');
  const avvio = app.slice(app.indexOf('  esitoPostaDaIndirizzo();'), app.indexOf('function avvisaRapporti('));
  assert.match(avvio, /avvisaRapporti\(\);\n  collegaRegiaRicordata\(\);/, 'all\'avvio, dopo il resto');
  const ricordata = app.slice(app.indexOf('function collegaRegiaRicordata('), app.indexOf('function disegnaSpiaRegia('));
  assert.match(ricordata, /RegiaEsterna\.ricordata\(\)/, 'solo se un collegamento e\' stato ricordato');
  assert.match(ricordata, /collegaRegia\(RegiaEsterna\.impostazioni\(\), true\)/, 'con la configurazione salvata, in silenzio: niente scansione');
  assert.ok(!/provaCollegamento/.test(ricordata), 'la scansione delle porte resta al tasto Collega');
  const riprova = app.slice(app.indexOf('function programmaRiprovaRegia('), app.indexOf('function collegaRegiaRicordata('));
  assert.match(riprova, /_cons\.regiaFerma/, '«Stacca» la ferma');
  assert.match(riprova, /RegiaEsterna\.ricordata\(\)/, '«Scorda tutto» la spegne');
  assert.match(riprova, /RIPROVA_REGIA_MS/, 'a cadenza, non a raffica');
  assert.match(app, /if \(id === 're-stacca'\) \{ _cons\.regiaFerma = true;/, 'staccare a mano ferma le riprove');
  assert.match(app, /if \(id === 're-collega'\) \{ _cons\.regiaFerma = false;/, 'e Collega le riapre');
  // il ponte si sincronizza anche quando la scheda non e' a video
  const spia = app.slice(app.indexOf('function disegnaSpiaRegia('), app.indexOf('const MOTIVI_REGIA'));
  assert.ok(spia.indexOf('apriPonteRegia()') < spia.indexOf("getElementById('re-spia')"), 'prima il ponte, poi la spia');
  const re = leggi('src/web/public/regia-esterna.js');
  assert.match(re, /function ricordata\(\)/);
  assert.match(re, /scorda, ricordata, casa,/, 'e la pagina puo\' chiederlo');
});

test('l\'editor offre la regia coi nomi letti in pagina, e i modelli pronti usano quei nomi', () => {
  const app = leggi('src/web/public/app.js');
  assert.match(app, /\['regia', 'Regia: scena, muto o transizione'\]/);
  const campi = app.slice(app.indexOf('function disegnaCampiAzione('), app.indexOf('function leggiAzioneRiga('));
  for (const l of ['mod-regia-scene', 'mod-regia-fonti', 'mod-regia-transizioni']) assert.match(campi, new RegExp(`list="${l}"`), l);
  assert.match(campi, /_cons\.scene\)/, 'le scene lette dal programma, in pagina');
  assert.match(campi, /tienilo aperto mentre streami/, 'e l\'editor dice dove gira');
  assert.match(app, /ev\.target\.matches\('\[data-campo="cosa"\]'\)/, 'cambiando «cosa» cambiano i campi');
  const modelli = app.slice(app.indexOf('function modelloPronto('), app.indexOf("    case 'social':"));
  for (const c of ['brb', 'torno', 'raidscena']) assert.match(modelli, new RegExp(`case '${c}'`), c);
  assert.match(modelli, /nomiRegia\(\)/, 'i modelli prendono i nomi dalla regia collegata, se c\'e\'');
  assert.match(app, /data-modello="brb"/);
  assert.match(app, /data-modello="raidscena"/);
});

test('manuale, vetrina e novita\' lo dicono', () => {
  const man = testoManuali();
  assert.match(man, /'Regia: scena, muto o transizione', 'comanda il programma/);
  assert.match(man, /le quindici azioni/);
  assert.ok(!/quattordici azioni/.test(man));
  assert.match(man, /mi collego da solo appena apri il pannello/);
  const vet = leggi('src/web/vetrina-vista.js');
  assert.match(vet, /scheda: 'moduli', pacc: 'free', t: \['La regia dai comandi e dagli eventi'/);
  const nov = leggi('NOVITA.md');
  assert.match(nov, /I Moduli comandano la regia:.*\[vai: moduli\]/);
  assert.match(nov, /si ricollega da solo alla regia.*\[vai: consolify\]/);
});
