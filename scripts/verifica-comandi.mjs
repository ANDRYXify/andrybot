// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello dei COMANDI PRONTI.
//
// La regola che ha creato questo file: tutto quello che si chiama con un «!»
// deve essere modificabile. Prima non lo era, e i sintomi erano due — `!giochi`
// rispondeva DUE VOLTE (i giochi di chat e, sotto, quelli con la webcam, perche'
// due moduli tenevano ognuno il proprio elenco scritto a mano), e il pannello
// elencava dieci comandi su trenta.
//
// Qui si verifica che il registro e la realta' non possano separarsi:
//   · ogni riga ha un gestore che conosce quel nome (se no il pannello mostra
//     un comando che la chat non conosce);
//   · nessuna riga rivendica una parola gia' di un'altra (il secondo non
//     partirebbe mai e nessuno saprebbe perche');
//   · la copia finta della demo copre esattamente il registro, e ogni sua riga
//     dice quello che dice il registro (se no la demo mostra un prodotto
//     diverso da quello vero).
//
// E che la chat ne parli a chi guarda (IN_CHAT, comandi-registro.js):
//   · ogni comando delle famiglie di giochi ha il suo posto: un gruppo e una
//     spiegazione, oppure e' la mossa di un gioco che la nomina;
//   · ogni {nome} di una spiegazione e' un comando vero, e ogni %gioco.manopola%
//     una manopola che non vale mai zero (nessuna frase dice «costa 0»).
//
// Uso: node scripts/verifica-comandi.mjs [--selftest]

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMANDI, MODULI, collisioni, LIVELLI, IN_CHAT, GRUPPI, FAMIGLIE_GIOCHI, ELENCO, FORME, voceDi } from '../src/features/comandi-registro.js';
import { giocoDi } from '../src/features/giochi-conf.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });

// ---- ogni riga ha il suo gestore ------------------------------------------
const senzaFile = [...new Set(COMANDI.map((c) => c.modulo))].filter((m) => !MODULI[m]?.file);
dice(senzaFile.length === 0, 'ogni famiglia dice in quale file vive', senzaFile.join(', '));

const orfani = [];
for (const c of COMANDI) {
  const f = MODULI[c.modulo]?.file;
  if (!f) continue;
  const src = leggi(join('src', 'features', f));
  if (!new RegExp(`['"\`]${c.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`).test(src)) orfani.push(`${c.id} (${f})`);
}
dice(orfani.length === 0, `ogni comando del registro ha il suo gestore: ${COMANDI.length}`, orfani.join(', '));

// ---- nessuno si contende una parola ---------------------------------------
const scontri = collisioni({});
dice(scontri.length === 0, `nessuna parola rivendicata due volte: ${COMANDI.flatMap((c) => c.nomi).length} nomi`,
  scontri.map((s) => `${s.nome} fra ${s.fra.join(' e ')}`).join(', '));

// ---- il livello di serie e' un livello vero -------------------------------
const livelliStrani = COMANDI.filter((c) => c.chi && !LIVELLI.includes(c.chi)).map((c) => c.id);
dice(livelliStrani.length === 0, 'ogni livello di serie e\' uno di quelli previsti', livelliStrani.join(', '));

// ---- ogni riga parla tutte e tre le lingue --------------------------------
// Il pannello e' trilingue: una riga scritta in italiano soltanto lascia una
// cucitura visibile in inglese e spagnolo. Scriverla in una lingua sola resta
// possibile (il pannello la mostra com'e'), ma qui diventa rosso: cosi' una
// riga nuova costa tre stringhe accanto, non una caccia al tesoro dopo.
const LINGUE = 3;
const terna = (v) => Array.isArray(v) && v.length === LINGUE && v.every((x) => typeof x === 'string' && x.trim());
const mute = [];
for (const c of COMANDI) {
  if (!terna(c.titolo)) mute.push(`${c.id}.titolo`);
  if (!terna(c.cosa)) mute.push(`${c.id}.cosa`);
}
for (const [k, m] of Object.entries(MODULI)) if (!terna(m.nome)) mute.push(`famiglia ${k}`);
dice(mute.length === 0, `ogni riga parla italiano, inglese e spagnolo: ${COMANDI.length} comandi e ${Object.keys(MODULI).length} famiglie`, mute.join(', '));

