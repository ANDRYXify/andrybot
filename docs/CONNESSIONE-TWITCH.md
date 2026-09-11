# La connessione a Twitch: come resta viva, e come si accorge di essere morta

Il bot parla con Twitch per tre strade: la **chat** (IRC su WebSocket, una
connessione per canale, con l'account dello streamer), gli **eventi** (EventSub
su WebSocket, una connessione per canale, col suo token) e l'**API** (Helix,
richieste singole). Ognuna può morire, e il modo peggiore di morire è in
silenzio: la spia resta verde, il bot resta muto.

## La chat

**Un socket può morire senza dirlo.** Una rete che cade senza chiusura, un NAT
che scade: per Node il socket resta «aperto» per sempre, nessun evento `close`,
nessuna riconnessione. Twitch manda un `PING` ogni ~5 minuti: se per **sei
minuti** non arriva nemmeno una riga, la connessione è morta e la chiudiamo
noi, così il backoff riparte. In più ogni quattro minuti mandiamo **noi** un
`PING`: un socket mezzo morto si scopre in pochi minuti invece che mai.

**Un login fallito non si riprova uguale.** Prima, con un token revocato, il bot
riprovava lo stesso token ogni minuto per ore. Ora dopo un `Login authentication
failed` il tentativo successivo **rinnova il token comunque** (`getToken` con
`forza`). Se il rinnovo fallisce con 400/401 il token viene tolto, il canale non
è più «pronto», e la sincronia lo spegne al giro dopo: niente giri a vuoto.

**Un primo collegamento fallito non lascia zombie.** L'evento `close` di quel
tentativo pianificava una riconnessione per conto suo: un'unità mai registrata
che continuava a collegarsi, autenticata e inutile. Ora `connect()` che
fallisce pulisce tutto e lascia decidere a chi l'ha chiamato.

**Una caduta pianifica UNA riconnessione.** `error` e `close` sono due eventi;
prima potevano pianificare due volte, raddoppiando il backoff a vuoto. C'è un
solo punto che pianifica, e se un timer c'è già si lascia a lui.

**Un messaggio in coda scade.** Mentre la connessione è giù i messaggi
aspettano; una risposta a `!uptime` consegnata tre minuti dopo è peggio di
nessuna. Dopo 90 secondi in coda un messaggio si scarta.

**Le NOTICE di Twitch su un nostro messaggio si leggono.** `msg_ratelimit`,
`msg_channel_suspended`, le modalità della chat: prima finivano a `debug`,
cioè da nessuna parte. Ora sono un `warn` con il motivo.

## Gli eventi

**Una sottoscrizione rifiutata per un motivo passeggero si riprova.** Un 429
(troppe richieste all'avvio, con molti canali) o un 5xx lasciavano il canale
senza `stream.online` fino alla prossima riconnessione — che su una connessione
sana può non arrivare mai. Si riprova dopo 15 s, 60 s, 240 s, solo le rifiutate;
un 403 è uno scope mancante e non si riprova. Una sessione nuova cancella le
riprove della vecchia: le rifà lei.

## L'API

**Una richiesta che non risponde è morta, non lenta.** Ogni `fetch` verso
Twitch (Helix, OAuth, EventSub) ha un limite di 15 secondi. Senza, una chiamata
appesa teneva ferma la sincronia dei canali, le ore guardate, gli ascolti: il
bot «si era fermato» senza un errore.

## La sincronia dei canali

**Un giro alla volta.** `syncChannels` parte ogni minuto e da ogni cambio di
stato live. Due giri insieme vedevano lo stesso canale «senza unità» e lo
avviavano entrambi: due connessioni, due risposte a ogni comando. Ora il
secondo aspetta il primo, e il posto nella mappa delle unità si prende **prima**
di aspettare la rete.

## Le prove

`test/unita/chat-irc.test.mjs` e `test/unita/eventsub-riprova.test.mjs`: un
socket finto e il tempo in mano (`mock.timers`). Ogni comportamento qui sopra ha
la sua riga, compresi il socket che muore senza `close` e la riprova che non
sopravvive a una sessione nuova.
