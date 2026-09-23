// LA SCHEDA STATO RISPONDE A «COME VA ADESSO?», E BASTA.
//
// Il ragionamento sta in docs/STATO.md. Qui le cose che devono restare vere:
//  · in Stato ci sono la diretta, il bot e cosa c'e' da sistemare; le cose
//    dell'account hanno la loro scheda, e ognuna sta in un posto solo;
//  · ogni scheda carica quello che mostra;
//  · la Home non conta niente di suo: i numeri li ha gia' chi li tiene;
//  · l'orologio si calcola dall'inizio, sull'ora del server;
//  · si aggiorna solo se la stai guardando;
//  · la prova del pannello ha una diretta sola, per la Home e per la Regia.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const SRV = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');

const funzione = (testo, nome) => {
  const i = testo.search(new RegExp(`(async )?function ${nome}\\(`));
  assert.ok(i >= 0, `c'e' ${nome}`);
  return testo.slice(i, testo.indexOf('\n}\n', i));
};

const DELL_ACCOUNT = ['piattaforme-box', 'btn-crea-passkey', 'lista-moderatori', 'btn-chiedi-mod', 'btn-installa', 'codici-posta', 'btn-esporta', 'det-cancella'];
const DELLA_CONOSCENZA = ['btn-pretrain', 'rete-panoramica'];

test('in Stato la diretta, il bot e cosa c\'e\' da sistemare; il resto nella sua scheda', () => {
  const s = funzione(APP, 'pannelloStato');
  for (const id of ['cartaAdessoHtml()', 'id="toggle-bot"', 'id="sel-modalita"', '${cardChatKO}', '${cardPermessi}', '${cardScope}']) {
    assert.ok(s.includes(id), `Stato ha ${id}`);
  }
  for (const id of [...DELL_ACCOUNT, ...DELLA_CONOSCENZA, 'btn-portale-abbonamento']) {
    assert.ok(!s.includes(`id="${id}"`), `#${id} non sta in Stato`);
  }
  const a = funzione(APP, 'pannelloAccount');
  for (const id of DELL_ACCOUNT) assert.ok(a.includes(`id="${id}"`), `#${id} sta in «Il tuo account»`);
  const c = funzione(APP, 'pannelloConoscenza');
  for (const id of DELLA_CONOSCENZA) assert.ok(c.includes(`id="${id}"`), `#${id} sta in Conoscenza`);
  for (const id of [...DELL_ACCOUNT, ...DELLA_CONOSCENZA, 'toggle-bot', 'carta-adesso']) {
    assert.equal(APP.split(`id="${id}"`).length - 1, 1, `#${id} sta in un posto solo`);
  }
  assert.ok(!APP.includes('btn-portale-abbonamento'), 'l\'abbonamento si gestisce dalla sua scheda, senza doppioni');
});

test('ogni scheda carica quello che mostra', () => {
  const d = funzione(APP, 'caricaDatiScheda');
  const riga = (id) => d.split('\n').find((r) => r.includes(`id === '${id}'`)) || '';
  assert.match(riga('stato'), /caricaAdesso\(\)/);
  for (const f of ['caricaPasskey', 'caricaModeratori', 'caricaRichiesteMod', 'caricaMieRichieste', 'caricaPiattaforme', 'caricaCodiciPosta', 'collegaCancella']) {
    assert.ok(riga('account').includes(`${f}()`), `«Il tuo account» chiama ${f}`);
    assert.ok(!riga('stato').includes(`${f}()`), `Stato non chiama piu' ${f}`);
  }
  assert.ok(riga('conoscenza').includes('caricaRetePanoramica()'), 'la rete si carica dove sta');
});

