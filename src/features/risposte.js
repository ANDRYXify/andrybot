// LE RISPOSTE A CHI HA CHIESTO.
//
// Una risposta a un comando che chiede qualcosa (un elenco, una spiegazione, la
// propria posizione, come si usa un comando) e' una battuta detta a UNA
// persona. Prima usciva come una riga alla stanza: in una chat che scorre, chi
// aveva chiesto doveva ritrovarsela, e chi leggeva vedeva un muro di nomi senza
// sapere per chi fosse.
//
// Due regole, scritte qui una volta sola.
//
//  · A CHI. Dove la piattaforma lo sa fare (Twitch, Kick) la risposta si aggancia
//    al messaggio che l'ha chiesta, come fa una persona col tasto «rispondi».
//    Dove non lo sa fare (YouTube) la risposta comincia col nome, se non lo dice
//    gia'. Gli annunci per tutti (una corsa che parte, un boss che arriva) NON
//    passano di qui: sono detti alla stanza, e agganciarli a una persona li
//    farebbe sembrare roba fra due.
//  · QUANTO. Ogni piattaforma ha il suo limite, e chi supera viene tagliato con
//    «…» a meta' di un nome. Qui un elenco si spezza al confine di un pezzo, in
//    piu' messaggi se serve: nessun nome tagliato, per costruzione.
//
// E una terza, su COSA si dice (docs/RIMEDI.md).
//
//  · IL RIMEDIO A CHI LO PUO' FARE. Rimettere un permesso, collegare Spotify,
//    accendere una cosa nel pannello: lo puo' fare solo chi ha il canale. Detto a
//    uno spettatore e' una frase che non gli serve e che non puo' eseguire, e in
//    chat lo leggono tutti. Il rimedio si dice solo a chi ha scritto il comando
//    se e' dello staff; a tutti gli altri si dice cosa e' successo, e basta.

// I limiti veri, in caratteri. Twitch accetta 500, ma la voce ne tiene 450 per
// prudenza (chat.js): conta quello, perche' e' quello che taglia.
export const LIMITE = { twitch: 450, kick: 500, youtube: 200 };
export const limiteDi = (msg) => LIMITE[msg?.piattaforma] || LIMITE.twitch;

const AGGANCIA = new Set(['twitch', 'kick']);
const agganciabile = (msg) => AGGANCIA.has(msg?.piattaforma || 'twitch');

// La voce che risponde a chi ha scritto `msg`. `parla` e' la voce del canale,
// quella che i gestori ricevono gia'. Un messaggio senza id su Twitch non viene
// dalla chat (una prova, la console): si risponde e basta.
export function aChi(msg, parla) {
  const nome = msg?.display || msg?.user || '';
  if (agganciabile(msg)) return (testo) => (msg?.id ? parla(testo, { rispondiA: msg.id }) : parla(testo));
  return (testo) => {
    const t = String(testo ?? '');
    parla(!nome || t.toLowerCase().includes(nome.toLowerCase()) ? t : `@${nome} ${t}`);
  };
}

// Quanto spazio resta a chi risponde, tolto il nome che YouTube mette davanti.
export function spazioPer(msg) {
  const l = limiteDi(msg);
  if (agganciabile(msg)) return l;
  const nome = msg?.display || msg?.user || '';
  return nome ? l - nome.length - 2 : l;
}

// Un testo lungo diviso in righe che stanno nel limite, spezzando fra una frase
// e l'altra se si puo', se no fra due parole. Una parola piu' lunga del limite
// (non ne esistono in italiano: e' un link o un nome inventato) si taglia.
export function aFrasi(testo, limite) {
  const t = String(testo ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= limite) return t ? [t] : [];
  const frasi = t.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [t];
  const pezzi = frasi.flatMap((f) => (f.trim().length <= limite ? [f.trim()] : f.trim().split(' ')));
  return inMessaggi(pezzi, limite, { sep: ' ' });
}

// Un elenco di pezzi in messaggi che stanno nel limite. `testa` apre il primo,
// `coda` chiude l'ultimo, staccata da `primaDellaCoda` (o ne fa uno suo, se non
// ci sta). Un pezzo non si spezza mai: il messaggio nuovo comincia dove ne
// finisce uno.
//
// Un pezzo e' un testo, oppure { testo, prima, daCapo }: `prima` e' quello che
// lo separa dal pezzo di prima (di serie `sep`), `daCapo` come si scrive se
// apre un messaggio nuovo. Serve ai gruppi: il nome del gruppo sta sul primo
// pezzo, e un messaggio che riparte a meta' gruppo lo ripete.
export function inMessaggi(pezzi, limite, { testa = '', coda = '', sep = ' · ', primaDellaCoda = ' ' } = {}) {
  const fuori = [];
  let cur = testa;
  let vuoto = true;
  const taglia = (t) => (t.length <= limite ? t : t.slice(0, limite));
  for (const p0 of pezzi) {
    const p = typeof p0 === 'object' && p0 ? p0 : { testo: p0 };
    const testo = String(p.testo ?? '').trim();
    if (!testo) continue;
    const prima = vuoto ? (cur ? ' ' : '') : (p.prima ?? sep);
    if ((cur + prima + testo).length <= limite) { cur += prima + testo; vuoto = false; continue; }
    if (cur) fuori.push(cur);
    cur = taglia(String(p.daCapo ?? testo).trim());
    vuoto = false;
  }
  if (coda) {
    const prima = vuoto ? (cur ? ' ' : '') : primaDellaCoda;
    if ((cur + prima + coda).length <= limite) cur += prima + coda;
    else { if (cur) fuori.push(cur); cur = taglia(coda); }
  }
  if (cur) fuori.push(cur);
  return fuori;
}

// Chi ha scritto e' lo streamer (col suo account, che e' anche quello del bot) o
// un suo moderatore.
export const eStaff = (msg) => !!(msg && (msg.isBroadcaster || msg.isMod || msg.isSelf));

// Il testo giusto per chi lo legge: `staff` col rimedio, `pubblico` senza. Il
// cancello dei rimedi (scripts/verifica-rimedi.mjs) legge le due chiavi.
export function aChiPuo(dalloStaff, testi) {
  return dalloStaff ? testi.staff : testi.pubblico;
}

// Risponde con uno o piu' messaggi, tutti a chi ha chiesto.
export function rispondi(msg, parla, testi) {
  const dire = aChi(msg, parla);
  for (const t of [].concat(testi || [])) if (t) dire(t);
}
