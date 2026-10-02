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

### Il pannello le rilegge

Chi usava la carta «Punti & classifica» la trovava complicata e macchinosa, e aveva ragione per
quattro motivi precisi: i nomi erano quelli di dentro («Presenza (per giro)», «Partecipazione»,
«Nessuno supera»), che non dicono né a chi né ogni quanto; la curva del silenzio erano quattro
caselle slegate, che nessuno riesce a figurarsi; i tetti non dicevano cosa non si supera; il conto
della diretta stava in fondo, lontano dalle caselle che lo decidono.

Le caselle sono le stesse, il modello anche. Cambia come si leggono:

- **Le etichette dicono a chi e ogni quanto**: «Presenza, a tutti quelli in chat», «In più, a chi
  ha scritto», «Abbonati: quante volte tanto», «Presenza intera per i primi (minuti)», «Non
  arrivano più da sole a chi ne ha». La parola «giro» non c'è più: sono 5 minuti.
- **Sotto ogni gruppo di caselle una riga rilegge le regole coi numeri**, mentre si cambiano:
  quanto prende ogni 5 minuti chi scrive (e un abbonato, un VIP), la storia di chi guarda senza
  scrivere, fin dove arrivano i tetti.
- **Le righe sono giuste per costruzione**: non sono un testo scritto a parte, sono `quoteDette` e
  `storiaSilenzio` in economia-regole.js, cioè `quotaGiro` e `fattoreSilenzio` del bot, con i loro
  arrotondamenti. La storia del silenzio è a pezzi `{ minuto, monete }`: dal minuto di silenzio del
  pezzo in poi, ogni 5 minuti arrivano quelle monete (il primo giro senza scrivere è il giro 1,
  come in `economia.giro`). Il fattore non cresce mai, quindi i pezzi scendono soltanto; dopo
  l'ultimo giro in cui può ancora cambiare (fine della presenza intera, passi fino al minimo,
  fermo) resta uguale. È così che la riga dice la cosa che prima non si vedeva: con 1 di presenza
  il «minimo 15%» fa zero, e chi sta zitto non prende più niente dal minuto 55.
- **Il conto della diretta di due ore sta subito sotto i tetti**, accanto alle caselle che lo
  decidono, non dopo le durate e l'ora doppia.

Le prove: `test/unita/economia.test.mjs` fa girare il bot vero giro per giro per sette regole
diverse e confronta ogni giro con la storia del pannello (e chi scrive, l'abbonato e il VIP con
un giro del bot); `test/contratto/punti-detti.test.mjs` controlla le frasi esatte, che si rifanno
a ogni tasto prima della chiamata al server, che i nomi di dentro non ci sono più e l'ordine delle
sezioni. Mutazioni: la storia che si ferma prima del fermo, i minuti sfasati di un giro, il primo
giro zitto contato come zero, abbonato e VIP scambiati, i primi minuti detti uno di troppo, lo
zero finale non detto, le righe che non si rifanno.

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

### Quanto durano le monete

Chiesto così: «monete che, guadagnate in un dato modo, rimangono per una settimana, altre un
mese, altre un anno: col negozio è meglio evitare che ne abusino».

**Una moneta ha una data di scadenza, e la prende quando nasce.** Nasce in un posto solo (il
modo in cui si guadagna) e da lì prende la sua durata. Poi si muove (si punta, si ruba, si
regala, si spende, torna con un rimborso) e la data resta la sua. Così la scadenza non si può
allungare spostando le monete: chi ne ha di quelle che durano una settimana non le trasforma
in monete che durano un anno.

I modi in cui una moneta nasce, e la durata la sceglie lo streamer per ognuno:

| da dove | cosa c'è dentro |
|---|---|
| stando in chat | messaggi, presenza, partecipazione, serie di presenze (la porta, `economia.riceve`) |
| giocando | quello che un gioco dà in più: la vincita oltre la posta, i premi delle manche, del boss, dell'arena, la pesca |
| premi e Moduli | quello che dà un Modulo (e poi gli eventi: follow, abbonamenti, bit, raid) |
| dallo staff | quello che lo staff dà a mano, e le monete importate da un altro bot |

