// Cancello delle COMPARSE: tutto quello che compare si disegna, tutto quello
// che se ne va si disfa. In ogni caso.
//
// Chiesto cosi': «tutto deve essere disegnato, non tralasciamo nulla, i
// dettagli sono vitalmente importanti». Le strade per cui una cosa compare o
// sparisce sono tante (una classe, l'attributo `hidden`, una finestra di
// sistema, un nodo aggiunto o tolto, una tendina che si apre) e una lista di
// strade e' il modo sicuro di dimenticarne una. Questo cancello non conosce le
// strade: guarda la pagina a ogni giro di fotogramma e registra ogni riquadro
// col contorno che diventa visibile o smette di esserlo. Poi controlla la
// regola sola:
//   · un riquadro che compare, a schermo, si sta scoprendo: lui o un suo
//     antenato ha il retino in corso, o una china che si traccia;
//   · un riquadro che sparisce, a schermo, si stava disfacendo mentre si
//     vedeva: lui o un suo antenato aveva il retino che lo ricopre.
// Si leggono i tempi veri delle animazioni: un'animazione ridotta a niente da
// una regola del foglio di stile dura meno di 30 ms, e non conta.
//
// Non e' una comparsa un riquadro che prende un bordo restando dov'era (un
// tasto al passaggio del mouse), ne' uno rifatto uguale al suo posto (una
// lista riscritta con le stesse righe): quelli li vedevi gia'.
//
// Uso: node scripts/verifica-comparse.mjs
//      node scripts/verifica-comparse.mjs --selftest   (rompe una cosa per volta)

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { apriSito, apriBrowser } from './_sito.mjs';

const ROMPI = (process.argv.find((a) => a.startsWith('--rompi=')) || '').slice('--rompi='.length);

const ROTTURE = [
  ['nascosto', /✗ niente compare senza disegnarsi/, 'l\'attributo hidden non passa piu\' dal disegno'],
  ['finestra', /✗ e niente se ne va senza disfarsi/, 'una finestra di sistema si chiude di colpo'],
  ['esce', /✗ e niente se ne va senza disfarsi/, 'chi prende `esce` non si disfa'],
];
if (process.argv.includes('--selftest')) {
  const io = fileURLToPath(import.meta.url);
  let cieche = 0;
  for (const [parte, segno, che] of ROTTURE) {
    let uscita = '', rosso = false;
    try { uscita = execFileSync(process.execPath, [io, `--rompi=${parte}`], { encoding: 'utf8', stdio: 'pipe' }); } catch (e) { rosso = true; uscita = String(e.stdout || ''); }
    if (/saltato/.test(uscita)) { console.log('  ✗  senza Chromium l\'autoprova non prova niente'); process.exit(1); }
    const visto = rosso && segno.test(uscita);
    console.log((visto ? '  ✓  ' : '  ✗  ') + che + (visto ? '' : rosso ? '  → rosso, ma per un\'altra ragione' : '  → PASSA INOSSERVATO'));
    if (!visto) cieche++;
  }
  console.log(cieche ? `\n${cieche} ${cieche === 1 ? 'rottura non vista' : 'rotture non viste'}: il cancello non protegge quello che dice.` : "\nOgni rottura e' vista. Il cancello e' vero. ✓");
  process.exit(cieche ? 1 : 0);
}

// Le rotture si fanno prima che il sito parta, e tolgono la strada giusta
// senza toccare il disegno.
const rompi = async (pg) => {
  if (ROMPI === 'nascosto') {
    await pg.addInitScript(() => {
      const orig = MutationObserver.prototype.observe;
      MutationObserver.prototype.observe = function (bersaglio, o) {
        if (o && o.attributeFilter && /disegno[^/]*\.js/.test(new Error().stack)) o = { ...o, attributeFilter: o.attributeFilter.filter((x) => x !== 'hidden') };
        return orig.call(this, bersaglio, o);
      };
    });
  }
  if (ROMPI === 'finestra') {
    await pg.addInitScript(() => {
      const vera = HTMLDialogElement.prototype.close;
      document.addEventListener('DOMContentLoaded', () => setTimeout(() => { HTMLDialogElement.prototype.close = vera; }, 0));
    });
  }
  if (ROMPI === 'esce') {
    await pg.addInitScript(() => {
      const Vero = window.MutationObserver;
      const Finto = function (cb) {
        if (!/disegno[^/]*\.js/.test(new Error().stack)) return new Vero(cb);
        return new Vero((mosse, o) => cb(mosse.filter((m) => !(m.attributeName === 'class' && m.target.classList.contains('esce') && !/(^|\s)esce(\s|$)/.test(m.oldValue || ''))), o));
      };
      Finto.prototype = Vero.prototype;
      window.MutationObserver = Finto;
    });
  }
};

