// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// GLI ATTACCHI DEGLI SPETTATORI (docs/COLPI.md). Il modello, senza rete e
// senza database: le regole che il server, la pagina dello spettatore e le
// prove leggono da qui.
//
// Un attacco e' un EFFETTO del canale (un comando della tabella degli effetti)
// sparato nell'overlay nel PUNTO che lo spettatore ha mirato, col suo nome.
// Si paga in euro sul conto dello streamer, coi punti canale o coi Bit: i Bit
// fuori da Twitch non si incassano (solo chat, power-up ed estensioni), quindi
// per i Bit e per i punti la pagina da' un CODICE, e il codice arriva col cheer
// o col riscatto del premio.
//
// Le invarianti:
//  · IL PUNTO SI DECIDE ALLA MIRA. Il server lo controlla quando lo spettatore
//    lo sceglie (dentro il quadro, fuori dalle zone protette) e lo tiene: chi
//    paga dopo non puo' spostarlo, e uno sparo non si rifiuta piu' per il punto.
//  · IL PUNTO E' IL CENTRO. Le coordinate sono la percentuale del quadro 16:9 e
//    l'effetto ci si posa col suo centro: dove clicchi, colpisci.
//  · UNA MIRA SI SPARA UNA VOLTA SOLA, qualunque cosa la paghi (lo garantisce
//    il registro, con un passaggio di stato che vince una volta sola).
//  · IL PREZZO E' QUELLO DELLA MIRA. Si legge dal listino quando si mira e si
//    scrive nella mira: lo streamer che cambia il listino non cambia le mire gia'
//    fatte.

import { config } from '../config.js';
import { istanteNelFuso, partiNelFuso } from './economia-regole.js';

// L'INDIRIZZO DELLA PAGINA (docs/COLPI.md, «L'indirizzo corto»): quello corto,
// pew.<dominio>/<canale>, quando il server l'ha acceso (dal .env o dalla sonda,
// come il negozio); se no quello lungo, che vale sempre. Chi lo scrive da
// qualche parte lo chiede qui: il pannello, i premi, i ritorni dei pagamenti,
// il canonico della pagina.
export function urlPaginaColpo(canale) {
  const ch = String(canale || '').toLowerCase();
  return config.pewHost ? `https://${config.pewHost}/${ch}` : `${config.baseUrl}/u/${ch}/colpo`;
}

// Le monete sono quelle del canale (docs/ECONOMIA.md): si spendono dalla pagina
// con l'accesso a Twitch, o in chat col comando e il codice, e tornano se il
// colpo non compare.
// puntiKick: i punti del canale su Kick, un prezzo suo (docs/COLPI.md, «Su Kick»)
export const METODI = Object.freeze(['euro', 'punti', 'bit', 'monete', 'kicks', 'puntiKick']);
export const LIMITI = Object.freeze({ voci: 20, zone: 8, nome: 40, chi: 25, attesaSec: [0, 600], alMinuto: [1, 60], scala: [20, 300], euroCent: [50, 50_000], punti: [1, 1_000_000], bit: [1, 100_000], kicks: [1, 100_000], puntiKick: [1, 1_000_000], monete: [1, 10_000_000], categorie: 10, categoria: 30 });
// LE CATEGORIE DEL LISTINO (docs/COLPI.md, «Le categorie»): le decide lo
// streamer, nome e ordine. Finche' non le tocca valgono queste, e un colpo che
// non ne ha una sua va in quella del suo tipo. Un nome vuoto si legge nella
// lingua di chi guarda.
export const CATEGORIE_SERIE = Object.freeze(['lanci', 'adesivi', 'spaventi', 'media']);
export const COMANDO_SERIE = 'pew';
export const SCADENZA_MS = 15 * 60_000;
// Niente 0/O, 1/I/L, 5/S, 2/Z: un codice si detta e si copia a mano.
export const ALFABETO = 'ABCDEFGHJKMNPQRTUVWXY346789';
export const LUNGHEZZA_CODICE = 5;

const num = (v, [a, b], d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : d; };
const prezzo = (v, lim) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n > 0 ? Math.min(lim[1], Math.max(lim[0], n)) : 0; };
const testo = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const pct = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n * 100) / 100)) : null; };
const ID = /^[a-z0-9]{1,24}$/;
const COMANDO = /^[a-z0-9_]{1,40}$/;

function zona(z) {
  if (!z || typeof z !== 'object') return null;
  const x = pct(z.x), y = pct(z.y), w = pct(z.w), h = pct(z.h);
  if (x == null || y == null || !w || !h) return null;
  return { x, y, w: Math.min(w, 100 - x), h: Math.min(h, 100 - y) };
}

