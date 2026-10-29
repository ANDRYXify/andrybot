// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// GLI AVVISI CHE LEGGONO LA DIRETTA (docs/AVVISI-SMART.md). La prima riga
// dell'avviso di diretta costruita dalla diretta: l'apertura dal tono del
// canale, l'attivita' dalla categoria, l'umore (e la chiusa che gli va con)
// dal titolo. Il nome resta il segno di avvisi.js: ogni posto lo stende a modo
// suo. Varia con l'hash della diretta, non a caso: lo stesso avviso riscritto
// dice la stessa frase.
import { createHash } from 'node:crypto';
import { scegliAccordando, normalizza as normGenere } from '../ai/genere.js';

export const LINGUE = ['it', 'en', 'es'];
export const TONI = ['scherzoso', 'amichevole', 'serio'];

const T = (it, en, es) => ({ it, en, es });

// Le aperture: {nome} e' chi va in diretta, {community} il nome della community
// (le frasi che lo usano valgono solo se il canale ne ha uno)
export const APERTURE = {
  scherzoso: T(['Oh guarda, oggi {nome}', 'Udite udite: oggi {nome}', '{community}, tenetevi forte: oggi {nome}'],
    ['Oh look, today {nome}', 'Hear ye, hear ye: today {nome}', '{community}, hold on tight: today {nome}'],
    ['Oye, mira: hoy {nome}', 'Atención, atención: hoy {nome}', '{community}, agarraos: hoy {nome}']),
  amichevole: T(['Oggi {nome}', 'Ci siamo: oggi {nome}', '{community}, oggi {nome}'],
    ['Today {nome}', 'Here we go: today {nome}', '{community}, today {nome}'],
    ['Hoy {nome}', 'Ya está: hoy {nome}', '{community}, hoy {nome}']),
  serio: T(['Oggi {nome}', 'In diretta adesso: {nome}'], ['Today {nome}', 'Live now: {nome}'], ['Hoy {nome}', 'En directo ahora: {nome}']),
};

// Le classi di categoria: le categorie che le appartengono (in minuscolo, come
// le scrive Twitch o Kick) e i verbi. «gioco» e' la classe di chi non e'
// riconosciuto: una categoria e' un gioco finche' non si dice altro.
export const CLASSI = {
  chiacchiere: { categorie: ['just chatting', 'talk shows & podcasts', 'pools, hot tubs, and beaches', 'asmr', 'chatting'],
    frasi: T(['parlerà', 'farà due chiacchiere'], ['will be chatting', 'will be talking'], ['va a charlar', 'estará de charla']) },
  musica: { categorie: ['music', 'djs', 'dj', 'singing', 'music & performing arts'],
    frasi: T(['suonerà', 'farà musica'], ['will be playing music', 'will be making music'], ['va a tocar', 'hará música']) },
  arte: { categorie: ['art', 'makers & crafting', 'beauty & body art', 'crafts', 'drawing'],
    frasi: T(['disegnerà', 'creerà qualcosa'], ['will be drawing', 'will be making something'], ['va a dibujar', 'creará algo']) },
  programmazione: { categorie: ['software and game development', 'science & technology', 'software & game development'],
    frasi: T(['programmerà', 'smanetterà col codice'], ['will be coding', 'will be writing code'], ['va a programar', 'trasteará con el código']) },
  cucina: { categorie: ['food & drink', 'cooking'],
    frasi: T(['cucinerà', 'metterà le mani in pasta'], ['will be cooking', 'will be in the kitchen'], ['va a cocinar', 'estará en la cocina']) },
  sport: { categorie: ['sports', 'fitness & health', 'fitness'],
    frasi: T(['farà sport', 'si allenerà'], ['will be doing sports', 'will be working out'], ['hará deporte', 'va a entrenar']) },
  giro: { categorie: ['irl', 'travel & outdoors', 'travel', 'outdoors'],
    frasi: T(['ci porterà in giro', 'ci farà fare un giro'], ['will take us around', 'will show us around'], ['nos llevará de paseo', 'nos dará una vuelta']) },
  gioco: { categorie: [],
    frasi: T(['giocherà a {gioco}', 'si lancia su {gioco}'], ['will be playing {gioco}', 'is jumping into {gioco}'], ['va a jugar a {gioco}', 'se lanza a {gioco}']) },
};
// senza categoria
export const SENZA = T(['è in diretta', 'accende la diretta'], ['is live', 'is going live'], ['está en directo', 'enciende el directo']);

