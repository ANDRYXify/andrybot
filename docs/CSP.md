# CSP e service worker

Il `Content-Security-Policy` non è nel codice dell'applicazione: lo mette
**Caddy**, davanti al server, e ce ne sono quattro — uno per la Mini App
Telegram (che deve poter essere incorniciata da `web.telegram.org`), uno per le
pagine con il tracking del volto (che devono scaricare i modelli da CDN), uno
per tutto il resto, ed è il più stretto, e uno per la pagina di manutenzione,
che è il più stretto di tutti perché quella pagina non esegue niente.

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

Questa frase è rimasta vera a metà per parecchio tempo, e vale la pena dire
dove. Il cancello leggeva i file dentro `public/`, quindi copriva le pagine
scritte a mano e il markup di `app.js`. Non copriva le pagine che il **server
compone**: la pagina link teneva un `onerror` sull'avatar, quello che nasconde
l'immagine rotta e mostra l'iniziale al suo posto. Il browser lo rifiutava —
*«Refused to execute inline event handler»*, riprodotto sul banco — quindi chi
metteva un avatar personalizzato con un indirizzo rotto vedeva l'icona spezzata
e nient'altro. Nessun errore in pagina, nessun cancello rosso.

Ora il comportamento vive in `pagina-link.js`, con due strade perché lo script
ha `defer` e l'immagine è `eager`: un ascoltatore `error` in cattura per gli
errori che arrivano dopo, e una passata su `img[data-ripiego]` che riconosce
quelle già fallite (`complete && naturalWidth === 0`) per quelli arrivati prima.
Misurato sul banco con la CSP vera addosso: immagine nascosta, iniziale
mostrata, zero violazioni.

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

`style-src` tiene ancora `'unsafe-inline'`, ma non per la ragione che era
scritta qui. «L'app scrive stili al volo» non è un motivo: `el.style.x = y`
passa dal CSSOM, e la CSP non lo guarda. Nel codice servito
`setAttribute('style')` non compare mai — contato, zero occorrenze.

I motivi veri sono due, e sono contati anche quelli: sette pagine servite hanno
un blocco `<style>`, e il CSS personalizzato dello streamer nasce nel database e
finisce dentro un `<style>` della sua pagina. Toglierlo vuol dire firmare ogni
blocco con un hash e dare al CSS dello streamer una strada tutta sua. È un
lavoro a sé, ma adesso si sa quanto grande.

Le tre CSP sono state applicate **davvero** alle pagine vere sul banco, che ora
legge le politiche dal `Caddyfile` invece di averne una copia sua: dashboard,
vetrina, accesso moderatori, sblocca, overlay, Mini App, voce e tracking — zero
violazioni, zero errori JavaScript.

## `frame-src`: l'elenco chiuso, e come resta chiuso

`frame-src` era `https:`, cioè «incorniciamo qualunque pagina del web». La
motivazione scritta accanto diceva che le pagine link incorporano contenuti
scelti dallo streamer, «anche una pagina qualsiasi».

Il codice dice un'altra cosa. `embedSrc()` in `linkpagina.js` riconosce quattordici
fornitori — YouTube, Twitch, Kick, TikTok, Instagram, Facebook, Spotify,
SoundCloud, Deezer, Apple Music, Vimeo — e per qualunque altro indirizzo
**torna `null`**, cioè non incornicia niente. Il permesso aperto non serviva a
nessuno: era largo e basta.

Ora `frame-src` elenca quei fornitori. Vale anche per l'anteprima dentro
l'editor, che è un iframe `srcdoc` e quindi **eredita questa politica**: se un
fornitore manca qui, sparisce anche dall'anteprima.

Il cancello lo tiene agganciato al codice nei due versi, perché i due modi di
sbagliare sono opposti e uno solo dei due si nota:

- **un fornitore aggiunto al codice e dimenticato nella CSP** si rompe dal vivo,
  senza un errore in pagina;
- **un host lasciato nella CSP** dopo che il codice non lo usa più è un permesso
  regalato che nessuno rilegge.

Perciò `verifica-csp.mjs` estrae gli host dal codice e pretende che i due
insiemi coincidano, oltre a rifiutare qualunque fonte che sia un intero schema.
Una voce, `soundcloud.com`, è nell'elenco pur non essendo l'origine di un
iframe: compare nel codice dentro il parametro `url=` del lettore
`w.soundcloud.com`. Sta lì perché l'elenco è estratto meccanicamente, e un
elenco estratto vale più di uno curato a mano.

`img-src` e `media-src` tengono `https:` di proposito, e non passano di qui.
Lo sfondo e l'avatar di una pagina link sono un indirizzo scelto dallo streamer:
lì l'elenco chiuso non esiste per costruzione. Chiuderlo vorrebbe dire passare
quelle immagini da un nostro proxy, che è una funzione a sé — con cache, limiti
di dimensione e difesa dalle richieste verso l'interno.

## `form-action`

`form-action` e `frame-ancestors` sono le due direttive che **non ereditano da
`default-src`**. Se non le scrivi non valgono, e una `default-src 'self'`
stretta non copre il buco: un form iniettato in pagina può spedire dove gli
pare. `frame-ancestors` c'era in tutte e quattro le politiche, `form-action` in
nessuna.

Adesso c'è: `'self'` sulle tre politiche vere, `'none'` sulla pagina di
manutenzione, che di form non ne ha nemmeno uno.

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
sette cose: nessun `script-src` con `'unsafe-inline'` o `'unsafe-eval'`;
`object-src 'none'`, `base-uri 'self'`, `frame-ancestors` e `form-action` in
tutte; nessuno `<script>` eseguibile dentro l'HTML (ammessi solo JSON-LD e le
regole di prefetch); nessun attributo `on…=` in nessun file servito **né nelle
pagine composte dal server né nel codice che le compone**; `frame-src`
agganciata nei due versi all'elenco che il codice produce davvero; e il
`security.txt` presente, con contatto e scadenza valida.

Il verso è quello giusto: se rientra uno script inline, **smette di funzionare** e
il cancello diventa rosso. La risposta non è riallargare la CSP, è portare lo
script in un file.

Provato rosso su nove difetti veri: `'unsafe-inline'` rimesso nella CSP, uno
`<script>` rimesso in `index.html`, un `onerror` rimesso nel markup di `app.js`,
un `security.txt` scaduto, `form-action` tolta da una politica, l'`onerror`
rimesso nella pagina link (visto sia sulla pagina composta sia nel codice che la
compone), `frame-src` riaperta a tutto `https:`, un fornitore tolto dalla CSP ma
non dal codice, e un host lasciato nella CSP che il codice non usa.

Una nota sul banco stesso, perché è il genere di cosa che rende verde un
cancello cieco. La prima volta, il difetto dell'`onerror` sulla pagina link lo
vedeva solo il controllo sul codice: la pagina di collaudo veniva composta senza
avatar, quindi il ramo con l'`<img>` non veniva scritto affatto e il controllo
sulle pagine composte guardava un HTML in cui il difetto non poteva esserci. Il
corpus adesso ha un avatar, e il difetto lo vedono entrambi.
