// Cancello delle FINESTRE: il pannello chiede e avvisa con la sua voce.
//
// L'invariante: nessuno script nostro apre le finestre del browser (alert,
// confirm, prompt). Quelle finestre non sono tradotte (i tasti sono nella lingua
// del browser, e in cima c'e' «socialbot.live dice»), non hanno il nostro
// aspetto, bloccano tutta la scheda, sul telefono sembrano un avviso di sistema.
// E il browser le puo' zittire: da li' in poi confirm() risponde «no» e prompt()
// niente, senza che nessuno se ne accorga, e l'azione semplicemente non succede.
// Le domande passano da chiediSe / chiediTesto / chiediScelta / chiediCopia, gli
// avvisi da toast.
//
// Si leggono tutti gli script serviti: src/web/public, tranne vendor/, che e'
// codice di altri cosi' come esce. Altro codice sulle nostre pagine non gira:
// verifica-csp.mjs tiene fuori gli script scritti dentro l'HTML e gli attributi
// on-qualcosa.
//
// L'ECCEZIONE, per costruzione e non per elenco. Una funzione trasformata in
// testo non gira da noi: diventa un segnalibro e gira sulla pagina di un altro
// sito, dove le nostre finestre non esistono. Li' quelle del browser sono le
// sole che ci sono. Per la stessa ragione, chi viaggia viaggia da solo: dentro
// quella funzione nessun nome coincide con un nome di primo livello dei nostri
// script. Un nome libero, la', non esiste (o e' di quell'altro sito); uno
// dichiarato dentro col nome di uno del pannello si legge come quello del
// pannello e non lo e'. Il segnalibro delle citazioni chiamava L('...') per
// tradurre, e dentro L era l'elenco delle righe della pagina.
//
// Chi viaggia si riconosce da come parte: NOME.toString(), con NOME una
// funzione di primo livello dichiarata una volta sola nel file. Dal nome
// soltanto non si puo' dire di piu': String(x) e '' + x si scrivono tutti i
// giorni per dei valori, e una funzione dentro un'altra puo' avere il nome di
// una variabile di qualche riga sotto. Una funzione che partisse in un altro
// modo non avrebbe l'eccezione: se usasse una finestra del browser il
// cancello la segnalerebbe, e la strada giusta e' questa.
//
// Un file puo' avere una funzione sua che si chiama come una finestra (le alert
// dell'overlay sono gli avvisi di Twitch): allora sta al primo livello, e il
// nome dice una cosa sola in tutto il file. Dichiarata piu' in dentro, direbbe
// due cose a seconda di dove la si legge: il cancello la segnala.
//
// Il cancello controlla anche se stesso: se la lettura di un file si perde (una
// stringa o un'espressione regolare presa per un'altra cosa), le dichiarazioni
// scritte a colonna zero smettono di essere codice o cambiano profondita', e lo
// dice. Stanno tutte alla stessa profondita' anche nei file chiusi in una
// funzione che si chiama da sola (pagina-link.js). Un cancello che non legge
// piu' il file darebbe il verde per assenza di materia.
//
// Uso: node scripts/verifica-finestre.mjs              (esce 1 se ne trova)
//      node scripts/verifica-finestre.mjs --selftest

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(RAD, 'src/web/public');

const FINESTRE = new Set(['alert', 'confirm', 'prompt']);
const IL_BROWSER = new Set(['window', 'self', 'globalThis', 'top', 'parent', 'frames', 'opener', 'defaultView', 'contentWindow']);
const PRIMA_DI_REGEX = new Set(['return', 'typeof', 'case', 'in', 'of', 'void', 'delete', 'new', 'throw', 'else', 'do', 'yield', 'await', 'instanceof']);
const NOME = /[A-Za-z_$][\w$]*/y;

