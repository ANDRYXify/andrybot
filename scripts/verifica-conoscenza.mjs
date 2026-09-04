// Cancello della CONOSCENZA: quello che lo streamer scrive deve ARRIVARE.
//
// Perche' esiste. E' il difetto che questo progetto ha gia' fatto tre volte, e
// ogni volta senza un sintomo: una cosa scritta in un posto, letta in un altro,
// e in mezzo un pezzo che non e' mai stato collegato. «Le tue frasi / battute»
// stava nella dashboard da sempre, con scritto sotto che il bot le avrebbe
// usate per suonare come lui — e nessuno le mandava al cervello. La conoscenza
// arrivava con uno `slice(0, 6)` sulla DATA: chi ne scriveva quaranta ne vedeva
// usare sei, sempre le stesse, e il bot rispondeva lo stesso.
//
// Nessuno di questi difetti si vede guardando. Non c'e' un errore, non c'e' una
// pagina rotta: c'e' un campo che si compila e non serve a niente. L'unico modo
// di accorgersene e' pretendere il PERCORSO INTERO, campo per campo.
//
// Cosa misura.
//   1. Ogni campo di SCHEDA_CAMPI (src/db.js, la lista unica) ha un posto dove
//      si scrive nella dashboard, entra nel corpo che si salva, ed e' nominato
//      dal cervello. Aggiungere un campo e dimenticarne un pezzo = rosso.
//   2. LA PROVA VERA: si costruisce una scheda con un segnale diverso per ogni
//      campo, si fa comporre il prompt a `assistente.py`, e si pretende di
//      ritrovarli TUTTI. Non «c'e' la parola nel codice»: c'e' il valore nel
//      prompt.
//   3. La scheda attraversa davvero i tre strati (brain.js, brainpy.js, API).
//   4. La conoscenza non si sceglie piu' per data, e il filtro del «quando» c'e'.
//   5. Le frasi scritte a mano entrano nello stile.
//   6. Il quaderno ha una faccia: rotte + caricamento all'apertura della scheda.
//
// Uso: node scripts/verifica-conoscenza.mjs             (esce 1 se qualcosa non torna)
//      node scripts/verifica-conoscenza.mjs --selftest  (rompe e pretende il rosso)

import { readFileSync, writeFileSync } from 'node:fs';
import { senzaCommentiJs, corpoJs } from './_codice.mjs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');

