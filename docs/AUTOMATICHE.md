# Le pubblicazioni automatiche

Tre momenti della settimana di uno streamer escono da soli, se li accende:

1. **Prima della diretta.** La storia «Stasera alle…» del giorno, un tempo
   scelto prima dell'inizio: 15 o 30 minuti, 1, 2, 3, 4, 6, 8 o 12 ore.
2. **Quando vai in diretta.** La storia «Live ora». C'è già
   (`features/storia-ig.js`), e resta com'è: qui si accende accanto alle altre.
3. **La settimana.** La grafica della Settimana nei posti di «Manda» (Telegram,
   Discord, la storia di Instagram), il giorno e all'ora scelti; di serie la
   domenica alle 18. Con «Chiedimi prima» acceso (di serie), il giorno prima
   arriva una mail: «Va bene così» e la settimana esce; «La cambio» porta alla
   Settimana nel pannello. Senza conferma non esce niente.

Si accendono in un posto solo, la carta «In automatico» delle Grafiche, e ogni
riga dice quando uscirà la prossima e com'è andata l'ultima. La Settimana
rimanda lì, e mostra la richiesta di conferma quando c'è.

## Chi disegna

Il server non ha un browser, e le grafiche le disegna il motore del pannello
(`grafDisposizione` e compagnia, docs/GRAFICHE.md). Quindi le immagini delle
automatiche le prepara il pannello, con lo stesso motore dell'anteprima, e le
manda al server:

- quando accendi un'automatica;
- ogni volta che salvi le Grafiche;
- ogni volta che salvi la Settimana.

Per «Prima della diretta» sono una storia per ogni giorno in onda (al massimo
sette), ognuna col suo gioco, la sua copertina e il suo testo. Per «La
settimana» sono due: il post e la storia.

## Un'immagine vecchia non esce

Ogni immagine porta con sé da dove è nata: l'impronta della Settimana e la
versione delle Grafiche (un numero che il server alza a ogni salvataggio). Nel
momento di pubblicare il server le confronta con quelle di adesso: se non
combaciano, la grafica racconterebbe una settimana che non c'è più, e non
esce. Lo si dice nel pannello, e su Telegram se è collegato, con cosa fare
(aprire le Grafiche basta: si ripreparano da sole).

## Il testo del giorno

La storia automatica non usa il «Quando» scritto a mano, che vale per un
giorno solo: usa il testo del giorno come lo calcola la Home
(`_quandoProssima`), riferito al momento in cui la storia esce. Esce lo
stesso giorno: «Stasera alle 21:00», o «Oggi alle 15:00». Con un anticipo che
scavalca la mezzanotte (diretta alle 00:30, storia due ore prima) esce
«Domani alle 00:30»: è vero nel momento in cui la si legge.

## Quando esce, e una volta sola

- **Prima della diretta.** Per il prossimo giorno in onda (`prossimaVolta`,
  nel fuso della Settimana, anche a cavallo del cambio d'ora) la storia esce
  quando mancano l'anticipo o meno, e prima dell'inizio. Se sei già in
  diretta non esce: tocca a «Live ora». Se il server era fermo nel momento
  giusto e riparte dopo l'inizio, non la recupera fuori tempo.
- **La settimana.** Esce nell'ora scelta, entro un'ora; dopo, per quella
  settimana, non più.
- Lo stato ricorda cosa è uscito, per chiave: l'istante d'inizio della
  diretta, il lunedì della settimana. Un giro che ripassa non pubblica due
  volte.

## La conferma della settimana

- La richiesta parte 24 ore prima dell'uscita (subito, se l'uscita è più
  vicina di così quando accendi). Arriva alla mail dei rapporti, se è
  confermata, e su Telegram, se è collegato.
- «Va bene così» apre una pagina con il riassunto della settimana e un tasto:
  conferma chi preme, non chi apre il link (i programmi che controllano la
  posta aprono i link da soli). Il link è personale e scade con l'uscita.
- Si conferma anche dal pannello, con lo stesso effetto.
- Salvare la Settimana non conferma da solo: la conferma è una scelta, non un
  effetto collaterale. Dopo un salvataggio il pannello la chiede.
- Senza mail e senza Telegram la richiesta sta solo nel pannello, e la carta
  lo dice. Con «Chiedimi prima» spento la settimana esce ogni volta.

## Dove sta lo stato

In un file per streamer, accanto alle immagini, come la storia della diretta:
cosa è acceso, l'anticipo, il giorno e l'ora della settimana, le conferme,
l'ultima uscita di ognuna e perché. Non nelle impostazioni, che si riscrivono
da altre strade: un interruttore che un salvataggio altrui potesse spegnere in
silenzio sarebbe peggio di nessun interruttore.

## I perché, nella lingua di chi legge

Quando un'uscita non parte per una ragione nostra, lo stato tiene un codice
(`non-pronta`, `settimana-cambiata`, `grafiche-cambiate`, `anticipo-cambiato`,
`in-diretta`, `non-confermata`, `nessun-posto`): il pannello lo dice nella
lingua di chi lo usa, e su Telegram va la frase in italiano. Un rifiuto di
Instagram, di Telegram o di Discord arriva com'è.

## Nel pannello

- **Grafiche, «In automatico»**: tre righe, «Prima della diretta» (con
  l'anticipo), «Quando vai in diretta» (l'interruttore di «Live ora», che
  prima stava nel riquadro di Instagram: ora le automatiche stanno tutte
  qui) e «La settimana» (giorno, ora, «Chiedimi prima se va bene»). Sotto
  ognuna, quando esce la prossima e com'è andata l'ultima; per la settimana,
  il tasto «Va bene così» finché non è confermata.
- **Aprendo le Grafiche** il pannello guarda se qualche immagine è rimasta
  indietro (`pronte` nella vista) e la riprepara da solo: è quello che
  promettono i messaggi di errore.
- **Settimana, «Mandala»**: una riga dice se la settimana esce da sola e
  quando, con «Va bene così»; se è spenta, porta alla carta.
- **Il motore delle grafiche** riceve la diretta da disegnare nella
  configurazione (`_prossima`, `_copertina`, `_rif`) invece di leggerla da
  una variabile globale: così la storia del mercoledì si prepara mentre
  l'anteprima mostra quella di stasera, senza toccarla.