// Gli umori, nell'ordine in cui si provano: il primo che combacia vince. Le
// parole si cercano nel titolo senza accenti e in minuscolo. La frase segue
// l'attivita' (porta da se' la sua punteggiatura d'attacco), la chiusa e' una
// frase a se'. {o/a} e' il genere del canale; ogni gruppo ha una frase che
// non lo dichiara, per il neutro.
export const UMORI = [
  ['incerto', { parole: ['boh', 'mah', 'test', 'prova', 'idk', 'no se', 'non so', 'chissa', 'vediamo', 'nada', 'niente', 'nulla', 'dunno'],
    frase: T([', ma non sembra troppo sicur{o/a} di cosa', ', ma non ha ancora deciso cosa'], [', but doesn\'t seem too sure about what', ', but hasn\'t decided what yet'], [', pero no parece muy segur{o/a} de qué', ', pero todavía no ha decidido qué']),
    chiusa: T(['{Andiamo a schiarirgli le idee!/Andiamo a schiarirle le idee!}', 'Andiamo a dare una mano a decidere!'], ['Let\'s go help clear things up!', 'Let\'s go help decide!'], ['¡Vamos a aclararle las ideas!', '¡Vamos a echar una mano a decidir!']) }],
  ['domanda', { parole: [],
    frase: T([' e ha una domanda per voi'], [' and has a question for you'], [' y tiene una pregunta para vosotros']),
    chiusa: T(['Venite a rispondere!'], ['Come and answer!'], ['¡Venid a responder!']) }],
  ['prima', { parole: ['prima volta', 'first time', 'first playthrough', 'blind', 'primera vez', 'primer contacto', 'debutto', 'debut'],
    frase: T([' per la prima volta'], [' for the first time'], [' por primera vez']),
    chiusa: T(['Venite a vedere come se la cava!'], ['Come see how it goes!'], ['¡Venid a ver qué tal le va!']) }],
  ['sfida', { parole: ['ranked', 'torneo', 'tournament', 'speedrun', 'boss', 'finale', 'final', 'sfida', 'challenge', 'reto', 'desafio', 'record'],
    frase: T([' e punta in alto'], [' and is aiming high'], [' y apunta alto']),
    chiusa: T(['Fate il tifo!', 'Venite a fare il tifo!'], ['Come cheer!', 'Cheer them on!'], ['¡A animar!', '¡Venid a animar!']) }],
  ['festa', { parole: ['compleanno', 'birthday', 'cumple', 'subathon', 'anniversario', 'anniversary', 'festa', 'party', 'fiesta', 'celebra*', 'festeggi*'],
    frase: T([' e si festeggia'], [' and it\'s a celebration'], [' y hay fiesta']),
    chiusa: T(['Venite a festeggiare!'], ['Come celebrate!'], ['¡Venid a celebrarlo!']) }],
  ['calma', { parole: ['chill', 'relax', 'tranquill*', 'tranquil*', 'cozy', 'comfy', 'calma', 'lofi', 'lo-fi'],
    frase: T([' con calma', ' in tutta tranquillità'], [' nice and easy', ' at a relaxed pace'], [' con calma', ' tranquilamente']),
    chiusa: T(['Portatevi una tisana!'], ['Grab a cup of tea!'], ['¡Traed una infusión!']) }],
  ['carica', { parole: [],
    frase: T([' e promette scintille'], [' and promises fireworks'], [' y promete chispas']),
    chiusa: T(['Non perdetevela!'], ['Don\'t miss it!'], ['¡No os lo perdáis!']) }],
  ['normale', { parole: [],
    frase: T(['', ' e ha già le idee chiare'], ['', ' and already has a plan'], ['', ' y ya tiene las ideas claras']),
    chiusa: T(['Vi aspetta in chat!', 'Passate a salutare!'], ['See you in chat!', 'Come say hi!'], ['¡Os espera en el chat!', '¡Pasad a saludar!']) }],
];
export const NOMI_UMORI = UMORI.map(([k]) => k);