// La sentinella, nella pagina, dal primo istante.
//
// Quando un disegno comincia lo si annota subito, dall'osservatore delle
// classi: chi prende `dg-in` si sta scoprendo, chi prende `dg-out` si sta
// ricoprendo, e l'annotazione dice quando e se l'animazione e' vera (almeno
// 30 ms). Il giro sulla pagina puo' essere lento (lo Studio ha migliaia di
// pezzi) e un disegno all'indietro dura 250 ms: guardarlo solo a giri
// l'avrebbe perso. Il giro serve a sapere cosa si vede; il disegno lo dice
// l'annotazione.
const SORVEGLIA = () => {
  const S = window.__comparse = { eventi: [], azione: 'caricamento', pronta: false };
  const t0 = performance.now();
  const ora = () => Math.round(performance.now() - t0);
  const SALTA = 'script, style, link, template, svg, canvas, iframe, video, img, .dg-tela, .dg-strato, .dg-sagoma, [data-dg-no]';
  const trasparente = (c) => /rgba\([^)]*,\s*0\)$/.test(c) || c === 'transparent';
  const contorno = (st) => ['Top', 'Right', 'Bottom', 'Left'].some((x) => st['border' + x + 'Style'] !== 'none'
    && (parseFloat(st['border' + x + 'Width']) || 0) >= 0.5 && !trasparente(st['border' + x + 'Color']));
  const vera = (e, nome) => e.getAnimations().some((a) => a.animationName === nome && a.effect && a.effect.getComputedTiming().duration >= 30);
  const scopre = new WeakMap(), copre = new WeakMap();
  // Chi si scopre o si ricopre e' l'elemento o uno dei suoi antenati. Per chi e'
  // stato tolto dalla pagina gli antenati sono quelli che aveva quando si
  // vedeva: tolto con innerHTML, il suo genitore non c'e' piu'.
  const antenati = new WeakMap();
  const catena = (e) => { const c = []; for (let x = e; x && x.nodeType === 1; x = x.parentElement) c.push(x); return c; };
  const segnati = (mappa, e, da, a) => {
    for (const x of (e.isConnected ? catena(e) : (antenati.get(e) || catena(e)))) {
      const t = mappa.get(x);
      if (t !== undefined && t >= da && t <= a) return true;
    }
    return false;
  };
  const nome = (e) => {
    const cl = [...e.classList].filter((c) => !/^dg-/.test(c)).slice(0, 2).join('.');
    const testo = (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    return `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${cl ? '.' + cl : ''}${testo ? ' «' + testo + '»' : ''}`;
  };
  const firma = (e, r) => `${e.tagName}|${[...e.classList].filter((c) => !/^dg-/.test(c)).sort().join('.')}|${(e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80)}|${Math.round(r.left / 3)}|${Math.round(r.top / 3)}`;
  const aSchermo = (r) => r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;

  let vivi = new Map();
  const prima = new WeakMap();
  const inAttesa = [];
  let sporco = true, ultimo = -1e9, avviata = false;

  // Chi sta dentro a un contenitore spento non si guarda uno per uno (costerebbe
  // troppo): i riquadri che si vedevano e che il giro non ha incontrato sono
  // spenti anche loro. Il contenuto di una tendina chiusa non si vede, anche se
  // il browser, se glielo chiedi, ne calcola le misure.
  const guarda = () => {
    const nuovi = new Map(), incontrati = new Set();
    (function giu(e, opaco) {
      for (const c of e.children) {
        if (c.matches(SALTA)) continue;
        if (e.tagName === 'DETAILS' && !e.open && !e.classList.contains('dg-resta') && c.tagName !== 'SUMMARY') continue;
        incontrati.add(c);
        const st = getComputedStyle(c);
        if (st.display === 'none') { prima.set(c, false); continue; }
        const op = opaco && parseFloat(st.opacity) >= 0.02;
        const r = c.getBoundingClientRect();
        // sotto i 12 px non e' una vignetta: e' un segno (una freccia, un
        // puntino), e mentre gira puo' passare sotto la soglia e tornare
        const vede = op && st.visibility !== 'hidden' && r.width >= 12 && r.height >= 12;
        const coperto = c.classList.contains('dg-in') || c.classList.contains('dg-out');
        const cont = coperto || contorno(st);
        if (vede && cont) { nuovi.set(c, { r, firma: firma(c, r), eraVisto: prima.get(c) === true }); if (!antenati.has(c)) antenati.set(c, catena(c)); }
        prima.set(c, vede);
        giu(c, op);
      }
    })(document.body, true);
    for (const e of vivi.keys()) if (!incontrati.has(e)) prima.set(e, false);
    return nuovi;
  };

  const giro = () => {
    requestAnimationFrame(giro);
    const t = ora();
    if (t - ultimo < 40) return;
    ultimo = t;
    for (let i = inAttesa.length - 1; i >= 0; i--) {
      const x = inAttesa[i];
      if (segnati(scopre, x.e, x.t - 700, t)) { S.eventi.push({ tipo: 'compare', ok: true, chi: x.chi, azione: x.azione, t: x.t }); inAttesa.splice(i, 1); }
      else if (t - x.t > 600) { S.eventi.push({ tipo: 'compare', ok: false, chi: x.chi, azione: x.azione, t: x.t }); inAttesa.splice(i, 1); }
    }
    if (!sporco) return;
    sporco = false;
    const nuovi = guarda();
    if (!avviata) { vivi = nuovi; avviata = true; return; }
    const comparsi = [], spariti = [];
    for (const [e, v] of nuovi) if (!vivi.has(e) && !v.eraVisto) comparsi.push([e, v]);
    for (const [e, v] of vivi) {
      if (nuovi.has(e)) continue;
      if (e.isConnected && prima.get(e) === true) continue;
      spariti.push([e, v]);
    }
    const via = new Map(spariti.map(([e, v]) => [v.firma, e]));
    for (const [e, v] of comparsi) {
      if (via.has(v.firma)) { via.delete(v.firma); continue; }
      if (!aSchermo(v.r) || !S.pronta) continue;
      inAttesa.push({ e, t, chi: nome(e), azione: S.azione });
    }
    const rimasti = new Set(via.values());
    for (const [e, v] of spariti) {
      if (!rimasti.has(e) || !aSchermo(v.r) || !S.pronta) continue;
      S.eventi.push({ tipo: 'sparisce', ok: segnati(copre, e, t - 900, t), chi: nome(e), azione: S.azione, t });
    }
    vivi = nuovi;
  };
  document.addEventListener('DOMContentLoaded', () => {
    new MutationObserver((mosse) => {
      sporco = true;
      const t = ora();
      for (const m of mosse) {
        if (m.attributeName !== 'class' || !(m.target instanceof HTMLElement)) continue;
        const e = m.target, prima = ' ' + (m.oldValue || '') + ' ';
        if (e.classList.contains('dg-in') && prima.indexOf(' dg-in ') < 0 && vera(e, 'dg-retino')) scopre.set(e, t);
        if (e.classList.contains('dg-out') && prima.indexOf(' dg-out ') < 0 && vera(e, 'dg-copri')) copre.set(e, t);
      }
    }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeOldValue: true, attributeFilter: ['class', 'hidden', 'open', 'style'] });
    requestAnimationFrame(giro);
  });
};

