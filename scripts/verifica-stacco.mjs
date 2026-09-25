// Cancello dello STACCO fra vignette: il sito si disegna, non si anima.
//
// Cambiando scheda la vignetta vecchia si disegna all'indietro, poi la nuova
// si disegna: fra due sezioni e anche fra due SOTTOSEZIONI della stessa
// famiglia. Prima fra sorelle non si disfaceva niente («da azione ad azione»,
// la stessa scena), e le carte vecchie sparivano di colpo: tutto quello che se
// ne va si disfa. Della scena fa parte anche la testata: la descrizione, la
// barra delle sorelle, i tasti, il riquadro «Come funziona». Disegnare vuol dire matita,
// china sul bordo vero, retino che scopre il contenuto, pulizia; all'indietro
// torna la matita, il retino ricopre, la china e la matita si ritirano. Il
// modello sta in docs/DISEGNO.md, il disegno in src/web/public/disegno.js.
//
// Perche' col browser. Il disegno e' una vista di come l'app cambia le classi
// (`visibile`, `esce`, `dentro`...), e quale strada prende dipende da
// `stessaFamiglia()` e da una catena di tempi. Leggendo il codice sembra sempre
// tutto a posto; l'unico modo di sapere cosa si disegna e' guardare la pagina
// mentre succede. Non si sbircia a istanti: si OSSERVA ogni tela che nasce.
//
// La prima versione di questo cancello, quando le carte entravano di lato,
// leggeva il testo di una variabile invece dello spostamento vero, ed era verde
// mentre le carte stavano ferme. Qui si guarda cosa nasce nel documento: le
// tele che disegnano e quelle che disfano, dove stanno, in che ordine partono.
// Il bianchetto che c'era prima cancellava una macchia a caso in mezzo al
// pannello, e questo cancello era verde: contava che una tela ci fosse, non
// quante vignette c'erano da disfare. Adesso le conta.
//
// Il cassetto del menu' sul telefono. Scorreva, «perche' e' un cassetto», ed
// era l'unica cosa che entrava e usciva senza disegnarsi. Chiesto: «quando
// schiaccio la x qui deve fare la solita animazione disegnata, non la
// transizione». Adesso si disegna e si disfa come il menu' a tutto schermo, e
// qui lo si guarda da un telefono, per ogni strada che lo chiude: la X, il
// velo, Esc, una voce, il tasto della barra in basso. Il cassetto non si
// sposta mai; la sua china ha tre lati, come il suo bordo; chiudendolo resta
// al suo posto finche' si e' disfatto, e il velo sfuma insieme.
//
// Il menu' IN OGNI CASO. «Che sia quando compare o quando scompare il menu
// deve venire disegnato in ogni caso». Le strade sono tante (il tasto, il
// velo, una voce, il tutto schermo, la finestra che si allarga o si stringe,
// il tablet che gira, la pagina che si carica) e contarle una per una e' il
// modo sicuro di dimenticarne una. Qui non si contano le strade: si guarda il
// menu' a ogni fotogramma, dal caricamento alla fine, e si controlla la
// regola sola: ogni volta che si vede in una forma nuova lo si vede
// disegnarsi, ogni volta che sparisce lo si e' visto disfarsi. Visto vuol dire
// la china a meta' strada (0 < stroke-dashoffset < 1), non una classe messa:
// con «meno movimento» una regola del foglio di stile riduceva ogni
// animazione a un millesimo di millisecondo, e le classi c'erano lo stesso.
//
// Uso: node scripts/verifica-stacco.mjs
//      node scripts/verifica-stacco.mjs --selftest   (rompe una cosa per volta)

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { apriSito } from './_sito.mjs';

const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
const ROMPI = (process.argv.find((a) => a.startsWith('--rompi=')) || '').slice('--rompi='.length);

// L'AUTOPROVA: ogni rottura in un processo suo, e il rosso deve arrivare per
// la ragione giusta.
const ROTTURE = [
  ['esce', /✗ cambiare scheda disfa ogni vignetta/, 'la scheda vecchia non si disfa: la classe `esce` non arriva mai'],
  ['cassetto-via', /✗ il cassetto del telefono si chiude disfacendosi/, 'il cassetto del telefono si chiude senza disfarsi'],
  ['cassetto-scivola', /✗ il cassetto del telefono non si sposta/, 'il cassetto del telefono torna a scivolare'],
  ['velo-dopo', /✗ e il velo sfuma mentre si disfa/, 'il velo aspetta la fine del disegno per sfumare'],
  ['menu-largo', /✗ il menu' non compare mai senza disegnarsi/, 'cambiando larghezza il menu\' compare gia\' fatto'],
  ['menu-stretto', /✗ e non sparisce mai senza disfarsi/, 'stringendo la finestra il menu\' di lato sparisce di colpo'],
  ['meno-moto', /✗ anche con meno movimento si vede disegnare/, 'con meno movimento i disegni tornano istantanei'],
];
if (process.argv.includes('--selftest')) {
  const io = fileURLToPath(import.meta.url);
  let cieche = 0;
  for (const [parte, segno, che] of ROTTURE) {
    let uscita = '', rosso = false;
    try { uscita = execFileSync(process.execPath, [io, `--rompi=${parte}`], { encoding: 'utf8', stdio: 'pipe' }); } catch (e) { rosso = true; uscita = String(e.stdout || ''); }
    if (/collaudo saltato/.test(uscita)) { console.log('  ✗  senza Chromium l\'autoprova non prova niente'); process.exit(1); }
    const visto = rosso && segno.test(uscita);
    console.log((visto ? '  ✓  ' : '  ✗  ') + che + (visto ? '' : rosso ? '  → rosso, ma per un\'altra ragione' : '  → PASSA INOSSERVATO'));
    if (!visto) cieche++;
  }
  console.log(cieche ? `\n${cieche} ${cieche === 1 ? 'rottura non vista' : 'rotture non viste'}: il cancello non protegge quello che dice.` : "\nOgni rottura e' vista. Il cancello e' vero. ✓");
  process.exit(cieche ? 1 : 0);
}

