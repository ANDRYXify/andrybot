# Telegram: dove arrivano gli avvisi

I file del sito non hanno commenti: quello che spiegherebbero sta qui.

## Il difetto: una sola destinazione

Il modello vecchio aveva **un solo posto** dove notificare — una colonna `chat_id` nella tabella
`telegram`. Niente topic, niente canali oltre al gruppo, nessun modo di dire «le dirette qui, i post
Instagram là», e nessun modo di annunciare la diretta di un amico.

## Il modello nuovo

**`telegram_dest`** — le destinazioni. Ognuna e una coppia *chat + topic*:

| campo | cosa dice |
| --- | --- |
| `chat_id` | il gruppo o il canale |
| `thread_id` | il topic, se il gruppo e in modalita forum (vuoto = «Generale») |
| `eventi` | quali avvisi accetta, in CSV — **vuoto = tutti** |
| `streamer` | di chi li accetta, in CSV di login — **vuoto = tutti** |
| `pin` | fissa qui l'avviso della diretta? (per destinazione, non piu globale) |
| `msg_id` | l'ultimo avviso mandato **qui**, per chiuderlo qui a diretta finita |

**`telegram_amico`** — gli altri streamer di cui annunciare la diretta, con `ultima_live` per non
ripetersi.

**Chiave unica `(channel, chat_id, thread_id)`**: lo stesso gruppo puo comparire piu volte, una per
topic, e non si duplica mai.

## L'instradamento

`tgDest.perEvento(canale, evento, streamer)` restituisce le destinazioni che accettano
quell'evento **e** quello streamer. Gli eventi sono `live`, `tiktok`, `yt`, `ig`, `tt`.

**Vuoto = tutto.** E la regola che tiene in piedi la retro-compatibilita: il vecchio gruppo unico
diventa una destinazione senza filtri e continua a ricevere esattamente cio che riceveva prima.

Ha pero una conseguenza da guardare in faccia: se aggiungi un topic «instagram» e lasci il gruppo
generale senza filtri, **i post Instagram arrivano in due posti**. Non l'ho nascosto dietro una
regola di precedenza implicita, che sarebbe magia: l'ho reso **visibile**. Nel pannello c'e
«**Dove finisce cosa**», che per ogni evento elenca dove andra a finire davvero. Se un evento
finisce in due posti lo vedi prima che succeda; se non finisce da nessuna parte, pure.

## La migrazione

`tgDest.migra(canale, conf)` gira a ogni lettura ed e **idempotente**: se il canale non ha ancora
destinazioni ma aveva un gruppo collegato, quel gruppo diventa la prima destinazione, con il suo
`pin_live`. Chiamarla mille volte non crea mille righe. Nessun passaggio manuale, nessuno perde
niente.

## I topic

Le Bot API di Telegram **non hanno un modo per elencare i topic** di un gruppo forum. L'unica
strada onesta e guardare cosa e passato: `rilevaDestinazioni` legge `getUpdates` e raccoglie ogni
chat e ogni `message_thread_id` visto, prendendo il nome del topic da
`reply_to_message.forum_topic_created.name`. Percio la procedura e: scrivi un messaggio **dentro il
topic** che vuoi collegare, poi premi «Aggiungi». Un giro di rilevamento trova tutto insieme —
gruppi, canali e topic — invece di una destinazione sola come prima.

L'invio usa `message_thread_id`: senza, il messaggio finisce nel «Generale» anche se hai scelto un
topic.

## Il webhook vieta getUpdates — e va bene cosi

Se il bot e in modalita **interattiva**, Telegram ha un webhook attivo e rifiuta `getUpdates` con
`Conflict: can't use getUpdates method while webhook is active`. Spegnere il webhook per rilevare
sarebbe una toppa: il bot smetterebbe di rispondere proprio mentre lo stai configurando.

La strada giusta e l'opposta: **col webhook acceso ogni messaggio arriva gia a noi**, quindi i posti
li impariamo da li. Il gestore del webhook, come prima cosa e prima di ogni altro controllo, registra
in `telegram_visto` la coppia *chat + topic* di ogni messaggio che passa — anche di quelli senza
testo — insieme al nome del topic quando Telegram lo include. Poi «Aggiungi» unisce due fonti:
quello che il webhook ha visto e, **solo se il webhook e spento**, `getUpdates`.