const sito = await apriSito({});
const br = await apriBrowser();
if (!br) { console.log('  –  saltato: manca Chromium o Playwright'); sito.chiudi(); process.exit(0); }

const esiti = [];
const dice = (ok, msg, extra = '') => { esiti.push(ok); console.log(`  ${ok ? '✓' : '✗'} ${msg}${!ok && extra ? `  → ${extra}` : ''}`); };
const eventiTutti = [];
const attesi = [];

const pagina = async (url, vista, { cookie = true } = {}) => {
  const pg = await br.newPage({ viewport: vista, isMobile: vista.width < 500, hasTouch: vista.width < 500 });
  await pg.addInitScript(SORVEGLIA);
  if (cookie) await pg.addInitScript(() => { try { localStorage.setItem('cookie-ok', '1'); } catch (e) {} });
  await rompi(pg);
  await pg.goto(sito.base + url, { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(2500);
  await pg.evaluate(() => { window.__comparse.pronta = true; });
  return pg;
};
const fa = async (pg, dove, azione, attende, gesto, pausa = 900) => {
  await pg.evaluate((a) => { window.__comparse.azione = a; }, azione);
  await gesto();
  await pg.waitForTimeout(pausa);
  if (attende) attesi.push([dove, azione, attende]);
};
const raccogli = async (pg, dove) => {
  await pg.waitForTimeout(700);
  const ev = await pg.evaluate(() => window.__comparse.eventi);
  for (const e of ev) eventiTutti.push({ ...e, dove });
  await pg.close();
};

// ---- IL PANNELLO, SUL COMPUTER ------------------------------------------------
{
  const pg = await pagina('/?demo=1&lang=it', { width: 1440, height: 900 });
  const D = 'pannello';
  await fa(pg, D, 'il giro guidato si chiude con «Salta il giro»', 'sparisce', () => pg.evaluate(() => document.querySelector('[data-giro="salta"]').click()));
  await fa(pg, D, 'la ricerca si apre', 'compare', () => pg.evaluate(() => window.SB_CERCA.apri()));
  await fa(pg, D, 'la ricerca si chiude con Esc', 'sparisce', () => pg.keyboard.press('Escape'));
  await fa(pg, D, 'il menu delle guide si apre', 'compare', () => pg.evaluate(() => document.querySelector('.aiuto-btn').click()));
  await fa(pg, D, 'il menu delle guide si chiude', 'sparisce', () => pg.evaluate(() => document.querySelector('.aiuto-btn').click()));
  await fa(pg, D, 'un avviso arriva e se ne va', 'sparisce', () => pg.evaluate(() => toast('Salvato ✓')), 5200);
  await fa(pg, D, 'una finestra che chiede si apre', 'compare', () => pg.evaluate(() => { chiediSe({ titolo: 'Prova', si: 'Si', no: 'No' }); }));
  await fa(pg, D, 'e si chiude', 'sparisce', () => pg.evaluate(() => document.querySelector('.bv-velo [data-mdl="no"]').click()));
  await fa(pg, D, 'una finestra di sistema si apre', 'compare', () => pg.evaluate(() => {
    const d = document.createElement('dialog');
    d.className = 'nov-finestra';
    d.innerHTML = '<div class="nov-testa"><h2>Prova</h2><p>Una finestra di sistema.</p></div><div class="nov-piede"><button class="btn" id="prova-chiudi">Chiudi</button></div>';
    document.body.appendChild(d);
    d.addEventListener('close', () => d.remove());
    d.querySelector('#prova-chiudi').addEventListener('click', () => d.close());
    d.showModal();
  }));
  await fa(pg, D, 'e si chiude col suo tasto', 'sparisce', () => pg.evaluate(() => document.getElementById('prova-chiudi').click()));
  await fa(pg, D, 'la barra delle modifiche arriva', 'compare', () => pg.evaluate(() => _mostraBarraSalva(true)));
  await fa(pg, D, 'e se ne va', 'sparisce', () => pg.evaluate(() => _mostraBarraSalva(false)));
  await fa(pg, D, 'la striscia di una guida arriva', 'compare', () => pg.evaluate(() => {
    const el = document.createElement('div');
    el.className = 'cookie-banner aiuto-banner';
    el.innerHTML = '<p>C\'è una guida per questa scheda.</p><button type="button" class="btn secondario" id="prova-no">Non serve</button>';
    document.body.appendChild(el);
    _aiutoStriscia = el;
    el.querySelector('#prova-no').addEventListener('click', () => togliAiuto(false));
  }));
  await fa(pg, D, 'e se ne va', 'sparisce', () => pg.evaluate(() => document.getElementById('prova-no').click()));
  // Una carta che si ripiega e si riapre, e un gruppo del menu' che si chiude e
  // si riapre (quello della scheda aperta, che ha la voce accesa).
  await pg.evaluate(() => { window.__comparse.azione = 'preparazione'; window.SB_APP.vai('account'); });
  await pg.waitForTimeout(1500);
  await pg.evaluate(() => {
    const c = document.querySelector('.pannello-scheda.visibile .carta.pieghevole:not(.chiusa)');
    c.setAttribute('data-prova-carta', '');
    c.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
  await pg.waitForTimeout(1200);
  await fa(pg, D, 'una carta si ripiega', 'sparisce', () => pg.evaluate(() => document.querySelector('[data-prova-carta] > h2').click()));
  await fa(pg, D, 'e si riapre', 'compare', () => pg.evaluate(() => document.querySelector('[data-prova-carta] > h2').click()));
  await fa(pg, D, 'il gruppo del menu si chiude', 'sparisce', () => pg.evaluate(() => document.querySelector('.drawer-voce.on').closest('.drawer-grp').querySelector('.drawer-grp-tit').click()));
  await fa(pg, D, 'e si riapre', 'compare', () => pg.evaluate(() => document.querySelector('.drawer-voce.on').closest('.drawer-grp').querySelector('.drawer-grp-tit').click()));
  // Le due strade di tutte le tendine: l'attributo hidden e <details>. Si
  // provano su un pezzo messo in cima alla scheda aperta, cosi' e' a schermo.
  await pg.evaluate(() => {
    window.__comparse.azione = 'preparazione';
    const dove = document.querySelector('.pannello-scheda.visibile');
    dove.insertAdjacentHTML('afterbegin', '<div id="prova-zona"><button type="button" class="btn" id="prova-mostra">Mostra</button>'
      + '<div id="prova-riquadro" class="guida-scheda" hidden><p>Un riquadro che compare e sparisce.</p></div>'
      + '<details id="prova-tendina" class="guida-scheda"><summary>Una tendina</summary><div class="lp-blocco" style="border:2px solid var(--contorno);padding:.6rem">Il suo contenuto, con un contorno.</div></details></div>');
    window.scrollTo(0, 0);
  });
  await pg.waitForTimeout(900);
  await fa(pg, D, 'un riquadro nascosto compare', 'compare', () => pg.evaluate(() => { document.getElementById('prova-riquadro').hidden = false; }));
  await fa(pg, D, 'e si nasconde di nuovo', 'sparisce', () => pg.evaluate(() => { document.getElementById('prova-riquadro').hidden = true; }));
  await fa(pg, D, 'una tendina si apre', 'compare', () => pg.click('#prova-tendina > summary'));
  await fa(pg, D, 'e si chiude', 'sparisce', () => pg.click('#prova-tendina > summary'));
  await pg.evaluate(() => { window.__comparse.azione = 'preparazione'; document.getElementById('prova-zona').remove(); });
  await pg.waitForTimeout(500);
  // Le scene: una sorella, un'altra sezione, una riga che si aggiunge e si
  // toglie, e la pagina che si rifa' tutta cambiando lingua.
  const sorelle = await pg.evaluate(() => {
    const ids = [...document.querySelectorAll('.pannello-scheda')].map((p) => p.dataset.scheda);
    for (const a of ids) for (const b of ids) if (a !== b && stessaFamiglia(a, b)) return [a, b];
    return null;
  });
  await pg.evaluate((a) => { window.__comparse.azione = 'preparazione'; window.SB_APP.vai(a); }, sorelle[0]);
  await pg.waitForTimeout(1500);
  await fa(pg, D, 'si passa a una scheda sorella', 'sparisce', () => pg.evaluate((b) => window.SB_APP.vai(b), sorelle[1]), 1800);
  attesi.push([D, 'si passa a una scheda sorella', 'compare']);
  await fa(pg, D, 'si cambia sezione', 'sparisce', () => pg.evaluate(() => window.SB_APP.vai('donazioni')), 2000);
  attesi.push([D, 'si cambia sezione', 'compare']);
  await pg.evaluate(() => { window.__comparse.azione = 'preparazione'; document.getElementById('dona-livello-piu').scrollIntoView({ block: 'center', behavior: 'instant' }); });
  await pg.waitForTimeout(1200);
  await fa(pg, D, 'un\'offerta si aggiunge', 'compare', () => pg.evaluate(() => document.getElementById('dona-livello-piu').click()));
  await fa(pg, D, 'e si toglie', 'sparisce', () => pg.evaluate(() => [...document.querySelectorAll('#dona-livelli .dl-via')].pop().click()));
  await pg.evaluate(() => { window.__comparse.azione = 'preparazione'; window.scrollTo(0, 0); });
  await pg.waitForTimeout(900);
  await fa(pg, D, 'la lingua cambia', 'sparisce', () => pg.evaluate(() => cambiaLingua('en')), 2200);
  attesi.push([D, 'la lingua cambia', 'compare']);
  await raccogli(pg, D);
}

// ---- IL PANNELLO, SUL TELEFONO -------------------------------------------------
{
  const pg = await pagina('/?demo=1&lang=it', { width: 390, height: 844 });
  const D = 'telefono';
  await fa(pg, D, 'il giro guidato si chiude', 'sparisce', () => pg.evaluate(() => document.querySelector('[data-giro="salta"]').click()));
  await fa(pg, D, 'la ricerca si apre', 'compare', () => pg.evaluate(() => window.SB_CERCA.apri()));
  await fa(pg, D, 'la ricerca si chiude toccando fuori', 'sparisce', () => pg.evaluate(() => document.getElementById('cerca-overlay').click()));
  await fa(pg, D, 'un avviso arriva e se ne va', 'sparisce', () => pg.evaluate(() => toast('Salvato ✓')), 5200);
  await raccogli(pg, D);
}

// ---- IL BANNER DEI COOKIE --------------------------------------------------
{
  const pg = await pagina('/?demo=1&lang=it', { width: 1440, height: 900 }, { cookie: false });
  const D = 'cookie';
  await fa(pg, D, 'il banner dei cookie se ne va con OK', 'sparisce', () => pg.evaluate(() => document.getElementById('cookie-ok').click()));
  await raccogli(pg, D);
}

// ---- LA VETRINA --------------------------------------------------------------
{
  const pg = await pagina('/', { width: 1280, height: 900 });
  const D = 'vetrina';
  await fa(pg, D, 'la finestra delle piattaforme si apre', 'compare', () => pg.evaluate(() => document.querySelector('a.vt-btn[href^="/entra?nuovo=1"]').click()));
  await fa(pg, D, 'e si chiude con Esc', 'sparisce', () => pg.keyboard.press('Escape'));
  await raccogli(pg, D);
}

await br.close();
sito.chiudi();

const dir = (e) => `${e.dove}, ${e.azione}: ${e.chi}`;
const veri = eventiTutti.filter((e) => e.azione !== 'preparazione');
const comparse = veri.filter((e) => e.tipo === 'compare'), sparizioni = veri.filter((e) => e.tipo === 'sparisce');
console.log(`\n${comparse.length} riquadri comparsi e ${sparizioni.length} spariti, a schermo, in ${attesi.length} gesti.\n`);
const giaFatti = comparse.filter((e) => !e.ok);
dice(!giaFatti.length, 'niente compare senza disegnarsi', giaFatti.slice(0, 12).map(dir).join(' · '));
const diColpo = sparizioni.filter((e) => !e.ok);
dice(!diColpo.length, 'e niente se ne va senza disfarsi', diColpo.slice(0, 12).map(dir).join(' · '));
const muti = attesi.filter(([dove, azione, tipo]) => !eventiTutti.some((e) => e.dove === dove && e.azione === azione && e.tipo === tipo));
dice(!muti.length, `ogni gesto provato fa davvero comparire o sparire qualcosa (${attesi.length} gesti)`, muti.map(([d, a, t]) => `${d}, ${a}: nessun «${t}»`).join(' · '));

const rossi = esiti.filter((x) => !x).length;
console.log(rossi ? '\ncancello ROSSO ✗\n' : '\nTutto quello che compare si disegna, e tutto quello che se ne va si disfa. ✓\n');
process.exit(rossi ? 1 : 0);
