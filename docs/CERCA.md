# La ricerca

## Il difetto di partenza

`punteggio()` restituiva **−1 appena UN token non combaciava**. Ogni parola
della domanda doveva quindi trovare posto da qualche parte, altrimenti la riga
spariva. Su una frase vera — «come faccio a mettere gli alert su obs» — sette
parole su nove non combaciano niente, e il risultato era **zero**. Nessuna
tolleranza ai refusi, nessuna radice (`comando` non trovava `comandi`), nessun
sinonimo (`silenziare`, `mute`, `silenciar` → niente), e il vuoto era un vicolo
cieco: «prova un'altra parola».

## Il modello

Cinque strati. La regola che li tiene insieme e che **ogni strato puo solo
aggiungere candidati, mai toglierne**, e l'ultimo garantisce per costruzione
che la risposta non sia mai vuota.

**0 · Si normalizza.** Minuscole, via gli accenti, via la punteggiatura.

**1 · Si capisce la domanda.** Si tolgono le **parole vuote** nelle tre lingue
(come, faccio, voglio, dove, the, how, do, i, want, como, quiero, donde…) — ma
se restassero zero parole si tengono tutte, perche una domanda fatta solo di
parole vuote e comunque una domanda. Poi si prende la **radice** di ognuna, con
regole conservative: si taglia solo se quel che resta ha almeno 4 lettere.
Infine si espande coi **sinonimi**: quaranta gruppi trilingue che portano
`bannare`, `mute`, `timeout`, `silenciar` tutti sulla stessa cosa.

**2 · Si dà un punteggio, sommando.** Ogni parola contribuisce col **suo
miglior aggancio** — parola del titolo (100), parola imparata (88), parola
chiave (34), inizio del titolo (70), dentro il titolo (46), dentro il resto
(18) — e i sinonimi valgono il 62%. Una parola che non aggancia niente
contribuisce **zero, non uccide la riga**: e la differenza con prima. Alla fine
il totale viene pesato sulla **copertura** (quante parole della domanda hanno
agganciato): `totale × (0,42 + 0,58 × copertura)`. Cosi chi risponde a tre
parole su tre batte chi ne prende tre su otto, senza che nessuno sparisca.

**3 · I refusi.** Se una parola non esiste nel vocabolario dell'indice e non ha
sinonimi (se gia la capiamo, non stiamo a correggerla), si cerca la piu vicina
per **distanza di Damerau-Levenshtein**, con la tolleranza standard usata dai
motori di ricerca: 0 fino a 3 lettere, 1 fino a 5, 2 da 6 in su. Si pretende
che la **prima lettera coincida** — chi sbaglia a scrivere raramente sbaglia
la prima — e questo da solo elimina quasi tutte le correzioni assurde.
All'utente si mostra la **parola vera**, non la radice: «cerco anche
*comandi*», non «cerco anche *comand*».

**4 · Impara usandola.** In `localStorage` (`sb-cerca-memoria`) restano tre
cose: quali sezioni apri dopo quale domanda (`q`), quanto usi ogni sezione
(`u`), e **le parole che hai usato per arrivarci** (`p`). La chiave della
domanda e fatta di radici ordinate, cosi «alert obs», «obs alert» e «alerts
obs» sono la stessa cosa. Le parole imparate entrano nel vocabolario di quella
riga con peso 88 — quasi come se fossero nel titolo.

E per questo che «raid», che e insieme un avviso e un problema dello scudo,
dopo due volte che scegli lo scudo comincia a proporre lo scudo. E per questo
che una parola tua, che non vuol dire niente per nessun altro, dopo due volte
diventa una scorciatoia.

**5 · Il vuoto non esiste.** Se dopo tutto questo nessuno prende un punto, si
ordina per **somiglianza a trigrammi** fra quello che hai scritto e ogni
sezione. Una somiglianza a trigrammi produce **sempre** un ordine, quindi c'e
sempre un «quello che ci somiglia di piu». Il vuoto non e evitato con una
toppa: non puo esistere.

## Perche sotto compaiono altre sezioni

Insegnare vuol dire **aprire** la cosa giusta da qui. Se la cosa giusta non
compare, non gliela puoi insegnare e il giro non si chiude mai. Percio quando
la risposta e debole si aggiunge sempre un blocco «forse invece cercavi» con
le sezioni piu vicine, cosi il bersaglio e a un clic.

«Debole» non e a occhio, e misurato: `ripiego`, oppure forza < 30, oppure
copertura < 0,6 con forza < 70. Le soglie vengono dai numeri veri —
«emote» vale 100, «moderazione» 62, «moderazine» (con refuso) 40, «sondagi»
35, «quanto pago al mese» 21, «telegramm» 19 — e sono scelte perche una
risposta sola ma sicura **non** e debole, mentre una risposta sola e incerta
lo e.

