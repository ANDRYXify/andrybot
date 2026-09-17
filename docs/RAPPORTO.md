# Il rapporto di fine diretta

Appena la diretta finisce, lo streamer riceve in privato su Telegram poche
righe su com'è andata. Numeri, non aggettivi: il cervello qui non c'entra, e
la reazione affettuosa che già manda a fine live resta quella che è. Questo è
il foglietto che uno streamer si scriverebbe da sé, se avesse voglia di contare.

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

Con `stream.offline` il bot chiude la sessione, raccoglie, compone
(`testo`, pura: solo le righe che hanno qualcosa da dire) e manda con
`inviaMessaggio` alla chat privata dello streamer. Tre condizioni, tutte
necessarie: la chat privata collegata (`owner_tg_id`) e accesa (`dm_modo`
diverso da `off`), e l'interruttore «Rapporto di fine diretta» acceso
(`settings.rapporto.attivo`, di serie sì). Se una manca, silenzio: il rapporto
è suo, e stare zitti quando non lo vuole vale quanto scrivere quando lo vuole.

## Dove si vede

Scheda Notifiche, carta Telegram, sotto la chat privata: l'interruttore e la
spiegazione. Il manuale della vetrina lo dice nel passo di Telegram.

## Il collaudo

`test/unita/rapporto.test.mjs`: la sessione (picco, media, durata, la ripresa
dalle presenze), la raccolta nella finestra giusta (chat, eventi, presenze,
clip, donazioni), il testo riga per riga e il caso vuoto, lo spegnimento.
`test/contratto/rapporto.test.mjs`: il cablaggio nel bot, l'interruttore, il
manuale, la vetrina, le novità.
