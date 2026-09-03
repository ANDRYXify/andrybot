// TUTTO QUELLO CHE COMPARE NELL'OVERLAY E' UN ELEMENTO DELLA SCENA.
//
// Prima non era cosi': alert, chat e i due widget erano elementi — si
// accendevano, si spostavano, si vestivano dallo stesso posto — mentre i
// contatori vivevano per conto loro (posizione e colori propri, nessun
// interruttore nell'elenco) e l'obiettivo non esisteva. Due sistemi per mettere
// roba sulla stessa tela.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const APP = leggi('src/web/public/app.js');
const OVL = leggi('src/web/public/overlay-app.js');
const SKIN = leggi('src/web/public/overlay-skin.css');
const SRV = leggi('src/web/server.js');

const listaDi = (testo, nome) => {
  const m = testo.match(new RegExp('const ' + nome + ' = \\[([^\\]]*)\\]'));
  assert.ok(m, `c'è l'elenco ${nome}`);
  const fuori = [];
  for (const pezzo of m[1].split(',')) {
    const q = pezzo.match(/'([a-z]+)'/);
    if (q) { fuori.push(q[1]); continue; }
    const sparso = pezzo.match(/\.\.\.([A-Z_]+)/);
    if (sparso) fuori.push(...listaDi(testo, sparso[1]));
  }
  return fuori;
};

