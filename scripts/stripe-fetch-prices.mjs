#!/usr/bin/env node
// Mostra quali prezzi il server sceglie in Stripe, voce per voce, con la STESSA
// regola del server (abbonamenti.js → abbinaPrezzi): il prodotto con il nome
// della voce, il prezzo attivo mensile in euro con l'importo del listino.
// Serve a controllare senza riavviare: se qui una voce e' rossa, in produzione
// non si vende, e il motivo e' lo stesso che finisce nel log.
//
// Uso:  node scripts/stripe-fetch-prices.mjs        (legge STRIPE_SECRET_KEY dal .env)
//
// La chiave resta sulla tua macchina: lo script parla solo con Stripe.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// mini-lettore .env (stesso formato dell'app): riempie process.env se manca
function caricaDotEnv() {
  const path = resolve(process.cwd(), '.env');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('='); if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}
caricaDotEnv();
// il server considera Stripe acceso solo con tutte e due le chiavi: qui basta la segreta
if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_WEBHOOK_SECRET) process.env.STRIPE_WEBHOOK_SECRET = 'whsec_solo-per-leggere';

const { verificaPrezziStripe, vociVendute } = await import('../src/features/abbonamenti.js');

if (!process.env.STRIPE_SECRET_KEY) { console.error('Manca STRIPE_SECRET_KEY nel .env.'); process.exit(1); }
const esiti = await verificaPrezziStripe();
if (esiti === null) { console.error('Stripe non risponde.'); process.exit(1); }
const nome = new Map(vociVendute().map((v) => [v.priceEnv, v]));
let rossi = 0;
for (const e of esiti) {
  const v = nome.get(e.priceEnv);
  const euro = '€' + v.prezzo.toFixed(2).replace('.', ',');
  if (e.ok) console.log(`  ✓ ${v.nome.padEnd(18)} ${euro.padStart(6)}  ${e.price}`);
  else { rossi++; console.log(`  ✗ ${v.nome.padEnd(18)} ${euro.padStart(6)}  ${e.motivo}`); }
}
console.log(rossi ? `\n${rossi} voce/i non in vendita: sistema il prezzo in Stripe (importo del listino, mensile, in euro, attivo).` : '\nTutto il listino e\' in vendita.');
process.exit(rossi ? 1 : 0);
