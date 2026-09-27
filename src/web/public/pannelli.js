// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function (radice) {
  'use strict';

  const W = 320;
  const ALTEZZE = [80, 100, 160];
  const TEMI = ['pagina', 'carta', 'notte'];
  const FORME = ['penna', 'netta', 'piena'];
  const TIPI = ['chi', 'programma', 'social', 'discord', 'dona', 'comandi', 'regole', 'libero'];
  const ICONE = { chi: 'utente', programma: 'calendario', social: 'globo', discord: 'chat', dona: 'cuore', comandi: 'lista', regole: 'scudo', libero: 'stella' };
  const MIN_PX = 14;
  const MAX = { voci: 12, titolo: 40, link: 300, testo: 1000, comandi: 12 };
  const RETI = { twitch: 'Twitch', kick: 'Kick', youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok', x: 'X', twitter: 'X', threads: 'Threads', facebook: 'Facebook', discord: 'Discord', telegram: 'Telegram', spotify: 'Spotify', reddit: 'Reddit' };
  const FONDI = { carta: { fondo: '#f6f1e7', testo: '#1a1919' }, notte: { fondo: '#151216', testo: '#f4eef2' } };

  function tavolozza(tema, pag, K) {
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

  function adatta(g, testo, largo, da, font) {
    let px = Math.max(MIN_PX, Math.round(da));
    g.font = font(px);
    while (px > MIN_PX && g.measureText(testo).width > largo) { px--; g.font = font(px); }
    if (g.measureText(testo).width <= largo) return { testo, px, tagliato: false };
    let s = testo;
    while (s && g.measureText(s + '…').width > largo) s = s.slice(0, -1);
    return { testo: s.replace(/\s+$/, '') + '…', px, tagliato: true };
  }

  const fontDi = (car) => (px) => `${car.stile || ''}${car.peso} ${px}px ${car.famiglia}`;
  const CAR = { famiglia: 'sans-serif', peso: 800, stile: '' };

  function spazio(h, forma, conIcona) {
    const m = forma === 'piena' ? 0 : 6;
    const box = { x: m, y: m, w: W - 2 * m, h: h - 2 * m };
    const pad = Math.max(14, Math.round(h * 0.16));
    const s = Math.max(20, Math.min(56, Math.round(h * 0.46)));
    const x0 = box.x + pad + (conIcona ? s + 12 : 0);
    return { box, pad, s, x0, largo: box.x + box.w - pad - x0 };
  }

  function misura(g, o) {
    const sp = spazio(o.h, o.forma, !!o.icona);
    return adatta(g, String(o.titolo || '').trim(), sp.largo, Math.min(40, o.h * 0.4), fontDi(o.carattere || CAR)).px;
  }

  function disegna(g, o) {
    const h = o.h, c = o.colori;
    const font = fontDi(o.carattere || CAR);
    const problemi = [];
    g.clearRect(0, 0, W, h);
    const sp = spazio(h, o.forma, !!o.icona);
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
    const t = adatta(g, String(o.titolo || '').trim(), sp.largo, Math.min(40, h * 0.4, o.px || Infinity), font);
    if (t.tagliato) problemi.push({ tipo: 'titolo', titolo: o.titolo });
    g.fillStyle = c.testo;
    g.textBaseline = 'middle';
    g.textAlign = o.icona ? 'left' : 'center';
    g.fillText(t.testo, o.icona ? x0 : box.x + box.w / 2, box.y + box.h / 2 + 1);
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    return { problemi, px: t.px, testo: t.testo };
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

  const PANNELLI = { W, ALTEZZE, TEMI, FORME, TIPI, ICONE, MAX, RETI, MIN_PX, tavolozza, misura, disegna, predefiniti, mdTesto, mdIndirizzo, mdLink, nomeFile, testi };
  if (typeof module !== 'undefined' && module.exports) module.exports = PANNELLI;
  else radice.SB_PANNELLI = PANNELLI;
})(typeof window !== 'undefined' ? window : globalThis);
