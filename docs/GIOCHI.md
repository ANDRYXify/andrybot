# Giochi e monete

## I duelli: due difetti veri

La segnalazione: i duelli «danno tag inesistenti» e mostrano «`{a}`
come vincente». Erano due difetti reali, e vale la pena raccontarli perché sono
di due specie diverse.

### `{a}` in chat

Uno dei quattro esiti del duello era:

```
'{a} e {b} se le danno di santa ragione… vince {a}! 🔥'
```

e la sostituzione era `.replace('{a}', a).replace('{b}', b)`.

`String.replace` con una stringa cambia **solo la prima occorrenza**. Quindi in
chat usciva letteralmente:

> Mario e Luigi se le danno di santa ragione… vince **{a}**!

Un errore di battitura reso letale da un metodo fragile. La correzione non è
sistemare quella riga — è togliere di mezzo il modo di sbagliare: `riempi()`
sostituisce **tutte** le occorrenze e **lancia** se resta un segnaposto non
risolto. Un modello scritto male non arriva più in chat: si ferma nei collaudi.

### Duelli con i fantasmi

`!duello @chiunque` funzionava con qualunque nome: il bot annunciava il duello e
**accreditava le monete** a un profilo che non esisteva. Bastava inventare un
nome per creare punteggi dal nulla.

Ora si può sfidare solo chi ha parlato in chat negli ultimi trenta minuti. Il bot
tiene una memoria leggera di chi si è visto, che serve anche a non sfidare
qualcuno che se n'è andato mezz'ora fa.

## L'economia delle monete

### Com'era

Si guadagnava **solo scrivendo**: due monete, al massimo una volta al minuto.
Quindi:

- chi guardava in silenzio per due ore prendeva **zero**;
- chi scriveva "ok" ogni minuto ne prendeva centoventi.

Si premiava il rumore, non la presenza — ed era un invito a tenere una macro che
scrive in chat. Inoltre valeva anche a canale **spento**, dove non c'è niente da
premiare, e un flusso continuo a bocce ferme è esattamente ciò che svaluta una
moneta.

### Com'è ora

Sul modello dei sistemi fedeltà collaudati (StreamElements, Streamlabs), **due
flussi che si sommano**:

| flusso | a chi | quando |
|---|---|---|
| presenza | a chi è in chat, anche in silenzio | ogni giro |
| partecipazione | in più, a chi ha scritto in quel giro | ogni giro |

più i moltiplicatori per **abbonati** (×1,5) e **VIP** (×1,25), letti dai
distintivi dei messaggi — quindi senza una sola chiamata in più a Twitch.

E la regola chiesta: chi resta in lurk continua a guadagnare,
ma **gradualmente meno**. Un gradino per ogni giro senza partecipare, fino a un
minimo sotto il quale non si scende:

```
giri in silenzio   0    1    2    3    4    5+
monete             5    4    4    3    2    2
```

Non a zero, perché la presenza vale sempre qualcosa. E chi torna a parlare
**risale subito a quota piena**, senza dover recuperare.

Tutto solo mentre il canale è in diretta (disattivabile).

Il giro si aggancia al ciclo delle ore guardate, che ogni cinque minuti già
chiede a Twitch chi è in chat: le monete di presenza non costano **nessuna**
chiamata aggiuntiva.

## Le regole di ogni gioco, e un'economia che non stampa monete

### Cosa si è misurato

Con i valori di serie, e la presenza che dà (5 + 5) × 12 = **120 monete
all'ora**:

| gioco | com'era | cosa voleva dire |
|---|---|---|
| `!pesca` | media 44 a lancio, un lancio al minuto | ~2.640 all'ora: **22 volte** la presenza |
| `!slot` | tornavano 114 monete ogni 100 giocate | ogni giocata **creava** monete |
| `!duello` | +15 dal nulla, un duello ogni 15 s | fino a ~1.800 all'ora nel canale |
| `!roulette` | 97,3 su 100 | giusta: roulette europea |
| `!furto`, `!regala` | passano di tasca | non creano niente |

