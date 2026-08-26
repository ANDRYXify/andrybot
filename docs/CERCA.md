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
