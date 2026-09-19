// IL CARRELLO NON E' DI TWITCH.
//
// Chi preme «Attiva» sceglie i pacchetti PRIMA di dire chi e': in mezzo c'e' un
// giro dal fornitore, e quello che aveva scelto deve ritrovarselo dall'altra
// parte. Finche' quel ricordo e' vissuto dentro il flusso di Twitch, la scelta
// era di Twitch: chi trasmette solo su Kick veniva spedito a un login che non
// ha, e chi ci arrivava lo stesso perdeva il carrello per strada.
//
// Qui si fissa la forma che lo impedisce: un posto solo dove la scelta si
// ricorda, un gesto solo dove si riscuote, e le stesse tre parole per le porte
// da una parte e dall'altra — il nome che la pagina scrive dev'essere il nome
// che il server riconosce, altrimenti il tasto porta a Twitch in silenzio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { vetrinaHtml } from '../../src/web/vetrina-vista.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const senzaCommenti = (t) => t.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const leggi = (p) => senzaCommenti(readFileSync(join(RAD, p), 'utf8'));
const SRV = leggi('src/web/server.js');
const VET = leggi('src/web/public/vetrina-app.js');

const fetta = (t, da, a) => {
  const i = t.indexOf(da);
  assert.ok(i > 0, `manca nel sorgente: ${da}`);
  const j = a ? t.indexOf(a, i) : -1;
  return t.slice(i, j > 0 ? j : i + 4000);
};

const PIANI = {
  free: { nome: 'Essenziale' },
  base: { nome: 'Base', prezzo: 4.99, sommario: 'il canone' },
  addon: [{ id: 'clip', nome: 'Clip', sommario: 'le clip', prezzo: 1.99 }],
  bundle: [],
};

test('la scelta si ricorda in un posto solo, e si spende una volta sola', () => {
  const scritture = SRV.match(/req\.session\.compra = /g) || [];
  assert.equal(scritture.length, 1, 'un solo posto scrive il carrello: se sono due, uno dei due si dimentica');
  assert.match(fetta(SRV, 'function ricordaAcquisto', '\n  }'), /req\.session\.compra = \{ pacchetti, bundle/);

  const riscuoti = fetta(SRV, 'async function riscuotiAcquisto', '\n  }');
  assert.match(riscuoti, /delete req\.session\.compra;/, 'usa-e-getta: un checkout abbandonato non riparte da solo');
  assert.match(riscuoti, /avviaAcquisto\(\{ login, pacchetti/, 'e paga per il login appena nato, non per uno passato da fuori');
});

test('/accedi manda alla porta chiesta, e ricorda prima di partire', () => {
  const accedi = fetta(SRV, "app.get('/accedi', (req, res)", '\n  });');
  assert.match(accedi, /ricordaAcquisto\(req, req\.query\);/);
  assert.ok(accedi.indexOf('ricordaAcquisto') < accedi.indexOf("req.query.come"), 'prima si ricorda, poi si parte');
  assert.match(accedi, /come === 'kick'.*\/accedi\/kick/s, 'chi arriva da Kick va da Kick');
  assert.match(accedi, /come === 'youtube'.*\/accedi\/youtube/s, 'e chi arriva da YouTube va da YouTube');
  assert.match(accedi, /conKick \?|conKick\s*\?/, 'una porta chiusa non si spalanca su un 503');
  assert.doesNotMatch(accedi, /normalizzaPacchetti|bundleById/, 'i pacchetti li legge ricordaAcquisto, qui non si rifanno');
});

test('tutte e tre le porte riscuotono con lo stesso gesto', () => {
  const twitch = fetta(SRV, 'if (req.session?.selfFlow) {', 'if (req.session?.modFlow) {');
  assert.match(twitch, /await doveDopoAcquisto\(req, login\)/);
  const kick = fetta(SRV, 'montaKick(app, {', 'montaYoutube(app, {');
  assert.match(kick, /await doveDopoAcquisto\(req, login\)/, 'entrando da Kick il carrello e\' ancora suo');
  const yt = fetta(SRV, 'montaYoutube(app, {', "app.get('/api/streamer/piattaforme'");
  assert.match(yt, /await doveDopoAcquisto\(req, login\)/, 'e lo stesso entrando da YouTube');
  for (const [nome, blocco] of [['Kick', kick], ['YouTube', yt]]) {
    assert.ok(blocco.indexOf('req.session.user = sessionePer') < blocco.indexOf('doveDopoAcquisto'),
      nome + ': prima si e\' dentro, poi si paga');
  }
});

test('con una porta sola non si chiede niente', () => {
  const h = vetrinaHtml('it', { kick: false, youtube: false, piani: PIANI });
  assert.ok(h.includes('data-vai'), 'il tasto Attiva c\'e\'');
  assert.ok(!h.includes('data-chiedi'), 'ma non si apre un riquadro per una strada sola');
});

test('con piu\' porte la domanda e\' una sola, e i nomi sono quelli che il server capisce', () => {
  const h = vetrinaHtml('it', { kick: true, youtube: true, piani: PIANI });
  assert.equal((h.match(/data-chiedi/g) || []).length, 1, 'il riquadro sta in pagina una volta sola');
  assert.match(h, /class="vt-velo" data-chiedi hidden/, 'e nasce spento');
  // Le classi sono della vetrina, non del pannello: riusarne una di anime.css
  // farebbe caricare alla home il foglio del cruscotto (vedi verifica-dieta).
  assert.ok(!/bv-velo|bv-carta|mdl-carta/.test(h), 'la vetrina non prende in prestito lo stile del pannello');
  const nomi = [...h.matchAll(/data-porta="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(nomi, ['twitch', 'kick', 'youtube']);
  assert.match(h, /data-chiudi/, 'e si puo\' chiudere senza scegliere');
  const accedi = fetta(SRV, "app.get('/accedi', (req, res)", '\n  });');
  for (const n of nomi) {
    if (n === 'twitch') continue;                       // la casa: e' la strada di sempre, senza ?come
    assert.ok(accedi.includes(`come === '${n}'`), `la pagina offre \u00ab${n}\u00bb ma /accedi non lo riconosce`);
  }
  const soloKick = vetrinaHtml('it', { kick: true, youtube: false, piani: PIANI });
  assert.ok(soloKick.includes('data-porta="kick"') && !soloKick.includes('data-porta="youtube"'), 'una porta chiusa non si mostra');
});

test('la stessa domanda per «Inizia gratis» e per «Attiva»', () => {
  // Due tasti che portano allo stesso bivio non possono chiederlo in due modi
  // diversi: uno solo la faceva, e l'altro andava dritto su Twitch.
  const conto = fetta(VET, 'vai.addEventListener', 'aggiorna();');
  assert.match(conto, /chiediPorta\(function \(come\)/, '«Attiva» passa dalla domanda');
  assert.match(conto, /come !== 'twitch'/, 'e Twitch e\' la strada di sempre: non serve dirlo');
  const monta = fetta(VET, 'function montaChiedi()', '\n  }\n');
  assert.match(monta, /a\.vt-btn\[href\^="\/entra\?nuovo=1"\]/, 'e «Inizia gratis» pure');
  assert.match(monta, /ev\.preventDefault\(\)/, 'invece di partire per Twitch da solo');
  assert.match(monta, /'\/accedi\/' \+ come/, 'e da li\' si registra sulla piattaforma scelta');
});
