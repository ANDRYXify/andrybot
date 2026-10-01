// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello delle NOVITÀ: quello che cambia per chi usa il bot va detto.
//
// «Non ha senso aggiungere funzioni che l'utente manco sa che esistano.» Il
// problema non è che manchi un elenco: è che la funzione e il modo di dirla
// nascono in due momenti diversi, e il secondo si dimentica. Sempre.
//
// Quindi la riga si scrive NELLO STESSO COMMIT della cosa, in NOVITA.md. Qui si
// guarda che sia successo davvero: un commit che tocca il prodotto o porta la
// sua riga, o dichiara nel messaggio che non c'è niente da dire —
// «Novità: nessuna (motivo)». Non è una preferenza di forma: è l'unico momento
// in cui si sa cosa è cambiato e perché.
//
// E si guarda che le righe siano scritte per chi trasmette, non per chi
// programma: niente nomi di file, niente parole da riunione tecnica.
//
// E si guarda che ogni riga pubblica si legga nelle tre lingue del sito, con le
// traduzioni scritte sotto la riga italiana, nello stesso commit.
//
// Uso: node scripts/verifica-novita.mjs              (esce 1 se qualcosa non torna)
//      node scripts/verifica-novita.mjs --selftest   (rompe le traduzioni e pretende di vederlo)

import { execFileSync } from 'node:child_process';
import { EMOJI } from './_emoji.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { analizza, pubbliche, destinazioni, righeSperse } from '../src/web/novita.js';
import { aiutiPerScheda } from '../src/web/manuali.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });

const TESTO = readFileSync(join(RAD, 'NOVITA.md'), 'utf8');
const gruppi = analizza(TESTO);
// Le voci sono OGGETTI ({testo, privata}), non stringhe: chi controlla la forma
// deve guardare il testo. Prendendo l'oggetto, ogni misura qui sotto tornerebbe
// verde su niente — che e' peggio di un cancello rosso.
const voci = gruppi.flatMap((g) => g.voci).map((v) => v.testo);
dice(gruppi.length > 0 && voci.length > 0, `giornate raccontate: ${gruppi.length} · righe: ${voci.length}`);
dice(voci.every((v) => typeof v === 'string'), 'le righe si leggono come testo',
  'la forma delle voci e\' cambiata: i controlli qui sotto non misurano piu\' niente');

// ---- e sono scritte da una persona, non da una macchina -------------------
// «Scrivi meno statisticamente, cosi' e' proprio fatto da un'IA.» Il modo in cui
// si vede non e' il contenuto: e' la MONOTONIA. Righe che cominciano tutte allo
// stesso modo, e la congiunzione appiccicata davanti — «E poi...», «E se...» —
// che di seguito diventa un tic. In una giornata ce n'erano nove su quaranta.
//
// Due misure, tutte e due contabili e senza giudizi di gusto: nessuna riga
// comincia con una congiunzione, e nessuna parola d'attacco copre piu' di un
// quarto della giornata. Oggi la piu' frequente sta all'11%: la soglia lascia
// spazio a chi scrive e prende il tic quando diventa tale.
const perGiorno = gruppi.map((g) => g.voci.map((v) => v.testo)).filter((v) => v.length >= 8);
const appiccicate = voci.filter((v) => /^(E|Ed|Ma|Però|Cosi|Così|Poi|Inoltre)\s/.test(v));
dice(appiccicate.length <= 1, `le righe cominciano per conto loro (${appiccicate.length} appiccicate)`,
  appiccicate.slice(0, 4).map((v) => `«${v.slice(0, 60)}…»`).join(' · ') + ' — una congiunzione davanti, di seguito, diventa un tic');

