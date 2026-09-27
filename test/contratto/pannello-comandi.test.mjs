// LA SCHEDA COMANDI DICE QUELLO CHE IL BOT FA.
//
// Qui stanno le prove della scheda Comandi (e di Comandi vocali) che si leggono
// dal pannello: un testo che promette una cosa che il bot non fa, un campo letto
// col nome sbagliato, un tasto che salva piu' di quello che si vede.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

// Alcune prove caricano moduli del server: il database, se si apre, sta in una
// cartella usa-e-getta.
const usaEGetta = cartellaUsaEGetta('andrybot-pannello-comandi-');
test.after(() => usaEGetta.pulisci());

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const APP = leggi('src/web/public/app.js');

// Il corpo di una funzione del pannello, dalla firma alla graffa che la chiude.
function corpo(firma) {
  const i = APP.indexOf(firma);
  assert.ok(i >= 0, `manca ${firma}`);
  let d = 0;
  for (let j = APP.indexOf('{', i); j < APP.length; j++) {
    if (APP[j] === '{') d++;
    else if (APP[j] === '}') { d--; if (!d) return APP.slice(i, j + 1); }
  }
  return '';
}

test('accendere un contatore a schermo non lo azzera, e il pannello non lo dice', () => {
  const cont = leggi('src/features/contatori.js');
  assert.match(cont, /verbo === 'mostra'\) nuovo = store\.patchOverlay\(canale, primo, \{ mostra: true \}\)/, 'il verbo tocca solo lo schermo');
  const testi = corpo('function carteContatori()') + corpo('async function caricaContatori()');
  assert.doesNotMatch(testi, /da 0|from 0|desde 0|en 0 y/i, 'nessuna promessa di ripartire da zero');
});

// Il riassunto di un modulo («… → azzera "morti"») legge l'azione con i nomi
// dei campi che l'editor scrive e il motore esegue: `op`, non `operazione`.
function riassunto() {
  const fn = corpo('function riassuntoAzione(a)');
  return new Function('L', 'Lv', 'esc', 'nomeMonetaUI', `${fn}; return riassuntoAzione;`)(
    (it) => it, (v) => v[0], (x) => String(x), () => 'monete');
}

test('il riassunto dell\'azione contatore dice l\'operazione scelta nell\'editor', () => {
  const editor = corpo('function leggiAzioneRiga(riga)');
  assert.match(editor, /case 'contatore': return \{\s*tipo, nome: [^}]*op: v\('op'\)/, 'l\'editor salva `op`');
  assert.match(leggi('src/features/modules.js'), /azione\.op === 'azzera'/, 'il motore legge `op`');
  const r = riassunto();
  assert.match(r({ tipo: 'contatore', nome: 'morti', op: 'azzera' }), /azzera/i);
  assert.match(r({ tipo: 'contatore', nome: 'morti', op: 'imposta', valore: 7 }), /imposta[^\n]*7/i);
  assert.doesNotMatch(r({ tipo: 'contatore', nome: 'morti', op: 'incrementa' }), /azzera|imposta/i);
});

// «Salva i comandi» c'e' due volte: nella scheda Comandi (tutti i comandi) e in
// Giochi (i comandi dei giochi). Legge solo la lista della sua carta, e dice al
// server quali righe aveva davanti: una scelta riportata al valore di base in
// una lista non viene piu' coperta dalla riga dell'altra.
function rigaFinta(id, { on = true, nome = '', chi = 'tutti' } = {}) {
  const campi = { '[data-gc-on]': { checked: on }, '[data-gc-nome]': { value: nome }, '[data-gc-chi]': { value: chi } };
  return { dataset: { gc: id }, querySelector: (q) => campi[q] || null };
}
function listaFinta(righe) {
  return { querySelectorAll: (q) => (q === '.gc-riga' ? righe : []) };
}

