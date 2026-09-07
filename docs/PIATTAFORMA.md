# Da bot a piattaforma di sicurezza

Il modello di riferimento è un IDS/IPS applicato agli eventi di un canale:

```
Twitch Events → Ingestion → Normalizzazione → Detection → Reputation
             → Incident Correlation → Decision → Enforcement
             → Audit / Rollback / Dashboard
```

Questo documento misura quanto di quel disegno esiste già, cosa manca davvero, e
in che ordine conviene costruirlo. Non è un elenco di desideri: ogni riga della
colonna «c'è» è stata verificata nel codice.

## Il divario, misurato

### C'è, e funziona

| pezzo | dove |
|---|---|
| OAuth con scope separati, principio del minimo privilegio | `config.js`, `twitch/auth.js` |
| **Token cifrati a riposo** (AES-256-GCM, chiave avvolta) | `segreti.js` |
| EventSub via **WebSocket** (non l'endpoint deprecato) | `twitch/events.js` |
| Helix: moderation, Shield Mode, ban/timeout, block, follower, chatters | `twitch/helix.js` |
| Storage SQLite con migrazioni | `db.js` |
| Baseline per canale, appresa **solo in tempo di pace** (anti baseline-poisoning) | `antibot.js` |
| Shield Mode automatico con ripristino selettivo, e serranda che sopravvive al riavvio | `antibot.js` |
| User risk score **spiegabile**, a famiglie con tetto | `punteggio.js` |
| Azioni progressive (segnala / trattieni / timeout / ban / blocco) | `antibot.js` |
| Whitelist: mod, VIP, sub, esenti, bot di servizio | `antibot.js` |
| Coda di enforcement con rate limit e rientro sul 429 | `antibot.js` |
| Reputation network fra installazioni, opzionale e degradante | `rete.js` |
| Registro degli interventi con **esito reale** dell'API | `antibot.js` |
| **Detection ed enforcement separati** | `enforcement.js` |
| **Sola osservazione**: decide tutto, non tocca nessuno | `enforcement.js` |
| **Idempotenza**: lo stesso evento due volte non produce due azioni | `enforcement.js` |
| **Coda dei falliti** persistente, e la ripresa | `enforcement.js` |
| **Incident engine**: un attacco come oggetto, con timeline e coinvolti giudicati | `incidenti.js` |
| **Simulatore** con scenari deterministici, precisione, richiamo e tempo di rilevamento | `simulatore.js` |
| **Raid legittimo correlato**: sotto raid il coro si giudica sulla cadenza | `antibot.js` |
| Dashboard, `/health`, prove automatiche (700+), cancelli | vari |

### Manca, ed è la parte che conta

| pezzo | perché pesa |
|---|---|
| **Analisi dei messaggi** | la firma confronta l'uguaglianza. Mancano zero-width, homoglyph, punycode, e la **similarità** (quasi-duplicati) |
| **Cluster detection** | il segnale più forte contro le botnet, e non c'è per niente |
| **Sei stati** invece di tre | oggi calma/sospetto/attacco: manca la gradualità in mezzo |
| **Reputazione locale con decadimento** | la rete è fra canali; manca la storia del singolo account, e il fatto che un errore di anni fa deve pesare meno |
| **Dashboard investigativa dei follower** e bonifica post-attacco | c'è la pulizia per nomi noti, non l'indagine per intervallo, cluster e incidente |

## Sul linguaggio

La specifica consiglia Go. La raccomandazione è **restare su Node**, e la ragione
non è l'affetto per il codice esistente.

Go risolve concorrenza e consumo di RAM. Nessuno dei due è il collo di
bottiglia qui: il collo di bottiglia sono **i rate limit di Twitch**. Andiamo a
sei blocchi al secondo perché lo dice Twitch, non perché il processo non ce la
faccia — e a quel ritmo la CPU è ferma. Il percorso realtime (evento →
classificazione → decisione) è già lontano dai millisecondi che servono, e le
parti pesanti sono tutte attese di rete.

Quello che si butterebbe riscrivendo: OAuth funzionante, EventSub funzionante,
la cifratura dei segreti, la dashboard, lo schema del database, i moduli, il
bot, l'integrazione con Kick e YouTube, 700 prove e i cancelli — su un prodotto
**vivo**, con streamer collegati, che resterebbe fermo per mesi.

Quello che invece si prende dalla specifica **senza cambiare linguaggio**: il
flusso, la separazione dei moduli, il vocabolario (incidente, cluster, verdetto,
enforcement), e la disciplina. Sono quelli a fare la differenza fra un bot e una
piattaforma, non il compilatore.

Se in futuro un pezzo dovesse davvero diventare pesante — il clustering su
milioni di account — quel pezzo si stacca e si riscrive da solo, senza fermare
il resto. È un altro motivo per fare prima la separazione dei moduli.

## L'ordine

Le fasi 1 e 2 della specifica sono già fatte. Il nostro ordine parte da lì, e
mette il **misuratore prima delle cose da misurare**.

**A · La spina dorsale. — FATTA**

Chi decide non esegue più. Lo scudo produce un **verdetto** — un oggetto con
azione, punteggio, confidenza, motivi e origine — e l'esecutore
(`enforcement.js`) lo esegue. Nello scudo non è rimasta **nessuna** chiamata
punitiva a Twitch, e un cancello lo pretende.

Cosa ha portato, oltre alla pulizia:

- **Sola osservazione.** Un canale può girare decidendo tutto e non toccando
  nessuno: il registro riempie, Twitch non viene chiamato. Prima, per vedere se
  una taratura era giusta, il collaudo era la diretta di qualcuno.
- **Idempotenza.** Lo stesso evento consegnato due volte da Twitch, o due
  rilevatori che si accorgono della stessa cosa, non producono due ban.
- **Niente si perde.** Un'azione fallita finisce in una coda che sopravvive al
  riavvio e si può riprendere: è durante un attacco che una chiamata cade, ed è
  durante un attacco che serve.
- **Il registro risponde.** Non più «bannato», ma cosa si è chiesto e cosa ha
  risposto Twitch, con l'id del verdetto per risalire alla decisione.
- **L'ordine giusto.** Una cancellazione di spam passa davanti a mille blocchi
  di pulizia: la fila è una sola, ma l'urgenza non è la stessa.
- **Il ripiego dichiarato.** Se il blocco non si può fare si banna, e resta
  scritto che il follow è rimasto lì.

Due difetti trovati mentre si costruiva, e vale la pena ricordarli. Il rientro
sul 429 restituiva una promessa che non si risolveva mai: bastava un rate limit
per **fermare la coda per sempre** invece di rallentarla. E `stato()` usava lo
stesso nome per due numeri diversi — quante azioni aspettano di essere riprese e
quante sono andate male in tutto — così uno dei due spariva e la console
mostrava il numero sbagliato senza che si vedesse.

**B · Gli incidenti. — FATTA**

Un attacco è un oggetto: si apre quando l'assetto sale, si chiude quando si
torna in pace, si **riapre** se riprende entro un quarto d'ora. Le azioni si
contano, gli eventi salienti si raccontano in timeline. I coinvolti hanno un
giudizio — e chi è arrivato durante l'attacco senza nessun segnale contro resta
scritto come *legittimo*, perché è quello che non si dovrà toccare quando si
ripulisce. Per esteso: `docs/INCIDENTI.md`.

**C · Il simulatore. — FATTA**

Sette scenari deterministici con la verità dentro, e tre numeri: precisione,
richiamo, quanto ci ha messo. Rilevare ed eseguire sono misurati separati — il
tetto di sei al secondo è di Twitch, non un difetto dello scudo. Ogni scenario
porta l'attesa da cui si riparte, così una regressione si vede il giorno che
succede.

Appena acceso ha trovato **cinque difetti veri**, nessuno dei quali si vedeva da
fuori — compresi novanta falsi positivi su trecento in un raid legittimo. Per
esteso, coi conti: `docs/SIMULATORE.md`.

**D · I messaggi.** Normalizzazione Unicode, zero-width, homoglyph, punycode.
Similarità invece della sola uguaglianza (SimHash o Jaccard su token). Domini
mai visti prima.

**E · I cluster.** Raggruppare per finestra di creazione, finestra di follow,
somiglianza dei nomi, impronta dei messaggi. Un account può stare in più
cluster. È il segnale più forte contro le botnet.

**F · Gli stati.** Sei livelli invece di tre, con le modalità Prudente,
Bilanciata, Aggressiva. E il raid legittimo correlato allo spike.

**G · La bonifica.** Indagine sui follower per intervallo, cluster e incidente;
riepilogo prima di ogni operazione distruttiva; rapporto post-attacco.

**H · La reputazione locale**, con decadimento: un account segnalato per errore
anni fa non deve pesare per sempre.

## I principi, che restano

Sono quelli della specifica, e sono già i nostri:

1. rilevare pattern, non utenti;
2. tenere separati rischio individuale e rischio del canale;
3. preferire azioni progressive;
4. minimizzare i falsi positivi, e **misurarli**;
5. spiegare ogni decisione;
6. non dipendere da un modello esterno nel percorso realtime;
7. funzionare in locale anche senza la rete condivisa;
8. non fidarsi delle blacklist statiche;
9. un account nuovo non è sospetto, un account vecchio non è innocente;
10. ogni attacco è un incidente analizzabile;
11. modulare, così un pezzo si può sostituire senza fermare il resto.

E uno che aggiungiamo noi, perché ci è già costato: **niente che prometta una
rete che non c'è.** Se un documento dice che una cosa è verificata, deve
esistere il file che la verifica.
