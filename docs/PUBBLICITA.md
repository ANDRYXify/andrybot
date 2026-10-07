<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
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

E una chiamata che non va non si ripete ogni mezzo minuto per sempre: dopo `n`
errori di fila si riprova dopo `GIRO_MS · 2^(n−1)`, mai oltre `RILETTURA_MS`
(vedi «Non so non vuol dire nessuna», più sotto). Un permesso tolto costa una
chiamata ogni cinque minuti, non centoventi l'ora.

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

## Il conto sull'overlay

Lo stesso programma serve a una seconda cosa: un elemento della scena che dice
a chi guarda quanto manca alla prossima pausa, e durante la pausa quanto manca
al ritorno. Il modello è lo stesso, le decisioni scendono da lì.

**I due usi non dipendono l'uno dall'altro.** Lo stato della pubblicità di un
canale si tiene se lo usa almeno uno dei due: gli annunci in chat o il conto
sull'overlay. La pausa che comincia (`pausaDa`) si registra in tutti e due i
casi, con la stessa fine (inizio + durata); le sveglie e le frasi solo se la
chat è accesa. Con la chat zitta il conto c'è lo stesso, e con l'overlay
spento a Twitch si chiede solo quello che serve alla chat.

**Il bot manda istanti, non secondi.** All'overlay arrivano due istanti:
`prossima` (la prossima pausa) e `pausaFino` (la fine di quella in corso). Il
conto lo fa l'overlay, ogni secondo, dal suo orologio. Mandare «mancano 270
secondi» vorrebbe dire un messaggio al secondo, o un numero fermo.

**Si manda solo quando cambia** (`_pubInScena`). Lo stato si scrive anche fra
gli stati vivi del canale (`statoVivo`, chiave `pubblicita`): un overlay che
si apre, o si ricarica, a pausa in corso lo trova nel tema, invece di
aspettare il giro dopo. Il tema scarta i tempi già passati: uno stato vecchio
vale come niente.

**Chi cambia lo stato, lo manda.** `_pubInScena` la chiamano tutti i posti
che toccano quello che l'overlay deve sapere: il giro, la pausa che comincia,
il preavviso che rilegge il programma, la fine della pausa. Guarda lei se il
conto è acceso in scena, e manda solo se il dato è cambiato: chiamarla una
volta di troppo non costa niente, una di meno vuol dire una scena in ritardo.
Era successo: il preavviso rileggeva il programma, trovava lo snooze, e la
scena lo sapeva solo al giro dopo.

**Cosa arriva, e basta** (`perOverlay`). Fuori diretta niente: Twitch non ne
programma, e un conto a canale spento sarebbe inventato. Durante la pausa la
sua fine, e la prossima no. Un istante già passato non si conta.

### Quello che il bot sa del programma, e quello che non sa

Lo stato di un canale tiene, del programma, tre cose:

| campo | vuol dire |
| --- | --- |
| `prossima` | la prossima pausa secondo l'**ultima lettura riuscita**; `0` vuol dire che Twitch ha risposto «nessuna» |
| `letto` | l'istante in cui è stata **chiesta** quella lettura; `0` vuol dire mai (o fuori diretta) |
| `falliti`, `fallitoA` | quante letture di fila sono andate male, e quando l'ultima |

**Non so non vuol dire nessuna.** Una lettura che non va (Twitch che non
risponde, un 503, un permesso tolto: `getAdSchedule` torna `null`) non tocca
né `prossima` né `letto`. Cambia solo il conto degli errori. Le condizioni che
avevano chiesto quella lettura restano quindi vere, e la lettura si rifà, al
giro dopo. Il conto in scena intanto continua verso l'ultima pausa che si
sapeva, che è la cosa più vera che abbiamo. Prima un errore scriveva
`prossima = 0` e `letto = adesso`: un intoppo di un attimo diventava
«nessuna pausa», il conto spariva dalla scena e per cinque minuti nessuno lo
richiedeva.

Se l'errore si ripete (un permesso tolto non guarisce da solo), si riprova
sempre più piano: dopo `n` errori di fila si aspetta `GIRO_MS · 2^(n−1)`, mai
oltre `RILETTURA_MS`, cioè 30 s, 1, 2, 4, 5, 5… minuti. L'attesa vale per tutte
e due le ragioni di leggere, chat e scena: la chiamata è una. La soglia sta a
metà giro (`attesa − GIRO_MS/2`): `setInterval` non è un metronomo, e un giro
che arriva un attimo prima del suo istante non deve slittare di un giro intero.
Una lettura riuscita azzera il conto. Fuori diretta si azzera tutto, e la
diretta dopo comincia con una lettura.

**Dopo una pausa il programma non si sa, finché Twitch non dice la prossima.**
Dalla fine della pausa (`finisceA`, oppure inizio + durata) si rilegge a ogni
giro, finché una lettura chiesta **dopo la fine** non porta una pausa ancora da
venire. Una lettura che fallisce, o che dice ancora `0`, non chiude niente.
Questo per `RILETTURA_MS` dalla fine; poi si torna al passo di sempre, perché
un canale che non ha più pause in programma non va richiesto ogni mezzo minuto
per tutta la sera. Prima la regola della fine leggeva **una volta sola**: se
quella lettura falliva, o arrivava prima che Twitch avesse messo in programma la
prossima, il conto restava sparito per cinque minuti dopo la pausa.