// Due letture dello stesso file, lunghe quanto il file (cosi' un indice dice la
// stessa riga in tutte e tre): `codice` senza commenti, senza il testo delle
// stringhe e senza le espressioni regolari, ma col codice dentro i ${...};
// `testi` senza i commenti soltanto. Nella prima una parola e' un nome; nella
// seconda si leggono gli accessi fra quadre, window['alert'].
export function letture(src) {
  const n = src.length;
  const codice = src.split(''), testi = src.split('');
  const spegni = (v, da, fino) => { for (let k = da; k < fino && k < n; k++) if (v[k] !== '\n') v[k] = ' '; };
  let prima = '';
  const apreRegex = () => prima === '' || (/^[\w$]+$/.test(prima) ? PRIMA_DI_REGEX.has(prima) : !')]'.includes(prima));

  function modello(i) {
    while (i < n) {
      const c = src[i];
      if (c === '\\') { spegni(codice, i, i + 2); i += 2; continue; }
      if (c === '`') return i + 1;
      if (c === '$' && src[i + 1] === '{') { spegni(codice, i, i + 1); prima = ''; i = pezzo(i + 2, true); continue; }
      spegni(codice, i, i + 1);
      i++;
    }
    return i;
  }

  function pezzo(i, inGraffa) {
    let graffe = 0;
    while (i < n) {
      const c = src[i];
      if (c === '/' && src[i + 1] === '/') {
        let e = src.indexOf('\n', i); if (e < 0) e = n;
        spegni(codice, i, e); spegni(testi, i, e); i = e; continue;
      }
      if (c === '/' && src[i + 1] === '*') {
        let e = src.indexOf('*/', i + 2); e = e < 0 ? n : e + 2;
        spegni(codice, i, e); spegni(testi, i, e); i = e; continue;
      }
      if (c === '"' || c === "'") {
        let j = i + 1;
        while (j < n && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
        spegni(codice, i + 1, j); i = j + 1; prima = 'x'; continue;
      }
      if (c === '`') { i = modello(i + 1); prima = 'x'; continue; }
      if (c === '/' && apreRegex()) {
        let j = i + 1, classe = false;
        while (j < n && src[j] !== '\n') {
          if (src[j] === '\\') { j += 2; continue; }
          if (src[j] === '[') classe = true;
          else if (src[j] === ']') classe = false;
          else if (src[j] === '/' && !classe) break;
          j++;
        }
        spegni(codice, i + 1, j); i = j + 1;
        while (i < n && /[a-z]/i.test(src[i])) i++;
        prima = 'x'; continue;
      }
      if (/[\w$]/.test(c)) {
        let j = i; while (j < n && /[\w$]/.test(src[j])) j++;
        prima = src.slice(i, j); i = j; continue;
      }
      if (c === '{') graffe++;
      else if (c === '}') { if (inGraffa && graffe === 0) return i + 1; graffe--; }
      if (!/\s/.test(c)) prima = c;
      i++;
    }
    return i;
  }

  pezzo(0, false);
  return { codice: codice.join(''), testi: testi.join('') };
}

// Quante graffe aperte ci sono in ogni punto: 0 e' il primo livello del file.
function profondita(codice) {
  const p = new Int32Array(codice.length + 1);
  let d = 0;
  for (let i = 0; i < codice.length; i++) {
    if (codice[i] === '}') d--;
    p[i] = d;
    if (codice[i] === '{') d++;
  }
  p[codice.length] = d;
  return p;
}

const primaDi = (s, i) => { let k = i - 1; while (k >= 0 && /\s/.test(s[k])) k--; return k; };
const dopoDi = (s, i) => { let k = i; while (k < s.length && /\s/.test(s[k])) k++; return k; };
const parolaCheFinisceIn = (s, k) => { let j = k; while (j >= 0 && /[\w$]/.test(s[j])) j--; return s.slice(j + 1, k + 1); };
function chiusa(s, i) {
  const apre = s[i], chiude = { '(': ')', '{': '}', '[': ']' }[apre];
  if (!chiude) return -1;
  let d = 0;
  for (let k = i; k < s.length; k++) {
    if (s[k] === apre) d++;
    else if (s[k] === chiude) { d--; if (!d) return k; }
  }
  return -1;
}

// Una parola in `codice` e' una proprieta' (dopo un punto) o una chiave di un
// oggetto ({ nome: ... }): in quei casi non e' un nome che si cerca nello scope.
const proprieta = (codice, i) => codice[primaDi(codice, i)] === '.';
function chiave(codice, i, lungo) {
  const k = primaDi(codice, i);
  return (codice[k] === '{' || codice[k] === ',') && codice[dopoDi(codice, i + lungo)] === ':';
}

// I nomi dichiarati da un `const/let/var` che comincia in `i`, virgole comprese
// (`let a = 1, b = 2;`) e destrutturazioni (`const { a, b: c } = x;`).
function dichiarati(codice, i) {
  const nomi = [];
  let k = dopoDi(codice, i);
  for (;;) {
    if (codice[k] === '{' || codice[k] === '[') {
      const f = chiusa(codice, k);
      if (f < 0) return nomi;
      for (const m of codice.slice(k + 1, f).matchAll(/([A-Za-z_$][\w$]*)\s*(?=[,}\]=]|$)/g)) nomi.push(m[1]);
      k = f + 1;
    } else {
      NOME.lastIndex = k;
      const m = NOME.exec(codice);
      if (!m) return nomi;
      nomi.push(m[0]);
      k += m[0].length;
    }
    let d = 0, avanti = false;
    for (; k < codice.length; k++) {
      const c = codice[k];
      if ('([{'.includes(c)) d++;
      else if (')]}'.includes(c)) { if (!d) return nomi; d--; }
      else if (!d && c === ';') return nomi;
      else if (!d && c === ',') { k = dopoDi(codice, k + 1); avanti = true; break; }
      else if (!d && c === '\n' && /[A-Za-z_$]/.test(codice[k + 1] || '')) return nomi;
    }
    if (!avanti) return nomi;
  }
}

