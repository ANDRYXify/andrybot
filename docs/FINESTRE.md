# Le finestre del pannello

Quando il pannello chiede una conferma, un nome o di copiare qualcosa, lo fa con
le sue finestre. Quelle del browser (`alert`, `confirm`, `prompt`) non si usano.

## Perché non quelle del browser

- Non sono tradotte: i tasti sono nella lingua del browser, e in cima c'è
  «socialbot.live dice».
- Non hanno l'aspetto del pannello, e sul telefono sembrano un avviso di sistema.
- Bloccano tutta la scheda finché non si risponde.
- Il browser le può zittire («non mostrare altre finestre da questa pagina»).
  Da lì in poi `confirm()` risponde «no» e `prompt()` niente, senza che nessuno
  se ne accorga: l'azione semplicemente non succede.

## Cosa si usa

| serve | funzione | cosa torna |
|---|---|---|
| una conferma | `chiediSe({ titolo, testo, si, no, pericolo })` | `true` solo se si preme «sì» |
| una scelta fra più tasti | `chiediScelta({ titolo, testo, azioni, fuoco })` | l'`id` del tasto, o `null` |
| un nome o un testo | `chiediTesto({ titolo, testo, valore, ok, max, pericolo })` | il testo, o `null` |
| copiare | `copiaTesto(testo, msgOk, finestra)` | `true` se è copiato |
| un avviso | `toast(testo, tipo)` | niente |

Tutte si chiudono con Esc o toccando fuori, e il tasto per restare dove si è
dice cosa succede («Lascia stare», «Resta qui»), non «Annulla».

Quando una conferma porta via qualcosa (`chiediSe` con `pericolo: true`), il
tasto che distrugge è rosso e il fuoco parte da quello che non tocca niente: un
Invio dato per abitudine non cancella.

## Copiare

`copiaTesto` prova a copiare da sola. Se il browser non lo permette (succede
fuori da HTTPS, in alcune finestre incorporate, o se il permesso è negato),
apre `chiediCopia`: il testo compare già selezionato in un riquadro, con il
tasto «Copia». Se non riesce neanche quello, sotto compare cosa fare, detto per
il dispositivo che si ha in mano.

## I tasti, per il dispositivo che si ha

«Ctrl+C» vale su Windows e Linux. Sul Mac il tasto è ⌘, e sul telefono una
tastiera non c'è. `_dispositivo` guarda una volta il sistema e il puntatore:

- `scorciatoia('mod', 'C')` dà «⌘C» sul Mac e «Ctrl+C» altrove; `alt` e
  `maiusc` diventano ⌥ e ⇧ sul Mac, Alt e Maiusc altrove;
- `traTasti(combo)` mette la scorciatoia fra parentesi dopo un nome, e sui
  dispositivi solo a tocco non mette niente;
- `comeCopiare()` dice «premi ⌘C» o «premi Ctrl+C», e sul telefono «tieni
  premuto sul testo e scegli Copia».

«Solo a tocco» è `(any-pointer: fine)` che non vale: un tablet con la tastiera e
il mouse attaccati mostra i tasti.

## L'unica eccezione: il segnalibro delle citazioni

Il segnalibro che importa le citazioni gira sulla pagina di un altro sito, non
nel pannello. Lì le nostre finestre non esistono, quindi usa quelle del
browser: sono le sole che ci sono.

Per lo stesso motivo il segnalibro viaggia da solo. Nasce da una funzione del
pannello, `_xlaGrabFn`, trasformata in testo con `_xlaGrabFn.toString()`, e sul
sito dell'altro i nomi del pannello non ci sono. Dentro, quindi, nessun nome
coincide con uno dei nostri script: né chiamato (non esisterebbe), né dichiarato
(si leggerebbe come quello del pannello e non lo è). È così che era nato un
guasto: dentro il segnalibro `L('...')` doveva tradurre, e invece `L` era
l'elenco delle righe della pagina.

I testi del segnalibro si traducono nel pannello e ci entrano già pronti, al
posto di `__TESTI__`. Il link che ne esce è tutto in caratteri semplici: le
lettere accentate diventano `\uXXXX`, e `%` diventa `%25`, perché il browser,
prima di eseguire un link `javascript:`, decodifica ogni `%` seguito da due cifre.

Il pannello che arriva al browser è minificato, quindi il segnalibro nasce dal
codice minificato: il test lo costruisce allo stesso modo e lo prova su una
pagina finta, sul Mac, su Windows e al tocco.

## La finestra che resta

Uscire dalla pagina con modifiche non salvate mostra ancora la domanda del
browser («Vuoi uscire dal sito?»). Lì i browser non lasciano mettere una
finestra propria: si può solo chiedere la loro.

## Il cancello

`scripts/verifica-finestre.mjs` legge tutti gli script serviti (tranne
`vendor/`, che è codice di altri) e boccia:

- `alert`, `confirm`, `prompt` del browser, chiamate o passate, anche come
  `window.alert`, `globalThis?.confirm`, `self['prompt']`;
- una funzione che si chiama come una finestra dichiarata dentro un'altra
  funzione (le `alert` dell'overlay, che sono gli avvisi di Twitch, stanno al
  primo livello del loro file, e lì il nome dice una cosa sola);
- dentro una funzione che viaggia, un nome dei nostri script;
- una funzione che viaggia con un nome che nel file ha anche un'altra
  dichiarazione.

Chi viaggia si riconosce da come parte: `NOME.toString()`, con `NOME` una
funzione di primo livello. Una funzione che partisse in un altro modo non ha
l'eccezione: se usasse una finestra del browser, il cancello la boccerebbe.

`--selftest` prova le rotture che deve vedere e le cose giuste che non deve
toccare. Poi mette una finestra all'inizio, a metà e in fondo a ogni script
vero: se la lettura di un file si perdesse in qualche punto, quello che viene
dopo non si vedrebbe più.
