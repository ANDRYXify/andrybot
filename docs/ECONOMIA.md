<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# L'economia delle monete

Chiesto così: «rendere i punti più personalizzabili, con modi per perderli, modi per non avere
la crescita automatica, una gestione intelligente di quando dare o no, il blocco dopo un tot di
lurk, e tutto quello che manca».

Qui sta il modello, prima del codice. I collaudi lo confermano, non lo sostituiscono.

## Com'è adesso

Le monete entrano da quattro porte, e ognuna decide da sola:

| porta | dove | quando |
|---|---|---|
| messaggio | `games.accredita` | a ogni messaggio, una volta al minuto per persona, anche a canale spento |
| presenza e partecipazione | `games.giroMonete` | ogni cinque minuti, in diretta, a chi è nella lista di Twitch |
| serie di presenze | `presenze.giroDiretta` | una volta per diretta, a chi c'è da dieci minuti |
| giochi, negozio, moduli, importazioni | i loro file | quando qualcuno gioca, compra, o lo streamer lo decide |

Escono solo giocando, comprando o con un Modulo.

### I difetti, prima delle richieste

1. **I bot guadagnano.** `giroMonete` riceve la lista di Twitch così com'è. Dentro ci sono i
   bot di servizio e i bot che stanno in chat a guardare: lo scudo ha la lista di quelli noti
   (decine di migliaia di nomi), le ore guardate ne hanno un'altra scritta a mano, il muro delle
   emote una terza. Le monete nessuna. Un bot che guarda sempre prende la presenza a ogni giro,
   sale in classifica, e può pescare il premio VIP.
2. **La crescita automatica non si spegne.** Si possono mettere a zero i numeri uno per uno, ma
   non c'è un «le monete si guadagnano solo giocando, coi premi e con gli eventi».
3. **Il lurk cala ma non si ferma.** Il calo è in frazioni per giro («0,15»), e per fermarlo del
   tutto bisogna sapere che «Non scende sotto 0» vuol dire zero. Non c'è «dopo un'ora di silenzio
   smetti di guadagnare». E il conto dei giri sta in memoria: a ogni riavvio chi era in lurk
   riparte pieno.
4. **Non si perde niente.** Né chi sparisce per mesi, né chi prende un timeout o un ban. La moneta
   si gonfia e basta.
5. **Nessun tetto.** Né per diretta né sul saldo.
6. **Un messaggio vale come un altro.** «!slot» guadagna come una frase, e anche lo stesso «ok»
   ripetuto.
7. **Nessun registro.** Quando le monete calano per una regola, nessuno sa dire perché.

## Il modello

### Una porta sola per le monete che arrivano da sole

Tutto quello che arriva **senza che nessuno lo decida in quel momento** (messaggio, presenza,
partecipazione, serie, e poi gli eventi) passa da una funzione sola, `economia.riceve`. Le regole
stanno lì, in un ordine fisso, e nessuna fonte le può saltare perché nessuna fonte scrive
direttamente sul saldo.

L'ordine è il progetto:

1. **Chi è.** Un bot non riceve mai: bot di servizio, bot noti dello scudo, nomi da bot, la sua
   lista «Blocca sempre». Non è un'impostazione, un bot non è pubblico. Poi la lista di chi lo
   streamer ha escluso a mano.
2. **La fonte è accesa?** La crescita automatica si accende o si spegne tutta insieme, e ogni
   fonte ha il suo numero (zero la spegne).
3. **Il messaggio conta?** I comandi, lo stesso messaggio ripetuto e quelli più corti di N
   lettere si possono escludere. La definizione è una sola e vale ovunque: un messaggio che non
   conta non paga, non vale come partecipazione al giro e non interrompe il silenzio. Altrimenti
   chi scrive «!monete» ogni cinque minuti resterebbe a quota piena senza partecipare.
4. **Il silenzio.** Quanto vale la presenza di chi è in chat e sta zitto: piena per i primi
   minuti, poi cala fino a un minimo, e dopo un tempo scelto si ferma. Riprende piena appena
   scrive. Il conto è in minuti, sta nel database (sopravvive ai riavvii) e riparte quando la
   persona esce dalla chat e ritorna.
5. **I moltiplicatori.** Abbonati, VIP, e l'«ora doppia» a tempo.
6. **I tetti.** Al massimo N monete automatiche per persona per diretta, e nessuno supera un saldo
   massimo con le monete automatiche. Il tetto taglia la quota a quanto manca, non la butta.
7. **Si scrive.** Saldo, guadagno della diretta, ultimo segno di vita.

Giochi, negozio e Moduli **non** passano dalla porta: sono scambi decisi da qualcuno (punto,
compro, il Modulo dà 50 monete), non crescita. Se lo streamer scrive un Modulo che dà monete, le
dà.

### Le monete che si perdono

