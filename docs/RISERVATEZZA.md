# Riservatezza del codice servito

## La regola

**Nei file che il browser scarica non ci sono commenti.** Le uniche due righe
ammesse sono la filigrana di proprietà intellettuale.

Vale per tutto ciò che si può leggere con F12 o scaricando i file del sito:
`src/web/public/**` — `.js`, `.css`, `.html`. Il codice del server può avere
tutti i commenti che servono: non esce di lì.

## Perché

Un commento scritto da un'IA si riconosce: il registro, la lunghezza, il modo di
spiegare la causa prima della soluzione. Chi legge il sorgente e capisce **quale**
assistente ha lavorato al progetto sa anche come è stato ragionato, dove si
guarda e dove no, e può usare lo stesso assistente per cercare la breccia. È
informazione regalata a chi attacca, in cambio di zero.

Lo stesso vale per i commenti che raccontano *cosa era rotto prima*: sono una
mappa dei punti deboli storici, e i punti deboli storici sono i primi che si
riprovano.

## Dove va la spiegazione

In `docs/`. Un file per argomento, scritto per essere letto — che è comunque
meglio di un commento incastrato fra due righe di codice, perché lì ci sta il
ragionamento intero e non solo la scheggia che entrava nel margine.

Se togliendo un commento si perde qualcosa, quel qualcosa va scritto in `docs/`
**prima** di togliere il commento, non dopo.

## Il cancello

```
node scripts/spoglia-commenti.mjs --verifica   # elenca, esce 1 se trova qualcosa
node scripts/spoglia-commenti.mjs              # toglie
```

Segnala anche i file serviti **senza filigrana**.

Il modo in cui lavora è quello che lo rende sicuro da lanciare: marca ogni
carattere del file come commento o non-commento con un lexer vero — stringhe,
template letterali, letterali regex, commenti — e poi cancella **solo le righe
che sono commento per intero**. Se il lexer sbagliasse, la riga resterebbe
com'è: non può tagliare codice a metà.

Da lanciare prima di ogni deploy, insieme agli altri collaudi.
