// Cancello delle PORTE: chi puo' bussare, e a cosa.
//
// La domanda giusta non e' «si vedono le chiamate col tasto destro?» — quelle si
// vedono sempre, sono le chiamate che fa il TUO browser, e nessun sito al mondo
// puo' nasconderle a chi le sta facendo. La domanda giusta e': se bussa qualcun
// altro, gli si apre?
//
// Quindi ogni rotta deve avere un guardiano — sessione, ruolo, chiave
// dell'overlay, chiave dell'estensione, firma del pagamento — oppure stare
// nell'elenco qui sotto, dove ogni voce ha scritto PERCHE' e' pubblica. Una
// rotta nuova senza guardiano nasce ROSSA: non serve accorgersene, si accorge il
// cancello.
//
// L'elenco non puo' nemmeno marcire: se una voce non corrisponde piu' a nessuna
// rotta, e' rossa uguale.
//
// Uso: node scripts/verifica-porte.mjs
//      node scripts/verifica-porte.mjs --selftest   (deve diventare rosso)

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { creaGuscio } from '../src/web/vetrina.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const SELFTEST = process.argv.includes('--selftest');

// Tutto cio' che, dentro il corpo di una rotta, dimostra che qualcuno controlla
// chi sta bussando.
const GUARDIANI = [
  'requireAdmin', 'requireLogin', 'requireMod', 'requireOwner',
  'chiaveOk',        // chiave dell'overlay: il link e' il segreto
  'chiaveUguale',    // chiave dell'estensione, confronto a tempo costante
  'apiKeyValida',    // chiave dell'estensione: dell'impronta salvata, a tempo costante
  'guardiaConsole',  // CONSOLify e tastiere fisiche: una tastiera non sa tenere un cookie,
                     // quindi la chiave del canale — a tempo costante, revocabile, con tetto
  'verificaWebhook', // firma di Stripe
  'verificaFirma',   // firma RSA di Kick, controllata sui byte prima di guardare il corpo
  'firmaDiMeta',     // richiesta firmata di Meta (revoca, cancellazione), HMAC a tempo costante
  'combacia',        // impronta di un token esterno (Ko-fi), a tempo costante: come la chiave API
  'currentUser',     // legge la sessione: senza, non c'e' niente da leggere
  'soloProprietario',
];

// I guardiani che PRETENDONO la sessione. Tutti gli altri parlano anche a chi
// non e' entrato: chi controlla una chiave o una firma aspetta OBS, una
// tastiera, un gioco, una piattaforma; chi legge la sessione senza pretenderla
// e' scritto apposta per servire anche chi non ce l'ha. L'elenco e' quello
// corto, cosi' un guardiano nuovo nasce dalla parte di chi bussa da fuori.
const SOLO_SESSIONE = new Set(['requireAdmin', 'requireLogin', 'requireMod', 'requireOwner', 'soloProprietario']);

