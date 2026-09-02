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
- **Il piede della vetrina** — un collegamento in più fra le pagine pubbliche.

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
  vere, prosa attorno ignorata, date in italiano.
- `scripts/verifica-novita.mjs`: date sane e non nel futuro, righe senza gergo,
  e la regola del commit. Provato rosso con un commit che tocca `src/` e tace.
