// DUE PORTE CON LO STESSO INDIRIZZO: la seconda non risponde mai.
//
// Express prende la prima che combacia. Percio' scrivere due volte
// `app.post('/api/…/qualcosa')` non e' un errore che qualcuno segnala: e' una
// funzione che smette di esistere in silenzio, e quella che smette e' la
// vecchia — cioe' una cosa che prima funzionava.
//
// E' successo davvero mentre si scrivevano i messaggi della pubblicita': la
// porta nuova si chiamava come quella che fa partire la pubblicita' a mano, e
// il tasto «Manda pubblicita'» avrebbe smesso di mandarla senza dire niente.
//
// L'unico doppione legittimo e' quello in cui il PRIMO passa la mano
// (`next()`): li' la seconda risponde davvero, ed e' il modo con cui si mette
// un filtro davanti a una pagina. Non e' un elenco di eccezioni scritto a
// mano: e' la differenza fra «passo» e «rispondo», e si legge dal codice.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SRV = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');

test('nessuna porta e\' scritta due volte, se non per passare la mano', () => {
  const trovate = [...SRV.matchAll(/app\.(get|post|put|patch|delete|all)\((?:'|`)([^'`]+)(?:'|`)/g)];
  assert.ok(trovate.length > 200, `porte lette: ${trovate.length}`);

  const per = new Map();
  for (const m of trovate) {
    const k = `${m[1].toUpperCase()} ${m[2]}`;
    if (!per.has(k)) per.set(k, []);
    per.get(k).push(m.index);
  }

  const morte = [];
  for (const [via, dove] of per) {
    if (dove.length < 2) continue;
    // Ogni copia tranne l'ultima deve passare la mano, se no quella dopo e'
    // codice che non gira. Si guarda il pezzo che sta fra una e l'altra.
    for (let i = 0; i < dove.length - 1; i++) {
      const corpo = SRV.slice(dove[i], dove[i + 1]);
      if (!/\bnext\(\)/.test(corpo)) morte.push(via);
    }
  }
  assert.deepEqual(morte, [], 'queste porte non rispondono mai: ne esiste un\'altra prima, con lo stesso indirizzo');
});
