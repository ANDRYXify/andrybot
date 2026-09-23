# I ruoli: a chi vanno e come si vedono

## A chi vanno

Il difetto visto dal vivo: la traccia creava «Streamer», «Moderatori», «VIP» e
«Abbonati», e poi non li dava nessuno. «Streamer» non l'aveva nemmeno lo
streamer, e dal server sembrava che non fosse successo niente.

Le cause erano due, e la seconda nascondeva la prima.

**Il giro non partiva.** `dcRuoli.attivi()` sceglieva i canali con
`token<>''`. Col bot della casa la riga non ha un token suo — parla quello
della piattaforma — quindi per quasi tutti il giro dei ruoli non partiva mai.
Quale token usare lo decideva gia' `tokenDi`, in un posto solo; la query era
una seconda risposta alla stessa domanda, scritta prima che il bot della casa
esistesse. Adesso la scelta dei canali guarda solo «acceso e con un server», e
il calendario ha la sua (`conServer()`), perche' ha un interruttore suo.

**Nessuno diceva a chi andassero.** Adesso ogni ruolo della traccia risponde a
una domanda sola, `aChi`:

| valore | a chi va | come |
| --- | --- | --- |
| `tu` | a chi ha il server | Discord dice chi e' il proprietario con il server stesso (`owner_id`): il costruttore glielo da' |
| `mod`, `vip`, `sub`, `follower` | a chi lo e' su Twitch | il costruttore scrive la regola nella scheda dei Ruoli, che li da' a chi si e' collegato |
| (vuoto) | a nessuno in automatico | lo dai tu a mano |

Un campo solo e non due («e' tuo» + «per chi»): un ruolo che fosse tutte e due
le cose dovrebbe poi decidere quale vale. Il ruolo `tu` e' uno solo: nel
pannello sceglierlo su un ruolo lo toglie all'altro, nel modello vince il
primo.

**Il bot puo' dare un ruolo al proprietario.** Verificato sul testo di
Discord: la gerarchia limita il bot nel dare ruoli solo per la posizione del
RUOLO («A bot can grant roles to other users that are of a lower position than
its own highest role»); il bersaglio conta solo per cacciare, bandire e i
soprannomi. Un ruolo appena creato nasce in basso, quindi si puo' dare. Se il
ruolo «tuo» sta piu' in alto del bot, non si prova: l'anteprima lo dice.

**Le regole si aggiungono, non sostituiscono.** La scheda dei Ruoli e' dello
streamer: quelle che la traccia porta si mettono accanto a quelle che c'erano,
senza doppioni, e da li' si cambiano come le altre. Se l'interruttore dei Ruoli
e' spento, l'esito lo dice: scritte non vuol dire accese.

**Non si rifa' l'uguale.** Il ruolo che il proprietario ha gia' non glielo si
ridà, la regola che c'e' gia' non si riscrive: se no l'anteprima direbbe per
sempre che c'e' qualcosa da fare.

`aChiVanno()` e' pura: i ruoli del proprietario e le regole di adesso arrivano
come dati (li legge la porta), e parte da quello che `differenzaRuoli` ha gia'
deciso — un ruolo ambiguo o sopra il bot la' non si tocca, e qui non diventa
«tuo» per una strada laterale.

## L'anteprima e il fare vedono le stesse cose

Un difetto dell'aspetto dei ruoli, trovato rileggendo le chiamate: la porta
dell'anteprima non passava le immagini scelte, quella del fare si'. Le due
impronte non combaciavano mai, e costruire dopo aver scelto un'immagine per un
ruolo gia' esistente si fermava sempre su «il server e' cambiato» — falso.
Adesso tutte e due ricevono le stesse cose: immagini e regole di adesso.

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