const ROTTURE = [
  ['src/db.js', '  chiamami: 40,', '  chiamami: 40,\n  colore: 40,', 'un campo nuovo nella scheda, e nessuno lo rende'],
  ['src/web/public/app.js', '<input type="text" id="sc-orari"', '<input type="text" id="sc-orarii"', 'un campo della scheda perde il suo posto nella dashboard'],
  ['src/web/public/app.js', "orari: campo('orari'),", "", 'un campo si compila ma non si salva'],
  ['brain/assistente.py', '    ("orari", "quando e\' in diretta"),', '', 'un campo si salva ma non arriva al prompt'],
  ['brain/assistente.py', 'regole = _divieto_scheda(scheda) + ', 'regole = ', '«cosa non dire mai di me» smette di essere una regola'],
  ['src/ai/brain.js', 'scheda: this._scheda(channel),   // chi', '// scheda: this._scheda(channel),   // chi', 'la scheda non parte piu\' dalla chat pubblica'],
  ['src/ai/brainpy.js', '        conoscenza, scheda, stile,', '        conoscenza, stile,', 'la scheda si ferma sul ponte'],
  ['src/web/server.js', 'out.scheda = schedaPulita(b.scheda);', '', 'la scheda non si salva piu\''],
  ['src/ai/brain.js', 'return scelte.sort((a, b) => (b.fissata - a.fissata) || (b.p - a.p));', 'return scelte;', 'la conoscenza torna a uscire in ordine di data'],
  ['src/ai/brain.js', "if ((quando === 'live' && !live) || (quando === 'offline' && live)) continue;", '', 'il «quando» smette di filtrare'],
  ['src/ai/brain.js', "streamers.get(channel)?.settings?.frasi", "[]/*", 'le frasi scritte a mano non arrivano piu\' allo stile'],
  ['src/web/public/app.js', "{ caricaConoscenza(); caricaQuaderno(); }", '{ caricaConoscenza(); }', 'il quaderno non si carica piu\' aprendo la scheda'],
  ['src/ai/brain.js', 'const esito = checkRisposta(testo,', 'const esito = checkMessage(testo,', 'le parole da bloccare smettono di essere controllate'],
  ['src/ai/brain.js', 'return this._finalizza(dati.channel, await this._rispostaGrezza(dati), dati.streamer);', 'return this._rispostaGrezza(dati);', 'una risposta puo\' uscire senza passare dai controlli'],
  ['src/features/handler.js', 'const esito = checkMessage(text, streamer.settings);', 'const esito = checkRisposta(text, streamer.settings);', 'le parole dello streamer si mettono a moderare gli utenti'],
  ['src/web/server.js', 'out.maiDire = b.maiDire', 'out.maiDireX = b.maiDire', 'le parole da bloccare non si salvano piu\''],
  ['src/web/public/app.js', 'body: { scheda, maiDire }', 'body: { scheda }', 'le parole da bloccare non partono dalla dashboard'],
  ['src/web/public/app.js', "getElementById('txt-mai')", "getElementById('txt-mai-vecchio')", 'il campo viene rinominato solo da una parte'],
  ['src/ai/pretrain.js', 'const { scheda, messi } = uniScheda(', 'const { scheda, messi } = ((a, b) => ({ scheda: a || {}, messi: [] }))(', 'la scheda torna a nascere vuota per tutti'],
  ['src/ai/pretrain.js', 'if (gia[campo]) continue;', 'if (false) continue;', 'il precompilamento riscrive quello che ha scritto lui'],
];

if (process.argv.includes('--selftest')) {
  const io = fileURLToPath(import.meta.url);
  let cieche = 0;
  for (const [file, da, a, che] of ROTTURE) {
    const via = join(RAD, file);
    const orig = readFileSync(via, 'utf8');
    if (!orig.includes(da)) { console.log(`  ?  ${che}  → non so piu' come romperlo: l'autoprova e' scaduta`); cieche++; continue; }
    writeFileSync(via, orig.replace(da, a));
    let rosso = false;
    try { execFileSync(process.execPath, [io], { cwd: RAD, stdio: 'pipe' }); } catch { rosso = true; }
    writeFileSync(via, orig);
    console.log((rosso ? '  ✓  ' : '  ✗  ') + che + (rosso ? '' : '  → PASSA INOSSERVATO'));
    if (!rosso) cieche++;
  }
  console.log(cieche
    ? `\n${cieche} ${cieche === 1 ? 'rottura non vista' : 'rotture non viste'}: si puo' compilare un campo che non serve a niente.`
    : "\nOgni rottura e' vista. Il cancello e' vero. ✓");
  process.exit(cieche ? 1 : 0);
}

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });

// --- la lista unica dei campi ------------------------------------------
const dbjs = leggi('src/db.js');
const blocco = /export const SCHEDA_CAMPI = \{([\s\S]*?)\};/.exec(dbjs);
dice(!!blocco, 'la scheda ha una lista unica dei campi (SCHEDA_CAMPI)', 'non la trovo in src/db.js');
const CAMPI = blocco ? [...blocco[1].matchAll(/^\s*(\w+)\s*:/gm)].map((m) => m[1]) : [];
dice(CAMPI.length >= 3, `i campi della scheda sono ${CAMPI.length}`, 'lista vuota: il cancello guarderebbe nel vuoto');

