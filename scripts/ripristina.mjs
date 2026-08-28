// RIPRISTINO del database da una copia di backup.
//
// Perché esiste: le copie c'erano, il ripristino no — e un backup che nessuno
// ha mai riaperto è una speranza, non un backup. Questo script è la strada
// scritta, provata, con le protezioni giuste.
//
// Uso (sul server, dalla cartella del progetto):
//   node scripts/ripristina.mjs                  → elenca le copie e le prova
//   node scripts/ripristina.mjs --ultima         → ripristina la più recente
//   node scripts/ripristina.mjs <nome-file>      → ripristina quella copia
//   node scripts/ripristina.mjs --prova <file>   → solo controllo, non tocca niente
//
// Protezioni, nell'ordine:
//   1. la copia scelta viene APERTA e controllata PRIMA di toccare qualcosa;
//   2. il database attuale viene messo da parte (mai cancellato) con la data;
//   3. si scrive, poi si riapre il risultato: se non torna, si rimette indietro
//      quello di prima;
//   4. il bot va fermato prima (`docker compose stop bot`): lo script lo dice e
//      chiede conferma, perché scrivere sotto un processo che legge è il modo
//      migliore per rompere tutto e due.
import { existsSync, copyFileSync, renameSync, rmSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createInterface } from 'node:readline/promises';

const { provaCopia, elencoCopie, cartellaCopie } = await import('../src/backup.js');
const { config } = await import('../src/config.js');

const DB = join(config.dataDir, 'andrybot.db');
const args = process.argv.slice(2);
const ha = (f) => args.includes(f);
const quando = (ts) => new Date(ts).toLocaleString('it-IT');
const mb = (b) => (b / 1048576).toFixed(1) + ' MB';

function elenca() {
  const copie = elencoCopie();
  if (!copie.length) {
    console.log('Nessuna copia in ' + cartellaCopie());
    console.log('Il backup automatico parte col bot; se non è mai partito, non c’è niente da ripristinare.');
    return copie;
  }
  console.log(`Copie in ${cartellaCopie()}:\n`);
  copie.forEach((c, i) => {
    const p = provaCopia(c.percorso);
    const esito = p.ok ? `ok · ${p.streamer} streamer · ${p.tabelle} tabelle` : `NON RIPRISTINABILE: ${p.errore}`;
    console.log(`${String(i + 1).padStart(2)}. ${c.file}  ${quando(c.ts).padEnd(20)} ${mb(c.bytes).padStart(9)}   ${esito}`);
  });
  return copie;
}

async function conferma(domanda) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const r = (await rl.question(domanda + ' Scrivi RIPRISTINA per procedere: ')).trim();
  rl.close();
  return r === 'RIPRISTINA';
}

async function main() {
  if (ha('--prova')) {
    const nome = args[args.indexOf('--prova') + 1];
    const f = nome && (existsSync(nome) ? nome : join(cartellaCopie(), basename(nome)));
    const p = provaCopia(f);
    console.log(p.ok ? `${basename(f)}: ok — ${p.streamer} streamer, ${p.tabelle} tabelle` : `${nome}: NON ripristinabile — ${p.errore}`);
    process.exit(p.ok ? 0 : 1);
  }

  const copie = elenca();
  if (!copie.length) process.exit(1);

  const scelta = ha('--ultima')
    ? copie[0]
    : copie.find((c) => args.includes(c.file) || args.includes(basename(c.file)));

  if (!scelta) {
    console.log('\nNessuna copia scelta. Aggiungi --ultima oppure il nome di un file qui sopra.');
    process.exit(0);
  }

  console.log(`\nCopia scelta: ${scelta.file} (${quando(scelta.ts)})`);
  const prova = provaCopia(scelta.percorso);
  if (!prova.ok) { console.error(`Non la ripristino: ${prova.errore}`); process.exit(1); }
  console.log(`Controllata: integra, ${prova.streamer} streamer dentro.`);
  console.log(`Il database attuale (${DB}) verrà messo da parte, non cancellato.`);
  console.log('Il bot deve essere FERMO. Se gira in docker: docker compose stop bot');

  if (!(await conferma('\nProcedo?'))) { console.log('Annullato. Niente è stato toccato.'); process.exit(0); }

  const marca = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
  const daParte = `${DB}.prima-del-ripristino-${marca}`;
  const scarti = [`${DB}-wal`, `${DB}-shm`];

  if (existsSync(DB)) { renameSync(DB, daParte); console.log(`Il database di prima è in ${basename(daParte)}`); }
  for (const f of scarti) { try { if (existsSync(f)) rmSync(f); } catch { /* niente */ } }

  try {
    copyFileSync(scelta.percorso, DB);
    const dopo = provaCopia(DB);
    if (!dopo.ok) throw new Error('il database ripristinato non si riapre: ' + dopo.errore);
    console.log(`\nFatto. ${basename(DB)} ripristinato da ${scelta.file} — ${dopo.streamer} streamer, ${mb(statSync(DB).size)}.`);
    console.log('Ora riavvia il bot: docker compose start bot');
  } catch (e) {
    console.error('\nRIPRISTINO FALLITO: ' + (e?.message || e));
    try { if (existsSync(DB)) rmSync(DB); if (existsSync(daParte)) renameSync(daParte, DB); } catch { /* niente */ }
    console.error('Ho rimesso indietro il database di prima. Non hai perso niente.');
    process.exit(1);
  }
}

main().catch((e) => { console.error(e?.message || e); process.exit(1); });
