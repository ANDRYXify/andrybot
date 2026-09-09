// L'IMPRONTA DEL PROGETTO: a chi è, e da quando.
//
// Non impedisce niente, e non prova a farlo. Serve a rispondere alla sola domanda
// che conta davanti a chi decide: «questo codice ce l'avevi tu, e da quando?».
//
// Come funziona. Legge i file veri del progetto, ne calcola l'impronta una per
// una, e ne fa una sola finale. Due copie identiche danno la stessa impronta;
// una copia con una riga cambiata ne da' una diversa, e si vede QUALE file.
//
// Come si usa. Si lancia, si tiene l'uscita insieme alla data, e si deposita
// dove una data è certa: una mail a sé stessi, un commit firmato, un servizio di
// marcatura temporale. Il valore non è nell'impronta: è nella DATA in cui esisteva.
//
// Le impronte di git sono già una catena: ogni commit contiene quella del
// precedente, quindi la storia non si riscrive senza che si veda. Questa aggiunge
// una cosa che git da solo non da': un numero unico da mettere su un foglio.
//
// Uso: node scripts/impronta.mjs            (l'impronta di adesso)
//      node scripts/impronta.mjs --file     (anche quella di ogni file)
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const SALTA = new Set(['node_modules', '.git', 'dati', 'tmp', '.cache', 'coverage']);
const ESTENSIONI = /\.(js|mjs|cjs|css|html|md|json|yml|yaml|py|sql)$/;

function file(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (SALTA.has(n) || n.startsWith('.')) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) file(p, out);
    else if (ESTENSIONI.test(n)) out.push(p);
  }
  return out;
}

const impronta = (t) => createHash('sha256').update(t).digest('hex');

const files = file(RAD).map((p) => relative(RAD, p)).sort();
const righe = files.map((f) => `${impronta(readFileSync(join(RAD, f)))}  ${f}`);
const globale = impronta(righe.join('\n'));

let commit = '(fuori da git)';
try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: RAD, encoding: 'utf8' }).trim(); } catch (e) { }

// Quello che è già scritto dentro il codice, contato: è la firma più difficile
// da togliere, perché è sparsa in migliaia di righe scritte a mano.
let firmati = 0;
for (const f of files) {
  const t = readFileSync(join(RAD, f), 'utf8');
  if (t.includes('ANDRYX-IP::') || t.includes('Andrea Taliento')) firmati++;
}

if (process.argv.includes('--file')) console.log(righe.join('\n') + '\n');
console.log('PROGETTO   socialbot.live — Andrea Taliento (ANDRYXify)');
console.log('COMMIT     ' + commit);
console.log('FILE       ' + files.length + ' (di cui ' + firmati + ' con la firma dentro)');
console.log('IMPRONTA   ' + globale);
console.log('');
console.log('Tieni questa riga con la data di oggi, e depositala dove la data fa fede.');
