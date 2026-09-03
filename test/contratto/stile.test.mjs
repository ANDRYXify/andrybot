// IL CONTRATTO BROWSER↔SERVER SULLO STILE DELL'OVERLAY.
//
// Il difetto che queste prove impediscono è quello vero, già pagato: il browser
// scriveva quattro assi nuovi, il server non li elencava, e li buttava via in
// silenzio. A schermo si vedeva solo «l'overlay non salva niente».
//
// Qui non si confronta testo: si chiamano le normalizzazioni VERE del server e
// si controlla che ogni valore di ogni asse sopravviva al viaggio.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../../src/web/stile.js';

const NORM = {
  alert: S.normAlertStile,
  chat: S.normChatStile,
  widget: S.normWidgetStile,
};

// Ogni asse enumerato, con il posto in cui vive.
const ASSI = {
  alert: {
    animazione: S.ANIM_ALERT, forma: S.FORME_OVL, materia: S.MATERIE_OVL,
    cornice: S.CORNICI_OVL, composizione: S.COMP_OVL, uscita: S.USCITA_OVL,
    peso: S.PESO_OVL, maiuscolo: S.MAIUSC_OVL, font: S.FONT_OVL,
  },
  chat: {
    animazione: S.ANIM_CHAT, dim: S.DIM_CHAT, forma: S.FORME_OVL,
    materia: S.MATERIE_OVL, cornice: S.CORNICI_OVL, peso: S.PESO_OVL,
    maiuscolo: S.MAIUSC_OVL, font: S.FONT_OVL,
  },
  widget: {
    dim: S.DIM_WIDGET, forma: S.FORME_OVL, materia: S.MATERIE_OVL,
    cornice: S.CORNICI_OVL, font: S.FONT_OVL, icona: S.ICONE_OVL_K,
  },
};

for (const [dove, assi] of Object.entries(ASSI)) {
  test(`${dove}: ogni valore di ogni asse sopravvive al salvataggio`, () => {
    for (const [campo, valori] of Object.entries(assi)) {
      assert.ok(Array.isArray(valori) && valori.length, `${dove}.${campo}: l'asse non ha un elenco`);
      for (const v of valori) {
        const fuori = NORM[dove]({ [campo]: v })[campo];
        assert.equal(fuori, v, `${dove}.${campo}: "${v}" entra ed esce come "${fuori}"`);
      }
    }
  });

  test(`${dove}: un valore inventato non passa`, () => {
    for (const campo of Object.keys(assi)) {
      const fuori = NORM[dove]({ [campo]: 'valore_che_non_esiste' })[campo];
      assert.notEqual(fuori, 'valore_che_non_esiste', `${dove}.${campo}: accetta valori non previsti`);
      assert.ok(fuori !== undefined && fuori !== null, `${dove}.${campo}: senza valore valido non c'è ripiego`);
    }
  });
}

test('i colori accettano un esadecimale e rifiutano il resto', () => {
  assert.equal(S.normAlertStile({ sfondo: '#123abc' }).sfondo, '#123abc');
  assert.equal(S.normAlertStile({ sfondo: 'javascript:alert(1)' }).sfondo, '#0f0f14');
  assert.equal(S.normChatStile({ testo: '#ABCDEF' }).testo, '#ABCDEF');
  assert.equal(S.normWidgetStile({ accento: 'rosso' }).accento, '#f72fa7');
});

test('i numeri restano dentro i loro estremi', () => {
  assert.equal(S.normAlertStile({ dimTesto: 999 }).dimTesto, 56);
  assert.equal(S.normAlertStile({ dimTesto: -5 }).dimTesto, 14);
  assert.equal(S.normAlertStile({ opacita: 50 }).opacita, 50);
  assert.equal(S.normChatStile({ larghezza: 1 }).larghezza, 18);
  assert.equal(S.normAlertStile({ dimTesto: 'ciao' }).dimTesto, 27);
});

test('i sì/no si possono davvero spegnere', () => {
  assert.equal(S.normAlertStile({ glow: false }).glow, false);
  assert.equal(S.normAlertStile({ glow: true }).glow, true);
  assert.equal(S.normAlertStile({}).glow, true);
  assert.equal(S.normChatStile({ ombraTesto: true }).ombraTesto, true);
  assert.equal(S.normChatStile({}).ombraTesto, false);
});

test('font caricati dallo streamer: passa solo la forma "mio:<chiave>"', () => {
  assert.equal(S.normAlertStile({ font: 'mio:il_mio-font' }).font, 'mio:il_mio-font');
  assert.equal(S.normAlertStile({ font: 'mio:../../etc/passwd' }).font, 'sistema');
  assert.equal(S.normAlertStile({ font: 'mio:' }).font, 'sistema');
});

test('icone caricate: passa solo la forma "effetto:<comando>"', () => {
  assert.equal(S.normWidgetStile({ icona: 'effetto:gattino' }).icona, 'effetto:gattino');
  assert.equal(S.normWidgetStile({ icona: 'effetto:../fuori' }).icona, 'stella');
  assert.equal(S.normWidgetStile({ icona: '' }).icona, '');
});

test('googleFont non può portarsi dietro nulla di eseguibile', () => {
  assert.equal(S.normAlertStile({ googleFont: 'Bree Serif' }).googleFont, 'Bree Serif');
  assert.equal(S.normAlertStile({ googleFont: 'Bad");@import url(evil' }).googleFont, 'Badimport urlevil');
});

test("lo stile per-overlay tiene solo le parti che ci sono", () => {
  assert.equal(S.normOverlayStile(null), null);
  assert.equal(S.normOverlayStile({}), null);
  const solo = S.normOverlayStile({ chat: { dim: 'grande' } });
  assert.equal(solo.chat.dim, 'grande');
  assert.equal(solo.alerts, undefined);
});

test('la posizione libera resta dentro il riquadro', () => {
  assert.deepEqual(S.xyOk({ x: 150, y: -20, s: 999, r: 400 }), { x: 100, y: 0, s: 300, r: 180 });
  assert.equal(S.xyOk({ x: 'a', y: 3 }), null);
  assert.equal(S.xyOk(null), null);
});
