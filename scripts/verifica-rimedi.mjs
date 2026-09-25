// Cancello dei RIMEDI: il rimedio che tocca al canale lo legge solo chi lo puo' fare.
//
// La regola (docs/RIMEDI.md): una frase che il bot dice in chat non chiede mai a
// chi legge una cosa che puo' fare solo il proprietario. Rimettere un permesso,
// collegare Spotify, insegnargli una risposta dal pannello: lo puo' fare solo
// chi ha il canale. Detto a uno spettatore non gli serve, non lo puo' eseguire,
// e in chat lo leggono tutti.
//
// Il difetto da cui nasce: a uno spettatore che aveva fatto una domanda allo
// streamer, il bot ha risposto col nome dello streamer «Su questa passo. Ma se
// me la insegni dalla dashboard non me la scordo più». Sei frasi cosi', scritte
// come se chi chiede fosse il padrone del canale.
//
// Come si tiene. Ogni testo dei file che parlano in chat che nomina il pannello,
// la dashboard, i permessi da rimettere o un collegamento da rifare deve stare in
// uno di due posti:
//   · la chiave `staff:` di un aChiPuo(...) (src/features/risposte.js), che lo
//     dice solo a streamer e mod; la chiave `pubblico:` accanto non lo nomina mai;
//   · l'elenco qui sotto, col destinatario e il perche'.
// Un testo nuovo che non sta in nessuno dei due e' rosso finche' qualcuno non
// decide a chi arriva. Una voce dell'elenco che non trova piu' il suo testo e'
// rossa anche lei: un elenco che non corrisponde al codice non protegge niente.
//
// Uso: node scripts/verifica-rimedi.mjs [--selftest]

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { senzaCommentiJs } from './_codice.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');

// I file che scrivono in chat: i gestori dei comandi, il cervello, il bot.
const CARTELLE = ['src/features', 'src/ai'];
const FILE = ['src/bot.js'];

// Le parole di un rimedio che tocca al canale.
export const PAROLE = /dashboard|pannell|riautorizz|ricollega|concedi i permessi/i;

// I testi col rimedio che non passano da aChiPuo, ognuno con chi lo legge.
export const CLASSIFICATI = [
  ['src/bot.js', 'Entra nella dashboard e premi', 'Telegram, al solo proprietario'],
  ['src/features/antibot.js', 'togline qualcuno dal pannello', '!permetti risponde solo a streamer e mod'],
  ['src/features/comandibase.js', 'riautorizza i permessi dalla dashboard', '!so risponde solo a streamer e mod'],
  ['src/features/modalita-chat.js', 'riautorizza dalla dashboard', 'le modalita\' della chat rispondono solo a streamer e mod'],
  ['src/features/trackinggiochi.js', 'Il tracking webcam è spento: accendilo nel pannello', 'detto solo a streamer e mod'],
  ['src/features/trackinggiochi.js', 'Il Puzzle è spento: accendilo nel pannello', 'il puzzle lo avviano solo streamer e mod'],
  ['src/features/comandi-registro.js', 'senza aprire il pannello', 'descrive un comando dei mod: non chiede niente a chi legge'],
  ['src/features/donazioni-satispay.js', 'Genera un codice nuovo e ricoll', 'errore del collegamento, nel pannello del proprietario'],
  ['src/features/donazioni-satispay.js', 'Generane uno nuovo dal tuo pannello', 'errore del collegamento, nel pannello del proprietario'],
  ['src/features/donazioni-satispay.js', 'fallo dal tuo pannello Business', 'errore del rimborso, nel pannello del proprietario'],
  ['src/features/donazioni-stripe.js', 'La chiave non ha il permesso «Refunds»', 'errore del rimborso, nel pannello del proprietario'],
  ['src/features/donazioni-stripe.js', 'fallo dal tuo Dashboard', 'errore del rimborso, nel pannello del proprietario'],
  ['src/features/posta.js', 'Lo ritrovi nel tuo pannello', 'mail al proprietario'],
  ['src/features/posta.js', 'dal pannello di SocialBot', 'mail a chi ha chiesto il rapporto'],
  ['src/features/studio.js', 'ri-concedi i permessi', 'errore della diretta dallo Studio, nel pannello del proprietario'],
];

function elencaFile() {
  const fuori = [...FILE];
  for (const c of CARTELLE) {
    for (const f of readdirSync(join(RAD, c), { recursive: true })) {
      if (String(f).endsWith('.js')) fuori.push(join(c, String(f)).split('\\').join('/'));
    }
  }
  return fuori.sort();
}

