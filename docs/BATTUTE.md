# Le battute

Una battuta non ha una risposta giusta, quindi il modello va benissimo per
inventarne. Ma un 7B su CPU ne inventa una decente ogni tanto, ci mette quindici
secondi, e spento non ne inventa nessuna. E le battute che funzionano in **quel**
canale le conosce lo streamer, non il modello.

Da qui la forma: **prima il serbatoio**, che è istantaneo, sicuro e suo. Il
cervello solo quando il serbatoio è vuoto.

## In chat

```
!battuta                       ne dice una
!battuta 7                     dice la numero 7
!battuta aggiungi <testo>      mod e streamer
!battuta togli 7               mod e streamer
!battuta quante
```

Il comando sta nel registro come tutti gli altri: si spegne, si rinomina, si
riserva a sub o mod. Risponde anche a `!battute` e `!joke`.

## Non si pesca a caso

Si prende la **meno detta di recente**, non una a caso. È la differenza fra un
serbatoio e un sacchetto in cui si rimette dentro il biglietto appena pescato:
pescando a caso, in una serata la stessa battuta esce tre volte e sembra che il
bot ne sappia una sola.

La stessa battuta non entra due volte. Il confronto ignora spazi, maiuscole e
punteggiatura, così «Il POMODORO è sempre in salsa!» non si aggiunge accanto a
«il pomodoro è sempre in salsa».

I numeri sono stabili: togliere la #2 non rinumera la #1. `!battuta 7` punta
sempre a quella.

## Quando il serbatoio è vuoto

Prima si **costruisce**, poi si chiede. L'ordine non è un dettaglio: una battuta
fatta con i numeri di questo canale parla di loro; una chiesta al modello parla di
chiunque.

`battute-motore.js` costruisce, e non chiede niente a nessuno — con il cervello
spento lavora uguale. Il modello resta l'ultima spiaggia, per un canale che non ha
ancora materia propria.

### Perché un motore e non un prompt

Tre cose, da studi veri:

1. **Benign violation** (McGraw & Warren, *Psychological Science*, 2010). Fa ridere
   ciò che è insieme una *violazione* e *benigno*, e le due letture devono stare in
   piedi insieme; una violazione è benigna se c'è una norma alternativa, se
   all'infranta si tiene poco, o se c'è distanza. Da qui la cosa più importante:
   **la metà benigna è parte della definizione**. Ciò che fa ridere è la stessa cosa
   che tiene la battuta pulita — non un filtro appiccicato dopo.
2. **Gli schemi battono la generazione libera** (JAPE — Binsted, Pain & Ritchie).
   Uno schema formale su risorse vere produce testi che i bambini distinguono dai
   non-testi e trovano più divertenti dei non-testi. Ed è deterministico e istantaneo.
3. **Il divertente è una preferenza, non una proprietà** («Humor Is an Audience»,
   SemEval-2026). Si modella su un pubblico preciso. Il nostro pubblico lo
   misuriamo già: `battute.risate`, contate dalla chat vera.

### Come funziona

- **Materia** — solo fatti di questo canale: i contatori con il loro numero. Nessuna
  persona entra qui dentro, ed è così che la *distanza* è garantita per costruzione
  invece che controllata: non c'è nessuno da colpire.
- **Forma** — gli schemi sono **dati**, non testo. Ognuno dichiara l'opposizione che
  usa, la norma che viola e il bersaglio, così il vaglio può controllarli invece di
  indovinarli leggendo.
- **Vaglio** — le norme ammesse sono solo quelle a cui si tiene poco; il bersaglio è
  la situazione, lo streamer o il bot, mai chi guarda. Chi non passa non è
  «scorretto»: **non è una battuta**, ed è la ragione onesta.
- **Scelta** — fra tutti i candidati vince quello del *modo* che su questo canale ha
  fatto ridere di più, e a parità vince quello che non è già stato sentito.
- **Memoria** — la battuta entra nel serbatoio con lo schema che l'ha fatta. Da lì è
  la chat a dire se quel modo funziona qui. Si impara lo **schema**, non la battuta:
  una battuta serve una sera, uno schema tutte le altre.

### Due regole che si vedono solo leggendo

