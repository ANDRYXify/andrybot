# Studio Web: spento, e perché

Il motore c'è ed è completo — il browser compone su una canvas, `MediaRecorder`
manda i pezzi al server, un ffmpeg per streamer transcodifica e spinge su RTMP,
e la stream key non arriva mai al browser. Ma **la funzione non è mai arrivata
al punto di funzionare per chi la usa**, ed era promessa in **ventun punti** fra
vetrina, pannello, descrizioni per i motori di ricerca e riassunto per le IA.

Una promessa che non si mantiene è peggio di una funzione che manca.

## Non basta nasconderla

Togliere la voce dal pannello lascerebbe le rotte raggiungibili da chi le chiama
a mano. Quindi l'interruttore sta **nel server**, e sta **prima del gate del
piano**:

```
config.studioAttivo   ← STUDIO_WEB=1 per riaccenderla
```

L'ordine non è un dettaglio. Se il gate del piano venisse prima, chi non paga si
sentirebbe dire *«passa a un piano superiore»* per una cosa che non esiste a
nessun prezzo — cioè gli si chiederebbero soldi per il nulla.

Nel pannello la scheda resta, e dice la verità: **«Studio Web — in arrivo»**,
con una riga che spiega cosa sarà e una che dice che il resto del bot funziona
come sempre. Nessun bottone da premere: quando una cosa non c'è, il modo giusto
di dirlo è non offrirla.

## La chiave di trasmissione segue l'interruttore

Lo Studio chiedeva `channel:read:stream_key` — il permesso di leggere **la
chiave con cui si trasmette sul canale**. Tenerlo per una funzione spenta
significa chiedere un potere che non si usa, ed è esattamente ciò che il
principio del privilegio minimo dice di non fare.

Quel permesso ora **dipende dall'interruttore**: non è stato tolto a mano, è
scritto in modo che torni da solo il giorno che lo Studio si accende. E quando
tornerà, la dashboard chiederà di ri-concederlo con la strada che c'è già
(«Concedi i permessi»), senza altro lavoro.

## Riaccenderla

1. la funzione funziona davvero, provata da capo a fondo verso un ingest vero;
2. `STUDIO_WEB=1` fra le variabili d'ambiente;
3. ripartono da soli: le rotte, il permesso della stream key, la scheda intera
   del pannello;
4. le frasi che la promettono vanno riscritte a mano — sono state tolte, non
   commentate, perché un testo commentato è un testo che nessuno rilegge.

## Il collaudo

`test/unita/studio-spento.test.mjs` tiene fermo che: l'interruttore è spento di
suo; **ogni** rotta dello Studio ci passa; ci passa **prima** del gate del piano;
la vetrina e le descrizioni per i motori di ricerca non promettono la diretta dal
browser in nessuna delle tre lingue; e il permesso della stream key non viene
chiesto, ma è legato all'interruttore e non tolto a mano.

Provato rosso su tre difetti veri: una rotta lasciata fuori dall'interruttore,
l'interruttore messo dopo il gate del piano, e la promessa rientrata in vetrina.

## La veste: il predefinito sopra, le modifiche sotto

Le nove vesti esistevano già, **Manga compresa**, ma si potevano scegliere in un
momento solo: quando si creava un overlay nuovo, nella tendina «Parti da». Dopo,
per cambiare aspetto restavano le manopole a una a una:

| elemento | manopole |
|---|---|
| alert | 23 |
| chat | 19 |
| ogni widget / obiettivo | 12 |

E **undici** di quelle sono le stesse ripetute per ogni elemento — forma,
materia, cornice, font, peso, spaziatura, lettere, sfondo, opacità, testo,
angoli. Era questa la sensazione di «scomodo e ridondante»: non c'era modo di
dire *fammelo manga*, restava da rifarlo a mano tre volte.

Adesso ogni blocco d'aspetto (`.asp-blocco`) si apre con la **riga della veste**:
le nove vesti come pastiglie, più «a tutto l'overlay» che estende la scelta a
ogni elemento in un colpo. La riga la mette una funzione sola, `mettiVesti()`,
su **tutti** i blocchi — presenti e futuri: un blocco nuovo la eredita senza che
nessuno debba ricordarsene.

### Le vesti erano incomplete, e nessuno lo vedeva

Le vesti dichiaravano forma, materia e cornice anche per la chat, ma chi le
applicava (`applicaTemplate`) scriveva a mano venti righe di `_imposta(...)` e
per la chat ne copriva **sette**: dimensione, font, google font, sfondo,
opacità, testo, angoli. Forma, materia, cornice, peso, spaziatura e lettere le
saltava. Difetto senza sintomi: sceglievi «Manga» e la chat restava a metà.

Ora l'applicazione passa da una **tabella** campo → id (`_SUF_ST`), non da un
elenco scritto a mano: quello che la veste dichiara viene applicato per
costruzione, e aggiungere un campo a una veste non richiede di ricordarsi anche
di scrivere la riga che lo applica.

E le vesti sono state completate: oltre ad alert e chat vestono **gli obiettivi**
e **il player**. Il player ha un asse suo — l'oggetto che imita, vinile /
cassetta / terminale / manga — e la veste adesso lo sceglie invece di lasciarlo
scollegato: «Nastro» è una cassetta, «Terminale» un terminale, «Manga» il manga.

### Il contratto

`test/contratto/vesti.test.mjs` prova che **ogni valore scritto in una veste è
un valore che esiste**, confrontandolo con gli elenchi veri di `stile.js`. Un
refuso come `forma: 'fumeto'` non rompe niente e non veste: è il modo peggiore
di sbagliare, perché non lo dice nessuno. Provato rosso togliendo una lettera.

