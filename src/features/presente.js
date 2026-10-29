// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA PRESENZA DEL CANALE: «!presente» (docs/COLPI.md, «La presenza come porta»;
// docs/MENU.md, «Presenza, monete e giochi: una strada sola»).
//
// Chi scrive la frase c'e', a QUESTA diretta: e' un fatto del canale, non un
// effetto a schermo. Da qui la porta (chi non c'e' non guadagna, non mette Bit
// nel salvadanaio, non gioca), la serie (le monete di ogni presenza di fila),
// la risposta in chat. Vale anche con i Pew spenti e senza un effetto: ai Pew
// resta solo l'effetto a schermo (colpi.js, `presenza`), che parte quando c'e'.
//
// UN POSTO SOLO LA LEGGE: `presenteDi(settings)`. Sta in `settings.presente`;
// una configurazione salvata prima della scheda Presenza la ha dentro
// `settings.colpi.presenza`, e si legge da li' finche' lo streamer non salva la
// scheda nuova (o i Pew: `presenteDaSalvare` la ferma prima che si perda).
//
// Puro: niente database, niente config. Le prove lo usano cosi' com'e'.

export const PRESENTE = Object.freeze({
  frase: '!presente', gradini: 30, fraseMax: 40, risposta: 160, ricordo: 200, conferma: 160, gradinoMax: 100_000,
  // la risposta in chat di serie: col premio, e senza quando non ce n'e'
  risposte: Object.freeze({
    it: Object.freeze(['{nome}, presente! {serie}ª di fila: +{monete} {moneta}.', '{nome}, presente! {serie}ª di fila.']),
    en: Object.freeze(['{nome}, checked in! {serie} in a row: +{monete} {moneta}.', '{nome}, checked in! {serie} in a row.']),
    es: Object.freeze(['{nome}, ¡presente! {serie}ª seguida: +{monete} {moneta}.', '{nome}, ¡presente! {serie}ª seguida.']),
  }),
});
// la vecchia di serie («!pew presente») passa alla nuova; una scritta dallo streamer resta
export const FRASE_VECCHIA = '!pew presente';
export const PORTA_GIOCHI = Object.freeze(['blocca', 'libero']);

