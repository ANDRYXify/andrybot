<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# I premi a punti canale che durano

«Solo emote per 5 minuti», «Parla in inglese per 10 minuti», «VIP per un
giorno». Su Twitch e su Kick un premio è un nome e un costo: il tempo che c'è
scritto dentro non lo conta nessuno. Lo streamer guarda l'orologio, se se ne
ricorda, e chi ha pagato non sa quanto manca.

Qui il tempo di un premio diventa una cosa vera: parte quando qualcuno lo
riscatta, si vede sull'overlay, il bot lo dice in chat, e finisce da solo.

## Il modello

**La durata è del premio.** Un premio dura `D` secondi, fra 10 secondi e 30
giorni. `D` viene, in quest'ordine:

1. dalla scelta dello streamer per quel premio, se l'ha fatta;
2. dal nome del premio;
3. dalla sua descrizione.

Il nome si legge in italiano, inglese e spagnolo (`5 min`, `10 minuti`,
`1h 30m`, `un'ora e mezza`, `mezz'ora`, `2 hours`, `media hora`, `7d`, `una
settimana`) e solo se è **senza dubbi**: due durate diverse nello stesso nome,
un numero senza unità, «ora» che vuol dire adesso, non sono una durata. Le
lettere da sole valgono solo attaccate al numero (`5m`, `30s`, `2h`, `7d`):
«100 m» sono metri. «Non è a tempo» scelto dallo streamer vince sul nome.

Rinominare il premio su Twitch cambia la sua durata, se lo streamer non ne ha
scelta una: il nome è la fonte, non una copia.

**Cosa dura.** Cinque cose, e solo lo streamer sceglie le ultime quattro:

| cosa | dove | chi la tiene |
|---|---|---|
| solo il tempo, col conto alla rovescia | Twitch e Kick | `premi-tempo` negli stati vivi |
| chat solo emote, messaggi unici, solo abbonati | Twitch | le modalità della chat (`modalita:<modo>`) |
| VIP a chi lo riscatta | Twitch | la tabella dei VIP e la sua ronda |

Una durata letta dal nome vale sempre «solo il tempo». Il bot non accende una
modalità della chat e non dà un VIP perché un nome lo fa pensare: lo propone
nel pannello, e lo fa solo se lo streamer lo sceglie. Un nome come «Togli il
VIP per un giorno» non deve dare un VIP a nessuno.

**Un posto solo per ogni tempo.** Il conto alla rovescia di un premio sta nella
sua riga; quello di una modalità della chat sta nella riga della modalità, che
ricorda anche quale premio l'ha accesa e chi; il VIP sta fra i VIP. Overlay,
pannello e `!tempi` leggono da lì, e nessuno tiene una copia che possa restare
indietro: se un mod spegne la chat in solo emote con `!soloemote off`, il conto
sull'overlay sparisce perché è sparita la riga che legge.

## Quando lo riscattano mentre il tempo corre

Lo streamer sceglie, premio per premio:

- **si somma** (di serie): chi riscatta paga altri `D`, e li ha tutti. La fine
  si sposta di `D`;
- **riparte da adesso**: la fine diventa `adesso + D`, se è più lontana di
  quella che c'è. È la regola delle modalità della chat.

Il tetto resta quello di ognuno: un'ora per le modalità della chat, 30 giorni
per il resto. Quello che la chat legge («mancano 18 minuti») è calcolato dalla
fine vera, non dalla somma chiesta.

**Un riscatto che non sposta la fine non compra niente.** «Riparte da adesso»
quando manca più tempo di quanto il premio ne dà, o una modalità della chat
già al tetto di un'ora: la fine resterebbe dov'è, e chi ha pagato non avrebbe
niente. Il riscatto si annulla come quando non si può fare, prima di toccare
la chat, e il nome di chi l'ha riscattato non entra fra quelli del premio.

Un VIP non si accorcia mai, non diventa a tempo se era per sempre o a dirette,
e un VIP dato a mano dallo streamer non si tocca: prima di darlo si chiede a
Twitch chi è già VIP, invece di fidarsi dei codici di errore, che Twitch non
documenta con chiarezza.

## Quando non si può fare

La chat è già in solo emote perché l'ha messa un mod, il VIP non si può dare (è
un mod, è già VIP, i posti sono finiti), Twitch non risponde: chi ha pagato non
deve perdere i punti per niente. Il riscatto si **annulla**, e su Twitch
annullare restituisce i punti. In chat si dice quale delle due: «ti ho
restituito i punti» solo se Twitch l'ha fatto davvero (un premio creato fuori
da SocialBot non si può annullare da qui, e lo streamer lo rimborsa dalla sua
coda). Prima si prova a fare la cosa, poi si fanno partire effetto e messaggio:
un «{user} ha acceso la chat in solo emote!» seguito da un rimborso sarebbe una
bugia.

