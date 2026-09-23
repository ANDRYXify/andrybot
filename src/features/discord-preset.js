// IL SERVER CHE VUOI, DESCRITTO. Non i passi per costruirlo.
//
// Un preset non e' una sequenza di comandi («crea questo, poi sposta quello»):
// e' la DESCRIZIONE di come dev'essere il server. Chi applica legge com'e'
// adesso, calcola la DIFFERENZA, e fa solo quella.
//
// E' la stessa forma del giro dei ruoli e delle occasioni, e da lei scendono
// tre cose che cosi' non possono rompersi:
//
//  · APPLICARE DUE VOLTE NON RADDOPPIA NIENTE. Non perche' ci ricordiamo di
//    aver gia' applicato: perche' la seconda differenza e' vuota. Un elenco di
//    «cose gia' fatte» da tenere aggiornato sarebbe la cosa che si scolla.
//  · L'ANTEPRIMA E' LA COSA VERA. Non c'e' un codice che calcola cosa mostrare
//    e un altro che agisce: si mostra la differenza, e poi si applica QUELLA.
//    Due strade separate divergono al primo cambiamento.
//  · NORMALE E DISTRUTTIVO SONO LO STESSO MOTORE. La differenza ha tre parti —
//    `crea`, `sistema`, `togli` — e il modo normale semplicemente non usa la
//    terza. Non due costruttori da tenere d'accordo: uno, con una direzione in
//    piu'.
//
// Qui dentro non si parla con Discord. Entra una fotografia, esce un elenco di
// intenzioni. Cosi' si prova senza avere un server sotto mano, ed e' anche il
// motivo per cui le prove qui sotto possono descrivere casi che in un server
// vero sarebbe scomodo costruire.

import { createHash } from 'node:crypto';
import { PRIVILEGI, DA_DARE, VIEW_CHANNEL, SEND_MESSAGES, TETTO_AUTOMOD, PAUSA_MAX, OLOGRAFICO } from './discord-api.js';
import { tipoRuolo } from './discord-ruoli.js';

// La somma dei privilegi che una traccia nomina. I NUMERI stanno in un posto
// solo, con gli altri numeri di Discord: qui si leggono, non si ricopiano. Non
// e' «parlare con Discord» — e' leggere una tabella di costanti, e questo
// modello resta quello che era, un calcolo su dati che si prova senza avere un
// server sotto mano.
const sommaPrivilegi = (nomi) => (nomi || []).reduce((t, n) => t | (PRIVILEGI[n] || 0n), 0n);

// I tipi di canale che sappiamo maneggiare, coi numeri che usa Discord.
export const TIPI = Object.freeze({ testo: 0, voce: 2, categoria: 4, annunci: 5, palco: 13, forum: 15, media: 16 });
export const TIPI_NOME = Object.freeze({ 0: 'testo', 2: 'voce', 4: 'categoria', 5: 'annunci', 13: 'palco', 15: 'forum', 16: 'media' });

// QUALI CANALI FANNO FILI (thread) e quindi hanno una durata d'archivio, e
// quali si fanno a tag. Non e' un dettaglio estetico: un tag messo su un canale
// di voce Discord lo rifiuta, e la costruzione si fermerebbe a meta'.
export const CON_FILI = new Set([TIPI.testo, TIPI.annunci, TIPI.forum, TIPI.media]);
export const CON_TAG = new Set([TIPI.forum, TIPI.media]);
export const CON_LENTEZZA = new Set([TIPI.testo, TIPI.annunci, TIPI.forum, TIPI.media, TIPI.voce]);

// La lentezza («slow mode») in secondi: Discord accetta da 0 a 21600, ma le
// scelte vere sono poche e sono queste. Un campo libero farebbe scrivere 7 a
// qualcuno, e 7 secondi non li vuole nessuno — vuole «qualche secondo».
export const LENTEZZE = Object.freeze([0, 5, 10, 30, 60, 300, 900, 3600, 21600]);
// Quanto ci mette un filo a chiudersi da solo, in minuti. Sono i quattro valori
// che Discord accetta: uno diverso lo rifiuta.
export const ARCHIVI = Object.freeze([60, 1440, 4320, 10080]);

export const MAX_CATEGORIE = 20;
export const MAX_CANALI = 60;
export const MAX_RUOLI = 15;

// COME SI VEDE UN RUOLO, e perche' sono due cose e non quattro.
//
// Discord ha due caratteristiche che il server puo' avere o non avere:
//  · ROLE_ICONS            -> il SEGNO (un'immagine oppure un'emoji)
//  · ENHANCED_ROLE_COLORS  -> la SFUMATURA e l'OLOGRAFICO
// Chi non le ha non deve vedersi offrire una cosa che gli verrebbe rifiutata:
// si dice prima, come si fa col conto della porta d'ingresso.
export const CON_SEGNO = 'ROLE_ICONS';
export const CON_TINTE = 'ENHANCED_ROLE_COLORS';

// A CHI VA UN RUOLO. Una domanda sola, con una risposta sola.
//
// Le tracce creavano «Streamer», «Moderatori», «VIP», «Abbonati» — e poi non li
// dava nessuno: il ruolo nasceva, restava vuoto, e dal server sembrava che non
// fosse successo niente. Un ruolo che nessuno ha e' un'etichetta appesa al
// muro.
//
// Quindi un ruolo della traccia dice a chi va:
//  · 'tu'   — a chi il server ce l'ha, il proprietario. Discord lo sa e ce lo
//             dice con il server stesso: non c'e' niente da collegare.
//  · 'mod', 'vip', 'sub', 'follower' — a chi lo e' su Twitch. Questi passano
//             per la scheda dei Ruoli, che li da' a chi si e' collegato: la
//             traccia ci scrive la regola, e da li' si cambia come le altre.
//  · ''     — a nessuno in automatico: lo dai tu a mano, come prima.
//
// Un campo solo e non due («e' tuo» + «per chi»): un ruolo che fosse tutte e
// due le cose dovrebbe poi decidere quale delle due vale, cioe' uno stato da
// «risolvere». Cosi' quello stato non si puo' scrivere.
export const A_CHI = Object.freeze(['', 'tu', 'follower', 'sub', 'vip', 'mod']);
export const aChiDi = (v) => (A_CHI.includes(String(v ?? '')) ? String(v ?? '') : '');

// LA TINTA. `colore` c'era gia' ed e' il primo colore: non si duplica in un
// campo nuovo, si aggiunge solo quello che mancava.
//
// L'olografico FORZA la terna che Discord impone. Cosi' uno stato che Discord
// rifiuterebbe non si puo' nemmeno salvare, e il pannello non ha niente da
// impedire a mano: i tre modi («unita», «sfumatura», «olografico») si RICAVANO
// da questi due campi, non si memorizzano a parte.
const unColore = (v) => Math.max(0, Math.min(0xffffff, Number(v) || 0));
export function normalizzaTinta(r) {
  if (r?.olografico) return { colore: OLOGRAFICO.primo, sfuma: OLOGRAFICO.secondo, olografico: true };
  const sfuma = r?.sfuma === null || r?.sfuma === undefined || r?.sfuma === '' ? null : unColore(r.sfuma);
  return { colore: unColore(r?.colore), sfuma, olografico: false };
}
export const modoTinta = (r) => (r?.olografico ? 'olografico' : (r?.sfuma === null || r?.sfuma === undefined ? 'unita' : 'sfumatura'));

// IL SEGNO: uno solo, e di un tipo.
//
// Discord ne mostra uno. Due campi separati — un'emoji E un'icona — potrebbero
// essere pieni tutti e due: uno stato che su Discord non esiste e che poi
// qualcuno dovrebbe «risolvere». Qui il tipo decide, e le caselle che non gli
// appartengono si svuotano.
//
// Dell'immagine si tiene SOLO l'impronta che Discord ha risposto, mai i byte:
// quelli viaggiano una volta sola, quando si costruisce, e non restano da
// nessuna parte. Non e' delicatezza, e' cio' che rende impossibile conservarli
// senza accorgersene.
export const SEGNI = Object.freeze(['niente', 'emoji', 'immagine']);
export function normalizzaSegno(s) {
  const tipo = SEGNI.includes(s?.tipo) ? s.tipo : 'niente';
  if (tipo === 'emoji') {
    const e = String(s?.emoji || '').trim().slice(0, 32);
    return e ? { tipo: 'emoji', emoji: e } : { tipo: 'niente' };
  }
  if (tipo === 'immagine') {
    const h = String(s?.icona || '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 64);
    return h ? { tipo: 'immagine', icona: h } : { tipo: 'niente' };
  }
  return { tipo: 'niente' };
}
// Il segno di un ruolo COM'E' ADESSO sul server, nella stessa forma di quello
// voluto: senza, il confronto sarebbe fra due cose scritte in due modi.
export const segnoDi = (r) => (r?.emoji ? { tipo: 'emoji', emoji: String(r.emoji) }
  : (r?.icona ? { tipo: 'immagine', icona: String(r.icona) } : { tipo: 'niente' }));
// «E' lo stesso segno?» — `a` e' quello che c'e', `b` quello che si vuole.
//
// Per l'immagine la risposta dipende da una cosa sola: se arrivano dei BYTE,
// e' per forza un'altra immagine (nessuno carica un file per rimettere quello
// che c'era). Senza byte si confrontano le impronte, e allora un'immagine gia'
// li' non si riscrive — che e' anche l'unico modo di non chiedere di nuovo dei
// byte che non abbiamo tenuto.
export const stessoSegno = (a, b) => a.tipo === b.tipo
  && (a.tipo !== 'emoji' || a.emoji === b.emoji)
  && (a.tipo !== 'immagine' || (!b.dato && a.icona === b.icona));

// COME SI RICONOSCE «LO STESSO RUOLO»: dal nome, senza badare alle maiuscole.
// Discord i nomi dei ruoli li lascia come li scrivi, quindi qui non si storpia
// niente: si confronta e basta.
export const nomeRuolo = (n) => String(n || '').trim().replace(/\s+/g, ' ').slice(0, 100);
export const chiaveRuolo = (n) => nomeRuolo(n).toLowerCase();

// COME SI RICONOSCE «LO STESSO CANALE».
//
// Discord non da' nomi unici: due canali possono chiamarsi uguale. Ma per una
// persona, dentro la stessa categoria, «generale» e' generale — e se ne
// creassimo un secondo ogni volta che si applica il preset, alla terza volta il
// server sarebbe pieno di doppioni.
//
// Quindi l'identita' e' (categoria, nome normalizzato) — con UNA seconda
// occhiata, perche' quella regola da sola sbaglia il caso piu' comune di tutti:
// il canale trascinato fuori dalla sua categoria. Con l'identita' secca quello
// diventa un canale diverso, e gliene creeremmo un altro accanto.
//
// La seconda occhiata: se quel nome nel server c'e' UNA VOLTA SOLA, e' lui —
// sta solo nel posto sbagliato, e si rimette dentro. Se ce n'e' piu' d'uno non
// si indovina: si crea quello che manca dove deve stare. E' l'AMBIGUITA' a
// fermare il riconoscimento, non la posizione.
//
// E la normalizzazione
// non ce la inventiamo: nei canali di TESTO Discord la fa gia' lui — minuscole,
// spazi che diventano trattini — quindi «Il Generale» e «il-generale» sono lo
// stesso canale e vanno riconosciuti tali. Nei canali VOCALI il nome resta come
// lo scrivi, e li' si confronta senza storpiarlo.
// Il PALCO e' un canale vocale a tutti gli effetti: il nome resta come lo
// scrivi, maiuscole e spazi compresi. Storpiarlo come un canale di testo
// vorrebbe dire non riconoscere piu' «Sala grande» al secondo giro.
const NOME_LIBERO = new Set([TIPI.voce, TIPI.categoria, TIPI.palco]);
export const nomeCanale = (tipo, nome) => {
  const t = String(nome || '').trim();
  if (NOME_LIBERO.has(tipo)) return t.slice(0, 100);
  return t.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9à-ɏ\-_]/g, '').slice(0, 100);
};
const chiave = (tipo, nome) => TIPI_NOME[tipo === TIPI.categoria ? 4 : tipo] + ':' + nomeCanale(tipo, nome).toLowerCase();

