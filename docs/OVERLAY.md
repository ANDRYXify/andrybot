# I collegamenti dell'overlay

## Come si controlla, invece di guardare

L'overlay in OBS riceve tutto da un solo flusso SSE (`/overlay/:login/stream`).
Il controllo giusto non e aprire l'overlay e guardare se qualcosa si muove, ma
confrontare **due insiemi**: i tipi di evento che il server puo mandare e i tipi
che l'overlay sa gestire. Se non coincidono, c'e un collegamento rotto, e si sa
esattamente quale.

## La mappa, oggi

| tipo | lo manda | l'overlay |
| --- | --- | --- |
| `alert` | `alerts.js` (follow, sub, bit, raid) | `alert()` |
| `chat` | `alerts.js` — chat a schermo | `chat()` |
| `chat_raw` | `alerts.js` — **anteprima nella dashboard** | ignorato (vedi sotto) |
| `widget` | `alerts.js` — ultimo follower / ultimo sub | `widget()` |
| `contatore` | `server.js` — contatori tipo `!morti` | `contatore()` |
| `tema` | `server.js` — ricarica stile e posizioni | `caricaTema()` |
| `testo` | `modules.js` — testo a schermo da comando | `mostraTesto()` |
| `penitenza` | `penitenze.js` (`start` / `hit` / `end`) | `penitenza()` |
| `preset` | `effects.js` — suoni pronti | `suonaPreset()` |
| `audio` | `effects.js` | `suona()` |
| `immagine`, `video` | `effects.js` | coda visiva |

Verificati uno per uno con un `EventSource` finto: ognuno produce davvero il
nodo che deve produrre. `widget` e `penitenza` sembravano scollegati finche non
ho mandato il payload **vero**: il primo compare solo con `cfg.attivo` (giusto:
se il widget e spento non deve comparire), il secondo solo con `azione`.
Entrambi corretti: era la mia sonda a essere incompleta.

## Il difetto trovato

`chat_raw` esce da `alerts.js` a **ogni messaggio di chat**, ed e destinato
all'anteprima dal vivo dentro la dashboard (`app.js`). Ma il flusso e uno solo,
quindi arriva anche all'overlay di OBS — dove finiva nel ramo finale:

```js
else { if (mostra('effetti')) { codaVisiva.push(dati); mostraProssimo(); } }
```

cioe nella **coda degli effetti visivi**, come se fosse un'immagine o un video.

A chat ferma non si nota: ogni evento in arrivo chiama `mostraProssimo()`, che
scarta subito quello che non e immagine o video. Il guaio arriva **mentre un
effetto e a schermo**: li `occupato` e vero, la coda non si svuota, e i
messaggi di chat si accumulano. Quando l'effetto finisce, la coda li smaltisce
**uno ogni 120 ms** — e l'effetto successivo aspetta dietro tutti quanti.

Misurato: un effetto lanciato con 60 messaggi di chat in mezzo compariva dopo

| | secondo effetto |
| --- | ---: |
| prima | **8 401 ms** |
| dopo | **1 152 ms** |

Con una chat viva sono i «gli effetti a volte non partono» che sembrano
capricci e invece sono aritmetica: un posto in coda per ogni messaggio
arrivato mentre l'effetto precedente era a schermo.

## La correzione

Non si aggiunge un ramo per `chat_raw`: si toglie il ramo che accettava
**qualunque cosa**. Nella coda visiva entrano solo i due tipi che quella coda
sa disegnare:

```js
else if (dati.tipo === 'immagine' || dati.tipo === 'video') { … }
```

Cosi un evento sconosciuto — `chat_raw` oggi, qualunque cosa si aggiungera
domani per un altro consumatore — viene **ignorato**, non disegnato. Il difetto
non puo ripresentarsi, perche la condizione che lo generava non esiste piu.

## Collaudo

`scratchpad/t_overlay.mjs` monta l'overlay vero con un `EventSource` finto,
manda ogni tipo della tabella e verifica che compaia il nodo giusto; poi
verifica che un evento sconosciuto non tocchi la pagina, e **misura** il
ritardo del secondo effetto con 60 messaggi di chat in mezzo (soglia: 3
secondi). Sul codice vecchio il test fallisce con 9 357 ms; su quello corretto
passa con 2 012 ms.

## Tutto quello che compare è un elemento della scena

