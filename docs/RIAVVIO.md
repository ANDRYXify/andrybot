# Cosa sopravvive a un riavvio

## La classe di difetti

Un deploy dura un secondo. Una diretta dura ore. Il processo muore, la diretta
no — e tutto quello che un motore teneva acceso dentro una `Map` spariva con
lui.

Non è il difetto di un file: è una classe, ed è saltata fuori quattro volte di
fila senza che nessuno la cercasse.

| dove | cosa si perdeva |
| --- | --- |
| moduli a tempo | l'ora dell'ultimo giro: al riavvio partivano tutti insieme |
| giveaway | chi aveva scritto `!join`, coi suoi biglietti |
| penitenze | la sfida in corso, già pagata a punti canale |
| scudo anti-bot | il foglietto di cosa riaprire |

L'ultima è la peggiore e vale la pena raccontarla per intero. Quando lo scudo
si alza, il bot accende su Twitch tre cose — chat ai soli follower, modalità
lenta, Shield Mode — e si segna **quali ha acceso lui**, per non spegnere al
ritorno in pace quello che lo streamer aveva acceso per conto suo. Quel
foglietto stava in memoria. Se il processo moriva a scudo alzato, il bot al
riavvio tornava in pace *e il canale restava chiuso*: non era rimasto nessuno
che sapesse riaprirlo. Lo streamer se lo trovava così finché non se ne
accorgeva da solo.

Nel codice c'era anche scritto il ragionamento sbagliato, in due posti:

> «tenuto IN MEMORIA: è legato alla diretta e non ha senso farlo sopravvivere
> ai riavvii» (giveaway)

> «se il processo cadesse a metà attacco, il canale non resterebbe in assetto
> per sempre — al riavvio è di nuovo in pace, per costruzione» (scudo)

Il secondo è vero per la *postura del bot* e falso per lo *stato del canale su
Twitch*. Il primo confonde la fine della diretta con la fine del processo.

## La regola

Una cosa **resta** se perderla toglie a una persona qualcosa che si era già
guadagnata, oppure lascia il mondo cambiato senza più nessuno che sappia
rimetterlo a posto.

Tutto il resto è **volatile**, e va bene così: cache, connessioni, finestre di
pochi secondi, cooldown. Un cooldown perso vale un effetto in più subito dopo
un deploy; scriverlo costerebbe una scrittura a ogni comando.

Su 55 stati vivi in `src/`, quattro restano.

## La casa comune

Una tabella sola, `stato_vivo`: `channel` + `chiave` → un JSON che il motore si
è scritto da sé. Nessuno legge il JSON di un altro.

```
statoVivo.leggi(channel, chiave)
statoVivo.scrivi(channel, chiave, dato)
statoVivo.togli(channel, chiave)
statoVivo.tutti(chiave, piuVecchieDi)   // per rimettere in piedi i motori all'avvio
```

`piuVecchieDi` è il dettaglio che evita il difetto opposto: un giveaway aperto e
dimenticato tre settimane fa non va riaperto, va dimenticato. Le righe scadute
si buttano mentre si leggono.

Le quattro chiavi in uso:

- `giveaway` — premio, moltiplicatori, partecipanti coi loro biglietti.
- `penitenza` — le sfide in corso col loro contatore. Quelle scadute mentre il
  bot era giù le conclude lo sweep al primo giro: la sfida finisce, con qualche
  minuto di ritardo. Scadute da più di un'ora si lasciano perdere, perché
  annunciare la penitenza di ieri sera è rumore.
- `serranda` — cosa riaprire. All'avvio **non si riprende l'allarme**: il bot
  non ha nessuna prova che l'attacco sia ancora in corso, e tornare in pace è
  giusto. Si riapre e basta. La riga si toglie solo a riapertura riuscita: se
  Twitch non risponde si riprova al riavvio dopo, invece di dimenticarsene.
- `ritmo` — il ritmo abituale dei follow, che il canale impara in trenta follow.
  In memoria non ci arrivava mai: fra una pubblicazione e l'altra un canale
  piccolo trenta follow non li fa, quindi la soglia adattiva restava per sempre
  quella dichiarata e tutto il ragionamento sul «ritmo abituale» non entrava mai
  in funzione. L'ultimo istante non si salva: l'intervallo a cavallo di un
  riavvio non vuol dire niente.

## Il cancello

`scripts/verifica-riavvio.mjs`. L'inventario si legge **dal codice** — ogni
`Map`/`Set` di modulo e ogni `this.x` di un motore. L'elenco scritto a mano
porta solo il **verdetto** e il **perché**. Così non è una copia del codice che
invecchia: il codice dice cosa c'è, l'elenco dice cosa ne abbiamo deciso.

Rosso se: uno stato nuovo compare senza verdetto; una voce dell'elenco non
esiste più; qualcosa dichiarato «resta» sta in un file che non conosce
`statoVivo`; un verdetto è senza motivo.

L'autoprova aggiunge uno stato finto e il cancello deve vederlo.

## Le prove

`test/unita/riavvio.test.mjs` — il riavvio si simula per davvero: un modulo
importato con una chiave diversa, o un motore nuovo, che è esattamente quello
che succede a un deploy.

Otto prove, e non sono verdi per caso: cinque mutazioni del codice (non salvare
chi entra, non riprendere le penitenze, non riaprire la serranda, dimenticare
una serranda non riaperta, non rileggere il ritmo) le fanno diventare rosse una
per una.

---

# Andarsene (cancellazione dell'account)

`src/features/cancella.js`, rotte `/api/streamer/resti` e
`/api/streamer/cancella`, sezione **Stato → Andarsene**.

L'elenco delle tabelle si ricava dallo schema, dallo stesso posto da cui lo
ricava l'esportazione (`tabelleDiCanale`): una tabella nuova viene cancellata da
sola. Stessa idea per i file, che non hanno un elenco di cartelle da tenere
aggiornato — si prende ogni `data/<qualcosa>/<login>` che esiste.

## Quello che si vede prima di premere

La prima versione mostrava il conto così com'era: *«1857 righe in 33 tabelle.
messages (1044), user_memories (136), knowledge (124), diario (100), quotes
(78), voce_streamer (60)»*. È lo schema del database messo davanti a uno
streamer. `voce_streamer` non vuol dire niente per chi trasmette, e nemmeno
«righe» e «tabelle».

Adesso le tabelle che hanno un nome nella testa di una persona ce l'hanno
(`messaggi della chat ricordati`, `ricordi sulle persone`, `cose che il bot sa`,
`pagine di diario`, `citazioni`, `trascrizioni della tua voce`…), e tutte le
altre finiscono in «e il resto delle tue impostazioni». Non è solo cortesia: è
anche il modo di non far uscire una parola da programmatore quando domani
qualcuno aggiunge una tabella. Il conto totale resta giusto comunque, perché le
non nominate si sommano nel mucchio.

La zona ha il contorno d'inchiostro come tutto il resto e un dorso rosso a
sinistra (`.zona-pericolo`): si legge come un avviso, non come un link.
