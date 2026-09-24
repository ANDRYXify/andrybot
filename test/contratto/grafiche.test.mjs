// LE GRAFICHE SOCIAL: le cose che stanno fra le tabelle del pannello, il
// motore delle scene e il server, e che nessuno dei tre puo' dire da solo.
//
// Il ragionamento sta in docs/GRAFICHE.md; le misure sui pixel le fa
// scripts/verifica-grafiche.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');
const APP = leggi('src/web/public/app.js');
const SRV = leggi('src/web/server.js');
const finestra = {};
vm.runInNewContext(leggi('src/web/public/graf-scene.js'), { window: finestra, document: {} });
const SCENE = finestra.SB_SCENE.SCENE;

const T = (() => {
  const i = APP.indexOf('const GR_TEMI = {');
  const j = APP.indexOf('function grafOpzioni(', i);
  assert.ok(i >= 0 && j > i, 'non trovo le tabelle delle grafiche');
  return vm.runInNewContext(`${APP.slice(i, j)}\n({ GR_TEMI, GR_PRONTI, GR_CARATTERI, GR_STILI_TITOLO, GR_STILI_RIGHE, GR_VELOCITA, GR_FORMATI, GR_STORIA })`, { L: (it) => it, document: {}, window: {} });
})();
const HEX = /^#[0-9a-fA-F]{6}$/;

test('ogni tema animato ha la sua scena nel motore, e la sua seconda tinta', () => {
  let animati = 0;
  for (const [id, t] of Object.entries(T.GR_TEMI)) {
    assert.equal(t.nome.length, 3, `${id}: il nome nelle tre lingue`);
    if (!t.anima) continue;
    animati++;
    assert.ok(SCENE[t.anima], `${id}: la scena «${t.anima}» nel motore non c'e'`);
    assert.match(t.acc2, HEX, `${id}: senza seconda tinta`);
  }
  assert.ok(animati >= 14, 'i temi animati ci sono tutti');
  assert.ok(!Object.values(T.GR_TEMI).some((t) => /matrix/i.test(t.nome.join(' '))), 'niente marchi altrui nei nomi');
});

test('ogni stile pronto e\' fatto di scelte che esistono', () => {
  const nomiTemi = new Set(Object.values(T.GR_TEMI).flatMap((t) => t.nome.map((n) => n.toLowerCase())));
  const visti = new Set();
  for (const p of T.GR_PRONTI) {
    assert.ok(!visti.has(p.id), `${p.id} due volte`); visti.add(p.id);
    assert.equal(p.nome.length, 3, `${p.id}: il nome nelle tre lingue`);
    assert.ok(!p.nome.some((n) => nomiTemi.has(n.toLowerCase())), `${p.id}: si chiama come un tema, e sarebbe lo stesso tasto due volte`);
    const c = p.c, tema = T.GR_TEMI[c.tema];
    assert.ok(tema, `${p.id}: il tema «${c.tema}» non c'e'`);
    assert.ok(T.GR_CARATTERI[c.font], `${p.id}: il carattere`);
    assert.ok(T.GR_STILI_TITOLO[c.stileTitolo], `${p.id}: lo stile del titolo`);
    assert.ok(T.GR_STILI_RIGHE[c.stileRighe], `${p.id}: lo stile delle righe`);
    assert.ok(T.GR_VELOCITA[c.velocita], `${p.id}: la velocita'`);
    assert.ok(c.intensita >= 30 && c.intensita <= 100);
    for (const k of ['accento', 'accento2']) assert.ok(c[k] === '' || HEX.test(c[k]), `${p.id}.${k}`);
    for (const [scena, op] of Object.entries(c.op || {})) {
      assert.equal(scena, tema.anima, `${p.id}: opzioni di un'altra scena`);
      for (const [k, v] of Object.entries(op)) {
        const o = SCENE[scena].opzioni.find((x) => x.id === k);
        assert.ok(o, `${p.id}: l'opzione «${k}» la scena non ce l'ha`);
        if (o.tipo === 'si') assert.equal(typeof v, 'boolean');
        else assert.ok(o.voci.some((x) => x[0] === v), `${p.id}: «${v}» non e' una scelta di «${k}»`);
      }
    }
  }
  assert.ok(T.GR_PRONTI.length >= 12);
});

