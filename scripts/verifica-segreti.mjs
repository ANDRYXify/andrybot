// Cancello dei SEGRETI: niente di segreto entra nel database in chiaro.
//
// Perche' esiste. Una colonna nuova che conserva un token e' una riga di SQL
// come tutte le altre: non da' nessun segnale, non rompe niente, e il giorno in
// cui il database esce di casa vale piu' di tutte le altre messe insieme. E' cosi'
// che ci sono rimasti in chiaro per mesi il token del bot Telegram, il
// client_secret di Spotify e il JWT di 7TV — nessuno li aveva nascosti, e
// nessuno se n'era accorto.
//
// Come funziona. Si legge lo SCHEMA dai sorgenti e si guarda ogni colonna che
// SUONA come un segreto. Ognuna dev'essere in una di queste tre condizioni:
//   1. sta in CAMPI_SEGRETI (src/db.js) → passa dalla busta;
//   2. e' un'impronta → non conserva il segreto ma il suo calco;
//   3. e' dichiarata QUI SOTTO come non-segreta, con scritto il motivo.
// La terza non e' una scappatoia: e' l'unico modo di dire «lo so, e va bene
// cosi'» lasciando la ragione dove la trova il prossimo.
//
// Uso: node scripts/verifica-segreti.mjs
//      node scripts/verifica-segreti.mjs --selftest   (deve diventare rosso)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const VIA = join(RAD, 'src/db.js');
const SELFTEST = process.argv.includes('--selftest');
const ORIG = SELFTEST ? readFileSync(VIA, 'utf8') : null;
if (SELFTEST) {
  writeFileSync(VIA, ORIG.replace('CREATE TABLE IF NOT EXISTS tokens (',
    'CREATE TABLE IF NOT EXISTS prova_del_cancello (\n  segreto_in_chiaro TEXT NOT NULL\n);\nCREATE TABLE IF NOT EXISTS tokens ('));
}

// Un nome che suona come un segreto.
const SUONA = /(^|_)(token|secret|password|passwd|apikey|api_key|access|refresh|chiave|segreto)(_|$)|^key$/i;

// Colonne che suonano come un segreto e non lo sono, o lo sono in un modo che
// la busta non regge. Il motivo va scritto: senza, e' una svista travestita.
const AMMESSE = {
  'facts.key': 'non e\' una chiave crittografica: e\' il NOME del fatto in un archivio chiave-valore.',
  'tiktok_tokens.refresh_scadenza': 'e\' una data (quando scade il refresh), non un segreto: un numero non si cifra per nascondere niente.',
  'telegram.webhook_secret': 'lo si cerca per valore a ogni update in arrivo (WHERE webhook_secret=?): una busta con testo cifrato diverso ogni volta non si potrebbe cercare. E\' un segreto da 32 byte casuali, vive solo nel percorso del webhook, e cambiarlo costa una ri-registrazione.',
  'managers.invite_token': 'lo si cerca per valore quando l\'invito viene accettato, e va rimostrato all\'owner finche\' e\' in sospeso. Scade da solo (invite_expires) e sparisce all\'accettazione.',
};

const src = readFileSync(VIA, 'utf8');
if (SELFTEST) writeFileSync(VIA, ORIG);

// --- lo schema, tabella per tabella ------------------------------------
const tabelle = {};
for (const m of src.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\n\);/g)) {
  tabelle[m[1]] = [...m[2].matchAll(/^\s{2}(\w+)\s+(TEXT|INTEGER|REAL|BLOB)/gm)].map((c) => c[1]);
}
// e le colonne aggiunte dopo, che sono altrettanto vere
for (const m of src.matchAll(/aggiungiColonna\('(\w+)',\s*'(\w+)'/g)) {
  (tabelle[m[1]] ||= []).push(m[2]);
}

// --- quali passano dalla busta -----------------------------------------
const dentro = new Set();
const blocco = /export const CAMPI_SEGRETI = \{([\s\S]*?)\};/.exec(src);
if (blocco) {
  for (const m of blocco[1].matchAll(/(\w+):\s*\[([^\]]*)\]/g)) {
    for (const c of m[2].matchAll(/'([^']+)'/g)) dentro.add(m[1] + '.' + c[1]);
  }
}

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });

dice(!!blocco, 'src/db.js dichiara quali campi passano dalla busta', 'CAMPI_SEGRETI non c\'e\'');
dice(Object.keys(tabelle).length > 20, `lo schema si legge (${Object.keys(tabelle).length} tabelle)`,
  'ne trovo troppo poche: il cancello starebbe guardando nel vuoto');

const scoperte = [];
for (const [t, colonne] of Object.entries(tabelle)) {
  for (const c of colonne) {
    if (!SUONA.test(c)) continue;
    const nome = t + '.' + c;
    if (dentro.has(nome) || AMMESSE[nome]) continue;
    scoperte.push(nome);
  }
}
dice(!scoperte.length, `nessun segreto scoperto fra le ${Object.values(tabelle).flat().length} colonne`,
  `in chiaro e non dichiarate: ${scoperte.join(', ')}`);

// Le dichiarazioni non devono marcire: una colonna ammessa che non esiste piu'
// e' una riga che racconta il passato.
const fantasmi = Object.keys(AMMESSE).filter((n) => {
  const [t, c] = n.split('.');
  return !(tabelle[t] || []).includes(c);
});
dice(!fantasmi.length, 'le colonne dichiarate esistono ancora', `non esistono piu\': ${fantasmi.join(', ')}`);

const senzaMotivo = Object.entries(AMMESSE).filter(([, m]) => String(m).trim().length < 12).map(([n]) => n);
dice(!senzaMotivo.length, 'ogni eccezione porta il suo motivo', `senza motivo scritto: ${senzaMotivo.join(', ')}`);

// La busta dev'essere quella di adesso, non una qualunque.
const seg = readFileSync(join(RAD, 'src/segreti.js'), 'utf8');
dice(/const PREF2 = 'enc:2:'/.test(seg) && /c\.setAAD\(/.test(seg),
  'la busta lega il segreto al posto in cui abita', 'manca il legame col posto: si potrebbe spostare da una riga all\'altra');
dice(/crypto\.randomBytes\(32\);\s*\/\/ la chiave DI QUESTO valore/.test(seg),
  'ogni segreto ha la sua chiave', 'la chiave e\' tornata una sola per tutti');
dice(/timingSafeEqual/.test(seg), 'le impronte si confrontano a tempo costante', 'si indovinerebbe una lettera per volta');

const bk = readFileSync(join(RAD, 'src/backup.js'), 'utf8');
dice(/cifraBytes\(readFileSync\(chiaro\)/.test(bk), 'i backup si cifrano', 'una copia in chiaro vale il database');

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
if (rossi.length) {
  console.log(`\n${rossi.length} ${rossi.length === 1 ? 'cosa non torna' : 'cose non tornano'}: c'e' un segreto che il database consegnerebbe a chi se lo porta via.`);
} else {
  console.log('\nNiente di segreto sta nel database in chiaro. ✓');
}
if (SELFTEST) {
  const visto = scoperte.includes('prova_del_cancello.segreto_in_chiaro');
  console.log(visto ? 'L\'autoprova e\' stata vista. Il cancello e\' vero. ✓' : 'L\'autoprova NON e\' stata vista: il cancello non guarda dove dice.');
  process.exit(visto ? 0 : 1);
}
process.exit(rossi.length ? 1 : 0);