// Le dichiarazioni di un file: nome, dove, a che profondita', di che tipo, e per
// le funzioni dove finisce il corpo.
function dichiarazioni(codice, prof) {
  const out = [];
  for (const m of codice.matchAll(/(?<![\w$.])(?:function\s*\*?\s*([A-Za-z_$][\w$]*)|class\s+([A-Za-z_$][\w$]*)|(const|let|var)(?![\w$]))/g)) {
    const i = m.index;
    if (m[1] || m[2]) {
      const nome = m[1] || m[2];
      let fine = -1;
      if (m[1]) {
        const t = codice.indexOf('(', i + m[0].length - 1);
        const tc = t < 0 ? -1 : chiusa(codice, t);
        const g = tc < 0 ? -1 : codice.indexOf('{', tc);
        const gc = g < 0 ? -1 : chiusa(codice, g);
        fine = gc < 0 ? -1 : gc + 1;
      }
      out.push({ nome, i, prof: prof[i], tipo: m[1] ? 'function' : 'class', fine });
      continue;
    }
    for (const nome of dichiarati(codice, i + m[0].length)) {
      // una funzione messa in una costante viaggia come una dichiarata: il suo
      // corpo va fino alla fine dell'istruzione
      const dopo = codice.slice(i, i + 400);
      const eFunzione = new RegExp(`^(?:const|let|var)\\s+${nome.replace(/\$/g, '\\$')}\\s*=\\s*(?:async\\s+)?(?:function\\b|\\([^)]*\\)\\s*=>|[A-Za-z_$][\\w$]*\\s*=>)`).test(dopo);
      let fine = -1;
      if (eFunzione) {
        let d = 0;
        for (let k = i; k < codice.length; k++) {
          const c = codice[k];
          if ('([{'.includes(c)) d++;
          else if (')]}'.includes(c)) d--;
          else if (!d && c === ';') { fine = k + 1; break; }
        }
      }
      out.push({ nome, i, prof: prof[i], tipo: eFunzione ? 'funzione' : 'valore', fine });
    }
  }
  return out;
}

// Il blocco che contiene una dichiarazione: la graffa aperta piu' vicina prima
// di lei, un livello sopra, e quella che la chiude. E' li' che il nome copre
// quello di primo livello.
function bloccoDi(codice, prof, d) {
  for (let o = d.i - 1; o >= 0; o--) {
    if (codice[o] === '{' && prof[o] === d.prof - 1) return [o, chiusa(codice, o)];
  }
  return [0, codice.length];
}

