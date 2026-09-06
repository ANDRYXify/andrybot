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
// E c'e' un terzo modo, piu' piccolo e piu' visibile di tutti: una parte che
// esce dalla sua scatola perche' i suoi numeri non tornano piu'. E' successo
// alle levette: il tema ha aggiunto un bordo alla pallina, e la pallina misura
// in `content-box` — quindi e' cresciuta di quattro pixel mentre le posizioni
// erano rimaste quelle di prima. Risultato: pallina storta, che sbordava sotto e
// a destra. Adesso le misure si RICAVANO dalla pista, e qui si controlla che il
// conto torni davvero, spenta e accesa.
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

const LEVETTE = `(() => {
  const num = (v) => parseFloat(v) || 0;
  const fuori = [];
  for (const i of document.querySelectorAll(RADICE + ' .interruttore')) {
    const lev = i.querySelector('.levetta');
    if (!lev || !lev.offsetWidth) continue;
    const s = getComputedStyle(lev), pre = getComputedStyle(lev, '::before');
    const r = lev.getBoundingClientRect();
    const dw = r.width - num(s.borderLeftWidth) - num(s.borderRightWidth);
    const dh = r.height - num(s.borderTopWidth) - num(s.borderBottomWidth);
    const bordo = pre.boxSizing === 'border-box' ? 0 : num(pre.borderLeftWidth) * 2;
    const tw = num(pre.width) + bordo, th = num(pre.height) + bordo;
    const tras = pre.transform === 'none' ? 0 : num((pre.transform.match(/matrix\\([^)]*\\)/) || [''])[0].split(',')[4]);
    const su = num(pre.top), sotto = dh - su - th;
    const sx = num(pre.left) + tras, dx = dw - sx - tw;
    const nome = (i.className || 'interruttore') + (i.querySelector('input')?.checked ? ' accesa' : ' spenta');
    if (Math.abs(su - sotto) > 0.6) fuori.push({ chi: nome, perche: \`storta: \${su} sopra, \${sotto} sotto\` });
    else if (Math.min(su, sotto, sx, dx) < -0.1) fuori.push({ chi: nome, perche: \`esce dalla pista (su \${su} sotto \${sotto} sx \${sx} dx \${dx})\` });
  }
  return fuori;
})()`;
const sondaLevette = (radice) => LEVETTE.replace('RADICE', JSON.stringify(radice));

// LE FRECCETTE DEI RIQUADRI CHE SI APRONO.
//
// Sul sito l'alone del contorno vive su `::after` di TUTTO cio' che si preme,
// summary compreso. Chi disegna la freccetta sullo stesso `::after` non se ne
// accorge: non e' un errore, e' l'ultima regola che vince. La freccia sparisce
// (l'alone la porta a opacita' zero) oppure resta lei e sparisce l'alone.
// Nessuno dei due casi da' un errore, e leggendo il CSS sembrano tutti a posto.
// Quindi si CHIEDE AL BROWSER: quella freccia, adesso, si vede?
const FRECCE = `(() => {
  const num = (v) => parseFloat(v) || 0;
  const nome = (e) => (e.tagName.toLowerCase() + (String(e.className || '').trim()
    ? '.' + String(e.className).split(/\\s+/).filter(Boolean).slice(0, 2).join('.') : '')).slice(0, 44);
  const mute = [];
  for (const d of document.querySelectorAll(RADICE + ' details')) {
    const s = d.querySelector(':scope > summary');
    if (!s || !s.offsetWidth) continue;
    if (getComputedStyle(s).listStyleType !== 'none' && !getComputedStyle(s, '::-webkit-details-marker').display) continue;
    const segni = ['::before', '::after'].map((q) => {
      const c = getComputedStyle(s, q);
      const bordi = num(c.borderRightWidth) + num(c.borderBottomWidth) + num(c.borderTopWidth) + num(c.borderLeftWidth);
      const glifo = c.content !== 'none' && c.content !== '""' && c.content !== 'normal';
      return { q, segno: c.content !== 'none' && (bordi > 0 || glifo), opac: num(c.opacity),
        largo: Math.max(num(c.width), glifo ? 6 : 0) };
    });
    const viva = segni.find((x) => x.segno && x.opac >= .5 && x.largo >= 3);
    if (!viva) mute.push({ chi: nome(d), perche: segni.filter((x) => x.segno)
      .map((x) => x.q + ' opacita ' + x.opac + ', largo ' + Math.round(x.largo) + 'px').join(' · ') || 'nessun segno' });
  }
  return mute;
})()`;
const sondaFrecce = (radice) => FRECCE.replace('RADICE', JSON.stringify(radice));

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
  // La levetta com'era: la pallina cresciuta del bordo, con le posizioni di
  // quando il bordo non c'era.
  await p.addStyleTag({ content: '.levetta::before { box-sizing: content-box !important; height: 19px !important; width: 19px !important; top: 2px !important; }' });
  // E la freccetta com'era: disegnata sullo stesso ::after dell'alone, che la
  // spegne. Nel CSS si legge una freccia; a schermo non c'e'.
  await p.addStyleTag({ content: '.guida-scheda > summary::before, .mini-guida > summary::before, .legenda-var > summary::before { opacity: 0 !important; }' });
  await p.addStyleTag({ content: '.pannello-scheda .carta { margin-bottom: 0 !important; }'
    + '.carta:hover, .carta:focus-within, .btn:hover, .btn:focus-visible { z-index: auto !important; }' });
}

