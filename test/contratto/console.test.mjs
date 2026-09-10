// LE AZIONI DEL CANALE, E LA PORTA DA CUI SI PREMONO.
//
// CONSOLify e una tastiera fisica guardano lo STESSO registro. Non è eleganza:
// un elenco di bottoni scritto a mano sarebbe un secondo elenco accanto a quello
// dei contatori, e i due si scollerebbero al primo contatore nuovo — il difetto
// che rincorriamo da stamattina. Qui si controlla che il registro sia DERIVATO.
//
// E cos'è davvero una tastiera di comando per chi streama: non è una
// tastiera di scorciatoie, è un tasto che DICE cosa fa. Perciò ogni azione porta
// con sé la riga da stampare sul tasto, e chi la esegue risponde con quella.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');

const usaEGetta = cartellaUsaEGetta('andrybot-console-');
const { contatori, effects: storeEffetti, streamers, battute } = await import('../../src/db.js');
const consolle = await import('../../src/features/console.js');

let n = 0;
// uno streamer VERO: senza la riga, la chiave non si puo' salvare — ed e' giusto
// che non si possa, ma allora la prova deve provare il caso vero.
const canale = () => {
  const ch = `console-prova-${++n}`;
  streamers.upsertApproved(ch, ch);
  return ch;
};

test('il registro nasce dai contatori del canale, non da una lista scritta a mano', () => {
  const ch = canale();
  const dei = (c, g) => consolle.azioni(c).filter((x) => x.gruppo === g);
  assert.deepEqual(dei(ch, 'contatori'), [], 'un canale senza contatori non ha quei tasti');
  assert.equal(dei(ch, 'chat').length, 2, 'ma battuta e «dì» ci sono sempre: non dipendono da niente');

  contatori.upsert(ch, { comando: 'morti', etichetta: 'Morti', emoji: '💀', valore: 7, step: 1 });
  const a = dei(ch, 'contatori');
  assert.equal(a.length, 3, 'un contatore porta tre tasti: più, meno, azzera');

  // il tasto DICE cosa fa: c'è il numero di adesso, non solo il nome
  assert.match(a[0].mostra, /Morti: 7/);
  // niente emoji nella grafica: l'icona e' il NOME di una nostra, disegnata
  assert.equal(a[0].icona, 'piu', 'l\'icona è una delle nostre, non un\'emoji');

  // un contatore nuovo compare da solo: nessuna lista da tenere allineata
  contatori.upsert(ch, { comando: 'tentativi', etichetta: 'Tentativi', valore: 2 });
  assert.equal(dei(ch, 'contatori').length, 6, 'e un contatore nuovo porta i suoi');
});

test('premere un tasto cambia il numero davvero, e lo dice in chat e a schermo', () => {
  const ch = canale();
  contatori.upsert(ch, { comando: 'morti', etichetta: 'Morti', valore: 4, step: 2 });
  const detto = [], schermo = [];
  const dip = { say: (t) => detto.push(t), emit: (p) => schermo.push(p) };

  const su = consolle.esegui(ch, 'contatore:piu:morti', dip);
  assert.equal(su.ok, true);
  assert.equal(su.valore, 6, 'sale del suo passo, non di uno a caso');
  assert.match(su.mostra, /Morti: 6/, 'e risponde con la riga da stampare sul tasto');
  assert.equal(detto.length, 1, 'il bot lo dice in chat');
  assert.match(detto[0], /Morti: 6/);

  const giu = consolle.esegui(ch, 'contatore:meno:morti', dip);
  assert.equal(giu.valore, 4);

  const zero = consolle.esegui(ch, 'contatore:azzera:morti', dip);
  assert.equal(zero.valore, 0);
  assert.equal(contatori.get(ch, 'morti').valore, 0, 'e il cambiamento è nel database, non solo nella risposta');
});

test('un\'azione che non esiste non fa niente e lo dice', () => {
  const ch = canale();
  assert.equal(consolle.esegui(ch, 'contatore:piu:inesistente').ok, false);
  assert.equal(consolle.esegui(ch, 'roba:strana').ok, false);
  assert.match(consolle.esegui(ch, 'roba:strana').mostra, /sconosciuta/);
});

test('la chiave si puo\' revocare, e quella vecchia smette di valere', () => {
  const ch = canale();
  const prima = consolle.chiave(ch);
  assert.ok(prima.length >= 32, 'non è un numerino');
  assert.equal(consolle.chiave(ch), prima, 'e resta la stessa finché non la si tocca');
  assert.equal(consolle.chiaveOk(ch, prima), true);

  const dopo = consolle.revoca(ch);
  assert.notEqual(dopo, prima);
  assert.equal(consolle.chiaveOk(ch, prima), false, 'una chiave finita in una clip smette di funzionare');
  assert.equal(consolle.chiaveOk(ch, dopo), true);
});

test('una chiave sbagliata non passa, e nemmeno una piu\' corta', () => {
  const ch = canale();
  const vera = consolle.chiave(ch);
  assert.equal(consolle.chiaveOk(ch, ''), false);
  assert.equal(consolle.chiaveOk(ch, vera.slice(0, -1)), false, 'una più corta non passa');
  // L'ultimo carattere si CAMBIA, non si sostituisce con una lettera scelta a caso:
  // la chiave è esadecimale, e mettere sempre 'f' voleva dire che una volta su
  // sedici la «chiave sbagliata» era esattamente quella giusta. Rosso una volta ogni
  // sedici giri, e la colpa non era del codice — un rosso intermittente e' peggio di
  // uno fisso, perche' insegna a non guardare il rosso.
  const ultimo = vera.slice(-1);
  const diverso = vera.slice(0, -1) + (ultimo === 'f' ? '0' : 'f');
  assert.notEqual(diverso, vera, 'la chiave di prova è davvero diversa');
  assert.equal(consolle.chiaveOk(ch, diverso), false, 'e un carattere diverso basta');
});

