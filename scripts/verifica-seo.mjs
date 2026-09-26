// Cancello della SEO: ogni pagina della sitemap e' quella che dice di essere.
//
// docs/SEO.md raccontava un controllo automatico (pagine sottili, title e
// description fuori misura, canonical, h1, dati strutturati) che nel repository
// non c'era. Senza, quattro title erano cresciuti oltre i 65 caratteri e due
// description oltre i 165, e nessuno se n'era accorto: nei risultati si leggono
// tagliati.
//
// Come si tiene. L'elenco delle pagine NON sta qui: e' la sitemap, composta da
// src/web/sitemap.js con la stessa funzione che usa il server. Per ogni voce il
// cancello si fa dare la pagina che il server manda a quell'indirizzo (stessi
// costruttori: guscioVetrina, paginaGuida, paginaManuale, ...) e pretende che:
//  · dichiari come canonico e come og:url proprio quell'indirizzo;
//  · abbia <html lang> nella lingua della voce, e un gruppo hreflang uguale a
//    quello della sitemap (con x-default), cosi' e' reciproco per costruzione;
//  · title e description stiano nelle misure che i risultati mostrano interi,
//    e siano suoi: due pagine con lo stesso titolo si fanno concorrenza;
//  · abbia un h1 solo, dati strutturati che si leggono, nessun noindex;
//  · ogni collegamento interno porti a una voce della sitemap, a un file che
//    esiste o a una rotta che il server ha davvero, e ogni #ancora a un id che
//    la pagina ha;
//  · nessuna voce resti orfana: una pagina che nessun'altra collega esiste, ma
//    non la trova nessuno;
//  · le guide non siano sottili, e le date della sitemap siano date vere.
//
// Uso: node scripts/verifica-seo.mjs [--selftest]

import { readFileSync, statSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

// I piani della vetrina si leggono dal modulo degli abbonamenti, che vuole una
// cartella dei dati: gliene diamo una vuota e usa-e-getta, mai quella vera.
const DATI = mkdtempSync(join(tmpdir(), 'seo-'));
process.env.DATA_DIR = DATI;
process.on('exit', () => { try { rmSync(DATI, { recursive: true, force: true }); } catch { /* niente */ } });

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(RAD, 'src/web/public');

const { guscioVetrina, VIA_LINGUA, SITO } = await import('../src/web/vetrina-vista.js');
const { paginaGuida, paginaIndice, paginaNovita, VIE, LINGUE_DOC } = await import('../src/web/guide.js');
const { paginaManuale, paginaIndiceManuali, aiutiPerScheda } = await import('../src/web/manuali.js');
const novita = await import('../src/web/novita.js');
const { vociPubbliche } = await import('../src/web/sitemap.js');
const { pianiPubblici } = await import('../src/features/abbonamenti.js');

// L'indirizzo del sostegno in produzione: il sottodominio (SOSTIENI_HOST), che e'
// anche il canonico che la pagina dichiara.
const SOSTIENI = 'https://sostieni.socialbot.live/';

// Gli indirizzi corti: rotte che il server manda con un 301 a una voce della
// sitemap. /sostieni rimanda al sottodominio quando la sonda lo trova acceso, e
// serve la pagina da se' quando e' spento: i collegamenti restano corti apposta,
// cosi' funzionano in tutti e due i casi. Per chi li segue portano li'.
const CORTI = { [`${SITO}/sostieni`]: SOSTIENI };

// Le misure. Il title oltre i 65 caratteri e la description oltre i 165 escono
// tagliati nei risultati; una description sotto i 70 lascia a Google il compito
// di inventarsela. Una guida sotto le 700 parole e' una pagina sottile: resta
// «scansionata, non indicizzata» anche se la si sottopone a mano.
export const MISURE = { titolo: 65, descrizione: [70, 165], paroleGuida: 700 };

// ── Il sito come lo manda il server ──────────────────────────────────────────

export function componiSito() {
  const pubbliche = novita.pubbliche(novita.leggi(join(RAD, 'NOVITA.md')));
  const voci = vociPubbliche({ base: SITO, pubbliche, sostieni: SOSTIENI, publicDir: PUB });
  const guscio = readFileSync(join(PUB, 'index.html'), 'utf8');
  const piani = pianiPubblici();
  const file = (nome) => readFileSync(join(PUB, nome), 'utf8');
  const servita = (u) => {
    if (u === SOSTIENI) return file('sostieni.html');
    const url = new URL(u);
    if (url.origin !== SITO) return null;
    const p = url.pathname.replace(/(.)\/$/, '$1');
    for (const [l, via] of Object.entries(VIA_LINGUA)) if (p === via) return guscioVetrina(guscio, l, { kick: true, piani });
    for (const l of LINGUE_DOC) {
      if (p === VIE[l].guide) return paginaIndice(l);
      if (p.startsWith(VIE[l].guide + '/')) return paginaGuida(p.slice(VIE[l].guide.length + 1), l);
      if (p === VIE[l].manuali) return paginaIndiceManuali(l);
      if (p.startsWith(VIE[l].manuali + '/')) return paginaManuale(p.slice(VIE[l].manuali.length + 1), l);
    }
    if (p === '/novita') return paginaNovita(pubbliche, aiutiPerScheda());
    if (p === '/privacy') return file('privacy.html');
    if (p === '/termini') return file('termini.html');
    return null;
  };
  const pagine = new Map(voci.map((v) => [v.u, servita(v.u)]));
  return { voci, pagine };
}

// ── Leggere una pagina ───────────────────────────────────────────────────────

const ENTITA = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', ndash: '–', mdash: '—', middot: '·', rarr: '→', larr: '←', egrave: 'è', eacute: 'é', agrave: 'à', ograve: 'ò', ugrave: 'ù', igrave: 'ì' };
const decodifica = (s) => String(s)
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&([a-z]+);/gi, (m, n) => ENTITA[n.toLowerCase()] ?? m);

