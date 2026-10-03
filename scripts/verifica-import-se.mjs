// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Cancello di «DA STREAMELEMENTS» nel pannello (docs/PONTE.md), in un browser
// vero, al computer e al telefono, sulla demo, con uno StreamElements finto.
//
// Le promesse che solo il pannello acceso puo' mostrare:
//  · la carta dice che senza chiave non serve nessun accesso, e della chiave
//    dice per intero che resta solo nella pagina, si cancella e si perde
//    ricaricando;
//  · «Prendi da StreamElements» mostra l'anteprima con chi puo' usare ogni
//    comando, i contatori, i punti; «Importa» manda l'impronta di quello che si
//    e' visto, e nessun testo;
//  · con la chiave: le chiamate vanno SOLO a StreamElements, con la chiave e
//    senza cookie ne' referrer; nessuna richiesta al nostro server la porta
//    (indirizzo, corpo o intestazioni); il campo e' vuoto appena premuto; la
//    chiave non resta nel riquadro, ne' nell'archivio del browser, ne' nei
//    cookie; la pagina dice che l'ha cancellata; ricaricando non c'e' niente;
//  · niente scorre di lato, nessun errore.
//
// Uso: node scripts/verifica-import-se.mjs             (esce 1 se una promessa non tiene)
//      node scripts/verifica-import-se.mjs --selftest  (rimette cinque difetti, uno alla volta:
//                                                       il campo che non si svuota, la chiave che
//                                                       resta nella pagina, l'anteprima
//                                                       senza chi puo' usarlo, «Importa» senza
//                                                       impronta, la chiave mandata al nostro
//                                                       server; ognuno deve far scattare il suo
//                                                       controllo)

import { apriSito, apriBrowser } from './_sito.mjs';

const SELFTEST = process.argv.includes('--selftest');
const SCHERMI = [[1440, 950], [390, 844]];
const CHIAVE = 'eyJfinta.CHIAVE-di-prova.9f8e7d';
const ID = 'b'.repeat(24);
const DIFETTI = [
  { nome: 'il campo che non si svuota', da: "    if (campo) campo.value = '';\n    if (!chiave)", a: '    if (!chiave)', visto: 'il campo della chiave non si svuota' },
  { nome: 'la chiave nel testo', da: "      chiave = '';\n      const testo = document.getElementById('imp-testo');", a: "      const testo = document.getElementById('imp-testo');\n      testo.dataset.k = chiave;", visto: 'la chiave resta nella pagina' },
  { nome: 'l\'anteprima senza chi', da: '${impSegni(c)}${impStato(c)}', a: '${impStato(c)}', visto: 'non dice chi puo\' usare' },
  { nome: '«Importa» senza impronta', da: "if (daSE) corpo.firma = _impSE?.firma || ''; else", a: 'if (daSE) ; else', visto: 'non manda l\'impronta' },
  { nome: 'la chiave mandata a noi', da: "      const canale = await chiedi('/channels/me');", a: "      api('/api/streamer/comandi/importa', { method: 'POST', body: { testo: chiave } }).catch(() => {});\n      const canale = await chiedi('/channels/me');", visto: 'una richiesta al nostro server porta la chiave' },
];

// lo StreamElements finto: risponde solo con la chiave giusta
const SE_FINTO = {
  '/channels/me': { _id: ID, username: 'andryxdemo', provider: 'twitch', providerId: '1' },
  [`/bot/commands/${ID}`]: [
    { command: 'segreto', reply: 'shh', accessLevel: 500, hidden: true, enabled: true, cooldown: { user: 0, global: 0 }, aliases: [], type: 'say' },
    { command: 'discord', reply: 'discord.gg/x', accessLevel: 100, enabled: true, cooldown: { user: 10, global: 5 }, aliases: ['dc'], type: 'say' },
  ],
  [`/bot/timers/${ID}`]: [{ name: 'social', enabled: true, chatLines: 3, online: { enabled: true, interval: 15 }, offline: { enabled: false, interval: 15 }, messages: ['seguimi'] }],
};

const sito = await apriSito();
const br = await apriBrowser();
if (!br) { console.log('Playwright non c\'e\': salto.'); sito.chiudi(); process.exit(0); }

