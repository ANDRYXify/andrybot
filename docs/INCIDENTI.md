<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# Gli incidenti: un attacco è una cosa sola

## Il problema

Il registro c'era già, e non bastava. Dopo un'ondata restavano quattrocento
righe in fila — «bloccato», «bloccato», «assetto», «bloccato» — e per capire
cos'era successo bisognava rimetterle insieme a mano ogni volta.

Le domande sono sempre queste sei:

1. quando è cominciato;
2. quanto è durato;
3. quanto forte è andato;
4. chi c'era dentro;
5. cosa abbiamo fatto;
6. quanto ha funzionato.

Sono domande a cui si risponde **mentre succede**, non ricostruendo dopo. Quindi
un attacco diventa un oggetto, che si apre quando l'assetto sale, si chiude
quando si torna in pace, e nel mezzo si riempie da solo.

## Si riapre

Un attacco che riprende sette minuti dopo non è un attacco nuovo: è lo stesso
che respira. Se aprissimo un incidente ogni volta, un'ondata a ondate
diventerebbe dieci incidenti da niente invece di uno grosso — e il conto dei
danni sarebbe sbagliato in tutti e dieci.

La soglia è **quindici minuti**. Sotto, si riapre quello di prima e si conta la
riapertura. Sopra, è un attacco nuovo. E se le due facce sono diverse — prima
un'ondata di follow, poi un coro — il tipo diventa `misto`, che è la verità.

## Chi c'era ha un giudizio

`certo`, `sospetto`, `legittimo`. Non è un dettaglio: **serve alla bonifica**.

Erano quattro, con un `probabile` fra sospetto e certo: non lo scriveva nessuno,
e il registro lo contava sempre a zero. Un giudizio che nessuno può dare è una
casella vuota che sembra un numero, e se n'è andato.

Chi è arrivato durante un attacco non è per ciò stesso un bot. Dentro un'ondata
ci finisce anche gente vera, ed è quella che non si deve toccare dopo, quando si
ripulisce. Per questo chi arriva mentre l'assetto è alto e non ha nessun segnale
contro resta scritto come **legittimo**, e chi arriva mentre l'ondata è già
giudicata artificiale resta **sospetto** — non condannato.

Un giudizio più grave sostituisce uno più lieve, mai il contrario: durante un
attacco si scopre, non si dimentica.

## Le azioni si contano, gli eventi si raccontano

Quattrocento righe «bloccato» in una timeline non raccontano niente; un numero
sì. Quindi le azioni dell'esecutore (blocca, ban, timeout, cancella, limita)
diventano un conteggio con dentro quante sono andate, quante sono fallite e
quante sono rimaste a vuoto. Gli eventi salienti — l'assetto che sale, la
raffica, il coro, il blocco di massa — vanno in timeline, perché sono quelli che
rispondono a «cos'è successo e quando».

Tutto passa da un punto solo, `registra()`, che è già l'unico posto da cui passa
ogni intervento. L'incidente si riempie da lì e nessuno deve ricordarsi di
aggiornarlo.

Un conto a parte: i **follow taciuti** (`taciuti`, `segnaTaciuto`). Da attacco in
su un follow non si festeggia e non entra nel rapporto né nelle statistiche
(docs/SCUDO.md): l'incidente è l'unico posto dove resta, come numero. Chi era, se
lo scudo l'ha giudicato, lo dicono già i coinvolti.

## Il picco

Dice **quanto è stato grave**, non com'è adesso: si aggiorna solo se si sale.
Un attacco che arriva a novanta e poi cala a venti è stato un attacco da
novanta.

Il picco tiene il livello, il punteggio d'attacco e i segnali che erano accesi
in quel momento (raffica, ondata artificiale, coro, onda lenta), così il
rapporto dice anche *perché* è salito. Il confronto si fa sull'ordine dei
livelli, non sull'ultimo arrivato: prima un attacco ripreso più in basso, alla
riapertura, abbassava il picco, e un attacco da serrata finiva scritto come
attacco da allerta.

