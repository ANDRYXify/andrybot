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

// I tipi di canale che sappiamo maneggiare, coi numeri che usa Discord.
export const TIPI = Object.freeze({ testo: 0, voce: 2, categoria: 4, annunci: 5, forum: 15 });
export const TIPI_NOME = Object.freeze({ 0: 'testo', 2: 'voce', 4: 'categoria', 5: 'annunci', 15: 'forum' });

export const MAX_CATEGORIE = 20;
export const MAX_CANALI = 60;

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
export const nomeCanale = (tipo, nome) => {
  const t = String(nome || '').trim();
  if (tipo === TIPI.voce || tipo === TIPI.categoria) return t.slice(0, 100);
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

// Le categorie e i canali come li vuole il preset, appiattiti in intenzioni.
// Una categoria senza canali e' comunque un'intenzione: c'e' chi la vuole vuota
// per metterci dentro roba a mano.
function voluti(preset) {
  const fuori = [];
  for (const c of (preset?.categorie || []).slice(0, MAX_CATEGORIE)) {
    if (!c || !String(c.nome || '').trim()) continue;
    const cat = { tipo: TIPI.categoria, nome: nomeCanale(TIPI.categoria, c.nome), dentro: null, permessi: c.permessi || null };
    fuori.push(cat);
    for (const ch of (c.canali || [])) {
      if (!ch || !String(ch.nome || '').trim()) continue;
      const tipo = TIPI[ch.tipo] ?? TIPI.testo;
      if (tipo === TIPI.categoria) continue;   // una categoria dentro una categoria non esiste
      fuori.push({ tipo, nome: nomeCanale(tipo, ch.nome), dentro: cat.nome, permessi: ch.permessi || null, argomento: ch.argomento || '' });
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

// LA DIFFERENZA. `togliere` decide se ne fa parte anche la terza direzione.
export function differenza(foto, preset, { togliere = false } = {}) {
  const idx = indice(foto);
  const fuoriMano = intoccabili(foto);
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
  for (const v of lista) {
    const gia = trovati.get(v);
    if (!gia) { crea.push({ ...v, perche: 'non c\'e\'' }); continue; }
    const cambia = {};
    if (permessiDiversi(v.permessi, gia)) cambia.permessi = v.permessi;
    if (v.argomento && String(gia.argomento || '') !== v.argomento) cambia.argomento = v.argomento;
    // Un canale finito fuori dalla sua categoria si rimette dentro: e' la cosa
    // che succede davvero quando qualcuno trascina per sbaglio.
    if (v.dentro && idx.dentroDi(gia) !== v.dentro) cambia.dentro = v.dentro;
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
      togli.push({ id: String(c.id), nome: c.nome, tipo: c.tipo,
        // il PESO, per l'anteprima: quanto costa perderlo
        ultimoMessaggio: Number(c.ultimoMessaggio) || 0,
        dentro: idx.dentroDi(c) });
    }
  }

  return { crea, sistema, togli, intoccabili: fuoriMano };
}

// «Non c'e' niente da fare» detto una volta sola, cosi' chi chiama non deve
// contare tre elenchi per sapere se applicare due volte ha fatto qualcosa.
export const vuota = (d) => !(d?.crea?.length || d?.sistema?.length || d?.togli?.length);