const monotone = [];
for (const g of perGiorno) {
  const conte = new Map();
  for (const v of g) {
    const w = (v.split(/\s+/)[0] || '').toLowerCase().replace(/[«»,.:]/g, '');
    conte.set(w, (conte.get(w) || 0) + 1);
  }
  const [parola, quante] = [...conte.entries()].sort((a, b) => b[1] - a[1])[0] || ['', 0];
  if (quante / g.length > 0.25) monotone.push(`«${parola}» apre ${quante} righe su ${g.length}`);
}
dice(!monotone.length, 'e non cominciano tutte allo stesso modo', monotone.join(' · '));

// ---- quello che e' privato non esce di casa ------------------------------
// Non tutto quello che cambia riguarda chi usa il bot: la crescita del cervello privato e il suo
// computer sono cose private. Si marcano `[privato]`, e da li' in poi la
// pagina pubblica, l'API aperta e la sitemap non devono vederle. Qui non si legge
// il codice: si prende la forma PUBBLICA vera e ci si cerca dentro cio' che
// doveva restare fuori.
const private_ = gruppi.flatMap((g) => g.voci).filter((v) => v.privata).map((v) => v.testo);
const fuori = JSON.stringify(pubbliche(gruppi));
const trapelate = private_.filter((t) => fuori.includes(t));
dice(!trapelate.length, `righe private: ${private_.length}, e nessuna esce di casa`,
  trapelate.length ? `finita in pubblico: ${trapelate[0].slice(0, 70)}` : '');
// e un giorno fatto di sole righe private non deve nemmeno comparire come giorno
const giorniSoloPrivati = gruppi.filter((g) => g.voci.every((v) => v.privata)).map((g) => g.data);
const pubbliciData = new Set(pubbliche(gruppi).map((g) => g.data));
dice(!giorniSoloPrivati.some((d) => pubbliciData.has(d)),
  'un giorno fatto solo di cose tue non compare nemmeno come giorno',
  giorniSoloPrivati.filter((d) => pubbliciData.has(d)).join(', '));

// ---- quello che e' di LEI non si racconta in giro -------------------------
//
// La regola: le cose INTERNE del cervello privato — il suo computer, il suo schermo,
// il suo browser, come ragiona, come cresce — non sono cose da condividere. Non
// e' una questione di segretezza: e' che non riguardano chi usa il bot, e la
// pagina delle novita' e' pubblica e indicizzata.
//
// Il difetto da impedire non e' «una riga sbagliata»: e' che qualcuno (io) se ne
// dimentichi. Marcare a mano funziona finche' uno si ricorda, e prima o poi non
// si ricorda — e quella riga non produce nessun errore: esce, e basta. Quindi
// qui una riga PUBBLICA che la nomina, o che parla delle sue cose, e' rossa
// finche' non e' marcata `[privato]` o dichiarata qui sotto col suo motivo.
const LEI = /\bLia\b/;
const COSE_SUE = /\b(sandbox|coscienza|autocoscienza|il suo (?:computer|schermo|browser|ecosistema|cervello|profilo)|come ragiona|si addestra|le sue (?:vie|lezioni))\b/i;

// Le eccezioni, ognuna col suo motivo. Una riga entra qui solo se descrive una
// cosa che lo STREAMER usa: nasconderla nasconderebbe una funzione.
const AMMESSE = [
  // (nessuna, per ora: le righe che descrivevano funzioni sono state riscritte
  // senza nominarla, cosi' la funzione resta documentata e il nome resta in casa)
];

const pubblicheVoci = pubbliche(gruppi).flatMap((g) => g.voci);
const scappate = pubblicheVoci.filter((v) => (LEI.test(v) || COSE_SUE.test(v))
  && !AMMESSE.some(([pezzo]) => v.includes(pezzo)));
dice(!scappate.length, `nessuna cosa sua fra le ${pubblicheVoci.length} righe pubbliche`,
  scappate.length ? `da marcare [privato] o da riscrivere: «${scappate[0].slice(0, 90)}»` : '');
dice(AMMESSE.every(([pezzo, perche]) => pezzo && perche), 'ogni eccezione porta il suo motivo');

