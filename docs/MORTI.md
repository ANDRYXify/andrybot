<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# CONTATORify — i numeri che salgono da soli

Sta nei **Comandi**, accanto ai contatori che muove: la cosa che fa salire un
contatore da sola non ha motivo di stare in un'altra stanza. Si chiama
CONTATORify, ma si identifica `morti` come le rotte del server — il cancello
delle sezioni pesa ogni area contando le porte che le appartengono e le riconosce
dal nome, e con un identificativo diverso la peserebbe zero proprio mentre cresce.

E una cosa che conviene sapere subito: **il meccanismo non sa cosa conta.** Il
contatore da far salire lo scegli tu, quindi insegnandogli la schermata di
vittoria hai `!vittorie` e quella del boss abbattuto ti da' `!boss`. Qui sotto si
parla di morti perche' e' il caso per cui nasce, non perche' sia l'unico.

## Le morti contate da sole

Il contatore `!morti` esiste da sempre, e da sempre qualcuno lo deve far salire:
lo streamer che scrive in chat mentre sta morendo, o un mod che guarda. Chi
gioca non ha le mani libere, e il numero resta indietro.

Questa pagina spiega come lo facciamo salire da solo, e — cosa piu' importante —
**perche' e' costruito cosi'** e non in un altro modo.

## L'idea, in una riga

La schermata di morte di un gioco non cambia mai. E' un'immagine fissa: le stesse
scritte, gli stessi colori, nello stesso posto. Se il computer la riconosce, sa
che sei morto senza sapere niente del gioco.

## Cosa fanno gli altri

Prima di scrivere una riga abbiamo guardato come risolvono il problema gli
strumenti che esistono:

- **Contatori a tasto** (gli script Lua e Python che girano dentro OBS): un tasto
  della tastiera fa +1. Funziona sempre e non sbaglia mai, ma sei tu a premerlo:
  non e' automatico, e' solo comodo.
- **Contatori che leggono le scritte** (per esempio il DeathCounter di Jan-9C):
  prendono l'immagine e ci passano sopra un riconoscitore di testo (Tesseract),
  cercando la parola «YOU DIED». Sono automatici, ma vanno configurati per ogni
  gioco e per ogni lingua, e si portano dietro un motore OCR intero.
- **Contatori di un gioco solo** (per esempio quelli per Elden Ring): leggono il
  salvataggio o la memoria di quel gioco. Esattissimi, e inutili col gioco dopo.
- **I dati che il gioco stesso pubblica** (Game State Integration): Counter-Strike
  lo fa ufficialmente, Dota 2 di fatto. Il gioco manda lui un messaggio a un
  indirizzo che gli dai tu, e dentro c'e' il numero delle morti. Quando c'e', e'
  la strada giusta: non si indovina niente, e' il gioco che lo dice.

La conclusione: **non esiste una libreria che riconosca «una morte» in un gioco
qualsiasi**, perche' non esiste la cosa. Esistono strade diverse, e servono
tutte: una generale per tutti i giochi (la schermata), e quelle esatte per i
giochi dove qualcuno il numero lo tiene davvero. La pagina parte dalla prima.

### Le fonti vere, gioco per gioco (ricerca del 30 settembre 2026)

