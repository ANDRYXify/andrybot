// I MURI. Una funzione a pagamento e' tale solo se il muro sta DOVE LA FUNZIONE
// PARTE: il server che riceve la richiesta, il bot che manda l'avviso o fa la
// clip, la chiave API usata da fuori. Il salvataggio delle impostazioni non
// basta: un piano scaduto lascia in piedi le impostazioni salvate prima, e la
// funzione continuerebbe a lavorare gratis. E dall'altra parte, nel pannello,
// ogni funzione chiusa deve avere un muro visibile che dica quale pacchetto la
// apre — non un errore dopo il tentativo.
//
// Le chiavi a pagamento non stanno scritte qui: si leggono dal catalogo. Se un
// domani una funzione passa a pagamento, questo test chiede il suo muro da solo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as ab from '../../src/features/abbonamenti.js';

const SRV = readFileSync('src/web/server.js', 'utf8');
const BOT = readFileSync('src/bot.js', 'utf8');
const CLIPS = readFileSync('src/features/clips.js', 'utf8');
const APP = readFileSync('src/web/public/app.js', 'utf8');
const HOME = readFileSync('src/web/public/index.html', 'utf8');

// le chiavi che l'Essenziale NON ha: quelle, e solo quelle, sono a pagamento
const FREE = ab.funzioniDi({ tier: 'free' });
const A_PAGAMENTO = Object.keys(ab.funzioniDi({ tier: 'community' })).filter((k) => !ab.abilitata(FREE, k));

test('le chiavi a pagamento sono quelle attese, e «telegram» viaggia sempre con «notifiche»', () => {
  assert.deepEqual([...A_PAGAMENTO].sort(), ['clipAuto', 'moderatori', 'notifiche', 'studio', 'telegram', 'voce']);
  for (const piano of [{ tier: 'free' }, { tier: 'base' }, { tier: 'community' }, { tier: 'base', pacchetti: ['clip'] }]) {
    const f = ab.funzioniDi(piano);
    assert.equal(ab.abilitata(f, 'telegram'), ab.abilitata(f, 'notifiche'), JSON.stringify(piano));
  }
});

