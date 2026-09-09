// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// conti.js — il bot fa i conti CONTANDO, non indovinando.
//
// Perché esiste. «4+4» non è una domanda da modello linguistico: è un calcolo.
// Un 7B su CPU che risponde «8» lo fa per somiglianza, non perché ha contato, e
// infatti sopra i numeri piccoli sbaglia. La macchina su cui gira sa fare quella
// somma in un microsecondo ed è sempre giusta. Chiedere a lui è il modo sbagliato
// di usare tutti e due.
//
// Quindi i conti NON passano dal cervello. Passano di qui, prima, e la risposta
// è esatta per costruzione.
//
// Come legge. Un tokenizzatore e un parser a discesa ricorsiva: la ricorsione qui
// non è una moda, è la forma della cosa — un'espressione contiene espressioni.
// Niente `eval`, niente `new Function`: un messaggio di chat è testo di uno
// sconosciuto, e non si esegue il testo di uno sconosciuto. Mai.
//
// Quando tace. Se non è CERTAMENTE un conto, ritorna null e il messaggio prosegue
// per la sua strada. Un falso positivo è peggio del silenzio: il bot che risponde
// «12» a chi parlava d'altro è più fastidioso del bot che non risponde.

// Le parole che in chat valgono un simbolo.
// `\b` guarda [A-Za-z0-9_], quindi dopo una lettera accentata NON vede nessun
// confine: /\bpiù\b/ non aggancia mai, e «5 più 3» restava una parola sconosciuta.
// Con le occhiate laterali il confine e' «non una lettera», accenti compresi.
const parola = (p) => new RegExp(`(?<![\\p{L}])${p}(?![\\p{L}])`, 'giu');
const PAROLE = [
  [parola('moltiplicato per'), '*'], [parola('diviso per'), '/'], [parola('elevato alla'), '^'],
  [parola('elevato a'), '^'], [parola('alla'), '^'], [parola('diviso'), '/'], [parola('volte'), '*'],
  [parola('per'), '*'], [parola('pi[ùu]'), '+'], [parola('meno'), '-'],
  [/×/g, '*'], [/·/g, '*'], [/÷/g, '/'], [/−/g, '-'], [/–/g, '-'],
];

