#!/usr/bin/env node
// Converte l'export CSV dei Prezzi di Stripe in righe .env pronte da copiare.
//
// Uso:   node scripts/stripe-csv-to-env.mjs prezzi.csv
//        node scripts/stripe-csv-to-env.mjs prezzi.csv > .env.stripe
//
// Come funziona: la mappa "nome prodotto → variabile .env" viene ricavata dal
// catalogo (src/features/abbonamenti.js), che è l'UNICA fonte di verità. Così se
// aggiungi/rinomini un pacchetto qui, il convertitore resta allineato da solo.
// Le righe .env vanno su STDOUT; avvisi e riepilogo su STDERR (così puoi fare `>`).
import { readFileSync } from 'node:fs';
import { BASE, ADDON, BUNDLE } from '../src/features/abbonamenti.js';

const file = process.argv[2];
if (!file) { console.error('Uso: node scripts/stripe-csv-to-env.mjs <prezzi.csv>'); process.exit(1); }

// nome prodotto (minuscolo) → { env, prezzo } dal catalogo
const catalogo = [
  { nome: BASE.nome, env: 'STRIPE_PRICE_' + BASE.priceEnv.toUpperCase(), prezzo: BASE.prezzo },
  ...ADDON.map((a) => ({ nome: a.nome, env: 'STRIPE_PRICE_' + a.priceEnv.toUpperCase(), prezzo: a.prezzo })),
  ...BUNDLE.map((b) => ({ nome: b.nome, env: 'STRIPE_PRICE_' + b.priceEnv.toUpperCase(), prezzo: b.prezzo })),
];
const perNome = new Map(catalogo.map((c) => [c.nome.trim().toLowerCase(), c]));

// Parser CSV minimale (gestisce virgolette e virgole dentro i campi, es. "2,99").
function parseCsv(testo) {
  const righe = [];
  for (const linea of testo.split(/\r?\n/)) {
    if (!linea.trim()) continue;
    const campi = []; let cur = '', dentro = false;
    for (let i = 0; i < linea.length; i++) {
      const ch = linea[i];
      if (dentro) {
        if (ch === '"' && linea[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') dentro = false;
        else cur += ch;
      } else if (ch === '"') dentro = true;
      else if (ch === ',') { campi.push(cur); cur = ''; }
      else cur += ch;
    }
    campi.push(cur);
    righe.push(campi);
  }
  return righe;
}

const righe = parseCsv(readFileSync(file, 'utf8'));
const intest = righe.shift() || [];
const col = (nome) => intest.findIndex((h) => h.trim().toLowerCase() === nome.toLowerCase());
const iPrice = col('Price ID'), iNome = col('Product Name'), iImporto = col('Amount'), iCreato = col('Created (UTC)');
if (iPrice < 0 || iNome < 0) { console.error('CSV inatteso: servono le colonne "Price ID" e "Product Name".'); process.exit(1); }

const trovati = new Map();   // env → { priceId, nomeProdotto, importo, creato }
const nonRiconosciuti = [];
for (const r of righe) {
  const nomeProd = (r[iNome] || '').trim();
  const priceId = (r[iPrice] || '').trim();
  if (!priceId) continue;
  const c = perNome.get(nomeProd.toLowerCase());
  if (!c) { nonRiconosciuti.push(nomeProd || '(senza nome)'); continue; }
  const importo = iImporto >= 0 ? Number((r[iImporto] || '').replace(',', '.')) : null;
  const creato = iCreato >= 0 ? (r[iCreato] || '') : '';
  const prec = trovati.get(c.env);
  // se un prodotto ha più prezzi, tieni il più recente (per data di creazione)
  if (!prec || (creato && prec.creato && creato > prec.creato)) {
    trovati.set(c.env, { priceId, nomeProdotto: nomeProd, importo, atteso: c.prezzo });
  }
}

// STDOUT: righe .env nell'ordine del catalogo
console.log('# Price ID Stripe → variabili .env (generato da stripe-csv-to-env.mjs)');
for (const c of catalogo) {
  const t = trovati.get(c.env);
  console.log(t ? `${c.env}=${t.priceId}` : `# ${c.env}=   # MANCANTE: crea il prezzo "${c.nome}" (€${c.prezzo.toFixed(2)}) su Stripe`);
}

// STDERR: riepilogo e avvisi
const mancanti = catalogo.filter((c) => !trovati.has(c.env));
console.error(`\n✓ Trovati ${trovati.size}/${catalogo.length} prezzi.`);
for (const c of catalogo) {
  const t = trovati.get(c.env);
  if (t && t.importo != null && Math.abs(t.importo - t.atteso) > 0.001) {
    console.error(`  ⚠️  ${c.nome}: importo Stripe €${t.importo.toFixed(2)} ≠ catalogo €${t.atteso.toFixed(2)} — allinea uno dei due.`);
  }
}
if (mancanti.length) console.error('  ✗ Mancano: ' + mancanti.map((c) => c.nome + ' (' + c.env + ')').join(', '));
if (nonRiconosciuti.length) console.error('  ? Nel CSV ma senza corrispondenza nel catalogo: ' + [...new Set(nonRiconosciuti)].join(', '));
