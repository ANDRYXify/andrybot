// COME SI VEDE UN RUOLO: i difetti che non devono esistere.
//
// Discord, sull'aspetto di un ruolo, ha due caratteristiche che il server puo'
// avere o non avere, e una regola che non si negozia. Il ragionamento sta in
// docs/DISCORD-RUOLI.md; qui ci sono le cose che devono restare vere:
//
//  · l'olografico non e' un colore, e' un interruttore: i tre numeri li impone
//    Discord, e uno stato diverso non si puo' nemmeno salvare;
//  · il segno e' uno solo — o l'emoji o l'immagine — e chi lo scrive spegne
//    sempre l'altro, se no il ruolo finisce con due segni;
//  · quello che il server non sa fare non si chiede, e si dice quale;
//  · non si riscrive l'uguale, che per un'immagine vuol dire: senza byte
//    nuovi, l'impronta di prima basta;
//  · dei byte di un'immagine non resta niente: entrano solo con la richiesta
//    di costruire.
import test from 'node:test';
import assert from 'node:assert/strict';
import { differenzaRuoli, normalizzaTinta, normalizzaSegno, modoTinta, stessoSegno, segnoDi, CON_SEGNO, CON_TINTE } from '../../src/features/discord-preset.js';
import { creaRuolo, sistemaRuolo, OLOGRAFICO } from '../../src/features/discord-api.js';

const vero = globalThis.fetch;
// Qui serve il CORPO di quello che parte, non solo l'indirizzo: tutto quello
// che si misura in questo file e' cosa arriva a Discord.
function finto(corpoRisposta = {}) {
  const visti = [];
  globalThis.fetch = async (url, opz = {}) => {
    visti.push({ url: String(url), metodo: opz.method || 'GET', corpo: opz.body ? JSON.parse(opz.body) : null });
    return { status: 200, ok: true, json: async () => corpoRisposta };
  };
  return visti;
}
const ripulisci = () => { globalThis.fetch = vero; };

const CON_TUTTO = [CON_SEGNO, CON_TINTE];
const foto = (ruoli = [], caratteristiche = CON_TUTTO) => ({ ruoli, caratteristiche, guild: { id: '1' } });
const unRuolo = (x) => ({ id: '100000000000000001', nome: 'Moderatori', position: 1, managed: false,
  colore: 0, sfuma: null, olografico: false, icona: '', emoji: '', permessi: '0', separato: false, citabile: false, ...x });

test('l\'olografico e\' un interruttore: i tre numeri li impone Discord', () => {
  const t = normalizzaTinta({ olografico: true, colore: 0x123456, sfuma: 0x654321 });
  assert.equal(t.colore, OLOGRAFICO.primo);
  assert.equal(t.sfuma, OLOGRAFICO.secondo);
  assert.equal(t.olografico, true);
  // E i colori che aveva scelto non restano da nessuna parte: uno stato che
  // Discord rifiuterebbe non si puo' nemmeno salvare, quindi non c'e' niente
  // da «risolvere» dopo.
  assert.equal(Object.keys(t).sort().join(','), 'colore,olografico,sfuma');
});

test('i tre modi si ricavano, non si memorizzano', () => {
  assert.equal(modoTinta({ colore: 5 }), 'unita');
  assert.equal(modoTinta({ colore: 5, sfuma: 9 }), 'sfumatura');
  assert.equal(modoTinta({ olografico: true }), 'olografico');
  // Un quarto posto dove scrivere il modo sarebbe un posto che un giorno dice
  // una cosa diversa dagli altri due.
});

test('il segno e\' uno solo: il tipo decide, e le altre caselle si svuotano', () => {
  assert.deepEqual(normalizzaSegno({ tipo: 'emoji', emoji: '⭐', icona: 'abc' }), { tipo: 'emoji', emoji: '⭐' });
  assert.deepEqual(normalizzaSegno({ tipo: 'immagine', icona: 'abc', emoji: '⭐' }), { tipo: 'immagine', icona: 'abc' });
  assert.deepEqual(normalizzaSegno({ tipo: 'emoji', emoji: '  ' }), { tipo: 'niente' });
  assert.deepEqual(normalizzaSegno({ tipo: 'immagine' }), { tipo: 'niente' }, 'un\'immagine di cui non sappiamo niente non e\' un segno');
  assert.deepEqual(normalizzaSegno(null), { tipo: 'niente' });
  assert.deepEqual(normalizzaSegno({ tipo: 'inventato' }), { tipo: 'niente' });
});