export function normalizza(cfg) {
  const o = cfg && typeof cfg === 'object' ? cfg : {};
  const usati = new Set(), voci = [];
  for (const v of Array.isArray(o.voci) ? o.voci : []) {
    if (voci.length >= LIMITI.voci || !v || typeof v !== 'object') continue;
    const comando = String(v.comando || '').toLowerCase().replace(/^!/, '');
    if (!COMANDO.test(comando)) continue;
    let id = ID.test(String(v.id || '')) ? String(v.id) : comando.replace(/_/g, '').slice(0, 24) || 'a';
    for (let k = 2; usati.has(id); k++) id = (id.slice(0, 20) + k).slice(0, 24);
    usati.add(id);
    voci.push({
      id, comando, nome: testo(v.nome, LIMITI.nome) || comando,
      euro: prezzo(v.euro, LIMITI.euroCent), punti: prezzo(v.punti, LIMITI.punti), bit: prezzo(v.bit, LIMITI.bit), kicks: prezzo(v.kicks, LIMITI.kicks), puntiKick: prezzo(v.puntiKick, LIMITI.puntiKick),
      scala: num(v.scala, LIMITI.scala, 100), attiva: v.attiva !== false,
      monete: prezzo(v.monete, LIMITI.monete),
      misti: normMisti(v.misti),
      zaino: normZainoVoce(v.zaino),
      chat: normChatVoce(v.chat),
      premioMisto: /^[0-9a-f-]{8,64}$/.test(String(v.premioMisto || '')) ? String(v.premioMisto) : '',
      // il premio del canale su Kick (docs/COLPI.md, «Su Kick»): l'id che da' Kick
      premioKick: /^[A-Za-z0-9_-]{1,64}$/.test(String(v.premioKick || '')) ? String(v.premioKick) : '',
      premioKickCosto: num(v.premioKickCosto, [0, LIMITI.punti[1]], 0),
      premioKickNome: testo(v.premioKickNome, 50),
      premioMistoCosto: num(v.premioMistoCosto, [0, LIMITI.punti[1]], 0), premioMistoNome: testo(v.premioMistoNome, 45),
      categoria: ID.test(String(v.categoria || '')) ? String(v.categoria) : '',
      premio: /^[0-9a-f-]{8,64}$/.test(String(v.premio || '')) ? String(v.premio) : '',
      premioCosto: num(v.premioCosto, [0, LIMITI.punti[1]], 0), premioNome: testo(v.premioNome, 45),
    });
  }
  const categorie = normCategorie(o.categorie);
  for (const v of voci) if (v.categoria && !categorie.some((c) => c.id === v.categoria)) v.categoria = '';
  const comando = String(o.comando || '').toLowerCase().replace(/^!/, '');
  return {
    attivo: o.attivo === true,
    voci,
    categorie,
    // il comando per pagare in chat con le monete: «!pew K7QX3»
    comando: COMANDO.test(comando) && comando.length <= 25 ? comando : COMANDO_SERIE,
    zone: (Array.isArray(o.zone) ? o.zone : []).map(zona).filter(Boolean).slice(0, LIMITI.zone),
    attesaSec: num(o.attesaSec, LIMITI.attesaSec, 30),
    alMinuto: num(o.alMinuto, LIMITI.alMinuto, 6),
    conNome: o.conNome !== false,
    pausa: o.pausa === true,
    // il titolo e il sottotitolo della pagina, se lo streamer li scrive; vuoti, quelli di serie nella lingua di chi legge
    titolo: testo(o.titolo, 80),
    dida: testo(o.dida, 200),
    // lo slogan sotto il sottotitolo (docs/COLPI.md, «Lo slogan»): acceso di
    // serie; vuoto, quello di serie nella lingua di chi legge
    sloganAcceso: o.sloganAcceso !== false,
    slogan: testo(o.slogan, 120),
    annuncio: normAnnuncio(o.annuncio),
    presenza: normPresenza(o.presenza),
    bitPew: normBitPew(o.bitPew),
    kicksPew: normBitPew(o.kicksPew),
    zaino: normZaino(o.zaino),
    chat: normChat(o.chat),
    quadro: normQuadro(o.quadro),
    // i premi a punti canale: uno per colpo, uno per prezzo, o da solo secondo
    // i posti liberi su Twitch (docs/COLPI.md, «I premi su Twitch»)
    premiModo: PREMI_MODI.includes(o.premiModo) ? o.premiModo : 'auto',
  };
}

// LA PRESENZA (docs/COLPI.md, «La presenza»): chi scrive in chat la frase dello
// streamer fa comparire in diretta il SUO effetto, nel SUO punto, col nome.
// Gratis, una volta per diretta. La frase si confronta intera, senza badare a
// maiuscole e spazi: «!presente» vale, «ciao !presente» no. Accesa vuol
// dire anche «pronta»: senza un effetto non si accende.
export const PRESENZA = Object.freeze({
  frase: '!presente', x: 12, y: 82, scala: 100, alMinuto: [1, 30], alMinutoDef: 6, testo: 60, gradini: 30,
  // la frase sull'overlay quando lo streamer non la scrive, nella lingua della chat
  testi: Object.freeze({ it: '{nome} è presente', en: '{nome} is here', es: '{nome} está presente' }),
  // la risposta in chat di serie: col premio, e senza quando non ce n'e'
  risposte: Object.freeze({
    it: Object.freeze(['{nome}, presente! {serie}ª di fila: +{monete} {moneta}.', '{nome}, presente! {serie}ª di fila.']),
    en: Object.freeze(['{nome}, checked in! {serie} in a row: +{monete} {moneta}.', '{nome}, checked in! {serie} in a row.']),
    es: Object.freeze(['{nome}, ¡presente! {serie}ª seguida: +{monete} {moneta}.', '{nome}, ¡presente! {serie}ª seguida.']),
  }),
});
function normCategorie(c) {
  if (!Array.isArray(c)) return CATEGORIE_SERIE.map((id) => ({ id, nome: '' }));
  const out = [];
  for (const x of c) {
    if (out.length >= LIMITI.categorie || !x || typeof x !== 'object') continue;
    const id = ID.test(String(x.id || '')) ? String(x.id) : '';
    if (!id || out.some((y) => y.id === id)) continue;
    const nome = testo(x.nome, LIMITI.categoria);
    if (!nome && !CATEGORIE_SERIE.includes(id)) continue;
    out.push({ id, nome });
  }
  return out;
}
// La categoria di un colpo: la sua, se c'e'; se no quella del suo tipo (lanci,
// adesivi, spaventi, media), se lo streamer la tiene; se no la prima. Senza
// categorie, nessuna. `tipo` e' uno dei CATEGORIE_SERIE.
export function categoriaDi(cfg, voce, tipo) {
  const cat = cfg?.categorie || [];
  if (!cat.length) return '';
  if (voce?.categoria && cat.some((c) => c.id === voce.categoria)) return voce.categoria;
  return cat.some((c) => c.id === tipo) ? tipo : cat[0].id;
}
// Il comando delle monete in un messaggio: «!pew K7QX3» → { codice, modo: '' },
// «!pew K7QX3 bit» (o «punti») → l'acconto di quel modo misto; se no null.
const MODI_IN_CHAT = { bit: 'bit', bits: 'bit', kicks: 'kicks', kick: 'kicks', punti: 'punti', points: 'punti', puntos: 'punti' };
export function pagaInChat(cfg, messaggio) {
  const m = new RegExp(`^!${cfg?.comando || COMANDO_SERIE}\\s+(\\S+)(?:\\s+(\\S+))?\\s*$`, 'i').exec(String(messaggio || '').trim());
  if (!m) return null;
  const codice = codiceIn(m[1]);
  const modo = m[2] ? MODI_IN_CHAT[m[2].toLowerCase()] : '';
  return codice && modo !== undefined ? { codice, modo } : null;
}
export const codicePerMonete = (cfg, messaggio) => pagaInChat(cfg, messaggio)?.codice || '';
// «!pew bit»: quanti Bit da spendere ho sulla pagina
export const chiedeBit = (cfg, messaggio) => new RegExp(`^!${cfg?.comando || COMANDO_SERIE}\\s+bits?\\s*$`, 'i').test(String(messaggio || '').trim());
// «!pew kicks»: quanti Kicks da spendere ho
export const chiedeKicks = (cfg, messaggio) => new RegExp(`^!${cfg?.comando || COMANDO_SERIE}\\s+kicks?\\s*$`, 'i').test(String(messaggio || '').trim());

