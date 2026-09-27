// LA SCHEDA PENITENZE: i tasti si collegano una volta, e l'interruttore segue
// quello che il server ha salvato.
//
// Due difetti. Creare un premio accende le penitenze sul server, ma
// l'interruttore restava spento: un «Salva» dopo, o un salvataggio automatico
// (l'effetto, la posizione del contatore), le rispegneva. E ogni caricamento
// della scheda riagganciava i tasti, cosi' dopo una creazione «Salva» partiva
// due volte. Qui si fanno girare le funzioni vere del pannello su una pagina
// finta, e si contano i collegamenti.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leggi = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const APP = leggi('src/web/public/app.js');
const SRV = leggi('src/web/server.js');

// Il testo di una funzione del pannello, dalla parola «function» alla graffa
// che la chiude.
function funzione(nome) {
  const i = APP.search(new RegExp(`(?:async )?function ${nome}\\(`));
  assert.ok(i >= 0, `non trovo ${nome}`);
  let liv = 0;
  for (let j = APP.indexOf('{', i); j < APP.length; j++) {
    if (APP[j] === '{') liv++;
    else if (APP[j] === '}' && --liv === 0) return APP.slice(i, j + 1);
  }
  throw new Error(`${nome} non si chiude`);
}

function paginaFinta() {
  const el = {};
  const collegati = {};
  const prendi = (id) => (el[id] ||= {
    id, dataset: {}, checked: false, textContent: '', value: '',
    addEventListener(tipo) { collegati[`${id}:${tipo}`] = (collegati[`${id}:${tipo}`] || 0) + 1; },
  });
  return { el, collegati, document: { getElementById: prendi } };
}

async function carica(pagina, volte) {
  const corpo = [funzione('_penInterruttore'), funzione('caricaPenitenze'), funzione('_penCollega')].join('\n');
  // eslint-disable-next-line no-new-func
  const f = new Function('document', 'L', 'conErrore', 'salvaPenitenze', 'toast', 'api', '_penMontaEffetto', '_penPremi',
    `${corpo}\nreturn { caricaPenitenze, _penInterruttore };`);
  const vuota = async () => {};
  const p = f(pagina.document, (it) => it, vuota, vuota, () => {}, vuota, vuota, vuota);
  for (let i = 0; i < volte; i++) await p.caricaPenitenze();
  return p;
}

test('ricaricare la scheda non riaggancia i tasti: «Salva» parte una volta sola', async () => {
  const pagina = paginaFinta();
  await carica(pagina, 3);
  for (const k of ['pen-salva:click', 'pen-attivo:change', 'pen-fuzzy:input', 'pen-ov-pos:change', 'pen-ov-col:change', 'pen-ov-prova:click']) {
    assert.equal(pagina.collegati[k], 1, `${k} collegato ${pagina.collegati[k]} volte`);
  }
});

test('l\'interruttore e la sua scritta si muovono insieme', async () => {
  const pagina = paginaFinta();
  const p = await carica(pagina, 1);
  p._penInterruttore(true);
  assert.equal(pagina.el['pen-attivo'].checked, true);
  assert.equal(pagina.el['pen-etichetta'].textContent, 'Penitenze attive');
  p._penInterruttore(false);
  assert.equal(pagina.el['pen-attivo'].checked, false);
  assert.equal(pagina.el['pen-etichetta'].textContent, 'Penitenze spente');
});

test('creato un premio, il pannello prende dal server le penitenze salvate e accende l\'interruttore', () => {
  const rotta = SRV.slice(SRV.indexOf("app.post('/api/penitenze/premio'"), SRV.indexOf("app.post('/api/penitenze/prova'"));
  assert.match(rotta, /res\.json\(\{ ok: true, reward, campo, penitenze \}\)/, 'il server risponde con quello che ha salvato');
  const premi = funzione('_penPremi');
  const crea = premi.slice(premi.indexOf("api('/api/penitenze/premio'"));
  assert.ok(crea.includes('stato.streamer.settings = { ...(stato.streamer.settings || {}), penitenze: r.penitenze }'), 'la copia del pannello si aggiorna');
  assert.ok(crea.includes('_penInterruttore(r.penitenze ? r.penitenze.attivo : true)'), 'l\'interruttore segue');
  assert.ok(!crea.includes('caricaPenitenze()'), 'si ridisegnano i premi, non si ricollega tutta la scheda');
});

test('senza il permesso dei punti canale, la carta manda ad «Aggiorna i permessi»', () => {
  const premi = funzione('_penPremi');
  assert.ok(premi.includes('href="/auth/permessi"'));
  assert.ok(!premi.includes('Effetti &amp; suoni'), 'non manda piu\' a una scheda che quel permesso non lo da\'');
  assert.ok(!APP.includes('scheda <em>Comandi a voce</em>'), 'la scheda si chiama «Comandi vocali»');
});
