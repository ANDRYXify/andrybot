// SE E COSA DIRE, dato un momento. Non lei: il bot del canale.
//
// I momenti li riconosce momenti.js guardando la chat. Qui si decide se coglierne
// uno, e quale, con quattro cose in mano: la dose scelta dallo streamer (il
// cursore «chat autonoma»), i riposi (mai due volte troppo vicine, il promemoria
// dei link raramente), la diretta se richiesta, e cosa ha detto l'ultima volta —
// due volte di fila la stessa cosa e' il modo piu' rapido di sembrare un bot.
// Il caso arriva da fuori (jitter e scelta fra pari), cosi' si prova.
export const DOSE_MAX = 0.5;                 // il cursore arriva a 50%: di proposito
export const FLOOR_MS = 6 * 60_000;          // mai due volte in sei minuti...
export const FLOOR_DOMANDA_MS = 2 * 60_000;  // ...salvo rispondere a chi e' rimasto senza risposta
export const PROMO_MIN_MS = 45 * 60_000;     // il promemoria dei link, al piu' ogni tre quarti d'ora
export const INTERVALLO_MAX_MS = 180 * 60_000;
export const REGISTRO_MAX = 30;              // quante voci si tengono per canale
// Quanto spesso al massimo una cosa sua a discorso che scorre, dalla dose: e' lo
// stesso ritmo medio che aveva la moneta di prima (una probabilita' dose×0,4
// ogni tre minuti, cioe' 3/(0,4·dose) minuti fra una riga e l'altra), solo che
// ora e' un intervallo dichiarato invece di un dado:
// 50% → 15 minuti · 25% → 30 · 10% → 75 · 5% → 150 · sotto il 3,3% → 180 (il tetto).
// Sotto i 15 minuti non si scende: il cursore si ferma a 50%. Il pavimento dei
// sei minuti (FLOOR_MS) vale per tutto il resto, non per questo intervallo.
export function intervalloDose(dose) {
  const d = Math.min(DOSE_MAX, Math.max(0, Number(dose) || 0));
  if (d <= 0) return Infinity;
  return Math.min(INTERVALLO_MAX_MS, Math.round((3 / (0.4 * d)) * 60_000));   // millisecondi interi
}

const PRIORITA = ['domanda', 'hype', 'rilancio', 'flusso'];

// Ritorna { tipo: null, perche } oppure { tipo, momento } dove tipo e' cosa dire:
// 'domanda' | 'hype' | 'rilancio' | 'iniziativa' | 'battuta' | 'promo'.
// QUANDO PARLARE E' VIETATO IN PARTENZA — non «non c'e' niente da dire», proprio
// vietato. Sta qui, in una funzione sola, perche' lo deve sapere anche chi tiene
// i riposi: in questi momenti un riposo non deve accumulare credito.
export function vietato({ dose, live, soloLive } = {}) {
  if ((Number(dose) || 0) <= 0) return 'dose a zero';
  if (soloLive && live !== true) return 'non in diretta';
  return '';
}

