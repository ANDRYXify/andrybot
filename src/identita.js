// CHI È UN CANALE, per noi.
//
// Il bot è nato su Twitch, e il `login` di Twitch è diventato la chiave di
// tutto: la riga dello streamer, la cartella dei media, il link pubblico, le
// classifiche, i punti. Funziona finché esiste una piattaforma sola.
//
// Con la seconda nasce un problema che non si può risolvere sperando: su Twitch
// e su Kick esiste lo stesso nome, spessissimo di persone diverse. Se un canale
// Kick «pippo» prendesse la riga `pippo`, il giorno che il `pippo` di Twitch
// entra si ritroverebbe il canale di un altro — comandi, monete, memoria e
// tutto.
//
// La soluzione non è un controllo: è una FORMA che non può collidere. Un login
// Twitch è fatto solo di lettere, cifre e trattini bassi: il punto non ci può
// stare. Quindi un canale che vive fuori da Twitch porta un prefisso col punto
// — `kick.pippo`, `yt.pippo` — e nessun login Twitch potrà mai essere uguale.
// Non per fortuna, per costruzione.
//
// Le piattaforme stanno in una tabella sola, e tutto il resto di questo file si
// DERIVA da lì. Scritta a mano in ogni funzione, la quarta piattaforma sarebbe
// giusta in tre posti e dimenticata nel quarto.
//
// Da qui in poi il resto del bot non deve sapere niente: `kick.pippo` è un
// canale come un altro. Le uniche cose che cambiano sono quelle che parlano
// davvero con una piattaforma, e quelle si riconoscono da sé (senza token
// Twitch non si entra in una chat Twitch).

// Un nome su una piattaforma: lettere, cifre, trattino basso.
const NOME = '[a-z0-9_]{1,30}';

// LE PIATTAFORME. Twitch ha il prefisso vuoto perché è la casa: i canali nati
// prima dei prefissi si chiamano ancora come si chiamavano.
export const PIATTAFORME = [
  { id: 'twitch', prefisso: '' },
  { id: 'kick', prefisso: 'kick.' },
  { id: 'youtube', prefisso: 'yt.' },
];

const CON_PREFISSO = PIATTAFORME.filter((p) => p.prefisso);
const CASA = PIATTAFORME.find((p) => !p.prefisso);

// La forma di un canale nostro: un nome, oppure un prefisso + un nome. Niente
// punti doppi, niente punto iniziale: `..` non può passare di qui, e questa
// stessa espressione difende i percorsi su disco (`/u/<login>/img/...`).
const ALTERNATIVE = CON_PREFISSO.map((p) => p.prefisso.replace(/\./g, '\\.')).join('|');
export const LOGIN_RE = new RegExp(`^(?:${ALTERNATIVE})?${NOME}$`);

export function eLoginNostro(x) {
  return LOGIN_RE.test(String(x || '').toLowerCase());
}

// Il nome ripulito: quello che di un nome può stare in un login.
export function nomePulito(nome) {
  return String(nome || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
}

// Da nome su una piattaforma a canale nostro. Vuoto se il nome non lascia
// niente di utilizzabile, o se la piattaforma non esiste.
export function loginSu(piattaforma, nome) {
  const p = PIATTAFORME.find((x) => x.id === piattaforma);
  const n = nomePulito(nome);
  return p && n ? p.prefisso + n : '';
}

// Su quale piattaforma vive questo canale. Non è una colonna nel database: è
// una conseguenza del nome, quindi non può essere sbagliata né restare indietro.
export function piattaformaDi(login) {
  const l = String(login || '').toLowerCase();
  return (CON_PREFISSO.find((p) => l.startsWith(p.prefisso)) || CASA).id;
}

// Il nome sulla sua piattaforma (per Twitch è il login stesso).
export function nomeSu(login) {
  const l = String(login || '').toLowerCase();
  const p = CON_PREFISSO.find((x) => l.startsWith(x.prefisso));
  return p ? l.slice(p.prefisso.length) : l;
}

// Questo canale vive su questa piattaforma?
export function eSu(piattaforma, login) {
  return piattaformaDi(login) === piattaforma;
}

// --- le scorciatoie per piattaforma ---------------------------------
// Righe sole sopra le funzioni generiche: chi legge il codice di Kick trova
// `nomeKick` come prima, ma la regola resta scritta una volta sola.
export const loginKick = (nome) => loginSu('kick', nome);
export const eKick = (login) => eSu('kick', login);
export const nomeKick = (login) => (eKick(login) ? nomeSu(login) : '');

export const loginYoutube = (nome) => loginSu('youtube', nome);
export const eYoutube = (login) => eSu('youtube', login);
export const nomeYoutube = (login) => (eYoutube(login) ? nomeSu(login) : '');