Le perdite sono regole, e ogni perdita finisce nel **registro**, col motivo e un tasto «Annulla»
che rimette esattamente quello che è stato tolto.

- **La moderazione.** Twitch manda in chat (IRC) un `CLEARCHAT` per ogni timeout e ban e un
  `CLEARMSG` per ogni messaggio cancellato: vale per quelli dei moderatori e per quelli del bot,
  senza permessi in più. Una sorgente sola, quindi nessuna punizione contata due volte. Si
  sceglie quanto si perde: timeout, una parte (in percentuale) o un numero fisso; ban, tutto o una
  parte; messaggio cancellato, un numero fisso.
- **L'assenza.** Chi non si vede da N giorni perde il X% a settimana, e dopo M giorni le monete
  scadono del tutto (se lo streamer lo sceglie). «Vedersi» è scrivere o essere nella lista di chi
  è in chat: giocare o ricevere una penalità non azzera l'assenza.
- **Le stagioni.** Ogni mese o ogni tre mesi le monete ripartono da zero, o da una parte di quelle
  che si avevano. La classifica finale resta nell'archivio, e il bot può annunciare i primi.

### Il registro

Una tabella sola (`points_mov`): canale, persona, quanto, motivo, chi l'ha deciso, quando. Ci
vanno le perdite, gli eventi, i movimenti a mano dello staff e del pannello, le stagioni, le
importazioni. Non ci vanno il guadagno di ogni giro né i giochi: sono migliaia al giorno e non
servono a rispondere a «perché ho perso monete». Si tiene novanta giorni.

## Il piano

### Fase 1: chi riceve e quando (fatta)

- `src/features/economia.js` è la porta: `riceve` (una quota a una persona), `messaggio` (un
  messaggio in chat) e `giro` (un giro di presenza, scritto in una transazione sola). Le funzioni
  pure stanno in `src/features/economia-regole.js`: le usano la porta, il server quando salva
  (`normalizza`), il manuale per i suoi numeri e il pannello per i conti di una diretta: il
  server gli dà quel file com'è, senza commenti (`/js/economia-regole.js`, come il disegno della
  carta). Il pannello non ha una copia dei conti: ha gli stessi.
- Un solo «è un bot?» (`antibot.eBot` ed `ePersona`): lo usano monete, ore guardate, serie di
  presenze e saluti. Prima le ore guardate e le presenze conoscevano solo i bot di servizio, e i
  bot spettatori accumulavano ore e serie. Le liste scritte a mano (scudo, ore guardate, muro)
  sono diventate una, `BOT_DI_SERVIZIO`. Lo streamer resta l'ultima parola per dire «questo non è
  un bot»: gli esentati dello scudo.
- `points`: colonne nuove `visto`, `zitto_giri`, `zitto_ts`, `diretta`, `guadagno_diretta`.
- Impostazioni (tutte spente o uguali a oggi, così un canale che non tocca niente non cambia):
  crescita automatica accesa, messaggi anche a canale spento, esclusi, comandi che non contano,
  ripetuti che non contano, lunghezza minima, silenzio (pieno per, cala fino a, si ferma dopo),
  tetto per diretta, saldo massimo, ora doppia.
- `!doppio [minuti] [volte]` e `!doppio stop` per lo staff, e il tasto nel pannello. L'ora doppia
  sta in `stato_vivo`, non nelle impostazioni: salvare il pannello non la spegne.
- Il pannello: la carta «Punti & classifica» diventa «L'economia delle monete», con le parti
  «Da dove arrivano», «A chi no», «Quando smettono», e accanto i conti di una diretta tipo.

### Fase 2: come si perdono

- `CLEARCHAT` e `CLEARMSG` nella chat IRC, `economia.punisci`.
- Il giro dell'assenza, una volta al giorno.
- Le stagioni con l'archivio.
- Il registro, con «Annulla», e la sezione «Come si perdono» nel pannello.

### Fase 3: eventi e strumenti

- Monete per evento: follow (una volta per persona, mai al ritorno), abbonamento e rinnovo (per
  tier), abbonamenti regalati (a chi regala), bit (ogni cento), raid (a chi lo porta), primo
  messaggio di sempre. Tutto a zero di partenza, e tutto passa dalla porta.
- `!monete dai|togli|imposta @nome N` per lo staff, nel registro con chi l'ha fatto.
- Le monete in circolazione: quante ce ne sono, quante ne sono entrate e uscite questa settimana.

## Le prove

- Unità: la porta in ogni ordine di regole, i bot che non ricevono, il silenzio che si ferma e
  riparte, i tetti che tagliano senza superare, il riavvio che non azzera il silenzio.
- Contratto: nessuna fonte automatica scrive sul saldo senza passare dalla porta (si cerca
  `points.add` nei file delle fonti); il pannello usa le funzioni del motore per i suoi conti.
- Mutazioni: rimettere la lista grezza in `giroMonete` deve far tornare rosso il collaudo dei bot.
