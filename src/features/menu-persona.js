// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// IL MENU SU MISURA (docs/MENU.md, «Il menu su misura»).
//
// Le scelte che una persona fa sul menu del pannello: le sue voci in cima,
// quelle nascoste, l'ordine, la barra in basso del telefono, come si aprono i
// gruppi, le righe, la pagina d'apertura. Sono della PERSONA e non del canale:
// stanno in `settings.menu` del conto di chi e' entrato, e chi modera il canale
// di un altro si porta dietro il suo menu.
//
// Il server non sa quali voci ha il pannello (l'elenco e' nel pannello, ed e'
// li' che una voce che non esiste piu' si scarta): qui si controlla la FORMA.
// `pulisci` e' la stessa ripulitura di `menuPulito` in app.js, e un contratto
// le tiene uguali (test/contratto/menu-misura.test.mjs).
import { streamers } from '../db.js';

export const MIE_MAX = 12;
export const BARRA_MAX = 4;
export const MODI = ['uno', 'ricorda', 'tutti'];
export const RIGHE = ['comode', 'fitte'];
export const LATI = ['sinistra', 'destra'];

const id = (x) => (typeof x === 'string' && /^[a-z0-9]{1,24}$/.test(x) ? x : '');
const lista = (x, max) => [...new Set((Array.isArray(x) ? x : []).map(id).filter(Boolean))].slice(0, max);

export function pulisci(grezze) {
  const o = grezze && typeof grezze === 'object' && !Array.isArray(grezze) ? grezze : {};
  const ordine = {};
  if (o.ordine && typeof o.ordine === 'object' && !Array.isArray(o.ordine)) {
    for (const [g, v] of Object.entries(o.ordine).slice(0, 40)) if (id(g)) ordine[g] = lista(v, 40);
  }
  return {
    mie: lista(o.mie, MIE_MAX),
    nomeMie: (typeof o.nomeMie === 'string' ? o.nomeMie : '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 24),
    nascoste: lista(o.nascoste, 80),
    gruppi: lista(o.gruppi, 40),
    ordine,
    barra: lista(o.barra, BARRA_MAX),
    modo: MODI.includes(o.modo) ? o.modo : 'uno',
    righe: RIGHE.includes(o.righe) ? o.righe : 'comode',
    lato: o.lato === 'destra' ? 'destra' : 'sinistra',
    apre: o.apre === 'ultima' ? 'ultima' : (id(o.apre) || 'stato'),
  };
}

// Senza nessuna scelta: e' il menu di serie, e non si scrive niente.
export function diSerie(m) {
  const p = pulisci(m);
  return !p.mie.length && !p.nomeMie && !p.nascoste.length && !p.gruppi.length && !Object.keys(p.ordine).length
    && !p.barra.length && p.modo === 'uno' && p.righe === 'comode' && p.lato === 'sinistra' && p.apre === 'stato';
}

// Le scelte della persona, o null se non ne ha (o non ha un conto suo).
export function menuDi(identita) {
  const m = streamers.get(String(identita || '').toLowerCase())?.settings?.menu;
  return m && typeof m === 'object' && !diSerie(m) ? pulisci(m) : null;
}

// Salva. Torna le scelte salvate, o null se la persona non ha un conto suo
// (un moderatore senza canale): il pannello allora le tiene nel browser.
export function salvaMenu(identita, grezze) {
  const chi = String(identita || '').toLowerCase();
  const s = streamers.get(chi);
  if (!s) return null;
  const pulite = pulisci(grezze);
  const settings = { ...(s.settings || {}) };
  if (diSerie(pulite)) delete settings.menu; else settings.menu = pulite;
  streamers.setSettings(chi, settings);
  return pulite;
}
