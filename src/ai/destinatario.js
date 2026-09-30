// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// A CHI SI PARLA, E COSA SI CHIEDE.
//
// Il bot rispondeva a PAROLE. «bot» in qualunque punto era una chiamata, il
// nome dello streamer era una chiamata, «da quanto» era una domanda sulla
// durata della diretta. In una chat vera e' venuto fuori cosi':
//
//  · «Quanti bot AHAHAHAH» → «Sì ANDRYXify? Se è per soldi, non ne ho 😂».
//    Parlava DEI bot, non al bot.
//  · «@mizu__gamer …» → «Eccomi vecchio mio, chi mi ha evocato?». Il bot scrive
//    con l'account dello streamer: chi scrive quel nome parla alla persona.
//  · una frase con «da quanto» dentro → «Il contatore dice 2h 33m di live»,
//    e la risposta in chat e' stata «nessuno te l'ha chiesto».
//
// Quindi prima di rispondere si decidono due cose, in quest'ordine, in un posto
// solo: A CHI e' rivolto il messaggio, e se e' una DOMANDA che ha quella forma.
//
// A CHI (una di quattro):
//  · 'bot'      il bot e' chiamato: «bot» detto come si chiama qualcuno (in testa,
//               dopo un saluto, in coda dopo un verbo), il suo account quando e'
//               un account suo, o la risposta a una riga che ha scritto lui;
//  · 'streamer' si parla alla persona: il suo nome, o la risposta a una riga che
//               ha scritto lei (anche dallo stesso account del bot);
//  · 'altri'    si parla a qualcun altro: @qualcuno, o la risposta a un altro;
//  · 'stanza'   niente di tutto questo.
//
// La risposta di Twitch porta il messaggio a cui risponde (tag reply-parent-*)
// e il testo comincia con «@nome » da solo: quel pezzo non e' una menzione
// scritta da chi risponde, e si toglie prima di guardare il resto.

const minuscolo = (s) => String(s || '').toLowerCase();
const LOGIN = /^[a-z0-9_]{2,25}$/;

// Le parole che, davanti a «bot», ne fanno una cosa di cui si parla e non uno
// che si chiama: «quanti bot», «i bot», «un bot», «questo bot», «di bot».
const DAVANTI_A_UNA_COSA = new Set([
  'il', 'lo', 'la', 'i', 'gli', 'le', 'l', 'un', 'uno', 'una', 'dei', 'degli', 'del', 'dello', 'della', 'delle',
  'questo', 'questi', 'quel', 'quello', 'quei', 'quegli', 'sto', 'sti', 'codesto',
  'quanti', 'quante', 'quanto', 'tanti', 'troppi', 'pochi', 'molti', 'altri', 'altro', 'ogni', 'qualche', 'nessun', 'nessuno',
  'che', 'quale', 'di', 'da', 'a', 'al', 'ai', 'allo', 'agli', 'per', 'con', 'su', 'sul', 'sui', 'tra', 'fra', 'come', 'mio', 'tuo', 'suo', 'nostro', 'vostro',
  'the', 'an', 'some', 'many', 'any', 'these', 'those', 'this', 'that', 'how', 'your', 'my', 'of', 'to', 'for', 'with',
  'el', 'los', 'las', 'unos', 'unas', 'muchos', 'cuantos', 'cuántos', 'estos', 'ese', 'este', 'esos', 'de', 'del', 'tu', 'mi',
]);

// Le parole con cui ci si rivolge a qualcuno: «ciao bot», «grazie bot».
const RICHIAMI = new Set([
  'ehi', 'ehy', 'hey', 'ei', 'eh', 'oi', 'oh', 'ciao', 'grazie', 'dai', 'ok', 'okay', 'bravo', 'brava', 'caro', 'cara', 'bello', 'salve',
  'buongiorno', 'buonasera', 'buonanotte', 'weila', 'weilà', 'hola', 'hi', 'hello', 'yo', 'thanks', 'thx', 'gracias', 'oye',
]);

// Quello che si toglie in coda prima di guardare se «bot» e' l'ultima parola:
// le risate e le cose senza lettere (emoji, punteggiatura).
const RUMORE = /^(?:(?:a?h[ae])+h?|(?:j[ae])+j?|lol|lmao|xd+|ahah\w*|haha\w*|asd\w*)$|^[^\p{L}\p{N}]+$/u;

function parole(testo) {
  const fuori = [];
  for (const grezza of String(testo || '').split(/\s+/)) {
    if (!grezza) continue;
    const pulita = minuscolo(grezza).replace(/^[^\p{L}\p{N}@]+/u, '').replace(/[^\p{L}\p{N}]+$/u, '');
    fuori.push({ p: pulita, chiude: /[,.!?;:…]$/.test(grezza) });
  }
  return fuori;
}

// «bot» detto come si chiama qualcuno. La parola sola non basta: conta dove sta.
export function chiamaIlBot(testo) {
  const t = parole(testo);
  while (t.length && RUMORE.test(t[t.length - 1].p)) t.pop();
  for (let i = 0; i < t.length; i++) {
    if (t[i].p !== 'bot') continue;
    if (i === 0) return true;
    const prima = t[i - 1];
    if (prima.chiude) return true;
    if (RICHIAMI.has(prima.p)) return true;
    if (DAVANTI_A_UNA_COSA.has(prima.p)) continue;
    if (i === t.length - 1 || t[i].chiude) return true;
  }
  return false;
}