test('ogni chiave a pagamento ha almeno un muro sul server, dove la richiesta arriva', () => {
  const muri = {
    clipAuto: /abilitata\(F, 'clipAuto'\)|A\('clipAuto'\)/,
    voce: /gateFeature\('voce'|abilitata\(F, 'voce'\)/,
    notifiche: /gateFeature\('notifiche'/,
    studio: /gateFeature\('studio'/,
    moderatori: /limiteTier\(req, 'moderatori'\)/,
  };
  for (const k of A_PAGAMENTO) {
    if (k === 'telegram') continue;   // sinonimo di notifiche, sopra
    assert.match(SRV, muri[k], `${k}: nessun muro nel server`);
  }
  // le porte laterali: i nuovi post via feed, la Mini App Telegram, la chiave API
  for (const rotta of ["app.post('/api/streamer/feed', requireLogin, gateFeature('notifiche'", "app.patch('/api/streamer/feed/:id', requireLogin, gateFeature('notifiche'", "app.delete('/api/streamer/feed/:id', requireLogin, gateFeature('notifiche'", "app.post('/api/tgapp/toggle', requireOwner, gateFeature('notifiche'", "app.post('/api/tgapp/collega', requireOwner, gateFeature('notifiche'"]) {
    assert.ok(SRV.includes(rotta), `porta aperta: ${rotta.slice(0, 60)}`);
  }
  const ext = SRV.slice(SRV.indexOf("app.post('/api/ext/:login'"), SRV.indexOf('PORTARSI VIA I PROPRI DATI'));
  assert.ok(/abilitata\(F, 'voce'\) && !abbonamenti\.abilitata\(F, 'clipAuto'\)/.test(ext), 'la clip via API segue il piano');
  assert.equal((ext.match(/abilitata\(F, 'notifiche'\)/g) || []).length, 2, 'diretta TikTok e nuovi post via API seguono il piano');
});

test('il bot rispetta il piano dove la funzione parte, non solo dove si salva', () => {
  const dentro = (fn, re) => { const da = BOT.indexOf(fn); assert.ok(da > 0, fn); const blocco = BOT.slice(da, da + 1400); assert.match(blocco, re, `${fn} non guarda il piano`); };
  dentro('async annunciaDiretta(d) {', /canaleHa\(login, 'notifiche'\)/);
  dentro('async notificaPost(login,', /canaleHa\(l, 'notifiche'\)/);
  dentro('async notificaTikTok(login) {', /canaleHa\(l, 'notifiche'\)/);
  dentro('async reconcileListeners() {', /canaleHa\(s\.login, 'voce'\)/);
  assert.equal((CLIPS.match(/canaleHa\(channel, 'clipAuto'\)/g) || []).length, 2, 'le clip automatiche (chat ed eventi) seguono il piano');
});

test('nel pannello ogni funzione a pagamento ha un muro visibile con il pacchetto che la apre', () => {
  const schede = APP.match(/const SCHEDA_FUNZ = \{([^}]*)\}/)[1];
  const addon = APP.match(/const FUNZ_ADDON = \{([^}]*)\}/)[1];
  for (const k of ['voce', 'notifiche', 'studio']) assert.ok(schede.includes(`'${k}'`), `${k}: nessuna scheda murata`);
  for (const k of ['clipAuto', 'voce', 'notifiche', 'studio', 'moderatori']) assert.ok(new RegExp(`\\b${k}: '`).test(addon), `${k}: non si sa quale pacchetto la apre`);
  assert.ok(APP.includes("muroPacchetto('clipAuto'"), 'le clip automatiche hanno il muro dentro la scheda');
  assert.ok(APP.includes("muroPacchetto('moderatori'"), 'i moderatori hanno il muro dentro la scheda');
  assert.ok(APP.includes('data-sblocca="squadra"'), 'con un posto solo si propone «Squadra»');
  assert.ok(APP.includes("const sb = ev.target.closest('[data-sblocca]')"), 'il tasto di sblocco ha un gestore');
  assert.ok(SRV.includes('funzioni: abbonamenti.funzioniPubbliche(funzioniDi(user.login))'), '«illimitato» arriva al pannello come -1, non come null');
});

test('quello che si vende è scritto uguale in vetrina, nei dati strutturati e nel listino demo', () => {
  const p = ab.pianiPubblici();
  const venduti = p.addon.map((a) => a.id).sort();
  assert.deepEqual(venduti, ['clip', 'squadra', 'voce']);
  const demo = APP.slice(APP.indexOf("'/api/abbonamento/piani': {"), APP.indexOf("'/api/linkpage': {"));
  for (const id of venduti) assert.ok(demo.includes(`id: '${id}'`), `listino demo senza ${id}`);
  for (const id of p.ritirati) assert.ok(!demo.includes(`id: '${id}'`), `listino demo offre ancora ${id}`);
  const essenziale = HOME.match(/"name": "Essenziale",\s*"description": "([^"]+)"/)[1];
  for (const parola of ['giochi', 'sondaggi', 'Spotify']) assert.ok(essenziale.includes(parola), `l'offerta Essenziale non dice «${parola}»`);
  assert.ok(HOME.includes(`"price": "${ab.BASE.prezzo.toFixed(2)}"`), 'il prezzo del Base nei dati strutturati e\' quello del catalogo');
});

test('un prezzo che Stripe non conferma non si vende', () => {
  assert.equal(typeof ab.verificaPrezziStripe, 'function');
  assert.equal(ab.vendibile({ id: 'x' }), true, 'senza prezzo non c\'e\' niente da verificare');
  const src = readFileSync('src/features/abbonamenti.js', 'utf8');
  assert.ok(src.includes("if (!config.stripe.attivo || !basePrice || !vendibile(BASE)) return null;"));
  assert.ok(src.includes('if (b && (b.ritirato || !vendibile(b))) return null;'));
  assert.ok(src.includes('return a && !a.ritirato && !a.inclusoBase && vendibile(a);'), 'ne\' ritirati ne\' compresi nel Base si pagano a parte');
  assert.ok(SRV.includes('abbonamenti.sorvegliaPrezzi();'), 'la ricerca dei prezzi parte all\'avvio e si ripete');
});