// ---- le date: vere, in ordine, non nel futuro -----------------------------
const oggi = new Date().toISOString().slice(0, 10);
const date = gruppi.map((g) => g.data);
dice(date.every((d) => !Number.isNaN(Date.parse(d))), 'le date sono date');
dice(date.every((d) => d <= oggi), 'nessuna giornata nel futuro',
  date.filter((d) => d > oggi).join(', '));
dice(date.every((d, i) => i === 0 || date[i - 1] >= d), 'dalla più recente alla più vecchia',
  date.join(' → '));
dice(new Set(date).size === date.length, 'una giornata compare una volta sola');

// ---- le righe: scritte per chi trasmette ---------------------------------
// Quello che tradisce una riga scritta per chi programma: un nome di file, una
// chiamata di funzione, il gergo del mestiere.
const GERGO = /\b(refactor|commit|endpoint|middleware|regex|boolean|null|undefined|npm|repository|deploy)\b/i;
const CODICE = /(^|[\s(])(src\/|scripts\/|test\/)|[\w-]+\.(js|mjs|css|json|md)\b|\w+\(\)/;

const lunghe = voci.filter((v) => v.length > 220);
const tecniche = voci.filter((v) => GERGO.test(v) || CODICE.test(v));
const conEmoji = voci.filter((v) => EMOJI.test(v));
dice(lunghe.length === 0, 'ogni riga sta in due frasi', lunghe[0]?.slice(0, 80));
dice(tecniche.length === 0, 'nessuna riga parla di file o di gergo', tecniche[0]?.slice(0, 80));
dice(conEmoji.length === 0, 'niente emoji', conEmoji[0]?.slice(0, 40));

// ---- le importanti si presentano per intero ------------------------------
// Un'importante detta con la stessa riga di una correzione si perde lo stesso,
// anche messa per prima: chi apre la finestra deve capire cos'e', perche' conta
// e dove si prova. Quindi ognuna porta sotto di se' il suo titolo e il suo
// perche' (src/web/novita.js), e solo loro: un titolo su una riga normale le
// darebbe un peso che non ha.
const tutteVoci = gruppi.flatMap((g) => g.voci);
const importanti = tutteVoci.filter((v) => v.importante);
const incomplete = importanti.filter((v) => !v.titolo || !v.perche);
const abusive = tutteVoci.filter((v) => !v.importante && (v.titolo || v.perche));
const titoliStorti = importanti.filter((v) => v.titolo && ([...v.titolo].length > 60 || /[.!?;:,]$/.test(v.titolo)));
const perche = importanti.map((v) => v.perche).filter(Boolean);
const percheLunghi = perche.filter((t) => [...t].length > 300 || (t.match(/[.!?](\s|$)/g) || []).length > 3);
const conLineette = [...importanti.map((v) => v.titolo), ...perche].filter((t) => t && /—/.test(t));
const percheTecnici = [...importanti.map((v) => v.titolo), ...perche].filter((t) => t && (GERGO.test(t) || CODICE.test(t) || EMOJI.test(t)));
dice(!incomplete.length, `le importanti si presentano per intero, con titolo e perché: ${importanti.length}`,
  incomplete[0] ? `manca a «${incomplete[0].testo.slice(0, 60)}…»` : '');
dice(!abusive.length, 'e solo loro: un titolo darebbe a una riga normale un peso che non ha', abusive[0]?.testo.slice(0, 60));
dice(!titoliStorti.length, 'titoli corti, fino a 60 caratteri, senza punto in fondo', titoliStorti[0]?.titolo);
dice(!percheLunghi.length, 'il perché sta in tre frasi', percheLunghi[0]?.slice(0, 80));
dice(!conLineette.length, 'titoli e perché senza lineette lunghe', conLineette[0]?.slice(0, 80));
dice(!percheTecnici.length, 'e scritti per chi trasmette: niente gergo, file o emoji', percheTecnici[0]?.slice(0, 80));

// ---- le tre lingue: ogni riga pubblica si legge anche in inglese e spagnolo --
// La pagina delle novita', la finestra del pannello e l'API parlano la lingua di
// chi legge (src/web/novita.js). Chi legge in inglese o in spagnolo non deve
// trovarsi una riga in italiano in mezzo alle sue: la traduzione si scrive sotto
// la riga, nello stesso commit, e qui si pretende che ci sia.
//
// Non si giudica il gusto di una traduzione: si misura quello che si puo'
// misurare. Che ci sia, intera; che sia attaccata alla sua riga (una rientrata
// staccata da una riga vuota, o scritta due volte, il lettore la lascia cadere:
// qui si chiede a lui cosa ha lasciato); che dica gli stessi numeri e gli stessi
// comandi della riga italiana, che e' anche il modo di accorgersi di una
// traduzione finita sotto la riga sbagliata; e che rispetti le regole delle
// righe italiane: la misura, niente lineette lunghe, niente congiunzione in
// testa, niente gergo.
const LINEETTA = /—|(?<!\d)–|–(?!\d)/;
const ATTACCHI = {
  en: /^(And|But|So|Or|Nor|Plus|Also|Then|Yet|Moreover)\b/,
  es: /^(Y|E|Pero|Así|Entonces|Luego|Además|O|Ni|Mas)\b/,
};
const SEGNI = /\[(vai:|importante\]|privat[oa]\])/i;
// «!comando» scritto come parola, non come comando vero: si traduce.
const GENERICI = new Set(['!comando', '!comandi', '!command', '!commands']);
const cifre = (t) => (String(t).match(/\d+/g) || []).sort().join(' ');
const comandi = (t) => (String(t).match(/![a-z0-9_]+/gi) || []).map((c) => c.toLowerCase()).filter((c) => !GENERICI.has(c)).sort().join(' ');
const frasi = (t) => (String(t).match(/[.!?](\s|$)/g) || []).length;
const misura = (t) => [...String(t)].length;