// CHI NON SI TOCCA, e non e' un elenco che manteniamo: e' una domanda che
// facciamo al server.
//
// Discord gestisce da se' alcuni canali dei server Community e li nomina per id
// nell'oggetto del server; i ruoli delle integrazioni si dichiarano `managed`;
// `@everyone` e' il ruolo che ha l'id del server. Nessuna di queste cose puo'
// finire fra quelle da togliere — e non «ce lo ricordiamo»: non entrano proprio
// nell'elenco.
export function intoccabili(foto) {
  const g = foto?.guild || {};
  const fuori = new Set([g.rules_channel_id, g.public_updates_channel_id, g.safety_alerts_channel_id, g.system_channel_id]
    .filter(Boolean).map(String));
  for (const r of (foto?.ruoli || [])) {
    if (r?.managed) fuori.add(String(r.id));
    if (String(r?.id) === String(g.id)) fuori.add(String(r.id));   // @everyone
  }
  return fuori;
}

// I RUOLI CHE NON SONO NOSTRI DA TOCCARE, e nemmeno qui e' un elenco che
// manteniamo: sono tre domande al server.
//
//  · @everyone ha l'id del server: non e' un ruolo che si crea o si cancella.
//  · Un ruolo `managed` e' di un'integrazione — il ruolo dei sub di Twitch ne
//    e' l'esempio che ci riguarda di piu' — e Discord non lo lascia muovere.
//  · Sopra il bot non si arriva. Discord: «un bot puo' modificare i ruoli in
//    posizione piu' bassa del suo piu' alto». Il ruolo del proprietario, gli
//    amministratori, spesso i moderatori storici: tutta roba che il costruttore
//    non deve nemmeno mettere nell'elenco delle cose da fare, perche' provarci
//    sarebbe un errore a meta' strada invece di una frase detta prima.
//
// La regola e' una sola, `tipoRuolo` in discord-ruoli.js: qui si chiede a lei.
// Una fotografia senza il livello del bot non sa dove sta il bot, e allora non
// mette nessun ruolo «sopra»: e' il caso delle prove che guardano altro.
const cheRuolo = (foto) => {
  const liv = foto?.bot?.livello;
  const livello = liv === undefined || liv === null || !Number.isFinite(Number(liv)) ? Infinity : Number(liv);
  return (r) => tipoRuolo(r, { livello, miei: foto?.bot?.ruoli || [], guildId: foto?.guild?.id || '' });
};

export function ruoliIntoccabili(foto) {
  const tipo = cheRuolo(foto);
  return new Set((foto?.ruoli || []).filter((r) => r?.id && tipo(r) !== 'gestibile').map((r) => String(r.id)));
}

// I ruoli come li vuole il preset. Il nome e' l'unica cosa obbligatoria: un
// ruolo senza privilegi e senza colore e' legittimo — serve a dire «questo e'
// uno di noi» e basta.
function voluteRuoli(preset) {
  const fuori = [];
  const visti = new Set();
  for (const r of (preset?.ruoli || [])) {
    const nome = nomeRuolo(r?.nome);
    if (!nome) continue;
    const k = nome.toLowerCase();
    if (visti.has(k)) continue;        // lo stesso ruolo scritto due volte e' un ruolo solo
    visti.add(k);
    // Il ruolo «tuo» e' uno: il primo che lo dice lo prende, gli altri no. Due
    // ruoli entrambi «del proprietario» non sono un errore da segnalare, sono
    // una frase che si capisce solo a meta' — e a meta' si prende la prima.
    const aChi = aChiDi(r?.aChi) === 'tu' && fuori.some((x) => x.aChi === 'tu') ? '' : aChiDi(r?.aChi);
    fuori.push({
      nome,
      ...normalizzaTinta(r),
      segno: normalizzaSegno(r?.segno),
      aChi,
      separato: !!r?.separato,
      citabile: !!r?.citabile,
      privilegi: [...new Set((Array.isArray(r?.privilegi) ? r.privilegi : []).map(String))],
      // «questo ruolo lo prendo da quello che c'e' gia'»: l'id di un ruolo del
      // server che va RINOMINATO invece di nascere. Ci arriva dal consiglio,
      // accettato dallo streamer — non si decide qui.
      da: String(r?.da || '').replace(/[^0-9]/g, '').slice(0, 24),
    });
    if (fuori.length >= MAX_RUOLI) break;
  }
  return fuori;
}

// Le categorie e i canali come li vuole il preset, appiattiti in intenzioni.
// Una categoria senza canali e' comunque un'intenzione: c'e' chi la vuole vuota
// per metterci dentro roba a mano.
// I MODI CHE LA TRACCIA HA DETTO, e solo quelli.
//
// Un campo che la traccia non nomina non e' «zero»: e' «non mi interessa», e
// mandarlo a Discord riscriverebbe una scelta che lo streamer aveva fatto a
// mano sul suo server. Qui passa solo cio' che e' stato scritto.
const MODI = ['lento', 'adulti', 'archivia', 'tag', 'tagObbligatorio'];
const modiDi = (ch) => Object.fromEntries(MODI.filter((k) => ch?.[k] !== undefined).map((k) => [k, ch[k]]));

function voluti(preset) {
  const fuori = [];
  // I canali che stanno in cima, fuori da ogni categoria. Discord li permette
  // e quasi tutti i server ne hanno uno: se il modello non li sapesse dire,
  // «parti dal server che hai» perderebbe proprio quelli.
  for (const ch of (preset?.canali || [])) {
    if (!ch || !String(ch.nome || '').trim()) continue;
    const tipo = TIPI[ch.tipo] ?? TIPI.testo;
    if (tipo === TIPI.categoria) continue;
    fuori.push({ tipo, nome: nomeCanale(tipo, ch.nome), dentro: null, permessi: ch.permessi || null, argomento: ch.argomento || '', avvisi: !!ch.avvisi, ...modiDi(ch) });
    if (fuori.length >= MAX_CANALI) return fuori;
  }
  for (const c of (preset?.categorie || []).slice(0, MAX_CATEGORIE)) {
    if (!c || !String(c.nome || '').trim()) continue;
    const cat = { tipo: TIPI.categoria, nome: nomeCanale(TIPI.categoria, c.nome), dentro: null, permessi: c.permessi || null };
    fuori.push(cat);
    for (const ch of (c.canali || [])) {
      if (!ch || !String(ch.nome || '').trim()) continue;
      const tipo = TIPI[ch.tipo] ?? TIPI.testo;
      if (tipo === TIPI.categoria) continue;   // una categoria dentro una categoria non esiste
      fuori.push({ tipo, nome: nomeCanale(tipo, ch.nome), dentro: cat.nome, permessi: ch.permessi || null, argomento: ch.argomento || '', avvisi: !!ch.avvisi, ...modiDi(ch) });
      if (fuori.length >= MAX_CANALI + MAX_CATEGORIE) return fuori;
    }
  }
  return fuori;
}

// La fotografia indicizzata: per ogni categoria, cosa c'e' dentro.
function indice(foto) {
  const canali = (foto?.canali || []).filter((c) => c && c.id != null);
  const perId = new Map(canali.map((c) => [String(c.id), c]));
  const dentroDi = (c) => {
    const p = c.parent_id ? perId.get(String(c.parent_id)) : null;
    return p ? nomeCanale(TIPI.categoria, p.nome) : null;
  };
  const mappa = new Map();
  const perNome = new Map();   // nome+tipo → quanti, e quale (per la seconda occhiata)
  for (const c of canali) {
    const k = (c.tipo === TIPI.categoria ? '' : (dentroDi(c) || '') + '/') + chiave(c.tipo, c.nome);
    if (!mappa.has(k)) mappa.set(k, c);
    const n = chiave(c.tipo, c.nome);
    const gia = perNome.get(n);
    perNome.set(n, gia ? { quanti: gia.quanti + 1, uno: gia.uno } : { quanti: 1, uno: c });
  }
  return { canali, perId, dentroDi, mappa, perNome };
}

const dove = (v) => (v.tipo === TIPI.categoria ? '' : (v.dentro || '') + '/') + chiave(v.tipo, v.nome);

