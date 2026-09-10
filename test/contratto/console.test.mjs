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
  assert.equal(salvata.pagine[0].tasti[0].azione, 'contatore:piu:morti');
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
  for (const campo of ['cons-c-nome', 'cons-c-testo', 'cons-c-icona', 'cons-c-colore']) {
    assert.ok(app.includes(`id === '${campo}'`), `${campo} si deposita da solo`);
  }
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
