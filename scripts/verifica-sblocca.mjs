// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// «SBLOCCA», LA PAGINA DOVE SI APRE L'APP INSTALLATA, PROVATA COI GESTI
// (docs/ACCESSO-SICURO.md, «L'app installata e la pagina Sblocca»).
//
// Dove manda la pagina a seconda della sessione lo prova il contratto
// (test/contratto/ingresso-rotte.test.mjs). Qui si apre la pagina in un browser
// e si fa quello che fa una persona, con una passkey per finta: c'e', non c'e',
// viene annullata, il dispositivo non le sa usare.
//
// LE PROMESSE:
//   · nessun indirizzo della pagina esce dal sito, e «Entra in un altro modo»
//     porta alla porta d'ingresso, dove ci sono tutti i modi;
//   · nell'app, a chi su quel dispositivo non ha mai usato una passkey non
//     parte nessuna richiesta da sola;
//   · a chi l'ha gia' usata li' parte da sola, e riuscita porta al pannello;
//   · una passkey riuscita lascia l'appunto sul dispositivo;
//   · annullata, la pagina lo dice e mette avanti l'altro modo;
//   · su un dispositivo che non sa usare le passkey resta solo l'altro modo;
//   · le parole seguono la lingua, e la lingua arriva alla porta;
//   · sul telefono la pagina non si allarga e i tasti si prendono col pollice.
//
// Uso: node scripts/verifica-sblocca.mjs [--foto <cartella>]
//      --selftest serve la pagina rotta in sei modi e pretende sei rossi.
import './_dati-usa-e-getta.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { apriSito, apriBrowser, PUB } from './_sito.mjs';

const SELFTEST = process.argv.includes('--selftest');
const iFoto = process.argv.indexOf('--foto');
const FOTO = iFoto > 0 ? process.argv[iFoto + 1] : '';
const leggi = (nome) => readFileSync(join(PUB, nome), 'utf8');
const TIPO = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8' };

// Le rotture: [nome, file, testo da togliere, testo al suo posto]. Ognuna toglie
// una promessa sola, e il giro deve accorgersene.
const ROTTURE = [
  ['l\'uscita torna a essere un altro sito', 'sblocca.html', 'id="altro-modo" href="/ingresso"', 'id="altro-modo" href="https://www.andryxify.it"'],
  ['la richiesta parte da sola anche a chi non ha mai avuto una passkey', 'sblocca.js', 'if (inApp && passkeyQui())', 'if (inApp)'],
  ['non parte piu\' da sola per nessuno', 'sblocca.js', 'if (inApp && passkeyQui())', 'if (false)'],
  ['annullata, la pagina resta muta', 'sblocca.js', "msg.textContent = errore(e && e.name === 'NotAllowedError' ? { codice: 'passkey' } : e);\n      avantiLAltro();", "msg.textContent = '';"],
  ['senza passkey sul dispositivo resta il tasto che non puo\' funzionare', 'sblocca.js', 'btn.hidden = true;', ''],
  ['la passkey riuscita non lascia l\'appunto', 'ingresso-comune.js', "if (segna) radice.localStorage.setItem('passkey:qui', '1');", ''],
];

const br = await apriBrowser();
if (!br) { console.log('Playwright non c\'e\': salto.'); process.exit(0); }

// La passkey per finta e l'app installata per finta, prima che la pagina parta.
const preparo = ({ app, passkey, appunto, senza }) => {
  window.__chieste = 0;
  // l'appunto si prepara una volta, alla prima pagina: dopo e' la pagina a scriverlo, ed e' quello che si misura
  if (!sessionStorage.getItem('preparato')) {
    sessionStorage.setItem('preparato', '1');
    if (appunto) localStorage.setItem('passkey:qui', '1'); else localStorage.removeItem('passkey:qui');
  }
  if (app) {
    const vera = window.matchMedia.bind(window);
    window.matchMedia = (q) => (String(q).includes('display-mode: standalone') ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : vera(q));
  }
  if (senza) { delete window.PublicKeyCredential; Object.defineProperty(window, 'PublicKeyCredential', { value: undefined, configurable: true }); return; }
  if (!window.PublicKeyCredential) window.PublicKeyCredential = function PublicKeyCredential() {};
  const finta = { get: async () => {
    window.__chieste += 1;
    if (passkey !== 'riesce') throw new DOMException('annullata', 'NotAllowedError');
    const pezzo = new Uint8Array([1, 2, 3]).buffer;
    return { id: 'finta', response: { authenticatorData: pezzo, clientDataJSON: pezzo, signature: pezzo } };
  } };
  Object.defineProperty(navigator, 'credentials', { value: finta, configurable: true });
};