export function scegliMomento({ ora, dose, live, soloLive, momenti = [], ultimaSpontanea = 0, ultimaPromo = 0, ultimoTipo = '', promoAccesa = true, battutaPronta = false, caso = {} }) {
  const d = Math.min(DOSE_MAX, Math.max(0, Number(dose) || 0));
  const no = vietato({ dose: d, live, soloLive });
  if (no) return { tipo: null, perche: no };
  if (!momenti.length) return { tipo: null, perche: 'nessun momento' };
  const daUltima = ora - (Number(ultimaSpontanea) || 0);
  const ordinati = [...momenti].sort((a, b) => PRIORITA.indexOf(a.tipo) - PRIORITA.indexOf(b.tipo));

  for (const m of ordinati) {
    if (m.tipo === 'domanda') {
      if (daUltima < FLOOR_DOMANDA_MS) continue;
      return { tipo: 'domanda', momento: m };
    }
    if (daUltima < FLOOR_MS) continue;
    if (m.tipo === 'hype' || m.tipo === 'rilancio') return { tipo: m.tipo, momento: m };
    if (m.tipo === 'flusso') {
      const jitter = 0.75 + Math.min(1, Math.max(0, Number(caso.jitter) || 0)) * 0.5;   // ±25%: niente orologeria
      if (daUltima < intervalloDose(d) * jitter) continue;
      const promoOk = promoAccesa !== false && live === true && ora - (Number(ultimaPromo) || 0) >= PROMO_MIN_MS;
      let scelte = ['iniziativa', battutaPronta ? 'battuta' : null, promoOk ? 'promo' : null].filter(Boolean);
      if (scelte.length > 1) scelte = scelte.filter((t) => t !== ultimoTipo);
      const i = Math.min(scelte.length - 1, Math.floor(Math.min(0.999, Math.max(0, Number(caso.scelta) || 0)) * scelte.length));
      return { tipo: scelte[i], momento: m };
    }
  }
  return { tipo: null, perche: 'troppo presto' };
}

// «NON SO QUANDO HO PARLATO L'ULTIMA VOLTA» VUOL DIRE ADESSO, NON MAI.
//
// I riposi stanno in memoria, e a un riavvio ripartono da zero. Zero pero' vuol
// dire «l'ultima volta e' stata nel 1970», cioe' «e' passato tutto il tempo del
// mondo»: al primo giro dopo l'avvio ogni riposo risulta finito, e il bot parla
// subito. Un riavvio ogni tanto e' una riga in piu' e non se ne accorge nessuno;
// un processo che si riavvia spesso diventa una raffica — e da fuori sembra un
// bot impazzito che spara battute a caso, senza che niente nella regola sia
// rotto.
//
// La cura non e' un tetto in piu': e' che l'assenza di memoria valga come «ho
// appena parlato». Cosi' un riavvio costa al massimo un giro di silenzio, mai
// una raffica — qualunque sia il motivo per cui il processo e' ripartito.
// E UN RIPOSO E' UN OROLOGIO, NON UNA CODA.
//
// I riposi si fermavano nei momenti in cui parlare era impossibile: a canale
// spento (con «solo in diretta»), a dose zero, e soprattutto a CHAT FERMA —
// perche' senza un momento buono il giro esce prima ancora di decidere. Ogni ora
// cosi' diventava un gettone: l'intervallo risultava finito da un pezzo, e appena
// la chat riprendeva il gettone si spendeva subito. Da fuori: «si bloccano a
// diretta spenta e tornano tutte insieme quando si accende».
//
// Il silenzio conta come riposo solo se e' stato SCELTO. Quando parlare non si
// poteva, l'orologio va avanti con l'ora: cosi' l'intervallo si misura sul tempo
// in cui c'era davvero qualcosa da dire, e al ritorno della chat non c'e' niente
// da recuperare.
export function riposaOra(mappe, login, ora) {
  const l = String(login || '').toLowerCase();
  for (const m of (Array.isArray(mappe) ? mappe : [])) m?.set?.(l, Number(ora) || Date.now());
}

export function ultimoNoto(mappa, login, nato) {
  const v = Number(mappa?.get?.(String(login || '').toLowerCase()) || 0);
  return v > 0 ? v : (Number(nato) || 0);
}

// Il registro di cosa ha detto da solo: una lista corta per canale, in memoria.
// E' di seduta — da quando il bot e' acceso — e il pannello lo dice.
export function registra(mappa, login, voce, max = REGISTRO_MAX) {
  const l = String(login || '').toLowerCase();
  const lista = mappa.get(l) || [];
  lista.push({ ts: Number(voce.ts) || Date.now(), tipo: String(voce.tipo || 'altro'), testo: String(voce.testo || '').slice(0, 300) });
  while (lista.length > max) lista.shift();
  mappa.set(l, lista);
  return lista.length;
}

export function elenco(mappa, login) {
  return (mappa.get(String(login || '').toLowerCase()) || []).map((v) => ({ ...v })).reverse();
}
