// Le pagine che si vedono quando qualcosa non c'è.
//
// Il 404 e la manutenzione sembrano parenti, ma hanno due vincoli opposti e
// sono quei vincoli a doverli tenere fermi: il 404 non deve DIRE niente, la
// manutenzione non deve CHIEDERE niente.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pagina404, paginaManutenzione, LINGUE_SERVIZIO } from '../../src/web/pagine-servizio.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (v) => readFileSync(join(RAD, v), 'utf8');

test('il 404 resta un labirinto: non dice mai se quella cosa esiste', () => {
  // Il server risponde 404 anche a ciò che ESISTE ma non si può vedere senza
  // sessione: è una scelta. Se la pagina suggerisse «accedi per vedere»
  // diventerebbe un oracolo, e basterebbe tastare il bordo per mappare il sito.
  const spie = [/accedi/i, /log ?in/i, /entra/i, /privat/i, /riservat/i, /permess/i,
    /sessione/i, /autoriz/i, /session/i, /sign ?in/i];
  for (const l of LINGUE_SERVIZIO) {
    const h = pagina404(l);
    for (const spia of spie) {
      assert.ok(!spia.test(h), `${l}: il 404 lascia capire qualcosa (${spia})`);
    }
    assert.ok(/noindex/.test(h), `${l}: il 404 non va indicizzato`);
    assert.ok(h.includes('<h1'), `${l}: il 404 è una pagina, non una riga`);
  }
});

test('la manutenzione non chiede NIENTE a nessuno', () => {
  // La serve l'edge perché il bot è proprio ciò che è giù: se la pagina
  // chiedesse un foglio di stile, un carattere o anche solo l'icona, quelle
  // richieste andrebbero al server spento e arriverebbe una pagina nuda.
  const m = paginaManutenzione();
  const chieste = [...m.matchAll(/(?:src|href)\s*=\s*"([^"]+)"/g)].map((x) => x[1]).filter((v) => v !== '/');
  assert.deepEqual(chieste, [], `la manutenzione chiede: ${chieste.join(', ')}`);
  assert.ok(!/<script/i.test(m), 'e non porta script: l’edge ha una CSP che li rifiuta');
  assert.ok(/lang="en"/.test(m) && /lang="es"/.test(m),
    'tre lingue in una pagina sola: qui non c’è nessun server che possa scegliere');
});

test('il file che l\'edge serve è quello che esce dal generatore', () => {
  // Il file sta in cartella perché lo legge Caddy, ma nasce dal modulo: se
  // qualcuno lo modifica a mano, il giorno che cambia la tavolozza resta
  // indietro. Questo contratto è ciò che rende il file una COPIA e non una
  // seconda verità.
  const dentro = leggi('pagine-servizio/manutenzione.html');
  assert.equal(dentro, paginaManutenzione(),
    'pagine-servizio/manutenzione.html è diverso: rigeneralo con node scripts/genera-manutenzione.mjs');
});

test('l\'edge sa mostrarla, e la prende da una cartella montata', () => {
  const caddy = leggi('Caddyfile');
  assert.ok(/handle_errors/.test(caddy), 'Caddy non gestisce gli errori del proxy');
  assert.ok(/\{err\.status_code\} in \[502, 503, 504\]/.test(caddy),
    'la pagina va mostrata quando l’origine non risponde, non su ogni errore');
  assert.ok(/rewrite \* \/manutenzione\.html/.test(caddy), 'non punta alla pagina');
  const comp = leggi('docker-compose.yml');
  assert.ok(/\.\/pagine-servizio:\/srv\/servizio:ro/.test(comp), 'la cartella non è montata');
  // Cartella e non file singolo: un montaggio di file segue l'inode, e dopo un
  // `git pull` che riscrive il file il container servirebbe ancora il vecchio.
  assert.ok(!/manutenzione\.html:\/srv/.test(comp),
    'va montata la CARTELLA, non il file: col file resterebbe appeso all’inode vecchio');
});

test('il 404 manda una pagina a chi voleva una pagina, e una riga agli altri', () => {
  const srv = leggi('src/web/server.js');
  const n = srv.slice(srv.indexOf('const notFound = (res)'), srv.indexOf('\n  };', srv.indexOf('const notFound = (res)')));
  assert.ok(/accept.*text\/html/s.test(n), 'non guarda cosa è stato chiesto');
  assert.ok(/type\('text\/plain'\)/.test(n), 'a chi chiedeva uno script deve restare la riga di prima');
  assert.ok(/no-store/.test(n), 'un 404 non si mette in cache');
});
