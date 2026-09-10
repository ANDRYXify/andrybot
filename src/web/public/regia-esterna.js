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
        ws.onclose = () => { clearTimeout(scade); finita(no, new Error('non-raggiungibile')); chiudi(); };

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
      collega, chiudi, chiedi, ascolta,
      collegato: () => pronto,
      impostazioni, salvaImpostazioni, scorda, casa,
    };
  }

  window.RegiaEsterna = crea();
}());
