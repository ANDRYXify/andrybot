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
  assert.ok(/_mostraDiOverlay\(m\)/.test(corpo), 'la lista dei salvati la costruisce una funzione sola');
  const fn = SRV.slice(SRV.indexOf('const _mostraDiOverlay ='), SRV.indexOf('const _xyDiOverlay'));
  assert.ok(/ELEM_OVERLAY\.reduce/.test(fn), 'e nasce dall’elenco delle famiglie');
  assert.ok(/CHIAVE_EL\.test\(k\)/.test(fn), 'più le singole voci, con la chiave di sempre');
  assert.ok(/m\[k\] === false/.test(fn), 'si scrive solo il «no»: quel che non c’è compare');
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
  const anc = APP.match(/const ANCORA = \{([\s\S]*?)\n\};/)[1];
  const tab = {};
  for (const [, nome, x, y] of anc.matchAll(/'?([a-z-]+)'?:\s*\{ x: (-?[\d.]+), y: (-?[\d.]+) \}/g)) tab[nome] = { x: +x, y: +y };
  assert.equal(Object.keys(tab).length, 7, 'i sette ancoraggi stanno in una tabella sola');
  for (const ang of ['alto-sinistra', 'alto-destra', 'basso-sinistra', 'basso-destra']) {
    const box = html.match(new RegExp('\\.wbox\\.' + ang + '\\s*\\{([^}]*)\\}'))[1];
    const a = tab[ang];
    assert.ok(a, ang + ' c’è anche nello studio');
    const oriz = a.x <= 50 ? ['left', a.x] : ['right', 100 - a.x];
    const vert = a.y <= 50 ? ['top', a.y] : ['bottom', 100 - a.y];
    assert.ok(new RegExp(oriz[0] + ':\\s*' + oriz[1] + 'vw').test(box), ang + ': ' + oriz[0] + ' uguale nei due');
    assert.ok(new RegExp(vert[0] + ':\\s*' + vert[1] + 'vh').test(box), ang + ': ' + vert[0] + ' uguale nei due');
  }
});

