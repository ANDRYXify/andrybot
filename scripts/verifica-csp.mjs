// Cancello della CSP e di quello che il sito dichiara al mondo.
//
// L'invariante: NESSUNA pagina servita ha uno <script> scritto dentro l'HTML,
// e nessun elemento ha un attributo on-qualcosa. Percio' `script-src` non ha
// bisogno di 'unsafe-inline' — che e' il permesso che rende una CSP quasi
// inutile contro l'XSS, perche' un pezzo di HTML iniettato puo' portarsi
// dietro il suo <script>.
//
// Il verso giusto e' questo: se domani rientra uno script inline, smette di
// funzionare e questo cancello diventa rosso. Non si allarga la CSP per farlo
// tornare a funzionare: si porta lo script in un file.
//
// Due permessi restano, ed entrambi hanno una ragione misurata:
//  · 'inline-speculation-rules' — serve SOLO al blocco <script
//    type="speculationrules"> del prefetch. Senza, Chrome lo rifiuta
//    ("Refused to apply inline speculation rules", riprodotto sul banco).
//    Non abilita nessun altro script inline.
//  · 'unsafe-inline' su style-src — l'app scrive stili al volo (posizioni,
//    colori scelti dallo streamer). Togliere quello e' un lavoro a se'.
//
// Uso: node scripts/verifica-csp.mjs   (esce 1 se qualcosa non torna)

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(RAD, 'src/web/public');
const caddy = readFileSync(join(RAD, 'Caddyfile'), 'utf8');

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });
// Un controllo ripetuto su N file non merita N righe: se filano tutti se ne
// stampa una sola, e i nomi compaiono solo quando qualcosa non torna.
const perOgnuno = (cose, prova, riassunto) => {
  const rotte = cose.map((c, i) => [c, i]).filter(([c]) => !prova(c));
  if (rotte.length) {
    for (const [c, i] of rotte) dice(false, riassunto(1) + `: ${typeof c === 'string' ? c : `politica ${i + 1}`}`);
  } else dice(true, riassunto(cose.length));
};

// ---- le politiche, lette dal Caddyfile ----------------------------------
const politiche = [...caddy.matchAll(/Content-Security-Policy\s+"([^"]+)"/g)].map((m) => {
  const d = {};
  for (const pezzo of m[1].split(';')) {
    const [nome, ...fonti] = pezzo.trim().split(/\s+/);
    if (nome) d[nome] = fonti;
  }
  return d;
});
dice(politiche.length > 0, `politiche CSP lette dal Caddyfile: ${politiche.length}`);

// ---- 1. nessun script-src si fida degli script inline --------------------
const srcDi = (p) => p['script-src'] || p['default-src'] || [];
perOgnuno(politiche, (p) => !srcDi(p).includes("'unsafe-inline'"),
  (n) => `script-src non si fida degli script inline (${n} politiche)`);
perOgnuno(politiche, (p) => !srcDi(p).includes("'unsafe-eval'"),
  (n) => `script-src non permette eval (${n} politiche)`);

// ---- 2. le difese di base ci sono in tutte -------------------------------
for (const [dir, atteso] of [['object-src', "'none'"], ['base-uri', "'self'"]]) {
  perOgnuno(politiche, (p) => (p[dir] || []).includes(atteso), (n) => `${dir} ${atteso} (${n} politiche)`);
}
perOgnuno(politiche, (p) => !!p['frame-ancestors'], (n) => `ogni politica dice chi puo' incorniciarla (${n})`);

// form-action e frame-ancestors sono le due direttive che NON ereditano da
// default-src: se non le scrivi non valgono, e default-src 'self' non ti copre.
// Senza form-action, un form iniettato spedisce dove vuole — e la pagina puo'
// avere tutta la CSP stretta che vuole, quella strada resta aperta.
perOgnuno(politiche, (p) => !!p['form-action'], (n) => `ogni politica dice dove puo' spedire un form (${n})`);