// I BIT DA SPENDERE (docs/COLPI.md, «I Bit da spendere»): i Bit mandati al
// canale che non pagano un colpo diventano Bit da spendere sulla pagina, `resa`
// per cento (100: pari). Un Bit vale una volta: o paga un colpo, o diventa
// saldo, mai le due cose.
// Tutto e' dello streamer: la resa, da quanti Bit un cheer conta, un tetto al
// saldo, se tornano i Bit dei colpi non comparsi e delle mire mai pagate, la
// risposta a «!pew bit» (accesa, il testo, ogni quanto), e quando scadono.
export const BIT_PEW = Object.freeze({
  resa: [1, 1000], minimo: [1, 100_000], tetto: [0, 10_000_000], attesaSec: [0, 3600], risposta: 160,
  tipi: Object.freeze(['mai', 'dopo', 'fine', 'inattivo']), unita: Object.freeze(['ore', 'giorni', 'settimane', 'mesi', 'anni']),
  ogni: Object.freeze(['giorno', 'settimana', 'mese', 'anno']), quanti: [1, 1000], ora: [0, 23], giorno: [1, 31], mese: [1, 12], grazia: [0, 720], avviso: [0, 90],
  // la risposta di serie a «!pew bit»; {scade} e' la parte sulla scadenza, quando c'e'
  risposte: Object.freeze({ it: '{nome} hai {saldo} Bit da spendere su {pagina}{scade}', en: '{nome} you have {saldo} Bits to spend on {pagina}{scade}', es: '{nome} tienes {saldo} Bits para gastar en {pagina}{scade}' }),
  scadenze: Object.freeze({ it: ' ({quanti} valgono fino al {quando})', en: ' ({quanti} last until {quando})', es: ' ({quanti} valen hasta el {quando})' }),
});
function normBitPew(b) {
  const o = b && typeof b === 'object' ? b : {};
  const s = o.scadenza && typeof o.scadenza === 'object' ? o.scadenza : {};
  const B = BIT_PEW;
  return {
    attivo: o.attivo !== false, resa: num(o.resa, B.resa, 100), minimo: num(o.minimo, B.minimo, 1), tetto: num(o.tetto, B.tetto, 0),
    rendiColpi: o.rendiColpi !== false, rendiMire: o.rendiMire !== false,
    rispondi: o.rispondi !== false, risposta: testo(o.risposta, B.risposta), attesaSec: num(o.attesaSec, B.attesaSec, 60),
    scadenza: {
      tipo: B.tipi.includes(s.tipo) ? s.tipo : 'mai',
      quanti: num(s.quanti, B.quanti, 30), unita: B.unita.includes(s.unita) ? s.unita : 'giorni',
      ogni: B.ogni.includes(s.ogni) ? s.ogni : 'mese', ora: num(s.ora, B.ora, 0), giorno: num(s.giorno, B.giorno, 1), mese: num(s.mese, B.mese, 1),
      grazia: num(s.grazia, B.grazia, 24), avviso: num(s.avviso, B.avviso, 3),
    },
  };
}

