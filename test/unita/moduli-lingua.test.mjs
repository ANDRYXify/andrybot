// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// LE VARIABILI DEI MODULI PARLANO LA LINGUA DEL CANALE.
//
// $data, $ora e $giorno nel fuso e nel formato del canale; $moneta, $sino,
// $eta, $colore, $animale, $soldi e $altezza nella lingua della chat. Prima
// uscivano all'italiana per tutti, anche per un canale inglese a New York.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-modlingua-');
const { streamers } = await import('../../src/db.js');
const { ModulesEngine } = await import('../../src/features/modules.js');
test.after(() => usaEGetta.pulisci());

const motore = new ModulesEngine({});
const ctx = (channel) => ({ channel, user: 'tizio', args: [], argsRaw: '', _vars: {} });

test('in un canale inglese le variabili escono in inglese, nel formato scelto', async () => {
  streamers.upsertApproved('modeng', 'ModEng', '601');
  streamers.setSettings('modeng', { preferenze: { lingua: 'en', fuso: 'America/New_York' } });
  const t = await motore.espandi('$data|$ora|$giorno|$moneta|$sino|$eta|$soldi|$altezza', ctx('modeng'));
  const [data, ora, giorno, moneta, sino, eta, soldi, altezza] = t.split('|');
  assert.match(data, /^\d{2}\/\d{2}\/\d{4}$/);
  const oggiNY = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: '2-digit', day: '2-digit', year: 'numeric' }).format(new Date());
  assert.equal(data, oggiNY, 'la data di New York, non quella di Roma');
  assert.match(ora, /^\d{1,2}:\d{2} (AM|PM)$/);
  assert.match(giorno, /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/);
  assert.ok(['heads', 'tails'].includes(moneta));
  assert.ok(['yes', 'no'].includes(sino));
  assert.match(eta, /^\d+ years old$/);
  assert.match(soldi, /^€[\d,]+$/);
  assert.match(altezza, /^\d\.\d{2} m$/, 'il punto, non la virgola');
});

test('in un canale italiano restano come prima', async () => {
  streamers.upsertApproved('modita', 'ModIta', '602');
  const t = await motore.espandi('$moneta|$sino|$altezza|$soldi', ctx('modita'));
  const [moneta, sino, altezza, soldi] = t.split('|');
  assert.ok(['testa', 'croce'].includes(moneta));
  assert.ok(['sì', 'no'].includes(sino));
  assert.match(altezza, /^\d,\d{2} m$/);
  assert.match(soldi, /^[\d.]+\s€$/, "lo spazio prima dell'euro e' quello che non va a capo");
});
