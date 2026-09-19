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
// Quelli di sopra dicono cosa si puo' fare DENTRO un canale; questi cosa si
// puo' fare NEL SERVER, e valgono ovunque. Non si mescolano mai: una riga di
// canale non banna nessuno, e un ruolo non si applica a un canale solo.
//
// I numeri stanno con gli altri numeri di Discord (`discord-api.js`), perche'
// sono anche quelli che il bot deve chiedere all'invito per poterli passare.
// Qui si riesportano: chi lavora coi preset li trova dove se li aspetta, e la
// tabella resta una sola.
import { PRIVILEGI, DA_DARE, ATTESE_AFK, ZITTISCI } from './discord-api.js';
export const PERMESSI_RUOLO = PRIVILEGI;
export const PERMESSI_DA_DARE = String(DA_DARE);

export const sommaRuolo = (nomi) => (nomi || []).reduce((t, n) => t | (PRIVILEGI[n] || 0n), 0n);

// Quali di questi privilegi il bot NON puo' passare, visti i suoi. Torna i
// nomi, non i numeri: e' una frase da dire a una persona.
// Da una maschera di bit ai NOMI dei privilegi che sappiamo dire. Serve a
// chiudere il giro: «parti dal server che hai» deve saper raccontare anche i
// ruoli, e raccontarli vuol dire chiamarli per nome.
export function privilegiDa(bits) {
  let b = 0n;
  try { b = typeof bits === 'bigint' ? bits : BigInt(bits || 0); } catch { return []; }
  return Object.keys(PRIVILEGI).filter((n) => (b & PRIVILEGI[n]) === PRIVILEGI[n]);
}

export function nonPuoDare(permessi, bitsBot) {
  let b = 0n;
  try { b = typeof bitsBot === 'bigint' ? bitsBot : BigInt(bitsBot || 0); } catch { b = 0n; }
  const AMMINISTRATORE = 1n << 3n;
  if ((b & AMMINISTRATORE) === AMMINISTRATORE) return [];
  return (permessi || []).filter((n) => {
    const v = PRIVILEGI[n];
    return v !== undefined && (b & v) !== v;
  });
}

// Quanto puo' chiedere un preset: i limiti sono quelli del motore della
// differenza, e stanno scritti li'. Averne una seconda copia qui vorrebbe dire
// due numeri che un giorno non coincidono piu'.
import { MAX_CATEGORIE, MAX_CANALI, MAX_RUOLI, MAX_DOMANDE, MAX_RISPOSTE, ruoliIntoccabili, TIPI, CON_FILI, CON_TAG, CON_LENTEZZA, LENTEZZE, ARCHIVI, TUTTI, normalizzaIngresso, normalizzaFiltro, TIPI_FILTRO, LISTE_FILTRO } from './discord-preset.js';
export { MAX_CATEGORIE, MAX_CANALI, MAX_RUOLI, MAX_DOMANDE, MAX_RISPOSTE, TUTTI, TIPI_FILTRO, LISTE_FILTRO };
export const TIPI_CANALE = Object.freeze(['testo', 'voce', 'annunci', 'palco', 'forum', 'media']);

const somma = (nomi) => (nomi || []).reduce((t, n) => t | (PERMESSI[n] || 0n), 0n);

// Da «chi» a un id vero. Torna null se quel qualcuno in questo server non c'e':
// null vuol dire «salta la riga», mai «nessuno».
function chiE(chi, guildId, perNome) {
  // Una riga senza destinatario NON vale «tutti». Sarebbe il difetto piu'
  // silenzioso possibile: una chiave scritta storta chiuderebbe un canale a
  // tutto il server, e sembrerebbe una scelta.
  if (chi === TUTTI) return String(guildId);
  // Una riga puo' parlare di una PERSONA invece che di un ruolo: il bot stesso,
  // o chi passa dal varco d'ingresso. Li' l'id c'e' gia', non si cerca per nome.
  if (chi && chi.persona && chi.id) return String(chi.id);
  const n = String(chi?.ruolo || chi || '').trim().toLowerCase();
  if (!n) return null;
  return perNome.get(n) || null;
}