Prima non era così. Alert, chat e i due widget erano **elementi** — si
accendevano, si spostavano, si vestivano dallo stesso posto — mentre i
**contatori** vivevano per conto loro (posizione e colori propri, nessun
interruttore nell'elenco) e l'**obiettivo** non esisteva. Due sistemi per mettere
roba sulla stessa tela.

Ora gli elementi sono sette: `alert`, `chat`, `wf`, `ws`, `goal`, `cont`,
`effetti`. Sono scritti **una volta sola** di qua (`ELEM_OVL` in `app.js`) e una
volta sola di là (`ELEM_OVERLAY` in `server.js`); l'elenco del pannello, i
valori di serie e la ripulitura di quel che arriva ne discendono tutti. Un test
confronta i tre insiemi: se ne nasce uno e lo si dimentica da una parte,
diventa rosso.

### Il difetto che quell'elenco ha scoperto

Chi ripuliva gli overlay in arrivo copiava a mano quattro chiavi su sette:

```js
mostra: { alert: m.alert !== false, chat: …, wf: …, ws: …, effetti: … },
```

`goal` e `cont` cadevano per strada. `_mostraDefault()` li dava accesi, quindi
l'occhio di «Obiettivo» e «Contatori» si poteva spegnere — ma al ricaricamento
tornava acceso, sempre, e nessun overlay poteva davvero farne a meno. Non era un
caso raro: era **impossibile** spegnerli. Ora quella riga è
`ELEM_OVERLAY.reduce(...)` e non può più perdere pezzi.

I contatori mantengono i loro colori e la loro posizione quando li imposti a
mano — quel che scrive il singolo contatore vince sempre — ma senza impostazioni
prendono la veste della scena, e si spengono tutti insieme dall'elenco.

## L'obiettivo

Una barra che si riempie mentre arrivano follower, sub o bit.

- **Il conto è quello vero**: lo tiene il motore contando gli eventi che già gli
  passano davanti (`GOAL_DI` dice quale evento fa crescere quale obiettivo — un
  elenco, non un caso particolare nel codice). Un cheer da 500 bit vale 500, non
  1.
- **Sopravvive a un riavvio**, perché sta nelle impostazioni del canale. Un
  obiettivo che si azzera da solo la notte non è un obiettivo.
- **Si riparte da zero solo se lo chiedi**, con un pulsante.

## Lo studio mostra la scena intera, e la mostra dov'è davvero

Due difetti diversi, la stessa radice: **la tela diceva una cosa e l'overlay ne
faceva un'altra**.

**Primo: mancavano dei pezzi.** Sulla tela dello studio c'erano quattro
elementi su sette. Gli obiettivi — che sono quanti ne vuoi, ognuno col suo posto
— si potevano piazzare solo scrivendo numeri in un modulo, e i contatori pure. Si
poteva personalizzare tutto tranne il dove, che è la cosa che si guarda.

La correzione non è «aggiungere gli obiettivi alla tela»: è **derivare la scena
dall'elenco**. `ELEMENTI()` mette in fila i quattro fissi, poi un elemento per
ogni obiettivo (`goal:<id>`) e uno per ogni contatore (`cont:<comando>`). Nodi,
livelli, selezione, frecce, aggancio, annulla/ripeti, ispettore e salvataggio
leggono tutti da lì: un elemento nuovo domani costa una riga, non nove.

**Secondo: gli angoli erano finti.** Lo studio metteva un elemento «in alto a
destra» al 87% della larghezza, col suo centro; l'overlay lo mette in una
scatola d'angolo con `top: 3vh; right: 2vw`, cioè col **bordo** a filo. Per una
pastiglia stretta la differenza non si vede; per una barra da 15rem sì, e infatti
l'obiettivo in alto a destra usciva dalla tela. Ora lo studio posa gli angoli
con lo stesso modello a scatola dell'overlay (`ANCORA`), misura dove l'elemento
è finito e usa quel centro per le guide. Un test confronta i due numeri: se
qualcuno cambia il margine da una parte sola, diventa rosso.

**I contatori si ancoravano a terzi.** `x <= 33 → 0`, `x >= 67 → -100%`,
altrimenti `-50%`: trascinandone uno attraverso il centro **saltava** di mezza
larghezza. Ora seguono la regola di tutti gli altri
(`translate(-x%, -y%)`), quindi la tela e l'overlay coincidono e il
trascinamento è continuo. In cambio hanno guadagnato la rotazione, che gli altri
elementi avevano già.

## Il banco: due sponde, non due cartelli sopra la tela

I pannelli «Livelli» e «Proprietà» galleggiavano **sopra** la tela, a sinistra e
a destra. Su 1440px coprivano 574px di 964: il 40% della scena, e per l'appunto
i due angoli alti, dove stanno gli obiettivi.

Da 1024px in su ora sono due sponde della griglia — `auto | 1fr | auto` — e la
tela sta nel mezzo, tutta visibile. Arrotolarne una le ridà la larghezza;
trascinarne una per la maniglia la stacca e la fa tornare a galleggiare (e la
colonna sparisce, quindi la tela cresce); un doppio clic sulla testa la
riaggancia. Sotto i 1024px galleggiano come prima: tre colonne in 800px
lascerebbero alla tela 200px, che è peggio del problema che risolvono.

## Il difetto che rendeva l'overlay «meh»

`--op: 85`. Senza il `%`.

`background: color-mix(in srgb, var(--bg) var(--op), transparent)` con un'opacità
**senza unità** è una dichiarazione invalida: l'elemento resta trasparente. E il
valore c'era in tre punti — alert, chat e widget — quindi **fuori dalla scatola
l'overlay non aveva sfondi**: scritte bianche appoggiate sul gioco, senza
nessuna pastiglia dietro.

La riga scritta dal pannello ci metteva il `%` (`opacita + '%'`), quindi chi
aveva toccato l'impostazione non vedeva il problema e chi non l'aveva toccata
sì. Un test ora rifiuta qualsiasi `--op` senza unità nella pelle dell'overlay.

Insieme è sparito il **viola di Twitch** che l'overlay usava come accento di
serie (e la pastiglia degli effetti): l'accento di serie adesso è il nostro.