// --- 1. ogni campo ha un posto dove si scrive, e uno dove si salva ------
const appjs = senzaCommentiJs(leggi('src/web/public/app.js'));
const salva = /btn-salva-scheda'\)\?\.addEventListener[\s\S]*?\n  \}\)\);/.exec(appjs)?.[0] || '';
for (const c of CAMPI) {
  dice(appjs.includes(`id="sc-${c}"`), `«${c}»: c'e' dove scriverlo nella dashboard`, `manca l'elemento sc-${c}`);
  dice(new RegExp(`\\b${c}\\s*:\\s*campo\\('${c}'\\)`).test(salva), `«${c}»: viene salvato`, 'compilarlo non lo scriverebbe da nessuna parte');
}

// --- 2. LA PROVA: ogni campo compilato si ritrova nel prompt ------------
function pythonC() {
  for (const bin of [process.env.PYTHON_BIN, 'python3', 'python'].filter(Boolean)) {
    try { execFileSync(bin, ['-c', 'pass'], { stdio: 'ignore' }); return bin; } catch { /* prossimo */ }
  }
  return null;
}
const py = pythonC();
if (!py || !CAMPI.length) {
  dice(false, 'la scheda compilata si ritrova nel prompt (provato davvero)',
    py ? 'senza campi non c\'e' + ' niente da provare' : 'senza python3 non posso comporre il prompt, e su questo non si va di parola');
} else {
  const scheda = Object.fromEntries(CAMPI.map((c, i) => [c, `segnale${i}zzz`]));
  const prova = `
import sys, types, json, tempfile, os
os.environ["DATA_DIR"] = tempfile.mkdtemp()
sys.path.insert(0, ${JSON.stringify(join(RAD, 'brain'))})
finto = types.ModuleType("genera"); visto = {}
def _completa(sistema, turni, utente, max_tokens, **k):
    visto["s"] = sistema; return "ok"
finto._completa = _completa
finto.scudo_identita = lambda t, n, u="": t
sys.modules["genera"] = finto
import assistente as A
A.rispondi({"canale": "c", "login": "l", "nome": "n", "testo": "una domanda qualunque",
            "scheda": ${JSON.stringify(scheda)}})
print(json.dumps({"prompt": visto.get("s", "")}))
`;
  let out = null;
  try { out = JSON.parse(execFileSync(py, ['-c', prova], { encoding: 'utf8' })); }
  catch (e) { dice(false, 'il prompt si compone', String(e.message || e).slice(0, 200)); }
  if (out) {
    const persi = CAMPI.filter((c, i) => !out.prompt.includes(`segnale${i}zzz`));
    dice(!persi.length, `tutti i ${CAMPI.length} campi della scheda arrivano nel prompt`,
      `si perdono per strada: ${persi.join(', ')}`);
    const iEvita = CAMPI.indexOf('evita');
    const dopoRegole = out.prompt.slice(out.prompt.indexOf('REGOLE DI QUESTO CANALE'));
    dice(iEvita >= 0 && out.prompt.includes('REGOLE DI QUESTO CANALE') && dopoRegole.includes(`segnale${iEvita}zzz`),
      '«cosa non dire mai di me» sta fra le REGOLE, non fra i fatti',
      'sta fra le informazioni: il modello lo racconterebbe invece di rispettarlo');
  }
}

// --- 3. la scheda attraversa i tre strati ------------------------------
const brainjs = senzaCommentiJs(leggi('src/ai/brain.js'));
const brainpy = senzaCommentiJs(leggi('src/ai/brainpy.js'));
const serverjs = senzaCommentiJs(leggi('src/web/server.js'));
dice((brainjs.match(/scheda: this\._scheda\(channel\)/g) || []).length >= 3,
  'la scheda parte da tutti i punti pubblici del bot',
  'qualche risposta pubblica non sa piu\' chi e\' lo streamer');
