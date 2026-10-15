// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

export const QUALITA_REMOTA = Object.freeze({
  '720p30': Object.freeze({ w: 1280, h: 720, fps: 30, kbps: 2500 }),
  '1080p30': Object.freeze({ w: 1920, h: 1080, fps: 30, kbps: 4500 }),
});
export const ATTESA_RIPRESA_MS = 4000;
export const ATTESA_COLLEGAMENTO_MS = 20000;
export const GRAZIA_REGIA_MS = 10000;

const sessioneNuova = () => [...crypto.getRandomValues(new Uint8Array(6))].map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 10);

export function creaCameraRemota({ trasporto, chiediIce, suStato = () => {}, suMessaggio = () => {}, Pc = globalThis.RTCPeerConnection }) {
  let pc = null, dc = null, sessione = '', stream = null, regia = false, chiuso = false, qual = '720p30';
  let tPerso = 0, tLento = 0, tGrazia = 0, inCorso = false, giro = '', giroPc = '', falliti = 0;
  const stato = { rete: 'attesa', canale: false };
  const avvisa = (extra = {}) => { Object.assign(stato, extra); try { suStato({ ...stato }); } catch (e) { void e; } };

  function chiudiPc() {
    clearTimeout(tPerso); clearTimeout(tLento);
    if (dc) { try { dc.close(); } catch (e) { void e; } }
    if (pc) { try { pc.close(); } catch (e) { void e; } }
    pc = null; dc = null; stato.canale = false;
  }

  async function applicaBanda() {
    if (!pc) return;
    const q = QUALITA_REMOTA[qual] || QUALITA_REMOTA['720p30'];
    for (const s of pc.getSenders()) {
      if (s.track?.kind !== 'video') continue;
      try {
        const p = s.getParameters();
        p.encodings = p.encodings?.length ? p.encodings : [{}];
        p.encodings[0].maxBitrate = q.kbps * 1000;
        p.encodings[0].maxFramerate = q.fps;
        p.degradationPreference = 'balanced';
        await s.setParameters(p);
      } catch (e) { void e; }
    }
  }

  async function offri(restart) {
    if (!pc) return;
    const mio = pc;
    const o = await pc.createOffer(restart ? { iceRestart: true } : undefined);
    if (mio !== pc) return;
    await pc.setLocalDescription(o);
    trasporto.manda('offerta', { s: sessione, sdp: pc.localDescription.sdp, restart: !!restart });
    clearTimeout(tLento);
    tLento = setTimeout(() => { if (mio === pc && pc.connectionState !== 'connected') { falliti++; avvisa({ rete: 'bloccata' }); collega(); } }, ATTESA_COLLEGAMENTO_MS);
  }

  async function collega() {
    if (inCorso) return;
    inCorso = true;
    try {
      chiudiPc();
      if (chiuso) return;
      if (!regia) { avvisa({ rete: 'attesa' }); return; }
      if (!stream) { avvisa({ rete: 'camera' }); return; }
      const { iceServers } = await chiediIce();
      if (chiuso || !regia) return;
      sessione = sessioneNuova();
      giroPc = giro;
      pc = new Pc({ iceServers });
      const mio = pc;
      dc = pc.createDataChannel('regia', { ordered: true });
      dc.onopen = () => avvisa({ canale: true });
      dc.onclose = () => avvisa({ canale: false });
      dc.onmessage = (e) => { let m = null; try { m = JSON.parse(e.data); } catch (x) { m = null; } if (m && typeof m === 'object') suMessaggio(m); };
      for (const tr of stream.getTracks()) pc.addTransceiver(tr, { direction: 'sendonly', streams: [stream] });
      pc.onicecandidate = (e) => { if (e.candidate && mio === pc) trasporto.manda('ice', { s: sessione, c: e.candidate.toJSON() }); };
      pc.onconnectionstatechange = () => {
        if (mio !== pc) return;
        const c = pc.connectionState;
        if (c === 'connected') { clearTimeout(tPerso); clearTimeout(tLento); falliti = 0; avvisa({ rete: 'collegato' }); applicaBanda(); }
        else if (c === 'disconnected') { avvisa({ rete: 'perso' }); clearTimeout(tPerso); tPerso = setTimeout(() => { if (mio === pc && pc.connectionState !== 'connected') riprova(); }, ATTESA_RIPRESA_MS); }
        else if (c === 'failed') { avvisa({ rete: 'perso' }); riprova(); }
      };
      avvisa({ rete: falliti ? 'bloccata' : 'collego' });
      await offri(false);
    } catch (e) {
      avvisa({ rete: 'errore', errore: String(e?.message || e) });
    } finally { inCorso = false; }
  }

  async function riprova() {
    if (chiuso || !regia) return;
    if (pc && pc.connectionState !== 'closed' && pc.signalingState === 'stable') { try { await offri(true); return; } catch (e) { void e; } }
    await collega();
  }

  return {
    async segnale({ tipo, dati } = {}) {
      if (!pc || !dati || dati.s !== sessione) return;
      try {
        if (tipo === 'risposta' && pc.signalingState === 'have-local-offer') await pc.setRemoteDescription({ type: 'answer', sdp: String(dati.sdp || '') });
        else if (tipo === 'ice' && dati.c) await pc.addIceCandidate(dati.c);
        else if (tipo === 'fine') { chiudiPc(); setTimeout(collega, 800); }
      } catch (e) { void e; }
    },
    regiaPresente(c, g = '') {
      clearTimeout(tGrazia);
      if (!c) {
        regia = false;
        if (pc && pc.connectionState === 'connected') { tGrazia = setTimeout(() => { if (!regia) { chiudiPc(); avvisa({ rete: 'attesa' }); } }, GRAZIA_REGIA_MS); return; }
        chiudiPc(); avvisa({ rete: 'attesa' });
        return;
      }
      regia = true; giro = String(g || '');
      if (pc && giroPc === giro && ['connected', 'connecting', 'new'].includes(pc.connectionState)) return;
      collega();
    },
    async usaStream(s) {
      const prima = stream;
      stream = s;
      if (pc && prima && s) {
        const nuove = new Map(s.getTracks().map((t) => [t.kind, t]));
        let tutte = true;
        for (const t of pc.getTransceivers()) {
          const kind = t.receiver?.track?.kind;
          if (!kind || !nuove.has(kind)) { tutte = false; continue; }
          try { await t.sender.replaceTrack(nuove.get(kind)); } catch (e) { tutte = false; }
        }
        if (tutte) { applicaBanda(); return; }
      }
      collega();
    },
    manda(m) { if (dc && dc.readyState === 'open') { try { dc.send(JSON.stringify(m)); return true; } catch (e) { void e; } } return false; },
    qualita(k) { if (QUALITA_REMOTA[k]) { qual = k; applicaBanda(); } return qual; },
    stato: () => ({ ...stato }),
    pc: () => pc,
    chiudi() {
      chiuso = true;
      clearTimeout(tGrazia);
      if (pc) trasporto.manda('fine', { s: sessione });
      chiudiPc();
      avvisa({ rete: 'chiuso' });
    },
  };
}
