// LE OCCASIONI: aggiunte che accendi sull'overlay che gia' hai.
//
// «I miei overlay ce li ho, ma stasera e' subathon e voglio anche questo.»
// Un'occasione e' un pacchetto di DIFFERENZE sopra la base: cosa compare in
// piu' e dove sta. Si accende e compare, si spegne e torna tutto com'era.
//
// Tre cose scendono da questa forma, e sono tre difetti che cosi' non possono
// esistere:
//
//  · SPEGNERE NON PERDE NIENTE. L'occasione non tocca mai la base: e' un
//    secondo strato. Quando la spegni non c'e' niente da ripristinare, perche'
//    non c'era niente da rovinare.
//  · LE DIFFERENZE SONO SPARSE. Solo le chiavi che l'occasione nomina davvero.
//    Se si riempissero come si riempie una base — dove ogni chiave deve esserci
//    — l'occasione smetterebbe di essere un secondo strato e diventerebbe una
//    copia che sovrascrive tutto.
//  · UNA SOLA ACCESA per overlay. Due pacchetti di differenze sovrapposti e la
//    domanda «cosa sto vedendo?» non ha piu' una risposta sola.
//
// Le REGOLE delle chiavi (quali nomi di elemento sono validi, quali posizioni)
// non stanno qui: stanno dove sta la base, e arrivano come due funzioni. Cosi'
// non ci sono due elenchi di cosa e' valido da tenere d'accordo.
export const MAX_OCCASIONI = 8;

// L'occasione accesa, o null. Se per qualsiasi motivo ne risultassero due
// accese, vince la prima: la domanda ha sempre una risposta sola.
export function occasioneAttiva(ov) {
  const l = Array.isArray(ov?.occasioni) ? ov.occasioni : [];
  return l.find((o) => o && o.attiva) || null;
}

// La base fusa con l'occasione accesa. Chi guarda la diretta deve ricevere UNA
// cosa sola: non una base e una correzione da applicare a valle.
export function conOccasione(ov, mostraBase) {
  const mostra = ov?.mostra || mostraBase || {};
  const xy = ov?.xy || {};
  const ordine = Array.isArray(ov?.ordine) ? ov.ordine : [];
  const oc = occasioneAttiva(ov);
  if (!oc) return { mostra, xy, ordine, occasione: null };
  const q = (x) => (x && typeof x === 'object' ? x : {});
  return {
    mostra: { ...mostra, ...q(oc.mostra) },
    xy: { ...xy, ...q(oc.xy) },
    // L'ordine non e' sparso come le altre differenze: un ordine a meta' non
    // dice dove stanno gli altri. O l'occasione ha il suo, o vale quello della
    // base.
    ordine: Array.isArray(oc.ordine) && oc.ordine.length ? oc.ordine : ordine,
    occasione: { id: oc.id, nome: oc.nome },
  };
}

// Ripulisce l'elenco. `pulisciMostra` e `pulisciXy` sanno quali chiavi sono
// valide: le passa chi le conosce.
export function normOccasioni(lista, { pulisciMostra, pulisciXy, pulisciOrdine } = {}) {
  const arr = Array.isArray(lista) ? lista : [];
  const visti = new Set();
  let accesa = false;
  const out = [];
  for (const [i, o] of arr.slice(0, MAX_OCCASIONI).entries()) {
    let id = String(o?.id || `oc${i}`).replace(/[^a-z0-9_-]/gi, '').slice(0, 24) || `oc${i}`;
    while (visti.has(id)) id += '_';
    visti.add(id);
    const attiva = !accesa && !!o?.attiva;
    if (attiva) accesa = true;
    out.push({
      id,
      nome: String(o?.nome || 'Occasione').trim().slice(0, 40) || 'Occasione',
      attiva,
      mostra: typeof pulisciMostra === 'function' ? pulisciMostra(o?.mostra) : {},
      xy: typeof pulisciXy === 'function' ? pulisciXy(o?.xy) : {},
      ordine: typeof pulisciOrdine === 'function' ? pulisciOrdine(o?.ordine) : [],
    });
  }
  return out;
}

// Accende UNA occasione (o le spegne tutte). Ritorna l'elenco nuovo: non tocca
// quello vecchio, cosi' chi salva decide lui quando scrivere.
export function accendi(occasioni, id, si = true) {
  const l = Array.isArray(occasioni) ? occasioni : [];
  return l.map((o) => ({ ...o, attiva: !!si && String(o.id) === String(id) }));
}
