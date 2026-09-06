// DUE DIFETTI DELLA LOCANDINA, VISTI IN UNA SCHERMATA DI TELEGRAM.
//
// 1. LA FACCIA VUOTA. L'avatar veniva da `streamers.get(login)`, cioe' dalla
//    tabella di chi ha un account qui. Ma la locandina vale anche per i canali
//    che una streamer AGGIUNGE alle sue notifiche: quelli in tabella non ci
//    sono, e usciva un cerchio nero. Sembra un difetto della grafica, ed e' un
//    dato che non c'e'. Adesso, se manca, si chiede alla piattaforma — una
//    volta sola per login.
//
// 2. LE EMOTE DIVENTATE QUADRATINI. Il rasterizzatore ha i caratteri che gli
//    diamo noi, e nessuno di quelli sa disegnare un pittogramma: usciva
//    «▨▨Blind Run | ▨▨ !social». Si tolgono nel DISEGNO, non nei dati, cosi'
//    l'anteprima dell'editor e il PNG che parte fanno la stessa cosa.
//
// La domanda «cos'e' un'emoji» ha una risposta sola in tutto il progetto, e sta
// nel motore che disegna: sono i caratteri che il sistema disegna A COLORI
// (`Emoji_Presentation`), non quelli di certi blocchi Unicode. Le spunte e le
// stelline sono segni tipografici e restano.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'locandina-faccia-'));

const { svgCarta, cartaDi, EMOJI_G } = await import('../../src/features/carta-disegno.js');
const { datiDiretta } = await import('../../src/features/cartalive.js');

const disegnato = (testo) => {
  const carta = cartaDi({ dati: null, piattaforma: 'twitch' });
  return svgCarta(carta, { nome: testo, titolo: testo, gioco: '', login: 'x', link: '', spettatori: '0', piattaforma: 'twitch', avatar: '' });
};

test('le emote non arrivano al disegno: uscirebbero quadratini', () => {
  const svg = disegnato('🎮🎮Blind Run | 🔥 !social');
  assert.ok(!EMOJI_G.test(svg), 'un pittogramma e\' finito nel disegno');
  assert.match(svg, /Blind Run/, 'il testo buono deve restare');
  assert.ok(!svg.includes('️'), 'resta il selettore che promuove a emoji');
});

test('i segni tipografici invece restano: non sono emote', () => {
  // ✓ ✗ ★ ✦ li disegna il carattere del testo, e portano un senso.
  const svg = disegnato('fatto ✓ · niente ✗ · ★');
  for (const segno of ['✓', '✗', '★']) assert.ok(svg.includes(segno), `${segno} e\' sparito`);
});

test('la stessa domanda ha una risposta sola in tutto il progetto', async () => {
  const { EMOJI_G: DEI_CANCELLI } = await import('../../scripts/_emoji.mjs');
  assert.equal(DEI_CANCELLI.source, EMOJI_G.source,
    'i cancelli e il disegno userebbero due definizioni diverse di «emoji»');
});

test('la faccia di chi non e\' registrato qui si chiede alla piattaforma', async () => {
  let chieste = 0;
  const helix = {
    async getUserByLogin(l) {
      chieste++;
      return { login: l, profile_image_url: `https://esempio.invalid/${l}.png` };
    },
  };
  // niente rete: l'avatar non si scarica, ma la RICERCA dell'indirizzo si vede.
  const d = await datiDiretta('nonregistrato_qui', { title: 'ciao' },
    { piattaforma: 'twitch', helix });
  assert.equal(chieste, 1, 'non ha chiesto la faccia alla piattaforma');
  assert.equal(d.login, 'nonregistrato_qui');

  await datiDiretta('nonregistrato_qui', { title: 'ciao' }, { piattaforma: 'twitch', helix });
  assert.equal(chieste, 1, 'la chiede ogni volta: un annuncio non deve costare una chiamata in piu\'');
});

test('e senza un modo di chiederla non si rompe niente', async () => {
  const d = await datiDiretta('nessuno_lo_conosce', { title: 'ciao' }, { piattaforma: 'kick' });
  assert.equal(d.avatar, '', 'senza faccia deve restare vuota, non lanciare');
  assert.equal(d.piattaforma, 'kick');
});
