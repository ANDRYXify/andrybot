// I TESTI DELLE SCHEDE DELLA DIRETTA (Regia, Clip, Musica) DICONO IL VERO, NELLE
// TRE LINGUE. Ognuna di queste frasi era sbagliata in un modo che chi legge
// nota: una lingua rimasta in un'altra, un verbo che non concorda, un percorso
// che non esiste piu', un elenco che non e' quello dei tasti.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const pezzo = (da, a) => APP.slice(APP.indexOf(da), APP.indexOf(a, APP.indexOf(da)));

test('il muro delle clip automatiche concorda col plurale, e quello chiuso non dipende dal nome', () => {
  const muro = pezzo('function muroPacchetto(', '\n}\n');
  assert.match(muro, /plurale \? L\('non sono nel tuo piano\.', 'are not in your plan\.', 'no están en tu plan\.'\)/);
  assert.ok(!/\$\{esc\(cosa\)\} \$\{L\('è chiuso/.test(muro), 'niente «X è chiuso» che non concorda con X');
  assert.match(APP, /muroPacchetto\('clipAuto', L\('Le clip automatiche'[^)]*\), \{ plurale: true \}\)/);
});

test('la carta delle clip, l\'elenco e il riquadro dei premi parlano tutte e tre le lingue', () => {
  const clip = pezzo('function pannelloClip(', 'function pannelloAscolto(');
  assert.ok(!clip.includes("'And it adapts"), 'lo spagnolo non è più in inglese');
  assert.ok(!/arrivano<\/strong>|arrivano\. E si adatta/.test(clip), '«arrivano» una volta sola');
  const elenco = pezzo('async function caricaClip(', 'let _regole');
  assert.ok(!elenco.includes('<li class="vuoto">Nessuna clip') && !elenco.includes('<li class="vuoto">Errore'), 'niente frasi fuori da L()');
  assert.match(elenco, /L\('Nessuna clip ancora/);
  const musica = pezzo('function pannelloMusica(', 'async function salvaMusica(');
  assert.ok(!musica.includes('<p>Gli spettatori richiedono') && !musica.includes('Carico i tuoi premi…</p>'), 'il riquadro dei premi non è più solo in italiano');
});

test('il permesso dei premi della Musica si concede da dove si concede davvero', () => {
  const premi = pezzo('async function caricaPremiMusica(', 'async function caricaSpotify(');
  assert.ok(!premi.includes('Effetti &amp; suoni'), 'niente percorso che non esiste più');
  assert.match(premi, /<a href="\/auth\/permessi">/, 'il collegamento porta ai permessi');
});

test('la Regia ha un nome solo, e la sua guida elenca le azioni che ha davvero', () => {
  const fam = pezzo('const FAM_ETI = {', '};');
  assert.match(fam, /inonda: \['Regia', 'Control room', 'Realización'\]/, 'barra e scheda si chiamano uguale');
  assert.match(APP, /regia: \['Regia', 'Control room', 'Realización'\]/);
  assert.match(APP, /'Usa le azioni rapide durante la live: clip, marker, pubblicità, raid\.', '[^']*clips, markers, ads, raids\.', '[^']*clips, marcadores, anuncios, raids\.'/);
});

test('nelle etichette della diretta e di CONSOLify non ci sono lineette lunghe come pausa', () => {
  for (const vecchia of ['Libere — tutti', 'collegato — da qui', 'nessun overlay collegato — ', 'SVG — max 2 MB', '<span class="tenue">— ${L(\'separati', "gameName || L('— nessuna —'", 'del canale — senza aprire']) {
    assert.ok(!APP.includes(vecchia), vecchia);
  }
});
