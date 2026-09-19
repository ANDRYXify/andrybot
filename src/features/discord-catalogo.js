// I SERVER CHE PROPONIAMO, e le parole per dire i permessi.
//
// Un preset qui dentro e' solo dati. Nessuna chiamata, nessuna condizione:
// l'elenco delle categorie, i canali dentro, e — dove serve — chi puo' fare
// cosa. Sono il punto di partenza, non la destinazione: lo streamer li apre,
// cambia i nomi, toglie quello che non gli serve, e applica il suo.
//
// DUE COSE CHE QUI NON CI SONO, apposta.
//
//  · GLI ID. Un preset non puo' conoscere gli id di un server che non ha mai
//    visto. Quando un permesso parla di qualcuno lo chiama per quello che e' —
//    «tutti», oppure un ruolo per nome — e diventa un id solo al momento di
//    applicare, guardando quel server. Un preset con dentro un id sarebbe un
//    preset di un server solo.
//  · I NUMERI DEI PERMESSI. Discord li scrive come somme di potenze di due:
//    «3072» non si legge e non si corregge. Qui si scrive `nega: ['scrivere']`,
//    e la somma la fa la macchina. I valori stanno in un posto solo, presi
//    dalla documentazione di Discord e non dalla memoria.
//
// E UNA COSA CHE NON DEVE SUCCEDERE: un ruolo nominato in un preset che in quel
// server non esiste non diventa «nessuno». Se diventasse nessuno, un permesso
// scritto per proteggere un canale lo chiuderebbe a tutti — e sembrerebbe
// funzionare. Quella riga si salta, e si dice quale.

// I permessi, coi valori di Discord. Qui ci sono i NUMERI e basta: le parole
// con cui si chiamano le sa il pannello, che parla tre lingue. Tenerle anche
// qui vorrebbe dire due elenchi da far coincidere a mano, e un cancello
// controlla che ogni permesso abbia la sua parola.
export const PERMESSI = Object.freeze({
  vedere: 1n << 10n,        // VIEW_CHANNEL
  scrivere: 1n << 11n,      // SEND_MESSAGES
  storia: 1n << 16n,        // READ_MESSAGE_HISTORY
  reagire: 1n << 6n,        // ADD_REACTIONS
  allegare: 1n << 15n,      // ATTACH_FILES
  link: 1n << 14n,          // EMBED_LINKS
  discussioni: 1n << 35n,   // CREATE_PUBLIC_THREADS
  entrare: 1n << 20n,       // CONNECT
  parlare: 1n << 21n,       // SPEAK
  menzionare: 1n << 17n,    // MENTION_EVERYONE
});


// Quanto puo' chiedere un preset: i limiti sono quelli del motore della
// differenza, e stanno scritti li'. Averne una seconda copia qui vorrebbe dire
// due numeri che un giorno non coincidono piu'.
import { MAX_CATEGORIE, MAX_CANALI } from './discord-preset.js';
export { MAX_CATEGORIE, MAX_CANALI };
export const TIPI_CANALE = Object.freeze(['testo', 'voce', 'annunci', 'forum']);

const somma = (nomi) => (nomi || []).reduce((t, n) => t | (PERMESSI[n] || 0n), 0n);

// «Tutti» e' il ruolo @everyone, che in Discord ha lo stesso id del server:
// non e' una convenzione nostra, e' come e' fatto Discord.
export const TUTTI = 'tutti';

// Da «chi» a un id vero. Torna null se quel qualcuno in questo server non c'e':
// null vuol dire «salta la riga», mai «nessuno».
function chiE(chi, guildId, perNome) {
  // Una riga senza destinatario NON vale «tutti». Sarebbe il difetto piu'
  // silenzioso possibile: una chiave scritta storta chiuderebbe un canale a
  // tutto il server, e sembrerebbe una scelta.
  if (chi === TUTTI) return String(guildId);
  const n = String(chi?.ruolo || chi || '').trim().toLowerCase();
  if (!n) return null;
  return perNome.get(n) || null;
}