// IL PRESET, RISOLTO SU QUESTO SERVER. Entra un preset scritto a parole, esce
// lo stesso preset con gli id e i numeri che vuole Discord — e l'elenco di chi
// non si e' trovato, che il pannello deve dire invece di far finta di niente.
// QUELLO CHE SERVE AL BOT PER DIRE UNA COSA in un canale. Tre, non tutti:
// vedere il canale, scrivere, e far comparire l'anteprima (l'avviso di
// diretta e' un riquadro, non una riga di testo).
const SERVONO_AL_BOT = ['vedere', 'scrivere', 'link'];

// «SOLA LETTURA» VUOL DIRE PER LE PERSONE, NON PER IL BOT.
//
// Il difetto che questa regola cancella esisteva davvero, ed era scritto nella
// traccia delle dirette: il canale «sono-in-onda» ha per argomento «Lo scrive
// il bot quando comincio», e insieme nega a «tutti» di scrivere. Ma su Discord
// il bot sta dentro «tutti» come chiunque altro — quindi quella traccia
// costruiva un canale che prometteva il bot e lo zittiva nello stesso gesto.
//
// Non si corregge canale per canale: sarebbe un elenco da tenere aggiornato, e
// il prossimo canale in sola lettura lo dimenticherebbe. Si deriva dalla
// regola: dove il preset toglie qualcosa a TUTTI, quel qualcosa il bot se lo
// riprende — e solo quello che gli serve per parlare. Vale per «annunci», per
// «regole», e per quelli che nascono domani senza che nessuno ci pensi.
function rigaDelBot(righe, botId) {
  if (!botId) return null;
  const negati = new Set();
  for (const p of (righe || [])) {
    const chi = String(p?.chi?.ruolo || p?.chi || '');
    if (chi !== TUTTI) continue;
    for (const k of (p?.nega || [])) if (SERVONO_AL_BOT.includes(k)) negati.add(k);
  }
  if (!negati.size) return null;
  return { chi: { id: String(botId), persona: true }, da: [...negati] };
}

