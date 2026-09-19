// IL GIRO: la regola e il filo si incontrano qui, una persona alla volta.
//
// La regola (`discord-ruoli.js`) non sa cosa sia Discord. Il filo
// (`discord-api.js`) non decide niente. Questo pezzo li mette insieme, e il suo
// mestiere e' tutto in una frase: per ogni persona che si e' collegata, capire
// cosa sappiamo di lei e scrivere soltanto la DIFFERENZA.
//
// Il difetto che non deve poter esistere, e che qui e' il piu' pericoloso di
// tutti: UN FATTO CHE NON SAPPIAMO NON VALE «NO».
//
// Se Twitch tace per un minuto — un permesso revocato, una chiamata andata
// storta — e noi leggiamo «non e' abbonato» invece di «non lo so», il giro
// dopo toglie il ruolo dei sub a tutto il server. Un guasto di lettura
// diventerebbe una scrittura irreversibile su casa di qualcun altro. Percio'
// una condizione che non sappiamo valutare, per quella persona, in questo giro
// NON E' UNA REGOLA: non da' e non toglie niente. Il ruolo resta dov'e', e il
// pannello dice che non si e' potuto guardare.
//
// Da qui discende il resto:
//
//  · si scrive solo la differenza, quindi un giro in cui non cambia niente non
//    chiama nessuno e non lascia righe nel registro del server;
//  · fra una persona e l'altra si respira, e se Discord dice «troppe richieste»
//    con un'attesa lunga il giro si ferma e torna dopo: non e' il filo a
//    decidere quanto insistere, e' chi sta girando;
//  · «fammi vedere cosa faresti» (`prova`) percorre la stessa strada e non
//    scrive: se fosse una strada sua, mostrerebbe un'altra cosa da quella che
//    poi succede.
import { dcRuoli, dcLink, points, watchtime, presenze } from '../db.js';
import * as api from './discord-api.js';
import { normRegole, regolaOk, differenza, fuoriPortata, mioLivello } from './discord-ruoli.js';
import { makeLog } from '../logger.js';

const log = makeLog('discord-giro');

export const MAX_PERSONE = 200;
export const PAUSA_MS = 120;
const MAX_ERRORI = 3;

const dormi = (ms) => new Promise((r) => setTimeout(r, ms));

// I quattro fatti che vengono da Twitch: li sappiamo o non li sappiamo.
// Monete, ore, serie e dirette vengono da casa nostra, e li' lo zero e' un
// numero vero.
const DA_TWITCH = ['follower', 'sub', 'vip', 'mod'];
export const sappiamo = (tipo, dati) => (DA_TWITCH.includes(tipo) ? (dati || {})[tipo] !== undefined : true);

// Cosa sappiamo di una persona. `quadro` e' la fotografia di Twitch presa una
// volta per tutto il giro: un insieme per fatto, oppure niente se quel fatto
// adesso non lo sappiamo.
export function datiDi(channel, login, quadro = {}) {
  const ch = String(channel).toLowerCase(), l = String(login).toLowerCase();
  const p = presenze.get(ch, l) || {};
  const d = {
    monete: Number(points.get(ch, l)) || 0,
    ore: Math.floor((Number(watchtime.get(ch, l)) || 0) / 3600),
    serie: Number(p.serie) || 0,
    dirette: Number(p.dirette) || 0,
  };
  for (const k of DA_TWITCH) {
    const s = quadro[k];
    if (s instanceof Set) d[k] = s.has(l);
  }
  return d;
}

function aggiungi(elenco, cosa) {
  const t = String(cosa || '').trim();
  if (!t || elenco.includes(t) || elenco.length >= MAX_ERRORI) return;
  elenco.push(t);
}

// Un giro su un canale. `quadro` e' una funzione (gente) -> fotografia di
// Twitch: sta fuori di qui apposta, perche' il giro non deve sapere COME si
// chiede a Twitch chi ti segue.
export async function giro(channel, { quadro = null, max = MAX_PERSONE, prova = false, pausa = PAUSA_MS } = {}) {
  const ch = String(channel).toLowerCase();
  const conf = dcRuoli.get(ch);
  if (!conf || !conf.guild) return null;
  const token = api.tokenDi(conf);
  if (!token) return null;
  // Da spento si puo' guardare, non toccare: «fammi vedere cosa faresti» serve
  // proprio PRIMA di accendere, e non puo' cambiare niente per costruzione.
  if (!conf.attivo && !prova) return null;

  const esito = { visti: 0, dati: 0, tolti: 0, fuori: 0, bloccati: [], scartate: 0, errori: [], quando: 0 };
  const finisci = (extra = {}) => {
    const e = { ...esito, ...extra, quando: Date.now() };
    if (!prova) dcRuoli.esito(ch, e);
    return e;
  };

  const elenco = await api.ruoli(token, conf.guild);
  if (!elenco.ok) return finisci({ errori: [elenco.errore] });
  const veri = new Set(elenco.ruoli.map((r) => r.id));

  const me = await api.io(token, conf.guild);
  if (!me.ok) return finisci({ errori: [me.errore] });
  const alti = fuoriPortata(elenco.ruoli, mioLivello(elenco.ruoli, me.ruoli));

  const tutte = normRegole(conf.regole);
  const regole = tutte.filter((r) => regolaOk(r, veri));
  esito.scartate = tutte.length - regole.length;
  if (!regole.length) return finisci();

  const gente = dcLink.lista(ch, max);
  if (!gente.length) return finisci();
  const foto = quadro ? await quadro(gente) : {};

  for (const g of gente) {
    const m = await api.membro(token, conf.guild, g.dc_id);
    if (!m.ok) { aggiungi(esito.errori, m.errore); if (m.attesa) break; continue; }
    if (!m.dentro) { esito.fuori++; continue; }
    esito.visti++;

    const dati = datiDi(ch, g.login, foto);
    const mie = regole.filter((r) => sappiamo(r.tipo, dati));
    const d = differenza({ regole: mie, dati, attuali: m.ruoli, fuoriPortata: alti });
    for (const id of d.bloccati) if (!esito.bloccati.includes(id)) esito.bloccati.push(id);

    let fermo = false;
    for (const [ids, verbo, conta] of [[d.dare, api.dai, 'dati'], [d.togliere, api.togli, 'tolti']]) {
      for (const id of ids) {
        if (prova) { esito[conta]++; continue; }
        const x = await verbo(token, conf.guild, g.dc_id, id);
        if (x.ok) esito[conta]++;
        else { aggiungi(esito.errori, x.errore); if (x.attesa) { fermo = true; break; } }
      }
      if (fermo) break;
    }
    if (fermo) break;
    if (!prova && pausa > 0 && (d.dare.length || d.togliere.length)) await dormi(pausa);
  }
  if (esito.errori.length) log.debug(ch, 'giro con inciampi:', esito.errori.join(' · '));
  return finisci();
}

// Tutti i canali accesi, uno dopo l'altro. Uno che va male non ferma gli altri:
// il suo esito resta scritto nella sua riga, e il pannello lo mostra a lui.
export async function giroTutti({ quadro = null } = {}) {
  const fatti = [];
  for (const ch of dcRuoli.attivi()) {
    try { fatti.push({ canale: ch, esito: await giro(ch, { quadro: quadro ? (g) => quadro(ch, g) : null }) }); }
    catch (e) { log.warn(ch, 'giro caduto:', e?.message || e); }
  }
  return fatti;
}