const oggetto = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : null);
const testo = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
// la frase si confronta intera, senza badare a maiuscole e spazi
export const formaFrase = (t) => String(t ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

function normPremi(premi, vecchio) {
  const grezzi = Array.isArray(premi) ? premi : typeof premi === 'string' ? premi.split(/[\s,;]+/) : [];
  const out = grezzi.map((x) => Math.round(Number(x))).filter((x) => Number.isFinite(x) && x >= 0).slice(0, PRESENTE.gradini).map((x) => Math.min(PRESENTE.gradinoMax, x));
  if (!out.length && Number(vecchio) > 0) out.push(Math.min(PRESENTE.gradinoMax, Math.round(Number(vecchio))));
  return out.some((x) => x > 0) ? out : [];
}
// LA PORTA: cosa chiede la presenza. Accesa di serie; ogni pezzo e' dello streamer.
function normPorta(p) {
  const o = oggetto(p) || {};
  return {
    attiva: o.attiva !== false,
    monete: o.monete !== false,
    bit: o.bit !== false,
    giochi: PORTA_GIOCHI.includes(o.giochi) ? o.giochi : 'blocca',
    ricorda: o.ricorda !== false,
    testoRicorda: testo(o.testoRicorda, PRESENTE.ricordo),
    conferma: o.conferma !== false,
    testoConferma: testo(o.testoConferma, PRESENTE.conferma),
  };
}

// La presenza ripulita: frase, serie (gradini e dopo l'ultimo), risposta, porta.
// Accetta anche la forma vecchia (`monete`: il premio fisso di prima diventa un gradino).
export function normPresente(p) {
  const o = oggetto(p) || {};
  const frase = formaFrase(o.frase).slice(0, PRESENTE.fraseMax);
  return {
    frase: frase.length >= 2 && frase !== FRASE_VECCHIA ? frase : PRESENTE.frase,
    // LA SERIE (docs/COLPI.md, «La serie della presenza»): le monete di ogni
    // presenza di fila, gradino per gradino («1, 5, 10, 15»); dopo l'ultimo si
    // resta li' o si ricomincia. Chi salta una diretta riparte dal primo.
    premi: normPremi(o.premi, o.monete),
    dopo: o.dopo === 'ricomincia' ? 'ricomincia' : 'resta',
    // la risposta della serie: spenta, o col testo dello streamer ({nome},
    // {serie}, {monete}, {moneta}); vuota = quella di serie, nella lingua della chat
    rispondi: o.rispondi !== false,
    risposta: testo(o.risposta, PRESENTE.risposta),
    porta: normPorta(o.porta),
  };
}

// L'ACCESSORE: la presenza del canale, da qualunque forma sia salvata.
export function presenteDi(settings) {
  const s = oggetto(settings) || {};
  return normPresente(oggetto(s.presente) || oggetto(s.colpi)?.presenza);
}

// Quando le impostazioni si salvano: la presenza nuova, o undefined se resta com'e'.
// Chi salva la scheda Presenza la scrive. Chi salva i Pew prima di averla mai
// salvata rischierebbe di perdere quella vecchia (i Pew adesso mandano solo
// l'effetto): si ferma qui, da quella salvata e da quella che arriva, e da quel
// momento vale `settings.presente`.
// Come le altre impostazioni: il salvato sta sotto, quello che arriva sta sopra
// (un salvataggio parziale non riporta il resto ai valori di serie).
export function presenteDaSalvare(prima, corpo) {
  const p = oggetto(prima) || {}, b = oggetto(corpo) || {};
  if (b.presente !== undefined) {
    const sotto = presenteDi(p), sopra = oggetto(b.presente) || {};
    return normPresente({ ...sotto, ...sopra, porta: { ...sotto.porta, ...(oggetto(sopra.porta) || {}) } });
  }
  if (b.colpi === undefined || oggetto(p.presente)) return undefined;
  return normPresente({ ...(oggetto(oggetto(p.colpi)?.presenza) || {}), ...(oggetto(oggetto(b.colpi)?.presenza) || {}) });
}

export const eFrasePresente = (pres, messaggio) => !!pres?.frase && formaFrase(messaggio) === pres.frase;

// Cosa chiede la porta adesso: «monete», «bit» o «giochi».
export function portaChiede(pres, cosa) {
  const p = pres?.porta;
  if (!p?.attiva) return false;
  return cosa === 'giochi' ? p.giochi === 'blocca' : !!p[cosa];
}
// I testi di serie della porta, nella lingua della chat.
// {cosa} dice solo quello che la porta chiede davvero.
export const PORTA_TESTI = Object.freeze({
  ricorda: Object.freeze({ it: '@{nome} prima scrivi {frase}: da lì {cosa}.', en: '@{nome} first type {frase}: from then on {cosa}.', es: '@{nome} primero escribe {frase}: desde ahí {cosa}.' }),
  conferma: Object.freeze({ it: '✓ @{nome} presente!', en: '✓ @{nome} is here!', es: '✓ ¡@{nome} presente!' }),
  cosa: Object.freeze({
    it: { monete: 'guadagni monete', giochi: 'puoi giocare', bit: 'i tuoi Bit vanno nel salvadanaio', e: ' e ' },
    en: { monete: 'you earn coins', giochi: 'you can play', bit: 'your Bits go to your piggy bank', e: ' and ' },
    es: { monete: 'ganas monedas', giochi: 'puedes jugar', bit: 'tus Bits van a la hucha', e: ' y ' },
  }),
});
export function testoPorta(pres, quale, lingua, valori) {
  const p = pres?.porta || {};
  const scritto = quale === 'ricorda' ? p.testoRicorda : p.testoConferma;
  const base = scritto || (PORTA_TESTI[quale][lingua] || PORTA_TESTI[quale].it);
  const parole = PORTA_TESTI.cosa[lingua] || PORTA_TESTI.cosa.it;
  const pezzi = ['monete', 'giochi', 'bit'].filter((k) => portaChiede(pres, k)).map((k) => parole[k]);
  const cosa = pezzi.length > 1 ? pezzi.slice(0, -1).join(', ') + parole.e + pezzi.at(-1) : pezzi[0] || '';
  const v = { cosa, frase: pres?.frase || PRESENTE.frase, ...valori };
  return base.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? String(v[k]) : m));
}

