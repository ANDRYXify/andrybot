#!/usr/bin/env node
// La chiave DKIM della posta di casa, e i record DNS da copiare.
//
// Uso: node scripts/posta-chiave.mjs [--ip 1.2.3.4]
//   · senza una chiave in DATA_DIR/dkim.pem la genera (2048 bit, permessi 600);
//   · con una chiave gia' presente non la tocca (ruotare = cancellare il file
//     e cambiare MAIL_DKIM_SELETTORE, cosi' il record vecchio non mente);
//   · stampa i tre record TXT: SPF (con l'IP se lo passi), DKIM, DMARC.
// Il resto della lista (porta 25 in uscita, reverse DNS) sta in docs/POSTA.md.
import { existsSync } from 'node:fs';
import * as posta from '../src/features/posta.js';

const argv = process.argv.slice(2);
const ip = (argv.indexOf('--ip') >= 0 ? argv[argv.indexOf('--ip') + 1] : '') || '';
const dom = posta.dominio();
if (!dom) { console.error('Manca il dominio: imposta MAIL_DOMINIO o BASE_URL nel .env.'); process.exit(1); }
let pubblica;
if (existsSync(posta.CHIAVE_FILE)) {
  pubblica = posta.pubblicaDi(posta.chiavePrivata());
  console.log(`Chiave gia' presente: ${posta.CHIAVE_FILE}`);
} else {
  ({ pubblica } = posta.generaChiave());
  console.log(`Chiave generata: ${posta.CHIAVE_FILE}`);
}
console.log(`Mittente: ${posta.mittente()}   dominio: ${dom}   selettore: ${posta.selettore()}\n`);
console.log('Record DNS da creare (tipo TXT):');
for (const r of posta.recordDns({ dom, sel: posta.selettore(), ip, pubblica })) {
  console.log(`\n  ${r.nome}\n  ${r.cosa}\n  ${r.valore}`);
}
if (!ip) console.log('\nSPF senza IP: rilancia con --ip <IP del server> per un record completo.');
console.log('\nPoi: reverse DNS dell\'IP → ' + dom + ' (console del fornitore) e porta 25 in uscita aperta.');
