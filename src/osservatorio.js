// L'OSSERVATORIO — sapere che qualcosa si è rotto senza aspettare che lo dica
// uno streamer.
//
// Il registro era `console.log` con un timestamp: ottimo per leggere una riga,
// inutile per rispondere alla domanda che conta davvero su un prodotto in
// abbonamento — «cosa sta fallendo, da quando, e quanto spesso?». Senza quella
// risposta un difetto non diventa una segnalazione: diventa uno che smette di
// pagare senza dire niente.
//
// Come funziona: OGNI log.error passa di qui, automaticamente, perché il gancio
// sta dentro il logger. Nessun modulo deve ricordarsi di annotare — e infatti
// tutte e quarantanove le aree del bot hanno già la loro etichetta.
//
// Cosa NON fa: non indovina di quale streamer si tratta. Un messaggio d'errore
// spesso contiene un canale, ma dedurlo con un'espressione regolare vorrebbe
// dire attribuire a volte il guasto alla persona sbagliata — peggio che non
// attribuirlo. Il canale si sa dove il codice lo sa (le chat da ricollegare, che
// il bot già traccia per nome); qui si aggrega per AREA, e si tengono gli ultimi
// messaggi per intero.

const MAX_TESTO = 300;

export function creaOsservatorio({ tieni = 120, maxAree = 300, ora = () => Date.now() } = {}) {
  const aree = new Map();
  const recenti = [];

  function annota(area, testo) {
    const a = String(area || 'generale').slice(0, 40);
    const t = String(testo == null ? '' : testo).slice(0, MAX_TESTO);
    const adesso = ora();
    let v = aree.get(a);
    if (!v) {
      if (aree.size >= maxAree) return;      // tetto: il registro non diventi il problema
      v = { n: 0, primo: adesso, ultimo: adesso, ultimoTesto: '' };
      aree.set(a, v);
    }
    v.n++; v.ultimo = adesso; v.ultimoTesto = t;
    recenti.push({ ts: adesso, area: a, testo: t });
    if (recenti.length > tieni) recenti.splice(0, recenti.length - tieni);
  }

  // Il quadro. `finestraMs` limita i conteggi "di recente" senza perdere lo
  // storico: un'area che sbagliava ieri e oggi tace non deve sembrare rotta.
  function riepilogo({ finestraMs = 3600_000 } = {}) {
    const adesso = ora();
    const soglia = adesso - finestraMs;
    const diRecente = new Map();
    for (const r of recenti) if (r.ts >= soglia) diRecente.set(r.area, (diRecente.get(r.area) || 0) + 1);
    const elenco = [...aree.entries()].map(([area, v]) => ({
      area, totale: v.n, recenti: diRecente.get(area) || 0,
      primo: v.primo, ultimo: v.ultimo, ultimoTesto: v.ultimoTesto,
    })).sort((x, y) => (y.recenti - x.recenti) || (y.ultimo - x.ultimo));
    return {
      totale: [...aree.values()].reduce((n, v) => n + v.n, 0),
      totaleRecenti: [...diRecente.values()].reduce((n, v) => n + v, 0),
      finestraOre: finestraMs / 3600_000,
      aree: elenco,
      ultimi: recenti.slice(-25).reverse(),
    };
  }

  // Le aree che stanno sbagliando ADESSO e ripetutamente: è questo che merita
  // un occhio, non un errore isolato di tre giorni fa.
  function inSofferenza({ finestraMs = 3600_000, almeno = 5 } = {}) {
    return riepilogo({ finestraMs }).aree.filter((a) => a.recenti >= almeno);
  }

  return { annota, riepilogo, inSofferenza, azzera() { aree.clear(); recenti.length = 0; } };
}

export const osservatorio = creaOsservatorio();
