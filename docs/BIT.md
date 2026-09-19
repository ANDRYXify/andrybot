<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->

# I Bit: dare allo streamer piu' spazio di manovra

## Il difetto da cui nasce

Un Bit e cinquemila Bit facevano la stessa identica cosa. L'innesco `cheer` dei
Moduli scattava uguale per qualsiasi cifra, e fra le condizioni (ruolo,
piattaforma, live, monete, probabilita') non ce n'era una che guardasse quanto
era stato messo. Chi alzava la posta non comprava niente di piu', e soprattutto
non lo vedeva nessuno.

Da li' scendono, in ordine di quanto muovono davvero: **la scala**, **la gara**,
**il ricordo** — e, in mezzo, il caso che regge tutto il resto: **il cheer senza
nome**.

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

## 3. Il ricordo: il re dei Bit

Il premio periodico in VIP c'era gia', e pescava dalle monete. Adesso sono
**due gare in parallelo** — `premioVip.monete` e `premioVip.bit` — ognuna col
suo interruttore, il suo periodo e i suoi POSTI. Non una scelta fra le due:
sono due meriti diversi (chi c'e' sempre e chi mette mano al portafoglio), e
obbligare lo streamer a dire quale delle due non gli interessa era una domanda
senza risposta giusta.

**La durata si conta in DIRETTE, non in giorni.** Un VIP a scadenza di
calendario evapora mentre lo streamer sta fermo: chi vince e poi si becca due
settimane di pausa lo perde senza averlo mai goduto. Il conto scende quando una
diretta **finisce** (`vips.scalaDiretta`, chiamata sulla transizione
live→offline): scalando all'inizio, un premio da una diretta sparirebbe la sera
dopo, prima di essere stato addosso a qualcuno per una serata intera. Se il bot
e' giu' alla fine di una diretta quel giro non si conta, e il premio dura una
sera in piu' — sbagliare da quella parte e' il verso giusto.

Chi arriva a zero non si cancella li': diventa **scaduto** (una scadenza nel
passato), e da li' in poi se ne occupa la ronda che toglie i VIP scaduti, che
quella strada la sa gia' e sa gia' riprovare se Twitch non risponde. Una strada
sola per togliere un VIP, non due che devono restare d'accordo.

**Ogni posto ha il suo nome e la sua durata.** `posti: [{ dirette, titolo }]`,
da uno a cinque: il primo puo' valere cinque dirette e il terzo una. Il titolo
lo scrive lo streamer — re, principe, cavaliere, o quello che gli pare — ed e'
la parola che esce in chat; senza, si dice «1° posto». Quanti posti ci sono lo
dice la lunghezza dell'elenco: non c'e' un secondo numero che possa smentirla.

**Le due gare hanno due giri separati** (`premioVipUltimo` diventa un oggetto
per gara): due gare che si segnassero sullo stesso numero si spegnerebbero a
vicenda. Il numero solo di prima vale come punto di partenza per tutt'e due,
invece di far ripartire i conti da zero.

**Il premio non sa da dove viene la classifica.** `vip.premia()` riceve `gente`
gia' in ordine e `posti` in palio, e li accoppia scorrendo; `premiaTopMonete` e
`premiaTopBit` sono due modi di riempire quella lista. La terza sorgente che
verra' non avra' bisogno di un terzo giro di premiazione.

**Chi puo' vincere lo decide un posto solo** (`vip.puoVincere`): non il padrone
di casa, non lo staff. Non e' una raffinatezza — Twitch RIFIUTA di dare il VIP a
un moderatore, quindi un premio pescato da una classifica mista si brucia contro
un rifiuto certo. La classifica delle monete ha la sua gara separata, quella dei
Bit e' di Twitch e dentro ci sono tutti: e' li' che serviva.

**Il silenzio di Twitch non e' un mese senza re.** Il giro si segna la data
dell'ultimo premio, ed e' quella che impedisce di premiare due volte nello
stesso periodo. Se la si scrivesse anche quando la classifica non e' arrivata
(`null`), un permesso mancante cancellerebbe il premio del mese in silenzio.
Quindi `bot.js` esce PRIMA di segnarsi il giro, e riprova all'ora dopo. E'
per questo che `premiaTopBit` riceve le righe gia' decise invece di andarsele a
prendere: distinguere «non lo so» da «non ha cheerato nessuno» tocca a chi
decide se il periodo e' passato.

**La corona e il saluto sono il premio visto da fuori.** Non hanno un loro
interruttore: `bit.re(canale)` torna `null` se il premio e' spento o se pesca
dalle monete. Cosi' non resta in chat un re che non regna piu', e non c'e' un
secondo interruttore da ricordarsi.

- **La corona** viaggia *col messaggio* (`corona` accanto a `piattaforma`), non
  col tema: chi regna puo' cambiare mentre l'overlay e' aperto. Vale solo su
  Twitch, perche' il login del re viene dalla classifica di Twitch e altrove lo
  stesso nome e' un'altra persona. A schermo e' **disegnata** (SVG), non
  un'emoji: un'emoji cambia faccia a ogni sistema e in una grafica in onda
  sarebbe l'unica cosa non nostra.
- **Il saluto** e' una volta per REGNO, e il segno e' la data
  dell'incoronazione, non un `si'`: chi vince due mesi di fila comincia un regno
  nuovo e viene salutato di nuovo. La frase la scrive lo streamer
  (`premioVip.saluto`, segnaposti `{user}` e `{bit}`); vuota vuol dire «non
  dirlo», e il segno si mette lo stesso — non «riprovaci a ogni messaggio».

**Nel rapporto di fine diretta** i Bit della serata si sommano dagli eventi
`channel.cheer` nella finestra della diretta, con chi ne ha messi di piu'
*stasera*. Non e' la classifica del mese: quella e' di Twitch, e resta una sola.

### Il pannello: due carte gemelle

Le due gare si disegnano con la stessa funzione (`_premioGara`), e le righe
delle posizioni con `_premioRighe`: una sola forma, due gare. I tasti pero' si
attaccano **uno per uno e col loro nome scritto** (`pr-monete-piu`,
`pr-bit-piu`), non dentro un giro: un ascoltatore appeso in un ciclo non si
vede da fuori, e il cancello dei bottoni ha ragione a non fidarsi. Il «Togli»
di una riga passa invece per delega sul contenitore, come le regole di Discord.

Il pannello legge anche le impostazioni del formato vecchio (`premioDi`), per
la stessa ragione del server: non e' il posto dove si perde una scelta gia'
fatta.

## 4. Il cheer senza nome

Twitch lascia cheerare in anonimo e in quel caso non manda nessun nome. Il
pericolo non e' restare senza una parola da scrivere: e' inventarne una —
ripiegare sul nome di chi ha cheerato prima, o far passare per un nome una
parola del sistema. In `features/bit.js` stanno le due risposte, perche' sono la
stessa regola vista da due lati:

    chiHaCheerato(d) -> '' se e' anonimo      (classifiche, record, premi)
    comeSiChiama(d)  -> 'un anonimo'          (frasi da leggere)

Avvisi e Moduli la prendono da li' invece di riscriversi il ripiego, e siccome
guarda `is_anonymous` vale anche per un abbonamento regalato senza firma.

## 5. Il richiamo del treno

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
  `test/unita/bit-re.test.mjs`, `test/unita/rapporto.test.mjs`,
  `test/unita/treno.test.mjs`, `test/contratto/moduli-scala.test.mjs`,
  `test/contratto/premio-bit.test.mjs`, `test/contratto/treno-default.test.mjs`.