// I permessi che il preset chiede, confrontati con quelli che il canale ha.
// Si guarda solo quello che il preset NOMINA: un preset e' un pacchetto di
// differenze, non una copia che sovrascrive tutto (vedi occasioni.js).
function permessiDiversi(voluto, attuale) {
  if (!voluto) return false;
  const ora = new Map((attuale?.overwrites || []).map((o) => [String(o.id), { allow: String(o.allow || '0'), deny: String(o.deny || '0') }]));
  for (const p of voluto) {
    const a = ora.get(String(p.id));
    if (!a || a.allow !== String(p.allow || '0') || a.deny !== String(p.deny || '0')) return true;
  }
  return false;
}

// I PERMESSI CHE IL CANALE AVRA'. Discord non sa aggiungere una riga di
// permessi: quando gliene mandi l'elenco, sostituisce quello che c'era. Mandargli
// solo i permessi del preset cancellerebbe tutti gli altri — quelli che lo
// streamer ha messo a mano, quelli di un altro bot, quelli di un ruolo che non
// ci riguarda.
//
// Quindi l'elenco da mandare si compone QUI, dove abbiamo sotto gli occhi
// com'e' adesso: si parte da quello che c'e' e si sostituiscono soltanto le
// righe che il preset nomina. Non e' una precauzione, e' l'unico modo di dire a
// Discord «cambia questo» usando un verbo che vuol dire «metti tutto».
export function fondiPermessi(attuale, voluti) {
  const riga = (o) => ({
    id: String(o?.id || ''),
    tipo: Number(o?.tipo ?? o?.type ?? 0) === 1 ? 1 : 0,
    allow: String(o?.allow || '0'),
    deny: String(o?.deny || '0'),
  });
  const fuori = new Map();
  for (const o of (attuale?.overwrites || [])) { const r = riga(o); if (r.id) fuori.set(r.id, r); }
  for (const o of (voluti || [])) { const r = riga(o); if (r.id) fuori.set(r.id, r); }
  return [...fuori.values()];
}

// LA DIFFERENZA DEI RUOLI, che e' la stessa idea dei canali su un'altra materia.
//
// Tre cose la rendono diversa, e sono tutte regole di Discord:
//
//  · SOPRA IL BOT NON SI ARRIVA. Un ruolo piu' in alto del suo non si tocca —
//    ne' si cambia ne' si cancella — e quelli non entrano nemmeno nell'elenco
//    delle cose da fare. Provarci sarebbe un errore a meta' strada invece di
//    una frase detta prima.
//  · SI PUO' DARE SOLO QUELLO CHE SI HA. Un privilegio che il bot non possiede
//    non si puo' passare a nessuno. Non lo si prova e si fallisce: si toglie da
//    quello che si manda, e si dice quale — un ruolo creato a meta' e' peggio
//    di un ruolo non creato, perche' sembra a posto.
//  · CANCELLARE UN RUOLO LO TOGLIE A TUTTI QUELLI CHE CE L'HANNO, in silenzio.
//    Non c'e' un «ultimo messaggio» da cui capire se era vivo, quindi il peso
//    lo da' un'altra cosa: se portava dei privilegi, perderlo cambia chi puo'
//    fare cosa. Quello non e' un dettaglio da confermare a occhio.
//
// E il modo normale non spegne niente: aggiunge i privilegi che la traccia
// nomina e lascia stare gli altri. Solo il distruttivo fa diventare il ruolo
// ESATTAMENTE quello che dice la traccia — e anche li' tocca soltanto i
// privilegi che sappiamo nominare, perche' quelli che non sappiamo dire non
// potremmo nemmeno mostrarli nell'anteprima.
export function differenzaRuoli(foto, preset, { togliere = false, puoiDare = null, nostri = DA_DARE, immagini = null } = {}) {
  // QUELLO CHE IL SERVER NON SA FARE NON SI CHIEDE, e si dice quale.
  //
  // Il segno e la sfumatura vogliono due caratteristiche che il server puo' non
  // avere. Mandarle lo stesso vorrebbe dire un rifiuto di Discord a meta'
  // costruzione, su una cosa che sapevamo gia' prima di partire.
  const caratteristiche = new Set(foto?.caratteristiche || []);
  const puoSegni = caratteristiche.has(CON_SEGNO);
  const puoTinte = caratteristiche.has(CON_TINTE);
  const manca = [];
  // I ruoli che lo streamer ha deciso di tenere anche se la traccia non li
  // prevede. E' una LISTA DI ID, non di nomi: un ruolo risparmiato che poi
  // qualcuno rinomina resta risparmiato, che e' quello che voleva dire.
  const salvi = new Set((Array.isArray(preset?.risparmia) ? preset.risparmia : []).map((x) => String(x || '').replace(/[^0-9]/g, '')).filter(Boolean));
  const fuoriMano = ruoliIntoccabili(foto);
  const tipo = cheRuolo(foto);
  const lista = voluteRuoli(preset);
  const attuali = (foto?.ruoli || []).filter((r) => r?.id);

  const quanti = new Map();
  for (const r of attuali) {
    const k = chiaveRuolo(r.nome);
    quanti.set(k, (quanti.get(k) || 0) + 1);
  }

  const crea = []; const sistema = []; const ambigui = []; const fuoriPortata = []; const nonPosso = [];
  const doppioni = [];
  const preso = new Set();

  for (const v of lista) {
    const k = chiaveRuolo(v.nome);
    // PRIMA si guarda se questo ruolo deve prendere il posto di uno che c'e'
    // gia' (`da`): e' una scelta esplicita, e vince sul nome. Rinominare tiene
    // dentro chi quel ruolo ce l'aveva; cancellare e ricreare lo toglie a tutti.
    const chiesto = v.da ? attuali.find((r) => String(r.id) === v.da) : null;
    if (chiesto && fuoriMano.has(v.da)) { fuoriPortata.push(chiesto.nome); continue; }
    // Con `da` non si ripiega sul nome: il nome e' proprio quello che stava
    // cambiando, e ripiegarci sopra vorrebbe dire fare un'altra cosa in
    // silenzio. Se quell'id non c'e' piu', il ruolo nasce.
    const gia = v.da
      ? (chiesto && !preso.has(v.da) ? chiesto : null)
      : attuali.find((r) => chiaveRuolo(r.nome) === k);
    if (!v.da && (quanti.get(k) || 0) > 1) { ambigui.push(v.nome); continue; }

    // I privilegi che la traccia chiede, meno quelli che il bot non ha da dare.
    const voluti = sommaPrivilegi(v.privilegi);
    const negati = puoiDare ? v.privilegi.filter((p) => !puoiDare(p)) : [];
    for (const p of negati) if (!nonPosso.includes(p)) nonPosso.push(p);
    const daDare = puoiDare ? sommaPrivilegi(v.privilegi.filter((p) => puoiDare(p))) : voluti;

    // Quello che il server non sa fare si toglie QUI, una volta, e vale sia per
    // i ruoli nuovi sia per quelli da sistemare: due filtri in due posti
    // diventerebbero due regole diverse al primo cambiamento.
    const tinta = puoTinte ? { sfuma: v.sfuma, olografico: v.olografico } : { sfuma: null, olografico: false };
    if (!puoTinte && (v.sfuma !== null || v.olografico) && !manca.includes('tinte')) manca.push('tinte');
    // I BYTE DI UN'IMMAGINE ENTRANO SOLO DA QUI.
    //
    // Non stanno nella traccia e non possono starci: arrivano con la richiesta
    // di costruire, per nome di ruolo, e da questo punto in poi vivono quanto
    // dura la chiamata. E' la forma che rende impossibile conservarli per
    // sbaglio — non una regola da ricordare.
    const dato = immagini ? String(immagini[chiaveRuolo(v.nome)] || '') : '';
    const vuole = dato ? { tipo: 'immagine', dato } : v.segno;
    const segno = puoSegni ? vuole : { tipo: 'niente' };
    if (!puoSegni && vuole.tipo !== 'niente' && !manca.includes('segni')) manca.push('segni');

    if (!gia) {
      const gemelli = v.da ? [] : gemelliIntoccabili(v, attuali, fuoriMano, preso);
      if (gemelli.length) {
        for (const g of gemelli) {
          preso.add(String(g.id));
          fuoriPortata.push(g.nome);
          doppioni.push({ nome: g.nome, diventa: v.nome, perche: tipo(g) });
        }
        continue;
      }
      // Se l'olografico non si puo', resta il suo primo colore: e' la cosa piu'
      // vicina a quello che aveva scelto, e il perche' e' scritto in `manca`.
      crea.push({ nome: v.nome, colore: v.colore, ...tinta,
        ...(segno.tipo === 'niente' ? {} : { segno }),
        separato: v.separato, citabile: v.citabile, permessi: String(daDare) });
      continue;
    }
    preso.add(String(gia.id));
    if (fuoriMano.has(String(gia.id))) { fuoriPortata.push(gia.nome); continue; }

    const cambia = {};
    if (chiaveRuolo(gia.nome) !== k) cambia.rinomina = v.nome;
    // LA TINTA SI CONFRONTA TUTTA INSIEME, e non un campo per volta: il primo
    // colore da solo non distingue una sfumatura da una tinta piena, e un
    // confronto che non distingue riscrive ogni volta lo stesso ruolo.
    const oraTinta = normalizzaTinta(gia);
    const vuoleTinta = normalizzaTinta({ colore: v.colore, ...tinta });
    if (oraTinta.colore !== vuoleTinta.colore || oraTinta.sfuma !== vuoleTinta.sfuma
      || oraTinta.olografico !== vuoleTinta.olografico) Object.assign(cambia, vuoleTinta);
    // IL SEGNO: si scrive solo se e' davvero un altro. Un'immagine gia' li' con
    // la stessa impronta non e' «da rimettere» — e rimetterla vorrebbe dire
    // chiedere di nuovo dei byte che non abbiamo tenuto.
    if (!stessoSegno(segnoDi(gia), segno)) cambia.segno = segno;
    if (!!gia.separato !== v.separato) cambia.separato = v.separato;
    if (!!gia.citabile !== v.citabile) cambia.citabile = v.citabile;
    let ora = 0n;
    try { ora = BigInt(gia.permessi || 0); } catch { ora = 0n; }
    // Normale: si aggiunge. Distruttivo: il ruolo diventa la traccia, ma solo
    // nei privilegi che sappiamo nominare — gli altri restano dove sono,
    // perche' spegnere una cosa che non sappiamo dire vorrebbe dire cambiare
    // il server senza poterlo mostrare.
    const dopo = togliere ? ((ora & ~nostri) | daDare) : (ora | daDare);
    if (dopo !== ora) cambia.permessi = String(dopo);
    if (Object.keys(cambia).length) sistema.push({ id: String(gia.id), nome: gia.nome, ...cambia });
  }

  const togli = [];
  // I VECCHI CHE RESTANO, e perche'. Facendo piazza pulita un ruolo che non si
  // puo' togliere non sparisce: si dice prima, con la sua ragione. Tacerlo era
  // il difetto — un server «ripulito» con dentro i ruoli di prima, e nessuna
  // riga che dicesse come mai.
  const restano = [];
  if (togliere) {
    for (const r of attuali) {
      if (preso.has(String(r.id))) continue;
      if (salvi.has(String(r.id))) continue;
      if (fuoriMano.has(String(r.id))) {
        const t = tipo(r);
        if (t !== 'tutti') restano.push({ id: String(r.id), nome: r.nome, perche: t });
        continue;
      }
      let suoi = 0n;
      try { suoi = BigInt(r.permessi || 0); } catch { suoi = 0n; }
      togli.push({ id: String(r.id), nome: r.nome, colore: Number(r.colore) || 0,
        separato: !!r.separato, conPotere: (suoi & nostri) !== 0n });
    }
  }

  return { crea, sistema, togli, restano, doppioni, ambigui, fuoriPortata, nonPosso, manca };
}

