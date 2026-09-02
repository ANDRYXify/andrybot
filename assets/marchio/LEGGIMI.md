# Le sorgenti del marchio

Qui stanno i due disegni **originali**, a sfondo trasparente:

- `sbot.png` — il **segno**: la S e «bot», compatto. È quello che diventa
  l'icona dell'app, la favicon e il bollo nella barra in alto.
- `socialbot.png` — il **logo esteso**: la parola intera. Sta dove c'è
  larghezza — l'immagine di anteprima social, e ovunque serva il nome per
  disteso.

Non stanno in `src/web/public/` di proposito: quella cartella la serve il
browser, e qui dentro ci sono i file **da cui si generano** gli altri, non
quelli da scaricare. Da questi due nasce tutto il resto:

```
node scripts/marchio.mjs
```

Se un giorno il disegno cambia, si sostituisce il PNG qui e si rilancia lo
script: tutte le misure si rifanno da sole, e nessuna resta indietro.
