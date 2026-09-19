// IL PREMIO IN VIP: due gare, e una durata che si misura in DIRETTE.
//
// Due cose sono cambiate qui dentro, e nascono tutte e due dallo stesso fatto:
// un premio deve valere quando lo streamer c'e', e deve poter dire CHI ha
// vinto cosa.
//
// 1. LA DURATA SI CONTA IN DIRETTE, non in giorni. Un VIP a scadenza di
//    calendario evapora mentre lo streamer non trasmette: chi vince il premio e
//    poi si becca due settimane di pausa lo perde senza averlo mai goduto. Le
//    dirette invece sono il tempo che conta davvero, ed e' anche il tempo in cui
//    quel badge si vede.
//
//    Il conto scende quando una diretta FINISCE, non quando ne comincia una.
//    Scalando all'inizio, un premio da «1 diretta» sparirebbe all'apertura della
//    sera dopo — cioe' prima di essere stato addosso a qualcuno per una serata
//    intera. Se il bot e' giu' alla fine di una diretta, quel giro non si conta e
//    il premio dura una sera in piu': sbagliare da quella parte e' il verso
//    giusto.
//
// 2. DUE GARE IN PARALLELO, non una scelta. Le monete e i Bit sono due meriti
//    diversi — chi c'e' sempre e chi mette mano al portafoglio — e premiarne uno
//    solo obbligava lo streamer a dire quale delle due cose non gli interessa.
//    Ogni gara ha il suo interruttore, il suo periodo e i suoi POSTI.
//
// 3. I POSTI HANNO UN NOME E UNA DURATA PROPRIE. Il primo posto puo' valere
//    cinque dirette e il terzo una. E il nome lo sceglie lo streamer — re,
//    principe, cavaliere, o quello che gli pare: e' la parola che esce in chat, e
//    una parola sua vale piu' di «1° posto».
const MAX_POSTI = 5;
const MAX_DIRETTE = 60;

export const GARE = ['monete', 'bit'];
export const PERIODI = ['settimana', 'mese'];
export const SALUTO_DEF = '{user} è il re dei Bit, con {bit} Bit. Bentornato.';

export const DEF = Object.freeze({
  monete: Object.freeze({ attivo: false, periodo: 'settimana', saltaPerenni: true,
    posti: Object.freeze([{ dirette: 3, titolo: '' }]) }),
  bit: Object.freeze({ attivo: false, periodo: 'mese', saltaPerenni: true, saluto: SALUTO_DEF,
    posti: Object.freeze([{ dirette: 4, titolo: 're' }, { dirette: 2, titolo: 'principe' }, { dirette: 1, titolo: 'cavaliere' }]) }),
});

const intero = (v, lo, hi, def) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; };
const parola = (v, max, def) => (typeof v === 'string' ? v.trim().slice(0, max) : def);

const normPosti = (lista, def) => {
  if (!Array.isArray(lista)) return def.map((p) => ({ ...p }));
  const fuori = lista.slice(0, MAX_POSTI)
    .filter((p) => p && typeof p === 'object')
    .map((p, i) => ({
      dirette: intero(p.dirette, 1, MAX_DIRETTE, def[i]?.dirette || 1),
      // Il titolo puo' essere vuoto: chi non vuole dare nomi ai posti non deve
      // subirne uno, e in chat esce «1° posto».
      titolo: parola(p.titolo, 24, ''),
    }));
  return fuori.length ? fuori : def.map((p) => ({ ...p }));
};

// COME ERA PRIMA. Un premio solo, con un numero di posti tutti uguali e una
// durata a calendario: `{ attivo, da, periodo, quanti, saltaPerenni, saluto }`.
//
// La conversione non puo' essere esatta — «una settimana» e «tre dirette» sono
// due misure diverse — e non si finge che lo sia: si tiene la cadenza che lo
// streamer aveva scelto e si da' ai posti una durata che le somiglia per chi
// trasmette qualche volta a settimana. Il pannello glielo mostra scritto, e se
// non gli va lo cambia in due secondi.
const DIRETTE_DA_PERIODO = { settimana: 3, mese: 12 };

export function daVecchio(v) {
  const gara = v?.da === 'bit' ? 'bit' : 'monete';
  const periodo = PERIODI.includes(v?.periodo) ? v.periodo : DEF[gara].periodo;
  const quanti = intero(v?.quanti, 1, MAX_POSTI, 1);
  const dirette = DIRETTE_DA_PERIODO[periodo];
  const posti = Array.from({ length: quanti }, (_, i) => ({
    dirette, titolo: gara === 'bit' ? (DEF.bit.posti[i]?.titolo || '') : '',
  }));
  const blocco = { attivo: !!v?.attivo, periodo, saltaPerenni: v?.saltaPerenni !== false, posti };
  if (gara === 'bit') blocco.saluto = typeof v?.saluto === 'string' ? v.saluto.trim().slice(0, 200) : SALUTO_DEF;
  return { ...struttura(), [gara]: { ...DEF[gara], ...blocco } };
}