// UN RUOLO CHE FA GIA' QUEL MESTIERE, fuori dalla portata del bot. Crearne un
// altro accanto farebbe due «Moderatori»: quello vero, coi poteri e con la
// gente dentro, e il nostro, vuoto — ed e' quello che il proprietario si e'
// trovato sul server. Non si crea: si dice, e il giorno che il bot arriva a
// toccarlo lo prende il consiglio. Anche se sono due: il mestiere c'e' gia',
// e un terzo ruolo non lo farebbe meglio — lo farebbe vuoto.
function gemelliIntoccabili(v, attuali, fuoriMano, preso) {
  const k = chiaveRuolo(v.nome);
  const nomi = [k, ...(ALTRI_NOMI[k] || [])];
  return attuali.filter((r) => fuoriMano.has(String(r.id)) && !preso.has(String(r.id))
    && nomi.includes(chiaveRuolo(r.nome)));
}

// A CHI VANNO I RUOLI DELLA TRACCIA, con i fatti in mano.
//
// Pura: le due cose che servono da fuori — i ruoli che il proprietario ha
// adesso, e le regole gia' scritte nella scheda dei Ruoli — arrivano come dati.
// Cosi' guardare e fare leggono la stessa risposta, e una prova la puo'
// misurare senza Discord.
//
// Parte da quello che `differenzaRuoli` ha gia' deciso invece di rifarlo: un
// ruolo ambiguo o fuori portata la' non si tocca, e non deve diventare
// «tuo» qui per una strada laterale.
//
// E NON SI RISCRIVE L'UGUALE: il ruolo che il proprietario ha gia' non glielo
// si ridà, e la regola che c'e' gia' non si riscrive. Altrimenti l'anteprima
// direbbe per sempre «c'e' qualcosa da fare» su un server gia' a posto.
export function aChiVanno(foto, preset, dRuoli, { ruoliDelProprietario = null, regoleOra = [] } = {}) {
  const fuori = { aTe: null, nonATe: '', regole: [] };
  const proprietario = String(foto?.guild?.proprietario || '');
  const saltati = new Set([...(dRuoli?.ambigui || []), ...(dRuoli?.fuoriPortata || [])].map(chiaveRuolo));
  const nasce = new Set((dRuoli?.crea || []).map((r) => chiaveRuolo(r.nome)));
  const attuali = (foto?.ruoli || []).filter((r) => r?.id);
  const idDi = (v) => {
    if (v.da && attuali.some((r) => String(r.id) === v.da)) return v.da;
    const c = attuali.filter((r) => chiaveRuolo(r.nome) === chiaveRuolo(v.nome));
    return c.length === 1 ? String(c[0].id) : '';
  };
  const gia = new Set((Array.isArray(regoleOra) ? regoleOra : []).map((r) => `${r?.tipo}|${r?.ruolo}`));
  for (const v of voluteRuoli(preset)) {
    if (!v.aChi) continue;
    const k = chiaveRuolo(v.nome);
    if (saltati.has(k)) {
      if (v.aChi === 'tu') fuori.nonATe = v.nome;
      continue;
    }
    const id = nasce.has(k) ? '' : idDi(v);
    if (!nasce.has(k) && !id) continue;             // ne' c'e' ne' nasce: non c'e' niente da dare
    if (v.aChi === 'tu') {
      if (!proprietario) continue;
      if (id && Array.isArray(ruoliDelProprietario) && ruoliDelProprietario.map(String).includes(id)) continue;
      fuori.aTe = id ? { nome: v.nome, id } : { nome: v.nome };
      continue;
    }
    if (id && gia.has(`${v.aChi}|${id}`)) continue;
    fuori.regole.push(id ? { tipo: v.aChi, nome: v.nome, id } : { tipo: v.aChi, nome: v.nome });
  }
  return fuori;
}

// ALTRI MODI DI DIRE LA STESSA COSA.
//
// Il server che uno ha gia' non usa i nomi della traccia: ha «mod» dove la
// traccia dice «Moderatori», «sub» dove dice «Abbonati». Per il confronto sono
// due elenchi di stringhe senza niente in comune, e abbinarli e' un'IPOTESI.
//
// Un'ipotesi che rinomina o cancella i ruoli di qualcuno costa: percio' qui non
// c'e' nessun punteggio di somiglianza. C'e' una tabella scritta a mano, che si
// legge, si discute e si corregge. «staff» sta qui perche' ce l'abbiamo messo
// noi, non perche' un algoritmo l'ha trovato vicino a «Moderatori» — e il
// giorno che e' sbagliato si toglie una riga.
//
// Quello che NON c'e' in tabella non si abbina. Mai.
export const ALTRI_NOMI = Object.freeze({
  moderatori: ['mod', 'mods', 'moderatore', 'moderator', 'moderators', 'staff', 'modteam'],
  abbonati: ['sub', 'subs', 'abbonato', 'subscriber', 'subscribers', 'tier 1', 'tier1'],
  vip: ['vips', 'vip del canale'],
  streamer: ['host', 'broadcaster', 'padrone di casa'],
});

// IL CONSIGLIO: «sarebbe cosi', io lascerei solo questi, chiamandoli in questo
// modo». Un'opinione con la ragione accanto, non una cosa che succede.
//
// Dice tre cose diverse, e sono diverse sul serio:
//
//  · PRENDI — questo ruolo fa gia' il mestiere di uno della traccia, sotto un
//    altro nome. Si RINOMINA quello che c'e'. In modalita' distruttiva e' l'unico
//    modo che non spoglia nessuno: cancellare «mod» e creare «Moderatori» toglie
//    il ruolo a tutti quelli che ce l'avevano, e nessuno se ne accorge finche'
//    non prova a bannare qualcuno.
//
//  · RISPARMIA — la traccia non lo prevede, ma ha dei poteri o si fa vedere
//    nell'elenco delle persone. In distruttivo sparirebbe: io lo lascerei stare.
//
//  · TOGLI — non e' nella traccia, non ha poteri, non si fa vedere. Non resta
//    niente da perdere.
//
// L'ambiguita' ferma il consiglio, come per i canali: se «mod» e «mods»
// esistono tutti e due, quale dei due diventa «Moderatori» non lo sappiamo, e
// tirare a indovinare qui vuol dire rinominare il ruolo sbagliato.
export function consiglioRuoli(foto, preset) {
  const fuoriMano = ruoliIntoccabili(foto);
  const tipo = cheRuolo(foto);
  const lista = voluteRuoli(preset);
  const tutti = (foto?.ruoli || []).filter((r) => r?.id);
  const attuali = tutti.filter((r) => !fuoriMano.has(String(r.id)));

  const perChiave = new Map();
  for (const r of attuali) {
    const k = chiaveRuolo(r.nome);
    if (!perChiave.has(k)) perChiave.set(k, []);
    perChiave.get(k).push(r);
  }
  const unoSolo = (k) => (perChiave.get(k) || []).length === 1 ? perChiave.get(k)[0] : null;

  const prendi = []; const crea = []; const doppioni = []; const impegnati = new Set();

  for (const v of lista) {
    const k = chiaveRuolo(v.nome);
    if (perChiave.has(k)) {                       // si chiama gia' cosi': non c'e' niente da consigliare
      for (const r of perChiave.get(k)) impegnati.add(String(r.id));
      continue;
    }
    const altri = ALTRI_NOMI[k] || [];
    const trovati = altri.map(unoSolo).filter(Boolean).filter((r) => !impegnati.has(String(r.id)));
    // Nessuno da prendere: prima di dire «lo creo» si guarda se ce n'e' gia'
    // uno che il bot non arriva a toccare. In quel caso non nasce un doppione.
    const gemelli = trovati.length ? [] : gemelliIntoccabili(v, tutti, fuoriMano, impegnati);
    if (gemelli.length) {
      for (const g of gemelli) {
        impegnati.add(String(g.id));
        doppioni.push({ nome: g.nome, diventa: v.nome, perche: tipo(g) });
      }
      continue;
    }
    if (trovati.length !== 1) { crea.push(v.nome); continue; }   // nessuno, o piu' d'uno: non si indovina
    const r = trovati[0];
    impegnati.add(String(r.id));
    prendi.push({ id: String(r.id), nome: r.nome, diventa: v.nome });
  }

  const risparmia = []; const togli = [];
  for (const r of attuali) {
    if (impegnati.has(String(r.id))) continue;
    let suoi = 0n;
    try { suoi = BigInt(r.permessi || 0); } catch { suoi = 0n; }
    const conPotere = (suoi & DA_DARE) !== 0n;
    const riga = { id: String(r.id), nome: r.nome, conPotere, separato: !!r.separato };
    if (conPotere || r.separato) risparmia.push(riga);
    else togli.push(riga);
  }

  return { prendi, risparmia, togli, crea, doppioni };
}