let chromium;
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch { console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }

const { porta: PORTA, chiudi: chiudiSito } = await apriSito();

// Il menu' a ogni fotogramma, dal primo: se si vede, in che forma (dove sta e
// quanto e' largo), e a che punto e' la china (del cassetto o di un gruppo):
// se si sta tracciando o ritirando, e se non ha ancora finito. Si leggono i
// tempi veri della sua animazione, non il tratto a un istante: la china del
// cassetto si ritira in 80 ms a due disegni, e un fotogramma perso mentre la
// finestra cambia misura bastava a non vederla. Un'animazione ridotta a niente
// da una regola del foglio di stile ha una durata sotto i 30 ms. Il tratto che
// si traccia conta finche' non ha finito (uno finito prima di vedersi non l'ha
// visto nessuno); quello che si ritira conta finche' c'e' la sua tela, che se
// ne va col disegno all'indietro.
const REGISTRA = () => {
  window.__menu = [];
  window.__azione = 'caricamento';
  const t0 = performance.now();
  const aMeta = (e) => {
    const s = e && e._dgTela && e._dgTela.isConnected ? e._dgTela : null;
    const c = s && s.querySelector('.dg-china');
    const a = c && c.getAnimations()[0];
    if (!a) return '';
    const t = a.effect.getComputedTiming();
    if (!(t.duration >= 30) || t.localTime === null) return '';
    if (c.classList.contains('dg-sfila')) return 'via';
    return t.localTime < t.delay + t.duration ? 'su' : '';
  };
  const giro = () => {
    const d = document.getElementById('drawer');
    if (d) {
      const st = getComputedStyle(d), r = d.getBoundingClientRect();
      const vede = st.display !== 'none' && st.visibility !== 'hidden' && r.width >= 8 && r.height >= 8;
      const pezzi = [d, ...document.querySelectorAll('#nav-drawer > .drawer-grp')].map(aMeta);
      window.__menu.push({ t: Math.round(performance.now() - t0), azione: window.__azione, vede,
        forma: vede ? Math.round(r.left) + ':' + Math.round(r.width) : '', su: pezzi.includes('su'), via: pezzi.includes('via') });
    }
    requestAnimationFrame(giro);
  };
  requestAnimationFrame(giro);
};
// Le rotture del menu' si fanno prima che il sito parta: tolgono la strada
// giusta, non il disegno. I file arrivano minificati, coi nomi cambiati: chi
// ascolta si riconosce da dove si registra, non da come si chiama.
const rompiMenu = async (pg) => {
  if (ROMPI === 'menu-largo') {
    await pg.addInitScript(() => {
      const orig = window.addEventListener;
      window.addEventListener = function (tipo, fn, ...r) { if (tipo === 'resize' && /disegno[^/]*\.js/.test(new Error().stack)) return; return orig.call(this, tipo, fn, ...r); };
    });
  }
  if (ROMPI === 'menu-stretto') {
    await pg.addInitScript(() => {
      const orig = MediaQueryList.prototype.addEventListener;
      MediaQueryList.prototype.addEventListener = function (tipo, fn, ...r) { if (tipo === 'change' && this.media === '(min-width: 64rem)') return; return orig.call(this, tipo, fn, ...r); };
    });
  }
  if (ROMPI === 'meno-moto') {
    await pg.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style');
      s.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; } }';
      document.head.appendChild(s);
    }));
  }
};
// Ogni volta che il menu' si vede in una forma nuova, nei 600 ms dopo la sua
// china non ha ancora finito di tracciarsi (o, se se ne sta gia' andando, di
// ritirarsi): la vedi farsi. Ogni volta che sparisce, nei 600 ms prima si stava
// ritirando mentre si vedeva.
const eventiMenu = (fr) => {
  const ev = [];
  for (let i = 1; i < fr.length; i++) {
    const a = fr[i - 1], c = fr[i];
    if (c.vede && (!a.vede || c.forma !== a.forma)) {
      const visto = fr.slice(i).filter((x) => x.t - c.t <= 600).some((x) => x.su || x.via);
      ev.push({ tipo: 'compare', azione: c.azione, visto, forma: c.forma });
    }
    if (a.vede && !c.vede) {
      const visto = fr.slice(0, i).filter((x) => a.t - x.t <= 600).some((x) => x.via);
      ev.push({ tipo: 'sparisce', azione: c.azione, visto });
    }
  }
  return ev;
};
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await rompiMenu(p);
await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.SB_APP && window.SB_DISEGNO, null, { timeout: 20000 });
await p.addStyleTag({ content: '#cookie-banner,.giro-velo,.giro-fumetto{display:none!important}' });

if (ROMPI === 'esce') {
  // Il difetto: la scheda vecchia non si disfa. L'uscita la chiede l'app con
  // la classe `esce`; qui la classe non arriva mai.
  await p.evaluate(() => {
    const orig = DOMTokenList.prototype.add;
    DOMTokenList.prototype.add = function (...c) { return orig.apply(this, c.filter((x) => x !== 'esce')); };
  });
}

