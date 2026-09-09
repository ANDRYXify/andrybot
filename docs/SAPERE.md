# Quello che il bot sa, e come fa a saperlo

Tre strade diverse, e la differenza non è tecnica: è **chi risponde**.

| domanda | chi risponde | perché |
|---|---|---|
| `4+4`, `20% di 90` | il calcolatore | è un calcolo, non una domanda |
| `capitale della Francia` | Wikidata | è un fatto preciso, e qualcuno lo tiene scritto |
| `ricetta carbonara`, `chi era Leonardo` | il web, poi il modello | serve un testo, e va detto con parole sue |

## Il calcolatore: si conta, non si indovina

`src/features/conti.js`. Un tokenizzatore e un parser a discesa ricorsiva —
niente `eval`, niente `new Function`: un messaggio di chat è testo di uno
sconosciuto, e il testo di uno sconosciuto non si esegue.

Un modello linguistico che risponde «8» a `4+4` lo fa per **somiglianza**, non
perché ha contato, e sopra i numeri piccoli sbaglia. La macchina su cui gira
quella somma la sa fare in un microsecondo ed è sempre giusta.

Sta in cima alla catena degli intenti, prima di ogni altra cosa e prima del
modello. Se non è un conto — ed è il caso quasi sempre — torna `null` e non
succede niente: un falso positivo è peggio del silenzio.

E tace su quello che non è certo. `1.000` in italiano è mille, ma scritto in chat
può essere uno virgola zero: non c'è modo di sapere quale intendeva chi ha
scritto, e un calcolatore che indovina perde il suo unico pregio.

## La finestra su internet: rispondere, non descrivere

`src/features/web.js`. Prima cercava su Wikipedia e restituiva **l'introduzione**
della pagina trovata. Misurato:

| chiesto | tornava |
|---|---|
| `capitale della Francia` | «La Francia è il terzo Paese più esteso d'Europa, 544000 km²» |
| `ricetta carbonara` | «La carbonara è un simbolo culinario di Roma» |

Descriveva il sostantivo. E quel testo non finisce solo nella risposta: finisce
nel prompt del modello e nella **conoscenza salvata** quando il bot colma da solo
le sue lacune. Un giro che impara rumore non migliora girando più volte: diventa
più sicuro di sé.

Adesso sono quattro strade, dalla più esatta alla più generica.

**1. Il fatto preciso, da Wikidata.** «Capitale della Francia» è una proprietà di
un'entità, e Wikidata la sa: torna Parigi, senza modello di mezzo.

Le proprietà sono **fissate per identificatore**, non cercate per nome. Cercando
«autore», l'API restituisce `P2093` («nome dell'autore», una stringa) invece di
`P50` («autore»): una risposta esatta ma sbagliata è peggio di nessuna risposta.
L'elenco è corto di proposito — ogni riga è una domanda a cui il bot risponde
esattamente, e una riga sbagliata fa più danno di una riga che manca.

Fra più valori si prende quello di **rango preferito**: la popolazione dell'Italia
ha un valore per censimento, e il primo dell'elenco è del 1971.

**2. Il ricettario, da Wikibooks.** Wikipedia è un'enciclopedia: la pagina «Pasta
alla carbonara» ha una sola sezione, «Origine», e gli ingredienti non ci sono.
Misurato — nessun recupero migliore può tirare fuori quello che non c'è. Su
Wikibooks ci sono, e da lì si prendono ingredienti e una riga di preparazione.

**3. La risposta secca di DuckDuckGo**, quando ce l'ha.

**4. Il passo giusto della pagina, da Wikipedia.** Non l'introduzione: l'articolo
si legge a sezioni, si sceglie quella che la domanda **nomina** e dentro quella le
frasi che contengono le parole della domanda. Se niente si aggancia alla domanda,
torna `null`: meglio il silenzio.

## Il materiale va al modello, non in chat

Questa è la parte che cambia come suona il bot.

`brainpy.rispondi` accetta da sempre un parametro `web`. Nel percorso normale
della chat **nessuno gliene passava uno**: la ricerca esisteva solo nel ripiego,
cioè quando il modello era spento. Col modello acceso — il caso normale — il web
non veniva mai consultato. Una via che c'era e non portava da nessuna parte.

Ora, se è una domanda vera e la conoscenza locale non risponde, si cerca e il
trovato si passa al modello come **materiale**. È lui che poi lo dice, nel tono e
nel carattere che gli ha dato lo streamer. Il testo del web incollato di peso
suona come un'enciclopedia; il bot deve suonare come sé stesso.

L'attesa è corta di proposito (3 secondi): in chat una risposta lenta è una
risposta persa.

## Il collaudo, e perché è diviso in due

`test/contratto/ricerca.test.mjs` prova la **logica**, senza rete: come si
scompone una domanda, come si legge un estratto a sezioni, quale passo si
sceglie, e quando si tace. È deterministico.

`scripts/prova-ricerca.mjs` prova le **fonti**, e si lancia a mano. Non sta fra i
cancelli, e la ragione è misurata: durante il lavoro le stesse chiamate a Wikidata
hanno risposto e poi non risposto a un minuto di distanza, senza che cambiasse
niente. Un cancello che dipende dalla rete non dice se il codice è giusto, dice
com'era la rete in quel momento — e un cancello che diventa rosso a caso è un
cancello che si impara a ignorare.

## Quello che resta

Il limite vero delle nozioni generiche non è il codice: è il modello. Un 7B su
CPU con quindici secondi non sa le ricette e non le saprà. Le strade sono due, ed
è una decisione, non un lavoro: puntare `BRAIN_URL` a un modello più grande,
oppure accettare che di certe cose il bot dica che non le sa.

Il motore che impara da solo — `_autoColmaLacune` e `forgia` in `brain.js` —
esisteva già e girava: chiede al cervello cosa non sa, cerca, studia, salva. Ora
che l'ingresso risponde invece di descrivere, quel giro impara qualcosa di vero.
Quello che conta di quel giro non è la risposta che produce una volta: è la nota
che lascia. La seconda volta la risposta è istantanea e non passa più dal modello.
