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
| Dashboard, `/health`, prove automatiche (700+), cancelli | vari |

### Manca, ed è la parte che conta

| pezzo | perché pesa |
|---|---|
| **Detection ed enforcement separati** | oggi chi decide esegue anche. Senza separazione non esistono davvero né audit, né rollback, né prova a vuoto, né replay |
| **Incident engine** | c'è un registro di righe, non un attacco come oggetto con inizio, picco, fine, coinvolti e azioni |
| **Simulatore e replay** | senza, ogni soglia si tara a naso: non si misurano precision, recall né tempo di rilevamento |
| **Analisi dei messaggi** | la firma confronta l'uguaglianza. Mancano zero-width, homoglyph, punycode, e la **similarità** (quasi-duplicati) |
| **Cluster detection** | il segnale più forte contro le botnet, e non c'è per niente |
| **Sei stati** invece di tre | oggi calma/sospetto/attacco: manca la gradualità in mezzo |
| **Reputazione locale con decadimento** | la rete è fra canali; manca la storia del singolo account, e il fatto che un errore di anni fa deve pesare meno |
| **Raid legittimo correlato** | oggi il raid si avvisa soltanto; non abbassa la sensibilità né si aggancia allo spike |
| **Dashboard investigativa dei follower** e bonifica post-attacco | c'è la pulizia per nomi noti, non l'indagine per intervallo, cluster e incidente |
| **Dead-letter queue** e idempotenza degli eventi | un'azione fallita oggi si perde in un log |

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

**A · La spina dorsale.** Separare chi decide da chi esegue. Il detection
produce un verdetto strutturato (`NIENTE`, `OSSERVA`, `LIMITA`, `CANCELLA`,
`TIMEOUT`, `BAN`, `BLOCCO`) con dentro punteggio, confidenza e motivi.
L'enforcement esegue: coda, priorità, riprova con rientro esponenziale,
deduplicazione, verifica dell'esito, coda dei falliti. Nessuna azione si perde
in silenzio. E l'audit registra richiesta, risposta ed esito.

Da qui in poi si può: girare a vuoto senza toccare nessuno, disfare, rigiocare.

**B · Gli incidenti.** Un attacco diventa un oggetto: inizio, picco, fine,
account coinvolti divisi per giudizio, azioni fatte, timeline. Riapribile se
l'attacco riprende.

**C · Il simulatore.** Scenari riproducibili (cinquecento follow in dieci
secondi, raid vero da duemila, spam coordinato, Unicode, attacco lento, falso
positivo) e il replay di un incidente registrato. Con dentro le metriche:
precision, recall, tempo di rilevamento. Viene **prima** delle prossime tre
fasi, perché senza si tara a naso.

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
