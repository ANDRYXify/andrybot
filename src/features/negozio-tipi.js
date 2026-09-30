// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// COSA FA UN ARTICOLO DEL NEGOZIO, tipo per tipo (docs/NEGOZIO.md).
//
// Ogni tipo usa un pezzo del bot che c'e' gia': l'overlay degli effetti, i
// Moduli, il VIP a dirette del premio della classifica, i Ruoli di Discord, la
// coda di Spotify, l'annuncio di Twitch. Qui non si rifa' niente di quello:
// si chiede a loro, e si ascolta la risposta.
//
// Ogni tipo risponde a due domande, e le tiene separate perche' sono diverse:
//
//  · puoPartire(ctx): PRIMA di prendere le monete, quello che si sa gia' senza
//    provarci (l'overlay e' spento, il VIP non si da' a un moderatore, Discord
//    non e' collegato). Torna '' se si puo', o il perche' no. Non tocca niente.
//  · esegui(ctx): DOPO, fa partire la cosa e dice com'e' andata: { ok } oppure
//    { ok:false, motivo }. Quello che si scopre solo provando (i posti VIP
//    pieni, Spotify fermo) torna qui, e il negozio rende le monete.
//
// L'oggetto e il «da consegnare a mano» non hanno un effetto fuori dal
// database: il loro acquisto finisce tutto dentro la transazione (la borsa, la
// coda), e qui non hanno un esecutore.
import { effects as effectsDb, modules as modulesDb, vips, dcRuoli, dcLink } from '../db.js';
import { SUONI_PRESET } from '../web/stile.js';
import { canaleHa } from './accesso.js';
import * as spotify from './spotify.js';
import * as dcApi from './discord-api.js';
import { normRegole, ruoliNostri, postoDeiRuoli } from './discord-ruoli.js';
import { assegnaVipLogin, perSempre, giaPerSempre } from './vip.js';

export const TIPI = ['oggetto', 'effetto', 'modulo', 'mano', 'vip', 'discord', 'musica', 'evidenza'];
export const COLORI_EVIDENZA = ['primary', 'blue', 'green', 'orange', 'purple'];
export const MAX_DIRETTE_VIP = 60;

const intero = (v, lo, hi, def) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; };
const soloId = (v) => String(v || '').replace(/[^0-9]/g, '').slice(0, 24);
const comando = (v) => String(v || '').trim().toLowerCase().replace(/^!/, '').replace(/[^a-z0-9_]/g, '').slice(0, 30);

// Quello che serve a ogni tipo, ripulito. Un campo che manca prende il suo
// valore di serie; uno che non serve al tipo non passa.
export function normDati(tipo, d) {
  const x = d && typeof d === 'object' ? d : {};
  switch (tipo) {
    case 'effetto': {
      const preset = String(x.preset || '');
      if (SUONI_PRESET.has(preset)) return { preset };
      return { effetto: comando(x.effetto) };
    }
    case 'modulo': return { modulo: intero(x.modulo, 0, 1e9, 0) };
    case 'mano': return { domanda: String(x.domanda || '').replace(/\s+/g, ' ').trim().slice(0, 120) };
    case 'vip': return { dirette: intero(x.dirette, 1, MAX_DIRETTE_VIP, 1) };
    case 'discord': return { ruolo: soloId(x.ruolo), nomeRuolo: String(x.nomeRuolo || '').slice(0, 100) };
    case 'evidenza': return { colore: COLORI_EVIDENZA.includes(x.colore) ? x.colore : 'primary' };
    default: return {};
  }
}

// Cosa manca perche' un articolo di quel tipo sia completo: '' se niente.
export function manca(tipo, dati) {
  if (tipo === 'effetto' && !dati.preset && !dati.effetto) return 'effetto';
  if (tipo === 'modulo' && !dati.modulo) return 'modulo';
  if (tipo === 'discord' && !dati.ruolo) return 'ruolo';
  return '';
}

// Chi compra deve scrivere qualcosa dopo il nome: la canzone, il messaggio, la
// risposta alla domanda dello streamer.
export const serveTesto = (a) => a.tipo === 'musica' || a.tipo === 'evidenza' || (a.tipo === 'mano' && !!a.dati?.domanda);

// Come nasce l'acquisto nello storico, e se va nella borsa.
export const nascita = (tipo) => (tipo === 'oggetto' ? { stato: 'fatto', inBorsa: true }
  : tipo === 'mano' ? { stato: 'da_consegnare', inBorsa: false }
    : { stato: 'in_corso', inBorsa: false });

