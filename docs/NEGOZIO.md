# Il negozio del canale

Un negozio vero in cui si paga solo con le monete del canale, cioè con il tempo
passato in chat e in diretta. Niente soldi: le monete non si comprano e non si
cambiano, si guadagnano esserci. Lo streamer decide cosa c'è, quanto costa e
chi lo può comprare; lo spettatore compra dalla chat, vede quello che ha, e
certe cose le sblocca solo con la fedeltà (mesi di abbonamento, Bit, ore, serie
di presenze).

Questo documento è il piano.

## Il modello

### L'articolo

| campo | cosa dice |
|---|---|
| nome, descrizione, immagine | come si vede nel negozio |
| prezzo | in monete |
| cosa fa | uno dei tipi qui sotto |
| scorte | illimitate, oppure N in tutto, oppure N a persona |
| attesa | a persona e per tutti, come i giochi |
| requisiti | vedi sotto; tutti quelli messi devono valere |
| si vede | sempre, oppure solo a chi lo può comprare |
| quando | sempre, solo in diretta, o fra due date |

### Cosa fa un articolo

1. **Oggetto da collezione**: va nella borsa dello spettatore e ci resta
   (`!borsa` lo mostra). Può servire ad altro: l'arena legge la borsa (un'emote
   o un oggetto con cui si parte).
2. **Effetto a schermo**: uno degli effetti dell'overlay (suono, immagine,
   video, effetti pronti).
3. **VIP a tempo**: per N dirette, come il premio della classifica.
4. **Ruolo su Discord**: col collegamento dei Ruoli che c'è già.
5. **Richiesta musicale in testa alla coda**.
6. **Messaggio in evidenza** in chat (l'annuncio colorato di Twitch).
7. **Un Modulo**: l'acquisto fa partire un Modulo, quindi tutto quello che il
   bot sa fare (cambiare scena, un contatore, un testo a schermo, una frase).
8. **Da consegnare a mano**: «scegli il prossimo gioco», «un saluto in
   diretta». L'acquisto finisce in una coda nel pannello; lo streamer segna
   «fatto», oppure lo rifiuta e le monete tornano indietro.

### I requisiti

Si leggono da dove stanno davvero, al momento dell'acquisto:

| requisito | da dove |
|---|---|
| abbonato da almeno N mesi (anche non di fila) | i mesi scritti nel messaggio di chat (il badge) |
| abbonato di almeno un certo tier | Twitch, al momento |
| almeno N Bit nel canale, da sempre | la classifica di Twitch per quella persona (lo stesso numero di `!bit`, non un conto nostro) |
| almeno N ore guardate | le presenze che il bot conta già |
| serie di almeno N dirette | la serie di presenze |
| follower da almeno N giorni | Twitch |
| ruolo | VIP, moderatore |

Un requisito che non si può leggere (per esempio i Bit con il permesso
mancante) non fa comprare, e lo dice: meglio un «non riesco a verificarlo» che
un acquisto dato a chi non doveva.

### Comprare

- In chat: `!negozio` (il link e i tre articoli più comprati), `!compra nome`,
  `!borsa`. I nomi si rinominano come gli altri comandi.
- Il bot risponde a chi compra: fatto, oppure perché no (monete, requisito,
  scorte, attesa), con le parole della voce del canale.
- Un acquisto è una cosa sola: le monete tolte, la scorta scalata e l'effetto
  partono insieme o non parte niente. Se l'effetto non può partire (overlay
  spento, VIP pieni, Discord non collegato), le monete tornano.
- Sul sito, la pagina del negozio del canale (accanto alla pagina link): gli
  articoli con prezzo, requisiti e scorte, e come si compra. In sola lettura:
  per comprare si usa la chat, che sa già chi sei.
- Sull'overlay, se lo si vuole: l'acquisto annunciato come un alert.

### Il pannello

Una scheda **Negozio** nel gruppo della chat:

- **Articoli**: l'elenco, i modelli pronti (un effetto, un VIP per una diretta,
  «scegli il prossimo gioco», un oggetto della borsa), l'anteprima di come si
  vede nella pagina;
- **Da consegnare**: la coda degli acquisti a mano, con «fatto» e «rifiuta e
  rimborsa»;
- **Storico**: chi ha comprato cosa e quando, e quante monete sono girate.

Le monete, le regole per guadagnarle e la classifica restano dove sono (Giochi,
Classifica & VIP): il negozio le spende soltanto.

## Cosa non è

- Non si vende niente per soldi, e le monete non diventano soldi.
- Non tocca i punti canale di Twitch: sono un'altra valuta, di Twitch.
- Il negozio di un canale non vede niente degli altri canali.

## In che ordine

1. Il cuore: articoli, requisiti, acquisto atomico con rimborso, borsa,
   storico (server e prove).
2. I tipi di articolo, dal più semplice: oggetto, effetto, Modulo, da
   consegnare; poi VIP, Discord, musica, messaggio in evidenza.
3. I comandi in chat, con le frasi dalla voce del canale.
4. La scheda Negozio nel pannello.
5. La pagina pubblica del negozio e l'alert sull'overlay.
6. Il legame con l'arena (emote e oggetti di partenza dalla borsa).
7. Manuale, novità, nelle tre lingue.
