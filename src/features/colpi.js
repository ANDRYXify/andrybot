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
export const METODI = Object.freeze(['euro', 'punti', 'bit', 'monete']);
export const LIMITI = Object.freeze({ voci: 20, zone: 8, nome: 40, chi: 25, attesaSec: [0, 600], alMinuto: [1, 60], scala: [20, 300], euroCent: [50, 50_000], punti: [1, 1_000_000], bit: [1, 100_000], monete: [1, 10_000_000], categorie: 10, categoria: 30 });
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
      euro: prezzo(v.euro, LIMITI.euroCent), punti: prezzo(v.punti, LIMITI.punti), bit: prezzo(v.bit, LIMITI.bit),
      scala: num(v.scala, LIMITI.scala, 100), attiva: v.attiva !== false,
      monete: prezzo(v.monete, LIMITI.monete),
      misti: normMisti(v.misti),
      premioMisto: /^[0-9a-f-]{8,64}$/.test(String(v.premioMisto || '')) ? String(v.premioMisto) : '',
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
    presenza: normPresenza(o.presenza),
    bitPew: normBitPew(o.bitPew),
  };
}

// LA PRESENZA (docs/COLPI.md, «La presenza»): chi scrive in chat la frase dello
// streamer fa comparire in diretta il SUO effetto, nel SUO punto, col nome.
// Gratis, una volta per diretta. La frase si confronta intera, senza badare a
// maiuscole e spazi: «!pew presente» vale, «ciao !pew presente» no. Accesa vuol
// dire anche «pronta»: senza un effetto non si accende.
export const PRESENZA = Object.freeze({
  frase: '!pew presente', x: 12, y: 82, scala: 100, alMinuto: [1, 30], alMinutoDef: 6, testo: 60, gradini: 30,
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
const MODI_IN_CHAT = { bit: 'bit', bits: 'bit', punti: 'punti', points: 'punti', puntos: 'punti' };
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

// I BIT DA SPENDERE (docs/COLPI.md, «I Bit da spendere»): i Bit mandati al
// canale che non pagano un colpo diventano Bit da spendere sulla pagina, `resa`
// per cento (100: pari). Un Bit vale una volta: o paga un colpo, o diventa
// saldo, mai le due cose.
export const BIT_PEW = Object.freeze({ resa: [1, 1000] });
function normBitPew(b) {
  const o = b && typeof b === 'object' ? b : {};
  return { attivo: o.attivo !== false, resa: num(o.resa, BIT_PEW.resa, 100) };
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
    frase: frase.length >= 2 ? frase : PRESENZA.frase,
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
  };
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
export const MISTI = Object.freeze(['bit', 'punti']);
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
export function bitServe(m) {
  if (m?.acconto) return m.acconto.modo === 'bit' ? Number(m.acconto.resto) || 0 : 0;
  return Number(m?.prezzi?.bit) || 0;
}

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

// Il premio a punti canale di una voce: il nome come lo vede chi riscatta.
export const titoloPremio = (voce) => ('Colpo: ' + voce.nome).slice(0, 45);
// il premio del modo misto coi punti: un nome suo (Twitch li vuole diversi)
export const titoloPremioMisto = (voce) => ('Colpo: ' + voce.nome).slice(0, 35) + ' + monete';

// Il listino che arriva dal pannello, coi campi del premio presi da quello
// salvato: l'id del premio su Twitch lo scrive solo SocialBot.
export function normColpi(nuovo, prima) {
  const p = normalizza(prima), n = normalizza(nuovo);
  for (const v of n.voci) {
    const q = p.voci.find((x) => x.id === v.id);
    Object.assign(v, q ? { premio: q.premio, premioCosto: q.premioCosto, premioNome: q.premioNome, premioMisto: q.premioMisto, premioMistoCosto: q.premioMistoCosto, premioMistoNome: q.premioMistoNome }
      : { premio: '', premioCosto: 0, premioNome: '', premioMisto: '', premioMistoCosto: 0, premioMistoNome: '' });
  }
  return n;
}
