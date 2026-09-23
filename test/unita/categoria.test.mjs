// IL COMANDO DELLA CATEGORIA, coi nomi veri dei giochi.
//
// Il proprietario: «sembra funzionare molto male, specialmente con giochi di piu'
// parole». Il comando passava il testo intero; il guasto era nel confronto,
// che premiava il nome piu' CORTO — cioe' quello che lasciava fuori una parola
// detta. Qui ogni caso e' un nome vero di Twitch, con gli altri nomi che Twitch
// restituisce davvero a quella ricerca: la scelta si misura dove si sbagliava.
import test from 'node:test';
import assert from 'node:assert/strict';
import { scegli, somiglianza, formeDi, risolviCategoria, parseComandoCategoria, SOGLIA } from '../../src/features/categoria.js';

let prossimo = 1;
const cat = (...nomi) => nomi.map((name) => ({ id: String(prossimo++), name }));

const DIABLO = cat('Diablo IV', 'Diablo', 'Diablo II: Resurrected', 'Diablo III', 'Diablo Immortal');
const CS = cat('Counter-Strike', 'Counter-Strike 2', 'Counter-Strike: Global Offensive', 'Counter-Strike: Source');
const GTA = cat('Grand Theft Auto V', 'Grand Theft Auto IV', 'Grand Theft Auto: San Andreas', 'Grand Theft Auto VI');
const COD = cat('Call of Duty: Warzone', 'Call of Duty: Black Ops 6', 'Call of Duty: Black Ops Cold War',
  'Call of Duty: Modern Warfare III', 'Call of Duty');
const TLOU = cat('The Last of Us Part I', 'The Last of Us Part II');
const BG = cat("Baldur's Gate 3", "Baldur's Gate", "Baldur's Gate II: Enhanced Edition");
const RE = cat('Resident Evil 4', 'Resident Evil', 'Resident Evil Village', 'Resident Evil 2');
const HK = cat('Hollow Knight', 'Hollow Knight: Silksong');
const FC = cat('EA Sports FC 25', 'FIFA 23', 'EA Sports FC 24');
const VARI = cat('Fortnite', 'Minecraft', 'Minecraft Dungeons', 'Just Chatting', 'League of Legends',
  'A Way Out', 'It Takes Two', "Tom Clancy's Rainbow Six Siege", 'Dead by Daylight', 'Red Dead Redemption 2',
  'Red Dead Redemption', 'Elden Ring', 'Elden Ring Nightreign', 'Final Fantasy XIV Online', 'Final Fantasy VII Rebirth');

const nome = (q, lista) => scegli(q, lista)?.name;

test('il numero che hai scritto non si butta: «diablo 4» non e\' «Diablo»', () => {
  assert.equal(nome('diablo 4', DIABLO), 'Diablo IV', 'cifra contro numero romano');
  assert.equal(nome('diablo quattro', DIABLO), 'Diablo IV', 'e a voce');
  assert.equal(nome('diablo four', DIABLO), 'Diablo IV', 'in inglese');
  assert.equal(nome('diablo cuatro', DIABLO), 'Diablo IV', 'e in spagnolo');
  assert.equal(nome('diablo iv', DIABLO), 'Diablo IV');
  assert.equal(nome('diablo', DIABLO), 'Diablo', 'senza numero, il gioco senza numero');
  assert.equal(nome('diablo 2', DIABLO), 'Diablo II: Resurrected');
});

test('se il capitolo che hai detto non c\'e\', non si ripiega su un altro', () => {
  // Il caso in cui la regola dei numeri decide da sola: Twitch non restituisce
  // il gioco col numero che hai detto. Le lettere di «Diablo» sono vicinissime a
  // «diablo 4», e senza la regola si cambierebbe categoria col gioco sbagliato —
  // in diretta, davanti a tutti. Meglio «non l'ho trovato», che si ridice.
  const senzaIlQuarto = DIABLO.filter((c) => c.name !== 'Diablo IV');
  assert.ok(scegli('diablo 4', senzaIlQuarto).score < SOGLIA, 'non diventa «Diablo»');
  const senzaIlDue = CS.filter((c) => c.name !== 'Counter-Strike 2');
  assert.ok(scegli('counterstrike 2', senzaIlDue).score < SOGLIA, 'non diventa il Counter-Strike vecchio');
});

test('Counter-Strike: il capitolo che hai detto, anche attaccato o a voce', () => {
  assert.equal(nome('counter strike 2', CS), 'Counter-Strike 2');
  assert.equal(nome('counter strike due', CS), 'Counter-Strike 2', 'il vecchio non vince perche\' «comincia uguale»');
  assert.equal(nome('counterstrike 2', CS), 'Counter-Strike 2', 'tutto attaccato');
  assert.equal(nome('cs2', CS), 'Counter-Strike 2', 'la sigla');
  assert.equal(nome('counter strike', CS), 'Counter-Strike', 'e senza numero, quello senza numero');
});

test('le sigle della chat: gta, cod, lol, r6, fifa', () => {
  assert.equal(nome('gta 5', GTA), 'Grand Theft Auto V');
  assert.equal(nome('gta v', GTA), 'Grand Theft Auto V');
  assert.equal(nome('gta 6', GTA), 'Grand Theft Auto VI');
  assert.equal(nome('cod black ops 6', COD), 'Call of Duty: Black Ops 6');
  assert.equal(nome('black ops 6', COD), 'Call of Duty: Black Ops 6', 'senza la parte che tutti danno per scontata');
  assert.equal(nome('lol', VARI), 'League of Legends');
  assert.equal(nome('r6', VARI), "Tom Clancy's Rainbow Six Siege");
  assert.equal(nome('rainbow six', VARI), "Tom Clancy's Rainbow Six Siege");
  // La sigla allarga, non comanda: «fifa 23» e' un gioco che esiste, e vince
  // la forma letterale.
  assert.equal(nome('fifa 23', FC), 'FIFA 23');
  assert.equal(nome('fifa', FC), 'EA Sports FC 25', 'e «fifa» da solo e\' quello di adesso');
});

