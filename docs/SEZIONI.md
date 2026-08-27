# Le sezioni: struttura e peso

Come sono organizzate le pagine della dashboard, e perché così.

## La misura di partenza

Ho misurato tutte e 24 le sezioni a 1440×950, contando altezza, carte e campi.
Il risultato smentisce l'idea che ci fossero semplicemente «troppi menu»:

- **8 sezioni su 24 stavano sotto una schermata.** Giveaway 0,6; Abbonamento
  0,6; Clip 0,7; Musica 0,7; Sondaggi 0,8. Troppo poco per meritare una voce di
  menu tutta sua.
- **4 superavano le 4 schermate.** Notifiche social 7,6 con 106 campi. Troppo
  per stare in una pagina sola.

Il difetto era lo **squilibrio**, non il numero. E fondere a caso lo avrebbe
peggiorato: unire due sezioni pesanti produce una pagina infinita, che è
l'opposto di compatto.

Quindi due movimenti opposti, non uno: **accorpare le piccole che hanno lo
stesso scopo**, e **spezzare la grande**.

## Famiglie: accorpare

Una famiglia è un insieme di sezioni che condividono una voce di menu e si
scelgono con una riga di schede dentro la pagina.

| Famiglia | Contiene | Perché |
|---|---|---|
| Il bot | Personalità, Conoscenza, Memoria | Tre facce dello stesso oggetto: come parla e cosa sa |
| Comandi | Comandi, Comandi vocali | Stesso obiettivo, cambia se si scrive o si dice |
| Moderazione | Filtri e regole, Scudo anti-bot | Difendere la chat è una cosa sola |
| Giochi | Giochi, Sondaggi, Giveaway, Penitenze | Tutte servono a far partecipare la chat |
| Regia | Regia, Clip, Musica | Strumenti che si usano mentre si è in diretta |

**Da 24 voci di menu a 14.** In più «Durante la diretta» è diventata una voce
diretta: un gruppo con una sola voce dentro è un passaggio inutile.

### Gli id non cambiano, ed è la parte importante

C'erano trenta riferimenti agli id delle sezioni nella sola ricerca, più i
collegamenti interni, l'ancora nell'indirizzo e i comandi vocali. Rinominarli per
una questione di menu avrebbe rotto tutto quanto.

Quindi `vaiAScheda('memoria')` continua a funzionare esattamente come prima: apre
la famiglia giusta con la sua scheda accesa. E le schede portano `data-scheda`,
cioè usano la navigazione che c'è già invece di aggiungerne una seconda che
possa divergere dalla prima.

Fra schede della stessa famiglia non c'è il morph: è navigazione interna, non un
cambio di sezione.

## Sotto-schede: spezzare

Le famiglie accorpano sezioni diverse. Le sotto-schede fanno l'opposto: dividono
**una** sezione troppo grande, filtrando le carte invece di cambiare pagina.

Notifiche social pesava 7,6 schermate con 106 campi, e chi voleva configurare
TikTok doveva scorrere in mezzo a tutto Telegram per arrivarci.

| Scheda | Carte | Campi | Schermate |
|---|---|---|---|
| Telegram | 4 | 84 | 4,0 |
| TikTok | 2 | 7 | 1,5 |
| YouTube | 1 | 5 | 0,8 |
| Instagram | 1 | 5 | 0,7 |
| Discord | 1 | 5 | 0,8 |

Chi configura Instagram vede **5 campi invece di 106**.

Telegram resta la più pesante, e va bene: di quei 84 campi, 66 sono l'elenco
delle destinazioni degli avvisi. Un elenco lungo è lungo — il difetto era averlo
nella stessa pagina di cose che non c'entrano.

Le carte nascoste **restano nel documento**: non vengono ricostruite, e quello
che ci hai scritto dentro resta dov'è se cambi scheda e torni. La scelta si
ricorda anche cambiando sezione.

Il meccanismo è generico (`SOTTO_SCHEDE`): dividere un'altra sezione vuol dire
marcare le sue carte con un attributo e aggiungere una voce.

## Il collaudo

- `t_famiglie.mjs`: conta le voci di menu, e verifica che **ognuno** dei sedici
  vecchi indirizzi apra ancora il suo pannello, con la voce di menu accesa e la
  scheda giusta.
- `t_sotto.mjs`: per ogni rete misura carte, campi e schermate, verifica che non
  si veda nessuna carta di un'altra rete, e che la scelta si ricordi.
- `t_testata.mjs`: che arrivando **direttamente** su una sezione la testata sia
  visibile — il difetto che avevo introdotto con la comparsa orchestrata.
