// Leggere il CODICE, non le prose.
//
// Un cancello che cerca una parola nel testo di un file trova anche la parola
// dentro un commento — e la riga commentata `// via: 'bot',` contiene ancora
// tutte le parole di quella viva. Chi rompe una cosa commentandola (che e' il
// modo piu' comune di romperla) passa inosservato, e il verde diventa una bugia.
//
// Qui ci sono i due tagli che servono, uno per linguaggio. Non fanno la stessa
// cosa, e non e' una svista:
//   · JS: si tolgono i commenti e si TENGONO le stringhe — spesso il valore che
//     si cerca e' dentro una stringa ('bot', un percorso, un id).
//   · Python: si tolgono i commenti E le stringhe — li si cercano identificatori
//     (`mente`, `coscienza`), e una parola dentro una docstring non e' un accesso.

// I commenti via, le stringhe intatte. Le espressioni regolari vengono
// riconosciute (dentro ce ne stanno di `//` che non sono commenti: /https?:\/\//).
export function senzaCommentiJs(src) {
  let out = '';
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      const fine = c;
      out += c; i++;
      while (i < src.length) {
        if (src[i] === '\\') { out += src.slice(i, i + 2); i += 2; continue; }
        out += src[i];
        if (src[i] === fine) break;
        i++;
      }
      continue;
    }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; out += '\n'; continue; }
    if (c === '/' && src[i + 1] === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i++; continue; }
    if (c === '/') {
      const prima = out.replace(/\s+$/, '').slice(-1);
      if (prima === '' || '(,=:[!&|?{};+-*%~^'.includes(prima)) {
        out += c; i++;
        while (i < src.length) {
          if (src[i] === '\\') { out += src.slice(i, i + 2); i += 2; continue; }
          if (src[i] === '[') { while (i < src.length && src[i] !== ']') { out += src[i]; i++; } }
          out += src[i];
          if (src[i] === '/') break;
          i++;
        }
        continue;
      }
    }
    out += c;
  }
  return out;
}

// Commenti e stringhe via: resta lo scheletro, buono per cercare nomi.
export function codicePython(src) {
  let out = '';
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '#') { while (i < src.length && src[i] !== '\n') i++; out += '\n'; continue; }
    if (c === '"' || c === "'") {
      const tre = src.slice(i, i + 3);
      const fine = (tre === '"""' || tre === "'''") ? tre : c;
      i += fine.length;
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src.slice(i, i + fine.length) === fine) { i += fine.length - 1; break; }
        i++;
      }
      out += ' " ';
      continue;
    }
    out += c;
  }
  return out;
}

// Il corpo di un metodo JS. La prima graffa dopo il nome NON e' il corpo: e' il
// parametro destrutturato — `async chatReply({ channel, ... }) {`. Prendere
// quella da' un "corpo" di cinque parole in cui non c'e' niente, e il cancello
// diventa verde per assenza di materia. Quindi si chiude prima la tonda.
export function corpoJs(src, nome) {
  const m = new RegExp(`\\n  (?:async )?${nome}\\(`).exec(src);
  if (!m) return null;
  let i = src.indexOf('(', m.index);
  let tonde = 0;
  for (; i < src.length; i++) {
    if (src[i] === '(') tonde++;
    else if (src[i] === ')') { tonde--; if (!tonde) { i++; break; } }
  }
  i = src.indexOf('{', i);
  if (i < 0) return null;
  let liv = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') liv++;
    else if (src[j] === '}') { liv--; if (!liv) return src.slice(i, j + 1); }
  }
  return null;
}

// Il corpo di una funzione/metodo Python: dalla riga `def nome(` fino alla prima
// riga successiva rientrata quanto (o meno del) `def`.
export function corpoPython(src, nome) {
  const rx = new RegExp(`^([ \\t]*)def ${nome}\\(`, 'm');
  const m = rx.exec(src);
  if (!m) return null;
  const rientro = m[1].length;
  const righe = src.slice(m.index).split('\n');
  const dentro = [righe[0]];
  for (let i = 1; i < righe.length; i++) {
    const r = righe[i];
    if (r.trim() && (r.length - r.trimStart().length) <= rientro) break;
    dentro.push(r);
  }
  return dentro.join('\n');
}