**Uno snooze si segue entro un giro.** `SNOOZE_MS` è quanto uno snooze sposta la
pausa: cinque minuti. Quando alla prossima pausa mancano al più
`SNOOZE_MS + 2·GIRO_MS` si legge a ogni giro, quindi uno snooze si vede entro un
giro. Dentro quei cinque minuti un conto lasciato indietro arriverebbe a zero
per una pausa che non c'è: è lì che la differenza si vede. Più in là, uno snooze
non ancora letto sposta un conto che ha ancora più di `SNOOZE_MS + 2·GIRO_MS`
davanti, e lo corregge al più tardi la prima lettura dentro la finestra. La
finestra si misura sulla pausa che si sapeva, quindi quella lettura c'è per
costruzione. I due giri di margine sono quelli del preavviso: in un intervallo
di due giri ne cadono due, quindi uno anche quando un giro tarda. Prima la
finestra era di due giri e basta: uno snooze premuto quattro minuti prima
restava invisibile per più di tre minuti, poi il conto saltava da 0:40 a 5:40.
È anche per questo che `PREAVVISO_MAX` è `SNOOZE_MS`: un numero solo.

**Uno stato per canale, e una lettura vecchia non scrive sopra una nuova.** Lo
stato di un canale nasce in un posto solo (`_statoPubblicita`), ed è in memoria
**prima** di qualunque attesa: il giro, la pausa che comincia e il preavviso
toccano lo stesso oggetto. Una lettura si applica (`dopoLettura`) solo se non è
cominciata una pausa mentre la si aspettava (`ultimaPausa` è quella di quando è
stata chiesta) e se non è più vecchia di quella che si ha (`letto`). Una lettura
partita prima della pausa racconta il programma di prima, e riscriverlo sopra la
pausa vorrebbe dire rimettere in scena una pausa già partita. Prima il primo
giro dopo un riavvio teneva un oggetto suo durante l'attesa, e alla fine lo
rimetteva in memoria. Una pausa cominciata in quel mezzo secondo spariva: il
conto del ritorno dalla scena, e il «sono tornato» dalla chat.

**Quando rileggere** (`vaGuardatoPerOverlay`), nell'ordine:

1. dopo un errore, finché non è passata l'attesa: no;
2. mai letto: sì;
3. ultima lettura più vecchia di `RILETTURA_MS`: sì;
4. dopo una pausa, finché non si sa la prossima (sopra): sì;
5. nessuna pausa in programma: no;
6. la pausa doveva essere già partita: sì;
7. alla pausa mancano al più `SNOOZE_MS + 2·GIRO_MS`: sì.

La chat (`vaGuardato`) ha le sue finestre (quelle del preavviso) ma la stessa
attesa dopo un errore e la stessa regola: non so non vuol dire nessuna. E fuori
diretta si dimentica anche quando si è letto: alla diretta dopo si rilegge al
primo giro.

**Dopo un riavvio** (`riprendi`). Il conto dei secondi della pausa è
volatile, e deve esserlo per la chat: salutare in ritardo è peggio che stare
zitti. Ma la fine di una pausa in corso è un fatto, sta fra gli stati vivi, e
l'overlay la sta già mostrando: senza riprenderla, il primo giro dopo il
riavvio scriverebbe «nessuna pausa» sopra quella in corso e il conto del
ritorno sparirebbe a metà. Si riprende solo quella; nessuna sveglia la punta,
quindi in chat non esce niente.

**Nella scena** il pezzo si chiama `pubblicita`: sta negli elenchi degli
elementi di tutte e due le parti (`ELEM_OVERLAY`, `ELEM_OVL`), si mette, si
sposta e si veste come il conto alla rovescia, e si salva in
`settings.overlayPubblicita` (`normPubblicita`). I titoli vuoti vogliono dire
quelli di base nella lingua della chat (`linguaChat`), e il pannello mostra
nell'anteprima quelli che l'overlay scriverà.

## Dove sta nel codice

| pezzo | dove |
| --- | --- |
| il modello e gli invarianti | `src/features/pubblicita.js` |
| la lettura del programma | `programmaDa`, chiamata da `src/twitch/helix.js` (`getAdSchedule`) |
| la sottoscrizione a Twitch | `src/twitch/events.js` |
| il giro, le sveglie e l'ascolto dell'evento | `src/bot.js` (`_giroPubblicita`, `_statoPubblicita`, `_leggiProgramma`, `_sveglia`, `_preavviso`, `_pubblicitaPartita`, `_sonoTornato`) |
| il conto sull'overlay | `src/bot.js` (`_pubInScena`), `src/features/alerts.js` (`_pubblicitaInScena`), `src/web/public/overlay-app.js` (`disegnaPubblicita`), `src/web/stile.js` (`normPubblicita`) |
| le porte | `src/web/server.js` (`/api/streamer/regia`, `/regia/pubblicita/messaggi`) |
| la carta nel pannello | `src/web/public/app.js` (`_pubDisegna`, `_pubLeggi`) |
| le prove | `test/unita/pubblicita.test.mjs`, `test/unita/pubblicita-sveglie.test.mjs` (orologio finto), `test/unita/pubblicita-overlay.test.mjs`, `test/unita/pubblicita-letture.test.mjs` (errori, dopo la pausa, snooze, letture vecchie: orologio finto), `test/contratto/pubblicita.test.mjs`, `test/contratto/pubblicita-scena.test.mjs`, `scripts/verifica-pubblicita-scena.mjs` (browser vero) |

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
