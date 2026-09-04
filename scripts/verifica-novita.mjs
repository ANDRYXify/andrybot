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
import { analizza } from '../src/web/novita.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });

const gruppi = analizza(readFileSync(join(RAD, 'NOVITA.md'), 'utf8'));
const voci = gruppi.flatMap((g) => g.voci);
dice(gruppi.length > 0 && voci.length > 0, `giornate raccontate: ${gruppi.length} · righe: ${voci.length}`);

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