## Velocita

L'indice arriva a 3000 voci (i comandi dell'utente ci finiscono dentro). La
prima versione impiegava **88 ms** su una parola con refuso e **77 ms** sul
ripiego: a ogni battuta, con frame da 16 ms, si vedeva.

Due correzioni strutturali:

- **Ceste per il fuzzy.** Visto che si pretende la stessa prima lettera e una
  differenza di lunghezza entro la tolleranza, il vocabolario e indicizzato per
  `prima lettera : lunghezza`. Si scandiscono cinque cestini invece di
  migliaia di parole.
- **Trigrammi precalcolati.** Si costruiscono una volta sola quando si monta
  l'indice, non a ogni battuta. E il ripiego lavora sulle **sezioni vere**
  (una ventina), non sulle migliaia di voci dinamiche: quelle si trovano gia
  col loro nome.

| | prima | dopo |
| --- | ---: | ---: |
| «moderazine» (refuso) | 87,8 ms | **4,0 ms** |
| «asdfghjkl» (ripiego) | 77,4 ms | **1,7 ms** |
| frase di 8 parole | 13,7 ms | 14,1 ms |

## Collaudo

`scratchpad/t_cerca.mjs` — 27 domande vere: frasi intere in italiano, refusi,
sinonimi, inglese, spagnolo, parole singole. **26 al primo posto, 0 sbagliate.**
L'unica «imprecisa» e «raid», che sta davvero fra due sezioni: ed e proprio il
caso che lo strato 4 risolve da solo.

`scratchpad/t_impara.mjs` — sei prove attraverso l'interfaccia vera (si scrive
nella casella, si clicca il risultato): la parola inventata da comunque
qualcosa; una parola personale diventa una scorciatoia; l'ambiguita si risolve
con l'uso; la ricerca vuota mostra dove torni piu spesso; tutto sopravvive al
ricaricamento; una frase mista funziona.

## Un difetto trovato per strada

`apri()` disegnava i risultati **prima** di svuotare la casella: riaprendo la
ricerca vedevi i risultati della volta prima con la casella vuota. Ora si
svuota prima di disegnare.

## L'indice non si scrive: si raccoglie

Tutto quello sopra funzionava, ma su un indice sbagliato. Le voci erano
**ventiquattro**, una per scheda, con accanto una riga di parole chiave scritta
a mano. Il pannello ha **ottocentotrenta destinazioni**: i titoli delle carte,
le etichette dei campi, i riassunti dei pieghevoli, i bottoni. Cercare
«spessore del bordo» non poteva funzionare — quella cosa nell'indice non
c'era — e usciva il ripiego per somiglianza di lettere, che rispondeva Stato,
Personalità, Giochi.

E le ventiquattro non erano nemmeno tutte raggiungibili: `baseIndice()` girava
su `GRUPPI`, che elenca solo le **tredici** schede principali. Le altre dieci —
Scudo, Comandi vocali, Conoscenza, Penitenze, Musica, Clip… — stanno dentro le
famiglie e non comparivano. Le loro parole chiave erano scritte e non usate da
nessuno: «come blocco i bot» rispondeva Personalità perché lo Scudo non
esisteva, per la ricerca.

Adesso l'indice si **raccoglie dal pannello reso**. Tutti i pannelli sono già
nel documento all'avvio, anche quelli non in vista, quindi si cammina una volta
sola su `.pannello-scheda` e si prende:

| cosa | da dove |
| --- | --- |
| sezione | `.carta > h2, h3, h4` |
| campo | `label.campo`, `label.campo-num` |
| campo | `input/select/textarea` con `aria-label` |
| pieghevole | `details > summary` |
| azione | `button.btn` |

I campi che hanno un nome **solo** per il lettore di schermo entrano da qui:
sono quelli nati dai generatori (una riga per premio, una per membro, una per
contatore), e senza `aria-label` non avrebbero nessun testo da indicizzare. Il
lavoro sull'accessibilità e quello sulla ricerca sono la stessa cosa vista da
due lati.

Ogni voce porta il titolo della carta che la contiene come contesto, così la
riga si legge «Spessore del bordo — Pagina link · Tema». La chiave in memoria è
`scheda|testo`, non più la sola scheda: due campi diversi imparano separati.

Un'azione ripetuta ovunque non è una destinazione: i bottoni il cui testo
compare in più di tre posti (Salva, Copia, Elimina) restano fuori. Le etichette
ripetute invece restano, perché il contesto le distingue.

### Cosa resta scritto a mano, e perché