// La risposta di Twitch comincia con «@nome » da solo: si toglie.
function senzaPrefisso(testo, padre) {
  const t = String(testo || '');
  if (!padre) return t;
  const re = new RegExp('^@' + padre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+', 'i');
  return t.replace(re, '');
}

const normRiga = (s) => minuscolo(s).replace(/\s+/g, ' ').trim();

// A chi e' rivolto il messaggio. `detti` sono le ultime righe scritte dal bot
// in quel canale: servono quando il bot scrive con l'account dello streamer, per
// sapere se chi risponde sta rispondendo al bot o alla persona.
export function aChi({ testo = '', tags = null, botLogin = '', canale = '', detti = [] } = {}) {
  const can = minuscolo(canale);
  const conto = minuscolo(botLogin) || can;
  const condiviso = !botLogin || minuscolo(botLogin) === can;
  const padre = minuscolo(tags?.['reply-parent-user-login']);
  const risposta = !!tags?.['reply-parent-msg-id'] && LOGIN.test(padre);
  const resto = senzaPrefisso(testo, risposta ? padre : '');
  const esito = (a, perche) => ({ a, perche, testo: resto });

  if (chiamaIlBot(resto)) return esito('bot', 'chiamato «bot»');

  if (risposta) {
    if (padre === conto) {
      if (!condiviso) return esito('bot', 'risponde a una riga del bot');
      const riga = normRiga(tags?.['reply-parent-msg-body']);
      const suaRiga = !!riga && (detti || []).some((d) => normRiga(d) === riga);
      return suaRiga ? esito('bot', 'risponde a una riga scritta dal bot') : esito('streamer', 'risponde a una riga dello streamer');
    }
    if (padre === can) return esito('streamer', 'risponde a una riga dello streamer');
    return esito('altri', `risponde a ${padre}`);
  }

  const citati = [...minuscolo(resto).matchAll(/@([a-z0-9_]{2,25})/g)].map((m) => m[1]);
  if (!condiviso && citati.includes(conto)) return esito('bot', '@account del bot');
  if (can && citati.includes(can)) return esito('streamer', '@streamer');
  if (citati.length) return esito('altri', `@${citati[0]}`);
  if (can && new RegExp('(^|[^a-z0-9_])' + can.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9_]|$)').test(minuscolo(resto))) {
    return esito('streamer', 'il nome dello streamer');
  }
  return esito('stanza', 'nessuno in particolare');
}

// COSA SI CHIEDE. Gli intenti che danno un dato vero (quanto dura la diretta,
// a cosa si gioca) scattano su una domanda con quella forma, non su una parola
// dentro una frase qualsiasi: «da quanto tempo non ci vediamo» non chiede la
// durata della diretta.
const PAROLE_DIRETTA = '(?:live|diretta|in onda|online|stream|streami|streamando|streamate|on air)';
const DURATA = new RegExp(
  '\\buptime\\b'
  + `|(?:da quanto(?: tempo)?|quanto tempo|da quante ore|quanto dura|quant'e' che|quanto è che)\\b[^?!.]{0,25}\\b${PAROLE_DIRETTA}\\b`
  + `|\\bhow long\\b[^?!.]{0,25}\\b${PAROLE_DIRETTA}\\b|\\bcu[aá]nto (?:tiempo )?(?:llevas|lleva|llevan)\\b`, 'i');

export function chiedeLaDurata(testo) {
  return DURATA.test(minuscolo(testo));
}

// Il confine di parola si scrive a mano: per `\b` di JavaScript la «è» non e'
// una lettera, e «che gioco è questo» non veniva preso.
const FINE = "(?![a-zà-ÿ])";
const GIOCO_VERBO = new RegExp(`\\b(?:a )?cosa (?:stai|state|sta) giocando${FINE}|\\bche (?:stai|state|sta) giocando${FINE}`
  + `|\\ba che (?:gioco|game) (?:stai|state|sta|giochi|giocate|gioca)${FINE}|\\bche (?:gioco|game) (?:è|e'|sarebbe|stai|state|sta|giochi|giocate)${FINE}`
  + `|\\bwhat game${FINE}|\\bqu[eé] (?:juego|juegas|est[aá]s jugando)${FINE}`, 'i');
const GIOCO_DOMANDA = /\bche (?:gioco|game)\b|\ba (?:che|cosa) (?:gioco|giochi|giocate)\b/i;

export function chiedeIlGioco(testo) {
  const t = minuscolo(testo);
  return GIOCO_VERBO.test(t) || (GIOCO_DOMANDA.test(t) && t.includes('?'));
}

// Chiamato e basta: dopo aver tolto la chiamata, i saluti e il rumore non resta
// niente da capire. E' l'unico caso in cui, senza il modello, un cenno di
// risposta ha senso: a una frase vera un cenno a caso non risponde.
export function soloUnaChiamata(testo) {
  const t = parole(testo).filter((x) => x.p && x.p !== 'bot' && !x.p.startsWith('@') && !RICHIAMI.has(x.p) && !RUMORE.test(x.p));
  return t.length === 0;
}
