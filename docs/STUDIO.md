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