test('l’elenco degli elementi e quello che l’overlay mostra dicono le stesse cose', () => {
  const i = APP.indexOf('<div class="ovl-elementi">');
  const elenco = APP.slice(i, APP.indexOf('</div>', i));
  const nel = [...elenco.matchAll(/ovlElemento\('([a-z]+)'/g)].map((m) => m[1]);
  const cliente = listaDi(APP, 'ELEM_OVL');
  const servo = listaDi(SRV, 'ELEM_OVERLAY');
  assert.deepEqual([...nel].sort(), [...cliente].sort(), 'stessi elementi nel pannello e nella pagina');
  assert.deepEqual([...cliente].sort(), [...servo].sort(), 'stessi elementi di qua e di là dal filo');
  for (const k of ['alert', 'chat', 'wf', 'ws', 'effetti', 'cont', 'goal']) {
    assert.ok(nel.includes(k), `c'è «${k}»`);
  }
});

// Il difetto vero: l'occhio di «Obiettivo» e «Contatori» si spegneva e al
// ricaricamento tornava acceso, perché chi ripuliva gli overlay in arrivo
// copiava a mano quattro chiavi su sette e buttava via le altre due.
test('quel che spegni nell’elenco resta spento anche dopo il salvataggio', () => {
  const i = SRV.indexOf('const puliti = arr.slice(0, 12)');
  const corpo = SRV.slice(i, SRV.indexOf('css:', i));
  const scritte = [...corpo.matchAll(/\bm\.([a-z]+) !== false/g)].map((m) => m[1]);
  assert.deepEqual(scritte, [], 'nessuna chiave scritta a mano: si passa dall’elenco');
  assert.ok(/ELEM_OVERLAY\.reduce/.test(corpo), 'la lista dei salvati nasce dall’elenco');
});

// Un elemento che l'overlay mostra ma che la scena non conosce non si puo'
// spostare: era il caso degli obiettivi (nati liberi, ma piazzabili solo
// scrivendo numeri in un modulo) e dei contatori.
test('sulla tela dello studio c’è ogni cosa che va in onda', () => {
  const i = APP.indexOf('const ELEMENTI = () =>');
  assert.ok(i > 0, 'la scena ha un elenco solo');
  const corpo = APP.slice(i, APP.indexOf('\nconst ELEM = ', i));
  assert.ok(/goalBozza\(\)\.forEach/.test(corpo), 'un elemento per ogni obiettivo');
  assert.ok(/for \(const c of _conta\)/.test(corpo), 'un elemento per ogni contatore a schermo');
  const fissi = listaDi(APP, 'FISSI');
  assert.deepEqual(fissi, ['alert', 'chat', 'wf', 'ws'], 'gli altri quattro sono fissi');
  // e nessuno se li riscrive a mano da qualche altra parte
  const copie = [...APP.matchAll(/\['alert', 'chat', 'wf', 'ws'/g)];
  assert.equal(copie.length, 1, 'l’elenco dei fissi è scritto una volta sola');
});

// Se lo studio posa un elemento in un punto e l'overlay in un altro, la tela
// mente: gli angoli devono essere gli stessi margini della pagina in onda.
test('lo studio posa gli angoli dove li posa l’overlay', () => {
  const html = leggi('src/web/public/overlay.html');
  const box = html.match(/\.wbox\.alto-destra\s*\{([^}]*)\}/)[1];
  assert.ok(/top:\s*3vh/.test(box) && /right:\s*2vw/.test(box), 'l’overlay usa 3vh/2vw');
  const anc = APP.match(/const ANCORA = \{([\s\S]*?)\n\};/)[1];
  assert.ok(/'alto-destra':\s*\{ right: '2%', top: '3%' \}/.test(anc), 'e lo studio 3%/2%');
  assert.ok(/'basso-sinistra':\s*\{ left: '2%', bottom: '3%' \}/.test(anc), 'in tutti e quattro gli angoli');
});

// I contatori si ancoravano "a terzi" (sotto il 33% a sinistra, sopra il 67% a
// destra): trascinandone uno attraverso quella soglia saltava. Ora seguono la
// stessa regola di tutti gli altri, quindi la tela e l'overlay coincidono.
test('un contatore trascinato non salta quando passa il centro', () => {
  const i = OVL.indexOf('function contatore(');
  const corpo = OVL.slice(i, OVL.indexOf('\n}', i));
  assert.ok(!/x <= 33|y <= 33/.test(corpo), 'niente scatti a terzi');
  assert.ok(/translate\(-' \+ x \+ '%,-' \+ y \+ '%\)/.test(corpo), 'stessa regola dello studio');
});

test('anche i contatori si spengono dall’elenco, e si vestono come gli altri', () => {
  const i = OVL.indexOf('function contatore(');
  const corpo = OVL.slice(i, OVL.indexOf('\n}', i));
  assert.ok(corpo.includes("mostra('cont')"), 'seguono l’interruttore della scena');
  assert.ok(corpo.includes('ovl-widget'), 'e la veste degli altri elementi');
  assert.ok(corpo.includes("setProperty('--fg'"), 'quel che imposti a mano continua a vincere');
});

test('gli obiettivi sono elementi come gli altri, e sono quanti ne vuoi', () => {
  const i = OVL.indexOf('function unGoal(');
  const corpo = OVL.slice(i, OVL.indexOf('\n}', i));
  assert.ok(corpo.includes("mostra('goal')"), 'si spengono tutti dall’elenco della scena');
  assert.ok(corpo.includes('cfg.attivo'), 'e ognuno ha il suo interruttore');
  assert.ok(corpo.includes('cfg.xy'), 'ognuno si mette dove vuole');
  assert.ok(corpo.includes('classiIdentita'), 'con la sua veste');
  assert.ok(corpo.includes('cfg.posizione'), 'o nel suo angolo');
  assert.ok(corpo.includes('Math.min(100'), 'la barra non supera il traguardo');
  const g = OVL.slice(OVL.indexOf('function goal('), OVL.indexOf('\n}', OVL.indexOf('function goal(')));
  assert.ok(g.includes('for (const g of'), 'si disegnano tutti');
  assert.ok(g.includes('vivi.has(id)'), 'e quello che togli sparisce davvero');
});

// Un obiettivo «1000 follower» non e' «altri mille»: se ne hai gia' 450 la
// barra deve partire da li'. Il conto degli eventi resta quello vero; la
// partenza e' il gradino sotto, e si prende da Twitch con un tasto.
test('un obiettivo può partire da dove sei già arrivato', () => {
  const st = leggi('src/web/stile.js');
  const g = st.slice(st.indexOf('export const normGoal'), st.indexOf('export const normGoals'));
  assert.ok(/partenza: clampInt\(g\.partenza/.test(g), 'la partenza si salva con l’obiettivo');
  const u = OVL.slice(OVL.indexOf('function unGoal('), OVL.indexOf('\n}', OVL.indexOf('function unGoal(')));
  assert.ok(/cfg\.partenza/.test(u), 'e l’overlay la somma a quel che ha contato');
  assert.ok(/quantiFollower/.test(leggi('src/twitch/helix.js')), 'il numero vero si chiede a Twitch');
  assert.ok(/data-g-adesso/.test(APP), 'e c’è il tasto per prenderlo');
});

// Il player e il conto alla rovescia sono elementi della scena come gli altri:
// se entrano dalla porta di servizio, si portano dietro un secondo modo di
// mettere roba a schermo — che e' il difetto da cui siamo partiti.
test('player e conto alla rovescia entrano dalla stessa porta degli altri', () => {
  const cliente = listaDi(APP, 'ELEM_OVL');
  for (const k of ['musica', 'timer']) assert.ok(cliente.includes(k), `${k} è nell’elenco`);
  const i = APP.indexOf('const ELEMENTI = () =>');
  const corpo = APP.slice(i, APP.indexOf('\nconst ELEM = ', i));
  assert.ok(/k: 'musica'/.test(corpo) && /k: 'timer'/.test(corpo), 'e nella scena dello studio');
  const m = OVL.slice(OVL.indexOf('function disegnaMusica('), OVL.indexOf('\n}', OVL.indexOf('function disegnaMusica(')));
  assert.ok(/mostra\('musica'\)/.test(m), 'il player segue l’interruttore della scena');
  assert.ok(/classiIdentita/.test(m), 'e porta la veste degli altri');
  const t = OVL.slice(OVL.indexOf('function disegnaTimer('), OVL.indexOf('\n}', OVL.indexOf('function disegnaTimer(')));
  assert.ok(/mostra\('timer'\)/.test(t) && /classiIdentita/.test(t), 'idem il conto alla rovescia');
});

// Spotify non sa spingere: qualcuno deve chiedere. Se a chiedere fosse il
// server a vuoto, dieci streamer con l'overlay chiuso farebbero comunque
// traffico; e senza cache, dieci sorgenti browser aperte varrebbero dieci
// chiamate. Chiede l'overlay, e la risposta e' in cache.
test('il player non martella Spotify', () => {
  const srv = leggi('src/web/server.js');
  const i = srv.indexOf("app.get('/overlay/:login/musica'");
  assert.ok(i > 0, 'l’endpoint c’è');
  const corpo = srv.slice(i, srv.indexOf('}));', i));
  assert.ok(/if \(c && ora - c\.ts < /.test(corpo), 'che risponde dalla cache prima di chiamare Spotify');
  assert.ok(/chiaveOk\(req\)/.test(corpo), 'e protetto dalla chiave dell’overlay');
  const m = OVL.slice(OVL.indexOf('setInterval(() => {'), OVL.indexOf('function applicaTema'));
  assert.ok(/mostra\('musica'\)/.test(m) && /if \(!vivo\) return;/.test(m),
    'e chi non ha il player in scena non chiede niente');
});

// Il conto alla rovescia non e' un numero che scorre da qualche parte: e'
// l'ISTANTE in cui scade. Chi lo mostra fa la sottrazione — cosi' due sorgenti
// aperte dicono la stessa cosa e un riavvio non lo azzera.
test('il player balla sul battito vero del brano', () => {
  const sp = leggi('src/features/spotify.js');
  assert.ok(/export async function battito\(/.test(sp), 'il battito si chiede a Spotify');
  assert.ok(/audio-features/.test(sp), 'dall’endpoint delle caratteristiche');
  const i = OVL.indexOf('function battitoDelBrano(');
  assert.ok(i > 0, 'e l’overlay lo usa');
  const corpo = OVL.slice(i, OVL.indexOf('\n}', i));
  assert.ok(/60 \/ Math\.max/.test(corpo), 'la durata di una battuta viene dai BPM');
  assert.ok(/battito-fase/.test(corpo) && /% dur/.test(corpo), 'e la fase da dove sei nel brano');
  const skin = leggi('src/web/public/overlay-skin.css');
  assert.ok(/animation-delay: var\(--battito-fase/.test(skin), 'il ritardo negativo mette in fase l’animazione');
});

test('il conto alla rovescia è un istante, non un contatore', () => {
  const al = leggi('src/features/alerts.js');
  const i = al.indexOf('impostaTimer(channel, minuti) {');
  assert.ok(i > 0, 'c’è impostaTimer');
  const corpo = al.slice(i, al.indexOf('\n  }', i));
  assert.ok(/Date\.now\(\) \+ m \* 60000/.test(corpo), 'si scrive quando scade');
  assert.ok(/overlayStato/.test(corpo), 'nello stato del canale, quindi sopravvive a un riavvio');
  assert.ok(!/setInterval|setTimeout/.test(corpo), 'e nessun orologio da tenere acceso sul server');
});

test('un’opacità senza unità spegnerebbe tutti gli sfondi', () => {
  // Il difetto: --op: 85 (senza %) rende invalido color-mix, e l'elemento resta
  // trasparente. Fuori dalla scatola l'overlay non aveva sfondi: né gli alert,
  // né la chat, né i widget.
  const nude = [...SKIN.matchAll(/--op:\s*(\d+)\s*;/g)].map((m) => m[0]);
  assert.deepEqual(nude, [], 'ogni opacità porta il suo %');
  assert.ok(/--op:\s*\d+%;/.test(SKIN), 'e le percentuali ci sono');
});

test('l’overlay non veste i colori di un’altra azienda', () => {
  assert.ok(!/#9146ff|145,\s*70,\s*255/i.test(SKIN), 'niente viola di Twitch nella pelle');
  assert.ok(!/#9146ff|145,\s*70,\s*255/i.test(leggi('src/web/public/overlay.html')), 'né nella pagina');
});
