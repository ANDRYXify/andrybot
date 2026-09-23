# Le novità: come una cosa nuova arriva a chi usa il bot

> «Non ha senso aggiungere funzioni che l'utente manco sa che esistano.»

Il difetto non era che mancasse un changelog. Era che **una funzione nuova e il
modo di raccontarla nascono in due momenti diversi**, e il secondo si dimentica
sempre — esattamente come si dimenticava un file nell'elenco del guscio o un
timbro su un'icona. Un elenco da aggiornare a parte non è un metodo.

## La regola

**La riga si scrive nello stesso commit della cosa.** In `NOVITA.md`, in fondo
alla giornata di oggi. Se quel commit non cambia niente per chi trasmette, lo si
dichiara nel messaggio: `Novità: nessuna (perché)`.

`scripts/verifica-novita.mjs` guarda i commit che stanno per essere spinti: se
uno tocca `src/` e non fa né l'una né l'altra cosa, **il push non parte**. Non è
una preferenza di forma: quello è l'unico momento in cui si sa cosa è cambiato e
perché.

## Da lì in poi non tocca a nessuno

Tutto il resto legge quel file, e succede da sé:

- **`/novita`** — pagina pubblica, stesso guscio delle guide, indicizzabile. Il
  suo posto nella sitemap arriva da `urlGuide()`, con la data dell'ultima
  giornata come `lastmod`: contenuto che si aggiorna, che è quello che i motori
  guardano.
- **La finestra all'ingresso** — chi torna dopo un aggiornamento non deve andare
  a cercare cosa è cambiato: glielo si dice una volta, entrando
  (`/api/novita/da-vedere`). Chi entra per la prima volta non si è perso niente:
  si segna il punto e da domani vede solo il nuovo. È l'unico posto delle
  novità da vedere, e il «visto» sta sul server: vale su ogni dispositivo.
- **`/api/novita`** — le stesse novità in forma di dati, per chi le legge da
  fuori.

C'era anche una scheda in cima al pannello, e se n'è andata. Mostrava le prime
quattro righe dell'ultima giornata, col «visto» tenuto dal solo browser: a ogni
riga nuova tornava, con le stesse quattro righe. Due posti per la stessa cosa,
con due memorie diverse, non si possono tenere d'accordo; uno solo sì.
- **Il piede della vetrina** — un collegamento in più fra le pagine pubbliche.

## Il segnaposto: le righe viste, non un punto nella lista

Una giornata **non è chiusa quando comincia**: resta aperta e si allunga per
tutto il giorno. Il 10 settembre aveva 18 righe al mattino e 47 la sera.

**Primo tentativo, il giorno.** Segnarla vista col solo nome del giorno butta
via tutto quello che arriva dopo, e per sempre: il confronto è «giorno più
recente di quello segnato», e quel giorno non lo sarà mai più.

**Secondo tentativo, il conto.** `AAAA-MM-GG#quante`: la giornata e quante
righe aveva, con l'idea che le nuove entrino in cima e siano quindi le prime
`(ora − allora)`. Ma la regola di scrittura, qui sopra, dice **in fondo**; e
chi guarda da amministratore ha le righe private accodate dopo le pubbliche
della stessa giornata. Il conto indicava le righe vecchie: a ogni riga nuova
se ne rivedeva una già vista, e quella nuova, in fondo, non usciva mai. Le
stesse novità tornavano e le importanti (Instagram, i giochi) non arrivavano.

Non era un conto da correggere: era un modello che dipendeva da **dove** si
scrive una riga, e non deve dipenderne. Quindi:

**Ogni riga ha un'impronta sua**, calcolata dalla data e dal testo (FNV-1a a 32
bit, senza dipendenze). Il segnaposto è l'insieme delle impronte viste:

    v2:AAAA-MM-GG:impronta.impronta.impronta

Tiene le righe delle ultime tre giornate, e la data della più vecchia delle tre:
quello che viene prima è visto. Le righe si scrivono nella giornata di oggi,
quindi la finestra copre sempre quelle che possono ancora cambiare. Da qui:

- la posizione non conta più, e pubbliche e private non si pestano i piedi;
- una riga **riscritta** torna a vedersi: è cambiata, va riletta;
- marcare `[importante]` una riga già vista **non** la fa tornare: il segno sta
  fuori dal testo, e l'impronta è la stessa.

Restano vere le due regole di prima: **lo calcola chi mostra, sulla forma che
mostra** (a chi vede anche le righe private le impronte le comprendono), e **il
segnaposto torna indietro com'era**, così fra il mostrare e il segnare non c'è
spazio per una riga che entra di nascosto.

