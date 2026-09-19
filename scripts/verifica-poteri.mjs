#!/usr/bin/env node
// SI DISTRIBUISCONO, NON SI USANO.
//
// All'invito il bot chiede anche cacciare, bannare e mettere in pausa. Non gli
// servono per fare il suo lavoro: gli servono per POTERLI PASSARE al ruolo
// «Moderatori» che gli chiedi di creare, perche' Discord dice che un bot puo'
// dare a un ruolo soltanto i privilegi che ha lui. Senza averli, quel ruolo
// nascerebbe senza poteri — un ruolo finto.
//
// Il prezzo e' che il bot quei poteri li DETIENE su ogni server che lo invita.
// E una frase come «ma non li usiamo» scritta in un commento non vale niente:
// vale finche' qualcuno non aggiunge una riga, magari in buona fede, magari
// per una funzione comoda.
//
// Percio' qui non si controlla un'intenzione, si controlla il codice: nessuna
// parte di SocialBot deve chiamare le porte di Discord che quei poteri li
// esercitano. Distribuirli si', usarli mai.
//
// Quello che resta permesso, e che non va confuso:
//  · dare e togliere RUOLI a una persona — e' il gestore dei privilegi, ed e'
//    il mestiere per cui il bot esiste;
//  · leggere un membro, per sapere che ruoli ha.
//
// Uso: node scripts/verifica-poteri.mjs   (esce 1 se qualcosa non torna)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const esiti = [];
const dice = (ok, t, extra = '') => { esiti.push(ok); console.log((ok ? '  ✓ ' : '  ✗ ') + t + (extra ? ' — ' + extra : '')); };

// I file di SocialBot, senza le prove: una prova PUO' nominare una porta per
// dire «questa non si chiama mai», e sarebbe assurdo che la facesse diventare
// rossa proprio lei.
function files(dir, dentro = []) {
  for (const n of readdirSync(dir)) {
    if (n === 'node_modules' || n === '.git' || n === 'data' || n === 'vendor') continue;
    const via = join(dir, n);
    if (statSync(via).isDirectory()) files(via, dentro);
    else if (/\.(js|mjs|cjs)$/.test(n)) dentro.push(via);
  }
  return dentro;
}

// COME SI GUARDA. Non per parole in fila: una chiamata si puo' scrivere in
// tanti modi, e la prima stesura di questo cancello cercava «metodo: 'DELETE'»
// PRIMA del percorso. Nel codice vero il percorso viene prima, e il cancello
// e' rimasto verde davanti a una funzione che cacciava la gente. Un cancello
// che non sa diventare rosso e' peggio di nessun cancello: rassicura.
//
// Quindi si isolano le CHIAMATE, una per una, e di ognuna si guardano le due
// cose che contano insieme — dove va e con che verbo — senza badare all'ordine
// in cui sono scritte.
const chiamate = (codice) => [...codice.matchAll(/chiama\(([\s\S]{0,500}?)\)\s*[;,)]/g)].map((m) => m[1]);
const verbo = (c, v) => new RegExp(`metodo:\\s*['"\`]${v}['"\`]`).test(c);

