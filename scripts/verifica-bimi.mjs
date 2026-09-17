// Cancello del logo BIMI: il file che i programmi di posta mostreranno accanto
// al mittente deve stare dentro un profilo stretto, e quel profilo non si vede a
// occhio. Un SVG che si apre benissimo nel browser puo' essere rifiutato da chi
// emette il certificato, e ce ne si accorge dopo aver pagato.
//
// Qui si controlla cio' che il profilo «SVG Tiny 1.2 Portable/Secure» pretende, e
// cio' che chi emette il certificato misura: niente che esegua, niente che venga
// da fuori, niente testo (le lettere devono essere disegno, se no dipendono da un
// carattere che chi guarda non ha), un titolo, un quadrato, e non piu' di 32 kB.
//
// Uso: node scripts/verifica-bimi.mjs   (esce 1 se qualcosa non torna)
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const VIA = 'src/web/public/bimi/socialbot.svg';
const FILE = join(RAD, VIA);

const esiti = [];
const dice = (ok, cosa, extra = '') => esiti.push({ ok, cosa, extra });

if (!existsSync(FILE)) {
  console.log(`  ✗ manca ${VIA}  →  si rifa' con: node scripts/marchio-bimi.mjs`);
  console.log('\n1 cosa non torna.');
  process.exit(1);
}

const svg = readFileSync(FILE, 'utf8');
const kb = statSync(FILE).size / 1024;

dice(/baseProfile="tiny-ps"/.test(svg), 'dichiara il profilo «tiny-ps»');
dice(/version="1\.2"/.test(svg), 'dichiara la versione 1.2');
dice(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(svg), 'dichiara di essere un SVG');

// Il titolo e' obbligatorio e deve essere il PRIMO figlio: e' il nome del
// marchio, ed e' quello che legge chi non vede l'immagine.
const titolo = /<svg[^>]*>\s*<title>([^<]+)<\/title>/.exec(svg);
dice(!!titolo && titolo[1].trim().length > 0, 'ha un titolo, ed e\' il primo figlio',
  'il titolo va subito dentro <svg>, e dice il nome del marchio');

// Quadrato, e che parta da zero: un logo alto e stretto viene schiacciato o
// tagliato, e chi lo ritaglia a cerchio lo taglia male.
const vb = /viewBox="([\d.\-\s]+)"/.exec(svg);
const n = vb ? vb[1].trim().split(/\s+/).map(Number) : [];
dice(n.length === 4 && n[0] === 0 && n[1] === 0 && n[2] === n[3] && n[2] > 0,
  `il riquadro e' quadrato e parte da zero${vb ? ` (${vb[1].trim()})` : ''}`,
  'BIMI vuole un quadrato: viewBox="0 0 N N"');
dice(!/<svg[^>]*\s(x|y)=/.test(svg), 'la radice non ha x o y');

// Niente che esegua, niente che si muova, niente che venga da fuori. Un logo che
// carica qualcosa da un altro indirizzo e' un logo che puo' cambiare dopo essere
// stato certificato: per questo e' vietato, e non e' una formalita'.
const VIETATI = ['script', 'a', 'image', 'foreignObject', 'style', 'text', 'tspan',
  'animate', 'animateTransform', 'animateMotion', 'set', 'filter', 'iframe', 'video', 'audio'];
const trovati = VIETATI.filter((t) => new RegExp(`<${t}[\\s/>]`, 'i').test(svg));
dice(trovati.length === 0, `nessuno degli elementi vietati (${VIETATI.length} controllati)`,
  trovati.length ? `dentro ci sono: ${trovati.join(', ')}` : '');

dice(!/\b(xlink:href|href)\s*=/.test(svg), 'niente collegamenti');
dice(!/https?:\/\//.test(svg.replace(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, '')),
  'niente che venga da fuori', 'un indirizzo dentro il logo lo renderebbe modificabile dopo il certificato');
dice(!/data:/.test(svg), 'niente immagini incollate dentro');
dice(!/<!ENTITY|<!DOCTYPE/i.test(svg), 'niente entita\' o DOCTYPE');

dice(kb <= 32, `sta in ${kb.toFixed(1)} kB`, 'chi emette il certificato ne accetta al massimo 32');

// E deve avere qualcosa dentro: un file formalmente perfetto e vuoto passerebbe
// tutti i controlli di sopra.
const quanti = (svg.match(/<path\b/g) || []).length;
dice(quanti > 0, `il segno c'e': ${quanti} tracciati`, 'il file e\' formalmente giusto ma vuoto');

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.cosa + (e.ok || !e.extra ? '' : `\n      → ${e.extra}`));
console.log(rossi.length
  ? `\n${rossi.length} cose non tornano. Si rifa' con: node scripts/marchio-bimi.mjs`
  : '\nIl logo per la posta sta dentro il profilo che chiedono. ✓');
process.exit(rossi.length ? 1 : 0);
