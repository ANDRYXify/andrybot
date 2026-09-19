// LA CLASSIFICA DEI BIT E" DI TWITCH.
//
// Le prove che contano sono quelle in cui la nostra copia potrebbe scollarsi
// dall"originale, o dire una cosa per un"altra:
//
//  · "non lo sappiamo" e "non ha cheerato nessuno" non sono la stessa cosa. La
//    prima si tace, la seconda e" una risposta. Confonderle vuol dire scrivere
//    "ancora nessuno" a un canale che ci ha appena speso duemila Bit, solo
//    perche" manca un permesso;
//  · un "non lo so" non si mette in memoria, se no un permesso appena ridato
//    resta inutile per minuti;
//  · la memoria si butta al cheer: e" l"unico momento in cui la classifica puo"
//    essere cambiata, ed e" anche il momento in cui la gente scrive !bit.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as bit from '../../src/features/bit.js';

const RIGHE = [
  { login: 'mario', nome: 'Mario', posto: 1, bit: 5000 },
  { login: 'giada', nome: 'Giada', posto: 2, bit: 1200 },
  { login: 'luca', nome: 'Luca', posto: 3, bit: 900 },
  { login: 'pino', nome: 'Pino', posto: 12, bit: 300 },
];

// Un Twitch finto che conta quante volte glielo si chiede.
const finto = (risposta) => {
  const h = { chiamate: 0, getClassificaBit: async () => { h.chiamate++; return typeof risposta === 'function' ? risposta() : risposta; } };
  return h;
};

const ORA = 1_700_000_000_000;

test("i numeri si leggono col punto delle migliaia", () => {
  assert.equal(bit.migliaia(900), '900');
  assert.equal(bit.migliaia(5000), '5.000');
  assert.equal(bit.migliaia(1234567), '1.234.567');
  assert.equal(bit.migliaia(0), '0');
  assert.equal(bit.migliaia(-5), '0', 'nessuno ha messo Bit negativi');
});

test("la riga mostra il podio, e a chi e fuori dice dov e", () => {
  const r = bit.inParole(RIGHE, 'pino', 'month');
  assert.match(r, /Mario 5\.000/);
  assert.match(r, /Giada 1\.200/);
  assert.match(r, /Luca 900/);
  assert.match(r, /12\u00b0 posto con 300/, 'la posizione di chi ha chiesto e la riga che fa cheerare');
  assert.ok(!r.includes('Pino'), 'il quarto in giu non entra nel podio');
});

test("chi e gia sul podio non se lo sente ripetere", () => {
  const r = bit.inParole(RIGHE, 'giada', 'month');
  assert.ok(!/posto con/.test(r), 'si vede da sola: dirglielo due volte e" rumore');
});

test("e chi non ha mai cheerato non compare per niente", () => {
  const r = bit.inParole(RIGHE, 'sconosciuto', 'month');
  assert.ok(!/posto con/.test(r));
});

test("nessun Bit e una risposta, e invita a essere il primo", () => {
  const r = bit.inParole([], 'pino', 'week');
  assert.match(r, /questa settimana/);
  assert.match(r, /primo posto \u00e8 libero/);
});

test("non saperlo non e una risposta: non si scrive niente", () => {
  assert.equal(bit.inParole(null, 'pino', 'month'), '');
});

test("ogni periodo ha il suo nome in italiano", () => {
  for (const p of bit.PERIODI) {
    assert.ok(bit.QUANDO[p], `manca il nome di ${p}`);
    assert.match(bit.inParole(RIGHE, '', p), new RegExp(bit.QUANDO[p].replace("'", "'")));
  }
});

test("si chiede a Twitch una volta sola, poi si tiene per qualche minuto", async () => {
  bit.scorda();
  const h = finto(RIGHE);
  await bit.classifica(h, 'alfa', { ora: ORA });
  await bit.classifica(h, 'alfa', { ora: ORA + 1000 });
  await bit.classifica(h, 'alfa', { ora: ORA + 60_000 });
  assert.equal(h.chiamate, 1);
  await bit.classifica(h, 'alfa', { ora: ORA + 10 * 60_000 });
  assert.equal(h.chiamate, 2, 'dopo un po la si richiede');
});

test("periodi diversi sono domande diverse", async () => {
  bit.scorda();
  const h = finto(RIGHE);
  await bit.classifica(h, 'alfa', { periodo: 'month', ora: ORA });
  await bit.classifica(h, 'alfa', { periodo: 'week', ora: ORA });
  assert.equal(h.chiamate, 2);
});

