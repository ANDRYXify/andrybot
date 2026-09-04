// I COLLAUDI DA BROWSER, tutti, senza doverli ricordare a memoria.
//
// I cancelli (`npm run cancelli`) sono statici e istantanei, e girano da soli
// prima di ogni spinta. I collaudi no: aprono un browser vero, ci mettono dei
// secondi, e per questo stanno fuori da quella catena. Il guaio e' che stavano
// fuori anche da OGNI catena: erano nomi da ricordare uno per uno, e un
// collaudo nuovo lo lanciava solo chi l'aveva appena scritto.
//
// Qui l'elenco non si scrive: si RICAVA. Sono collaudi tutti gli script
// `verifica-*.mjs` che non compaiono fra i cancelli. Cosi' uno nuovo entra da
// solo il giorno che nasce, e non c'e' nessuna lista da tenere aggiornata.
//
// Uso: npm run collaudi              (esce 1 al primo che non torna)
//      npm run collaudi -- --elenca  (dice solo quali sono)

import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const cancelli = JSON.parse(readFileSync(join(RAD, 'package.json'), 'utf8')).scripts.cancelli;

const tutti = readdirSync(join(RAD, 'scripts')).filter((f) => /^verifica-.*\.mjs$/.test(f)).sort();
const daFare = tutti.filter((f) => !cancelli.includes(f));

if (process.argv.includes('--elenca')) {
  console.log(daFare.map((f) => '  . ' + f).join('\n'));
  process.exit(0);
}

console.log(`Collaudi da browser: ${daFare.length} (i cancelli ne coprono altri ${tutti.length - daFare.length})\n`);
const rotti = [];
for (const f of daFare) {
  console.log(`--- ${f}`);
  const r = spawnSync(process.execPath, [join('scripts', f)], { cwd: RAD, stdio: 'inherit' });
  if (r.status !== 0) rotti.push(f);
  console.log('');
}
console.log(rotti.length ? `Non tornano: ${rotti.join(', ')}` : 'Tutti i collaudi sono verdi. ✓');
process.exit(rotti.length ? 1 : 0);
