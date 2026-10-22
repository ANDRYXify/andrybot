// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA CHAT NELLA PAGINA DEI COLPI (docs/COLPI.md, «La chat»). La pagina la
// legge da qui: i messaggi che il bot riceve gia' dalla chat di Twitch del
// canale, girati a chi ha la pagina aperta (un flusso SSE) con le ultime righe
// per chi arriva adesso. E' la chat pubblica del canale, la stessa che legge
// chiunque su Twitch: niente di piu', niente che non sia gia' pubblico.
//
// Le righe stanno solo in memoria, poche per canale, e solo per i canali coi
// colpi accesi: un riavvio le perde, e la pagina riparte dai messaggi nuovi.
export const RIGHE_TENUTE = 40;
export const PER_CANALE = 300;
export const IN_TUTTO = 3000;
export const BATTITO_MS = 25_000;

// La riga come la mostra la pagina: chi, il suo colore, il testo, e le emote
// che ci sono dentro (nome → indirizzo), sia di Twitch sia del canale.
export function rigaDi(msg, { colore = '', emote = {} } = {}) {
  const testo = String(msg?.text || '').trim().slice(0, 500);
  if (!testo) return null;
  const usate = {};
  for (const parola of testo.split(/\s+/)) if (Object.prototype.hasOwnProperty.call(emote, parola) && /^https:\/\//.test(String(emote[parola]))) usate[parola] = emote[parola];
  return { id: String(msg?.id || ''), chi: String(msg?.display || msg?.user || '').slice(0, 40), colore: /^#[0-9a-f]{6}$/i.test(colore) ? colore : '', testo, emote: usate };
}

export function creaChatColpi({ ora = () => Date.now() } = {}) {
  const righe = new Map();     // login -> [riga]
  const ascolta = new Map();   // login -> Set<res>
  let totale = 0;
  const scrivi = (res, riga) => { try { res.write(`data: ${JSON.stringify(riga)}\n\n`); } catch { /* chiuso: lo toglie 'close' */ } };

  function messaggio(login, riga) {
    const l = String(login || '').toLowerCase();
    if (!riga) return;
    const r = { ...riga, quando: ora() };
    const lista = righe.get(l) || [];
    lista.push(r);
    if (lista.length > RIGHE_TENUTE) lista.splice(0, lista.length - RIGHE_TENUTE);
    righe.set(l, lista);
    for (const res of ascolta.get(l) || []) scrivi(res, r);
  }

  // Un lettore nuovo: le ultime righe, poi quelle che arrivano. Torna false se
  // non c'e' posto (la rotta risponde 503).
  function apri(login, res) {
    const l = String(login || '').toLowerCase();
    const set = ascolta.get(l) || new Set();
    if (set.size >= PER_CANALE || totale >= IN_TUTTO) return false;
    set.add(res); ascolta.set(l, set); totale++;
    for (const r of righe.get(l) || []) scrivi(res, r);
    return true;
  }
  function chiudi(login, res) {
    const l = String(login || '').toLowerCase();
    const set = ascolta.get(l);
    if (!set || !set.delete(res)) return;
    totale--;
    if (!set.size) ascolta.delete(l);
  }
  // Un battito ogni tanto tiene viva la linea dietro i proxy, ed e' un evento
  // vero (non un commento, che il browser non fa vedere): la pagina se non ne
  // sente per un po' capisce che la linea e' morta e la riapre.
  function battito() { for (const set of ascolta.values()) for (const res of set) { try { res.write('data: {"tipo":"battito"}\n\n'); } catch { /* niente */ } } }
  const dimentica = (login) => { righe.delete(String(login || '').toLowerCase()); };
  const quanti = (login) => ascolta.get(String(login || '').toLowerCase())?.size || 0;

  return { messaggio, apri, chiudi, battito, dimentica, quanti, ultime: (login) => [...(righe.get(String(login || '').toLowerCase()) || [])] };
}
