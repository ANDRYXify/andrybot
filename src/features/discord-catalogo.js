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


// I PRIVILEGI DI UN RUOLO, che sono un'altra cosa dai permessi di un canale.
//
// Quelli di sopra dicono cosa si puo' fare DENTRO un canale; questi dicono
// cosa si puo' fare NEL SERVER, e valgono ovunque. Si somigliano solo perche'
// Discord li scrive nello stesso modo, ma non si mescolano mai: una riga di
// canale non puo' bannare nessuno, e un ruolo non si applica a un canale solo.
//
// Sono pochi apposta. Discord ne ha una cinquantina, e un muro di cinquanta
// interruttori non si legge: si spunta a caso. Questi sono quelli per cui una
// persona un ruolo lo crea davvero — moderare, ripulire, farsi sentire.
//
// I valori vengono dalla documentazione di Discord, non dalla memoria.
export const PERMESSI_RUOLO = Object.freeze({
  moderare: 1n << 40n,      // MODERATE_MEMBERS — mettere in pausa
  cacciare: 1n << 1n,       // KICK_MEMBERS
  bannare: 1n << 2n,        // BAN_MEMBERS
  pulire: 1n << 13n,        // MANAGE_MESSAGES
  soprannomi: 1n << 27n,    // MANAGE_NICKNAMES
  zittire: 1n << 22n,       // MUTE_MEMBERS
  spostare: 1n << 24n,      // MOVE_MEMBERS
  registro: 1n << 7n,       // VIEW_AUDIT_LOG
  eventi: 1n << 33n,        // MANAGE_EVENTS
  chiamareTutti: 1n << 17n, // MENTION_EVERYONE
  emojiAltrui: 1n << 18n,   // USE_EXTERNAL_EMOJIS
  trasmettere: 1n << 9n,    // STREAM
  priorita: 1n << 8n,       // PRIORITY_SPEAKER
});

// QUELLO CHE IL BOT DEVE AVERE PER POTERLO DARE.
//
// Discord: «un bot puo' dare a un ruolo soltanto i privilegi che ha lui». Non
// e' una nostra prudenza, e' una regola loro — e senza guardarla in faccia il
// costruttore fallirebbe a meta', dopo aver gia' creato il ruolo.
//
// Percio' questo numero non si scrive a mano: e' la somma esatta di quello che
// i ruoli qui dentro sanno distribuire. Aggiungere un privilegio sopra lo fa
// entrare anche qui, e nessuno deve ricordarsene.
export const PERMESSI_DA_DARE = String(Object.values(PERMESSI_RUOLO).reduce((t, v) => t | v, 0n));

export const sommaRuolo = (nomi) => (nomi || []).reduce((t, n) => t | (PERMESSI_RUOLO[n] || 0n), 0n);

// Quali di questi privilegi il bot NON puo' passare, visti i suoi. Torna i
// nomi, non i numeri: e' una frase da dire a una persona.
export function nonPuoDare(permessi, bitsBot) {
  let b = 0n;
  try { b = typeof bitsBot === 'bigint' ? bitsBot : BigInt(bitsBot || 0); } catch { b = 0n; }
  const AMMINISTRATORE = 1n << 3n;
  if ((b & AMMINISTRATORE) === AMMINISTRATORE) return [];
  return (permessi || []).filter((n) => {
    const v = PERMESSI_RUOLO[n];
    return v !== undefined && (b & v) !== v;
  });
}

