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
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (p) => fs.readFileSync(path.join(RAD, p), 'utf8');

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

// Le frecce dello studio spostano di UN PIXEL, che su 1920 e' 0,05%: la pulizia
// arrotondava a percentuali intere, quindi la regolazione fine non sopravviveva
// al salvataggio. Fino a 9,6 px persi in orizzontale.
test('la regolazione fine sopravvive al salvataggio', () => {
  assert.deepEqual(S.xyOk({ x: 2.29, y: 3.17 }), { x: 2.29, y: 3.17, s: 100, r: 0 });
  const unPixel = S.xyOk({ x: 50.05, y: 50 });
  assert.notEqual(unPixel.x, 50, 'un pixel di spostamento non si perde');
  assert.equal(S.xyOk({ x: 1 / 3, y: 2 / 3 }).x, 0.33, 'due decimali, non di piu\'');
});

// C'erano DUE pulizie per la stessa posizione, con limiti diversi: gli obiettivi
// passavano da una (decimali tenuti, scala 20-400), tutto il resto dall'altra
// (decimali buttati, scala 30-300). Chi la scriveva doveva ricordarsi quale.
test('una posizione si pulisce in un posto solo', () => {
  const src = leggi('src/web/stile.js');
  assert.ok(!/normXY/.test(src), 'niente seconda pulizia');
  assert.equal((src.match(/x: clampPct\(/g) || []).length, 1, 'il limite di x sta in una riga sola');
  const goal = S.normGoal({ xy: { x: 2.29, y: 3.17, s: 999 } });
  const player = S.normMusica({ xy: { x: 2.29, y: 3.17, s: 999 } });
  assert.deepEqual(goal.xy, player.xy, 'obiettivo e player passano dalla stessa');
});

// La config overlay di un contatore era l'unica che finiva nel database senza
// passare da nessuna pulizia: x, colori, carattere e formato arrivavano come li
// aveva scritti chi chiamava. Il disegno dell'overlay si difende da solo, ma la
// porta d'ingresso no, ed era l'unica famiglia fuori dalla regola.
test('la config di un contatore si pulisce entrando', () => {
  const q = S.puliConta({ x: 'abc', y: 200, r: 999, dim: 99999, colore: 'red', font: 'inventato', formato: 'a'.repeat(400) });
  assert.equal(q.x, 4, 'una x non numerica torna al valore di base');
  assert.equal(q.y, 100, 'e una fuori scala rientra');
  assert.equal(q.r, 180);
  assert.equal(q.dim, 200);
  assert.equal(q.colore, '#ffffff', 'un colore che non è un esadecimale non passa');
  assert.equal(q.font, 'system', 'un carattere fuori elenco non passa');
  assert.equal(q.formato.length, 120, 'il formato ha una lunghezza massima');
});

// Il salvataggio di un contatore e' un MERGE: un aggiorno parziale (es. il solo
// «mostra» da un comando in chat) non deve azzerare posizione e colori. Quindi
// la pulizia e' un filtro, non un riempitore: se una chiave non c'era, non c'e'.
test('un aggiorno parziale di un contatore resta parziale', () => {
  assert.deepEqual(S.puliConta({ mostra: true }), { mostra: true });
  assert.deepEqual(Object.keys(S.puliConta({ x: 10 })), ['x']);
  assert.equal(S.puliConta(null), undefined);
  assert.equal(S.puliConta('robaccia'), undefined);
});

test('lo sfondo di un contatore accetta tinta, trasparenza o niente', () => {
  assert.equal(S.puliConta({ sfondo: 'transparent' }).sfondo, 'transparent');
  assert.equal(S.puliConta({ sfondo: 'rgba(0,0,0,0.55)' }).sfondo, 'rgba(0,0,0,0.55)');
  assert.equal(S.puliConta({ sfondo: '#101010' }).sfondo, '#101010');
  assert.ok(!('sfondo' in S.puliConta({ sfondo: 'url(http://x)' })), 'quel che non è un colore si lascia stare');
});

// La posizione di un contatore passa dalla stessa regola di tutti gli altri, coi
// due decimali: le frecce dello studio spostano di un pixel.
test('anche un contatore tiene la regolazione fine', () => {
  assert.equal(S.puliConta({ x: 2.29 }).x, 2.29);
});
