# I collegamenti dell'overlay

## Come si controlla, invece di guardare

L'overlay in OBS riceve tutto da un solo flusso SSE (`/overlay/:login/stream`).
Il controllo giusto non e aprire l'overlay e guardare se qualcosa si muove, ma
confrontare **due insiemi**: i tipi di evento che il server puo mandare e i tipi
che l'overlay sa gestire. Se non coincidono, c'e un collegamento rotto, e si sa
esattamente quale.

## La mappa, oggi

| tipo | lo manda | l'overlay |
| --- | --- | --- |
| `alert` | `alerts.js` (follow, sub, bit, raid) | `alert()` |
| `chat` | `alerts.js` — chat a schermo | `chat()` |
| `chat_raw` | `alerts.js` — **anteprima nella dashboard** | ignorato (vedi sotto) |
| `widget` | `alerts.js` — ultimo follower / ultimo sub | `widget()` |
| `contatore` | `server.js` — contatori tipo `!morti` | `contatore()` |
| `tema` | `server.js` — ricarica stile e posizioni | `caricaTema()` |
| `testo` | `modules.js` — testo a schermo da comando | `mostraTesto()` |
| `penitenza` | `penitenze.js` (`start` / `hit` / `end`) | `penitenza()` |
| `preset` | `effects.js` — suoni pronti | `suonaPreset()` |
| `audio` | `effects.js` | `suona()` |
| `immagine`, `video` | `effects.js` | coda visiva |

Verificati uno per uno con un `EventSource` finto: ognuno produce davvero il
nodo che deve produrre. `widget` e `penitenza` sembravano scollegati finche non
ho mandato il payload **vero**: il primo compare solo con `cfg.attivo` (giusto:
se il widget e spento non deve comparire), il secondo solo con `azione`.
Entrambi corretti: era la mia sonda a essere incompleta.

## Il difetto trovato

`chat_raw` esce da `alerts.js` a **ogni messaggio di chat**, ed e destinato
all'anteprima dal vivo dentro la dashboard (`app.js`). Ma il flusso e uno solo,
quindi arriva anche all'overlay di OBS — dove finiva nel ramo finale:

```js
else { if (mostra('effetti')) { codaVisiva.push(dati); mostraProssimo(); } }
```

cioe nella **coda degli effetti visivi**, come se fosse un'immagine o un video.

A chat ferma non si nota: ogni evento in arrivo chiama `mostraProssimo()`, che
scarta subito quello che non e immagine o video. Il guaio arriva **mentre un
effetto e a schermo**: li `occupato` e vero, la coda non si svuota, e i
messaggi di chat si accumulano. Quando l'effetto finisce, la coda li smaltisce
**uno ogni 120 ms** — e l'effetto successivo aspetta dietro tutti quanti.

Misurato: un effetto lanciato con 60 messaggi di chat in mezzo compariva dopo

| | secondo effetto |
| --- | ---: |
| prima | **8 401 ms** |
| dopo | **1 152 ms** |

Con una chat viva sono i «gli effetti a volte non partono» che sembrano
capricci e invece sono aritmetica: un posto in coda per ogni messaggio
arrivato mentre l'effetto precedente era a schermo.

## La correzione

Non si aggiunge un ramo per `chat_raw`: si toglie il ramo che accettava
**qualunque cosa**. Nella coda visiva entrano solo i due tipi che quella coda
sa disegnare:

```js
else if (dati.tipo === 'immagine' || dati.tipo === 'video') { … }
```

Cosi un evento sconosciuto — `chat_raw` oggi, qualunque cosa si aggiungera
domani per un altro consumatore — viene **ignorato**, non disegnato. Il difetto
non puo ripresentarsi, perche la condizione che lo generava non esiste piu.

## Collaudo

`scratchpad/t_overlay.mjs` monta l'overlay vero con un `EventSource` finto,
manda ogni tipo della tabella e verifica che compaia il nodo giusto; poi
verifica che un evento sconosciuto non tocchi la pagina, e **misura** il
ritardo del secondo effetto con 60 messaggi di chat in mezzo (soglia: 3
secondi). Sul codice vecchio il test fallisce con 9 357 ms; su quello corretto
passa con 2 012 ms.