// Quanto puo' chiedere un preset: i limiti sono quelli del motore della
// differenza, e stanno scritti li'. Averne una seconda copia qui vorrebbe dire
// due numeri che un giorno non coincidono piu'.
import { MAX_CATEGORIE, MAX_CANALI } from './discord-preset.js';
export { MAX_CATEGORIE, MAX_CANALI };
export const TIPI_CANALE = Object.freeze(['testo', 'voce', 'annunci', 'forum']);
export { MAX_RUOLI } from './discord-preset.js';

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
  // Piu' righe che parlano della stessa persona diventano UNA riga: Discord
  // ha un permesso solo per ogni destinatario su ogni canale, e se ne
  // mandassimo due l'ultima cancellerebbe la prima. «Tutti non puo' scrivere»
  // e «tutti non puo' reagire» sono due frasi e un permesso solo.
  //
  // E quello che hai concesso non si nega: se lo stesso permesso finisce sia
  // fra i «puo'» che fra i «non puo'», vince il puo'. Non e' una preferenza,
  // e' l'unica regola che non dipende dall'ordine in cui hai scritto le righe.
  const righe = (elenco) => {
    if (!Array.isArray(elenco) || !elenco.length) return null;
    const per = new Map();
    for (const p of elenco) {
      const id = chiE(p?.chi, guildId, perNome);
      if (!id) { const q = String(p?.chi?.ruolo || p?.chi || ''); if (q && !mancanti.includes(q)) mancanti.push(q); continue; }
      const a = per.get(id) || { id, tipo: 0, allow: 0n, deny: 0n };
      a.allow |= somma(p?.da);
      a.deny |= somma(p?.nega);
      per.set(id, a);
    }
    const fuori = [];
    for (const a of per.values()) {
      const deny = a.deny & ~a.allow;
      if (!a.allow && !deny) continue;
      fuori.push({ id: a.id, tipo: 0, allow: String(a.allow), deny: String(deny) });
    }
    return fuori.length ? fuori : null;
  };
  const unCanale = (ch) => ({
    nome: ch?.nome,
    tipo: ch?.tipo,
    argomento: ch?.argomento,
    permessi: righe(ch?.permessi),
  });
  return {
    mancanti,
    preset: {
      canali: (preset?.canali || []).map(unCanale),
      categorie: (preset?.categorie || []).map((c) => ({
        nome: c?.nome,
        permessi: righe(c?.permessi),
        canali: (c?.canali || []).map(unCanale),
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
  const unCanale = (ch) => {
    const n = String(ch?.nome || '').trim().slice(0, 100);
    if (!n || canaliTotali >= MAX_CANALI) return null;
    canaliTotali++;
    return {
      nome: n,
      tipo: TIPI_CANALE.includes(ch?.tipo) ? ch.tipo : 'testo',
      argomento: String(ch?.argomento || '').slice(0, 1024),
      permessi: righePulite(ch?.permessi),
    };
  };
  const canali = (Array.isArray(x?.canali) ? x.canali : []).map(unCanale).filter(Boolean);
  for (const c of (Array.isArray(x?.categorie) ? x.categorie : []).slice(0, MAX_CATEGORIE)) {
    const nome = String(c?.nome || '').trim().slice(0, 100);
    if (!nome) continue;
    const dentro = [];
    for (const ch of (Array.isArray(c?.canali) ? c.canali : [])) {
      const y = unCanale(ch);
      if (y) dentro.push(y);
    }
    categorie.push({ nome, permessi: righePulite(c?.permessi), canali: dentro });
  }
  return { canali, categorie };
}

// PARTI DAL SERVER CHE HAI GIA'.
//
// Chi ha un server vivo non ricomincia da zero: la sua forma diventa il primo
// preset, e da li' lo cambia. Si prendono i nomi, i tipi, dove stanno e gli
// argomenti — NON i permessi. Non per dimenticanza: un preset che non nomina i
// permessi e' un preset che non li tocca, e quelli che ci sono restano come
// sono. Rileggerli e riscriverli identici sarebbe lo stesso risultato passando
// per un giro in cui qualcosa puo' andare storto.
export function dallaFotografia(foto, { TIPI_ID = { 0: 'testo', 2: 'voce', 5: 'annunci', 15: 'forum' } } = {}) {
  const canali = (foto?.canali || []).filter((c) => c && c.id != null);
  const categorie = canali.filter((c) => Number(c.tipo) === 4);
  const perId = new Map(categorie.map((c) => [String(c.id), c]));
  const dentro = new Map(categorie.map((c) => [String(c.id), []]));
  const cima = [];
  for (const c of canali) {
    const tipo = TIPI_ID[Number(c.tipo)];
    if (!tipo) continue;                       // categorie e tipi che non sappiamo fare
    const voce = { nome: String(c.nome || ''), tipo, argomento: String(c.argomento || '') };
    const p = c.parent_id ? String(c.parent_id) : '';
    if (p && perId.has(p)) dentro.get(p).push(voce);
    else cima.push(voce);
  }
  return normalizzaPreset({
    canali: cima,
    categorie: categorie.map((c) => ({ nome: String(c.nome || ''), canali: dentro.get(String(c.id)) || [] })),
  });
}
