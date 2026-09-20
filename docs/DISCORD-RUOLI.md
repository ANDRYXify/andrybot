# L'aspetto dei ruoli

Un ruolo su Discord non è solo quello che può fare: è anche come si vede. Il
colore c'era già; qui ci sono le due cose che mancavano — il **segno** accanto
al nome e la **tinta** (sfumatura e olografico) — e il ragionamento che ha
deciso come sono fatte.

## Quello che Discord pretende (verificato sui documenti)

Da `docs.discord.com/developers/topics/permissions` e `/resources/guild`:

- `color` è **deprecato**; la verità sta in `colors.primary_color`, che è la
  stessa cosa detta bene.
- `colors.secondary_color` fa la sfumatura, `colors.tertiary_color` la rende
  olografica. Non possono essere non nulli senza la caratteristica
  **`ENHANCED_ROLE_COLORS`**.
- Alla lettera: «When sending `tertiary_color` the API enforces the role color
  to be a holographic style with values of: `primary_color = 11127295`,
  `secondary_color = 16759788`, and `tertiary_color = 16761760`».
- `icon` (un'immagine) e `unicode_emoji` vogliono la caratteristica
  **`ROLE_ICONS`**.
- «Image data is a Data URI scheme that supports JPG, GIF, and PNG formats»:
  il webp NON si può, anche se altrove nel pannello lo accettiamo.

## L'olografico non è un colore, è un interruttore

I tre numeri li impone Discord. Chiedere allo streamer tre colori e poi
sostituirglieli sarebbe una finta. Quindi la normalizzazione li FORZA: uno stato
che Discord rifiuterebbe non si può nemmeno salvare, e il pannello non ha
niente da impedire a mano.

I tre modi — «un colore», «sfumatura», «olografico» — si RICAVANO da due campi
(`sfuma`, `olografico`). Un terzo posto che memorizza il modo sarebbe un posto
che un giorno dice una cosa diversa dagli altri due.

E il colore si manda in un campo solo per richiesta: tinta piatta → `color`
(funziona ovunque), sfumatura o olografico → `colors` (e quello parte soltanto
verso un server che lo capisce).

## Il segno è uno solo

Discord ne mostra uno. Due campi separati — un'emoji E un'icona — potrebbero
essere pieni tutti e due: uno stato che su Discord non esiste e che poi
qualcuno dovrebbe «risolvere». Qui il tipo decide (`niente` | `emoji` |
`immagine`) e le caselle che non gli appartengono si svuotano.

Chi scrive il segno scrive SEMPRE tutti e due i campi, e uno dei due è `null`:
mandarne uno solo lascerebbe in piedi l'altro, e il ruolo finirebbe con l'emoji
nuova e l'icona vecchia.

## Dell'immagine non teniamo i byte

Discord restituisce l'icona come **impronta**, non come immagine: dai byte non
la sappiamo calcolare, quindi «è la stessa immagine?» non si risponde
confrontando.

Invece di conservare fino a 256 KB per ruolo dentro le impostazioni dello
streamer, l'immagine viaggia una volta sola:

1. il pannello la ridisegna su una tela di 64 e la esporta in png — così il
   formato sbagliato e la dimensione di troppo smettono di poter arrivare;
2. i byte stanno in `_dcsIcone`, che vive in quella pagina e basta;
3. partono con la richiesta di costruire, in una mappa a parte dalla traccia;
4. Discord risponde con la nuova impronta, e quella si registra nella traccia;
5. i byte si buttano.

Da lì in poi il confronto è esatto: impronta contro impronta, e non si riscrive
l'uguale. Se sul server l'impronta è diversa, qualcuno l'ha cambiata a mano: si
dice, e non si finge di poter rimettere dei byte che abbiamo scelto di non
tenere.

Che i byte stiano FUORI dalla traccia non è un dettaglio di forma: è ciò che
rende impossibile conservarli senza accorgersene. La normalizzazione non li fa
passare, quindi nella traccia salvata non ci possono arrivare.

## Quello che il server non sa fare non si chiede

`differenzaRuoli` guarda le caratteristiche del server: senza
`ENHANCED_ROLE_COLORS` la sfumatura non parte, senza `ROLE_ICONS` il segno non
parte, e in tutti e due i casi si scrive in `manca` — che l'anteprima mostra
prima di toccare niente. L'olografico che non si può fare lascia il suo primo
colore, che è la cosa più vicina a quello che era stato scelto.

È la stessa forma del conto della porta d'ingresso: il rifiuto di Discord si
anticipa, non si incassa a metà costruzione.

## L'aspetto lo dice la traccia, i privilegi si sommano

Era già la regola per colore, «a parte» e «si può chiamare»: solo i privilegi
sono additivi nel modo normale. Segno e sfumatura la seguono, così non c'è una
seconda regola da ricordare.

## Il pannello (il ragionamento, che nei file serviti non si può scrivere)

- **I byte stanno in `_dcsIcone`**, una variabile di quella pagina: non entrano
  nella traccia che si salva, non sopravvivono a un ricarico. Quello che
  sopravvive è l'impronta — abbastanza per sapere che l'immagine c'è già, non
  abbastanza per riaverla.
- **Si ridisegna solo il pezzo che cambia** (`_dcsRidisegnaAspetto`). Rifare
  tutto l'elenco chiuderebbe in faccia il riquadro del ruolo che si sta
  aprendo proprio adesso — e chi sceglie «sfumatura» lo fa per scegliere il
  secondo colore, che comparirebbe dentro il riquadro appena chiuso.
- **Il titolo si riscrive mentre si scrive** (`_dcsRiscriviTitolo`): mostra il
  ruolo come si vedrà su Discord, segno e nome nel suo colore. Senza, chi cambia
  nome legge ancora quello di prima e crede di non aver cambiato niente.
- **`_dcsIconaPronta`** taglia sul lato corto e riduce a 64: un'icona quadrata
  schiacciata si riconosce subito, e sarebbe l'unica cosa che si vede di quel
  ruolo.
- **I tre modi scrivono i due campi**, e basta: nel pannello non c'è un terzo
  posto che memorizza il modo. Cambiare tipo di segno svuota l'altro, perché
  tenerne uno «per dopo» vorrebbe dire inventarsi uno stato che su Discord non
  esiste.
- **L'anteprima nomina anche il segno**: senza, un ruolo a cui cambia solo
  quello comparirebbe nell'elenco senza niente scritto accanto, e l'anteprima
  direbbe che succede qualcosa senza dire cosa.
- **I comandi spenti portano la ragione scritta**: farli riempire e poi farli
  rifiutare da Discord sarebbe farli riempire per niente.

## Dove sta nel codice

| pezzo | dove |
| --- | --- |
| i numeri dell'olografico, e chi scrive cosa | `src/features/discord-api.js` (`OLOGRAFICO`, `tintaRuolo`, `segnoRuolo`) |
| come si legge un ruolo | `src/features/discord-api.js` (`ruoli`) |
| il modello e gli invarianti | `src/features/discord-preset.js` (`normalizzaTinta`, `normalizzaSegno`, `stessoSegno`) |
| il confronto | `src/features/discord-preset.js` (`differenzaRuoli`) |
| il segno delle tracce | `src/features/discord-catalogo.js` (`ruoliDiretta`) |
| i byte che passano | `src/web/server.js` (`immaginiRuoli`) e `src/features/discord-costruisci.js` |
| l'editor | `src/web/public/app.js` (`_dcsAspettoHtml`, `_dcsIconaPronta`) |
| le prove | `test/unita/discord-ruoli-aspetto.test.mjs`, `test/contratto/ruoli-aspetto.test.mjs` |
