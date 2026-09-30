// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// I COMANDI PRONTI CON LA FRASE DELLO STREAMER: !followage e !channelage.
//
// Un comando che risponde con un dato dichiara le sue frasi (segnaposti e frase
// di base nelle tre lingue); lo streamer ne scrive una sua. Vuota vuol dire la
// nostra, nella lingua della chat. Le date e i tempi escono dalle preferenze
// del canale, non da un formato scritto a mano.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-cmdfrasi-');
const { streamers } = await import('../../src/db.js');
const R = await import('../../src/features/comandi-registro.js');
const base = await import('../../src/features/comandibase.js');
test.after(() => usaEGetta.pulisci());

const CH = 'frasi1';
streamers.upsertApproved(CH, 'Frasi1', '501');

const ANNO_FA = new Date(Date.now() - (366 + 40) * 86400000).toISOString();
const helix = {
  getUserByLogin: async (l) => (l === 'nessuno' ? null : { id: 'id-' + l, display_name: l === CH ? 'Frasi1' : 'Tizio', created_at: ANNO_FA }),
  getFollowAge: async (_c, uid) => (uid === 'id-nonsegue' ? null : ANNO_FA),
};
const chiedi = async (testo, user = 'tizio') => {
  const dette = [];
  await base.tryComando(helix, { channel: CH, user, display: 'Tizio', userId: 'id-' + user, text: testo }, (t) => dette.push(t));
  return dette[0];
};

test('le frasi si salvano ripulite, e solo quelle che il comando dichiara', () => {
  const n = R.normalizza({
    followage: { risposte: { si: '  {nome}   da {durata}  ', no: '', inventata: 'x' } },
    uptime: { risposte: { si: 'non ne ha' } },
    channelage: { risposte: { si: 'x'.repeat(500) } },
  });
  assert.deepEqual(n.followage, { risposte: { si: '{nome} da {durata}' } });
  assert.equal(n.uptime, undefined, 'un comando senza frasi dichiarate non ne prende');
  assert.equal(n.channelage.risposte.si.length, R.RISPOSTA_MAX);
});

test('la frase: la sua se c\'e\', se no la nostra nella lingua della chat; i segnaposti che non conosce restano', () => {
  assert.equal(R.rispostaDi(CH, 'followage', 'no', { nome: 'ana' }), '@ana non segue ancora il canale.');
  streamers.setSettings(CH, { preferenze: { lingua: 'es' } });
  assert.equal(R.rispostaDi(CH, 'followage', 'no', { nome: 'ana' }), '@ana todavía no sigue el canal.');
  streamers.setSettings(CH, { comandi: { followage: { risposte: { no: '{nome} ancora niente {boh}' } } } });
  assert.equal(R.rispostaDi(CH, 'followage', 'no', { nome: 'ana' }), 'ana ancora niente {boh}');
  const riga = R.elenco(CH).find((r) => r.id === 'followage');
  assert.equal(riga.risposte.no.sua, '{nome} ancora niente {boh}');
  assert.match(riga.risposte.si.base, /segue il canale da \{durata\}/);
  assert.deepEqual(riga.risposte.si.segnaposti, ['nome', 'durata', 'data']);
  streamers.setSettings(CH, {});
});

test('!followage: il tempo vero, di calendario, e la frase dello streamer se l\'ha scritta', async () => {
  assert.equal(await chiedi('!followage'), '💜 @Tizio segue il canale da 1 anno e 1 mese.');
  assert.equal(await chiedi('!followage', 'nonsegue'), '@Tizio non segue ancora il canale.');
  streamers.setSettings(CH, { comandi: { followage: { risposte: { si: '{nome} ci segue dal {data} ({durata})' } } } });
  assert.match(await chiedi('!followage'), /^Tizio ci segue dal \d{2}\/\d{2}\/\d{4} \(1 anno e 1 mese\)$/);
  streamers.setSettings(CH, { comandi: { followage: { risposte: { si: '{nome} ci segue dal {data}' } } }, preferenze: { lingua: 'en', data: 'esteso' } });
  assert.match(await chiedi('!followage'), /^Tizio ci segue dal [A-Z][a-z]+ \d{1,2}, \d{4}$/, 'la data nel formato scelto nelle preferenze');
  streamers.setSettings(CH, {});
});

test('!channelage: il canale dove si scrive, o quello della persona nominata', async () => {
  assert.match(await chiedi('!channelage'), /^📅 Il canale di Frasi1 è nato il \d{2}\/\d{2}\/\d{4}, 1 anno e 1 mese fa\.$/);
  assert.match(await chiedi('!channelage @tizio'), /^📅 Il canale di Tizio è nato il /);
  assert.equal(await chiedi('!channelage @nessuno'), '🤔 Non trovo questo utente.');
  streamers.setSettings(CH, { preferenze: { lingua: 'en' } });
  assert.match(await chiedi('!channelage'), /^📅 Frasi1's channel was created on \d{2}\/\d{2}\/\d{4}, 1 year and 1 month ago\.$/);
  streamers.setSettings(CH, {});
});