// Ogni tela che nasce si annota: di che tipo e', dove sta, quando parte.
await p.evaluate(() => {
  window.__tele = [];
  new MutationObserver((mosse) => {
    for (const m of mosse) for (const n of m.addedNodes) {
      if (!(n instanceof SVGElement) || !n.classList.contains('dg-tela')) continue;
      const china = n.querySelector('.dg-china');
      // L'ordine di lettura e' quello della scena: le sue carte e il riquadro
      // «Come funziona». Il gruppo del menu' che si apre sulla scheda nuova si
      // disegna anche lui, ma sta nella sua colonna.
      const scena = [...document.querySelectorAll('.pannello-scheda .carta, #pagina-testata > *')].some((e) => e._dgTela === n);
      window.__tele.push({
        scena,
        tipo: n.querySelector('.dg-sfila') ? 'sfila' : china ? 'china' : 'altro',
        top: parseFloat(n.style.top) - (n.style.position === 'fixed' ? 0 : scrollY),
        left: parseFloat(n.style.left),
        da: china ? parseFloat(china.style.getPropertyValue('--dg-da')) : 0,
        z: +n.style.zIndex,
      });
    }
  }).observe(document.body, { childList: true });
});

const schede = await p.evaluate(() => [...document.querySelectorAll('.pannello-scheda')].map((s) => s.dataset.scheda));
const passaggi = [];
for (let i = 1; i < schede.length; i++) {
  await p.evaluate((x) => window.SB_APP.vai(x), schede[i - 1]);
  await p.waitForTimeout(700);
  await p.evaluate(() => { window.__tele = []; });
  const stessa = await p.evaluate(([a, b2]) => stessaFamiglia(a, b2), [schede[i - 1], schede[i]]);
  // Quante vignette della scena vecchia sono a schermo: tante se ne devono disfare.
  const daDisfare = await p.evaluate(() => {
    const v = [...document.querySelectorAll('.pannello-scheda.visibile .carta'), ...document.querySelectorAll('#pagina-testata > *')];
    const trasparente = (c) => /rgba\([^)]*,\s*0\)$/.test(c) || c === 'transparent';
    return v.filter((e) => {
      const r = e.getBoundingClientRect(), st = getComputedStyle(e);
      const contorno = ['Top', 'Right', 'Bottom', 'Left'].some((x) => st['border' + x + 'Style'] !== 'none' && parseFloat(st['border' + x + 'Width']) >= 0.5 && !trasparente(st['border' + x + 'Color']));
      return r.height >= 8 && r.width >= 8 && r.bottom > 0 && r.top < innerHeight && contorno && st.visibility !== 'hidden';
    }).length;
  });
  await p.evaluate((x) => window.SB_APP.vai(x), schede[i]);
  await p.waitForTimeout(700);
  const tele = await p.evaluate(() => window.__tele);
  const disegni = tele.filter((t) => t.tipo === 'china' && t.scena).sort((x, y) => x.da - y.da);
  const inOrdine = disegni.every((t, k) => !k || t.top > disegni[k - 1].top + 2
    || (Math.abs(t.top - disegni[k - 1].top) <= 2 && t.left >= disegni[k - 1].left));
  passaggi.push({ da: schede[i - 1], a: schede[i], stessa, daDisfare,
    disfatte: tele.filter((t) => t.tipo === 'sfila' && t.scena).length, disegni: disegni.length, inOrdine });
}

// Rimaste: un disegno finito non lascia niente nel documento.
await p.waitForTimeout(1600);
const rimaste = await p.evaluate(() => document.querySelectorAll('svg.dg-tela').length);

// La scena nuova parte dall'inizio. Cambiando sezione da una pagina scorsa in
// giu', la nuova compariva alla stessa altezza e poi scivolava su: il salto in
// cima chiedeva `behavior: 'auto'`, che vuol dire «come dice il CSS», e il CSS
// dice `scroll-behavior: smooth`. Si guarda scrollY nel momento esatto in cui
// la scheda nuova diventa visibile, non dopo: dopo, lo scivolo e' gia' finito.
let cima = null;
for (const x of passaggi.filter((y) => !y.stessa)) {
  await p.evaluate((d) => window.SB_APP.vai(d), x.da);
  await p.waitForTimeout(700);
  await p.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
  if (await p.evaluate(() => scrollY) < 300) continue;
  cima = await p.evaluate((a) => new Promise((ok) => {
    const prima = scrollY;
    const mo = new MutationObserver(() => {
      if (!document.querySelector(`.pannello-scheda.visibile[data-scheda="${a}"]`)) return;
      mo.disconnect();
      ok({ prima, dopo: scrollY });
    });
    mo.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
    window.SB_APP.vai(a);
  }), x.a);
  cima.via = `${x.da}→${x.a}`;
  await p.waitForTimeout(700);
  break;
}

// Gli avvisi: si disegnano con il loro segno (le scintille, o la vena di
// rabbia se e' un errore) e se ne vanno disegnandosi all'indietro.
await p.evaluate(() => { window.__tele = []; toast('Salvato ✓'); toast('Non riesco a salvare: riprova', 'errore'); });
await p.waitForTimeout(600);
const segni = await p.evaluate(() => ({
  scintille: document.querySelectorAll('.dg-scintille').length,
  rabbia: document.querySelectorAll('.dg-rabbia').length,
  avvisi: window.__tele.filter((t) => t.tipo === 'china' && t.z > 200).length,
}));
await p.waitForTimeout(4200);
segni.via = await p.evaluate(() => window.__tele.filter((t) => t.tipo === 'sfila' && t.z > 200).length);