// QUANDO SCADONO (docs/COLPI.md, «Quando scadono»), nel fuso del canale:
//  · mai;
//  · dopo: N ore esatte, o fino alla fine del giorno N giorni, settimane, mesi,
//    anni dopo quello in cui arrivano (come le monete);
//  · fine: al prossimo rintocco del calendario (ogni giorno all'ora X, ogni
//    settimana il giorno X, ogni mese il giorno X — l'ultimo, se il mese e'
//    corto —, ogni anno il X del mese Y), ma almeno `grazia` ore dopo: un Bit
//    arrivato un minuto prima del rintocco non sparisce subito;
//  · inattivo: come «dopo», ma ogni movimento (un cheer, una spesa, un Bit che
//    torna) sposta in avanti tutti i suoi.
// Torna l'istante in cui scadono i Bit che arrivano adesso, 0 se mai.
const giorniDel = (a, m) => new Date(Date.UTC(a, m, 0)).getUTCDate();
export function scadenzaBit(sc, ora = Date.now(), fuso = 'Europe/Rome') {
  if (!sc || !BIT_PEW.tipi.includes(sc.tipo) || sc.tipo === 'mai') return 0;
  const p = partiNelFuso(ora, fuso);
  if (sc.tipo === 'dopo' || sc.tipo === 'inattivo') {
    const q = sc.quanti;
    if (sc.unita === 'ore') return ora + q * 3600_000;
    if (sc.unita === 'giorni' || sc.unita === 'settimane') return istanteNelFuso(p.year, p.month, p.day + q * (sc.unita === 'giorni' ? 1 : 7) + 1, 0, fuso);
    const a = sc.unita === 'anni' ? p.year + q : p.year, m = sc.unita === 'mesi' ? p.month + q : p.month;
    return istanteNelFuso(a, m, Math.min(p.day, giorniDel(a, m)) + 1, 0, fuso);
  }
  const minimo = ora + sc.grazia * 3600_000;
  let t = 0;
  for (let k = 0; k < 64; k++) {
    if (sc.ogni === 'giorno') t = istanteNelFuso(p.year, p.month, p.day + k, sc.ora, fuso);
    else if (sc.ogni === 'settimana') {
      const dow = ((new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay() + 6) % 7) + 1;
      t = istanteNelFuso(p.year, p.month, p.day + ((Math.min(7, sc.giorno) - dow + 7) % 7) + 7 * k, sc.ora, fuso);
    } else if (sc.ogni === 'mese') t = istanteNelFuso(p.year, p.month + k, Math.min(sc.giorno, giorniDel(p.year, p.month + k)), sc.ora, fuso);
    else t = istanteNelFuso(p.year + k, sc.mese, Math.min(sc.giorno, giorniDel(p.year + k, sc.mese)), sc.ora, fuso);
    if (t > minimo) return t;
  }
  return t;
}
// «fino al 4 novembre» (scade alla mezzanotte che lo chiude) o «5 novembre, 06:00»
export function quandoScade(scade, lingua = 'it', fuso = 'Europe/Rome') {
  try {
    const p = partiNelFuso(scade, fuso);
    const notte = p.hour === 0 && p.minute === 0;
    return new Intl.DateTimeFormat(lingua, { timeZone: fuso, day: 'numeric', month: 'long', ...(notte ? {} : { hour: '2-digit', minute: '2-digit' }) }).format(new Date(notte ? scade - 1 : scade));
  } catch { return new Date(scade).toISOString().slice(0, 16).replace('T', ' '); }
}
// La risposta a «!pew bit», con lo stesso testo per tutti i segnaposto: {nome},
// {saldo}, {pagina}, {scade} (vuoto se niente scade presto), {quanti}, {quando}.
// la risposta a «!pew kicks», di serie
export const KICKS_RISPOSTE = Object.freeze({
  risposte: Object.freeze({ it: '{nome} hai {saldo} Kicks da spendere su {pagina}{scade}', en: '{nome} you have {saldo} Kicks to spend on {pagina}{scade}', es: '{nome} tienes {saldo} Kicks para gastar en {pagina}{scade}' }),
});
export function rispostaBit(cfg, lingua, v = {}, valuta = 'bit') {
  const b = cfgValuta(cfg, valuta);
  const L = BIT_PEW.risposte[lingua] ? lingua : 'it';
  const scade = v.quanti > 0 && v.quando ? BIT_PEW.scadenze[L].replace('{quanti}', v.quanti).replace('{quando}', v.quando) : '';
  const vals = { nome: v.nome || '', saldo: v.saldo ?? 0, pagina: v.pagina || '', scade, quanti: v.quanti || 0, quando: v.quando || '' };
  return String(b.risposta || (valuta === 'kicks' ? KICKS_RISPOSTE.risposte[L] : BIT_PEW.risposte[L])).replace(/\{(nome|saldo|pagina|scade|quanti|quando)\}/g, (_, k) => String(vals[k])).slice(0, 450);
}
// UNA VALUTA PER PERSONA (docs/COLPI.md, «Su Kick»): la persona di Kick e'
// `k:<id>`, quella di Twitch il suo id. La valuta «da spendere» viene dalla
// persona, mai da altro: i Kicks di chi e' su Kick, i Bit di chi e' su Twitch.
export const personaKick = (id) => (id == null || id === '' ? '' : 'k:' + String(id));
export const valutaDi = (chi) => (String(chi || '').startsWith('k:') ? 'kicks' : 'bit');
export const cfgValuta = (cfg, valuta) => (valuta === 'kicks' ? cfg?.kicksPew : cfg?.bitPew) || normBitPew({});
// le regole di rimborso scritte sulla mira per quella valuta (resa, rendiColpi, rendiMire)
export const regoleMira = (m, valuta) => (valuta === 'kicks'
  ? { resa: Number(m?.prezzi?.k?.resa) || 0, rendiColpi: m?.prezzi?.k?.rendiColpi !== false, rendiMire: m?.prezzi?.k?.rendiMire !== false }
  : { resa: Number(m?.prezzi?.resa) || 0, rendiColpi: m?.prezzi?.rendiColpi !== false, rendiMire: m?.prezzi?.rendiMire !== false });
// la valuta di quello che una mira ha raccolto: scritta al primo versamento (le mire di prima: Bit)
export const valutaMira = (m) => (m?.valuta === 'kicks' ? 'kicks' : 'bit');
// quanto una mira chiede adesso in quella valuta: il resto del modo misto con
// le monete gia' pagate, o il prezzo; 0 se in quella valuta non si paga (o se
// la mira raccoglie gia' nell'altra)
export function serveIn(m, valuta) {
  if (Number(m?.versati) > 0 && valutaMira(m) !== valuta) return 0;
  if (m?.acconto) return m.acconto.modo === valuta ? Number(m.acconto.resto) || 0 : 0;
  return Number(m?.prezzi?.[valuta]) || 0;
}
export const bitResi = (resa, bit) => Math.floor(Math.max(0, Math.trunc(Number(bit) || 0)) * Math.max(0, Number(resa) || 0) / 100);
// I Bit versati su una mira, in ordine di arrivo: [[chi, bit, da]], con `da`
// 'p' per quelli presi dal saldo della pagina. Quelli di troppo sono gli
// ultimi arrivati: si tolgono dalla coda, e tornano a chi li ha mandati.
export function togliUltimi(versanti, quanti) {
  const resto = (Array.isArray(versanti) ? versanti : []).map((v) => [...v]);
  const resi = [];
  let k = Math.max(0, Math.trunc(Number(quanti) || 0));
  while (k > 0 && resto.length) {
    const v = resto[resto.length - 1];
    const n = Math.min(k, Number(v[1]) || 0);
    resi.push([v[0], n, v[2] || '']);
    v[1] = (Number(v[1]) || 0) - n;
    k -= n;
    if (v[1] <= 0) resto.pop();
  }
  return { resto, resi };
}

