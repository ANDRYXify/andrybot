# Il collaudo

> © 2024–2026 Andrea Taliento (ANDRYXify)

`npm test` — gira in pochi secondi, non chiede rete, non tocca il database vero.
Gira anche da solo su GitHub a ogni push e a ogni pull request
(`.github/workflows/collaudo.yml`), su Node 20 e 22.

## Perché esiste

Fino a ieri non c'era. Su 21.000 righe di server e 15.000 di dashboard l'unica
rete erano tre script che bisognava ricordarsi di lanciare a mano — e infatti il
difetto più caro (l'overlay che «non salvava niente») è passato proprio di lì:
il browser scriveva quattro assi nuovi, il server non li elencava e li buttava
via in silenzio. Nessuna prova attraversava il confine browser↔server, quindi
nessuna poteva vederlo.

Il criterio di cosa provare non è la copertura: è **ciò che è già costato**, e
ciò che costerebbe di più se cedesse in silenzio — i soldi, i segreti, la roba
degli altri.

## Cosa c'è dentro

| File | Cosa tiene fermo |
|---|---|
| `contratto/stile` | Ogni valore di ogni asse dell'overlay sopravvive al salvataggio; un valore inventato no. Chiama le normalizzazioni **vere** del server, non confronta testo. |
| `unita/piani` | Chi non paga non entra, chi paga non trova chiuso. Add-on che si sommano, tier inventati che non regalano niente. |
| `unita/segreti` | I token cifrati a riposo tornano identici, non trapelano, e un valore manomesso non fa cadere il bot. |
| `unita/libreria` | Chi vede cosa nella libreria condivisa. Il privato di uno non finisce nella vetrina di tutti. |
| `unita/identita` | Un media caricato non ne cancella mai un altro; ogni comando coniato è valido e non esce dalla cartella. |
| `unita/antispam` | Soprattutto il **falso positivo**: i messaggi normali devono passare. |
| `unita/moderazione` | Le parole vietate, e le conseguenze note della scelta «sottostringa». |
| `cancelli/*` | I tre cancelli statici, che ora girano da soli. |

## Come si aggiunge una prova

Un file `test/**/qualcosa.test.mjs`, `node:test` e `node:assert/strict`. Se
serve il database, `cartellaUsaEGetta()` da `test/aiuto.mjs` **prima**
dell'`import` di `db.js`: ogni file di prove gira nel suo processo, quindi ha il
suo database usa-e-getta.

## La regola

Un cancello che non è mai stato visto diventare rosso non è un cancello.
Ognuna di queste prove è stata messa alla prova rompendo di proposito la cosa
che sorveglia — per esempio, togliendo l'asse `materia` dalla normalizzazione
dell'alert il contratto diventa rosso con
`alert.materia: "piatta" entra ed esce come "undefined"`, che è esattamente il
difetto vero, riprodotto.