function guaiLingue(testo) {
  const g = {};
  const segna = (chi, cosa) => { (g[chi] ||= []).push(cosa); };
  for (const x of righeSperse(testo)) segna('sperse', `riga ${x.riga} (${x.perche}): «${x.testo.trim().slice(0, 60)}»`);
  for (const giorno of analizza(testo)) {
    for (const v of giorno.voci) {
      if (v.privata) continue;              // le private non escono di casa: non si traducono
      const dove = `${giorno.data} «${v.testo.slice(0, 40)}…»`;
      for (const l of ['en', 'es']) {
        const t = v.lingue?.[l] || {};
        if (!t.testo) { segna('mancano', `${dove}: manca «${l}:»`); continue; }
        if (v.importante && (!t.titolo || !t.perche)) segna('importanti', `${dove}: manca il titolo o il perché «${l}>»`);
        if (!v.importante && (t.titolo || t.perche)) segna('importanti', `${dove}: «${l}>» su una riga che non è importante`);
        for (const x of [t.testo, t.titolo, t.perche].filter(Boolean)) {
          const q = `${dove} ${l}: «${x.slice(0, 60)}»`;
          if (LINEETTA.test(x)) segna('lineette', q);
          if (ATTACCHI[l].test(x)) segna('attacchi', q);
          if (SEGNI.test(x)) segna('segni', q);
          if (GERGO.test(x) || CODICE.test(x) || EMOJI.test(x)) segna('gergo', q);
          if (LEI.test(x)) segna('lei', q);
        }
        if (misura(t.testo) > 220 || frasi(t.testo) > 2) segna('misura', `${dove} ${l}: ${misura(t.testo)} caratteri, ${frasi(t.testo)} frasi`);
        if (t.titolo && (misura(t.titolo) > 60 || /[.!?;:,]$/.test(t.titolo))) segna('misura', `${dove} ${l}> titolo «${t.titolo}»`);
        if (t.perche && (misura(t.perche) > 300 || frasi(t.perche) > 3)) segna('misura', `${dove} ${l}> perché di ${misura(t.perche)} caratteri, ${frasi(t.perche)} frasi`);
        if (cifre(t.testo) !== cifre(v.testo) || comandi(t.testo) !== comandi(v.testo)) {
          segna('numeri', `${dove} ${l}: «${cifre(t.testo)} ${comandi(t.testo)}» invece di «${cifre(v.testo)} ${comandi(v.testo)}»`);
        }
        if (v.importante && t.titolo && t.perche && cifre(`${t.titolo} ${t.perche}`) !== cifre(`${v.titolo} ${v.perche}`)) segna('numeri', `${dove} ${l}>: i numeri del titolo e del perché`);
        if (t.testo === v.testo) segna('copie', `${dove} ${l}:`);
      }
    }
  }
  return g;
}

