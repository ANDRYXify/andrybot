// IL SUBATHON: la diretta dura quanto dice l'orologio.
//
// Non e' un orologio nuovo. E' il CONTO ALLA ROVESCIA che c'e' gia', con una
// regola in piu': certi eventi lo allungano. Da qui discendono tre cose che se
// no sarebbero state tre decisioni da prendere (e da sbagliare):
//
//  · l'istante di fine e' uno solo e sta nelle impostazioni del canale, quindi
//    sopravvive a un riavvio, a una ricarica dell'overlay e a dieci sorgenti
//    aperte insieme — nessuno tiene un conto suo in memoria;
//  · quel che si vede e' il timer che lo streamer ha gia' messo in scena, con la
//    sua veste e il suo posto: non c'e' un secondo aggeggio da vestire;
//  · non si puo' accendere un subathon senza un conto che lo faccia vedere.
//
// E UNA COSA CHE NON FA: non fa RIPARTIRE un conto finito. Se l'orologio e'
// arrivato a zero la diretta e' finita, e un sub arrivato dopo non la resuscita
// di soppiatto. Riaprirla e' una scelta dello streamer, col tasto che ha gia'.
import { streamers } from '../db.js';
import { makeLog } from '../logger.js';

const log = makeLog('subathon');

const MIN = 60_000;
const ORA = 60 * MIN;

export const regoleDi = (settings) => settings?.overlayTimer?.subathon || null;
export const accesa = (settings) => !!(settings?.overlayTimer?.attivo && regoleDi(settings)?.attivo);

// Quanti SECONDI aggiunge questo evento. Pura: si prova senza database e senza
// orologio. Le frazioni le fa il conto — cinquanta bit valgono mezza unita' —
// cosi' nelle impostazioni non servono numeri con la virgola.
export function secondiPer(regole, evento) {
  if (!regole || !evento) return 0;
  const n = Math.max(0, Number(evento.quanti) || 0);
  if (!n) return 0;
  if (evento.tipo === 'sub') return Math.round(n * (Number(regole.perSub) || 0) * 60);
  if (evento.tipo === 'bit') return Math.round((n / 100) * (Number(regole.perBit100) || 0) * 60);
  if (evento.tipo === 'euro') return Math.round(n * (Number(regole.perEuro) || 0) * 60);
  return 0;
}

// Il tempo in parole, per la chat: «2 ore e 10 minuti», «45 secondi».
export function inParole(ms) {
  const t = Math.max(0, Math.round(ms / 1000));
  const o = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const p = (n, uno, tanti) => `${n} ${n === 1 ? uno : tanti}`;
  if (o) return m ? `${p(o, 'ora', 'ore')} e ${p(m, 'minuto', 'minuti')}` : p(o, 'ora', 'ore');
  if (m) return p(m, 'minuto', 'minuti');
  return p(s, 'secondo', 'secondi');
}

// L'ALLUNGAMENTO. Torna { fine, aggiunti, tagliati } oppure null se non c'era
// niente da allungare. Il tetto e' su QUANTO MANCA: una serata fortunata non
// deve trasformare la diretta in tre giorni.
export function allunga(channel, secondi, { ora = Date.now() } = {}) {
  if (!(secondi > 0)) return null;
  const s = streamers.get(channel);
  if (!s || !accesa(s.settings)) return null;
  const stato = { ...(s.settings?.overlayStato || {}) };
  const fine = Number(stato.timer?.fine) || 0;
  if (fine <= ora) return null;                       // finito, o mai partito
  const regole = regoleDi(s.settings);
  const tetto = (Number(regole.tettoOre) || 0) * ORA;
  const voluto = fine + secondi * 1000;
  const massimo = tetto ? ora + tetto : voluto;
  const nuovo = Math.min(voluto, massimo);
  // AL TETTO, IL CONTO NON SI MUOVE. Fra un sub e l'altro passa del tempo, e il
  // tetto e' su quanto MANCA: senza questa soglia ogni sub arrivato al tetto
  // avrebbe rimesso dentro i pochi millisecondi nel frattempo scesi, e in chat
  // sarebbe comparso un «+0 secondi» a ogni abbonamento.
  const aggiunti = Math.max(0, nuovo - fine);
  if (aggiunti < 1000) return { fine, aggiunti: 0, tagliati: Math.max(0, voluto - fine) };
  stato.timer = { ...(stato.timer || {}), fine: nuovo };
  streamers.setSettings(channel, { ...s.settings, overlayStato: stato });
  return { fine: nuovo, aggiunti, tagliati: Math.max(0, (voluto - nuovo)) };
}

// Da un evento del bot al tempo in piu', con l'avviso in chat e la spinta
// all'overlay. Chi chiama non deve sapere niente di tetti e di minuti.
export function suEvento(channel, evento, { say, spingi } = {}) {
  try {
    const s = streamers.get(channel);
    if (!s || !accesa(s.settings)) return 0;
    const regole = regoleDi(s.settings);
    const sec = secondiPer(regole, evento);
    if (!sec) return 0;
    const esito = allunga(channel, sec);
    if (!esito) return 0;
    try { spingi?.(channel, esito.fine); } catch (e) { log.debug('spinta:', e?.message || e); }
    if (esito.aggiunti > 0 && regole.annuncia && say) {
      const testo = String(regole.testoChat || '')
        .replace(/\{quanto\}/g, inParole(esito.aggiunti))
        .replace(/\{chi\}/g, String(evento.chi || 'qualcuno'))
        .slice(0, 300);
      if (testo.trim()) say(channel, testo);
    }
    return esito.aggiunti;
  } catch (e) { log.debug('suEvento:', e?.message || e); return 0; }
}

// «!subathon»: quanto manca. Lo puo' chiedere chiunque, e risponde solo se il
// subathon e' acceso: un comando che risponde «non e' acceso» a ogni curioso
// sarebbe un modo per far dire al bot cose che non servono a nessuno.
export function tryComando(msg, parla, { ora = Date.now() } = {}) {
  if (!msg || msg.isSelf) return false;
  const testo = String(msg.text || '').trim();
  if (!testo.startsWith('!')) return false;
  if ((testo.slice(1).split(/\s+/)[0] || '').toLowerCase() !== 'subathon') return false;
  const s = streamers.get(msg.channel);
  if (!s || !accesa(s.settings)) return false;
  const fine = Number(s.settings?.overlayStato?.timer?.fine) || 0;
  parla(fine > ora
    ? `Mancano ${inParole(fine - ora)} alla fine.`
    : 'Il conto e\' finito.');
  return true;
}