export function risolvi(preset, { guildId, ruoli = [], botId = '' } = {}) {
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
  const righe = (elencoDato) => {
    if (!Array.isArray(elencoDato) || !elencoDato.length) return null;
    const mia = rigaDelBot(elencoDato, botId);
    const elenco = mia ? [...elencoDato, mia] : elencoDato;
    const per = new Map();
    for (const p of elenco) {
      const id = chiE(p?.chi, guildId, perNome);
      if (!id) { const q = String(p?.chi?.ruolo || p?.chi || ''); if (q && !mancanti.includes(q)) mancanti.push(q); continue; }
      const a = per.get(id) || { id, tipo: (p?.chi?.persona ? 1 : 0), allow: 0n, deny: 0n };
      a.allow |= somma(p?.da);
      a.deny |= somma(p?.nega);
      per.set(id, a);
    }
    const fuori = [];
    for (const a of per.values()) {
      const deny = a.deny & ~a.allow;
      if (!a.allow && !deny) continue;
      fuori.push({ id: a.id, tipo: a.tipo, allow: String(a.allow), deny: String(deny) });
    }
    return fuori.length ? fuori : null;
  };
  const unCanale = (ch) => ({
    nome: ch?.nome,
    tipo: ch?.tipo,
    argomento: ch?.argomento,
    permessi: righe(ch?.permessi),
    // Il contrassegno del canale degli avvisi passa di qui intero. Qui dentro
    // si traducono le PAROLE in id: quello che non e' una parola da tradurre
    // va portato dall'altra parte com'e', sennò si perde a meta' strada — e si
    // perde in silenzio, perche' un preset senza contrassegno e' un preset
    // valido che semplicemente non collega niente.
    ...(ch?.avvisi ? { avvisi: true } : {}),
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

// I RUOLI CHE LE TRACCE PROPONGONO, e la differenza fra i due mestieri.
//
// «Streamer» e' DECORATIVO: un colore e il posto a parte nell'elenco delle
// persone, zero privilegi. Non e' una dimenticanza — e' che il bot non puo'
// creare niente piu' in alto di se' stesso, quindi un ruolo che desse i poteri
// del padrone di casa non potrebbe nascere da qui. Questo serve a farsi vedere,
// e quello lo sa fare.
//
// «Moderatori» ha i poteri veri: mettere in pausa, cacciare, ripulire. Sono i
// privilegi che il bot possiede apposta per poterli passare.
//
// VIP e Abbonati sono un riconoscimento con qualcosa in mano: farsi sentire,
// usare le emoji degli altri server, parlare per primi in vocale.
const ruoliDiretta = [
  { nome: 'Streamer', colore: 0xe6398a, separato: true, privilegi: [] },
  { nome: 'Moderatori', colore: 0x3aa76d, separato: true, citabile: true,
    privilegi: ['moderare', 'cacciare', 'pulire', 'soprannomi', 'zittire', 'spostare', 'registro', 'chiamareTutti'] },
  { nome: 'VIP', colore: 0xc49a2c, separato: true, privilegi: ['emojiAltrui', 'chiamareTutti', 'priorita'] },
  { nome: 'Abbonati', colore: 0x8a5cd6, privilegi: ['emojiAltrui'] },
];
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
    ruoli: ruoliDiretta.filter((r) => r.nome !== 'Streamer'),
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
    ruoli: ruoliDiretta,
    categorie: [
      { nome: 'Benvenuto', canali: [
        { nome: 'regole', argomento: 'Le regole di casa. Si leggono una volta e valgono sempre.', permessi: soloLettura },
        { nome: 'annunci', argomento: 'Le cose importanti finiscono qui.', permessi: soloLettura },
        { nome: 'presentati', argomento: 'Due righe su di te. Nessuno le corregge.' },
      ] },
      { nome: 'Diretta', canali: [
        { nome: 'sono-in-onda', argomento: 'Lo scrive il bot quando comincio.', permessi: soloLettura, avvisi: true },
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
    ruoli: ruoliDiretta.filter((r) => r.nome !== 'Streamer'),
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
    ruoli: ruoliDiretta.filter((r) => r.nome !== 'Streamer'),
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
    const tipo = TIPI_CANALE.includes(ch?.tipo) ? ch.tipo : 'testo';
    const num = TIPI[tipo];
    return {
      nome: n,
      tipo,
      argomento: String(ch?.argomento || '').slice(0, tipo === 'forum' || tipo === 'media' ? 4096 : 1024),
      permessi: righePulite(ch?.permessi),
      // LE COSE CHE UN CANALE HA DAVVERO, e solo dove hanno senso.
      //
      // Una lentezza su una categoria, un tag su un canale di voce, una durata
      // d'archivio dove i fili non esistono: Discord li rifiuta, e la
      // costruzione si fermerebbe a meta' per un campo che non doveva partire.
      // Quindi non si mandano «a tutti e poi si vede»: si mandano dove il tipo
      // li prevede, e basta.
      ...(CON_LENTEZZA.has(num) && LENTEZZE.includes(Number(ch?.lento))
        ? { lento: Number(ch.lento) } : {}),
      ...(ch?.adulti ? { adulti: true } : {}),
      ...(CON_FILI.has(num) && ARCHIVI.includes(Number(ch?.archivia))
        ? { archivia: Number(ch.archivia) } : {}),
      ...(CON_TAG.has(num) && Array.isArray(ch?.tag) && ch.tag.length
        ? { tag: ch.tag.map((t) => String(t?.nome ?? t ?? '').trim().slice(0, 20)).filter(Boolean).slice(0, 20) } : {}),
      ...(CON_TAG.has(num) && ch?.tagObbligatorio ? { tagObbligatorio: true } : {}),
      // IL CANALE DEGLI AVVISI SI DICHIARA, non si indovina dal nome.
      //
      // La traccia sa qual e' il canale dove va l'avviso di diretta, e lo dice
      // con un contrassegno. Riconoscerlo dal nome («sono-in-onda») sembrerebbe
      // piu' semplice e si romperebbe alla prima volta che uno lo rinomina in
      // «live» — che e' la prima cosa che si rinomina. Il contrassegno invece
      // segue il canale ovunque lo porti, e sopravvive all'editor.
      ...(ch?.avvisi ? { avvisi: true } : {}),
    };
  };
  // I RUOLI del preset. Il nome e' l'unica cosa obbligatoria: un ruolo senza
  // privilegi e senza colore e' legittimo — serve a dire «questo e' uno di noi»
  // e basta, ed e' il mestiere di meta' dei ruoli che esistono.
  const ruoli = (Array.isArray(x?.ruoli) ? x.ruoli : []).slice(0, MAX_RUOLI).map((r) => {
    const nome = String(r?.nome || '').trim().slice(0, 100);
    if (!nome) return null;
    return {
      nome,
      colore: Math.max(0, Math.min(0xffffff, Number(r?.colore) || 0)),
      separato: !!r?.separato,
      citabile: !!r?.citabile,
      // Un privilegio che non sappiamo nominare non passa: sennò il pannello
      // mostrerebbe un ruolo e il server ne avrebbe un altro.
      privilegi: [...new Set((Array.isArray(r?.privilegi) ? r.privilegi : [])
        .map(String).filter((p) => PRIVILEGI[p] !== undefined))],
      // «questo ruolo prendilo da quello che c'e' gia'»: l'id di un ruolo del
      // server, che verra' RINOMINATO invece di nascerne uno nuovo. Arriva dal
      // consiglio, accettato a mano. Solo cifre: quello che non e' un id cade.
      ...(String(r?.da || '').replace(/[^0-9]/g, '') ? { da: String(r.da).replace(/[^0-9]/g, '').slice(0, 24) } : {}),
    };
  }).filter(Boolean);
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
  // LE IMPOSTAZIONI DEL SERVER dentro la traccia, come i canali e i ruoli.
  //
  // Non le teniamo noi: vivono su Discord. Ma metterle QUI e non in una scheda
  // a parte con un suo tasto «Salva» fa tre cose da sole: «leggi il mio server»
  // se le porta dietro, «fammi vedere cosa faresti» le mostra nella stessa
  // anteprima, e la modalita' distruttiva le rimette come dice la traccia.
  // Due strade verso lo stesso server sarebbero un'anteprima che ne racconta una.
  //
  // Un campo che la traccia non nomina NON entra: assente vuol dire «non mi
  // interessa», e scriverlo lo stesso cambierebbe una scelta fatta a mano.
  const imp = {};
  const q = x?.server;
  if (q && typeof q === 'object') {
    const num = (k, max) => { const v = Number(q[k]); if (Number.isFinite(v) && v >= 0 && v <= max) imp[k] = Math.round(v); };
    num('verifica', 4);
    num('filtro', 2);
    num('notifiche', 1);
    for (const k of ['canaleSistema', 'canaleRegole', 'canaleAvvisiStaff', 'canaleSicurezza', 'canaleAfk']) {
      if (q[k] !== undefined) imp[k] = String(q[k] || '').replace(/[^0-9]/g, '').slice(0, 24);
    }
    if (q.attesaAfk !== undefined && ATTESE_AFK.includes(Number(q.attesaAfk))) imp.attesaAfk = Number(q.attesaAfk);
    if (q.barraBoost !== undefined) imp.barraBoost = !!q.barraBoost;
    if (q.invitiFermi !== undefined) imp.invitiFermi = !!q.invitiFermi;
    if (q.lingua !== undefined) imp.lingua = String(q.lingua || '').slice(0, 12);
    if (q.zittisci && typeof q.zittisci === 'object') {
      imp.zittisci = Object.fromEntries(Object.keys(ZITTISCI).map((k) => [k, !!q.zittisci[k]]));
    }
  }

  // LA PORTA D'INGRESSO. La normalizzazione sta con la differenza, in
  // discord-preset.js: e' li' che si confronta quello che vuoi con quello che
  // c'e', e le due cose devono passare per la STESSA normalizzazione. Tenerne
  // una copia qui vorrebbe dire che un giorno il confronto direbbe «diverso»
  // per una maiuscola, e la porta si riscriverebbe tutte le sere.
  const ingresso = normalizzaIngresso(x?.ingresso);

  // IL FILTRO, per la stessa ragione della porta: la normalizzazione sta con
  // la differenza, perche' e' li' che si confronta quel che vuoi con quel che c'e'.
  const filtro = normalizzaFiltro(x?.filtro);

  // I ruoli che lo streamer tiene anche se la traccia non li prevede. In
  // modalita' normale non cambia niente — non si cancella mai; in distruttiva
  // sono gli unici che si salvano, ed e' il motivo per cui esistono.
  const risparmia = [...new Set((Array.isArray(x?.risparmia) ? x.risparmia : [])
    .map((v) => String(v || '').replace(/[^0-9]/g, '').slice(0, 24)).filter(Boolean))].slice(0, MAX_RUOLI * 4);
  return { ruoli, canali, categorie, risparmia,
    ...(Object.keys(imp).length ? { server: imp } : {}),
    ...(ingresso ? { ingresso } : {}),
    ...(filtro ? { filtro } : {}) };
}

// PARTI DAL SERVER CHE HAI GIA'.
//
// Chi ha un server vivo non ricomincia da zero: la sua forma diventa il primo
// preset, e da li' lo cambia. Si prendono i nomi, i tipi, dove stanno e gli
// argomenti — NON i permessi. Non per dimenticanza: un preset che non nomina i
// permessi e' un preset che non li tocca, e quelli che ci sono restano come
// sono. Rileggerli e riscriverli identici sarebbe lo stesso risultato passando
// per un giro in cui qualcosa puo' andare storto.
export function dallaFotografia(foto, { porta = null, regole = null, TIPI_ID = { 0: 'testo', 2: 'voce', 5: 'annunci', 13: 'palco', 15: 'forum', 16: 'media' } } = {}) {
  const canali = (foto?.canali || []).filter((c) => c && c.id != null);
  const categorie = canali.filter((c) => Number(c.tipo) === 4);
  const perId = new Map(categorie.map((c) => [String(c.id), c]));
  const dentro = new Map(categorie.map((c) => [String(c.id), []]));
  const cima = [];
  for (const c of canali) {
    const tipo = TIPI_ID[Number(c.tipo)];
    if (!tipo) continue;                       // categorie e tipi che non sappiamo fare
    // «Parti dal server che hai» deve portarsi dietro anche COME sono fatti i
    // canali, non solo come si chiamano: se leggesse solo il nome, il primo
    // «rimettilo a posto» spazzerebbe via lentezza, tag e durata dei fili che
    // qualcuno aveva messo a mano — e nessuno collegherebbe la cosa al tasto.
    const voce = { nome: String(c.nome || ''), tipo, argomento: String(c.argomento || '') };
    if (Number(c.lento) > 0) voce.lento = Number(c.lento);
    if (c.adulti) voce.adulti = true;
    if (Number(c.archivia) > 0) voce.archivia = Number(c.archivia);
    if (Array.isArray(c.tag) && c.tag.length) voce.tag = c.tag.slice(0, 20);
    if (c.tagObbligatorio) voce.tagObbligatorio = true;
    const p = c.parent_id ? String(c.parent_id) : '';
    if (p && perId.has(p)) dentro.get(p).push(voce);
    else cima.push(voce);
  }
  // ANCHE I RUOLI, sennò il giro non si chiude. Senza di loro «parti dal
  // server che hai» darebbe un preset che descrive i tuoi canali e NESSUN
  // ruolo — e in modalità distruttiva quel preset vuol dire «cancellali
  // tutti». Non un'anteprima sbagliata: un'anteprima giusta di una cosa
  // terribile, partita da un tasto che promette il contrario.
  //
  // Si leggono solo quelli che il costruttore potrebbe davvero rifare: quelli
  // sopra il bot, le integrazioni e @everyone non li sa costruire, e metterli
  // in un preset vorrebbe dire descrivere una cosa che non si puo' applicare.
  // Restano dove sono, e la differenza non li tocca comunque.
  const fuoriMano = ruoliIntoccabili(foto);
  const ruoli = (foto?.ruoli || [])
    .filter((r) => r?.id && !fuoriMano.has(String(r.id)))
    .map((r) => ({
      nome: String(r.nome || ''),
      colore: Number(r.colore) || 0,
      separato: !!r.separato,
      citabile: !!r.citabile,
      privilegi: privilegiDa(r.permessi),
    }));
  // E LA PORTA D'INGRESSO, se qualcuno l'ha letta. Discord la scrive per id;
  // qui torna in nomi, perche' e' cosi' che la traccia sa dirla — e perche'
  // senza, il primo «rimettilo a posto» cancellerebbe le domande che c'erano.
  const nomeCan = new Map(canali.map((c) => [String(c.id), String(c.nome || '')]));
  const nomeRuo = new Map((foto?.ruoli || []).map((r) => [String(r.id), String(r.nome || '')]));
  const daId = (m) => (l) => (l || []).map((i) => m.get(String(i))).filter(Boolean);
  const g = porta?.ingresso;
  const b = porta?.benvenuto;
  const ingresso = (g || b) ? {
    acceso: !!g?.acceso,
    canaliDiPartenza: daId(nomeCan)(g?.canaliDiPartenza),
    domande: (g?.domande || []).map((d) => ({
      titolo: d?.titolo, tipo: d?.tipo, unaSola: !!d?.unaSola,
      obbligatoria: !!d?.obbligatoria, allIngresso: d?.allIngresso !== false,
      risposte: (d?.risposte || []).map((r) => ({
        titolo: r?.titolo, testo: r?.testo, emoji: r?.emoji,
        canali: daId(nomeCan)(r?.canali), ruoli: daId(nomeRuo)(r?.ruoli),
      })),
    })),
    ...(b ? { benvenuto: { testo: b.testo,
      canali: (b.canali || []).map((c) => ({ canale: nomeCan.get(String(c?.canale)) || '', testo: c?.testo, emoji: c?.emoji })).filter((c) => c.canale) } } : {}),
  } : null;
  // E IL FILTRO, dove qualcuno l'ha letto. Le regole di Discord nominano
  // canali e ruoli per id; qui tornano nomi, perche' e' cosi' che la traccia
  // sa dirle — e perche' senza, il primo «rimettilo a posto» cancellerebbe le
  // regole che c'erano gia'.
  const filtroOra = Array.isArray(regole) ? regole.map((r) => ({
    tipo: r?.tipo, nome: r?.nome, accesa: !!r?.accesa,
    parole: r?.parole, espressioni: r?.espressioni, passano: r?.passano,
    liste: r?.liste, tettoMenzioni: r?.tettoMenzioni, raid: r?.raid,
    azioni: { ...(r?.azioni || {}),
      ...(r?.azioni?.avvisaIn ? { avvisaIn: nomeCan.get(String(r.azioni.avvisaIn)) || '' } : {}) },
    esentiRuoli: daId(nomeRuo)(r?.esentiRuoli),
    esentiCanali: daId(nomeCan)(r?.esentiCanali),
  })) : null;
  return normalizzaPreset({
    ruoli,
    ...(ingresso ? { ingresso } : {}),
    ...(filtroOra && filtroOra.length ? { filtro: filtroOra } : {}),
    // le impostazioni di adesso entrano nella traccia: se non ci fossero, il
    // primo «rimettilo a posto» le azzererebbe tutte in silenzio
    ...(foto?.impostazioni ? { server: foto.impostazioni } : {}),
    canali: cima,
    categorie: categorie.map((c) => ({ nome: String(c.nome || ''), canali: dentro.get(String(c.id)) || [] })),
  });
}