// Una finestra: si disegna la sua carta, sopra al velo, e chiudendola si disfa.
await p.evaluate(() => { window.__tele = []; chiediSe({ titolo: 'Prova', si: 'Si', no: 'No' }); });
await p.waitForTimeout(700);
const finestra = await p.evaluate(() => window.__tele.filter((t) => t.tipo === 'china' && t.z > 300).length);
await p.evaluate(() => document.querySelector('.bv-velo [data-mdl="no"]').click());
await p.waitForTimeout(500);
const finestraVia = await p.evaluate(() => ({
  disfatta: window.__tele.filter((t) => t.tipo === 'sfila' && t.z > 300).length,
  rimasta: document.querySelectorAll('.bv-velo').length,
}));

// La finestra che chiede un gesto di cui pentirsi urla: la carta diventa una
// nuvoletta spigolosa rossa. La sagoma sta dentro la carta e la china la
// ripassa: devono essere la stessa forma alla stessa misura. Nella prima
// versione il sito stringeva ogni svg dentro al suo contenitore, e la sagoma
// usciva piu' stretta della china; e il seme della forma cambiava con le
// classi della carta, quindi le punte non coincidevano.
await p.evaluate(() => { chiediSe({ titolo: 'Vuoi togliere questa regola?', si: 'Togli', pericolo: true }); });
await p.waitForTimeout(250);
const urlo = await p.evaluate(() => {
  const carta = document.querySelector('.bv-velo .bv-carta');
  const sagoma = carta && carta.querySelector('.dg-sagoma');
  const china = [...document.querySelectorAll('.dg-tela .dg-urlo-china')].pop();
  if (!sagoma || !china) return { sagoma: !!sagoma, china: !!china };
  const c = carta.getBoundingClientRect(), s = sagoma.getBoundingClientRect();
  return { stessaForma: sagoma.querySelector('.dg-fondo').getAttribute('d') === china.getAttribute('d'),
    largo: Math.round(s.width - c.width), alto: Math.round(s.height - c.height) };
});
await p.evaluate(() => document.querySelector('.bv-velo [data-mdl="no"]').click());
await p.waitForTimeout(500);

// Il tasto che premi si ripassa a china: solo per un clic vero, solo se ha un
// contorno, sopra al tasto stesso, e poi se ne va. La tela si confronta col
// tasto nello stesso istante: dopo il clic il tasto si solleva (il mouse gli
// e' sopra) e la tela lo segue; la sua posizione di prima del clic non e' la
// misura giusta. Se invece il gesto fa gia'
// partire un disegno (una scheda nuova), la risposta e' quella e non si ripassa
// niente. Prima qui uscivano tre «!» sul punto del clic: sono la sorpresa di un
// personaggio, e un clic non e' una sorpresa.
// Il tasto e' uno col contorno il cui gesto non fa partire nessun disegno:
// prima era il «?» delle guide, che apriva il suo menu' senza disegnarlo;
// adesso il menu' si disegna, e quella e' la risposta al gesto.
await p.evaluate(() => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn secondario mini'; b.id = 'prova-tasto'; b.textContent = 'Prova';
  b.style.cssText = 'position:fixed;left:60%;top:30%;z-index:5';
  document.body.appendChild(b);
});
await p.waitForTimeout(700);
await p.evaluate(() => {
  window.__ripassi = [];
  new MutationObserver((mosse) => mosse.forEach((m) => m.addedNodes.forEach((n) => {
    if (n.classList && n.classList.contains('dg-ripasso')) {
      const t = document.getElementById('prova-tasto').getBoundingClientRect();
      window.__ripassi.push({ x: parseFloat(n.style.left), y: parseFloat(n.style.top) - (n.style.position === 'fixed' ? 0 : scrollY),
        tastoX: t.left, tastoY: t.top, tratti: n.querySelectorAll('.dg-ripassa').length });
    }
  }))).observe(document.body, { childList: true });
});
const tasto = await p.evaluate(() => {
  const r = document.getElementById('prova-tasto').getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
});
await p.mouse.click(tasto.x + tasto.w * 0.8, tasto.y + tasto.h / 2);
await p.waitForTimeout(700);
await p.keyboard.press('Escape');
await p.evaluate(() => document.getElementById('prova-tasto').click());
await p.waitForTimeout(150);
await p.keyboard.press('Escape');
const ripasso = await p.evaluate(() => ({ visti: window.__ripassi.slice(), rimasti: document.querySelectorAll('.dg-ripasso').length }));
await p.evaluate(() => document.getElementById('prova-tasto').remove());
const altraScheda = await p.evaluate(() => {
  const v = [...document.querySelectorAll('.drawer-voce[data-scheda]')].find((e) => !e.classList.contains('on') && e.offsetParent);
  const r = v.getBoundingClientRect();
  window.__ripassi = [];
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await p.mouse.click(altraScheda.x, altraScheda.y);
await p.waitForTimeout(700);
ripasso.dopoScheda = await p.evaluate(() => window.__ripassi.length);
// Il caso che conta: un tasto CON contorno il cui gesto apre una finestra. Le
// voci del menu' non hanno bordo e non si ripasserebbero comunque: da sole
// non dicono niente sulla regola.
const prova = await p.evaluate(() => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn'; b.id = 'prova-ripasso'; b.textContent = 'Apri';
  b.style.cssText = 'position:fixed;left:40%;top:40%;z-index:5';
  b.addEventListener('click', () => { chiediSe({ titolo: 'Prova', si: 'Si', no: 'No' }); });
  document.body.appendChild(b);
  window.__ripassi = [];
  const r = b.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, bordo: getComputedStyle(b).borderTopWidth };
});
await p.mouse.click(prova.x, prova.y);
await p.waitForTimeout(600);
ripasso.conFinestra = await p.evaluate(() => ({ ripassi: window.__ripassi.length, finestra: !!document.querySelector('.bv-velo.dentro') }));
await p.evaluate(() => { document.querySelector('.bv-velo [data-mdl="no"]')?.click(); document.getElementById('prova-ripasso')?.remove(); });
await p.waitForTimeout(500);

