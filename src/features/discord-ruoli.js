// I RUOLI DI DISCORD, dai dati che abbiamo noi.
//
// Discord i sub di Twitch se li sincronizza da solo. Quello che non sa fare e'
// tutto il resto: chi ti segue, chi e' VIP, chi e' moderatore, quante ore ti ha
// guardato, quante monete ha, da quante dirette di fila c'e'. Quei dati ce li
// abbiamo, e questo pezzo li trasforma in ruoli.
//
// Qui dentro non c'e' Discord: c'e' la REGOLA. Entrano le condizioni che ha
// scritto lo streamer e cosa sappiamo di una persona, esce l'insieme dei ruoli
// che deve avere — e, soprattutto, la DIFFERENZA con quelli che ha adesso.
//
// Quattro difetti non possono esistere:
//
//  · NON SI TOCCA UN RUOLO CHE NON E' NOSTRO. Si puo' togliere solo un ruolo
//    che una regola nomina. Un ruolo dato a mano dallo streamer, o da un altro
//    bot, o quello di chi amministra, non e' roba nostra: lavorare per
//    sottrazione («via tutto quello che non gli spetta») vorrebbe dire spogliare
//    il server la prima volta che si accende l'interruttore.
//  · SI SCRIVE SOLO LA DIFFERENZA. Se non cambia niente non si chiama nessuno:
//    per i limiti di frequenza di Discord, e perche' il registro del server non
//    deve riempirsi di righe che non dicono niente.
//  · UN RUOLO PIU' ALTO DEL BOT non glielo puo' dare nessuno: Discord rifiuta.
//    Si riconosce PRIMA, dalle posizioni, e si dice — invece di riprovarci a
//    ogni giro e non capire mai perche'.
//  · UNA REGOLA SENZA RUOLO NON E' UNA REGOLA. Un ruolo cancellato dal server
//    lascerebbe una condizione che non puo' avverarsi mai: si scarta, e si dice.

export const TIPI = ['follower', 'sub', 'vip', 'mod', 'monete', 'ore', 'serie', 'dirette'];

// Quali hanno una soglia («almeno tanto») e quali sono si'/no.
const CON_SOGLIA = new Set(['monete', 'ore', 'serie', 'dirette']);
export const haSoglia = (tipo) => CON_SOGLIA.has(String(tipo));

export const T_REGOLA = {
  follower: ['Ti segue', 'Follows you', 'Te sigue'],
  sub: ['È abbonato', 'Is subscribed', 'Está suscrito'],
  vip: ['È VIP', 'Is a VIP', 'Es VIP'],
  mod: ['È moderatore', 'Is a moderator', 'Es moderador'],
  monete: ['Ha almeno tante monete', 'Has at least this many coins', 'Tiene al menos estas monedas'],
  ore: ['Ti ha guardato almeno tante ore', 'Has watched you at least this many hours', 'Te ha visto al menos estas horas'],
  serie: ['È di fila da tante dirette', 'Has a streak of this many streams', 'Lleva una racha de tantos directos'],
  dirette: ['È stato ad almeno tante dirette', 'Has attended at least this many streams', 'Ha estado en al menos tantos directos'],
};

// Una regola vale se nomina un ruolo che esiste ancora e una condizione che
// sappiamo valutare. `ruoliVeri` e' l'elenco degli id che il server ha davvero.
export function regolaOk(r, ruoliVeri) {
  if (!r || !TIPI.includes(String(r.tipo))) return false;
  const id = String(r.ruolo || '');
  if (!id) return false;
  if (ruoliVeri && !ruoliVeri.has(id)) return false;
  if (haSoglia(r.tipo) && !(Number(r.soglia) > 0)) return false;
  return true;
}

export function normRegole(lista, { max = 20 } = {}) {
  const arr = Array.isArray(lista) ? lista : [];
  const out = [];
  const visti = new Set();
  for (const r of arr.slice(0, max)) {
    const tipo = String(r?.tipo || '');
    if (!TIPI.includes(tipo)) continue;
    const ruolo = String(r?.ruolo || '').replace(/[^0-9]/g, '').slice(0, 24);
    if (!ruolo) continue;
    const soglia = haSoglia(tipo) ? Math.max(1, Math.round(Number(r?.soglia) || 0)) : 0;
    if (haSoglia(tipo) && !soglia) continue;
    // la stessa condizione sullo stesso ruolo due volte non e' due regole
    const k = `${tipo}|${ruolo}|${soglia}`;
    if (visti.has(k)) continue;
    visti.add(k);
    out.push({ tipo, ruolo, soglia });
  }
  return out;
}

