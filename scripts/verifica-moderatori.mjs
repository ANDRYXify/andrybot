// Cancello dei MODERATORI: nessuna porta d'ingresso può dimenticare gli inviti,
// e una richiesta non può diventare un accesso da sola.
//
// Perche' esiste. Le porte da cui si entra sono diventate quattro (Twitch,
// login moderatore, Kick, YouTube) e domani saranno cinque. L'abbinamento degli
// inviti — «sei stato invitato a moderare un canale, entra e ti ci trovi» — era
// scritto dentro le due strade di Twitch. Scritto quattro volte, la quinta porta
// lo dimentica: chi entra da li' non produce nessun errore, nessun sintomo, e
// resta semplicemente chiuso fuori dal canale che gli hanno affidato — senza mai
// capire perche'. E' il difetto che non si vede, quello caro.
//
// Cosa misura, e su cosa. Le prose non contano: si legge il CODICE con commenti
// e stringhe tolti prima.
//   1. `pendentiByLogin` (leggere gli inviti che aspettano una persona) si usa in
//      UN POSTO SOLO fuori dal database: l'imbuto esiste;
//   2. ogni punto in cui una persona ENTRA (primoAccesso) abbina anche gli inviti;
//   3. i posti del piano non contano le richieste: `listByChannel` filtra sugli
//      stati che occupano un posto, e chi conta i posti passa di li';
//   4. `chiedi` non puo' retrocedere chi e' gia' dentro: la condizione sta nella
//      SCRITTURA, non in un controllo che una strada nuova puo' dimenticare;
//   5. `contestiPer` da' accesso solo a chi e' 'attivo': una richiesta non e' un
//      accesso.
//
// Uso: node scripts/verifica-moderatori.mjs             (esce 1 se qualcosa non torna)
//      node scripts/verifica-moderatori.mjs --selftest  (rompe una cosa per volta e
//        pretende che il cancello diventi rosso)

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { senzaCommentiJs } from './_codice.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');

const ROTTURE = [
  ['src/web/server.js',
    "      ytApi.salvaToken(login, token, canaleId);\n      const invitato = abbinaInviti(login, display);",
    '      ytApi.salvaToken(login, token, canaleId);\n      const invitato = null;',
    "la porta di YouTube dimentica gli inviti"],
  ['src/web/server.js',
    "      kickApi.salvaToken(login, token, userId);\n      const invitato = abbinaInviti(login, display);",
    '      kickApi.salvaToken(login, token, userId);\n      const invitato = null;',
    "la porta di Kick dimentica gli inviti"],
  ['src/web/server.js', '      abbinaInviti(login, disp);', '      // abbinaInviti(login, disp);',
    'il login self-service dimentica gli inviti'],
  ['src/web/server.js', '        managers.attiva(inv.channel, login, display || \'\');\n',
    '',
    'l\'imbuto legge gli inviti e non li attiva'],
  ['src/db.js', "WHERE managers.status NOT IN ('attivo','invitato')", '',
    'una richiesta puo\' retrocedere chi e\' gia\' dentro'],
  ['src/db.js', 'contaPosti(channel) { return this.listByChannel(channel).length; },',
    'contaPosti(channel) { return db.prepare(\'SELECT COUNT(*) n FROM managers WHERE channel=?\').get(String(channel).toLowerCase()).n; },',
    'le richieste cominciano a occupare i posti del piano'],
  ['src/db.js', 'SELECT * FROM managers WHERE channel=? AND status IN (\'attivo\',\'invitato\') ORDER BY status DESC, created_at',
    'SELECT * FROM managers WHERE channel=? ORDER BY status DESC, created_at',
    'le richieste finiscono nell\'elenco dei moderatori'],
  ['src/web/server.js', "for (const m of managers.attiviByLogin(l)) {", "for (const m of managers.richiesteByLogin(l)) {",
    'una richiesta da\' accesso al canale'],
];

if (process.argv.includes('--selftest')) {
  const io = fileURLToPath(import.meta.url);
  let cieche = 0;
  for (const [file, da, a, che] of ROTTURE) {
    const via = join(RAD, file);
    const orig = readFileSync(via, 'utf8');
    if (!orig.includes(da)) {
      console.log(`  ?  ${che}  → non so piu' come romperlo: l'autoprova e' scaduta`);
      cieche++;
      continue;
    }
    writeFileSync(via, orig.replace(da, a));
    let rosso = false;
    try { execFileSync(process.execPath, [io], { cwd: RAD, stdio: 'pipe' }); } catch { rosso = true; }
    writeFileSync(via, orig);
    console.log((rosso ? '  ✓  ' : '  ✗  ') + che + (rosso ? '' : '  → PASSA INOSSERVATO'));
    if (!rosso) cieche++;
  }
  console.log(cieche
    ? `\n${cieche} ${cieche === 1 ? 'rottura non vista' : 'rotture non viste'}: il cancello non protegge quello che dice di proteggere.`
    : "\nOgni rottura e' vista. Il cancello e' vero. ✓");
  process.exit(cieche ? 1 : 0);
}

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });

