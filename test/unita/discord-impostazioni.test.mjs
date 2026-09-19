// LE IMPOSTAZIONI DEL SERVER STANNO NELLA TRACCIA, non in una scheda a parte.
//
// Non le teniamo noi: vivono su Discord. Ma metterle nella traccia, accanto a
// categorie, canali e ruoli, fa tre cose da sole — «leggi il mio server» se le
// porta dietro, «fammi vedere cosa faresti» le mostra nella stessa anteprima, e
// la modalita' distruttiva le rimette come dice la traccia. Una scheda a parte
// col suo tasto «Salva» sarebbe una seconda strada verso lo stesso server, e
// un'anteprima che ne racconta una sola.
//
// Le regole che non devono poter saltare:
//  · un campo che la traccia NON nomina non si manda — assente vuol dire «non
//    mi interessa», non «zero», e scriverlo cambierebbe una scelta fatta a mano;
//  · un valore che Discord non accetta non parte: sarebbe un errore a meta'
//    costruzione per un campo che non doveva nemmeno uscire;
//  · un canale nominato che non c'e' piu' si salta, invece di far rifiutare
//    tutta la chiamata e con lei otto impostazioni giuste;
//  · quello che non cambia non si riscrive: una riga nel registro del server a
//    ogni giro, per non aver fatto niente, e' rumore in casa d'altri.
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizzaPreset, dallaFotografia } from '../../src/features/discord-catalogo.js';
import { differenzaServer, vuota, improntaDi } from '../../src/features/discord-preset.js';
import { impostazioniDa, ATTESE_AFK, ZITTISCI } from '../../src/features/discord-api.js';

const foto = (imp = {}, canali = [{ id: '111' }]) => ({
  impostazioni: { verifica: 0, filtro: 0, notifiche: 0, canaleRegole: '', attesaAfk: 300, ...imp },
  canali, caratteristiche: ['COMMUNITY'],
});

test('quello che la traccia non nomina non entra', () => {
  const p = normalizzaPreset({ server: { verifica: 2 } });
  assert.deepEqual(Object.keys(p.server), ['verifica']);
  assert.equal(normalizzaPreset({}).server, undefined, 'senza impostazioni non nasce un oggetto vuoto');
});

test('un valore che Discord non accetta non parte', () => {
  const p = normalizzaPreset({ server: { verifica: 9, filtro: -1, attesaAfk: 77 } });
  assert.equal(p.server?.verifica, undefined, 'la verifica arriva a 4');
  assert.equal(p.server?.filtro, undefined, 'il filtro non e\' negativo');
  assert.equal(p.server?.attesaAfk, undefined, `l'attesa e' una di ${ATTESE_AFK.join(', ')}`);
  const b = normalizzaPreset({ server: { verifica: 4, attesaAfk: 3600 } });
  assert.equal(b.server.verifica, 4);
  assert.equal(b.server.attesaAfk, 3600);
});

test('quello che e\' gia\' cosi\' non si riscrive', () => {
  assert.equal(differenzaServer({ server: { verifica: 0 } }, foto()), null);
  const d = differenzaServer({ server: { verifica: 3 } }, foto());
  assert.deepEqual(d.cambia, { verifica: 3 });
  assert.deepEqual(d.dice, [{ campo: 'verifica', da: 0, a: 3 }]);
});

test('un canale che non c\'e\' piu\' si salta, e non porta giu\' gli altri', () => {
  const d = differenzaServer({ server: { canaleRegole: '999', verifica: 2 } }, foto());
  assert.equal(d.cambia.canaleRegole, undefined, 'il canale sparito non si nomina');
  assert.equal(d.cambia.verifica, 2, 'e l\'impostazione buona parte lo stesso');
  const b = differenzaServer({ server: { canaleRegole: '111' } }, foto());
  assert.equal(b.cambia.canaleRegole, '111', 'un canale che esiste si nomina');
});

test('le levette del canale di sistema vanno tutte insieme', () => {
  const p = normalizzaPreset({ server: { zittisci: { ingressi: true } } });
  assert.deepEqual(Object.keys(p.server.zittisci).sort(), Object.keys(ZITTISCI).sort(),
    'si mandano tutte: quelle che mancano Discord le legge come spente');
  assert.equal(differenzaServer(p, foto({ zittisci: { ingressi: true, boost: false, consigli: false, adesiviIngresso: false, abbonamentiRuolo: false, adesiviAbbonamento: false } })), null,
    'e se sono gia\' cosi\', non si tocca niente');
});

test('«metti in pausa gli inviti» si porta dietro le altre caratteristiche', () => {
  // E' una caratteristica, non un campo: si accende aggiungendola all'elenco.
  // Mandare solo lei cancellerebbe COMMUNITY, e con quella la schermata di
  // benvenuto, le domande d'ingresso e i canali annunci.
  const d = differenzaServer({ server: { invitiFermi: true } }, foto());
  assert.ok(d.cambia.featuresOra.includes('COMMUNITY'), 'l\'elenco di adesso deve viaggiare con la modifica');
});

test('la firma copre anche le impostazioni', () => {
  // Fra «fammi vedere» e «sì, fallo» passa del tempo. Se la firma non le
  // contasse, un sì dato guardando i canali autorizzerebbe un livello di
  // verifica cambiato nel frattempo.
  const a = differenzaServer({ server: { verifica: 2 } }, foto());
  const b = differenzaServer({ server: { verifica: 4 } }, foto());
  assert.notEqual(improntaDi({ server: a }), improntaDi({ server: b }), 'due valori diversi, due firme diverse');
  assert.equal(vuota({ server: a }), false, 'una impostazione da cambiare non e\' «niente da fare»');
  assert.equal(vuota({ server: null }), true);
});

test('«leggi il mio server» se le porta dietro', () => {
  const p = dallaFotografia({ canali: [], ruoli: [], impostazioni: { verifica: 3, barraBoost: true } });
  assert.equal(p.server.verifica, 3);
  assert.equal(p.server.barraBoost, true);
});

test('quello che Discord risponde si rilegge senza inventare', () => {
  const v = impostazioniDa({ verification_level: 3, explicit_content_filter: 2,
    system_channel_flags: 1 | 2, features: ['COMMUNITY', 'INVITES_DISABLED'], afk_timeout: 900 });
  assert.equal(v.verifica, 3);
  assert.equal(v.filtro, 2);
  assert.equal(v.zittisci.ingressi, true);
  assert.equal(v.zittisci.boost, true);
  assert.equal(v.zittisci.consigli, false);
  assert.equal(v.community, true);
  assert.equal(v.invitiFermi, true);
  assert.equal(v.attesaAfk, 900);
});