**Serve un comando, non un messaggio qualsiasi.** Con la privacy del bot accesa (il default di
BotFather) un bot in gruppo riceve solo i comandi e le risposte dirette. Percio l'istruzione e:
scrivi `/collega` **dentro** il topic che vuoi collegare. Un messaggio normale potrebbe non
arrivargli mai, e resteresti a chiederti perche il topic non compare.

## Le dirette degli amici

Un amico non e un canale gestito dal bot, quindi **nessun evento arriva da solo**: c'e un giro ogni
2 minuti (`_giroAmiciTelegram`) che chiede a Twitch se sono live, con anti-doppioni sull'id della
diretta. Prima di accettare un amico si controlla che il canale **esista davvero** su Twitch: meglio
dirlo subito che restare in silenzio per sempre.

## Le dirette della community

Ogni streamer decide **per il proprio gruppo** se annunciare anche le dirette dei membri della
community. Acceso l'interruttore, la lista si allinea da sola: chi entra compare, chi esce sparisce,
e chi hai aggiunto **a mano** non viene mai toccato (li distingue la colonna `fonte`). Non aggiunge
mai te stesso.

**Chi conta come membro.** Non basta avere un account: chi si iscrive gratis e chi compra un piano
NON entra in questa lista. Il criterio sta in un posto solo, `streamers.membriCommunity(escludi)`,
e chiede tutte queste cose insieme:

| condizione | perche |
| --- | --- |
| `user_id <> ''` | registrato e riconosciuto su Twitch, non un nome scritto a mano |
| `status = 'approved'` | non in attesa, non disabilitato |
| `community = 1` | verificato dal pass di andryxify.it — lo mette solo `markCommunity()`, mai Stripe ne l'iscrizione gratuita |
| `manuale = 1` **oppure** `grazia_fino <= 0` | ancora confermato dal sito adesso; chi e in **periodo di grazia** e sparito dalla lista del sito, quindi non conta piu (gli account gestiti a mano li decide l'admin) |
| `login <> ` il tuo | non annunci te stesso |

Chi perde una di queste condizioni esce dalla lista al giro successivo (due minuti) senza che
nessuno debba fare niente; se rientra, ci ritorna allo stesso modo. Il predicato e **uno solo** ed e
usato da tutti e tre i posti che ne hanno bisogno (l'interruttore, il conteggio mostrato nella
scheda e il giro periodico del bot), cosi la regola non puo divergere.

Dove finiscono lo decide la **matrice**, come tutto il resto: sono streamer come gli altri, quindi
il filtro «di chi» di ogni destinazione vale anche per loro.

**Il punto delicato: fissare e togliere.** Con piu dirette annunciate insieme, un solo `msg_id` per
destinazione non basta — la fine della diretta di uno cancellerebbe l'avviso di un altro. Percio
c'e `telegram_msg`, con chiave `(canale, destinazione, streamer)`: ogni avviso ricorda il proprio
messaggio, e quando quella diretta finisce si toglie **solo il suo**. La fine si rileva nel giro dei
due minuti: se Twitch dice che non e piu live e avevamo annunciato, si chiude.

## Collaudo

Verificato su un database isolato, scenario per scenario: migrazione idempotente, gruppo + canale +
due topic insieme, instradamento per evento (`live` a tre posti, `ig` al solo topic dopo aver
ristretto il generale), amici fusi senza badare a maiuscole, filtro per streamer (il canale annuncia
solo l'amico e non me), spegnimento e rimozione, e **nessuna perdita fra canali diversi**.

Per la lista community, undici account costruiti apposta: membro confermato, membro gestito a mano,
iscritto gratis, cliente pagante, membro in grazia, disabilitato, in attesa, senza `user_id`, grazia
gia consumata, se stesso. Passano solo i confermati e quello a mano; togliendo la conferma a uno
esce da solo al giro dopo e rientra quando la riprende, mentre l'amico aggiunto a mano non viene
mai sfiorato.
