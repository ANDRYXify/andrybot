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
ancora esista e sia visibile. Oggi sono 75 ancore su 25 schede, tutte trovate.

Serve davvero, e lo ha dimostrato subito: la scheda **Registro**, appena nata,
aveva due passi puntati su carte che quando sono vuote non ci sono. Il faro si
sarebbe acceso sul nulla. Riscritti su cose che ci sono sempre.

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

## La scheda deve vedersi

Un faro giusto su una scheda che non si vede non serve a niente. Il direttore ha
mandato una foto: all'ultimo passo — quello che dice «c'è anche il manuale» — la
scheda finiva in fondo alla pagina con i pulsanti tagliati sotto il bordo.

Misurato prima di toccare niente: **sei schede su sette avevano almeno un passo
con la scheda fuori dallo schermo**. Non era un caso limite dell'ultima tappa.
Erano quattro difetti diversi, tre della stessa famiglia — una cosa che sembra
fare qualcosa e non la fa.

**1. Il centraggio non ha mai funzionato.** Un passo senza bersaglio si centrava
con una classe che usa `transform`. La scheda ha anche un'animazione d'ingresso
che finisce con `transform: none`, e un'animazione batte una regola normale:
finita l'animazione, la traslazione che centra spariva. In numeri, la scheda
stava mezza larghezza (190 px) a destra e novanta pixel sotto il centro vero.
Da sempre, perché «abbastanza in mezzo» sembra in mezzo.

**2. La posizione del passo prima restava appesa.** Il passo senza bersaglio
aggiungeva la classe e usciva, senza toccare `top` e `left` scritti nello stile
dell'elemento dal passo precedente. Lo stile scritto a mano vince su una classe:
la classe si aggiungeva e non spostava niente. È il caso della foto.

**3. «Sopra il bersaglio» senza guardare il bordo di sotto.** Si sceglieva sotto
se ci stava, altrimenti sopra se cominciava dopo il margine — mai se finiva
prima del bordo. Con il bersaglio ancora fuori schermo, «sopra il bersaglio»
voleva dire duemila pixel più in giù anche per la scheda: misurato `top: 2391px`
in una finestra alta 900.

**4. La scheda cresceva dopo essere stata messa a posto**, e restava fuori per
un paio di fotogrammi.

Adesso la posizione la decide **un punto solo** e dipende **solo dalla tappa di
adesso**. La geometria è uscita dal foglio di stile: non c'è più nessuna
animazione con cui litigare. Tre cose la tengono ferma: una stretta dentro la
finestra sui due assi, la posa nello stesso momento del testo invece che un
fotogramma dopo, e un osservatore sulla misura della scheda per quando cambia
altezza da sola.

Una guardia che avevo scritto in più è stata tolta: faceva lo stesso lavoro
della stretta, e due guardie per la stessa cosa vogliono dire che nessuna delle
due si può mettere alla prova.

Il cammino sta nello stesso collaudo: apre i giri veri e cammina ogni passo su
quattro misure di finestra — due da computer, una stretta ma non telefono, e una
da telefono dove la scheda la incolla in basso il foglio di stile. A ogni passo
pretende che la scheda **e i suoi pulsanti** stiano dentro, misurati subito e a
scorrimento finito. Compreso il **ritorno indietro al primo passo**, che è
l'unico modo, passando dalla porta, di chiedere un passo senza bersaglio dopo
uno con il bersaglio. E lì non si chiede «c'è la classe che centra»: si chiede
**dov'è** — guardare la classe vorrebbe dire ricascare nel difetto, perché la
classe c'era anche quando non spostava niente.

## E l'indirizzo della demo

Trovato costruendo il cammino: nella **demo** il pezzo di indirizzo dopo il
cancelletto (`/?demo=1#scudo`) veniva ignorato, e chi apriva un link diretto a
una scheda atterrava sempre sulla prima. La lettura dell'indirizzo stava dentro
il ramo «utente vero», dopo l'uscita anticipata della demo: ora è una funzione
sola, chiamata da tutti e due i rami.

## Dove sta il codice

`src/web/public/app.js`: `GUIDE` (le ricette con le ancore), `tappeDi`,
`_puntaTappa`, `_dovePasso`, `apriGiro`, `disegnaTappa` (dentro c'è `posiziona`,
che decide dove sta la scheda), `muoviGiro`, `chiudiGiro`, `riavviaGiro`,
`apriDaIndirizzo`. Lo stile in `anime.css` (`.giro-*`).

Il contratto è in `test/contratto/giro.test.mjs`. Le ancore **e** il cammino
stanno nello stesso collaudo, `scripts/verifica-giro.mjs`, perché vogliono lo
stesso browser e la stessa pagina; ora è dentro `npm run cancelli`, perché un
giro rotto è una cosa che lo streamer vede al primo minuto e nessuno di noi al
centesimo. Il suo autoprova rimette i quattro difetti uno per volta:
`node scripts/verifica-giro.mjs --selftest --rottura=N`.
