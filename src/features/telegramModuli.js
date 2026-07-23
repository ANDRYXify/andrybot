// Moduli Telegram: lista SEPARATA (rispetto a quelli Twitch) di comandi che il
// bot legge nel gruppo e/o inneschi vocali. Ogni modulo invia un messaggio nel
// gruppo Telegram. Vivono in streamer.settings.telegramModuli (JSON), così non
// serve una tabella dedicata. Qui c'è solo la LOGICA (match + testo); l'invio
// vero lo fa telegram.inviaMessaggio, la persistenza il web server.
import { streamers } from '../db.js';

const norm = (s) => String(s || '').toLowerCase().trim();
const esc = (s) => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

// Moduli attivi dello streamer (lista vuota se niente).
function moduliAttivi(login) {
  const m = streamers.get(login)?.settings?.telegramModuli;
  return Array.isArray(m) ? m.filter((x) => x && x.attivo !== false && x.messaggio) : [];
}

// I comandi/alias di un modulo, normalizzati e senza prefisso / o !.
function comandiDi(mod) {
  const alias = Array.isArray(mod.alias) ? mod.alias : [];
  return [mod.comando, ...alias].map((c) => norm(c).replace(/^[/!]/, '').trim()).filter(Boolean);
}

// Tutte le frasi vocali dei moduli attivi (per la pagina di ascolto vocale).
export function frasiVoce(login) {
  const out = [];
  for (const mod of moduliAttivi(login)) {
    for (const f of (Array.isArray(mod.frasiVoce) ? mod.frasiVoce : [])) {
      const n = norm(f);
      if (n) out.push(n);
    }
  }
  return [...new Set(out)];
}

// Trova il modulo il cui COMANDO combacia col testo scritto nel gruppo.
// Accetta "/comando", "!comando" e — se abilitato senzaBang — la parola secca.
export function trovaPerComando(login, testo) {
  const t = norm(testo);
  if (!t) return null;
  for (const mod of moduliAttivi(login)) {
    const comandi = comandiDi(mod);
    if (!comandi.length) continue;
    if (/^[/!]/.test(t)) {
      const primo = t.slice(1).split(/\s+/)[0] || '';
      // su Telegram i comandi possono arrivare come /comando@nomebot
      const pulito = primo.split('@')[0];
      if (comandi.includes(pulito)) return mod;
    } else if (mod.senzaBang) {
      const parole = t.split(/\s+/);
      if (parole.length === 1 && comandi.includes(parole[0])) return mod;
    }
  }
  return null;
}

// Trova i moduli la cui FRASE VOCALE è contenuta in quanto detto (come i Twitch).
export function trovaPerVoce(login, frase) {
  const f = norm(frase);
  if (!f) return [];
  const out = [];
  for (const mod of moduliAttivi(login)) {
    const frasi = Array.isArray(mod.frasiVoce) ? mod.frasiVoce : [];
    if (frasi.some((p) => { const n = norm(p); return n && f.includes(n); })) out.push(mod);
  }
  return out;
}

// Testo finale del messaggio, con i segnaposto risolti (valori con escape HTML,
// template lasciato grezzo così l'utente può usare <b> ecc., come le altre notifiche).
export function costruisciMessaggio(mod, { utente = '', streamer = '' } = {}) {
  const valori = { utente: esc(utente), nome: esc(streamer) };
  return String(mod.messaggio || '').replace(/\{(utente|nome)\}/g, (_, k) => valori[k]);
}

// Pulisce/valida la lista in arrivo dalla dashboard prima di salvarla.
export function normalizzaModuli(lista) {
  if (!Array.isArray(lista)) return [];
  const usati = new Set();
  return lista.slice(0, 60).map((m, i) => {
    const comando = String(m?.comando || '').trim().replace(/^[/!]/, '').slice(0, 40);
    const alias = String(m?.alias ?? (Array.isArray(m?.alias) ? m.alias.join(' ') : ''))
      .split(/[\s,]+/).map((x) => x.trim().replace(/^[/!]/, '')).filter(Boolean).slice(0, 10);
    const frasiVoce = (Array.isArray(m?.frasiVoce) ? m.frasiVoce : String(m?.frasiVoce || '').split('\n'))
      .map((x) => String(x).trim()).filter(Boolean).slice(0, 20);
    let id = String(m?.id || '').trim() || `tm${i}_${Date.now().toString(36)}`;
    if (usati.has(id)) id = id + '_' + i;
    usati.add(id);
    return {
      id,
      nome: String(m?.nome || comando || 'Modulo').trim().slice(0, 60),
      comando,
      alias,
      senzaBang: !!m?.senzaBang,
      frasiVoce,
      messaggio: String(m?.messaggio || '').slice(0, 1000),
      attivo: m?.attivo !== false,
    };
  }).filter((m) => m.comando || m.frasiVoce.length);   // scarta i moduli senza alcun innesco
}
