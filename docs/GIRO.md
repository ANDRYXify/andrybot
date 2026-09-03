<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->

# Il giro guidato

La prima volta che entri in una scheda, il bot te la fa vedere: a cosa serve,
come si fa quello per cui serve, un passo per volta, con la luce puntata sul
controllo di cui sta parlando.

## Un giro che insegna, non che descrive il mobilio

La prima versione **leggeva le tappe dalla pagina**: una per carta, col titolo
della carta e la sua prima frase. Non poteva invecchiare — ma non insegnava
niente. Diceva dove stavano le cose, non come si fanno: un giro panoramico.

Ora ogni tappa è un **passo della ricetta della scheda**, e porta con sé
l'ancora del controllo di cui parla:

```js
alert: { serve: [it, en, es],
  come: [[it, en, es, '#ovl-livelli'], [it, en, es, '#ovl-preview'], …] },
```

| tappa | da dove viene |
|---|---|
| **A cosa serve questa scheda** | `GUIDE[scheda].serve` — la stessa riga che riempie la cartina «Come funziona», già in tre lingue |
| **un passo per volta**, con la luce sul controllo | `GUIDE[scheda].come` — il quarto elemento di ogni passo è il selettore |
| **Se ti serve di più** | `stato.aiuti[scheda]`, la guida o il manuale di quella scheda |

Il titolo della tappa non si scrive: è il **posto dove sei** — la testa del
pannello, l'etichetta del campo, o il titolo della carta che lo contiene. Se il
controllo sta dentro un pieghevole chiuso, il giro **lo apre**: un tutorial che
dice «qui sotto c'è…» e non lo mostra è un tutorial a metà.

## Il prezzo, e il contrappeso

Un giro scritto **può invecchiare**: si sposta un id, si rifà una carta, e il
faro si accende sul nulla. Chi lo segue non pensa «il tutorial è vecchio»,
pensa che il prodotto è rotto.

Il contrappeso è `scripts/verifica-giro.mjs`: apre **ogni scheda** in un browser
vero, costruisce le tappe come le costruisce il prodotto e verifica che ogni
ancora esista e sia visibile. Oggi sono 67 ancore su 24 schede, tutte trovate.
Gira fuori da `npm run cancelli` (che devono restare statici e istantanei).

E in `test/contratto/giro.test.mjs`: ogni scheda del prodotto ha la sua ricetta,
ogni passo parla tre lingue, e nessuno può tornare a fare il giro delle carte.

### Una misura sbagliata, per memoria

Il collaudo è nato rosso su 58 ancore su 67 — sembrava che mezza applicazione
non avesse più i suoi controlli. Non era così: il cambio scheda passa da una
view transition, che in headless ci mette **fino a un secondo e mezzo**, e
l'attesa di 900 ms misurava il pannello precedente. Il difetto era nel metro,
non nella cosa misurata. Ora si aspetta che la scheda sia davvero in pagina.

## Quando parte

- alla **prima visita** a una scheda, dopo un indugio di 1,4 secondi — se stai
  solo sfogliando le schede non parte;
- **non parte** se stai già facendo qualcosa (un clic dentro al pannello lo
  annulla per quella visita, ma non lo segna come visto);
- **non si accavalla**: niente giro se c'è l'avviso della guida, il banner dei
  cookie o il benvenuto, e mai due giri a meno di 45 secondi l'uno dall'altro;
- **una volta sola** per scheda, ricordata in `localStorage` (`sb-giro`): nessuna
  utenza, nessun dato che esce dal browser.

Si rifà quando vuoi dal **«?»** in barra (e dal cassetto sul telefono): «Rifai il
giro di questa scheda».

## Due cose imparate misurando

**La luce insegue lo scorrimento.** La prima versione portava la carta in vista
con uno scorrimento morbido e poi posizionava il buco dopo un'attesa a occhio:
la luce cadeva **600 pixel più in basso** del bersaglio. Adesso la posizione si
ricalcola a ogni scorrimento (un fotogramma per volta), quindi non c'è nessuna
attesa da indovinare.

**Il giro non sopravvive a un cambio di scheda.** Le carte dell'altra scheda
sono nascoste: i loro riquadri diventano di larghezza zero e la luce cadrebbe
nel vuoto. Cambiando scheda il giro si chiude.

## Dove sta il codice

`src/web/public/app.js`: `GUIDE` (le ricette con le ancore), `tappeDi`,
`_puntaTappa`, `_dovePasso`, `apriGiro`, `disegnaTappa`, `muoviGiro`,
`chiudiGiro`, `riavviaGiro`. Lo stile in `anime.css` (`.giro-*`).
Il contratto è in `test/contratto/giro.test.mjs`, le ancore in
`scripts/verifica-giro.mjs`.