async function giro([W, H], difetto = null) {
  const rotte = [], guai = [];
  const dice = (ok, cosa) => { if (!ok) { if (!difetto) console.log(`  ✗ ${cosa}`); rotte.push(cosa); } return ok; };
  let entrato = false;
  const dove = `${W}px`;
  const ctx = await br.newContext({ viewport: { width: W, height: H }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => guai.push(e.message));
  p.on('dialog', (d) => d.dismiss().catch(() => {}));
  const nostre = [], loro = [];
  p.on('request', (r) => {
    const u = r.url();
    if (u.includes('api.streamelements.com')) { if (r.method() !== 'OPTIONS') loro.push({ url: u, h: r.headers() }); return; }
    nostre.push({ url: u, corpo: r.postData() || '', h: JSON.stringify(r.headers()) });
  });
  await p.route(/api\.streamelements\.com/, async (route) => {
    const r = route.request();
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, accept', 'access-control-allow-methods': 'GET' };
    if (r.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const via = new URL(r.url()).pathname.replace(/^\/kappa\/v2/, '');
    if (r.headers().authorization !== `Bearer ${CHIAVE}`) return route.fulfill({ status: 401, headers: cors, body: '{}' });
    if (!(via in SE_FINTO)) return route.fulfill({ status: 404, headers: cors, body: '{}' });
    return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(SE_FINTO[via]) });
  });
  // Nella demo le chiamate al nostro server non escono in rete (le risponde il
  // pannello stesso): per vederle si annota ogni chiamata ad api(), cosi' il
  // controllo «la chiave non arriva a noi» guarda anche quelle e non e' vuoto.
  const SPIA = 'async function api(percorso, opzioni = {}) {';
  let spiata = false;
  await p.route(/\/app\.js(\?|$)/, async (route) => {
    const r = await route.fetch();
    let t = await r.text();
    if (t.includes(SPIA)) { t = t.replace(SPIA, `${SPIA}\n  (window.__chiamate ||= []).push({ percorso: String(percorso), corpo: JSON.stringify(opzioni.body ?? null) });`); spiata = true; }
    if (difetto && t.includes(difetto.da)) { t = t.replace(difetto.da, difetto.a); entrato = true; }
    await route.fulfill({ response: r, body: t });
  });
  const chiamate = () => p.evaluate(() => window.__chiamate || []);
  await p.addInitScript(() => { try { localStorage.setItem('sb-giro', JSON.stringify({ viste: {}, mai: true })); localStorage.setItem('sotto:moduli', 'moduli'); } catch { /* niente */ } });
  const apri = async () => {
    await p.goto(`http://127.0.0.1:${sito.porta}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
    await p.evaluate(() => { document.getElementById('cookie-banner')?.remove(); window.SB_APP.vai('moduli'); });
    await p.waitForSelector('#imp-se', { timeout: 20000 });
  };
  await apri();

  // le parole della carta
  const carta = await p.evaluate(() => document.getElementById('imp-se')?.textContent.replace(/\s+/g, ' ') || '');
  dice(/Non serve nessun accesso/.test(carta), `${dove}: la carta non dice che senza chiave non serve nessun accesso`);
  for (const [re, cosa] of [[/a noi non arriva mai/, 'che la chiave non arriva a noi'], [/Appena la leggo, la cancello/, 'che la chiave si cancella appena letta'],
    [/Se ricarichi la pagina, la chiave non c'è più/, 'che ricaricando la chiave si perde'], [/rigenerala su StreamElements/, 'come renderla inutile dopo']]) {
    dice(re.test(carta), `${dove}: l'avviso della chiave non dice ${cosa}`);
  }

  // senza chiave: l'anteprima, poi «Importa» con l'impronta
  await p.click('#imp-se-prendi');
  await p.waitForSelector('#imp-esito .imp-riga', { timeout: 10000 });
  const vista = await p.evaluate(() => document.getElementById('imp-esito').textContent.replace(/\s+/g, ' '));
  dice(/Da StreamElements: AndryxDemo/.test(vista), `${dove}: l'anteprima non dice da quale canale di StreamElements`);
  dice(/solo moderatori/.test(vista) && /15 s a testa/.test(vista) && /anche !dc/.test(vista), `${dove}: l'anteprima non dice chi puo' usare i comandi e quando`);
  dice(/Contatori/.test(vista) && /parte da 41/.test(vista), `${dove}: l'anteprima non mostra i contatori`);
  dice(/Punti/.test(vista), `${dove}: l'anteprima non mostra i punti`);
  dice(spiata, `${dove}: non riesco a vedere le chiamate del pannello: il collaudo va aggiornato`);
  const prima = (await chiamate()).length;
  await p.click('#imp-applica');
  await p.waitForTimeout(600);
  const invio = (await chiamate()).slice(prima).find((r) => r.percorso.includes('/api/streamer/comandi/importa'));
  const corpo = (() => { try { return JSON.parse(invio?.corpo || '{}') || {}; } catch { return {}; } })();
  dice(invio?.percorso.endsWith('/importa/streamelements') && corpo.applica === true && typeof corpo.firma === 'string' && corpo.firma.length > 0 && !('testo' in corpo),
    `${dove}: «Importa» da StreamElements non manda l'impronta di quello che si e' visto (${JSON.stringify(corpo).slice(0, 120)})`);

  // con la chiave
  await p.click('#imp-se-chiave-box > summary');
  await p.fill('#imp-se-chiave', CHIAVE);
  const primaNostre = nostre.length;
  const primaChiamate = (await chiamate()).length;
  await p.click('#imp-se-leggi');
  const subito = await p.evaluate(() => document.getElementById('imp-se-chiave').value);
  dice(subito === '', `${dove}: il campo della chiave non si svuota appena premuto`);
  await p.waitForFunction(() => /cancellata/.test(document.getElementById('imp-se-stato')?.textContent || ''), null, { timeout: 10000 }).catch(() => {});
  await p.waitForTimeout(500);
  dice(loro.length === 3 && loro.every((r) => r.h.authorization === `Bearer ${CHIAVE}` && !r.h.cookie && !r.h.referer),
    `${dove}: le chiamate a StreamElements non sono tre, con la chiave e senza cookie ne' referrer (${loro.length})`);
  const fuga = [...nostre.slice(primaNostre).filter((r) => [r.url, r.corpo, r.h].some((x) => x.includes(CHIAVE))).map((r) => r.url),
    ...(await chiamate()).slice(primaChiamate).filter((r) => r.corpo.includes(CHIAVE) || r.percorso.includes(CHIAVE)).map((r) => r.percorso)];
  dice((await chiamate()).length > primaChiamate, `${dove}: dopo la chiave il pannello non ha chiesto l'anteprima: il controllo della fuga sarebbe vuoto`);
  dice(!fuga.length, `${dove}: una richiesta al nostro server porta la chiave (${fuga[0] || ''})`);
  const pagina = await p.evaluate((k) => {
    const archivio = [];
    for (const s of [localStorage, sessionStorage]) for (let i = 0; i < s.length; i++) archivio.push(s.getItem(s.key(i)) || '');
    return {
      campo: document.getElementById('imp-se-chiave').value,
      testo: document.getElementById('imp-testo').value,
      html: document.documentElement.outerHTML.includes(k),
      archivio: archivio.some((x) => x.includes(k)),
      cookie: document.cookie.includes(k),
      stato: document.getElementById('imp-se-stato')?.textContent || '',
      anteprima: !!document.querySelector('#imp-esito .imp-riga'),
    };
  }, CHIAVE);
  dice(pagina.campo === '' && !pagina.html && !pagina.testo.includes(CHIAVE), `${dove}: la chiave resta nella pagina`);
  dice(!pagina.archivio && !pagina.cookie, `${dove}: la chiave e' finita nell'archivio del browser o nei cookie`);
  dice(/"commands"/.test(pagina.testo) && /"timers"/.test(pagina.testo) && /segreto/.test(pagina.testo), `${dove}: timer e comandi nascosti non sono nel riquadro`);
  dice(/cancellata/.test(pagina.stato), `${dove}: la pagina non dice che la chiave e' stata cancellata`);
  dice(pagina.anteprima, `${dove}: dopo la chiave non parte l'anteprima`);
  const largo = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  dice(largo <= 0, `${dove}: la pagina scorre di lato di ${largo}px`);

  // ricaricando non c'e' niente
  await apri();
  const dopo = await p.evaluate((k) => ({ campo: document.getElementById('imp-se-chiave')?.value || '', ovunque: document.documentElement.outerHTML.includes(k) }), CHIAVE);
  const cookie = (await ctx.cookies()).some((c) => c.value.includes(CHIAVE));
  dice(!dopo.campo && !dopo.ovunque && !cookie, `${dove}: ricaricando, la chiave c'e' ancora`);
  await ctx.close();
  if (!difetto) dice(!guai.length, `la pagina ha errori: ${guai[0]}`);
  return { rotte, entrato };
}

let esito = 0;
try {
  if (SELFTEST) {
    for (const d of DIFETTI) {
      const r = await giro(SCHERMI[0], d);
      const visto = r.rotte.some((x) => x.includes(d.visto));
      if (!r.entrato) console.log(`Autoprova: ${d.nome}: il difetto non e' entrato, il codice e' cambiato: aggiorna DIFETTI. ✗`);
      else console.log(visto ? `Autoprova: ${d.nome} si vede. ✓` : `Autoprova: ${d.nome} NON e' stato visto (${r.rotte.join(' | ').slice(0, 160)}). ✗`);
      if (!r.entrato || !visto) esito = 1;
    }
  } else {
    let tutte = [];
    for (const sc of SCHERMI) tutte = tutte.concat((await giro(sc)).rotte);
    console.log(tutte.length ? `\n${tutte.length} cose non tornano.` : '\nDa StreamElements: senza chiave l\'anteprima giusta, con la chiave solo verso StreamElements e subito dimenticata, al telefono e al computer. ✓');
    esito = tutte.length ? 1 : 0;
  }
} finally {
  await br.close();
  sito.chiudi();
}
process.exit(esito);