// IL CONSIGLIO APPLICATO: solo i RINOMINI, e il motivo e' preciso.
//
// In modalita' distruttiva il server diventa esattamente la traccia. Un
// rinomina non tocca quell'invariante — «mod» diventa «Moderatori», e alla
// fine il server ha esattamente i ruoli della traccia — ma non spoglia chi quel
// ruolo ce l'aveva. E' il consiglio applicato dove applicarlo e' gratis.
//
// Il RISPARMIO no: risparmiare un ruolo che la traccia non prevede vuol dire
// che il server NON diventa la traccia. Quella e' una deroga, e una deroga la
// decide chi ha il server, non noi al posto suo. Resta un gesto, in elenco.
export function applicaConsiglio(preset, consiglio) {
  const prendi = consiglio?.prendi || [];
  if (!prendi.length) return preset;
  const per = new Map(prendi.map((p) => [nomeRuolo(p.diventa).toLowerCase(), String(p.id)]));
  return {
    ...preset,
    ruoli: (preset?.ruoli || []).map((r) => {
      const id = per.get(nomeRuolo(r?.nome).toLowerCase());
      return (id && !r?.da) ? { ...r, da: id } : r;
    }),
  };
}

// LA DIFFERENZA. `togliere` decide se ne fa parte anche la terza direzione.
export function differenza(foto, preset, { togliere = false, puoiToccare = null } = {}) {
  const idx = indice(foto);
  const fuoriMano = intoccabili(foto);
  // FIN DOVE ARRIVA IL BOT, canale per canale.
  //
  // Discord manda l'elenco di TUTTI i canali, anche quelli che il bot non puo'
  // nemmeno vedere. Senza questa domanda l'anteprima li contava fra le cose da
  // fare e poi Discord diceva di no, uno per uno: «ventotto da cancellare» e
  // tre cancellati davvero, con un errore solo perche' venticinque messaggi
  // identici diventano una riga.
  //
  // Un'anteprima che promette cose che non si possono fare e' peggio di
  // un'anteprima che ne promette meno: e' quella che fa perdere fiducia in
  // tutto il resto. Quindi quello che non si puo' toccare non entra
  // nell'elenco — si dice a parte, prima.
  const fuoriPortata = [];
  if (puoiToccare) {
    for (const c of idx.canali) {
      if (fuoriMano.has(String(c.id))) continue;
      if (puoiToccare(c)) continue;
      fuoriMano.add(String(c.id));
      fuoriPortata.push({ id: String(c.id), nome: c.nome, tipo: c.tipo });
    }
  }
  const lista = voluti(preset);

  const crea = [];
  const sistema = [];
  // Due passate: prima chi si riconosce senza dubbi (stessa categoria, stesso
  // nome), e solo dopo la seconda occhiata. Se si facesse tutto in una volta,
  // un canale fuori posto potrebbe rubare il riconoscimento a uno che stava
  // esattamente dove doveva.
  const preso = new Set();
  const trovati = new Map();
  for (const v of lista) {
    const gia = idx.mappa.get(dove(v));
    if (gia && !preso.has(String(gia.id))) { trovati.set(v, gia); preso.add(String(gia.id)); }
  }
  for (const v of lista) {
    if (trovati.has(v)) continue;
    const solo = idx.perNome.get(chiave(v.tipo, v.nome));
    if (solo && solo.quanti === 1 && !preso.has(String(solo.uno.id))) {
      trovati.set(v, solo.uno);
      preso.add(String(solo.uno.id));
    }
  }
  // QUAL E' IL CANALE DEGLI AVVISI, che sia nato adesso o ci fosse gia'. Chi
  // applica lo passa alla scheda degli avvisi, cosi' costruire il server
  // BASTA: non si finisce con un canale che si chiama «sono-in-onda» e un
  // avviso che non sa dove andare.
  let avvisi = null;
  for (const v of lista) {
    const gia = trovati.get(v);
    if (v.avvisi) avvisi = gia ? { id: String(gia.id), nome: gia.nome } : { nome: v.nome, dentro: v.dentro };
    if (!gia) { crea.push({ ...v, perche: 'non c\'e\'' }); continue; }
    const cambia = {};
    if (permessiDiversi(v.permessi, gia)) cambia.permessi = fondiPermessi(gia, v.permessi);
    if (v.argomento && String(gia.argomento || '') !== v.argomento) cambia.argomento = v.argomento;
    // I modi: si guarda solo quel che la traccia ha detto, e si scrive solo se
    // e' diverso da com'e' adesso. Riscrivere l'uguale vorrebbe dire una riga
    // nel registro del server a ogni giro, per non aver cambiato niente.
    for (const k of MODI) {
      if (v[k] === undefined) continue;
      const ora = gia[k];
      const diverso = Array.isArray(v[k])
        ? JSON.stringify([...(Array.isArray(ora) ? ora : [])].sort()) !== JSON.stringify([...v[k]].sort())
        : String(ora ?? '') !== String(v[k]);
      if (diverso) cambia[k] = v[k];
    }
    // Un canale finito fuori dalla sua categoria si rimette dentro: e' la cosa
    // che succede davvero quando qualcuno trascina per sbaglio. Il contrario
    // no: un canale che il preset vuole in cima ma che sta dentro a qualcosa
    // non si tira fuori. Spostare verso una casa e' rimettere a posto,
    // spostare verso il nulla e' far sparire dalla vista.
    if (v.dentro && idx.dentroDi(gia) !== v.dentro) cambia.dentro = v.dentro;
    if (fuoriMano.has(String(gia.id))) continue;
    if (Object.keys(cambia).length) sistema.push({ id: String(gia.id), nome: gia.nome, tipo: gia.tipo, ...cambia });
  }

  const togli = [];
  if (togliere) {
    for (const c of idx.canali) {
      // Chi e' stato riconosciuto — anche fuori posto — non si toglie: lo si
      // sistema. Sennò il canale trascinato sparirebbe e ne nascerebbe uno
      // nuovo vuoto al suo posto, che e' il modo peggiore di avere ragione.
      if (preso.has(String(c.id))) continue;
      if (fuoriMano.has(String(c.id))) continue;
      // IL PESO, per l'anteprima: quanto costa perderlo.
      //
      // Un canale che non ha mai parlato non e' per forza morto: puo' essere
      // nato ieri. Percio' vanno tutte e due le date, e chi mostra sceglie
      // quale raccontare.
      //
      // Una CATEGORIA non riceve messaggi mai, per come e' fatta Discord. La
      // sua ultima parola e' l'ultima dei canali che contiene, e i canali che
      // contiene sono il vero motivo per cui cancellarla o no: dire «mai
      // usata» di una categoria piena di roba viva e' la frase che ti fa
      // premere il tasto sbagliato.
      const suoi = c.tipo === TIPI.categoria
        ? idx.canali.filter((x) => x.parent_id && String(x.parent_id) === String(c.id))
        : null;
      togli.push({ id: String(c.id), nome: c.nome, tipo: c.tipo,
        ultimoMessaggio: suoi
          ? suoi.reduce((t, x) => Math.max(t, Number(x.ultimoMessaggio) || 0), 0)
          : (Number(c.ultimoMessaggio) || 0),
        nato: Number(c.nato) || 0,
        dentro: idx.dentroDi(c),
        ...(suoi ? { dentroCi: suoi.length } : {}) });
    }
  }

  return { crea, sistema, togli, avvisi, fuoriPortata, intoccabili: fuoriMano,
    server: differenzaServer(preset, foto) };
}

// LE IMPOSTAZIONI DEL SERVER: cosa cambierebbe, campo per campo.
//
// Solo cio' che la traccia nomina, e solo se e' DIVERSO da adesso. Riscrivere
// l'uguale vorrebbe dire una riga nel registro del server a ogni giro, per non
// aver cambiato niente — e chi legge quel registro si chiederebbe cosa combina
// questo bot tutte le sere.
//
// I canali nominati per id vanno controllati: un canale cancellato lascerebbe
// un id che non esiste piu', e Discord rifiuterebbe tutta la chiamata — cioe'
// una impostazione sbagliata ne farebbe fallire otto giuste.
const CAMPI_SERVER = ['verifica', 'filtro', 'notifiche', 'attesaAfk', 'barraBoost',
  'lingua', 'invitiFermi'];
const CANALI_SERVER = ['canaleSistema', 'canaleRegole', 'canaleAvvisiStaff', 'canaleSicurezza', 'canaleAfk'];

export function differenzaServer(preset, foto) {
  const voluto = preset?.server;
  if (!voluto || typeof voluto !== 'object') return null;
  const ora = foto?.impostazioni || {};
  const ci = new Set((foto?.canali || []).map((c) => String(c?.id || '')).filter(Boolean));
  const cambia = {};
  const dice = [];
  for (const k of CAMPI_SERVER) {
    if (voluto[k] === undefined) continue;
    if (String(ora[k] ?? '') === String(voluto[k])) continue;
    cambia[k] = voluto[k];
    dice.push({ campo: k, da: ora[k], a: voluto[k] });
  }
  for (const k of CANALI_SERVER) {
    if (voluto[k] === undefined) continue;
    const v = String(voluto[k] || '');
    if (v && !ci.has(v)) continue;          // un canale che non c'e' piu' non si nomina
    if (String(ora[k] || '') === v) continue;
    cambia[k] = v;
    dice.push({ campo: k, da: ora[k] || '', a: v });
  }
  // L'ANGOLO AFK NOMINATO DALLA TRACCIA vale solo se il server non ne ha gia'
  // uno. La traccia lo crea perche' un server nuovo ne resti senza; uno che ce
  // l'ha gia' scelto se lo tiene — e' la stessa regola del «lascia com'e'»: si
  // riempie un vuoto, non si cambia una scelta.
  const nomeAfk = String(voluto.canaleAfkNome || '').trim();
  if (nomeAfk && !cambia.canaleAfk && !String(ora.canaleAfk || '')) {
    // Un canale AFK e' per forza un vocale: Discord rifiuta il resto.
    const c = (foto?.canali || []).find((x) => Number(x?.tipo) === TIPI.voce && chiaveNome(x?.nome) === chiaveNome(nomeAfk));
    if (c) cambia.canaleAfk = String(c.id);
    else cambia.canaleAfkNome = nomeAfk;
    dice.push({ campo: 'canaleAfk', da: '', a: nomeAfk });
  }
  if (voluto.zittisci) {
    const oraZ = ora.zittisci || {};
    const diverso = Object.keys(voluto.zittisci).some((k) => !!oraZ[k] !== !!voluto.zittisci[k]);
    if (diverso) { cambia.zittisci = voluto.zittisci; dice.push({ campo: 'zittisci' }); }
  }
  if (!Object.keys(cambia).length) return null;
  // «metti in pausa gli inviti» e' una caratteristica: per cambiarla serve
  // l'elenco di adesso, se no le altre sparirebbero insieme a lei.
  if (cambia.invitiFermi !== undefined) cambia.featuresOra = foto?.caratteristiche || [];
  return { cambia, dice };
}