// «Leggero» si accende DA SOLO su un dispositivo che dichiara poca memoria,
// pochi core o una rete lenta, e serve al CARICO: qualche tratto non pesa
// niente, il disegno resta.
const interruttori = {};
const unaScena = passaggi.find((x) => !x.stessa);
await p.evaluate(() => { document.body.classList.add('leggero'); });
await p.evaluate((x) => window.SB_APP.vai(x), unaScena.da);
await p.waitForTimeout(700);
await p.evaluate(() => { window.__tele = []; });
await p.evaluate((x) => window.SB_APP.vai(x), unaScena.a);
await p.waitForTimeout(700);
interruttori.leggero = { visto: (await p.evaluate(() => window.__tele.length)) > 0 };
await p.evaluate(() => { document.body.classList.remove('leggero'); });
// «Meno movimento» lo chiede la persona, e toglie il MOVIMENTO: lo scorrere
// morbido, le cose che volano, le pulsazioni. Il disegno no: e' il modo in cui
// le cose compaiono e se ne vanno, e si disegna in ogni caso. Si guarda la
// china a meta' strada, non la tela: la tela nasce anche quando una regola del
// foglio di stile riduce l'animazione a niente.
await p.emulateMedia({ reducedMotion: 'reduce' });
await p.evaluate((x) => window.SB_APP.vai(x), unaScena.da);
await p.waitForTimeout(700);
await p.evaluate(() => {
  window.__meta = { su: 0, via: 0 };
  const t0 = performance.now();
  const giro = () => {
    for (const c of document.querySelectorAll('svg.dg-tela .dg-china')) {
      const o = parseFloat(getComputedStyle(c).strokeDashoffset);
      if (o > 0.001 && o < 0.999) window.__meta[c.classList.contains('dg-sfila') ? 'via' : 'su']++;
    }
    if (performance.now() - t0 < 900) requestAnimationFrame(giro);
  };
  requestAnimationFrame(giro);
});
await p.evaluate((x) => window.SB_APP.vai(x), unaScena.a);
await p.waitForTimeout(1000);
interruttori.menoMoto = await p.evaluate(() => window.__meta);
await p.emulateMedia({ reducedMotion: 'no-preference' });

// Niente veli a tutto schermo rimasti accesi SOPRA alla pagina. Sopra: lo
// sfondo sta a z-index negativo, dietro al contenuto, e non e' un velo.
const veli = await p.evaluate(() => [...document.body.children].filter((e) => {
  const s = getComputedStyle(e);
  if (s.position !== 'fixed' || +s.opacity < 0.02) return false;
  if (!(parseInt(s.zIndex, 10) > 0)) return false;
  const r = e.getBoundingClientRect();
  return r.width > innerWidth * 0.9 && r.height > innerHeight * 0.9;
}).map((e) => e.id || e.className || e.tagName));

const uscita = await p.evaluate(() => {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--t-uscita').trim();
  const x = parseFloat(v) || 0;
  return /ms$/.test(v) ? x : x * 1000;
});

