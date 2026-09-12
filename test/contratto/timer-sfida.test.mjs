// IL CONTO ALLA ROVESCIA PARTE QUANDO LO ACCENDI; LA SFIDA A TEMPO E' UN ELEMENTO.
//
// «Ho spuntato "parte da solo" ma se non premo "fai partire" non parte»: la
// spunta faceva partire il conto solo quando una sorgente ricaricava la pagina
// dell'overlay, e il pannello non lo veniva mai a sapere. Ora parte nel momento
// in cui la si accende (il passaggio spento → acceso, non lo stato), il
// pannello riceve l'istante di fine e lo mostra contare, e aprendo lo Studio
// chiede dov'e' il conto. La carta della penitenza dei punti canale, che aveva
// solo un angolo scelto altrove, e' un elemento della scena come gli altri.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const SRV = leggi('src/web/server.js');
const APP = leggi('src/web/public/app.js');
const OVL = leggi('src/web/public/overlay-app.js');
const HTML = leggi('src/web/public/overlay.html');
const SKIN = leggi('src/web/public/overlay-skin.css');

test('il conto con «parte da solo» parte al passaggio spento → acceso, e il pannello lo viene a sapere', () => {
  assert.ok(/const acceso = out\.overlayTimer\.attivo && out\.overlayTimer\.partiDaSolo && !\(prima\.attivo && prima\.partiDaSolo\);/.test(SRV),
    'si guarda il passaggio, non lo stato: salvare un titolo non fa ripartire un conto finito');
  assert.ok(/timerFine = acceso \? \(manager\.alerts\?\.avviaTimerSePronto\?\.\(user\.login\) \|\| 0\)/.test(SRV), 'parte con la stessa funzione che usa l\'overlay: se gia\' corre, non riparte');
  assert.ok(/res\.json\(timerFine == null \? \{ ok: true \} : \{ ok: true, timerFine \}\);/.test(SRV), 'l\'istante di fine torna a chi ha salvato');
  assert.ok(/app\.get\('\/api\/streamer\/timer', requireLogin/.test(SRV), 'e si puo\' chiedere dov\'e\' il conto');
  assert.ok(/const d = await api\('\/api\/streamer\/impostazioni', \{ method: 'POST', body: parziale \}\);[\s\S]{0,200}return d;/.test(APP), 'salvaImpostazioni restituisce la risposta');
  assert.ok(/\.then\(\(d\) => \{ if \(k === 'timer' && d && d\.timerFine != null\) _segnaTimer\(d\.timerFine\); \}\)/.test(APP), 'il salvataggio a tempo del conto aggiorna il pannello');
  assert.ok(/if \(k === 'timer' && d && d\.timerFine != null\) _segnaTimer\(d\.timerFine\);\n    \}\);/.test(APP), 'anche il tasto «Salva»');
  assert.ok(/api\('\/api\/streamer\/timer'\)\.then\(\(d\) => \{ if \(d && d\.fine != null\) _segnaTimer\(Number\(d\.fine\) \|\| 0\); \}\)/.test(APP), 'aprendo lo Studio si chiede dov\'e\' il conto');
});

