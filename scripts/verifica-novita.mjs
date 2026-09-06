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
// Uso: node scripts/verifica-novita.mjs   (esce 1 se qualcosa non torna)

import { execFileSync } from 'node:child_process';
import { EMOJI } from './_emoji.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { analizza, pubbliche } from '../src/web/novita.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });

const gruppi = analizza(readFileSync(join(RAD, 'NOVITA.md'), 'utf8'));
// Le voci sono OGGETTI ({testo, privata}), non stringhe: chi controlla la forma
// deve guardare il testo. Prendendo l'oggetto, ogni misura qui sotto tornerebbe
// verde su niente — che e' peggio di un cancello rosso.
const voci = gruppi.flatMap((g) => g.voci).map((v) => v.testo);
dice(gruppi.length > 0 && voci.length > 0, `giornate raccontate: ${gruppi.length} · righe: ${voci.length}`);
dice(voci.every((v) => typeof v === 'string'), 'le righe si leggono come testo',
  'la forma delle voci e\' cambiata: i controlli qui sotto non misurano piu\' niente');

// ---- quello che e' privato non esce di casa ------------------------------
// Non tutto quello che cambia riguarda chi usa il bot: la crescita di Lia e il suo
// computer sono cose del direttore. Si marcano `[privato]`, e da li' in poi la
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
// Regola del direttore: le cose INTERNE di Lia — il suo computer, il suo schermo,
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

// ---- la regola: chi tocca il prodotto lo racconta -------------------------
// Si guardano i commit che stanno per essere spinti. Se non ce ne sono (o non
// c'è un ramo a monte) non c'è niente da controllare: non è un errore.
const git = (...a) => execFileSync('git', a, { cwd: RAD, encoding: 'utf8' }).trim();
let daSpingere = [];
try {
  const monte = git('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}');
  daSpingere = git('rev-list', `${monte}..HEAD`).split('\n').filter(Boolean);
} catch { /* nessun ramo a monte: si controlla solo il file */ }

// «Novita': nessuna» vale quanto «Novità: nessuna»: nei messaggi di commit gli
// accenti si scrivono con l'apostrofo, e una regola che non lo sa boccia chi
// scrive come si e' sempre scritto qui.
const SCUSA = /novit[àa]'?\s*:\s*(no|nessuna)\b/i;
const muti = [];
for (const sha of daSpingere) {
  const toccati = git('show', '--name-only', '--format=', sha).split('\n').filter(Boolean);
  if (!toccati.some((f) => f.startsWith('src/'))) continue;         // non tocca il prodotto
  if (toccati.includes('NOVITA.md')) continue;                       // lo racconta
  if (SCUSA.test(git('log', '-1', '--format=%B', sha))) continue;    // dichiara che non c'è niente da dire
  muti.push(`${sha.slice(0, 8)} ${git('log', '-1', '--format=%s', sha).slice(0, 60)}`);
}
dice(muti.length === 0, `commit da spingere che toccano il prodotto: ${daSpingere.length ? daSpingere.length : 'nessuno'}`);
for (const m of muti) dice(false, `  non dice cosa cambia per chi lo usa: ${m}`);
if (muti.length) dice(false, '  → aggiungi la riga in NOVITA.md, oppure scrivi «Novità: nessuna (perché)» nel messaggio');

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
console.log(rossi.length ? `\n${rossi.length} cose non tornano.` : '\nQuello che cambia per chi usa il bot, è scritto. ✓');
process.exit(rossi.length ? 1 : 0);
