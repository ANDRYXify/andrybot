<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# Le manche preparate

Chiesto così: «giochi come gli anagrammi: lo streamer sceglie una parola, la anagramma e la
inserisce nel bot, il bot va in ascolto e legge in chat, se qualcuno fa la parola giusta vince
quello che decide lo streamer (magari anche effetti o premi in generale). E tutto quello che
manca».

## Quello che c'è già

L'anagramma esiste: è una delle undici **manche** (docs/GIOCHI.md). Prende una parola a caso
dalla lista dello streamer (o da una di serie), la mescola in modo che non resti uguale, dura 45
secondi, e il primo che scrive la parola prende il premio delle manche, in monete. Le manche
partono con `!manche`, `!manche anagramma`, o da sole ogni tanto mentre si è in diretta.

Accanto ci sono l'impiccato, il wordle, il rebus, il reflex, la domanda tua: tutti con lo stesso
motore (`avviaRound` in `games.js`), un costruttore per tipo, e una manche alla volta per canale.

## Cosa manca

1. **La parola di QUESTA manche.** Oggi la parola è a caso dalla lista. Lo streamer vuole
   sceglierla per una manche precisa, e la parola non deve passare dalla chat: scriverla in chat
   per lanciarla vorrebbe dire darla a tutti.
2. **Il suo anagramma.** Il bot mescola da solo; lo streamer può volerlo scrivere lui (uno più
   difficile, uno con una battuta dentro).
3. **Il premio.** Oggi è un numero di monete, uguale per tutte le manche. Lo streamer vuole
   decidere cosa si vince: monete, il VIP per qualche diretta, un effetto sullo schermo, una cosa
   da consegnare a mano, o qualunque cosa sappia fare un Modulo.
4. **Il ritmo.** Durata, indizi che escono col tempo, uno o più vincitori: decisi per quella
   manche.
5. **Chi non può vincere.** Lo streamer conosce la parola, e chi vede il pannello pure.
6. **Farla vedere.** La parola mescolata, il tempo e il vincitore anche sullo schermo, non solo in
   chat.

## Il modello

Una **manche preparata** è una manche normale con il materiale e le regole già decisi. Non è un
gioco nuovo: è lo stesso motore, con i costruttori di sempre, che invece di pescare dalla lista
ricevono quello che lo streamer ha scritto.

```
manche preparata = {
  tipo        anagramma | impiccato | wordle | domanda | rebus | reflex
  materiale   la parola (o la domanda, le emoji) e le risposte accettate
  mostra      per l'anagramma: le lettere mescolate dallo streamer, o vuoto (mescola il bot)
  durata      secondi
  indizi      ogni quanti secondi esce una lettera giusta, e fino a quante
  vincitori   quanti, nell'ordine in cui rispondono
  premi       uno per posto: monete, VIP per N dirette, effetto, da consegnare, solo gloria
  chi         tutti, oppure anche i moderatori esclusi (lo streamer non vince mai)
}
```

**Le preparate stanno in una coda**, nel pannello. Si lanciano tre modi, e nessuno passa la
parola dalla chat:

- dal pannello, «Lancia adesso»;
- in chat, un moderatore scrive `!manche prossima`: parte la prima della coda;
- da sole: se lo streamer lo sceglie, le manche automatiche pescano prima dalla coda.

Una preparata giocata esce dalla coda e va nello **storico**, con chi ha vinto e cosa: lo stesso
posto dove lo streamer ritrova le cose da consegnare.

**Il confronto.** La risposta si confronta come oggi: minuscole, senza accenti e senza
punteggiatura, con le varianti accettate. Per l'anagramma e il reflex vale il messaggio intero;
per la domanda anche la parola dentro una frase. Gli errori di battitura no: in una gara il primo
che la scrive giusta vince.

**Il premio è una lista di posti.** Ogni posto dice cosa si vince, e il bot lo dice in chat con le
parole dello streamer. I premi riusano quello che esiste:

| premio | cosa fa | da dove viene |
|---|---|---|
| monete | le dà subito, senza tetti (è una vincita, non crescita) | `points.add` |
| VIP | lo dà per N dirette, e lo toglie quando finiscono | `premio.js`, come il premio periodico |
| effetto | lo fa partire sullo schermo | gli effetti del canale |
| da consegnare | lo mette nella lista «Da consegnare», col nome di chi ha vinto | il negozio |
| solo gloria | il nome in chat e sullo schermo | |

E sempre, per qualunque altra cosa, un **evento per i Moduli**: «Manche vinta», con chi ha vinto,
che tipo era, la risposta e il posto. Con quello lo streamer costruisce il premio che vuole
(un messaggio, un ruolo su Discord, una canzone, un'azione in OBS).

**Lo schermo.** Un pezzo nuovo dell'Overlay Studio, «La manche», che mostra la parola mescolata o
coperta, il tempo che scorre, gli indizi man mano che escono e il vincitore. Si sposta e si veste
come gli altri pezzi.

## Il piano

1. Il motore: `avviaRound` accetta una preparata (materiale, durata, indizi, vincitori, premi,
   chi). I costruttori dei tipi di parola ricevono il materiale invece di pescarlo.
2. I premi: monete, VIP a dirette, effetto, da consegnare, gloria; e l'evento «Manche vinta» per
   i Moduli.
3. La coda e lo storico nel database, le rotte del pannello, `!manche prossima`.
4. Il pannello: «Manche preparate» nella scheda Giochi, con l'anteprima di quello che la chat
   vedrà (l'anagramma mescolato si vede prima di lanciarlo, e si rimescola).
5. Il pezzo «La manche» nell'Overlay Studio.
6. Le prove: per ogni tipo, che una preparata si vinca con la sua risposta e solo con quella; che
   lo streamer non vinca; che i premi arrivino a chi ha vinto e a nessun altro; che la parola non
   compaia mai in un messaggio del bot prima della fine; che una preparata giocata esca dalla coda.