| Gioco | Chi tiene il numero | Come arriva a noi |
| --- | --- | --- |
| Counter-Strike 2, Dota 2 | il gioco, con la Game State Integration di Valve | il gioco lo manda al server (seconda strada) |
| Dark Souls (Prepare to Die, Remastered, II, Scholar of the First Sin, III), Sekiro, Elden Ring offline | il gioco, nella sua memoria | DSDeaths (github.com/Quidrex/DSDeaths) lo legge e lo scrive in `DSDeaths.txt`; il pannello legge quel file (terza strada) |
| Minecraft Java | le frasi di morte nel registro del gioco (`logs/latest.log`) | il pannello legge il registro con le frasi del gioco stesso, nella sua lingua (terza strada, piu' sotto) |
| League of Legends | la Live Client Data API, su `127.0.0.1:2999` | non si fa: la porta ha un certificato di Riot che una pagina web non accetta senza installarlo a mano |
| Uncharted, e i giochi che sfumano al nero | nessuno: niente numero, e uno schermo nero combacia con tutto | il tasto di CONSOLify |
| Tutti gli altri con una schermata fissa | nessuno | la schermata riconosciuta (prima strada) |

Leggere la memoria dei giochi da noi voleva dire far installare un programma, e
con Elden Ring l'anticheat lo blocca comunque. DSDeaths lo fa gia', e da anni:
noi leggiamo il suo file.

## L'impronta, e perche' non e' uno screenshot

Confrontare due immagini pixel per pixel non funziona: la compressione, il
bitrate e la scala cambiano i pixel ogni volta. Serve un confronto che guardi la
**forma** e non i dettagli.

Prendiamo l'immagine, la rimpiccioliamo a 9x8, la facciamo grigia e per ogni
pixel scriviamo un bit solo: **e' piu' chiaro di quello alla sua destra?** Otto
righe da otto confronti fanno 64 bit, sedici cifre esadecimali. Due immagini
della stessa scena danno impronte quasi identiche anche se i pixel sono diversi;
due scene diverse danno impronte lontane. La distanza e' il numero di bit che non
coincidono, e sotto una soglia (otto su sessantaquattro, di suo) diciamo che e'
la stessa scena.

Da un'impronta **non si torna indietro all'immagine**: 64 bit non bastano a
ricostruire niente. E' per questo che le impronte insegnate possono stare nel
database senza che nel database ci sia un pezzo del tuo schermo.

## Dove gira, e cosa esce dal computer

Lo screenshot lo chiede **il pannello aperto sul computer della regia**, al
programma con cui mandi in onda, sul ponte che usa gia' CONSOLify. L'immagine
non lascia quel computer: viene rimpicciolita a 9x8, ridotta a sedici cifre e
buttata. Al server arriva una cosa sola: *fai +1 a quel contatore*.

Non e' una scelta di comodo, e' il motivo per cui la funzione puo' esistere: un
sistema che manda al server la tua schermata di gioco ogni due secondi sarebbe un
sistema che ti guarda giocare.

## Perche' non conta due volte

Una schermata di morte resta a schermo qualche secondo, e noi guardiamo ogni due:
la vedremmo tre o quattro volte. Quindi non conta il *vedere*, conta l'**entrare**:
il contatore sale solo nel momento in cui la scena passa da «non c'e'» a «c'e'».
Finche' resta, non succede altro.

E siccome una schermata puo' tremolare — un fotogramma dell'immagine di prima, uno
di quella dopo — c'e' un tempo di riarmo: dopo una morte contata, per qualche
secondo non se ne contano altre. Se davvero muori due volte in quattro secondi,
la seconda si perde: e' il prezzo giusto da pagare per non contarne otto quando
ne e' successa una.

## Una schermata, piu' impronte

Una schermata di morte quasi mai e' un fotogramma solo: entra in dissolvenza, e
in certi giochi lo sfondo dietro cambia mentre le scritte restano. Per questo una
schermata insegnata tiene **piu' impronte**, non una, e vale se ne combacia
almeno una.

Non e' un dettaglio di comodo: e' la forma che rende possibile *migliorarla*.
Quando una schermata non viene presa, quasi sempre la cosa giusta non e' rifarla
da capo — e' aggiungerle l'impronta che le mancava.

## Chi decide cosa

- **L'impronta e il riconoscimento** stanno in `src/web/public/morti.js`, nel
  browser. Sono regole pure: `impronta`, `distanza`, `vicina`, `guarda`. Non
  parlano con nessuno e si possono provare da fuori. `vicina` guarda TUTTE le
  impronte di TUTTE le schermate e riporta la piu' vicina in assoluto: cosi' non
  c'e' un ordine che decide al posto della somiglianza.
- **Cosa si puo' salvare** sta in `src/features/morti.js`, sul server. Una
  schermata senza nemmeno un'impronta di sedici cifre esadecimali, o senza un
  contatore da far salire, non e' una schermata: non entra. Il massimo e' otto
  schermate da dodici impronte, e i doppioni non entrano due volte.
- **L'effetto** e' l'azione di consolle che esisteva gia': far salire un
  contatore. Non c'e' una seconda strada per muovere quel numero.

## Cosa succede se qualcosa non c'e'

- Il programma della diretta non e' collegato: non guardiamo niente, e il
  pannello lo dice invece di far finta.
- Non sei in onda: riconosciamo la scena ma non contiamo. Le prove e le partite
  fuori diretta non sporcano il numero della serata.
- Non hai insegnato nessuna schermata: il giro non parte proprio.

## Come si insegna

Muori, e **mentre la schermata e' a schermo** premi il tasto. Il pannello prende
l'impronta, controlla di non conoscerla gia', ti chiede come chiamarla e la
salva insieme al contatore che deve far salire. Una per gioco: quando ne combacia
una, vince quella, cosi' non devi dire tu a cosa stai giocando.

## La seconda strada: i giochi che lo dicono da soli

Qualche gioco pubblica il proprio stato. Gli metti un file di configurazione
nella sua cartella e da li' in poi e' LUI a mandare un messaggio a un indirizzo
che gli hai dato, con dentro anche quante volte sei morto. Counter-Strike lo fa
ufficialmente — si chiama Game State Integration — e Dota 2 di fatto.

Dove c'e', e' la strada giusta: non si riconosce niente e non si indovina niente.
E non serve nemmeno il pannello aperto, perche' a parlare col nostro server e' il
gioco: su quel computer puo' esserci solo il gioco e il programma della diretta.

### Le due cose che non possono esistere

**Non si contano le morti di un altro.** Quando guardi una partita da spettatore
o riguardi un replay, il giocatore dentro al messaggio non sei tu: e' quello
inquadrato. Il numero si legge solo quando il giocatore del messaggio e' quello
seduto a quel computer, che il gioco dichiara a parte. Non e' un controllo
aggiunto dopo: senza quella prova il numero non si legge affatto.

**Il numero e' un totale, non un evento.** Il gioco non dice «sei morto»: dice
«finora sei morto tre volte», e a ogni partita nuova riparte da zero. Percio' si
conta il salto in su, e ogni altra cosa — sceso, partita cambiata, salto
impossibile in mezzo secondo — ribasa senza contare. Un ribaseline che sbaglia
perde una morte; un ribaseline che manca ne conta trenta in un colpo solo.

E alla prima lettura non si conta mai: non si sa da dove si veniva, e le morti
gia' fatte nella partita in corso non sono successe adesso. E' per questo che
quello che si ricorda sta nel DATABASE e non in memoria — in memoria, il primo
messaggio dopo un riavvio del bot troverebbe un ricordo vuoto.

### La chiave

E' una chiave a parte da quella della consolle, e non per ordine: questa finisce
scritta in chiaro dentro un file, in una cartella che si condivide fra mod, guide
e pacchetti di configurazione che girano in rete. Una chiave che sta li' non puo'
essere la stessa che accende gli effetti, cambia scena e muove ogni contatore.
Questa fa una cosa sola: portare un numero. Chi la ruba fa salire un contatore, e
basta — e la rifai con un tasto.

Per lo stesso motivo un canale che non esiste e una chiave sbagliata ricevono la
STESSA risposta: quell'indirizzo sta scritto in un file che si puo' leggere, e non
deve raccontare a chi lo trova se quel canale esista.

Il corpo del messaggio non si scrive da nessuna parte, nemmeno negli errori:
dentro c'e' l'identificativo del suo account di gioco, e non e' roba nostra.

### Il cancello davanti

Il gioco non ha una sessione, e davanti a ogni rotta del sito c'e' il cancello che
a chi non e' entrato risponde 404. Per un periodo `/api/gsi/` non stava fra le
porte aperte: la rotta c'era e la chiave funzionava, ma nessun messaggio ci
arrivava. Adesso sta in `src/web/vetrina.js`, e `scripts/verifica-porte.mjs`
pretende che ogni porta a chiave sia aperta nel cancello (docs/PORTE-DEL-SERVER.md).
L'argine del traffico la tratta in tempo reale, come il tracking: il tetto che
conta e' quello del gioco, 400 al minuto, e quello generale gli sta sopra.

## La libreria: il sapere su un gioco messo in comune

La schermata di morte di Dark Souls e' la stessa sul computer di chi la insegna e
su quello di chiunque altro. Quel sapere non ha motivo di restare in casa di uno:
il primo che insegna un gioco lo puo' insegnare a tutti.

Una SCHEDA e' **gioco + lingua**, piu' le impronte che lo riconoscono. Non il gioco
da solo, perche' «YOU DIED» e «SEI MORTO» sono pixel diversi e una scheda inglese
su un gioco italiano fallirebbe MUTA — il peggiore dei modi di fallire, perche'
chi la usa non capisce perche'.

Il nome del gioco non lo scrive lui: e' la categoria che ha su Twitch in quel
momento, cosi' viene scritto uguale da tutti. E la casella «mettila in comune» e'
segnata di suo: chi streama un gioco non ancora uscito la toglie e la tiene sua.

### Perche' un'impronta vale su ogni monitor

Se si chiedesse lo scatto a una misura fissa, il programma della diretta ci
schiaccerebbe dentro qualunque sorgente: un 21:9 diventerebbe un'altra immagine.
Cosi' la proporzione sarebbe entrata nell'identita' della scheda e la libreria si
sarebbe spezzata in tre.

Invece si prende lo scatto com'e' e si tiene il **16:9 centrale**. Il centro e' dove
ogni gioco mette le scritte di morte; i lati che si perdono in 21:9 sono i lati, e
in 4:3 si perdono il cielo e il pavimento.

### Come si migliora senza rompere nessuno

Una scheda non si sovrascrive mai — e non perche' qualcuno se ne ricordi: nel
deposito **non esiste** la scrittura che cambierebbe le firme di una riga gia'
pubblicata. Chi migliora ne scrive una VERSIONE, che dichiara da quale viene;
tutte le versioni della stessa cosa condividono una RADICE.

Quando una schermata non viene presa c'e' un tasto — «non l'ha presa adesso» — che
prende l'impronta di questo istante, la aggiunge alle tue e ti chiede se
pubblicarla per tutti. Quasi sempre migliorare vuol dire AGGIUNGERE l'immagine che
mancava: una dissolvenza, uno sfondo diverso. Non rifare.

E chi ha gia' quella che gli funziona non viene aggiornato da solo: gli si dice
che ce n'e' una nuova e quante impronte ha in piu'. Se la prende, le sue restano e
quelle nuove si aggiungono.

### Le reti, che non sono guardie

**La piu' importante e' una copia, non un controllo.** Quando prendi una scheda, le
sue impronte finiscono nelle tue impostazioni. Da li' in poi la tua diretta non
dipende dalla libreria in nessun momento: se la libreria cade, o quella scheda
sparisce, o qualcuno ci mette dentro una versione peggiore, tu continui a contare
esattamente come stasera.

**Un'impronta piatta non si pubblica.** Uno schermo nero da' 64 bit quasi tutti
uguali e combacia con mezzo mondo: chi lo pubblicasse farebbe contare morti a caso
a chiunque lo prenda. Si guarda quanti bit sono a uno, e fuori da una finestra
centrale la scheda non entra. Non serve accorgersene: non si puo' fare.

E poi le cose ovvie: niente si applica da solo, l'autore resta scritto, c'e' un
tetto a quante schede uno pubblica e quante al giorno, e il proprietario puo'
togliere qualunque scheda.

### La distanza esiste in due posti, e devono dire la stessa cosa

Riconoscere mentre giochi succede nel browser, e li' non puo' passare dal server.
Cercare in libreria succede sul server, perche' mandare l'intera libreria al
browser sarebbe peggio. Due copie della stessa regola sono un posto in cui
divergere, quindi c'e' una prova che fa passare le stesse coppie da tutte e due e
pretende lo stesso numero: se una cambiasse e l'altra no, prenderesti dalla
libreria schede che poi non ti prendono niente.

## La terza strada: il conto scritto in un file

DSDeaths legge le morti dalla memoria dei souls e a ogni morte le scrive in
`DSDeaths.txt`, un numero e basta. Il pannello aperto sul computer della regia
legge quel file (Chrome ed Edge lo permettono, con la File System Access API) e
manda al server il **numero**: il file resta dov'e'. Va bene qualunque programma
che scriva un conto in un file di testo, purche' dentro ci sia **un numero
solo**: con due («DS3: 37») non si sa quale sia il conto, e non si tira a
indovinare.

La regola e' quella della seconda strada, e sta nello stesso posto
(`gsi.salto`): il numero e' un totale, conta il salto in su, e ogni altra cosa
ribasa. Un numero che scende e' un altro personaggio caricato; un salto di piu'
di cinque in due secondi pure. Fuori diretta si legge e non si conta, e il
ricordo va avanti comunque, se no la prima lettura in diretta conterebbe le
morti del pomeriggio.

**La prima lettura di chi guarda non conta mai.** Il pannello, ogni volta che
comincia a guardare (pagina aperta, file scelto, permesso ridato), si da' un
GIRO nuovo, e il giro fa parte della partita. Cosi' il numero che trova non si
confronta con quello di ieri: le morti fatte a pannello chiuso non sono
successe adesso. Il prezzo e' quello di sempre: una morte fatta nei secondi di
una pagina ricaricata si perde, e nessuna si conta due volte. Il ricordo sta fra
gli stati vivi (`morti:file`), a parte da quello dei giochi: un gioco che parla e
un file letto non si ribasano a vicenda.

Il file si sceglie una volta: la maniglia resta nel browser (IndexedDB), e al
ritorno il pannello chiede al browser se il permesso c'e' ancora. Se c'e',
riparte da solo; se no mostra «Riprendi», perche' il permesso il browser lo
ridà solo a un gesto.

## Il battito: guardare anche da dietro al gioco

Il pannello sul computer della regia sta quasi sempre dietro al gioco, e una
scheda nascosta Chrome la rallenta: dopo cinque minuti i timer della pagina
partono una volta al minuto. Misurato (`scripts/verifica-battito.mjs`, col tempo
di grazia accorciato): un giro ogni secondo diventava zero giri in venti
secondi, anche con la regia collegata. Col microfono aperto no, ed e' per questo
che l'ascolto vocale non ne soffriva. Una schermata di morte resta a schermo tre
secondi: guardando una volta al minuto, le morti si perdevano quasi tutte.

I timer di un worker invece non si toccano, e i suoi messaggi arrivano alla
pagina anche nascosta. Percio' i giri delle morti (la schermata e il file)
battono con `SB_MORTI.ogni`, che tiene il tempo in `battito.js`, e non con un
timer della pagina. Il cancello rifa' la misura a ogni collaudo, e ha dentro il
suo controllo: se nel banco il timer della pagina non rallenta, la misura non
vale e il cancello e' rosso.

## Una scheda sola

Con due schede del pannello aperte, ognuna avrebbe guardato per conto suo. Per
la schermata vuol dire ogni morte contata due volte; per il file, peggio, nessuna
contata mai, perche' ogni scheda col suo giro ribasa quella dell'altra.

Quindi a guardare e' una scheda sola: `SB_MORTI.dasolo` prende una serratura del
browser (Web Locks), una per la schermata e una per il file. Le altre aspettano,
e il pannello lo dice («Sta gia' guardando un'altra scheda del pannello: se la
chiudi, continuo io.»). Se quella si chiude, o smette, subentra la prossima,
con un giro nuovo. La serratura vale dentro un browser: due browser diversi
sullo stesso computer restano due, ed e' un caso che non copriamo.

## Minecraft Java

Minecraft scrive ogni messaggio di chat nel suo registro, `logs/latest.log`:
`[Render thread/INFO]: [System] [CHAT] <messaggio>` dal 1.19, `[CHAT] <messaggio>`
prima. Le frasi di morte sono quelle del gioco, nella lingua scelta in
`options.txt` (`lang:it_it`): l'inglese sta dentro il jar della versione, le altre
fra gli asset (`assets/indexes/*.json` porta a `assets/objects/xx/<hash>`). Il
codice sta in `src/web/public/morti-minecraft.js`, che il pannello carica solo
per chi sceglie la cartella di Minecraft.

**Le frasi si leggono dai file di chi gioca, e non le teniamo noi.** Sono di
Mojang. Il jar pesa quaranta mega: si legge solo la sua coda, si trova la voce
`assets/minecraft/lang/en_us.json` nell'indice dello zip e si scompatta quella
sola (anche nello zip grande, ZIP64). Si prendono le versioni installate piu'
recenti, e l'unione delle loro frasi: una frase vecchia non collide con niente.
Quando `options.txt` cambia (si e' cambiata lingua nel gioco) le frasi si rifanno.

**Una frase diventa un'espressione che trova la vittima ovunque sia.** Nella 26.3
le frasi di morte sono 106 per lingua, e in italiano 94 su 106 non cominciano
con la vittima (`%2$s ha trafitto %1$s`): cercare il nome in testa alla riga
sarebbe sbagliato in partenza. `%1$s` diventa il gruppo della vittima, gli altri
segnaposti diventano «qualunque cosa», il resto si confronta lettera per lettera
dall'inizio alla fine della riga. Due frasi non hanno la vittima (il messaggio
troppo lungo, il link di «Intentional Game Design»): non contano mai.

**Conta solo la vittima, e solo se sei tu.** Chi sei lo dice la riga
`Setting user: <nome>` che il gioco scrive all'avvio, in testa al registro; senza,
non si conta (su un server arrivano le morti di tutti). Davanti al nome sono
ammesse solo etichette fra quadre, «[VIP] Steve». Provato sulle frasi vere di
inglese, italiano e spagnolo: 104 su 104 prese in ogni lingua, e nessuna contata
a chi uccide. La prima versione ammetteva un nome in coda preceduto da uno
spazio, e sulle frasi italiane contava 21 morti a chi uccideva: in «Un'incudine ha
spiaccicato Alex mentre lottava con Steve» la frase corta «Un'incudine ha
spiaccicato %1$s» prende come vittima «Alex mentre lottava con Steve». La regola
giusta e' piu' stretta, non una toppa.

**La chat dei giocatori non e' il gioco.** Una riga `[System] [CHAT]` e' un
messaggio del gioco; una `[Not Secure]`, o un messaggio che comincia con
`<nome> `, e' qualcuno che scrive. Senza questa regola chi scrive in chat
«Steve was slain by Zombie» farebbe contare una morte.

**Si legge da dove si era rimasti.** La prima volta si parte dalla fine esatta
del file, e se l'ultima riga e' a meta' la si butta: quello che c'era prima di
cominciare a guardare e' gia' successo. Si leggono solo righe intere; una riga a
meta' aspetta il giro dopo. Un registro nuovo (il gioco e' ripartito) si
riconosce dalla prima riga, che ha l'ora dell'avvio, o dal file piu' corto, e si
legge da capo, perche' e' tutto nuovo: anche le morti scritte prima del punto
dove era arrivato quello vecchio.

**Al server va la stessa porta del file.** Il pannello conta le morti viste dal
suo giro e manda quel totale con il nome «Minecraft: <giocatore>»: la regola del
salto, la prima lettura che non conta, il fuori diretta e la scheda sola sono
quelli di sopra, gli stessi. Un altro account e' un'altra partita.

**Un launcher diverso.** Prism, MultiMC, CurseForge e l'app di Modrinth tengono
il registro nella cartella dell'istanza e i file del gioco altrove. Si sceglie la
cartella dell'istanza; se li' non ci sono le frasi, il pannello chiede anche la
cartella dei file del gioco, e le cerca in `versions/`, in
`libraries/com/mojang/minecraft/` e in `assets/`.

Le prove sono in `test/unita/morti-minecraft.test.mjs` (con frasi inventate, nel
formato del gioco) e nel cancello `scripts/verifica-minecraft.mjs`, che fa
girare il file minificato in Chromium con una cartella vera, un jar compresso e
un registro che cresce.
