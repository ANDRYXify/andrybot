// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello della VOCE: un posto solo per le frasi del bot (docs/VOCE.md).
//
// Due cose, e tutte e due si rompono senza fare rumore.
//
// IL FRASARIO. Ogni momento ha le sue frasi in tre lingue e tre toni, e in ogni
// lingua e tono almeno MINIMO che chiedono solo i dati che arrivano sempre e
// non dichiarano un genere: sono quelle che reggono il giro quando un dato
// manca o quando lo streamer non ha scelto un genere. Ogni segno nomina un dato
// che il momento ha davvero; le faccine stanno solo dove si parla in chat, e
// fuori dalla chat niente caratteri che Telegram o Discord leggerebbero come
// formattazione. Ogni momento sta anche sulla carta, con titolo, spiegazione e
// dati di prova, e qualcuno lo chiede davvero.
//
// I FILE. Nei file del bot nessuna frase fissa esce in chat: una chiamata che
// parla (say, parla, dillo, e il «rispondi a chi» di aChi) con dentro un testo
// scritto e' rossa. Si leggono gli argomenti a parentesi contate, commenti
// tolti; non contano gli oggetti di opzioni e il nome del momento dentro
// `voce.di(...)`. I file che ancora parlano a frasi fisse stanno in DA_PORTARE,
// per nome: l'elenco si accorcia e basta. Un file che non ne ha piu' deve
// uscirne, un file nuovo non ci puo' entrare senza alzare MASSIMO, che e' una
// riga da scrivere apposta, sotto gli occhi di tutti.
//
// Uso: node scripts/verifica-voce.mjs [--selftest]

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { senzaCommentiJs } from './_codice.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');

export const MINIMO = 6;
const LINGUE = ['it', 'en', 'es'];
const TONI = ['scherzoso', 'amichevole', 'serio'];

// I file che parlano ancora in chat con frasi scritte li'. Si porta un file,
// lo si toglie da qui. MASSIMO e' la lunghezza di oggi: puo' solo scendere.
export const DA_PORTARE = [
  'src/bot.js',
  'src/features/alerts.js',
  'src/features/antibot.js',
  'src/features/antispam.js',
  'src/features/attese-giochi.js',
  'src/features/battute.js',
  'src/features/boss.js',
  'src/features/catena.js',
  'src/features/coccole.js',
  'src/features/colpo.js',
  'src/features/comandibase.js',
  'src/features/comandichat.js',
  'src/features/compleanni.js',
  'src/features/conta.js',
  'src/features/corsa.js',
  'src/features/games.js',
  'src/features/giveaway.js',
  'src/features/handler.js',
  'src/features/modalita-chat.js',
  'src/features/patata.js',
  'src/features/penitenze.js',
  'src/features/quotes.js',
  'src/features/sondaggi.js',
  'src/features/songrequest.js',
  'src/features/subathon.js',
  'src/features/trackinggiochi.js',
  'src/features/watchtime.js',
  'src/web/server.js',
];
export const MASSIMO = 28;

// ── Il frasario ─────────────────────────────────────────────────────────────