// Quello che il browser non mostra e un crawler non conta come pagina.
const senzaNascosti = (h) => h.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|template|noscript)\b[\s\S]*?<\/\1>/gi, '');

const attributi = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)].map((m) => [m[1].toLowerCase(), decodifica(m[2])]));
const tagDi = (h, nome) => [...h.matchAll(new RegExp(`<${nome}\\b[^>]*>`, 'gi'))].map((m) => attributi(m[0]));

const norm = (u) => { const x = new URL(u); return x.origin + (x.pathname.replace(/(.)\/$/, '$1')); };

// Ogni oggetto dentro un JSON-LD, @graph compreso.
function* nodi(o) {
  if (Array.isArray(o)) { for (const x of o) yield* nodi(x); return; }
  if (!o || typeof o !== 'object') return;
  yield o;
  for (const v of Object.values(o)) if (v && typeof v === 'object') yield* nodi(v);
}

export function leggi(html, u) {
  const testa = html.slice(0, html.search(/<\/head>/i) + 1 || html.length);
  const corpo = senzaNascosti(html.slice(testa.length));
  const meta = tagDi(testa, 'meta');
  const link = tagDi(testa, 'link');
  const m = (chiave, val) => meta.filter((x) => x[chiave] === val).map((x) => x.content);
  const principale = (corpo.match(/<main\b[\s\S]*<\/main>/i) || [corpo])[0];
  const parole = (decodifica(principale.replace(/<[^>]+>/g, ' ')).match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
  const collegamenti = [...corpo.matchAll(/<a\b[^>]*>/gi)].map((x) => attributi(x[0]).href).filter(Boolean)
    .map((href) => { try { return new URL(href, u); } catch { return null; } })
    .filter((x) => x && /^https?:$/.test(x.protocol));
  return {
    lingua: (html.match(/<html\b[^>]*\blang="([^"]+)"/i) || [])[1],
    titoli: [...testa.matchAll(/<title>([\s\S]*?)<\/title>/gi)].map((x) => decodifica(x[1]).trim()),
    descrizioni: m('name', 'description'),
    robots: m('name', 'robots').join(','),
    og: { url: m('property', 'og:url'), title: m('property', 'og:title'), description: m('property', 'og:description'), image: m('property', 'og:image') },
    canonici: link.filter((x) => x.rel === 'canonical').map((x) => x.href),
    lingue: Object.fromEntries(link.filter((x) => x.rel === 'alternate' && x.hreflang).map((x) => [x.hreflang, x.href])),
    h1: (corpo.match(/<h1[\s>]/gi) || []).length,
    ld: [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map((x) => x[1]),
    id: new Set([...corpo.matchAll(/\s(?:id|name)="([^"]+)"/g)].map((x) => x[1])),
    parole,
    collegamenti,
  };
}

// ── Le rotte che il server ha davvero ────────────────────────────────────────

function sorgentiJs(dir, out = []) {
  for (const n of readdirSync(dir, { withFileTypes: true })) {
    if (n.name === 'public' || n.name === 'node_modules') continue;
    const p = join(dir, n.name);
    if (n.isDirectory()) sorgentiJs(p, out);
    else if (n.name.endsWith('.js')) out.push(p);
  }
  return out;
}

// Solo le rotte senza parametri: «/guide/:slug» dice che il server risponde a
// quella forma, non che la guida esiste. Quelle si cercano fra le voci.
export function rotteFisse() {
  const rotte = new Set();
  for (const f of sorgentiJs(join(RAD, 'src'))) {
    const t = readFileSync(f, 'utf8');
    for (const m of t.matchAll(/\b(?:app|router)\.(?:get|all)\(\s*(\[[^\]]*\]|'[^']*')/g)) {
      for (const r of m[1].matchAll(/'([^']*)'/g)) if (!r[1].includes(':') && !r[1].includes('*')) rotte.add(r[1].replace(/(.)\/$/, '$1'));
    }
  }
  return rotte;
}

// Le schede del pannello: sulla home un #ancora e' una scheda (/#account apre
// «Il tuo account» a chi e' entrato, e la home a chi no). Sono quelle che il
// pannello disegna, lette come le legge test/contratto/aiuti.test.mjs.
export function schedePannello() {
  const app = readFileSync(join(PUB, 'app.js'), 'utf8');
  return new Set([...app.matchAll(/pannello\('([a-z0-9-]+)'/g)].map((m) => m[1]));
}

// ── I guai ───────────────────────────────────────────────────────────────────

const OGGI = new Date().toISOString().slice(0, 10);

export function guai({ voci, pagine }, rotte = rotteFisse(), schede = schedePannello()) {
  const g = {};
  const segna = (chi, cosa) => { (g[chi] ||= []).push(cosa); };
  const indirizzi = new Map(voci.map((v) => [norm(v.u), v.u]));
  const lette = new Map();
  const home = new Set(Object.values(VIA_LINGUA).map((via) => norm(SITO + via)));
  for (const v of voci) {
    const h = pagine.get(v.u);
    if (!h) { segna('pagina', `${v.u}: nella sitemap, ma il server non ci manda nessuna pagina`); continue; }
    lette.set(v.u, leggi(h, v.u));
  }
  const lingua = (v) => (v.alt ? Object.keys(v.alt).find((l) => v.alt[l] === v.u) : 'it');
  const visti = { titolo: new Map(), descrizione: new Map() };
  const entranti = new Map(voci.map((v) => [v.u, new Set()]));

  for (const v of voci) {
    const p = lette.get(v.u);
    if (!p) continue;
    const [t, ...altriT] = p.titoli;
    if (!t || altriT.length) segna('titolo', `${v.u}: ${p.titoli.length} title`);
    else if ([...t].length > MISURE.titolo) segna('titolo', `${v.u}: title di ${[...t].length} caratteri (${MISURE.titolo} al massimo) «${t}»`);
    const [d, ...altreD] = p.descrizioni;
    if (!d || altreD.length) segna('descrizione', `${v.u}: ${p.descrizioni.length} description`);
    else if ([...d].length > MISURE.descrizione[1] || [...d].length < MISURE.descrizione[0]) segna('descrizione', `${v.u}: description di ${[...d].length} caratteri (fra ${MISURE.descrizione.join(' e ')})`);
    for (const [cosa, val] of [['titolo', t], ['descrizione', d]]) {
      if (!val) continue;
      if (visti[cosa].has(val)) segna('unici', `${v.u} e ${visti[cosa].get(val)}: stesso ${cosa} «${val.slice(0, 60)}»`);
      else visti[cosa].set(val, v.u);
    }
    if (p.canonici.length !== 1 || p.canonici[0] !== v.u) segna('canonico', `${v.u}: canonical ${p.canonici.join(' + ') || 'assente'}`);
    if (p.og.url.length !== 1 || p.og.url[0] !== v.u) segna('anteprima', `${v.u}: og:url ${p.og.url.join(' + ') || 'assente'}`);
    for (const k of ['title', 'description', 'image']) if (p.og[k].length !== 1 || !p.og[k][0]) segna('anteprima', `${v.u}: og:${k} ${p.og[k].length ? 'vuoto o doppio' : 'assente'}`);
    if (!p.lingua || p.lingua.split('-')[0] !== lingua(v)) segna('lingua', `${v.u}: <html lang="${p.lingua || ''}"> in una voce ${lingua(v)}`);
    const attese = v.alt && Object.keys(v.alt).length > 1 ? { ...v.alt, 'x-default': v.alt.it } : {};
    const chiavi = (o) => Object.keys(o).sort().map((k) => `${k}=${o[k]}`).join(' ');
    if (chiavi(p.lingue) !== chiavi(attese)) segna('lingue', `${v.u}: hreflang «${chiavi(p.lingue) || 'nessuno'}» ma la sitemap dice «${chiavi(attese) || 'nessuno'}»`);
    if (p.h1 !== 1) segna('h1', `${v.u}: ${p.h1} h1`);
    p.ld.forEach((j, i) => {
      let o;
      try { o = JSON.parse(j); if (!o['@context']) throw new Error('senza @context'); } catch (e) { segna('dati', `${v.u}: blocco JSON-LD ${i + 1} non si legge (${e.message})`); return; }
      for (const n of nodi(o)) {
        const tipi = [].concat(n['@type'] || []);
        if (tipi.some((t) => /^(WebPage|CollectionPage|AboutPage|ProfilePage|ItemPage)$/.test(t)) && n.url && n.url !== v.u) segna('dati', `${v.u}: il ${tipi[0]} dei dati strutturati dice ${n.url}`);
        const di = n.mainEntityOfPage?.['@id'] || (typeof n.mainEntityOfPage === 'string' ? n.mainEntityOfPage : '');
        if (di && di !== v.u) segna('dati', `${v.u}: mainEntityOfPage dice ${di}`);
      }
    });
    if (!p.ld.length) segna('dati', `${v.u}: nessun dato strutturato`);
    if (/noindex|none/i.test(p.robots)) segna('indice', `${v.u}: robots «${p.robots}» in una pagina della sitemap`);
    const guida = LINGUE_DOC.some((l) => new URL(v.u).pathname.startsWith(VIE[l].guide + '/'));
    if (guida && p.parole < MISURE.paroleGuida) segna('parole', `${v.u}: ${p.parole} parole (una guida ne vuole ${MISURE.paroleGuida})`);
    if (v.m !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(v.m) || v.m > OGGI)) segna('date', `${v.u}: lastmod «${v.m}»`);

    for (const x of p.collegamenti) {
      const dentro = x.origin === SITO || indirizzi.has(norm(x.href));
      if (!dentro) continue;
      const via = x.pathname.replace(/(.)\/$/, '$1');
      const corto = CORTI[norm(x.href)] && rotte.has(via) ? CORTI[norm(x.href)] : null;
      const voce = indirizzi.get(norm(corto || x.href));
      let file = false;
      try { file = statSync(join(PUB, decodeURIComponent(x.pathname))).isFile(); } catch { /* non c'e' */ }
      if (!voce && !file && !rotte.has(via)) { segna('collegamenti', `${v.u} → ${x.pathname}: non porta da nessuna parte`); continue; }
      if (voce && voce !== v.u) entranti.get(voce).add(v.u);
      const frammento = decodeURIComponent(x.hash.slice(1));
      if (frammento && voce) {
        const arrivo = lette.get(voce);
        const scheda = home.has(norm(voce)) && schede.has(frammento);
        if (arrivo && !arrivo.id.has(frammento) && !scheda) segna('ancore', `${v.u} → ${x.pathname}#${frammento}: la pagina non ha quell'id`);
      }
    }
  }
  for (const [u, da] of entranti) if (lette.has(u) && !home.has(norm(u)) && !da.size) segna('orfane', `${u}: nessuna pagina del sito la collega`);
  return g;
}

// ── Le promesse, in ordine ───────────────────────────────────────────────────

const PROMESSE = [
  ['pagina', 'ogni voce della sitemap ha la sua pagina'],
  ['canonico', 'ogni pagina si dichiara canonica a se stessa'],
  ['anteprima', "e l'anteprima dei link dice lo stesso indirizzo, con titolo, testo e immagine"],
  ['lingua', 'la lingua della pagina e\' quella della voce'],
  ['lingue', 'il gruppo hreflang e\' quello della sitemap, con x-default'],
  ['titolo', `title di ${MISURE.titolo} caratteri al massimo`],
  ['descrizione', `description fra ${MISURE.descrizione.join(' e ')} caratteri`],
  ['unici', 'nessun title e nessuna description ripetuti fra due pagine'],
  ['h1', 'un h1 solo'],
  ['dati', 'dati strutturati presenti e leggibili'],
  ['indice', 'nessuna pagina della sitemap dice noindex'],
  ['collegamenti', 'ogni collegamento interno porta a una pagina, a un file o a una rotta vera'],
  ['ancore', 'ogni #ancora trova il suo id'],
  ['orfane', 'nessuna pagina orfana'],
  ['parole', `guide di almeno ${MISURE.paroleGuida} parole`],
  ['date', 'le date della sitemap sono date, e non nel futuro'],
];

function racconta(g) {
  for (const [k, che] of PROMESSE) {
    const lista = g[k] || [];
    console.log(`  ${lista.length ? '✗' : '✓'} ${che}${lista.length ? `  → ${lista.length}` : ''}`);
    for (const r of lista.slice(0, 12)) console.log(`      ${r}`);
    if (lista.length > 12) console.log(`      … e altri ${lista.length - 12}`);
  }
}

if (process.argv.includes('--selftest')) {
  const vero = componiSito();
  const rotte = rotteFisse();
  const schede = schedePannello();
  const puliti = guai(vero, rotte, schede);
  if (Object.keys(puliti).length) { console.log("  ✗ il sito di partenza non e' verde: l'autoprova non puo' dire niente"); racconta(puliti); process.exit(1); }
  const cerca = (pezzo) => vero.voci.find((v) => (vero.pagine.get(v.u) || '').includes(pezzo))?.u;
  const guida = vero.voci.find((v) => v.u.includes(VIE.it.guide + '/'))?.u;
  const homeEn = SITO + VIA_LINGUA.en;
  const altraGuida = vero.voci.filter((v) => v.u.includes(VIE.it.guide + '/'))[1]?.u;
  const rompi = (u, da, a) => {
    const h = vero.pagine.get(u);
    if (!u || !h || !(typeof da === 'string' ? h.includes(da) : da.test(h))) return null;
    return { voci: vero.voci, pagine: new Map(vero.pagine).set(u, h.replace(da, a)) };
  };
  const ROTTURE = [
    ['un title che cresce oltre la misura', 'titolo', rompi(guida, /<title>/, '<title>Una frase in piu\' messa davanti a tutto il resto — ')],
    ['una description troppo corta', 'descrizione', rompi(guida, /(<meta name="description" content=")[^"]*"/, '$1Una guida."')],
    ['un canonical che punta altrove', 'canonico', rompi(guida, /(<link rel="canonical" href=")[^"]*"/, `$1${SITO}/"`)],
    ['un og:url che non e\' il canonico', 'anteprima', rompi(guida, /(<meta property="og:url" content=")[^"]*"/, `$1${SITO}/guide"`)],
    ['una pagina che si dimentica la lingua', 'lingua', rompi(homeEn, /<html lang="en"/, '<html lang="it"')],
    ['un hreflang che non ricambia', 'lingue', rompi(homeEn, /\s*<link rel="alternate" hreflang="es"[^>]*>/, '')],
    ['due h1', 'h1', rompi(guida, '</main>', '<h1>Ancora</h1></main>')],
    ['dati strutturati che dicono un altro indirizzo', 'dati', rompi(`${SITO}/privacy`, `"url":"${SITO}/privacy"`, `"url":"${SITO}/termini"`)],
    ['un indirizzo corto che il server non ha piu\'', 'collegamenti', vero, new Set([...rotte].filter((r) => r !== '/sostieni'))],
    ['un JSON-LD che non si legge', 'dati', rompi(guida, '<script type="application/ld+json">', '<script type="application/ld+json">{,')],
    ['un noindex in una pagina della sitemap', 'indice', rompi(guida, '</head>', '<meta name="robots" content="noindex"></head>')],
    ['un collegamento a una pagina che non c\'e\'', 'collegamenti', rompi(guida, '</main>', `<a href="${VIE.it.guide}/guida-che-non-esiste">x</a></main>`)],
    ['un\'ancora senza il suo id', 'ancore', rompi(guida, '</main>', '<a href="#capitolo-che-non-esiste">x</a></main>')],
    ['una scheda del pannello che non c\'e\'', 'ancore', rompi(guida, '</main>', '<a href="/#scheda-che-non-esiste">x</a></main>')],
    ['un title copiato da un\'altra pagina', 'unici', (() => { const t = ((vero.pagine.get(altraGuida) || '').match(/<title>[\s\S]*?<\/title>/) || [])[0]; return t ? rompi(guida, /<title>[\s\S]*?<\/title>/, t) : null; })()],
    ['una guida che si svuota', 'parole', rompi(guida, /<main\b[\s\S]*<\/main>/, '<main><h1>Guida</h1><p>Poche parole.</p></main>')],
    ['una voce della sitemap senza pagina', 'pagina', { voci: [...vero.voci, { u: `${SITO}${VIE.it.guide}/sparita`, p: '0.7', f: 'monthly' }], pagine: vero.pagine }],
    ['una data della sitemap nel futuro', 'date', { voci: vero.voci.map((v, i) => (i === 0 ? { ...v, m: '2999-01-01' } : v)), pagine: vero.pagine }],
    ['una pagina che nessuno collega piu\'', 'orfane', (() => {
      const bersaglio = vero.voci.find((v) => v.u.includes('/termini'))?.u;
      if (!bersaglio) return null;
      const via = new URL(bersaglio).pathname;
      const re = new RegExp(`href="(?:${SITO.replace(/[.]/g, '\\.')})?${via}"`, 'g');
      return { voci: vero.voci, pagine: new Map([...vero.pagine].map(([u, h]) => [u, h ? h.replace(re, 'href="#"') : h])) };
    })()],
  ];
  let cieche = 0;
  for (const [che, dove, sito, altreRotte] of ROTTURE) {
    if (!sito) { console.log(`  ?  ${che}  → non so piu' come romperlo: l'autoprova e' scaduta`); cieche++; continue; }
    const visto = (guai(sito, altreRotte || rotte, schede)[dove] || []).length > 0;
    console.log((visto ? '  ✓  ' : '  ✗  ') + che + (visto ? '' : '  → PASSA INOSSERVATO'));
    if (!visto) cieche++;
  }
  console.log(cieche ? `\n${cieche} ${cieche === 1 ? 'rottura non vista' : 'rotture non viste'}.` : "\nOgni rottura e' vista. ✓");
  process.exit(cieche ? 1 : 0);
}

const sito = componiSito();
const trovati = guai(sito);
console.log(`Ogni pagina della sitemap e' quella che dice di essere: ${sito.voci.length} pagine.\n`);
racconta(trovati);
const n = Object.values(trovati).reduce((s, l) => s + l.length, 0);
console.log(n ? `\n${n} cose non tornano.` : '\ncollaudo verde ✓');
process.exit(n ? 1 : 0);
