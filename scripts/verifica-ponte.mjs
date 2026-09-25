// Cancello del PONTE COL CERVELLO.
//
// La regola: dal sito non parte nessun ordine che faccia crescere il cervello.
// Crescere lo decide lui, nei suoi cicli; chi guarda il pannello puo' vederlo
// crescere, non spingerlo. Le leve che lo spingevano («distilla ora», «lavora le
// bozze ora», «sincronizza la mente ora», «fai un passo ora», «riscriviti ora»)
// sono uscite dal bot.
//
// Una regola che regge solo se qualcuno si ricorda i nomi cede: le cinque leve
// erano passate accanto a una prova che ne cercava altri tre. Qui il cancello
// sta al collo di bottiglia. Ogni chiamata al cervello con `method: 'POST'`
// in src/ai/brainpy.js deve stare nell'elenco qui sotto, con il suo motivo. Una
// POST nuova e' rossa finche' qualcuno non la classifica; una POST con un
// indirizzo che il cancello non sa leggere e' rossa uguale. Gli ordini che lo
// fanno crescere non possono stare nell'elenco.
//
// Dentro due rotte le azioni sono piu' d'una: per /ecosistema e /autoautorialita
// gli elenchi `consentite` di src/web/server.js devono essere uguali a quelli
// scritti qui, e senza le azioni vietate.
//
// Uso: node scripts/verifica-ponte.mjs [--selftest]

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');

// Le POST che possono partire, per gruppo, col perche'.
export const PERMESSE = {
  '/chat': ['parlare', 'la risposta a un messaggio in chat: una domanda, non un ordine'],
  '/bot': ['parlare', 'la risposta quando si parla col bot: una domanda, non un ordine'],
  '/gira': ['si muove nel suo mondo', 'lo muove, non lo fa crescere'],
  '/edifica': ['si muove nel suo mondo', 'lo muove, non lo fa crescere'],
  '/narra': ['si muove nel suo mondo', 'lo muove, non lo fa crescere'],
  '/automa': ['usa cio\' che ha gia\'', 'fa lavorare una capacita\' sua, non gliene da\' una nuova'],
  '/prova_strumento': ['usa cio\' che ha gia\'', 'fa lavorare una capacita\' sua, non gliene da\' una nuova'],
  '/promuovi': ['membrana e freni', 'decide cosa passa il confine'],
  '/revoca_promozione': ['membrana e freni', 'decide cosa passa il confine'],
  '/autoautorialita': ['membrana e freni', 'solo il freno che congela tutto (AZIONI qui sotto): scrivergli chi e\', o disfarlo, da fuori non si puo\''],
  '/ecosistema': ['il proprietario nel suo computer', 'solo le azioni scritte in AZIONI qui sotto: gesti del proprietario, o una proposta che puo\' lasciar cadere'],
  '/insegna': ['scambi col bot', 'il verso della valvola: consegna, il bot ritira'],
  '/posta': ['scambi col bot', 'il verso della valvola: consegna, il bot ritira'],
  '/slancio_condiviso': ['scambi col bot', 'il verso della valvola: consegna, il bot ritira'],
  '/osserva': ['i suoi sensi', 'quello che passa in chat arriva a lui: lo sente, non gli ordina niente'],
  '/ricarica': ['manutenzione', 'il motore'],
  '/prova': ['manutenzione', 'il motore'],
  '/pulizia_modelli': ['manutenzione', 'la cura dei dati'],
  '/assistente': ['manutenzione', 'un interruttore del proprietario'],
  '/dimentica': ['manutenzione', 'la cura dei dati'],
  '/mente': ['lettura', 'la mente com\'e\', per /mente su Telegram: sincronizzarla su richiesta il cervello non lo fa piu\''],
  '/distilla': ['da studiare', 'la fa partire un orologio del bot; se debba partire da lui e\' una domanda aperta'],
  '/impara_modulo': ['da studiare', 'la fa partire un orologio del bot; se debba partire da lui e\' una domanda aperta'],
  '/svago': ['da studiare', 'la fa partire un orologio del bot; se debba partire da lui e\' una domanda aperta'],
};

// Gli ordini che lo farebbero crescere: mai nell'elenco, mai nel ponte.
export const MAI = ['/distilla_moduli', '/integra', '/vita', '/sogna', '/costruisci_strumento'];

// Le azioni dentro le rotte a piu' azioni, com'e' ammesso che siano.
export const AZIONI = {
  '/api/admin/ecosistema': { permesse: ['installa', 'naviga', 'browser', 'schermo', 'crea', 'scrivi', 'esegui', 'lavoro', 'desiderio', 'ferma'], mai: ['autonomo'] },
  '/api/admin/autoautorialita': { permesse: ['congela'], mai: ['passo', 'autoritratto', 'annulla_autoritratto', 'valori', 'annulla_valori', 'modulo', 'essere', 'plasma'] },
};