Su Kick si può avere solo il tempo, che non può fallire.

## Cosa si dice in chat

Le frasi vengono dalla voce del canale (`frasario/premi.js`): la partenza, il
tempo che cresce, la fine, il rimborso, il «non si può», e le risposte di
`!tempi`. Si cambiano o si spengono nella carta «Le frasi del bot».

- Se il premio ha un **messaggio suo** (nella carta degli effetti sui punti
  canale), quello vince sulla frase di partenza, e può dire `{durata}`.
- Alla fine, per «solo il tempo», la frase di fine o quella scritta per quel
  premio; si può anche non dire niente. Per le modalità della chat la fine la
  dicono le modalità stesse («chat di nuovo libera»), che è l'informazione che
  serve. Un VIP che scade non si annuncia.

## Dove si vede

- **Overlay**: il pezzo «Premi a tempo» dello Studio, spento finché lo
  streamer non lo accende, una carta per tempo in corso, col nome del premio,
  chi l'ha riscattato, quanto manca e una barra che si svuota. Ci sono anche le
  modalità della chat accese a tempo da un mod: chi guarda vede lo stesso
  effetto e si chiede la stessa cosa. Il bot manda la fine, non il conto: il
  conto lo fa l'overlay ogni secondo, e l'ordine (prima quello che finisce
  prima) lo fa l'overlay da sé, qualunque sia l'ordine in cui l'elenco arriva.
  Una carta che finisce esce con un'animazione.
- **Pannello**: in Effetti, sottoscheda «Punti canale», la carta «Premi a
  tempo»: cosa corre adesso (con «Ferma») e ogni premio con la sua durata, da
  dove viene («dal nome»), e cosa dura. Quello che il nome fa pensare (solo
  emote, VIP) è proposto con «Fallo davvero», e vale solo dopo «Salva». La
  regola della durata è una sola, nel server (`tempiDeiPremi` usa
  `premi-tempo.js`): il pannello la legge, non la rifà. Una scelta uguale a
  quella di serie non si scrive. «Prova sull'overlay» fa partire il conto del
  premio solo in scena, con la durata che la riga mostra anche se non è
  salvata (`prova`): niente chat, nessuna modalità né VIP, nessun riscatto da
  chiudere, nessun evento dei Moduli alla fine. Un riscatto vero dello stesso
  premio prende il suo posto invece di sommarsi.
- **Chat**: `!tempi` dice cosa corre e quanto manca; un mod scrive
  `!tempi stop` per fermare tutto, o `!tempi stop <nome>` per uno solo.
- **Moduli**: l'evento «Finisce il tempo di un premio», con `$premio` e
  `$user`, per fare qualcosa alla fine (un suono, un messaggio, una scena).

## Riavvio

Le righe stanno negli stati vivi: all'avvio si ripuntano. Quello che è scaduto
mentre il bot era giù finisce subito; se è scaduto da più di un quarto d'ora
finisce in silenzio, perché annunciare una fine vecchia è rumore. Le sveglie
dormono al massimo un'ora per volta: un `setTimeout` più lungo di 24 giorni
scatta subito, e un premio può durarne 30.

## Le penitenze

Un premio che è una penitenza (vieta una parola, «di' solo») ha già il suo
conto e la sua carta sull'overlay: il tempo generico non parte, e la penitenza
dura quanto dice il premio, se lo dice, invece della durata della sua carta.

## Dove sta nel codice

| pezzo | dove |
|---|---|
| durata dal nome, regole, motore, elenco in corso | `src/features/premi-tempo.js` |
| la scelta per premio | `point_alerts.tempo` (`db.js`, `pointAlerts.impostaTempo`) |
| il VIP di un premio | `src/features/vip.js` (`vipPerPremio`) |
| le modalità della chat che ricordano il premio | `src/features/modalita-chat.js` |
| il riscatto | `src/bot.js` (`_riscatto`) |
| le frasi | `src/features/frasario/premi.js` |
| il pannello | `src/web/public/app.js` (carta «Premi a tempo», pezzo dello Studio) |
| l'overlay | `src/web/public/overlay-app.js` (`disegnaTempi`) |
| le rotte | `src/web/server.js` (`/api/streamer/premi/tempi`, `.../ferma`, `tempiDeiPremi`) |
| `!tempi` | `premi-tempo.js` (`tryComando`), nel registro come famiglia «Premi a tempo» |
| le prove | `test/unita/premi-tempo.test.mjs` (durate, regole, motore con orologio finto, modalità, VIP, `!tempi`, riavvio), `test/contratto/premi-tempo.test.mjs` (i fili), `scripts/verifica-premi-tempo.mjs` (overlay e pannello nel browser, con autoprova) |
