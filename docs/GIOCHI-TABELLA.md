<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->

# I giochi sono una tabella

## Il difetto

I giochi erano **quattordici blocchi `case`** dentro `features/games.js`. Il guaio
non era il codice: era che un gioco **non esisteva come oggetto**. Non lo si
poteva spegnere, rinominare o riservare, perché non c'era niente da spegnere —
c'erano righe di programma.

E il pannello, per elencarli, **se li riscriveva a mano**. Misurato:

| | quanti |
|---|---|
| nomi che il motore riconosce | **30** |
| nomi elencati nel pannello | **10** |
| giochi che il pannello non nominava affatto | `!pesca` `!roulette` `!furto` `!regala` `!manche` |

Quattro di quelli mancanti il bot **li annuncia da solo** in chat quando qualcuno
scrive `!giochi`. Il pannello diceva una cosa, la chat ne diceva un'altra.

## La regola

Un gioco è **una riga di `features/giochi-tabella.js`**. Il motore ci dispaccia
dentro, il pannello la legge, il manuale la verifica. Un gioco nuovo nasce una
volta sola e compare ovunque da sé.

```js
{ id: 'slot', nomi: ['slot'], titolo: 'Slot machine',
  cosa: 'Gioca alla slot: costa monete, il tris paga.', costa: true, attesa: 5 }
```

Le scelte dello streamer stanno in `settings.giochiComandi`, una riga per gioco:

```js
{ furto: { off: true }, slot: { nome: 'macchinetta', chi: 'sub' } }
```

Il dispatch non fa più `switch (parolaScritta)`: risolve prima la parola nella
tabella (**con** le scelte del canale), applica spento/livello, e **poi** entra
nel blocco per `id`. Gli `case` sono gli id, non le parole.

## Rinominare sostituisce

Se dai un nome tuo a un gioco, i nomi di serie **smettono di rispondere**. Un
gioco ha un nome, e lo scegli tu; gli alias (`!roll`, `!coin`, `!fish`…) sono una
comodità finché non ti serve la tua parola.

L'alternativa — il tuo nome *in più* — lascerebbe vivo `!rapina` dopo che hai
rinominato `!furto`, e nessuno saprebbe spiegare perché.

## Quello che non si può costruire

- **Due giochi con la stessa parola**: il secondo non partirebbe mai. Il server
  rifiuta il salvataggio e dice quale nome è già preso.
- **Spegnere `!giochi`**: è l'elenco, non un gioco. `spegnibile: false`, e la
  normalizzazione butta via la richiesta invece di fingere.
- **Un livello inventato** o **un gioco che non esiste**: la normalizzazione
  tiene solo quello che la tabella conosce.

## I cancelli

`verifica-manuali.mjs` non legge più i `case` per sapere quali giochi esistono —
legge la tabella — e in più controlla i due versi:

- ogni riga della tabella ha il suo blocco nel motore (un gioco che il pannello
  mostra e la chat non conosce);
- nessun blocco del motore resta fuori dalla tabella (un gioco invisibile).

`test/unita/giochi-comandi.test.mjs` prova il contratto **sul motore vero**: che
spento non risponda, che il vecchio nome taccia dopo un rename, che un riservato
risponda dicendo a chi è riservato, e che `!giochi` elenchi quello che risponde
davvero.
