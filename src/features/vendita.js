// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL BOT DEI CONSIGLI (docs/SCUDO.md, «Il bot dei consigli: chi vende viewer e
// follower»). Puro: un testo e il suo contesto → un punteggio coi motivi.
//
// Il bot dei consigli scrive messaggi puliti per la forma (niente link vero,
// niente maiuscole, niente flood): quello che lo tradisce e' il CONTENUTO. Gli
// indizi da soli non bastano — «quanti viewer fai?» e' una domanda normale —,
// insieme si'. Prima si toglie il travestimento, poi si contano.

// Lettere di altri alfabeti che a occhio sembrano latine: il travestimento
// classico per far passare «vіewers» (con la і ucraina) da un filtro di parole.
const SOSIA = {
  а: 'a', в: 'b', е: 'e', ё: 'e', к: 'k', м: 'm', н: 'h', о: 'o', р: 'p', с: 'c', т: 't', у: 'y', х: 'x', і: 'i', ї: 'i', ј: 'j', ѕ: 's', ԁ: 'd', ɡ: 'g', ʏ: 'y',
  α: 'a', ε: 'e', ι: 'i', κ: 'k', ν: 'v', ο: 'o', ρ: 'p', τ: 't', υ: 'u', χ: 'x',
};
// Il testo come lo leggerebbe una persona: minuscolo, senza accenti, senza
// invisibili, coi sosia rimessi a posto e le lettere staccate riattaccate
// («s t r e a m b o o» → «streamboo»).
export function senzaTravestimento(testo) {
  let t = String(testo || '').normalize('NFKC').toLowerCase();
  t = t.replace(/[​-‏⁠-⁤﻿­]/g, '');
  t = [...t].map((c) => SOSIA[c] || c).join('');
  t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
  t = t.replace(/\b(?:[a-z0-9] ){4,}[a-z0-9]\b/g, (m) => m.replace(/ /g, ''));
  return t.replace(/\s+/g, ' ').trim();
}

// I servizi che vendono viewer, follower e chat finti: il nome basta (con un
// discorso di vendita intorno, e' certo).
export const SERVIZI = /\b(streamboo|bigfollows|streamrise|hitfollow|followerclub|viewerlabs|dogehype|streamboost|twitchboost|viewbot(?:ting)?|viewerbot|followbot|nezhna|streamlabz|smmpanel|smm ?panel|growtwitch|buyviewers|twitchviewers)\b/;
// Un dominio travestito: il punto scritto in un altro modo, o con spazi
// intorno, che e' l'unico modo di far passare un indirizzo da un filtro dei link.
// Col punto scritto a parole o fra parentesi vale ogni finale; col punto vero
// staccato da uno spazio solo i finali che in una frase non ci sono: «finito.
// com'e'?», «basta. io vado», «che partita. gg» sono punteggiatura, non indirizzi.
const FINALI = 'com|net|org|ru|xyz|shop|store|site|online|top|pro|io|gg|me|cc|biz|tv|live|club|vip|fun|space|website|app';
const FINALI_NETTI = 'com|net|org|ru|xyz|cc|biz';
const DOPO = "(?![a-z0-9'’])";
const TRAVESTITO = new RegExp(`\\b[a-z0-9][a-z0-9-]{2,}(?:\\s*(?:\\(\\s*(?:\\.|dot|punto)\\s*\\)|\\[\\s*(?:\\.|dot|punto)\\s*\\]|\\{\\s*(?:\\.|dot)\\s*\\})\\s*|\\s(?:dot|punto|punkt)\\s|\\s*。\\s*)(?:${FINALI})${DOPO}|\\b[a-z0-9][a-z0-9-]{2,}(?:\\s\\.\\s?|\\.\\s)(?:${FINALI_NETTI})${DOPO}`);
const TOGLI_SPAZI = /\b(remove|delete|without|no) (the )?spaces?\b|\btogli(endo)? (gli |lo )?spazi\b|\bsenza (gli )?spazi\b|\b(quita|sin) (los )?espacios\b/;