test('dei byte non resta niente: nella traccia non ci possono stare', () => {
  // `dato` non sopravvive alla normalizzazione, e nella traccia si salva solo
  // quello che la normalizzazione lascia passare. Non e' una promessa: e' che
  // non c'e' la strada.
  const n = normalizzaSegno({ tipo: 'immagine', icona: 'abc', dato: 'data:image/png;base64,AAAA' });
  assert.equal(n.dato, undefined);
});

test('quando arrivano dei byte, e\' per forza un\'altra immagine', () => {
  const gia = segnoDi({ icona: 'abc' });
  assert.equal(stessoSegno(gia, { tipo: 'immagine', icona: 'abc' }), true, 'stessa impronta: non si tocca');
  assert.equal(stessoSegno(gia, { tipo: 'immagine', icona: 'abc', dato: 'data:image/png;base64,AAAA' }), false,
    'nessuno carica un file per rimettere quello che c\'era');
});

test('l\'aspetto uguale non si riscrive: applicare due volte la seconda non fa niente', () => {
  const preset = { ruoli: [{ nome: 'Moderatori', colore: 0x3aa76d, sfuma: 0x1188ff, segno: { tipo: 'emoji', emoji: '⭐' } }] };
  const prima = differenzaRuoli(foto([unRuolo()]), preset);
  assert.equal(prima.sistema.length, 1, 'la prima volta c\'e\' da fare');
  // Il server DOPO: e' quello che la prima passata ha lasciato.
  const dopo = differenzaRuoli(foto([unRuolo({ colore: 0x3aa76d, sfuma: 0x1188ff, emoji: '⭐' })]), preset);
  assert.deepEqual(dopo.sistema, [], 'la seconda volta non c\'e\' niente da fare');
});

test('il primo colore da solo non distingue una sfumatura da una tinta piena', () => {
  // Confrontare un campo per volta direbbe «uguale» a un ruolo che ha lo stesso
  // primo colore ma non ha la sfumatura, e quel ruolo resterebbe piatto per
  // sempre senza che nessuno se ne accorga.
  const preset = { ruoli: [{ nome: 'Moderatori', colore: 0x3aa76d, sfuma: 0x1188ff }] };
  const d = differenzaRuoli(foto([unRuolo({ colore: 0x3aa76d })]), preset);
  assert.equal(d.sistema.length, 1);
  assert.equal(d.sistema[0].sfuma, 0x1188ff);
});

test('quello che il server non sa fare non si chiede, e si dice quale', () => {
  const preset = { ruoli: [{ nome: 'Nuovo', colore: 0x3aa76d, sfuma: 0x1188ff, segno: { tipo: 'emoji', emoji: '⭐' } }] };
  const senza = differenzaRuoli(foto([], []), preset);
  assert.equal(senza.crea.length, 1);
  assert.equal(senza.crea[0].sfuma, null, 'la sfumatura non parte verso un server che la rifiuterebbe');
  assert.equal(senza.crea[0].segno, undefined, 'e nemmeno il segno');
  assert.deepEqual(senza.manca.sort(), ['segni', 'tinte'], 'e si dice PRIMA, non dopo il rifiuto');
  // Con le caratteristiche, le stesse cose partono e non manca niente.
  const con = differenzaRuoli(foto([], CON_TUTTO), preset);
  assert.equal(con.crea[0].sfuma, 0x1188ff);
  assert.deepEqual(con.crea[0].segno, { tipo: 'emoji', emoji: '⭐' });
  assert.deepEqual(con.manca, []);
});

test('l\'olografico senza la caratteristica resta il suo primo colore, non il grigio', () => {
  const d = differenzaRuoli(foto([], []), { ruoli: [{ nome: 'Nuovo', olografico: true }] });
  assert.equal(d.crea[0].olografico, false);
  assert.equal(d.crea[0].colore, OLOGRAFICO.primo, 'la cosa piu\' vicina a quello che aveva scelto');
  assert.deepEqual(d.manca, ['tinte']);
});