const suTwitch = (msg) => !msg?.piattaforma || msg.piattaforma === 'twitch';
const direttePer = (n, l) => ({
  it: n === 1 ? 'una diretta' : `${n} dirette`,
  en: n === 1 ? 'one stream' : `${n} streams`,
  es: n === 1 ? 'un directo' : `${n} directos`,
}[l] || `${n}`);

// GLI ESECUTORI VERI, costruiti con i motori del bot. `effetti` e' il motore
// degli overlay, `moduli` quello dei Moduli, `helix` Twitch.
export function esecutori({ helix = null, effetti = null, moduli = null } = {}) {
  return {
    effetto: {
      puoPartire({ canale, a }) {
        if (a.dati.effetto && !effectsDb.get(canale, a.dati.effetto)) return 'effetto';
        if (!effetti?.hasClients?.(canale)) return 'overlay';
        return '';
      },
      async esegui({ canale, a }) {
        if (!effetti?.hasClients?.(canale)) return { ok: false, motivo: 'overlay' };
        const partito = a.dati.preset
          ? effetti.firePreset(canale, a.dati.preset, a.nome, 100)
          : effetti.fire(canale, a.dati.effetto);
        return partito ? { ok: true } : { ok: false, motivo: 'effetto' };
      },
    },

    modulo: {
      puoPartire({ canale, a }) {
        const m = modulesDb.get(canale, a.dati.modulo);
        return m && m.attivo && moduli ? '' : 'modulo';
      },
      async esegui({ canale, a, msg, dire, nota }) {
        if (!moduli?.eseguiAcquisto) return { ok: false, motivo: 'modulo' };
        return moduli.eseguiAcquisto(canale, a.dati.modulo, msg, dire, { nota });
      },
    },

    // IL VIP A DIRETTE, come il premio della classifica (vip.assegnaVipLogin):
    // scade quando finiscono le dirette, non a calendario. Chi ne ha gia' uno a
    // dirette lo allunga: un acquisto non accorcia mai quello che hai. Chi ce
    // l'ha per sempre, o a scadenza dato a mano, non lo compra: il primo non
    // guadagna niente, e al secondo gli si cambierebbe la misura sotto i piedi.
    vip: {
      puoPartire({ canale, msg }) {
        if (!suTwitch(msg)) return 'soloTwitch';
        if (!helix) return 'twitch';
        if (msg?.isMod || msg?.isBroadcaster) return 'vipStaff';
        const gia = vips.get(canale, msg?.user);
        if (gia && perSempre(gia)) return 'vipSempre';
        if (gia && Number(gia.until) > 0) return 'vipATempo';
        return '';
      },
      async esegui({ canale, a, msg, lingua }) {
        const login = String(msg?.user || '').toLowerCase();
        // Un VIP dato a mano su Twitch non sta nella nostra tabella: e' per sempre
        // anche lui, e una scadenza a dirette glielo toglierebbe.
        const perenni = await giaPerSempre(helix, canale);
        if (perenni.has(login)) return { ok: false, motivo: 'vipSempre' };
        const gia = vips.get(canale, login);
        const dirette = (Number(gia?.dirette) > 0 ? Number(gia.dirette) : 0) + a.dati.dirette;
        const r = await assegnaVipLogin(helix, canale, login, { dirette, txt: direttePer(dirette, 'it') }, 'negozio');
        if (r.ok) return { ok: true, dati: { dirette, direttePer: direttePer(dirette, lingua) } };
        if (r.perenne) return { ok: false, motivo: 'vipSempre' };
        if (/slot/.test(r.motivo || '')) return { ok: false, motivo: 'vipPieni' };
        if (/permesso/.test(r.motivo || '')) return { ok: false, motivo: 'vipPermesso' };
        if (/mod/.test(r.motivo || '')) return { ok: false, motivo: 'vipStaff' };
        return { ok: false, motivo: 'twitch' };
      },
    },

    // IL RUOLO SU DISCORD, col collegamento dei Ruoli: il server dello streamer,
    // il bot che ci sta dentro, e l'account Discord che la persona ha collegato
    // con !discord. Un ruolo che una regola dei Ruoli nomina non si vende: il
    // giro dei ruoli lo toglierebbe a chi non soddisfa la regola, e l'acquisto
    // sparirebbe da solo.
    discord: {
      puoPartire({ canale, a, msg }) {
        const conf = dcRuoli.get(canale);
        if (!conf?.guild || !dcApi.tokenDi(conf)) return 'discordSpento';
        if (ruoliNostri(normRegole(conf.regole)).has(a.dati.ruolo)) return 'discordRegola';
        if (!dcLink.prendi(canale, msg?.user)?.dc_id) return 'discordTuo';
        return '';
      },
      async esegui({ canale, a, msg }) {
        const conf = dcRuoli.get(canale);
        const legame = dcLink.prendi(canale, msg?.user);
        if (!conf?.guild || !legame?.dc_id) return { ok: false, motivo: 'discordTuo' };
        const r = await dcApi.dai(dcApi.tokenDi(conf), conf.guild, legame.dc_id, a.dati.ruolo, `negozio: ${a.nome}`.slice(0, 120));
        if (r.ok) return { ok: true };
        if (r.stato === 404) return { ok: false, motivo: 'discordFuori' };
        return { ok: false, motivo: 'discordNo' };
      },
    },

    // LA RICHIESTA MUSICALE nella coda di Spotify, quella di !sr. Spotify fa
    // aggiungere in coda e basta, non in un punto scelto: la canzone suona dopo
    // quella di adesso e dopo le richieste gia' in coda, prima della playlist.
    // Quello che il negozio salta sono le regole di !sr (solo sub, un costo, i
    // punti canale): e' gia' stata pagata qui.
    musica: {
      puoPartire({ canale }) {
        if (!canaleHa(canale, 'musica') || !spotify.collegato(canale)) return 'musicaSpenta';
        return '';
      },
      async esegui({ canale, nota }) {
        const brano = await spotify.cerca(canale, nota).catch(() => null);
        if (!brano) return { ok: false, motivo: 'musicaNonTrovata' };
        const r = await spotify.aggiungiInCoda(canale, brano.uri).catch(() => ({ ok: false, status: 0 }));
        if (r.ok) return { ok: true, dati: { brano: `${brano.nome} - ${brano.artisti}` } };
        if (r.status === 404 || r.status === 401) return { ok: false, motivo: 'musicaFerma' };
        return { ok: false, motivo: 'musicaNo' };
      },
    },

    // IL MESSAGGIO IN EVIDENZA: l'annuncio colorato di Twitch, col nome di chi
    // l'ha comprato davanti. Il testo e' quello del messaggio con cui ha
    // comprato, che e' gia' passato dai filtri della chat per arrivare fin qui.
    evidenza: {
      puoPartire({ msg }) {
        if (!suTwitch(msg)) return 'soloTwitch';
        return helix ? '' : 'twitch';
      },
      async esegui({ canale, a, msg, nota }) {
        const chi = msg?.display || msg?.user || '';
        const r = await helix.announce(canale, `${chi}: ${nota}`, a.dati.colore);
        return r?.ok ? { ok: true } : { ok: false, motivo: 'evidenzaNo' };
      },
    },
  };
}