const rasati = [];
const scoperti = [];
const storte = [];
const mute = [];
const schede = await p.evaluate(() => [...document.querySelectorAll('.pannello-scheda')].map((s) => s.dataset.scheda));
let visitate = 0;
let passate = 0;
for (const id of schede) {
  try { await p.evaluate((x) => window.SB_APP.vai(x), id); } catch { continue; }
  await p.waitForTimeout(160);
  visitate++;
  rasati.push(...(await p.evaluate(new Function('return ' + sonda('.pannello-scheda.visibile')))).map((x) => ({ dove: id, ...x })));

  // le levette, spente e accese: il conto dev'essere simmetrico in tutti e due i modi
  for (const acceso of [false, true]) {
    await p.evaluate((v) => { for (const x of document.querySelectorAll('.pannello-scheda.visibile .interruttore input')) x.checked = v; }, acceso);
    for (const x of await p.evaluate(new Function('return ' + sondaLevette('.pannello-scheda.visibile')))) {
      if (!storte.some((y) => y.chi === x.chi && y.perche === x.perche)) storte.push({ dove: id, ...x });
    }
  }

  // e le freccette dei riquadri che si aprono: aperti e chiusi
  for (const aperto of [false, true]) {
    await p.evaluate((v) => { for (const d of document.querySelectorAll('.pannello-scheda.visibile details')) d.open = v; }, aperto);
    for (const x of await p.evaluate(new Function('return ' + sondaFrecce('.pannello-scheda.visibile')))) {
      if (!mute.some((y) => y.chi === x.chi && y.perche === x.perche)) mute.push({ dove: id, ...x });
    }
  }

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
if (storte.length) {
  console.log(`  ✗ ${storte.length} levette col pallino storto o fuori dalla pista`);
  for (const x of storte.slice(0, 5)) console.log(`      ${x.chi} — ${x.perche}  (${x.dove})`);
} else {
  console.log('  ✓ il pallino delle levette sta in mezzo, e dentro');
}
if (mute.length) {
  console.log(`  ✗ ${mute.length} riquadri che si aprono senza una freccia che si veda`);
  for (const x of mute.slice(0, 6)) console.log(`      ${x.chi} — ${x.perche}  (${x.dove})`);
} else {
  console.log('  ✓ ogni riquadro che si apre mostra la sua freccia');
}
if (scoperti.length) {
  console.log(`  ✗ ${scoperti.length} cose col mouse sopra hanno l'ombra coperta da un vicino che viene dopo`);
  for (const x of scoperti.slice(0, 6)) console.log(`      ${x.chi}  ←  ci passa sopra ${x.da}  (${x.dove})`);
} else {
  console.log('  ✓ cio\' che si solleva col mouse si solleva anche nell\'ordine di disegno');
}
console.log(`\n${visitate} schede guardate, ${passate} passaggi col mouse.`);
if (rasati.length || scoperti.length || storte.length || mute.length) {
  console.log(`${rasati.length} contorni rasati: un bordo che comincia e finisce nel nulla.`);
} else {
  console.log('Nessun contorno rasato: l\'inchiostro sta tutto dentro. ✓');
}
process.exit(rasati.length || mute.length ? 1 : 0);
