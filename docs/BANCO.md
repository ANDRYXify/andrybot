# Il banco di regia

L'editor degli overlay: com'è fatto e perché.

## Il difetto di partenza

Misurato sullo Studio com'era, a 1440×950:

| | |
|---|---|
| comandi nella pagina | 165 |
| fuori dalla prima schermata | **150** (il 91%) |
| dove cominciava la tela | 1543px |
| dove cominciavano le proprietà | 2564px |

L'ultimo numero è quello che decide. Fra la tela e i comandi che la modificano
c'erano **più di mille pixel su uno schermo alto 950**: non una questione di
preferenze, ma l'impossibilità aritmetica di vedere quello che stai cambiando
mentre lo cambi.

Il difetto non era il numero di comandi — un editor ne ha legittimamente tanti —
ma che fossero disposti come **un testo da leggere dall'alto in basso** invece
che come un banco su cui lavorare.

## La regola

**Il banco occupa l'altezza dello schermo e non scorre mai.** Se un pannello ha
più roba di quanta ne entra, scorre quel pannello — non la pagina. La tela non
può uscire dal campo visivo, perché è l'unico posto dove si vede l'effetto di
quello che si sta facendo.

Adesso, alla stessa misura: **28 comandi su 28 raggiungibili senza scorrere**, e
la pagina è passata da 2282px a 541.

## Com'è disposto

```
┌─ modelli · strumenti · zoom ────────────────────────┐
│ livelli │           tela            │ proprietà     │
│         │                           │ del livello   │
│         │                           │ selezionato   │
├─ X · Y · dimensione · rotazione ────────────────────┤
```

- **A sinistra** i livelli, con le loro coordinate e l'occhio per accendere e
  spegnere. È anche l'ordine di sovrapposizione.
- **Al centro** la tela, in scala reale: lo stage è 1920×1080 virtuali, ridotto
  con una trasformazione. Così ogni misura in pixel resta proporzionata a quello
  che uscirà davvero in OBS.
- **A destra** solo le proprietà del livello **selezionato**. I novanta campi di
  alert, chat e widget non stanno più tutti nella stessa pagina: se ne vedono
  una decina, quelli che riguardano ciò che hai in mano. Quando non c'è
  selezione la colonna resta al suo posto e dice cosa fare — un pannello che
  appare e scompare farebbe ballare la tela a ogni clic.
- **In basso** le coordinate esatte. Non è un dettaglio: trascinare va bene per
  la posizione approssimativa, ma «X 120, Y 64» scritto e modificabile è l'unico
  modo di allineare due cose davvero.

Le altre carte della sezione — i tuoi overlay, il link OBS, l'aspetto — sono
diventate **schede**: il banco è l'unica cosa in pagina quando ci lavori.

### Due cose che il CSS non poteva fare

L'ispettore, nel documento, stava **dopo** la scena: non poteva essere una
colonna. Viene spostato dentro al montaggio.

E l'altezza del banco dipende da quanto occupa ciò che sta sopra, che va
misurato quando il layout è fermo: preso troppo presto dava 26px invece di 688,
e il banco sforava in basso di seicento pixel. Ora si rimisura anche quando la
testata cambia — apri la guida e lo spazio si aggiorna da solo.

## I difetti di posizionamento

Il direttore ha segnalato che «la chat portata sull'estremo lato destro va a
schiacciarsi». Misurando tutti e quattro gli elementi in nove posizioni sono
emersi **due** difetti, di cui il secondo nessuno aveva notato.

### La chat si schiacciava

Confermato e quantificato: da **53 pixel di larghezza a 9**, con l'altezza che
passava da 18 a 177 perché il testo andava a capo una lettera per riga.

La causa: un elemento in posizione assoluta senza larghezza dichiarata la ricava
dallo spazio che resta fra il suo bordo sinistro e il bordo destro del
contenitore. A `left: 100%` quello spazio è **zero**, quindi si comprime al
minimo possibile. Il `translate(-100%)` successivo lo riportava dentro, ma ormai
era schiacciato.

Con `width: max-content` la larghezza dipende dal contenuto e non da dove si
trova — che è l'unica cosa sensata per un elemento che si può spostare ovunque.

### L'editor era «poco preciso», e c'era un motivo

Le animazioni di entrata degli alert (`slide`, `pop`, `zoom`, `flip`) dichiarano
una transizione **sul transform**: giusto, è così che entrano in scena in OBS.
Ma il posizionamento usa lo **stesso** transform.

Risultato: trascinando un elemento nell'editor, quello **inseguiva il puntatore
con quattro decimi di secondo di ritardo**. E con `pop`, la cui curva è
`cubic-bezier(.2, 1.5, .4, 1)`, girava intorno al punto invece di fermarcisi.

Il comportamento del trascinamento dipendeva da **quale animazione avevi scelto
per gli alert**, che non ha alcun senso. Nell'editor il transform non si anima
più: qui si posiziona, le animazioni si guardano col pulsante di prova.

### Una cosa che sembrava un difetto e non lo era

L'alert risultava sforare dalla tela di 43-48px in tutte le posizioni laterali.
Non è vero: il test stava misurando **durante** la transizione, e poi — tolta
quella — stava misurando la corsa fra sé stesso e l'app, che riscrive la
posizione dal proprio stato salvato. I valori oscillavano fra 4 e 80 pixel a
ogni ripetizione, che è il segno che si stava misurando rumore.

Resta quindi **non verificato** se l'alert sfori davvero ai bordi: per accertarlo
serve muoverlo attraverso l'API dell'editor, non scrivendogli addosso lo stile.

## Il collaudo

- `t_banco.mjs`: che i tre pannelli siano visibili insieme, che il banco non
  sfori dalla finestra e che i comandi siano raggiungibili senza scorrere.
- `t_preciso.mjs`: che l'elemento **segua** il puntatore invece di inseguirlo,
  per ognuna delle cinque animazioni, e che la chat non si schiacci ai bordi.
- `t_posiz.mjs`: la larghezza di tutti e quattro gli elementi in nove posizioni.