// Le porte aperte, una per una, col motivo. Sono la faccia pubblica del sito:
// pagine che chiunque deve poter leggere, ritorni dei login esterni, e i due
// passaggi della passkey (che il segreto se lo verificano da soli).
const PUBBLICHE = new Map([
  ['GET /entra', 'la pagina di ingresso'],
  ['GET /js/carta-disegno.js', 'un file statico come gli altri del sito: il disegno della carta, senza commenti e senza dati di nessuno'],
  ['GET /font/:file', 'i caratteri della carta: solo i tre nomi dell\'elenco, e sono file gia\' pubblici per licenza'],
  ['GET /instagram/cancellazione', 'dove Meta manda chi ha chiesto di cancellare i dati: riconosce solo i codici firmati da noi, e non mostra niente di nessuno'],
  ['GET /pubblici/:nome', 'l\'immagine della settimana mentre Instagram la scarica: nome casuale da 128 bit, cancellata appena pubblicata'],
  ['GET /accedi', 'la pagina di ingresso'],
  ['GET /privacy', 'informativa: pubblica per obbligo'],
  ['GET /.well-known/security.txt', 'come segnalare un problema di sicurezza'],
  ['GET /health', 'battito del servizio: solo ok, stato e da quanto e acceso'],
  ['GET /sitemap.xml', 'per i motori di ricerca'],
  ['GET /llms.txt', 'per i motori di ricerca'],
  ['GET /', 'la pagina iniziale: a chi e\' entrato da\' il pannello, agli altri la vetrina'],
  ['GET /index.html', 'la pagina iniziale'],
  ['GET /en', 'la pagina iniziale in inglese'],
  ['GET /es', 'la pagina iniziale in spagnolo'],
  ['GET /en/', 'rimanda a /en'],
  ['GET /es/', 'rimanda a /es'],
  ['GET /termini', 'termini del servizio: pubblici per obbligo'],
  ['GET /terms', 'termini del servizio: pubblici per obbligo'],
  ['GET /guide', 'le guide sono pubbliche'],
  ['GET /en/guides', 'le guide sono pubbliche'],
  ['GET /es/guias', 'le guide sono pubbliche'],
  ['GET /guide/:slug', 'le guide sono pubbliche'],
  ['GET /en/guides/:slug', 'le guide sono pubbliche'],
  ['GET /es/guias/:slug', 'le guide sono pubbliche'],
  ['GET /manuale', 'il manuale e pubblico'],
  ['GET /en/manual', 'il manuale e pubblico'],
  ['GET /es/manual', 'il manuale e pubblico'],
  ['GET /manuale/:slug', 'il manuale e pubblico'],
  ['GET /en/manual/:slug', 'il manuale e pubblico'],
  ['GET /es/manual/:slug', 'il manuale e pubblico'],
  ['GET /novita', 'le novita sono pubbliche'],
  ['GET /api/novita', 'le novita sono pubbliche'],
  ['GET /api/abbonamento/piani', 'il listino e pubblico'],
  ['GET /posta/conferma', 'il clic sulla mail di conferma: porta un codice monouso che si confronta col suo calco, e scade in un giorno'],
  ['GET /abbonamento/ritorno', 'il ritorno dal Checkout di Stripe: porta solo l\'id della sessione, e lo stato si rilegge da Stripe con la chiave del server; chi bussa con un id qualunque non ottiene niente'],
  ['GET /collega/:canale', 'la pagina dove uno spettatore collega il suo Discord: chi arriva qui non ha un account da noi'],
  ['GET /api/discord/collega/:canale', 'dice solo DOVE mandare la persona su Discord: l\'id dell\'applicazione e\' pubblico per natura, il segreto non passa di qui'],
  ['GET /discord/oidc/callback', 'il ritorno da Discord: vale solo con uno stato che abbiamo creato noi pochi minuti prima, e porta a un codice che senza la chat non collega niente'],
  ['GET /u/:user', 'la pagina link di uno streamer e pubblica per definizione'],
  ['GET /u/:user/dona', 'il vecchio indirizzo della pagina delle donazioni: rimanda a quello vero'],
  ['GET /dona/:login', 'la pagina delle donazioni di uno streamer: pubblica come la pagina link'],
  ['GET /u/:user/avatar', 'immagine della pagina link'],
  ['GET /u/:user/anteprima.png', 'l\'anteprima del link della pagina link: la leggono Telegram, WhatsApp e Discord quando qualcuno incolla il link'],
  ['GET /u/:user/anteprima-dona.png', 'l\'anteprima del link della pagina delle donazioni: come sopra'],
  ['GET /u/:user/img/:file', 'immagini della pagina link'],
  ['GET /u/:user/privacy', 'informativa della pagina link'],
  ['GET /sostieni', 'la pagina per sostenere il progetto: pubblica, e non chiede un account a nessuno'],
  ['GET /api/sostieni', 'gli importi che proponiamo: la pagina li deve poter leggere prima di chiedere qualcosa'],
  ['POST /api/sostieni', 'apre il pagamento: chi sostiene non si iscrive a niente, quindi non c\'e\' una sessione da guardare (tetto al minuto per indirizzo)'],
  ['GET /api/sostieni/esito', 'il ritorno dal pagamento: la verita\' la da\' Stripe, l\'indirizzo serve solo a sapere quale sessione rileggere'],
  ['GET /dona/:user/privacy', 'informativa della pagina delle donazioni: sua, perche\' e\' un\'altra pagina'],
  ['POST /dona/:login', 'il modulo delle donazioni della pagina link: chi dona non ha una sessione, e il pagamento lo conferma Stripe o Satispay, non chi bussa'],
  ['GET /dona/satispay/:login', 'la callback di Satispay: porta solo un id, e lo stato si rilegge con la chiave dello streamer; risponde ok e basta'],
  ['GET /api/streamer-verify', 'lo stesso servizio della pagina link, origine fissa'],
  ['GET /auth/callback', 'ritorno del login Twitch'],
  ['GET /auth/mod', 'ingresso dei moderatori'],
  ['GET /auth/logout', 'uscita'],
  ['GET /spotify/callback', 'ritorno del collegamento Spotify'],
  ['GET /tiktok/callback', 'ritorno del collegamento TikTok'],
  ['GET /telegram/oidc/callback', 'ritorno del collegamento Telegram'],
  ['GET /tgapp', 'la mini-app dentro Telegram'],
  ['POST /api/tgapp/auth', 'verifica da se la firma di Telegram'],
  // Un'icona non e' un segreto, e deve poter essere presa da fuori (una tastiera,
  // Companion) senza portarsi dietro la chiave del canale. Il nome del file e' a
  // schema fisso e casuale: non si indovina e non si risale di cartella.
  ['GET /icona/:login/:file', 'icona di un tasto: pubblica di proposito, serve fuori dal sito'],
  ['POST /api/passkey/login/inizio', 'il login non puo chiedere di essere gia loggati'],
  ['POST /api/passkey/login/fine', 'il login non puo chiedere di essere gia loggati'],
]);

