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
- **La scheda in cima al pannello** — compare solo se c'è qualcosa di più
  recente dell'ultima volta che quel browser ha detto «visto» (`/api/novita` +
  `localStorage`). Niente da salvare sul server, niente pallino che resta acceso.
- **La finestra all'ingresso** — chi torna dopo un aggiornamento non deve andare
  a cercare cosa è cambiato: glielo si dice una volta, entrando
  (`/api/novita/da-vedere`). Chi entra per la prima volta non si è perso niente:
  si segna il punto e da domani vede solo il nuovo.
- **Il piede della vetrina** — un collegamento in più fra le pagine pubbliche.

## Il segnaposto: un punto nella lista, non un giorno

Una giornata **non è chiusa quando comincia**: resta aperta e si allunga per
tutto il giorno. Il 10 settembre aveva 18 righe al mattino e 47 la sera.

Segnarla vista col solo nome del giorno sembra funzionare e non funziona: il
confronto è «giorno più recente di quello segnato», e quel giorno non lo sarà
mai più. Le 29 righe arrivate dopo **non si sarebbero viste mai**. È il difetto
di sempre — una riga che sembra fare una cosa e non la fa — travestito da valore
che significa due cose: «visto fino a qui» e «visto tutto quel giorno».

Quindi il segnaposto è `AAAA-MM-GG#quante`: la giornata in cima e **quante righe
aveva quando l'hai vista**. Le righe nuove entrano in cima alla giornata, perciò
quelle non viste sono le prime `(ora − allora)`.

Tre cose lo tengono in piedi:

1. **Lo calcola chi mostra, sulla forma che mostra.** A chi vede anche le righe
   private il conto le comprende, a chi vede solo le pubbliche no. Leggere e
   segnare passano dalla stessa funzione, quindi contano le stesse righe.
2. **Il segnaposto torna indietro com'era.** Non è la pagina a decidere il
   numero: riceve il segnaposto e lo ridà uguale. Fra il mostrare e il segnare
   non c'è spazio per una riga che sparisce.
3. **Un segnaposto vecchio — la sola data — non dice quante righe c'erano**, e
   non si può inventare. Quella giornata si rimostra intera una volta sola:
   rivedere qualche riga è una seccatura, perderne ventinove no.

Il tetto è sulle **righe**, non sulle giornate: una giornata da quaranta righe è
un muro anche se è una sola, e un muro non si legge. Si mostra quanto si legge,
si dice quante restano, e restano tutte in `/novita`.

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