const SEGNO = /\{([^{}]*)\}/g;
const DATO = /^[a-z][a-z0-9]*$/;
const PLURALE = /^([a-z][a-z0-9]*)\|([^|]*)\|([^|]*)$/;
const FACCINA = /^:(.+)$/;
const GENERE = /^[^{}/]*\/[^{}/]*$/;
const FORMATTAZIONE = /[*_`~|<>&]/;

function segni(t) {
  const dati = new Set();
  const faccine = [];
  let genere = false;
  const strani = [];
  for (const m of String(t).matchAll(SEGNO)) {
    const d = m[1];
    if (DATO.test(d)) dati.add(d);
    else if (PLURALE.test(d)) dati.add(d.match(PLURALE)[1]);
    else if (FACCINA.test(d)) faccine.push({ da: m.index, a: m.index + m[0].length });
    else if (GENERE.test(d)) genere = true;
    else strani.push(m[0]);
  }
  return { dati: [...dati], faccine, genere, strani };
}

const tre = (x) => Array.isArray(x) && x.length === 3 && x.every((s) => typeof s === 'string' && s.trim());

export function controllaFrasario(MOMENTI) {
  const g = { lingue: [], minimo: [], segnaposti: [], doppie: [], faccine: [], lineette: [], carta: [] };
  for (const [id, m] of Object.entries(MOMENTI)) {
    const dati = m.dati || {};
    const ammessi = new Set([...Object.keys(dati), 'community']);
    const sempre = new Set(Object.keys(dati).filter((k) => dati[k] === 'sempre'));
    if (!tre(m.titolo) || !tre(m.quando)) g.carta.push(`${id}: titolo e spiegazione in tre lingue`);
    if (typeof m.spegnibile !== 'boolean') g.carta.push(`${id}: dire se si puo' spegnere`);
    for (const k of Object.keys(dati)) if (!['sempre', 'a volte'].includes(dati[k])) g.carta.push(`${id}: il dato ${k} arriva «sempre» o «a volte»`);
    for (const k of sempre) if (!(k in (m.esempio || {}))) g.carta.push(`${id}: manca ${k} fra i dati di prova`);
    for (const lingua of LINGUE) {
      for (const tono of TONI) {
        const frasi = m.frasi?.[lingua]?.[tono];
        if (!Array.isArray(frasi) || !frasi.length) { g.lingue.push(`${id}: ${lingua}/${tono}`); continue; }
        let reggono = 0;
        const viste = new Set();
        for (const f of frasi) {
          const s = segni(f);
          if (viste.has(f)) g.doppie.push(`${id} ${lingua}/${tono}: «${f}»`);
          viste.add(f);
          for (const k of s.dati) if (!ammessi.has(k)) g.segnaposti.push(`${id} ${lingua}/${tono}: {${k}} non e' un dato del momento`);
          for (const x of s.strani) g.segnaposti.push(`${id} ${lingua}/${tono}: ${x} non si sa leggere`);
          if (/[—–]/.test(f)) g.lineette.push(`${id} ${lingua}/${tono}: «${f}»`);
          if (m.dove === 'fuori') {
            if (s.faccine.length) g.faccine.push(`${id} ${lingua}/${tono}: fuori dalla chat una faccina non diventa un'emote`);
            if (FORMATTAZIONE.test(f.replace(SEGNO, ''))) g.faccine.push(`${id} ${lingua}/${tono}: «${f}» ha caratteri di formattazione`);
          }
          for (const { da, a } of s.faccine) {
            const prima = f[da - 1];
            const dopo = f[a];
            if ((prima !== undefined && prima !== ' ') || (dopo !== undefined && dopo !== ' ')) {
              g.faccine.push(`${id} ${lingua}/${tono}: la faccina di «${f}» deve stare fra spazi, se no l'emote non si vede`);
            }
          }
          if (!s.genere && s.dati.every((k) => sempre.has(k))) reggono++;
        }
        if (reggono < MINIMO) g.minimo.push(`${id} ${lingua}/${tono}: ${reggono} frasi che reggono da sole, ne servono ${MINIMO}`);
      }
    }
  }
  return g;
}

// ── I file ──────────────────────────────────────────────────────────────────

