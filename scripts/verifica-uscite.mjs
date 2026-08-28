// Cancello delle VIE D'USCITA.
//
// L'invariante: nessuna pagina e' un vicolo cieco. Le viste che sostituiscono
// il cruscotto (richiesta, in attesa, disabilitato) capitano anche a chi non le
// ha cercate — un moderatore che cambia canale e sceglie il proprio, che il bot
// non ce l'ha. Da li' deve poter tornare dove stava con un clic.
//
// Il difetto vero che questo cancello impedisce e' doppio:
//  1. una vista senza cruscotto che non offre nessuna uscita;
//  2. l'uscita disegnata ma agganciata a mano PRIMA che il pezzo esista nel
//     DOM (render() scrive app.innerHTML dopo renderAreaUtente()), quindi
//     l'aggancio non trova niente e il pulsante e' finto.
// La difesa contro il 2 e' strutturale: l'aggancio sta su document, delegato.
//
// L'elenco delle viste NON e' scritto qui: si ricava da render(). Se domani
// nasce una quarta vista senza cruscotto, il cancello la copre da sola.
//
// Uso: node scripts/verifica-uscite.mjs   (esce 1 se qualcosa non torna)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');

const esiti = [];
const dice = (ok, msg) => esiti.push({ ok, msg });

const corpoDi = (nome) => {
  const i = app.indexOf(`function ${nome}(`);
  if (i < 0) return null;
  let liv = 0, dentro = false;
  for (let j = app.indexOf('{', i); j < app.length; j++) {
    if (app[j] === '{') { liv++; dentro = true; }
    else if (app[j] === '}') { liv--; if (dentro && liv === 0) return app.slice(i, j + 1); }
  }
  return null;
};

// ---- 1. quali viste sostituiscono il cruscotto? lo dice render() ----------
const render = corpoDi('render');
dice(!!render, 'render() si legge');
const chain = render ? render.slice(render.indexOf('let html'), render.indexOf('app.innerHTML')) : '';
const viste = [...new Set([...chain.matchAll(/html \+= (vista[A-Za-zÀ-ú]+)\(\)/g)].map((m) => m[1]))]
  .filter((v) => v !== 'vistaPiattaforma');
dice(viste.length >= 3, `viste senza cruscotto trovate in render(): ${viste.join(', ') || 'nessuna'}`);

// ---- 2. ognuna offre la via d'uscita -------------------------------------
for (const v of viste) {
  const c = corpoDi(v);
  dice(!!c && c.includes('rigaUscita('), `${v}() offre la via d'uscita`);
}

// ---- 3. l'uscita e' un pulsante verso un canale davvero altro -------------
const uscita = corpoDi('rigaUscita') || '';
dice(uscita.includes('data-torna-canale'), 'la via d\'uscita e\' un pulsante marcato data-torna-canale');
dice((corpoDi('altroCanale') || '').includes('c.canale !== stato.user.login'),
  'porta su un canale diverso da quello dove si e\' bloccati');
dice(uscita.includes("if (!azione && !torna) return '';"),
  'a chi non ha altri canali non mostra una riga vuota');

// ---- 4. l'aggancio e' delegato, non messo a mano prima del render ---------
// Non basta che i due pezzi esistano: il selettore dell'uscita deve stare
// DENTRO un listener registrato su document. Risalgo dal selettore al listener
// che lo contiene e guardo su chi e' registrato.
const usi = [...app.matchAll(/\[data-torna-canale\]/g)]
  .map((m) => m.index)
  .filter((i) => !app.slice(Math.max(0, i - 60), i).includes('data-torna-canale="'));
dice(usi.length > 0, 'qualcuno raccoglie il clic sul pulsante di uscita');
for (const i of usi) {
  const prima = app.slice(0, i);
  const reg = prima.lastIndexOf("addEventListener('click'");
  const su = reg < 0 ? '' : prima.slice(Math.max(0, reg - 20), reg);
  dice(reg >= 0 && /document\.$/.test(su),
    'il clic e\' raccolto da document (regge il ridisegno di app.innerHTML)');
}
dice(!/getElementById\(['"][^'"]*torna[^'"]*['"]\)/.test(app),
  'nessun aggancio a mano al pulsante di uscita');

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg);
console.log(rossi.length ? `\n${rossi.length} cose non tornano.` : '\nNessuna pagina e\' un vicolo cieco. ✓');
process.exit(rossi.length ? 1 : 0);