// IL PRESET, RISOLTO SU QUESTO SERVER. Entra un preset scritto a parole, esce
// lo stesso preset con gli id e i numeri che vuole Discord — e l'elenco di chi
// non si e' trovato, che il pannello deve dire invece di far finta di niente.
export function risolvi(preset, { guildId, ruoli = [] } = {}) {
  const perNome = new Map();
  for (const r of ruoli) {
    const k = String(r?.nome || '').trim().toLowerCase();
    if (k && !perNome.has(k)) perNome.set(k, String(r.id));
  }
  const mancanti = [];
  const righe = (elenco) => {
    if (!Array.isArray(elenco) || !elenco.length) return null;
    const fuori = [];
    for (const p of elenco) {
      const id = chiE(p?.chi, guildId, perNome);
      if (!id) { const q = String(p?.chi?.ruolo || p?.chi || ''); if (q && !mancanti.includes(q)) mancanti.push(q); continue; }
      const allow = somma(p?.da);
      const deny = somma(p?.nega);
      if (!allow && !deny) continue;
      fuori.push({ id, tipo: 0, allow: String(allow), deny: String(deny) });
    }
    return fuori.length ? fuori : null;
  };
  return {
    mancanti,
    preset: {
      categorie: (preset?.categorie || []).map((c) => ({
        nome: c?.nome,
        permessi: righe(c?.permessi),
        canali: (c?.canali || []).map((ch) => ({
          nome: ch?.nome,
          tipo: ch?.tipo,
          argomento: ch?.argomento,
          permessi: righe(ch?.permessi),
        })),
      })),
    },
  };
}

// Scritture ricorrenti, cosi' i preset qui sotto si leggono come frasi.
const soloLettura = [{ chi: TUTTI, nega: ['scrivere'] }];
const riservato = [{ chi: TUTTI, nega: ['vedere'] }];

// ------------------------------------------------------------- il catalogo
// Quattro, non quindici. Un elenco lungo di preset che si somigliano non aiuta
// a scegliere: fa scegliere a caso. Questi quattro rispondono a quattro
// domande diverse — comincio da zero, trasmetto, gioco con gli altri, siamo
// diventati tanti — e chi non si riconosce in nessuno parte da quello piu'
// vicino e lo cambia.
export const CATALOGO = Object.freeze([
  {
    id: 'inizio',
    nome: 'Si comincia',
    per: 'Un server nuovo, quando non sai da dove partire.',
    categorie: [
      { nome: 'Benvenuto', canali: [
        { nome: 'regole', argomento: 'Le regole di casa. Si leggono una volta e valgono sempre.', permessi: soloLettura },
        { nome: 'annunci', argomento: 'Le cose importanti finiscono qui.', permessi: soloLettura },
      ] },
      { nome: 'Chiacchiere', canali: [
        { nome: 'generale' },
        { nome: 'fuori-tema', argomento: 'Tutto quello che non c’entra niente.' },
        { nome: 'Salotto', tipo: 'voce' },
      ] },
    ],
  },
  {
    id: 'dirette',
    nome: 'Intorno alle dirette',
    per: 'Chi trasmette e vuole un posto dove ritrovarsi anche quando non è in onda.',
    categorie: [
      { nome: 'Benvenuto', canali: [
        { nome: 'regole', argomento: 'Le regole di casa. Si leggono una volta e valgono sempre.', permessi: soloLettura },
        { nome: 'annunci', argomento: 'Le cose importanti finiscono qui.', permessi: soloLettura },
        { nome: 'presentati', argomento: 'Due righe su di te. Nessuno le corregge.' },
      ] },
      { nome: 'Diretta', canali: [
        { nome: 'sono-in-onda', argomento: 'Lo scrive il bot quando comincio.', permessi: soloLettura },
        { nome: 'clip', argomento: 'I momenti da rivedere.' },
        { nome: 'richieste', argomento: 'Giochi, canzoni, sfide: chiedi pure.' },
      ] },
      { nome: 'Chiacchiere', canali: [
        { nome: 'generale' },
        { nome: 'immagini' },
        { nome: 'Salotto', tipo: 'voce' },
        { nome: 'In diretta', tipo: 'voce' },
      ] },
    ],
  },
  {
    id: 'giocare',
    nome: 'Si gioca insieme',
    per: 'Un server dove ci si organizza per giocare, non solo per parlarne.',
    categorie: [
      { nome: 'Benvenuto', canali: [
        { nome: 'regole', argomento: 'Le regole di casa. Si leggono una volta e valgono sempre.', permessi: soloLettura },
        { nome: 'annunci', argomento: 'Le cose importanti finiscono qui.', permessi: soloLettura },
      ] },
      { nome: 'Si gioca', canali: [
        { nome: 'cerchiamo-gente', argomento: 'Scrivi a cosa giochi e quanti siete.' },
        { nome: 'clip-e-schermate' },
        { nome: 'consigli' },
      ] },
      { nome: 'Vocali', canali: [
        { nome: 'Squadra 1', tipo: 'voce' },
        { nome: 'Squadra 2', tipo: 'voce' },
        { nome: 'Squadra 3', tipo: 'voce' },
        { nome: 'Due chiacchiere', tipo: 'voce' },
      ] },
    ],
  },
  {
    id: 'grande',
    nome: 'Siamo in tanti',
    per: 'Quando un canale solo non basta più e serve un po’ di ordine.',
    categorie: [
      { nome: 'Benvenuto', canali: [
        { nome: 'regole', argomento: 'Le regole di casa. Si leggono una volta e valgono sempre.', permessi: soloLettura },
        { nome: 'annunci', argomento: 'Le cose importanti finiscono qui.', permessi: soloLettura },
        { nome: 'presentati', argomento: 'Due righe su di te. Nessuno le corregge.' },
      ] },
      { nome: 'Chiacchiere', canali: [
        { nome: 'generale' },
        { nome: 'fuori-tema', argomento: 'Tutto quello che non c’entra niente.' },
        { nome: 'immagini' },
        { nome: 'musica' },
      ] },
      { nome: 'Aiuto', canali: [
        { nome: 'domande', argomento: 'Chiedi senza girarci intorno.' },
        { nome: 'segnalazioni', argomento: 'Se qualcosa non va, si scrive qui.' },
      ] },
      { nome: 'Vocali', canali: [
        { nome: 'Salotto', tipo: 'voce' },
        { nome: 'Angolo tranquillo', tipo: 'voce' },
        { nome: 'Riunione', tipo: 'voce' },
      ] },
      // Nascosto a tutti vuol dire: lo vede chi ha un ruolo che glielo permette,
      // e chi amministra il server. Finche' non c'e' un ruolo dello staff, lo
      // vedi solo tu — che e' il modo giusto di cominciare.
      { nome: 'Staff', permessi: riservato, canali: [
        { nome: 'staff', permessi: riservato },
        { nome: 'Staff', tipo: 'voce', permessi: riservato },
      ] },
    ],
  },
]);