test('il server accetta esattamente le scelte che il pannello offre', () => {
  const r = SRV.slice(SRV.indexOf('if (b.grafiche !== undefined) {'), SRV.indexOf('giorni,', SRV.indexOf('if (b.grafiche !== undefined) {')));
  const elenco = (campo) => {
    const m = new RegExp(`${campo}: tra\\(gr\\.${campo}, \\[([^\\]]+)\\]`).exec(r);
    assert.ok(m, `il server non valida «${campo}»`);
    return m[1].split(',').map((x) => x.trim().replace(/'/g, '')).sort();
  };
  assert.deepEqual(elenco('font'), Object.keys(T.GR_CARATTERI).sort());
  assert.deepEqual(elenco('stileTitolo'), Object.keys(T.GR_STILI_TITOLO).sort());
  assert.deepEqual(elenco('stileRighe'), Object.keys(T.GR_STILI_RIGHE).sort());
  assert.deepEqual(elenco('velocita'), Object.keys(T.GR_VELOCITA).sort());
  assert.deepEqual(elenco('formato'), Object.keys(T.GR_FORMATI).sort());
  assert.match(r, /accento2: \/\^#\[0-9a-fA-F\]\{6\}\$\/\.test/);
  assert.match(r, /intensita: Math\.max\(30, Math\.min\(100/);
  assert.ok(/\bop,/.test(r), 'e le opzioni delle scene');
  assert.ok(Math.max(...Object.keys(T.GR_TEMI).map((id) => id.length)) <= 20, 'il server tiene venti caratteri del nome del tema');
});

test('ogni velocita\' fa un numero intero di giri nella GIF, e GIF e video fanno un giro intero', () => {
  for (const [id, v] of Object.entries(T.GR_VELOCITA)) {
    assert.ok(Number.isInteger(v.vel) && v.vel >= 1, `${id}: la velocita' moltiplica i giri, e i giri devono restare interi`);
    assert.equal(v.durata % 80, 0, `${id}: la GIF va a 12,5 fotogrammi al secondo`);
  }
  assert.match(APP, /const nFrame = animato \? Math\.round\(grafVelocita\(c\)\.durata \/ dt\) : 1;/);
  assert.match(APP, /const dura = grafAnimato\(c\) \? grafVelocita\(c\)\.durata : 4000;/);
});

test('il motore arriva prima del pannello, e i caratteri prima di disegnare', () => {
  const html = leggi('src/web/public/index.html');
  assert.ok(html.indexOf('graf-scene.js') > 0 && html.indexOf('graf-scene.js') < html.indexOf('src="app.js"'));
  for (const f of ['Archivo', 'Instrument Serif', 'Permanent Marker', 'Zen Kaku Gothic New']) assert.ok(leggi('src/web/public/font.css').includes(`font-family: '${f}'`), `${f} non e' servito dal sito`);
  assert.equal([...APP.matchAll(/await grafFontPronti\(\);/g)].length >= 4, true, 'PNG, condividi, GIF e «Manda» aspettano i caratteri');
});

test('niente emoji di serie: il logo e\' l\'iniziale, e il vecchio 🎮 di serie si toglie', () => {
  assert.match(APP, /titolo: '', titoloLive: '', handle: '@' \+ canale, logo: '', logoImg: '',/);
  assert.match(APP, /if \(c\.logo === '\\u\{1F3AE\}'\) c\.logo = '';/);
  assert.ok(!/'🎮  ' \+/.test(APP), 'nella pillola del gioco niente emoji');
});

test('il cancello delle grafiche sta nella catena dei collaudi', () => {
  assert.match(leggi('package.json'), /node scripts\/verifica-grafiche\.mjs/);
});

// La storia di Instagram e' 1080×1920. Una grafica di un'altra forma Instagram
// la ingrandisce fino a riempire lo schermo e ne taglia i lati: e' successo, e
// dalla settimana restava «LINSESTO» e mezzo nome. Il post va nei canali, la
// storia nella storia; il come sta in docs/GRAFICHE.md.
test('la storia e\' verticale, e «Manda» manda a ogni posto la sua forma', () => {
  assert.equal(T.GR_STORIA.W, 1080);
  assert.equal(T.GR_STORIA.H, 1920);
  const d = APP.slice(APP.indexOf('function grafDisposizione(c) {'), APP.indexOf('function _grafDisposizionePost(c, alta = 0) {'));
  assert.ok(d.includes("if (c.formato !== 'storia') return _grafDisposizionePost(c);"), 'il post resta com\'era');
  assert.ok(d.includes('const lay = _grafTrasla(_grafDisposizionePost(c, alta), su);'), 'la storia e\' il post composto sull\'altezza libera da Instagram');
  assert.ok(d.includes('lay.barra.y = S.H - lay.barra.h;'), 'la barra di «Live ora» sta sul bordo di sotto');
  assert.ok(d.includes("for (const k of ['badge', 'titolo', 'pillola', 'sotto']) lay[k] = _grafTrasla(lay[k], dy);") && d.includes('lay.orizzonte += dy;'),
    'e il blocco di «Live ora» sta in mezzo allo spazio libero, con l\'orizzonte della scena');
  const tr = APP.slice(APP.indexOf('function _grafTrasla(v, dy) {'), APP.indexOf('function grafDisposizione(c) {'));
  assert.ok(/\(k === 'y' \|\| k === 'base' \|\| k === 'orizzonte'\)/.test(tr), 'si sposta tutto quello che ha una quota');
  const manda = APP.slice(APP.indexOf("_g('sett-manda')?.addEventListener('click'"), APP.indexOf("const r = await api('/api/streamer/settimana/manda'"));
  assert.ok(manda.includes("corpo.immagine = grafJpeg({ ...c, formato: 'post' })"), 'ai canali il post');
  assert.ok(manda.includes("if (dove.ig) corpo.storia = grafJpeg({ ...c, formato: 'storia' })"), 'alla storia la storia');
  const srv = SRV.slice(SRV.indexOf('async function mandaLaSettimana('), SRV.indexOf("app.get('/api/streamer/grafiche/storia'"));
  assert.ok(srv.length > 0 && srv.includes('esiti.push'), 'la strada di «Manda», e solo lei');
  assert.ok(srv.includes('esiti: await mandaLaSettimana(login, { byte, storia, testo, dove })'), 'la rotta passa di li\'');
  assert.ok(srv.includes('const storia = leggiJpeg(req.body?.storia) || byte;'), 'il server usa la storia per la storia');
  assert.ok(srv.includes('await storiaIg.pubblicaStoria(login, storia)'), 'e la pubblica da un posto solo');
  assert.ok(!/pubblicaStoria\(login, byte\)/.test(srv), 'mai il post nella storia, se la storia c\'e\'');
});

// Due immagini nello stesso «Manda» devono stare nel limite del corpo di una
// richiesta (2 MB): ognuna al piu' GR_JPEG_MAX byte, che in base64 crescono di
// un terzo.
test('post e storia insieme stanno nel limite di una richiesta', () => {
  const max = Number((/const GR_JPEG_MAX = ([\d_]+);/.exec(APP) || [])[1]?.replace(/_/g, ''));
  assert.ok(max > 0, 'c\'e\' un tetto per ogni immagine');
  const limite = /app\.use\(express\.json\(\{ limit: '(\d+)mb'/.exec(SRV);
  assert.ok(limite, 'il limite del corpo');
  const corpo = 2 * Math.ceil(max / 3) * 4 + 2000 * 4 + 4096;
  assert.ok(corpo <= Number(limite[1]) * 1024 * 1024, `due immagini da ${max} byte e un testo pieno fanno ${corpo} byte`);
  const serve = /const SETTIMANA_MAX = ([\d_]+);/.exec(SRV);
  assert.ok(Number(serve[1].replace(/_/g, '')) >= max, 'e il server accetta quello che il pannello manda');
});

// «Metti nella storia»: dalle Grafiche, la grafica che si vede va nella storia
// di Instagram, e sempre in verticale, qualunque formato si stia guardando. Il
// riquadro sta in cima e dice sempre come stanno le cose: pronto, da collegare,
// o collegato senza il permesso di pubblicare. Il ragionamento sta in
// docs/GRAFICHE.md.
test('«Metti nella storia»: tre stati che si vedono, e parte sempre la storia', () => {
  const gr = APP.slice(APP.indexOf('function _grIgHtml('), APP.indexOf('async function caricaStoriaIg()'));
  assert.ok(gr.includes('if (ig && !ig.puo) return _igStoriaBloccata();'), 'collegato senza permesso: il blocco col rimedio');
  assert.ok(/if \(!ig\) \{[\s\S]*data-vai="notifiche"[\s\S]*Collega Instagram/.test(gr), 'non collegato: il tasto per collegarlo');
  assert.ok(gr.includes('id="gr-ig-storia"') && gr.includes('role="status"'), 'pronto: il tasto, e l\'esito che si legge');
  const p = APP.slice(APP.indexOf('function pannelloGrafiche()'), APP.indexOf('function grClip('));
  assert.ok(p.indexOf('id="gr-ig"') > 0 && p.indexOf('id="gr-ig"') < p.indexOf('class="gr-tipo"'), 'in cima alla scheda, prima di tutto il resto');
  const i = APP.slice(APP.indexOf('function initGrafiche()'), APP.indexOf('function problemaHtml('));
  assert.ok(i.includes("immagine: grafJpeg({ ...c, formato: 'storia' })"), 'nella storia va sempre la storia, anche se stai guardando il post');
  assert.ok(i.includes('_grafRiprendi = () => { c.giorni = grafGiorni(); ridisegna(); caricaStoriaIg();'), 'tornando nella scheda, lo stato si rilegge: magari Instagram l\'hai appena collegato');
  assert.match(i, /_grafRiprendi = [^\n]*if \(c\.tipo === 'prossima'\) caricaProssima\(\);/, 'e la prossima diretta, che nel frattempo puo\' essere cambiata');
  const get = SRV.slice(SRV.indexOf("app.get('/api/streamer/grafiche/storia'"), SRV.indexOf("app.post('/api/streamer/grafiche/storia'"));
  assert.match(get, /requireOwner/);
  assert.ok(get.includes('ig: await storiaIgPossibile(login)'), 'si chiede come per la Settimana');
  assert.ok(get.includes('live: storiaIg.statoLive(login)'), 'e con la storia della diretta: accesa, pronta, com\'e\' andata l\'ultima');
  const post = SRV.slice(SRV.indexOf("app.post('/api/streamer/grafiche/storia'"), SRV.indexOf("app.delete('/api/streamer/ruoli'"));
  assert.match(post, /requireOwner/);
  assert.ok(post.includes('const byte = leggiJpeg(req.body?.immagine);'), 'un JPEG vero e piccolo, come per «Manda»');
  assert.ok(post.includes('_mandando.has(login)') && post.includes('finally { _mandando.delete(login); }'), 'un doppio clic non pubblica due storie');
  assert.ok(post.includes('await storiaIg.pubblicaStoria(login, byte)'), 'e si pubblica dallo stesso posto');
});

// La storia della diretta: accesa dallo streamer, parte quando comincia la
// diretta. Il server non disegna: la grafica la prepara il pannello quando la
// accendi e a ogni salvataggio. Il modulo si prova in test/unita/storia-ig.
test('la storia della diretta: la prepara il pannello, la pubblica la diretta, e se non parte si dice', () => {
  const BOT = leggi('src/bot.js');
  const sl = BOT.slice(BOT.indexOf('  _setLive(login, isLive, data) {'), BOT.indexOf('  async _storiaDellaDiretta(login) {'));
  const primo = sl.indexOf('if (prev === undefined) return;');
  const storia = sl.indexOf('this._storiaDellaDiretta(ch)');
  assert.ok(primo > 0 && storia > primo, 'non al primo sguardo dopo un riavvio: solo quando la diretta comincia davvero');
  const accesa = sl.indexOf('    if (isLive) {\n      this._annunciaTwitch(ch)');
  const quando = sl.slice(accesa, sl.indexOf('    } else {', accesa));
  assert.ok(accesa > 0 && quando.includes('this._storiaDellaDiretta(ch)'), 'e solo quando comincia, non quando finisce');
  const sd = BOT.slice(BOT.indexOf('  async _storiaDellaDiretta(login) {'), BOT.indexOf('  // A diretta finita, il rapporto in privato'));
  assert.ok(sd.includes('await storiaIg.storiaDellaDiretta(login)'), 'dal modulo della storia');
  assert.ok(sd.includes('if (!r.fatto || r.ok) return;') && sd.includes('telegram.inviaMessaggio(conf.token, conf.owner_tg_id'),
    'se non parte, lo streamer lo sa anche su Telegram');
  const rotta = SRV.slice(SRV.indexOf("app.post('/api/streamer/grafiche/storia-live'"), SRV.indexOf("app.post('/api/streamer/grafiche/storia',"));
  assert.match(rotta, /requireOwner/);
  assert.ok(rotta.includes('storiaIg.spegniLive(login)') && rotta.includes('storiaIg.accendiLive(login, byte)'), 'accendere vuol dire mandare la grafica, spegnere la toglie');
  assert.ok(rotta.includes('const byte = leggiJpeg(req.body?.immagine);'), 'un JPEG vero e piccolo');
  const i = APP.slice(APP.indexOf('function initGrafiche()'), APP.indexOf('function problemaHtml('));
  assert.ok(i.includes("const storiaLive = () => grafJpeg({ ...c, tipo: 'live', formato: 'storia' });"), 'la storia della diretta e\' la grafica «Live ora» in verticale');
  assert.ok(/if \(_grIgLive\?\.attiva\) \{[\s\S]{0,200}immagine: storiaLive\(\)/.test(i), 'e salvando le grafiche si rifa\'');
  const html = APP.slice(APP.indexOf('function _grIgLiveHtml(live) {'), APP.indexOf('function _grIgHtml('));
  assert.ok(html.includes('live.attiva && !live.pronta') && html.includes('live.ultima && !live.ultima.ok'), 'accesa senza grafica, o l\'ultima non partita: si vede');
});

// Il titolo della settimana e quello di «Live ora» sono due: con uno solo, chi
// scriveva «LA MIA SETTIMANA» se lo ritrovava sulla grafica della diretta, e
// sulla storia che parte da sola.
test('la settimana e «Live ora» hanno ognuna il suo titolo', () => {
  assert.ok(APP.includes("grafTitolo(ctx, sc, pal, c, lay, (c.titoloLive || 'LIVE').toUpperCase());"));
  assert.ok(APP.includes("grafTitolo(ctx, sc, pal, c, lay, (c.titolo || L('LA SETTIMANA', 'THE WEEK', 'LA SEMANA')).toUpperCase());"));
  assert.ok(APP.includes("c[c.tipo === 'live' ? 'titoloLive' : 'titolo'] = e.target.value;"), 'il campo scrive il titolo della grafica che hai davanti');
  assert.match(SRV, /titoloLive: str\(gr\.titoloLive, 40\)/, 'e il server lo tiene');
});

// I PEZZI SI SPOSTANO A MANO (docs/GRAFICHE.md, capitolo 10). Lo spostamento sta
// dentro la disposizione, quindi anteprima, PNG, GIF, video e «Manda» lo
// rispettano tutti; il server tiene solo i pezzi che il pannello sa spostare.
test('pannello e server spostano gli stessi pezzi', () => {
  const pezziDi = (testo, nome) => {
    const blocco = testo.slice(testo.indexOf(`const ${nome} = {`), testo.indexOf('};', testo.indexOf(`const ${nome} = {`)));
    return Object.fromEntries([...blocco.matchAll(/(\w+): \[([^\]]*)\]/g)].map(([, k, v]) => [k, [...v.matchAll(/'(\w+)'/g)].map((m) => m[1])]));
  };
  const nelPannello = pezziDi(APP, 'GR_PEZZI'), nelServer = pezziDi(SRV, 'PEZZI_GRAFICHE');
  assert.ok(nelPannello.live?.length >= 5 && nelPannello.programmazione?.length >= 5, 'le liste si leggono');
  assert.deepEqual(nelServer, nelPannello);
  assert.match(SRV, /formato: tra\(gr\.formato, \['post', 'storia'\], 'post'\),\n\s*spostati, spostaInsieme: gr\.spostaInsieme !== false,/, 'il server salva gli spostamenti, e se post e storia si spostano insieme');
});

test('uno spostamento muove il pezzo intero, e non la scena', () => {
  const corpo = APP.slice(APP.indexOf('function _grafSposta('), APP.indexOf('\n}\n', APP.indexOf('function _grafSposta(')) + 2);
  const ctx = vm.createContext({});
  vm.runInContext(corpo, ctx);
  const sposta = (...a) => JSON.parse(JSON.stringify(vm.runInContext('_grafSposta', ctx)(...a)));
  const qr = { x: 800, y: 1000, w: 190, h: 190, url: { x: 96, base: 1100, px: 36 } };
  assert.deepEqual(sposta(qr, -40, 25),
    { x: 760, y: 1025, w: 190, h: 190, url: { x: 56, base: 1125, px: 36 } }, 'il QR si porta dietro il suo indirizzo');
  const righe = [{ x: 96, y: 452, w: 888, h: 90 }, { x: 96, y: 554, w: 888, h: 90 }];
  assert.deepEqual(sposta(righe, 0, -30).map((r) => r.y), [422, 524], 'le righe si spostano insieme');
  assert.equal(sposta({ orizzonte: 560 }, 0, 99).orizzonte, 560, 'l\'orizzonte della scena resta dov\'era');
  const disp = APP.slice(APP.indexOf('function grafDisposizione(c) {'), APP.indexOf('function _grafDisposizioneBase('));
  assert.match(disp, /for \(const k of GR_PEZZI\[grafTipoPezzi\(c\)\]\)/, 'ogni grafica passa dagli spostamenti');
});

test('i pezzi si prendono dove sono disegnati, e ogni pezzo e\' registrato', () => {
  for (const k of ['logo', 'handle', 'badge', 'titolo', 'pillola', 'sotto', 'qr', 'occhiello', 'righe', 'quando', 'dove']) {
    assert.ok(APP.includes(`pezzo: '${k}'`) || APP.includes(`_grafSegna('${k}'`) || APP.includes(`grafAdesivo(ctx, lay.${k}, '${k}')`), `«${k}» registra il suo rettangolo mentre si disegna`);
  }
  assert.match(APP, /try \{ _grafDisegna\(canvas, c, t, scala\); \} finally \{ canvas\._pezzi = _grafRaccolta; _grafRaccolta = null; \}/);
  assert.ok(APP.includes('canvas._pezzi = tela._pezzi;'), 'l\'anteprima ferma porta con se\' i rettangoli della tela di lavoro');
  const muovi = APP.slice(APP.indexOf('const muovi = (r0, dx, dy, altro, aggancia = true) => {'), APP.indexOf('const disegnaGuide'));
  assert.ok(muovi.includes('const cur = grafLimiti(r0, lay, f), alt = altro ? grafLimiti(altro.r, altro.lay, altro.formato) : null;'), 'i limiti del formato che hai davanti e, spostando insieme, dell\'altro');
  assert.ok(muovi.includes('const lim = alt ? grafIncrocia(cur, alt) : cur;'), 'il pezzo sta dove valgono tutti e due');
  assert.ok(muovi.includes('const d = linee[i] - v;'), 'ogni lato si aggancia alla sua guida: il bordo sinistro al margine sinistro, il centro al centro');
  assert.ok(APP.includes('muovi(q, passo[0] * n, passo[1] * n, altro, false)'), 'le frecce spostano di pixel esatti, senza agganci che le rimangiano');
  assert.ok(APP.includes('segnaDaSalvare(canvas);'), 'uno spostamento accende «modifiche da salvare»');
});

test('la copertina di un gioco arriva dal nostro indirizzo, e solo da Twitch', () => {
  const i = SRV.indexOf("app.get('/api/streamer/grafiche/copertina/:id'");
  assert.ok(i > 0, 'la porta esiste');
  const r = SRV.slice(i, SRV.indexOf('}));', i));
  assert.match(r, /requireLogin/);
  assert.ok(r.includes("if (!/^\\d{1,12}$/.test(id)) return res.status(400).end();"), 'un id fatto solo di cifre');
  assert.ok(r.includes('const g = await helix.getGame(id).catch(() => null);'), 'l\'indirizzo lo da\' Twitch per quella categoria');
  const COP = new RegExp(/const COPERTINA = (\/.*\/);/.exec(SRV)[1].slice(1, -1));
  assert.ok(COP.test('https://static-cdn.jtvnw.net/ttv-boxart/1519388213_IGDB-1080x1440.jpg'), 'anche i giochi nuovi, col nome lungo');
  assert.ok(COP.test('https://static-cdn.jtvnw.net/ttv-boxart/516575-1080x1440.png'), 'e le copertine in PNG');
  assert.ok(!COP.test('https://static-cdn.jtvnw.net.altro.it/ttv-boxart/1-1080x1440.jpg'), 'un altro posto no');
  assert.ok(!COP.test('https://static-cdn.jtvnw.net/ttv-boxart/../x/1-1080x1440.jpg'), 'e nemmeno una strada che esce');
  assert.ok(r.includes("['image/jpeg', 'image/png'].includes(tipo)"), 'solo immagini');
  assert.ok(r.includes("redirect: 'error'"), 'e niente rimandi verso altri posti');
  assert.ok(APP.includes("const grafCopertinaSrc = (c) => { const p = grafProssimaDi(c); return p?.categoriaId ? '/api/streamer/grafiche/copertina/' + p.categoriaId : ''; };"), 'il pannello la chiede da li\'');
  assert.ok(APP.includes('const grafProssimaDi = (c) => c?._prossima || _grProssima;'), 'per la diretta che ha davanti, o per quella che gli si passa');
});

// POST E STORIA INSIEME. Lo stesso spostamento va ai due formati, ognuno dalla
// sua posizione; il pezzo puo' andare solo dove si legge in tutti e due.
test('spostando insieme, un pezzo resta dove si legge nel post e nella storia', () => {
  const da = APP.indexOf('function grafLimiti(');
  const corpo = APP.slice(da, APP.indexOf('function grafDisposizione(c) {'));
  const ctx = vm.createContext({ GR_STORIA: { fascia: 250 } });
  vm.runInContext(corpo + ';this.grafIncrocia = grafIncrocia;', ctx);
  const lim = (...a) => JSON.parse(JSON.stringify(vm.runInContext('grafLimiti', ctx)(...a)));
  const post = { W: 1080, H: 1350 }, storia = { W: 1080, H: 1920 };
  const titoloPost = { x: 96, y: 300, w: 700, h: 120 }, titoloStoria = { x: 96, y: 520, w: 700, h: 120 };
  assert.deepEqual(lim(titoloPost, post, 'post'), { x: [-96, 284], y: [-300, 930] }, 'nel post il limite e\' la tela');
  assert.deepEqual(lim(titoloStoria, storia, 'storia'), { x: [-96, 284], y: [-270, 1030] }, 'nella storia le fasce di Instagram');
  const insieme = JSON.parse(JSON.stringify(vm.runInContext('grafIncrocia', ctx)(lim(titoloPost, post, 'post'), lim(titoloStoria, storia, 'storia'))));
  assert.deepEqual(insieme, { x: [-96, 284], y: [-270, 930] }, 'insieme: su fin dove lo permette la storia, giu\' fin dove lo permette il post');
  const i = APP.slice(APP.indexOf('function initGrafiche()'), APP.indexOf('function problemaHtml('));
  assert.ok(i.includes('if (altro) metti(altro.formato, k, altro.base.dx + m.dx, altro.base.dy + m.dy);'), 'l\'altro formato riceve lo stesso spostamento, dalla sua posizione');
  assert.ok(i.includes('if (c.spostaInsieme !== false) delete c.spostati[tp][altroFormato()];'), '«Rimetti a posto» rimette tutti e due');
  assert.match(APP, /id="gr-insieme" \$\{c\.spostaInsieme !== false \? 'checked' : ''\}/, 'di serie si spostano insieme');
});

test('un pezzo che ne copre un altro si vede, misurato sulle sue parti vere', () => {
  const corpo = APP.slice(APP.indexOf('function grafCoperti('), APP.indexOf('const grafIncrocia'));
  const ctx = vm.createContext({});
  vm.runInContext(corpo + ';this.grafCoperti = grafCoperti;', ctx);
  const coperti = (p, k) => JSON.parse(JSON.stringify(vm.runInContext('grafCoperti', ctx)(p, k)));
  const qr = { x: 96, y: 1100, w: 888, h: 190, parti: [{ x: 794, y: 1100, w: 190, h: 190 }, { x: 96, y: 1180, w: 420, h: 30 }] };
  assert.deepEqual(coperti({ qr, logo: { x: 600, y: 1150, w: 84, h: 84 } }, 'logo'), [], 'nel vuoto fra l\'indirizzo e il QR non copre niente');
  assert.deepEqual(coperti({ qr, logo: { x: 760, y: 1150, w: 84, h: 84 } }, 'logo'), ['qr'], 'sopra il QR si');
  assert.deepEqual(coperti({ qr, logo: { x: 300, y: 1170, w: 84, h: 84 } }, 'logo'), ['qr'], 'e sopra il suo indirizzo');
  assert.ok(APP.includes('parti: [...a.parti, parte]'), 'ogni pezzo tiene le sue parti, oltre all\'ingombro');
});
