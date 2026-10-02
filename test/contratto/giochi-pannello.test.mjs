// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA SCHEDA GIOCHI & CLASSIFICHE: quello che il pannello dice quando qualcosa
// non va, e i nomi delle schede a cui manda.
//
// Le regole dei giochi, se il server non rispondeva, restavano «in
// caricamento» per sempre. La conferma di «Elimina» di una manche parlava del
// suo comando in chat, che una manche non ha. E i rimandi chiamavano le
// schede con nomi che non esistono («Comandi a voce», «Moduli»).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const APP = readFileSync(new URL('../../src/web/public/app.js', import.meta.url), 'utf8');

function funzione(nome) {
  const i = APP.search(new RegExp(`(?:async )?function ${nome}\\(`));
  assert.ok(i >= 0, `non trovo ${nome}`);
  let liv = 0;
  for (let j = APP.indexOf(') {', i) + 2; j < APP.length; j++) {
    if (APP[j] === '{') liv++;
    else if (APP[j] === '}' && --liv === 0) return APP.slice(i, j + 1);
  }
  throw new Error(`${nome} non si chiude`);
}

test('se le regole non arrivano, la carta dice l\'errore invece di restare in caricamento', async () => {
  const box = { innerHTML: 'in caricamento' };
  let disegnate = false;
  // eslint-disable-next-line no-new-func
  // il modulo delle attese uguali per tutti c'e' gia' (lo si carica una volta):
  // qui si prova la chiamata al server che non risponde
  const f = new Function('_g', 'api', 'L', 'esc', '_rgDisegna', '_regole', '_rgComuni', `${funzione('caricaRegoleGiochi')}\nreturn caricaRegoleGiochi;`);
  const carica = f(() => box, async () => { throw new Error('server giù'); }, (it) => it, (x) => x, () => { disegnate = true; }, null, { COMUNI: [] });
  await carica();
  assert.match(box.innerHTML, /Non riesco a leggere le regole dei giochi: server giù/);
  assert.equal(disegnate, false);
});

test('anche l\'elenco dei giochi fatti dice l\'errore, invece di dire che non ce n\'e\'', () => {
  const c = funzione('caricaGiochi');
  assert.ok(c.includes("api('/api/streamer/giochi').catch((e) => { errore = e; return []; })"));
  assert.ok(c.includes("errore ? `<li class=\"vuoto\">${L('Errore: ', 'Error: ', 'Error: ')}"));
});

test('eliminare una manche non parla di un comando in chat', () => {
  const c = funzione('caricaGiochi');
  const conferma = c.slice(c.indexOf('chiediSe('), c.indexOf("method: 'DELETE'"));
  assert.ok(conferma.includes('Non esce più nelle manche'));
  assert.ok(!/comando/i.test(conferma));
});

test('i rimandi chiamano le schede col loro nome, preso dall\'elenco delle schede', () => {
  const nomi = APP.slice(APP.indexOf('const T_SCHEDA = {'), APP.indexOf('const tScheda = '));
  assert.match(nomi, /moduli: \['Comandi', 'Commands', 'Comandos'\]/);
  assert.match(nomi, /ascolto: \['Comandi vocali', 'Voice commands', 'Comandos de voz'\]/);
  const giochi = funzione('pannelloGiochi');
  assert.ok(!/Comandi a voce|Voice commands →|Vai a Moduli|da Moduli/.test(giochi), 'niente nomi di schede che non esistono');
  assert.ok(giochi.includes("L(`Vai a ${tScheda('moduli')}`, `Go to ${tScheda('moduli')}`, `Ir a ${tScheda('moduli')}`)"));
  assert.ok(giochi.includes("dalla scheda «${tScheda('ascolto')}»"));
  assert.ok(funzione('pannelloPenitenze').includes("<em>${tScheda('ascolto')}</em>"));
});

test('le etichette dei giochi da creare non usano la lineetta lunga', () => {
  const giochi = funzione('pannelloGiochi');
  const carta = giochi.slice(giochi.indexOf("L('I tuoi giochi'"), giochi.indexOf("L('Classifica & VIP'"));
  assert.ok(carta.length > 1000, 'trovo la carta «I tuoi giochi»');
  assert.ok(!carta.includes('—'), 'nessuna «—» nella carta');
});

test('nell\'elenco dei giochi fatti il tipo si legge col nome del menù, nella lingua del pannello', () => {
  const c = funzione('caricaGiochi');
  assert.ok(c.includes("document.getElementById('gioco-tipo')?.options"), 'il nome viene dal menù dei tipi');
  assert.ok(c.includes('${esc(nomeTipo(g.tipo))}'));
  assert.ok(!c.includes('${esc(g.tipo)}'), 'non l\'identificativo interno');
});