// ---- IL CASSETTO DEL TELEFONO ----------------------------------------------
const tel = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await tel.addInitScript(REGISTRA);
await rompiMenu(tel);
if (ROMPI === 'velo-dopo') {
  await tel.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
    const s = document.createElement('style');
    s.textContent = 'body.menu-aperto.menu-via .backdrop { opacity: 1 !important; }';
    document.head.appendChild(s);
  }));
}
if (ROMPI === 'cassetto-scivola') {
  await tel.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
    const s = document.createElement('style');
    s.textContent = '.drawer { visibility: visible !important; transform: translateX(100%); transition: transform .3s; } body.menu-aperto .drawer { transform: none; }';
    document.head.appendChild(s);
  }));
}
await tel.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
await tel.waitForFunction(() => window.SB_APP && window.SB_DISEGNO, null, { timeout: 20000 });
await tel.addStyleTag({ content: '#cookie-banner,.giro-velo,.giro-fumetto{display:none!important}' });
if (ROMPI === 'cassetto-via') await tel.evaluate(() => { window.SB_DISEGNO.viaMenu = () => 0; });
await tel.waitForTimeout(1200);
// Com'e' il cassetto in un istante: dove sta, se si vede, se si sta disegnando
// o disfacendo, e la china che traccia.
const CASSETTO = () => {
  const d = document.getElementById('drawer'), r = d.getBoundingClientRect();
  const tela = d._dgTela && d._dgTela.isConnected ? d._dgTela : null;
  const china = tela && tela.querySelector('.dg-china');
  const gruppi = [...document.querySelectorAll('#nav-drawer > .drawer-grp')];
  const disfa = (e) => !!(e._dgTela && e._dgTela.isConnected && e._dgTela.querySelector('.dg-sfila'));
  return {
    aperto: document.body.classList.contains('menu-aperto'), si_vede: getComputedStyle(d).visibility === 'visible',
    sinistra: Math.round(r.left), velo: +getComputedStyle(document.getElementById('backdrop')).opacity,
    // il velo sta andando a zero: la sua transizione d'opacita' corre verso 0,
    // o e' gia' arrivato. Leggere solo il valore in un fotogramma dipende da
    // quanti fotogrammi ci sono: su una macchina carica il campione cade
    // all'inizio della sfumatura, e il velo sembra fermo.
    veloVa: (() => {
      const b = document.getElementById('backdrop');
      if (+getComputedStyle(b).opacity < 0.05) return true;
      return b.getAnimations().some((a) => a.transitionProperty === 'opacity' && a.playState === 'running'
        && a.effect && a.effect.getKeyframes().some((k) => k.offset === 1 && +k.opacity === 0));
    })(),
    disegna: !!(china && !disfa(d)), disfa: disfa(d), gruppiDisfano: gruppi.filter(disfa).length,
    china: china ? china.getAttribute('d') : '', largo: r.width, alto: r.height,
  };
};
const aprire = async () => {
  await tel.click('[data-apri-menu]');
  const lati = [];
  let primo = null;
  for (let i = 0; i < 8; i++) { const c = await tel.evaluate(CASSETTO); if (!primo && c.disegna) primo = c; if (c.si_vede) lati.push(c.sinistra); await tel.waitForTimeout(40); }
  await tel.waitForTimeout(900);
  return { primo, lati };
};
const STRADE = [
  ['la X', () => tel.click('#chiudi-menu')],
  ['il velo', () => tel.mouse.click(20, 400)],
  ['Esc', () => tel.keyboard.press('Escape')],
  ['una voce', async () => {
    await tel.click('#nav-drawer .drawer-grp.chiuso > button.drawer-grp-tit');
    await tel.waitForTimeout(450);
    await tel.evaluate(() => [...document.querySelectorAll('#nav-drawer [data-scheda]:not(.on)')].find((e) => e.checkVisibility()).setAttribute('data-prova-voce', ''));
    await tel.click('[data-prova-voce]');
    await tel.evaluate(() => document.querySelector('[data-prova-voce]')?.removeAttribute('data-prova-voce'));
  }],
  // a cassetto aperto il tasto sta sotto il velo: col dito si chiude dal velo,
  // qui si prova la sua strada (quella della tastiera)
  ['il tasto della barra in basso', () => tel.evaluate(() => document.querySelector('[data-apri-menu]').click())],
];
// Ogni fotogramma, dal gesto finche' il cassetto non si vede piu': non un
// istante scelto a occhio, che il disegno all'indietro (circa 200 ms) puo'
// aver gia' superato.
await tel.evaluate(`window.__cassetto = ${CASSETTO.toString()}`);
const cassetto = [];
for (const [nome, chiudi] of STRADE) {
  await tel.evaluate(() => { window.__azione = 'aprendo il cassetto'; });
  const { primo, lati } = await aprire();
  await tel.evaluate((a) => { window.__azione = a; }, 'chiudendo con ' + nome);
  await tel.evaluate(() => {
    window.__fotogrammi = [];
    const t0 = performance.now();
    const giro = () => {
      const c = window.__cassetto();
      window.__fotogrammi.push({ t: Math.round(performance.now() - t0), aperto: c.aperto, si_vede: c.si_vede, disfa: c.disfa, gruppi: c.gruppiDisfano, velo: c.velo, veloVa: c.veloVa });
      if (performance.now() - t0 < 1200) requestAnimationFrame(giro);
    };
    requestAnimationFrame(giro);
  });
  await chiudi();
  await tel.waitForTimeout(1300);
  const fotogrammi = await tel.evaluate(() => window.__fotogrammi);
  const dopo = await tel.evaluate(CASSETTO);
  const resti = await tel.evaluate(() => document.querySelectorAll('svg.dg-tela').length);
  const disfacendo = fotogrammi.filter((f) => f.aperto && f.si_vede && f.disfa);
  cassetto.push({ nome, primo, lati, disfacendo, dopo, resti });
}
// La china ha i lati del bordo vero: il cassetto non ha il lato destro, e
// nessun tratto della china corre lungo quel lato.
const treLati = (c) => {
  if (!c || !c.china) return false;
  const punti = [...c.china.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => [+m[1], +m[2]]);
  for (let i = 1; i < punti.length; i++) {
    const [a, b2] = [punti[i - 1], punti[i]];
    if (a[0] > c.largo - 4 && b2[0] > c.largo - 4 && Math.abs(a[1] - b2[1]) > c.alto / 2) return false;
  }
  return /^M/.test(c.china) && !/Z/.test(c.china);
};
await tel.emulateMedia({ reducedMotion: 'reduce' });
await tel.evaluate(() => { window.__azione = 'meno movimento: aprendo il cassetto'; });
await tel.click('[data-apri-menu]');
await tel.waitForTimeout(900);
await tel.evaluate(() => { window.__azione = 'meno movimento: chiudendo con la X'; });
await tel.click('#chiudi-menu');
await tel.waitForTimeout(900);
const telMenu = await tel.evaluate(() => window.__menu);

