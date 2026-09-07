// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// I GRUPPI: chi è arrivato INSIEME, e chi c'era per caso.
//
// Il difetto che chiude, ed è misurato. Quando un'ondata viene giudicata
// artificiale, lo scudo prende tutta la finestra — e dentro la finestra ci sono
// anche le persone vere capitate in mezzo. Sullo scenario «duecento bot e
// quaranta persone insieme»: quaranta persone su quaranta bloccate, precisione
// 83%. Il giudizio sulla cadenza vale sull'INSIEME e non dice niente sul
// singolo: interlacciati, i loro intervalli sono identici.
//
// Serve un segnale sul singolo, e deve essere gratis: durante un'ondata ogni
// chiamata a Twitch per account amplificherebbe l'attacco. Quello che abbiamo
// in mano senza chiedere niente a nessuno è il NOME.
//
// I follow-bot si generano in blocco, quindi i nomi hanno la stessa fabbrica:
// stessa forma, spesso stesso inizio. Le persone no — «pierpa_gaming», «martuxx»,
// «elezz22832» non si somigliano fra loro più di quanto somiglino a chiunque.
//
// DUE CHIAVI, e si prende quella che raggruppa meglio:
//
//   LA FORMA   ogni lettera diventa `a`, ogni gruppo di cifre `#`, il resto
//              resta com'è. «zzq0x0» e «zzq12x7» diventano tutti e due «aaa#a#».
//   L'INIZIO   i primi tre caratteri. Una fabbrica di nomi parte quasi sempre
//              dallo stesso pezzo.
//
// E LA REGOLA È PRUDENTE DA UNA PARTE SOLA. Se un gruppo copre la maggioranza
// dell'ondata, si tocca solo quel gruppo: chi non ci sta è probabilmente
// passato di lì per caso. Se invece non si riconosce nessun gruppo — un
// attaccante che usa nomi tutti diversi — non si finge di saperlo: si torna a
// trattare l'ondata come una cosa sola, perché lì l'errore da evitare è
// lasciarla passare.
//
// Il modello per esteso: docs/GRUPPI.md.

const norm = (s) => String(s || '').toLowerCase().trim();

// Quanto deve coprire un gruppo per poter dire «l'ondata è questa».
export const MAGGIORANZA = 0.5;
// Sotto questo numero di account non si parla di gruppi: tre nomi che si
// somigliano sono un caso, non una fabbrica.
export const MINIMO = 8;

// La forma di un nome: lettere in `a`, cifre in `#` (una o più, collassate),
// tutto il resto com'è. Collassare le cifre è quello che fa convergere i nomi
// di una stessa infornata, che si distinguono solo per il contatore.
export function forma(login) {
  return norm(login)
    .replace(/[a-zà-ÿ]/g, 'a')
    .replace(/\d+/g, '#')
    .slice(0, 32);
}

export const inizio = (login, quanti = 3) => norm(login).slice(0, quanti);

// Le chiavi con cui si prova a raggruppare. Se domani se ne aggiunge una terza,
// entra qui e tutto il resto continua a funzionare.
export const CHIAVI = {
  forma: (v) => forma(v.login),
  inizio: (v) => inizio(v.login),
};

// Il gruppo più grosso, per ciascuna chiave, e poi il migliore fra quelli.
// Ritorna null se non c'è niente che meriti di essere chiamato gruppo.
export function dominante(voci, { maggioranza = MAGGIORANZA, minimo = MINIMO } = {}) {
  const buone = (voci || []).filter((v) => v && norm(v.login));
  if (buone.length < minimo) return null;

  let migliore = null;
  for (const [nome, chiaveDi] of Object.entries(CHIAVI)) {
    const conti = new Map();
    for (const v of buone) {
      const k = chiaveDi(v);
      if (!k) continue;
      const gia = conti.get(k) || [];
      gia.push(v);
      conti.set(k, gia);
    }
    for (const [k, membri] of conti) {
      if (!migliore || membri.length > migliore.membri.length) migliore = { chiave: nome, valore: k, membri };
    }
  }
  if (!migliore) return null;
  const frazione = migliore.membri.length / buone.length;
  if (frazione < maggioranza) return null;
  return {
    chiave: migliore.chiave, valore: migliore.valore,
    quanti: migliore.membri.length, su: buone.length,
    frazione: +frazione.toFixed(3),
    dentro: new Set(migliore.membri.map((v) => norm(v.login))),
    motivo: `${migliore.membri.length} nomi su ${buone.length} dalla stessa fabbrica (${migliore.chiave} «${migliore.valore}»)`,
  };
}

// Questo nome viene dalla stessa fabbrica del gruppo? Serve per i follow che
// arrivano DOPO che il gruppo e' stato riconosciuto: uno per volta non si puo'
// raggruppare niente, ma si puo' chiedere se somiglia a quelli di prima.
export function appartiene(login, gruppo) {
  if (!gruppo?.chiave || !CHIAVI[gruppo.chiave]) return false;
  return CHIAVI[gruppo.chiave]({ login: norm(login) }) === gruppo.valore;
}

// Chi dell'ondata va toccato. Col gruppo riconosciuto si tocca solo il gruppo;
// senza, si torna a trattare l'ondata come una cosa sola.
export function daToccare(voci, opzioni) {
  const g = dominante(voci, opzioni);
  if (!g) return { voci, gruppo: null, risparmiati: 0 };
  const dentro = voci.filter((v) => g.dentro.has(norm(v.login)));
  return { voci: dentro, gruppo: g, risparmiati: voci.length - dentro.length };
}
