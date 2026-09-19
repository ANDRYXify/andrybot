// GLI APPUNTAMENTI SUL CALENDARIO DEL SERVER.
//
// «Giovedì alle 21» sul Discord di chi ti guarda. Non e' un avviso — l'avviso
// arriva quando parti — e' la riga che c'e' PRIMA, quella che fa sapere quando
// tornare.
//
// QUATTRO DECISIONI, e ognuna toglie un difetto invece di correggerlo.
//
//  · IL PALINSESTO NON SI CHIEDE DUE VOLTE. La programmazione della settimana
//    e' gia' scritta, per la grafica: sette voci con l'ora, cosa fai e i giorni
//    di riposo. Chiederla di nuovo per Discord vorrebbe dire due palinsesti da
//    tenere uguali a mano, e un giorno direbbero due cose diverse.
//  · UN APPUNTAMENTO PER FASCIA, non per giorno. Tre sere alla stessa ora a
//    fare la stessa cosa sono un appuntamento solo, e Discord lo mostra come
//    «ogni lun, mer, ven». Uno per giorno sarebbe lo stesso palinsesto detto
//    tre volte.
//  · IL FUSO LO SA IL BROWSER, ed e' l'unico che lo sappia: l'appuntamento
//    vuole un istante, il palinsesto dice «alle 21». Si prende quando si salva.
//  · L'ORA LEGALE SI SISTEMA DA SOLA. La ripetizione di Discord ripete un
//    ISTANTE, quindi a fine ottobre l'appuntamento slitterebbe di un'ora. Ma
//    noi non confrontiamo istanti: confrontiamo quello che dice il palinsesto
//    con quello che c'e' sul server, e l'ora la rileggiamo NEL FUSO. Al primo
//    giro dopo il cambio la differenza si vede e si corregge. Nessun codice per
//    l'ora legale: e' una conseguenza del confronto.
//
// E una cosa che non dobbiamo promettere noi: il bot puo' toccare SOLO gli
// appuntamenti che ha creato lui (CREATE_EVENTS). Quelli scritti a mano restano
// intoccabili perche' lo impedisce Discord, non perche' stiamo attenti.
import * as api from './discord-api.js';
import { makeLog } from '../logger.js';

const log = makeLog('discord-eventi');

export const DURA_MIN = 15;
export const DURA_MAX = 24 * 60;
export const MAX_FASCE = 20;      // Discord ne tiene 100 attivi: venti bastano e avanzano

// Che ore sono, in quel fuso, in quel momento. `Intl` le sa tutte, e sa anche
// l'ora legale: chiederglielo e' meglio che tenersi una tabella che invecchia.
function pezzi(fuso, d) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: fuso, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' });
  const p = {};
  for (const x of f.formatToParts(d)) p[x.type] = x.value;
  return p;
}

export function fusoValido(fuso) {
  try { pezzi(String(fuso), new Date(0)); return true; } catch { return false; }
}

// Quanto quel fuso stava avanti o indietro da UTC, in quel momento.
function scartoDa(fuso, d) {
  const p = pezzi(fuso, d);
  const comeSe = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return comeSe - d.getTime();
}

// Da «il 12 marzo alle 21:00 a Roma» all'istante vero. Due passate: la prima
// indovina lo scarto, la seconda lo corregge se in mezzo c'era il cambio d'ora.
export function istante(fuso, anno, mese, giorno, h, m) {
  const grezzo = Date.UTC(anno, mese - 1, giorno, h, m);
  let t = grezzo - scartoDa(fuso, new Date(grezzo));
  t = grezzo - scartoDa(fuso, new Date(t));
  return new Date(t);
}

// Il giorno della settimana contato da LUNEDI' = 0, come lo conta Discord e
// come lo conta la programmazione della settimana.
const DA_LUN = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
export const giornoNel = (fuso, d) => DA_LUN[pezzi(fuso, d).weekday] ?? 0;
export function oraNel(fuso, d) {
  const p = pezzi(fuso, d);
  return `${String(+p.hour % 24).padStart(2, '0')}:${p.minute}`;
}

const ORA_OK = (v) => /^\d{1,2}:\d{2}$/.test(String(v || '').trim());
const inMinuti = (v) => { const [h, m] = String(v).split(':'); return (+h) * 60 + (+m); };
const dueCifre = (v) => { const [h, m] = String(v).trim().split(':'); return `${String(+h).padStart(2, '0')}:${m}`; };