// ---- IL MENU' IN OGNI CASO -------------------------------------------------
// Dal caricamento, per ogni strada che lo fa comparire, sparire o cambiare
// forma: la finestra che si stringe e si allarga (e' anche il tablet che
// gira), il cassetto aperto quando la finestra si allarga, il tutto schermo,
// il menu' posato, e tutto di nuovo con «meno movimento».
const m = await b.newPage({ viewport: { width: 1440, height: 900 } });
await m.addInitScript(REGISTRA);
await rompiMenu(m);
await m.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
await m.waitForFunction(() => window.SB_APP && window.SB_DISEGNO, null, { timeout: 20000 });
await m.addStyleTag({ content: '#cookie-banner,.giro-velo,.giro-fumetto{display:none!important}' });
await m.waitForTimeout(1500);
const LARGO = { width: 1440, height: 900 }, STRETTO = { width: 390, height: 844 };
const fa = async (azione, gesto) => {
  await m.evaluate((a) => { window.__azione = a; }, azione);
  await gesto();
  await m.waitForTimeout(1000);
};
const clic = (sel) => () => m.evaluate((s) => document.querySelector(s).click(), sel);
const ATTESI = [
  ['caricamento', 'compare'],
  ['stringendo, col menu\' di lato', 'sparisce'],
  ['allargando, col cassetto chiuso', 'compare'],
  ['aprendo il cassetto', 'compare'],
  ['allargando, col cassetto aperto', 'compare'],
  ['a tutto schermo', 'sparisce'],
  ['aprendo il menu\' posato', 'compare'],
  ['chiudendo il menu\' posato con Esc', 'sparisce'],
  ['stringendo, col menu\' posato aperto', 'compare'],
  ['allargando, col menu\' posato aperto', 'sparisce'],
  ['togliendo il tutto schermo', 'compare'],
  ['meno movimento: stringendo', 'sparisce'],
  ['meno movimento: allargando', 'compare'],
  ['meno movimento: a tutto schermo', 'sparisce'],
  ['meno movimento: togliendo il tutto schermo', 'compare'],
];
await fa(ATTESI[1][0], () => m.setViewportSize(STRETTO));
await fa(ATTESI[2][0], () => m.setViewportSize(LARGO));
await m.setViewportSize(STRETTO);
await m.waitForTimeout(900);
await fa(ATTESI[3][0], clic('#apri-menu'));
await fa(ATTESI[4][0], () => m.setViewportSize(LARGO));
await m.evaluate(() => { window.__azione = 'verso una scheda larga'; window.SB_APP.vai('alert'); });
await m.waitForTimeout(1200);
await fa(ATTESI[5][0], clic('#pt-schermo'));
await fa(ATTESI[6][0], clic('#apri-menu'));
await fa(ATTESI[7][0], () => m.keyboard.press('Escape'));
await m.evaluate(() => document.querySelector('#apri-menu').click());
await m.waitForTimeout(900);
await fa(ATTESI[8][0], () => m.setViewportSize(STRETTO));
await fa(ATTESI[9][0], () => m.setViewportSize(LARGO));
await fa(ATTESI[10][0], clic('#pt-schermo'));
await m.emulateMedia({ reducedMotion: 'reduce' });
await fa(ATTESI[11][0], () => m.setViewportSize(STRETTO));
await fa(ATTESI[12][0], () => m.setViewportSize(LARGO));
await fa(ATTESI[13][0], clic('#pt-schermo'));
await fa(ATTESI[14][0], clic('#pt-schermo'));
const largoMenu = await m.evaluate(() => window.__menu);

await b.close();
await chiudiSito();

const esiti = [];
const dice = (ok, msg, extra = '') => { esiti.push(ok); console.log(`  ${ok ? '✓' : '✗'} ${msg}${!ok && extra ? `  → ${extra}` : ''}`); };
const via = (l) => l.slice(0, 4).map((x) => `${x.da}→${x.a}`).join(' · ');

const scene = passaggi.filter((x) => !x.stessa);
const azioni = passaggi.filter((x) => x.stessa);
console.log(`\n${passaggi.length} passaggi fra schede vicine: ${scene.length} da scena a scena, ${azioni.length} da azione ad azione.\n`);

dice(scene.length > 0 && azioni.length > 0, 'ci sono tutti e due i passaggi da guardare');
const nonDisfatte = passaggi.filter((x) => !x.daDisfare || x.disfatte !== x.daDisfare);
dice(!nonDisfatte.length, 'cambiare scheda disfa ogni vignetta della scena vecchia, una per una, anche fra sorelle',
  nonDisfatte.slice(0, 4).map((x) => `${x.da}→${x.a}: ${x.disfatte} su ${x.daDisfare}`).join(' · '));
const senzaDisegno = passaggi.filter((x) => !x.disegni);
dice(!senzaDisegno.length, 'e la vignetta nuova si disegna, ogni volta', via(senzaDisegno));
const disordine = passaggi.filter((x) => !x.inOrdine);
dice(!disordine.length, 'in ordine di lettura: prima quello che sta piu\' in alto', via(disordine));
dice(rimaste === 0, 'un disegno finito non lascia niente nel documento', `${rimaste} tele rimaste`);
dice(!!cima && cima.dopo === 0, 'la scena nuova parte dall\'inizio, anche da una pagina scorsa in giu\'',
  cima ? `${cima.via}: compare a ${cima.dopo}px (era a ${cima.prima})` : 'nessuna scheda abbastanza lunga da scorrere');
dice(segni.avvisi === 2 && segni.scintille > 0 && segni.rabbia > 0,
  'gli avvisi si disegnano sopra la pagina, con le scintille o con la vena di rabbia', JSON.stringify(segni));
dice(segni.via === 2, 'e se ne vanno disegnandosi all\'indietro', `${segni.via} su 2`);
dice(finestra === 1, 'una finestra si disegna sopra al suo velo', `${finestra} disegni sopra al velo`);
dice(finestraVia.disfatta === 1 && finestraVia.rimasta === 0, 'e chiudendola si disfa, poi se ne va', JSON.stringify(finestraVia));
dice(urlo.stessaForma === true && Math.abs(urlo.largo - 52) <= 1 && Math.abs(urlo.alto - 52) <= 1,
  'la finestra di un gesto pericoloso e\' una nuvoletta spigolosa, e la china ripassa la sua sagoma', JSON.stringify(urlo));
