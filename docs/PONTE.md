# Il ponte — portare qui i comandi che hai già

> © 2024–2026 Andrea Taliento (ANDRYXify)

## Il problema

Il freno all'adozione non è il prezzo: è che uno streamer con quattrocento
comandi su Nightbot non li riscrive a mano. Finché non c'è un ponte, la riva
bella resta vuota. Prima di oggi il ponte non c'era affatto — gli altri bot
comparivano nel codice solo come domini in una allowlist e come «bot buoni»
nell'antibot.

## Perché si importa del TESTO, non da un servizio

Leggere dall'API di Nightbot o StreamElements vorrebbe dire chiedere allo
streamer un altro OAuth verso un servizio terzo, e restare legati a un'API che
possono cambiare o chiudere domani. Qui si accetta **qualunque testo che lo
streamer riesca a copiare**: l'export del suo bot, un CSV, o un elenco scritto
a mano. Un formato nuovo è un lettore nuovo, non un'integrazione nuova — e
funziona anche con bot mai visti.

Tre lettori, riconosciuti da soli:

| Formato | Esempio |
|---|---|
| JSON | `{"commands":[{"name":"!x","message":"…"}]}` (Nightbot), `[{"command":"x","reply":"…"}]` (StreamElements) |
| CSV | con o senza intestazione, virgolette rispettate |
| elenco | `!nome risposta`, `nome: risposta`, `nome -> risposta`, `nome \| risposta` |

## Perché le variabili si traducono davvero

Il dialetto dei Moduli è quasi uno a uno con quello di Nightbot, quindi quasi
tutto si traduce **per intero**, non per approssimazione:

| altrove | qui |
|---|---|
| `$(user)` `${user}` `$(sender)` | `$user` |
| `$(touser)` | `$touser` |
| `$(count)` | `$count(<nome del comando>)` |
| `$(query)` `${message}` | `$args` |
| `$(1)` `$(2)` | `$arg1` `$arg2` |
| `$(channel)` `$(game)` `$(title)` `$(uptime)` `$(viewers)` | `$canale` `$gioco` `$titolo` `$uptime` `$spettatori` |

Quello che resta fuori (`$(urlfetch)`, `$(customapi)`, `$(eval)`,
`$(twitch …)`) viene **dichiarato**, mai importato di nascosto — e dove qui si
può fare in un altro modo, l'anteprima dice quale: un `$(urlfetch)` diventa
un'azione «webhook» dei Moduli. Un comando che scrive «sei morto $(count)
volte» davanti a tutta la chat è peggio di un comando non importato.

## Due passi, mai uno

Prima l'**anteprima** — che non tocca niente e dice esattamente cosa
succederebbe: cosa entra, cosa sostituisce ciò che hai già, cosa è identico e
quindi si salta, cosa va rivisto e perché, cosa viene scartato e per quale
motivo, e quanti posti restano. Poi l'**applicazione**, solo di ciò che è stato
mostrato. Non si scrive mai niente che lo streamer non abbia visto prima.

I comandi importati diventano **Moduli** (trigger «comando» + azione
«messaggio»): è esattamente ciò che un comando di Nightbot è, e lo streamer li
ritrova dove cercherà, insieme agli altri.

## Un difetto trovato scrivendo le prove

La prima versione accettava uno spazio nudo come separatore: incollare una frase
qualunque **inventava comandi** («solo una frase senza struttura» diventava
`!solo`). Ora una riga è un comando solo se lo *dichiara* — la `!` attaccata al
nome, o un separatore esplicito.
