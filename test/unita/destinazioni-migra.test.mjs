// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// IL GRUPPO COLLEGATO DIVENTA UNA DESTINAZIONE UNA VOLTA SOLA.
//
// La migrazione dal gruppo unico alle destinazioni gira a ogni lettura. Prima
// guardava solo se le destinazioni erano zero: chi le toglieva tutte, apposta,
// se ne ritrovava una alla lettura dopo, perche' «nessuna destinazione» e «mai
// migrato» erano la stessa cosa. Ora il posto guardato si ricorda: toglierle
// tutte resta tolto, e un gruppo (o un canale Discord) nuovo si guarda di nuovo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-destmigra-');
const { streamers, tgConf, tgDest, dcConf, dcDest } = await import('../../src/db.js');
test.after(() => usaEGetta.pulisci());

const togliTutte = (dest, ch) => { for (const d of dest.lista(ch)) dest.rimuovi(ch, d.id); };

test('Telegram: tolte tutte le destinazioni, il gruppo non torna; un gruppo nuovo si', () => {
  const ch = 'tgcanale';
  tgConf.set(ch, { chatId: '-100111', chatTitolo: 'Gruppo uno' });
  tgDest.migra(ch, tgConf.get(ch));
  tgDest.migra(ch, tgConf.get(ch));
  assert.deepEqual(tgDest.lista(ch).map((d) => d.chat_id), ['-100111'], 'il gruppo diventa la prima destinazione, una volta');

  togliTutte(tgDest, ch);
  tgDest.migra(ch, tgConf.get(ch));
  assert.equal(tgDest.lista(ch).length, 0, 'tolte apposta, restano tolte');

  tgConf.set(ch, { chatId: '-100222', chatTitolo: 'Gruppo due' });
  tgDest.migra(ch, tgConf.get(ch));
  assert.deepEqual(tgDest.lista(ch).map((d) => d.chat_id), ['-100222'], 'un gruppo collegato adesso diventa destinazione');
});

test('Telegram: chi ha gia\' le sue destinazioni non si vede aggiungere il gruppo, neanche dopo averle tolte', () => {
  const ch = 'tgaltro';
  tgConf.set(ch, { chatId: '-100333' });
  tgDest.aggiungi({ channel: ch, chatId: '-100999', titolo: 'Scelto a mano' });
  tgDest.migra(ch, tgConf.get(ch));
  assert.deepEqual(tgDest.lista(ch).map((d) => d.chat_id), ['-100999']);
  togliTutte(tgDest, ch);
  tgDest.migra(ch, tgConf.get(ch));
  assert.equal(tgDest.lista(ch).length, 0);
});

test('Discord: stessa regola, per canale e per webhook, e del webhook resta solo l\'impronta', () => {
  const ch = 'dccanale';
  streamers.upsertApproved(ch, 'Dc', '7');
  dcConf.set(ch, { canale: '123456789012345678', attivo: true });
  dcDest.migra(ch, dcConf.get(ch));
  assert.equal(dcDest.lista(ch).length, 1);
  togliTutte(dcDest, ch);
  dcDest.migra(ch, dcConf.get(ch));
  assert.equal(dcDest.lista(ch).length, 0, 'tolte apposta, restano tolte');

  const hook = 'https://discord.com/api/webhooks/1/segretissimo';
  dcConf.set(ch, { canale: '', webhook: hook });
  dcDest.migra(ch, dcConf.get(ch));
  assert.equal(dcDest.lista(ch).length, 1, 'un webhook nuovo diventa destinazione');
  assert.ok(!String(dcConf.get(ch).migrato).includes('segretissimo'), 'il segreto del webhook non si copia');
  togliTutte(dcDest, ch);
  dcDest.migra(ch, dcConf.get(ch));
  assert.equal(dcDest.lista(ch).length, 0);
});