const formaFrase = (t) => String(t ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
function normPresenza(p) {
  const o = p && typeof p === 'object' ? p : {};
  const comando = String(o.comando || '').toLowerCase().replace(/^!/, '');
  const frase = formaFrase(o.frase).slice(0, 40);
  const x = pct(o.x), y = pct(o.y);
  const buono = COMANDO.test(comando);
  return {
    attiva: o.attiva === true && buono,
    // la vecchia di serie («!pew presente») passa alla nuova; una scritta dallo streamer resta
    frase: frase.length >= 2 && frase !== FRASE_VECCHIA ? frase : PRESENZA.frase,
    comando: buono ? comando : '',
    x: x ?? PRESENZA.x, y: y ?? PRESENZA.y,
    scala: num(o.scala, LIMITI.scala, PRESENZA.scala),
    testo: testo(o.testo, PRESENZA.testo).includes('{nome}') ? testo(o.testo, PRESENZA.testo) : '',
    alMinuto: num(o.alMinuto, PRESENZA.alMinuto, PRESENZA.alMinutoDef),
    // LA SERIE (docs/COLPI.md, «La serie della presenza»): le monete di ogni
    // presenza di fila, gradino per gradino («1, 5, 10, 15»); dopo l'ultimo si
    // resta li' o si ricomincia. Chi salta una diretta riparte dal primo.
    premi: normPremi(o.premi, o.monete),
    dopo: o.dopo === 'ricomincia' ? 'ricomincia' : 'resta',
    // la risposta in chat a chi si presenta: spenta, o col testo dello streamer
    // ({nome}, {serie}, {monete}); vuoto = quella di serie, nella lingua della chat
    rispondi: o.rispondi !== false,
    risposta: testo(o.risposta, 160),
    porta: normPorta(o.porta),
  };
}
const FRASE_VECCHIA = '!pew presente';
// LA PORTA (docs/COLPI.md, «La presenza come porta»): cosa chiede la presenza.
// Accesa di serie; ogni pezzo e' dello streamer.
export const PORTA_GIOCHI = ['blocca', 'libero'];
function normPorta(p) {
  const o = p && typeof p === 'object' ? p : {};
  return {
    attiva: o.attiva !== false,
    monete: o.monete !== false,
    bit: o.bit !== false,
    giochi: PORTA_GIOCHI.includes(o.giochi) ? o.giochi : 'blocca',
    ricorda: o.ricorda !== false,
    testoRicorda: testo(o.testoRicorda, 200),
    conferma: o.conferma !== false,
    testoConferma: testo(o.testoConferma, 160),
  };
}
// Cosa chiede la porta adesso: «monete», «bit» o «giochi».
export function portaChiede(cfg, cosa) {
  const p = cfg?.presenza?.porta;
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
export function testoPorta(cfg, quale, lingua, valori) {
  const p = cfg?.presenza?.porta || {};
  const scritto = quale === 'ricorda' ? p.testoRicorda : p.testoConferma;
  const base = scritto || (PORTA_TESTI[quale][lingua] || PORTA_TESTI[quale].it);
  const parole = PORTA_TESTI.cosa[lingua] || PORTA_TESTI.cosa.it;
  const pezzi = ['monete', 'giochi', 'bit'].filter((k) => portaChiede(cfg, k)).map((k) => parole[k]);
  const cosa = pezzi.length > 1 ? pezzi.slice(0, -1).join(', ') + parole.e + pezzi.at(-1) : pezzi[0] || '';
  const v = { cosa, ...valori };
  return base.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? String(v[k]) : m));
}
function normPremi(premi, vecchio) {
  const grezzi = Array.isArray(premi) ? premi : typeof premi === 'string' ? premi.split(/[\s,;]+/) : [];
  const out = grezzi.map((x) => Math.round(Number(x))).filter((x) => Number.isFinite(x) && x >= 0).slice(0, PRESENZA.gradini).map((x) => Math.min(100_000, x));
  if (!out.length && Number(vecchio) > 0) out.push(Math.min(100_000, Math.round(Number(vecchio))));
  return out.some((x) => x > 0) ? out : [];
}
// Quante monete vale la presenza numero `serie` di fila.
export function premioSerie(p, serie) {
  const g = p?.premi || [];
  const n = Math.max(1, Math.trunc(Number(serie) || 1));
  if (!g.length) return 0;
  return p.dopo === 'ricomincia' ? g[(n - 1) % g.length] : g[Math.min(n, g.length) - 1];
}
// La serie di una persona dopo questa presenza: +1 se l'ultima sua era alla
// diretta subito prima, se no si riparte da 1. `precedente` e' la diretta prima
// di questa nell'elenco delle dirette del canale ('' se non c'e').
export function serieDopo(prima, occasione, precedente) {
  if (prima?.ultima && prima.ultima === occasione) return prima.serie || 1;
  return prima?.ultima && precedente && prima.ultima === precedente ? (prima.serie || 0) + 1 : 1;
}
export const eFrasePresenza = (cfg, messaggio) => !!cfg?.presenza?.attiva && formaFrase(messaggio) === cfg.presenza.frase;
// la frase come porta (docs/COLPI.md, «La presenza come porta»): conta anche
// con l'effetto in diretta spento, se la porta e' accesa
export const eFrasePorta = (cfg, messaggio) => !!(cfg?.presenza?.attiva || cfg?.presenza?.porta?.attiva) && formaFrase(messaggio) === cfg.presenza.frase;
// la frase sull'overlay, col nome: quella dello streamer, o quella di serie
export function frasePresenza(cfg, nome, lingua = 'it', { serie = 1, monete = 0 } = {}) {
  const n = nomeChi(nome);
  if (!n) return '';
  const modello = cfg?.presenza?.testo || PRESENZA.testi[lingua] || PRESENZA.testi.it;
  return riempiPresenza(modello, { nome: n, serie, monete }).slice(0, PRESENZA.testo);
}
// La risposta in chat: quella dello streamer, o quella di serie (con o senza il premio).
export function rispostaPresenza(cfg, nome, lingua = 'it', { serie = 1, monete = 0, moneta = '' } = {}) {
  const p = cfg?.presenza;
  if (!p?.rispondi) return '';
  const r = PRESENZA.risposte[lingua] || PRESENZA.risposte.it;
  const modello = p.risposta || (monete > 0 ? r[0] : r[1]);
  return riempiPresenza(modello, { nome: '@' + nomeChi(nome), serie, monete, moneta });
}
const riempiPresenza = (t, v) => String(t).replace(/\{(nome|serie|monete|moneta)\}/g, (_, k) => String(v[k] ?? ''));

// Il punto e' buono se sta nel quadro e fuori da ogni zona protetta.
export function puntoBuono(cfg, x, y) {
  const px = pct(x), py = pct(y);
  if (px == null || py == null) return { ok: false, motivo: 'punto' };
  for (const z of cfg.zone || []) if (px >= z.x && px <= z.x + z.w && py >= z.y && py <= z.y + z.h) return { ok: false, motivo: 'protetta' };
  return { ok: true, x: px, y: py };
}

export const voceDi = (cfg, id) => (cfg.voci || []).find((v) => v.id === id && v.attiva) || null;
export const prezzoDi = (voce, metodo) => (voce && METODI.includes(metodo) ? Number(voce[metodo]) || 0 : 0);
export const metodiDi = (voce) => METODI.filter((m) => prezzoDi(voce, m) > 0);