// ---- 3. nessuno script scritto dentro l'HTML -----------------------------
// Ammessi solo i blocchi che il browser NON esegue come JavaScript: il JSON-LD
// (dati per i motori di ricerca) e le regole di prefetch, che hanno un permesso
// CSP tutto loro.
const TIPI_NON_ESEGUITI = ['application/ld+json', 'speculationrules', 'importmap'];
let conSpeculation = false;
const html = readdirSync(PUB).filter((f) => f.endsWith('.html'));
dice(html.length > 0, `pagine controllate: ${html.length}`);
const senzaInlineIn = (s) => {
  const inline = [...s.matchAll(/<script([^>]*)>/g)]
    .map((m) => m[1])
    .filter((attr) => !/\bsrc\s*=/.test(attr))
    .filter((attr) => {
      const t = /type\s*=\s*["']([^"']+)["']/.exec(attr);
      if (t && t[1] === 'speculationrules') conSpeculation = true;
      return !(t && TIPI_NON_ESEGUITI.includes(t[1]));
    });
  return inline.length === 0;
};
const senzaInline = (f) => senzaInlineIn(readFileSync(join(PUB, f), 'utf8'));
perOgnuno(html, senzaInline, (n) => `niente <script> scritto dentro la pagina (${n} pagine)`);

