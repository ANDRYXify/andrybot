// L'IMPORT DEI COMANDI da un altro bot. Il criterio: niente entra in chat a
// mentire. Un comando che verrebbe fuori sbagliato va DICHIARATO, non importato
// di nascosto — «sei morto $(count) volte» scritto così davanti a tutti è
// peggio di un comando non importato.
import test from 'node:test';
import assert from 'node:assert/strict';
import { anteprima, traduci, normalizzaNome, moduloDa } from '../../src/features/importacomandi.js';

const nomi = (l) => l.map((x) => x.nome).sort();
const solo = (t, opts) => traduci(t, opts).testo;

test('i nomi si normalizzano come quelli di casa', () => {
  assert.equal(normalizzaNome('!Discord'), 'discord');
  assert.equal(normalizzaNome('  !!SOCIAL  '), 'social');
  assert.equal(normalizzaNome('comando-con-trattini'), 'comandocontrattini');
  assert.equal(normalizzaNome('!'), '');
  assert.equal(normalizzaNome('a'.repeat(50)).length, 24);
});

// ------------------------------------------------------ traduzione fedele
test('chi scrive: tutte le forme diventano $user', () => {
  for (const v of ['$(user)', '${user}', '$(sender)', '${sender}', '$(displayName)', '${username}']) {
    assert.equal(solo(`ciao ${v}!`), 'ciao $user!', v);
  }
  assert.equal(solo('$(user) e $(user)'), '$user e $user', 'tutte, non solo la prima');
});

test('il destinatario diventa $touser — un equivalente vero, non un ripiego', () => {
  assert.equal(solo('saluta $(touser)'), 'saluta $touser');
  assert.equal(solo('saluta ${touser}'), 'saluta $touser');
  assert.deepEqual(traduci('saluta $(touser)').avvisi, [], 'quindi niente avvisi');
});

test('gli argomenti e il resto del messaggio', () => {
  assert.equal(solo('cerco $(1) e $(2)'), 'cerco $arg1 e $arg2');
  assert.equal(solo('hai detto $(query)'), 'hai detto $args');
  assert.equal(solo('hai detto ${message}'), 'hai detto $args');
});

test('il contatore prende il nome del suo comando', () => {
  assert.equal(solo('sei morto $(count) volte', { nome: 'morti' }), 'sei morto $count(morti) volte');
  assert.deepEqual(traduci('morto $(count)', { nome: 'morti' }).avvisi, [], 'tradotto per intero: niente avvisi');
});

test('canale, gioco, titolo, uptime, spettatori', () => {
  assert.equal(solo('$(channel) gioca a $(game): $(title)'), '$canale gioca a $gioco: $titolo');
  assert.equal(solo('in onda da $(uptime) con $(viewers)'), 'in onda da $uptime con $spettatori');
  assert.equal(solo('mi segui da ${followage}'), 'mi segui da $followage');
});

test('quello che non sappiamo fare viene dichiarato, con il perché', () => {
  for (const [t, atteso] of [
    ['meteo: $(urlfetch https://x/y)', /esterno/],
    ['$(customapi.example.com/x)', /esterno/],
    ['$(eval a=1; a)', /codice/],
    ['$(twitch andryxify "{{game}}")', /altro canale/],
  ]) {
    const r = traduci(t);
    assert.ok(r.avvisi.some((a) => a.tipo === 'non-tradotto'), `"${t}" doveva essere segnalato`);
    assert.match(r.avvisi[0].cosa, atteso);
  }
});

test('dove esiste, si dice anche DOVE si fa qui', () => {
  const r = traduci('$(urlfetch https://x)');
  assert.match(r.avvisi[0].dove, /Moduli/);
});

test('un testo senza variabili non viene toccato', () => {
  const t = 'Il mio Discord è discord.gg/andryx — costa 5$ al mese';
  assert.equal(solo(t), t);
  assert.deepEqual(traduci(t).avvisi, []);
});

// ------------------------------------------------------------ i formati
test('legge un export in stile Nightbot', () => {
  const g = JSON.stringify({ commands: [
    { name: '!discord', message: 'Entra: discord.gg/x', userLevel: 'everyone', coolDown: 5 },
    { name: '!ciao', message: 'ciao $(user)' },
  ] });
  const a = anteprima(g);
  assert.equal(a.formato, 'json');
  assert.deepEqual(nomi(a.buoni), ['ciao', 'discord']);
  assert.equal(a.buoni.find((x) => x.nome === 'ciao').risposta, 'ciao $user');
});