export function leggiSorgenti() {
  return Object.fromEntries(elencaFile().map((f) => [f, readFileSync(join(RAD, f), 'utf8')]));
}

const LETTERALE = /'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g;

// Tutto quello che non torna, in una lista di righe.
export function guai(sorgenti) {
  const g = [];
  const usate = new Set();
  for (const [file, testo] of Object.entries(sorgenti)) {
    const s = senzaCommentiJs(testo);
    for (const m of s.matchAll(LETTERALE)) {
      if (!PAROLE.test(m[0])) continue;
      const riga = s.slice(0, m.index).split('\n').length;
      const prima = s.slice(Math.max(0, m.index - 400), m.index);
      const chiave = (prima.match(/\b(staff|pubblico)\s*:\s*$/) || [])[1];
      const dove = `${file}:${riga} ${m[0].slice(0, 70)}`;
      if (chiave === 'pubblico') { g.push(`a chi non puo' farlo: ${dove}`); continue; }
      if (chiave === 'staff') {
        // `staff:` apre l'oggetto dato a aChiPuo(chi, { staff, pubblico })
        if (!/aChiPuo\((?:[^()]|\([^()]*\))*,\s*\{\s*staff\s*:\s*$/.test(prima)) g.push(`«staff:» fuori da un aChiPuo: ${dove}`);
        continue;
      }
      const voce = CLASSIFICATI.findIndex(([f, pezzo]) => f === file && m[0].includes(pezzo));
      if (voce < 0) { g.push(`senza destinatario: ${dove}`); continue; }
      usate.add(voce);
    }
  }
  CLASSIFICATI.forEach(([f, pezzo], i) => { if (!usate.has(i)) g.push(`voce scaduta: ${f} «${pezzo}» non c'e' piu'`); });
  return g;
}

if (process.argv.includes('--selftest')) {
  const vere = leggiSorgenti();
  const rompi = (file, da, a) => ({ ...vere, [file]: vere[file].replace(da, a) });
  const ROTTURE = [
    ['il «non lo so» del bot torna a mandare alla dashboard',
      rompi('src/ai/brain.js', "'Su questa passo, {user}.'", "'Su questa passo, {user}. Ma se me la insegni dalla dashboard non me la scordo più 📚'")],
    ['la frase per lo spettatore nomina il pannello',
      rompi('src/features/songrequest.js', "pubblico: '🎵 Le richieste musicali qui non sono attive.'", "pubblico: '🎵 Richieste musicali non attive: lo streamer deve collegare Spotify dal pannello.'")],
    ['un testo nuovo col rimedio, senza aver deciso a chi arriva',
      rompi('src/features/attese-giochi.js', 'export ', "const _nuovo = () => say('Accendilo dal pannello.');\nexport ")],
    ['un testo dell\'elenco sparisce e la voce resta',
      rompi('src/features/antibot.js', 'togline qualcuno dal pannello', 'togline qualcuno')],
    ['un rimedio «staff:» che non passa da aChiPuo',
      rompi('src/features/songrequest.js', "aChiPuo(dalloStaff, {\n      staff: '🎵 Collegamento", "Object.assign({}, {\n      staff: '🎵 Collegamento")],
  ];
  let cieche = 0;
  for (const [che, sorgenti] of ROTTURE) {
    const visto = JSON.stringify(sorgenti) !== JSON.stringify(vere) && guai(sorgenti).length > 0;
    console.log((visto ? '  ✓  ' : '  ✗  ') + che + (visto ? '' : '  → PASSA INOSSERVATO'));
    if (!visto) cieche++;
  }
  console.log(cieche ? `\n${cieche} rotture non viste.` : "\nOgni rottura e' vista. ✓");
  process.exit(cieche ? 1 : 0);
}

const sorgenti = leggiSorgenti();
const trovati = guai(sorgenti);
const conta = Object.values(sorgenti).reduce((n, t) => n + [...senzaCommentiJs(t).matchAll(LETTERALE)].filter((m) => PAROLE.test(m[0])).length, 0);
console.log(`  testi col rimedio nei file che parlano in chat: ${conta} (${Object.keys(sorgenti).length} file)`);
for (const r of trovati) console.log('  ✗ ' + r);
console.log(trovati.length ? `\n${trovati.length} cose non tornano.` : "\nOgni rimedio lo legge chi lo puo' fare. ✓");
process.exit(trovati.length ? 1 : 0);
