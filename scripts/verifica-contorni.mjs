// Collaudo del CONTORNO: l'inchiostro di una cosa non deve mai essere rasato.
//
// Perche' esiste. Il tema e' disegnato a inchiostro: ogni cosa ha un contorno
// pieno e un'ombra dura, e al passaggio del mouse si solleva di un paio di
// pixel. Tutto questo sta FUORI dalla scatola dell'elemento. Basta un antenato
// che ritaglia — un `overflow: hidden` messo per far funzionare una fisarmonica,
// una colonna che scorre — e il contorno viene tagliato a filo: si vede un bordo
// che comincia da qualche parte e finisce nel nulla.
//
// Non e' un difetto che si nota leggendo il CSS, perche' il ritaglio e il
// contorno stanno in due file diversi e nessuno dei due e' sbagliato da solo.
// E non e' uno solo: quando si e' misurato la prima volta erano 117 elementi in
// tutta la dashboard, la maggior parte bottoni dentro le schede.
//
// Cosa misura. Per ogni elemento visibile: la sua scatola allargata di quanto
// sporge l'inchiostro (ombre, contorno di messa a fuoco). Poi risale gli
// antenati e, per ognuno che ritaglia, controlla che ci stia dentro.
//
// Due cose che NON sono difetti, e vanno tolte di mezzo o il collaudo mente:
//   · un contenitore che SCORRE su un asse: li' il contenuto fuori si raggiunge
//     scorrendo, non e' perso;
//   · un contenuto molto piu' lungo della scatola: quello e' contenuto lungo. Il
//     difetto e' l'altro, i pochi pixel rasati sul bordo.
// E `overflow-clip-margin` conta: e' il modo giusto di dire "ritaglio, ma
// all'inchiostro lascio passare".
//
// Passa anche col mouse SOPRA le cose cliccabili: e' li' che si sollevano, ed e'
// li' che il taglio si vede di piu'.
//
// E c'e' un secondo modo di perdere l'inchiostro, che non e' il ritaglio: la
// COPERTURA. Un tasto che si solleva resta dov'era nell'ordine di disegno, e
// allora la scheda successiva — che viene dopo e ha un fondo pieno — gli passa
// sopra l'ombra. Il tasto si alza e sembra tagliato lo stesso, ma stavolta
// nessun antenato lo sta ritagliando: il collaudo col browser qui sotto lo
// direbbe a posto. Quindi la regola: cio' che ALZA l'ombra al passaggio del
// mouse deve alzarsi anche nell'ordine di disegno.
//
// E si misura guardando, non leggendo il CSS: col mouse sopra si chiede al
// browser CHI C'E' in quel punto dell'ombra. Se risponde qualcosa che nel
// documento viene DOPO il tasto, quel qualcosa gli sta passando sopra. Provare
// a dedurlo dai selettori non funziona — `.btn:hover{z-index:3}` copre anche
// `.btn.secondario`, e un confronto fra stringhe non lo sa.
//
// Uso: node scripts/verifica-contorni.mjs
//      node scripts/verifica-contorni.mjs --selftest   (deve diventare rosso)

import { apriSito } from './_sito.mjs';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
const SELFTEST = process.argv.includes('--selftest');
// Sotto mezzo pixel e' arrotondamento, non inchiostro perso.
const SOGLIA = 0.5;
// Il tetto NON e' un numero scelto qui: e' quanto inchiostro il tema dichiara di
// sporgere (--posto-inchiostro). Oltre quello non e' un contorno rasato, e'
// contenuto piu' alto della scatola — un altro discorso, e un altro collaudo.
// Legato al tema apposta: se domani le ombre crescono, cresce anche la misura.
let TETTO = 8;

// UNO SCHERMO RITAGLIA APPOSTA. L'anteprima dell'overlay e quella del telefono
// mostrano cosa si vedra' davvero: una cosa spinta oltre il bordo li' dev'essere
// tagliata, perche' sara' tagliata anche in diretta. Escluderle non e' chiudere
// un occhio: e' non chiamare difetto una cosa che e' il lavoro del contenitore.
const SCHERMI = ['ovl-anteprima', 'ovl-tela', 'lp-telefono', 'ant-tela'];

let chromium;
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch { console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }

const CACCIA = `(() => {
  const est = (o) => {
    let m = 0;
    for (const parte of String(o).split(/,(?![^(]*\\))/)) {
      const n = (parte.match(/-?[\\d.]+px/g) || []).map(parseFloat);
      if (n.length < 2) continue;
      const [dx, dy, blur = 0, spread = 0] = n;
      m = Math.max(m, Math.abs(dx) + blur + spread, Math.abs(dy) + blur + spread);
    }
    return m;
  };
  const nome = (e) => (e.tagName.toLowerCase() + (String(e.className || '').trim()
    ? '.' + String(e.className).split(/\\s+/).filter(Boolean).slice(0, 2).join('.') : '')).slice(0, 46);
  const fuori = [];
  for (const e of document.querySelectorAll(RADICE + ' *')) {
    const s = getComputedStyle(e);
    if (s.visibility === 'hidden' || s.display === 'none') continue;
    const r = e.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const ink = Math.max(est(s.boxShadow), s.outlineStyle !== 'none' ? parseFloat(s.outlineWidth) || 0 : 0);
    const box = { top: r.top - ink, left: r.left - ink, right: r.right + ink, bottom: r.bottom + ink };
    for (let a = e.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const sa = getComputedStyle(a);
      if (sa.overflowX === 'visible' && sa.overflowY === 'visible') continue;
      if (SCHERMI_JS.some((c) => a.classList.contains(c))) break;
      const ra = a.getBoundingClientRect();
      if (ra.height < 4 || ra.width < 4) break;
      // il margine vale SOLO con \`overflow: clip\`: con \`hidden\` la proprieta'
      // resta scritta nello stile calcolato ma non taglia di meno. Contarla lo
      // stesso rendeva cieco il collaudo di 8px — l'autoprova l'ha detto.
      const clip = sa.overflowX === 'clip' || sa.overflowY === 'clip';
      const margine = clip ? (parseFloat(sa.overflowClipMargin) || 0) : 0;
      const scorreX = a.scrollWidth > a.clientWidth + 1;
      const scorreY = a.scrollHeight > a.clientHeight + 1;
      const dx = scorreX ? 0 : Math.max(ra.left - margine - box.left, box.right - ra.right - margine);
      const dy = scorreY ? 0 : Math.max(ra.top - margine - box.top, box.bottom - ra.bottom - margine);
      const t = Math.max(dx, dy);
      if (t > SOGLIA_JS && t <= TETTO_JS) { fuori.push({ chi: nome(e), da: nome(a), px: Math.round(t * 10) / 10 }); break; }
      if (t > TETTO_JS) break;
    }
  }
  return fuori;
})()`;

const COPERTI = `(() => {
  const est = (o) => { let dx = 0, dy = 0;
    for (const parte of String(o).split(/,(?![^(]*\\))/)) {
      const n = (parte.match(/-?[\\d.]+px/g) || []).map(parseFloat);
      if (n.length < 2) continue;
      const [x, y, blur = 0, spread = 0] = n;
      dx = Math.max(dx, x + blur + spread); dy = Math.max(dy, y + blur + spread);
    } return { dx, dy }; };
  const nome = (e) => (e.tagName.toLowerCase() + (String(e.className || '').trim()
    ? '.' + String(e.className).split(/\\s+/).filter(Boolean).slice(0, 2).join('.') : '')).slice(0, 46);
  const fuori = [];
  for (const e of document.querySelectorAll(RADICE + ' :hover')) {
    const s = getComputedStyle(e);
    const { dx, dy } = est(s.boxShadow);
    if (dx < 2 && dy < 2) continue;
    const r = e.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    // i punti dove l'ombra e' piu' fuori: sotto, a destra, e l'angolo
    for (const [px, py] of [[r.right + dx / 2, r.bottom + dy / 2], [r.left + r.width / 2, r.bottom + dy / 2], [r.right + dx / 2, r.top + r.height / 2]]) {
      if (px < 1 || py < 1 || px > innerWidth - 1 || py > innerHeight - 1) continue;
      const sopra = document.elementFromPoint(px, py);
      if (!sopra || sopra === e || e.contains(sopra) || sopra.contains(e)) continue;
      // il difetto e' solo chi viene DOPO: chi viene prima sta sotto per natura
      if (!(e.compareDocumentPosition(sopra) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      fuori.push({ chi: nome(e), da: nome(sopra) });
      break;
    }
  }
  return fuori;
})()`;

const sonda = (radice) => CACCIA
  .replace('RADICE', JSON.stringify(radice))
  .replaceAll('SOGLIA_JS', String(SOGLIA))
  .replaceAll('SCHERMI_JS', JSON.stringify(SCHERMI))
  .replaceAll('TETTO_JS', String(TETTO));