**Il segnaposto vecchio** (`giorno#quante` o il solo giorno) non dice quali righe
sono state viste: il conto, si è visto, indicava quelle sbagliate. Quella
giornata si rimostra intera, una volta, e delle giornate della settimana prima si
rimostrano le **importanti**: sono proprio quelle che il conto sbagliato può aver
nascosto. Alla chiusura il segnaposto diventa quello nuovo.

## Le importanti

Non tutte le righe pesano uguale. Una funzione nuova che cambia cosa puoi fare
non è una correzione di una virgola, e mostrarle allo stesso modo vuol dire che
la prima si perde fra le seconde. Il peso lo decide chi scrive, nello stesso
commit, con un segno in testa:

```
- [importante] Instagram si collega con un tasto. [vai: notifiche]
```

Il criterio sta in cima a `NOVITA.md`: una **capacità nuova** (una funzione, un
gioco, un collegamento), non una correzione né una rifinitura. Si combina con
`[privato]` in qualunque ordine.

- **Nella finestra all'ingresso** le importanti escono per prime, in un riquadro
  «In evidenza» più grande, dalla più recente. Hanno un tetto loro (dodici) e
  non passano dal taglio delle altre; le altre riempiono il posto che resta.
- **Sulla pagina `/novita`** stanno in cima alla loro giornata, in un riquadro.

## Il tetto

Il tetto è sulle **righe**, non sulle giornate: una giornata da quaranta righe è
un muro anche se è una sola, e un muro non si legge. Si mostra quanto si legge,
dalla riga più recente (le righe si scrivono in fondo alla giornata, quindi la
più nuova è l'ultima), si dice quante restano, e restano tutte in `/novita`.
L'ordine decide solo cosa entra sotto il tetto: cosa hai visto lo decide
l'impronta.

## Dove è successa

Una riga dice cosa è cambiato. Da sola non dice **dove andare a vederlo**, e chi
legge deve mettersi a cercare la scheda giusta — cioè la novità si ferma a essere
un annuncio invece di diventare una cosa che provi.

La destinazione si scrive in fondo alla riga, nello stesso commit della cosa:

```
- I menù con tante voci non si schiacciano più. [vai: consolify]
```

È un identificativo di scheda, e basta quello. Il **nome** non si scrive qui: si
ricava, così non esiste una riga che chiama una cosa con un nome che nel pannello
non c'è più. Da lì ognuno la dice a modo suo:

- **nel pannello** le righe vicine si raccolgono sotto il titolo di quella
  scheda, con l'area sopra («Durante la diretta · CONSOLify»), e il titolo è il
  bottone: chiude la finestra e apre quella scheda;
- **sulla pagina pubblica** lo stesso titolo è un collegamento alla guida o al
  manuale che spiega quella scheda — fuori dal pannello non si apre una scheda,
  si apre una pagina.

Si raggruppa **per destinazione**, nell'ordine in cui compare la prima volta, non
per vicinanza: due blocchi della stessa sezione separati da una riga qualsiasi
darebbero lo stesso titolo due volte a tre righe di distanza, e un titolo
ripetuto si legge come un difetto.

`scripts/verifica-novita.mjs` boccia una destinazione che non è una scheda vera.
La mappa che usa è la stessa che dice quale pagina spiega quella scheda, quindi
un `[vai:]` verde vuol dire che la freccia funziona **dentro e fuori** dal
pannello. Provato rosso con `[vai: schedainesistente]`.

## Come si scrive una riga

Una riga dice **cosa puoi fare adesso che prima non potevi**, o cosa non si
rompe più. Al lettore, non al programmatore: niente nomi di file, niente gergo
(`refactor`, `endpoint`, `commit`…), niente emoji, due frasi al massimo. Il
cancello controlla anche questo — e la prima riga bocciata è stata quella che
annunciava le novità stesse, perché diceva «chi non legge i commit».

Il file resta **scritto a mano** di proposito. Il messaggio di un commit racconta
il lavoro; la riga in `NOVITA.md` racconta cosa cambia per chi trasmette: sono
due cose diverse, e generare la seconda dalla prima darebbe un elenco tecnico
travestito da annuncio. L'automatismo sta dove serve — nella pubblicazione e
nella disciplina — non nella scrittura.

## Le prove

- `test/contratto/novita.test.mjs` legge il file vero: giornate in ordine, righe
  vere, prosa attorno ignorata, date in italiano. E il segnaposto: una riga
  aggiunta a giornata già vista esce lo stesso, il conto segue quello che quella
  persona vede, il tetto non perde il conto di quante restano. Provato rosso
  rimettendo il confronto per giorno: quattro prove su ventitré diventano rosse.
- `scripts/verifica-novita.mjs`: date sane e non nel futuro, righe senza gergo,
  e la regola del commit. Provato rosso con un commit che tocca `src/` e tace.