const PROMESSE_LINGUE = [
  ['mancano', 'ogni riga pubblica si legge anche in inglese e in spagnolo'],
  ['importanti', 'ogni importante ha titolo e perché nelle tre lingue, e solo le importanti'],
  ['sperse', 'nessuna traduzione staccata dalla sua riga o scritta due volte'],
  ['numeri', 'le traduzioni dicono i numeri e i comandi della riga italiana'],
  ['misura', 'le traduzioni stanno nella misura delle righe: 220 caratteri e due frasi, titoli di 60, perché di tre frasi'],
  ['lineette', 'nelle traduzioni niente lineette lunghe (la corta solo fra due numeri)'],
  ['attacchi', 'nessuna traduzione comincia con una congiunzione'],
  ['segni', '[vai:], [importante] e [privato] stanno solo sulla riga italiana'],
  ['gergo', 'le traduzioni sono scritte per chi trasmette: niente gergo, file o emoji'],
  ['copie', 'nessuna traduzione è la riga italiana ricopiata'],
  ['lei', 'nessuna cosa sua nelle traduzioni'],
];

// L'AUTOPROVA. Si prende il file vero, gia' verde, e lo si rompe in un punto per
// volta: ogni rottura deve accendere la sua promessa. Se il file cambia al punto
// che una rottura non si sa piu' fare, e' rossa anche quella: un'autoprova che
// non rompe niente non prova niente.
if (process.argv.includes('--selftest')) {
  const vero = guaiLingue(TESTO);
  if (Object.keys(vero).length) {
    console.log("  ✗ il file di partenza non e' verde: l'autoprova non puo' dire niente");
    for (const [k, l] of Object.entries(vero)) console.log(`      ${k}: ${l[0]}`);
    process.exit(1);
  }
  const righe = TESTO.split('\n');
  const cambia = (re, fai) => {
    const i = righe.findIndex((r) => re.test(r));
    if (i < 0) return null;
    const r = [...righe];
    fai(r, i);
    return r.join('\n');
  };
  const italiano = (r) => r.replace(/^[-*]\s+/, '').replace(/^(\[(importante|privat[oa])\]\s*)+/i, '').replace(/\s*\[vai:[^\]]*\]\s*$/, '');
  const ROTTURE = [
    ['una riga senza inglese', 'mancano', cambia(/^  en: /, (r, i) => r.splice(i, 1))],
    ['una riga senza spagnolo', 'mancano', cambia(/^  es: /, (r, i) => r.splice(i, 1))],
    ["un'importante senza titolo e perché in spagnolo", 'importanti', cambia(/^  es> /, (r, i) => r.splice(i, 2))],
    ['un titolo tradotto su una riga normale', 'importanti', cambia(/^- (?!\[importante\])/, (r, i) => r.splice(i + 3, 0, '  en> A title', '  en> A reason.'))],
    ['una traduzione staccata da una riga vuota', 'sperse', cambia(/^  en: /, (r, i) => r.splice(i, 0, ''))],
    ['una traduzione scritta due volte', 'sperse', cambia(/^  es: /, (r, i) => r.splice(i, 0, r[i]))],
    ['un numero cambiato', 'numeri', cambia(/^  en: .*\d/, (r, i) => { r[i] = r[i].replace(/\d+/, (n) => String(Number(n) + 1)); })],
    ['un comando tradotto', 'numeri', cambia(/^  en: .*!giochi/, (r, i) => { r[i] = r[i].replace('!giochi', '!games'); })],
    ['una riga troppo lunga', 'misura', cambia(/^  en: /, (r, i) => { r[i] = r[i].replace(/\.$/, '') + ', and on'.repeat(40) + '.'; })],
    ['una riga di tre frasi', 'misura', cambia(/^  es: .{10,80}$/, (r, i) => { r[i] += ' Una. Dos.'; })],
    ['un titolo col punto in fondo', 'misura', cambia(/^  en> /, (r, i) => { r[i] += '.'; })],
    ['una lineetta lunga', 'lineette', cambia(/^  en: /, (r, i) => { r[i] = r[i].replace(/^(  en: \S+) /, '$1 — '); })],
    ['una lineetta corta come pausa', 'lineette', cambia(/^  es: /, (r, i) => { r[i] = r[i].replace(/^(  es: \S+) /, '$1 – '); })],
    ['una congiunzione in testa, in inglese', 'attacchi', cambia(/^  en: /, (r, i) => { r[i] = r[i].replace('  en: ', '  en: And '); })],
    ['una congiunzione in testa, in spagnolo', 'attacchi', cambia(/^  es: /, (r, i) => { r[i] = r[i].replace('  es: ', '  es: Pero '); })],
    ['una destinazione scritta sulla traduzione', 'segni', cambia(/^  en: /, (r, i) => { r[i] += ' [vai: stato]'; })],
    ['una parola da riunione tecnica', 'gergo', cambia(/^  es: /, (r, i) => { r[i] = r[i].replace(/\.$/, ', con un endpoint.'); })],
    ['la riga italiana ricopiata', 'copie', cambia(/^- /, (r, i) => { r[i + 1] = `  en: ${italiano(r[i])}`; })],
    ['una cosa sua in una traduzione', 'lei', cambia(/^  es: /, (r, i) => { r[i] = r[i].replace(/\.$/, ', como dice Lia.'); })],
  ];
  let cieche = 0;
  for (const [che, dove, testo] of ROTTURE) {
    if (testo == null) { console.log(`  ?  ${che}  → non so piu' come romperlo: l'autoprova e' scaduta`); cieche++; continue; }
    const visto = (guaiLingue(testo)[dove] || []).length > 0;
    console.log((visto ? '  ✓  ' : '  ✗  ') + che + (visto ? '' : '  → PASSA INOSSERVATO'));
    if (!visto) cieche++;
  }
  console.log(cieche ? `\n${cieche} ${cieche === 1 ? 'rottura non vista' : 'rotture non viste'}.` : "\nOgni rottura e' vista. ✓");
  process.exit(cieche ? 1 : 0);
}

