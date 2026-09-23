// I VOCALI DELLE TRACCE, pensati: chi entra, chi parla, e dove finisce chi
// si allontana.
//
// Si e' visto costruendo: «Salotto» e «In diretta» nascevano
// aperti a tutti allo stesso modo, e l'angolo AFK che il pannello offriva non
// lo creava nessuno. Le cose che devono restare vere:
//  · «In diretta» e' una stanza dove si ascolta: tutti entrano, parla chi sta
//    davanti. Il proprietario del server parla comunque — Discord gli da'
//    tutto, e le regole dei canali su di lui non valgono;
//  · ogni traccia con dei vocali crea l'angolo AFK e lo nomina come tale;
//  · il nome diventa id solo quando il canale esiste, e riempie un vuoto:
//    un angolo AFK che il server ha gia' scelto non si cambia.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGO, normalizzaPreset } from '../../src/features/discord-catalogo.js';
import { differenzaServer, TIPI } from '../../src/features/discord-preset.js';

const canaliDi = (t) => [...(t.canali || []), ...(t.categorie || []).flatMap((c) => c.canali || [])];

test('«In diretta» si ascolta: tutti entrano, parla chi sta davanti', () => {
  const t = CATALOGO.find((x) => x.id === 'dirette');
  const c = canaliDi(t).find((x) => x.nome === 'In diretta');
  assert.ok(c, 'la stanza c\'e\'');
  const tutti = c.permessi.find((p) => p.chi === 'tutti');
  assert.deepEqual(tutti?.nega, ['parlare'], 'chi entra ascolta');
  assert.ok(!tutti.nega.includes('entrare') && !tutti.nega.includes('vedere'), 'e non gli si chiude la porta in faccia');
  const parlano = c.permessi.filter((p) => (p.da || []).includes('parlare')).map((p) => p.chi);
  assert.ok(parlano.includes('Moderatori'), 'i moderatori possono intervenire');
  // I ruoli nominati esistono nella traccia stessa: una regola che nomina un
  // ruolo che la traccia non crea cadrebbe al primo giro.
  const ruoli = new Set((t.ruoli || []).map((r) => r.nome));
  for (const chi of parlano) assert.ok(ruoli.has(chi), `«${chi}» non e' un ruolo di questa traccia`);
});

test('ogni traccia con dei vocali ha il suo angolo AFK, e lo dice alle impostazioni', () => {
  for (const t of CATALOGO) {
    const voci = canaliDi(t).filter((c) => c.tipo === 'voce' && !(c.permessi || []).some((p) => (p.nega || []).includes('vedere')));
    if (!voci.length) continue;
    const afk = voci.find((c) => c.nome === 'Angolo AFK');
    assert.ok(afk, `«${t.nome}» ha dei vocali ma nessun angolo AFK`);
    assert.equal(normalizzaPreset(t).server?.canaleAfkNome, 'Angolo AFK', `e «${t.nome}» lo nomina nelle impostazioni`);
  }
});

test('il nome dell\'angolo AFK sopravvive alla normalizzazione, in un campo suo', () => {
  const p = normalizzaPreset({ server: { canaleAfkNome: '  Angolo AFK  ', canaleAfk: 'non-un-id' } });
  assert.equal(p.server.canaleAfkNome, 'Angolo AFK');
  assert.equal(p.server.canaleAfk, '', 'e l\'id resta un id: un nome li\' dentro non passa');
});

const foto = (canali = [], canaleAfk = '') => ({ canali, impostazioni: { canaleAfk }, caratteristiche: [] });

test('se l\'angolo c\'e\' gia\', si punta a lui; se nasce adesso, si aspetta che nasca', () => {
  const esiste = differenzaServer({ server: { canaleAfkNome: 'Angolo AFK' } },
    foto([{ id: '500000000000000001', nome: 'Angolo AFK', tipo: TIPI.voce }]));
  assert.equal(esiste.cambia.canaleAfk, '500000000000000001');
  const nasce = differenzaServer({ server: { canaleAfkNome: 'Angolo AFK' } }, foto([]));
  assert.equal(nasce.cambia.canaleAfkNome, 'Angolo AFK', 'l\'id si sapra\' dopo averlo creato');
  assert.equal(nasce.cambia.canaleAfk, undefined, 'e nel frattempo non si inventa niente');
});

test('un angolo AFK gia\' scelto non si cambia: si riempie un vuoto, non una scelta', () => {
  const d = differenzaServer({ server: { canaleAfkNome: 'Angolo AFK' } },
    foto([{ id: '500000000000000001', nome: 'Angolo AFK', tipo: TIPI.voce }], '500000000000000009'));
  assert.equal(d, null, 'il server ne ha gia\' uno suo: niente da fare');
});

test('un canale di testo con quel nome non diventa l\'angolo AFK: Discord lo rifiuterebbe', () => {
  const d = differenzaServer({ server: { canaleAfkNome: 'Angolo AFK' } },
    foto([{ id: '500000000000000001', nome: 'Angolo AFK', tipo: TIPI.testo }]));
  assert.equal(d.cambia.canaleAfk, undefined);
  assert.equal(d.cambia.canaleAfkNome, 'Angolo AFK', 'si aspetta il vocale che nasce con la traccia');
});