const [r1] = ripasso.visti;
dice(ripasso.visti.length === 1 && r1.tratti === 2 && Math.abs(r1.x - r1.tastoX) <= 1 && Math.abs(r1.y - r1.tastoY) <= 1,
  'il tasto premuto si ripassa a china sul suo contorno, e un clic finto non lo ripassa', JSON.stringify({ tasto, ...ripasso }));
dice(ripasso.rimasti === 0, 'e poi l\'inchiostro in piu\' se ne va', `${ripasso.rimasti} rimasti`);
dice(ripasso.dopoScheda === 0 && ripasso.conFinestra.finestra && ripasso.conFinestra.ripassi === 0,
  'se il gesto fa gia\' partire un disegno (una scheda, una finestra) il tasto non si ripassa: la risposta e\' quella', JSON.stringify(ripasso.conFinestra));
dice(!veli.length, 'non resta nessun velo a tutto schermo sopra alla pagina', veli.join(' · '));
dice(uscita > 0 && uscita <= 300, 'l\'uscita e\' corta: il disegno all\'indietro, non una dissolvenza', `${uscita}ms`);
dice(interruttori.leggero.visto === true, 'la modalita\' leggera non spegne il disegno: serve al carico, non al movimento');

const fermo = cassetto.filter((x) => new Set(x.lati).size !== 1);
dice(!fermo.length, 'il cassetto del telefono non si sposta: compare dov\'e\' e se ne va da li\'', fermo.map((x) => `${x.nome}: ${x.lati.join(',')}`).join(' · '));
const nonDisegna = cassetto.filter((x) => !x.primo || !treLati(x.primo));
dice(!nonDisegna.length, 'aprendolo si disegna, con la china sui suoi tre lati: il lato destro non c\'e\'', nonDisegna.map((x) => `${x.nome}: ${x.primo ? x.primo.china.slice(0, 60) : 'nessun disegno'}`).join(' · '));
const nonDisfa = cassetto.filter((x) => !(x.disfacendo.some((f) => f.gruppi > 0) && !x.dopo.aperto && !x.dopo.si_vede));
dice(!nonDisfa.length, 'il cassetto del telefono si chiude disfacendosi, cassetto e gruppi, per ogni strada', nonDisfa.map((x) => `${x.nome}: ${x.disfacendo.length} fotogrammi a disfarsi, poi ${JSON.stringify({ aperto: x.dopo.aperto, si_vede: x.dopo.si_vede })}`).join(' · '));
// all'ultimo fotogramma in cui il cassetto si vede ancora, il velo sta gia'
// sfumando verso zero (o c'e' arrivato): se aspettasse la fine del disegno, in
// tutti quei fotogrammi sarebbe fermo a 1
const velo = cassetto.filter((x) => { const u = x.disfacendo[x.disfacendo.length - 1]; return !u || !u.veloVa; });
dice(!velo.length, 'e il velo sfuma mentre si disfa, non dopo', velo.map((x) => `${x.nome}: ${JSON.stringify(x.disfacendo.slice(-2))}`).join(' · '));
const resti = cassetto.filter((x) => x.resti);
dice(!resti.length, 'e non lascia niente nel documento', resti.map((x) => `${x.nome}: ${x.resti}`).join(' · '));

const eventi = [...eventiMenu(telMenu).map((e) => ({ ...e, dove: 'telefono' })), ...eventiMenu(largoMenu).map((e) => ({ ...e, dove: 'computer' }))];
const dirEvento = (e) => `${e.dove}, ${e.azione}${e.forma ? ' (' + e.forma + ')' : ''}`;
const compare = eventi.filter((e) => e.tipo === 'compare'), sparisce = eventi.filter((e) => e.tipo === 'sparisce');
console.log(`\nIl menu' a ogni fotogramma: ${compare.length} volte compare o cambia forma, ${sparisce.length} volte sparisce.\n`);
const giaFatto = compare.filter((e) => !e.visto);
dice(!giaFatto.length, 'il menu\' non compare mai senza disegnarsi, in nessuna forma e per nessuna strada', giaFatto.map(dirEvento).join(' · '));
const diColpo = sparisce.filter((e) => !e.visto);
dice(!diColpo.length, 'e non sparisce mai senza disfarsi', diColpo.map(dirEvento).join(' · '));
const mancano = ATTESI.filter(([azione, tipo]) => !eventi.some((e) => e.dove === 'computer' && e.azione === azione && e.tipo === tipo)).map(([a, t]) => `${a}: nessun «${t}»`);
for (const tipo of ['compare', 'sparisce']) {
  const n = eventi.filter((e) => e.dove === 'telefono' && e.tipo === tipo).length;
  if (n < STRADE.length + 1) mancano.push(`telefono: ${n} volte «${tipo}» su ${STRADE.length + 1}`);
}
dice(!mancano.length, `ogni strada provata fa davvero quello che si guarda (${ATTESI.length} sul computer, ${STRADE.length + 1} sul telefono)`, mancano.join(' · '));
const menoMoto = eventi.filter((e) => /^meno movimento/.test(e.azione));
dice(interruttori.menoMoto.su > 0 && interruttori.menoMoto.via > 0 && menoMoto.length >= 6 && menoMoto.every((e) => e.visto),
  'anche con meno movimento si vede disegnare: la scena che cambia, il cassetto, il menu\' di lato e quello posato',
  JSON.stringify({ scena: interruttori.menoMoto, menu: menoMoto.filter((e) => !e.visto).map(dirEvento) }));

const rossi = esiti.filter((x) => !x).length;
console.log(rossi ? '\ncancello ROSSO ✗\n' : '\nOgni passaggio si disfa e si disegna come gli tocca. ✓\n');
process.exit(rossi ? 1 : 0);