// I ruoli che UNA regola qualsiasi nomina: sono gli unici che questo gestore
// puo' togliere. Tutto il resto del server non lo riguarda.
export function ruoliNostri(regole) {
  return new Set((Array.isArray(regole) ? regole : []).map((r) => String(r.ruolo)).filter(Boolean));
}

const soddisfa = (r, d) => {
  const dati = d || {};
  switch (r.tipo) {
    case 'follower': return !!dati.follower;
    case 'sub': return !!dati.sub;
    case 'vip': return !!dati.vip;
    case 'mod': return !!dati.mod;
    case 'monete': return (Number(dati.monete) || 0) >= r.soglia;
    case 'ore': return (Number(dati.ore) || 0) >= r.soglia;
    case 'serie': return (Number(dati.serie) || 0) >= r.soglia;
    case 'dirette': return (Number(dati.dirette) || 0) >= r.soglia;
    default: return false;
  }
};

// I ruoli che questa persona DEVE avere.
export function ruoliDovuti(regole, dati) {
  const out = new Set();
  for (const r of (Array.isArray(regole) ? regole : [])) if (soddisfa(r, dati)) out.add(String(r.ruolo));
  return out;
}

// IL PERCHE', detto a parole, per il registro del server.
//
// Chi apre il registro di casa sua leggeva «SocialBot ha dato Abbonati» e
// basta: un bot che muove ruoli senza dire in nome di cosa. Adesso accanto
// all'azione c'e' la condizione che l'ha decisa.
//
// Nasce QUI e non da una seconda lettura fatta al momento di scrivere: sarebbe
// un secondo conto, e due conti sulla stessa cosa sono due conti che un giorno
// non coincidono — il registro direbbe una ragione e il ruolo ne avrebbe avuta
// un'altra.
const A_PAROLE = {
  follower: 'ti segue',
  sub: 'è abbonato',
  vip: 'è VIP',
  mod: 'è moderatore',
  monete: (n) => `ha almeno ${n} monete`,
  ore: (n) => `ti ha guardato almeno ${n} ore`,
  serie: (n) => `è di fila da ${n} dirette`,
  dirette: (n) => `è stato ad almeno ${n} dirette`,
};

export function perche(regola) {
  const v = A_PAROLE[String(regola?.tipo)];
  if (!v) return '';
  return typeof v === 'function' ? v(Number(regola.soglia) || 0) : v;
}

// Le condizioni che, per questa persona, giustificano quel ruolo. Piu' di una
// regola puo' puntare allo stesso ruolo: si dicono tutte, e si dicono in ordine.
export function perCheCosa(regole, dati) {
  const out = new Map();
  for (const r of (Array.isArray(regole) ? regole : [])) {
    if (!soddisfa(r, dati)) continue;
    const id = String(r.ruolo);
    const t = perche(r);
    if (!t) continue;
    const gia = out.get(id) || [];
    if (!gia.includes(t)) gia.push(t);
    out.set(id, gia);
  }
  return out;
}

// LA DIFFERENZA, che e' la cosa che si scrive davvero.
//
// `fuoriPortata` sono i ruoli che il bot non puo' toccare perche' stanno piu' in
// alto di lui: non si prova nemmeno, e si dicono a parte, cosi' il pannello puo'
// spiegare perche' quel ruolo non arriva mai.
export function differenza({ regole, dati, attuali, fuoriPortata } = {}) {
  const nostri = ruoliNostri(regole);
  const dovuti = ruoliDovuti(regole, dati);
  const ha = new Set((attuali || []).map(String));
  const alti = fuoriPortata instanceof Set ? fuoriPortata : new Set(fuoriPortata || []);
  const dare = [], togliere = [], bloccati = [];
  for (const id of dovuti) {
    if (ha.has(id)) continue;
    if (alti.has(id)) { bloccati.push(id); continue; }
    dare.push(id);
  }
  for (const id of ha) {
    if (!nostri.has(id)) continue;      // non e' nostro: non si tocca
    if (dovuti.has(id)) continue;
    if (alti.has(id)) { bloccati.push(id); continue; }
    togliere.push(id);
  }
  // il perche' esce dalla stessa passata che ha deciso: per chi riceve un ruolo
  // e' la condizione che l'ha fatto scattare, per chi lo perde e' che non ce
  // n'e' piu' nessuna vera.
  const motivi = perCheCosa(regole, dati);
  return {
    dare: dare.sort(), togliere: togliere.sort(), bloccati: [...new Set(bloccati)].sort(),
    perche: Object.fromEntries([
      ...dare.map((id) => [id, (motivi.get(id) || []).join(', ')]),
      ...togliere.map((id) => [id, 'non rientra piu\' in nessuna condizione']),
    ]),
  };
}