// ---- la demo mostra lo stesso prodotto ------------------------------------
// Non basta che ci siano gli stessi comandi: la demo e' rimasta indietro anche
// con i comandi giusti, con «Chiama il boss» per tutti mentre il registro lo da'
// ai moderatori, e la descrizione di !negozio di prima del link alla pagina.
// Quindi di ogni riga si confronta quello che il pannello mostra e che viene
// dal registro: famiglia, titolo, descrizione, chi lo puo' usare, e i nomi se
// la demo non lo mostra apposta come rinominato. E a quale gioco appartiene:
// la scheda Giochi mette insieme un gioco con quello, e una demo che mette
// !carta nella slot mostra un pannello che non esiste.
const app = leggi('src/web/public/app.js');
const INIZIO_DEMO = "'/api/streamer/comandi-pronti': { comandi: [";
const DAL_REGISTRO = (c) => ({ modulo: c.modulo, moduloNome: MODULI[c.modulo]?.nome, ...voceDi(c.id), regole: c.gioco || null,
  titolo: c.titolo, cosa: c.cosa, chiMinimo: LIVELLI.includes(c.chi) ? c.chi : 'tutti', nomi: c.nomi });
export function guaiDemo(testo) {
  const i = testo.indexOf(INIZIO_DEMO);
  if (i < 0) return { manca: true, coperti: [], righe: [] };
  const blocco = testo.slice(i, testo.indexOf('], livelli:', i));
  const finte = blocco.split('\n').filter((r) => /^\s*\{ id: "/.test(r))
    .map((r) => new Function(`return (${r.trim().replace(/,\s*$/, '')});`)());
  const veri = COMANDI.map((c) => c.id);
  const finti = finte.map((d) => d.id);
  const coperti = [...veri.filter((x) => !finti.includes(x)).map((x) => '-' + x), ...finti.filter((x) => !veri.includes(x)).map((x) => '+' + x)];
  const righe = [];
  for (const d of finte) {
    const c = COMANDI.find((x) => x.id === d.id);
    if (!c) continue;
    const atteso = DAL_REGISTRO(c);
    for (const [k, v] of Object.entries(atteso)) {
      if (k === 'nomi' && d.rinominato) continue;
      if (JSON.stringify(d[k]) !== JSON.stringify(v)) righe.push(`${d.id}.${k}`);
    }
  }
  return { manca: false, coperti, righe, n: finti.length, di: veri.length };
}
const gd = guaiDemo(app);
dice(!gd.manca, 'la demo ha la sua copia dei comandi');
if (!gd.manca) {
  dice(gd.coperti.length === 0, `la demo copre il registro: ${gd.n} su ${gd.di}`, gd.coperti.join(', '));
  dice(gd.righe.length === 0, 'ogni comando della demo dice quello che dice il registro', gd.righe.join(', '));
}

// ---- un solo elenco in chat -----------------------------------------------
// Il difetto originale: due moduli con due liste scritte a mano. La lista adesso
// la costruisce il registro, quindi nessun gestore deve tenersene una.
const conElenco = ['games.js', 'trackinggiochi.js']
  .filter((f) => /🎮 Giochi(?! del)|Giochi webcam:/.test(leggi(join('src', 'features', f))) && !/giochiInChat/.test(leggi(join('src', 'features', f))));
dice(conElenco.length === 0, 'l\'elenco dei giochi in chat lo costruisce il registro, non i gestori', conElenco.join(', '));

// ---- come la chat parla dei giochi -----------------------------------------
// Una funzione pura sulla tabella, cosi' l'autoprova la puo' rompere senza
// toccare il file.
// Cosa sta scritto, nell'esempio della spiegazione, al posto di ogni parola di
// una forma: l'elenco dice «!duello @nome posta», le regole «!duello @nome 50».
const ESEMPIO_DI = {
  '@nome': '@nome', posta: '\\d+', quanto: '\\d+', minuti: '\\d+', corridore: '\\d+',
  colore: '[a-zà-ù]+', mossa: '(?:sasso|carta|forbice)', domanda: '[^{}.]*\\?',
};

export function guaiInChat(tabella) {
  const g = { posto: [], mosse: [], nominate: [], segnaposto: [], manopole: [], forme: [] };
  for (const w of FORME) if (!ESEMPIO_DI[w]) g.forme.push(`«${w}» non ha un esempio che il cancello sappia leggere`);
  for (const [id, r] of Object.entries(tabella)) {
    const esempi = (r.spiega || '');
    if (r.forma === undefined) {
      if (r.gruppo && new RegExp(`\\{${id}\\} (@nome|\\d+\\b)`).test(esempi)) g.forme.push(`${id}: si scrive con un nome o una posta, e l'elenco non lo dice`);
      continue;
    }
    if (!r.gruppo) { g.forme.push(`${id}: una forma su chi non e' un gioco dell'elenco`); continue; }
    const parole = String(r.forma).split(' ');
    const fuori = parole.filter((w) => !FORME.includes(w));
    if (!r.forma || fuori.length) { g.forme.push(`${id}: «${fuori.join(' ') || r.forma}» non e' una parola delle forme`); continue; }
    if (!new RegExp(`\\{${id}\\} ${parole.map((w) => ESEMPIO_DI[w]).join(' ')}`).test(esempi)) g.forme.push(`${id}: la spiegazione non ha un esempio di «${r.forma}»`);
  }
  const ids = new Set(COMANDI.map((c) => c.id));
  const gruppi = new Set(GRUPPI.map((x) => x.id));
  const giochi = COMANDI.filter((c) => FAMIGLIE_GIOCHI.includes(c.modulo) && c.id !== ELENCO);
  for (const c of giochi) {
    const r = tabella[c.id];
    const gioco = r && r.gruppo && gruppi.has(r.gruppo) && r.emoji && r.spiega && !r.parteDi;
    const mossa = r && r.parteDi && !r.gruppo;
    if (!gioco && !mossa) g.posto.push(c.id);
  }
  for (const id of Object.keys(tabella)) if (!giochi.some((c) => c.id === id)) g.posto.push(`${id} (non e' un gioco)`);
  for (const [id, r] of Object.entries(tabella)) {
    if (!r.parteDi) continue;
    const suo = tabella[r.parteDi];
    if (!suo || !suo.gruppo) { g.mosse.push(`${id} → ${r.parteDi}`); continue; }
    if (!suo.spiega.includes(`{${id}}`)) g.nominate.push(`${r.parteDi} non nomina {${id}}`);
  }
  for (const [id, r] of Object.entries(tabella)) {
    if (!r.spiega) continue;
    for (const m of r.spiega.matchAll(/\{([^}]*)\}/g)) if (!ids.has(m[1])) g.segnaposto.push(`${id}: {${m[1]}}`);
    for (const m of r.spiega.matchAll(/%([a-z0-9]+)\.([a-zA-Z]+)%/g)) {
      const k = giocoDi(m[1])?.param?.find((x) => x.k === m[2]);
      if (!k || !(k.tipo === 'scelta' || k.min >= 1)) g.manopole.push(`${id}: %${m[1]}.${m[2]}%`);
    }
    // L'accordo con la moneta (moneta.js) ha sempre quattro modi, in
    // quest'ordine: fp, mp, fs, ms. Con tre o cinque non si sa quale esce.
    for (const m of r.spiega.matchAll(/%\[([^\]]*)\]%/g)) {
      if (m[1].split('|').length !== 4) g.segnaposto.push(`${id}: un accordo senza i suoi quattro modi`);
    }
    const resto = r.spiega.replace(/%monete%|%[a-z0-9]+\.[a-zA-Z]+%|%\[[^\]|]*\|[^\]|]*\|[^\]|]*\|[^\]|]*\]%/g, '');
    if (/%/.test(resto)) g.segnaposto.push(`${id}: un % senza manopola`);
  }
  return g;
}
const gc = guaiInChat(IN_CHAT);
dice(gc.posto.length === 0, `ogni gioco ha il suo posto in chat: un gruppo e una spiegazione, o e' la mossa di un gioco (${Object.keys(IN_CHAT).length})`, gc.posto.join(', '));
dice(gc.mosse.length === 0, 'ogni mossa appartiene a un gioco vero', gc.mosse.join(', '));
dice(gc.nominate.length === 0, 'la spiegazione di un gioco nomina tutte le sue mosse', gc.nominate.join(', '));
dice(gc.segnaposto.length === 0, 'ogni {nome} nelle spiegazioni e\' un comando vero', gc.segnaposto.join(', '));
dice(gc.manopole.length === 0, 'ogni valore detto in chat viene da una manopola che non vale mai zero', gc.manopole.join(', '));
dice(gc.forme.length === 0, `ogni gioco che vuole qualcosa dopo il nome lo dice nell'elenco, e le regole ne hanno un esempio (${Object.values(IN_CHAT).filter((r) => r.forma).length} forme)`, gc.forme.join(', '));

