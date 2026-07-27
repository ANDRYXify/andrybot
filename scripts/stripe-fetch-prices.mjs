#!/usr/bin/env node
// Scarica i Prezzi direttamente da Stripe (via API) e stampa le righe .env
// pronte — senza export CSV e senza copiare a mano i price-id.
//
// Uso:  node scripts/stripe-fetch-prices.mjs                 (legge la key dal .env)
//       node scripts/stripe-fetch-prices.mjs > .env.stripe
//       node scripts/stripe-fetch-prices.mjs sk_live_...     (o passala a mano)
//
// La chiave la prende dal .env del progetto (STRIPE_SECRET_KEY), come fa l'app —
// non serve passarla. Resta sulla TUA macchina: lo script parla solo con Stripe.
// Il match "prodotto → variabile .env" usa il catalogo (src/features/abbonamenti.js)
// come fonte di verità; a parità di nome vince il prezzo con l'IMPORTO uguale al
// catalogo (così se hai un vecchio Base €3,99 e il nuovo €2,99, prende quello giusto).
// Righe .env su STDOUT, riepilogo/avvisi su STDERR.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { BASE, ADDON, BUNDLE } from '../src/features/abbonamenti.js';

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

const key = process.env.STRIPE_SECRET_KEY || process.argv[2];
if (!key) { console.error('Manca STRIPE_SECRET_KEY nel .env (o passala come argomento).'); process.exit(1); }

// catalogo: nomi accettati (per i bundle anche "Bundle X") → env + importo atteso
const catalogo = [
  { nome: BASE.nome, nomi: [BASE.nome], env: 'STRIPE_PRICE_' + BASE.priceEnv.toUpperCase(), prezzo: BASE.prezzo },
  ...ADDON.map((a) => ({ nome: a.nome, nomi: [a.nome], env: 'STRIPE_PRICE_' + a.priceEnv.toUpperCase(), prezzo: a.prezzo })),
  ...BUNDLE.map((b) => ({ nome: b.nome, nomi: [b.nome, 'Bundle ' + b.nome], env: 'STRIPE_PRICE_' + b.priceEnv.toUpperCase(), prezzo: b.prezzo })),
];
const perNome = new Map();
for (const c of catalogo) for (const n of c.nomi) perNome.set(n.trim().toLowerCase(), c);

// scarica TUTTI i prezzi attivi (con il prodotto espanso), gestendo la paginazione
async function tuttiIPrezzi() {
  const out = [];
  let startingAfter = null;
  for (let giro = 0; giro < 50; giro++) {
    const q = new URLSearchParams({ limit: '100', active: 'true' });
    q.append('expand[]', 'data.product');
    if (startingAfter) q.set('starting_after', startingAfter);
    const r = await fetch('https://api.stripe.com/v1/prices?' + q, { headers: { Authorization: 'Bearer ' + key } });
    const j = await r.json();
    if (!r.ok) { console.error('Errore Stripe:', j?.error?.message || r.status); process.exit(1); }
    out.push(...(j.data || []));
    if (!j.has_more) break;
    startingAfter = j.data[j.data.length - 1]?.id;
  }
  return out;
}

const prezzi = await tuttiIPrezzi();
const scelti = new Map();     // env → { id, amount, nomeProd }
for (const c of catalogo) {
  const attesoCent = Math.round(c.prezzo * 100);
  // candidati: stesso nome prodotto (case-insensitive), prezzo ricorrente
  const cand = prezzi.filter((p) => {
    const nome = (p.product?.name || '').trim().toLowerCase();
    return perNome.get(nome)?.env === c.env && p.recurring;
  });
  if (!cand.length) continue;
  // preferisci l'importo uguale al catalogo; altrimenti il più recente
  const esatto = cand.filter((p) => p.unit_amount === attesoCent);
  const pool = esatto.length ? esatto : cand;
  pool.sort((a, b) => (b.created || 0) - (a.created || 0));
  const p = pool[0];
  scelti.set(c.env, { id: p.id, amount: p.unit_amount, nomeProd: p.product?.name, ambiguo: cand.length > 1 && !esatto.length });
}

// STDOUT: righe .env in ordine di catalogo
console.log('# Price ID Stripe → .env (scaricati da Stripe con stripe-fetch-prices.mjs)');
for (const c of catalogo) {
  const s = scelti.get(c.env);
  console.log(s ? `${c.env}=${s.id}` : `# ${c.env}=   # MANCANTE su Stripe: prodotto "${c.nome}" (€${c.prezzo.toFixed(2)})`);
}

// STDERR: riepilogo
console.error(`\n✓ Risolti ${scelti.size}/${catalogo.length} prezzi da Stripe.`);
for (const c of catalogo) {
  const s = scelti.get(c.env);
  if (!s) continue;
  if (s.amount !== Math.round(c.prezzo * 100)) console.error(`  ⚠️  ${c.nome}: su Stripe €${(s.amount / 100).toFixed(2)} ≠ catalogo €${c.prezzo.toFixed(2)}`);
  if (s.ambiguo) console.error(`  ⚠️  ${c.nome}: più prezzi attivi, ho preso il più recente — archivia i vecchi in Stripe.`);
}
const mancanti = catalogo.filter((c) => !scelti.has(c.env));
if (mancanti.length) console.error('  ✗ Mancano: ' + mancanti.map((c) => c.nome).join(', '));
