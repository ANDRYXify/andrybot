# Il rimedio a chi lo può fare

## La regola

Una frase che il bot dice in chat non chiede mai a chi legge una cosa che può fare solo chi
ha il canale. Rimettere un permesso, collegare o riaprire Spotify, accendere una funzione nel
pannello, insegnare al bot una risposta: sono cose dello streamer. Il rimedio si dice solo a
chi ha scritto il comando se è dello staff, cioè lo streamer o un suo moderatore. A tutti
gli altri si dice cosa è successo, e basta.

## Il difetto da cui nasce

Il bot scrive in chat con l'account dello streamer. Uno spettatore ha chiesto una cosa allo
streamer, «@nome e un gioco come pico park? È nel tuo dna?», e il bot ha risposto con quel
nome: «Su questa passo. Ma se me la insegni dalla dashboard non me la scordo più». Erano due
errori in una riga:

- una frase falsa detta al posto dello streamer, che la risposta magari la sapeva;
- una cosa da fare che lo spettatore non ha modo di fare, e che in chat hanno letto tutti.

Le frasi del «non lo so» erano sei, e cinque mandavano alla dashboard. Accanto c'erano altri
otto testi scritti come se chi aveva chiesto fosse sempre il padrone del canale: i permessi
dei moduli, Spotify nelle richieste musicali.

## Come si decide

**A chi era la domanda.** Chi scrive il nome dello streamer chiede a lui. Se il bot non ha
una risposta vera, cioè niente conoscenza, niente modello e niente dalla rete, tace e lascia
rispondere lo streamer. Nel registro resta una riga col perché. Chi scrive «bot» chiede al
bot, e il bot può dire onestamente che non lo sa. Se il canale usa un account suo per il
bot, chiamare quel nome vuol dire chiamare il bot.

**Chi legge il rimedio.** Il testo lo sceglie `aChiPuo(dalloStaff, { staff, pubblico })` in
`src/features/risposte.js`:

- `eStaff(msg)` dice se ha scritto lo streamer (col suo account, che è anche quello del bot)
  o un moderatore;
- nei moduli il contesto porta `staff`, vero per un messaggio dello staff, per la voce dello
  streamer, per la prova dal pannello e per l'API del proprietario;
- eventi, timer e Telegram non hanno uno staff davanti, e ricevono il testo `pubblico`.

Il proprietario i guasti li vede nel pannello: i permessi mancanti e i collegamenti storti
sono in evidenza, e il riquadro del bot mostra le cose che non sapeva.

## Il cancello

`scripts/verifica-rimedi.mjs` legge i file che parlano in chat (`src/features`, `src/ai`,
`src/bot.js`). Ogni testo che nomina il pannello, la dashboard, i permessi da rimettere o un
collegamento da rifare deve stare in uno di due posti:

- la chiave `staff:` di un `aChiPuo(...)`, mentre la chiave `pubblico:` accanto non li nomina
  mai;
- l'elenco del cancello, col destinatario e il perché: un comando che risponde solo allo
  staff, una mail o un messaggio Telegram al proprietario, un errore mostrato nel pannello.

Un testo nuovo che non sta in nessuno dei due è rosso finché qualcuno non decide a chi
arriva. Una voce dell'elenco che non trova più il suo testo è rossa anche lei. L'autoprova lo
rompe in cinque modi.

La risposta vera la controlla `test/contratto/rimedi.test.mjs`: una domanda allo streamer
che il bot non sa resta allo streamer, e una domanda al bot riceve un «non lo so» senza
rimandi.
