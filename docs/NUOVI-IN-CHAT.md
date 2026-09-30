# I nuovi in chat che attaccano briga

Chi arriva in un canale e nei primi giorni scrive cose ignobili, sconce o
sgradevoli per provocare è un caso a sé: non è uno spammer (l'antispam lo
lascia passare), non è un bot (lo scudo guarda l'età dell'account, non quella
nel canale), e le parole vietate oggi fanno solo un avviso in chat, senza
cancellare niente. Chi è di casa, invece, ha un credito che un nuovo non ha.

Questo documento è il piano per un filtro che vale **solo per chi è nella sua
prima settimana in quel canale**, a livelli, con gli avvisi a chi modera.

## Chi è nuovo

«Nuovo» vuol dire: il suo primo messaggio in **questo** canale è di meno di
sette giorni fa (i giorni si scelgono, da 1 a 30).

Il bot lo sa dalla tabella delle presenze (`presenze.prima_ts`, per canale e
persona), che però c'è solo da quando il bot è nel canale. Per non scambiare
per nuovo chi c'era da anni, vale una regola sola:

- **nuovo** se Twitch lo dice (`first-msg` sul suo primo messaggio in assoluto
  nel canale), oppure se la sua prima presenza è di meno di sette giorni fa
  **e** il bot guardava il canale già da almeno sette giorni prima;
- in ogni altro caso **non è nuovo**. Senza una prova, il filtro non tocca
  nessuno: meglio lasciar passare un nuovo che trattare da nuovo uno di casa.

Chi segue il canale da più di una settimana, i moderatori, i VIP, gli abbonati
(se lo streamer lo vuole) e chi è stato lasciato passare con `!permetti` non
sono mai nuovi.

La prima presenza si segna **prima** dei controlli, non dopo: oggi chi viene
fermato dall'antispam al primo messaggio non risulta mai arrivato.

## Cosa si riconosce

Tre famiglie, ognuna con tre livelli:

| famiglia | lieve | grave | gravissimo |
|---|---|---|---|
| **ignobile**: odio, insulti a gruppi di persone, auguri di morte | allusioni, battute su un gruppo | insulti a un gruppo, termini d'odio | minacce, auguri di morte, apologie |
| **sconcio**: contenuto sessuale | doppi sensi pesanti | volgarità sessuali | molestie dirette a qualcuno |
| **sgradevole**: provocazioni personali | sfottò, «sei scarso» | insulti diretti allo streamer o a chi scrive | insulti ripetuti, persecuzione |

Il riconoscimento ha due strati.

1. **Il lessico**, nelle tre lingue: parole ed espressioni con la loro famiglia
   e il loro livello, cercate a parola intera (così «classe» non contiene un
   insulto), dopo aver tolto accenti, lettere ripetute, cifre al posto delle
   lettere e separatori messi apposta («p.u.t.t...»). È deterministico: lo
   stesso messaggio dà sempre lo stesso esito, e le prove lo fissano.
   Lo streamer aggiunge parole sue (a una famiglia e a un livello) e toglie
   quelle che nel suo canale sono normali.
2. **Il giudizio**, per le allusioni che una lista non vede: solo per i nuovi,
   solo se il lessico non ha trovato niente e il messaggio parla a qualcuno o
   di qualcuno, il cervello del bot, sul nostro server, legge il messaggio e dice
   famiglia e livello. Il suo giudizio può solo **segnalare** a chi modera, mai
   cancellare o allontanare da solo: le azioni pesanti vengono solo da prove
   che si possono rileggere. Si spegne con un interruttore.

## Cosa succede

Per ogni famiglia e livello lo streamer sceglie l'azione: niente, segnala,
cancella, cancella e silenzia per un tempo, allontana. Di base:

| | lieve | grave | gravissimo |
|---|---|---|---|
| ignobile | segnala | cancella e silenzia 10 min | allontana |
| sconcio | segnala | cancella e silenzia 10 min | cancella e silenzia 1 ora |
| sgradevole | niente | cancella e segnala | cancella e silenzia 10 min |

Le volte si sommano per tutta la prima settimana: tre lievi valgono un grave, due
gravi un gravissimo. Le azioni passano dall'esecutore che c'è già (coda, prova a
vuoto, riprova, registro), e un'azione che Twitch rifiuta si scrive come
rifiutata, col perché (oggi una cancellazione fallita risulta fatta: si corregge
prima di tutto il resto).

## Chi viene avvisato

- **Il registro** della moderazione: il messaggio, la famiglia, il livello, la
  parola trovata (o «giudizio del bot»), l'azione e l'esito; chi modera può
  segnarlo giusto o annullarlo (togliere il silenzio, sbannare).
- **In privato su Telegram** allo streamer (e ai moderatori che lo vogliono),
  con lo stesso contenuto e i tasti «giusto» e «annulla», dal livello scelto in
  su (di base: grave).
- **In chat**, se lo streamer lo vuole, due parole a chi è stato fermato, nella
  lingua del canale e con la voce del canale.

Chi non è nuovo non genera avvisi da questo filtro: restano le regole di sempre.

## Nel pannello

In Moderazione una scheda nuova, **«Nuovi in chat»**: interruttore, giorni,
esenzioni, la tabella famiglie × livelli con le azioni, le parole aggiunte e
tolte, il giudizio acceso o spento, dove arrivano gli avvisi. Con «Prova» si
scrive un messaggio e si vede cosa succederebbe, senza toccare la chat.

## In che ordine

1. Le correzioni che servono sotto: la cancellazione fallita che risulta fatta,
   il 403 detto come permesso mancante, la prima presenza segnata prima dei
   controlli.
2. Chi è nuovo: la regola sopra, con le prove (canale appena arrivato, persona
   di casa senza storia, `first-msg`, follower vecchio).
3. Il lessico nelle tre lingue, con la normalizzazione e le prove di ogni
   livello, compresi i falsi positivi da evitare.
4. Azioni, somma delle volte, registro, avviso su Telegram.
5. La scheda nel pannello, con «Prova».
6. Il giudizio del cervello, solo segnalazioni.
7. Kick, quando ci saranno le sue chiamate di moderazione.
8. Manuale (Moderazione), novità, informativa (un messaggio di un nuovo può essere
   letto dal cervello per giudicarlo), nelle tre lingue.
