// I MOMENTI: quando ha senso che il bot parli senza essere chiamato.
//
// Prima decideva un dado su un timer: ogni tre minuti una moneta, e se usciva
// testa diceva una cosa. Cioe' parlava «a caso» per costruzione: l'occasione non
// c'entrava con la chat. Una persona che sta in chat non fa cosi'. Parla quando
// c'e' un motivo: qualcuno ha chiesto una cosa e nessuno gli risponde; la chat
// si e' fermata dopo un momento vivo; e' esplosa per qualcosa; oppure il discorso
// scorre e ogni tanto ci mette una parola sua. Qui si RICONOSCONO quei momenti,
// guardando solo cosa e' successo in chat — niente dadi. Chi decide se e cosa
// dire e' spontanea.js; chi lo dice e' il bot.
//
// Tutto in memoria e per canale: le ultime righe, le domande rimaste aperte,
// l'episodio di silenzio gia' rilanciato, l'ultima esplosione.
const RIGHE_MAX = 80;
export const DOMANDA_ATTESA_MS = 75_000;    // una domanda e' «lasciata sola» dopo 75 secondi senza nessun altro
export const DOMANDA_SCADE_MS = 4 * 60_000; // dopo, e' acqua passata
export const SILENZIO_MS = 4 * 60_000;      // la chat e' «ferma» dopo quattro minuti senza una riga
export const VIVA_FINESTRA_MS = 15 * 60_000; // ...ma prima era viva: nei quindici minuti prima
export const VIVA_RIGHE = 4;                //   almeno quattro righe
export const VIVA_PERSONE = 3;              //   di almeno tre persone diverse
export const HYPE_FINESTRA_MS = 30_000;     // l'esplosione si misura su mezzo minuto
export const HYPE_RIGHE = 8;                //   almeno otto righe
export const HYPE_PERSONE = 4;              //   di almeno quattro persone
export const HYPE_RAPPORTO = 3;             //   e tre volte il ritmo dei cinque minuti prima
export const HYPE_RIPOSO_MS = 15 * 60_000;  //   una riga sull'onda al piu' ogni quarto d'ora
export const STREAMER_PARLA_MS = 45_000;    // se lo streamer ha scritto da poco, si lascia a lui
export const FLUSSO_RITMO_MIN = 1;          // il discorso «scorre» da un messaggio al minuto in su
export const FLUSSO_ULTIMA_MS = 90_000;     // ...e l'ultima riga non e' vecchia

const norm = (s) => String(s || '').toLowerCase().trim();
const eDomanda = (t) => {
  const s = String(t || '').trim();
  if (s.length < 8 || s.startsWith('!') || s.startsWith('/') || s.includes('@')) return false;
  return /\?\s*$/.test(s);
};

export class Momenti {
  constructor() { this._canali = new Map(); }

  _stato(login) {
    const l = norm(login);
    let st = this._canali.get(l);
    if (!st) { st = { righe: [], domande: new Map(), rilanciatoA: 0, ultimoHype: 0 }; this._canali.set(l, st); }
    return st;
  }

  // Ogni riga che passa in chat, comprese quelle del bot (dalBot) e dello
  // streamer (isSelf): senza le sue non si saprebbe se una domanda ha avuto risposta.
  osserva(login, { ts, user, display, testo, isSelf = false, dalBot = false, id = '' } = {}) {
    const st = this._stato(login);
    const riga = { ts: Number(ts) || Date.now(), user: norm(user), display: display || user || '', testo: String(testo || ''), isSelf: !!isSelf, dalBot: !!dalBot, id: String(id || '') };
    st.righe.push(riga);
    while (st.righe.length > RIGHE_MAX) st.righe.shift();

    // Una riga di QUALCUN ALTRO chiude le domande aperte: o le ha risposte, o il
    // discorso e' andato avanti e non tocca a noi tornare indietro.
    for (const [k, d] of st.domande) if (d.user !== riga.user) st.domande.delete(k);
    if (!riga.isSelf && !riga.dalBot && eDomanda(riga.testo)) {
      st.domande.set(riga.id || String(riga.ts), { ts: riga.ts, user: riga.user, display: riga.display, testo: riga.testo, id: riga.id });
    }
  }