## Il rapporto dell'attacco

Il registro dice cosa è stato fatto a ciascuno; il rapporto dice **cos'è
successo**. È una funzione pura (`rapportoAttacco`, in
`src/features/rapporto-attacco.js`) che legge l'incidente e le righe del
registro di quell'attacco, e restituisce:

- **la testata**: tipo, quando, quanto è durato, il picco, se è ancora in corso,
  quante volte si è riaperto;
- **il racconto**, in frasi, nelle tre lingue del sito: le stesse frasi vanno
  nel pannello, su Telegram e nella mail;
- **i numeri**: follow arrivati, account tolti, chi c'era per giudizio, follow
  taciuti, azioni fallite, raid;
- **la curva**: follow arrivati e account tolti minuto per minuto, coi minuti
  vuoti a zero (una curva coi buchi mente sulla forma). Oltre le dodici ore i
  minuti si raggruppano, per stare sotto i settecentoventi punti;
- **la scala**: ogni cambio di livello, in salita e in discesa, con quanto è
  durato ciascuno;
- **chi c'era**, con l'azione più forte fatta a ciascuno e il suo esito, in
  ordine: prima i bot certi, poi i sospetti, poi le persone vere;
- la **cronaca** intera e la **bonifica**.

Per farlo l'incidente tiene quattro cose in più, tutte lette con un valore di
serie, così gli incidenti vecchi si aprono lo stesso: `livelli` (la scala),
`curva` (un contatore per minuto, al massimo due giorni), `raid` (al massimo
cinquanta) e `motivo` (la prima ragione, come campo e non solo come testo). Ogni
riga del registro sa di quale attacco è (`incidente`), e `registroDi` le ritrova.

Il tipo si legge **dai segnali**, non dal testo del motivo: il testo cambia
quando cambia una frase, i segnali no. Prima il tipo `onda-lenta` non usciva
mai, perché il motivo diceva «gocciolamento».

Due difetti chiusi strada facendo: la prima raffica si registrava prima che
l'incidente si aprisse, e mancava dalla cronaca; i raid si scrivevano solo con
l'avviso in chat acceso. Ora la raffica entra dopo l'apertura, e un raid grande
(da cinquanta persone in su) si scrive sempre.

Il CSV dei coinvolti disinnesca le celle che un foglio di calcolo prenderebbe
per una formula (`=`, `+`, `-`, `@`): un nome scelto da un attaccante non
diventa un comando aprendo il file.

## Gli avvisi

Un attacco che lo streamer scopre il giorno dopo è un attacco che ha già fatto
il suo danno. Lo scudo quindi avvisa in privato, e solo lui:

- **quando sale** a un livello dalla soglia scelta in su (di serie `attacco`),
  su Telegram nella chat privata col bot e, se lo vuole, per mail;
- **una volta per gradino**: l'incidente ricorda l'ultimo livello avvisato
  (`avvisato`), così un attacco che oscilla fra difesa e attacco non manda un
  messaggio a ogni oscillazione, e se sale ancora lo dice;
- **i raid grandi**, a parte, con la loro levetta;
- **a fine attacco**, il rapporto intero, solo per gli attacchi arrivati alla
  soglia: uno «sto guardando» di due minuti resta nel pannello senza bussare.
  L'incidente segna dove è partito (`rapporto`), e il pannello lo dice.

Le scelte stanno nelle impostazioni dello scudo (`avvisiScudo`) e passano dallo
stesso normalizzatore di tutto il resto: una soglia storta torna a quella di
serie (`calma` vorrebbe dire avvisare sempre, e non si può scegliere), una
levetta si accende solo con un sì vero, e salvare lo scudo non tocca gli avvisi.

