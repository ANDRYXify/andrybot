# Il modo in cui il bot sta in chat

Il bot sapeva già rispondere. Quello che non sapeva fare era stare in chat come
ci sta una persona. Quattro cose, tutte piccole, tutte visibili da fuori.

## 1. Guarda chi ha scritto

Su Twitch i distintivi arrivano dentro al messaggio: moderatore, abbonato, VIP,
e il tag `first-msg` per chi scrive in quel canale per la prima volta. Il bot li
leggeva e li buttava prima di chiedere una risposta al cervello.

Adesso arrivano fino al prompt, in un blocco loro. Servono al modo, non al
contenuto: la risposta è la stessa per tutti, non ci sono favori. Cambia che a
chi arriva per la prima volta non si danno per scontate le cose del canale.

Il divieto sta scritto nel titolo del blocco, attaccato ai dati che riguarda
(«non elencare i suoi ruoli, non nominarli e non trattarlo meglio degli altri»).
Un modello piccolo che legge «è un moderatore» tre sezioni sopra la regola, alla
regola non ci arriva.

**Cosa non entra.** L'affinità che il bot ha con una persona resta fuori. Quella
vale su tutti i canali, e sarebbe memoria di qualcuno: il bot del canale non
ricorda nessuno (`docs/BOT-E-LIA.md`). I distintivi non sono un ricordo, sono un
fatto del turno, arrivati col messaggio.

I nomi dei quattro distintivi (`mod`, `sub`, `vip`, `primo`) stanno in due
file lontani — `src/features/handler.js` e `brain/assistente.py` — e devono
essere gli stessi. Se uno cambia nome da un lato, il benvenuto smette di
arrivare e nessuno se ne accorge: la risposta esce lo stesso. Il cancello
`scripts/verifica-modo.mjs` chiede i nomi a tutti e due e li confronta.

## 2. Risponde a qualcuno

In una chat che scorre, una riga senza destinatario è una riga persa. Twitch e
Kick hanno il filo della risposta e l'id del messaggio ce l'avevamo in mano dal
primo istante: veniva tenuto solo per poter cancellare il messaggio.

L'interfaccia della voce ora è `say(canale, testo, { rispondiA })`. Twitch mette
il tag IRC `@reply-parent-msg-id`, Kick manda `reply_to_message_id`, YouTube non
ha i thread e lo ignora. Chi chiama passa sempre l'id e non deve sapere chi ce
la fa.

**L'id arriva dalla rete e finisce dentro una riga IRC**, dove lo spazio separa
i tag dal comando e il `;` separa un tag dall'altro. Un id storto non
scriverebbe un tag storto: aprirebbe un comando che non abbiamo scritto noi. Il
filtro sta in `src/twitch/chat.js`, nell'unico punto da cui un id può entrare
nella riga: passa solo la forma vera di un uuid Twitch, tutto il resto diventa
un messaggio normale.

**Un limite noto.** Twitch non documenta cosa succede se il messaggio a cui si
risponde è stato cancellato nel frattempo. Non abbiamo costruito una rete su un
comportamento che non possiamo misurare: la finestra è di un paio di secondi, e
i messaggi che l'antispam cancella non arrivano mai a questo punto.

## 3. Legge il ritmo della stanza

L'attesa prima di parlare dipendeva solo da quanto era lunga la frase. Ma in una
chat a sessanta messaggi al minuto tre secondi sono venti messaggi dopo: la
risposta arriva quando il discorso è già altrove. In una chat ferma, invece,
rispondere in mezzo secondo è un lampo.

`attesaUmana(lunghezza, ritmo, caso)` in `src/features/handler.js` è una
funzione pura. La base viene dalla lunghezza (700 ms più 26 ms per carattere,
fino a 2,8 s). Il fattore della stanza scende da 1,35 a 0,55 man mano che il
ritmo sale, e si ferma agli estremi: nessuno scalino, nessuna attesa assurda con
una chat impazzita. Il ritmo è `memory.messageRate(canale)`, cioè i messaggi al
minuto degli ultimi trenta secondi.

Quello che il cervello ci ha già messo del suo si sconta. Se ha pensato davvero
per due secondi, non si aspetta due volte.

## 4. Quando parte lui, sa di cosa parla

Ogni tanto il bot dice qualcosa di sua iniziativa, se lo streamer lascia accesa
la «chat autonoma». Quella riga usciva da un elenco di nove frasi scritte a
mano, pescate a caso: «che si dice di bello?», «raga ma quanto siamo belli
oggi?». Cadevano dentro un discorso che non c'entrava niente, erano sempre le
stesse, e andavano bene in qualunque chat del mondo — quindi in nessuna.

Non era un problema di quante frasi c'erano nell'elenco. Una frase scelta prima
di guardare la chat non può c'entrare con la chat.

Adesso la riga la genera il cervello (`Brain.iniziativa`), agganciata all'ultima
cosa vera detta in chat, con davanti le ultime righe del discorso, la diretta di
adesso, la scheda dello streamer e la sua voce. Il materiale c'era già tutto:
mancava il permesso di partire per primo.

Regole, e sono tutte «non parlare»:

- se non ha detto niente nessuno, non c'è niente su cui dire qualcosa;
- se ha appena risposto a qualcuno, non si intromette anche da solo;
- se non ha niente di vero a cui agganciarsi, il prompt gli chiede di rispondere
  `NIENTE` e quella riga non esce;
- passa dagli stessi controlli di una risposta normale: moderazione, niente eco
  di un utente, niente ripetizioni di sé.

Un'iniziativa andata a vuoto non diventa una lacuna del cervello. Lì nessuno ha
chiesto niente, e «non avevo niente da dire» non è un buco da studiare.

L'elenco di frasi è stato tolto da `src/ai/persona.js`. Finché restava lì,
prima o poi qualcuno ci sarebbe ricascato.

## Il cancello

`node scripts/verifica-modo.mjs` cammina tutta la catena: dal tag IRC al
gestore, dal gestore al cervello Node, dal corpo della richiesta HTTP alla riga
di prompt in Python. Una catena così non si rompe con un errore, si rompe con un
rinomino, e un rinomino non ha sintomi — la risposta esce lo stesso, solo senza
quel pezzo.

`node scripts/verifica-modo.mjs --selftest` rompe diciassette cose una per volta
e pretende che il cancello diventi rosso ogni volta.

Il comportamento, invece, si prova in `test/unita/modo.test.mjs`.
