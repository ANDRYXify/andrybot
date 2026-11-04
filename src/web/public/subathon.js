// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function (radice) {
  'use strict';

  const LINGUE = ['it', 'en', 'es'];
  const SEC = 1000;
  const MIN = 60 * SEC;
  const ORA = 60 * MIN;
  const FONTI = ['sub', 'bit', 'euro', 'kicks', 'follow', 'raid', 'premio'];
  const A_MANO = ['piu', 'meno', 'resta', 'pausa', 'riprendi', 'felice'];
  const PEZZI = ['titolo', 'conto', 'sale', 'pausa', 'felice', 'totale', 'durata', 'traguardo', 'ultimi'];
  const ALERT = ['allunga', 'traguardo', 'pausa', 'fine'];

  const TESTI = {
    it: {
      allunga: 'Grazie {chi}! Il conto sale di {quanto}.',
      resta: 'Mancano {resta} alla fine della subathon.',
      'resta-pausa': 'Subathon in pausa: mancano {resta}.',
      finita: 'La subathon è finita.',
      fine: 'La subathon è finita! In tutto avete aggiunto {totale}. Grazie a tutti!',
      traguardo: 'Traguardo raggiunto: {traguardo}!',
      piu: 'Aggiunti {quanto}. Mancano {resta}.',
      meno: 'Tolti {quanto}. Mancano {resta}.',
      'resta-messo': 'Fatto: adesso mancano {resta}.',
      pausa: 'Subathon in pausa: restano {resta}.',
      ripresa: 'Si riparte! Mancano {resta}.',
      annullato: 'Annullato: {quanto}. Mancano {resta}.',
      niente: 'Non c\'è niente da annullare.',
      felice: 'Ora felice: per {quanto} ogni cosa vale ×{per}!',
      'felice-stop': 'Ora felice finita.',
      spenta: 'La subathon è spenta: si accende dal pannello.',
      uso: 'Si usa così: !subathon +10m, -5m, sub 3, bit 500, euro 10, kicks 200, resta 3h, pausa, riprendi, annulla, felice 30m x2.',
      titolo: 'Subathon',
      'in-pausa': 'In pausa',
      'ora-felice': 'Ora felice ×{per}',
      totale: '+{tempo} aggiunti',
      durata: 'Da {tempo}',
      ultimi: 'Ultimi',
      'traguardo-scena': 'Prossimo: {testo}',
      'traguardi-fatti': 'Tutti i traguardi raggiunti!',
      'finito-scena': 'Finita!',
      'regole-titolo': 'Come si allunga',
      'alert-allunga': '+{tempo} grazie {chi}!',
      'alert-traguardo': 'Traguardo: {traguardo}!',
      'alert-pausa': 'Subathon in pausa',
      'alert-fine': 'Subathon finita!',
      'r-sub': '1 sub = {minuti}',
      'r-livelli': 'Tier 2 ×{due} · Tier 3 ×{tre}',
      'r-bit': '100 bit = {minuti}',
      'r-euro': '1 {valuta} = {minuti}',
      'r-kicks': '100 Kicks = {minuti}',
      'r-follow': '1 follow = {minuti}',
      'r-raid': '10 spettatori in raid = {minuti}',
      'r-premio': '«{premio}» = {minuti}',
      'r-tetto': 'Mai più di {ore} alla fine',
    },
    en: {
      allunga: 'Thanks {chi}! The clock goes up by {quanto}.',
      resta: '{resta} left before the subathon ends.',
      'resta-pausa': 'Subathon paused: {resta} left.',
      finita: 'The subathon is over.',
      fine: 'The subathon is over! Together you added {totale}. Thank you all!',
      traguardo: 'Milestone reached: {traguardo}!',
      piu: 'Added {quanto}. {resta} left.',
      meno: 'Removed {quanto}. {resta} left.',
      'resta-messo': 'Done: now {resta} left.',
      pausa: 'Subathon paused: {resta} left.',
      ripresa: 'And we\'re back! {resta} left.',
      annullato: 'Undone: {quanto}. {resta} left.',
      niente: 'There is nothing to undo.',
      felice: 'Happy hour: for {quanto} everything counts ×{per}!',
      'felice-stop': 'Happy hour is over.',
      spenta: 'The subathon is off: turn it on from the dashboard.',
      uso: 'Usage: !subathon +10m, -5m, sub 3, bit 500, euro 10, kicks 200, resta 3h, pausa, riprendi, annulla, felice 30m x2.',
      titolo: 'Subathon',
      'in-pausa': 'Paused',
      'ora-felice': 'Happy hour ×{per}',
      totale: '+{tempo} added',
      durata: 'Live for {tempo}',
      ultimi: 'Latest',
      'traguardo-scena': 'Next: {testo}',
      'traguardi-fatti': 'Every milestone reached!',
      'finito-scena': 'Over!',
      'regole-titolo': 'How to extend it',
      'alert-allunga': '+{tempo} thanks {chi}!',
      'alert-traguardo': 'Milestone: {traguardo}!',
      'alert-pausa': 'Subathon paused',
      'alert-fine': 'Subathon over!',
      'r-sub': '1 sub = {minuti}',
      'r-livelli': 'Tier 2 ×{due} · Tier 3 ×{tre}',
      'r-bit': '100 bits = {minuti}',
      'r-euro': '1 {valuta} = {minuti}',
      'r-kicks': '100 Kicks = {minuti}',
      'r-follow': '1 follow = {minuti}',
      'r-raid': '10 raid viewers = {minuti}',
      'r-premio': '«{premio}» = {minuti}',
      'r-tetto': 'Never more than {ore} left',
    },
    es: {
      allunga: '¡Gracias {chi}! El reloj sube {quanto}.',
      resta: 'Faltan {resta} para el final del subathon.',
      'resta-pausa': 'Subathon en pausa: faltan {resta}.',
      finita: 'El subathon ha terminado.',
      fine: '¡El subathon ha terminado! Entre todos habéis añadido {totale}. ¡Gracias a todos!',
      traguardo: '¡Meta alcanzada: {traguardo}!',
      piu: 'Añadidos {quanto}. Faltan {resta}.',
      meno: 'Quitados {quanto}. Faltan {resta}.',
      'resta-messo': 'Hecho: ahora faltan {resta}.',
      pausa: 'Subathon en pausa: quedan {resta}.',
      ripresa: '¡Seguimos! Faltan {resta}.',
      annullato: 'Deshecho: {quanto}. Faltan {resta}.',
      niente: 'No hay nada que deshacer.',
      felice: '¡Hora feliz: durante {quanto} todo vale ×{per}!',
      'felice-stop': 'Se acabó la hora feliz.',
      spenta: 'El subathon está apagado: se enciende desde el panel.',
      uso: 'Se usa así: !subathon +10m, -5m, sub 3, bit 500, euro 10, kicks 200, resta 3h, pausa, riprendi, annulla, felice 30m x2.',
      titolo: 'Subathon',
      'in-pausa': 'En pausa',
      'ora-felice': 'Hora feliz ×{per}',
      totale: '+{tempo} añadidos',
      durata: 'Desde hace {tempo}',
      ultimi: 'Últimos',
      'traguardo-scena': 'Siguiente: {testo}',
      'traguardi-fatti': '¡Todas las metas alcanzadas!',
      'finito-scena': '¡Terminado!',
      'regole-titolo': 'Cómo se alarga',
      'alert-allunga': '+{tempo} ¡gracias {chi}!',
      'alert-traguardo': 'Meta: {traguardo}!',
      'alert-pausa': 'Subathon en pausa',
      'alert-fine': '¡Subathon terminado!',
      'r-sub': '1 sub = {minuti}',
      'r-livelli': 'Tier 2 ×{due} · Tier 3 ×{tre}',
      'r-bit': '100 bits = {minuti}',
      'r-euro': '1 {valuta} = {minuti}',
      'r-kicks': '100 Kicks = {minuti}',
      'r-follow': '1 follow = {minuti}',
      'r-raid': '10 espectadores en raid = {minuti}',
      'r-premio': '«{premio}» = {minuti}',
      'r-tetto': 'Nunca más de {ore} para el final',
    },
  };
  const CHIAVI = Object.keys(TESTI.it);
  const CHIAVI_SCENA = ['titolo', 'in-pausa', 'ora-felice', 'totale', 'durata', 'ultimi', 'traguardo-scena', 'traguardi-fatti', 'finito-scena'];
  const CHIAVI_REGOLE = CHIAVI.filter((k) => k === 'regole-titolo' || k.indexOf('r-') === 0);
  const CHIAVI_CHAT = CHIAVI.filter((k) => CHIAVI_SCENA.indexOf(k) < 0 && CHIAVI_REGOLE.indexOf(k) < 0);

  const PAROLE = {
    it: { ora: ['ora', 'ore'], minuto: ['minuto', 'minuti'], secondo: ['secondo', 'secondi'], e: 'e', altri: 'e altri {n}', qualcuno: 'qualcuno' },
    en: { ora: ['hour', 'hours'], minuto: ['minute', 'minutes'], secondo: ['second', 'seconds'], e: 'and', altri: 'and {n} more', qualcuno: 'someone' },
    es: { ora: ['hora', 'horas'], minuto: ['minuto', 'minutos'], secondo: ['segundo', 'segundos'], e: 'y', altri: 'y {n} más', qualcuno: 'alguien' },
  };

  function lingua(l) { return LINGUE.indexOf(l) >= 0 ? l : 'it'; }
  const num = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);

  function riempi(t, dati) {
    return String(t || '').replace(/\{([a-z]+)\}/g, (tutto, k) => (dati && dati[k] != null ? String(dati[k]) : tutto));
  }

  function testo(testi, chiave, l, dati) {
    const suo = testi && typeof testi[chiave] === 'string' ? testi[chiave].trim() : '';
    const base = suo || (TESTI[lingua(l)] || TESTI.it)[chiave] || '';
    return riempi(base, dati);
  }

  function inParole(ms, l) {
    const P = PAROLE[lingua(l)];
    const t = Math.max(0, Math.round(num(ms) / SEC));
    const o = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    const p = (n, due) => n + ' ' + (n === 1 ? due[0] : due[1]);
    if (o) return m ? p(o, P.ora) + ' ' + P.e + ' ' + p(m, P.minuto) : p(o, P.ora);
    if (m) return p(m, P.minuto);
    return p(s, P.secondo);
  }

  function orologio(ms) {
    const t = Math.max(0, Math.ceil(num(ms) / SEC));
    const o = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    const dd = (n) => (n < 10 ? '0' : '') + n;
    return (o ? o + ':' + dd(m) : String(m)) + ':' + dd(s);
  }

  function conSegno(ms) { return (num(ms) < 0 ? '−' : '+') + orologio(Math.abs(num(ms))); }

  function elenco(nomi, l, max) {
    const P = PAROLE[lingua(l)];
    const v = [];
    for (const n of nomi || []) if (n && v.indexOf(n) < 0) v.push(n);
    if (!v.length) return P.qualcuno;
    const k = Math.max(1, max || 2);
    if (v.length <= k) return v.length === 1 ? v[0] : v.slice(0, -1).join(', ') + ' ' + P.e + ' ' + v[v.length - 1];
    return v.slice(0, k).join(', ') + ' ' + riempi(P.altri, { n: v.length - k });
  }

  function durata(t) {
    const s = String(t == null ? '' : t).trim().toLowerCase().replace(/\s+/g, '');
    if (!s) return null;
    let m = /^(\d{1,3})$/.exec(s);
    if (m) return Number(m[1]) * MIN;
    m = /^(\d{1,3}):(\d{2})(?::(\d{2}))?$/.exec(s);
    if (m) return m[3] != null ? Number(m[1]) * ORA + Number(m[2]) * MIN + Number(m[3]) * SEC : Number(m[1]) * ORA + Number(m[2]) * MIN;
    m = /^(?:(\d{1,3})h)?(?:(\d{1,4})m(?:in)?)?(?:(\d{1,5})s)?$/.exec(s);
    if (m && (m[1] || m[2] || m[3])) return (Number(m[1] || 0) * ORA) + (Number(m[2] || 0) * MIN) + (Number(m[3] || 0) * SEC);
    return null;
  }

  function msPer(regole, ev) {
    if (!regole || !ev) return 0;
    const n = Math.max(0, num(ev.quanti));
    if (!n) return 0;
    const r = regole;
    let minuti = 0;
    if (ev.fonte === 'sub') {
      const liv = num(ev.livello) >= 3 ? 3 : num(ev.livello) === 2 ? 2 : 1;
      const molt = liv === 3 ? num(r.molt3) || 1 : liv === 2 ? num(r.molt2) || 1 : 1;
      minuti = n * num(r.perSub) * molt;
    } else if (ev.fonte === 'bit') minuti = (n / 100) * num(r.perBit100);
    else if (ev.fonte === 'euro') minuti = n * num(r.perEuro);
    else if (ev.fonte === 'kicks') minuti = (n / 100) * num(r.perKicks100);
    else if (ev.fonte === 'follow') minuti = n * num(r.perFollow);
    else if (ev.fonte === 'raid') minuti = (n / 10) * num(r.perRaid10);
    else if (ev.fonte === 'premio') minuti = n * num(r.perPremio);
    return Math.round(minuti * MIN);
  }

  function per(felice, ora) {
    if (!felice || !(num(felice.fino) > ora)) return 1;
    const x = Math.round(num(felice.per));
    return x >= 2 && x <= 5 ? x : 1;
  }

  function resta(timer, ora) {
    const t = timer || {};
    if (t.pausa && typeof t.pausa === 'object') return Math.max(0, num(t.pausa.resta));
    const f = num(t.fine);
    return f > 0 ? Math.max(0, f - ora) : 0;
  }

  function inPausa(timer) { return !!(timer && timer.pausa && typeof timer.pausa === 'object' && num(timer.pausa.resta) > 0); }

  function applica(timer, ms, o) {
    const ora = num(o && o.ora);
    const tetto = Math.max(0, num(o && o.tetto));
    const t = timer || {};
    const pausa = inPausa(t);
    const prima = pausa ? num(t.pausa.resta) : num(t.fine) - ora;
    if (!(prima > 0)) return null;
    const voluto = prima + num(ms);
    let dopo = voluto;
    if (num(ms) > 0 && tetto) dopo = Math.min(voluto, Math.max(prima, tetto));
    if (dopo < 0) dopo = 0;
    let messi = dopo - prima;
    if (num(ms) > 0 && messi < SEC) { messi = 0; dopo = prima; }
    const tagliati = Math.abs(voluto - dopo);
    const nuovo = pausa ? { fine: 0, pausa: { resta: Math.round(dopo) } } : { fine: Math.round(ora + dopo) };
    return { timer: nuovo, prima, dopo, messi: Math.round(messi), tagliati: Math.round(tagliati) };
  }

  function conti(righe, quanti) {
    const n = Math.max(1, Math.min(10, num(quanti) || 5));
    const stornate = new Set();
    for (const r of righe || []) if (r && r.storno) stornate.add(String(r.storno));
    let totale = 0;
    const perChi = new Map();
    const ultimi = [];
    const ordinate = (righe || []).filter(Boolean).slice().sort((a, b) => num(a.ts) - num(b.ts) || String(a.id).localeCompare(String(b.id)));
    for (const r of ordinate) {
      const m = num(r.messi);
      totale += m;
      if (r.chi) perChi.set(r.chi, (perChi.get(r.chi) || 0) + m);
    }
    for (let i = ordinate.length - 1; i >= 0 && ultimi.length < n; i--) {
      const r = ordinate[i];
      if (r.chi && num(r.messi) > 0 && !r.storno && !stornate.has(String(r.id))) ultimi.push({ chi: r.chi, messi: num(r.messi), id: String(r.id) });
    }
    const migliori = [...perChi.entries()].filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map((x) => ({ chi: x[0], messi: x[1] }));
    return { totale: Math.round(totale), migliori, ultimi };
  }

  function traguardi(lista, totale) {
    const v = (Array.isArray(lista) ? lista : []).filter((t) => t && num(t.minuti) > 0).slice().sort((a, b) => num(a.minuti) - num(b.minuti));
    const tot = num(totale);
    const fatti = v.filter((t) => num(t.minuti) * MIN <= tot);
    const prossimo = v.find((t) => num(t.minuti) * MIN > tot) || null;
    const da = fatti.length ? num(fatti[fatti.length - 1].minuti) * MIN : 0;
    const quota = prossimo ? Math.max(0, Math.min(1, (tot - da) / Math.max(1, num(prossimo.minuti) * MIN - da))) : (v.length ? 1 : 0);
    return { fatti, prossimo, quota, tutti: v };
  }

  function superati(lista, prima, dopo) {
    return traguardi(lista, 0).tutti.filter((t) => num(t.minuti) * MIN > num(prima) && num(t.minuti) * MIN <= num(dopo));
  }

  function righeRegole(regole, l, extra) {
    const r = regole || {};
    const x = extra || {};
    const t = x.testi || {};
    const p = (m) => inParole(m * MIN, l);
    const out = [];
    const metti = (chiave, dati) => out.push({ chiave, testo: testo(t, chiave, l, dati) });
    if (num(r.perSub) > 0) {
      metti('r-sub', { minuti: p(num(r.perSub)) });
      if (num(r.molt2) !== 1 || num(r.molt3) !== 1) metti('r-livelli', { due: num(r.molt2) || 1, tre: num(r.molt3) || 1 });
    }
    if (num(r.perBit100) > 0) metti('r-bit', { minuti: p(num(r.perBit100)) });
    if (num(r.perEuro) > 0) metti('r-euro', { minuti: p(num(r.perEuro)), valuta: x.valuta || '€' });
    if (num(r.perKicks100) > 0) metti('r-kicks', { minuti: p(num(r.perKicks100)) });
    if (num(r.perFollow) > 0) metti('r-follow', { minuti: p(num(r.perFollow)) });
    if (num(r.perRaid10) > 0) metti('r-raid', { minuti: p(num(r.perRaid10)) });
    if (num(r.perPremio) > 0 && r.premio) metti('r-premio', { minuti: p(num(r.perPremio)), premio: r.premioTitolo || x.premio || '?' });
    if (num(r.tettoOre) > 0) metti('r-tetto', { ore: inParole(num(r.tettoOre) * ORA, l) });
    return out;
  }

  function nodo(dentro, tag, classe) {
    let n = dentro.querySelector(':scope > .' + classe);
    if (!n) { n = dentro.ownerDocument.createElement(tag); n.className = classe; dentro.appendChild(n); }
    return n;
  }

  function immagine(el, classe, url) {
    let n = el.querySelector(':scope > .' + classe);
    if (!url) { if (n) n.remove(); return null; }
    if (!n) { n = el.ownerDocument.createElement('img'); n.className = classe; n.alt = ''; n.setAttribute('aria-hidden', 'true'); el.insertBefore(n, classe === 'sb-fondo' ? el.firstChild : null); }
    if (n.getAttribute('src') !== url) n.setAttribute('src', url);
    return n;
  }

  function mostra(n, si) { if (n.hidden === !!si) n.hidden = !si; }

  function stato(vista, ora) {
    const v = vista || {};
    const timer = { fine: num(v.fine), pausa: v.pausa || null };
    const pausa = inPausa(timer);
    const r = resta(timer, ora);
    const finito = !pausa && num(v.fine) > 0 && r <= 0;
    const vivo = pausa || num(v.fine) > 0;
    return { pausa, resta: r, finito, vivo };
  }

  function disegna(el, cfg, vista, o) {
    const c = cfg || {};
    const pz = c.pezzi || {};
    const on = (k) => pz[k] !== false;
    const v = vista || {};
    const ora = num(o && o.ora) || Date.now();
    const l = lingua(o && o.lingua);
    const t = c.testi || {};
    const st = stato(v, ora);
    immagine(el, 'sb-fondo', c.fondoUrl || '');
    const testa = nodo(el, 'div', 'sb-testa');
    immagine(testa, 'sb-ico', c.iconaUrl || '');
    const tit = nodo(testa, 'span', 'sb-tit');
    tit.textContent = st.finito ? testo(t, 'finito-scena', l) : testo(t, 'titolo', l);
    mostra(testa, on('titolo') || st.finito);
    const conto = nodo(el, 'div', 'sb-conto');
    const numero = nodo(conto, 'span', 'sb-num');
    numero.textContent = orologio(st.resta);
    nodo(conto, 'span', 'sb-sale-box');
    mostra(conto, on('conto'));
    const righe = nodo(el, 'div', 'sb-stati');
    const pa = nodo(righe, 'span', 'sb-pausa');
    pa.textContent = testo(t, 'in-pausa', l);
    mostra(pa, on('pausa') && st.pausa);
    const fe = nodo(righe, 'span', 'sb-felice');
    const x = per(v.felice, ora);
    fe.textContent = x > 1 ? testo(t, 'ora-felice', l, { per: x }) + ' · ' + orologio(num(v.felice && v.felice.fino) - ora) : '';
    mostra(fe, on('felice') && x > 1);
    const to = nodo(righe, 'span', 'sb-totale');
    to.textContent = testo(t, 'totale', l, { tempo: orologio(Math.max(0, num(v.totale))) });
    mostra(to, on('totale'));
    const du = nodo(righe, 'span', 'sb-durata');
    du.textContent = testo(t, 'durata', l, { tempo: orologio(num(v.inizio) > 0 ? ora - num(v.inizio) : 0) });
    mostra(du, on('durata') && num(v.inizio) > 0);
    mostra(righe, (on('pausa') && st.pausa) || (on('felice') && x > 1) || on('totale') || (on('durata') && num(v.inizio) > 0));
    const tg = nodo(el, 'div', 'sb-traguardo');
    const g = traguardi(v.traguardi, v.totale);
    const tgt = nodo(tg, 'span', 'sb-tg-tit');
    tgt.textContent = g.prossimo ? testo(t, 'traguardo-scena', l, { testo: g.prossimo.testo || orologio(num(g.prossimo.minuti) * MIN) }) : testo(t, 'traguardi-fatti', l);
    const barra = nodo(tg, 'div', 'sb-barra');
    const pieno = nodo(barra, 'i', 'sb-pieno');
    pieno.style.setProperty('--q', g.quota.toFixed(4));
    mostra(tg, on('traguardo') && g.tutti.length > 0);
    const ul = nodo(el, 'ol', 'sb-ultimi');
    const lista = (Array.isArray(v.ultimi) ? v.ultimi : []).slice(0, Math.max(1, Math.min(10, num(c.quantiUltimi) || 3)));
    const firma = lista.map((u) => u.id + ':' + u.chi + ':' + u.messi).join('|') + '#' + testo(t, 'ultimi', l);
    if (ul.dataset.firma !== firma) {
      ul.dataset.firma = firma;
      ul.textContent = '';
      ul.setAttribute('aria-label', testo(t, 'ultimi', l));
      for (const u of lista) {
        const li = el.ownerDocument.createElement('li');
        const b = el.ownerDocument.createElement('b');
        b.textContent = String(u.chi || '').slice(0, 25);
        const s = el.ownerDocument.createElement('span');
        s.textContent = conSegno(u.messi);
        li.appendChild(b); li.appendChild(s);
        ul.appendChild(li);
      }
    }
    mostra(ul, on('ultimi') && lista.length > 0);
    immagine(el, 'sb-cornice', c.corniceUrl || '');
    el.classList.toggle('in-pausa', st.pausa);
    el.classList.toggle('finito', st.finito);
    el.classList.toggle('felice', x > 1);
    return st;
  }

  function sale(el, ms, o) {
    const box = el && el.querySelector('.sb-sale-box');
    if (!box || !(num(ms) > 0)) return null;
    const n = el.ownerDocument.createElement('span');
    n.className = 'sb-sale';
    n.textContent = conSegno(ms);
    box.appendChild(n);
    const via = () => { if (n.parentNode) n.parentNode.removeChild(n); };
    if (o && o.subito) via(); else setTimeout(via, 2600);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    return n;
  }

  function disegnaRegole(el, cfg, righe, o) {
    const c = cfg || {};
    const l = lingua(o && o.lingua);
    const t = c.testi || {};
    const tit = nodo(el, 'div', 'sbr-tit');
    tit.textContent = (c.titolo || '').trim() || testo(t, 'regole-titolo', l);
    mostra(tit, c.mostraTitolo !== false);
    const ul = nodo(el, 'ul', 'sbr-righe');
    const firma = (righe || []).map((r) => r.testo).join('|');
    if (ul.dataset.firma !== firma) {
      ul.dataset.firma = firma;
      ul.textContent = '';
      for (const r of righe || []) {
        const li = el.ownerDocument.createElement('li');
        li.textContent = r.testo;
        li.dataset.chiave = r.chiave;
        ul.appendChild(li);
      }
    }
    return (righe || []).length;
  }

  const SUBATHON = { LINGUE, MIN, ORA, FONTI, A_MANO, PEZZI, ALERT, TESTI, CHIAVI, CHIAVI_SCENA, CHIAVI_REGOLE, CHIAVI_CHAT, lingua, riempi, testo, inParole, orologio, conSegno, elenco, durata, msPer, per, resta, inPausa, applica, conti, traguardi, superati, righeRegole, stato, disegna, sale, disegnaRegole };
  if (typeof module !== 'undefined' && module.exports) module.exports = SUBATHON;
  else radice.SB_SUBATHON = SUBATHON;
})(typeof window !== 'undefined' ? window : globalThis);