// Lo scarto di un angolo era scritto due volte: in ANCORA come CSS e in
// _cornerXY come percentuali a mano, che dicevano dieci punti piu' in dentro.
test('lo scarto di un angolo è scritto una volta sola', () => {
  assert.ok(/function _cornerXY\(c\) \{ const a = ANCORA\[c\]/.test(APP), '_cornerXY legge ANCORA');
  assert.ok(!/'alto-sinistra': \{ x: 13/.test(APP), 'e non ha piu’ una tabella sua');
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
  assert.ok(/posaElemento\(el, 'goal:' \+ id, cfg\)/.test(corpo), 'ognuno si mette dove vuole, con la sua chiave');
  assert.ok(corpo.includes('classiIdentita'), 'con la sua veste');
  assert.ok(corpo.includes('cfg.posizione'), 'o nel suo angolo');
  assert.ok(/Math\.min\(1,\s*\(ora \/ meta\)/.test(corpo), 'la barra non supera il traguardo');
  assert.ok(corpo.includes("setProperty('--q'"), 'e si riempie con una scala, non con la larghezza');
  const g = OVL.slice(OVL.indexOf('function goal('), OVL.indexOf('\n}', OVL.indexOf('function goal(')));
  assert.ok(g.includes('for (const g of'), 'si disegnano tutti');
  assert.ok(g.includes('vivi.has(id)'), 'e quello che togli sparisce davvero');
});

// Un obiettivo «1000 follower» non e' «altri mille»: se ne hai gia' 450 la
// barra deve partire da li'. Il conto degli eventi resta quello vero; la
// partenza e' il gradino sotto.
//
// E non e' un tasto da premere una volta: un tasto lascia una FOTOGRAFIA, che
// il giorno dopo e' gia' vecchia. E' una spunta che resta, e il server tiene la
// partenza allineata al numero vero — togliendo gli eventi gia' contati, cosi'
// «partenza + contati» resta il numero vero e l'overlay non cambia formula.
test('un obiettivo può partire da dove sei già arrivato', () => {
  const st = leggi('src/web/stile.js');
  const g = st.slice(st.indexOf('export const normGoal'), st.indexOf('export const normGoals'));
  assert.ok(/partenza: clampInt\(g\.partenza/.test(g), 'la partenza si salva con l’obiettivo');
  assert.ok(/daVivo: g\.daVivo === true/.test(g), 'e la spunta si salva con lui: non vive nella sessione');
  const u = OVL.slice(OVL.indexOf('function unGoal('), OVL.indexOf('\n}', OVL.indexOf('function unGoal(')));
  assert.ok(/cfg\.partenza/.test(u), 'e l’overlay la somma a quel che ha contato');
  assert.ok(!/daVivo/.test(u), 'l’overlay non deve nemmeno sapere che la spunta esiste');
  assert.ok(/quantiFollower/.test(leggi('src/twitch/helix.js')), 'il numero vero si chiede a Twitch');
  assert.ok(/type="checkbox" data-g="daVivo"/.test(APP), 'nel pannello è una spunta, non un tasto');
  assert.ok(!/data-g-adesso/.test(APP), 'e il vecchio tasto una-tantum non c’è più');
  const srv = leggi('src/web/server.js');
  const r = srv.slice(srv.indexOf('async function rinfrescaGoalVivi'), srv.indexOf('\n  }', srv.indexOf('async function rinfrescaGoalVivi')));
  assert.ok(r.length > 100, 'il server sa riallineare la partenza');
  assert.ok(/quanti - letto\.allora/.test(r), 'togliendo gli eventi già contati, sennò conterebbe due volte');
  // E togliendo quelli di QUANDO la lettura fu presa, non quelli di adesso: il
  // numero vero sta in cache, gli eventi no. Mescolare i due istanti faceva
  // TORNARE INDIETRO la barra di tanti quanti erano arrivati nel frattempo.
  assert.ok(/allora: Number\(contiOra\)/.test(srv),
    'la lettura si porta dietro il conteggio del suo istante');
  assert.ok(!/quanti - \(Number\(conti\[g\.id\]\)/.test(r),
    'non si sottrae il conteggio di adesso da una lettura vecchia');
  assert.ok(/await rinfrescaGoalVivi\(login\)/.test(srv), 'e lo fa quando l’overlay chiede il suo tema');
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

// Le forme spigolose (angolo tagliato, insegna, esagono, nastro, fumetto) non
// sono un border-radius: sono un clip-path sugli pseudo-elementi. Un box-shadow
// sull'elemento non lo sa, e disegna l'ombra di un RETTANGOLO: negli angoli
// tagliati compariva un triangolo con l'ombra ma senza il widget — su fondo
// chiaro sembrava un buco bianco. L'ombra deve seguire quello che si dipinge
// davvero, e drop-shadow lo fa.
test('l’ombra segue la forma, anche quando la forma ha gli angoli tagliati', () => {
  const i = SKIN.indexOf('.alert-card, .chat-riga, .ovl-widget {');
  assert.ok(i > 0, 'c’è il blocco comune delle tre vesti');
  const comune = SKIN.slice(i, SKIN.indexOf('}', i));
  assert.ok(/filter: drop-shadow/.test(comune), 'l’ombra è un drop-shadow');
  const j = SKIN.indexOf('.ovl-widget {');
  const widget = SKIN.slice(j, SKIN.indexOf('}', j));
  assert.ok(!/box-shadow:\s*(?!inset)/.test(widget), 'e nessuna ombra rettangolare sul widget');
  assert.ok(/--sagoma: polygon/.test(SKIN), 'le forme spigolose ci sono davvero');
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

// Un overlay E' un layout: ogni cosa che ci compare ha la SUA posizione qui, e
// non quella di un altro overlay. Prima ov.xy teneva solo i quattro fissi,
// quindi player, conto alla rovescia, obiettivi e contatori avevano una
// posizione sola per tutto il canale: li spostavi in un overlay e ti seguivano.
test('la posizione di un elemento appartiene all’overlay in cui la metti', () => {
  const posa = OVL.slice(OVL.indexOf('function posaElemento('), OVL.indexOf('\n}', OVL.indexOf('function posaElemento(')));
  assert.ok(/MIO\.xy\[chiave\]/.test(posa), 'la posizione di questo overlay viene prima');
  assert.ok(/\|\| \(cfg && cfg\.xy\)/.test(posa), 'e quella di canale resta il punto di partenza');
  // una funzione sola posa tutto: prima le stesse sei righe erano scritte due volte
  assert.equal((OVL.match(/'translate\(' \+ tiraXY\(/g) || []).length, 1,
    'la formula che posa un elemento è scritta una volta sola');
  assert.equal((OVL.match(/const tiraXY = /g) || []).length, 1,
    'e la corsa la calcola una funzione sola');

  // x e y non sono il centro: sono la posizione lungo la CORSA, e la corsa e'
  // quel che avanza della tela una volta tolto il lato VISIBILE, cioe' dopo la
  // Dimensione. Qui non si riconosce una stringa: si prende la funzione dal
  // file, la si esegue e si controlla dove finisce il bordo. Con la formula
  // vecchia (che ignorava la Dimensione) un elemento rimpicciolito non
  // arrivava al bordo e uno ingrandito lo scavalcava.
  const tiraOvl = new Function(/const tiraXY = [^;]+;/.exec(OVL)[0] + ' return tiraXY;')();
  const tiraApp = new Function('const _arr = (n) => Math.round(n * 100) / 100;'
    + /const _tiraXY = [^;]+;/.exec(APP)[0] + ' return _tiraXY;')();
  for (const tela of [1920, 1080]) {
    for (const lato of [140, 823, 1451]) {
      for (const f of [0.3, 0.6, 1, 1.75, 3]) {
        for (const v of [0, 25, 50, 100]) {
          const bordo = (v / 100) * tela + (tiraOvl(v, f) * lato) / 100 + (lato - lato * f) / 2;
          const atteso = (v / 100) * (tela - lato * f);
          assert.ok(Math.abs(bordo - atteso) < 0.5,
            `overlay: lato ${lato} al ${f * 100}% con x=${v} finisce a ${bordo.toFixed(1)} invece che a ${atteso.toFixed(1)}`);
          assert.ok(Math.abs(tiraApp(v, f) / 100 - tiraOvl(v, f) / 100) < 0.02,
            `banco e overlay dicono la stessa cosa (x=${v}, ${f * 100}%)`);
        }
      }
    }
  }
  for (const [chi, chiave] of [['musica', "'musica'"], ['timer', "'timer'"]]) {
    assert.ok(OVL.includes(`vestiElemento(el, cfg, 'nessuna', ${chiave})`), `${chi} passa la sua chiave`);
  }
  assert.ok(/const cmd = String\(d\.comando \|\| ''\)\.toLowerCase\(\)/.test(OVL), 'un contatore ricava la sua chiave dal comando');
  assert.ok(/\(MIO\.xy \|\| \{\}\)\['cont:' \+ cmd\]/.test(OVL), 'e con quella chiede la sua posizione');
  // il server deve accettare quelle chiavi, sennò il salvataggio le butta via
  const srv = leggi('src/web/server.js');
  const re = /const CHIAVE_EL = ([^;]+);/.exec(srv);
  assert.ok(re, 'il server sa che forma ha la chiave di un elemento');
  const chiave = new RegExp(re[1].trim().replace(/^\/|\/i$/g, ''), 'i');
  for (const k of ['alert', 'chat', 'wf', 'ws', 'musica', 'timer', 'goal:g1', 'cont:morti']) {
    assert.ok(chiave.test(k), `${k} passa il salvataggio`);
  }
  for (const k of ['../fuori', 'goal:', 'roba', '__proto__']) {
    assert.ok(!chiave.test(k), `${k} non passa`);
  }
});

// L'occhio dei Livelli dice «compare in QUESTO overlay». Per i quattro fissi era
// gia' cosi'; obiettivi e contatori invece lo toglievano da tutte le scene,
// quindi una scena «solo obiettivo A» e una «solo obiettivo B» non si potevano
// avere. L'interruttore dell'elemento — quello nel pannello — resta di canale:
// due livelli, come per l'alert.
test('un elemento si toglie da una scena senza toglierlo dalle altre', () => {
  const occhio = APP.slice(APP.indexOf('function _occhio(k)'), APP.indexOf('\nfunction seleziona('));
  assert.ok(/_ovMostra\(\)/.test(occhio), 'l’occhio scrive nella scena in cui stai lavorando');
  assert.ok(!/goal\.attivo|overlayCfg\b/.test(occhio), 'e non tocca più l’interruttore di canale');
  const dentro = APP.slice(APP.indexOf('function _inOverlay(k)'), APP.indexOf('let _bozzaEl'));
  assert.ok(/_quiDentro\(k\)/.test(dentro), 'e chi disegna legge la stessa cosa');
  // in diretta: un obiettivo o un contatore tolto da questa scena non si disegna
  assert.ok(/mostra\('goal'\) \|\| !mostra\('goal:' \+ id\)/.test(OVL), 'l’overlay salta un obiettivo tolto da questa scena');
  assert.ok(/mostra\('cont'\) \|\| !mostra\('cont:' \+ cmd\)/.test(OVL), 'e un contatore tolto da questa scena');
});

// LA META E LA MESSA IN SCENA sono due cose, e non stanno nello stesso posto.
//
// Il traguardo di un obiettivo e' UNO e vale per tutti gli overlay: sta in
// `settings.overlayGoals`, non dentro un overlay. Ma il pannello lo faceva
// modificare da dentro il blocco che lo Studio SPOSTA nel riquadro «Proprieta'»
// del singolo overlay — cioe' in un posto che dice «questo elemento, in questa
// scena». Cambiavi il traguardo credendo di toccare una scena, e le toccavi
// tutte. Il dato era gia' giusto; era sbagliato il posto.
test('il traguardo si configura una volta sola, non dentro la scena', () => {
  const d = APP.slice(APP.indexOf('function disegnaGoal('), APP.indexOf('function disegnaVociGoal('));
  const meta = d.slice(d.indexOf('class="goal-meta"'), d.indexOf('</details>'));
  const scena = d.slice(d.indexOf('class="asp-blocco el-blocco goal-vesti"'));

  // La meta: cosa insegui. Sta nella sezione, non in un blocco d'aspetto.
  for (const campo of ['tipo', 'obiettivo', 'partenza', 'daVivo', 'titolo']) {
    assert.ok(meta.includes(`data-g="${campo}"`), `«${campo}» è la meta: va nella sezione degli obiettivi`);
    assert.ok(!scena.includes(`data-g="${campo}"`), `«${campo}» non va nel blocco della singola scena`);
  }
  // La messa in scena: dove sta e come si vede. Quella si', per overlay.
  assert.ok(scena.includes('data-g="posizione"'), 'il «dove» resta per scena');
  assert.ok(scena.includes('data-g="stile.forma"'), 'e l’aspetto pure');
  assert.ok(!meta.includes('data-g="stile.'), 'l’aspetto non va nella meta');

  // E il blocco della meta non dev’essere un `.asp-blocco`, se no lo Studio se
  // lo porta via nel riquadro del singolo overlay e siamo daccapo.
  assert.ok(!/class="[^"]*asp-blocco[^"]*"[^>]*>\s*<label class="campo">\$\{L\('Titolo'/.test(d),
    'la meta non deve stare dentro un blocco d’aspetto');
});