// ------------------------------------------------------ la porta d'ingresso
//
// Chi arriva su un server incontra tre cose: la schermata di benvenuto, le
// domande («cosa ti interessa?») e i canali che si apre rispondendo. Discord le
// tiene in due chiamate diverse, ma il mestiere e' uno solo: dire a chi non ti
// conosce dove andare.
//
// TRE REGOLE, e ognuna toglie un difetto invece di correggerlo dopo.
//
//  · IL MODO NON E' UNA MANOPOLA, E' UNA CONSEGUENZA. Prima di accendere la
//    porta Discord conta i canali, e conta anche quelli che le risposte aprono
//    solo se il modo e' quello avanzato. Metterlo fra le scelte vorrebbe dire
//    chiedere di indovinare una regola scritta da un altro: se ci sono domande,
//    i loro canali devono contare, e il numero lo sappiamo noi.
//  · LE CONDIZIONI SI CONTANO PRIMA. Il server dev'essere di tipo Community, e
//    con la porta accesa servono almeno sette canali che contano e almeno
//    cinque dove tutti possono scrivere. Sono cose che si guardano: dirle a
//    parole prima di partire e' un'altra cosa dal farsi rifiutare la chiamata e
//    tradurre il rifiuto.
//  · NON SI RISCRIVE L'UGUALE. Le risposte che le persone hanno gia' dato sono
//    attaccate alle domande di adesso: riscriverle identiche le cancellerebbe
//    tutte. Qui «non fare niente» non e' pigrizia, e' non rovinare.
// Quante domande e quante risposte. Discord ne accetta di piu', ma una porta
// d'ingresso con quindici domande non la finisce nessuno: chi entra la chiude e
// se ne va. Questo e' il numero oltre il quale smette di essere una porta.
export const MAX_DOMANDE = 8;
export const MAX_RISPOSTE = 20;

// LA PORTA, MESSA IN ORDINE. Sta QUI e non nel catalogo perche' la usano in
// due: chi scrive la traccia e chi la CONFRONTA con quella che c'e' sul
// server. Se il confronto passasse da una normalizzazione diversa, direbbe
// «diverso» per un campo lasciato vuoto — e la porta si riscriverebbe tutte le
// sere, cancellando ogni volta le risposte gia' date.
//
// Canali e ruoli si nominano per NOME, non per id: la traccia li sta creando
// nello stesso giro, e un id scritto qui sarebbe l'id di un canale che non
// esiste ancora, o di uno cancellato il mese scorso.
export function normalizzaIngresso(g) {
  if (!g || typeof g !== 'object') return null;
  const testo = (v, max) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, max);
  const nomi = (v, max) => [...new Set((Array.isArray(v) ? v : []).map((x) => testo(x, 100)).filter(Boolean))].slice(0, max);
  const domande = (Array.isArray(g.domande) ? g.domande : []).slice(0, MAX_DOMANDE).map((d) => {
    const titolo = testo(d?.titolo, 100);
    if (!titolo) return null;
    const risposte = (Array.isArray(d.risposte) ? d.risposte : []).slice(0, MAX_RISPOSTE).map((r) => {
      const t = testo(r?.titolo, 50);
      if (!t) return null;
      return { titolo: t, testo: testo(r?.testo, 100), emoji: testo(r?.emoji, 32),
        canali: nomi(r?.canali, 20), ruoli: nomi(r?.ruoli, 10) };
    }).filter(Boolean);
    // Una domanda senza risposte non e' una domanda: sarebbe un muro con
    // scritto «scegli» e niente da scegliere.
    if (!risposte.length) return null;
    return { titolo, tipo: Number(d?.tipo) === 1 ? 1 : 0, unaSola: !!d?.unaSola,
      obbligatoria: !!d?.obbligatoria, allIngresso: d?.allIngresso !== false, risposte };
  }).filter(Boolean);
  const ben = g.benvenuto && typeof g.benvenuto === 'object' ? {
    testo: testo(g.benvenuto.testo, 140),
    canali: (Array.isArray(g.benvenuto.canali) ? g.benvenuto.canali : []).slice(0, 5).map((c) => {
      const nome = testo(c?.canale ?? c?.nome, 100);
      return nome ? { canale: nome, testo: testo(c?.testo, 50), emoji: testo(c?.emoji, 32) } : null;
    }).filter(Boolean),
  } : null;
  if (!domande.length && !ben && g.acceso === undefined && !Array.isArray(g.canaliDiPartenza)) return null;
  return { acceso: !!g.acceso, canaliDiPartenza: nomi(g.canaliDiPartenza, 20), domande,
    ...(ben ? { benvenuto: ben } : {}) };
}

export const MIN_PARTENZA = 7;
export const MIN_APERTI = 5;

// «Tutti» e' il ruolo @everyone, che in Discord ha lo stesso id del server: non
// e' una convenzione nostra, e' come e' fatto Discord.
export const TUTTI = 'tutti';

// Una chiave per confrontare due nomi di canale senza inciampare nel modo in
// cui Discord li storpia: la traccia dice «Il Generale», il server risponde
// «il-generale», ed e' lo stesso canale. Vale da tutte e due le parti, sennò il
// confronto direbbe «diverso» a ogni giro e la porta si riscriverebbe sempre.
export const chiaveNome = (n) => String(n || '').trim().toLowerCase().replace(/\s+/g, '-');

// Una riga che toglie a TUTTI il vedere o lo scrivere chiude il canale, e un
// canale chiuso non conta fra quelli che Discord pretende.
const chiudeATutti = (righe) => (righe || []).some((p) => {
  const chi = String(p?.chi?.ruolo || p?.chi || '');
  if (chi !== TUTTI) return false;
  return (p?.nega || []).some((k) => k === 'vedere' || k === 'scrivere');
});

// I CANALI DEL DOPO: quelli che ci saranno quando il costruttore avra' finito.
//
// Non quelli di adesso: la traccia ne sta creando, e sono proprio quelli che la
// porta nomina. Contare sul server di adesso vorrebbe dire dire «ne hai tre»
// mentre se ne stanno creando dieci, e fermare una cosa che sarebbe riuscita.
//
// Per ognuno la domanda che conta e' una: @everyone lo vede e ci scrive?
export function canaliDelDopo(preset, foto) {
  const idServer = String(foto?.guild?.id || '');
  let base = 0n;
  const suoDiTutti = (foto?.ruoli || []).find((r) => String(r?.id || '') === idServer);
  try { base = BigInt(suoDiTutti?.permessi || 0); } catch { base = 0n; }
  const AMMINISTRATORE = 1n << 3n;
  const apreOra = (c) => {
    if ((base & AMMINISTRATORE) === AMMINISTRATORE) return true;
    let p = base;
    const o = (c?.overwrites || []).find((x) => String(x?.id || '') === idServer);
    if (o) { try { p = (p & ~BigInt(o.deny || 0)) | BigInt(o.allow || 0); } catch { /* resta com'era */ } }
    return (p & VIEW_CHANNEL) === VIEW_CHANNEL && (p & SEND_MESSAGES) === SEND_MESSAGES;
  };
  const m = new Map();
  for (const c of (foto?.canali || [])) {
    if (Number(c?.tipo) === TIPI.categoria) continue;
    m.set(chiaveNome(c?.nome), { nome: String(c?.nome || ''), apre: apreOra(c) });
  }
  // La traccia vince dove parla, e solo dove parla: un canale a cui sta per
  // togliere la parola non conta piu', uno di cui non dice niente resta com'e'.
  const lista = voluti(preset);
  const categorie = new Map(lista.filter((v) => v.tipo === TIPI.categoria).map((v) => [v.nome, v]));
  const catDelServer = (nome) => (foto?.canali || []).find((x) => Number(x?.tipo) === TIPI.categoria
    && chiaveNome(x?.nome) === chiaveNome(nome));
  for (const v of lista) {
    if (v.tipo === TIPI.categoria) continue;
    const k = chiaveNome(v.nome);
    const gia = m.get(k);
    let apre;
    if (Array.isArray(v.permessi) && v.permessi.length) apre = !chiudeATutti(v.permessi);
    else if (gia) apre = gia.apre;
    else {
      // Nasce adesso e senza permessi suoi: Discord lo fa uguale alla sua
      // categoria. Ereditarlo qui e' l'unico modo di contarlo come sara'.
      const cat = v.dentro ? categorie.get(v.dentro) : null;
      if (cat && Array.isArray(cat.permessi) && cat.permessi.length) apre = !chiudeATutti(cat.permessi);
      else if (v.dentro) { const c = catDelServer(v.dentro); apre = c ? apreOra(c) : true; }
      else apre = true;
    }
    m.set(k, { nome: v.nome, apre });
  }
  return m;
}

