// IL DIARIO DEGLI EVENTI DI KICK: cosa è arrivato, e cosa è stato rifiutato.
//
// Quando un webhook non funziona non c'è niente da guardare. Il collegamento
// dice «collegato», la chat va avanti, e il bot tace: da fuori il difetto è
// indistinguibile da un bot spento, da una firma sbagliata, da un'iscrizione
// morta o da Kick che non bussa affatto. Sono quattro cause diverse con la
// stessa faccia, e senza un modo di distinguerle si tira a indovinare.
//
// Qui si tiene il minimo che le distingue: quando è arrivato l'ultimo evento
// buono (e di che tipo), quando è stato rifiutato l'ultimo e perché, e quanti
// ne sono passati da quando il bot è acceso. Niente contenuti dei messaggi:
// solo tipo, canale e motivo — cose nostre, non di chi scrive in chat.
//
// Sta in memoria: si azzera a ogni riavvio, ed è giusto così. Serve a rispondere
// a «adesso, cosa sta succedendo?», non a tenere uno storico.
const MAX_CANALI = 200;

let arrivi = 0;
let rifiuti = 0;
let ultimo = null;          // { quando, tipo, canale }
let ultimoRifiuto = null;   // { quando, motivo }
const perCanale = new Map();  // canale → { quando, tipo }

export function segnaArrivo({ tipo, canale }) {
  arrivi++;
  ultimo = { quando: Date.now(), tipo: String(tipo || ''), canale: String(canale || '') };
  if (canale) {
    if (perCanale.size >= MAX_CANALI && !perCanale.has(canale)) {
      perCanale.delete(perCanale.keys().next().value);
    }
    perCanale.set(String(canale), { quando: ultimo.quando, tipo: ultimo.tipo });
  }
}

export function segnaRifiuto(motivo) {
  rifiuti++;
  ultimoRifiuto = { quando: Date.now(), motivo: String(motivo || '').slice(0, 200) };
}

// Lo stato per la dashboard. `canale` restringe l'ultimo evento a quel canale.
export function stato(canale = '') {
  const mio = canale ? perCanale.get(String(canale).toLowerCase()) || null : null;
  return {
    arrivi,
    rifiuti,
    ultimo: canale ? mio : ultimo,
    ultimoRifiuto,
  };
}

export function _azzera() {
  arrivi = 0; rifiuti = 0; ultimo = null; ultimoRifiuto = null; perCanale.clear();
}