const PARLANTI = /(?<![\w$])(?:say|parla|dillo)\s*\(/g;
const A_CHI = /(?<![\w$])aChi\s*\(/g;

// Il testo fra una tonda aperta e la sua chiusa, stringhe comprese.
function finoAllaChiusa(src, da) {
  let prof = 0;
  for (let i = da; i < src.length; i++) {
    const c = src[i];
    if (c === "'" || c === '"' || c === '`') { i = fineStringa(src, i); continue; }
    if (c === '(' || c === '[' || c === '{') prof++;
    else if (c === ')' || c === ']' || c === '}') { if (prof === 0) return i; prof--; }
  }
  return src.length;
}

function fineStringa(src, i) {
  const q = src[i];
  for (let j = i + 1; j < src.length; j++) {
    if (src[j] === '\\') { j++; continue; }
    if (q === '`' && src[j] === '$' && src[j + 1] === '{') { j = finoAllaChiusa(src, j + 2); continue; }
    if (src[j] === q) return j;
  }
  return src.length;
}

// Quello che non e' una frase: gli oggetti di opzioni ({ via: 'bot' }) e il
// momento chiesto alla voce (voce.di(canale, 'follow', ...)).
function senzaNonFrasi(args) {
  let out = '';
  for (let i = 0; i < args.length; i++) {
    const c = args[i];
    if (c === "'" || c === '"' || c === '`') { const f = fineStringa(args, i); out += args.slice(i, f + 1); i = f; continue; }
    if (c === '{') { i = finoAllaChiusa(args, i + 1); out += '{}'; continue; }
    const voce = /^voce\s*\.\s*(?:di|anteprima)\s*\(/.exec(args.slice(i));
    if (voce && !/[\w$.]/.test(args[i - 1] || '')) { i = finoAllaChiusa(args, i + voce[0].length); out += 'voce()'; continue; }
    out += c;
  }
  return out;
}

// Un testo scritto: una stringa con almeno una lettera fuori dai ${...}.
function testiScritti(args) {
  const out = [];
  const pulito = senzaNonFrasi(args);
  for (let i = 0; i < pulito.length; i++) {
    const c = pulito[i];
    if (c !== "'" && c !== '"' && c !== '`') continue;
    const f = fineStringa(pulito, i);
    let dentro = pulito.slice(i + 1, f);
    if (c === '`') dentro = dentro.replace(/\$\{[^}]*\}/g, '');
    if (/\p{L}/u.test(dentro)) out.push(pulito.slice(i, Math.min(f + 1, i + 60)));
    i = f;
  }
  return out;
}

export function frasiFisse(sorgente) {
  const src = senzaCommentiJs(sorgente);
  const trovate = [];
  const riga = (i) => src.slice(0, i).split('\n').length;
  for (const m of src.matchAll(PARLANTI)) {
    const da = m.index + m[0].length;
    const args = src.slice(da, finoAllaChiusa(src, da));
    for (const t of testiScritti(args)) trovate.push(`riga ${riga(m.index)}: ${t}`);
  }
  for (const m of src.matchAll(A_CHI)) {
    const da = m.index + m[0].length;
    const chiusa = finoAllaChiusa(src, da);
    if (!/\bsay\b/.test(src.slice(da, chiusa)) || src[chiusa + 1] !== '(') continue;
    const args = src.slice(chiusa + 2, finoAllaChiusa(src, chiusa + 2));
    for (const t of testiScritti(args)) trovate.push(`riga ${riga(m.index)}: ${t}`);
  }
  return trovate;
}

function fileDelBot(dir = join(RAD, 'src')) {
  const out = [];
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    const rel = relative(RAD, p).split('\\').join('/');
    if (rel === 'src/web/public') continue;
    if (statSync(p).isDirectory()) out.push(...fileDelBot(p));
    else if (nome.endsWith('.js')) out.push(rel);
  }
  return out.sort();
}

export function controllaFile({ file, leggi, daPortare = DA_PORTARE, massimo = MASSIMO, MOMENTI = {} }) {
  const g = { portati: [], elenco: [], usati: [] };
  const lista = new Set(daPortare);
  if (daPortare.length > massimo) g.elenco.push(`DA_PORTARE ha ${daPortare.length} file e MASSIMO e' ${massimo}: l'elenco si accorcia, non si allunga`);
  for (const f of daPortare) if (!file.includes(f)) g.elenco.push(`${f} non c'e' piu': toglilo dall'elenco`);
  const fuoriDalFrasario = [];
  for (const f of file) {
    const testo = leggi(f);
    if (!f.startsWith('src/features/frasario/') && f !== 'src/features/voce.js') fuoriDalFrasario.push(senzaCommentiJs(testo));
    const fisse = frasiFisse(testo);
    if (lista.has(f)) {
      if (!fisse.length) g.elenco.push(`${f} non ha piu' frasi fisse: toglilo da DA_PORTARE e abbassa MASSIMO`);
    } else {
      for (const x of fisse) g.portati.push(`${f} ${x}`);
    }
  }
  const tutto = fuoriDalFrasario.join('\n');
  for (const id of Object.keys(MOMENTI)) {
    if (!tutto.includes(`'${id}'`)) g.usati.push(`${id}: nessuno lo chiede alla voce`);
  }
  return g;
}

const DETTI = [
  ['lingue', 'ogni momento ha le sue frasi in tre lingue e tre toni'],
  ['minimo', `in ogni lingua e tono almeno ${MINIMO} frasi reggono da sole (solo dati che arrivano sempre, nessun genere)`],
  ['segnaposti', 'ogni segno nomina un dato che il momento ha davvero'],
  ['doppie', 'nessuna frase ripetuta nello stesso mazzo'],
  ['faccine', 'faccine fra spazi e solo in chat; fuori dalla chat niente formattazione'],
  ['lineette', 'niente lineette lunghe nelle frasi'],
  ['carta', 'ogni momento sta sulla carta: titolo, spiegazione, dati di prova'],
  ['usati', 'ogni momento del frasario qualcuno lo chiede'],
  ['portati', 'fuori da DA_PORTARE nessuna frase fissa esce in chat'],
  ['elenco', 'DA_PORTARE e\' esplicito e si puo\' solo accorciare'],
];

const { MOMENTI } = await import(pathToFileURL(join(RAD, 'src/features/frasario/index.js')).href);
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const file = fileDelBot();

function tutto(mom = MOMENTI, opz = {}) {
  return { ...controllaFrasario(mom), ...controllaFile({ file, leggi, MOMENTI: mom, ...opz }) };
}

if (process.argv.includes('--selftest')) {
  const copia = (fa) => {
    const m = JSON.parse(JSON.stringify(MOMENTI));
    fa(m);
    return m;
  };
  const conFile = (nome, testo) => ({ file: [...file, nome], leggi: (f) => (f === nome ? testo : leggi(f)) });
  const ROTTURE = [
    ['lingue', () => tutto(copia((m) => { delete m.follow.frasi.es; })), 'un momento senza lo spagnolo'],
    ['lingue', () => tutto(copia((m) => { m.bit.frasi.en.serio = []; })), 'un tono vuoto'],
    ['minimo', () => tutto(copia((m) => { m.follow.frasi.it.serio = m.follow.frasi.it.serio.slice(0, MINIMO - 1); })), 'una frase di meno del minimo'],
    ['minimo', () => tutto(copia((m) => { m['raid-arrivato'].frasi.it.serio = m['raid-arrivato'].frasi.it.serio.map((f) => f.replace('{nome}', '{nome} con {spettatori}')); })), 'frasi che chiedono tutte un dato che a volte manca'],
    ['minimo', () => tutto(copia((m) => { m.follow.frasi.it.serio = m.follow.frasi.it.serio.map((f) => f + ' Sono content{o/a}.'); })), 'frasi che dichiarano tutte un genere'],
    ['segnaposti', () => tutto(copia((m) => { m.follow.frasi.it.serio.push('Grazie {nme}.'); })), 'un segnaposto scritto male'],
    ['segnaposti', () => tutto(copia((m) => { m.follow.frasi.en.serio.push('Thanks {nome|a|b|c}.'); })), 'un segno che non si sa leggere'],
    ['doppie', () => tutto(copia((m) => { m.follow.frasi.it.serio.push(m.follow.frasi.it.serio[0]); })), 'una frase doppia'],
    ['faccine', () => tutto(copia((m) => { m['avviso-diretta'].frasi.it.serio.push('{nome} in onda {:🎉}'); })), 'una faccina fuori dalla chat'],
    ['faccine', () => tutto(copia((m) => { m['avviso-diretta'].frasi.en.serio.push('**{nome}** is live'); })), 'la formattazione fuori dalla chat'],
    ['faccine', () => tutto(copia((m) => { m.follow.frasi.it.scherzoso.push('Grazie {nome}!{:🎉}'); })), 'una faccina attaccata al testo'],
    ['lineette', () => tutto(copia((m) => { m.follow.frasi.it.serio.push('Grazie — davvero, {nome}.'); })), 'una lineetta lunga'],
    ['carta', () => tutto(copia((m) => { m.follow.titolo = ['Un follow', 'A follow']; })), 'un titolo in due lingue'],
    ['carta', () => tutto(copia((m) => { m.bit.esempio = { nome: 'Luna' }; })), 'dati di prova senza un dato che arriva sempre'],
    ['usati', () => tutto(copia((m) => { m['momento-nuovo'] = m.follow; })), 'un momento che nessuno chiede'],
    ['portati', () => tutto(MOMENTI, conFile('src/features/nuovo.js', "export const x = (say) => say('Ciao a tutti!');")), 'una frase fissa in un file nuovo'],
    ['portati', () => tutto(MOMENTI, conFile('src/features/nuovo.js', 'export const x = (ch, t) => this.say(ch, `Grazie ${t}!`, { via: \'bot\' });')), 'un template con parole, accanto alle opzioni'],
    ['portati', () => tutto(MOMENTI, conFile('src/features/nuovo.js', "export const x = (msg, say, y) => aChi(msg, say)('Si fa cosi\\'.');")), 'il rispondi-a-chi con un testo scritto'],
    ['portati', () => tutto(MOMENTI, conFile('src/features/nuovo.js', "export const x = (say, c) => say(riempi(c.testo || 'Grazie {user}!'));")), 'un testo di riserva dentro un\'altra chiamata'],
    ['elenco', () => tutto(MOMENTI, { daPortare: [...DA_PORTARE, 'src/features/voce.js'] }), 'un file senza frasi fisse lasciato nell\'elenco'],
    ['elenco', () => tutto(MOMENTI, { daPortare: [...DA_PORTARE, 'src/features/sparito.js'], massimo: MASSIMO + 1 }), 'un file che non esiste piu\''],
    ['elenco', () => tutto(MOMENTI, { ...conFile('src/features/nuovo.js', "export const x = (say) => say('Ciao!');"), daPortare: [...DA_PORTARE, 'src/features/nuovo.js'] }), 'l\'elenco che si allunga'],
  ];
  const NON_ROTTURE = [
    ['portati', () => tutto(MOMENTI, conFile('src/features/nuovo.js', "export const x = (ch) => this.say(ch, voce.di(ch, 'follow', { nome: 'Luna' }), { via: 'bot' });")), 'il nome del momento e le opzioni non sono frasi'],
    ['portati', () => tutto(MOMENTI, conFile('src/features/nuovo.js', "// say('Ciao a tutti!')\nexport const x = (say, t) => say('👑 ' + t);")), 'un commento e un\'icona non sono frasi'],
  ];
  let cieche = 0;
  for (const [dove, fa, che] of ROTTURE) {
    const visto = fa()[dove].length > 0;
    console.log((visto ? '  ✓  ' : '  ✗  ') + che + (visto ? '' : '  → PASSA INOSSERVATO'));
    if (!visto) cieche++;
  }
  for (const [dove, fa, che] of NON_ROTTURE) {
    const falso = fa()[dove].length > 0;
    console.log((falso ? '  ✗  ' : '  ✓  ') + che + (falso ? '  → ALLARME FALSO' : ''));
    if (falso) cieche++;
  }
  console.log(cieche ? `\n${cieche} rotture non viste o allarmi falsi: il cancello non protegge quello che dice.` : "\nOgni rottura e' vista, e niente allarmi falsi. Il cancello e' vero. ✓");
  process.exit(cieche ? 1 : 0);
}

const g = tutto();
const quanti = Object.keys(MOMENTI).length;
console.log(`\nLa voce: ${quanti} momenti nel frasario, ${file.length} file del bot, ${DA_PORTARE.length} ancora da portare.\n`);
let rossi = 0;
for (const [k, msg] of DETTI) {
  const ok = g[k].length === 0;
  if (!ok) rossi++;
  console.log((ok ? '  ✓ ' : '  ✗ ') + msg + (ok ? '' : `\n      ${g[k].slice(0, 30).join('\n      ')}${g[k].length > 30 ? `\n      ... e altri ${g[k].length - 30}` : ''}`));
}
console.log(rossi ? `\n${rossi} cose non tornano.` : '\nOgni frase del bot ha un posto solo. ✓');
process.exit(rossi ? 1 : 0);
