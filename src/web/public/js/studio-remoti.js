// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

export const QUALITA_SEGNALE = Object.freeze({ buona: 'buona', media: 'media', scarsa: 'scarsa' });

export function qualitaSegnale({ rtt = 0, perdita = 0, fps = 0 } = {}) {
  if (perdita > 0.05 || rtt > 0.6 || (fps > 0 && fps < 10)) return 'scarsa';
  if (perdita > 0.015 || rtt > 0.25 || (fps > 0 && fps < 20)) return 'media';
  return 'buona';
}

export function creaRegiaRemota({ trasporto, chiediIce, suCambio = () => {}, suMessaggio = () => {}, creaVideo = () => document.createElement('video'), Pc = globalThis.RTCPeerConnection }) {
  const remoti = new Map();
  let ice = null, iceQuando = 0;

  const cambia = (v) => { try { suCambio(v); } catch (e) { void e; } };
  const voce = (id) => {
    let v = remoti.get(id);
    if (!v) {
      v = { id, nome: '', comanda: false, collegato: false, stato: 'scollegato', pc: null, sessione: '', dc: null, video: null, stream: null, coda: [], stats: {}, info: {}, ultimi: null };
      remoti.set(id, v);
    }
    return v;
  };
  const iceServers = async () => {
    if (!ice || performance.now() - iceQuando > 3_600_000) { ice = (await chiediIce()).iceServers; iceQuando = performance.now(); }
    return ice;
  };

  function chiudiPc(v) {
    if (v.dc) { try { v.dc.close(); } catch (e) { void e; } }
    if (v.pc) { try { v.pc.close(); } catch (e) { void e; } }
    v.pc = null; v.dc = null; v.coda = []; v.ultimi = null;
  }

  async function nuovoPc(v) {
    const pc = new Pc({ iceServers: await iceServers() });
    pc.ontrack = (e) => {
      if (v.pc !== pc) return;
      if (!v.stream || (e.streams[0] && e.streams[0] !== v.stream)) v.stream = e.streams[0] || new MediaStream();
      if (!v.stream.getTracks().includes(e.track)) v.stream.addTrack(e.track);
      if (!v.video) { v.video = creaVideo(); v.video.muted = true; v.video.playsInline = true; v.video.autoplay = true; }
      if (v.video.srcObject !== v.stream) v.video.srcObject = v.stream;
      v.video.play?.().catch(() => {});
      cambia(v);
    };
    pc.ondatachannel = (e) => {
      if (v.pc !== pc) return;
      v.dc = e.channel;
      v.dc.onopen = () => cambia(v);
      v.dc.onclose = () => cambia(v);
      v.dc.onmessage = (m) => { let x = null; try { x = JSON.parse(m.data); } catch (err) { x = null; } if (x && typeof x === 'object') { if (x.t === 'info') v.info = { ...v.info, ...x }; try { suMessaggio(v, x); } catch (err) { void err; } } };
    };
    pc.onicecandidate = (e) => { if (e.candidate && v.pc === pc) trasporto.manda(v.id, 'ice', { s: v.sessione, c: e.candidate.toJSON() }); };
    pc.onconnectionstatechange = () => {
      if (v.pc !== pc) return;
      const c = pc.connectionState;
      if ((c === 'failed' || c === 'closed') && !v.collegato) { chiudiPc(v); v.stato = 'scollegato'; v.persoDa = v.persoDa || performance.now(); cambia(v); return; }
      v.stato = c === 'connected' ? 'collegato' : (c === 'failed' || c === 'disconnected' ? 'perso' : (c === 'closed' ? 'scollegato' : 'collego'));
      if (v.stato === 'perso' && !v.persoDa) v.persoDa = performance.now();
      if (v.stato === 'collegato') v.persoDa = 0;
      cambia(v);
    };
    return pc;
  }

  return {
    remoti,

    presenza({ id, nome, comanda, collegato } = {}) {
      if (!id) return;
      const v = voce(String(id));
      if (nome) v.nome = String(nome);
      v.comanda = !!comanda;
      v.collegato = !!collegato;
      if (!collegato && v.pc?.connectionState !== 'connected') { chiudiPc(v); v.stato = 'scollegato'; v.persoDa = v.persoDa || performance.now(); }
      else if (collegato && v.stato === 'scollegato') v.stato = 'attesa';
      cambia(v);
    },

    async segnale({ da, tipo, dati } = {}) {
      if (!da || !dati) return;
      const v = voce(String(da));
      try {
        if (tipo === 'offerta') {
          if (!v.pc || v.sessione !== dati.s) { chiudiPc(v); v.sessione = String(dati.s || ''); v.pc = await nuovoPc(v); v.stato = 'collego'; cambia(v); }
          const pc = v.pc;
          await pc.setRemoteDescription({ type: 'offer', sdp: String(dati.sdp || '') });
          const r = await pc.createAnswer();
          if (v.pc !== pc) return;
          await pc.setLocalDescription(r);
          trasporto.manda(v.id, 'risposta', { s: v.sessione, sdp: pc.localDescription.sdp });
          const coda = v.coda; v.coda = [];
          for (const c of coda) { try { await pc.addIceCandidate(c); } catch (e) { void e; } }
        } else if (tipo === 'ice') {
          if (dati.s !== v.sessione || !dati.c) return;
          if (!v.pc || !v.pc.remoteDescription) v.coda.push(dati.c);
          else await v.pc.addIceCandidate(dati.c);
        } else if (tipo === 'fine') {
          if (dati.s === v.sessione) { chiudiPc(v); v.stato = 'attesa'; cambia(v); }
        }
      } catch (e) { void e; }
    },

    manda(id, m) {
      const v = remoti.get(id);
      if (v?.dc && v.dc.readyState === 'open') { try { v.dc.send(JSON.stringify(m)); return true; } catch (e) { void e; } }
      return false;
    },

    async misura() {
      for (const v of remoti.values()) {
        if (!v.pc || v.stato !== 'collegato') continue;
        let byte = 0, persi = 0, ricevuti = 0, fps = 0, w = 0, h = 0, rtt = 0;
        try {
          const r = await v.pc.getStats();
          r.forEach((s) => {
            if (s.type === 'inbound-rtp' && s.kind === 'video') { byte += s.bytesReceived || 0; persi += s.packetsLost || 0; ricevuti += s.packetsReceived || 0; fps = s.framesPerSecond || fps; w = s.frameWidth || w; h = s.frameHeight || h; }
            if (s.type === 'candidate-pair' && s.state === 'succeeded' && s.nominated) rtt = s.currentRoundTripTime || rtt;
          });
        } catch (e) { continue; }
        const t = performance.now(), u = v.ultimi;
        const kbps = u ? Math.max(0, Math.round((byte - u.byte) * 8 / Math.max(1, t - u.t))) : 0;
        const dP = u ? persi - u.persi : 0, dR = u ? ricevuti - u.ricevuti : 0;
        v.ultimi = { byte, persi, ricevuti, t };
        v.stats = { kbps, fps: Math.round(fps), w, h, rtt, perdita: dP + dR > 0 ? Math.max(0, dP) / (dP + dR) : 0 };
        v.stats.qualita = qualitaSegnale(v.stats);
        cambia(v);
      }
    },

    togli(id) {
      const v = remoti.get(id);
      if (!v) return;
      chiudiPc(v);
      if (v.video) { try { v.video.srcObject = null; } catch (e) { void e; } }
      remoti.delete(id);
      cambia({ id, tolto: true });
    },

    chiudi() { for (const v of remoti.values()) chiudiPc(v); },
  };
}
