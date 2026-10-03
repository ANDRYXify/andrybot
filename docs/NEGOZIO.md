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

La moneta la mette `frase()` stessa: nome e forma da `moneta.js`, e solo il nome
di serie tradotto nella lingua della chat («coins», «monedas»). Le parole che le
si accordano si scrivono `%[le tue|i tuoi|la tua|il tuo]%` e si sciolgono solo
nei pezzi scritti nel file (un titolo di Spotify con dentro un segno resta com'è).
Il saldo si dice «I tuoi Semi di girasole: 450», che torna con ogni nome e ogni
numero. Il nome di un articolo invece non ha un genere noto: nessuna parola
intorno gli si accorda («hai comprato Corona», non «Corona è tuo»).

### Quanto si tiene

Lo storico un anno, come le donazioni; quello ancora da consegnare finché lo
streamer non decide. La borsa finché lo streamer non toglie l'articolo o
cancella il canale. L'informativa lo dice nelle tre lingue.

### Cosa serve ai punti 5 e 6

- **La pagina pubblica**: fatta, vedi «La pagina» qui sotto.
- **L'alert sull'overlay**: parte dove l'acquisto diventa «fatto» (o entra in
  coda), in `compra()`.
- **L'arena**: la borsa si legge con `negozio.borsa(canale, persona)` (db.js).

## La pagina (punto 5)

`negozio.socialbot.live/<canale>`, e sempre anche `/u/<canale>/negozio`. È la
terza pagina pubblica, dopo quella dei link e quella delle donazioni, e non ha
niente di suo che le altre due non abbiano già, a parte i pezzi da negozio.

### Una pagina sola, tre tavoli

- **Lo store** è lo stesso (`storePagina` in db.js), con la tabella
  `pagina_negozio`: testa, tema, pezzi, e `aspetto` («come la pagina link» o
  «suo», come le donazioni). Ogni pagina dichiara i pezzi che ammette
  (`TIPI_PAGINA_NEGOZIO`): la pulizia scarta gli altri, in tutti e due i versi.
- **Il disegno** è `renderLinkPage` con l'opzione `negozio`
  (features/negozio-pagina.js): i pezzi del negozio, il loro foglio di stile
  (vestito con le variabili del tema e coi colori dei bottoni), le parole fisse
  nella lingua del canale, `/pagina-negozio.js` per il tasto «Copia».
  Senza `negozio` le altre due pagine restano come erano.
- **L'editor** del pannello è quello della pagina link con `LP.quale =
  'negozio'`, montato in «La pagina del negozio» della scheda Negozio.
- **La carta dell'anteprima del link** è la terza di `TEMI_PAGINA`, con la
  targhetta nella lingua del canale; si rifà con lo stesso editor.

### I pezzi

| Pezzo | Cosa fa |
| --- | --- |
| `intestazione` | Foto, titolo, sottotitolo. Nella pagina del negozio la testa è un pezzo: si sposta, o si toglie (resta un titolo solo per i lettori di schermo). |
| `vetrina` | Un articolo in grande: quello scelto, o il più comprato. Se quello scelto esce di vendita, il più comprato. |
| `articoli` | La griglia: 1-3 colonne (sul telefono si stringono), formato delle immagini, prezzo, scorte e requisiti sì o no. |
| `comecompra` | Il comando col nome che ha nel canale, e la frase sulla moneta accordata con la sua forma. |
| `piede` | I link alla pagina link (se pubblicata) e al canale. |

In più `titolo`, `testo`, `separatore`, `spazio`, `immagine`. Niente riquadri
di altri siti: una pagina che vende non chiede il permesso per un video.

Ogni articolo: immagine, nome, descrizione, il tipo, il prezzo come etichetta
col nome della moneta («Semi di girasole 1»: regge con ogni numero, dove «1
monete» no), le scorte con le frasi del negozio, i requisiti scritti come su un
cartellino (`requisitoBreve`, tre lingue), il comando e il tasto che lo copia.

### Un canale, e nessun altro

Tutto parte dal canale dell'indirizzo: `inVetrina(canale)`, la sua moneta, il
suo comando, il suo aspetto. Un canale che non c'è e uno col negozio chiuso
hanno la stessa pagina «qui non c'è un negozio» (404), nella lingua del
browser e non in quella del canale, che direbbe se il canale esiste. La radice
di `negozio.socialbot.live` non elenca i negozi: rimanda al sito.

Quella pagina ha la forma e il vestito del 404 del sito: nasce da
`paginaMancante` in `src/web/pagine-servizio.js` (carta col retino, titolo a
pennarello, didascalie, tasti a timbro, chiaro e scuro), non da uno stile suo.
Prima se n'era fatto uno, scuro e col tasto viola, e sembrava un altro prodotto.

Si legge dall'alto in basso e parla a due persone, separate:

- il titolo dice cosa è successo; la didascalia, sotto, perché e cosa fare a
  chi ci arriva da un link (quasi sempre uno spettatore): «Se il link ti è
  arrivato da una diretta, chiedi in chat: forse riapre più tardi»;
- un riquadro «È il tuo negozio?» parla a chi il negozio ce l'ha: «Lo apri
  dal pannello: Negozio, poi Articoli», col tasto del pannello lì dentro,
  accanto alla sua frase. È la stessa per tutti, quindi non rivela niente;
- in fondo, «Cos'è SocialBot». Nessun tasto acceso: qui non c'è un'azione
  giusta per tutti.

La prima versione metteva la didascalia sopra il titolo e i due tasti insieme
in fondo, il pannello acceso accanto alla home: si leggeva il perché prima di
sapere cosa, e il tasto del proprietario sembrava per tutti. Il 404 e la
manutenzione seguono lo stesso ordine (titolo, poi didascalia).
`test/unita/negozio-pagina.test.mjs` pretende lo stesso foglio di stile del 404,
l'ordine, e il tasto del pannello dentro il riquadro e non fra le strade di
tutti; `scripts/verifica-larghezza.mjs` la apre a quattro larghezze di telefono.

### La porta delle immagini

`/u/<canale>/negozio/media/<id>`, pubblica: niente sessione, niente chiave
dell'overlay. Esce solo un media che è di quel canale, è un'immagine, e lo usa
un articolo che la pagina mostra adesso (in vendita, visibile a tutti, nelle
sue date, a negozio aperto): `mediaPubblico`. Tutto il resto è 404, anche un
media vero dello stesso canale che nessun articolo in vetrina usa.
L'anteprima del pannello prende le immagini dalla libreria, dietro la sessione,
perché il negozio può essere ancora chiuso.

### L'indirizzo corto

Come `dona`, `sostieni` e `discord`: il nome sta nel Caddyfile (validato con
Caddy vero e registrato in `Caddyfile.validato`), il server bussa in HTTPS e
accende `config.negozioHost` quando risponde; `NEGOZIO_HOST` lo sceglie o lo
spegne. `urlPaginaNegozio` (negozio.js) è l'unico posto che scrive l'indirizzo:
la chat (`!negozio`), il pannello, il canonico della pagina. Sul server
`aggiorna.sh` valida e fa rileggere il Caddyfile a ogni aggiornamento, quindi
dopo il record DNS non serve nient'altro.