const lingue = guaiLingue(TESTO);
const tradotte = pubbliche(gruppi).flatMap((g) => g.voci).length;
dice(true, `righe pubbliche nelle tre lingue: ${tradotte}`);
for (const [k, che] of PROMESSE_LINGUE) {
  const l = lingue[k] || [];
  dice(!l.length, che, l.length ? `${l.length}: ${l.slice(0, 3).join(' · ')}` : '');
}

// ---- la regola: chi tocca il prodotto lo racconta -------------------------
// Si guardano i commit che stanno per essere spinti. Se non ce ne sono (o non
// c'è un ramo a monte) non c'è niente da controllare: non è un errore.
const git = (...a) => execFileSync('git', a, { cwd: RAD, encoding: 'utf8' }).trim();
let daSpingere = [];
// DOVE E' SUCCESSA. Una riga puo' portare la sua destinazione: «[vai: consolify]».
// Se quel nome non e' una scheda vera, la freccia porta nel vuoto — e nessuno se
// ne accorge, perche' un bottone che non fa niente ha lo stesso aspetto di uno
// che funziona. La stessa mappa dice anche che quella scheda ha una pagina
// pubblica che la spiega, quindi la freccia vale dentro e fuori dal pannello.
const SCHEDE = aiutiPerScheda();
const dove = destinazioni(gruppi);
const orfane = dove.filter((d) => !SCHEDE[d]);
dice(orfane.length === 0, `righe che dicono dove andare: ${dove.length}`,
  orfane.length ? `non esistono: ${orfane.join(', ')}` : '');