test('l\'apostrofo non spezza le parole', () => {
  assert.equal(nome('baldurs gate 3', BG), "Baldur's Gate 3");
  assert.equal(nome("baldur's gate 3", BG), "Baldur's Gate 3");
  assert.equal(nome('baldur gate 3', BG), "Baldur's Gate 3", 'e un errore di una lettera si perdona');
  assert.equal(nome('bg3', BG), "Baldur's Gate 3");
});

test('il sottotitolo che non hai detto non ti fa sbagliare gioco', () => {
  assert.equal(nome('hollow knight silksong', HK), 'Hollow Knight: Silksong');
  assert.equal(nome('silksong', HK), 'Hollow Knight: Silksong');
  assert.equal(nome('hollow knight', HK), 'Hollow Knight');
  assert.equal(nome('elden ring nightreign', VARI), 'Elden Ring Nightreign');
  assert.equal(nome('elden ring', VARI), 'Elden Ring');
  assert.equal(nome('resident evil 4', RE), 'Resident Evil 4');
  assert.equal(nome('resident evil village', RE), 'Resident Evil Village');
});

test('le parole piccole che fanno parte del nome restano', () => {
  // «a» e «the» sono parole di riempimento per la voce, ma dentro «A Way Out»
  // sono il nome: la forma intera le tiene.
  assert.equal(nome('a way out', VARI), 'A Way Out');
  assert.equal(nome('it takes two', VARI), 'It Takes Two');
  assert.equal(nome('the last of us part 2', TLOU), 'The Last of Us Part II');
  assert.equal(nome('last of us 2', TLOU), 'The Last of Us Part II');
});

test('la voce che sbaglia una lettera si capisce, un altro gioco no', () => {
  assert.equal(nome('fortnait', VARI), 'Fortnite');
  assert.equal(nome('minecraf', VARI), 'Minecraft');
  assert.equal(nome('metti fortnite per favore', VARI), 'Fortnite', 'e le parole intorno non disturbano');
  assert.ok(scegli('pokemon scarlatto', VARI).score < SOGLIA, 'quello che non c\'e\' non diventa la cosa piu\' vicina');
});

test('a parita\' vince il primo: Twitch li da\' gia\' in ordine di quanto sono seguiti', () => {
  assert.equal(nome('the last of us', TLOU), 'The Last of Us Part I');
});

test('le forme: com\'e\', senza riempitivi, con le sigle sciolte', () => {
  assert.deepEqual(formeDi('gta 5').map((f) => f.join(' ')), ['gta 5', 'grand theft auto 5']);
  assert.deepEqual(formeDi('metti fortnite').map((f) => f.join(' ')), ['metti fortnite', 'fortnite']);
  assert.equal(somiglianza('diablo 4', 'Diablo IV'), 1);
});

// Una ricerca finta che si comporta come quella di Twitch: tiene i nomi che
// hanno TUTTE le parole cercate come inizio di una loro parola, nell'ordine in
// cui Twitch li darebbe (i piu' seguiti prima).
function twitchFinto(catalogo) {
  const chiamate = [];
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  return {
    chiamate,
    async searchCategories(q) {
      chiamate.push(q);
      const cerca = norm(q);
      return catalogo.filter((c) => { const p = norm(c.name); return cerca.every((w) => p.some((x) => x.startsWith(w))); }).slice(0, 20);
    },
  };
}
const TUTTO = [...DIABLO, ...CS, ...GTA, ...COD, ...TLOU, ...BG, ...RE, ...HK, ...FC, ...VARI];

test('dalla chat a Twitch: le ricerche giuste, e il gioco giusto', async () => {
  const t = twitchFinto(TUTTO);
  assert.equal((await risolviCategoria(t, 'diablo 4'))?.name, 'Diablo IV');
  assert.equal((await risolviCategoria(t, 'gta 5'))?.name, 'Grand Theft Auto V', 'la sigla sciolta si cerca davvero');
  assert.equal((await risolviCategoria(t, 'counter strike due'))?.name, 'Counter-Strike 2');
  assert.equal((await risolviCategoria(t, 'baldurs gate 3'))?.name, "Baldur's Gate 3");
  assert.equal(await risolviCategoria(t, 'un gioco che non esiste proprio'), null, 'e quello che non c\'e\' resta non trovato');
});

test('una parola storpiata o attaccata trova lo stesso da dove partire', async () => {
  // Qui il confronto non c'entra — riconosce «fortnait» — ma se Twitch non
  // restituisce niente non c'e' niente da confrontare. L'inizio della parola
  // fa tornare la famiglia giusta.
  const t = twitchFinto(TUTTO);
  assert.equal((await risolviCategoria(t, 'fortnait'))?.name, 'Fortnite');
  assert.equal((await risolviCategoria(t, 'counterstrike 2'))?.name, 'Counter-Strike 2');
});

test('quando e\' sicuro si ferma: non si chiede a Twitch piu\' del necessario', async () => {
  const t = twitchFinto(TUTTO);
  await risolviCategoria(t, 'fortnite');
  assert.equal(t.chiamate.length, 1, `ricerche fatte: ${t.chiamate.join(' | ')}`);
});

test('la parola chiave a voce si stacca dal gioco, e il gioco resta intero', () => {
  assert.equal(parseComandoCategoria('ok categoria counter strike 2', 'categoria'), 'counter strike 2');
  assert.equal(parseComandoCategoria("categoria baldur's gate 3", 'categoria'), 'baldurs gate 3');
});