// I RUOLI CHE SI POSSONO VENDERE, per il pannello: quelli che il bot puo'
// davvero dare (sotto di lui, non di un'integrazione, non @everyone). Quelli che
// una regola dei Ruoli nomina ci sono, marcati: il pannello li mostra e non li
// lascia scegliere, e dice perche'.
export async function ruoliDaVendere(canale) {
  const conf = dcRuoli.get(canale);
  const token = dcApi.tokenDi(conf);
  if (!conf?.guild || !token) return { ok: false, motivo: 'discordSpento' };
  const me = await dcApi.io(token, conf.guild);
  if (!me.ok) return { ok: false, motivo: 'discordNo', errore: me.errore || '' };
  const r = await dcApi.ruoli(token, conf.guild);
  if (!r.ok) return { ok: false, motivo: 'discordNo', errore: r.errore || '' };
  const posto = postoDeiRuoli(r.ruoli, me.ruoli, conf.guild);
  const regole = ruoliNostri(normRegole(conf.regole));
  const ruoli = r.ruoli.filter((x) => posto.gestibile(x.id))
    .sort((a, b) => b.position - a.position)
    .map((x) => ({ id: x.id, nome: x.nome, colore: x.colore, regola: regole.has(x.id) }));
  return { ok: true, ruoli, server: conf.guild_nome || '' };
}
