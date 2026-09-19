// CHI DECIDE CHE SI CANCELLA.
//
// Il motore sa cancellare, e le sue prove dicono che cancella bene. Ma il
// motore cancella quando gli si passa `togliere: true`, e da dove arriva quel
// `true` non e' affare suo. E' affare della porta.
//
// La risposta giusta e' una sola: da una chiave che il SERVER ha coniato poco
// fa, per QUESTO canale, per QUESTO mestiere. Qualunque altra risposta — un
// campo nel corpo della richiesta, una spunta ricordata nel database, uno
// stato tenuto dalla pagina — vuol dire che una richiesta costruita a mano, o
// una scheda rimasta aperta da ieri, basta a spogliare un server Discord.
//
// Questo e' l'unico posto dove quella catena si vede tutta insieme, percio'
// qui la si fissa. Le prove del motore non possono: loro `togliere` se lo
// passano da sole.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const senzaCommenti = (t) => t
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/\/\*[\s\S]*?\*\//g, '');
const SRV = senzaCommenti(readFileSync(join(RAD, 'src/web/server.js'), 'utf8'));

const rotta = (metodo, via) => {
  const i = SRV.indexOf(`app.${metodo}('${via}'`);
  assert.ok(i > 0, `manca ${metodo.toUpperCase()} ${via}`);
  const resto = SRV.slice(i);
  const fine = resto.indexOf('\n  }));');
  const altro = resto.indexOf('\n  });');
  const dove = [fine, altro].filter((x) => x > 0).sort((a, b) => a - b)[0];
  return resto.slice(0, dove > 0 ? dove : 3000);
};

test('la chiave la conia il server, legata a chi la chiede e a cosa apre', () => {
  assert.match(SRV, /const chiaviDcServer = creaChiavi\(\);/);
  assert.match(SRV, /const conChiave = \(req, login\) => chiaviDcServer\.vale\([^)]*, login, SCOPO\);/,
    'chi presenta la chiave deve essere quello per cui e\' stata fatta, e per il mestiere per cui e\' stata fatta');
  const modo = rotta('post', '/api/streamer/dcserver/modo');
  assert.match(modo, /chiaviDcServer\.conia\(login, SCOPO\)/, 'e si conia per il login di chi e\' entrato, non per uno scritto nel corpo');
});

test('e le porte che cancellano sono del proprietario, non dei moderatori', () => {
  assert.match(SRV, /const isOwner = \(req\) => \{ const u = currentUser\(req\); return !!u && u\.role !== 'moderatore'; \};/);
  for (const via of ['/api/streamer/dcserver/modo', '/api/streamer/dcserver/applica', '/api/streamer/dcserver/anteprima']) {
    assert.match(SRV, new RegExp(`app\\.(post|delete)\\('${via.replace(/\//g, '\\/')}', requireOwner`),
      `${via}: senza requireOwner un moderatore potrebbe entrare in modalita' distruttiva`);
  }
});

test('«si cancella» lo dice la chiave, e nient\'altro', () => {
  for (const via of ['/api/streamer/dcserver/anteprima', '/api/streamer/dcserver/applica']) {
    const corpo = rotta('post', via);
    assert.match(corpo, /const togliere = conChiave\(req, /,
      `${via}: il modo si ricava dalla chiave`);
    assert.ok(!/togliere\s*[:=]\s*(?!conChiave)(!!)?(req|b)\./.test(corpo),
      `${via}: il modo non puo' arrivare dal corpo della richiesta`);
    assert.ok(!/req\.body\?\.(togliere|distruttivo)/.test(corpo),
      `${via}: nessun campo «distruttivo» da fuori`);
  }
});

test('nessuno si ricorda di essere in modalita\' distruttiva: non si salva da nessuna parte', () => {
  // E' la differenza fra una chiave e un interruttore. Un interruttore salvato
  // resta acceso anche domani, e il giorno che qualcuno preme «Costruisci»
  // senza guardare, il server si svuota.
  assert.ok(!/(distruttivo|togliere)\s*:\s*(1|true)[^)]*\bset\b/.test(SRV), 'niente colonna «distruttivo» accesa');
  assert.ok(!/impostazioni\.[a-z]*[Dd]istruttiv/.test(SRV), 'e niente impostazione che se lo ricorda');
  assert.match(SRV, /chiaviDcServer\.brucia\(/, 'uscire spegne la chiave subito');
});

test('il peso del danno lo misura il server, sul server di adesso', () => {
  // Se la domanda «scrivi il nome» la decidesse il pannello, basterebbe non
  // chiederla. E se la si pesasse sull'anteprima mandata dal pannello,
  // basterebbe mandarne una piu' leggera.
  const corpo = rotta('post', '/api/streamer/dcserver/applica');
  assert.match(corpo, /if \(togliere\) \{[\s\S]*await dcCostruisci\.anteprima\(token, guild, preset, \{ togliere: true \}\)/,
    'prima di cancellare si rifa\' l\'anteprima qui');
  assert.match(corpo, /const p = pesoDanno\(a\.differenza\.togli\);/, 'e si pesa quella, non quella di chi chiede');
  assert.ok(!/req\.body\?\.peso|req\.body\?\.scriviIlNome/.test(corpo), 'il peso non arriva da fuori');
  assert.match(corpo, /if \(p\.scriviIlNome && \(!atteso \|\| scritto\.toLowerCase\(\) !== atteso\.toLowerCase\(\)\)\)/,
    'e quando pesa, il nome del server va scritto giusto');
  assert.match(corpo, /res\.status\(428\)\.json\(\{ scriviIlNome: true/, 'e finche\' non lo e\', non si cancella');
});

test('e quello che si e\' visto e quello che si fa sono lo stesso server', () => {
  const corpo = rotta('post', '/api/streamer/dcserver/applica');
  assert.match(corpo, /if \(impronta && impronta !== a\.impronta\) \{[\s\S]*res\.status\(409\)/,
    'se il server e\' cambiato fra il «vedi» e il «fai», ci si ferma');
});

test('del giro resta scritto chi, quando e cosa — coi nomi, se ha cancellato', () => {
  const corpo = rotta('post', '/api/streamer/dcserver/applica');
  assert.match(corpo, /dcGiri\.segna\(login, \{ chi: identitaDi\(currentUser\(req\)\), distruttivo: togliere/,
    'il registro dice chi era e in che modo');
  assert.match(corpo, /nomi: e\.tolti \? \(e\.nomiTolti \|\| \[\]\) : \[\]/,
    'e i nomi di quello che non c\'e\' piu\', che e\' l\'unico posto dove restano');
  assert.ok(corpo.indexOf('dcGiri.segna') < corpo.indexOf('res.json('), 'si scrive prima di rispondere');
});

test('l\'anteprima dice sempre cosa resta fuori, e conta i danni solo se si cancella', () => {
  const corpo = rotta('post', '/api/streamer/dcserver/anteprima');
  assert.match(corpo, /fuori: a\.fuori,/, 'cosa il preset non prevede si sa in tutti e due i modi');
  assert.match(corpo, /togli: togliere \? a\.differenza\.togli : \[\],/, 'ma l\'elenco di quello che muore esiste solo in uno');
  assert.match(corpo, /peso: togliere \? pesoDanno\(a\.differenza\.togli\) : null,/);
  assert.match(corpo, /distruttivo: togliere,/, 'e la pagina sa in che modo e\' la risposta che ha in mano');
});
