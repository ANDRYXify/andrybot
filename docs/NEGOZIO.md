<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
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

## Com'è fatto (punti 1-4)

### I dati

Quattro tabelle, tutte con la colonna del canale: l'esportazione e la
cancellazione dell'account le prendono da sole.

- `negozio_articoli`: l'articolo. Le scorte sono **una scelta sola**, come nel
  modello: illimitate, N in tutto (la colonna tiene quante ne *restano*), N a
  persona.
- `negozio_requisiti`: uno per tipo, tutti devono valere.
- `negozio_borsa`: quello che una persona tiene (gli oggetti).
- `negozio_acquisti`: lo storico e la coda da consegnare. Quante volte una
  persona ha preso un articolo, e quando, **non si scrive due volte**: si legge
  da qui. Un acquisto rimborsato non conta né per le scorte a persona né per le
  attese.

### L'acquisto

1. **Prima si guarda, senza toccare niente**: che l'articolo ci sia, il momento
   (sempre, in diretta, fra due date), scorte, attese, requisiti, monete, e se
   l'effetto adesso può partire (`puoPartire` di ogni tipo). Chi riceve un no
   non ha perso niente.
2. **Poi una transazione sola** (`IMMEDIATE`, cioè presa la scrittura prima di
   leggere): le monete si tolgono con un `UPDATE` che vale solo se bastano, la
   scorta con uno che vale solo se ce n'è, e la riga dello storico nasce
   insieme. Dentro si ricontrolla quello che nel frattempo può essere cambiato:
   due acquisti dell'ultima scorta arrivano qui uno dopo l'altro, e il secondo
   trova zero. Le guardie sono due (il ricontrollo e l'`UPDATE` condizionato):
   ognuna da sola basta.
3. **Poi l'effetto.** Se non parte, un rimborso esplicito: monete e scorta
   tornano, lo storico dice il perché. Il rimborso vale una volta sola per
   costruzione (lo stato cambia solo se era ancora uno da cui si torna).
   Un acquisto rimasto a metà da un riavvio si rende all'avvio.

L'oggetto della borsa e il «da consegnare a mano» non hanno un effetto fuori dal
database: il loro acquisto finisce tutto dentro la transazione.

### I requisiti

Si leggono al momento, e un «non lo so» non vale né sì né no: non fa comprare,
e il bot dice che non riesce a verificarlo. Prima quelli di casa (il badge del
messaggio, ore, serie, ruolo), poi quelli di Twitch: se uno di casa manca,
Twitch non si disturba. I Bit sono quelli della classifica di sempre di Twitch
(la stessa di `!bit sempre`); se la persona non c'è e la classifica è intera,
non ha mai cheerato; se la classifica è piena, si chiede a Twitch per lei sola.

### I tipi

Ognuno usa il pezzo che c'è già: l'overlay degli effetti, i Moduli (senza
far pagare il loro «Costa» una seconda volta; il dado perso è parte
dell'acquisto), il VIP a dirette del premio (chi ne ha già uno a dirette lo
allunga; chi lo ha per sempre o a una data non lo compra), i Ruoli di Discord
(solo ruoli che nessuna regola governa: il giro dei ruoli li toglierebbe), la
coda di Spotify, l'annuncio di Twitch.

**La musica «in testa alla coda».** Spotify lascia solo aggiungere in fondo
alla coda di chi ascolta: nessuna chiamata mette un brano in un punto scelto.
La richiesta comprata entra quindi nella coda come `!sr` (senza le sue regole,
perché è già pagata), e suona dopo il brano di adesso e dopo le richieste già
in coda, prima della playlist. Il pannello e il manuale lo dicono così.

### Le frasi

Stanno in un posto solo, `frase(canale, momento, dati)` in
`src/features/negozio.js`, nelle tre lingue, con numeri, date e durate delle
preferenze del canale. Quando la voce del canale (docs/VOCE.md) arriva, diventano
momenti del suo frasario.

### Quanto si tiene

Lo storico un anno, come le donazioni; quello ancora da consegnare finché lo
streamer non decide. La borsa finché lo streamer non toglie l'articolo o
cancella il canale. L'informativa lo dice nelle tre lingue.

### Cosa serve ai punti 5 e 6

- **La pagina pubblica**: gli articoli che si mostrano a tutti sono già quelli
  di `inVetrina()`. L'immagine di un articolo è un'immagine della libreria del
  canale (`effetto:<comando>`): il pannello la mostra dietro la sessione, e la
  pagina pubblica ha bisogno di una porta sua, senza la chiave dell'overlay.
  Il link della pagina va aggiunto alla risposta di `!negozio`, che oggi dice i
  tre articoli più comprati.
- **L'alert sull'overlay**: parte dove l'acquisto diventa «fatto» (o entra in
  coda), in `compra()`.
- **L'arena**: la borsa si legge con `negozio.borsa(canale, persona)` (db.js).
