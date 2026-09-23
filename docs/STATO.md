# La scheda Stato: come va adesso

Il pannello si apre qui, e questa scheda risponde a una domanda sola: **come va
adesso?** Sei in onda? Da quanto, chi ti guarda, cosa succede? Se no, quando è
la prossima e com'è andata l'ultima? E c'è qualcosa da sistemare?

## Cosa c'è, e cosa è andato altrove

In quest'ordine:

1. **Le carte da sistemare**, solo se ce n'è una: il bot scollegato dalla chat,
   i permessi da concedere, i permessi nuovi. Rosse o ambra, col tasto per
   rimediare.
2. **La tua diretta.**
3. **Il tuo bot**: l'interruttore, se è in chat, i permessi (una riga sola) e
   quando dev'essere attivo.
4. La prova gratuita in corso e le novità.

Prima qui c'erano quindici carte, e metà stavano qui solo perché non avevano un
altro posto. Adesso ce l'hanno:

- le piattaforme, la passkey, i moderatori, le richieste per moderare un altro
  canale, l'app, i codici delle mail, i tuoi dati e «andarsene» stanno in
  **«Il tuo account»**, accanto ad Abbonamento;
- la carta dell'abbonamento era un doppione della scheda Abbonamento, ed è
  sparita;
- il pre-addestramento e la rete che impara parlano di quello che il bot sa, e
  stanno in **Conoscenza**.

Nel menu Stato non ha un gruppo: è l'inizio. E nel cassetto non ha un titolo
sopra, perché un titolo che ripete la sua unica voce non dice niente. La regola
vale per ogni gruppo con una voce sola, non solo per questo.

## La diretta: ogni numero ha già il suo padrone

`/api/streamer/adesso` mette insieme, ma non conta niente di suo:

| cosa | chi lo sa |
|---|---|
| da quando sei in onda, titolo, categoria, spettatori adesso | Twitch |
| il picco di stasera | il rapporto in corso, che lo segna a ogni giro |
| messaggi, persone, follower, sub, raid, bit, clip | `rapporto.raccogli`, la stessa funzione che scrive il rapporto a fine diretta |
| la prossima | la settimana (`settimana.prossimaDiretta`) |
| l'ultima | l'ultimo rapporto salvato |

Così la Home e la scheda Dirette non possono dire due cose diverse: leggono gli
stessi numeri dagli stessi posti.

Su Kick e YouTube Twitch non c'è: sei in onda se il rapporto della serata è
aperto, e da quando lo dice il suo inizio. Chi ha solo Discord non va in onda, e
la carta non c'è.

## L'orologio non si conta, si calcola

Da quanto sei in onda è `adesso − inizio`, rifatto ogni secondo dall'istante
d'inizio. Non si somma un secondo alla volta: una scheda in secondo piano, un
timer rallentato dal browser o un telefono che dorme lo farebbero restare
indietro.

E `adesso` è l'ora del server. A ogni aggiornamento il pannello si segna quanto
l'orologio del computer è avanti o indietro rispetto al server, e ne tiene
conto. Se l'orologio del computer è sbagliato, il tempo in onda resta giusto.

## La prossima

È il primo giorno in onda la cui ora non è ancora passata, nel fuso della
settimana, anche col cambio dell'ora. Una diretta la cui ora è passata non è
«la prossima». Senza giorni in onda non c'è una prossima, e non se ne inventa
una: la carta invita a scrivere la settimana (lo streamer; un moderatore la
settimana non la scrive).

Come si dice:

- **oggi**: «Oggi alle 21:00», e accanto quanto manca, in minuti o in ore;
- **domani**: «Domani alle 21:00», e basta;
- **più avanti**: «Lunedì alle 18:00», e accanto «tra 5 giorni».

I giorni sono giorni di calendario nel fuso della settimana, non blocchi di
ventiquattr'ore: alle 23:50 una diretta alle 00:30 è «domani». Le parole («tra
5 giorni», «in 5 days», «dentro de 5 días») le scrive il browser nella lingua
del pannello (`Intl.RelativeTimeFormat`), invece di tre elenchi da tenere
allineati a mano.

## Si aggiorna da sola, ma solo se la stai guardando

Ogni minuto, e solo se Stato è la scheda aperta e la pagina è in vista. Quando
torni sulla pagina si aggiorna subito. L'orologio scorre solo in quel momento.

Un numero che è cambiato si accende per un attimo. La prima volta i numeri
salgono da zero; dopo no, perché ogni minuto sarebbe un conto alla rovescia che
distrae. Con «meno movimento» non si accende niente.

La carta della diretta non si ripiega, a differenza delle altre: è la cosa da
vedere appena entri.

## I collaudi

- `test/unita/settimana.test.mjs`: la prossima diretta (l'ordine, l'ora esatta,
  il cambio d'ora, la settimana vuota, il fuso inventato).
- `test/contratto/stato.test.mjs`: cosa sta in Stato e cosa in «Il tuo
  account», chi carica cosa, l'indirizzo del server che non conta niente di
  nuovo, l'orologio calcolato, l'aggiornamento solo se in vista, la prova del
  pannello con una diretta sola.
