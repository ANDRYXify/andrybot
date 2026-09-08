// Cancello dell'ESPOSIZIONE: cosa arriva davvero da internet.
//
// Una scansione del server ha trovato tre porte aperte — 22, 80 e 443 — e la
// notizia vera non erano quelle tre: era che non ce n'era una quarta. Il bot
// ascolta sulla 8090, il cervello ha la sua, i dati stanno su disco: tutto
// dentro la rete di Docker, dove da fuori non si bussa. Da internet esce solo
// Caddy.
//
// Oggi è così. Ma niente lo tiene fermo: basta una riga `ports:` aggiunta a un
// servizio per provare una cosa al volo, e da quel momento quel servizio è su
// internet — senza errori, senza avvisi, e senza che nessuno se ne accorga
// finché non lo trova qualcun altro. È il difetto peggiore della famiglia:
// silenzioso, e con la porta già aperta.
//
// Quindi il patto sta scritto qui e si controlla da solo: **una sola porta di
// casa, e sono quelle di Caddy**. Ogni voce dice PERCHÉ è aperta, e una voce
// che non corrisponde più a niente è rossa uguale — un elenco che marcisce è
// peggio di nessun elenco.
//
// `network_mode: host` è vietato per lo stesso motivo: toglie di mezzo la
// mappatura delle porte, e tutto quello che il container apre si trova
// direttamente sulla scheda di rete del server.
//
// Uso: node scripts/verifica-esposizione.mjs
//      node scripts/verifica-esposizione.mjs --selftest   (deve diventare rosso)

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const SELFTEST = process.argv.includes('--selftest');

// Il solo servizio che può affacciarsi su internet, e le sole porte che può
// aprire. Ogni riga porta il motivo, perché una porta senza motivo scritto è
// una porta che nessuno sa più perché è aperta.
const PADRONE = 'caddy';
const APERTE = new Map([
  ['80:80', 'HTTP: il rimbalzo su HTTPS e la sfida di Let\'s Encrypt — senza, il certificato scade in tre mesi'],
  ['443:443', 'HTTPS: il sito'],
  ['443:443/udp', 'HTTP/3 (QUIC), sulla stessa porta'],
]);

let male = 0;
const dice = (ok, cosa, extra = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${cosa}${!ok && extra ? ` — ${extra}` : ''}`);
  if (!ok) male++;
  return ok;
};

// Quattro controlli vogliono quattro guasti: provarne uno solo e dirsi verdi
// vuol dire sapere un quarto di quello che si crede di sapere.
const GUASTI = [
  ['un servizio interno pubblicato su internet',
    (t) => t.replace(/^  brain:$/m, '  brain:\n    ports:\n      - "5000:5000"')],
  ['una porta in più aperta da Caddy',
    (t) => t.replace('      - "443:443/udp"', '      - "443:443/udp"\n      - "9000:9000"')],
  ['una porta dichiarata che non c\'è più',
    (t) => t.replace('      - "443:443/udp"', '')],
  ['un servizio messo direttamente sulla rete del server',
    (t) => t.replace(/^  guardiano:$/m, '  guardiano:\n    network_mode: host')],
];
const quale = SELFTEST ? Number(process.argv.find((a) => /^--guasto=/.test(a))?.split('=')[1] || 0) : -1;

let testo = readFileSync(join(RAD, 'docker-compose.yml'), 'utf8');
if (SELFTEST) {
  const [nome, rompi] = GUASTI[quale] || [];
  if (!rompi) { console.log(`  ✗ guasto ${quale} non esiste`); process.exit(1); }
  console.log(`  rimetto: ${nome}\n`);
  const prima = testo;
  testo = rompi(testo);
  if (testo === prima) { console.log('  ✗ il guasto non ha cambiato niente'); process.exit(1); }
}

// Un parser minimo, che basta: le chiavi a due spazi sotto `services:` sono i
// servizi, e dentro un servizio le voci di `ports:` sono le righe con il
// trattino finché l'indentazione non risale.
const righe = testo.split('\n');
const servizi = new Map();
let dentroServizi = false, servizio = null, dentroPorte = false;
const modiRete = [];
for (const r of righe) {
  if (/^services:\s*$/.test(r)) { dentroServizi = true; continue; }
  if (/^[a-z]/i.test(r)) { dentroServizi = false; servizio = null; dentroPorte = false; continue; }
  if (!dentroServizi) continue;
  const nuovo = r.match(/^ {2}([a-z0-9_-]+):\s*$/i);
  if (nuovo) { servizio = nuovo[1]; servizi.set(servizio, []); dentroPorte = false; continue; }
  if (!servizio) continue;
  const rete = r.match(/^\s+network_mode:\s*["']?([^"'\s#]+)/);
  if (rete) modiRete.push({ servizio, modo: rete[1] });
  if (/^\s+ports:\s*$/.test(r)) { dentroPorte = true; continue; }
  if (dentroPorte) {
    const voce = r.match(/^\s+-\s*["']?([^"'#]+?)["']?\s*(?:#.*)?$/);
    if (voce) { servizi.get(servizio).push(voce[1].trim()); continue; }
    if (/^\s+[a-z_]+:/i.test(r)) dentroPorte = false;
  }
}

dice(servizi.size >= 3, `servizi letti dal compose: ${servizi.size} (${[...servizi.keys()].join(', ')})`);

// ── 1. nessun altro pubblica porte
const intrusi = [...servizi].filter(([n, p]) => n !== PADRONE && p.length).map(([n, p]) => `${n} → ${p.join(', ')}`);
dice(intrusi.length === 0, `solo «${PADRONE}» si affaccia su internet`, intrusi.join(' · '));

// ── 2. e apre solo quelle che deve
const sue = servizi.get(PADRONE) || [];
const dipiu = sue.filter((p) => !APERTE.has(p) && !/^127\.0\.0\.1:/.test(p));
dice(sue.length > 0 && dipiu.length === 0, `le porte aperte sono ${sue.length}, tutte dichiarate`, dipiu.join(', '));

// ── 3. e l'elenco non marcisce
const sparite = [...APERTE.keys()].filter((p) => !sue.includes(p));
dice(sparite.length === 0, 'ogni porta dichiarata esiste ancora nel compose', sparite.join(', '));

// ── 4. e nessuno scavalca la mappatura
const scavalcano = modiRete.filter((m) => m.modo === 'host').map((m) => m.servizio);
dice(scavalcano.length === 0, 'nessun servizio sta direttamente sulla rete del server', scavalcano.join(', '));

if (SELFTEST) {
  console.log('\n  selftest');
  if (male) { console.log(`  ✓ il cancello se ne accorge`); male = 0; }
  else { console.log('  ✗ non ha visto niente'); male = 1; }
}

console.log(male ? `\n${male} cose non tornano.\n` : `\nDa internet si bussa solo a ${PADRONE}. ✓\n`);
process.exit(male ? 1 : 0);