const piano = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const lettere = (s) => (String(s || '').match(/\p{L}/gu) || []).length;
// una parola intera; «tranquill*» vale per tutte quelle che cominciano cosi'
const contiene = (t, p) => {
  const aperta = p.endsWith('*');
  const corpo = (aperta ? p.slice(0, -1) : p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${corpo}${aperta ? '' : '(?![\\p{L}\\p{N}])'}`, 'u').test(t);
};

// L'umore del titolo. Le parole aggiunte dallo streamer stanno in `extra`.
export function umoreDi(titolo, extra = {}) {
  const grezzo = String(titolo || '').trim();
  const t = piano(grezzo);
  for (const [k, u] of UMORI) {
    const parole = [...(extra[k] || []), ...u.parole].map(piano).filter(Boolean);
    if (k === 'incerto' && (lettere(grezzo) < 2 || parole.some((p) => t === p || contiene(t, p)))) return k;
    if (k === 'domanda' && /\?\s*$/.test(grezzo)) return k;
    if (k === 'carica' && (/!{3,}/.test(grezzo) || (lettere(grezzo) >= 6 && grezzo === grezzo.toUpperCase() && grezzo !== grezzo.toLowerCase()))) return k;
    if (k !== 'incerto' && parole.some((p) => contiene(t, p))) return k;
  }
  return 'normale';
}

// La classe della categoria: quelle dello streamer prima, poi quelle di serie.
export function classeDi(categoria, extra = {}) {
  const c = piano(categoria);
  if (!c) return '';
  for (const k of Object.keys(CLASSI)) if ((extra[k] || []).map(piano).includes(c)) return k;
  for (const [k, v] of Object.entries(CLASSI)) if (v.categorie.includes(c)) return k;
  return 'gioco';
}

// LE SCELTE DELLO STREAMER (settings.avvisiSmart): acceso, le categorie in piu'
// per classe, le parole in piu' per umore, e le frasi sue per lingua (vuote:
// quelle di serie). Ripulite: niente che rompa la frase.
const riga = (s, max) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const lista = (v, max, n) => [...new Set((Array.isArray(v) ? v : String(v || '').split(/\n/)).map((x) => riga(x, max)).filter(Boolean))].slice(0, n);
const perLingua = (o, max, n) => Object.fromEntries(LINGUE.map((l) => [l, lista(o?.[l], max, n)]));
export function normSmart(x) {
  const o = x && typeof x === 'object' ? x : {};
  return {
    attivo: o.attivo !== false,
    categorie: Object.fromEntries(Object.keys(CLASSI).map((k) => [k, lista(o.categorie?.[k], 60, 40)])),
    parole: Object.fromEntries(NOMI_UMORI.map((k) => [k, lista(o.parole?.[k], 40, 40)])),
    frasi: Object.fromEntries(Object.keys(CLASSI).map((k) => [k, perLingua(o.frasi?.[k], 60, 6)])),
    umori: Object.fromEntries(NOMI_UMORI.map((k) => [k, { frase: perLingua(o.umori?.[k]?.frase, 90, 6), chiusa: perLingua(o.umori?.[k]?.chiusa, 90, 6) }])),
    aperture: Object.fromEntries(TONI.map((k) => [k, perLingua(o.aperture?.[k], 90, 6)])),
  };
}

// una sorte che dipende solo dalla diretta: lo stesso seme, la stessa sequenza
function sorteDa(seme) {
  let i = 0;
  return () => {
    const h = createHash('sha256').update(seme + ':' + (i++)).digest();
    return h.readUInt32BE(0) / 0x100000000;
  };
}

// LA FRASE. `d`: la diretta (titolo, gioco, id, login); `nome`: quello che va
// al posto del nome (il segno di avvisi.js). Torna la frase, o '' se spento.
export function fraseSmart(d, { nome = '{nome}', lingua = 'it', tono = 'amichevole', genere = 'neutro', community = '', smart = null } = {}) {
  const cfg = normSmart(smart);
  if (!cfg.attivo || !d) return '';
  const L = LINGUE.includes(lingua) ? lingua : 'it';
  const g = normGenere(genere);
  const sorte = sorteDa(`${d.login || ''}|${d.id || ''}|${d.piattaforma || ''}`);
  const scegli = (proprie, serie) => scegliAccordando(proprie.length ? proprie : serie, g, sorte);
  const comm = riga(community, 40);
  const ap = (cfg.aperture[tono]?.[L]?.length ? cfg.aperture[tono][L] : (APERTURE[tono] || APERTURE.amichevole)[L]).filter((f) => comm || !f.includes('{community}'));
  const apertura = scegliAccordando(ap.length ? ap : APERTURE.serio[L], g, sorte);
  const classe = classeDi(d.gioco, cfg.categorie);
  const attivita = classe ? scegli(cfg.frasi[classe][L], CLASSI[classe].frasi[L]) : scegliAccordando(SENZA[L], g, sorte);
  const umore = umoreDi(d.titolo, cfg.parole);
  const u = UMORI.find(([k]) => k === umore)[1];
  const frase = scegli(cfg.umori[umore].frase[L], u.frase[L]);
  const chiusa = scegli(cfg.umori[umore].chiusa[L], u.chiusa[L]);
  const gioco = riga(d.gioco, 60);
  const testo = `${apertura} ${attivita}${frase}. ${chiusa}`
    .replace(/\{gioco\}/g, gioco).replace(/\{community\}/g, comm).replace(/\{nome\}/g, () => nome)
    .replace(/\s+([,.:!?])/g, '$1').replace(/\s{2,}/g, ' ').replace(/([.!?])\./g, '$1').trim();
  return testo;
}

// La frase come la dice un canale: il suo tono, la sua community, la sua
// lingua. Il genere e' quello del canale solo se la diretta e' sua: di
// un'altra diretta (la community, gli amici) non si sa, e si dice neutro.
export function fraseDelCanale(settings, d, { canale = '', nome, lingua = 'it', tono = 'amichevole', community = '' } = {}) {
  const altrui = !!d?.login && !!canale && String(d.login).toLowerCase() !== String(canale).toLowerCase();
  return fraseSmart(d, { nome, lingua, tono, community, genere: altrui ? 'neutro' : settings?.genere, smart: settings?.avvisiSmart });
}

// LE DUE RISPOSTE DEL PANNELLO, pure: le frasi di serie, e la prova (un
// titolo e una categoria, la bozza, tono, genere e community del canale →
// tre frasi per lingua). Le serve il server, e il sito dei collaudi uguale.
export function serieSmart() {
  return { classi: CLASSI, umori: Object.fromEntries(UMORI), aperture: APERTURE, senza: SENZA };
}
export function provaSmart(b = {}) {
  const smart = { ...normSmart(b.smart), attivo: true };
  const d = { login: 'prova', piattaforma: 'twitch', titolo: riga(b.titolo, 140), gioco: riga(b.gioco, 60) };
  const nome = riga(b.nome, 40) || 'Luna';
  const tono = TONI.includes(b.tono) ? b.tono : 'amichevole';
  const frasi = Object.fromEntries(LINGUE.map((l) => [l, [1, 2, 3].map((n) => fraseDelCanale({ genere: b.genere, avvisiSmart: smart }, { ...d, id: 'prova' + n },
    { canale: 'prova', nome, lingua: l, tono, community: riga(b.community, 40) }))]));
  return { umore: umoreDi(d.titolo, smart.parole), classe: classeDi(d.gioco, smart.categorie), frasi };
}