Prima c'era un filo morto: lo scudo chiamava un avviso che non andava da
nessuna parte, e il manuale prometteva un avviso sull'overlay che non c'era.

## Il pannello

Lo scudo ha un gruppo suo nel menu, «Scudo e attacchi»: lo scudo, gli attacchi,
il registro. Nella scheda **Gli attacchi** c'è l'elenco, il rapporto di
ciascuno (grafico, scala, raid, chi c'era con «Sblocca», «Sbanna» e «È a posto»,
cronaca, bonifica, CSV), le scelte degli avvisi, e gli altri scudi: quello
d'ingresso di Telegram con i conti degli ultimi sette giorni, e quelli di
Discord.

Il puntino sulla scheda conta gli attacchi arrivati alla soglia nati dopo
l'ultima occhiata, e lo vede solo il proprietario. A pannello aperto una veglia
chiede ogni minuto se ce ne sono di nuovi: un attacco che arriva mentre lo
streamer è da un'altra parte accende il puntino e lo dice. Con la scheda aperta
e un attacco in corso il rapporto si rinfresca ogni venti secondi, tenendo
filtri e ricerca, e si ferma se lo streamer sta scrivendo.

## Il riavvio

Un incidente rimasto aperto si **chiude**, e non si cancella. Il bot non ha
nessuna prova che l'attacco sia ancora in corso — la stessa ragione per cui
l'assetto torna in pace — ma quello che è successo è successo e resta scritto,
con una riga di timeline che dice perché si è chiuso. Se l'attacco continua
davvero, il prossimo allarme lo riapre.

Il numero progressivo si riprende dal disco: sennò dopo un riavvio due attacchi
diversi avrebbero lo stesso nome.

## Dove si vedono

- `GET /api/antibot/attacchi`: l'elenco, le scelte degli avvisi, dove possono
  arrivare, e gli altri scudi.
- `GET /api/antibot/attacchi/:id`: il rapporto intero, il racconto nelle tre
  lingue, la bonifica e dove è partito il rapporto.
- `GET /api/antibot/attacchi/:id/coinvolti.csv`: chi c'era, da scaricare.
- `POST /api/antibot/attacchi/visti` e `GET /api/antibot/veglia`: il puntino.
- `POST /api/antibot/avvisi`: le scelte degli avvisi.
- `GET /api/antibot/incidenti` e `/incidenti/:id`, le porte di prima, restano
  per chi le usa.

Tutte del solo proprietario, e un attacco di un altro canale non si apre
nemmeno conoscendone il numero.
- La console dello scudo riporta l'incidente aperto, se c'è, e mentre i follow
  sono fermi quanti ne sono arrivati senza festa. Il dettaglio di un incidente li
  conta accanto ai giudizi.

Vivono in `data/incidenti.json`. Si tengono centottanta giorni, e al massimo
duecento per canale. Sono nei dati che lo streamer scarica (`attacchi`, e il
registro dello scudo come `registro_scudo`), e se ne vanno con l'account.

## Le prove

`test/unita/incidenti.test.mjs`, dentro `npm test`. Dodici casi, e i due che
contano di più sono la riapertura (un attacco a ondate resta un attacco solo) e
«chi arriva durante un attacco non è per ciò stesso un bot», che è la prova che
protegge la bonifica.

Ogni prova è stata vista rossa rompendo il codice sotto: dodici rotture, dodici
rossi.

`test/unita/rapporto-attacco.test.mjs` prova il rapporto e gli avvisi: il picco
che solo sale, la scala, la curva, i raid, il tipo dai segnali, il registro per
attacco, tre attacchi interi giocati dal simulatore, il racconto nelle tre
lingue, il CSV disinnescato, la soglia, le scelte, il bot che avvisa su un
Telegram finto, l'esportazione e la cancellazione. Ventisette rotture,
ventisette rossi. `test/contratto/attacchi.test.mjs` prova le porte e il
pannello: otto rotture, otto rossi.
