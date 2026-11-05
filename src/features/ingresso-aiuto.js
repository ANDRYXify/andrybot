// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// QUANDO NON SI RIESCE A ENTRARE (docs/ACCESSO-SICURO.md, passo 5): la parte
// che decide, senza server e senza database. I contatti scritti si ripuliscono
// in una forma sola, e si confrontano con quelli collegati al conto: combacia,
// non combacia, niente da confrontare. Il confronto lo fa il server; il
// pannello riceve solo l'esito e quello che e' gia' pubblico (i nomi sui social).
import crypto from 'node:crypto';

export const PROBLEMI = ['password', 'fattore', 'mail', 'altro'];
export const TIPI = ['discord', 'telegram', 'instagram', 'mail'];
export const PERSI = ['passkey', 'totp', 'password'];
export const LINK_MS = 24 * 3_600_000;
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function praticaNuova() {
  let c = '';
  for (let i = 0; i < 8; i++) c += ALFABETO[crypto.randomInt(ALFABETO.length)];
  return c.slice(0, 4) + '-' + c.slice(4);
}
export const praticaOk = (s) => /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/.test(String(s || '').trim().toUpperCase());

// Un nome su un social, in una forma sola: senza @, senza l'indirizzo davanti,
// minuscolo. Quello che non ha la forma giusta non e' un contatto.
const RE = {
  discord: /^[a-z0-9_.]{2,32}$/,
  telegram: /^[a-z0-9_]{4,32}$/,
  instagram: /^[a-z0-9_.]{1,30}$/,
};
export function nomeDi(tipo, grezzo) {
  let s = String(grezzo || '').trim().toLowerCase();
  if (!s) return '';
  if (tipo === 'mail') return /^[^\s@<>"]+@[^\s@<>"]+\.[a-z0-9-]{2,}$/i.test(s) && s.length <= 254 ? s : '';
  s = s.replace(/^https?:\/\//, '').replace(/^(www\.)?(t\.me|telegram\.me|instagram\.com|discord\.com\/users)\//, '').replace(/[/?#].*$/, '').replace(/^@/, '');
  if (tipo === 'discord') s = s.replace(/#\d{4}$/, '');
  return RE[tipo]?.test(s) ? s : '';
}
export function contattiPuliti(grezzi) {
  const out = {};
  for (const t of TIPI) { const v = nomeDi(t, grezzi?.[t]); if (v) out[t] = v; }
  return out;
}

// Dai social della pagina link: il nome su Telegram e su Instagram.
export function daiSocial(voci) {
  const out = { telegram: [], instagram: [], discord: [] };
  for (const v of voci || []) {
    const u = String(v?.url || '').toLowerCase();
    if (/(^|\/\/)(www\.)?(t\.me|telegram\.me)\//.test(u)) { const n = nomeDi('telegram', u); if (n) out.telegram.push(n); }
    if (/(^|\/\/)(www\.)?instagram\.com\//.test(u)) { const n = nomeDi('instagram', u); if (n) out.instagram.push(n); }
    if (/(^|\/\/)(www\.)?discord\.com\/users\//.test(u)) { const n = nomeDi('discord', u); if (n) out.discord.push(n); }
  }
  return out;
}

// Il confronto, tipo per tipo. `collegati` ha liste di nomi gia' puliti
// (la mail compresa: la confronta il server, e al pannello esce nascosta).
export function confronta(scritti, collegati) {
  const out = {};
  for (const t of TIPI) {
    if (!scritti[t]) continue;
    const noti = [...new Set((collegati?.[t] || []).map((x) => nomeDi(t, x)).filter(Boolean))];
    out[t] = { scritto: scritti[t], esito: !noti.length ? 'niente' : (noti.includes(scritti[t]) ? 'combacia' : 'non combacia') };
  }
  return out;
}

// Le parole delle mail di questo passo, nella lingua del conto.
export const TESTI = {
  it: {
    avviso: (p) => `Una richiesta di aiuto per entrare: pratica ${p}. La trovi nel pannello, scheda Admin.`,
    sbloccato: { oggetto: 'Il tuo accesso a SocialBot è stato sbloccato', titolo: 'Accesso sbloccato', testo: 'Il tuo accesso a SocialBot è stato sbloccato su richiesta. Tutte le sessioni aperte sono state chiuse. Se non sei stato tu, rispondi a questa mail.' },
  },
  en: {
    avviso: (p) => `A request for help signing in: case ${p}. You find it in the panel, Admin tab.`,
    sbloccato: { oggetto: 'Your SocialBot sign-in has been unlocked', titolo: 'Sign-in unlocked', testo: 'Your SocialBot sign-in was unlocked on request. All open sessions have been closed. If it was not you, reply to this email.' },
  },
  es: {
    avviso: (p) => `Una solicitud de ayuda para entrar: expediente ${p}. La encuentras en el panel, pestaña Admin.`,
    sbloccato: { oggetto: 'Tu acceso a SocialBot ha sido desbloqueado', titolo: 'Acceso desbloqueado', testo: 'Tu acceso a SocialBot se ha desbloqueado a petición. Se han cerrado todas las sesiones abiertas. Si no fuiste tú, responde a este correo.' },
  },
};