// LE FASCE: il palinsesto letto come appuntamenti.
//
// Si raggruppa per ORA e per COSA SI FA: tre sere alle 21 a giocare sono un
// appuntamento solo; se il giovedì alle 21 fai un'altra cosa, quello e' un
// appuntamento suo. Raggruppare solo per ora metterebbe tre attivita' diverse
// sotto un titolo che ne nomina una.
export function fasceDa(giorni) {
  const per = new Map();
  (Array.isArray(giorni) ? giorni : []).slice(0, 7).forEach((g, i) => {
    if (!g || g.off) return;
    const ora = String(g.ora || '').trim();
    if (!ORA_OK(ora)) return;
    const cosa = String(g.att || '').trim();
    const k = dueCifre(ora) + '\u0000' + cosa.toLowerCase();
    const gia = per.get(k);
    if (gia) gia.giorni.push(i);
    else per.set(k, { ora: dueCifre(ora), cosa, giorni: [i] });
  });
  return [...per.values()]
    .sort((a, b) => inMinuti(a.ora) - inMinuti(b.ora) || a.giorni[0] - b.giorni[0])
    .slice(0, MAX_FASCE);
}

export function normalizzaEventi(v) {
  const testo = (x, max) => String(x || '').replace(/\s+/g, ' ').trim().slice(0, max);
  const fuso = testo(v?.fuso, 64);
  return {
    acceso: !!v?.acceso,
    titolo: testo(v?.titolo, 100),
    descrizione: testo(v?.descrizione, 1000),
    luogo: testo(v?.luogo, 100),
    dura: Math.max(DURA_MIN, Math.min(DURA_MAX, Math.round(Number(v?.dura)) || 120)),
    fuso: fusoValido(fuso) ? fuso : 'Europe/Rome',
  };
}

// Il titolo: `{cosa}` diventa quello che fai quel giorno. Senza titolo si usa
// quello, e senza nemmeno quello «Diretta».
export function titoloDi(conf, fascia) {
  const modello = String(conf?.titolo || '').trim();
  if (modello) return modello.replace(/\{cosa\}/g, fascia.cosa || '').replace(/\s+/g, ' ').trim().slice(0, 100) || 'Diretta';
  return (fascia.cosa || 'Diretta').slice(0, 100);
}

// La prossima volta che capita «uno di questi giorni a quest'ora», da adesso.
export function prossimaVolta(fuso, giorni, ora, adesso) {
  const [h, m] = String(ora).split(':').map(Number);
  const quali = new Set(giorni);
  for (let salto = 0; salto <= 8; salto++) {
    const d = new Date(adesso.getTime() + salto * 86400000);
    const p = pezzi(fuso, d);
    if (!quali.has(DA_LUN[p.weekday] ?? 0)) continue;
    const t = istante(fuso, +p.year, +p.month, +p.day, h, m);
    if (t.getTime() > adesso.getTime()) return t;
  }
  return null;
}

// GLI APPUNTAMENTI CHE CI SONO GIA', ma solo i NOSTRI: quelli scritti a mano
// non li tocchiamo, e Discord non ce lo lascerebbe fare comunque.
export function nostriOra(eventi, botId, fuso) {
  return (eventi || [])
    .filter((e) => e.diChi && String(e.diChi) === String(botId) && e.tipo === api.EVENTO_ESTERNO)
    .map((e) => {
      const inizio = new Date(e.inizio);
      const fine = e.fine ? new Date(e.fine) : null;
      return {
        id: e.id,
        titolo: e.nome,
        descrizione: e.descrizione,
        luogo: e.luogo,
        giorni: [...e.giorni].sort((a, b) => a - b),
        // L'ora si rilegge NEL FUSO, non si prende dall'istante: e' questo che
        // fa accorgere del cambio d'ora senza una riga per l'ora legale.
        ora: Number.isNaN(inizio.getTime()) ? '' : oraNel(fuso, inizio),
        dura: fine && !Number.isNaN(fine.getTime()) ? Math.round((fine - inizio) / 60000) : 0,
      };
    })
    .filter((e) => e.ora && e.giorni.length);
}

const segno = (e) => [e.titolo, e.descrizione || '', e.luogo || '', e.ora, e.dura,
  [...e.giorni].sort((a, b) => a - b).join(',')].join('~');