`CHIAVI` non sparisce, ma cambia mestiere. La raccolta copre quello che è
**scritto** nel pannello; `CHIAVI` copre quello che la gente **dice** e che a
schermo non c'è: «hate raid», «buttafuori», «linktree», «gif». Sono due insiemi
disgiunti, non la stessa cosa in due posti.

Per questo le parole di `CHIAVI` di una scheda pesano **62** invece di 34: sono
scelte apposta, non testo capitato lì. E una scheda prende **+40** rispetto a
un campo con lo stesso punteggio, perché a parità di segnale la sezione è la
risposta più utile. «Quanto costa» finisce su Abbonamento, non sul campo
«Slot: costo giocata».

### La frase esatta

Se quello che hai scritto è **esattamente** il titolo di una voce, quella voce
prende **+240** e vince su tutto. Se ci sta dentro, +96. Serve perché molte
etichette sono fatte quasi solo di parole vuote: «Quando sei in diretta»
diventa un solo token utile, e senza il peso della frase intera perdeva contro
qualunque altra riga che parlasse di diretta.

## Arrivare, non solo trovare

Aprire la scheda giusta e lasciare l'utente in cima a una pagina lunga non è
una risposta. Cliccando un risultato adesso:

1. si apre la scheda;
2. si scopre quello che lo nasconde — la sottoscheda giusta (Telegram, TikTok…)
   e, nell'Overlay Studio, il livello che fa comparire il suo pannello;
3. si aprono i pieghevoli che lo contengono;
4. si porta sotto gli occhi e si segna per due secondi e mezzo.

Il punto 4 **insiste**: il cambio scheda fa uno scorrimento in cima suo, e una
sola chiamata perdeva la corsa. Si ricontrolla cinque volte a distanza di
230 ms e si riporta a posto finché la cosa non è davvero in vista.

## Il cancello

`scripts/verifica-cerca.mjs`. Non è un elenco di ricerche scritto a mano —
quello sarebbe di nuovo la stessa cosa in due posti, con l'elenco che invecchia
mentre il pannello cambia. Le etichette si **raccolgono dal pannello** con una
raccolta indipendente da quella della ricerca, se ne prende un campione
regolare (ogni k-esima, sempre le stesse: niente dado) e per ognuna si chiede:
cercando il suo testo esatto, esce lei per prima?

Tre misure:

- cercando quello che c'è scritto, esce quello — **40 su 40**;
- cliccando ci si arriva davvero, sotto gli occhi;
- sei domande dette a parole finiscono nella scheda giusta.

Il confronto è sul senso, non sui caratteri: «Costo ( monete )» e «Costo
(monete)» sono la stessa etichetta. E la stessa etichetta in più schede vale in
tutte: «Posizione» sta nelle Penitenze e nell'Overlay Studio, e sono due
risposte giuste.

L'autoprova toglie ai pannelli l'attributo che li lega alla loro scheda: la
raccolta non trova più niente e resta l'indice scritto a mano, cioè la ricerca
com'era. Il cancello deve diventare rosso, e diventa rosso.

Prima di tutto questo: **0 su 40**.

## La trappola del fuoco

La finestra dichiarava `role="dialog" aria-modal="true"` — cioè prometteva che
fuori non c'è niente — e la funzione che doveva tenerlo dentro era **vuota**:

```js
function globali(e) {  }
```

Registrata in capture su `document` all'apertura, tolta alla chiusura: il posto
giusto, senza niente dentro. Chi naviga col Tab usciva dalla finestra e
continuava a girare nella pagina sotto, che non vede perché c'è il velo davanti.
Una promessa scritta nell'attributo e non mantenuta è peggio del non
prometterla.

Adesso `globali` fa tre cose: tiene il Tab dentro (in avanti e indietro), chiude
con Escape **da qualunque punto** della finestra — prima Escape stava solo sulla
casella di testo, quindi chi era arrivato su un bottone col Tab non poteva
uscire — e alla chiusura il fuoco torna dove era partito, invece di ripartire
dalla cima della pagina.

La finestra ha anche un nome (`aria-label`): senza, un lettore di schermo
annuncia «dialogo» e basta.

### Una prova che non provava niente

La prima versione del cancello costruiva l'evento a mano:

```js
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
```

Un evento sintetico **non muove il fuoco**: `document.activeElement` restava
dov'era, cioè dentro la finestra, e la prova era verde. Lo si è scoperto
mutando il codice — togliendo la trappola — e vedendo il cancello restare
verde lo stesso.

Adesso i tasti sono veri (`p.keyboard.press('Tab')`), e togliendo la trappola il
cancello diventa rosso: `avanti: FUORI · indietro: FUORI`.