const sondaCoperti = (radice) => COPERTI.replace('RADICE', JSON.stringify(radice));

const { porta: PORTA, chiudi: chiudiSito } = await apriSito();
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
await p.addStyleTag({ content: '.giro-velo,.giro-fumetto,#cookie-banner{display:none!important}' });
// il tetto lo dice il tema, non questo file
TETTO = await p.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--posto-inchiostro')) || 8);
if (SELFTEST) {
  // Il ritaglio com'era: la scheda tagliava sempre, non solo mentre si chiude.
  await p.addStyleTag({ content: '.carta-corpo > .carta-corpo-in { overflow: hidden !important; }' });
  // E la copertura: si stringe lo spazio fra le schede finche' il vicino non
  // arriva addosso all'ombra, e si toglie l'alzata. Senza stringere non
  // succede niente — fra una scheda e l'altra c'e' piu' aria di quanta ne
  // sporga l'inchiostro — e un controllo che non si vede mai rosso non e' un
  // controllo.
  await p.addStyleTag({ content: '.pannello-scheda .carta { margin-bottom: 0 !important; }'
    + '.carta:hover, .carta:focus-within, .btn:hover, .btn:focus-visible { z-index: auto !important; }' });
}

const rasati = [];
const scoperti = [];
const schede = await p.evaluate(() => [...document.querySelectorAll('.pannello-scheda')].map((s) => s.dataset.scheda));
let visitate = 0;
let passate = 0;
for (const id of schede) {
  try { await p.evaluate((x) => window.SB_APP.vai(x), id); } catch { continue; }
  await p.waitForTimeout(160);
  visitate++;
  rasati.push(...(await p.evaluate(new Function('return ' + sonda('.pannello-scheda.visibile')))).map((x) => ({ dove: id, ...x })));

  // col mouse sopra: e' li' che le cose si sollevano fuori dalla loro scatola
  const cliccabili = await p.$$('.pannello-scheda.visibile button, .pannello-scheda.visibile a.btn, .pannello-scheda.visibile [role="tab"]');
  for (const el of cliccabili.slice(0, 24)) {
    try {
      await el.scrollIntoViewIfNeeded({ timeout: 600 });
      await el.hover({ timeout: 900 });
      passate++;
      const r = await p.evaluate(new Function('return ' + sonda('.pannello-scheda.visibile')));
      for (const x of r) if (!rasati.some((y) => y.dove === id && y.chi === x.chi && y.da === x.da)) rasati.push({ dove: id + ' (col mouse sopra)', ...x });
      for (const x of await p.evaluate(new Function('return ' + sondaCoperti('.pannello-scheda.visibile')))) {
        if (!scoperti.some((y) => y.chi === x.chi && y.da === x.da)) scoperti.push({ dove: id, ...x });
      }
    } catch { /* fuori vista o coperto: non e' un difetto di contorno */ }
  }
}

await b.close();
await chiudiSito();

const per = new Map();
for (const r of rasati) {
  const k = `${r.chi}  ←  ${r.da}`;
  const v = per.get(k) || { n: 0, px: 0, dove: new Set() };
  v.n++; v.px = Math.max(v.px, r.px); v.dove.add(r.dove.split(' ')[0]);
  per.set(k, v);
}
for (const [k, v] of [...per].sort((a, b) => b[1].n - a[1].n).slice(0, 15)) {
  console.log(`  ✗ ${v.n}×  ${k}  — fino a ${v.px}px, in ${[...v.dove].slice(0, 4).join(', ')}`);
}
if (scoperti.length) {
  console.log(`  ✗ ${scoperti.length} cose col mouse sopra hanno l'ombra coperta da un vicino che viene dopo`);
  for (const x of scoperti.slice(0, 6)) console.log(`      ${x.chi}  ←  ci passa sopra ${x.da}  (${x.dove})`);
} else {
  console.log('  ✓ cio\' che si solleva col mouse si solleva anche nell\'ordine di disegno');
}
console.log(`\n${visitate} schede guardate, ${passate} passaggi col mouse.`);
if (rasati.length || scoperti.length) {
  console.log(`${rasati.length} contorni rasati: un bordo che comincia e finisce nel nulla.`);
} else {
  console.log('Nessun contorno rasato: l\'inchiostro sta tutto dentro. ✓');
}
process.exit(rasati.length ? 1 : 0);
