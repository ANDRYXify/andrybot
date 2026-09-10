// battute-motore.js — costruisce battute invece di chiederle.
//
// PERCHE' UN MOTORE E NON UN PROMPT. Prima qui c'era una richiesta libera al
// cervello: «inventa una battuta». Chiedi e speri — nessuna materia del canale,
// nessuna forma, nessun vaglio, nessuna scelta fra alternative. Quello che esce
// somiglia a una battuta perche' ha la forma di una frase, non perche' dentro ci
// sia il meccanismo che fa ridere.
//
// IL MECCANISMO, DAGLI STUDI VERI.
//
//  1. McGraw & Warren (Psychological Science, 2010): fa ridere cio' che e'
//     insieme una VIOLAZIONE (qualcosa non e' come dovrebbe) e BENIGNO, e le due
//     letture devono stare in piedi insieme. Le tre condizioni che rendono benigna
//     una violazione: una norma alternativa, un impegno debole verso la norma
//     violata, o distanza. Da qui la cosa piu' importante di questo file: la meta'
//     «benigna» e' PARTE della definizione. Cio' che fa ridere e' la stessa cosa
//     che tiene la battuta pulita — non un filtro appiccicato dopo.
//  2. JAPE (Binsted, Pain & Ritchie): uno SCHEMA formale su risorse vere produce
//     testi che i bambini distinguono dai non-testi e trovano piu' divertenti dei
//     non-testi. Uno schema e' deterministico, istantaneo e non chiede un modello:
//     se il cervello e' spento, il motore lavora lo stesso.
//  3. «Humor Is an Audience» (SemEval-2026): il divertente non e' una proprieta'
//     del testo, e' una preferenza di UN pubblico. Noi quella preferenza la
//     misuriamo gia': `battute.risate`, contate dalla chat vera.
//
// PERCIO' GLI SCHEMI SONO DATI, NON TESTO. Ognuno dichiara l'opposizione che usa,
// la norma che viola e il bersaglio: il vaglio puo' controllarli invece di
// indovinarli leggendo il testo. E la DISTANZA non e' un controllo: e' una
// garanzia di costruzione — la materia contiene solo fatti del canale (numeri
// gia' pubblici in chat), mai persone, quindi non c'e' nessuno da colpire.
import { contatori, battute } from '../db.js';
import { makeLog } from '../logger.js';

const log = makeLog('battute-motore');

// Le uniche norme che gli schemi possono violare: cose a cui si tiene poco, che e'
// la seconda condizione di McGraw & Warren. Una norma pesante non fa una battuta
// audace, fa un'altra cosa — e non e' questo il posto.
const NORME_LEGGERE = new Set([
  'abilità nel gioco', 'ottimismo', 'statistica', 'il tempo che passa', 'la fortuna',
]);

// Il bersaglio non e' mai una persona che guarda. Lo streamer si prende in giro da
// se' per mestiere; uno spettatore no, e non l'ha chiesto.
const BERSAGLI = new Set(['situazione', 'streamer', 'bot']);