// Le parti di un discorso di vendita, in italiano, inglese e spagnolo.
// (non «prime» da solo, che in italiano e' «le prime volte»)
const COSA = /\b(viewers?|viewer ?bots?|followers?|follows|spettator[ei]|seguaci|seguidores|espectadores|iscritti|prime subs?|twitch prime|views|visualizzazioni|chatters|chat ?bots?|live viewers|real viewers)\b/;
// L'offerta in due misure. Vendere (compra, prezzo, sconto, «100% reali») e'
// gia' un'offerta; crescere (crescere, promuovere, boost) lo dice anche uno
// streamer piccolo che cerca amici, e da solo col suo Discord non e' vendita.
// (non «sale», che in italiano e' «il livello sale»)
const VENDE = /\b(buy|cheap|cheapest|price|prices|pricing|discount|offer|sell|selling|compra(re|te)?|economic[oi]|prezz[oi]|scont[oi]|offert[ae]|comprar|barat[oa]s?|precios?|ofertas?|100 ?% ?(real|reali|reales|safe)|real (and|&) active|guaranteed|garantit[oi])\b/;
const SPINGE = /\b(promo|promotion|promote|promoting|boost|boosting|grow|growth|gain|promozione|promuov\w*|crescere|crescita|aumentare|promocion|crecer)\b/;
const CONTATTO = /\b(dm me|dm|message me|text me|write me|contact me|add me|reach me|scrivimi|contattami|mandami un messaggio|aggiungimi|escribeme|contactame|discord|telegram|whatsapp|wa\.me|t\.me|my bio|in bio|nel mio profilo|check my profile|my profile)\b/;
const COPIONE = /\b(i (just )?(noticed|came across|found|saw) your (channel|stream|content)|your (stream|channel|content) (is|looks) (great|awesome|amazing|nice)|you have (a lot of |great )?potential|small streamers?|ho notato il tuo canale|ho visto il tuo canale|hai (del |molto )?potenziale|tu canal tiene potencial|vi tu canal|(wanna|want to) (become|be) famous|vuoi diventare famos[oa]|quieres ser famos[oa])\b/;

// I nomi che aggiunge lo streamer (ne nascono di nuovi ogni mese): lettere,
// cifre e trattini, letti come il testo, cioe' senza travestimento. Nient'altro
// passa, quindi il nome entra in un'espressione cosi' com'e'.
export const nomeServizio = (n) => senzaTravestimento(n).replace(/[^a-z0-9-]/g, '');
const SERVIZIO_MIN = 3, SERVIZIO_MAX = 40;
export const servizioValido = (n) => n.length >= SERVIZIO_MIN && n.length <= SERVIZIO_MAX;

// → { punti, motivi, livello: 'certo' | 'probabile' | '' }
// `primo`: e' il suo primo messaggio in questo canale; `servizi`: i nomi in
// piu' dello streamer, che valgono come quelli dell'elenco.
export function giudicaVendita(testo, { primo = false, servizi = [] } = {}) {
  const t = senzaTravestimento(testo);
  const motivi = [];
  let punti = 0;
  const suoi = (Array.isArray(servizi) ? servizi : []).map(nomeServizio).filter(servizioValido);
  const dominio = TRAVESTITO.test(t), spazi = TOGLI_SPAZI.test(t);
  const servizio = SERVIZI.test(t) || suoi.some((n) => new RegExp(`(?<![a-z0-9])${n}(?![a-z0-9])`).test(t));
  const cosa = COSA.test(t), vende = VENDE.test(t), spinge = SPINGE.test(t), contatto = CONTATTO.test(t), copione = COPIONE.test(t);
  const offerta = vende || spinge;
  if (dominio) { punti += 60; motivi.push('indirizzo travestito'); }
  if (spazi) { punti += 40; motivi.push('«togli gli spazi»'); }
  if (servizio) { punti += 60; motivi.push('servizio che vende viewer'); }
  const discorso = [cosa && 'cosa vende', offerta && 'offerta', contatto && 'contatto'].filter(Boolean);
  if (cosa && vende) punti += 40; else if (cosa && spinge) punti += 20;
  if (cosa && contatto) punti += 30;
  if (offerta && contatto) punti += 25;
  if (discorso.length >= 2) motivi.push('discorso di vendita (' + discorso.join(', ') + ')');
  if (copione && discorso.length) { punti += 15; motivi.push('complimenti da copione'); }
  if (primo && punti > 0) { punti += 15; motivi.push('primo messaggio nel canale'); }
  // La decisione non e' una somma (i punti servono al registro): sono
  // combinazioni scritte, ognuna con la sua ragione.
  //  · certo: un indizio forte (dominio travestito, servizio noto, «togli gli
  //    spazi») dentro un discorso di vendita; o chi vende qualcosa, lascia il
  //    contatto e arriva col copione o al primo messaggio; o chi spinge a
  //    crescere, lascia il contatto e recita il copione.
  //  · probabile (si toglie, nessun castigo): due indizi forti senza discorso
  //    (un indirizzo travestito di un servizio noto e' una pubblicita'); chi
  //    vende e lascia il contatto; chi spinge e lascia il contatto al primo
  //    messaggio; contatto e copione con un pezzo di discorso.
  //  · niente: un indizio forte da solo («lol. com si fa?» e' scritto male,
  //    non e' un indirizzo da togliere con un'accusa di vendita), e ogni
  //    domanda: «come faccio a crescere di follower?», «quanti viewer fai?».
  const forti = dominio + servizio + spazi;
  const livello = (forti && discorso.length) || (cosa && vende && contatto && (copione || primo)) || (cosa && spinge && contatto && copione) ? 'certo'
    : forti >= 2 || (cosa && vende && contatto) || (cosa && spinge && contatto && primo) || (contatto && copione && (cosa || offerta)) ? 'probabile' : '';
  return { punti, motivi, livello };
}