export const daId = (id) => CATALOGO.find((p) => p.id === String(id || '')) || null;

// IL PRESET CHE ARRIVA DAL PANNELLO non e' il preset che applichiamo.
//
// Quello che arriva e' testo scritto da un browser, e un browser lo si puo'
// convincere a mandare qualsiasi cosa. Qui si rifa' da zero: si tengono solo i
// campi che esistono, coi limiti che esistono, e tutto il resto cade. Non si
// controlla se e' valido — si COSTRUISCE valido, che e' un'altra cosa: un
// controllo si puo' dimenticare un caso, una ricostruzione no.
function righePulite(elenco) {
  const fuori = [];
  for (const r of (Array.isArray(elenco) ? elenco : [])) {
    const chi = r?.chi === TUTTI ? TUTTI
      : (String(r?.chi?.ruolo || '').trim() ? { ruolo: String(r.chi.ruolo).trim().slice(0, 100) } : null);
    if (!chi) continue;
    const solo = (v) => [...new Set((Array.isArray(v) ? v : []).filter((k) => PERMESSI[k]))];
    const da = solo(r?.da);
    const nega = solo(r?.nega);
    if (!da.length && !nega.length) continue;
    fuori.push({ chi, da, nega });
    if (fuori.length >= 10) break;
  }
  return fuori.length ? fuori : null;
}

export function normalizzaPreset(x) {
  const categorie = [];
  let canaliTotali = 0;
  for (const c of (Array.isArray(x?.categorie) ? x.categorie : []).slice(0, MAX_CATEGORIE)) {
    const nome = String(c?.nome || '').trim().slice(0, 100);
    if (!nome) continue;
    const canali = [];
    for (const ch of (Array.isArray(c?.canali) ? c.canali : [])) {
      const n = String(ch?.nome || '').trim().slice(0, 100);
      if (!n) continue;
      if (canaliTotali >= MAX_CANALI) break;
      canaliTotali++;
      canali.push({
        nome: n,
        tipo: TIPI_CANALE.includes(ch?.tipo) ? ch.tipo : 'testo',
        argomento: String(ch?.argomento || '').slice(0, 1024),
        permessi: righePulite(ch?.permessi),
      });
    }
    categorie.push({ nome, permessi: righePulite(c?.permessi), canali });
  }
  return { categorie };
}