Un'economia così non ha bisogno di altri giochi: ha bisogno di smettere di
stampare. Aggiungere giochi sopra avrebbe solo gonfiato di più le monete, e una
moneta che si trova ovunque non vale niente, nemmeno in classifica.

### Le tre regole, per costruzione

1. **Un gioco a pagamento, di serie, lascia vincere il banco**: la resa sta
   sotto 100. Slot 93,5 (la coppia paga 15 invece di 20), roulette 97,3.
2. **Un gioco gratis a tempo, al ritmo massimo, non rende più della
   presenza.** La pesca ora si fa ogni 5 minuti e un lancio vale in media 9,8:
   118 all'ora contro 120.
3. **Le sfide passano monete, non le creano.** Il duello senza posta si gioca
   per l'onore (premio di serie 0); quello con la posta arriva con i giochi
   nuovi, e lì si vince quello che l'altro rischia.

Le tre regole sono prove (`test/unita/giochi-conf.test.mjs`): se un valore di
serie le rompe, il collaudo diventa rosso.

### Un catalogo solo

`src/features/giochi-conf.js` dichiara, gioco per gioco, cosa si può cambiare:
costi, premi, attese, probabilità, testi, il pescato. Da lì nascono:

- la **normalizzazione** di quello che arriva dal pannello (un valore storto
  tiene quello di prima, un testo con un segnaposto ignoto non passa);
- i **valori** che legge il motore;
- la **carta del pannello**, che riceve il catalogo come dati e non ne tiene
  una copia;
- i **numeri del manuale**, che li legge da lì invece di ripeterli;
- la **copia della demo**, che una prova confronta col catalogo vero.

### La resa si calcola

Ogni gioco descrive il suo esito medio (`resa`), e una funzione sola lo valuta
con i valori scelti: quante monete tornano ogni cento giocate, quante ne rende
un'ora di pesca, quante ne crea un premio. Il pannello la mostra accanto al
nome mentre si muovono le manopole, e la scrive in rosso quando un gioco crea
monete o rende più della presenza. La scelta resta dello streamer, ma è
informata.

Il pannello ha la sua copia della funzione, perché il browser non legge i
moduli del server. Una prova la estrae da `app.js` e la confronta con quella
del server su valori a caso: se divergono, è rosso. E la resa della slot si
confronta col motore su **tutte le 216 tirate** possibili.

### Chi aveva cambiato un valore lo tiene

Costo e vincite della slot, premio del duello e della manche stavano in
`settings.punti`. Il vecchio pannello salvava sempre tutti i valori, quindi
«salvato» non voleva dire «scelto». La regola: un valore uguale al **vecchio
predefinito** vale come mai toccato e prende il nuovo; uno diverso è una
scelta e resta. I valori vecchi non si riscrivono più col predefinito quando
si salva la carta dei punti: sono la memoria di chi li aveva scelti.

## Più tipi di manche

Prima lo streamer poteva creare due tipi di gioco: quiz e parola veloce. Ora
cinque, e tre sono nuovi:

| tipo | cosa fa | cosa serve |
|---|---|---|
| Quiz | domanda e risposte accettate | le domande |
| Parola veloce | il primo che scrive la parola | le parole |
| **Anagramma** | lettere mescolate da rimettere in ordine | parole da 4+ lettere |
| **Sequenza** | ricopiare una sequenza di simboli | i simboli |
| **Domanda tua** | una domanda sola, scritta da te | domanda e risposte |
| Numero | indovina il numero | niente, è di serie |

I tipi stanno in **un elenco solo** (`COSTRUTTORI`), da cui si servono il
sorteggio delle manche automatiche, la dashboard e i collaudi: aggiungerne uno
non vuol dire ricordarsi di tre elenchi sparsi che possono divergere.

Due dettagli che sembrano piccoli e non lo sono:

- l'anagramma **rimescola finché il risultato è diverso dall'originale**. Un
  anagramma uguale alla parola non è un gioco;
