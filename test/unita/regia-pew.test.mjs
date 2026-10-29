// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA SCENA COI PEW IN OBS (docs/COLPI.md, «L'overlay dei Pew»): un OBS finto,
// con le richieste di obs-websocket che usiamo, e i suoi rifiuti. Si prova che
// la scena nuova abbia le stesse fonti nello stesso ordine e posto, coi Pew in
// cima; che una fonte dei Pew che c'e' si riusi; che un gruppo fermi tutto
// prima di creare; che un rifiuto a meta' non lasci una scena mezza fatta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const finestra = { localStorage: { getItem: () => null, setItem() {}, removeItem() {} } };
vm.runInNewContext(readFileSync(new URL('../../src/web/public/regia-esterna.js', import.meta.url), 'utf8'),
  { window: finestra, localStorage: finestra.localStorage, crypto: globalThis.crypto, TextEncoder, btoa, setTimeout, clearTimeout });
// quello che esce dal contesto della pagina ha i suoi prototipi: si confronta il dato
const dato = (x) => JSON.parse(JSON.stringify(x));
const { FONTE_PEW } = finestra.RegiaPew;
const scenaConPew = async (...a) => dato(await finestra.RegiaPew.scenaConPew(...a));
const aggiungiPew = async (...a) => dato(await finestra.RegiaPew.aggiungiPew(...a));

function obsFinto({ rompi = '' } = {}) {
  const scene = new Map([['Gioco', [
    { sceneItemId: 1, sceneItemIndex: 0, sourceName: 'Cattura', isGroup: false, sceneItemEnabled: true, sceneItemLocked: true, sceneItemBlendMode: 'OBS_BLEND_NORMAL', sceneItemTransform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, boundsType: 'OBS_BOUNDS_NONE', boundsWidth: 0, boundsHeight: 0, width: 1920, sourceWidth: 1920 } },
    { sceneItemId: 2, sceneItemIndex: 1, sourceName: 'Webcam', isGroup: false, sceneItemEnabled: false, sceneItemLocked: false, sceneItemBlendMode: 'OBS_BLEND_SCREEN', sceneItemTransform: { positionX: 1500, positionY: 800, scaleX: 0.3, scaleY: 0.3, cropLeft: 10, rotation: 5 } },
  ]], ['Gioco · Pew', []]]);
  const ingressi = [{ inputName: 'Cattura', inputKind: 'game_capture' }, { inputName: 'Webcam', inputKind: 'dshow_input' }];
  const fatte = [];
  let id = 100;
  const chiedi = async (cosa, d = {}) => {
    fatte.push([cosa, d]);
    if (cosa === rompi) throw new Error('rifiutata da OBS');
    if (cosa === 'GetSceneList') return { scenes: [...scene.keys()].map((sceneName) => ({ sceneName })) };
    if (cosa === 'GetVideoSettings') return { baseWidth: 2560, baseHeight: 1440 };
    if (cosa === 'GetInputList') return { inputs: ingressi };
    if (cosa === 'GetSceneItemList') return { sceneItems: [...(scene.get(d.sceneName) || [])].reverse() };   // l'ordine lo dice sceneItemIndex, non la risposta
    if (cosa === 'CreateScene') { scene.set(d.sceneName, []); return {}; }
    if (cosa === 'RemoveScene') { scene.delete(d.sceneName); return {}; }
    if (cosa === 'CreateSceneItem' || cosa === 'CreateInput') {
      if (cosa === 'CreateInput') ingressi.push({ inputName: d.inputName, inputKind: d.inputKind, impostazioni: d.inputSettings });
      const v = scene.get(d.sceneName);
      const x = { sceneItemId: ++id, sceneItemIndex: v.length, sourceName: d.sourceName || d.inputName, sceneItemEnabled: d.sceneItemEnabled, sceneItemTransform: {} };
      v.push(x);
      return { sceneItemId: x.sceneItemId };
    }
    if (cosa === 'SetSceneItemTransform') {
      for (const k of Object.keys(d.sceneItemTransform)) if (/^(width|height|sourceWidth|sourceHeight)$/.test(k)) throw new Error('campo non scrivibile: ' + k);
      if ('boundsWidth' in d.sceneItemTransform && d.sceneItemTransform.boundsWidth < 1) throw new Error('boundsWidth sotto 1');
      Object.assign(scene.get(d.sceneName).find((x) => x.sceneItemId === d.sceneItemId).sceneItemTransform, d.sceneItemTransform);
      return {};
    }
    if (cosa === 'SetSceneItemLocked') { scene.get(d.sceneName).find((x) => x.sceneItemId === d.sceneItemId).sceneItemLocked = d.sceneItemLocked; return {}; }
    if (cosa === 'SetSceneItemBlendMode') { scene.get(d.sceneName).find((x) => x.sceneItemId === d.sceneItemId).sceneItemBlendMode = d.sceneItemBlendMode; return {}; }
    if (cosa === 'SetInputSettings') { ingressi.find((x) => x.inputName === d.inputName).impostazioni = d.inputSettings; return {}; }
    throw new Error('richiesta sconosciuta ' + cosa);
  };
  return { chiedi, scene, ingressi, fatte };
}
const URL_PEW = 'https://socialbot.live/overlay/andry?key=k&o=pew';

