# La pubblicità

Quando parte una pausa pubblicitaria la chat resta sola. Chi guarda non sa se
sei sparito o se è Twitch, e chi arriva in quel momento vede uno schermo che
non sei tu. Tre righe evidenziate cambiano la serata: «fra poco», «adesso»,
«sono tornato».

## Tre momenti, e solo uno è un evento

È il fatto che decide tutto il resto. Verificato su `dev.twitch.tv`:

| momento | da dove | cosa serve |
| --- | --- | --- |
| prima | `GET /helix/channels/ads` → `next_ad_at`, `duration` | `channel:read:ads` |
| quando parte | EventSub `channel.ad_break.begin` v1 → `started_at`, `duration_seconds` | `channel:read:ads` |
| quando finisce | **niente**: si contano i secondi | — |

Un evento di FINE non esiste. Non è una mancanza del nostro codice: Twitch
manda solo l'inizio, e insieme all'inizio dice quanto dura. Quindi il «sono
tornato» è un conto alla rovescia, e va trattato per quello che è.

Nessun permesso nuovo da chiedere: `channel:read:ads` e
`moderator:manage:announcements` li chiedevamo già.

## Il programma com'è fatto davvero, non come lo descrivono i documenti

I documenti di `GET /helix/channels/ads` dicono che `next_ad_at` e `last_ad_at`
sono date RFC3339, vuote quando non c'è niente. Twitch invece manda **secondi
Unix interi**, e `0` quando non c'è niente. Lo staff l'ha confermato sul forum
degli sviluppatori («documentation is incorrect»), e non lo cambierà perché
l'endpoint è in uso da tutti. Le librerie mantenute fanno lo stesso: leggono
`next_ad_at * 1000`.

Leggere quel numero come una data dà `NaN`. Per questo c'era un solo modo di
scoprirlo: non a occhio, ma provando col payload vero.

**Lo legge un posto solo**: `programmaDa` in `src/features/pubblicita.js`, che
capisce le due forme (secondi e RFC3339) e restituisce `{prossima, durata,
ultima, snooze}`, con gli istanti in millisecondi. Fuori da lì nessuno tocca
`next_ad_at`: helix, bot e pannello ricevono solo millisecondi. Prima erano tre
letture diverse dello stesso campo, e due erano sbagliate.

Dall'evento di partenza vale la stessa cautela: `duration_seconds` nel payload
vero è un numero, nell'esempio dei documenti una stringa, e si leggono tutte e
due. L'istante di partenza si legge anche quando si chiama `timestamp`: c'è chi
l'ha ricevuto così, e le librerie tengono i due nomi.

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

## La pausa finisce a inizio + durata

La fine è `inizio + durata`, qualunque sia il momento in cui l'evento arriva.
Un evento arrivato con venti secondi di ritardo ha già consumato venti secondi
di pausa: contare da quando arriva sposterebbe il «sono tornato» di tutto quel
ritardo. L'inizio è quello dichiarato da Twitch, ma mai dopo il momento in cui
l'evento arriva: se l'orologio di Twitch è avanti rispetto al nostro, la pausa
non può essere cominciata dopo che ce l'hanno detto.

Se l'evento arriva a pausa già finita, «pubblicità per 90 secondi» non si dice,
perché sarebbe falso. Il ritorno invece è vero, e segue la tolleranza.

## Le frasi cadono a un istante: sveglie, non giri

Il preavviso va detto a `quanto` secondi dalla pausa, e il ritorno alla fine.
Sono due **istanti**, e a un istante si arriva con una sveglia (`setTimeout`),
non con un giro che passa ogni mezzo minuto: dal giro, il ritorno arrivava fra
zero e trenta secondi dopo la fine, e una pausa da trenta secondi in chat
sembrava durarne sessanta.

Il giro (`GIRO_MS`) serve solo a **leggere il programma**. La finestra in cui
leggerlo si ricava dal passo del giro. L'istante del preavviso è
`W = prossima − quanto`, e la sveglia va puntata prima di `W`. In
`[W − 2·GIRO_MS, W)` cadono due giri, quindi almeno uno anche quando un giro
tarda. A quel giro alla pausa mancano al più `quanto + 2·GIRO_MS`: è questa la
finestra, non un multiplo del preavviso scelto a occhio. La prova simula il
giro per ogni preavviso, ogni fase e un giro in ritardo, e la sveglia deve
cadere esattamente su `W`.

