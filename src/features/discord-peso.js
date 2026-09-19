// QUANTO PESA QUELLO CHE STAI PER CANCELLARE.
//
// Serve a far pesare la conferma quanto il danno. Tre «sei sicuro?» identici
// si cliccano a memoria: il terzo non lo legge piu' nessuno. Una domanda che
// dice il numero vero, e che sopra una soglia chiede di SCRIVERE il nome del
// server, e' l'unica che non puo' venire dalla memoria muscolare.
//
// «Vivo» vuol dire che qualcuno ci ha parlato di recente. La data non viene da
// un messaggio letto: viene dall'id dell'ultimo messaggio (vedi
// `discord-api.js`). Una categoria parla per i suoi canali.
export const VIVO_MS = 30 * 24 * 60 * 60 * 1000;   // un mese di silenzio, e non lo chiamiamo piu' vivo
export const TANTI = 10;                            // oltre dieci cose insieme, si scrive il nome

export function peso(togli, { ora = Date.now(), vivoMs = VIVO_MS, tanti = TANTI } = {}) {
  const lista = Array.isArray(togli) ? togli : [];
  const vivi = lista.filter((x) => (Number(x.ultimoMessaggio) || 0) > ora - vivoMs);
  return {
    quanti: lista.length,
    categorie: lista.filter((x) => Number(x.tipo) === 4).length,
    vivi: vivi.map((x) => String(x.nome || '')),
    // Scrivere il nome del server si chiede quando c'e' roba viva, o quando ce
    // n'e' tanta insieme. Non e' una scala di livelli: e' una domanda sola che
    // cambia forma quando serve davvero.
    scriviIlNome: vivi.length > 0 || lista.length > tanti,
  };
}