test('la scena coi Pew: stesse fonti, stesso ordine e posto, e i Pew in cima grandi quanto la tela', async () => {
  const o = obsFinto();
  const r = await scenaConPew(o.chiedi, { scena: 'Gioco', url: URL_PEW });
  assert.deepEqual(r, { ok: true, scena: 'Gioco · Pew 2' }, 'il nome preso prende un numero');
  const v = o.scene.get('Gioco · Pew 2');
  assert.deepEqual(v.map((x) => x.sourceName), ['Cattura', 'Webcam', FONTE_PEW], 'stesso ordine, i Pew in cima');
  assert.deepEqual([v[0].sceneItemLocked, v[1].sceneItemEnabled, v[1].sceneItemBlendMode], [true, false, 'OBS_BLEND_SCREEN'], 'blocco, visibilita\' e fusione');
  assert.deepEqual([v[1].sceneItemTransform.positionX, v[1].sceneItemTransform.scaleX, v[1].sceneItemTransform.cropLeft, v[1].sceneItemTransform.rotation], [1500, 0.3, 10, 5]);
  const fonte = o.ingressi.find((x) => x.inputName === FONTE_PEW);
  assert.deepEqual(dato([fonte.inputKind, fonte.impostazioni]), ['browser_source', { url: URL_PEW, width: 2560, height: 1440 }]);
  assert.deepEqual(o.scene.get('Gioco').map((x) => x.sourceName), ['Cattura', 'Webcam'], 'la scena di partenza non si tocca');
});

test('la fonte dei Pew e\' una sola: se c\'e\' si riusa, aggiornata', async () => {
  const o = obsFinto();
  await scenaConPew(o.chiedi, { scena: 'Gioco', url: URL_PEW });
  await scenaConPew(o.chiedi, { scena: 'Gioco', url: URL_PEW + '2' });
  assert.equal(o.ingressi.filter((x) => x.inputName.startsWith(FONTE_PEW)).length, 1);
  assert.equal(o.ingressi.find((x) => x.inputName === FONTE_PEW).impostazioni.url, URL_PEW + '2');
});

test('un gruppo ferma tutto prima di creare, col suo nome', async () => {
  const o = obsFinto();
  o.scene.get('Gioco').push({ sceneItemId: 9, sceneItemIndex: 2, sourceName: 'Cornici', isGroup: true });
  assert.deepEqual(await scenaConPew(o.chiedi, { scena: 'Gioco', url: URL_PEW }), { ok: false, motivo: 'gruppo', nome: 'Cornici' });
  assert.ok(!o.fatte.some(([c]) => c === 'CreateScene'), 'niente creato');
});

test('un rifiuto a meta\': la scena mezza fatta se ne va', async () => {
  const o = obsFinto({ rompi: 'CreateInput' });
  const r = await scenaConPew(o.chiedi, { scena: 'Gioco', url: URL_PEW });
  assert.deepEqual([r.ok, r.motivo], [false, 'obs']);
  assert.ok(!o.scene.has('Gioco · Pew 2'), 'tolta');
});

test('aggiungere i Pew a una scena che c\'e\'; una volta sola; una scena che non c\'e\' no', async () => {
  const o = obsFinto();
  assert.deepEqual(await aggiungiPew(o.chiedi, { scena: 'Gioco', url: URL_PEW }), { ok: true, scena: 'Gioco' });
  assert.equal(o.scene.get('Gioco').at(-1).sourceName, FONTE_PEW);
  assert.deepEqual(await aggiungiPew(o.chiedi, { scena: 'Gioco', url: URL_PEW }), { ok: false, motivo: 'gia', scena: 'Gioco' });
  assert.deepEqual(await aggiungiPew(o.chiedi, { scena: 'Boh', url: URL_PEW }), { ok: false, motivo: 'scena' });
  // un nome gia' preso da una fonte che non e' un browser: la nostra prende un numero
  const p = obsFinto();
  p.ingressi.push({ inputName: FONTE_PEW, inputKind: 'image_source' });
  await aggiungiPew(p.chiedi, { scena: 'Gioco', url: URL_PEW });
  assert.equal(p.scene.get('Gioco').at(-1).sourceName, FONTE_PEW + ' 2');
});