// nel CORPO della richiesta, non nella firma: `scheda` fra i parametri accettati
// e poi dimenticata nel JSON e' esattamente il difetto che questo cancello cerca.
const corpoRichiesta = /body: JSON\.stringify\(\{[\s\S]*?\}\),/.exec(brainpy)?.[0] || '';
dice(/\bscheda\b/.test(corpoRichiesta),
  'la scheda passa il ponte verso il cervello',
  'brainpy la accetta ma non la mette nel corpo della richiesta: si ferma li\'');
dice(/out\.scheda = schedaPulita\(b\.scheda\);/.test(serverjs),
  'la scheda si salva passando dal pulitore condiviso',
  'senza schedaPulita ci sarebbero due idee diverse di quali campi esistono');

// --- 4. la conoscenza per pertinenza, e il «quando» --------------------
dice(!/knowledge\.list\(channel\)[\s\S]{0,120}\.slice\(0, ?6\)/.test(brainjs),
  'la conoscenza non si sceglie piu\' per data',
  'e\' tornato uno slice sulle ultime scritte: le altre non le vedrebbe mai');
dice(/b\.fissata - a\.fissata/.test(brainjs) && /b\.p - a\.p/.test(brainjs),
  'si ordina per fissate e poi per pertinenza', 'l\'ordinamento non c\'e\' piu\'');
dice(/quando === 'live' && !live/.test(brainjs) && /quando === 'offline' && live/.test(brainjs),
  'il «quando» filtra davvero su live/offline', 'una voce «solo in diretta» uscirebbe anche da spenti');