export function differenzaEventi(conf, giorni, nostri, adesso = new Date()) {
  const c = normalizzaEventi(conf);
  const voluti = (c.acceso ? fasceDa(giorni) : []).map((f) => ({
    titolo: titoloDi(c, f),
    descrizione: c.descrizione,
    luogo: c.luogo,
    giorni: [...f.giorni].sort((a, b) => a - b),
    ora: f.ora,
    dura: c.dura,
  }));
  const resta = [...(nostri || [])];
  const crea = [];
  const sistema = [];
  for (const v of voluti) {
    // Si riconosce per GIORNI + ORA: e' quello che identifica un appuntamento,
    // mentre il titolo cambia perche' cambia cosa fai quella sera.
    const i = resta.findIndex((x) => x.ora === v.ora && x.giorni.join(',') === v.giorni.join(','));
    if (i < 0) { crea.push(v); continue; }
    const [gia] = resta.splice(i, 1);
    if (segno(gia) === segno(v)) continue;
    sistema.push({ ...v, id: gia.id });
  }
  const togli = resta.map((x) => ({ id: x.id, titolo: x.titolo }));
  if (!crea.length && !sistema.length && !togli.length) return null;
  return { crea, sistema, togli, fuso: c.fuso,
    dice: [
      ...crea.map((x) => ({ campo: 'crea', titolo: x.titolo, ora: x.ora })),
      ...sistema.map((x) => ({ campo: 'sistema', titolo: x.titolo, ora: x.ora })),
      ...togli.map((x) => ({ campo: 'togli', titolo: x.titolo })),
    ] };
}

const MOTIVO = 'gli appuntamenti, come dice la programmazione della settimana';

// SI ALLINEANO DA SOLI, e non e' un di piu': il palinsesto cambia, l'ora legale
// cambia, e un appuntamento sbagliato e' peggio di nessun appuntamento — manda
// la gente davanti a uno schermo spento.
export async function sincronizza(token, guild, me, conf, giorni, { adesso = new Date(), max = 12 } = {}) {
  const c = normalizzaEventi(conf);
  if (!c.luogo) return { ok: false, errore: 'senza un link non si puo\' dire dove succede' };
  // IL PERMESSO SI GUARDA PRIMA, e non e' prudenza: chi ha invitato il bot
  // prima che il calendario esistesse non gli ha dato «Creare eventi». Senza
  // questa riga il giro delle sei ore bussa a una porta chiusa per sempre, e
  // lo streamer vede solo un calendario che non si riempie mai.
  const r = await api.ruoli(token, guild);
  if (!r.ok) return r;
  if (!api.puoAppuntamenti(api.permessiBot(r.ruoli, me?.ruoli))) {
    return { ok: false, reinvito: true, errore: 'al bot manca \u00abCreare eventi\u00bb: ripassa dal tasto che lo porta nel tuo server, cosi\' Discord gli aggiorna i permessi' };
  }
  const letti = await api.eventi(token, guild);
  if (!letti.ok) return letti;
  const d = differenzaEventi(c, giorni, nostriOra(letti.eventi, me?.id, c.fuso), adesso);
  if (!d) return { ok: true, creati: 0, sistemati: 0, tolti: 0, niente: true, errori: [] };
  const esito = { ok: true, creati: 0, sistemati: 0, tolti: 0, errori: [], fatte: 0 };
  const conTempi = (v) => {
    const inizio = prossimaVolta(c.fuso, v.giorni, v.ora, adesso);
    return inizio ? { ...v, nome: v.titolo, inizio, fine: new Date(inizio.getTime() + v.dura * 60000) } : null;
  };
  const passo = async (fn, conta) => {
    if (esito.fatte >= max) return;
    esito.fatte++;
    const x = await fn();
    if (x?.ok) esito[conta]++;
    else if (x?.errore && !esito.errori.includes(x.errore) && esito.errori.length < 3) esito.errori.push(x.errore);
  };
  for (const v of d.crea) {
    const t = conTempi(v);
    if (t) await passo(() => api.creaEvento(token, guild, t, MOTIVO), 'creati');
  }
  for (const v of d.sistema) {
    const t = conTempi(v);
    if (t) await passo(() => api.sistemaEvento(token, guild, v.id, t, MOTIVO), 'sistemati');
  }
  for (const v of d.togli) await passo(() => api.togliEvento(token, guild, v.id, MOTIVO), 'tolti');
  if (esito.errori.length) log.debug('appuntamenti con inciampi:', esito.errori.join(' · '));
  return esito;
}
