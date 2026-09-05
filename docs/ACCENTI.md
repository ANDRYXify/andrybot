# Perché Lia non imparava: un apostrofo

## Il sintomo

Nel cruscotto «come ragiona», sei modi di pensare su undici stavano a **zero
secco**: calcolo, deduzione, costruzione, cause, introspezione, ecologia.
Lavoravano solo riflesso, moduli e modello.

Uno zero pieno non è un modulo debole. Un modulo debole fa 3, fa 7, fa 11. Zero
è una strada che non viene mai imboccata.

## La causa, misurata

In italiano, in chat, **`è` si scrive quasi sempre `e'`**. Le regole con cui Lia
ricava fatti dalle frasi cercavano l'accento vero. Con l'apostrofo non trovavano
niente — e non davano nessun errore. Non imparava, e basta.

Misurato prima della correzione, su frasi scritte come le scrive la gente:

| frase | fatti imparati |
|---|---|
| `il gatto e' un animale` | 0 |
| `Anna e' amica di Sara` | 0 |
| `Milano e' in Lombardia` | 0 |
| `il gatto è un animale` (con l'accento) | 1 |

Da lì in giù casca tutto, in fila: senza fatti non c'è grafo; senza grafo la
deduzione non ha su cosa dedurre; senza deduzione «non so → costruisco» non ha
niente da costruire; il ragionamento causale non ha archi; l'analogia non ha
strutture da mappare. Sei zeri, una causa sola.

E la stessa porta era chiusa anche dall'altro lato: `perche' piove?` e
`cos'e' il gatto?` non venivano riconosciute **come domande**. Anche nei casi in
cui la risposta c'era, non la si andava a prendere.

## La correzione

`brain/accenti.py` rimette gli accenti battuti con l'apostrofo. La regola è
esatta, non un tentativo — i due usi dell'apostrofo si distinguono da soli:

- **elisione** — `l'amico`, `un'ora`, `dell'acqua`: l'apostrofo sta *dentro* la
  parola, seguito da una lettera. Non si tocca.
- **accento** — `e'`, `perche'`, `piu'`, `citta'`: l'apostrofo *chiude* la
  parola, dopo una vocale. Quello è un accento battuto male.

E dove il dubbio resta, non si tocca — non imparare è meglio che imparare
storto:

- i **troncamenti** (`un po'`, `da'`, `di'`, `fa'`, `va'`, `sta'`) hanno
  l'apostrofo giusto: `un po'` non diventa `un pò`, che sarebbe un errore;
- la `e` accentata può essere grave (`è`, `cioè`, `caffè`) o acuta (`perché`,
  `né`, `sé`): decide la parola;
- se nel testo l'apostrofo fa da **virgoletta** (`dice 'ciao'`), il testo si
  lascia com'è.

Passa di qui **ogni** testo che entra in `ragiona.py`, sia una frase da cui
imparare sia una domanda a cui rispondere. Se ci passasse solo una delle due,
Lia imparerebbe `il gatto è un animale` e poi non riconoscerebbe
`il gatto e' un animale?` — che è il difetto di prima, spostato di un metro.

## Le altre due cose trovate strada facendo

**La domanda sì/no si mangiava le altre.** «X è Y?» veniva provata per prima e,
se non sapeva rispondere, si fermava lì. Ma quella forma combacia anche con
`chi è Marco?` (soggetto «chi», oggetto «Marco»): tutte le domande con
chi/cosa/dove che finiscono col punto interrogativo venivano ingoiate. Adesso,
se non sa, prova le altre.

**Le vie contate in tre elenchi diversi.** `genera.py` assegna la via che ha
prodotto la risposta, `coscienza.py` la registra ma solo se sta in una lista, il
cruscotto la disegna ma solo se sta in un'altra. Tre copie della stessa cosa in
tre file: `analogia` e `strumento` venivano contate e non mostrate, `scudo` ed
`esecuzione` non venivano nemmeno contate — e le percentuali si calcolavano su
un totale parziale, cioè dicevano il falso. Ora il totale comprende tutto, anche
una via che nessuno ha ancora previsto, e un cancello confronta i tre elenchi.

## Dopo

Sulle stesse frasi, misurato:

- 9 frasi su 9 diventano fatti (prima: 3, quelle senza `è`);
- da quei fatti ne costruisce **6 nuovi** da sola (prima: 0);
- risponde a `cos'e' il gatto?`, `dov'e' Milano?`, `chi e' Marco?`,
  `il gatto e' un essere vivente?` — quest'ultima con la catena
  «gatto è animale, e animale è essere vivente», che è una deduzione a due passi
  senza modello;
- e a `il gatto e' una macchina?` **non risponde**: non inventa.

## Il cancello

`scripts/verifica-vie.mjs` non legge il codice: lo **esegue**. Fa imparare a Lia
frasi scritte come le scrive la gente e pretende che dopo sappia rispondere. Un
difetto così non lo trova nessuna prova statica, perché il codice era giusto —
era l'ingresso che non passava.

`--selftest` rompe una cosa per volta (otto rotture, tutte cose che qualcuno
potrebbe fare davvero) e pretende che il cancello diventi rosso.