// DOVE STA IL BOT, e cosa vuol dire per ogni ruolo del server. Una risposta
// sola per tutto il prodotto: prima erano quattro conti in quattro posti, e uno
// chiamava «piu' in alto del bot» anche i ruoli degli altri bot, che possono
// stare ovunque e non si toccano per un'altra ragione.
//
// Le regole sono di Discord (docs.discord.com, Permission Hierarchy): il ruolo
// piu' alto di un bot e' quello con la «position» piu' grande, e @everyone sta
// a 0; un bot da', modifica e ordina SOLO i ruoli piu' in basso di quello.
// Nessuno puo' portare un ruolo sopra il proprio: il bot non si alza da solo,
// lo alza chi gli sta sopra.
//
// Ogni ruolo finisce in UNO di questi posti, e ogni posto ha una risposta sola
// nel pannello:
//  · 'tutti'     @everyone: ce l'hanno tutti, non si da' e non si toglie;
//  · 'bot'       i ruoli del bot stesso che non puo' muovere: il suo piu' alto,
//                e quello che Discord gli ha dato all'ingresso;
//  · 'altrui'    di un'integrazione (un altro bot, i booster, gli abbonamenti):
//                non lo da' e non lo cancella nessuno, se ne va col suo bot;
//  · 'sopra'     alla sua altezza o piu' su: finche' il bot sta sotto non lo
//                tocca, e la cura e' spostarlo su Discord;
//  · 'gestibile' sotto di lui: suo da dare, sistemare, togliere.
// Due ruoli alla stessa altezza Discord li ordina per id, senza dire da che
// parte: nel dubbio si dice «sopra», che non promette niente.
export function livelloDi(ruoli, mieiRuoli) {
  const miei = new Set((mieiRuoli || []).map(String));
  let livello = 0;
  let piuAlto = null;
  for (const r of (Array.isArray(ruoli) ? ruoli : [])) {
    if (!r?.id || !miei.has(String(r.id))) continue;
    const p = Number(r.position) || 0;
    if (!piuAlto || p > livello) { livello = p; piuAlto = r; }
  }
  return { livello, piuAlto };
}

export function tipoRuolo(r, { livello = 0, miei = [], guildId = '' } = {}) {
  const id = String(r?.id || '');
  const suo = new Set((miei || []).map(String)).has(id);
  if (id && id === String(guildId)) return 'tutti';
  if (r?.managed) return suo ? 'bot' : 'altrui';
  if ((Number(r?.position) || 0) >= Number(livello)) return suo ? 'bot' : 'sopra';
  return 'gestibile';
}

export function postoDeiRuoli(ruoli, mieiRuoli, guildId) {
  const lista = (Array.isArray(ruoli) ? ruoli : []).filter((r) => r?.id);
  const { livello, piuAlto } = livelloDi(lista, mieiRuoli);
  const tipo = new Map(lista.map((r) => [String(r.id), tipoRuolo(r, { livello, miei: mieiRuoli, guildId })]));
  const nomiDi = (t) => lista.filter((r) => tipo.get(String(r.id)) === t)
    .sort((a, b) => (Number(b.position) || 0) - (Number(a.position) || 0)).map((r) => String(r.nome || ''));
  return {
    livello,
    piuAlto: piuAlto ? { id: String(piuAlto.id), nome: String(piuAlto.nome || '') } : null,
    tipo,
    gestibile: (id) => tipo.get(String(id)) === 'gestibile',
    // Quelli che non puo' toccare, per la regola dei membri: tutto tranne i suoi.
    fuori: new Set(lista.filter((r) => tipo.get(String(r.id)) !== 'gestibile').map((r) => String(r.id))),
    sopra: nomiDi('sopra'),
    altrui: nomiDi('altrui'),
  };
}
