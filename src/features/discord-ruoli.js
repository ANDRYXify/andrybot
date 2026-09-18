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
  sub: ['È abbonato', 'Is subscribed', 'Està suscrito'],
  vip: ['È VIP', 'Is a VIP', 'Es VIP'],
  mod: ['È moderatore', 'Is a moderator', 'Es moderador'],
  monete: ['Ha almeno tante monete', 'Has at least this many coins', 'Tiene al menos estas monedas'],
  ore: ['Ti ha guardato almeno tante ore', 'Has watched you at least this many hours', 'Te ha visto al menos estas horas'],
  serie: ['È di fila da tante dirette', 'Has a streak of this many streams', 'Lleva una racha de tantos directos'],
  dirette: ['C̀̀e stato ad almeno tante dirette', 'Has attended at least this many streams', 'Ha estado en al menos tantos directos'],
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
  return { dare: dare.sort(), togliere: togliere.sort(), bloccati: [...new Set(bloccati)].sort() };
}

// Cosa il bot NON puo' toccare: tutto quello che sta alla sua altezza o sopra.
// Discord non guarda il nome del permesso, guarda la posizione.
export function fuoriPortata(ruoli, ioPosizione) {
  const mia = Number(ioPosizione);
  const out = new Set();
  if (!Number.isFinite(mia)) return out;
  for (const r of (Array.isArray(ruoli) ? ruoli : [])) {
    if (!r || !r.id) continue;
    if (r.managed) { out.add(String(r.id)); continue; }   // i ruoli di un'integrazione non li da' nessuno
    if (Number(r.position) >= mia) out.add(String(r.id));
  }
  return out;
}

// La posizione del bot: la piu' alta fra i ruoli che ha.
export function mioLivello(ruoli, mieiRuoli) {
  const miei = new Set((mieiRuoli || []).map(String));
  let alto = -1;
  for (const r of (Array.isArray(ruoli) ? ruoli : [])) {
    if (!miei.has(String(r?.id))) continue;
    const p = Number(r.position);
    if (Number.isFinite(p) && p > alto) alto = p;
  }
  return alto;
}