test("un cheer butta la memoria: chi scrive subito dopo si vede gia dentro", async () => {
  bit.scorda();
  const h = finto(RIGHE);
  await bit.classifica(h, 'alfa', { ora: ORA });
  assert.equal(h.chiamate, 1);
  bit.scorda('alfa');
  await bit.classifica(h, 'alfa', { ora: ORA + 1000 });
  assert.equal(h.chiamate, 2);
});

test("e butta solo la memoria di quel canale", async () => {
  bit.scorda();
  const h = finto(RIGHE);
  await bit.classifica(h, 'alfa', { ora: ORA });
  await bit.classifica(h, 'beta', { ora: ORA });
  bit.scorda('alfa');
  await bit.classifica(h, 'beta', { ora: ORA + 1000 });
  assert.equal(h.chiamate, 2, 'beta non c entrava niente');
});

test("un non lo so non si mette in memoria", async () => {
  bit.scorda();
  const h = finto(null);
  await bit.classifica(h, 'alfa', { ora: ORA });
  await bit.classifica(h, 'alfa', { ora: ORA + 1000 });
  assert.equal(h.chiamate, 2, 'un permesso appena ridato deve funzionare subito, non fra tre minuti');
});

test("senza Twitch la riga e vuota, non una bugia", async () => {
  bit.scorda();
  assert.equal(await bit.riga(null, 'alfa', { ora: ORA }), '');
  assert.equal(await bit.riga(finto(null), 'alfa', { ora: ORA }), '');
});

test("con Twitch la riga esce, e porta la posizione di chi ha chiesto", async () => {
  bit.scorda();
  const r = await bit.riga(finto(RIGHE), 'alfa', { mio: 'pino', ora: ORA });
  assert.match(r, /Mario 5\.000/);
  assert.match(r, /12\u00b0 posto/);
});

// IL CHEER SENZA NOME.
//
// Twitch lascia cheerare in anonimo e in quel caso non manda nessun nome. Il
// pericolo non e' restare senza una parola: e' inventarne una. Due domande
// diverse — «chi e' stato?» e «come lo chiamo?» — devono dare due risposte
// diverse, e una delle due deve poter essere NIENTE.
test('chi e\' anonimo non ha un nome, e nessuno gliene da\' uno', () => {
  assert.equal(bit.chiHaCheerato({ is_anonymous: true, user_name: 'Ludo' }), '',
    'anche se per sbaglio arrivasse un nome, chi ha chiesto l\'anonimato non entra in una classifica');
  assert.equal(bit.chiHaCheerato({ user_name: 'Ludo' }), 'Ludo');
  assert.equal(bit.chiHaCheerato({ user_login: 'ludo' }), 'ludo', 'il login va bene quando il nome non c\'e\'');
  assert.equal(bit.chiHaCheerato({}), '');
  assert.equal(bit.chiHaCheerato(null), '');
  assert.equal(bit.chiHaCheerato({ user_name: 'x'.repeat(90) }).length, 40, 'un nome lunghissimo non sfonda le righe');
});

test('e per una frase da leggere c\'e\' una parola onesta, non un nome finto', () => {
  assert.equal(bit.comeSiChiama({ is_anonymous: true }), bit.ANONIMO);
  assert.ok(!/anonymous|null|undefined/i.test(bit.ANONIMO), `«${bit.ANONIMO}» non deve sembrare una parola del sistema`);
  assert.equal(bit.comeSiChiama({ user_name: 'Ludo' }), 'Ludo');
  assert.equal(bit.comeSiChiama({}), 'qualcuno', 'non sapere chi e\' e\' un\'altra cosa dall\'essere anonimi');
  assert.equal(bit.comeSiChiama({}, 'un canale amico'), 'un canale amico', 'e chi chiama puo\' dire lui come chiamarlo');
});

// La regola sta in un posto solo APPOSTA: se un avviso o un Modulo se la
// riscrive per conto suo, il giorno che cambia cambia in tre quarti dei posti.
test('gli avvisi e i Moduli prendono il nome da qui, non se lo rifanno', async () => {
  const { readFileSync } = await import('node:fs');
  for (const f of ['src/features/alerts.js', 'src/features/modules.js']) {
    const s = readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
    assert.match(s, /comeSiChiama/, `${f}: il nome da mostrare viene dalla regola condivisa`);
    assert.ok(!/user: d\.user_name \|\| d\.user_login/.test(s) && !/const user = d\.user_name \|\| d\.user_login/.test(s),
      `${f}: e non c'e' piu' un ripiego scritto a mano, che dell'anonimato non sa niente`);
  }
});