// determinismo: la variante si sceglie con un'impronta, non con un dado. Stessa
// materia, stessa battuta — cosi' si puo' provare, e due canali diversi non
// ricevono la stessa frase.
function impronta(s) {
  let h = 2166136261;
  for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
const scegliVariante = (varianti, chiave) => varianti[impronta(chiave) % varianti.length];

// L'ETICHETTA LA SCRIVE LO STREAMER: puo' essere maschile, femminile, singolare,
// plurale, o una parola inventata. Percio' nessuna frase qui dentro si accorda con
// lei — mai un verbo o un aggettivo che dipenda dal suo genere. Quando serve un
// soggetto, il soggetto e' «il contatore», che e' una parola NOSTRA e sta ferma.
// Questo non lo prende nessun cancello: si vede leggendo, e infatti e' stato letto.
const Etichetta = (c) => {
  const t = String(c.etichetta || c.comando || '').trim();
  return t ? t[0].toUpperCase() + t.slice(1) : '';
};
const minuscola = (c) => String(c.etichetta || c.comando || '').trim().toLowerCase();
// la soglia tonda subito sopra: serve all'iperbole per esagerare da un numero VERO
const prossimaTonda = (n) => {
  const passi = [5, 10, 25, 50, 100, 250, 500, 1000];
  return passi.find((p) => p > n) || (Math.ceil(n / 1000) + 1) * 1000;
};

export const SCHEMI = [
  {
    nome: 'atteso-reale',
    opposizione: 'quello che si dice / quello che dice il registro',
    norma: 'abilità nel gioco',
    bersaglio: 'situazione',
    costruisci: (m) => m.contatori.filter((c) => c.valore >= 1).map((c) => ({
      chiave: `atteso-reale:${c.comando}`,
      testo: scegliVariante([
        `Oggi si va lisci, è stato detto. ${Etichetta(c)}: ${c.valore}. Il contatore non ha motivo di mentire.`,
        `«Stavolta ci siamo.» ${Etichetta(c)}: ${c.valore}. Una delle due frasi è vera, e non è la prima.`,
        `Il piano era semplice. Il contatore ${minuscola(c)} dice ${c.valore}. Il piano resta semplice, cambia il risultato.`,
      ], `atteso-reale:${c.comando}:${c.valore}`),
    })),
  },
  {
    nome: 'iperbole-misurata',
    opposizione: 'numero vero / conseguenza assurda',
    norma: 'il tempo che passa',
    bersaglio: 'situazione',
    costruisci: (m) => m.contatori.filter((c) => c.valore >= 3).map((c) => {
      const t = prossimaTonda(c.valore);
      return {
        chiave: `iperbole:${c.comando}`,
        testo: scegliVariante([
          `${Etichetta(c)}: ${c.valore}. Ancora ${t - c.valore} e il contatore chiede le ferie.`,
          `${Etichetta(c)} a ${c.valore}. A ${t} scatta il diritto a una targa commemorativa.`,
          `${Etichetta(c)}: ${c.valore}. Il record precedente resiste, ma ha smesso di guardare.`,
        ], `iperbole:${c.comando}:${c.valore}`),
      };
    }),
  },
  {
    nome: 'falsa-causa',
    opposizione: 'causa vera / colpevole comodo',
    norma: 'la fortuna',
    bersaglio: 'situazione',
    costruisci: (m) => m.contatori.filter((c) => c.valore >= 2).map((c) => ({
      chiave: `falsa-causa:${c.comando}`,
      testo: scegliVariante([
        `${c.valore} ${minuscola(c)}. Colpa del lag. Il lag stasera è a casa sua, ma la colpa resta sua.`,
        `${c.valore} ${minuscola(c)}. Nessuna colpa nostra, sia chiaro: abbiamo controllato tutto, due volte.`,
        `${c.valore} ${minuscola(c)}. La causa è sotto indagine. L'indagine è ferma perché sa già come finisce.`,
      ], `falsa-causa:${c.comando}:${c.valore}`),
    })),
  },
  {
    nome: 'definizione-capovolta',
    opposizione: 'unità di misura / cosa misura davvero',
    norma: 'ottimismo',
    bersaglio: 'situazione',
    costruisci: (m) => m.contatori.filter((c) => c.valore >= 1).map((c) => ({
      chiave: `definizione:${c.comando}`,
      testo: scegliVariante([
        `${Etichetta(c)}, sostantivo: unità di misura dell'ottimismo. Sale solo quando l'ottimismo scende.`,
        `${Etichetta(c)}, sostantivo: la distanza fra come pensavamo di giocare e come stiamo giocando. Oggi: ${c.valore}.`,
      ], `definizione:${c.comando}:${c.valore}`),
    })),
  },
  {
    // Due numeri accostati non sono una battuta: manca l'opposizione, e la teoria
    // dice che senza violazione non c'e' niente da ridere. La violazione qui e' il
    // RAPPORTO: quando uno e' molte volte l'altro, la proporzione che ci si
    // aspetta salta. Percio' questo schema tace finche' i numeri non sono assurdi.
    nome: 'rapporto-assurdo',
    opposizione: 'la proporzione che ci si aspetta / quella che c\'è',
    norma: 'statistica',
    bersaglio: 'situazione',
    costruisci: (m) => {
      const c = m.contatori.filter((x) => x.valore >= 1);
      const fuori = [];
      for (let i = 0; i + 1 < c.length; i++) {
        const [a, b] = [c[i], c[i + 1]];
        const r = Math.floor(a.valore / b.valore);
        if (r < 3) continue;                        // proporzione normale: niente da dire
        fuori.push({
          chiave: `rapporto:${a.comando}:${b.comando}`,
          testo: `${Etichetta(a)}: ${a.valore}. ${Etichetta(b)}: ${b.valore}. Fa ${r} a 1, e il ${r} sta dalla parte sbagliata.`,
        });
      }
      return fuori;
    },
  },
];

// LA MATERIA. Solo fatti di QUESTO canale, e solo numeri gia' pubblici in chat:
// una violazione fa ridere se la norma e' condivisa, e qui dentro non entra
// nessuna persona — e' cosi' che la distanza e' garantita invece che controllata.
export function materia(canale) {
  try {
    const cont = contatori.list(canale) || [];
    return {
      contatori: cont
        .map((c) => ({ comando: c.comando, etichetta: c.etichetta, valore: Number(c.valore) || 0 }))
        .filter((c) => c.valore > 0)
        .sort((a, b) => b.valore - a.valore),
    };
  } catch (e) { log.debug('materia:', e?.message || e); return { contatori: [] }; }
}

// IL VAGLIO. Non e' un filtro di parolacce: e' la seconda meta' della definizione.
// Chi non passa non e' «scorretto», non e' una BATTUTA — ed e' la ragione onesta.
export function vaglio(schema) {
  if (!schema) return { ok: false, perche: 'nessuno schema' };
  if (!NORME_LEGGERE.has(schema.norma)) {
    return { ok: false, perche: `viola una norma a cui si tiene: «${schema.norma}»` };
  }
  if (!BERSAGLI.has(schema.bersaglio)) {
    return { ok: false, perche: `bersaglio non ammesso: «${schema.bersaglio}»` };
  }
  return { ok: true };
}

// Quanto ha fatto ridere QUESTO schema su QUESTO canale. Non un'opinione: le
// risate contate dalla chat vera. Uno schema mai provato parte a meta' strada —
// abbastanza per avere una possibilita', non tanto da battere chi ha gia' vinto.
export function presaDelloSchema(canale, nome) {
  try {
    const s = battute.perSchema(canale, nome);
    if (!s || !s.dette) return 0.5;
    return s.risate / s.dette;
  } catch (e) { log.debug('presa:', e?.message || e); return 0.5; }
}

// I CANDIDATI: tutti quelli che la materia permette, gia' vagliati.
export function candidati(canale) {
  const m = materia(canale);
  const fuori = [];
  for (const schema of SCHEMI) {
    const v = vaglio(schema);
    if (!v.ok) { log.info(`schema «${schema.nome}» scartato: ${v.perche}`); continue; }
    let pezzi = [];
    try { pezzi = schema.costruisci(m) || []; }
    catch (e) { log.debug(`schema ${schema.nome}:`, e?.message || e); continue; }
    for (const p of pezzi) {
      const testo = String(p.testo || '').replace(/\s+/g, ' ').trim();
      if (testo.length < 12 || testo.length > 280) continue;
      fuori.push({ testo, schema: schema.nome, chiave: p.chiave });
    }
  }
  return fuori;
}

// LA SCELTA. Non la prima che capita: la migliore secondo il pubblico di QUESTO
// canale. A parita' di presa vince quella che il canale non ha gia' sentito.
export function costruisci(canale) {
  const cands = candidati(canale);
  if (!cands.length) return null;
  const gia = new Set();
  try {
    for (const b of battute.list(canale) || []) {
      gia.add(String(b.testo || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim());
    }
  } catch { /* serbatoio non leggibile: si sceglie lo stesso, senza il ripasso */ }
  const norm = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const nuovi = cands.filter((c) => !gia.has(norm(c.testo)));
  const pool = nuovi.length ? nuovi : cands;
  let meglio = null;
  for (const c of pool) {
    const punteggio = presaDelloSchema(canale, c.schema);
    if (!meglio || punteggio > meglio.punteggio) meglio = { ...c, punteggio };
  }
  return meglio;
}