test('«Salva i comandi» manda solo le righe della sua lista, e quali erano', async () => {
  const comandi = listaFinta([rigaFinta('slot'), rigaFinta('so', { nome: 'grida' })]);
  const giochi = listaFinta([rigaFinta('slot', { on: false })]);
  const carta = (ul) => ({ querySelector: (q) => (q === '.gc-lista' ? ul : null) });
  const tasto = (ul) => ({ closest: (q) => (q === '.carta' ? carta(ul) : null) });
  const mandati = [];
  const documento = { querySelectorAll: () => [...comandi.querySelectorAll('.gc-riga'), ...giochi.querySelectorAll('.gc-riga')] };
  const salva = new Function('document', 'api', 'toast', 'caricaGiochiComandi', 'L',
    `${corpo('async function salvaGiochiComandi(')}; return salvaGiochiComandi;`)(
    documento, async (url, o) => { mandati.push(o.body); return {}; }, () => {}, () => {}, (it) => it);

  await salva({ currentTarget: tasto(comandi) });
  assert.deepEqual(mandati[0].comandi, { so: { nome: 'grida' } }, 'lo slot riacceso non viene coperto dalla lista dei giochi');
  assert.deepEqual(mandati[0].ids, ['slot', 'so']);
  await salva({ currentTarget: tasto(giochi) });
  assert.deepEqual(mandati[1], { comandi: { slot: { off: true } }, ids: ['slot'] });

  const SRV = leggi('src/web/server.js');
  const rotta = SRV.slice(SRV.indexOf("app.post('/api/streamer/comandi-pronti'"), SRV.indexOf("app.get('/api/streamer/giochi'"));
  assert.match(rotta, /unisciComandi\(s\?\.settings\?\.comandi, req\.body\?\.comandi, req\.body\.ids\)/, 'il server cambia solo le righe mandate');
});

// I PERCORSI CHE IL PANNELLO INDICA ESISTONO. L'editor dei moduli e la pagina di
// ascolto mandavano in schede che non ci sono piu' («Diretta → Comandi a voce»,
// «Panoramica → permessi»). Ogni pezzo di un percorso deve essere il nome di un
// gruppo, di una famiglia o di una scheda del menu di oggi, e il primo un gruppo.
function oggetto(nome) {
  const i = APP.indexOf(`const ${nome} = {`);
  assert.ok(i >= 0, `manca ${nome}`);
  let d = 0;
  for (let j = APP.indexOf('{', i); j < APP.length; j++) {
    if (APP[j] === '{') d++;
    else if (APP[j] === '}') { d--; if (!d) return new Function(`return (${APP.slice(APP.indexOf('{', i), j + 1)})`)(); }
  }
  return {};
}