// Un ramo di lavoro spesso non ha un ramo a monte: prima, li', il controllo non
// guardava nessun commit e passava a vuoto, e i commit muti si scoprivano solo
// dopo l'unione, spingendo il ramo principale. Senza ramo a monte si confronta
// con origin/main, cioe' con quello che e' gia' fuori: sono i commit che un
// giorno verranno spinti.
const monteDi = () => {
  try { return git('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'); } catch { /* nessun ramo a monte */ }
  try { git('rev-parse', '--verify', '--quiet', 'origin/main'); return 'origin/main'; } catch { return ''; }
};
try {
  const monte = monteDi();
  if (monte) daSpingere = git('rev-list', `${monte}..HEAD`).split('\n').filter(Boolean);
} catch { /* niente da confrontare: si controlla solo il file */ }

// «Novita': nessuna» vale quanto «Novità: nessuna»: nei messaggi di commit gli
// accenti si scrivono con l'apostrofo, e una regola che non lo sa boccia chi
// scrive come si e' sempre scritto qui.
const SCUSA = /novit[àa]'?\s*:\s*(no|nessuna)\b/i;
// La dichiarazione puo' stare anche in una NOTA attaccata al commit (git notes,
// refs/notes/commits). Serve quando un commit gia' fatto se l'e' dimenticata:
// la nota si aggiunge dopo senza riscrivere il commit, quindi la cronologia
// resta quella e niente va rifatto. Le note viaggiano col push (vedi
// docs/COLLAUDO.md), cosi' la dichiarazione resta accanto al commit anche fuori.
const notaDi = (sha) => { try { return git('notes', 'show', sha); } catch { return ''; } };
const muti = [];
for (const sha of daSpingere) {
  const toccati = git('show', '--name-only', '--format=', sha).split('\n').filter(Boolean);
  if (!toccati.some((f) => f.startsWith('src/'))) continue;         // non tocca il prodotto
  if (toccati.includes('NOVITA.md')) continue;                       // lo racconta
  if (SCUSA.test(git('log', '-1', '--format=%B', sha))) continue;    // dichiara che non c'è niente da dire
  if (SCUSA.test(notaDi(sha))) continue;                             // lo dichiara in una nota, aggiunta dopo
  muti.push(`${sha.slice(0, 8)} ${git('log', '-1', '--format=%s', sha).slice(0, 60)}`);
}
dice(muti.length === 0, `commit da spingere che toccano il prodotto: ${daSpingere.length ? daSpingere.length : 'nessuno'}`);
for (const m of muti) dice(false, `  non dice cosa cambia per chi lo usa: ${m}`);
if (muti.length) dice(false, '  → aggiungi la riga in NOVITA.md, oppure scrivi «Novità: nessuna (perché)» nel messaggio; per un commit gia\' fatto, in una nota: git notes add -m "Novità: nessuna (perché)" <sha>');

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
console.log(rossi.length ? `\n${rossi.length} cose non tornano.` : '\nQuello che cambia per chi usa il bot, è scritto. ✓');
process.exit(rossi.length ? 1 : 0);