const struttura = () => ({
  monete: { ...DEF.monete, posti: DEF.monete.posti.map((p) => ({ ...p })) },
  bit: { ...DEF.bit, posti: DEF.bit.posti.map((p) => ({ ...p })) },
});

// Riconosce da solo il formato vecchio: aveva `attivo` in cima e nessuna gara.
export const eVecchio = (x) => !!x && typeof x === 'object' && !x.monete && !x.bit && ('attivo' in x || 'quanti' in x || 'da' in x);

// Pura, e vale anche a meta': quello che non arriva prende il valore di prima,
// e senza un prima quello di serie.
export function normalizza(b, prima = null) {
  if (eVecchio(b)) return normalizza(daVecchio(b), prima);
  const q = (prima && typeof prima === 'object' && !eVecchio(prima)) ? prima : struttura();
  const p = (b && typeof b === 'object') ? b : {};
  const fuori = {};
  for (const gara of GARE) {
    const n = (p[gara] && typeof p[gara] === 'object') ? p[gara] : {};
    const v = (q[gara] && typeof q[gara] === 'object') ? q[gara] : DEF[gara];
    const pick = (k, def) => (n[k] !== undefined ? n[k] : (v[k] !== undefined ? v[k] : def));
    fuori[gara] = {
      attivo: pick('attivo', DEF[gara].attivo) === true,
      periodo: PERIODI.includes(pick('periodo', DEF[gara].periodo)) ? pick('periodo', DEF[gara].periodo) : DEF[gara].periodo,
      saltaPerenni: pick('saltaPerenni', true) !== false,
      posti: normPosti(n.posti !== undefined ? n.posti : v.posti, DEF[gara].posti),
    };
    // La frase del re e' roba dei Bit soltanto. Vuota vuol dire «non dirlo», e
    // non va scambiata per «non me l'hanno mandata».
    if (gara === 'bit') {
      const s = pick('saluto', SALUTO_DEF);
      fuori.bit.saluto = typeof s === 'string' ? s.trim().slice(0, 200) : SALUTO_DEF;
    }
  }
  return fuori;
}

// Le impostazioni di un canale, gia' normalizzate.
export const di = (settings) => normalizza(settings?.premioVip);

// Quando e' passato abbastanza tempo per il giro di una gara. L'ultimo giro e'
// per gara: due gare che si segnassero sullo stesso numero si spegnerebbero a
// vicenda.
export const PERIODO_MS = { settimana: 7 * 24 * 3600_000, mese: 30 * 24 * 3600_000 };

export function tocca(settings, gara, ora = Date.now()) {
  const g = di(settings)[gara];
  if (!g?.attivo) return false;
  const u = settings?.premioVipUltimo;
  const quando = (u && typeof u === 'object') ? Number(u[gara]) || 0 : Number(u) || 0;
  return ora - quando >= PERIODO_MS[g.periodo];
}

export function segnaGiro(settings, gara, ora = Date.now()) {
  const u = settings?.premioVipUltimo;
  const prima = (u && typeof u === 'object') ? u : {};
  // Il numero solo di una volta valeva per l'unico premio che c'era: diventa il
  // punto di partenza di tutt'e due, invece di far ripartire i conti da zero.
  const base = (u && typeof u === 'object') ? prima : { monete: Number(u) || 0, bit: Number(u) || 0 };
  return { ...base, [gara]: ora };
}

// Come si chiama chi ha vinto quel posto. Senza un nome scelto, il posto stesso.
export const nomePosto = (gara, i) => {
  const p = DEF[gara].posti[i];
  return (p && p.titolo) || `${i + 1}° posto`;
};

export const titoloDi = (blocco, i) => {
  const p = blocco?.posti?.[i];
  return (p && p.titolo) || `${i + 1}° posto`;
};

export const direttePosto = (blocco, i) => {
  const p = blocco?.posti?.[i];
  return Math.max(1, Number(p?.dirette) || 1);
};

export const quantiPosti = (blocco) => (Array.isArray(blocco?.posti) ? blocco.posti.length : 0);

// «3 dirette» / «una diretta», per le frasi.
export const dette = (n) => (n === 1 ? 'una diretta' : `${n} dirette`);
