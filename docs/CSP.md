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

## Via `'unsafe-inline'` da `script-src`

`'unsafe-inline'` è il permesso che rende una CSP quasi inutile contro l'XSS:
se un pezzo di HTML iniettato può portarsi dietro il suo `<script>`, la lista
delle origini fidate non protegge da niente. Era lì per un motivo pratico —
alcune pagine avevano script scritti dentro l'HTML — quindi la via non era
allentare la regola ma togliere il motivo.

Ora **nessuna pagina servita ha uno `<script>` scritto dentro l'HTML**: gli undici
blocchi inline sono diventati file (`tema.js`, `splash.js`, `cookie.js`,
`mod.js`, `sblocca.js`, `overlay-app.js`, `tgapp.js`, `tracking-detector-conf.js`,
`tracking-detector.js`, `tracking-play.js`, `voce.js`). E non c'è più nessun
attributo `on…=""`, nemmeno nel markup che `app.js` genera a runtime: l'unico
(`onerror` sull'avatar Twitch) è diventato un ascoltatore delegato in cattura,
perché l'evento `error` non risale.

Due dettagli si sarebbero rotti in silenzio, e sono stati misurati sul banco
prima di toccare la CSP:

- **`tema.js` non ha `defer`.** Deve girare *prima* del primo disegno, altrimenti
  la pagina lampeggia chiara e poi diventa scura. Uno script esterno bloccante in
  `<head>` fa esattamente quello che faceva l'inline.
- **Le regole di prefetch inline sono soggette a `script-src`.** Con
  `script-src 'self'` Chrome le rifiuta — *«Refused to apply inline speculation
  rules»*, riprodotto. Esiste un permesso apposta, `'inline-speculation-rules'`,
  che abilita **solo** quei blocchi e nient'altro: è l'unico inline rimasto.

I percorsi dei nuovi file sono **assoluti** (`/tema.js`, non `tema.js`): pagine
come l'overlay sono servite su un percorso (`/overlay/<login>`) diverso da dove
sta il file, e un percorso relativo cercherebbe `/overlay/overlay-app.js`.

`style-src` tiene ancora `'unsafe-inline'`: l'app scrive stili al volo
(posizioni degli elementi, colori scelti dallo streamer). Lì il rischio è di
un'altra natura — non esegue codice — e toglierlo è un lavoro a sé.

Le tre CSP sono state applicate **davvero** alle pagine vere sul banco, che ora
legge le politiche dal `Caddyfile` invece di averne una copia sua: dashboard,
vetrina, accesso moderatori, sblocca, overlay, Mini App, voce e tracking — zero
violazioni, zero errori JavaScript.

## `security.txt`

`/.well-known/security.txt` (RFC 9116) dice a chi scrivere se si trova un buco.
È una **rotta esplicita**, non `express.static`: quello ignora di proposito i
file che iniziano con un punto, e allargare la regola per una cartella
esporrebbe anche tutte le altre. Il file vive in `public/well-known/` (senza
punto), la porta pubblica ha il punto come vuole lo standard.

Lo standard pretende un campo `Expires`, ed è una trappola di manutenzione: un
`security.txt` scaduto vale meno di nessuno. Per questo il cancello controlla che
la data **non sia passata** e che stia entro l'anno.

> Da fare a mano: l'indirizzo `security@socialbot.live` va creato (basta un
> alias). Un contatto che non riceve è peggio di nessun contatto.

## Il cancello

`scripts/verifica-csp.mjs` legge le politiche dal `Caddyfile` e tiene ferme
cinque cose: nessun `script-src` con `'unsafe-inline'` o `'unsafe-eval'`;
`object-src 'none'`, `base-uri 'self'` e `frame-ancestors` in tutte; nessuno
`<script>` eseguibile dentro l'HTML (ammessi solo JSON-LD e le regole di
prefetch); nessun attributo `on…=` in nessun file servito, HTML o JS; e il
`security.txt` presente, con contatto e scadenza valida.

Il verso è quello giusto: se rientra uno script inline, **smette di funzionare** e
il cancello diventa rosso. La risposta non è riallargare la CSP, è portare lo
script in un file.

Provato rosso su quattro difetti veri: `'unsafe-inline'` rimesso nella CSP, uno
`<script>` rimesso in `index.html`, un `onerror` rimesso nel markup generato, e
un `security.txt` scaduto.