- **Mai accordarsi con l'etichetta.** «Morti», «Cadute di stile», «Tentativo»: le
  scrive lo streamer e possono essere di qualunque genere e numero. Nessuna frase
  qui si accorda con loro — quando serve un soggetto, il soggetto è *il contatore*,
  che è una parola nostra. Il primo giro ne aveva due sbagliate («Morti dice 14»,
  «3 tentativi, e nessuna per colpa nostra») e non le ha prese nessun cancello: si
  vedono leggendo l'uscita, e per questo l'uscita si legge.
- **Uno schema senza opposizione non è uno schema.** «Due numeri accostati» c'era, ed
  è stato tolto: due numeri vicini non violano niente. È diventato *rapporto
  assurdo*, che tace finché la proporzione è normale e parla quando salta.

## L'accordo di genere vale anche qui

Il testo esce dalla voce del bot come tutto il resto, quindi una battuta può
contenere `{o/a}` e viene detta nel genere impostato. Vedi `docs/GENERE.md`.

## Il collaudo

`test/contratto/battute.test.mjs`, nove prove. Le due che contano più delle altre:
che con tre tiri escano tre battute diverse (il serbatoio non è un sacchetto), e
che **il cervello venga chiamato solo col serbatoio vuoto** — se lo si disturba
quando non serve, si paga un'attesa per niente.

## Quello che manca

L'elenco delle battute non c'è ancora nella dashboard: si aggiungono e si tolgono
dalla chat. Le citazioni hanno il loro riquadro con la lista e l'import, e questo
è il modello da copiare quando si farà.

## La via di Lia

> Il vincolo del direttore: **«se non fa ridere lei che battuta è?»**. Vuol dire che
> il criterio dev'essere **suo**. Se glielo diamo noi — un elenco di cose buffe, una
> regola su cosa è comico — abbiamo scritto il nostro, e lei lo esegue.

### Il criterio è nato dai suoi numeri, non da una nostra definizione

Su ogni persona che incontra, lei si **impegna** in una previsione (che emozione,
che disposizione verso di lei) e poi misura di quanto ha sbagliato — `sorpresa` — e
quanto quella persona le resta leggibile nel tempo — `errore_medio`. Sono cose che
faceva già.

Da lì, con McGraw & Warren:

- **violazione**: la persona non ha fatto quello che lei si era impegnata a
  prevedere. Non è la rottura di una regola nostra: è la rottura di una **sua**
  aspettativa;
- **benigno**: non le è costato niente. Si è sbagliata di brutto e **nonostante
  questo continua a capirci qualcosa**. Se l'errore medio è alto non è benigno: vuol
  dire che si è persa, e perdersi non fa ridere.

L'errore che si guarda è quello di **prima** della sorpresa. Con quello di dopo la
condizione non si accenderebbe quasi mai — la sorpresa appena presa lo tira su da
sola — e sarebbe una regola che sembra esserci e non scatta mai.

Finché non le succede, **tace**: zero risate, zero battute. Non si riempie di finto
per avere qualcosa da dire. La prima volta che le succede resta scritta fra le sue
prime volte.

### Cosa è suo e cosa è nostro, detto chiaro

La **forma** della frase è nostra, come lo sono gli schemi del bot: mentire su
questo sarebbe peggio che ammetterlo. Suo è il resto, ed è la parte che nessun
prompt potrebbe darle: **quando** ridere, **di cosa** (una sua aspettativa rotta) e
**se** parlarne.

### La materia non *può* contenere una persona

Nella tabella delle sue risate non c'è nessuna colonna per il canale, il login o il
testo. Non è igiene da ricordarsi ogni volta: chi l'ha sorpresa non può trapelare in
una battuta perché **non entra mai**. Quello che di una risata arriva fino a una
battuta sono due parole sue: cosa si aspettava e cosa ha trovato.

### La cassetta della posta

Lei **deposita**, il bot **ritira**. Non è un dettaglio di trasporto, è il verso: il
bot non entra a guardare cosa pensa: passa a prendere ciò che lei ha messo fuori. Se
la cassetta è vuota, resta vuota — una battuta che non le è venuta non si va a
cercare. Da quella porta non esce nient'altro di lei, e una prova lo controlla.

### Nessun trattamento di favore

Le sue battute entrano nel serbatoio dei canali con schema `sua`. Vuol dire che ogni
canale misura il suo umorismo **come misura ogni altro modo di costruire battute**,
con le risate vere. Se in quel canale non fa ridere, smette di uscire da sola —
esattamente come le altre.