  // I momenti buoni ADESSO, in ordine di importanza. `saQualcosa(testo)` dice se
  // il bot ha davvero una risposta per una domanda: senza, la domanda non e' un
  // momento — rispondere «non lo so» a chi non ti ha chiesto niente e' peggio.
  vedi(login, { ora = Date.now(), live = false, saQualcosa = () => false } = {}) {
    const st = this._stato(login);
    const out = [];
    const righe = st.righe;
    const ultima = righe[righe.length - 1];
    const ultimaVoce = [...righe].reverse().find((r) => !r.dalBot);

    // se lo streamer ha appena scritto, la chat e' sua: si lascia a lui
    const streamerAdesso = [...righe].reverse().find((r) => r.isSelf);
    const inMano = streamerAdesso && ora - streamerAdesso.ts < STREAMER_PARLA_MS;

    // 1) una domanda lasciata sola, che sappiamo. Proporla non la chiude: se chi
    //    decide la rimanda (pavimento), al giro dopo e' ancora li'. La chiude la
    //    riga di qualcun altro — compresa la risposta del bot — oppure la scadenza.
    for (const [k, d] of st.domande) {
      if (ora - d.ts > DOMANDA_SCADE_MS) { st.domande.delete(k); continue; }
      if (ora - d.ts < DOMANDA_ATTESA_MS) continue;
      if (inMano) continue;
      if (!saQualcosa(d.testo)) { st.domande.delete(k); continue; }
      out.push({ tipo: 'domanda', dati: { ...d }, spunto: `${d.display || d.user} ha chiesto una cosa e da piu' di un minuto nessuno gli risponde` });
      break;   // una alla volta
    }

    // 2) la chat e' esplosa
    const recenti = righe.filter((r) => !r.dalBot && ora - r.ts <= HYPE_FINESTRA_MS);
    const persone = new Set(recenti.map((r) => r.user)).size;
    if (recenti.length >= HYPE_RIGHE && persone >= HYPE_PERSONE && ora - st.ultimoHype > HYPE_RIPOSO_MS && !inMano) {
      const prima = righe.filter((r) => !r.dalBot && ora - r.ts > HYPE_FINESTRA_MS && ora - r.ts <= 5 * 60_000 + HYPE_FINESTRA_MS);
      const ritmoPrima = prima.length / 10;   // per mezzo minuto, sui cinque minuti prima
      if (recenti.length >= ritmoPrima * HYPE_RAPPORTO) {
        out.push({ tipo: 'hype', dati: { righe: recenti.length, persone }, spunto: `la chat e' esplosa adesso: ${recenti.length} messaggi in mezzo minuto da ${persone} persone diverse` });
      }
    }

    // 3) silenzio dopo un momento vivo (solo in diretta: a canale spento il silenzio e' normale)
    if (live && ultimaVoce && ora - ultimaVoce.ts >= SILENZIO_MS && st.rilanciatoA !== ultimaVoce.ts && !inMano) {
      const vive = righe.filter((r) => !r.dalBot && !r.isSelf && ultimaVoce.ts - r.ts <= VIVA_FINESTRA_MS);
      const gente = new Set(vive.map((r) => r.user)).size;
      if (vive.length >= VIVA_RIGHE && gente >= VIVA_PERSONE) {
        const minuti = Math.round((ora - ultimaVoce.ts) / 60_000);
        out.push({ tipo: 'rilancio', dati: { minuti, ultime: vive.slice(-3).map((r) => r.testo) }, spunto: `la chat si e' fermata da ${minuti} minuti dopo un momento vivo: rilancia con una domanda leggera legata a quello di cui si parlava, senza salutare` });
      }
    }

    // 4) il discorso scorre: ogni tanto una parola sua
    const ultimoMinuto = righe.filter((r) => !r.dalBot && ora - r.ts <= 60_000).length;
    if (ultimoMinuto >= FLUSSO_RITMO_MIN && ultimaVoce && ora - ultimaVoce.ts <= FLUSSO_ULTIMA_MS && !inMano && !(ultima && ultima.dalBot)) {
      out.push({ tipo: 'flusso', dati: { ritmo: ultimoMinuto }, spunto: '' });
    }
    return out;
  }

  // Un momento e' stato usato: quel che va ricordato per non ripetersi.
  segna(login, tipo, ora = Date.now()) {
    const st = this._stato(login);
    if (tipo === 'hype') st.ultimoHype = ora;
    if (tipo === 'rilancio') {
      const ultimaVoce = [...st.righe].reverse().find((r) => !r.dalBot);
      st.rilanciatoA = ultimaVoce ? ultimaVoce.ts : ora;
    }
  }

  // il ritmo della chat adesso (righe al minuto, le sue escluse): serve all'attesa umana
  ritmo(login, ora = Date.now()) {
    return this._stato(login).righe.filter((r) => !r.dalBot && ora - r.ts <= 60_000).length;
  }
}
