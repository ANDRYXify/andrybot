<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->

# I Bit: dare allo streamer piu' spazio di manovra

## Il difetto da cui nasce

Un Bit e cinquemila Bit facevano la stessa identica cosa. L'innesco `cheer` dei
Moduli scattava uguale per qualsiasi cifra, e fra le condizioni (ruolo,
piattaforma, live, monete, probabilita') non ce n'era una che guardasse quanto
era stato messo. Chi alzava la posta non comprava niente di piu', e soprattutto
non lo vedeva nessuno.

Da li' scendono tre cose, in ordine di quanto muovono davvero: **la scala**, **la
gara** e **il richiamo**.

## 1. La scala (`minQuantita` / `maxQuantita`)

Sta nelle CONDIZIONI di un Modulo, non dentro le azioni: cosi' e' un modulo per
scaglione e la scala si legge dal pannello invece di stare sparsa.

Non e' una soglia sui Bit: e' una soglia sulla **quantita' dell'evento**, e
l'unita' la decide il tipo di evento. `QUANTITA_EVENTO` in
`features/modules.js`:

    cheer -> bits      raid -> viewers      subscribe -> mesi

Un innesco che in quella mappa non c'e' (un comando, un timer, un follow) non
viene toccato dalle due soglie: non c'e' niente da misurare, e rifiutare a vuoto
spegnerebbe un modulo senza che si capisca perche'. Dentro un evento che la
scala ce l'ha, un numero che non arriva vale **zero** e la soglia lo ferma:
sbagliare di qua fa perdere un effetto, sbagliare di la' lo regala a chi non ha
messo nulla.

**Dove sta nell'ordine.** Prima di tutto cio' che consuma (costo, cooldown,
cooldown per utente). Un cheer da 10 su un modulo «da 1000 in su» non paga
niente e non brucia la pausa di chi mille Bit li ha messi davvero.

**Perche' serve anche il tetto.** Senza, un cheer da 5000 farebbe scattare
insieme lo scaglione da 100, quello da 1000 e quello da 5000: tre alert
sovrapposti. Con la fascia si scrive una scala vera. Un tetto piu' basso del
pavimento e' un refuso e si butta al salvataggio (`normCondizioni` in `db.js`):
il pavimento e' la parte voluta di una scala, il tetto la rifinitura, e la
rifinitura che contraddice la base lascerebbe un modulo che non scatta mai.

Il pannello mostra le due caselle SOLO per gli eventi che una scala ce l'hanno,
con l'unita' scritta accanto, e le toglie quando cambi innesco (`SCALA_EVENTO`
in `web/public/app.js`).

## 2. La gara: la classifica dei Bit

**E' di Twitch, non nostra.** Stessa regola del treno e per lo stesso motivo: i
cheer ci passano davanti uno per uno e sommarli sarebbe stato facile, ma sarebbe
stata una SECONDA classifica che con quella di Twitch non torna — e non torna
proprio dove qualcuno se ne accorge: i cheer arrivati col bot spento, quelli
anonimi, i mesi che cominciano quando dice Twitch. Due numeri diversi per la
stessa domanda sono peggio di un numero solo che ogni tanto manca.

Quindi `helix/bits/leaderboard` (scope **`bits:read`**, aggiunto a
`SCOPES.broadcaster`: chi aveva gia' collegato il canale se lo vede chiedere dal
pannello con la strada dei permessi mancanti che c'e' gia'). Periodi: giorno,
settimana, mese, anno, sempre.

`features/bit.js` tiene il risultato per qualche minuto e **lo butta quando
arriva un cheer**: e' l'unico momento in cui la classifica puo' essere cambiata,
quindi e' l'unico in cui vale la pena richiederla — ed e' anche il momento in
cui la gente scrive `!bit`. Un «non lo so» invece non si mette in memoria, se
no un permesso appena ridato resterebbe inutile per minuti.

**`null` e `[]` sono due cose diverse.** `null` = non lo sappiamo (permesso
mancante, Twitch muto) e si TACE: il pannello avverte gia' lo streamer, e in
chat non si raccontano i nostri tubi a chi e' li' per guardare la diretta.
`[]` = non ha cheerato nessuno, ed e' una risposta che per giunta invita
(«il primo posto e' libero»).

Si chiedono **cento** posizioni, non le tre del podio: serve a rispondere «sei
al 12° posto» a chi sul podio non c'e'. E' quella riga che fa cheerare, non il
podio di qualcun altro. Chi il podio ce l'ha gia' non se lo sente ripetere.

`!bit` (anche `!bits`, `!classificabit`) vive nel registro dei comandi pronti,
quindi e' spegnibile, rinominabile e non vince mai su un comando dello streamer
con lo stesso nome. Accetta un periodo: `!bit oggi`, `!bit settimana`,
`!bit anno`, `!bit sempre`.

## 3. Il richiamo del treno

Vedi `OVERLAY.md`, sezione dell'hype train: nell'ultimo quarto della salita il
bot dice quanti punti mancano al livello dopo, una volta per livello. Il numero
e' di Twitch, non nostro.

## Cancelli

- `node scripts/verifica-moduli.mjs` — le condizioni nei due versi (quelle che
  il motore guarda il pannello le sa mandare, e viceversa) e le due mappe della
  scala che dicono le stesse cose.
- `node scripts/verifica-comandi.mjs` — `!bit` ha un gestore, non ruba il nome a
  nessuno, e la demo mostra lo stesso registro del prodotto.
- `test/unita/moduli-quantita.test.mjs`, `test/unita/bit.test.mjs`,
  `test/unita/treno.test.mjs`, `test/contratto/moduli-scala.test.mjs`,
  `test/contratto/treno-default.test.mjs`.