const PROIBITE = [
  { che: 'bannare qualcuno',
    perche: '/guilds/{id}/bans/{utente}',
    colpisce: (c) => /\/guilds\/[^'"`]*\/bans\//.test(c) },
  { che: 'cacciare qualcuno',
    perche: 'DELETE /guilds/{id}/members/{utente}',
    // il percorso deve FINIRE sul membro: .../members/{utente}/roles/{ruolo} e'
    // un'altra cosa — e' dare o togliere un ruolo, il mestiere del bot.
    colpisce: (c) => verbo(c, 'DELETE') && /\/guilds\/[^'"`]*\/members\/\$\{[^}]*\}`/.test(c) },
  { che: 'mettere in pausa qualcuno',
    perche: 'il campo che mette in timeout',
    colpisce: (c) => /communication_disabled_until/.test(c) },
  { che: 'cancellare messaggi altrui',
    perche: 'le porte che ripuliscono una chat',
    colpisce: (c) => /\/messages\/bulk-delete/.test(c) || (verbo(c, 'DELETE') && /\/channels\/[^'"`]*\/messages\//.test(c)) },
  { che: 'cambiare il soprannome a qualcuno',
    perche: 'il campo del soprannome',
    colpisce: (c) => /\bnick\s*:/.test(c) },
  // Da quando il bot chiede anche «Gestire il server» puo' toccare cose che non
  // c'entrano col suo mestiere: gli inviti fatti da altri, e il vestito del
  // server. Gli inviti si guardano qui, come le altre porte; il vestito no —
  // quello si costruisce campo per campo dentro `sistemaServer`, e una porta
  // sola da guardare non basta. Si guarda la funzione, piu' sotto.
  { che: 'cancellare un invito fatto da altri',
    perche: 'DELETE /invites/{codice}',
    colpisce: (c) => verbo(c, 'DELETE') && /\/invites\//.test(c) },
];

const sorgenti = files(join(RAD, 'src'));
for (const p of PROIBITE) {
  const colpevoli = [];
  for (const f of sorgenti) {
    // i commenti spiegano, non chiamano: si guarda il codice
    const codice = readFileSync(f, 'utf8').replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    if (chiamate(codice).some(p.colpisce)) colpevoli.push(relative(RAD, f));
  }
  dice(colpevoli.length === 0, `nessuno chiama la porta per ${p.che}`,
    colpevoli.length ? `${p.perche} in ${colpevoli.join(', ')}` : '');
}

// IL VESTITO DEL SERVER non si tocca, e qui non basta guardare una porta.
//
// `sistemaServer` costruisce il corpo un campo per volta, e la porta e' sempre
// la stessa: PATCH /guilds/{id}. Quindi la domanda giusta non e' «quale porta
// chiama», e' «QUALI CAMPI ci mette dentro» — e la risposta deve restare
// l'elenco delle impostazioni, senza il nome, l'icona, lo stendardo, la vetrina
// o il padrone. Quelle cose sono di chi il server ce l'ha.
const VIETATI_SUL_SERVER = ['name', 'icon', 'banner', 'splash', 'discovery_splash',
  'vanity_url_code', 'owner_id'];
{
  const api = readFileSync(join(RAD, 'src/features/discord-api.js'), 'utf8')
    .replace(/^\s*\/\/.*$/gm, '');
  const i = api.indexOf('export async function sistemaServer(');
  const corpo = i > 0 ? api.slice(i, api.indexOf('\n}', i)) : '';
  dice(!!corpo, 'la porta delle impostazioni del server esiste');
  const messi = VIETATI_SUL_SERVER.filter((k) => new RegExp(`corpo\\.${k}\\s*=|\\b${k}\\s*:`).test(corpo));
  dice(messi.length === 0, 'nessuno rifa\' il vestito del server',
    messi.length ? `scrive ${messi.join(', ')} su PATCH /guilds/{id}` : '');
}

// E il contrario: quello che il bot fa DAVVERO coi ruoli deve continuare a
// esserci. Un cancello che diventasse verde perche' abbiamo tolto il gestore
// dei privilegi avrebbe misurato la cosa sbagliata.
const api = readFileSync(join(RAD, 'src/features/discord-api.js'), 'utf8');
dice(/\/guilds\/\$\{guild\}\/members\/\$\{utente\}\/roles\/\$\{ruolo\}/.test(api),
  'dare e togliere un ruolo resta quello che sa fare');

// La somma che si chiede all'invito e' quella dei privilegi, non un numero a mano.
dice(/export const DA_DARE = Object\.values\(PRIVILEGI\)\.reduce\(/.test(api),
  'quello che si chiede all\'invito e\' la somma esatta dei privilegi, calcolata');
dice(/export const PERMESSI_BOT = String\([A-Z_ |]*\bDA_DARE\b[A-Z_ |]*\);/.test(api),
  'e l\'invito la comprende');

const rotti = esiti.filter((x) => !x).length;
console.log(rotti ? `\n${rotti} cose non tornano.` : '\nI poteri che il bot tiene, li passa e basta. ✓');
process.exit(rotti ? 1 : 0);