// ---- 3bis. e nemmeno nelle pagine COSTRUITE dal server -------------------
// Qui il cancello era cieco, e non per poco: la pagina link si porta dietro
// tutto il suo comportamento — il consenso ai contenuti di altri siti, il tasto
// che li carica, il conto alla rovescia — e per anni li ha scritti DENTRO
// l'HTML. Dal vivo l'edge li rifiutava tutti: niente riquadro del consenso, e
// nessun tasto che rispondesse. In locale non si vedeva, perche' il banco di
// prova non manda nessuna CSP. Una pagina non e' meno servita perche' nasce da
// una funzione invece che da un file.
const costruite = await (async () => {
  const fuori = [];
  const { renderLinkPage, renderInformativa } = await import('../src/features/linkpagina.js');
  const pag = {
    attiva: true, titolo: 'Collaudo', tema: { consenso: 'sempre', effetto: 'matrix', anim: 'rise' },
    blocchi: [
      { tipo: 'link', label: 'Twitch', url: 'https://twitch.tv/x', icona: 'twitch' },
      { tipo: 'embed', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { tipo: 'conto', testo: 'Fra poco', quando: '2030-01-01T00:00' },
    ],
  };
  // avatar valorizzato di proposito: senza, il ramo con l'<img> non viene
  // composto e questo banco non guarderebbe proprio dove stava il difetto.
  const chi = { login: 'x', display: 'X', avatar: 'https://esempio.invalid/a.png', baseUrl: 'http://x' };
  fuori.push(['pagina link', renderLinkPage(pag, chi)]);
  fuori.push(['informativa della pagina link', renderInformativa({ ...chi, pagina: pag, contatto: '' })]);
  try {
    const { paginaGuida, GUIDE } = await import('../src/web/guide.js');
    fuori.push(['una guida', paginaGuida(GUIDE[0].slug)]);
  } catch (e) { /* le guide non si compongono qui: non e' questo il cancello */ }
  try {
    const { inserisciVetrina } = await import('../src/web/vetrina-vista.js');
    fuori.push(['la vetrina dentro il guscio',
      inserisciVetrina(readFileSync(join(PUB, 'index.html'), 'utf8'), 'it', { kick: true })]);
  } catch (e) { /* idem */ }
  return fuori;
})();
perOgnuno(costruite.map(([n]) => n),
  (n) => senzaInlineIn(costruite.find(([x]) => x === n)[1]),
  (n) => `niente <script> nemmeno nelle pagine costruite dal server (${n})`);

// ---- 4. e nemmeno un attributo on-qualcosa (anche nel markup generato) ----
// Il markup che app.js scrive a runtime conta quanto quello dei file .html:
// un onerror="" in una stringa e' un attributo inline a tutti gli effetti.
const RE_ON = /<[a-z][^>]*?\son(?:click|error|load|change|input|submit|mouseover|focus|blur|keydown|keyup)\s*=\s*["']/i;
const serviti = readdirSync(PUB).filter((x) => /\.(html|js)$/.test(x));
perOgnuno(serviti, (f) => !RE_ON.test(readFileSync(join(PUB, f), 'utf8')),
  (n) => `nessun attributo on-qualcosa (${n} file, HTML e JS)`);

// Qui il cancello era cieco esattamente come lo era al punto 3 per gli script:
// guardava i file dentro public/ e non le pagine che il server COMPONE. La
// pagina link ci teneva un onerror sull'avatar — rifiutato dal browser, perche'
// script-src non si fida degli inline, quindi il ripiego con l'iniziale non
// partiva mai. Un attributo on-qualcosa non e' meno servito perche' nasce da
// una funzione invece che da un file.
perOgnuno(costruite.map(([n]) => n),
  (n) => !RE_ON.test(costruite.find(([x]) => x === n)[1]),
  (n) => `nessun attributo on-qualcosa nemmeno nelle pagine costruite (${n})`);

// E nemmeno nel codice che le compone: li' l'attributo e' una stringa, e la
// pagina di collaudo qui sopra copre un solo ramo dei tanti che quel codice ha.
const GENERATORI = ['src/features/linkpagina.js', 'src/web/guide.js', 'src/web/vetrina-vista.js'];
perOgnuno(GENERATORI.filter((f) => existsSync(join(RAD, f))),
  (f) => !RE_ON.test(readFileSync(join(RAD, f), 'utf8')),
  (n) => `nessun attributo on-qualcosa nel codice che compone le pagine (${n} file)`);

// ---- 4bis. frame-src dice esattamente cio' che il codice puo' incorniciare -
// embedSrc() in linkpagina.js riconosce una lista CHIUSA di fornitori e per
// qualunque altro indirizzo torna null. Quindi `frame-src https:` era un
// permesso che non serviva a nessuno, e i due elenchi devono coincidere.
//
// Il controllo va nei due versi, perche' i due modi di sbagliare sono opposti:
// un fornitore aggiunto al codice e dimenticato qui si rompe dal vivo senza un
// errore in pagina; un host lasciato nella CSP dopo che il codice non lo usa
// piu' e' un permesso regalato che nessuno rilegge.
//
// img-src e media-src tengono `https:` di proposito e non passano di qui: lo
// sfondo e l'avatar della pagina link sono un indirizzo scelto dallo streamer,
// e li' l'elenco chiuso non esiste per costruzione.
{
  const src = join(RAD, 'src/features/linkpagina.js');
  if (existsSync(src)) {
    const codice = readFileSync(src, 'utf8');
    const daCodice = new Set(
      codice.split('\n').filter((r) => /\b(src|chat)\s*:/.test(r))
        .flatMap((r) => r.match(/https:\/\/[a-z0-9.-]+/g) || []));
    const conFrame = politiche.filter((p) => (p['frame-src'] || []).some((f) => f.startsWith('https://')));
    dice(daCodice.size > 0, `fornitori che il codice puo' incorniciare: ${daCodice.size}`);
    dice(conFrame.length > 0, 'almeno una politica elenca chi si puo\' incorniciare');
    for (const p of conFrame) {
      const perm = new Set(p['frame-src']);
      const aperti = [...perm].filter((f) => /^(https?:|\*)$/.test(f));
      dice(aperti.length === 0, 'frame-src non si fida di tutto uno schema', aperti.join(' '));
      const mancanti = [...daCodice].filter((h) => !perm.has(h));
      dice(mancanti.length === 0, 'frame-src copre ogni fornitore che il codice produce', mancanti.join(' '));
      const inPiu = [...perm].filter((f) => f.startsWith('https://') && !daCodice.has(f));
      dice(inPiu.length === 0, 'frame-src non permette host che il codice non usa', inPiu.join(' '));
    }
  }
}

// ---- 5. se c'e' il prefetch inline, dev'esserci il suo permesso ----------
if (conSpeculation) {
  dice(politiche.some((p) => (p['script-src'] || []).includes("'inline-speculation-rules'")),
    "il prefetch inline ha il suo permesso ('inline-speculation-rules')");
}

// ---- 6. security.txt: c'e', ed e' ancora valido --------------------------
const sec = join(PUB, 'well-known/security.txt');
dice(existsSync(sec), 'security.txt esiste (RFC 9116)');
if (existsSync(sec)) {
  const t = readFileSync(sec, 'utf8');
  dice(/^Contact:\s*\S+/m.test(t), 'security.txt dice a chi scrivere');
  const scad = /^Expires:\s*(\S+)/m.exec(t);
  dice(!!scad, 'security.txt ha una scadenza (lo standard la vuole)');
  if (scad) {
    const q = Date.parse(scad[1]);
    dice(Number.isFinite(q) && q > Date.now(),
      'la scadenza di security.txt non e\' passata', scad[1]);
    dice(Number.isFinite(q) && q < Date.now() + 400 * 86400_000,
      'la scadenza di security.txt sta entro l\'anno', scad[1]);
  }
}

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
console.log(rossi.length ? `\n${rossi.length} cose non tornano.` : '\nNiente script inline, e la CSP non ha bisogno di fidarsi. ✓');
process.exit(rossi.length ? 1 : 0);