// Le due porte di Discord lette in NOMI, cosi' si confrontano con la traccia
// che i nomi li usa per forza (vedi sopra: un id nella traccia sarebbe l'id di
// un canale che non esiste ancora).
function portaOra(stato, foto) {
  const nomeCan = new Map((foto?.canali || []).map((c) => [String(c?.id || ''), String(c?.nome || '')]));
  const nomeRuo = new Map((foto?.ruoli || []).map((r) => [String(r?.id || ''), String(r?.nome || '')]));
  const g = stato?.ingresso && stato.ingresso.ok !== false ? stato.ingresso : null;
  const b = stato?.benvenuto && stato.benvenuto.ok !== false ? stato.benvenuto : null;
  const perId = (m) => (l) => (l || []).map((i) => m.get(String(i))).filter(Boolean);
  return {
    acceso: !!g?.acceso,
    canaliDiPartenza: perId(nomeCan)(g?.canaliDiPartenza),
    domande: (g?.domande || []).map((d) => ({
      id: String(d?.id || ''),
      titolo: String(d?.titolo || ''),
      tipo: Number(d?.tipo) === 1 ? 1 : 0,
      unaSola: !!d?.unaSola,
      obbligatoria: !!d?.obbligatoria,
      allIngresso: d?.allIngresso !== false,
      risposte: (d?.risposte || []).map((r) => ({
        id: String(r?.id || ''),
        titolo: String(r?.titolo || ''),
        testo: String(r?.testo || ''),
        emoji: String(r?.emoji || ''),
        canali: perId(nomeCan)(r?.canali),
        ruoli: perId(nomeRuo)(r?.ruoli),
      })),
    })),
    modo: Number(g?.modo) || 0,
    benvenuto: b ? {
      testo: String(b.testo || ''),
      canali: (b.canali || []).map((c) => ({ canale: nomeCan.get(String(c?.canale)) || '', testo: String(c?.testo || ''), emoji: String(c?.emoji || '') })).filter((c) => c.canale),
    } : null,
  };
}

// I segni: due porte sono la stessa porta se questi tre coincidono. L'ordine
// delle domande conta (e' quello in cui si leggono), l'ordine dei canali di
// partenza no.
const segnoPartenza = (l) => (l || []).map(chiaveNome).sort().join(',');
const segnoDomande = (modo, ds) => `${modo}|` + (ds || []).map((d) => [
  chiaveNome(d.titolo), d.tipo, d.unaSola ? 1 : 0, d.obbligatoria ? 1 : 0, d.allIngresso ? 1 : 0,
  (d.risposte || []).map((r) => [chiaveNome(r.titolo), r.testo || '', r.emoji || '',
    (r.canali || []).map(chiaveNome).sort().join('+'),
    (r.ruoli || []).map(chiaveNome).sort().join('+')].join('~')).join(';'),
].join('/')).join('||');
const segnoBenvenuto = (v) => (v ? `${v.testo || ''}|` + (v.canali || []).map((c) => [chiaveNome(c.canale), c.testo || '', c.emoji || ''].join('~')).join(';') : '');

// QUANTI CANALI CONTANO, e quanti sono aperti a tutti. Discord ne vuole sette e
// cinque prima di accendere la porta, e questa e' l'unica conta: la fa chi
// SCRIVE una porta per sapere se nascera' accesa, e la rifa' chi la confronta
// col server per dire perche' Discord direbbe di no. Due conte sarebbero due
// risposte diverse alla stessa domanda.
export function contaPorta(preset, foto, ingresso) {
  const modo = (ingresso?.domande || []).length ? 1 : 0;
  const mondo = canaliDelDopo(preset, foto);
  const contano = new Set((ingresso?.canaliDiPartenza || []).map(chiaveNome));
  if (modo === 1) {
    for (const d of (ingresso.domande || [])) {
      for (const r of (d.risposte || [])) for (const c of (r.canali || [])) contano.add(chiaveNome(c));
    }
  }
  // Un nome che nessun canale porta non lo conta nemmeno Discord: al momento
  // di costruire quella voce sparisce.
  const veri = [...contano].filter((k) => mondo.has(k));
  const aperti = veri.filter((k) => mondo.get(k).apre).length;
  return { veri: veri.length, aperti, basta: veri.length >= MIN_PARTENZA && aperti >= MIN_APERTI };
}

// Nascerebbe accesa? Serve a chi scrive una porta senza avere un server sotto
// gli occhi: il catalogo, e il tasto che ne scrive una su misura della traccia.
export const portaAccendibile = (preset, ingresso) =>
  contaPorta(preset, { canali: [], ruoli: [], guild: {} }, ingresso).basta;

export function differenzaIngresso(preset, foto, stato = {}) {
  // Si normalizza QUI, non si spera che l'abbia fatto chi chiama: le due porte
  // da confrontare devono passare per la stessa strada, o un campo lasciato
  // vuoto diventa una differenza che non c'e'.
  const vuole = normalizzaIngresso(preset?.ingresso);
  if (!vuole) return null;

  // C'E' UNA PORTA DA SCRIVERE, o solo un benvenuto? Sono due chiamate diverse
  // e due mestieri diversi: chi vuole solo presentare cinque canali non deve
  // passare dalle condizioni delle domande, che parlano d'altro.
  const laPorta = !!((vuole.domande || []).length || (vuole.canaliDiPartenza || []).length);
  const modo = (vuole.domande || []).length ? 1 : 0;
  const ora = portaOra(stato, foto);

  const dice = [];
  if (laPorta) {
    if (!!ora.acceso !== !!vuole.acceso) dice.push({ campo: 'acceso', a: !!vuole.acceso });
    if (segnoPartenza(ora.canaliDiPartenza) !== segnoPartenza(vuole.canaliDiPartenza)) {
      dice.push({ campo: 'canaliDiPartenza', a: (vuole.canaliDiPartenza || []).length });
    }
    if (segnoDomande(ora.modo, ora.domande) !== segnoDomande(modo, vuole.domande)) {
      dice.push({ campo: 'domande', a: (vuole.domande || []).length });
    }
  }
  if (vuole.benvenuto && segnoBenvenuto(ora.benvenuto) !== segnoBenvenuto(vuole.benvenuto)) {
    dice.push({ campo: 'benvenuto', a: (vuole.benvenuto.canali || []).length });
  }
  if (!dice.length) return null;

  // GLI ID DELLE DOMANDE SI PORTANO AVANTI. Le risposte che le persone hanno
  // gia' dato sono legate all'id dell'opzione: rifare le domande da zero per
  // cambiarne una le smemorerebbe tutte. Quando il titolo coincide, l'id di
  // prima resta suo.
  const vecchie = new Map((ora.domande || []).map((d) => [chiaveNome(d.titolo), d]));
  const domande = (vuole.domande || []).map((d) => {
    const v = vecchie.get(chiaveNome(d.titolo));
    const idRisposte = new Map((v?.risposte || []).map((r) => [chiaveNome(r.titolo), r.id]).filter(([, i]) => i));
    return {
      ...d,
      ...(v?.id ? { id: v.id } : {}),
      risposte: (d.risposte || []).map((r) => {
        const i = idRisposte.get(chiaveNome(r.titolo));
        return i ? { ...r, id: i } : r;
      }),
    };
  });

  let blocco = '';
  if (!(foto?.caratteristiche || []).includes('COMMUNITY')) {
    blocco = 'questo server non e\' di tipo Community: la schermata di benvenuto e le domande d\'ingresso Discord le accende solo li\', dalle sue impostazioni';
  } else if (laPorta && vuole.acceso) {
    const c = contaPorta(preset, foto, vuole);
    if (!c.basta) {
      blocco = `per accendere la porta Discord vuole almeno ${MIN_PARTENZA} canali fra quelli che chi entra si apre, e almeno ${MIN_APERTI} dove tutti possono scrivere: qui sono ${c.veri} e ${c.aperti}`;
    }
  }

  return {
    cambia: {
      porta: laPorta,
      acceso: !!vuole.acceso,
      modo,
      canaliDiPartenza: [...(vuole.canaliDiPartenza || [])],
      domande,
      ...(vuole.benvenuto ? { benvenuto: vuole.benvenuto } : {}),
    },
    dice,
    blocco,
  };
}

// ------------------------------------------------------ il filtro (AutoMod)
//
// AutoMod e' di Discord e gira DENTRO Discord: blocca il messaggio prima che
// esista. Un bot in ascolto non puo' farlo — lui lo vede dopo, e cancellarlo e'
// un'altra cosa. Percio' il filtro non lo scriviamo noi: lo scriviamo A LORO,
// e poi ci stiamo fuori.
//
// Sta nella traccia come i canali e la porta, per le stesse tre ragioni: «leggi
// il mio server» se lo porta dietro, l'anteprima lo mostra insieme al resto, e
// si costruisce in un giro solo.
//
// I NOMI, NON GLI ID. Una regola puo' avvisare in un canale e risparmiare dei
// ruoli, e quei canali e quei ruoli la traccia li sta creando: valgono le
// stesse regole della porta d'ingresso, e lo stesso passaggio nel costruttore.
//
// I TETTI SONO DI DISCORD, non nostri: sei regole di parole, una per ogni
// altro tipo. Chiederne una in piu' torna un errore, e conviene saperlo qui.
export const TIPI_FILTRO = Object.freeze(['parole', 'liste', 'spam', 'menzioni', 'profilo']);

// La pausa Discord la accetta solo su parole e menzioni. Mandarla sulle altre
// vorrebbe dire una regola rifiutata per intero a causa di un campo che
// l'editor non avrebbe nemmeno dovuto mostrare.
const CON_PAUSA = new Set(['parole', 'menzioni']);
// Le liste pronte che Discord ha gia' scritto, chiamate come si chiamano da noi.
export const LISTE_FILTRO = Object.freeze(['parolacce', 'sesso', 'insulti']);

const NOME_FILTRO = Object.freeze({
  parole: 'Parole da non scrivere',
  liste: 'Le liste di Discord',
  spam: 'Spam',
  menzioni: 'Raffiche di menzioni',
  profilo: 'Nomi e profili',
});

