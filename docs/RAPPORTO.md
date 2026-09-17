# Il rapporto di fine diretta

Appena la diretta finisce, il bot ne scrive il rapporto: poche righe su com'è
andata. Numeri, non aggettivi: il cervello qui non c'entra, e la reazione
affettuosa che già manda a fine live resta quella che è. Questo è il foglietto
che uno streamer si scriverebbe da sé, se avesse voglia di contare.

Il rapporto **resta sempre** nella scheda Dirette del pannello (tabella
`rapporti`, uno per diretta, con un puntino sulla voce di menu finché non lo
apre); in più può **arrivare** appena chiude, su Telegram in privato e/o via
mail. I canali si scelgono in quella scheda (`settings.rapporto`:
`telegram`, di serie acceso; `mail`, acceso solo dopo la conferma
dell'indirizzo). La posta la manda il server da sé: `docs/POSTA.md`.

## Da dove vengono i numeri

Quasi tutto è già in casa, e si legge dal database **al momento di chiudere**,
con la finestra della diretta (`raccogli`, in `src/features/rapporto.js`):

| riga | fonte |
|---|---|
| messaggi, persone, i tre più attivi | `messages` nella finestra, senza il bot e senza gli eventi |
| nuovi follower, sub (e regali), raid (con gli spettatori) | le righe `[evento]` che il bot scrive già in `messages` a ogni evento Twitch |
| presenti e prime volte | `presenze`: chi ha `ultima` uguale alla diretta corrente, chi ha `prima_ts` nella finestra |
| clip | `clips` nella finestra |
| donazioni | `donazioni` pagate nella finestra, non rimborsate |

Quello che passa e non resta, cioè gli spettatori a ogni giro, si tiene in
memoria durante la diretta (`osservaGiro`, dallo stesso giro da cinque minuti
delle ore guardate: `stream.viewer_count`, nessuna chiamata in più). Picco e
media escono da lì.

## L'inizio e la fine

L'inizio è l'istante in cui il bot ha visto partire la diretta
(`stream.online`, con `started_at` se c'è). Se il bot è ripartito a diretta in
corso, la sessione non c'è: al primo giro se ne apre una che parte
dall'inizio della diretta corrente delle presenze (`dirette_viste`), che
sopravvive ai riavvii. Un riavvio a metà serata perde al più il picco di
prima, non il rapporto. La fine è l'istante dell'offline.

Con `stream.offline` il bot chiude la sessione, raccoglie, **salva** il
rapporto (`rapporti.salva`) e poi lo manda dove lo streamer ha scelto:
- su Telegram (`testo`, pura: solo le righe che hanno qualcosa da dire), se la
  chat privata è collegata (`owner_tg_id`) e accesa (`dm_modo` diverso da
  `off`) e l'interruttore Telegram è acceso;
- via mail (`html`, col guscio del prodotto, e `testoPiano` per chi legge in
  testo), se l'indirizzo è confermato, l'interruttore mail è acceso e la posta
  del server è attiva.
Ogni consegna riuscita si segna sul rapporto (`inviato`), così la scheda dice
dov'è andato. Se un canale manca, silenzio su quel canale: il rapporto è suo.

## Dove si vede

Scheda Dirette: la lista dei rapporti (ognuno una carta con i numeri, «nuovo»
finché non la apri) e la carta «Dove ricevere il rapporto», con l'interruttore
Telegram, l'indirizzo mail con la conferma e l'interruttore mail. Aprire la
scheda segna i rapporti come letti (`POST /api/streamer/rapporti/letti`).
Il manuale della diretta ha la sezione «Il rapporto di ogni diretta».

## Il collaudo

`test/unita/rapporto.test.mjs`: la sessione (picco, media, durata, la ripresa
dalle presenze), la raccolta nella finestra giusta (chat, eventi, presenze,
clip, donazioni), il testo riga per riga e il caso vuoto, lo spegnimento.
`test/contratto/rapporto.test.mjs`: il cablaggio nel bot (salva sempre, poi i
canali), la scheda Dirette con le sue porte, il manuale, la vetrina, le novità.