// Pubbliche per il guardiano, ma dietro il cancello della sessione: servono a
// chi e' gia' dentro, e da fuori il sito resta un labirinto.
const SOLO_DENTRO = new Map([
  ['GET /js/carta-disegno.js', 'la usa l\'editor della carta, che sta nel pannello'],
  ['GET /font/:file', 'li usa l\'editor della carta, che sta nel pannello'],
  ['GET /auth/logout', 'senza sessione non c\'e\' niente da chiudere'],
]);

let sorgente = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
if (SELFTEST) {
  sorgente = sorgente.replace(
    "  app.get('/health',",
    "  app.get('/api/segreti-di-tutti', wrap(async (req, res) => res.json({ tutto: 1 })));\n"
    + "  app.get('/regalo/:login', (req, res) => res.redirect(effects.overlayUrl(req.params.login)));\n"
    + "  app.post('/api/tastiera/:login', guardiaConsole, consoleTasto);\n"
    + "  app.get(['/api/pubblico', '/api/nascosto'], (req, res) => res.json({ tutto: 1 }));\n"
    + "  app.get(VIA_NASCOSTA, (req, res) => res.json({ tutto: 1 }));\n"
    + "  app.get('/health',");
}

// Una rotta si legge dal suo primo argomento: un indirizzo scritto per intero,
// o un elenco di indirizzi scritti per intero, e ognuno e' una porta. Un
// indirizzo composto (una variabile, un modello con dentro un pezzo calcolato)
// e' rosso: il cancello non sa dove porta, e una porta che non si legge e'
// una porta che non si controlla. Le pagine in tre lingue lo hanno mostrato:
// costruite in un giro, non le vedeva nessuno, e /en rispondeva 404 a chi non
// era entrato.
const RE_ROTTA = /app\.(get|post|put|patch|delete|all)\(\s*/g;
const RE_LETTERALE = /^\s*('[^'`$]*'|"[^"`$]*")\s*/;
const indirizziDi = (testo, da) => {
  const primo = RE_LETTERALE.exec(testo.slice(da));
  if (primo) return [primo[1].slice(1, -1)];
  if (testo[da] !== '[') return null;
  const fine = testo.indexOf(']', da);
  const dentro = testo.slice(da + 1, fine);
  const vie = [];
  for (let resto = dentro; resto.trim(); ) {
    const m = RE_LETTERALE.exec(resto);
    if (!m) return null;
    vie.push(m[1].slice(1, -1));
    resto = resto.slice(m[0].length).replace(/^,/, '');
  }
  return vie.length ? vie : null;
};
const rotte = [];
const illeggibili = [];
const leggiRotte = (testo, dove, file) => {
  for (const m of testo.matchAll(RE_ROTTA)) {
    const riga = testo.slice(testo.lastIndexOf('\n', m.index) + 1, m.index);
    if (/^\s*\/\//.test(riga)) continue;
    let i = testo.indexOf('(', m.index + 4), d = 0, k = i;
    for (; k < testo.length; k++) {
      if (testo[k] === '(') d++;
      else if (testo[k] === ')') { d--; if (!d) { k++; break; } }
    }
    const corpo = testo.slice(i, k);
    const vie = indirizziDi(testo, m.index + m[0].length);
    if (!vie) {
      illeggibili.push(`${file}: «${testo.slice(m.index, testo.indexOf('\n', m.index)).trim().slice(0, 80)}» ha un indirizzo che il cancello non legge: va scritto per intero`);
      continue;
    }
    const guardia = GUARDIANI.find((g) => new RegExp('\\b' + g + '\\b').test(corpo)) || null;
    for (const via of vie) rotte.push({ chiave: m[1].toUpperCase() + ' ' + via, via, guardia, corpo, pos: dove(m.index) });
  }
};
leggiRotte(sorgente, (i) => i, 'src/web/server.js');

// Le rotte di Kick e di YouTube stanno in un file loro, montato dal server con
// una riga: sono porte come le altre, e si leggono come le altre. Dal cancello
// le separa la riga che le monta. E un file che registra rotte senza che qui
// lo si legga e' rosso: una porta che il cancello non vede e' la prossima
// che si scopre dopo.
const moduli = [...sorgente.matchAll(/import \{ (monta\w+) \} from '(\.\.\/[\w-]+\/rotte\.js)';/g)]
  .map((x) => ({ file: join('src', x[2].slice(3)), pos: sorgente.indexOf(`${x[1]}(app`) }));
for (const x of moduli) leggiRotte(readFileSync(join(RAD, x.file), 'utf8'), () => x.pos, x.file);
const conRotte = readdirSync(join(RAD, 'src'), { recursive: true })
  .map((f) => join('src', String(f)))
  .filter((f) => f.endsWith('.js') && !f.startsWith(join('src', 'web', 'public')))
  .filter((f) => /\bapp\.(get|post|put|patch|delete|all)\(/.test(readFileSync(join(RAD, f), 'utf8')));

const guai = [...illeggibili];
for (const f of conRotte) {
  if (f !== join('src', 'web', 'server.js') && !moduli.some((x) => x.file === f)) guai.push(`${f}: registra rotte che questo cancello non legge`);
}

// 1) niente porte senza guardiano che non siano dichiarate
const senza = rotte.filter((r) => !r.guardia);
for (const r of senza) {
  if (!PUBBLICHE.has(r.chiave)) guai.push(`${r.chiave}: nessun guardiano e non e' dichiarata pubblica`);
}

// 2) l'elenco delle pubbliche non deve marcire
const viste = new Set(senza.map((r) => r.chiave));
for (const k of PUBBLICHE.keys()) {
  if (!viste.has(k)) guai.push(`«${k}» e' nell'elenco delle pubbliche ma non esiste piu' (o ora ha un guardiano): toglila`);
}

// 3) quel che e' di amministrazione vuole il guardiano dell'amministrazione,
//    non basta essere entrati
for (const r of rotte) {
  if (/^\/api\/admin\b/.test(r.via) && r.guardia !== 'requireAdmin') {
    guai.push(`${r.chiave}: e' una porta di amministrazione ma il guardiano e' «${r.guardia || 'nessuno'}»`);
  }
}

// 4) UNA PORTA PUBBLICA NON TOCCA CHI FABBRICA I SEGRETI. C'era una scorciatoia
//    «/o/:login/:slug», pubblica con tanto di motivo scritto, che rimandava al
//    link dell'overlay CON la chiave dentro: bastava il nome di uno streamer per
//    avere la chiave del suo schermo. Il motivo nell'elenco descriveva il buco,
//    e l'elenco lo benediceva. Quindi l'elenco non basta: una rotta senza
//    guardiano non puo' nemmeno NOMINARE una funzione che produce una chiave.
const FABBRICHE = /\b(overlayKey|overlayUrl|mediaUrl|nuovaChiave)\s*\(|(consolle|gsi)\.chiave\s*\(/;
for (const r of senza) {
  if (FABBRICHE.test(r.corpo)) guai.push(`${r.chiave}: e' pubblica ma tocca una chiave`);
}

// 5) CHI BUSSA SENZA SESSIONE TROVA LA PORTA APERTA. Il guardiano dice chi bussa,
//    ma prima del guardiano c'e' il cancello della sessione (vetrina.js), che a
//    chi non e' entrato risponde 404. Se il cancello non lo sa, la porta c'e',
//    e' guardata bene, ed e' morta proprio per chi deve usarla. E' successo a
//    Kick, alla tastiera di CONSOLify, ai giochi che mandano il loro stato, a
//    Meta che scarica l'immagine della settimana: ogni volta si e' scoperto
//    dopo, perche' ognuno guardava la sua rotta e nessuno il cancello davanti.
//    Qui si guardano insieme: il cancello si ricostruisce da vetrina.js e dalle
//    pagine che il server gli dichiara, e gli si chiede se quella porta passa.
const RIGA_CANCELLO = 'if (currentUser(req) || guscio.aperto(req.path)) return next();';
const cancello = sorgente.indexOf(RIGA_CANCELLO);
if (cancello < 0) guai.push('non trovo la riga del cancello: le porte senza sessione non si possono controllare');
const guscio = creaGuscio(join(RAD, 'src/web/public'));
for (const d of sorgente.matchAll(/guscio\.(pagina|risorsa)\(([^)]*)\)/g)) {
  const arg = [...d[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  if (!arg.length) continue;   // il nome nei commenti
  if (d[1] === 'pagina') guscio.pagina(...arg); else guscio.risorsa(arg[0]);
}
const esempio = (via) => via.replace(/:[A-Za-z_]+\??/g, 'x1').replace(/\*/g, 'x1');
const daFuori = rotte.filter((r) => cancello >= 0 && r.pos > cancello
  && (r.guardia ? !SOLO_SESSIONE.has(r.guardia) : PUBBLICHE.has(r.chiave) && !SOLO_DENTRO.has(r.chiave)));
for (const r of daFuori) {
  if (!guscio.aperto(esempio(r.via))) guai.push(`${r.chiave}: la usa chi e' senza sessione, e il cancello gli risponde 404`);
}
for (const k of SOLO_DENTRO.keys()) {
  if (!PUBBLICHE.has(k)) guai.push(`«${k}» e' fra le porte chiuse a chi e' senza sessione, ma non e' piu' pubblica: va tolta anche da li'`);
}

const conta = {};
for (const r of rotte) conta[r.guardia || 'pubblica'] = (conta[r.guardia || 'pubblica'] || 0) + 1;

const dice = (ok, testo, extra = '') => { console.log(`  ${ok ? '✓' : '✗'} ${testo}${!ok && extra ? ` — ${extra}` : ''}`); return ok; };
console.log('\nOgni porta ha il suo guardiano, o un motivo scritto per non averlo.\n');
console.log('  ' + Object.entries(conta).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v}`).join(' · ') + '\n');

let verde = true;
verde = dice(!guai.some((g) => /nessun guardiano|non legge/.test(g)), `rotte lette: ${rotte.length}, da ${1 + moduli.length} file`, guai.filter((g) => /nessun guardiano|non legge/.test(g)).slice(0, 5).join(' · ')) && verde;
verde = dice(!guai.some((g) => /marcire|toglila/.test(g)), `porte dichiarate pubbliche: ${PUBBLICHE.size}, tutte ancora vere`, guai.filter((g) => /toglila/.test(g)).slice(0, 5).join(' · ')) && verde;
verde = dice(!guai.some((g) => /amministrazione/.test(g)), `porte di amministrazione: ${rotte.filter((r) => /^\/api\/admin\b/.test(r.via)).length}`, guai.filter((g) => /amministrazione/.test(g)).slice(0, 5).join(' · ')) && verde;
verde = dice(!guai.some((g) => /tocca una chiave/.test(g)), `porte pubbliche che toccano una chiave: ${guai.filter((g) => /tocca una chiave/.test(g)).length}`, guai.filter((g) => /tocca una chiave/.test(g)).slice(0, 5).join(' · ')) && verde;
verde = dice(!guai.some((g) => /senza sessione/.test(g)), `porte per chi e' senza sessione: ${daFuori.length}, tutte aperte nel cancello`, guai.filter((g) => /senza sessione/.test(g)).slice(0, 5).join(' · ')) && verde;

if (SELFTEST) {
  const regalo = guai.some((g) => /regalo.*tocca una chiave/.test(g));
  const tastiera = guai.some((g) => /\/api\/tastiera\/.*senza sessione/.test(g));
  const inElenco = guai.some((g) => /^GET \/api\/nascosto: nessun guardiano/.test(g));
  const composta = guai.some((g) => /VIA_NASCOSTA.*non legge/.test(g));
  if (!inElenco) { console.log('\nAutoprova FALLITA: la seconda porta di un elenco non e\' stata vista.\n'); process.exit(1); }
  if (!composta) { console.log('\nAutoprova FALLITA: la porta con un indirizzo composto non e\' stata vista.\n'); process.exit(1); }
  if (!verde && regalo && tastiera) { console.log('\nAutoprova: una porta nuova senza guardiano, una in un elenco, una con un indirizzo composto, una che regala una chiave e una a chiave chiusa dal cancello fanno diventare rosso il cancello. ✓\n'); process.exit(0); }
  if (!verde && !regalo) { console.log('\nAutoprova FALLITA: la porta che regala la chiave non e\' stata vista.\n'); process.exit(1); }
  if (!verde) { console.log('\nAutoprova FALLITA: la porta a chiave chiusa dal cancello non e\' stata vista.\n'); process.exit(1); }
  console.log('\nAutoprova FALLITA: il cancello non si accorge di una porta aperta.\n');
  process.exit(1);
}
console.log(verde ? '\ncancello verde ✓\n' : '\ncancello ROSSO ✗\n');
process.exit(verde ? 0 : 1);
