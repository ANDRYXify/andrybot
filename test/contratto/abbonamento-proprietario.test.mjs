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

// «HA GIA' IL BASE» non e' «ha degli extra». Chi aveva solo il Base vedeva il
// canone di nuovo nel totale e «Base + 1 extra», mentre l'acquisto lo metteva
// dentro l'abbonamento che aveva senza ripagare il Base. Ora la domanda e' una
// sola, e la fa il server per tutti e due.
test('il configuratore sa se il Base c\'e\' gia\', con la regola dell\'acquisto', () => {
  const regola = SRV.slice(SRV.indexOf('  function conBaseSuStripe(login) {'), SRV.indexOf('  // UN ACQUISTO, da qualunque porta'));
  assert.match(regola, /return !!\(s\?\.stripe_sub && s\?\.stripe_customer\) && subscriptions\.attivo\(login\);/);
  assert.match(rotta('  async function avviaAcquisto('), /if \(conBaseSuStripe\(login\)\) \{/, 'l\'acquisto usa la stessa domanda');
  assert.match(SRV, /conBase: conBaseSuStripe\(user\.login\) \}/, 'e il pannello la riceve');
  const s = funzione('caricaSottoscrizione');
  assert.match(s, /const haBase = !!ab\?\.conBase;/);
  assert.ok(s.includes('configuratoreHtml(piani, { gia: [...mieiPacchetti], haBase,') && s.includes('montaConfiguratore(box, piani, { gia: [...mieiPacchetti], haBase,'));
  const html = funzione('configuratoreHtml');
  const monta = funzione('montaConfiguratore');
  assert.ok(html.includes('${haBase\n      ? L(\'Spunta cosa aggiungere') && html.includes('_eur(haBase ? 0 : d.base.prezzo)'), 'testo e totale iniziale');
  assert.ok(monta.includes('const base = haBase ? 0 :') && monta.includes('vai.disabled = haBase && !ids.length;'), 'totale e tasto');
  assert.ok(!/posseduti\.size \? 0|posseduti\.size \?|posseduti\.size > 0 &&/.test(html + monta.replace('if (!ids.length || posseduti.size) return null;', '')),
    'avere degli extra non e\' piu\' il segnale del Base (resta solo per lo sconto dei pacchetti)');
});
