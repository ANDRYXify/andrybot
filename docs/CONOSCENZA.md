# Quello che il bot sa — e che decide lo streamer

## Tre materie diverse, non una

Sembrano tutte «cose che il bot sa», ma rispondono a domande diverse, e per
questo stanno in posti diversi e arrivano al prompt in blocchi diversi.

| materia | risponde a | dove si scrive |
|---|---|---|
| **La scheda** | *chi è lo streamer* | Conoscenza → «La tua scheda» |
| **La conoscenza** | *cosa deve saper rispondere* | Conoscenza → domanda/risposta |
| **Le linee guida** | *come deve comportarsi* | Personalità → Linee guida |
| **Il quaderno** | *come rispondere in situazione* | Conoscenza → «Il quaderno» |

Vanno tenute separate. Un fatto messo fra le regole il bot lo esegue; una regola
messa fra i fatti la racconta in chat.

## I difetti che questo chiude

**1. La conoscenza arrivava per data.** Al cervello andavano le prime sei voci in
ordine di inserimento (`slice(0, 6)`). Chi ne scriveva quaranta ne vedeva usare
sei, sempre le stesse, e non se ne accorgeva: il bot rispondeva comunque. Ora le
voci si ordinano per quanto c'entrano col messaggio, e le fissate entrano
sempre.

**2. Le tue frasi non arrivavano.** «Le tue frasi / battute» esisteva da sempre
nella personalità, con scritto sotto che il bot le avrebbe usate per suonare come
te. Nessuno le mandava al cervello: lo stile veniva solo dalla voce in diretta e
dai messaggi in chat. Ora vengono per prime, perché sono le uniche che hai
scelto tu.

**3. Non c'era modo di dire «questo solo in diretta».** Il codice sconto vale
finché sei live; l'orario della prossima diretta serve quando sei offline. Ora
ogni voce ha un **quando**.

**4. Non c'era modo di dire «questo di me non dirlo».** Ora c'è, ed è nel blocco
delle regole del canale — quello che nel prompt sovrasta tutto il resto.

## La scheda

Sei campi corti, sempre presenti nel prompt in un blocco loro. Non competono con
la conoscenza: sono il fondo su cui tutto il resto si appoggia.

- **chi sei** — due righe, come ti presenteresti
- **cosa fai in diretta** — il contenuto, non il curriculum
- **quando sei live** — gli orari, come li diresti a voce
- **dove ti trovano** — social e sito. Il bot lo riporta alla lettera, così gli
  indirizzi restano giusti.
- **come chiamarti** — il nome con cui parla di te in chat
- **cosa non dire mai di te** — finisce fra le regole, non fra i fatti

## Come si sceglie cosa entra nel prompt

1. Si scartano le voci fuori tempo (`quando` che non corrisponde a live/offline)
   e quelle imparate dalla chat (sono messaggi veri di altre persone).
2. Le **fissate** entrano per prime, sempre.
3. Le altre si ordinano per punteggio: parole in comune con il messaggio diviso
   parole della voce, con un bonus alle parole lunghe (più distintive).
4. Si taglia a sei.

Lo stesso punteggio decide anche la scorciatoia: se una voce c'entra molto
(≥ 0.5) il bot la usa come risposta e la riformula. Se contiene un link esce
identica.

## La sua pagina link, letta viva

Su `/u/<login>` lo streamer ha già scritto quello che il bot dovrebbe sapere:
titolo e sottotitolo, i blocchi di testo, i link e i social con la loro
etichetta, i conti alla rovescia — e i blocchi **FAQ**, che sono già domande e
risposte fatte da lui.

Prima il bot ne vedeva solo i link, e li vedeva come li aveva trovati il
pre-addestramento: una fotografia vecchia di settimane, mentre la pagina lui la
cambia di continuo.

Ora `_vociDallaPagina` la legge **al momento della risposta** e ne ricava voci
di conoscenza che entrano nella stessa graduatoria delle altre. Non sono
salvate da nessuna parte: sono una lettura, non una copia. Percio' non hanno un
id, nella dashboard si vedono ma non si cancellano (si cambia la pagina), e il
pre-addestramento non le duplica piu' nel database — copiarle voleva dire avere
due verità, e quella copiata invecchiava dal giorno dopo.

Una pagina spenta non parla: se non è pubblica, il bot non la usa.

## Il quaderno

È il file del bot: quello che gli è stato insegnato a **fare** (non a sapere).
Lo scrivi tu, e — quando vivrà — ci scriverà anche Lia. In elenco vedi da chi
viene ogni riga, e puoi toglierne una che non ti convince, anche se l'ha messa
lei. Il perché del verso unico sta in `docs/BOT-E-LIA.md`.

## Due dettagli che stanno solo qui

**L'ambito si cambia sul posto.** Nell'elenco, «quando» è un menù e «fissata» un
bottone. Sbagliare il quando capita spesso, e se per correggerlo bisogna
riscrivere la voce intera non lo corregge nessuno.

**Le righe del quaderno che valgono ovunque si vedono ma non si tolgono dalla
dashboard.** Non appartengono a quel canale: le ha messe chi tiene il sito, o
Lia. Il bottone «Togli» compare solo dove funziona davvero.