async function giro(rottura, dice) {
  const guai = [];
  const chiedi = (ok, t) => { if (!ok) guai.push(t); dice(!!ok, t); };
  const file = { 'sblocca.html': leggi('sblocca.html'), 'sblocca.js': leggi('sblocca.js'), 'ingresso-comune.js': leggi('ingresso-comune.js') };
  if (rottura) {
    if (!file[rottura[1]].includes(rottura[2])) { guai.push('la rottura non trova piu\' il suo testo'); return guai; }
    file[rottura[1]] = file[rottura[1]].replace(rottura[2], rottura[3]);
  }
  const manda = (res, nome, testo) => { res.writeHead(200, { 'content-type': TIPO[nome.split('.').pop()] }); res.end(testo); return true; };
  const sito = await apriSito({
    api: (q) => (q === '/api/passkey/login/inizio' ? { challenge: 'c2ZpZGE', rpId: 'localhost', userVerification: 'preferred', timeout: 60000, allowCredentials: [] } : { ok: true }),
    rotte: (req, res, q) => {
      if (q === '/sblocca') return manda(res, 'sblocca.html', file['sblocca.html']);
      if (q === '/ingresso') return manda(res, 'ingresso.html', leggi('ingresso.html'));
      if (q === '/sblocca.js' || q === '/ingresso-comune.js') return manda(res, q.slice(1), file[q.slice(1)]);
      return false;
    },
  });
  const apri = async (come, { vista = { width: 1366, height: 768 }, lingua = 'it' } = {}) => {
    const cx = await br.newContext({ viewport: vista, reducedMotion: 'reduce', locale: lingua === 'en' ? 'en-US' : 'it-IT' });
    const pg = await cx.newPage();
    pg.on('pageerror', (e) => guai.push('pageerror: ' + e.message));
    await pg.addInitScript(preparo, come);
    await pg.goto(sito.base + '/sblocca', { waitUntil: 'load' });
    await pg.waitForTimeout(700);
    return pg;
  };
  const stato = (pg) => pg.evaluate(() => ({
    chieste: window.__chieste,
    appunto: localStorage.getItem('passkey:qui'),
    tasto: !document.getElementById('btn').hidden && document.getElementById('btn').offsetHeight > 0,
    tastoAvanti: !document.getElementById('btn').classList.contains('secondaria'),
    altroAvanti: !document.getElementById('altro-modo').classList.contains('secondaria'),
    msg: document.getElementById('msg').textContent.trim(),
    fuori: [...document.querySelectorAll('a[href], form[action]')].map((e) => e.href || e.action).filter((u) => new URL(u, location.href).origin !== location.origin),
    largo: document.documentElement.scrollWidth <= window.innerWidth,
    alti: [...document.querySelectorAll('.porte .azione')].filter((e) => e.offsetHeight > 0).map((e) => Math.round(e.getBoundingClientRect().height)),
    testi: { titolo: document.getElementById('sb-titolo').textContent, altro: document.getElementById('altro-modo').textContent },
  }));
  const foto = async (pg, nome) => { if (FOTO && !rottura) await pg.screenshot({ path: join(FOTO, nome + '.png') }); };

  try {
    // chi ha l'app e non ha mai avuto una passkey: il caso della segnalazione
    const a = await apri({ app: true, passkey: 'annullata', appunto: false });
    const sa = await stato(a);
    chiedi(sa.fuori.length === 0, `nessun indirizzo della pagina esce dal sito${sa.fuori.length ? ' (' + sa.fuori[0] + ')' : ''}`);
    chiedi(sa.chieste === 0, 'nell\'app, a chi non ha mai usato una passkey qui non parte nessuna richiesta da sola');
    chiedi(sa.tasto && sa.tastoAvanti && !sa.altroAvanti && sa.msg === '', 'la pagina aspetta: la passkey avanti, l\'altro modo accanto, nessun messaggio');
    await foto(a, 'computer-senza-passkey');
    await a.click('#btn');
    await a.waitForFunction(() => document.getElementById('msg').textContent.trim() !== '' || window.__chieste > 0, null, { timeout: 4000 }).catch(() => {});
    await a.waitForTimeout(200);
    const sb = await stato(a);
    chiedi(sb.chieste === 1 && /err/.test(await a.getAttribute('#msg', 'class')) && sb.msg.length > 10, 'annullata, la pagina lo dice con una riga');
    chiedi(sb.altroAvanti && !sb.tastoAvanti && !(await a.isDisabled('#btn')), 'e mette avanti l\'altro modo, lasciando la passkey da riprovare');
    await foto(a, 'computer-annullata');
    await a.click('#altro-modo');
    await a.waitForURL((u) => u.pathname === '/ingresso', { timeout: 5000 }).catch(() => {});
    const dove = new URL(a.url());
    chiedi(dove.origin === sito.base && dove.pathname === '/ingresso', '«Entra in un altro modo» porta alla porta d\'ingresso, sullo stesso sito');
    chiedi(await a.waitForSelector('.porte .azione.twitch', { timeout: 5000 }).then(() => true).catch(() => false), 'dove ci sono tutti i modi di entrare');
    await a.context().close();

    // chi una passkey qui l'ha gia' usata
    const b = await apri({ app: true, passkey: 'riesce', appunto: true });
    await b.waitForURL((u) => u.pathname === '/', { timeout: 5000 }).catch(() => {});
    chiedi(new URL(b.url()).pathname === '/', 'a chi l\'ha gia\' usata qui la richiesta parte da sola, e riuscita porta al pannello');
    await b.context().close();

    // fuori dall'app non parte da sola; riuscita, lascia l'appunto
    const c1 = await apri({ app: false, passkey: 'riesce', appunto: true });
    chiedi((await stato(c1)).chieste === 0, 'nel browser, fuori dall\'app, non parte da sola nemmeno con l\'appunto');
    await c1.context().close();
    const c = await apri({ app: false, passkey: 'riesce', appunto: false });
    await c.click('#btn');
    await c.waitForURL((u) => u.pathname === '/', { timeout: 5000 }).catch(() => {});
    chiedi(new URL(c.url()).pathname === '/' && (await c.evaluate(() => localStorage.getItem('passkey:qui'))) === '1', 'una passkey riuscita porta al pannello e lascia l\'appunto sul dispositivo');
    await c.context().close();

    // il dispositivo che non sa usare le passkey
    const d = await apri({ app: true, senza: true });
    const sd = await stato(d);
    chiedi(!sd.tasto && sd.altroAvanti && sd.msg.length > 10, 'su un dispositivo che non sa usare le passkey resta solo l\'altro modo, col perche\'');
    await foto(d, 'computer-senza-supporto');
    await d.context().close();

    // la lingua
    const e = await apri({ app: false, passkey: 'annullata', appunto: false }, { lingua: 'en' });
    const se = await stato(e);
    chiedi(se.testi.titolo === 'Welcome back' && se.testi.altro === 'Sign in another way', 'le parole seguono la lingua del browser');
    chiedi((await e.getAttribute('#altro-modo', 'href')) === '/ingresso?lang=en', 'e la lingua arriva alla porta');
    await e.context().close();

    // il telefono
    const t = await apri({ app: true, passkey: 'annullata', appunto: false }, { vista: { width: 360, height: 740 } });
    const st = await stato(t);
    chiedi(st.largo, 'telefono: la pagina non si allarga a 360');
    chiedi(st.alti.length === 2 && st.alti.every((h) => h >= 44), `telefono: i due tasti si prendono col pollice (${st.alti.join(', ')} px)`);
    await foto(t, 'telefono');
    await t.context().close();
  } catch (e) {
    guai.push('il giro si e\' fermato: ' + String(e.message).split('\n')[0]);
    dice(false, 'il giro si e\' fermato: ' + String(e.message).split('\n')[0]);
  }
  sito.chiudi();
  return guai;
}

if (SELFTEST) {
  let cieche = 0;
  for (const r of ROTTURE) {
    const guai = await giro(r, () => {});
    const vista = guai.length > 0 && !guai.some((g) => g.startsWith('la rottura non trova'));
    console.log((vista ? '  ✓  ' : '  ✗  ') + r[0] + (vista ? `  → rosso (${guai[0]})` : '  → PASSA INOSSERVATO' + (guai[0] ? ` (${guai[0]})` : '')));
    if (!vista) cieche++;
  }
  await br.close();
  console.log(cieche ? `\n${cieche} ${cieche === 1 ? 'rottura non vista' : 'rotture non viste'}.` : "\nOgni rottura e' vista. ✓");
  process.exit(cieche ? 1 : 0);
}

console.log('\n«Sblocca», la pagina dove si apre l\'app installata.\n');
const guai = await giro(null, (ok, t) => console.log((ok ? '  ✓ ' : '  ✗ ') + t));
await br.close();
if (guai.length) { console.log(`\n${guai.length} ${guai.length === 1 ? 'cosa non torna' : 'cose non tornano'}.`); for (const g of guai) console.log('  ✗ ' + g); process.exit(1); }
console.log('\ncancello verde ✓');
