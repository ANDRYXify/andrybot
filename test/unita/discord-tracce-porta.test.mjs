// LE TRACCE SI PORTANO DIETRO UNA PORTA CHE STA IN PIEDI.
//
// Una porta gia' scritta e' comoda finche' e' giusta. Le due cose che la
// renderebbero una trappola:
//
//  · NOMINARE UN CANALE CHE QUELLA TRACCIA NON HA. Al momento di costruire quel
//    nome cade, e la porta esce monca senza che nessuno abbia sbagliato niente.
//    Qui si controlla che ogni nome della porta e del filtro sia un canale o un
//    ruolo che la traccia crea davvero.
//  · ESSERE ACCESA QUANDO DISCORD LA RIFIUTEREBBE. Sette canali che contano e
//    cinque dove si scrive: se una traccia non ci arriva, la sua porta dev'essere
//    scritta ma SPENTA. Il conto lo fa la macchina, non l'occhio di chi scrive
//    il catalogo — e questo collaudo e' quel conto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGO, normalizzaPreset, portaPronta, filtroPronto } from '../../src/features/discord-catalogo.js';
import { differenzaIngresso, MIN_PARTENZA, MIN_APERTI } from '../../src/features/discord-preset.js';
import { VIEW_CHANNEL, SEND_MESSAGES } from '../../src/features/discord-api.js';

// Un server vuoto ma di tipo Community: e' il caso in cui una traccia si applica
// davvero la prima volta, ed e' il piu' severo — non c'e' nessun canale a fare
// numero oltre a quelli che la traccia crea.
const vuotoCommunity = {
  guild: { id: '100' },
  caratteristiche: ['COMMUNITY'],
  ruoli: [{ id: '100', nome: '@everyone', permessi: String(VIEW_CHANNEL | SEND_MESSAGES) }],
  canali: [],
};

const nomiDi = (p) => {
  const canali = [
    ...(p.canali || []).map((c) => c.nome),
    ...(p.categorie || []).flatMap((c) => (c.canali || []).map((x) => x.nome)),
  ].filter(Boolean);
  return { canali: new Set(canali), ruoli: new Set((p.ruoli || []).map((r) => r.nome).filter(Boolean)) };
};

for (const t of CATALOGO) {
  test(`«${t.nome}»: la porta nomina solo canali e ruoli che la traccia ha`, () => {
    const p = normalizzaPreset(t);
    const { canali, ruoli } = nomiDi(p);
    const g = p.ingresso;
    if (!g) return;
    for (const n of g.canaliDiPartenza) assert.ok(canali.has(n), `canale di partenza inventato: ${n}`);
    for (const c of (g.benvenuto?.canali || [])) assert.ok(canali.has(c.canale), `in mostra un canale inventato: ${c.canale}`);
    for (const d of g.domande) {
      for (const r of d.risposte) {
        for (const n of r.canali) assert.ok(canali.has(n), `la risposta «${r.titolo}» apre un canale inventato: ${n}`);
        for (const n of r.ruoli) assert.ok(ruoli.has(n), `la risposta «${r.titolo}» da' un ruolo inventato: ${n}`);
      }
    }
  });

  test(`«${t.nome}»: il filtro nomina solo canali e ruoli che la traccia ha`, () => {
    const p = normalizzaPreset(t);
    const { canali, ruoli } = nomiDi(p);
    for (const r of (p.filtro || [])) {
      if (r.azioni.avvisaIn) assert.ok(canali.has(r.azioni.avvisaIn), `avvisa in un canale inventato: ${r.azioni.avvisaIn}`);
      for (const n of r.esentiRuoli) assert.ok(ruoli.has(n), `risparmia un ruolo inventato: ${n}`);
      for (const n of r.esentiCanali) assert.ok(canali.has(n), `salta un canale inventato: ${n}`);
    }
  });

  test(`«${t.nome}»: se la porta e' accesa, Discord la prenderebbe`, () => {
    const p = normalizzaPreset(t);
    if (!p.ingresso?.acceso) return;             // scritta ma spenta: va bene, e il pannello dice perche'
    const d = differenzaIngresso(p, vuotoCommunity, {});
    assert.equal(d.blocco, '',
      `accesa ma Discord la rifiuterebbe (ne vuole ${MIN_PARTENZA} e ${MIN_APERTI}): o si spegne, o la traccia cresce`);
  });
}

test('la porta si deriva dai canali, e da un preset senza canali non nasce', () => {
  assert.equal(portaPronta({ categorie: [] }), null);
  assert.equal(portaPronta({}), null);
});

test('un canale nascosto a tutti non finisce nella porta', () => {
  const g = portaPronta({ categorie: [
    { nome: 'Aperta', canali: [{ nome: 'generale' }] },
    { nome: 'Staff', permessi: [{ chi: 'tutti', nega: ['vedere'] }], canali: [{ nome: 'staff' }] },
    { nome: 'Mista', canali: [{ nome: 'visibile' }, { nome: 'segreto', permessi: [{ chi: 'tutti', nega: ['vedere'] }] }] },
  ] });
  assert.deepEqual(g.canaliDiPartenza, ['generale', 'visibile'], 'offrire una porta chiusa e\' peggio che non offrirla');
  assert.ok(!g.domande[0].risposte.some((r) => r.titolo === 'Staff'));
});

test('i vocali restano fuori dalla porta', () => {
  const g = portaPronta({ categorie: [{ nome: 'Casa', canali: [
    { nome: 'generale' }, { nome: 'Salotto', tipo: 'voce' },
  ] }] });
  assert.deepEqual(g.canaliDiPartenza, ['generale']);
});

test('una risposta per categoria, non per canale', () => {
  const g = portaPronta({ categorie: [
    { nome: 'Benvenuto', canali: [{ nome: 'regole' }] },
    { nome: 'Giochi', canali: [{ nome: 'uno' }, { nome: 'due' }] },
    { nome: 'Musica', canali: [{ nome: 'tre' }] },
  ] });
  assert.deepEqual(g.domande[0].risposte.map((r) => r.titolo), ['Giochi', 'Musica'],
    'il Benvenuto lo vedono tutti, non si sceglie');
  assert.deepEqual(g.domande[0].risposte[0].canali, ['uno', 'due']);
});

test('il filtro di partenza accende le tre cose di sempre, e risparmia lo staff', () => {
  const f = filtroPronto({ ruoli: [{ nome: 'Moderatori' }, { nome: 'VIP' }] });
  assert.deepEqual(f.map((r) => r.tipo), ['liste', 'spam', 'menzioni']);
  assert.deepEqual(f[0].esentiRuoli, ['Moderatori'], 'i VIP non sono staff');
  assert.ok(!f.some((r) => r.tipo === 'parole'), 'le parole tue le scrivi tu: una lista nostra non c\'entra col tuo server');
});
