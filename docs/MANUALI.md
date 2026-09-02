# I manuali: cosa fa cosa, e come

> «Chi usa il bot deve poter avere a portata di mano informazioni super
> esaustive su cosa fa cosa e come fa cosa.»

Due pagine, `/manuale/giochi` e `/manuale/moduli`, più il loro indice
`/manuale`. Vivono in `src/web/manuali.js` come dati, e le compone lo stesso
guscio delle guide (`paginaDoc`): stessa testata, stesso stile, stesso piede.

## Perché pubbliche e non dentro il pannello

Perché chi **valuta** il bot deve poter vedere prima cosa sa fare davvero, e
perché una pagina che risponde a «come funziona !slot» o «cosa vuol dire
`$mossa`» vale più di dieci righe di vetrina. Sono indicizzabili, stanno nella
sitemap con la loro data, e sono raggiungibili in un clic dalle schede *Giochi*
e *Comandi* del pannello — che è il momento in cui servono.

## Cosa c'è dentro

Materiale di consultazione, non presentazione: tabelle, numeri veri presi dal
motore, e un indice che si **ricava dai titoli** (`indiceHtml`), così una
sezione nuova ci finisce da sé e un'ancora non può puntare al nulla.

Il renderer delle guide ha guadagnato tre blocchi: `h3`, `tabella` (una matrice,
la prima riga è l'intestazione) e `esempio` (un riquadro a larghezza fissa). La
marcatura ammessa resta quella di `testo()`: `<strong> <em> <code> <a> <br>`, e
qualsiasi altro tag fa fallire la composizione invece di finire in pagina.

## Il cancello: un manuale non può invecchiare in silenzio

È il punto. Si aggiunge un'azione, un gioco, una variabile — e la pagina che
dovrebbe spiegarli resta quella di prima: chi la legge conclude che quella cosa
non esiste, ed è **peggio** che non avere il manuale, perché ci ha creduto.

`scripts/verifica-manuali.mjs` non tiene un elenco: lo **legge dal motore e dal
pannello**, e controlla che nel manuale ci sia.

| Cosa | Da dove |
|---|---|
| le 14 azioni | `MOD_AZIONI` (server) e le etichette di `AZIONI` (pannello) |
| i 6 inneschi | `MOD_TRIGGER` |
| i 9 eventi | `EVENTI` |
| le 54 variabili offerte | `VARIABILI` |
| i 30 comandi di gioco | i `case` di `games.js` |
| i 6 tipi di manche | i costruttori di `games.js` |
| le 6 ricette a punti | `RICETTE_PUNTI` |

Alla prima esecuzione ha trovato **otto buchi** nei manuali appena scritti — due
azioni, due eventi, due variabili e due alias di comando. Erano buchi veri: le
voci sono state riscritte con **le stesse parole del pannello**, così chi legge
il manuale ritrova la voce identica dove deve cliccare.

`test/contratto/manuali.test.mjs` completa il quadro: le pagine si compongono,
l'indice punta a sezioni che esistono, ogni sezione compare nell'indice, e le
tabelle hanno righe tutte della stessa larghezza.

## «C'è una guida per questa scheda»

Le pagine ci sono, sono collegate dal pannello e dalla vetrina — ma chi è dentro
a configurare non va a cercarle: sta fermo su una scheda a guardarla.

Quindi la proposta arriva da sé, quando **si vede che uno è in difficoltà**.
Compare in fondo una striscia, la stessa forma di quella dei cookie: «C'è un
manuale per questa scheda: *Manuale dei giochi e delle monete*», con **Aprilo** e
**Non serve**.

I segnali sono quattro, e ognuno vale da solo — nessuno è un'inferenza sul
carattere della persona, sono tutti fatti misurabili:

| Segnale | Quando |
|---|---|
| **Fermo** | venti secondi senza un clic, un tasto, una rotella |
| **Errore** | è appena comparso un messaggio d'errore |
| **Su e giù** | sei cambi di verso con la rotella senza toccare niente |
| **Avanti e indietro** | è la terza volta che torni su quella scheda in cinque minuti |

Le regole che la rendono un aiuto e non un fastidio:

- **compare solo se quella scheda ha davvero una pagina.** Niente pagina, niente
  striscia;
- **al primo clic sparisce** — se stai agendo non sei bloccato — e l'attesa
  riparte da capo. Scorrere no: è scorrendo su e giù che l'hai chiesta, e
  portargliela via con la rotellata dopo sarebbe stato assurdo (è successo: la
  striscia compariva e il movimento successivo la cancellava);
- **«Non serve» vale per sempre** su quella scheda, e anche aprire la pagina
  conta come risposta;
- non compare mentre c'è ancora la striscia dei cookie (si coprirebbero), né
  mentre la scheda del browser è in secondo piano.

L'associazione scheda → pagina **non è un elenco a parte**: ogni guida e ogni
manuale dichiara le schede a cui serve, accanto al proprio contenuto
(`schede: ['giochi']`). Chi scrive la pagina sa a chi serve meglio di chiunque la
legga sei mesi dopo, e `aiutiPerScheda()` compone la mappa che `/api/me` porta al
pannello. Dove esiste un manuale vince lui sulla guida: chi è già dentro il
prodotto vuole il riferimento, non l'introduzione.

## Impara, ma resta spiegabile

Il popup si adatta a quello che il browser ha visto — e ogni regola è un
**se-allora**, non una statistica: si può dire in una riga perché è comparso.

| Cosa è successo | Cosa cambia |
|---|---|
| sei **entrato e uscito senza fare niente** da quella scheda | l'attesa lì scende da 20 a **8 secondi** |
| è successo **due volte** | scende a **3 secondi** |
| su quella scheda hai già **fatto qualcosa** due volte | lì non compare più: sai dove mettere le mani |
| hai detto **«non serve» due volte** | tace **ovunque per trenta giorni** |
| — | mai più di **due volte per sessione**, e mai a meno di un minuto l'una dall'altra |

C'è anche un quinto scenario: **il giro a vuoto** — quattro cambi di scheda in un
minuto senza aver toccato niente. Chi gira così sta cercando, non lavorando.

Tutta questa memoria vive **nel browser** (`localStorage`), è per scheda e non
per persona, e non esce dal dispositivo: nessuna utenza, nessun invio, niente da
aggiungere all'informativa. Il collaudo lo verifica leggendo il codice: dove si
scrive la memoria non ci sono `fetch`.

## Come ci si arriva da dentro

Le pagine erano collegate dalla **vetrina** — cioè da fuori. Chi è dentro non le
vedeva. Ora nella barra in alto (e nel cassetto, sul telefono) c'è un **«?»**:
apre *Guide*, *Manuali*, *Novità*, e in cima la pagina di **questa** scheda,
quando c'è.

Costa una banda di larghezza: a 1400px la barra ora si ritira sull'hamburger un
po' prima (misurato: 1366 e 1400 invece del solo 1366). Il menu resta comunque
raggiungibile — è quello che il cancello della barra pretende — e il prezzo è
accettabile per non avere l'aiuto nascosto proprio a chi lo usa.

## Una guida proposta dal pannello non può essere generica

Una guida spiega il mondo: va bene per chi il bot non ce l'ha. Ma quando è il
**pannello** a proporla, chi la apre è già dentro — vuole sapere cosa si fa
*qui*, non cos'è un hate-raid.

Quindi: **una guida che dichiara di servire una scheda deve avere la sezione
«Come si fa in SocialBot»**, con i passi veri (quale scheda, quale interruttore,
cosa succede). Non è un consiglio, è una condizione: il collaudo la pretende, e
il collegamento della striscia **apre la guida su quella sezione** — l'indirizzo
si ricava dal titolo della sezione, quindi non può puntare al nulla.

Dove esiste un manuale, invece, vince lui: è già tutto «come si fa qui».

`test/contratto/aiuti.test.mjs` controlla che ogni scheda dichiarata esista
davvero nel pannello, che ogni aiuto punti a una pagina vera, e che ogni guida
agganciata a una scheda abbia il suo risvolto con almeno tre passi — provato
rosso scrivendo male il nome di una scheda, e togliendo la sezione a una guida.
E in Chromium, i tre segnali che si possono simulare: dopo un errore compare
subito, dopo sei cambi di verso con la rotella compare, e alla terza volta che
torni sulla stessa scheda compare — poi sparisce al primo clic, e dopo «Non
serve» non torna nemmeno ricaricando.

## Ogni scheda ha il suo aiuto (e il cancello lo pretende)

La copertura era un **elenco scritto a mano** dentro ogni pagina (`schede: [...]`),
quindi era quel che qualcuno si era ricordato di digitare: **sei schede su
ventiquattro**. Nelle altre diciotto il «?» in barra non aveva niente da offrire,
l'avviso non usciva, il popup nemmeno — e chi era in difficoltà lì restava.

La dichiarazione resta dove sta (chi scrive una pagina sa a chi serve meglio di
chiunque la legga sei mesi dopo), ma adesso **non è più facoltativa**:

- l'elenco vero delle schede non si scrive, si legge da **quali pannelli
  `app.js` disegna** — la stessa fonte che li crea;
- `verifica-manuali.mjs` diventa **rosso** se una scheda resta scoperta, e rosso
  anche se un aiuto è agganciato a una scheda che non esiste più (un pannello
  rinominato lascerebbe l'aiuto attaccato a un fantasma).

I manuali sono nove, uno per **area** del prodotto più i due approfondimenti
(giochi, moduli). Un manuale d'area copre più schede: è la forma giusta perché
le schede di un'area si usano insieme, e nove pagine dense valgono più di
ventiquattro paginette che si ripetono.