- il controllo della risposta riceve il testo **sia normalizzato sia grezzo**. La
  normalizzazione toglie tutto ciò che non è alfanumerico — comprese le emoji —
  quindi la sequenza di simboli sarebbe stata impossibile da vincere.

## Le sfide con la posta, e la morra

**Il duello con la posta** (`!duello @nome 50`) si gioca solo se l'altro
accetta (`!accetta`, `!rifiuta`, un minuto di serie per decidere), e chi vince
prende la posta dell'altro: le monete passano di tasca, il totale non cambia.
Una sfida alla volta a testa, e una posta massima se la vuoi.

**Le monete si muovono quando il gioco si decide, non prima.** Una sfida in
attesa non tiene niente da parte: si ricontrolla chi ha le monete nel momento in
cui l'altro accetta. È una scelta di costruzione: un deposito andrebbe
ricordato attraverso un riavvio, e un riavvio nel mezzo toglierebbe monete che
nessuno ha perso a un gioco. Così la sfida salta, e basta.

**La morra** (`!morra carta 20`) contro il bot. Senza puntata è solo per ridere.
Con la puntata di serie è **giusta**: su tre esiti uno paga il doppio, uno
restituisce e uno perde, cioè 100 su 100. Nelle regole si decide quanto paga la
vittoria, e la resa del pannello si confronta con i nove esiti possibili.

## Le attese: due per gioco, in un posto solo

