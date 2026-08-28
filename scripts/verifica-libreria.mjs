// Cancello della LIBRERIA MEDIA.
//
// L'invariante: ogni campo che accetta una foto, un video o un suono offre le
// STESSE DUE PORTE — carica dal computer (che deposita nel magazzino) e scegli
// dalla libreria (tua + condivisa). Il difetto che questo cancello impedisce e'
// quello vero trovato sul campo: il magazzino c'era, funzionava, ed era
// irraggiungibile da ogni campo del prodotto.
//
// Uso: node scripts/verifica-libreria.mjs   (esce 1 se qualcosa non torna)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const srv = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
const dbs = readFileSync(join(RAD, 'src/db.js'), 'utf8');

const esiti = [];
const dice = (ok, msg) => esiti.push({ ok, msg });

// ---- 1. porte pari: ogni slot che si carica si puo' anche scegliere --------
const slotDa = (classe) => {
  const re = new RegExp(`class="[^"]*\\b${classe}\\b[^"]*"[^>]*data-slot="([a-z]+)"`, 'g');
  const s = new Set();
  for (const m of app.matchAll(re)) s.add(m[1]);
  return s;
};
const caricano = slotDa('al-up');
const scelgono = slotDa('al-btn-lib');
const mancanti = [...caricano].filter((x) => !scelgono.has(x));
dice(caricano.size > 0, `slot media negli alert/widget: ${[...caricano].sort().join(', ') || 'nessuno'}`);
dice(mancanti.length === 0, mancanti.length
  ? `slot che si caricano ma non si possono scegliere dalla libreria: ${mancanti.join(', ')}`
  : 'ogni slot che si carica si puo' + '’ anche scegliere dalla libreria');

// ---- 2. gli altri campi media hanno la loro porta -------------------------
const porte = [
  ['premi a punti canale', 'sel-lib'],
  ['meme dai gesti webcam', 'mm-lib'],
  ['penitenze', 'pen-effetto-lib'],
  ['sfondo delle grafiche', 'gr-sfondo-media'],
];
for (const [dove, marca] of porte) dice(app.includes(marca), `${dove}: porta sulla libreria`);

// ---- 3. i tipi che il selettore chiede sono quelli che il server conosce ---
const TIPI_SRV = new Set(['audio', 'immagine', 'video']);
const chiesti = new Set();
for (const m of app.matchAll(/scegliDallaLibreria\(\{\s*tipi:\s*\[([^\]]*)\]/g)) {
  for (const t of m[1].split(',')) { const v = t.trim().replace(/['"]/g, ''); if (v) chiesti.add(v); }
}
const ignoti = [...chiesti].filter((t) => !TIPI_SRV.has(t));
dice(ignoti.length === 0, ignoti.length
  ? `il selettore chiede tipi che il server non filtra: ${ignoti.join(', ')}`
  : `tipi chiesti dal selettore tutti noti al server: ${[...chiesti].sort().join(', ')}`);

// ---- 4. il riferimento e' uno solo, e il server lo accetta ----------------
dice(/\/\^effetto:\[a-z0-9_\]/.test(srv.replace(/\s/g, '')) || srv.includes('effetto:[a-z0-9_]'),
  'il server riconosce il riferimento "effetto:<comando>"');
dice(srv.includes("comando: e.channel === login ? e.comando : ''"),
  'la libreria dice il comando dei TUOI elementi (serve per costruire il riferimento)');

// ---- 5. il caricamento non cancella piu' un altro media -------------------
dice(!srv.includes('const comando = `alert_${kind}_${slot}`'),
  'un media caricato per un alert non sovrascrive piu' + '’ uno slot fisso');
dice(dbs.includes('comandoLibero(channel, base, tieni'),
  'ogni media caricato entra nella libreria con una sua identita' + '’');

// ---- 6. la demo mostra la libreria invece di un errore --------------------
dice(app.includes("via === '/api/streamer/libreria'") && app.includes('LIB_DEMO'),
  'in demo la libreria ha i suoi dati (non un errore JavaScript)');
dice(/Array\.isArray\(d\?\.items\)/.test(app),
  'la libreria regge una risposta senza items invece di rompersi');

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg);
console.log(rossi.length ? `\n${rossi.length} cose non tornano.` : '\nLa libreria ha una porta in ogni campo. ✓');
process.exit(rossi.length ? 1 : 0);
