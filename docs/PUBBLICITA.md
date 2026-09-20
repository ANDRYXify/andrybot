# La pubblicità

Quando parte una pausa pubblicitaria la chat resta sola. Chi guarda non sa se
sei sparito o se è Twitch, e chi arriva in quel momento vede uno schermo che
non sei tu. Tre righe evidenziate cambiano la serata: «fra poco», «adesso»,
«sono tornato».

## Tre momenti, e solo uno è un evento

È il fatto che decide tutto il resto. Verificato su `dev.twitch.tv`:

| momento | da dove | cosa serve |
| --- | --- | --- |
| prima | `GET /helix/channels/ads` → `next_ad_at` | `channel:read:ads` |
| quando parte | EventSub `channel.ad_break.begin` v1 | `channel:read:ads` |
| quando finisce | **niente**: si contano i secondi | — |

Un evento di FINE non esiste. Non è una mancanza del nostro codice: Twitch
manda solo l'inizio, e insieme all'inizio dice quanto dura. Quindi il «sono
tornato» è un conto alla rovescia, e va trattato per quello che è.

Nessun permesso nuovo da chiedere: `channel:read:ads` e
`moderator:manage:announcements` li chiedevamo già.

## Le due conseguenze che non sono prudenza

**Se il bot si riavvia nel mezzo, il conto si perde.** Allora: o si dice
subito, o non si dice. «Sono tornato» dieci minuti dopo è peggio del silenzio,
perché è una bugia detta dal vivo davanti a chi ti sta guardando. Per questo
c'è una **tolleranza** (quanto ritardo si accetta), non un recupero. E per
questo lo stato della pausa sta in memoria e non su disco: sopravvivere a un
riavvio sarebbe il difetto, non la cura.

**Il preavviso sta vicino alla pausa.** Lo snooze di Twitch la sposta di cinque
minuti: un «fra poco pubblicità» dato dieci minuti prima verrebbe smentito, e
un annuncio in chat non si ritira. Il massimo che si può chiedere è proprio
cinque minuti — esattamente quanto sposta uno snooze — e di serie è un minuto.

## Una pausa si annuncia una volta sola

EventSub può consegnare due volte lo stesso messaggio. A distinguere due pause
è l'**istante d'inizio**, non il fatto di aver ricevuto qualcosa. Un evento
senza istante non si annuncia affatto: senza, non si saprebbe riconoscere il
doppione, e non si potrebbe promettere di non annunciarlo due volte.

Il preavviso ha la stessa regola con un'altra chiave: l'istante ANNUNCIATO
(`next_ad_at`). Due letture dello stesso programma non sono due pause.

## Il conto parte da adesso, non dall'istante dichiarato

Un evento che arriva in ritardo ha già consumato parte della pausa. Contare
dall'istante dichiarato farebbe aspettare due volte quel ritardo, e il «sono
tornato» arriverebbe a pubblicità finita da un pezzo.

## Non si telefona a Twitch per niente

Il programma si chiede solo a chi è **in onda** (`_liveState`, la fonte unica):
fuori diretta `next_ad_at` è vuoto per costruzione, e chiederlo sarebbe una
chiamata per una risposta che sappiamo già.

E non si richiede a ogni giro: saputo che la prossima pausa è fra quaranta
minuti, richiederlo ogni mezzo minuto vuol dire sessanta domande su una cosa
che non si muove. `vaGuardato` riapre la finestra quando ci si avvicina — larga
il doppio del preavviso, così uno snooze arrivato nel frattempo si vede in
tempo.

## Una casella vuota vuol dire «non dire niente»

Non «usa quello di serie». Chi svuota la casella sta spegnendo quel momento, e
riempirgliela col nostro testo sarebbe fare il contrario di quello che ha
chiesto. La levetta serve a tacere per una sera, la casella vuota a non usarlo
mai.

## Quello che non può funzionare si dice prima

Senza `channel:read:ads` il programma non si legge e Twitch rifiuta la
sottoscrizione; senza `moderator:manage:announcements` i messaggi non escono.
In tutti e due i casi non c'è nessun errore da nessuna parte: si accende la
levetta e non succede niente.

Per questo la carta guarda i due permessi e, se mancano, lo dice prima con il
posto dove concederli. È la stessa regola del calendario e dell'aspetto dei
ruoli: il rifiuto si anticipa, non si incassa a cose fatte.

## Le parole da sostituire

`{secondi}` → `90` · `{durata}` → `1:30` · `{canale}` → il nome del canale.

`{durata}` è in cifre e non a parole apposta: il testo lo scrive lo streamer,
nella lingua che vuole, e «un minuto e mezzo» dentro una frase in inglese
sarebbe una toppa.

## Dove sta nel codice

| pezzo | dove |
| --- | --- |
| il modello e gli invarianti | `src/features/pubblicita.js` |
| la sottoscrizione a Twitch | `src/twitch/events.js` |
| il giro e l'ascolto dell'evento | `src/bot.js` (`_giroPubblicita`, `_pubblicitaPartita`) |
| le porte | `src/web/server.js` (`/api/streamer/regia`, `/regia/pubblicita/messaggi`) |
| la carta nel pannello | `src/web/public/app.js` (`_pubDisegna`, `_pubLeggi`) |
| le prove | `test/unita/pubblicita.test.mjs`, `test/contratto/pubblicita.test.mjs` |

## Il pannello (il ragionamento, che nei file serviti non si può scrivere)

La carta sta nella scheda **regia**, sotto le azioni rapide dove il tasto
«Manda pubblicità» sta già. Una scheda nuova per tre caselle di testo sarebbe
un menù in più da cercare, cioè il contrario di quello che si sta facendo con
il riordino.

Spegnendo la levetta grande, tutto il resto sparisce invece di restare lì
spento: quello che non fa niente non deve occupare spazio.

I limiti (colori ammessi, minimo e massimo del preavviso, tetto della
tolleranza) arrivano dal server insieme alla configurazione. Scritti anche nel
pannello, un giorno direbbero due cose diverse.