test('i percorsi dell\'editor dei moduli e della pagina di ascolto sono quelli del menu', () => {
  // i nomi in tutte e tre le lingue: l'editor parla la lingua del pannello
  const gruppi = new Set(Object.values(oggetto('T_GRUPPO')).flat());
  const nomi = new Set([...gruppi, ...Object.values(oggetto('T_SCHEDA')).flat(), ...Object.values(oggetto('FAM_ETI')).flat(),
    ...[...APP.matchAll(/\{ id: '[a-z]+', nome: '([^']+)', parti: \[/g)].map((m) => m[1])]);
  const pulito = (x) => x.replace(/&amp;/g, '&').replace(/<[^>]+>/g, '').trim();
  const percorsi = [];
  const dove = corpo('function disegnaCampiQuando(t)') + corpo('function disegnaCampiAzione(a)');
  for (const m of dove.matchAll(/<strong>([^<]*→[^<]*)<\/strong>/g)) {
    // dentro L() ci sono le tre lingue: ognuna e' un percorso
    if (/\$\{L\(/.test(m[1])) percorsi.push(...[...m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((x) => x[1]));
    else percorsi.push(m[1]);
  }
  const VOCE = leggi('src/web/public/voce.js');
  for (const m of VOCE.matchAll(/([A-Za-zÀ-ÿ&; ]+(?: → [A-Za-zÀ-ÿ&; ]+)+)/g)) percorsi.push(m[1]);
  assert.ok(percorsi.length >= 6, `i percorsi si leggono (${percorsi.length})`);
  for (const p of percorsi) {
    const pezzi = p.split('→').map(pulito);
    // il primo pezzo e' la fine della frase che lo porta («… da Chat e pubblico»)
    pezzi[0] = [...gruppi].find((g) => pezzi[0].endsWith(g)) || pezzi[0];
    assert.ok(gruppi.has(pezzi[0]), `«${p}»: «${pezzi[0]}» non e' un gruppo del menu`);
    for (const x of pezzi) assert.ok(nomi.has(x), `«${p}»: «${x}» non e' nel menu`);
  }
});

// Il giro della scheda Comandi vocali: il passo sul microfono punta al tasto che
// apre la pagina di ascolto, non all'interruttore dei momenti salienti (che e'
// l'ascolto del server e col microfono non c'entra).
test('il passo sul microfono punta al tasto che apre l\'ascolto vocale', () => {
  const i = APP.indexOf('const GUIDE = {');
  const guida = APP.slice(APP.indexOf('  ascolto: {', i), APP.indexOf(']] },', APP.indexOf('  ascolto: {', i)));
  const passo = [...guida.matchAll(/\['([^']*microfono[^']*)', '[^']*', '[^']*', '(#[a-z0-9-]+)'\]/gi)][0];
  assert.ok(passo, 'c\'e\' un passo che parla del microfono');
  const id = passo[2].slice(1);
  assert.match(APP, new RegExp(`<a [^>]*id="${id}"[^>]*href="/voce\\.html"`), `#${id} e' il tasto che apre la pagina di ascolto`);
});

// L'azione «Metti una canzone in coda» dice il piano vero: le richieste
// musicali sono nell'Essenziale, non un add-on.
test('l\'azione musica non manda a comprare un add-on che non serve', async () => {
  const ab = await import('../../src/features/abbonamenti.js');
  const i = corpo('function disegnaCampiAzione(a)');
  const musica = i.slice(i.indexOf("case 'musica':"), i.indexOf("case 'annuncia':"));
  assert.ok(musica.length > 50, 'il blocco si legge');
  assert.doesNotMatch(musica, /add-on/i);
  assert.equal(ab.abilitata(ab.funzioniDi({ tier: 'free' }), 'musica'), true);
  assert.match(musica, /Essenziale/);
});

// CONNETTORI, AZIONE «donazione»: `valuta` e' facoltativa. Senza, il server
// leggeva le impostazioni da una variabile che in quel punto non esiste, e
// rispondeva 500. Si esegue il ramo vero, coi suoi soli ingredienti.
test('una donazione dai connettori senza valuta prende quella del canale', async () => {
  const SRV = leggi('src/web/server.js');
  const i = SRV.indexOf("if (azione === 'donazione') {", SRV.indexOf("app.post('/api/ext/:login'"));
  assert.ok(i > 0, 'il ramo si trova');
  let d = 0, fine = i;
  for (let j = SRV.indexOf('{', i); j < SRV.length; j++) {
    if (SRV[j] === '{') d++;
    else if (SRV[j] === '}') { d--; if (!d) { fine = j + 1; break; } }
  }
  const donazioni = await import('../../src/features/donazioni.js');
  const prova = async (corpo) => {
    const segnate = [];
    let risposta = null;
    const res = { status: () => res, json: (x) => { risposta = x; return res; } };
    const ramo = new Function('req', 'res', 'login', 'donazioni', 'registroDonazioni', 'streamers', 'manager', 'crypto',
      `return (async () => { const azione = 'donazione'; ${SRV.slice(i, fine)} })();`);
    await ramo({ body: { azione: 'donazione', ...corpo } }, res, 'canale', donazioni,
      { segna: (k, v) => { segnate.push(v); return true; } },
      { get: () => ({ settings: { donazioni: { valuta: 'CHF' } } }) },
      { alerts: { donazione: () => {} } }, { randomUUID: () => 'x' });
    return { risposta, segnate };
  };
  const senza = await prova({ importo: 5 });
  assert.deepEqual(senza.risposta, { ok: true });
  assert.equal(senza.segnate[0].valuta, 'CHF', 'senza valuta, quella del canale');
  assert.equal((await prova({ importo: 5, valuta: 'boh' })).segnate[0].valuta, 'CHF', 'una valuta sconosciuta non rompe niente');
  assert.equal((await prova({ importo: 5, valuta: 'usd' })).segnate[0].valuta, 'USD', 'una vera vale');
});

// CONTATORI, «Salva aspetto»: lo sfondo di serie e' nero semitrasparente, ma il
// selettore di colore conosce solo colori pieni, e salvando lo sfondo diventava
// nero pieno. Il colore scelto tiene la trasparenza che lo sfondo aveva, e uno
// sfondo trasparente riacceso riparte da quella di serie, che dice il server.
test('«Salva aspetto» non rende pieno uno sfondo semitrasparente', async () => {
  const { contatori } = await import('../../src/db.js');
  const base = contatori.overlayDi(null);
  assert.match(base.sfondo, /^rgba\([^)]*,\s*0?\.\d+\)$/, 'di serie lo sfondo e\' semitrasparente');
  const { parti, da } = new Function(`${corpo('function _sfondoParti(')}\n${corpo('function _sfondoDa(')}\nreturn { parti: _sfondoParti, da: _sfondoDa };`)();
  const giro = (v, scelto) => { const p = parti(v, base.sfondo); return da(scelto ?? p.hex, p.alfa); };
  assert.equal(giro(base.sfondo), 'rgba(0,0,0,0.55)', 'salvare senza toccare lascia lo sfondo com\'era');
  assert.equal(giro(base.sfondo, '#ff0000'), 'rgba(255,0,0,0.55)', 'cambiare colore tiene la trasparenza');
  assert.equal(giro('#123456'), '#123456', 'un colore pieno resta pieno');
  assert.equal(giro('transparent', '#00ff00'), 'rgba(0,255,0,0.55)', 'riaccendere lo sfondo riparte da quello di serie');
  const { puliConta } = await import('../../src/web/stile.js');
  assert.equal(puliConta({ sfondo: giro(base.sfondo, '#ff0000') }).sfondo, 'rgba(255,0,0,0.55)', 'e il server lo accetta');

  const carica = corpo('async function caricaContatori()');
  assert.match(carica, /data-ovk="sfondo" data-alfa="\$\{sf\.alfa\}"/, 'il selettore si porta dietro la trasparenza');
  assert.match(carica, /sfondo: g\('trasp'\)\.checked \? 'transparent' : _sfondoDa\(g\('sfondo'\)\.value, Number\(g\('sfondo'\)\.dataset\.alfa\)\)/, 'e il salvataggio la usa');
  assert.match(leggi('src/web/server.js'), /res\.json\(\{ contatori: list, base: contatori\.overlayDi\(null\) \}\)/, 'la base la dice il server');
});

// «ASPETTA»: il campo accettava fino a 60 secondi e il motore si fermava a 30.
// Adesso il numero e' uno, nel motore: il server lo manda al pannello con
// l'elenco dei moduli e rifiuta quello che lo supera. Lo stesso per quanto resta
// a schermo un testo sull'overlay.
test('«Aspetta» e il testo sull\'overlay hanno i limiti del motore, letti dal motore', async () => {
  const { LIMITI_AZIONI } = await import('../../src/features/modules.js');
  const MOT = leggi('src/features/modules.js');
  assert.match(MOT, /Math\.min\(MAX_ATTESA_S, Number\(azione\.secondi\)/, 'il motore si ferma al suo numero');
  assert.match(MOT, /Math\.max\(TESTO_MIN_MS, Math\.min\(TESTO_MAX_MS, Number\(azione\.durata\)/);
  assert.deepEqual(LIMITI_AZIONI, { attesaS: 30, testoMinMs: 500, testoMaxMs: 30000 }, 'i numeri che dice il manuale');
  const SRV = leggi('src/web/server.js');
  assert.match(SRV, /limiti: LIMITI_AZIONI,/, 'arrivano al pannello con l\'elenco dei moduli');
  assert.match(SRV, /a\.tipo === 'attendi' && Number\(a\.secondi\) > LIMITI_AZIONI\.attesaS/, 'e il server non salva di piu\'');
  const campi = corpo('function disegnaCampiAzione(a)');
  const aspetta = campi.slice(campi.indexOf("case 'attendi':"), campi.indexOf("case 'overlayTesto':"));
  assert.doesNotMatch(aspetta, /max="\d/, 'nessun massimo scritto a mano');
  assert.match(aspetta, /datiModuli\?\.limiti\?\.attesaS/);
  const testo = campi.slice(campi.indexOf("case 'overlayTesto':"), campi.indexOf("case 'regia':"));
  assert.doesNotMatch(testo, /m(in|ax)="\d/);
  assert.match(testo, /lim\.testoMaxMs/);
});

// La carta «Comando vocale» diceva «Funziona su Chrome o Edge», ma la pagina di
// ascolto ha anche il motore locale per i browser che il riconoscimento non ce
// l'hanno: la carta dice tutti e due.
test('la carta del comando vocale dice anche del motore locale', () => {
  const VOCE = leggi('src/web/public/voce.js');
  assert.match(VOCE, /function passaALocale\(/, 'la pagina ripiega sul motore locale');
  const pannello = corpo('function pannelloAscolto()');
  const carta = pannello.slice(pannello.indexOf('ICO.voce'), pannello.indexOf('ICO.giochi'));
  assert.doesNotMatch(carta, /Funziona su Chrome o Edge/);
  assert.match(carta, /motore locale/);
});

// L'EDITOR DEI MODULI PARLA LA LINGUA DEL PANNELLO. Era rimasto tutto in
// italiano: gli inneschi, le azioni, gli eventi, le etichette dei campi, i
// riassunti, «Prova/Modifica/Elimina», le sottoschede. Qui si legge il testo
// che si vede (fra i tag, e in placeholder, title e aria-label) e non se ne
// accetta uno scritto fuori da L().
function fineStringa(s, i) {
  const q = s[i];
  for (let k = i + 1; k < s.length; k++) {
    if (s[k] === '\\') { k++; continue; }
    if (q === '`' && s[k] === '$' && s[k + 1] === '{') { k = fineGruppo(s, k + 1); continue; }
    if (s[k] === q) return k;
  }
  return s.length;
}
function fineGruppo(s, i) {
  let prof = 0;
  for (let k = i; k < s.length; k++) {
    const c = s[k];
    if (c === "'" || c === '"' || c === '`') { k = fineStringa(s, k); continue; }
    if (c === '(' || c === '[' || c === '{') prof++;
    else if (c === ')' || c === ']' || c === '}') { prof--; if (prof === 0) return k; }
  }
  return s.length;
}
// Il testo che si legge in un pezzo di pagina: fra i tag, e negli attributi che
// si vedono. Il codice (<code>, $variabili, !comandi, indirizzi) non e' lingua.
function siVede(html) {
  const attr = [...html.matchAll(/\b(?:placeholder|title|aria-label)="([^"]*)"/g)].map((m) => m[1]);
  const fra = html.replace(/<code>[\s\S]*?<\/code>/g, ' ').replace(/<[^>]*>/g, ' ').replace(/\b[\w-]+="[^"]*"/g, ' ');
  // un esempio di codice (la chiamata curl dei connettori) non e' lingua
  return [fra.replace(/\bcurl -X[\s\S]*/, ' '), ...attr].map((t) => t.replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/https?:\/\/\S*|[$!/][\w./()|,-]+|\bMic\/Aux\b|\bCONTATORify\b|\bCONSOLify\b/g, ' '))
    .filter((t) => /[A-Za-zÀ-ÿ]{2,}/.test(t));
}
function fuoriDaL(s) {
  const trovate = [];
  for (let k = 0; k < s.length; k++) {
    if (/\bLv?\($/.test(s.slice(Math.max(0, k - 2), k + 1)) && !/[\w$.]/.test(s[k - (s[k - 1] === 'v' ? 3 : 2)] || '')) { k = fineGruppo(s, k); continue; }
    if (s[k] === '(' && /\.[A-Za-z_$][\w$]*$/.test(s.slice(0, k))) { k = fineGruppo(s, k); continue; }
    const c = s[k];
    if (c !== "'" && c !== '"' && c !== '`') continue;
    const fine = fineStringa(s, k);
    const prima = s.slice(0, k).trimEnd();
    const dopo = s.slice(fine + 1).trimStart();
    const confronto = /(===|!==|==|!=|\bcase)$/.test(prima) || /^(===|!==|==|!=)/.test(dopo);
    const corpo = s.slice(k + 1, fine);
    if (c === '`') {
      let fisso = '';
      for (let j = 0; j < corpo.length; j++) {
        if (corpo[j] === '\\') { j++; continue; }
        if (corpo[j] === '$' && corpo[j + 1] === '{') {
          const f = fineGruppo(corpo, j + 1);
          trovate.push(...fuoriDaL(corpo.slice(j + 2, f)));
          fisso += ' ';
          j = f;
          continue;
        }
        fisso += corpo[j];
      }
      trovate.push(...siVede(fisso));
    } else if (!confronto && (/[A-Za-zÀ-ÿ]{2,} [A-Za-zÀ-ÿ]{2,}/.test(corpo) || /^[A-ZÀ-Ý][a-zà-ÿ]+/.test(corpo) || /^<[^>]+>[^<]*[A-Za-zÀ-ÿ]{2,}/.test(corpo))) {
      trovate.push(...siVede(corpo));
    }
    k = fine;
  }
  return trovate;
}

test('il cancello della lingua vede quello che deve vedere', () => {
  assert.deepEqual(fuoriDaL("`<label class=\"campo\">Nome contatore</label>`"), [' Nome contatore ']);
  assert.deepEqual(fuoriDaL("`<input placeholder=\"es. Ciao\" value=\"${x}\">`"), ['es. Ciao']);
  assert.deepEqual(fuoriDaL("`<label>${L('Nome', 'Name', 'Nombre')}</label>`"), []);
  assert.deepEqual(fuoriDaL("return 'invia un messaggio';"), ['invia un messaggio']);
  assert.deepEqual(fuoriDaL("a.op === 'porta via' ? `<code>$user</code>` : ''"), []);
  assert.deepEqual(fuoriDaL("[['primary', 'Predefinito (viola)']]"), ['Predefinito (viola)']);
});

test('l\'editor dei moduli, la sua lista e i connettori passano tutti da L()', () => {
  const fuori = [];
  for (const f of ['function riassuntoModulo(', 'function riassuntoQuando(', 'function riassuntoSe(', 'function riassuntoAzione(',
    'function _quantiModulo(', 'async function caricaModuli(', 'function disegnaListaModuli(', 'function apriEditor(',
    'function disegnaCampiQuando(', 'function disegnaAzione(', 'function disegnaCampiAzione(', 'function gestisciClicEditor(',
    'function disegnaConnettori(', 'function sottoSchedeHtml(']) {
    for (const p of fuoriDaL(corpo(f))) fuori.push(`${f.replace(/^(async )?function /, '')}: «${p.trim().slice(0, 60)}»`);
  }
  assert.deepEqual(fuori, [], 'testi scritti fuori da L()');
  const voci = (nome) => {
    const i = APP.indexOf(`const ${nome} = [`);
    return new Function(`return ${APP.slice(APP.indexOf('[', i), APP.indexOf('\n];', i) + 2)}`)();
  };
  for (const nome of ['EVENTI', 'TRIGGER', 'AZIONI']) {
    for (const v of voci(nome)) assert.equal(v.filter((x) => typeof x === 'string' && x.trim()).length, 4, `${nome}: «${v[1]}» in tre lingue`);
  }
  for (const nome of ['EVENTI_TXT', 'SCALA_EVENTO']) {
    for (const [k, v] of Object.entries(oggetto(nome))) assert.ok(Array.isArray(v) && v.length === 3, `${nome}.${k} in tre lingue`);
  }
  const sotto = oggetto('SOTTO_SCHEDE');
  for (const [, v] of Object.values(sotto).flatMap((x) => x.voci)) assert.ok(Array.isArray(v) || /^[A-Z]+ify$/.test(v), `sottoscheda «${v}» in tre lingue`);
});