dice(/aggiungiColonna\('knowledge', 'quando'/.test(dbjs) && /aggiungiColonna\('knowledge', 'fissata'/.test(dbjs),
  'le colonne quando/fissata esistono anche sui database gia\' nati', 'manca la migrazione');
dice(/QUANDO_CONOSCENZA\.includes\(req\.body\?\.quando\)/.test(serverjs) && /app\.patch\('\/api\/streamer\/knowledge\/:id'/.test(serverjs),
  'l\'ambito si puo\' impostare e correggere dall\'API', 'manca la POST con l\'ambito o la PATCH');

// --- 5. le frasi scritte a mano sono stile -----------------------------
const stile = /_stileStreamer\(channel\) \{[\s\S]*?\n  \}/.exec(brainjs)?.[0] || '';
dice(/settings\?\.frasi/.test(stile),
  'le frasi che ha scritto lui entrano nello stile',
  'restano nella dashboard a fare scena, come prima');

// --- 6. il quaderno ha una faccia --------------------------------------
for (const [verbo, rotta] of [['get', 'quaderno'], ['post', 'quaderno'], ['delete', 'quaderno']]) {
  dice(new RegExp(`app\\.${verbo}\\('/api/streamer/${rotta}'`).test(serverjs),
    `il quaderno risponde alla ${verbo.toUpperCase()}`, 'rotta mancante');
}
dice(/caricaQuaderno\(\);/.test(appjs) && /id === 'conoscenza'\) \{ caricaConoscenza\(\); caricaQuaderno\(\); \}/.test(appjs),
  'il quaderno si carica aprendo la scheda', 'la lista resterebbe su «Caricamento…» per sempre');

// --- 7. le parole che non devono uscire ---------------------------------
// «Cosa non dire mai di te» e' una richiesta al modello. Queste no: o non escono
// mai, o sono uscite. Percio' il controllo dev'essere in un punto da cui passa
// TUTTO quello che il bot dice, e quel punto dev'essere l'unica uscita.
const modjs = senzaCommentiJs(leggi('src/features/moderation.js'));
const handlerjs = senzaCommentiJs(leggi('src/features/handler.js'));
dice(/export function checkRisposta\(/.test(modjs),
  'esiste un controllo apposta per le parole del bot', 'manca checkRisposta');
dice(/const esito = checkRisposta\(testo/.test(brainjs),
  'le risposte del bot passano dal controllo severo', '_finalizza usa ancora quello dei messaggi degli utenti');
dice(/checkMessage\(text, streamer\.settings\)/.test(handlerjs) && !/checkRisposta/.test(handlerjs),
  'gli utenti restano moderati solo dalle parole vietate del canale',
  'le parole dello streamer moderano anche chi scrive in chat: non e\' quello che servono');
const corpoChatReply = corpoJs(brainjs, 'chatReply') || '';
dice(/_finalizza\(dati\.channel, await this\._rispostaGrezza\(dati\), dati\.streamer\)/.test(corpoChatReply)
  && corpoChatReply.split('return').length === 2,
  'la chat pubblica ha una sola uscita, e passa dai controlli',
  'chatReply non e\' piu\' l\'unico imbuto: un ramo puo\' saltare i controlli');
dice(!/_finalizza/.test(corpoJs(brainjs, '_rispostaGrezza') || 'x_finalizza'),
  'il testo grezzo non si finalizza da solo', 'dentro _rispostaGrezza c\'e\' ancora _finalizza: due strade per uscire');
dice(/out\.maiDire = b\.maiDire/.test(serverjs), 'le parole da bloccare si salvano', 'l\'API non le accetta');
dice(salva.includes("getElementById('txt-mai')") && /body: \{ scheda, maiDire \}/.test(salva),
  'si scrivono nella dashboard e partono col resto della scheda',
  'il salvataggio non le legge, o non le mette nel corpo della richiesta');
// stessa regola di sempre: un campo letto da una parte e scritto dall'altra.
// Ogni id che il salvataggio va a leggere deve esistere davvero nel modulo.
const letti = [...salva.matchAll(/getElementById\('([^']+)'\)/g)].map((m) => m[1]);
const fantasmi = letti.filter((id) => !appjs.includes(`id="${id}"`));
dice(letti.length > 0 && !fantasmi.length,
  `il salvataggio della scheda legge ${letti.length} campi, e ci sono tutti`,
  fantasmi.length ? `legge campi che non esistono: ${fantasmi.join(', ')}` : 'non legge niente: misura sbagliata');
const motivo = /return \{ ok: false, reason: '([^']*)' \};\s*\n\s*\}\s*\n\s*return \{ ok: true \};\s*\n\}/.exec(modjs);
dice(!!motivo && !/\$\{|parola:/.test(motivo[1]),
  'il motivo del blocco non ripete la parola', 'la parola segreta finirebbe nei log');

// --- 8. la scheda non nasce vuota --------------------------------------
const pretrainjs = senzaCommentiJs(leggi('src/ai/pretrain.js'));
dice(/export function schedaDalProfilo\(/.test(pretrainjs) && /export function uniScheda\(/.test(pretrainjs),
  'il pre-addestramento sa ricavare la scheda da quello che legge', 'mancano le funzioni');
dice(/uniScheda\(st\.settings\?\.scheda, schedaDalProfilo\(grezzo\)\)/.test(pretrainjs)
  && /streamers\.setSettings\(canale, \{ \.\.\.\(st\.settings \|\| \{\}\), scheda \}\)/.test(pretrainjs),
  'e la salva davvero, dentro il pre-addestramento', 'la calcola e non la scrive, oppure non la calcola');
dice(/if \(gia\[campo\]\) continue;/.test(pretrainjs),
  'riempie solo i vuoti', 'riscriverebbe quello che ha scritto lo streamer');

// --- esito --------------------------------------------------------------
const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
if (rossi.length) {
  console.log(`\n${rossi.length} ${rossi.length === 1 ? 'cosa non torna' : 'cose non tornano'}: c'e' qualcosa che si compila e non serve a niente.`);
} else {
  console.log('\nTutto quello che lo streamer scrive arriva al bot. ✓');
}
process.exit(rossi.length ? 1 : 0);