Le durate: **non scadono** (di partenza, per tutte: un canale che non tocca niente non cambia),
**dopo** una settimana, un mese, tre mesi, un anno (a fine giornata, nel fuso del canale), oppure
**a fine** settimana, mese, stagione (marzo, giugno, settembre, dicembre) o anno. «Dopo» è più
giusto (ognuno ha lo stesso tempo), «a fine» è un appuntamento per tutti (la stagione che chiude).

**Le monete si tengono a lotti**: (canale, persona, scadenza, quante). Due lotti con la stessa
scadenza sono lo stesso lotto, e la scadenza è sempre un confine di giornata: una persona che
guadagna ogni giorno per un anno ha al massimo un lotto al giorno. Il saldo di sempre
(`points.monete`) resta, ed è per costruzione la somma dei lotti che valgono: lo scrivono solo le
funzioni dei lotti, nella stessa transazione.

Le regole che stanno nella forma, non nella buona volontà di chi chiama:

- **si spende prima quello che scade prima.** Nessuno perde monete che avrebbe potuto spendere;
- **spendere dà una ricevuta**: quali lotti e quante. Un rimborso (il negozio, la mano di
  blackjack interrotta da un riavvio) rimette esattamente quei lotti, con le loro date;
- **una puntata torna con la sua data**: la posta vinta torna coi lotti che erano stati puntati,
  e solo la parte in più nasce «giocando». Un duello, un furto, una patata passano i lotti da una
  persona all'altra così come sono;
- **le monete di prima non scadono**: entrano come un lotto senza scadenza, perché sono state
  guadagnate con regole che dicevano così. Se lo streamer vuole dare una data anche a quelle, lo
  fa con un tasto, sapendo cosa fa: tutte le monete senza scadenza del canale prendono quella data;
- **una moneta scaduta non c'è**: non si spende, non conta in classifica, da mezzanotte in punto.
  Non c'è un giro a tempo che arriva dopo: ogni lettura del saldo (il gioco, la classifica, il
  negozio, il pannello) passa prima dalle scadenze e toglie dal saldo i lotti scaduti. Con niente
  di scaduto è una lettura sola sull'indice delle scadenze.

