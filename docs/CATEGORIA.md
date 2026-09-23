# Il cambio di categoria

«categoria diablo 4» a voce, `!categoria gta 5` in chat, `/categoria cs2` da
Telegram: in tutti e tre i casi il testo arriva intero a `risolviCategoria`
(`src/features/categoria.js`), che chiede a Twitch i nomi possibili e ne
sceglie uno. Il testo arrivava già intero anche prima. Sbagliava la scelta.

## Il guasto: il premio andava al nome più corto

Il confronto era fatto lettera per lettera, e dava un premio a chi «cominciava
uguale»: se un nome era l'inizio dell'altro, 0.9. Solo che il premio valeva in
tutti e due i versi, quindi andava anche al nome di Twitch più **corto** di
quello che avevi detto, cioè a quello che lasciava fuori una tua parola:

| hai detto | Twitch aveva | vinceva | perché |
| --- | --- | --- | --- |
| diablo 4 | Diablo IV, Diablo | **Diablo** | «diablo» è l'inizio di «diablo 4» |
| counter strike due | Counter-Strike 2, Counter-Strike | **Counter-Strike** | idem |
| last of us 2 | The Last of Us Part II, Part I | **Part I** | le lettere più vicine |

La parola buttata era proprio quella che distingue un gioco dall'altro. Con i
giochi di una parola sola il difetto non si vedeva: non c'era niente da
lasciare fuori.

Più tre mancanze, ognuna misurata su nomi veri:

- **i numeri** si scrivono in tre modi, «4», «IV» e «quattro», e non si
  riconoscevano fra loro;
- **l'apostrofo** spezzava: «Baldur's» diventava «baldur s», una parola in più
  che nessuno ha detto;
- **le sigle** della chat («gta», «lol», «cs2») contro «Grand Theft Auto V»
  davano zero.

## Il confronto nuovo si fa per parole

Prima si rendono confrontabili le parole, da **tutte e due** le parti:
minuscole, senza accenti, l'apostrofo che unisce invece di separare, i numeri
romani (II–XX) e quelli detti a parole in italiano, inglese e spagnolo portati
alle cifre. «I», «uno» e «one» restano fuori apposta: sono articoli, e leggerli
come numeri rovinerebbe più nomi di quanti ne aggiusta.

Poi il punteggio di un nome:

- **0.7** per quante parole **tue** ci sono nel nome. Dimenticarne una è il
  difetto da cui si parte, quindi pesa di più;
- **0.3** per quante parole **del nome** hai detto tu. Non dire il sottotitolo è
  normale: nessuno scrive «Call of Duty: Black Ops 6» intero;
- per chi scrive tutto attaccato («counterstrike 2») vale anche il confronto a
  lettere unite, ma **senza** premio a chi comincia uguale;
- **i numeri**: se ne hai detto uno, un nome che non ce l'ha vale la metà.

Due parole sono «la stessa» se sono uguali o se differiscono per un errore di
voce o di battitura (distanza fino a un quarto della lunghezza, solo da quattro
lettere in su). Due cifre mai: «2» e «3» non sono un refuso, sono un altro
capitolo.

## Le sigle aggiungono una forma, non decidono

Quello che hai detto si guarda in tre forme: com'è, senza le parole di
riempimento («metti», «a», «il»…), e con le sigle sciolte. Il punteggio di un
nome è il migliore fra le tre. Così «A Way Out» non perde la sua «a», e «gta 5»
trova «Grand Theft Auto V». La sigla non forza niente: «fifa 23» resta
«FIFA 23», perché la forma com'è combacia meglio di quella sciolta.

L'elenco delle sigle è un vocabolario (`SIGLE`): aggiungerne una è una riga, e
non cambia il modo in cui si sceglie.

## Le ricerche a Twitch

Si cerca ogni forma, poi le ultime due parole e la prima, e per ultime le
prime cinque lettere della prima parola. Quest'ultima ricerca serve alle parole
storpiate dalla voce («fortnait»): la ricerca di Twitch lavora per inizi di
parola, quindi una parola sbagliata in fondo non fa tornare niente, e senza
candidati non c'è niente da confrontare. L'inizio si sbaglia di rado.

Ci si ferma appena un nome arriva a 0.95. Quando basta la prima ricerca il
comando costa una chiamata sola, e le altre partono solo se servono: al
massimo sono sei.

## Quando non cambiare niente

Sotto 0.5 non si cambia categoria. Una categoria sbagliata in onda è peggio di
«non l'ho trovata», che almeno si può ridire meglio. È anche il caso del
capitolo che Twitch non restituisce: con «diablo 4» e senza Diablo IV fra i
candidati, «Diablo» scende sotto la soglia per la regola dei numeri, e il bot
lo dice invece di ripiegare.

## Le prove

`test/unita/categoria.test.mjs`, con i nomi che Twitch restituisce davvero:

- la scelta, su elenchi veri (Diablo, Counter-Strike, GTA, Call of Duty, The
  Last of Us, Baldur's Gate, Resident Evil, Hollow Knight, FIFA/EA FC);
- la ricerca, con un Twitch finto che si comporta come quello vero (inizi di
  parola, i più seguiti prima): che partano le ricerche giuste e che ci si fermi
  appena si è sicuri.

Ogni regola ha almeno una prova che diventa rossa se la si toglie. Sugli stessi
26 comandi, prima 15 giusti, adesso 26.
