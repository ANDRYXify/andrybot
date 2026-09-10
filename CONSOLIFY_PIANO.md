# CONSOLify: da telecomando a banco di comando — modello e piano

Nato da: «non posso mettere ciò che voglio, voglio aggiungere tutto da quella
schermata, non dalla regia — che c'entra la regia lì? così com'è è super
strozzato».

## Cos'è che strozza (la diagnosi, non il sintomo)

Oggi le azioni della plancia sono un **registro DERIVATO**: si ricavano da quello
che esiste già altrove (i contatori, gli effetti). Da questo discende tutto il
resto del fastidio, per costruzione:

- un tasto **non può fare** una cosa che non sia già una cosa da un'altra parte;
- per avere un tasto nuovo devi prima andare in un'altra scheda a creare l'oggetto;
- un tasto fa **una** cosa sola: non esiste il concetto di «poi fai anche questo»;
- e quindi CONSOLify sembra il satellite della Regia invece che il posto da cui
  si comanda.

La derivazione era giusta come **partenza** (arrivi e i tuoi tasti ci sono già,
senza configurare niente) ed è sbagliata come **tetto**.

## Il modello nuovo: un tasto è una PARTITURA

Non «un tasto punta a un'azione» ma **un tasto è una fila di passi**, e un passo
è uno di pochi verbi. La derivazione resta: i tasti che trovi già pronti nascono
sempre dai tuoi contatori e dai tuoi effetti — ma diventano il pavimento, non il
soffitto.

I verbi (ognuno fa UNA cosa, e si compongono):

1. **Dì in chat** — testo libero, con le variabili che già esistono
2. **Manda un effetto** — quelli che hai
3. **Manda questo** — immagine, video o suono **caricato lì, sul tasto**, senza
   passare da nessun'altra scheda (è il cuore della richiesta)
4. **Manda il RISULTATO di un comando** — non la scritta «!comando», ma quello
   che quel comando produce
5. **Cambia il canale** — titolo, categoria, pubblicità
6. **Musica** — avanti, indietro, pausa
7. **Aspetta** — tot secondi (senza questo una fila di passi non è una partitura)
8. **Chiedi a un'app fuori** — vedi sotto
9. **Apri una cartella** — un tasto che porta a un secondo strato di tasti

Un tasto = 1..n passi. Un passo che fallisce non zittisce quelli dopo, e la
plancia dice quale è andato storto: sono le stesse due regole del resto del bot.

## Il ponte verso le app di fuori: la ricerca ha deciso al posto mio

Le app che vuoi comandare espongono un websocket **sul TUO computer**:

| app | dove ascolta | cosa si comanda |
|---|---|---|
| OBS (obs-websocket v5) | `ws://localhost:4455` | scene, transizioni, sorgenti, muto, registrazione |
| Voicemod (Control API) | `ws://localhost:59129/v1/` | voce, filtri, soundboard |
| VTube Studio | `ws://localhost:8001` | hotkey, espressioni, modelli |
| Streamer.bot | websocket suo, `DoAction` | qualunque azione tu ci abbia costruito dentro |

**La strada che sembrava ovvia non esiste.** L'idea naturale era: la pagina di
CONSOLify parla direttamente con `ws://localhost:4455`. Non si può: una pagina
servita in **https** non può aprire un websocket **ws://**, e l'eccezione che i
browser fanno per `localhost` vale per le risorse http, NON per i websocket. Su
Chromium è una richiesta aperta da anni (issue 40386732), non una svista da
aggirare. Quindi:

- ✗ pagina → localhost: **impossibile**, non «scomodo»
- ✗ server → localhost: il server sta su un'altra macchina, non vede il tuo PC
- ✓ **un piccolo compagno che gira da te e si collega VERSO socialbot.live**

Il compagno è l'unica strada che regge, e ha anche i vantaggi giusti: funziona
anche a browser chiuso, non chiede porte aperte sul tuo router (è lui che esce),
e le chiavi delle app restano sul tuo computer — noi non le vediamo mai.

Un solo compagno serve tutte le app: parla lui coi vari websocket locali. Un
tasto dice «scena: Gioco» e non gli importa chi la esegue.

## L'ordine dei lavori

1. **Il tasto diventa una partitura** (passi in fila, con l'attesa) e i verbi che
   NON hanno bisogno di niente di nuovo: dì, effetto, risultato di un comando,
   titolo/categoria, musica. Tutto dalla schermata di CONSOLify.
2. **«Manda questo»**: caricare media direttamente sul tasto.
3. **Cartelle**: il secondo strato.
4. **Il compagno**: il ponte verso OBS, Voicemod, VTube Studio, Streamer.bot.

Da 1 a 3 la plancia smette di essere strozzata senza che tu installi niente. Il 4
è un capitolo suo e va fatto bene, non di fretta.

## Un vincolo che non si tocca

Nel prodotto — sito, manuali, novità — **i nomi di quelle app non si scrivono**.
Si descrive cosa fanno («il programma con cui mandi in onda», «il programma che
ti cambia la voce»), e il collegamento si chiama col mestiere che fa. Qui dentro
i nomi ci sono perché è una nota di lavoro, e serve sapere di cosa si parla.
