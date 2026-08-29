# CSP e service worker

Il `Content-Security-Policy` non è nel codice dell'applicazione: lo mette
**Caddy**, davanti al server, e ce ne sono tre — uno per la Mini App Telegram
(che deve poter essere incorniciata da `web.telegram.org`), uno per le pagine
con il tracking del volto (che devono scaricare i modelli da CDN), e uno per
tutto il resto, il più stretto.

## La riga che conta

Quello normale contiene:

```
img-src 'self' data: blob: https:      ← un'immagine può venire da qualunque https
connect-src 'self'                     ← una fetch() può parlare solo con noi
```

Sono due permessi molto diversi, e va bene così: le pagine dell'app non chiamano
nessun dominio esterno, mentre le immagini esterne le mostrano di continuo —
emote 7TV, avatar, anteprime.

## Perché il service worker deve stare al suo posto

Un service worker eredita il CSP della risposta che gli ha consegnato il proprio
script. `/sw.js` viene servito con il CSP normale, quindi il service worker vive
sotto `connect-src 'self'`. E una `fetch()` dentro un worker passa da
`connect-src`, non da `img-src`.

Da qui il difetto, che è costato tutte le immagini esterne del sito:

1. il browser chiede `https://cdn.7tv.app/emote/…/2x.webp` per un `<img>` —
   permesso da `img-src https:`;
2. il service worker intercetta **ogni** GET e la rifà con `fetch(req)`;
3. quella `fetch` non è più un'immagine, è una connessione: `connect-src 'self'`
   la blocca;
4. il ripiego era `caches.match(req)`, che per un dominio esterno non ha nulla e
   torna `undefined` — e `respondWith(undefined)` **non** vuol dire «lascio fare
   al browser», vuol dire errore di rete.

Risultato: immagini rotte, tutte insieme, senza un errore in pagina (la
violazione viene segnalata nel contesto del worker, non in quello del
documento). Da fuori sembrava che si fosse rotto 7TV.

La regola, ora, è quella giusta per costruzione: **il service worker si occupa
del guscio di questo sito; gli altri domini non lo riguardano** e passano dritti
al browser, che li carica sotto `img-src` come deve. E non risponde più con
qualcosa che possa essere `undefined`: un buco in cache restituisce un errore
esplicito.

Nota pratica: `/sw.js` viaggia con `max-age=0`, e lo script fa `skipWaiting()`
in installazione e `clients.claim()` in attivazione. Basta quindi un normale
ricaricamento perché il service worker nuovo prenda il posto del vecchio: non
serve svuotare la cache a mano.

## Il cancello

`scripts/verifica-service-worker.mjs` non ha l'elenco delle regole scritto
dentro: **legge il Caddyfile**, e solo se trova una politica in cui `img-src` è
più larga di `connect-src` pretende che il service worker lasci passare gli
altri domini. Se un domani i due permessi si equivalessero, la pretesa cadrebbe
da sola. Controlla anche che l'uscita avvenga *prima* di ogni `respondWith`, e
che nessun `respondWith` possa risolvere in `undefined`.

Provato rosso su entrambi i difetti veri.

## Quello che resta da fare

`script-src` contiene ancora `'unsafe-inline'`, che serve solo per tre script
scritti dentro `index.html` (tema, splash, banner dei cookie). Portandoli in un
file esterno, `'unsafe-inline'` si può togliere — è la prima voce del giro sulla
sicurezza.
