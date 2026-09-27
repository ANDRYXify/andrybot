// L'IMPORT da un altro bot: comandi, timer e punti (docs/PONTE.md). Il
// criterio: niente entra in chat a mentire. Un comando che verrebbe fuori
// sbagliato va DICHIARATO, non importato di nascosto — «sei morto $(count)
// volte» scritto così davanti a tutti è peggio di un comando non importato.
// Il registro dei punti nel database sta in importapunti.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { anteprima, traduci, normalizzaNome, moduloDa, moduloTimerDa, minutiDa, numeroPunti } from '../../src/features/importacomandi.js';

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

// Il brano in ascolto qui si chiede con un comando delle richieste musicali,
// che sono nel piano gratuito: non un «add-on» da comprare.
test('il brano in ascolto porta al comando vero, senza add-on', async () => {
  const { COMANDI } = await import('../../src/features/comandi-registro.js');
  const ab = await import('../../src/features/abbonamenti.js');
  const r = traduci('Ora suona: $(spotify)');
  const dove = r.avvisi[0].dove;
  assert.doesNotMatch(dove, /add-on/i);
  const nome = /!([a-z]+)/.exec(dove)?.[1];
  const c = COMANDI.find((x) => x.nomi.includes(nome));
  assert.ok(c && c.modulo === 'musica', `!${nome} e' un comando delle richieste musicali`);
  assert.equal(ab.abilitata(ab.funzioniDi({ tier: 'free' }), 'musica'), true, 'e le richieste musicali sono nell\'Essenziale');
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

test('un modulo a tempo con lo stesso nome non è il comando che si sostituisce', () => {
  const esistenti = [{ nome: 'social', trigger: { tipo: 'timer', minuti: 15 }, azioni: [{ tipo: 'messaggio', testo: 'x' }] }];
  const a = anteprima('!social i miei social', { esistenti });
  assert.equal(a.buoni[0].sovrascrive, false, 'il server ne creerebbe uno nuovo: l\'anteprima deve dire lo stesso');
});

// ================================================================ i timer
const nightbot = (timers) => JSON.stringify({ _total: timers.length, status: 200, timers });
const tNomi = (l) => l.map((x) => x.nome).sort();

test('un timer di Nightbot è un timer, non un comando che si chiama come lui', () => {
  const a = anteprima(nightbot([{ _id: 'x', name: 'social', message: 'Seguimi su Instagram', interval: '*/15 * * * *', lines: 2, enabled: true }]));
  assert.equal(a.buoni.length + a.daRivedere.length, 0, 'nessun comando !social');
  const t = a.timer.buoni[0];
  assert.deepEqual([t.nome, t.minuti, t.minMessaggi, t.testo], ['social', 15, 2, 'Seguimi su Instagram']);
  assert.equal(t.ancheOffline, true, 'Nightbot parla anche a canale spento, e il timer lo porta con sé');
  assert.equal(t.soloOffline, false);
});

test('il cron diventa un intervallo solo se scatta a distanze uguali per tutto il giorno', () => {
  for (const [cron, min] of [['*/5 * * * *', 5], ['*/15 * * * *', 15], ['0 * * * *', 60], ['0 */2 * * *', 120],
    ['5,35 * * * *', 30], ['0-59/20 * * * *', 20], ['30 */6 * * *', 360], ['0 * * * 1-7', 60], ['0 * * * 0-6', 60], ['*/10 * ? * *', 10]]) {
    assert.deepEqual(minutiDa(cron), { minuti: min }, cron);
  }
  // distanze diverse: lo stesso numero di messaggi al giorno, e lo si dice
  const irregolare = (cron, min) => {
    const r = minutiDa(cron);
    assert.equal(r.minuti, min, cron);
    assert.ok(r.avvisi.some((a) => a.tipo === 'irregolare'), `${cron}: detto, non taciuto`);
  };
  irregolare('0,10 * * * *', 30);
  irregolare('*/7 * * * *', 7);
  irregolare('0 */5 * * *', 288);
  irregolare('0 0-22 * * *', 63);
  const feriali = minutiDa('*/15 * * * 1-5');
  assert.equal(feriali.minuti, 15);
  assert.match(feriali.avvisi[0].cosa, /tutti i giorni/);
  assert.match(minutiDa('0 * 1 * *').avvisi[0].cosa, /tutti i giorni/);
  assert.match(minutiDa('99 * * * *').perche, /non so leggere/);
  assert.match(minutiDa('0 * * 13 *').perche, /non so leggere/);
  const giorno = minutiDa('0 20 * * *');
  assert.equal(giorno.minuti, 1440);
  assert.match(giorno.avvisi[0].cosa, /ora fissa/, 'a un\'ora fissa del giorno si ripete ogni 24 ore, e lo si dice');
  const a = anteprima(JSON.stringify({ timers: [{ name: 'feriali', message: 'x', interval: '*/15 * * * 1-5' }] }));
  assert.equal(a.timer.daRivedere[0].nome, 'feriali', 'entra da rivedere, non si perde');
});

test('gli intervalli scritti come li scrive la gente', () => {
  for (const [x, min] of [[15, 15], ['15', 15], ['15m', 15], ['15 min', 15], ['15 minuti', 15], ['20 minutes', 20], ['1h', 60],
    ['1h30', 90], ['1 ora e 30 minuti', 90], ['2 ore', 120], ['ora', 60], ['hour', 60], ['1440', 1440]]) {
    assert.deepEqual(minutiDa(x), { minuti: min }, String(x));
  }
  assert.match(minutiDa('1441').perche, /24 ore/);
  assert.match(minutiDa(0).perche, /minuto/);
  assert.match(minutiDa('3 secondi').perche, /non so leggere/);
});

test('StreamElements: diretta e fuori diretta diventano esattamente quello che erano', () => {
  const se = (nome, online, offline) => ({ name: nome, enabled: true, chatLines: 3, messages: ['ciao'], online, offline });
  const a = anteprima(JSON.stringify([
    se('solo-live', { enabled: true, interval: 15 }, { enabled: false, interval: 30 }),
    se('solo-fuori', { enabled: false, interval: 15 }, { enabled: true, interval: 30 }),
    se('uguale', { enabled: true, interval: 20 }, { enabled: true, interval: 20 }),
    se('diverso', { enabled: true, interval: 20 }, { enabled: true, interval: 60 }),
    se('spento', { enabled: false, interval: 25 }, { enabled: false, interval: 40 }),
  ]));
  const per = Object.fromEntries(a.timer.buoni.map((t) => [t.nome, t]));
  const forma = (t) => [t.minuti, t.ancheOffline, t.soloOffline, t.attivo];
  assert.deepEqual(forma(per['solo-live']), [15, false, false, true]);
  assert.deepEqual(forma(per['solo-fuori']), [30, true, true, true]);
  assert.deepEqual(forma(per.uguale), [20, true, false, true], 'stesso ritmo: un modulo che parla sempre');
  assert.deepEqual(forma(per['diverso (in diretta)']), [20, false, false, true], 'ritmi diversi: due moduli');
  assert.deepEqual(forma(per['diverso (fuori diretta)']), [60, true, true, true]);
  assert.equal(per.spento.attivo, false, 'spento dappertutto: entra spento, col suo ritmo');
  assert.equal(per.spento.minuti, 25);
  assert.equal(per.uguale.minMessaggi, 3, 'le righe di chat: lo stesso numero, mai più severo di prima');
});

test('più messaggi: uno per volta a caso, detto; se non si può, entra il primo e va rivisto', () => {
  const a = anteprima(JSON.stringify([
    { name: 'giro', online: { enabled: true, interval: 10 }, messages: ['Uno $(user)', 'Due', 'Tre'] },
    { name: 'rotto', online: { enabled: true, interval: 10 }, messages: ['a | b', 'c'] },
  ]));
  const giro = a.timer.buoni.find((t) => t.nome === 'giro');
  assert.equal(giro.testo, '$scegli(Uno $user|Due|Tre)');
  assert.ok(giro.note.some((n) => /a caso/.test(n)), 'la differenza dal «in fila» si scrive accanto');
  const rotto = a.timer.daRivedere.find((t) => t.nome === 'rotto');
  assert.equal(rotto.testo, 'a | b');
  assert.match(rotto.avvisi[0].cosa, /entra il primo/);
});

test('un timer che lancia un comando prende la sua risposta, se il comando c\'è', () => {
  const g = JSON.stringify({
    commands: [{ name: '!discord', message: 'Entra: discord.gg/x' }, { name: '!discord', message: 'doppione' }],
    timers: [
      { name: 'd', message: '!discord', interval: 30 },
      { name: 'v', message: '!vecchio', interval: 30 },
      { name: 'n', message: '!nessuno', interval: 30 },
    ],
  });
  const esistenti = [{ nome: '!vecchio', trigger: { tipo: 'comando', comando: 'vecchio' }, azioni: [{ tipo: 'messaggio', testo: 'dal pannello' }] }];
  const a = anteprima(g, { esistenti });
  const per = Object.fromEntries([...a.timer.buoni, ...a.timer.daRivedere].map((t) => [t.nome, t]));
  assert.equal(per.d.testo, 'Entra: discord.gg/x', 'la prima risposta, come per i comandi ripetuti');
  assert.ok(per.d.note.some((n) => /!discord/.test(n)));
  assert.equal(per.v.testo, 'dal pannello', 'anche un comando che c\'è già');
  assert.ok(a.timer.daRivedere.includes(per.n), 'un comando che non c\'è: da rivedere');
  assert.match(per.n.avvisi[0].cosa, /!nessuno/);
});

test('un timer si riconosce dal nome: identico, sostituisce, o nuovo', () => {
  const esistenti = [
    moduloTimerDa({ nome: 'social', minuti: 15, minMessaggi: 2, ancheOffline: true, soloOffline: false, testo: 'Seguimi' }),
    moduloTimerDa({ nome: 'discord', minuti: 60, minMessaggi: 0, ancheOffline: true, soloOffline: false, testo: 'vecchio' }),
    moduloTimerDa({ nome: 'notte', minuti: 30, minMessaggi: 0, ancheOffline: true, soloOffline: false, testo: 'buonanotte' }),
    { nome: '!social', trigger: { tipo: 'comando', comando: 'social' }, azioni: [{ tipo: 'messaggio', testo: 'x' }] },
  ];
  const a = anteprima(nightbot([
    { name: 'Social', message: 'Seguimi', interval: '*/15 * * * *', lines: 2 },
    { name: 'discord', message: 'nuovo', interval: '0 * * * *', lines: 0 },
    { name: 'nuovo', message: 'ciao', interval: '*/20 * * * *', lines: 0 },
  ]), { esistenti });
  const per = Object.fromEntries(a.timer.buoni.map((t) => [t.nome.toLowerCase(), t]));
  assert.equal(per.social.uguale, true);
  assert.equal(per.discord.sovrascrive, true);
  const b = anteprima(JSON.stringify([{ name: 'notte', messages: ['buonanotte'], online: { enabled: false, interval: 30 }, offline: { enabled: true, interval: 30 } }]), { esistenti });
  assert.equal(b.timer.buoni[0].sovrascrive, true, 'da «sempre» a «solo fuori diretta» è un timer diverso');
  assert.deepEqual([per.nuovo.uguale, per.nuovo.sovrascrive], [false, false]);
});

test('un elenco di timer scritto a mano, importato due volte, non raddoppia', () => {
  const g = 'ogni 15 minuti: Seguimi su Instagram, anche se sei di passaggio';
  const prima = anteprima(g);
  const t = prima.timer.buoni[0];
  assert.match(t.nome, /^Timer: Seguimi su Instagram/);
  const dopo = anteprima(g, { esistenti: [{ ...moduloTimerDa(t), id: 1 }] });
  assert.equal(dopo.timer.buoni[0].uguale, true);
});

test('i timer scritti a mano: ogni quanto, quanti messaggi, anche offline; il resto non si butta', () => {
  const a = anteprima(['ogni 15 minuti, almeno 3 messaggi: Seguimi!', 'every 1h: hello $(user)', 'cada 30 minutos: hola',
    'ogni 2 ore anche offline: notte', 'ogni 10 min (5 righe): righe', 'ogni 30 min solo il sabato: boh', 'ogni tanto: mah', 'ogni 2 giorni: no'].join('\n'));
  const per = Object.fromEntries([...a.timer.buoni, ...a.timer.daRivedere].map((t) => [t.testo, t]));
  assert.deepEqual([per['Seguimi!'].minuti, per['Seguimi!'].minMessaggi, per['Seguimi!'].ancheOffline], [15, 3, false]);
  assert.equal(per['hello $user'].minuti, 60);
  assert.equal(per.hola.minuti, 30);
  assert.deepEqual([per.notte.minuti, per.notte.ancheOffline], [120, true]);
  assert.equal(per.righe.minMessaggi, 5);
  assert.ok(a.timer.daRivedere.includes(per.boh), 'quello che non capisco va rivisto, non ignorato');
  assert.match(per.boh.avvisi[0].cosa, /solo il sabato/);
  assert.deepEqual(a.timer.scartati.map((x) => x.nome).sort(), ['mah', 'no']);
  assert.equal(a.buoni.length, 0, 'nessuna riga di timer diventa un comando');
});

test('un timer da CSV: decide l\'intestazione', () => {
  const a = anteprima('nome;messaggio;minuti;righe\nsocial;Seguimi;15;2\ndiscord;"Entra; subito";1h;0');
  assert.equal(a.formato, 'csv');
  assert.deepEqual(a.timer.buoni.map((t) => [t.nome, t.testo, t.minuti, t.minMessaggi]), [['social', 'Seguimi', 15, 2], ['discord', 'Entra; subito', 60, 0]]);
});

test('le richieste fuori misura si dicono', () => {
  const a = anteprima(nightbot([{ name: 'folla', message: 'x', interval: 15, lines: 5000 }]));
  const t = a.timer.daRivedere[0];
  assert.equal(t.minMessaggi, 1000);
  assert.match(t.avvisi[0].cosa, /1000/);
});

test('il modulo di un timer è un modulo a tempo vero', () => {
  const m = moduloTimerDa({ nome: 'n', minuti: 30, minMessaggi: 2, ancheOffline: true, soloOffline: true, testo: 't', attivo: false });
  assert.deepEqual(m, { nome: 'n', attivo: false, trigger: { tipo: 'timer', minuti: 30, minMessaggi: 2, ancheOffline: true }, condizioni: { soloOffline: true }, azioni: [{ tipo: 'messaggio', testo: 't' }] });
  assert.deepEqual(moduloTimerDa({ nome: 'n', minuti: 5, minMessaggi: 0, ancheOffline: false, soloOffline: false, testo: 't' }).condizioni, {});
});

// ================================================================ i punti
const saldiDi = (a) => Object.fromEntries(a.punti.voci.map((v) => [v.utente, v.monete]));

test('i numeri dei saldi, come li scrive la gente', () => {
  for (const [x, n] of [['1200', 1200], ['1.200', 1200], ['1,200', 1200], ["1'200", 1200], ['1 200', 1200], ['+15', 15],
    ['12,5', 12], ['12.75', 12], ['1.200,50', 1200], ['1,200.50', 1200], ['1.200.300', 1200300], [12.7, 12], [0, 0]]) {
    assert.deepEqual(numeroPunti(x), { n }, String(x));
  }
  for (const [x, re] of [['-5', /sotto zero/], [-5, /sotto zero/], ['1.200,300', /numero/], ['1.2.3', /numero/], ['abc', /numero/],
    ['99999999999', /troppo grande/], [Infinity, /numero/]]) {
    assert.match(numeroPunti(x).perche, re, String(x));
  }
});

test('i punti arrivano da ogni forma: JSON, CSV, foglio di calcolo, CSV all\'italiana, elenco a mano', () => {
  const attesi = { marco: 1200, giada: 800 };
  for (const g of [
    JSON.stringify({ _total: 2, users: [{ username: 'marco', points: 1200 }, { username: 'giada', points: 800 }] }),
    'Name,Rank,Points,Hours\nMarco,Rank 1,"1,200",40\nGiada,Rank 2,800,3',
    'Name\tPoints\nmarco\t1.200\ngiada\t800',
    'Utente;Punti\nmarco;1200\ngiada;800',
    'marco,1200\ngiada,800',
    'marco 1200\n@giada: 800',
  ]) {
    const a = anteprima(g);
    assert.deepEqual(saldiDi(a), attesi, g);
    assert.equal(a.buoni.length, 0, `nessun comando da: ${g}`);
  }
  assert.equal(anteprima('Name,Rank,Points,Hours\nmarco,1,5,40').punti.oreFuori, true, 'le ore guardate restano fuori, e lo si dice');
});

test('dopo il nome solo un numero è un saldo; testo o «!» davanti è un comando', () => {
  const a = anteprima('marco: 1200\nlurk: buon lurk\n!anni 30\ngiada 1.200.300');
  assert.deepEqual(saldiDi(a), { marco: 1200, giada: 1200300 });
  assert.deepEqual(a.buoni.map((c) => c.nome).sort(), ['anni', 'lurk']);
});

test('un elenco a mano con qualche virgola non diventa un CSV', () => {
  const a = anteprima('!ciao ciao, come va\n!social i miei social, tutti');
  assert.equal(a.formato, 'righe');
  assert.deepEqual(a.buoni.map((c) => [c.nome, c.risposta]), [['ciao', 'ciao, come va'], ['social', 'i miei social, tutti']]);
});

test('fuori restano i bot, i nomi che non sono nomi, i numeri che non sono saldi, i doppioni: e si dice perché', () => {
  const a = anteprima('user,points\nmarco,10\nnightbot,500\n??,3\nmarco,20\ngiada,-4\nlucia,99999999999\npiero,tanti', { escludi: new Set(['nightbot']) });
  assert.deepEqual(saldiDi(a), { marco: 10 });
  const perche = Object.fromEntries(a.punti.scartati.map((x) => [x.nome, x.perche]));
  assert.deepEqual(perche, { nightbot: 'è un bot', '??': 'non è un nome utente', marco: 'ripetuto nel file', giada: 'saldo sotto zero', lucia: 'troppo grande per essere un saldo', piero: 'non è un numero' });
  assert.equal(a.punti.scartatiTotale, 6);
});

test('il cambio divide e arrotonda in giù; i primi sono i più ricchi', () => {
  const a = anteprima('marco 1250\ngiada 999\nlucia 5000\npiero 9', { tasso: 10 });
  assert.equal(a.punti.tasso, 10);
  assert.deepEqual(a.punti.top.map((v) => [v.utente, v.monete]), [['lucia', 500], ['marco', 125], ['giada', 99]]);
  assert.equal(a.punti.zero, 1, 'nove punti diviso dieci è zero: niente da fare');
  assert.equal(anteprima('marco 5', { tasso: 'boh' }).punti.tasso, 1, 'un cambio illeggibile è uno a uno');
});

test('l\'anteprima fa i conti col registro: si somma, una volta sola', () => {
  const saldi = new Map([
    ['marco', { monete: 300, importate: 0 }],
    ['giada', { monete: 900, importate: 1000 }],
    ['lucia', { monete: 50, importate: 700 }],
    ['piero', { monete: 40, importate: 40 }],
  ]);
  const a = anteprima('marco 1000\ngiada 1000\nlucia 400\npiero 0\nnuova 10', { saldi });
  const per = Object.fromEntries(a.punti.voci.map((v) => [v.utente, v]));
  assert.equal(per.marco.dopo, 1300, 'chi ha già monete qui le tiene');
  assert.equal(per.giada, undefined, 'lo stesso saldo già importato non cambia niente');
  assert.equal(a.punti.invariati, 1);
  assert.equal(per.lucia.dopo, 0, 'un saldo più basso toglie la differenza, e mai sotto zero');
  assert.equal(per.piero.dopo, 0, 'zero nel file toglie quello che era arrivato');
  assert.equal(per.nuova.nuovo, true);
  assert.equal(a.punti.nuovi, 1);
  assert.equal(a.punti.entrano, (1300 - 300) + (0 - 50) + (0 - 40) + 10);
  let letti = 0;
  anteprima('!solo un comando', { saldi: () => { letti++; return new Map(); } });
  assert.equal(letti, 0, 'i saldi del canale si leggono solo se nel testo ci sono punti');
});

test('comandi, timer e punti nello stesso file si leggono tutti', () => {
  const a = anteprima(JSON.stringify({
    commands: [{ name: '!ciao', message: 'ciao $(user)' }],
    timers: [{ name: 'social', message: 'Seguimi', interval: '*/15 * * * *', lines: 0 }],
    users: [{ username: 'marco', points: 10 }],
  }));
  assert.deepEqual([a.buoni.length, a.timer.buoni.length, a.punti.cambiano], [1, 1, 1]);
});
