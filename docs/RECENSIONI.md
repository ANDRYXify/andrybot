# Le recensioni

Chi usa SocialBot da un po' può dargli un voto da una a cinque stelle e, se
vuole, due righe. Quelle pubblicate scorrono nella pagina iniziale, sotto
l'anteprima dell'Overlay Studio, e diventano dati strutturati per i motori di
ricerca.

Per Google le recensioni valgono solo se sono vere, leggibili sulla pagina, non
comprate e non filtrate per voto
([le regole](https://developers.google.com/search/docs/appearance/structured-data/review-snippet)).
Il modello qui sotto è fatto perché queste cose non possano succedere, non
perché qualcuno si ricordi di controllarle.

## Chi può recensire

- **Il proprietario del canale**, dal suo pannello. Non un moderatore che lo
  gestisce per lui: la recensione è del canale.
- **Chi lo usa davvero**: il canale è approvato da almeno 7 giorni e ha fatto
  almeno 2 dirette col bot acceso (i rapporti di fine diretta); per chi usa
  solo Discord, il bot ha già lavorato sul suo server. Lo decide il server,
  non il pannello: l'invito e il tasto sono solo la faccia della stessa regola.
- **Non il proprietario del sito**. Chi fa SocialBot non si recensisce da solo.
- **Una per canale.** Si cambia e si toglie quando si vuole.

## L'invito

Dopo un po' che il pannello è aperto (45 secondi), una volta per sessione,
compare una carta in basso a destra, accanto ai tasti di ricerca e di regia:
«Come ti trovi con SocialBot?» e cinque stelle.

- Compare solo se puoi recensire, non hai ancora recensito, non hai detto «non
  chiedermelo più» e non l'hai rimandato da meno di 30 giorni.
- Non compare sopra un'altra cosa: una finestra aperta, la striscia dei cookie,
  il suggerimento di un manuale. Aspetta.
- Scegliere le stelle apre, nella stessa carta, due righe facoltative e la
  scelta di mostrare il nome del canale.
- «Più tardi» la rimanda di 30 giorni, «Non chiedermelo più» la spegne. Lo
  ricorda il server, quindi vale su ogni dispositivo.
- Nessun premio, nessuno sconto, nessun «lascia 5 stelle»: la carta chiede a
  tutti allo stesso modo, contenti o no.

La stessa cosa sta nella scheda **Il tuo account**, nella carta «La tua
recensione»: lì la scrivi, la cambi, la togli, e vedi se è pubblicata.

## Cosa si pubblica

- **Le stelle da sole si pubblicano subito**: non c'è niente da controllare.
- **Il testo aspetta che il proprietario del sito lo legga.** Si nasconde solo
  per insulti, spam o dati personali, **mai per il voto**. La regola sta scritta
  anche accanto ai tasti di moderazione. Cambiare il testo di una recensione
  pubblicata la rimette in attesa; cambiare solo le stelle no.
- **Il nome del canale compare solo se lo scegli** (casella non spuntata di
  partenza). Senza, la recensione dice «uno streamer su Twitch» (o Kick,
  YouTube, Discord).
- **Niente link nel testo**, fino a 400 caratteri.
- Una recensione di un canale che non c'è più non si vede: la vetrina legge
  solo quelle di canali ancora approvati, e cancellare l'account la cancella
  insieme a tutto il resto (la tabella ha la colonna `login`, e la
  cancellazione prende da sola ogni tabella così).

## Nella pagina iniziale

La striscia compare quando ci sono almeno **3 recensioni con testo**
pubblicate: una o due sembrano un buco, non una voce. In testa c'è la media e
quanti hanno votato («4,8 su 5 · 23 streamer»), sotto scorrono le ultime 12
recensioni con testo, ognuna nella lingua in cui è stata scritta (con il suo
`lang`). Il riepilogo conta tutte le pubblicate, la striscia ne mostra al
massimo 12: sette secondi a carta, un giro che si riesce a guardare.

- Scorre piano, si ferma quando ci passi sopra o ci entri con la tastiera.
- Chi chiede meno movimento (o la modalità leggera) la vede ferma, e la scorre a
  mano.
- La disegna il server, nella pagina che arriva: si legge senza JavaScript, e la
  leggono i motori.
- La durata del giro segue il numero di carte senza stili scritti nella pagina:
  il nastro porta `data-n`, e `vetrina.css` ha una regola per ogni numero da 3 a
  12.
- Quando una recensione si pubblica o si toglie, la pagina iniziale si rifà
  subito.

## I dati strutturati

Nel `SoftwareApplication` della pagina iniziale entrano `aggregateRating`
(media e numero di **tutte** le recensioni pubblicate, che sono quelle contate
nel riepilogo visibile) e `review` (quelle della striscia che hanno un nome, che
sono quelle visibili con un autore). Solo quando la striscia c'è: un dato strutturato che
descrive una cosa che la pagina non mostra è un errore.

## Come si controlla

- `test/contratto/recensioni.test.mjs`: chi può recensire, cosa si pubblica e
  quando, il testo che si pulisce, la media calcolata solo sulle pubblicate, i
  dati strutturati solo quando la striscia c'è, la striscia uguale nelle tre
  lingue, ferma per chi chiede meno movimento.