**Chi guarda lo sa.** `!monete` dice anche quante ne scadono per prime e quando («120 scadono
domenica», «l'8 ottobre»: valgono fino alla fine di quel giorno, nel fuso del canale). Per ora in
italiano, come il resto delle risposte dei giochi. Il pannello mostra, accanto alle durate, fino a
quando varrebbe una moneta guadagnata adesso, e quante monete del canale non scadono, con il tasto
per dar loro una data.

Con la durata il negozio non si svuota in un giorno da chi ha accumulato per mesi: lo streamer
decide quanto può durare un accumulo, per ogni modo di guadagnare.

### Per giocare bisogna esserci

Chiesto così: «un modo per evitare che vengano spammati giochi e basta, senza interazioni vere
con la streamer, oltre ai cooldown».

Un'attesa (cooldown) dice *quanto spesso* si gioca, non *chi* gioca: chi sta in chat solo per
`!slot` ogni minuto la rispetta e non ha mai detto una parola. La regola giusta lega il gioco
alla partecipazione: **per giocare bisogna aver parlato**.

**L'interazione vera ha già una definizione, e resta una**: il messaggio che conta per le monete
(`contaMessaggio`: non lo stesso messaggio ripetuto, con le lettere minime scelte), e in più mai un
comando, qualunque cosa dica la regola delle monete: un comando non è parlare con la streamer, e
`!slot` si pagherebbe da solo. Un secondo criterio vorrebbe dire due risposte diverse alla stessa
domanda.

**La regola**: ogni messaggio che conta mette da parte un passo; un gioco costa N passi («un
gioco ogni N messaggi»); se ne tengono al massimo N × M (si accumulano M giochi, non di più).
Con N = 0 la regola è spenta, ed è così di partenza: un canale che non tocca niente non cambia.

- **Cosa è un gioco**: un comando delle famiglie dei giochi che apre una partita (un gruppo
  dell'elenco in chat: da solo, contro qualcuno, tutti insieme, con la webcam). Non lo sono le
  mosse di una partita già aperta (`!accetta`, `!carta`, `!stai`), il saldo, la classifica,
  le coccole.
- **Chi non c'entra**: lo streamer e lo staff (aprono le partite per tutti), e i comandi che
  solo lo staff può usare.
- **Chi non ha passi** non gioca, e il bot glielo dice una volta ogni tanto (non a ogni
  tentativo, sennò lo spam lo fa il bot), con una riga della voce del canale che dice quanti
  messaggi mancano.
- I passi stanno nel database (`points.parlato`): un riavvio non li azzera e non li regala.
- **Si controlla prima, si paga dopo**, come le attese (docs/GIOCHI.md): `aspetta` guarda se i
  passi ci sono, e la partita si paga quando si gioca davvero (`giocato` col messaggio, o `entra`
  per il colpo, la corsa e la patata, che si chiudono dopo). Un comando scritto male, o un gioco in
  attesa, non costano niente.
- Chi non ha passi se lo sente dire una volta, e di nuovo solo quando il numero cambia (dopo un
  messaggio che conta): chi riprova e basta non fa parlare il bot.

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

- La durata delle monete (sopra, «Quanto durano le monete»): i lotti, la ricevuta, la puntata
  che torna con la sua data, il giro delle scadenze, `!monete` che le dice, e nel pannello la
  parte «Quanto durano».
- `CLEARCHAT` e `CLEARMSG` nella chat IRC, `economia.punisci`.
- Il giro dell'assenza, una volta al giorno.
- Le stagioni con l'archivio.
- Il registro, con «Annulla», e la sezione «Come si perdono» nel pannello.

- «Per giocare bisogna esserci»: i passi messi da parte dai messaggi che contano, spesi dai
  giochi; la riga della voce per chi non ne ha; nel pannello «Un gioco ogni N messaggi».

### Fase 3: eventi e strumenti

- Monete per evento: follow (una volta per persona, mai al ritorno), abbonamento e rinnovo (per
  tier), abbonamenti regalati (a chi regala), bit (ogni cento), raid (a chi lo porta), primo
  messaggio di sempre. Tutto a zero di partenza, e tutto passa dalla porta.
- `!monete dai|togli|imposta @nome N` per lo staff, nel registro con chi l'ha fatto.
- Le monete in circolazione: quante ce ne sono, quante ne sono entrate e uscite questa settimana.

## Le prove

- La durata: si spende prima quello che scade prima; un rimborso rimette i lotti della ricevuta;
  una puntata vinta torna coi suoi lotti e solo il guadagno nasce «giocando»; un furto passa i
  lotti; una moneta scaduta non si spende e non conta; le monete di prima non scadono; il saldo è
  sempre la somma dei lotti che valgono; nessuno scrive `points.monete` fuori dalle funzioni dei
  lotti (contratto sul codice). Mutazione: spendere dall'ultima che scade deve far tornare rosso.

- Unità: la porta in ogni ordine di regole, i bot che non ricevono, il silenzio che si ferma e
  riparte, i tetti che tagliano senza superare, il riavvio che non azzera il silenzio.
- Contratto: nessuna fonte automatica scrive sul saldo senza passare dalla porta (si cerca
  `points.add` nei file delle fonti); il pannello usa le funzioni del motore per i suoi conti.
- Mutazioni: rimettere la lista grezza in `giroMonete` deve far tornare rosso il collaudo dei bot.
