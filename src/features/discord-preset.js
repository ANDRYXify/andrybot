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
import { PRIVILEGI, DA_DARE } from './discord-api.js';

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

// COME SI RICONOSCE «LO STESSO RUOLO»: dal nome, senza badare alle maiuscole.
// Discord i nomi dei ruoli li lascia come li scrivi, quindi qui non si storpia
// niente: si confronta e basta.
export const nomeRuolo = (n) => String(n || '').trim().replace(/\s+/g, ' ').slice(0, 100);
const chiaveRuolo = (n) => nomeRuolo(n).toLowerCase();

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
export function ruoliIntoccabili(foto) {
  const g = foto?.guild || {};
  const mio = Number(foto?.bot?.livello);
  const fuori = new Set();
  for (const r of (foto?.ruoli || [])) {
    if (!r?.id) continue;
    if (String(r.id) === String(g.id)) { fuori.add(String(r.id)); continue; }
    if (r.managed) { fuori.add(String(r.id)); continue; }
    if (Number.isFinite(mio) && Number(r.position) >= mio) fuori.add(String(r.id));
  }
  return fuori;
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
    fuori.push({
      nome,
      colore: Math.max(0, Math.min(0xffffff, Number(r?.colore) || 0)),
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
export function differenzaRuoli(foto, preset, { togliere = false, puoiDare = null, nostri = DA_DARE } = {}) {
  // I ruoli che lo streamer ha deciso di tenere anche se la traccia non li
  // prevede. E' una LISTA DI ID, non di nomi: un ruolo risparmiato che poi
  // qualcuno rinomina resta risparmiato, che e' quello che voleva dire.
  const salvi = new Set((Array.isArray(preset?.risparmia) ? preset.risparmia : []).map((x) => String(x || '').replace(/[^0-9]/g, '')).filter(Boolean));
  const fuoriMano = ruoliIntoccabili(foto);
  const lista = voluteRuoli(preset);
  const attuali = (foto?.ruoli || []).filter((r) => r?.id);

  const quanti = new Map();
  for (const r of attuali) {
    const k = chiaveRuolo(r.nome);
    quanti.set(k, (quanti.get(k) || 0) + 1);
  }

  const crea = []; const sistema = []; const ambigui = []; const fuoriPortata = []; const nonPosso = [];
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

    if (!gia) { crea.push({ nome: v.nome, colore: v.colore, separato: v.separato, citabile: v.citabile, permessi: String(daDare) }); continue; }
    preso.add(String(gia.id));
    if (fuoriMano.has(String(gia.id))) { fuoriPortata.push(gia.nome); continue; }

    const cambia = {};
    if (chiaveRuolo(gia.nome) !== k) cambia.rinomina = v.nome;
    if (Number(gia.colore || 0) !== v.colore) cambia.colore = v.colore;
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
  if (togliere) {
    for (const r of attuali) {
      if (preso.has(String(r.id))) continue;
      if (salvi.has(String(r.id))) continue;
      if (fuoriMano.has(String(r.id))) continue;
      let suoi = 0n;
      try { suoi = BigInt(r.permessi || 0); } catch { suoi = 0n; }
      togli.push({ id: String(r.id), nome: r.nome, colore: Number(r.colore) || 0,
        separato: !!r.separato, conPotere: (suoi & nostri) !== 0n });
    }
  }

  return { crea, sistema, togli, ambigui, fuoriPortata, nonPosso };
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
  const lista = voluteRuoli(preset);
  const attuali = (foto?.ruoli || []).filter((r) => r?.id && !fuoriMano.has(String(r.id)));

  const perChiave = new Map();
  for (const r of attuali) {
    const k = chiaveRuolo(r.nome);
    if (!perChiave.has(k)) perChiave.set(k, []);
    perChiave.get(k).push(r);
  }
  const unoSolo = (k) => (perChiave.get(k) || []).length === 1 ? perChiave.get(k)[0] : null;

  const prendi = []; const crea = []; const impegnati = new Set();

  for (const v of lista) {
    const k = chiaveRuolo(v.nome);
    if (perChiave.has(k)) {                       // si chiama gia' cosi': non c'e' niente da consigliare
      for (const r of perChiave.get(k)) impegnati.add(String(r.id));
      continue;
    }
    const altri = ALTRI_NOMI[k] || [];
    const trovati = altri.map(unoSolo).filter(Boolean).filter((r) => !impegnati.has(String(r.id)));
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

  return { prendi, risparmia, togli, crea };
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

  return { crea, sistema, togli, avvisi, fuoriPortata, intoccabili: fuoriMano };
}

// «Non c'e' niente da fare» detto una volta sola, cosi' chi chiama non deve
// contare tre elenchi per sapere se applicare due volte ha fatto qualcosa.
export const vuota = (d) => !(d?.crea?.length || d?.sistema?.length || d?.togli?.length
  || d?.ruoli?.crea?.length || d?.ruoli?.sistema?.length || d?.ruoli?.togli?.length);

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
  ].sort();
  return createHash('sha1').update(righe.join('\n')).digest('hex').slice(0, 12);
}
