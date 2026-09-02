<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->

# Tutto quello che si chiama con un «!»

## La regola

**Ogni comando predefinito è una riga di `features/comandi-registro.js`.** Il
motore ci dispaccia dentro, il pannello la legge, il manuale la verifica. Un
comando nuovo nasce una volta sola e compare ovunque da sé.

## Il difetto da cui nasce

I comandi pronti erano righe di programma sparse in dieci moduli — `switch (cmd)`
nei giochi, catene di `if` nei comandi base, elenchi a mano nei sorteggi. Un
comando **non esisteva come oggetto**, quindi non c'era niente da spegnere,
rinominare o riservare.

Due sintomi visibili dalla chat:

- **`!giochi` rispondeva due volte.** `games.js` scriveva la sua lista, e subito
  sotto `trackinggiochi.js` scriveva la lista dei giochi con la webcam. Due
  moduli con due elenchi scritti a mano, nessuno dei due al corrente dell'altro.
  Chi la webcam non la usa si trovava in chat un elenco di roba che non ha.
- **Il pannello elencava dieci comandi su trenta**, e cinque giochi veri —
  `!pesca` `!roulette` `!furto` `!regala` `!manche` — non li nominava affatto,
  mentre il bot li annunciava da solo.

## La riga

```js
{ id: 'slot', modulo: 'giochi', nomi: ['slot'], titolo: 'Slot machine',
  cosa: 'Gioca alla slot: costa monete, il tris paga.', costa: true, attesa: 5 }
```

`id` è anche il **nome canonico**: i gestori sono scritti su quello. Le scelte
dello streamer stanno in `settings.comandi`, una riga per comando:

```js
{ furto: { off: true }, slot: { nome: 'macchinetta', chi: 'sub' } }
```

## Il vaglio, in un posto solo

`preparaComando(canale, msg)` gira **una volta**, in cima al bot, prima di ogni
gestore. Risponde una di quattro cose:

| | cosa vuol dire |
|---|---|
| `null` | non è un comando predefinito: passa tutto com'è (comandi tuoi, contatori, moduli) |
| `{ salta }` | è predefinito ma spento — suo, o della sua famiglia: i gestori pronti non lo vedono |
| `{ rifiuta }` | riservato, e chi ha scritto non ci arriva: il bot lo dice invece di tacere |
| `{ testo }` | il testo tradotto nel nome canonico, per i gestori |

I gestori restano dove sono e continuano a rispondere ai nomi canonici. È il
motivo per cui aggiungere una famiglia nuova non richiede di ritoccarli: il
vaglio è già in cima.

## Le famiglie

Un comando può essere acceso e restare muto lo stesso, perché la famiglia a cui
appartiene è spenta (`tracking.giochi`, `watchtime.attivo`, `comandiChat.attivo`…).
È giusto, ed è la ragione per cui lo stato di un comando **non si legge dal suo
solo interruttore**: `elenco()` distingue `acceso` (il suo interruttore) da
`vivo` (acceso **e** famiglia accesa), e il pannello mostra la differenza invece
di lasciarla indovinare.

## Rinominare sostituisce

Se dai un nome tuo, i nomi di serie **smettono di rispondere**. L'alternativa —
il tuo nome *in più* — lascerebbe vivo `!rapina` dopo che hai rinominato
`!furto`, e nessuno saprebbe spiegare perché.

Un comando può dichiarare `rinominabile: false` quando il suo nome è già scelto
altrove: `!join` lo decide chi apre il sorteggio, e due meccanismi per la stessa
cosa sono un modo garantito di sfasarsi.

## Quello che non si può costruire

- **Due comandi sulla stessa parola**: il secondo non partirebbe mai. Il server
  rifiuta il salvataggio e dice quale nome è già preso.
- **Spegnere `!giochi`**: è l'elenco, non un gioco (`spegnibile: false`).
- **Abbassare il livello sotto quello di serie**: `!so` è da moderatori e resta
  da moderatori; si può alzare, mai abbassare.
- **Un livello inventato, o un comando che non esiste**: la normalizzazione
  tiene solo quello che il registro conosce.

## Aggiungere un comando (la ricetta)

Il punto di tutto questo è che costi poco farlo. Serve **una riga** in
`features/comandi-registro.js`:

```js
{ id: 'ruota', modulo: 'giochi', nomi: ['ruota', 'wheel'],
  titolo: ['Ruota della fortuna', 'Wheel of fortune', 'Rueda de la fortuna'],
  cosa: ['Gira la ruota: costa monete e paga a caso.',
         'Spin the wheel: it costs coins and pays at random.',
         'Gira la rueda: cuesta monedas y paga al azar.'],
  costa: true, attesa: 10 }
```

Quel che non scrivi prende il valore normale (`chi: 'tutti'`, spegnibile,
rinominabile, senza costo, senza attesa). Poi:

1. un blocco nel gestore della famiglia che conosca `'ruota'`;
2. `node scripts/verifica-comandi.mjs`, che ti dice cosa manca.

Non c'è altro: pannello, `!giochi`, manuale e demo lo trovano da soli.

## Le tre lingue

`titolo` e `cosa` sono terne `[italiano, inglese, spagnolo]`, la stessa forma
che il resto del prodotto usa già. Il pannello accetta anche una stringa sola
(la mostra com'è) — si può scrivere una riga di fretta in una lingua e finirla
dopo — ma il cancello resta **rosso** finché le tre non ci sono, così «dopo» non
diventa mai.

## Il cancello

```
node scripts/verifica-comandi.mjs
```

- ogni riga ha un gestore che conosce quel nome (una riga orfana sarebbe un
  comando che il pannello mostra e la chat non conosce);
- nessuna riga rivendica una parola già di un'altra;
- ogni livello di serie è uno di quelli previsti;
- la copia finta della demo copre **esattamente** il registro;
- nessun gestore si tiene un elenco dei giochi scritto a mano — quello lo
  costruisce il registro, che è il difetto originale reso impossibile.

Provato rosso su tutti e cinque prima di dichiararlo verde.