test('la sfida a tempo e\' un elemento della scena, di qua e di la\' dal filo', () => {
  assert.ok(/const ELEM_OVERLAY = \[[^\]]*'pen'/.test(SRV) && /const ELEM_OVL = \[[^\]]*'pen'/.test(APP) && /ovlElemento\('pen'/.test(APP), 'nell\'elenco degli elementi, da tutte e due le parti');
  assert.ok(/const CHIAVE_EL = \/\^\(alert\|chat\|wf\|ws\|musica\|timer\|pen\|/.test(SRV), 'la sua posizione passa dalla stessa porta delle altre');
  assert.ok(/if \(mostra\('pen'\)\) penitenza\(dati\);/.test(OVL), 'si accende e si spegne per overlay col suo interruttore');
  assert.ok(/function penPosa\(\) \{ posizionaContenitore\(penBox, MIO\.xy\.pen, penBox\._angolo \|\| 'alto-destra'\); \}/.test(OVL), 'si posa come gli altri: punto, riquadro o angolo');
  const i = OVL.indexOf('function penStart(');
  const corpo = OVL.slice(i, OVL.indexOf('\n}\n', i));
  assert.ok(corpo.indexOf('penBox.appendChild(card)') < corpo.indexOf('penPosa()'), 'la posa dopo il contenuto');
  assert.ok(/card\._orologio = setInterval\(batti, 1000\);/.test(corpo) && /clearInterval\(card\._orologio\);/.test(OVL), 'sulla carta si legge quanto manca, e l\'orologio si spegne alla fine');
  assert.ok(!/\.pen-card \{/.test(HTML) && /^\.pen-card \{/m.test(SKIN) && /\.pen-card \.pen-tempo \{ font-variant-numeric: tabular-nums;/.test(SKIN), 'la veste della carta sta nella pelle, che legge anche la tela');
  assert.ok(/out\.push\(\{ k: 'pen', ico: ICO\.penitenza, n: L\('Sfida a tempo'[^}]*cfg: 'penitenze' \}\);/.test(APP), 'nei livelli, con la sua configurazione');
  assert.ok(/else if \(e\.k === 'pen'\) _vestiPen\(nodo\.firstElementChild, _cfgEl\('pen'\)\);/.test(APP) && /function _vestiPen\(box, cfg\)/.test(APP), 'sulla tela c\'e\' la sua carta');
  assert.ok(/if \(k === 'pen'\) return \(_cfgEl\(k\)\.overlay \|\| \{\}\)\.posizione \|\| 'alto-destra';/.test(APP), 'l\'angolo di serie e\' quello scelto nelle penitenze');
  assert.ok(/if \(ELEM\(k\)\?\.cfg\) \{ _accendiDi\(k, v\); salvaCfgElemento\(k\); return true; \}/.test(APP), 'il chip «spento — accendi» accende davvero anche player, conto e sfida');
});

test('la busta dell\'evento della sfida non si fa sovrascrivere dal contenuto', async () => {
  const PEN = leggi('src/features/penitenze.js');
  assert.ok(/this\.effects\.emit\(channel, \{ \.\.\.payload, tipo: 'penitenza' \}\)/.test(PEN), 'la busta si scrive per ultima');
  assert.ok(!/azione: 'start', id, modo, tipo,/.test(PEN) && /azione: 'start', id, modo, cosa: tipo,/.test(PEN), 'cio\' che la sfida vieta viaggia come «cosa», non col nome della busta');
  const { cartellaUsaEGetta } = await import('../aiuto.mjs');
  const usaEGetta = cartellaUsaEGetta('andrybot-sfida-');
  try {
    const { PenitenzeEngine } = await import('../../src/features/penitenze.js');
    const usciti = [];
    const motore = new PenitenzeEngine({ say: () => {}, effects: { emit: (ch, ev) => usciti.push({ ch, ev }) } });
    motore.prova('canale');
    await new Promise((r) => setTimeout(r, 2900));
    assert.deepEqual(usciti.map((u) => u.ev.tipo), ['penitenza', 'penitenza', 'penitenza', 'penitenza'], 'ogni evento esce con la busta giusta, dall\'avvio alla fine');
    assert.deepEqual(usciti.map((u) => u.ev.azione), ['start', 'hit', 'hit', 'end']);
    assert.equal(usciti[0].ev.cosa, 'parola');
    assert.equal(usciti[0].ev.durata, 1);
    assert.ok(usciti[0].ev.posizione && usciti[0].ev.colore, 'con angolo e colore scelti nelle penitenze');
    assert.ok(/ovl\.manda\(\{ azione: 'start', id: 'p1', modo: 'vieta', cosa: 'parola'[^}]*tipo: 'penitenza' \}\);/.test(leggi('scripts/verifica-anteprima.mjs')), 'il cancello manda l\'evento com\'e\' davvero');
  } finally { usaEGetta.pulisci(); }
});