test('i byte entrano solo dalla richiesta di costruire, e per nome di ruolo', () => {
  const preset = { ruoli: [{ nome: 'Moderatori', segno: { tipo: 'immagine', icona: 'abc' } }] };
  const fermo = differenzaRuoli(foto([unRuolo({ icona: 'abc' })]), preset);
  assert.deepEqual(fermo.sistema, [], 'l\'immagine gia\' li\' non si rimette');
  const con = differenzaRuoli(foto([unRuolo({ icona: 'abc' })]), preset, { immagini: { moderatori: 'data:image/png;base64,AAAA' } });
  assert.equal(con.sistema.length, 1);
  assert.equal(con.sistema[0].segno.dato, 'data:image/png;base64,AAAA');
});

test('la tinta piatta va nel campo di sempre, la sfumatura in quello nuovo', async () => {
  // `color` e' dichiarato deprecato ma funziona ovunque; `colors` serve alla
  // sfumatura, che vuole la caratteristica. Mandarli tutti e due sarebbe dire
  // la stessa cosa due volte; mandare sempre il secondo vorrebbe dire spedire
  // il campo ricco anche dove non serve a niente.
  const visti = finto({ id: '100000000000000002', name: 'X' });
  try {
    await creaRuolo('t', '123456789', { nome: 'Piatto', colore: 0x3aa76d });
    assert.equal(visti[0].corpo.color, 0x3aa76d);
    assert.equal(visti[0].corpo.colors, undefined);

    await creaRuolo('t', '123456789', { nome: 'Sfumato', colore: 0x3aa76d, sfuma: 0x1188ff });
    assert.deepEqual(visti[1].corpo.colors, { primary_color: 0x3aa76d, secondary_color: 0x1188ff, tertiary_color: null });
    assert.equal(visti[1].corpo.color, undefined);

    await creaRuolo('t', '123456789', { nome: 'Olo', colore: 1, sfuma: 2, olografico: true });
    assert.deepEqual(visti[2].corpo.colors,
      { primary_color: OLOGRAFICO.primo, secondary_color: OLOGRAFICO.secondo, tertiary_color: OLOGRAFICO.terzo },
      'i numeri li impone Discord, non li sceglie chi chiama');
  } finally { ripulisci(); }
});

test('chi scrive un segno spegne sempre l\'altro', async () => {
  const visti = finto({ id: '100000000000000002', name: 'X', icon: 'nuovahash' });
  try {
    await sistemaRuolo('t', '123456789', '100000000000000003', { segno: { tipo: 'emoji', emoji: '⭐' } });
    assert.equal(visti[0].corpo.unicode_emoji, '⭐');
    assert.equal(visti[0].corpo.icon, null, 'se no resta l\'icona vecchia, e il ruolo ha due segni');

    await sistemaRuolo('t', '123456789', '100000000000000003', { segno: { tipo: 'immagine', dato: 'data:image/png;base64,AAAA' } });
    assert.equal(visti[1].corpo.icon, 'data:image/png;base64,AAAA');
    assert.equal(visti[1].corpo.unicode_emoji, null);

    await sistemaRuolo('t', '123456789', '100000000000000003', { segno: { tipo: 'niente' } });
    assert.equal(visti[2].corpo.icon, null);
    assert.equal(visti[2].corpo.unicode_emoji, null);

    // E l'impronta dell'icona torna indietro: e' l'unico momento in cui si puo'
    // sapere, e senza di lei la volta dopo si riscriverebbe la stessa immagine.
    const x = await sistemaRuolo('t', '123456789', '100000000000000003', { segno: { tipo: 'immagine', dato: 'data:image/png;base64,AAAA' } });
    assert.equal(x.icona, 'nuovahash');
  } finally { ripulisci(); }
});

test('un\'immagine senza byte non manda niente, invece di mandare il vuoto', async () => {
  // La traccia dice «qui c'e' un'immagine» e ne porta l'impronta, non i byte.
  // Se questo caso mandasse qualcosa, cancellerebbe l'icona che sta descrivendo.
  const visti = finto({ id: '100000000000000002', name: 'X' });
  try {
    await sistemaRuolo('t', '123456789', '100000000000000003', { segno: { tipo: 'immagine', icona: 'abc' }, colore: 5 });
    assert.equal(visti[0].corpo.icon, undefined);
    assert.equal(visti[0].corpo.unicode_emoji, undefined);
    assert.equal(visti[0].corpo.color, 5, 'e il resto parte lo stesso');
  } finally { ripulisci(); }
});
