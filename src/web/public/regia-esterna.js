// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
(function () {
  'use strict';

  const K = 'sb-regia-esterna';
  const ATTESA_MS = 8000;

  function impostazioni() {
    try {
      const g = JSON.parse(localStorage.getItem(K) || '{}');
      return { ip: g.ip || '127.0.0.1', porta: g.porta || '4455', pass: g.pass || '' };
    } catch (e) { return { ip: '127.0.0.1', porta: '4455', pass: '' }; }
  }

  function salvaImpostazioni(v) {
    try { localStorage.setItem(K, JSON.stringify(v)); } catch (e) {  }
  }

  function scorda() {
    try { localStorage.removeItem(K); } catch (e) {  }
  }

  function ricordata() {
    try { return !!localStorage.getItem(K); } catch (e) { return false; }
  }

  const b64 = (buf) => btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));

  async function digest(testo) {
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(testo));
    return b64(d);
  }

  async function rispostaAllaSfida(pass, salt, sfida) {
    const segreto = await digest(pass + salt);
    return digest(segreto + sfida);
  }

  const casa = (ip) => ip === '127.0.0.1' || ip === 'localhost' || ip === '::1';

  function leggiIncollato(testo) {
    const t = String(testo || '').trim();
    if (!t) return null;
    const m = /^obsw(?:s|ss):\/\/([^/:\s]+)(?::(\d{1,5}))?(?:\/(.*))?$/i.exec(t);
    if (m) return { ip: m[1], porta: m[2] || '4455', pass: decodeURIComponent(m[3] || '') };
    const hp = /^([a-z0-9.\-:]+):(\d{1,5})$/i.exec(t);
    if (hp) return { ip: hp[1], porta: hp[2], pass: '' };
    if (!/\s/.test(t)) return { ip: '127.0.0.1', porta: '4455', pass: t };
    return null;
  }

  function crea() {
    let ws = null;
    let pronto = false;
    let seq = 0;
    const attese = new Map();
    const ascolti = new Map();

    const dillo = (nome, dati) => { (ascolti.get(nome) || []).forEach((f) => { try { f(dati); } catch (e) {  } }); };

    function chiudi() {
      pronto = false;
      for (const [, a] of attese) a.no(new Error('collegamento chiuso'));
      attese.clear();
      if (ws) { try { ws.close(); } catch (e) {  } }
      ws = null;
      dillo('stato', { collegato: false });
    }

    function collega(cfg) {
      return new Promise((si, no) => {
        if (!casa(cfg.ip)) {
          no(new Error('fuori-casa'));
          return;
        }
        let deciso = false;
        const finita = (f, v) => { if (!deciso) { deciso = true; f(v); } };
        try { ws = new WebSocket(`ws://${cfg.ip}:${cfg.porta}`); }
        catch (e) { return finita(no, new Error('non-raggiungibile')); }

        const scade = setTimeout(() => { finita(no, new Error('non-raggiungibile')); chiudi(); }, ATTESA_MS);

        ws.onerror = () => { clearTimeout(scade); finita(no, new Error('non-raggiungibile')); };
        ws.onclose = (ev) => { clearTimeout(scade); finita(no, new Error(ev && ev.code === 4009 ? 'password-sbagliata' : 'non-raggiungibile')); chiudi(); };

        ws.onmessage = async (m) => {
          let g;
          try { g = JSON.parse(m.data); } catch (e) { return; }

          if (g.op === 0) {
            const d = { rpcVersion: 1, eventSubscriptions: 4 };
            const a = g.d && g.d.authentication;
            if (a) {
              if (!cfg.pass) { clearTimeout(scade); finita(no, new Error('serve-password')); return chiudi(); }
              d.authentication = await rispostaAllaSfida(cfg.pass, a.salt, a.challenge);
            }
            ws.send(JSON.stringify({ op: 1, d }));
            return;
          }
          if (g.op === 2) {
            clearTimeout(scade);
            pronto = true;
            dillo('stato', { collegato: true });
            finita(si, true);
            return;
          }
          if (g.op === 5) { dillo(g.d.eventType, g.d.eventData || {}); return; }
          if (g.op === 7) {
            const a = attese.get(g.d.requestId);
            if (!a) return;
            attese.delete(g.d.requestId);
            const st = g.d.requestStatus || {};
            if (st.result) a.si(g.d.responseData || {});
            else a.no(new Error(st.comment || st.code || 'rifiutata'));
          }
        };
      });
    }

    function chiedi(cosa, dati) {
      return new Promise((si, no) => {
        if (!pronto || !ws) return no(new Error('non collegato'));
        const id = 'r' + (++seq);
        attese.set(id, { si, no });
        setTimeout(() => { if (attese.has(id)) { attese.delete(id); no(new Error('nessuna risposta')); } }, ATTESA_MS);
        ws.send(JSON.stringify({ op: 6, d: { requestType: cosa, requestId: id, requestData: dati || {} } }));
      });
    }

    function ascolta(nome, f) {
      if (!ascolti.has(nome)) ascolti.set(nome, []);
      ascolti.get(nome).push(f);
    }

    return {
      collega, chiudi, chiedi, ascolta, leggiIncollato,
      collegato: () => pronto,
      impostazioni, salvaImpostazioni, scorda, ricordata, casa,
    };
  }

  const FONTE_PEW = 'SocialBot · Pew';
  const CAMPI_TRASF = ['positionX', 'positionY', 'rotation', 'scaleX', 'scaleY', 'alignment', 'boundsType', 'boundsAlignment', 'boundsWidth', 'boundsHeight', 'cropLeft', 'cropRight', 'cropTop', 'cropBottom', 'cropToBounds'];
  function trasformazione(t) {
    const o = {};
    for (const k of CAMPI_TRASF) if (t && t[k] !== undefined && t[k] !== null) o[k] = t[k];
    if (!(o.boundsWidth >= 1)) delete o.boundsWidth;
    if (!(o.boundsHeight >= 1)) delete o.boundsHeight;
    return o;
  }
  function libero(nome, presi) {
    let n = nome;
    for (let i = 2; presi.has(n); i++) n = nome + ' ' + i;
    return n;
  }
  async function fontePew(chiedi, scena, url) {
    const v = await chiedi('GetVideoSettings');
    const imp = { url: url, width: Number(v.baseWidth) || 1920, height: Number(v.baseHeight) || 1080 };
    const ingressi = (await chiedi('GetInputList')).inputs || [];
    const suo = ingressi.find(function (x) { return x.inputName === FONTE_PEW; });
    if (suo && suo.inputKind === 'browser_source') {
      await chiedi('SetInputSettings', { inputName: FONTE_PEW, inputSettings: imp });
      return (await chiedi('CreateSceneItem', { sceneName: scena, sourceName: FONTE_PEW, sceneItemEnabled: true })).sceneItemId;
    }
    const nome = suo ? libero(FONTE_PEW, new Set(ingressi.map(function (x) { return x.inputName; }))) : FONTE_PEW;
    return (await chiedi('CreateInput', { sceneName: scena, inputName: nome, inputKind: 'browser_source', inputSettings: imp, sceneItemEnabled: true })).sceneItemId;
  }
  async function aggiungiPew(chiedi, opz) {
    const scene = ((await chiedi('GetSceneList')).scenes || []).map(function (x) { return x.sceneName; });
    if (scene.indexOf(opz.scena) < 0) return { ok: false, motivo: 'scena' };
    const gia = ((await chiedi('GetSceneItemList', { sceneName: opz.scena })).sceneItems || []).some(function (x) { return x.sourceName === FONTE_PEW; });
    if (gia) return { ok: false, motivo: 'gia', scena: opz.scena };
    await fontePew(chiedi, opz.scena, opz.url);
    return { ok: true, scena: opz.scena };
  }
  async function scenaConPew(chiedi, opz) {
    const scene = ((await chiedi('GetSceneList')).scenes || []).map(function (x) { return x.sceneName; });
    if (scene.indexOf(opz.scena) < 0) return { ok: false, motivo: 'scena' };
    const voci = ((await chiedi('GetSceneItemList', { sceneName: opz.scena })).sceneItems || []).slice()
      .sort(function (a, b) { return a.sceneItemIndex - b.sceneItemIndex; });
    const gruppo = voci.find(function (x) { return x.isGroup; });
    if (gruppo) return { ok: false, motivo: 'gruppo', nome: gruppo.sourceName };
    const nuova = libero(opz.scena + ' · Pew', new Set(scene));
    await chiedi('CreateScene', { sceneName: nuova });
    try {
      for (const x of voci) {
        if (x.sourceName === FONTE_PEW) continue;
        const id = (await chiedi('CreateSceneItem', { sceneName: nuova, sourceName: x.sourceName, sceneItemEnabled: x.sceneItemEnabled !== false })).sceneItemId;
        await chiedi('SetSceneItemTransform', { sceneName: nuova, sceneItemId: id, sceneItemTransform: trasformazione(x.sceneItemTransform) });
        if (x.sceneItemBlendMode) await chiedi('SetSceneItemBlendMode', { sceneName: nuova, sceneItemId: id, sceneItemBlendMode: x.sceneItemBlendMode });
        if (x.sceneItemLocked) await chiedi('SetSceneItemLocked', { sceneName: nuova, sceneItemId: id, sceneItemLocked: true });
      }
      await fontePew(chiedi, nuova, opz.url);
    } catch (e) {
      try { await chiedi('RemoveScene', { sceneName: nuova }); } catch (e2) {  }
      return { ok: false, motivo: 'obs', errore: String(e && e.message || e) };
    }
    return { ok: true, scena: nuova };
  }
  const regia = crea();
  regia.scenaConPew = function (opz) { return scenaConPew(regia.chiedi, opz); };
  regia.aggiungiPew = function (opz) { return aggiungiPew(regia.chiedi, opz); };
  regia.FONTE_PEW = FONTE_PEW;
  window.RegiaEsterna = regia;
  window.RegiaPew = { scenaConPew: scenaConPew, aggiungiPew: aggiungiPew, trasformazione: trasformazione, FONTE_PEW: FONTE_PEW };
}());
