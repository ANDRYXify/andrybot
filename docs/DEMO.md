<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# La demo

La demo è il pannello di un canale finto, aperto a chi non è entrato. È lo stesso `app.js`: le
chiamate al server le risponde `apiDemo` con i dati del canale finto, e quello che si salva resta
nel browser (`_demoScritture`). Da lì nascono anche i video tutorial (docs/VIDEO.md).

## La regola

**Tutto quello che il pannello chiede al server, la demo lo deve avere.** O lo finge `apiDemo`,
o la richiesta passa dal cancello della sessione (`vetrina.js`) e il server risponde davvero. Una
terza strada non c'è: una richiesta che nessuno dei due conosce, per chi guarda la demo, è un
pezzo di prodotto rotto.

## I due buchi trovati facendo i video

**I moduli che compone il server.** Il pannello importa `/js/economia-regole.js` (i conti delle
monete) e l'editor della carta importa `/js/carta-disegno.js` e i caratteri `/font/…`. Il guscio
ricava le risorse delle pagine pubbliche dai file di `public/`, e questi non sono file: li compone
il server. Il cancello li chiudeva a chi è senza sessione, quindi nella demo i conti delle monete
restavano vuoti e l'editor della carta non si apriva.

Ora le rotte li dichiarano al guscio nel punto in cui li servono, e il cancello delle porte
(`scripts/verifica-porte.mjs`) controlla ogni `import` e ogni `url(` delle pagine pubbliche: un
modulo nuovo che la demo non riceverebbe nasce rosso.

**L'anteprima delle pagine.** L'editor della pagina link, delle donazioni e del negozio mostra la
pagina vera: il server la rende con `renderLinkPage` da quello che c'è nell'editor, senza
salvarla. La rotta vuole la sessione del proprietario, e `apiDemo` non la fingeva: nella demo
l'anteprima era nera.

Fingerla nel browser vorrebbe dire una seconda copia del disegno delle pagine, che prima o poi non
combacia. Quindi la demo chiede la stessa cosa allo stesso disegno, con una porta sua:

```
POST /api/demo/anteprima  { quale: link | dona | negozio, pagina, canale }
```

- `pagina` è quello che c'è nell'editor, e passa dalla stessa pulizia del salvataggio
  (`linkPage`, `paginaDona`, `paginaNegozio`.`pulisci`).
- `canale` è il canale finto, come lo tiene la demo: il nome, la lingua della chat, l'aspetto della
  pagina link, le donazioni, la moneta e gli articoli del negozio. Il server lo pulisce con le
  stesse funzioni con cui pulisce quello vero (`normArticolo`, `monetaDa`, `datiSostieni`).
- Le funzioni del negozio che leggevano il database e scrivevano la pagina insieme si dividono in
  due: la lettura (`inVetrina`, `vetrinaPagina`, `frase`) e la parte pura (`vetrinaDi`,
  `vetrinaDa`, `fraseCon`). La pagina vera usa la prima che chiama la seconda; la demo chiama la
  seconda coi suoi dati. Il disegno è uno.

La porta non legge e non scrive niente: niente database, niente rete (i canali YouTube scritti
come `@nome` restano come sono, invece di chiederli a YouTube). Rende una pagina e la restituisce
a chi l'ha chiesta, come JSON: non c'è un indirizzo dove quella pagina si apre. Ha un tetto al
minuto per indirizzo, come le altre porte pubbliche che costano qualcosa.

## Le prove

- Unità: l'anteprima della demo è quella che rende la pagina vera con gli stessi dati; un articolo
  spento, nascosto o fuori date non compare; un articolo che non si potrebbe salvare non compare;
  il testo dell'editor arriva pulito come al salvataggio.
- Il cancello delle porte: la porta è nell'elenco delle pubbliche e aperta nel cancello.
- Nel browser: nella demo l'anteprima delle tre pagine ha la pagina dentro, non il nero.
