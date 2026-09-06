// LE TRE NUVOLETTE, e perché sono tre.
//
// Una forma sola per ogni spiegazione sarebbe una decorazione. Tre forme che
// dicono tre cose diverse sono informazione: il fumetto normale spiega un
// comando, quello squadrato e rosso avvisa che qualcosa fa danni, la nuvola di
// pensiero spiega un valore o una parola.
//
// La cosa che conta: il tipo si RICAVA da quello che stai puntando, non lo
// dichiara chi scrive la pagina. Una regola che vale solo se qualcuno si ricorda
// di scriverla, prima o poi cede — e cede in silenzio, perché una nuvoletta
// della forma sbagliata funziona lo stesso.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const JS = leggi('src/web/public/aiuto.js');
const CSS = leggi('src/web/public/style.css');

test('il tipo si ricava da quello che si punta, non da un\u2019etichetta scritta a mano', () => {
  assert.match(JS, /function tipoDi\(el\)/, 'manca chi decide la forma');
  assert.match(JS, /b\.className = 'aiuto-bolla ' \+ tipoDi\(el\)/, 'la forma non arriva alla bolla');
  // e la decisione guarda FATTI dell'elemento: se fa danni, e se si puo' usare
  assert.match(JS, /PERICOLO/, 'niente riconosce le cose che fanno danni');
  assert.match(JS, /TOCCABILE/, 'niente distingue un comando da una spiegazione');
  assert.doesNotMatch(JS, /data-aiuto-tipo|dataset\.aiutoTipo/,
    'il tipo non deve dipendere da un attributo che qualcuno si deve ricordare di mettere');
});

test('ognuna delle tre ha la forma che le assegna il fumetto', () => {
  // Le forme non sono di fantasia: nel lettering il tondo è la voce normale, il
  // bordo a zig-zag è un grido, e il pensiero è una nuvola con una scia di
  // bollicine che va verso chi pensa (Blambot, «Comic Book Grammar & Tradition»).
  const i = CSS.indexOf('.aiuto-bolla.attenzione {');
  const grido = CSS.slice(i, CSS.indexOf('.aiuto-bolla.dritta {', i));
  assert.match(grido, /clip-path: polygon\(/, 'il grido non ha il bordo a zig-zag');
  assert.ok((grido.match(/%/g) || []).length > 40, 'lo zig-zag ha troppe poche punte per leggersi come un grido');
  assert.match(CSS, /\.aiuto-bolla\.dritta \{[^}]*border-radius/, 'il pensiero non ha una forma sua');
  // e la coda cambia con la forma: nel pensiero è una SCIA, non un cuneo
  assert.match(CSS, /\.aiuto-bolla\.dritta \.aiuto-cuneo \{[^}]*display: none/,
    'la nuvola di pensiero tiene il cuneo: allora non è una nuvola di pensiero');
  assert.match(CSS, /\.aiuto-bolla\.dritta \.aiuto-pensieri \{[^}]*display: block/, 'e non mostra le bollicine');
  const bolle = (JS.match(/\[-?[\d.]+, [\d.]+, [\d.]+\]/g) || []).length;
  assert.ok(bolle >= 3, `le bollicine del pensiero sono ${bolle}: una scia ne vuole almeno tre`);
});

test('la coda è disegnata, non incollata coi bordi', () => {
  // Un triangolo fatto di bordi CSS non si può curvare, e ruotandolo si stacca
  // dalla bolla: si vede, ed è la ragione per cui la coda è un disegno vero.
  assert.match(JS, /createElementNS\('http:\/\/www\.w3\.org\/2000\/svg', 'path'\)/, 'la coda non è disegnata');
  assert.match(JS, /const CODA_D = 'M /, 'manca la forma della coda');
  assert.doesNotMatch(CSS, /\.aiuto-bolla::(before|after)/, 'sono rimasti i triangoli di bordi');
  // e punta al bersaglio: l'angolo lo calcola chi posiziona la bolla
  assert.match(JS, /--giro/, 'la coda non riceve nessun angolo');
  assert.match(JS, /Math\.atan2/, 'l’angolo non si calcola: la coda punterebbe sempre in giù');
  // E LA REGOLA CHE MI MANCAVA: la coda si ferma a metà strada, non tocca chi
  // parla. Toccandolo gli finisce sopra — e con un tasto vuol dire coprirne il
  // testo. «A tail should terminate at roughly 50-60% of the distance between
  // the balloon and the character's head» (Blambot).
  assert.match(JS, /QUOTA_CODA = 0\.5[0-9]?/, 'la coda arriva fino al bersaglio invece di fermarsi a metà');
  assert.match(JS, /codaH = Math\.round\(stacco \* QUOTA_CODA\)/, 'la lunghezza della coda non dipende dalla distanza');
});

test('la bolla si spegne quando serve, e non quando capita', () => {
  // Tre modi di spegnersi per sbaglio, tutti visti dal vivo: la pagina che si
  // assesta di un pixel dopo uno scorrimento, un elemento che passa sotto al
  // cursore, e il puntatore che entra in un figlio del bersaglio. In tutti e tre
  // la bolla spariva dopo mezzo secondo e sembrava rotta.
  assert.match(JS, /function ancoraSopra\(\)/, 'niente controlla se il puntatore è ancora lì');
  assert.match(JS, /elementFromPoint/, 'lo deduce invece di chiederlo al browser');
  assert.match(JS, /Math\.abs\(window\.scrollY - dovEra\) > SCORRE_MIN/,
    'basta un pixel di assestamento per spegnerla');
  // e si spegne DA SOLA dopo il tempo di lettura
  assert.match(JS, /function quantoDura\(t\)/, 'la bolla non se ne va mai da sola');
  assert.match(JS, /LETTURA_PAROLA/, 'la durata non dipende da quanto c’è da leggere');
});

test('le tre forme restano leggibili anche a chi tocca lo schermo', () => {
  // La bolla non si accende col dito, e non deve rubare i tocchi.
  assert.match(JS, /pointerType === 'touch'/, 'col dito la nuvoletta non deve comparire');
  assert.match(CSS, /\.aiuto-bolla \{[\s\S]{0,900}pointer-events: none/, 'la bolla intercetta i clic');
});