// I MODI MISTI (docs/COLPI.md, «I modi misti»): monete del canale piu' Bit, o
// piu' punti canale. Le monete si pagano per prime e restano come acconto
// sulla mira; il resto arriva col cheer o col riscatto del premio misto. Senza
// euro: un pagamento con la carta a meta' aprirebbe rimborsi a meta'.
// LO ZAINO (docs/COLPI.md, «Lo zaino»): un colpo comprato per dopo, che lo
// spettatore ritrova sulla pagina di quel canale e lancia quando vuole. Dello
// streamer: se c'e', con cosa si compra per dopo, quanti a testa (in tutto e
// per colpo), quando scadono (lo stesso orologio dei Bit da spendere, per tutti
// o per colpo), se alla scadenza tornano i saldi, e la risposta a «!pew zaino».
export const ZAINO = Object.freeze({
  con: Object.freeze(['monete', 'bit', 'kicks', 'misto', 'cheer', 'regalo', 'punti', 'euro']), massimo: [0, 1000], risposta: 200,
  modiVoce: Object.freeze(['come', 'no', 'mai', 'dopo']),
  risposte: Object.freeze({ it: '{nome} nel tuo zaino: {elenco}{scade}. Si lanciano da {pagina}', en: '{nome} in your backpack: {elenco}{scade}. Launch them from {pagina}', es: '{nome} en tu mochila: {elenco}{scade}. Se lanzan desde {pagina}' }),
  vuoto: Object.freeze({ it: '{nome} il tuo zaino è vuoto: i colpi per dopo si comprano su {pagina}', en: '{nome} your backpack is empty: buy hits for later on {pagina}', es: '{nome} tu mochila está vacía: los golpes para después se compran en {pagina}' }),
  scadenze: Object.freeze({ it: ' (il primo vale fino al {quando})', en: ' (the first lasts until {quando})', es: ' (el primero vale hasta el {quando})' }),
});
function normZaino(z) {
  const o = z && typeof z === 'object' ? z : {};
  const c = o.con && typeof o.con === 'object' ? o.con : {};
  const sc = normBitPew({ scadenza: o.scadenza }).scadenza;
  return {
    attivo: o.attivo === true,
    con: Object.fromEntries(ZAINO.con.map((k) => [k, c[k] !== false])),
    massimo: num(o.massimo, ZAINO.massimo, 0), massimoVoce: num(o.massimoVoce, ZAINO.massimo, 0),
    scadenza: sc, rendi: o.rendi !== false,
    rispondi: o.rispondi !== false, risposta: testo(o.risposta, ZAINO.risposta), attesaSec: num(o.attesaSec, BIT_PEW.attesaSec, 60),
  };
}
function normZainoVoce(z) {
  const o = z && typeof z === 'object' ? z : {};
  return { modo: ZAINO.modiVoce.includes(o.modo) ? o.modo : 'come', quanti: num(o.quanti, BIT_PEW.quanti, 30), unita: BIT_PEW.unita.includes(o.unita) ? o.unita : 'giorni' };
}
// La scadenza di un colpo comprato per dopo: quella della voce se ne ha una,
// se no quella di tutti. null se la voce non si compra per dopo.
export function zainoDi(cfg, voce) {
  if (!cfg?.zaino?.attivo || !voce || voce.zaino?.modo === 'no') return null;
  const m = voce.zaino?.modo || 'come';
  if (m === 'mai') return { ...cfg.zaino.scadenza, tipo: 'mai' };
  if (m === 'dopo') return { ...cfg.zaino.scadenza, tipo: 'dopo', quanti: voce.zaino.quanti, unita: voce.zaino.unita };
  return cfg.zaino.scadenza;
}
// «!pew zaino»
export const chiedeZaino = (cfg, messaggio) => new RegExp(`^!${cfg?.comando || COMANDO_SERIE}\\s+(zaino|backpack|mochila)\\s*$`, 'i').test(String(messaggio || '').trim());
// DALLA CHAT, NEL PUNTO DELLO STREAMER (docs/COLPI.md): «!pew <colpo> [come]»
// lancia il colpo nel punto della chat (quello del colpo, o quello di tutti) e
// lo paga coi saldi di chi scrive. Lo streamer sceglie i mezzi e il loro ordine,
// e i testi della risposta. Il quadro e' quello dello streamer: la pagina ne
// prende le proporzioni e ci conta i pixel.
export const QUADRO = Object.freeze({ lato: [160, 8192], l: 1920, a: 1080 });
export const CHAT_PEW = Object.freeze({
  mezzi: Object.freeze(['zaino', 'monete', 'bit', 'kicks', 'misto']), modiVoce: Object.freeze(['si', 'punto', 'no']), risposta: 200,
  esiti: Object.freeze(['ok', 'pochi', 'attesa', 'no']),
  risposte: Object.freeze({
    it: Object.freeze({ ok: '{nome} {colpo} lanciato ({prezzo})', pochi: '{nome} per {colpo} servono {serve}: hai {saldo}. Tutto su {pagina}', attesa: '{nome} il prossimo colpo fra {sec} s', no: '{nome} {colpo} adesso non parte: {motivo}' }),
    en: Object.freeze({ ok: '{nome} {colpo} launched ({prezzo})', pochi: '{nome} {colpo} needs {serve}: you have {saldo}. All on {pagina}', attesa: '{nome} next hit in {sec}s', no: '{nome} {colpo} can\'t go now: {motivo}' }),
    es: Object.freeze({ ok: '{nome} {colpo} lanzado ({prezzo})', pochi: '{nome} {colpo} necesita {serve}: tienes {saldo}. Todo en {pagina}', attesa: '{nome} el próximo golpe en {sec} s', no: '{nome} {colpo} ahora no sale: {motivo}' }),
  }),
  perche: Object.freeze({
    it: Object.freeze({ offline: 'la diretta è spenta', overlay: 'l\'overlay non è aperto', pausa: 'i colpi sono in pausa', protetta: 'il punto è in una zona protetta', troppi: 'troppi colpi in questo minuto', mezzo: 'in chat non si paga così', effetto: 'l\'effetto non c\'è più', altro: 'riprova fra poco' }),
    en: Object.freeze({ offline: 'the stream is off', overlay: 'the overlay isn\'t open', pausa: 'hits are paused', protetta: 'the spot is in a protected area', troppi: 'too many hits this minute', mezzo: 'chat can\'t pay that way', effetto: 'the effect is gone', altro: 'try again soon' }),
    es: Object.freeze({ offline: 'el directo está apagado', overlay: 'el overlay no está abierto', pausa: 'los golpes están en pausa', protetta: 'el punto está en una zona protegida', troppi: 'demasiados golpes en este minuto', mezzo: 'en el chat no se paga así', effetto: 'el efecto ya no está', altro: 'inténtalo en un rato' }),
  }),
  zaino: Object.freeze({ it: 'dallo zaino', en: 'from your backpack', es: 'de tu mochila' }),
});
const MEZZI_IN_CHAT = { zaino: 'zaino', backpack: 'zaino', mochila: 'zaino', monete: 'monete', coins: 'monete', monedas: 'monete', bit: 'bit', bits: 'bit', kicks: 'kicks', kick: 'kicks', misto: 'misto', mixed: 'misto', mixto: 'misto' };
const RISERVATE = new Set(['bit', 'bits', 'kicks', 'kick', 'zaino', 'backpack', 'mochila']);
function normQuadro(q) {
  const o = q && typeof q === 'object' ? q : {};
  return { l: num(o.l, QUADRO.lato, QUADRO.l), a: num(o.a, QUADRO.lato, QUADRO.a) };
}
function normChat(c) {
  const o = c && typeof c === 'object' ? c : {};
  const con = Array.isArray(o.con) ? [...new Set(o.con.filter((m) => CHAT_PEW.mezzi.includes(m)))] : [...CHAT_PEW.mezzi];
  const r = o.risposte && typeof o.risposte === 'object' ? o.risposte : {};
  return {
    attivo: o.attivo === true, x: pct(o.x) ?? 50, y: pct(o.y) ?? 50, con,
    rispondi: o.rispondi !== false, attesaSec: num(o.attesaSec, BIT_PEW.attesaSec, 30),
    risposte: Object.fromEntries(CHAT_PEW.esiti.map((k) => [k, testo(r[k], CHAT_PEW.risposta)])),
  };
}
function normChatVoce(c) {
  const o = c && typeof c === 'object' ? c : {};
  return { modo: CHAT_PEW.modiVoce.includes(o.modo) ? o.modo : 'si', x: pct(o.x) ?? 50, y: pct(o.y) ?? 50 };
}
// La parola di un colpo in chat: il suo comando, se non ha gia' un altro
// significato (un codice dentro, che «!pew» paga; «bit»; «zaino»). Se no ''.
export function parolaChat(voce) {
  const w = String(voce?.comando || '').toLowerCase();
  return !w || RISERVATE.has(w) || codiceIn(w) ? '' : w;
}
// «!pew torta» → { voce, con: '' }; «!pew torta monete» → { voce, con: 'monete' }; se no null.
export function lancioInChat(cfg, messaggio) {
  if (!cfg?.chat?.attivo || eFrasePorta(cfg, messaggio)) return null;
  const m = new RegExp(`^!${cfg.comando || COMANDO_SERIE}\\s+(\\S+)(?:\\s+(\\S+))?\\s*$`, 'i').exec(String(messaggio || '').trim());
  if (!m) return null;
  const parola = m[1].toLowerCase();
  const voce = (cfg.voci || []).find((v) => v.attiva && v.chat?.modo !== 'no' && parolaChat(v) === parola);
  const con = m[2] ? MEZZI_IN_CHAT[m[2].toLowerCase()] : '';
  return voce && con !== undefined ? { voce: voce.id, con } : null;
}
export const puntoChat = (cfg, voce) => (voce?.chat?.modo === 'punto' ? { x: voce.chat.x, y: voce.chat.y } : { x: cfg.chat.x, y: cfg.chat.y });
// il prezzo detto in chat: «40 monete», «20 Bit», «10 monete + 30 Bit», «dallo zaino»
export function prezzoChat(lingua, mezzo, { monete = 0, bit = 0, kicks = 0, moneta = '' } = {}) {
  const L = CHAT_PEW.zaino[lingua] ? lingua : 'it';
  if (mezzo === 'zaino') return CHAT_PEW.zaino[L];
  return [monete > 0 ? `${monete} ${moneta}`.trim() : '', bit > 0 ? `${bit} Bit` : '', kicks > 0 ? `${kicks} Kicks` : ''].filter(Boolean).join(' + ');
}
export function rispostaChat(cfg, lingua, esito, v = {}) {
  const L = CHAT_PEW.risposte[lingua] ? lingua : 'it';
  if (!CHAT_PEW.esiti.includes(esito)) return '';
  const vals = { nome: '', colpo: '', prezzo: '', serve: '', saldo: '', sec: '', pagina: '', ...v, motivo: CHAT_PEW.perche[L][v.motivo] || CHAT_PEW.perche[L].altro };
  const t = cfg?.chat?.risposte?.[esito] || CHAT_PEW.risposte[L][esito];
  return String(t).replace(/\{(nome|colpo|prezzo|serve|saldo|sec|pagina|motivo)\}/g, (_, k) => String(vals[k] ?? '')).slice(0, 450);
}
// {elenco}: «2 Pomodoro, 1 Risata»
export function rispostaZaino(cfg, lingua, v = {}) {
  const z = cfg?.zaino || normZaino({});
  const L = ZAINO.risposte[lingua] ? lingua : 'it';
  const elenco = (v.voci || []).map((x) => `${x.quanti} ${x.nome}`).join(', ');
  const scade = v.quanti > 0 && v.quando ? ZAINO.scadenze[L].replace('{quanti}', v.quanti).replace('{quando}', v.quando) : '';
  const vals = { nome: v.nome || '', elenco, pagina: v.pagina || '', scade, quanti: v.quanti || 0, quando: v.quando || '' };
  const t = !elenco ? ZAINO.vuoto[L] : (z.risposta || ZAINO.risposte[L]);
  return String(t).replace(/\{(nome|elenco|pagina|scade|quanti|quando)\}/g, (_, k) => String(vals[k])).slice(0, 450);
}