test('legge un export in stile StreamElements, e rispetta «disattivato»', () => {
  const g = JSON.stringify([
    { command: 'social', reply: 'i social di ${user}', enabled: true },
    { command: 'vecchio', reply: 'roba vecchia', enabled: false },
  ]);
  const a = anteprima(g);
  assert.equal(a.buoni.find((x) => x.nome === 'social').attivo, true);
  assert.equal(a.buoni.find((x) => x.nome === 'vecchio').attivo, false, 'entra spento, come stava');
});

test('legge un CSV, con o senza intestazione', () => {
  const a = anteprima('command,response\n!discord,"Entra qui, subito"\n!ciao,ciao $(user)');
  assert.equal(a.formato, 'csv');
  assert.equal(a.buoni.find((x) => x.nome === 'discord').risposta, 'Entra qui, subito', 'le virgolette tengono la virgola');
  const b = anteprima('!uno,prima\n!due,seconda\n!tre,terza');
  assert.equal(b.buoni.length, 3);
});

test('legge un elenco scritto a mano, nelle forme comuni', () => {
  const g = ['!discord Entra: discord.gg/x', '!social: i miei social', '!ciao -> ciao $(user)',
    '# questa è una nota', '', 'lurk | buon lurk'].join('\n');
  const a = anteprima(g);
  assert.equal(a.formato, 'righe');
  assert.deepEqual(nomi(a.buoni), ['ciao', 'discord', 'lurk', 'social']);
});

test('una frase incollata per sbaglio non diventa un comando', () => {
  for (const g of ['solo una frase senza struttura', 'ciao a tutti come va oggi', '', '   ']) {
    assert.equal(anteprima(g).buoni.length, 0, `"${g}" non deve produrre comandi`);
  }
});

// ------------------------------------------------------------ l'anteprima
test('dice cosa sovrascriverebbe e cosa è già identico', () => {
  const esistenti = [
    { trigger: { comando: 'discord' }, azioni: [{ tipo: 'messaggio', testo: 'vecchio invito' }] },
    { trigger: { comando: 'ciao' }, azioni: [{ tipo: 'messaggio', testo: 'ciao $user' }] },
  ];
  const a = anteprima('!discord nuovo invito\n!ciao ciao $(user)\n!nuovo roba nuova', { esistenti });
  assert.equal(a.buoni.find((x) => x.nome === 'discord').sovrascrive, true);
  assert.equal(a.buoni.find((x) => x.nome === 'ciao').uguale, true, 'identico: non è una sovrascrittura');
  assert.equal(a.buoni.find((x) => x.nome === 'nuovo').sovrascrive, false);
});

test('i comandi da rivedere stanno in un mucchio a parte', () => {
  const a = anteprima('!meteo $(urlfetch https://x)\n!discord entra qui');
  assert.deepEqual(nomi(a.buoni), ['discord']);
  assert.deepEqual(nomi(a.daRivedere), ['meteo']);
  assert.ok(a.daRivedere[0].avvisi.length, 'e dicono perché');
});

test("l'originale resta visibile accanto alla traduzione", () => {
  const a = anteprima('!ciao ciao $(user)');
  assert.equal(a.buoni[0].originale, 'ciao $(user)');
  assert.equal(a.buoni[0].risposta, 'ciao $user');
});

test('scarta i doppioni e le righe inutilizzabili', () => {
  const a = anteprima('!uno prima\n!uno seconda\n! senza nome\n!vuoto ');
  assert.equal(a.buoni.length, 1);
  assert.ok(a.scartati.some((x) => x.perche === 'ripetuto nel file'));
});

test('un file enorme viene troncato, e lo dice', () => {
  const g = Array.from({ length: 800 }, (_, i) => `!c${i} risposta ${i}`).join('\n');
  const a = anteprima(g, { max: 500 });
  assert.equal(a.buoni.length, 500);
  assert.equal(a.troncato, true);
  assert.equal(a.totale, 800);
});

test('un JSON ostile non fa cadere niente', () => {
  for (const g of ['{"commands":[null,1,"x",{}]}', '{"commands":{}}', '[[]]', '{"commands":[{"name":"!x"}]}']) {
    assert.doesNotThrow(() => anteprima(g), g);
  }
});

test('il modulo che ne esce è un comando vero', () => {
  const m = moduloDa({ nome: 'discord', risposta: 'entra: x' });
  assert.equal(m.trigger.tipo, 'comando');
  assert.equal(m.trigger.comando, 'discord');
  assert.equal(m.azioni[0].tipo, 'messaggio');
  assert.equal(m.azioni[0].testo, 'entra: x');
  assert.equal(m.attivo, true);
  assert.equal(moduloDa({ nome: 'x', risposta: 'y', attivo: false }).attivo, false);
});
