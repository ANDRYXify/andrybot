// PAGARE, AGGIUNGERE UN EXTRA E DISDIRE SONO COSE DEL PROPRIETARIO.
//
// Il checkout e il portale usavano l'identita' di chi era entrato: un
// moderatore che premeva «Attiva» nel pannello del canale che modera apriva un
// pagamento per il SUO canale, e il portale gli apriva i suoi pagamenti. E il
// pannello gli mostrava tutti i tasti.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const APP = readFileSync('src/web/public/app.js', 'utf8');
const SRV = readFileSync('src/web/server.js', 'utf8');

const rotta = (inizio) => {
  const i = SRV.indexOf(inizio);
  assert.ok(i > 0, inizio);
  return SRV.slice(i, SRV.indexOf('\n  }));', i));
};
const funzione = (nome) => {
  const i = APP.search(new RegExp(`(async )?function ${nome}\\(`));
  assert.ok(i >= 0, nome);
  return APP.slice(i, APP.indexOf('\n}\n', i));
};

test('il checkout e il portale sono del proprietario del canale gestito', () => {
  const c = rotta("app.post('/api/abbonamento/checkout'");
  assert.match(c, /if \(u && !isOwner\(req\)\) return res\.status\(403\)/, 'un moderatore non paga da qui');
  assert.match(c, /const login = u \? String\(u\.login \|\| ''\)\.toLowerCase\(\) : String\(req\.session\?\.abbonando\?\.login/, 'si paga per il canale gestito, o per chi e\' entrato solo per abbonarsi');
  assert.ok(!c.includes('identitaDi('), 'non per l\'identita\' di chi e\' entrato');
  const p = rotta("app.post('/api/abbonamento/portale'");
  assert.match(p, /^app\.post\('\/api\/abbonamento\/portale', requireOwner,/);
  assert.ok(p.includes('subscriptions.get(currentUser(req).login)') && !p.includes('identitaDi('));
});

test('al moderatore il pannello non mostra i tasti per pagare', () => {
  const s = funzione('caricaSottoscrizione');
  assert.match(s, /const vende = proprietario && /, 'niente configuratore');
  assert.match(s, /\(proprietario && altri\.length && tier !== 'community'/, 'niente «Puoi aggiungere»');
  assert.ok(s.includes(": !proprietario\n      ? `<p class=\"suggerimento\">${L('Pagare, aggiungere un extra e disdire sono cose del proprietario del canale.'"), 'e al posto del portale lo dice');
  assert.match(funzione('muroPacchetto'), /const compra = !!stato\?\.stripeAttivo && !!addon && stato\?\.ruolo !== 'moderatore';/);
  assert.match(funzione('paginaBloccata'), /const puoComprare = !!stato\?\.stripeAttivo && !!addon && proprietario;/);
});