export const MISTI = Object.freeze(['bit', 'punti', 'kicks']);
function normMisti(m) {
  const o = m && typeof m === 'object' ? m : {};
  const out = {};
  for (const k of MISTI) {
    const monete = prezzo(o[k]?.monete, LIMITI.monete), resto = prezzo(o[k]?.[k], LIMITI[k]);
    if (monete && resto) out[k] = { monete, [k]: resto };
  }
  return out;
}
// [{ modo, monete, resto }] dei modi misti di una voce
export const mistiDi = (voce) => MISTI.filter((k) => voce?.misti?.[k]).map((k) => ({ modo: k, monete: voce.misti[k].monete, resto: voce.misti[k][k] }));
// I Bit che una mira chiede adesso: quelli del modo misto se le monete sono
// gia' pagate, quelli del prezzo se no; 0 se coi Bit non si paga (un acconto
// per i punti chiude la strada dei Bit).
export const bitServe = (m) => serveIn(m, 'bit');

// Almeno una cifra e una lettera: una parola vera del messaggio («danke»,
// «ciaoo») non e' mai un codice, perche' le parole non hanno cifre.
const formaCodice = (c) => /\d/.test(c) && /[A-Z]/.test(c);
export function nuovoCodice(casuale = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n))) {
  for (;;) {
    const b = casuale(LUNGHEZZA_CODICE);
    let s = '';
    for (let i = 0; i < LUNGHEZZA_CODICE; i++) s += ALFABETO[b[i] % ALFABETO.length];
    if (formaCodice(s)) return s;
  }
}

