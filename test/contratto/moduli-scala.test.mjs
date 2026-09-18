// LA SCALA: due elenchi, una regola sola.
//
// Il motore sa quali eventi portano un numero (QUANTITA_EVENTO in
// features/modules.js). Il pannello deve offrire le caselle della soglia
// ESATTAMENTE per quegli eventi (SCALA_EVENTO in web/public/app.js).
//
// Se il pannello ne offre uno in piu, quella casella non filtra niente e lo
// streamer scrive una scala che non esiste. Se ne offre uno in meno, il motore
// ha una scala che dal pannello non si puo scrivere. Nessuno dei due si nota
// guardando, quindi lo guarda questo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const chiavi = (file, nome) => {
  const src = readFileSync(file, 'utf8');
  const riga = new RegExp('const ' + nome + ' = \\{([^}]*)\\}').exec(src);
  assert.ok(riga, `non trovo ${nome} in ${file}`);
  return [...riga[1].matchAll(/(\w+)\s*:/g)].map((m) => m[1]).sort();
};

test("il pannello offre la soglia per gli stessi eventi che il motore misura", () => {
  const motore = chiavi('src/features/modules.js', 'QUANTITA_EVENTO');
  const pannello = chiavi('src/web/public/app.js', 'SCALA_EVENTO');
  assert.ok(motore.length >= 3, 'la mappa del motore non puo essere vuota');
  assert.deepEqual(pannello, motore);
});

test("ogni evento con una scala e un evento che il motore riceve davvero", () => {
  const src = readFileSync('src/features/modules.js', 'utf8');
  const mappa = /const MAPPA_EVENTI = \{([\s\S]*?)\n\};/.exec(src);
  assert.ok(mappa, 'non trovo MAPPA_EVENTI');
  const noti = [...mappa[1].matchAll(/'([a-z]+)',?\s*$/gm)].map((m) => m[1]);
  for (const ev of chiavi('src/features/modules.js', 'QUANTITA_EVENTO')) {
    assert.ok(noti.includes(ev), `${ev} ha una scala ma non e un evento che arriva`);
  }
});