Alla sveglia il programma **si rilegge**. Il preavviso si dice solo se la pausa
è ancora dentro `quanto`, e questa è la conferma: uno snooze la sposta cinque
minuti più in là, e allora ne mancano `quanto` più cinque minuti. È fuori dalla
finestra per qualunque preavviso.

Una sveglia per canale e per frase: puntarne una nuova toglie la vecchia. Una
pausa nuova sostituisce così il ritorno di quella prima, sia che finisca prima
sia che finisca dopo. E una sveglia che suona in anticipo (l'orologio rimesso
indietro) non consuma il ritorno.

## Non si telefona a Twitch per niente

Il programma si chiede solo a chi è **in onda** (`_liveState`, la fonte unica):
fuori diretta `next_ad_at` è vuoto per costruzione, e chiederlo sarebbe una
chiamata per una risposta che sappiamo già.

E non si richiede a ogni giro: saputo che la prossima pausa è fra quaranta
minuti, richiederlo ogni mezzo minuto vuol dire ottanta domande su una cosa che
non si muove. `vaGuardato` riapre la finestra quando ci si avvicina (vedi sopra),
e comunque ogni cinque minuti (`RILETTURA_MS`): il programma può cambiare senza
nessun evento, se lo streamer tocca le impostazioni della pubblicità a diretta
accesa.

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

`{secondi}` e `{durata}` vogliono dire **una cosa sola in tutti e tre i
momenti: quanto dura la pausa**. Prima la dice il programma (`duration`),
durante e dopo l'evento di partenza (`duration_seconds`, tenuto nello stato
della pausa). Prima volevano dire «quanto manca» nel preavviso e «0» nel
ritorno: la stessa parola, tre significati.

Una durata fuori da 1–300 secondi non è una durata: non si taglia a 300, si
tratta come sconosciuta. Tagliarla vorrebbe dire annunciare in chat un numero
che Twitch non ha mai detto. E se la durata non si sa, una frase che la chiede
**non esce**: meglio zitti che un numero inventato. Senza durata non c'è
neanche una fine da contare, quindi niente ritorno. Il pannello lo dice in una
riga sola, sotto i tre momenti.

`{durata}` è in cifre e non a parole apposta: il testo lo scrive lo streamer,
nella lingua che vuole, e «un minuto e mezzo» dentro una frase in inglese
sarebbe una toppa.

## Dove sta nel codice

| pezzo | dove |
| --- | --- |
| il modello e gli invarianti | `src/features/pubblicita.js` |
| la lettura del programma | `programmaDa`, chiamata da `src/twitch/helix.js` (`getAdSchedule`) |
| la sottoscrizione a Twitch | `src/twitch/events.js` |
| il giro, le sveglie e l'ascolto dell'evento | `src/bot.js` (`_giroPubblicita`, `_sveglia`, `_preavviso`, `_pubblicitaPartita`, `_sonoTornato`) |
| le porte | `src/web/server.js` (`/api/streamer/regia`, `/regia/pubblicita/messaggi`) |
| la carta nel pannello | `src/web/public/app.js` (`_pubDisegna`, `_pubLeggi`) |
| le prove | `test/unita/pubblicita.test.mjs`, `test/unita/pubblicita-sveglie.test.mjs` (orologio finto), `test/contratto/pubblicita.test.mjs` |

## Il pannello (il ragionamento, che nei file serviti non si può scrivere)

La carta sta nella scheda **regia**, sotto le azioni rapide dove il tasto
«Manda pubblicità» sta già. Una scheda nuova per tre caselle di testo sarebbe
un menù in più da cercare, cioè il contrario di quello che si sta facendo con
il riordino.

Spegnendo la levetta grande, tutto il resto sparisce invece di restare lì
spento: quello che non fa niente non deve occupare spazio.

Nello stato della diretta, «Prossima pubblicità» conta alla rovescia insieme
al tempo in onda (prima restava fermo al caricamento), e accanto c'è quanto
durerà. Finito il conto, le due voci spariscono: la pausa è partita, e il
programma nuovo si vede ricaricando.

I limiti (colori ammessi, minimo e massimo del preavviso, tetto della
tolleranza) arrivano dal server insieme alla configurazione. Scritti anche nel
pannello, un giorno direbbero due cose diverse.
