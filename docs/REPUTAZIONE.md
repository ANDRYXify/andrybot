# La reputazione: quello che il canale sa già di te

## Il buco che questo modulo chiude

Tutto il resto dello scudo guarda indizi **contro**: quanto è vecchio
l'account, com'è fatto il nome, in quanti canali sta insieme, con che cadenza
è arrivato. Sono tutti segnali che sommano, e non ce n'è uno che sottragga.

Con solo indizi contro basta un'euristica infelice — un nome che somiglia a
quelli di una fabbrica, un profilo lasciato spoglio — e chi scrive in quel
canale da otto mesi finisce nel mucchio insieme ai bot. Perderlo costa più di
quanto valga il bot che si è preso: un fan bannato non torna, e non sa nemmeno
perché.

Qui c'è la parte che mancava. Nessun archivio nuovo: quello che serve è già
scritto — i messaggi in chat, gli incidenti, i giudizi che lo scudo ha dato
mentre l'attacco succedeva. Si rilegge e si mette insieme.

## Il decadimento, che è il motivo per cui è un modulo a sé

Un account segnalato per errore due anni fa non deve pesare come uno segnalato
ieri. La memoria di un torto che non svanisce non è memoria: è una condanna.

Quindi i fatti **negativi perdono forza col tempo** — metà del peso ogni
novanta giorni — e quelli **positivi no**. Essere qui e aver parlato si
accumulano, e non scadono.

Novanta giorni è la scelta: abbastanza perché un precedente di questo mese
conti, abbastanza poco perché uno dell'anno scorso sia praticamente sparito.
Dopo un anno resta il 6% del peso iniziale, cioè niente.

## I pesi

|  | peso | scade |
|---|---|---|
| quanto ha scritto qui | 30 | no |
| da quanto tempo è qui | 20 | no |
| lo scudo l'ha già fermato qui | −35 | sì |
| c'era durante un incidente | −15 | sì |

Il tetto e il fondo non sono scelti: sono la somma di quello che si può
guadagnare (**50**) e di quello che si può perdere (**−50**). Scriverli a mano
vorrebbe dire tenere lo stesso fatto in due posti, e il giorno che qualcuno
tocca un peso uno dei due comincia a mentire in silenzio.

Il volume da solo non basta. Quattrocento messaggi scritti in un'ora sono un
motivo di sospetto, non di fiducia: il conteggio cresce come un logaritmo e si
ferma presto, mentre il tempo di presenza cresce a parte. Serve **l'una e
l'altra cosa**.

### Il badge non c'è, e non è una dimenticanza

«Abbonato, VIP o moderatore» sarebbe il segnale di fiducia più forte che esista,
perché lo dà lo streamer in persona. Vive però sui **badge di un messaggio**, e
questo modulo viene interrogato su chi un messaggio non l'ha ancora scritto: chi
segue, e chi guarda e sta zitto.

Tenerlo nella tabella lo stesso vorrebbe dire un peso che nessuno può
alimentare, e un tetto di fiducia che nessun account reale può toccare — un
numero che descrive una cosa che non succede. Torna il giorno che qualcuno lo sa
dire davvero.

## Da fiducia a punti

Dodici punti di fiducia valgono un punto di rischio, con il segno. La scala che
ne esce va da **+4 a −4**. Che i due estremi si pareggino è una conseguenza dei
pesi di oggi, non una regola: il codice divide e basta, e se domani un peso
cambia la scala diventa storta, come dev'essere.

«Di casa» vuol dire **circa trenta messaggi e due mesi**: è il punto in cui lo
sconto arriva a 4, cioè al massimo della scala, ed è la soglia sotto la quale
durante un'ondata si viene toccati come tutti. Essere di casa è il massimo che
un canale possa dare, e va guadagnato tutto.

Chi ha scritto dieci volte in un anno non ci arriva, ed è giusto: non è un
abituale, è uno di passaggio.

## Perché non può fare danni

La fiducia sposta il numero **in tutti e due i versi**, e in nessuno dei due
può decidere da sola. In `punteggio.js` le famiglie che permettono di AGIRE
sono il nome riconosciuto e la presenza in molti canali insieme; la reputazione
non è fra quelle. Al massimo fa **guardare**.

Questa è la garanzia contro l'anello: lo scudo giudica qualcuno, il giudizio
peggiora la sua reputazione, la reputazione alza il suo rischio. Se il rischio
potesse armare da solo, un errore si confermerebbe da sé, all'infinito. Non
può: serve sempre un fatto indipendente che una persona non può produrre.

E l'asimmetria fra il credito e il debito è voluta. Un abitué con mesi di
presenza e un sospetto della settimana scorsa resta in credito. Uno sconosciuto
che lo scudo ha fermato dieci giorni fa è in debito. È la differenza fra
«ricordare» e «non perdonare».

## I precedenti li leggono gli incidenti

Il debito non lo porta chi chiama: viene letto da `incidenti.js`, che quei
giudizi li ha già scritti mentre l'attacco succedeva.

- `certo` — lo scudo ha agito su quel nome → **fermato**
- `sospetto` e `probabile` — c'era e non l'abbiamo toccato → **presente**
- `legittimo` — **non lascia traccia**: essere stati assolti non è un precedente

Di ogni classe conta solo la data più recente. Contare quante volte è successo
trasformerebbe una serie di incidenti ravvicinati in un peso che non scende più.

E vale **solo nel canale dov'è successo**. Il giudizio di uno streamer non
segue nessuno altrove: quella è la rete, ha regole sue e sta in `docs/RETE.md`.

Se il precedente dovesse passarlo il chiamante, il primo che se ne dimentica
ottiene una reputazione che non può peggiorare mai — e non se ne accorge
nessuno. Per questo il modulo se lo va a prendere da solo.

## Dentro un'ondata

Durante un attacco i nomi da valutare sono centinaia, e una lettura per
ciascuno rallenterebbe la difesa proprio nel momento in cui serve. Quindi la
fiducia di molti si calcola con una lettura sola del database e un solo giro
sugli incidenti.

Chi arriva a 4 di sconto viene messo da parte prima che si scelga il gruppo da
colpire, e nell'incidente resta scritto come `legittimo`. Il resto dell'ondata
si giudica normalmente.

Nel simulatore lo scenario `abitue-sfortunati` misura esattamente questo:
sessanta bot più tre persone vere il cui nome ha la stessa forma dei bot. Senza
la reputazione la precisione era 95,2%; con la reputazione è 100%.

## Cosa non conserviamo

Niente di nuovo su nessuno. Il conteggio dei messaggi e la data del primo sono
già nella cronologia della chat; i giudizi sono già negli incidenti, che si
potano da soli dopo sei mesi. Questo modulo li legge e non scrive niente.