// Le funzioni che diventano testo: sono quelle che viaggiano. NOME.toString()
// vale per la funzione di primo livello solo dove nessuna dichiarazione piu'
// vicina copre quel nome (`const q = new URLSearchParams(); q.toString()` e'
// un valore, anche se da qualche parte c'e' una function q).
function trasformataInTesto(f, d) {
  const coperture = f.dich.filter((x) => x.nome === d.nome && x.prof > 0).map((x) => bloccoDi(f.codice, f.prof, x));
  const re = new RegExp(`(?<![\\w$.])${d.nome.replace(/\$/g, '\\$')}\\s*\\??\\.\\s*toString\\s*\\(`, 'g');
  for (const m of f.codice.matchAll(re)) {
    if (!coperture.some(([o, c]) => m.index > o && m.index < c)) return true;
  }
  return false;
}

const rigaDi = (src, i) => src.slice(0, i).split('\n').length;
const testoRiga = (src, i) => { const a = src.lastIndexOf('\n', i - 1) + 1; const b = src.indexOf('\n', i); return src.slice(a, b < 0 ? src.length : b).trim().slice(0, 110); };

// Il cuore, uguale per i file veri e per l'autoverifica: riceve [{ file, src }]
// e dice cosa non va, piu' quello che ha riconosciuto (per il riassunto).
export function esamina(files) {
  const letti = files.map(({ file, src }) => {
    const { codice, testi } = letture(src);
    const prof = profondita(codice);
    return { file, src, codice, testi, prof, dich: dichiarazioni(codice, prof) };
  });

  const problemi = [];
  const di = (f, i, perche) => problemi.push({ file: f.file, riga: rigaDi(f.src, i), perche, testo: testoRiga(f.src, i) });

  // lo strumento prima di tutto: la lettura non si e' persa per strada
  for (const f of letti) {
    if (f.prof[f.codice.length] !== 0) di(f, f.src.length - 1, `la lettura del file non torna: a fine file restano ${f.prof[f.codice.length]} graffe aperte`);
    let livello = null;
    for (const m of f.src.matchAll(/^(?:async\s+function|function|class|const|let|var)\s/gm)) {
      livello ??= f.prof[m.index];
      if (f.codice.slice(m.index, m.index + m[0].length) !== m[0] || f.prof[m.index] !== livello) {
        di(f, m.index, 'la lettura del file si e\' persa: una dichiarazione a colonna zero non risulta codice, o sta a un\'altra profondita\' delle altre');
        break;
      }
    }
  }

  // i nomi di primo livello di tutti gli script: quelli del pannello
  const delPannello = new Set();
  for (const f of letti) for (const d of f.dich) if (d.prof === 0) delPannello.add(d.nome);

  const viaggiano = [], proprie = [];
  for (const f of letti) {
    // chi viaggia
    const suoi = [];
    for (const d of f.dich) {
      if ((d.tipo !== 'function' && d.tipo !== 'funzione') || d.fine < 0 || d.prof !== 0 || !trasformataInTesto(f, d)) continue;
      const altre = f.dich.filter((x) => x !== d && x.nome === d.nome);
      if (altre.length) { di(f, altre[0].i, `${d.nome} viaggia, e nello stesso file c'e' un'altra dichiarazione con lo stesso nome: chi viaggia ha un nome solo suo`); continue; }
      suoi.push(d);
      viaggiano.push({ file: f.file, nome: d.nome });
      for (const m of f.codice.slice(d.i, d.fine).matchAll(/(?<![\w$])[A-Za-z_$][\w$]*/g)) {
        const i = d.i + m.index, nome = m[0];
        // le finestre, dentro chi viaggia, sono per definizione quelle del browser
        if (nome === d.nome || FINESTRE.has(nome) || !delPannello.has(nome)) continue;
        if (proprieta(f.codice, i) || chiave(f.codice, i, nome.length)) continue;
        di(f, i, `${d.nome} diventa testo e gira su un altro sito, ma dentro c'e' «${nome}», che e' un nome dei nostri script`);
      }
    }
    const inViaggio = (i) => suoi.some((d) => i >= d.i && i < d.fine);

    // le funzioni proprie che si chiamano come una finestra
    const sue = new Set();
    for (const d of f.dich) {
      if (!FINESTRE.has(d.nome)) continue;
      if (d.prof === 0) { sue.add(d.nome); proprie.push({ file: f.file, nome: d.nome }); }
      else di(f, d.i, `«${d.nome}» e' dichiarata dentro una funzione: in un file il nome di una finestra dice una cosa sola, quindi si dichiara al primo livello o si chiama in un altro modo`);
    }

    // le finestre del browser
    for (const m of f.codice.matchAll(/(?<![\w$])(alert|confirm|prompt)(?![\w$])/g)) {
      const i = m.index, nome = m[1];
      if (inViaggio(i)) continue;
      if (f.dich.some((d) => d.i <= i && i < d.i + 40 && d.nome === nome && f.codice.slice(d.i, i).match(/^(?:function\s*\*?|class|const|let|var)\s*$/))) continue;
      const k = primaDi(f.codice, i);
      if (f.codice[k] === '.') {
        let r = k - 1;
        if (f.codice[r] === '?') r--;
        r = primaDi(f.codice, r + 1);
        const chi = parolaCheFinisceIn(f.codice, r);
        if (IL_BROWSER.has(chi)) di(f, i, `${chi}.${nome}: e' la finestra del browser`);
        continue;
      }
      if (chiave(f.codice, i, nome.length)) continue;
      const dopo = dopoDi(f.codice, i + nome.length);
      if (f.codice[dopo] === '(') {
        const c = chiusa(f.codice, dopo);
        const prec = f.codice[k] || '';
        const parola = parolaCheFinisceIn(f.codice, k);
        const daMetodo = k < 0 || '{},;*'.includes(prec) || ['async', 'get', 'set', 'static'].includes(parola);
        if (c > 0 && f.codice[dopoDi(f.codice, c + 1)] === '{' && daMetodo) continue;
      }
      if (sue.has(nome)) continue;
      di(f, i, `${nome}: e' la finestra del browser (o un nome che la copre)`);
    }

    // window['alert'] e simili: fra quadre il nome sta in una stringa
    for (const m of f.testi.matchAll(/(?<![\w$])(window|self|globalThis|top|parent|frames|opener|defaultView|contentWindow)\s*(?:\?\.)?\s*\[\s*(['"`])(alert|confirm|prompt)\2\s*\]/g)) {
      if (f.codice.slice(m.index, m.index + m[1].length) !== m[1] || inViaggio(m.index)) continue;
      di(f, m.index, `${m[1]}['${m[3]}']: e' la finestra del browser`);
    }
  }

  return { problemi, viaggiano, proprie, letti: letti.length };
}

function scriptServiti(dir) {
  return readdirSync(dir).flatMap((nome) => {
    const via = join(dir, nome);
    if (statSync(via).isDirectory()) return nome === 'vendor' ? [] : scriptServiti(via);
    return /\.m?js$/.test(nome) ? [via] : [];
  });
}

if (process.argv.includes('--selftest')) {
  const giusto = (src) => [{ file: 'prova.js', src }];
  let cieche = 0;
  const caso = (che, files, rosso) => {
    let r;
    try { r = esamina(files); } catch (e) { r = { problemi: [{ perche: 'errore: ' + e.message }] }; }
    const visto = r.problemi.length > 0;
    const ok = visto === rosso;
    console.log((ok ? '  ✓  ' : '  ✗  ') + che + (ok ? '' : (rosso ? '  → PASSA INOSSERVATA' : '  → FALSO ALLARME: ' + r.problemi.map((p) => p.perche).join(' | '))));
    if (!ok) cieche++;
  };

  console.log('Rotture che deve vedere:');
  caso('un alert qualunque', giusto("function f() {\n  alert('fatto');\n}\n"), true);
  caso('un confirm dentro un if', giusto("function f() {\n  if (confirm('sicuro?')) va();\n}\n"), true);
  caso('window.prompt', giusto("function f() {\n  const x = window.prompt('nome');\n}\n"), true);
  caso('globalThis?.alert', giusto("function f() {\n  globalThis?.alert('x');\n}\n"), true);
  caso("self['confirm']", giusto("function f() {\n  self['confirm']('x');\n}\n"), true);
  caso('la finestra a capo dopo il punto', giusto("function f() {\n  window\n    .alert('x');\n}\n"), true);
  caso('dentro un ${...} di un modello', giusto("function f() {\n  return `<b>${confirm('x') ? 'si' : 'no'}</b>`;\n}\n"), true);
  caso('passata senza chiamarla', giusto("function f() {\n  ['a'].forEach(alert);\n}\n"), true);
  caso('document.defaultView.alert', giusto("function f() {\n  document.defaultView.alert('x');\n}\n"), true);
  caso('una finestra dichiarata dentro una funzione', giusto("function f() {\n  function prompt(x) { return x; }\n  return prompt(1);\n}\n"), true);
  caso('chi viaggia chiama un nome del pannello', giusto("function L(a) { return a; }\nfunction giro() {\n  alert(L('ciao'));\n}\nconst u = 'javascript:(' + giro.toString() + ')()';\n"), true);
  caso('chi viaggia dichiara dentro un nome del pannello', giusto("function L(a) { return a; }\nfunction giro() {\n  var L = [1];\n  alert(L.length);\n}\nconst u = giro.toString();\n"), true);
  caso('chi viaggia chiama un nome di un altro script', [{ file: 'a.js', src: 'function toast(x) { return x; }\n' }, { file: 'b.js', src: "function giro() {\n  toast('x');\n}\nconst u = 'javascript:(' + giro.toString() + ')()';\n" }], true);
  caso('chi viaggia dentro un\'altra funzione non ha l\'eccezione', giusto("function fuori() {\n  function giro() { alert('x'); }\n  return giro.toString();\n}\n"), true);
  caso('chi viaggia ha il nome di un\'altra dichiarazione', giusto("function giro() {\n  alert('x');\n}\nfunction f() {\n  const giro = 1;\n  return giro;\n}\nconst u = giro.toString();\n"), true);
  caso('un alert in un file chiuso in una funzione', giusto("(function(){try{\nvar a = 1;\nfunction f(){ alert(a); }\n}catch(e){}})();\n"), true);
  caso('un modello lasciato aperto fa perdere la lettura', giusto("const a = `rotto;\nfunction f() {}\n"), true);
  caso('e una graffa in piu\' anche', giusto("function f() {\n  if (x) {\n}\nfunction g() {}\n"), true);

  console.log('\nCose giuste che non deve toccare:');
  caso('nei commenti', giusto("// alert('x')\n/* confirm('y') */\nfunction f() {}\n"), false);
  caso('nelle stringhe e nei modelli', giusto("const a = 'prompt(1)', b = \"alert(2)\", c = `confirm(${a})`;\n"), false);
  caso('in una espressione regolare', giusto("const r = /alert\\(|confirm\\(/;\nconst s = x.replace(/prompt\\(/g, '');\n"), false);
  caso('proprieta\' di altri oggetti', giusto("function f(ov, b, promptInstall) {\n  ov.alert = null;\n  b.dataset.alert;\n  promptInstall.prompt();\n}\n"), false);
  caso('chiavi di un oggetto', giusto("const o = { alert: 1, confirm: true, prompt: 'x' };\n"), false);
  caso('un metodo che si chiama cosi\'', giusto("class A {\n  alert(ev) { return ev; }\n  async confirm(x) { return x; }\n}\n"), false);
  caso('una funzione propria al primo livello', giusto("function alert(ev) { coda.push(ev); }\nfunction f(d) {\n  if (d.tipo === 'alert') alert(d);\n}\n"), false);
  caso('chi viaggia usa le finestre del browser', giusto("function giro() {\n  var righe = [1];\n  alert(righe.length);\n}\nconst u = 'javascript:(' + giro.toString() + ')()';\n"), false);
  caso('chi viaggia ha proprieta\' e chiavi coi nomi del pannello', giusto("function L(a) { return a; }\nfunction giro() {\n  var T = { L: 1 };\n  alert(T.L);\n}\nconst u = giro.toString();\n"), false);
  caso('chi viaggia usa alert anche se un altro script ha una funzione alert', [{ file: 'overlay.js', src: 'function alert(ev) { return ev; }\n' }, { file: 'pannello.js', src: "function giro() {\n  alert('x');\n}\nconst u = giro.toString();\n" }], false);
  caso('nomi che contengono la parola', giusto("function mostraAlertProssimo() {}\nconst codaAlert = [];\nfunction f() { codaAlert.push(1); mostraAlertProssimo(); }\n"), false);
  caso('un file chiuso in una funzione, letto giusto', giusto("(function(){try{\nvar a = 1;\nfunction f(){ return a; }\n}catch(e){}})();\n"), false);
  caso('valori messi in testo, con nomi di funzioni', giusto("function esc(s) { return s; }\nfunction q() {}\nfunction f(testo) {\n  const q = new URLSearchParams();\n  return '<b>' + esc(testo) + q.toString() + String(testo);\n}\n"), false);
  caso('un ${...} dentro chi viaggia non e\' un nome', giusto("const $ = (s) => s;\nfunction giro() {\n  var n = 2;\n  alert(`sono ${n}`);\n}\nconst u = giro.toString();\n"), false);

  // Sui file veri: una finestra all'inizio, a meta' (prima di una dichiarazione
  // a colonna zero, dove un'istruzione sta di sicuro) e in fondo a ogni script.
  // Se la lettura si perdesse in un punto del file, quello che viene dopo non si
  // vedrebbe piu': qui si vede se succede. La finestra e' una che il file non ha
  // come funzione sua (nell'overlay alert e' la sua).
  console.log('\nSui file veri, una finestra all\'inizio, a meta\' e in fondo:');
  const veri = scriptServiti(PUB).map((via) => ({ file: relative(RAD, via), src: readFileSync(via, 'utf8') }));
  let viste = 0, perse = [];
  for (const { file, src } of veri) {
    const sue = new Set(esamina([{ file, src }]).proprie.map((p) => p.nome));
    const finestra = [...FINESTRE].find((n) => !sue.has(n));
    const PROVA = `${finestra}('prova del cancello');\n`;
    const colonnaZero = [...src.matchAll(/^(?:async\s+function|function|class|const|let|var)\s/gm)].map((m) => m.index);
    const meta = colonnaZero.find((i) => i >= src.length / 2) ?? src.length;
    for (const [dove, i] of [['inizio', 0], ['meta\'', meta], ['fine', src.length]]) {
      const prima = src.slice(0, i), dopo = src.slice(i);
      const conProva = prima + (prima && !prima.endsWith('\n') ? '\n' : '') + PROVA + dopo;
      const riga = rigaDi(conProva, conProva.indexOf(PROVA, Math.max(0, i - 1)));
      const { problemi } = esamina([{ file, src: conProva }]);
      if (problemi.some((p) => p.riga === riga && p.perche.startsWith(finestra + ':'))) viste++;
      else perse.push(`${file} (${dove}, riga ${riga})`);
    }
  }
  const tutte = veri.length * 3;
  console.log(perse.length ? `  ✗  ${perse.length} su ${tutte} non viste: ${perse.slice(0, 8).join(', ')}` : `  ✓  ${viste} su ${tutte}, in ${veri.length} script`);
  cieche += perse.length ? 1 : 0;

  console.log(cieche ? `\n${cieche} rotture non viste.` : "\nOgni rottura e' vista. Il cancello e' vero. ✓");
  process.exit(cieche ? 1 : 0);
}

const files = scriptServiti(PUB).map((via) => ({ file: relative(RAD, via), src: readFileSync(via, 'utf8') }));
const { problemi, viaggiano, proprie, letti } = esamina(files);

console.log('Il pannello chiede e avvisa con la sua voce.\n');
console.log(`  · script letti: ${letti} (vendor/ escluso: e' codice di altri, cosi' com'e')`);
for (const v of viaggiano) console.log(`  · viaggia: ${v.nome} (${v.file})`);
for (const p of proprie) console.log(`  · funzione sua: ${p.nome} (${p.file})`);

if (!problemi.length) {
  console.log('\n  ✓ nessuna finestra del browser fuori da chi viaggia');
  console.log('  ✓ chi viaggia non porta con se\' nomi dei nostri script\n');
  process.exit(0);
}
console.log(`\n  ✗ ${problemi.length} ${problemi.length === 1 ? 'problema' : 'problemi'}:\n`);
for (const p of problemi.slice(0, 30)) console.log(`    ${p.file}:${p.riga}  ${p.perche}\n      ${p.testo}`);
console.log('');
process.exit(1);