// Quante monete vale la presenza numero `serie` di fila.
export function premioSerie(pres, serie) {
  const g = pres?.premi || [];
  const n = Math.max(1, Math.trunc(Number(serie) || 1));
  if (!g.length) return 0;
  return pres.dopo === 'ricomincia' ? g[(n - 1) % g.length] : g[Math.min(n, g.length) - 1];
}
// La serie di una persona dopo questa presenza: +1 se l'ultima sua era alla
// diretta subito prima, se no si riparte da 1. `precedente` e' la diretta prima
// di questa nell'elenco delle dirette del canale ('' se non c'e').
export function serieDopo(prima, occasione, precedente) {
  if (prima?.ultima && prima.ultima === occasione) return prima.serie || 1;
  return prima?.ultima && precedente && prima.ultima === precedente ? (prima.serie || 0) + 1 : 1;
}

// LA SERIE DI UNA PRESENZA, sul registro delle serie (`serie`: db.pewSerie,
// con segnaDiretta, get, precedente, metti). La diretta entra nell'elenco, la
// serie sale o riparte, e le monete del gradino arrivano una volta per diretta:
// `nuova` dice se e' la prima presenza di questa persona a questa diretta.
// `gradino` e' quanto vale il suo gradino (per le scritte), `monete` quanto
// gli spetta adesso (zero se non e' nuova).
export function contaSerie(serie, { canale, chiave, occasione, ora = Date.now(), pres }) {
  if (!serie || !canale || !chiave || !occasione) return { serie: 1, gradino: premioSerie(pres, 1), monete: 0, nuova: false };
  serie.segnaDiretta(canale, occasione, ora);
  const prima = serie.get(canale, chiave) || null;
  const n = serieDopo(prima, occasione, serie.precedente(canale, occasione) || '');
  const nuova = prima?.ultima !== occasione;
  const gradino = premioSerie(pres, n);
  if (nuova) serie.metti(canale, chiave, { ultima: occasione, serie: n, record: Math.max(prima?.record || 0, n), ts: ora });
  return { serie: n, gradino, monete: nuova ? gradino : 0, nuova };
}

// LA RISPOSTA IN CHAT, una sola, alla prima presenza della diretta: quella
// della serie quando ha qualcosa da dire (le monete del gradino, o un testo
// scritto dallo streamer), se no la conferma della porta. Ognuna si spegne da
// sola. '' vuol dire silenzio.
const nomeIn = (n) => testo(n, 25).replace(/https?:\/\/\S+/gi, '').replace(/\s+/g, ' ').trim();
const riempi = (t, v) => String(t).replace(/\{(nome|serie|monete|moneta)\}/g, (_, k) => String(v[k] ?? ''));
export function rispostaPresenza(pres, nome, lingua = 'it', { serie = 1, monete = 0, moneta = '' } = {}) {
  const n = nomeIn(nome);
  if (!n || !pres) return '';
  if (pres.rispondi && (monete > 0 || pres.risposta)) {
    const r = PRESENTE.risposte[lingua] || PRESENTE.risposte.it;
    return riempi(pres.risposta || r[0], { nome: '@' + n, serie, monete, moneta });
  }
  if (pres.porta?.attiva && pres.porta.conferma) return testoPorta(pres, 'conferma', lingua, { nome: n });
  if (pres.rispondi) return riempi((PRESENTE.risposte[lingua] || PRESENTE.risposte.it)[1], { nome: '@' + n, serie, monete, moneta });
  return '';
}