test('c\'e\' un tetto: da questa porta non si guarda, si agisce', () => {
  const ch = canale();
  let bloccato = 0;
  for (let i = 0; i < 60; i++) if (consolle.troppiColpi(ch)) bloccato++;
  assert.ok(bloccato > 0, 'oltre il tetto si dice di no');
  assert.ok(bloccato < 60, 'ma i primi passano: il tetto non è un divieto');
});

test('un canale che non esiste non ha una chiave, e non la si inventa', () => {
  // La prima versione ne restituiva una nuova a ogni chiamata: `setSettings` su una
  // riga che non c'è non scrive niente, e la funzione tornava una chiave fresca
  // fingendo di averla salvata. Nessuna chiave emessa avrebbe combaciato con sé
  // stessa — e in produzione non si sarebbe visto mai.
  assert.equal(consolle.chiave('canale-che-non-esiste'), null);
  assert.equal(consolle.chiaveOk('canale-che-non-esiste', 'qualunque cosa'), false);
});

test('anche gli effetti del canale diventano tasti, da soli', () => {
  const ch = canale();
  assert.equal(consolle.azioni(ch).filter((a) => a.gruppo === 'effetti').length, 0);
  storeEffetti.add(ch, { comando: 'airhorn', tipo: 'audio', file: 'a.mp3', tier: 'tutti', cooldown: 0, volume: 100, durata: 3 });
  const eff = consolle.azioni(ch).filter((a) => a.gruppo === 'effetti');
  assert.equal(eff.length, 1);
  assert.equal(eff[0].id, 'effetto:airhorn');
  assert.equal(eff[0].titolo, '!airhorn', 'il tasto porta il comando con cui lo chiama la chat');
  assert.equal(eff[0].icona, 'altoparlante', 'e l\'icona nostra segue il tipo');
});

test('l\'effetto lo spara il motore vero, non una seconda strada', () => {
  const ch = canale();
  storeEffetti.add(ch, { comando: 'airhorn', tipo: 'audio', file: 'a.mp3', tier: 'tutti', cooldown: 0, volume: 100, durata: 3 });
  const sparati = [];
  const finto = { fire: (c, cmd) => { sparati.push(`${c}/${cmd}`); return true; } };
  const r = consolle.esegui(ch, 'effetto:airhorn', { effetti: finto });
  assert.equal(r.ok, true);
  assert.deepEqual(sparati, [`${ch}/airhorn`], 'passa dal motore degli effetti, quello che userebbe la chat');
  assert.equal(consolle.esegui(ch, 'effetto:inesistente', { effetti: finto }).ok, false);
});

test('il tasto «battuta» ne dice una, e la segna come detta', () => {
  const ch = canale();
  const n = battute.add(ch, 'Una battuta di prova per il tasto', 'streamer');
  const detto = [];
  const r = consolle.esegui(ch, 'battuta', { say: (t) => detto.push(t) });
  assert.equal(r.ok, true);
  assert.equal(detto.length, 1, 'la dice in chat');
  assert.match(r.mostra, /battuta di prova/, 'e il tasto mostra cosa ha detto');
  assert.equal(battute.get(ch, n).dette, 1, 'ed è contata come detta: se no il suo schema non impara');
});

test('il tasto «di\'» dice quello che gli hai scritto, e senza testo non fa niente', () => {
  const ch = canale();
  const detto = [];
  const say = (t) => detto.push(t);
  assert.equal(consolle.esegui(ch, 'di', { say }).ok, false, 'senza testo non inventa niente');
  assert.equal(detto.length, 0);

  const r = consolle.esegui(ch, 'di', { say, testo: '  Ciao   a   tutti  ' });
  assert.equal(r.ok, true);
  assert.deepEqual(detto, ['Ciao a tutti'], 'e lo ripulisce dagli spazi di troppo');
});

test('la plancia non tiene tasti che puntano a niente', () => {
  const ch = canale();
  contatori.upsert(ch, { comando: 'morti', etichetta: 'Morti', valore: 1 });
  const salvata = consolle.salvaPlancia(ch, { pagine: [{ nome: 'P', tasti: [
    { azione: 'contatore:piu:morti', nome: 'Su', icona: '💀', colore: '#112233' },
    { azione: 'contatore:piu:sparito', nome: 'Fantasma' },
    { azione: 'roba:inventata' },
  ] }] });
  // un tasto che punta a un'azione che non esiste piu' non e' un buco: e' peggio,
  // e' un bottone che sembra fare qualcosa e non fa niente quando lo premi
  assert.equal(salvata.pagine[0].tasti.length, 1);
  assert.deepEqual(salvata.pagine[0].tasti[0].passi, [{ tipo: 'azione', id: 'contatore:piu:morti', testo: '' }]);
  assert.equal(salvata.pagine[0].tasti[0].colore, '#112233');
});

test('la plancia ripulisce quello che le arriva, invece di fidarsi', () => {
  const ch = canale();
  const r = consolle.salvaPlancia(ch, { pagine: [{
    nome: 'x'.repeat(80),
    tasti: [{ azione: 'battuta', nome: 'y'.repeat(80), icona: 'z'.repeat(40), colore: 'javascript:alert(1)' }],
  }] });
  assert.ok(r.pagine[0].nome.length <= 24);
  assert.ok(r.pagine[0].tasti[0].nome.length <= 24);
  assert.equal(r.pagine[0].tasti[0].colore, '', 'un colore che non è un colore non entra');
});

test('un canale senza plancia ne ha comunque una, vuota', () => {
  const ch = canale();
  const p = consolle.plancia(ch);
  assert.equal(p.pagine.length, 1);
  assert.deepEqual(p.pagine[0].tasti, []);
});

