// CHI È UN CANALE, per noi.
//
// Il bot è nato su Twitch, e il `login` di Twitch è diventato la chiave di
// tutto: la riga dello streamer, la cartella dei media, il link pubblico, le
// classifiche, i punti. Funziona finché esiste una piattaforma sola.
//
// Con Kick nasce un problema che non si può risolvere sperando: su Twitch e su
// Kick esiste lo stesso nome, spessissimo di persone diverse. Se un canale Kick
// «pippo» prendesse la riga `pippo`, il giorno che il `pippo` di Twitch entra si
// ritroverebbe il canale di un altro — comandi, monete, memoria e tutto.
//
// La soluzione non è un controllo: è una FORMA che non può collidere. Un login
// Twitch è fatto solo di lettere, cifre e trattini bassi: il punto non ci può
// stare. Quindi un canale che vive su Kick si chiama `kick.<nome>`, e nessun
// login Twitch potrà mai essere uguale — non per fortuna, per costruzione.
//
// Da qui in poi il resto del bot non deve sapere niente: `kick.pippo` è un
// canale come un altro. Le uniche cose che cambiano sono quelle che parlano
// davvero con Twitch, e quelle si riconoscono da sé (senza token Twitch non si
// entra in una chat Twitch).

// Un nome su una piattaforma: lettere, cifre, trattino basso.
const NOME = '[a-z0-9_]{1,30}';

// La forma di un canale nostro: un nome, oppure `kick.` + un nome. Niente punti
// doppi, niente punto iniziale: `..` non può passare di qui, e questa stessa
// espressione difende i percorsi su disco (`/u/<login>/img/...`).
export const LOGIN_RE = new RegExp(`^(?:kick\\.)?${NOME}$`);

export function eLoginNostro(x) {
  return LOGIN_RE.test(String(x || '').toLowerCase());
}

// Da nome Kick a canale nostro.
export function loginKick(nome) {
  const n = String(nome || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  return n ? 'kick.' + n : '';
}

export function eKick(login) {
  return String(login || '').toLowerCase().startsWith('kick.');
}

// Il nome su Kick di un canale nostro (vuoto se non è un canale Kick).
export function nomeKick(login) {
  const l = String(login || '').toLowerCase();
  return eKick(l) ? l.slice(5) : '';
}

// Su quale piattaforma vive questo canale. Non è una colonna nel database: è
// una conseguenza del nome, quindi non può essere sbagliata né restare indietro.
export function piattaformaDi(login) {
  return eKick(login) ? 'kick' : 'twitch';
}
