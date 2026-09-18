# Le morti contate da sole

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
qualsiasi**, perche' non esiste la cosa. Esistono due strade diverse, e servono
tutte e due — una esatta per i pochi giochi che pubblicano i dati, una generale
per tutti gli altri. Questa pagina descrive la seconda.

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