const server = senzaCommentiJs(leggi('src/web/server.js'));
const db = senzaCommentiJs(leggi('src/db.js'));

// --- 1. l'imbuto: gli inviti che aspettano si leggono in un posto solo ----
const quanti = (testo, ago) => testo.split(ago).length - 1;
const letture = quanti(server, 'pendentiByLogin');
dice(letture === 1, `gli inviti che aspettano si leggono in un posto solo (${letture})`,
  letture === 0 ? 'nessuno li legge piu\': chi e\' invitato non entra' : 'scritto piu\' volte: la prossima porta ne dimentichera\' una');
// E l'imbuto deve fare qualcosa: leggere gli inviti e non attivarli sarebbe la
// stessa identica cosa di non leggerli, ma con l'aria di funzionare.
const imbuto = server.slice(server.indexOf('function abbinaInviti('), server.indexOf('function primoAccesso('));
dice(/managers\.attiva\(/.test(imbuto) && /pendentiByLogin/.test(imbuto),
  'l\'imbuto attiva davvero gli inviti che trova',
  'legge gli inviti e non li attiva: chi entra resta comunque fuori');

// --- 2. chi ENTRA abbina anche gli inviti ---------------------------------
// Si guarda ogni punto in cui una persona entra (primoAccesso) e si pretende che
// l'abbinamento sia li' vicino. Non e' un vezzo di stile: e' l'unico momento in
// cui si sa chi e' arrivato.
// La definizione non e' una porta: si contano le CHIAMATE.
const ingressi = [...server.matchAll(/(?<!function\s)primoAccesso\s*\(/g)].map((m) => m.index);
dice(ingressi.length > 0, `porte d'ingresso trovate: ${ingressi.length}`, 'nessun primoAccesso: la misura non misura piu\' niente');
// La finestra guarda prima E dopo: abbinare gli inviti puo' stare da una parte o
// dall'altra della nascita del canale, ed e' giusto in tutti e due i casi.
const smemorate = ingressi.filter((i) => !server.slice(Math.max(0, i - 1500), i + 1500).includes('abbinaInviti('));
dice(smemorate.length === 0, 'ogni porta d\'ingresso abbina gli inviti che aspettano',
  `${smemorate.length} porte entrano senza guardare gli inviti`);
// e l'imbuto va chiamato anche dal login del moderatore, che non passa da primoAccesso
const chiamate = quanti(server, 'abbinaInviti(');
dice(chiamate >= ingressi.length + 2, `l'imbuto si chiama da ogni porta (${chiamate} chiamate, ${ingressi.length} ingressi + la definizione + il login moderatore)`,
  'qualche porta non lo chiama');

// --- 3. i posti del piano non contano le richieste ------------------------
dice(/listByChannel\(channel\)\s*\{[\s\S]{0,200}?status IN \('attivo','invitato'\)/.test(db),
  'l\'elenco dei moderatori sono i posti occupati (attivi e invitati)',
  'l\'elenco prende anche le richieste: comparirebbero come staff');
dice(/contaPosti\(channel\)\s*\{\s*return this\.listByChannel\(channel\)\.length/.test(db),
  'chi conta i posti passa dall\'elenco: una regola sola, non due che divergono',
  'i posti si contano per conto loro');

// --- 4. una richiesta non retrocede chi e' gia' dentro --------------------
const chiedi = db.slice(db.indexOf('chiedi(channel, login'), db.indexOf('richiesteByChannel('));
dice(chiedi.includes("WHERE managers.status NOT IN ('attivo','invitato')"),
  'una richiesta non puo\' toccare chi e\' gia\' dentro (sta nella scrittura)',
  'la riga di un moderatore attivo puo\' tornare "richiesta"');

// --- 5. accesso solo a chi e' attivo --------------------------------------
const contesti = server.slice(server.indexOf('function contestiPer('), server.indexOf('function contestoDefault('));
dice(contesti.includes('managers.attiviByLogin('),
  'l\'accesso ai canali lo danno solo i moderatori attivi',
  'i contesti guardano qualcosa che non e\' "attivo"');
dice(!/richieste?ByLogin|status.*richiesto/.test(contesti),
  'una richiesta in attesa non da\' nessun accesso',
  'nei contesti compare una richiesta');

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
console.log(rossi.length ? `\n${rossi.length} cose non tornano.` : '\nNessuna porta dimentica gli inviti, e una richiesta resta una richiesta. ✓');
process.exit(rossi.length ? 1 : 0);