test('il menu ha Stato all\'inizio e «Il tuo account» nel gruppo Account', () => {
  const g = APP.slice(APP.indexOf('const GRUPPI = ['), APP.indexOf('\n];', APP.indexOf('const GRUPPI = [')));
  assert.match(g, /^const GRUPPI = \[\n {2}\{ id: 'inizio', nome: 'Stato', schede: \[\n {4}\['stato', 'Stato'\],\n {2}\] \},/, 'Stato e\' la prima voce, da sola');
  assert.match(g, /\{ id: 'account', nome: 'Account', schede: \[\n {4}\['account', 'Il tuo account'\],\n {4}\['sottoscrizione', 'Abbonamento'\],/);
  assert.match(APP, /const SOLO_DISCORD = new Set\(\[[^\]]*'account'/, 'anche chi ha solo Discord ha il suo account');
  const c = funzione(APP, 'navDrawerHtml');
  assert.ok(c.includes('g.schede.length === 1') && c.includes("ripete ? ''"), 'un titolo che ripete l\'unica voce non si scrive');
});

test('la Home non conta niente di suo: legge chi i numeri li tiene gia\'', () => {
  const i = SRV.indexOf("app.get('/api/streamer/adesso', requireLogin,");
  assert.ok(i > 0, 'la porta c\'e\', e chiede la sessione');
  const corpo = SRV.slice(i, SRV.indexOf('\n  }));', i));
  assert.ok(corpo.includes('helix.getStream(login)'), 'la diretta la dice Twitch');
  assert.ok(corpo.includes('} else if (corso && !risposto) {'), 'e se Twitch risponde che non sei in onda, la serata del bot non lo smentisce');
  assert.ok(corpo.includes('rapporto.inCorso(login'), 'la serata la tiene il rapporto');
  assert.ok(corpo.includes('rapporto.raccogli(login'), 'e la conta la stessa funzione del rapporto di fine diretta');
  assert.ok(corpo.includes('settimana.prossimaDiretta('), 'la prossima viene dalla settimana');
  assert.ok(corpo.includes('rapporti.elenco(login, 1)'), 'l\'ultima dai rapporti salvati');
  assert.ok(corpo.includes('ora,') || corpo.includes('ora:'), 'e dice che ore sono per il server');
  assert.ok(!/db\.prepare|SELECT /.test(corpo), 'nessuna query sua: un secondo conto prima o poi non torna');
});

test('l\'orologio si calcola dall\'inizio, sull\'ora del server', () => {
  const b = funzione(APP, '_battiOrologio');
  assert.ok(b.includes('_oraServer() - Number(el.dataset.dal)'), 'ogni battito rifa il conto dall\'inizio');
  assert.ok(!/\+= ?1|\+\+/.test(b), 'e non somma un secondo alla volta');
  assert.match(APP, /const _oraServer = \(\) => Date\.now\(\) \+ _adesso\.scarto;/);
  assert.match(funzione(APP, 'caricaAdesso'), /_adesso\.scarto = Number\(d\.ora\) \? Number\(d\.ora\) - Date\.now\(\) : 0;/,
    'lo scarto fra i due orologi si prende a ogni risposta');
});

test('si aggiorna solo se la stai guardando', () => {
  const c = funzione(APP, 'caricaAdesso');
  assert.match(c, /setTimeout\(\(\) => \{ if \(schedaAttiva === 'stato' && !document\.hidden\) caricaAdesso\(\); \}, 60_000\)/);
  assert.match(APP, /addEventListener\('visibilitychange', \(\) => \{\n {2}if \(!document\.hidden && schedaAttiva === 'stato'/, 'tornando sulla pagina si aggiorna subito');
  const b = funzione(APP, '_battiOrologio');
  assert.ok(b.includes("schedaAttiva !== 'stato'") && b.includes('clearInterval'), 'fuori da Stato l\'orologio si ferma');
  assert.ok(b.includes('document.hidden'), 'e a pagina nascosta non disegna');
});

test('la carta della diretta non si ripiega, e un numero cambiato si accende senza ricontare', () => {
  assert.match(funzione(APP, 'rendiCartePieghevoli'), /carta\.classList\.contains\('carta-viva'\)\) continue;/);
  const n = funzione(APP, '_numeroVivo');
  assert.ok(n.includes('prima === undefined ? `<b data-conta='), 'si conta da zero solo la prima volta');
  assert.ok(n.includes("prima !== v ? ' cambiato'"), 'dopo, un numero cambiato si accende');
});

test('la prova del pannello ha una diretta sola, per la Home e per la Regia', () => {
  assert.match(APP, /const _DEMO_DIRETTA = \{ dal: Date\.now\(\) - \d+,/);
  assert.ok(funzione(APP, '_demoAdesso').includes('_DEMO_DIRETTA.dal'));
  const r = funzione(APP, 'caricaRegia');
  assert.ok(r.includes('_DEMO_DIRETTA.dal') && r.includes('_DEMO_DIRETTA.gioco'), 'la Regia della prova e\' la stessa diretta');
  assert.ok(!r.includes('Date.now() - 5400000'), 'nessun secondo inizio inventato');
});