// Ogni chiamata del ponte che cambia qualcosa: l'indirizzo, letto dal codice.
// Si guarda OGNI `fetch(`, non una forma sola: gli argomenti si leggono a
// parentesi contate, cosi' una POST scritta in un altro modo non passa accanto.
//   · senza opzioni, o con un metodo GET: e' una lettura, non si guarda;
//   · con opzioni che non sono scritte li' (una variabile): non si sa, e' rossa;
//   · l'indirizzo `BASE + '/x'` si legge subito; `BASE + nome` dalla riga che
//     assegna quel nome, se contiene solo indirizzi scritti per intero. Il resto
//     (un template, un indirizzo costruito) non si sa leggere, ed e' rosso.
function argomenti(src, da) {
  const args = [];
  let prof = 0, cur = '', i = da;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === "'" || c === '"' || c === '`') {
      const f = src.indexOf(c, i + 1);
      cur += src.slice(i, f + 1);
      i = f;
      continue;
    }
    if ('([{'.includes(c)) prof++;
    if (')]}'.includes(c)) { if (prof === 0) break; prof--; }
    if (c === ',' && prof === 0) { args.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) args.push(cur.trim());
  return args;
}

export function postDelPonte(src) {
  const trovate = [];
  let i = src.indexOf('fetch(');
  while (i >= 0) {
    const [url = '', opzioni] = argomenti(src, i + 'fetch('.length);
    const riga = src.slice(0, i).split('\n').length;
    i = src.indexOf('fetch(', i + 1);
    if (opzioni === undefined) continue;
    if (!opzioni.startsWith('{')) { trovate.push({ riga, rotte: [], illeggibile: `opzioni ${opzioni}` }); continue; }
    const metodo = /method:\s*['"`]([A-Za-z]+)['"`]/.exec(opzioni);
    if (!metodo || metodo[1].toUpperCase() === 'GET') continue;
    const lett = /^BASE\s*\+\s*'(\/[a-z_]+)'$/.exec(url);
    if (lett) { trovate.push({ riga, rotte: [lett[1]] }); continue; }
    const nome = /^BASE\s*\+\s*([A-Za-z_]\w*)$/.exec(url)?.[1];
    const prima = src.slice(0, src.split('\n').slice(0, riga - 1).join('\n').length).split('\n').slice(-40).join('\n');
    const def = nome && new RegExp(`const ${nome} = ([^;\\n]+);`).exec(prima);
    const rotte = def ? [...def[1].matchAll(/'(\/[a-z_]+)'/g)].map((x) => x[1]) : [];
    const soloIndirizzi = !!def && def[1].replace(/'\/[a-z_]+'/g, '').replace(/[\s?:=!()'\w.]/g, '') === '';
    if (soloIndirizzi && rotte.length) trovate.push({ riga, rotte });
    else trovate.push({ riga, rotte: [], illeggibile: url });
  }
  return trovate;
}

// Le `consentite` di una rotta del sito, lette dal suo blocco.
export function consentiteDi(server, rotta) {
  const i = server.indexOf(`app.post('${rotta}'`);
  if (i < 0) return null;
  const blocco = server.slice(i, server.indexOf('}));', i));
  const c = /const consentite = \[([^\]]*)\]/.exec(blocco);
  return c ? [...c[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]) : null;
}

export function controlla({ ponte, server }) {
  const g = { ignote: [], vietate: [], illeggibili: [], azioni: [], mente: [], elenco: [] };
  for (const r of MAI) if (PERMESSE[r]) g.elenco.push(r);
  for (const p of postDelPonte(ponte)) {
    if (p.illeggibile) { g.illeggibili.push(`riga ${p.riga}: ${p.illeggibile}`); continue; }
    for (const r of p.rotte) {
      if (MAI.includes(r)) g.vietate.push(`riga ${p.riga}: ${r}`);
      else if (!PERMESSE[r]) g.ignote.push(`riga ${p.riga}: ${r}`);
    }
  }
  for (const [rotta, { permesse, mai }] of Object.entries(AZIONI)) {
    const c = consentiteDi(server, rotta);
    if (!c) { g.azioni.push(`${rotta}: elenco consentite non trovato`); continue; }
    for (const a of c) if (mai.includes(a)) g.azioni.push(`${rotta}: «${a}» e' un ordine che lo fa crescere`);
    for (const a of c) if (!permesse.includes(a) && !mai.includes(a)) g.azioni.push(`${rotta}: «${a}» non e' classificata`);
    for (const a of permesse) if (!c.includes(a)) g.azioni.push(`${rotta}: «${a}» e' scritta qui ma il sito non la ammette piu'`);
  }
  // La mente la legge solo /mente su Telegram: nessuna rotta del sito la chiede.
  let i = server.indexOf('brainpy.mente(');
  while (i >= 0) {
    if (!server.slice(Math.max(0, i - 200), i).includes("if (cmd === 'mente') {")) g.mente.push(`server.js, carattere ${i}`);
    i = server.indexOf('brainpy.mente(', i + 1);
  }
  return g;
}

const DETTI = [
  ['elenco', 'nessun ordine che lo fa crescere sta fra le POST permesse'],
  ['illeggibili', 'ogni POST al cervello ha un indirizzo che si sa leggere'],
  ['vietate', 'nessuna POST al cervello e\' un ordine che lo fa crescere'],
  ['ignote', 'ogni POST al cervello e\' classificata, col suo motivo'],
  ['azioni', 'le azioni di /ecosistema e /autoautorialita sono quelle classificate: niente «autonomo», e sul sé solo il freno'],
  ['mente', 'la mente la chiede solo /mente su Telegram, nessuna rotta del sito'],
];

const vero = { ponte: leggi('src/ai/brainpy.js'), server: leggi('src/web/server.js') };

if (process.argv.includes('--selftest')) {
  // L'AUTOPROVA: ogni rottura su una copia dei testi, e deve accendere il
  // controllo giusto.
  const ROTTURE = [
    ['ignote', (t) => ({ ...t, ponte: t.ponte + "\nasync function cresci() { await fetch(BASE + '/cresci', { method: 'POST' }); }\n" }), 'una POST nuova non classificata'],
    ['vietate', (t) => ({ ...t, ponte: t.ponte + "\nasync function distillaOra() { await fetch(BASE + '/distilla_moduli', { method: 'POST' }); }\n" }), 'una leva vietata che rientra nel ponte'],
    ['illeggibili', (t) => ({ ...t, ponte: t.ponte + "\nasync function x(dove) { await fetch(BASE + dove, { method: 'POST' }); }\n" }), 'una POST con un indirizzo che non si sa leggere'],
    ['illeggibili', (t) => ({ ...t, ponte: t.ponte + "\nasync function y() { await fetch(`${BASE}/cresci`, { method: \"POST\" }); }\n" }), 'una POST scritta in un altro modo (template e virgolette doppie)'],
    ['illeggibili', (t) => ({ ...t, ponte: t.ponte + "\nasync function z(o) { await fetch(BASE + '/cresci', o); }\n" }), 'una chiamata con le opzioni in una variabile'],
    ['ignote', (t) => ({ ...t, ponte: t.ponte + "\nasync function w() { await fetch(BASE + '/cresci', { method: 'PUT' }); }\n" }), 'un altro metodo che cambia qualcosa'],
    ['azioni', (t) => ({ ...t, server: t.server.replace("'desiderio', 'ferma']", "'desiderio', 'autonomo', 'ferma']") }), '«autonomo» di nuovo fra le azioni dell\'ecosistema'],
    ['azioni', (t) => ({ ...t, server: t.server.replace("const consentite = ['congela'];", "const consentite = ['congela', 'passo'];") }), '«passo» di nuovo fra le azioni dell\'autoautorialita\''],
    ['azioni', (t) => ({ ...t, server: t.server.replace("const consentite = ['congela'];", "const consentite = ['congela', 'autoritratto'];") }), 'il proprietario che torna a scrivergli l\'autoritratto'],
    ['mente', (t) => ({ ...t, server: t.server + "\napp.post('/api/admin/mente', requireAdmin, wrap(async (req, res) => { res.json(await brainpy.mente()); }));\n" }), 'una rotta del sito che chiede la mente'],
  ];
  let cieche = 0;
  for (const [dove, rompi, che] of ROTTURE) {
    const visto = controlla(rompi(vero))[dove].length > 0;
    console.log((visto ? '  ✓  ' : '  ✗  ') + che + (visto ? '' : '  → PASSA INOSSERVATO'));
    if (!visto) cieche++;
  }
  console.log(cieche ? `\n${cieche} rotture non viste: il cancello non protegge quello che dice.` : "\nOgni rottura e' vista. Il cancello e' vero. ✓");
  process.exit(cieche ? 1 : 0);
}

const g = controlla(vero);
const post = postDelPonte(vero.ponte);
console.log(`\nIl ponte col cervello: ${post.length} POST, ${Object.keys(PERMESSE).length} indirizzi permessi.\n`);
let rossi = 0;
for (const [k, msg] of DETTI) {
  const ok = g[k].length === 0;
  if (!ok) rossi++;
  console.log((ok ? '  ✓ ' : '  ✗ ') + msg + (ok ? '' : `\n      ${g[k].join(' · ')}`));
}
console.log(rossi ? `\n${rossi} cose non tornano.` : '\nDal sito non parte nessun ordine che lo faccia crescere. ✓');
process.exit(rossi ? 1 : 0);