// Il codice dentro un testo (il messaggio del cheer, l'input del premio): una
// parola di cinque caratteri dell'alfabeto con almeno una cifra, ovunque,
// maiuscole o minuscole. «Cheer100 danke k7qx3!» → 'K7QX3'. Il primo che c'e'.
export function codiceIn(testoLibero) {
  const re = new RegExp(`(?:^|[^A-Za-z0-9])([${ALFABETO}${ALFABETO.toLowerCase()}]{${LUNGHEZZA_CODICE}})(?![A-Za-z0-9])`);
  const t = String(testoLibero || '');
  for (let m, da = 0; (m = re.exec(t.slice(da))); da += m.index + m[0].length) {
    const c = m[1].toUpperCase();
    if (formaCodice(c)) return c;
  }
  return '';
}

// Il nome che si legge sull'overlay: corto, senza a capo, senza link.
export function nomeChi(nome) {
  const n = testo(nome, LIMITI.chi).replace(/https?:\/\/\S+/gi, '').replace(/\s+/g, ' ').trim();
  return n || '';
}

// Il pagamento basta? Il prezzo scritto nella mira, nella sua moneta.
export function bastaPer(mira, metodo, pagato) {
  if (!mira) return false;
  const serve = Number(mira.prezzi?.[metodo]) || 0;
  return serve > 0 && Number(pagato) >= serve;
}

// IL LINK IN CHAT DA SOLO (docs/COLPI.md, «Il link in chat da solo»): ogni
// ogniMin minuti, in diretta, e solo se la chat si e' mossa (messaggi).
export const ANNUNCIO = Object.freeze({
  ogniMin: [5, 240], ogniMinDef: 20, messaggi: [0, 500], messaggiDef: 10,
  testi: Object.freeze({
    it: 'Colpisci la diretta: scegli un effetto, mira un punto e fallo comparire col tuo nome → {pagina}',
    en: 'Hit the stream: pick an effect, aim at a spot and make it appear with your name → {pagina}',
    es: 'Golpea el directo: elige un efecto, apunta a un punto y haz que aparezca con tu nombre → {pagina}',
  }),
});
function normAnnuncio(a) {
  const o = a && typeof a === 'object' ? a : {};
  const p = o.piattaforme && typeof o.piattaforme === 'object' ? o.piattaforme : {};
  return {
    attivo: o.attivo !== false,
    ogniMin: num(o.ogniMin, ANNUNCIO.ogniMin, ANNUNCIO.ogniMinDef),
    messaggi: num(o.messaggi, ANNUNCIO.messaggi, ANNUNCIO.messaggiDef),
    piattaforme: { twitch: p.twitch !== false, kick: p.kick !== false },
    testo: testo(o.testo, 200),
  };
}
// E' ora? `st`: { inizio, ultimo, messaggi } di quel canale su quella
// piattaforma, da quando e' in onda. Il primo dopo ogniMin dall'inizio.
export function annuncioDovuto(cfg, piattaforma, st, ora) {
  const a = cfg?.annuncio;
  if (!cfg?.attivo || cfg.pausa || !a?.attivo || !a.piattaforme?.[piattaforma] || !st) return false;
  const da = st.ultimo > 0 ? st.ultimo : Number.isFinite(st.inizio) ? st.inizio : null;
  return da !== null && ora - da >= a.ogniMin * 60_000 && (Number(st.messaggi) || 0) >= a.messaggi;
}
export function testoAnnuncio(cfg, lingua, valori) {
  const base = cfg?.annuncio?.testo || ANNUNCIO.testi[lingua] || ANNUNCIO.testi.it;
  return base.replace(/\{(\w+)\}/g, (m, k) => (valori[k] != null ? String(valori[k]) : m)).slice(0, 400);
}
export const PREMI_MODI = ['auto', 'colpo', 'prezzo'];
// Il premio a punti canale di una voce: il nome come lo vede chi riscatta.
export const titoloPremio = (voce) => ('Colpo: ' + voce.nome).slice(0, 45);
// il premio del modo misto coi punti: un nome suo (Twitch li vuole diversi)
export const titoloPremioMisto = (voce) => ('Colpo: ' + voce.nome).slice(0, 35) + ' + monete';
// il premio di un prezzo, condiviso dalle voci che costano tanto
export const titoloPremioPrezzo = (punti) => 'Colpo da ' + punti;
export const titoloPremioPrezzoMisto = (punti) => 'Colpo da ' + punti + ' + monete';

// Il listino che arriva dal pannello, coi campi del premio presi da quello
// salvato: l'id del premio, su Twitch e su Kick, lo scrive solo SocialBot.
// Tutti i campi dei premi, in un elenco solo: uno dimenticato qui sarebbe un
// premio che ogni salvataggio scorda, e che resta orfano sulla piattaforma.
export const CAMPI_PREMIO = Object.freeze(['premio', 'premioCosto', 'premioNome', 'premioMisto', 'premioMistoCosto', 'premioMistoNome', 'premioKick', 'premioKickCosto', 'premioKickNome']);
export function normColpi(nuovo, prima) {
  const p = normalizza(prima), n = normalizza(nuovo);
  for (const v of n.voci) {
    const q = p.voci.find((x) => x.id === v.id);
    for (const k of CAMPI_PREMIO) v[k] = q ? q[k] : (typeof v[k] === 'number' ? 0 : '');
  }
  return n;
}