export function normalizzaFiltro(v) {
  if (!Array.isArray(v)) return null;
  const testo = (x, max) => String(x || '').replace(/\s+/g, ' ').trim().slice(0, max);
  const lista = (x, quante, lunghe) => [...new Set((Array.isArray(x) ? x : [])
    .map((y) => testo(y, lunghe)).filter(Boolean))].slice(0, quante);
  const quanti = {};
  const fuori = [];
  for (const r of v) {
    const tipo = TIPI_FILTRO.includes(String(r?.tipo)) ? String(r.tipo) : '';
    if (!tipo) continue;
    const tetto = TETTO_AUTOMOD[tipo] || 1;
    quanti[tipo] = (quanti[tipo] || 0) + 1;
    if (quanti[tipo] > tetto) continue;          // il tetto e' di Discord, non nostro
    const a = r?.azioni || {};
    const azioni = {
      blocca: a.blocca !== false,
      messaggio: testo(a.messaggio, 150),
      avvisaIn: testo(a.avvisaIn, 100),
      pausa: CON_PAUSA.has(tipo) ? Math.max(0, Math.min(PAUSA_MAX, Math.round(Number(a.pausa)) || 0)) : 0,
      isola: !!a.isola,
    };
    // Una regola che non fa niente e' peggio di non averla, perche' sembra
    // accesa. Se non hanno detto cosa fare, almeno blocca.
    if (!azioni.blocca && !azioni.avvisaIn && !azioni.pausa && !azioni.isola) azioni.blocca = true;
    const voce = {
      tipo,
      nome: testo(r?.nome, 100) || NOME_FILTRO[tipo],
      accesa: r?.accesa !== false,
      azioni,
      esentiRuoli: lista(r?.esentiRuoli, 20, 100),
      esentiCanali: lista(r?.esentiCanali, 50, 100),
    };
    if (tipo === 'parole' || tipo === 'profilo') {
      voce.parole = lista(r?.parole, 1000, 60);
      voce.espressioni = lista(r?.espressioni, 10, 260);
      voce.passano = lista(r?.passano, 100, 60);
      // Una regola di parole senza parole non filtra niente: non si manda.
      if (!voce.parole.length && !voce.espressioni.length) { quanti[tipo]--; continue; }
    }
    if (tipo === 'liste') {
      voce.liste = lista(r?.liste, 3, 20).filter((k) => LISTE_FILTRO.includes(k));
      voce.passano = lista(r?.passano, 1000, 60);
      if (!voce.liste.length) { quanti[tipo]--; continue; }
    }
    if (tipo === 'menzioni') {
      voce.tettoMenzioni = Math.max(1, Math.min(50, Math.round(Number(r?.tettoMenzioni)) || 5));
      voce.raid = !!r?.raid;
    }
    fuori.push(voce);
  }
  return fuori.length ? fuori : null;
}

// Due regole sono la stessa regola se sono dello stesso TIPO — e, per le
// parole, se si chiamano allo stesso modo. Non serve un contrassegno nostro:
// il tetto di Discord e' gia' la chiave, perche' di spam ce n'e' una sola.
const chiaveFiltro = (r) => (r.tipo === 'parole' ? 'parole:' + chiaveNome(r.nome) : r.tipo);

// Il segno di una regola: due regole con lo stesso segno non si riscrivono.
const segnoFiltro = (r) => [
  r.accesa ? 1 : 0, chiaveNome(r.nome),
  (r.parole || []).slice().sort().join('|'),
  (r.espressioni || []).slice().sort().join('|'),
  (r.passano || []).slice().sort().join('|'),
  (r.liste || []).slice().sort().join('|'),
  r.tettoMenzioni || 0, r.raid ? 1 : 0,
  r.azioni?.blocca ? 1 : 0, r.azioni?.messaggio || '',
  chiaveNome(r.azioni?.avvisaIn), r.azioni?.pausa || 0, r.azioni?.isola ? 1 : 0,
  (r.esentiRuoli || []).map(chiaveNome).sort().join('+'),
  (r.esentiCanali || []).map(chiaveNome).sort().join('+'),
].join('~');

// Le regole di adesso, lette in NOMI: e' cosi' che la traccia le sa dire.
function filtroOra(regole, foto) {
  const nomeCan = new Map((foto?.canali || []).map((c) => [String(c?.id || ''), String(c?.nome || '')]));
  const nomeRuo = new Map((foto?.ruoli || []).map((r) => [String(r?.id || ''), String(r?.nome || '')]));
  const daId = (m) => (l) => (l || []).map((i) => m.get(String(i))).filter(Boolean);
  return (regole || []).filter((r) => TIPI_FILTRO.includes(r?.tipo)).map((r) => ({
    id: String(r.id || ''),
    tipo: r.tipo,
    nome: String(r.nome || ''),
    accesa: !!r.accesa,
    parole: (r.parole || []).map(String),
    espressioni: (r.espressioni || []).map(String),
    passano: (r.passano || []).map(String),
    liste: (r.liste || []).map(String),
    tettoMenzioni: Number(r.tettoMenzioni) || 0,
    raid: !!r.raid,
    azioni: {
      blocca: !!r.azioni?.blocca,
      messaggio: String(r.azioni?.messaggio || ''),
      avvisaIn: nomeCan.get(String(r.azioni?.avvisaIn)) || '',
      pausa: Number(r.azioni?.pausa) || 0,
      isola: !!r.azioni?.isola,
    },
    esentiRuoli: daId(nomeRuo)(r.esentiRuoli),
    esentiCanali: daId(nomeCan)(r.esentiCanali),
  }));
}

export function differenzaFiltro(preset, foto, regole) {
  // Come per la porta, si normalizza QUI: le due cose da confrontare devono
  // passare per la stessa strada, o un campo lasciato vuoto diventa una
  // differenza che non c'e' — e una regola riscritta ogni sera.
  const vuole = normalizzaFiltro(preset?.filtro);
  if (!vuole) return null;
  const ora = filtroOra(regole, foto);
  const perChiave = new Map(ora.map((r) => [chiaveFiltro(r), r]));
  const crea = [];
  const sistema = [];
  const dice = [];
  const visti = new Set();
  for (const r of vuole) {
    const k = chiaveFiltro(r);
    visti.add(k);
    const gia = perChiave.get(k);
    if (!gia) { crea.push(r); dice.push({ campo: 'crea', tipo: r.tipo, nome: r.nome }); continue; }
    if (segnoFiltro(gia) === segnoFiltro(r)) continue;
    sistema.push({ ...r, id: gia.id });
    dice.push({ campo: 'sistema', tipo: r.tipo, nome: r.nome });
  }
  const togli = ora.filter((r) => !visti.has(chiaveFiltro(r)))
    .map((r) => ({ id: r.id, tipo: r.tipo, nome: r.nome }));
  if (!crea.length && !sistema.length && !togli.length) return null;
  return { crea, sistema, togli, dice };
}

// «Non c'e' niente da fare» detto una volta sola, cosi' chi chiama non deve
// contare tre elenchi per sapere se applicare due volte ha fatto qualcosa.
export const vuota = (d) => !(d?.crea?.length || d?.sistema?.length || d?.togli?.length
  || d?.ruoli?.crea?.length || d?.ruoli?.sistema?.length || d?.ruoli?.togli?.length
  || d?.ruoli?.aTe || d?.ruoli?.regole?.length
  || d?.server?.dice?.length || d?.ingresso?.dice?.length
  || d?.filtro?.dice?.length || d?.filtro?.togli?.length);

// L'IMPRONTA DI QUELLO CHE HAI VISTO.
//
// Fra l'anteprima e il «sì, fallo» passa del tempo, e quel server non e' fermo:
// qualcuno puo' creare un canale, trascinarne un altro, scriverci dentro. Se
// applicassimo «quello che avevi chiesto» su un server che nel frattempo e'
// diventato un altro, la conferma sarebbe una firma in bianco — e nel modo
// distruttivo la firma in bianco autorizza a cancellare.
//
// Percio' l'anteprima porta con se' l'impronta di CIO' CHE FA. Chi applica non
// riusa quell'elenco: rifa' la fotografia, ricalcola la differenza, e se
// l'impronta non coincide si ferma e la rimostra. Non e' una conferma in piu'
// da cliccare: e' che «lo stesso» ha una definizione, e la macchina la sa
// controllare meglio di un occhio.
export function improntaDi(d) {
  // I RUOLI ENTRANO NELL'IMPRONTA come i canali, e non e' un di piu': se non
  // ci fossero, un «sì, fallo» dato guardando i canali autorizzerebbe anche un
  // cambio di ruoli arrivato nel frattempo — cioe' proprio una firma in bianco
  // su chi puo' fare cosa.
  const r = d?.ruoli || {};
  const righe = [
    ...(d?.crea || []).map((x) => `c|${x.tipo}|${x.dentro || ''}/${x.nome}`),
    ...(d?.sistema || []).map((x) => `s|${x.id}|${Object.keys(x).filter((k) => !['id', 'nome', 'tipo'].includes(k)).sort().join(',')}`),
    ...(d?.togli || []).map((x) => `x|${x.id}`),
    ...(r.crea || []).map((x) => `rc|${x.nome}|${x.permessi || '0'}`),
    // Nel rinomina conta il VALORE, non solo che ci sia: due nomi diversi per
    // lo stesso ruolo sono due cose diverse, e una firma che non li distingue
    // autorizzerebbe la seconda avendo guardato la prima.
    ...(r.sistema || []).map((x) => `rs|${x.id}|${Object.keys(x).filter((k) => !['id', 'nome'].includes(k)).sort().join(',')}|${x.rinomina || ''}`),
    ...(r.togli || []).map((x) => `rx|${x.id}`),
    // A chi va un ruolo e' una decisione su una persona: un «sì» dato guardando
    // «Streamer va a te» non deve valere per un ruolo diverso arrivato dopo.
    ...(r.aTe ? [`ra|${r.aTe.id || 'nuovo:' + r.aTe.nome}`] : []),
    ...(r.regole || []).map((x) => `rr|${x.tipo}|${x.id || 'nuovo:' + x.nome}`),
    // Anche le impostazioni del server, per la stessa ragione dei ruoli: un
    // «sì, fallo» dato guardando i canali non deve autorizzare un livello di
    // verifica cambiato nel frattempo. Col VALORE, non solo col nome del campo.
    ...(d?.server?.dice || []).map((x) => `g|${x.campo}|${x.a ?? ''}`),
    // E la porta d'ingresso, che non e' un dettaglio di contorno: una risposta
    // in piu' puo' dare un ruolo a chiunque entri. Guardarla e poi applicare
    // un'altra porta sarebbe la firma in bianco peggiore delle tre.
    ...(d?.ingresso?.dice || []).map((x) => `i|${x.campo}|${x.a ?? ''}`),
    // E il filtro, che decide cosa non si puo' scrivere: una regola cambiata
    // fra il guardare e il fare e' una regola che non hai guardato.
    ...(d?.filtro?.dice || []).map((x) => `f|${x.campo}|${x.tipo}|${x.nome || ''}`),
    ...(d?.filtro?.togli || []).map((x) => `fx|${x.id}`),
  ].sort();
  return createHash('sha1').update(righe.join('\n')).digest('hex').slice(0, 12);
}