test('CONSOLify ascolta dentro il pannello che esiste davvero', () => {
  // La prima versione filtrava gli eventi su «#pannello-consolify», che non esiste:
  // il contenitore si chiama «scheda-<id>». I tasti non avrebbero mai risposto — una
  // sezione intera inerte, senza un errore da nessuna parte.
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  assert.match(app, /closest\?\.\('#scheda-consolify'\)/, 'il filtro punta al contenitore vero');
  assert.match(app, /id="scheda-\$\{id\}"/, 'e i pannelli si chiamano così');
  assert.ok(!/#pannello-consolify/.test(app), 'nessun contenitore inventato');
});

test('il formato si sceglie come una tastiera vera: righe per colonne', () => {
  const ch = canale();
  const dif = consolle.plancia(ch).formato;
  assert.deepEqual(dif, { righe: 3, colonne: 4 }, 'chi arriva trova gia\' una plancia, non un foglio bianco');

  const r = consolle.salvaPlancia(ch, { formato: { righe: 3, colonne: 4 }, pagine: [{ nome: 'P', tasti: [] }] });
  assert.deepEqual(r.formato, { righe: 3, colonne: 4 });

  // e un formato assurdo non entra: sarebbe una griglia che non si guarda
  const male = consolle.salvaPlancia(ch, { formato: { righe: 99, colonne: 0 }, pagine: [{ nome: 'P', tasti: [] }] });
  assert.deepEqual(male.formato, { righe: 3, colonne: 4 }, 'fuori misura torna alla plancia di partenza, non al vuoto');

  // ma «libero» resta una scelta vera, se e' lo streamer a farla
  const lib = consolle.salvaPlancia(ch, { formato: { righe: 0, colonne: 0 }, pagine: [{ nome: 'P', tasti: [] }] });
  assert.deepEqual(lib.formato, { righe: 0, colonne: 0 }, 'chi sceglie libero resta libero');
});

test('la plancia ripulisce anche quello che non conosce', () => {
  const ch = canale();
  const r = consolle.salvaPlancia(ch, { formato: 'grande', misura: 'XXL', pagine: 'non una lista' });
  assert.deepEqual(r.formato, { righe: 3, colonne: 4 });
  assert.equal(r.misura, 'm');
  assert.equal(r.pagine.length, 1, 'e resta una plancia usabile, non un guscio vuoto');
});

test('un tasto a video non puo\' essere senza indirizzo', () => {
  // Un tasto appena aggiunto non ha ancora un id: il suo indirizzo verrebbe
  // fuori «/tasto/?key=…» e premerlo scriverebbe a vuoto. La rotta di
  // salvataggio restituisce la plancia ripulita, con gli id gia' assegnati —
  // il pannello deve prendere QUELLA, non tenersi la sua.
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  const salva = app.slice(app.indexOf('async function salvaPlancia'));
  const corpo = salva.slice(0, salva.indexOf('\n}\n'));
  assert.match(corpo, /_cons\.plancia = d\.plancia/, 'la plancia buona e\' quella che torna dal server');

  // e il server la restituisce davvero, con gli id dentro
  const ch = canale();
  const r = consolle.salvaPlancia(ch, { pagine: [{ nome: 'P', tasti: [{ azione: 'battuta' }] }] });
  assert.ok(r, 'la rotta restituisce la plancia');
  assert.match(r.pagine[0].tasti[0].id, /^[a-f0-9]{10}$/, 'e ogni tasto torna con il suo id');
});

test('quello che scrivi nei campi non si perde scegliendo un colore', () => {
  // Nome, frase e carattere vivevano solo nel DOM fino a un bottone «Salva»:
  // bastava toccare un\'icona e il pannello si ridisegnava buttandoli. Ora si
  // depositano al «change», che scatta uscendo dal campo — prima del click
  // sul bottone accanto. Cosi' non esiste piu' roba non depositata da perdere.
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  for (const campo of ['cons-c-nome', 'cons-c-icona', 'cons-c-colore']) {
    assert.ok(app.includes(`id === '${campo}'`), `${campo} si deposita da solo`);
  }
  // e i campi dei passi seguono la stessa regola: si depositano uscendo dal campo
  assert.match(app, /data-cons-pcampo.*await salvaPlancia/s, 'anche i campi di un passo si depositano da soli');
  assert.ok(!app.includes('cons-c-salva'), 'e il bottone «Salva» non ha piu\' niente da fare');
});

test('nessun marchio altrui, in nessuna delle tre lingue', () => {
  // Non siamo partner di nessuno: i prodotti degli altri non si nominano.
  // L\'italiano era gia' stato ripulito, inglese e spagnolo no.
  // Si cerca sul testo APPIATTITO, non riga per riga: «...per lo Stream» a fine
  // riga e «// Deck.» a capo e' lo stesso marchio, e una ricerca per righe non
  // puo' vederlo. E' cosi' che me n'era sfuggito uno mentre dichiaravo pulito.
  const marchi = /stream ?deck|elgato|loupedeck|touch portal|bitfocus|api ninja/i;
  const files = ['src/web/public/app.js', 'src/web/manuali.js', 'NOVITA.md', 'docs/CONSOLIFY.md',
    'src/features/console.js', 'src/web/server.js', 'src/web/public/overlay-app.js'];
  for (const f of files) {
    const piatto = readFileSync(join(RAD, f), 'utf8').replace(/\s*\n\s*(\/\/|\*)?\s*/g, ' ');
    const m = piatto.match(marchi);
    assert.equal(m, null, `${f}: marchio altrui — «${m && piatto.slice(Math.max(0, m.index - 40), m.index + 30)}»`);
  }
});

test('la plancia sul telefono si apre solo di lato', () => {
  // La regola c\'era scritta nel foglio di stile — «in verticale nascondi la
  // plancia, mostra "gira il telefono"» — ma le due classi non le scriveva
  // nessuno: regole vere puntate su elementi che non esistevano. In verticale
  // la plancia restava a video, coi tasti schiacciati a francobollo.
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  const css = readFileSync(join(RAD, 'src/web/public/style.css'), 'utf8');
  for (const c of ['cons-plancia-corpo', 'cons-ruota']) {
    assert.ok(css.includes(`.${c}`), `il foglio di stile parla di ${c}`);
    assert.ok(app.includes(`class="${c}`), `e qualcuno la scrive davvero, la classe ${c}`);
  }
  assert.match(css, /\.cons-ruota \{ display: none; \}/, 'l\'avviso sta zitto quando non serve');
  assert.match(css, /@media \(max-width: 860px\) and \(orientation: portrait\)/, 'e la regola e\' quella del telefono in piedi');
});

test('una finestra modale sta in mezzo allo schermo, non in un angolo', () => {
  // Il browser centra da solo un <dialog> aperto con showModal(), mettendogli
  // «margin: auto». Ma la sveltina iniziale — «* { margin: 0 }» — glielo
  // toglieva: la finestra delle novità usciva incollata in alto a sinistra,
  // e cosi' ogni altra finestra modale che nascera' domani.
  const css = readFileSync(join(RAD, 'src/web/public/style.css'), 'utf8');
  const reset = css.indexOf('* { box-sizing: border-box; margin: 0; padding: 0; }');
  const rimedio = css.indexOf('dialog:modal { margin: auto; }');
  assert.ok(reset >= 0, 'la sveltina iniziale sta ancora li\'');
  assert.ok(rimedio > reset, 'e subito dopo si ridà il centro alle finestre modali');
});

test('chi apre CONSOLify la prima volta trova una plancia, non una frase', () => {
  // La richiesta era: si parte da un layout, cosi' si e' gia' avvantaggiati. Il
  // commento nel codice lo diceva, il valore di partenza faceva l'opposto —
  // «libero» — e chi arrivava vedeva una riga di testo al posto della griglia.
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  const ch = canale();
  const f = consolle.plancia(ch).formato;
  assert.deepEqual(f, consolle.FORMATO_INIZIALE, 'la plancia di partenza e\' quella dichiarata, non un numero riscritto qui');
  assert.ok(f.righe >= 3 && f.colonne >= 3, 'ed e\' una griglia vera');
  assert.equal(consolle.plancia(ch).pagine[0].tasti.length, 0, 'e i posti sono tutti liberi');
  // e i posti liberi non restano muti: la griglia c'e', e sotto c'e' scritto che farci
  assert.match(app, /tasti\.length \? sezioni : `\$\{sezioni\}\$\{vuoto\}`/, 'con zero tasti si vede la griglia E il consiglio');
});

test('un overlay che non riesce a suonare puo\' dirlo', () => {
  // Prima ogni fallimento del suono finiva in `catch(() => {})`: bloccato dal
  // browser, file irraggiungibile, chiave scaduta o flusso caduto erano tutti
  // la stessa cosa vista da fuori — silenzio. Cosi' non era diagnosticabile
  // nemmeno volendo: e infatti non lo era.
  const ov = readFileSync(join(RAD, 'src/web/public/overlay-app.js'), 'utf8');
  const srv = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');

  assert.ok(!/play\(\)\.catch\(\(\) => \{\}\)/.test(ov), 'nessun fallimento di riproduzione resta muto');
  assert.match(ov, /function suonaUrl\(/, 'il suono parte da un punto solo');
  assert.match(ov, /inAscolto\.add\(a\)/, 'e chi suona resta agganciato finche\' suona');
  assert.ok(!/es\.onerror = \(\) => \{\};/.test(ov), 'anche il flusso caduto si racconta');

  assert.match(srv, /app\.post\('\/overlay\/:login\/guaio'/, 'la porta per raccontarlo esiste');
  const porta = srv.slice(srv.indexOf("app.post('/overlay/:login/guaio'"));
  assert.match(porta.slice(0, 400), /chiaveOk\(req\)/, 'ed e\' guardata come le altre porte dell\'overlay');
  assert.match(porta.slice(0, 900), /60000/, 'e non si fa raccontare la stessa cosa mille volte al minuto');
});

test('un video lo chiude la sua fine, non un timer che tira a indovinare', () => {
  // Sintomo: «esce, mostra un fotogramma nero e se ne va senza andare avanti».
  // Il timer di chiusura gareggiava col video: se la durata memorizzata era
  // sbagliata, il video veniva troncato — e se comincia con un secondo nero,
  // quello che si vede e' un fotogramma nero che sparisce. La durata vera la sa
  // il browser: si usa quella, e quella dichiarata diventa un pavimento.
  const ov = readFileSync(join(RAD, 'src/web/public/overlay-app.js'), 'utf8');
  assert.ok(!/setTimeout\(chiudi, durataMs/.test(ov), 'nessun video chiuso da un timer armato alla cieca');
  assert.match(ov, /function reggiFinoAllaFine\(/, 'c\'e\' un posto solo che decide quando finisce');
  assert.match(ov, /loadedmetadata/, 'e chiede al browser quanto dura davvero');
  assert.match(ov, /if \(fermaTimer\) fermaTimer\(\)/, 'e chi finisce da solo spegne il proprio timer');
});

test('se il browser non da\' il permesso, il video parte muto invece di non partire', () => {
  // Un media CON audio non parte da solo finche' nessuno ha toccato la pagina:
  // in OBS il permesso c'e', in una scheda no. Restare fermi e' la scelta
  // peggiore delle due: un video muto e' molto meglio di un fotogramma fermo.
  const ov = readFileSync(join(RAD, 'src/web/public/overlay-app.js'), 'utf8');
  const f = ov.slice(ov.indexOf('function avvia('), ov.indexOf('function suonaUrl('));
  assert.match(f, /NotAllowedError/, 'riconosce proprio quel rifiuto, non un errore qualsiasi');
  assert.match(f, /el\.muted = true/, 'e riprova muto');
  assert.match(f, /guaio\(dove \+ '-muto'/, 'senza tenerselo per se\'');
});

test('premere un tasto senza nessun overlay collegato NON dice «fatto»', () => {
  // «Se premo un tasto deve per forza partire ciò che schiaccio. Che senso ha
  // se non parte?» — e infatti non partiva: `emit` esce zitto quando non c'è
  // nessun overlay collegato, ma `fire` restituiva `true` lo stesso. Il tasto
  // rispondeva «fatto» mentre in diretta non era andato niente. Un tasto che
  // mente è peggio di un tasto che non c'è: ti fa credere di aver mandato una
  // cosa a chi ti guarda.
  const ch = canale();
  storeEffetti.add(ch, { comando: 'applausi', tipo: 'audio', file: 'a.ogg', tier: 'tutti', cooldown: 0, volume: 100, durata: 1000 });

  let sparato = false;
  const nessunoAscolta = { fire: () => { sparato = true; return true; }, hasClients: () => false };
  const r = consolle.esegui(ch, 'effetto:applausi', { effetti: nessunoAscolta });
  assert.equal(r.ok, false, 'non dice di avercela fatta');
  assert.match(r.mostra, /overlay/i, 'e dice PERCHE\'');
  assert.equal(sparato, false, 'e non spara nel vuoto');

  // e con un overlay collegato parte davvero
  let sparato2 = false;
  const qualcunoAscolta = { fire: () => { sparato2 = true; return true; }, hasClients: () => true };
  const r2 = consolle.esegui(ch, 'effetto:applausi', { effetti: qualcunoAscolta });
  assert.equal(r2.ok, true);
  assert.equal(sparato2, true, 'quando c\'è chi ascolta, parte');
});

test('la plancia dice se c\'è un overlay collegato PRIMA che tu prema', () => {
  // Saperlo dopo aver premuto è troppo tardi: un banco di comando mostra lo
  // stato della cosa che comanda.
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  const srv = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
  assert.match(app, /function disegnaSpia\(/, 'la spia esiste');
  assert.match(app, /_cons\.overlay = !!d\?\.overlay/, 'e si accende con quello che dice il server');
  assert.match(app, /d\.overlay !== _cons\.overlay.*disegnaSpia\(\)/s, 'e si aggiorna a ogni pressione, non solo all\'apertura');
  assert.match(srv, /overlay: effects\.hasClients\(login\)/, 'il server lo dice davvero');
});

test('un tasto arriva a TUTTI gli overlay, e ogni overlay puo\' dire di no', () => {
  // «Qualunque cosa va lì è automaticamente attiva se premuta, su qualunque
  // overlay — con un interruttore per accenderla solo su quelli che decide lo
  // streamer.» Perché un overlay possa rifiutare i tasti SENZA rifiutare anche
  // gli effetti che arrivano dalla chat, deve poterli distinguere: quindi
  // l'effetto sparato da un tasto porta con sé da dove viene.
  const ch = canale();
  storeEffetti.add(ch, { comando: 'tuono', tipo: 'audio', file: 't.ogg', tier: 'tutti', cooldown: 0, volume: 100, durata: 1000 });

  let visto = null;
  const finto = { fire: (l, c, extra) => { visto = extra; return true; }, hasClients: () => true };
  consolle.esegui(ch, 'effetto:tuono', { effetti: finto });
  assert.deepEqual(visto, { da: 'consolify' }, 'il tasto dice di essere un tasto');

  const ov = readFileSync(join(RAD, 'src/web/public/overlay-app.js'), 'utf8');
  assert.match(ov, /dati\.da === 'consolify' && !mostra\('consolify'\)/, 'e l\'overlay puo\' rifiutarli');

  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  assert.match(app, /ovlElemento\('consolify'/, 'l\'interruttore sta nell\'elenco degli elementi, come gli altri');
});

test('l\'interruttore di CONSOLify sopravvive al salvataggio', () => {
  // L'avevo messo nell'elenco del pannello e nell'overlay, ma il server ha una
  // SUA lista di elementi e quello che non c'è dentro lo butta via: l'inter-
  // ruttore si sarebbe visto, si sarebbe potuto spegnere, e non avrebbe fatto
  // niente. Un comando inerte è esattamente il difetto che stiamo togliendo.
  const srv = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
  const riga = srv.match(/const ELEM_OVERLAY = \[[^\]]*\]/);
  assert.ok(riga, 'la lista del server esiste');
  assert.match(riga[0], /'consolify'/, 'e conosce anche i tasti della plancia');

  // le tre liste devono nominare la stessa cosa, se no una delle tre mente
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  const ov = readFileSync(join(RAD, 'src/web/public/overlay-app.js'), 'utf8');
  assert.match(app, /ELEM_OVL = \[[^\]]*'consolify'/, 'il pannello lo offre');
  assert.match(ov, /mostra\('consolify'\)/, 'l\'overlay lo legge');
});

test('il conto dell\'attesa parte da solo, e due sorgenti non lo fanno ripartire', () => {
  // Per la schermata d'attesa: metti su la scena e il conto è già andato. Ma
  // due sorgenti aperte insieme chiederebbero tutte e due, e la seconda
  // farebbe ripartire da capo un conto che chi guarda sta già leggendo.
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  const ov = readFileSync(join(RAD, 'src/web/public/overlay-app.js'), 'utf8');
  const al = readFileSync(join(RAD, 'src/features/alerts.js'), 'utf8');
  const st = readFileSync(join(RAD, 'src/web/stile.js'), 'utf8');

  assert.match(st, /partiDaSolo: t\.partiDaSolo === true/, 'il campo sopravvive al salvataggio');
  assert.match(app, /data-c="partiDaSolo"/, 'e si accende dal pannello');

  const f = al.slice(al.indexOf('avviaTimerSePronto('), al.indexOf('avviaTimerSePronto(') + 700);
  assert.match(f, /cfg\.partiDaSolo !== true.*return 0/s, 'senza la spunta non parte niente');
  assert.match(f, /fine > Date\.now\(\).*return fine/s, 'e un conto gia\' avviato NON riparte da capo');

  assert.match(ov, /MIO\.timer\.partiDaSolo && mostra\('timer'\)/, 'lo chiede solo l\'overlay che lo mostra davvero');
});

test('un tasto salvato PRIMA che esistessero gli id si aggiusta da solo, e resta aggiustato', () => {
  // Il difetto che il direttore ha isolato con la domanda giusta: «se funziona
  // l'anteprima dall'editor overlay, perché non deve funzionare l'effetto
  // lanciato dalla consolify?». Non era il payload — è identico. Era che
  // leggere e salvare davano cose diverse: leggere restituiva i tasti così
  // com'erano sul disco, e un tasto senza id ha per indirizzo «/tasto/» senza
  // niente. Quella rotta non esiste: la richiesta cadeva su un'altra e tornava
  // «azione sconosciuta». Premevi e non partiva.
  const ch = canale();
  storeEffetti.add(ch, { comando: 'tuono', tipo: 'audio', file: 't.ogg', tier: 'tutti', cooldown: 0, volume: 100, durata: 1000 });

  // com'era sul disco prima: nessun id
  const s = streamers.get(ch);
  streamers.setSettings(ch, {
    ...(s.settings || {}),
    plancia: { misura: 'm', pagine: [{ nome: 'Principale', tasti: [{ azione: 'effetto:tuono', nome: 'Tuono' }] }] },
  });

  const p1 = consolle.plancia(ch);
  const id = p1.pagine[0].tasti[0].id;
  assert.match(String(id), /^[a-f0-9]{10}$/, 'leggendo, il tasto vecchio ha un id');

  // e l'id NON cambia alla lettura dopo: se cambiasse, l'indirizzo che hai
  // incollato sulla tastiera fisica varrebbe fino al prossimo aggiornamento
  assert.equal(consolle.plancia(ch).pagine[0].tasti[0].id, id, 'e resta quello');
  assert.equal(consolle.plancia(ch).pagine[0].tasti[0].id, id, 'anche alla terza');

  // e adesso premerlo lo fa partire davvero
  let sparato = false;
  const finto = { fire: () => { sparato = true; return true; }, hasClients: () => true };
  return consolle.eseguiTasto(ch, id, { effetti: finto }).then((r) => {
    assert.equal(r.ok, true, `premuto: ${r.mostra}`);
    assert.equal(sparato, true, 'ed è partito');
  });
});

test('un tasto fa PIÙ cose in fila, e una che va storta non zittisce le altre', async () => {
  // Il tasto era un puntatore a una cosa sola, e per averla dovevi averla già
  // creata da un'altra parte: era lo strozzo. Ora è una partitura.
  const ch = canale();
  const detti = [];
  const say = (t) => detti.push(t);

  const salvata = consolle.salvaPlancia(ch, { pagine: [{ nome: 'P', tasti: [{
    nome: 'Apertura',
    passi: [
      { tipo: 'chat', testo: 'Si comincia!' },
      { tipo: 'azione', id: 'roba:che:non:esiste' },
      { tipo: 'attesa', ms: 5 },
      { tipo: 'chat', testo: 'Buon divertimento' },
    ],
  }] }] });

  const t = salvata.pagine[0].tasti[0];
  assert.equal(t.passi.length, 3, 'il passo che non si può fare viene tolto, non tenuto lì a fingere');

  const r = await consolle.eseguiTasto(ch, t.id, { say });
  assert.deepEqual(detti, ['Si comincia!', 'Buon divertimento'], 'e gli altri passi succedono tutti');
  assert.equal(r.ok, true);
});

test('un passo che fallisce a metà non ferma quelli dopo, e l\'esito lo dice', async () => {
  const ch = canale();
  const detti = [];
  const salvata = consolle.salvaPlancia(ch, { pagine: [{ nome: 'P', tasti: [{
    passi: [
      { tipo: 'chat', testo: 'uno' },
      { tipo: 'azione', id: 'di' },
      { tipo: 'chat', testo: 'tre' },
    ],
  }] }] });
  const t = salvata.pagine[0].tasti[0];
  // «di» senza testo non fa niente e lo dice: è il passo che fallisce
  const r = await consolle.eseguiTasto(ch, t.id, { say: (x) => detti.push(x) });
  assert.deepEqual(detti, ['uno', 'tre'], 'il terzo passo è successo lo stesso');
  assert.equal(r.ok, false, 'ma l\'esito non finge che sia andato tutto bene');
  assert.match(r.mostra, /2\/3/, 'e dice quanti ne sono riusciti');
});

test('un tasto di prima diventa una partitura di un passo solo', async () => {
  // Chi ha già dei tasti non deve rifarli: la conversione sta dove si ripulisce,
  // quindi vale sia leggendo sia salvando e non esiste un tasto a metà del guado.
  const ch = canale();
  const s = streamers.get(ch);
  streamers.setSettings(ch, { ...(s.settings || {}),
    plancia: { pagine: [{ nome: 'P', tasti: [{ id: 'aaaaaaaaa1', azione: 'di', nome: 'Saluta', testo: 'ciao a tutti' }] }] } });

  const t = consolle.plancia(ch).pagine[0].tasti[0];
  assert.deepEqual(t.passi, [{ tipo: 'azione', id: 'di', testo: 'ciao a tutti' }], 'la frase è rimasta col suo passo');

  const detti = [];
  const r = await consolle.eseguiTasto(ch, 'aaaaaaaaa1', { say: (x) => detti.push(x) });
  assert.equal(r.ok, true);
  assert.deepEqual(detti, ['ciao a tutti'], 'e il tasto vecchio fa ancora quello che faceva');
});

test('un media si carica SUL tasto, e premerlo lo manda in onda', async () => {
  // «Voglio aggiungere tutto da quella schermata, non dalla regia»: un media non
  // deve prima diventare un effetto con un suo comando in un'altra scheda.
  const ch = canale();
  const salvata = consolle.salvaPlancia(ch, { pagine: [{ nome: 'P', tasti: [{
    nome: 'Cartello',
    passi: [{ tipo: 'media', file: 'cons_aabbccddeeff.webp', genere: 'immagine', durata: 4000, volume: 80 }],
  }] }] });
  const t = salvata.pagine[0].tasti[0];
  assert.equal(t.passi[0].file, 'cons_aabbccddeeff.webp');

  let mandato = null;
  const finto = {
    hasClients: () => true,
    mediaUrl: (l, f) => `https://x/overlay/${l}/media/${f}?key=k`,
    emit: (l, p) => { mandato = p; },
  };
  const r = await consolle.eseguiTasto(ch, t.id, { effetti: finto });
  assert.equal(r.ok, true, r.mostra);
  assert.equal(mandato.tipo, 'immagine', 'l\'overlay riceve un media, non un effetto finto');
  assert.match(mandato.url, /cons_aabbccddeeff\.webp/);
  assert.equal(mandato.volume, 80);
  assert.equal(mandato.da, 'consolify', 'e porta con sé da dove viene, come tutti i tasti');
});

test('un nome di file storto non esce dalla cartella del canale', () => {
  const ch = canale();
  const r = consolle.salvaPlancia(ch, { pagine: [{ nome: 'P', tasti: [
    { passi: [{ tipo: 'media', file: '../../etc/passwd', genere: 'immagine' }] },
    { passi: [{ tipo: 'media', file: 'buono.webp', genere: 'inventato' }] },
    { passi: [{ tipo: 'media', file: 'buono.webp', genere: 'video' }] },
  ] }] });
  assert.equal(r.pagine[0].tasti.length, 1, 'passano solo i media che sono davvero media');
  assert.equal(r.pagine[0].tasti[0].passi[0].genere, 'video');
});

test('i file che nessuno guarda più non restano sul disco', () => {
  // Un media sostituito o un passo tolto lascerebbero un file orfano per sempre.
  const ch = canale();
  consolle.salvaPlancia(ch, { pagine: [{ nome: 'P', tasti: [
    { passi: [{ tipo: 'media', file: 'cons_111111111111.webp', genere: 'immagine' }] },
  ] }] });
  assert.ok(consolle.fileUsati(ch).has('cons_111111111111.webp'), 'la plancia sa quali file usa');
  consolle.salvaPlancia(ch, { pagine: [{ nome: 'P', tasti: [
    { passi: [{ tipo: 'media', file: 'cons_222222222222.webp', genere: 'immagine' }] },
  ] }] });
  const ora = consolle.fileUsati(ch);
  assert.ok(!ora.has('cons_111111111111.webp'), 'e quello di prima non lo usa più');
  assert.ok(ora.has('cons_222222222222.webp'));
});

test('i passi di regia si salvano, e il server dice che non tocca a lui', () => {
  // Il programma con cui si manda in onda ascolta sul computer dello streamer:
  // da qui non lo vediamo. Il server deve comunque SAPERLI (se no non si
  // salverebbero) e deve dire che non li fa lui — invece di rispondere «fatto».
  const ch = canale();
  const r = consolle.salvaPlancia(ch, { pagine: [{ nome: 'P', tasti: [{
    passi: [{ tipo: 'scena', scena: 'Gioco' }, { tipo: 'muto', fonte: 'Microfono', come: 'inverti' }],
  }] }] });
  const t = r.pagine[0].tasti[0];
  assert.equal(t.passi.length, 2, 'i passi di regia sopravvivono al salvataggio');
  assert.equal(t.passi[0].scena, 'Gioco');
  assert.equal(t.passi[1].come, 'inverti');

  const e0 = consolle.eseguiPassoDiTasto(ch, t.id, 0, {});
  assert.equal(e0.ok, false, 'il server non finge di averlo fatto');
  assert.equal(e0.browser, true, 'e dice di chi è il mestiere');
});

test('la pagina percorre la partitura in ORDINE, un passo per volta', () => {
  // Se il server facesse «tutto il resto» e la pagina le scene «dopo», una fila
  // con un'attesa in mezzo andrebbe fuori ordine. Percio' la pagina cammina lei,
  // e per ogni passo che non sa fare chiede quel passo, non tutto il tasto.
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  const srv = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
  assert.match(app, /async function premiTasto\(/, 'la pagina ha una sua camminata');
  assert.match(app, /passo\/\$\{k\}/, 'e chiede un passo per volta');
  assert.match(srv, /app\.post\('\/api\/console\/:login\/tasto\/:id\/passo\/:k', guardiaConsole/, 'la porta del singolo passo esiste ed è guardata');
});

test('la password del programma non passa mai da noi', () => {
  // Sta nel browser dello streamer, sul suo computer. Non viaggia al server, non
  // finisce nel database, e non la vediamo nemmeno volendo.
  const re = readFileSync(join(RAD, 'src/web/public/regia-esterna.js'), 'utf8');
  const srv = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
  assert.match(re, /localStorage\.setItem/, 'resta nel browser');
  assert.ok(!/fetch\(|XMLHttpRequest/.test(re), 'il collegamento non manda niente a nessun server nostro');
  assert.ok(!/re-pass|regia-esterna|obs_pass/.test(srv), 'e il server non ne sa niente');
});

test('solo il computer di casa: un indirizzo di rete non viene nemmeno tentato', () => {
  // Il browser lo bloccherebbe comunque (misurato: SecurityError su un indirizzo
  // di rete o esterno), ma dirlo prima è meglio che far vedere un errore oscuro.
  const re = readFileSync(join(RAD, 'src/web/public/regia-esterna.js'), 'utf8');
  assert.match(re, /const casa = \(ip\) =>/, 'c\'è una definizione sola di «casa»');
  assert.match(re, /if \(!casa\(cfg\.ip\)\)/, 'e si controlla prima di provare');
});

test('la riga che dà il programma si legge da sola: un incollaggio, e basta', () => {
  // «Non c'è un modo per creare il collegamento in automatico? così è troppo
  // macchinoso». Tre campi a mano sono attrito, e l'attrito rende una funzione
  // inutilizzata. Il programma però una riga sola te la dà già — indirizzo,
  // porta e password insieme: si legge quella.
  const src = readFileSync(join(RAD, 'src/web/public/regia-esterna.js'), 'utf8');
  const finta = { window: {}, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } };
  new Function('window', 'localStorage', src)(finta.window, finta.localStorage);
  const leggi = finta.window.RegiaEsterna.leggiIncollato;

  assert.deepEqual(leggi('obsws://127.0.0.1:4455/abc123'), { ip: '127.0.0.1', porta: '4455', pass: 'abc123' });
  assert.deepEqual(leggi('obswss://localhost:4455/xyz'), { ip: 'localhost', porta: '4455', pass: 'xyz' });
  assert.deepEqual(leggi('obsws://127.0.0.1:4455/mia%20password').pass, 'mia password', 'una password con lo spazio arriva intera');
  assert.deepEqual(leggi('obsws://127.0.0.1:4455/'), { ip: '127.0.0.1', porta: '4455', pass: '' }, 'senza password va bene lo stesso');
  assert.deepEqual(leggi('127.0.0.1:4455'), { ip: '127.0.0.1', porta: '4455', pass: '' }, 'anche solo indirizzo e porta');
  assert.deepEqual(leggi('soloLaPassword'), { ip: '127.0.0.1', porta: '4455', pass: 'soloLaPassword' }, 'e anche solo la password');
  assert.equal(leggi('due parole'), null, 'quello che non è nessuna delle due non si indovina');
  assert.equal(leggi(''), null);
});

test('la seconda volta si collega da solo, senza che tu prema niente', () => {
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  assert.match(app, /_cons\.regiaProvata = true/, 'ci prova una volta sola per apertura');
  assert.match(app, /collegaRegia\(g, true\)/, 'e in silenzio: se non c\'è nessuno non ti disturba');
  assert.match(app, /collegaRegia\(\{ ip: g\.ip, porta: g\.porta, pass: '' \}, true\)/, 'e prova anche senza password, per chi non l\'ha messa');
  assert.match(app, /ev\.target\?\.id === 're-incolla'/, 'e incollare basta: non serve nemmeno premere Collega');
});

test('un tasto nuovo nasce VUOTO: si crea, poi si riempie', () => {
  // «Dove sta la creazione completamente a fantasia dell'utente? il tasto deve
  // essere un più, al click si apre l'editor DA ZERO.» Prima bisognava scegliere
  // un'azione da una tendina PRIMA di poter costruire: quello non è
  // personalizzare, è un catalogo.
  const ch = canale();
  const r = consolle.salvaPlancia(ch, { pagine: [{ nome: 'P', tasti: [{ vuoto: true, passi: [], nome: '' }] }] });
  assert.equal(r.pagine[0].tasti.length, 1, 'un tasto in costruzione sopravvive al salvataggio');
  assert.equal(r.pagine[0].tasti[0].vuoto, true);
  assert.match(r.pagine[0].tasti[0].id, /^[a-f0-9]{10}$/, 'e ha già il suo indirizzo');

  // ma un tasto che punta a un'azione sparita continua a sparire: è un'altra cosa
  const m = consolle.salvaPlancia(ch, { pagine: [{ nome: 'P', tasti: [{ passi: [{ tipo: 'azione', id: 'non:esiste' }] }] }] });
  assert.equal(m.pagine[0].tasti.length, 0, 'quello sì che va tolto');

  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  assert.match(app, /data-cons-preset/, 'e ci sono le idee pronte, per fare in fretta');
  assert.ok(!app.includes("id=\"cons-quale\""), 'la tendina «scegli prima un\'azione» non c\'è più');
});

test('quello che la regia ci ha detto si SCEGLIE, non si ricopia', () => {
  // «Deve darmele lui le scene, non devo essere io a doverle scegliere» — e
  // soprattutto: «colleghi e non cambia nulla».
  const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
  assert.match(app, /GetSceneList/, 'chiediamo le scene');
  assert.match(app, /GetInputList/, 'le fonti');
  assert.match(app, /GetSceneTransitionList/, 'e le transizioni');
  assert.match(app, /function daRegia\(/, 'e i passi le offrono da un elenco');
  for (const c of [/daRegia\(_cons\.scene/, /daRegia\(_cons\.fonti/, /daRegia\(_cons\.transizioni/]) {
    assert.match(app, c, 'ogni passo di regia pesca dal suo elenco');
  }
  // e dopo il collegamento la scheda aperta si RIDISEGNA: se no a video non cambia niente
  const f = app.slice(app.indexOf('async function caricaScene('), app.indexOf('function segnaScenaViva('));
  assert.match(f, /disegnaSchedaTasto\(\)/, 'collegarsi cambia quello che vedi, subito');
});