// L'AUTOPROVA: ogni rottura su una copia della tabella, e deve accendere il
// controllo giusto.
if (process.argv.includes('--selftest')) {
  const copia = () => JSON.parse(JSON.stringify(IN_CHAT));
  const ROTTURE = [
    ['posto', (t) => { delete t.dado; }, 'un gioco senza riga'],
    ['posto', (t) => { t.dado.gruppo = 'boh'; }, 'un gruppo che non esiste'],
    ['mosse', (t) => { t.carta.parteDi = 'inventato'; }, 'una mossa di un gioco che non c\'e\''],
    ['nominate', (t) => { t.blackjack.spiega = t.blackjack.spiega.replace('{stai}', 'stai'); }, 'una mossa che il suo gioco non nomina'],
    ['segnaposto', (t) => { t.slot.spiega += ' {slott}'; }, 'un nome di comando sbagliato'],
    ['manopole', (t) => { t.slot.spiega += ' %slot.jackpot%'; }, 'una manopola che puo\' valere zero'],
    ['manopole', (t) => { t.slot.spiega += ' %slot.inventata%'; }, 'una manopola che non esiste'],
    ['forme', (t) => { delete t.duello.forma; }, 'un gioco con la posta che l\'elenco mostra nudo'],
    ['forme', (t) => { t.roulette.forma = 'posta numerino'; }, 'una forma con una parola inventata'],
    ['forme', (t) => { t.blackjack.forma = '@nome posta'; }, 'una forma che le regole non mostrano'],
    ['forme', (t) => { t.carta.forma = 'posta'; }, 'una forma su una mossa'],
  ];
  let cieche = 0;
  console.log('');
  for (const [dove, rompi, che] of ROTTURE) {
    const t = copia();
    rompi(t);
    const visto = guaiInChat(t)[dove].length > 0;
    console.log((visto ? '  ✓  ' : '  ✗  ') + che + (visto ? '' : '  → PASSA INOSSERVATO'));
    if (!visto) cieche++;
  }
  const DEMO_ROTTE = [
    [(t) => t.replace(/(\{ id: "boss",.*?)chi: "mod", chiMinimo: "mod"/, '$1chi: "tutti", chiMinimo: "tutti"'), 'righe', 'un comando dei moderatori che la demo da\' a tutti'],
    [(t) => t.replace(/(\{ id: "negozio",.*?cosa: \[")/, '$1Vecchia descrizione. '), 'righe', 'una descrizione rimasta indietro'],
    [(t) => t.replace(/\n\s*\{ id: "doppio",[^\n]*/, ''), 'coperti', 'un comando che la demo non ha'],
    [(t) => t.replace(/(\{ id: "carta",.*?)voce: "blackjack"/, '$1voce: "slot"'), 'righe', 'una mossa che la demo mette nel gioco sbagliato'],
  ];
  for (const [rompi, dove, che] of DEMO_ROTTE) {
    const rotto = rompi(app);
    const visto = rotto !== app && guaiDemo(rotto)[dove].length > 0;
    console.log((visto ? '  ✓  ' : '  ✗  ') + che + (visto ? '' : '  → PASSA INOSSERVATO'));
    if (!visto) cieche++;
  }
  if (cieche) { console.log(`\n${cieche} rotture non viste.`); process.exit(1); }
  console.log("\nOgni rottura e' vista. ✓");
}

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `\n      ${e.extra}` : ''));
console.log(rossi.length ? `\n${rossi.length} cose non tornano.` : '\nOgni «!» del prodotto e\' una riga che si puo\' cambiare. ✓');
process.exit(rossi.length ? 1 : 0);
