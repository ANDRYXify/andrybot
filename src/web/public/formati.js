// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function (radice) {
  'use strict';

  const LINGUE = ['it', 'en', 'es'];
  const LOCALE = { it: 'it-IT', en: 'en-US', es: 'es-ES' };
  const DATE = ['gg/mm/aaaa', 'mm/gg/aaaa', 'aaaa-mm-gg', 'esteso'];
  const ORE = ['24', '12'];
  const SETTIMANE = ['lun', 'dom'];
  const DURATE = ['estese', 'brevi'];
  const FUSO_BASE = 'Europe/Rome';
  const GIORNO_MS = 86400000;

  function fusoValido(f) {
    if (!f || typeof f !== 'string') return false;
    try { new Intl.DateTimeFormat('en-US', { timeZone: f }).format(0); return true; } catch (e) { return false; }
  }

  function valori(p) {
    const q = p || {};
    const lingua = LINGUE.includes(q.lingua) ? q.lingua : 'it';
    return {
      lingua,
      fuso: fusoValido(q.fuso) ? q.fuso : FUSO_BASE,
      data: DATE.includes(q.data) ? q.data : (lingua === 'en' ? 'mm/gg/aaaa' : 'gg/mm/aaaa'),
      ora: ORE.includes(q.ora) ? q.ora : (lingua === 'en' ? '12' : '24'),
      settimana: SETTIMANE.includes(q.settimana) ? q.settimana : 'lun',
      durate: DURATE.includes(q.durate) ? q.durate : 'estese',
    };
  }

  function pezzi(ms, v, opz) {
    const out = {};
    for (const x of new Intl.DateTimeFormat(LOCALE[v.lingua], Object.assign({ timeZone: v.fuso }, opz)).formatToParts(new Date(ms))) out[x.type] = x.value;
    return out;
  }

  function calendario(ms, v) {
    const x = pezzi(ms, v, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    return { a: Number(x.year), m: Number(x.month), g: Number(x.day), h: Number(x.hour) % 24, min: Number(x.minute) };
  }

  const due = (n) => String(n).padStart(2, '0');

  function data(ms, p) {
    const v = valori(p);
    if (v.data === 'esteso') return new Intl.DateTimeFormat(LOCALE[v.lingua], { timeZone: v.fuso, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(ms));
    const c = calendario(ms, v);
    if (v.data === 'mm/gg/aaaa') return `${due(c.m)}/${due(c.g)}/${c.a}`;
    if (v.data === 'aaaa-mm-gg') return `${c.a}-${due(c.m)}-${due(c.g)}`;
    return `${due(c.g)}/${due(c.m)}/${c.a}`;
  }

  const SUFFISSI = { it: ['AM', 'PM'], en: ['AM', 'PM'], es: ['a. m.', 'p. m.'] };

  function ora(ms, p) {
    const v = valori(p);
    const c = calendario(ms, v);
    if (v.ora === '12') return `${c.h % 12 || 12}:${due(c.min)} ${SUFFISSI[v.lingua][c.h < 12 ? 0 : 1]}`;
    return `${c.h}:${due(c.min)}`;
  }

  function giorno(ms, p) {
    const v = valori(p);
    return new Intl.DateTimeFormat(LOCALE[v.lingua], { timeZone: v.fuso, weekday: 'long' }).format(new Date(ms));
  }

  function giorniFra(da, a, v) {
    const x = calendario(da, v), y = calendario(a, v);
    return Math.round((Date.UTC(y.a, y.m - 1, y.g) - Date.UTC(x.a, x.m - 1, x.g)) / GIORNO_MS);
  }

  function alle(v, testoOra) {
    const una = testoOra.startsWith('1:');
    if (v.lingua === 'it') return (una ? "all'" : 'alle ') + testoOra;
    if (v.lingua === 'es') return (una ? 'a la ' : 'a las ') + testoOra;
    return 'at ' + testoOra;
  }

  function quando(ms, p, opz) {
    const v = valori(p);
    const adesso = opz && Number.isFinite(opz.adesso) ? opz.adesso : Date.now();
    const n = giorniFra(adesso, ms, v);
    const c = calendario(ms, v);
    const o = alle(v, ora(ms, v));
    const T = {
      it: { oggi: c.h >= 18 ? 'stasera' : 'oggi', domani: 'domani', ieri: 'ieri' },
      en: { oggi: c.h >= 18 ? 'tonight' : 'today', domani: 'tomorrow', ieri: 'yesterday' },
      es: { oggi: c.h >= 20 ? 'esta noche' : 'hoy', domani: 'mañana', ieri: 'ayer' },
    }[v.lingua];
    if (n === 0) return `${T.oggi} ${o}`;
    if (n === 1) return `${T.domani} ${o}`;
    if (n === -1) return `${T.ieri} ${o}`;
    const g = giorno(ms, v);
    if (n > 1 && n < 7) return v.lingua === 'es' ? `el ${g} ${o}` : `${g} ${o}`;
    const lunga = new Intl.DateTimeFormat(LOCALE[v.lingua], { timeZone: v.fuso, day: 'numeric', month: 'long' }).format(new Date(ms));
    if (v.lingua === 'en') return `${g}, ${lunga} ${o}`;
    if (v.lingua === 'es') return `el ${g} ${lunga} ${o}`;
    return `${g} ${lunga} ${o}`;
  }

  const PAROLE = {
    it: { g: ['giorno', 'giorni'], h: ['ora', 'ore'], m: ['minuto', 'minuti'], s: ['secondo', 'secondi'], e: ' e ' },
    en: { g: ['day', 'days'], h: ['hour', 'hours'], m: ['minute', 'minutes'], s: ['second', 'seconds'], e: ' and ' },
    es: { g: ['día', 'días'], h: ['hora', 'horas'], m: ['minuto', 'minutos'], s: ['segundo', 'segundos'], e: ' y ' },
  };

  function durata(msDurata, p) {
    const v = valori(p);
    const t = Math.max(0, Math.round(Number(msDurata) || 0));
    const W = PAROLE[v.lingua];
    const parola = (n, k) => `${n} ${W[k][n === 1 ? 0 : 1]}`;
    if (t < 60000) {
      const s = Math.round(t / 1000);
      return v.durate === 'brevi' ? `${s}s` : parola(s, 's');
    }
    const minTot = Math.round(t / 60000);
    const g = Math.floor(minTot / 1440), h = Math.floor((minTot % 1440) / 60), m = minTot % 60;
    const parti = g ? [[g, 'g'], [h, 'h']] : [[h, 'h'], [m, 'm']];
    const vive = parti.filter(([n]) => n > 0);
    if (v.durate === 'brevi') return vive.map(([n, k]) => `${n}${k === 'g' ? (v.lingua === 'it' ? 'g' : 'd') : k}`).join(' ');
    const w = vive.map(([n, k]) => parola(n, k));
    return w.length > 1 ? w.slice(0, -1).join(', ') + W.e + w[w.length - 1] : w[0];
  }

  const ETA = {
    it: { a: ['anno', 'anni'], me: ['mese', 'mesi'], g: ['giorno', 'giorni'], h: ['ora', 'ore'], poco: "meno di un'ora", e: ' e ' },
    en: { a: ['year', 'years'], me: ['month', 'months'], g: ['day', 'days'], h: ['hour', 'hours'], poco: 'less than an hour', e: ' and ' },
    es: { a: ['año', 'años'], me: ['mes', 'meses'], g: ['día', 'días'], h: ['hora', 'horas'], poco: 'menos de una hora', e: ' y ' },
  };

  function tempoDa(inizio, p, opz) {
    const v = valori(p);
    const W = ETA[v.lingua];
    const fine = opz && Number.isFinite(opz.adesso) ? opz.adesso : Date.now();
    if (!Number.isFinite(inizio) || inizio > fine) return W.poco;
    const x = calendario(inizio, v), y = calendario(fine, v);
    let anni = y.a - x.a, mesi = y.m - x.m, giorni = y.g - x.g;
    if (y.h * 60 + y.min < x.h * 60 + x.min) giorni -= 1;
    if (giorni < 0) { mesi -= 1; giorni += new Date(Date.UTC(y.a, y.m - 1, 0)).getUTCDate(); }
    if (mesi < 0) { anni -= 1; mesi += 12; }
    const parola = (n, k) => `${n} ${W[k][n === 1 ? 0 : 1]}`;
    const coppia = (a, b) => (b ? a + W.e + b : a);
    if (anni > 0) return coppia(parola(anni, 'a'), mesi ? parola(mesi, 'me') : '');
    if (mesi > 0) return coppia(parola(mesi, 'me'), giorni ? parola(giorni, 'g') : '');
    if (giorni > 0) return parola(giorni, 'g');
    const ore = Math.floor((fine - inizio) / 3600000);
    return ore > 0 ? parola(ore, 'h') : W.poco;
  }

  function primoGiorno(p) { return valori(p).settimana === 'dom' ? 0 : 1; }

  const FORMATI = { LINGUE, DATE, ORE, SETTIMANE, DURATE, FUSO_BASE, fusoValido, valori, data, ora, giorno, quando, durata, tempoDa, primoGiorno };
  if (typeof module !== 'undefined' && module.exports) module.exports = FORMATI;
  else radice.SB_FORMATI = FORMATI;
})(typeof window !== 'undefined' ? window : globalThis);
