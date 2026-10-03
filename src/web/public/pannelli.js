// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function (radice) {
  'use strict';

  const W = 320;
  const DENSITA = 3;
  const ALTEZZE = [80, 100, 160];
  const TEMI = ['pagina', 'carta', 'notte', 'miei'];
  const FORME = ['penna', 'netta', 'piena'];
  const TIPI = ['chi', 'programma', 'social', 'discord', 'dona', 'comandi', 'regole', 'libero'];
  const ICONE = { chi: 'utente', programma: 'calendario', social: 'globo', discord: 'chat', dona: 'cuore', comandi: 'lista', regole: 'scudo', libero: 'stella' };
  const MIN_PX = 14;
  const MIN_SOTTO = 11;
  const MAX = { voci: 12, titolo: 40, sottotitolo: 50, link: 300, testo: 1000, comandi: 12 };
  const MIEI_BASE = { fondo: '#151216', testo: '#f4eef2', accento: '#b8237f' };
  const RETI = { twitch: 'Twitch', kick: 'Kick', youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok', x: 'X', twitter: 'X', threads: 'Threads', facebook: 'Facebook', discord: 'Discord', telegram: 'Telegram', spotify: 'Spotify', reddit: 'Reddit' };
  const FONDI = { carta: { fondo: '#f6f1e7', testo: '#1a1919' }, notte: { fondo: '#151216', testo: '#f4eef2' } };

  function tavolozza(tema, pag, K, miei) {
    if (tema === 'miei') {
      const m = miei || MIEI_BASE;
      const testo = K.contrasto(m.testo, m.fondo) >= 4.5 ? m.testo : K.inchiostro(m.fondo);
      return { fondo: m.fondo, testo, accento: K.contrasto(m.accento, m.fondo) >= 3 ? m.accento : testo };
    }
    const acc = (pag && pag.acc) || '#b8237f';
    if (tema === 'pagina') {
      const testo = K.inchiostro(acc);
      return { fondo: acc, testo, accento: testo };
    }
    const f = FONDI[tema] || FONDI.carta;
    const testo = K.contrasto(f.testo, f.fondo) >= 4.5 ? f.testo : K.inchiostro(f.fondo);
    return { fondo: f.fondo, testo, accento: K.contrasto(acc, f.fondo) >= 3 ? acc : testo };
  }

  function tondo(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function adatta(g, testo, largo, da, font, min = MIN_PX) {
    let px = Math.max(min, Math.round(da));
    g.font = font(px);
    while (px > min && g.measureText(testo).width > largo) { px--; g.font = font(px); }
    if (g.measureText(testo).width <= largo) return { testo, px, tagliato: false };
    let s = testo;
    while (s && g.measureText(s + '…').width > largo) s = s.slice(0, -1);
    return { testo: s.replace(/\s+$/, '') + '…', px, tagliato: true };
  }

  const fontDi = (car) => (px) => `${car.stile || ''}${car.peso} ${px}px ${car.famiglia}`;
  const fontSotto = (car) => (px) => `${car.stile || ''}600 ${px}px ${car.famiglia}`;
  const CAR = { famiglia: 'sans-serif', peso: 800, stile: '' };
  const conSotto = (o) => !!String(o.sottotitolo || '').trim();
  const daTitolo = (h, sotto) => Math.min(40, h * (sotto ? 0.32 : 0.4));
  const daSotto = (pxTitolo) => Math.max(MIN_SOTTO, Math.round(pxTitolo * 0.5));

  function spazio(h, forma, conIcona, freccia) {
    const m = forma === 'piena' ? 0 : 6;
    const box = { x: m, y: m, w: W - 2 * m, h: h - 2 * m };
    const pad = Math.max(14, Math.round(h * 0.16));
    const s = Math.max(20, Math.min(56, Math.round(h * 0.46)));
    const fr = freccia ? Math.round(Math.min(16, h * 0.16)) : 0;
    const x0 = box.x + pad + (conIcona ? s + 12 : 0);
    return { box, pad, s, fr, x0, largo: box.x + box.w - pad - x0 - (fr ? Math.round(fr * 0.6) + 10 : 0) };
  }

  function misura(g, o) {
    const sp = spazio(o.h, o.forma, !!o.icona, !!o.freccia);
    return adatta(g, String(o.titolo || '').trim(), sp.largo, daTitolo(o.h, conSotto(o)), fontDi(o.carattere || CAR)).px;
  }

  function misuraSotto(g, o, pxTitolo) {
    if (!conSotto(o)) return Infinity;
    const sp = spazio(o.h, o.forma, !!o.icona, !!o.freccia);
    return adatta(g, String(o.sottotitolo).trim(), sp.largo, daSotto(pxTitolo), fontSotto(o.carattere || CAR), MIN_SOTTO).px;
  }

  function disegna(g, o) {
    const h = o.h, c = o.colori;
    const font = fontDi(o.carattere || CAR);
    const problemi = [];
    const d = o.densita || 1;
    g.setTransform(d, 0, 0, d, 0, 0);
    g.clearRect(0, 0, W, h);
    const sp = spazio(h, o.forma, !!o.icona, !!o.freccia);
    const box = sp.box;

    if (o.forma === 'penna' && o.penna && typeof Path2D !== 'undefined') {
      const P = o.penna;
      const f = P.forma(box.x + 2, box.y + 2, box.w - 4, box.h - 4, { seme: o.seme, rag: 10, angoli: 0.02, bombatura: 0.008 });
      g.fillStyle = c.fondo;
      g.fill(new Path2D(P.percorso(f.guida)));
      g.fillStyle = c.accento;
      g.fill(new Path2D(P.tratto(f.china, { larghezza: 2.6, punta: 'china', seme: o.seme + ':china', passo: 0.6 }).d));
    } else if (o.forma === 'piena') {
      g.fillStyle = c.fondo;
      g.fillRect(0, 0, W, h);
    } else {
      tondo(g, box.x + 1, box.y + 1, box.w - 2, box.h - 2, 14);
      g.fillStyle = c.fondo;
      g.fill();
      g.lineWidth = 2.5;
      g.strokeStyle = c.accento;
      g.stroke();
    }

    if (o.icona) g.drawImage(o.icona, box.x + sp.pad, Math.round(box.y + (box.h - sp.s) / 2), sp.s, sp.s);
    const x0 = sp.x0;
    const cy = box.y + box.h / 2 + 1;
    const t = adatta(g, String(o.titolo || '').trim(), sp.largo, Math.min(daTitolo(h, conSotto(o)), o.px || Infinity), font);
    if (t.tagliato) problemi.push({ tipo: 'titolo', titolo: o.titolo });
    let st = null;
    if (conSotto(o)) {
      st = adatta(g, String(o.sottotitolo).trim(), sp.largo, Math.min(daSotto(t.px), o.pxSotto || Infinity), fontSotto(o.carattere || CAR), MIN_SOTTO);
      if (st.tagliato) problemi.push({ tipo: 'sottotitolo', titolo: o.titolo });
    }
    const gap = st ? Math.round(t.px * 0.18) : 0;
    const alto = st ? t.px + gap + st.px : t.px;
    const yT = cy - alto / 2 + t.px / 2;
    const xT = o.icona ? x0 : x0 + sp.largo / 2;
    g.fillStyle = c.testo;
    g.textBaseline = 'middle';
    g.textAlign = o.icona ? 'left' : 'center';
    g.font = font(t.px);
    g.fillText(t.testo, xT, yT);
    if (st) {
      g.font = fontSotto(o.carattere || CAR)(st.px);
      g.fillText(st.testo, xT, yT + t.px / 2 + gap + st.px / 2);
    }
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    if (sp.fr) {
      const xR = box.x + box.w - Math.round(sp.pad * 0.7), w = Math.round(sp.fr * 0.55);
      g.beginPath();
      g.moveTo(xR - w, cy - sp.fr / 2);
      g.lineTo(xR, cy);
      g.lineTo(xR - w, cy + sp.fr / 2);
      g.lineWidth = 2.5;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.strokeStyle = c.accento;
      g.stroke();
    }
    return { problemi, px: t.px, pxSotto: st ? st.px : 0, testo: t.testo, sottotitolo: st ? st.testo : '' };
  }

  function mdTesto(s) {
    const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim().replace(/[\\`*_\[\]]/g, '\\$&');
    if (/^[#>+-]/.test(t)) return '\\' + t;
    return t.replace(/^(\d+)([.)])(?=\s|$)/, '$1\\$2');
  }
  function mdIndirizzo(u) {
    try {
      const x = new URL(String(u || ''));
      if (!/^https?:$/.test(x.protocol)) return '';
      return x.href.replace(/[()\s<>]/g, (ch) => '%' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
    } catch (e) { return ''; }
  }
  function mdLink(nome, u) {
    const url = mdIndirizzo(u);
    return url ? `[${mdTesto(nome)}](${url})` : mdTesto(nome);
  }

  function predefiniti(d, t) {
    const v = [];
    const metti = (tipo, campi) => v.push(Object.assign({ id: tipo, tipo, titolo: t.titoli[tipo], icona: ICONE[tipo], link: '', testo: '' }, campi));
    const pagina = mdIndirizzo(d.linkPagina);
    metti('chi', { link: pagina, testo: mdTesto(d.bio) });
    const giorni = (d.settimana && d.settimana.giorni) || [];
    const inOnda = giorni.map((x, i) => (x && !x.off && x.ora ? { i, ora: x.ora, att: x.att } : null)).filter(Boolean);
    if (inOnda.length) {
      const righe = inOnda.map((x) => `- **${mdTesto(t.giorni[x.i])}** ${mdTesto(x.ora)}${x.att ? ' · ' + mdTesto(x.att) : ''}`);
      if (d.settimana.fuso) righe.push('', mdTesto(t.fuso(d.settimana.fuso)));
      metti('programma', { link: pagina, testo: righe.join('\n') });
    }
    const social = (d.social || []).filter((s) => mdIndirizzo(s.url));
    if (social.length) metti('social', { link: pagina, testo: social.map((s) => `- ${mdLink(RETI[s.icona] || s.icona, s.url)}`).join('\n') });
    const discord = mdIndirizzo(d.linkDiscord);
    if (discord) metti('discord', { link: discord, testo: mdTesto(t.discord) });
    const dona = mdIndirizzo(d.linkDona);
    if (dona) metti('dona', { link: dona, testo: mdTesto(t.dona) });
    const comandi = (d.comandi || []).map((x) => String(x).replace(/[^a-z0-9_]/gi, '')).filter(Boolean).slice(0, MAX.comandi);
    if (comandi.length) metti('comandi', { testo: comandi.map((x) => `- !${x}`).join('\n') });
    metti('regole', { testo: (t.regole || []).map((x) => `- ${mdTesto(x)}`).join('\n') });
    return v;
  }

  function nomeFile(i, titolo) {
    const slug = String(titolo || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'pannello';
    return `pannello-${String(i + 1).padStart(2, '0')}-${slug}.png`;
  }

  function testi(voci) {
    return voci.map((p, i) => [`${i + 1}. ${p.titolo}`, p.link || '', p.testo || ''].filter((x, k) => k === 0 || x).join('\n')).join('\n\n----\n\n') + '\n';
  }

  const PANNELLI = { W, DENSITA, ALTEZZE, TEMI, FORME, TIPI, ICONE, MAX, RETI, MIN_PX, MIN_SOTTO, MIEI_BASE, tavolozza, misura, misuraSotto, disegna, predefiniti, mdTesto, mdIndirizzo, mdLink, nomeFile, testi };
  if (typeof module !== 'undefined' && module.exports) module.exports = PANNELLI;
  else radice.SB_PANNELLI = PANNELLI;
})(typeof window !== 'undefined' ? window : globalThis);