Ogni gioco del catalogo ha due attese, `attesaTesta` e `attesaTutti`, e le fa
rispettare un pezzo solo (`src/features/attese-giochi.js`). Prima ognuno aveva
la sua, scritta a modo suo: una sola, a volte a testa e a volte per tutti, due
fisse nel codice (`!trivia` 15 secondi, `!manche` 10) e quasi tutte mute. E la
carta dei comandi mostrava un numero fisso del registro («5s» accanto a
`!slot») che non cambiava quando lo streamer cambiava l'attesa nelle regole.

**Si controlla prima, si segna dopo.** `aspetta` guarda se c'è da aspettare;
`giocato` fa partire le attese, e il gioco lo chiama solo quando si è giocato
davvero. Prima l'attesa si consumava al tentativo: un `!roulette` scritto male
bloccava per cinque secondi quello giusto, e un `!furto` su qualcuno con le
tasche vuote bloccava per 45 secondi il furto vero.

**Si dice una volta.** Chi trova il gioco in attesa se lo sente dire con quanto
manca; se riscrive nella stessa attesa il bot tace. L'attesa di tutti si dice
una volta per tutto il canale, e quando le due finiscono insieme vale quella di
tutti. Tacciono sempre solo i comandi a raffica (`!colpisci`).

**Dove parte l'attesa**, gioco per gioco, è dove si è giocato: la slot quando si
paga la giocata, il duello con la posta quando l'altro accetta, il colpo quando
si chiude (per tutti e per chi era nella banda), lo sblocco quando la chat è
cambiata davvero. Lo sblocco segna prima di chiedere a Twitch, perché due sblocchi
insieme non passino tutti e due mentre si aspetta la risposta, e se Twitch dice
di no l'attesa si annulla e torna quella di prima.

**La resa legge le stesse attese.** Il ritmo di un gioco è la più lunga delle
due (una persona aspetta la sua *e* quella di tutti): la pesca rende al massimo
`media × 3600 / max(attesaTesta, attesaTutti)`, il boss conta i colpi con lo
stesso ritmo. Chi aveva scelto l'attesa unica la ritrova al posto giusto
(`prima` nel catalogo): nella slot era a testa, nel duello per tutti.

La carta dei comandi mostra le attese scelte nelle regole (il registro dice di
quale gioco è ogni comando, `gioco`), non più un numero suo.

## Il colpo di gruppo e il boss

Due giochi collettivi, uno a pagamento e uno gratis, costruiti sulle stesse due
regole dei duelli: le monete si muovono solo quando il gioco si decide, e il
massimo che un gioco può rendere si conosce prima di giocarlo.

### Il colpo (`!colpo`, `!heist`)

Uno organizza, gli altri entrano con la loro posta per `raccolta` secondi, poi
ognuno tira per sé. La riuscita di una banda di *n* persone è

    p(n) = min(riuscitaMax, riuscita + (n − 1) · perPersona) / 100

e chi scappa riprende la posta per `vincita` / 100. La resa del pannello è il
**massimo** di p(n) · vincita su tutte le bande possibili: con `perPersona` > 0
è `riuscitaMax · vincita / 100` (la banda grande tocca il tetto), altrimenti
`min(riuscita, riuscitaMax) · vincita / 100`. Di serie 60 × 160 / 100 = **96**:
la regola 1 vale anche per la banda più grande, e con una piccola si prende
meno. Una prova confronta la resa col massimo del motore su trecento
combinazioni di manopole.

Chi entra non riceve una riga a testa: gli ingressi si dicono insieme, al più
uno ogni cinque secondi. In una chat viva, venti persone in un minuto sarebbero
venti righe del bot.

### Il boss (`!boss`, `!colpisci`)

**La vita è quella di chi scrive.** `vitaPerPersona` per ogni persona che ha
scritto negli ultimi dieci minuti (dal registro dei messaggi, bot escluso), mai
meno di `minimo` persone. Tararla sugli spettatori collegati renderebbe il boss
imbattibile in ogni canale dove quasi tutti guardano in silenzio.

**Ogni punto di danno vale lo stesso.** Chi colpisce prende
`bottino × danno / vitaPerPersona`; il colpo finale conta solo la vita che
restava, quindi la somma dei danni è la vita del boss e, se tutti colpiscono
uguale, ognuno prende esattamente `bottino`.

**Il massimo si conosce prima.** Una persona colpisce al più una volta ogni
`attesa` per `durata` secondi, sempre col danno più alto:

    massimo = bottino × (⌊durata / attesa⌋ + 1) × dannoMax / vitaPerPersona

Di serie 20 × 19 × 15 / 60 = **95** a boss. Il boss automatico arriva a
intervallo fisso (`ogni` minuti, non a caso, apposta), quindi il massimo all'ora
è `massimo × 60 / ogni` e si confronta con la presenza come la pesca (regola 2):
di serie il boss automatico è spento, con un boss all'ora sono 95 contro 120, e
se lo si manda più spesso il pannello lo segna in rosso. I boss chiamati a mano
e quelli dei raid non entrano nel conto, come le manche aperte a mano. Una prova
fa colpire una persona sola al ritmo massimo e verifica che prenda proprio
`massimo`, né di più né di meno.

**Niente si perde.** Colpire non costa; se il boss scappa non si prende niente.
Il boss automatico non parte se `!colpisci` è spento: sarebbe un boss che
nessuno può battere. La festa in solo emote (se la accendi) passa dalle
modalità della chat a tempo (docs/MODALITA-CHAT.md): se la chat era già in solo
emote non si annuncia niente, e alla fine torna com'era.

## Le manche con lo stato: impiccato e più o meno

Fino a qui una manche era una domanda e un controllo: il primo messaggio giusto
vince. L'impiccato e il più o meno sono diversi: ogni messaggio **cambia la
partita** (una lettera scoperta, un intervallo più stretto), e la chat gioca
tutta insieme.

Una manche così non ha `controlla` ma `suMessaggio`, che ritorna `{ vince }`,
`{ chiudi, dire }` (l'impiccato che vince lui) o niente. Il resto del motore non
cambia: chi vince prende il premio delle regole delle manche, e una manche vinta
non scade.

**Gli indizi non escono a ogni messaggio.** In una chat viva dieci persone
scrivono un numero nello stesso secondo: rispondere a ognuno vorrebbe dire che
il bot parla più di tutti gli altri insieme. I tentativi si raccolgono, e lo
stato della partita si dice **al massimo una volta ogni quattro secondi**
(`INDIZIO_MS`), e solo se è cambiato.

| manche | cosa | quanto dura |
|---|---|---|
| Impiccato | una parola, una lettera alla volta o tutta insieme; sei errori e vince lui | 2 min |
| Più o meno | un numero da 1 a 100; ogni tentativo stringe l'intervallo per tutti | 90 s |
| Calcolo veloce | un conto generato ogni volta, mai sotto zero | 30 s |
| Rebus | emoji da leggere (🕷️🧑 = Spiderman), venti di serie e i tuoi | 45 s |

Il più o meno si risolve sempre: dimezzando l'intervallo bastano sette
tentativi per cento numeri, e la prova lo verifica su duecento partite. Il
calcolo veloce si confronta con un conto fatto a parte, su cinquecento conti.

**Il giro si sceglie.** Nelle regole delle manche si spuntano i tipi che stanno
nel giro di quelle automatiche (almeno uno: per spegnerle c'è l'interruttore).
`!manche impiccato` ne apre una per nome anche se non è nel giro, e un nome
sbagliato si dice invece di tirare a caso.

## Il collaudo

`test/unita/manche.test.mjs` verifica, per tutti i tipi, che la soluzione
vinca. Prima di lui non c'era: la sezione qui sotto parlava di un file,
`t_giochi.mjs`, che non è mai esistito.

Quello che quel file prometteva lo verificano adesso le prove vere
(`giochi-conf`, `manche`, `presenza-duello`):

- che **ogni modello di testo** si riempia senza lasciare segnaposto, e che un
  segnaposto ripetuto venga sostituito tutte le volte;
- che un modello con un segnaposto ignoto **protesti** invece di passare;
- che non si possano sfidare fantasmi;
- che chi guarda guadagni, chi partecipa guadagni di più, e che abbonati e VIP
  stiano nell'ordine giusto;
- che il lurk scenda **in modo monotono** e non arrivi mai a zero;
- che chi torna a parlare risalga subito;
- e per **ogni tipo di manche**, che la soluzione superi il proprio controllo —
  cioè che non esista una manche invincibile.

## Fonti

- [Streamlabs — Loyalty Points](https://streamlabs.com/content-hub/post/cloudbot-101-loyalty-points)
- [StreamElements — Loyalty System](https://support.streamelements.com/hc/en-us/articles/10474478470290-Loyalty-System-Overview)
- [Frictions and flows in Twitch's platform economy](https://www.tandfonline.com/doi/full/10.1080/1369118X.2024.2331766)

## Un posto solo per fare un gioco

Erano **due riquadri che facevano la stessa cosa**: «I tuoi giochi» per le manche
e «Inventa un gioco tuo» per quelli a comando — e il secondo, per finire il
lavoro, ti spostava nella scheda *Comandi*. Tre elenchi e due schede per una cosa
sola.

La domanda che li distingue davvero è una: **chi lo lancia?**

| | che gioco è | da cosa parti |
|---|---|---|
| **Ci pensa il bot** | una manche a sorpresa | quiz, parola veloce, anagramma, sequenza, una domanda tua |
| **Lo scrive uno spettatore** | un comando che costa e paga | sei ricette a punti già scritte |

Quella domanda è il primo passo del creatore, e il resto si adatta. L'elenco in
fondo è **uno**, e mostra tutti e due i tipi.

### L'editor non si duplica: si sposta

Il secondo caso è un Modulo a tutti gli effetti, e sarebbe stato sbagliato
riscriverne una copia «per i giochi». `apriEditor(modulo, dove)` accetta lo
spazio in cui disegnarsi, e tutti passano da `slotEditor()` invece di andare a
prendersi `#editor-modulo` a mano. Un editor solo, due case.

### Le $ dei giochi

Nell'editor dei giochi le parole magiche offerte sono quelle che a un gioco
servono — monete, caso, numeri, chi scrive — invece di tutte e quaranta. Non è
un secondo elenco: si ricavano dai **gruppi della legenda** (`GRUPPI_GIOCO`)
filtrando quelle che esistono davvero, quindi non possono sfasarsi. Le altre
restano a un clic.