// Quello che si butta via prima di guardare: è il contorno della domanda.
const CORNICE = /^\s*(?:!(?:conto|calc|calcola|math)\b|bot\b|ehi\b|hey\b|scusa\b|dimmi\b|quanto\s+(?:fa|fanno|è|e|vale|viene)\b|quant'è\b|calcola\b|calcolami\b|fammi\b|il\s+risultato\s+di\b|,|\s)+/i;

const PULIZIA_FINALE = /[\s?!.]+$/;

export class ContoRotto extends Error {}

// ------------------------------------------------------------ tokenizzatore
function tokenizza(testo) {
  const t = [];
  let i = 0;
  const s = String(testo);
  while (i < s.length) {
    const c = s[i];
    if (c === ' ') { i++; continue; }
    if ('+-*/^()%'.includes(c)) { t.push({ tipo: c }); i++; continue; }
    if (c >= '0' && c <= '9') {
      let j = i;
      while (j < s.length && s[j] >= '0' && s[j] <= '9') j++;
      const fineIntera = j;      // prima di spostarsi sulla coda decimale
      let dec = '';
      if ((s[j] === ',' || s[j] === '.') && s[j + 1] >= '0' && s[j + 1] <= '9') {
        let k = j + 1;
        while (k < s.length && s[k] >= '0' && s[k] <= '9') k++;
        // Un secondo separatore vuol dire migliaia, oppure un errore di scrittura:
        // in tutti e due i casi non si tira a indovinare, si tace.
        if (s[k] === ',' || s[k] === '.') throw new ContoRotto('numero ambiguo');
        // «1.000» in italiano e' mille, non uno virgola zero. Ma «3.5» e' tre e
        // mezzo, perche' in chat si scrive cosi'. Non c'e' modo di sapere quale
        // dei due intendeva chi ha scritto, e un calcolatore che indovina perde
        // il suo unico pregio: si tace, e la domanda prosegue per la sua strada.
        if (s[j] === '.' && k - (j + 1) === 3) throw new ContoRotto('punto ambiguo: migliaia o decimali');
        dec = '.' + s.slice(j + 1, k);
        j = k;
      }
      t.push({ tipo: 'num', v: Number(s.slice(i, fineIntera) + dec) });
      i = j; continue;
    }
    if (/[a-zà-ù]/i.test(c)) {
      let j = i;
      while (j < s.length && /[a-zà-ù]/i.test(s[j])) j++;
      const p = s.slice(i, j).toLowerCase();
      if (p === 'di') { t.push({ tipo: 'di' }); i = j; continue; }
      throw new ContoRotto('parola sconosciuta: ' + p);
    }
    throw new ContoRotto('carattere fuori posto: ' + c);
  }
  return t;
}

// ------------------------------------------------------------ parser
// espressione := termine (('+'|'-') termine)*
// termine     := potenza (('*'|'/') potenza)*
// potenza     := unario ('^' potenza)?          ← associativa a destra
// unario      := ('-'|'+')* primario
// primario    := numero ('%' 'di' espressione)? | '(' espressione ')'
const LIMITE = 1e15;

function analizza(tok) {
  let p = 0;
  const guarda = () => tok[p];
  const mangia = (tipo) => { if (tok[p]?.tipo !== tipo) throw new ContoRotto(`atteso ${tipo}`); return tok[p++]; };

  const espressione = () => {
    let v = termine();
    while (guarda()?.tipo === '+' || guarda()?.tipo === '-') {
      const op = tok[p++].tipo;
      const b = termine();
      v = op === '+' ? v + b : v - b;
    }
    return controlla(v);
  };

  const termine = () => {
    let v = potenza();
    while (guarda()?.tipo === '*' || guarda()?.tipo === '/') {
      const op = tok[p++].tipo;
      const b = potenza();
      if (op === '/') {
        if (b === 0) throw new ContoRotto('diviso zero');
        v /= b;
      } else v *= b;
    }
    return controlla(v);
  };

  const potenza = () => {
    const base = unario();
    if (guarda()?.tipo !== '^') return base;
    p++;
    const esp = potenza();
    // Un elevamento senza tetto e' una macchina per bloccare il bot: 9^9^9 non
    // e' una domanda, e' un attacco. Il tetto sta qui, dove nasce il rischio.
    if (!Number.isInteger(esp) || Math.abs(esp) > 64 || Math.abs(base) > 1e6) {
      throw new ContoRotto('elevamento troppo grande');
    }
    return controlla(base ** esp);
  };

  const unario = () => {
    if (guarda()?.tipo === '-') { p++; return -unario(); }
    if (guarda()?.tipo === '+') { p++; return unario(); }
    return primario();
  };

  const primario = () => {
    if (guarda()?.tipo === '(') {
      p++;
      const v = espressione();
      mangia(')');
      return v;
    }
    const n = mangia('num').v;
    // «15% di 200» — la sola forma con la percentuale che in chat non e' ambigua.
    if (guarda()?.tipo === '%') {
      p++;
      if (guarda()?.tipo !== 'di') throw new ContoRotto('percentuale senza «di»');
      p++;
      return controlla((n / 100) * espressione());
    }
    return n;
  };

  const fuori = espressione();
  if (p !== tok.length) throw new ContoRotto('avanza roba in fondo');
  return fuori;
}

function controlla(v) {
  if (!Number.isFinite(v)) throw new ContoRotto('numero non finito');
  if (Math.abs(v) > LIMITE) throw new ContoRotto('numero troppo grande');
  return v;
}

// ------------------------------------------------------------ presentazione
export function scrivi(n) {
  if (Number.isInteger(n)) return String(n);
  // sei decimali bastano per una chat, e gli zeri in coda non si scrivono
  const s = n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  return s.replace('.', ',');
}

// ------------------------------------------------------------ la porta
//
// Ritorna { conto, risultato, testo } se il messaggio E' un conto, altrimenti
// null. Non lancia mai: chi chiama non deve difendersi da questo.
export function risolvi(messaggio) {
  try {
    const grezzo = String(messaggio ?? '').trim();
    if (!grezzo || grezzo.length > 120) return null;
    let s = grezzo.replace(CORNICE, '').replace(PULIZIA_FINALE, '').trim();
    if (!s) return null;
    for (const [re, sub] of PAROLE) s = s.replace(re, sub);
    s = s.replace(/\bx\b/gi, '*');
    // Serve almeno un operatore e due numeri: cosi' «7» non e' un conto e
    // «ciao» nemmeno. Senza questa riga il bot risponderebbe a mezza chat.
    const numeri = (s.match(/\d+(?:[.,]\d+)?/g) || []).length;
    const operatori = (s.match(/[+\-*/^]/g) || []).length;
    const percentuale = /%\s*di\b/i.test(s);
    if (numeri < 2 || (operatori < 1 && !percentuale)) return null;
    const risultato = analizza(tokenizza(s));
    return { conto: s, risultato, testo: `${s.replace(/\s+/g, ' ')} = ${scrivi(risultato)}` };
  } catch { return null; }
}

// Come sopra, ma dice PERCHE' non torna: serve al comando esplicito, dove chi
// scrive «!conto 4/0» merita una risposta e non il silenzio.
export function risolviSpiegando(messaggio) {
  const grezzo = String(messaggio ?? '').trim();
  if (!grezzo) return { errore: 'non c\'è niente da calcolare' };
  if (grezzo.length > 120) return { errore: 'conto troppo lungo' };
  let s = grezzo.replace(CORNICE, '').replace(PULIZIA_FINALE, '').trim();
  for (const [re, sub] of PAROLE) s = s.replace(re, sub);
  s = s.replace(/\bx\b/gi, '*');
  try {
    const risultato = analizza(tokenizza(s));
    return { conto: s, risultato, testo: `${s.replace(/\s+/g, ' ')} = ${scrivi(risultato)}` };
  } catch (e) {
    return { errore: e instanceof ContoRotto ? e.message : 'non è un conto' };
  }
}
