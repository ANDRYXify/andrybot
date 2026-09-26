# Le campagne

Una pubblicità (per strada, su uno schermo, dove capita) porta un QR verso
`socialbot.live/<id>`. Lì chi ha un canale prende, una volta sola, un regalo:
un periodo con dei pacchetti accesi. Le campagne le crea l'admin dalla scheda
«Promo» del pannello, con le grafiche che le accompagnano (`docs/PROMO.md`).

## Le regole di una campagna

| | |
|---|---|
| indirizzo | l'id: lettere minuscole, cifre e trattini, fino a 30 |
| lingua | della pagina: italiano, inglese, spagnolo |
| luogo | dove si vede la pubblicità, se si vuole dirlo |
| fuso | quello della città: la campagna si apre a mezzanotte lì |
| messa in onda | il giorno da cui si apre |
| finestra | per quanti giorni resta aperta |
| tetto | per quanti canali |
| regalo | quanti giorni, e quali pacchetti |
| accesa | spenta dall'admin, la pagina dice che l'offerta è chiusa |
| testi | titolo e frase d'apertura, se l'admin li vuole scrivere lui |

Le regole di partenza sono quelle decise per le prime tre (New York, Milano,
Napoli): **un anno di tutti i pacchetti, i primi 500 canali, 30 giorni dalla
messa in onda**. Stanno in `src/features/campagne.js` (`REGOLE`), insieme a
`norm`, che tiene di una campagna solo quello che ha forma e dice cosa ha
scartato.

## Le tre di partenza

Nascono **una volta**, al primo avvio, con la data di messa in onda del `.env`
se c'era (`CAMPAGNA_NYC_DAL`, `CAMPAGNA_MILANO_DAL`, `CAMPAGNA_NAPOLI_DAL`).
Poi le decide l'admin: se ne cancella una, al riavvio non torna (un segno nella
tabella delle migrazioni lo ricorda).

## Il regalo è la prova

Non c'è un secondo modo di «avere i pacchetti». Il regalo è la stessa riga
della promo del primo accesso: Base più i pacchetti della campagna, in stato
`trialing`, con la fine scritta nella riga (`campagne.regalo`). Scade da sé,
perché `subscriptions.attivo` guarda la data; niente carta, niente Stripe,
niente da disdire.

## Chi non lo può prendere

| caso | perché |
|---|---|
| paga già un piano (`active`) | il regalo scriverebbe sopra al suo abbonamento, e Stripe continuerebbe a incassare. La pagina gli dice di disdire prima, se vuole il regalo |
| è della community | ha già tutto, per sempre |
| l'ha già preso | una volta per canale, per campagna |
| è un moderatore | lo prende il proprietario del canale |

Una prova in corso invece sì: diventa il regalo.

## Il tetto è una proprietà del database

`campagneDb.prendi` fa tutto in **una transazione**: guarda se il canale l'ha
già preso, conta i posti, scrive la riga, fa il regalo. SQLite esegue una
transazione alla volta, quindi due richieste sull'ultimo posto non passano
tutte e due. E se il regalo non riesce, la riga torna indietro con lui.

Le tabelle sono due: `campagne (id, dati, creata, aggiornata)`, le campagne
stesse, e `campagne_prese (campagna, channel, ts)`, chi ha preso cosa. La
colonna `channel` fa esportare e cancellare la presa con l'account. Una
campagna con delle prese non si cancella: si spegne.

## L'indirizzo

L'indirizzo sta in cima, `socialbot.live/<id>`, perché si legge da un
cartellone. Per non rubare mai il posto a una pagina del sito:

- le rotte delle campagne (`GET /:campagna` e `POST /:campagna/prendi`) sono
  **le ultime** registrate, appena prima del 404: le pagine del sito vincono
  sempre, di oggi e di domani. Se l'id non è una campagna si passa oltre;
- alla creazione l'id non può essere il primo pezzo di una rotta o di un file
  del sito: l'elenco si legge dal router e dalla cartella pubblica, non è
  scritto a mano. Se in futuro una pagina nuova prende l'indirizzo di una
  campagna, la scheda «Promo» lo dice;
- al cancello (chi è senza sessione) le due rotte sono una **porta con uno
  schema**, `guscio.porta('/:campagna', ...)`: passa solo un indirizzo che è
  una campagna che c'è. Il cancello delle porte (`scripts/verifica-porte.mjs`)
  legge lo schema come le altre porte.

## La pagina

`src/web/campagna-vista.js`, nella lingua della campagna. Le parole nascono
dalle regole (quanti giorni, quali pacchetti, quanti canali, fino a quando):
cambiata una regola, la pagina la dice giusta senza toccare un testo. Dice a
ognuno dove si trova, un caso alla volta: non ancora aperta, aperta (con i
posti rimasti), piena, chiusa, spenta, già tua, piano a pagamento, community,
moderatore.

- Il tasto per prenderlo è un **modulo POST**: un link che si apre da solo
  (un'anteprima, il controllo di una casella di posta) non regala niente. Il
  cookie di sessione è `SameSite=Lax`, quindi un modulo mandato da un altro
  sito arriva senza sessione e non prende niente.
- Senza sessione (scaduta fra l'apertura della pagina e il tasto) il POST
  rimanda alla pagina, che fa entrare: il tasto non finisce mai su un 404.
- Chi arriva senza account entra con Twitch (`/entra?nuovo=1&campagna=<id>`) o
  con Kick (`/accedi/kick?campagna=<id>`), e al rientro torna sulla pagina. Le
  porte di Kick e YouTube lo ricordano da sé (`annotaIngresso`). L'id vale solo
  se è una campagna che c'è: non è un «rimandami dove vuoi».
- Resta fuori dai motori di ricerca (`noindex`) e dalla sitemap: è una pagina
  che scade.

## L'anteprima del link

Ogni campagna ha la sua immagine 1200x630, quella che mostrano Telegram,
WhatsApp e Discord quando qualcuno incolla il link. La disegna la scheda
«Promo» col motore delle grafiche **ogni volta che si salva la campagna**, e
la manda al server (`POST /api/admin/campagne/:id/anteprima`): va di pari passo
con le regole per costruzione, perché il titolo è quello della pagina. Il
server la riduce a 256 colori (`src/web/png-leggero.js`): uguale all'occhio, un
quinto del peso, e WhatsApp non scarta le anteprime troppo pesanti. Senza
ffmpeg resta com'è arrivata. Sta in `DATA_DIR/campagne/<id>.png` e si serve a
`/campagne/<id>.png?v=<impronta>`: cambiata l'immagine, cambia l'indirizzo.
Le tre di partenza usano le loro in `/icons/`, ridotte allo stesso modo; una
campagna ancora senza la sua usa quella del sito nella sua lingua.

## Termini e privacy

- Termini, «Chi può usarlo»: cosa si regala, a chi, per quanto, cosa succede
  dopo.
- Privacy, «Quali dati trattiamo»: ricordiamo quale campagna ha preso un
  canale e quando, per contare i posti e non darla due volte.

## Le prove

- `test/unita/campagne.test.mjs`: fusi orari (ora legale e solare, date e fusi
  storti), regole di partenza e limiti, indirizzi nuovi, stati, rifiuti, il
  regalo lungo e largo quanto la campagna, una presa per canale, il tetto, la
  riga che torna indietro, le tre di partenza che nascono una volta sola.
- `test/unita/campagna-vista.test.mjs`: lingua, `noindex`, anteprima, parole
  che nascono dalle regole, testi dell'admin, un caso per frase, nessuna
  lineetta lunga e nessuna faccina involontaria.
- `test/contratto/campagne.test.mjs`: il regalo ha una porta sola (il POST del
  proprietario), le rotte stanno in fondo, al cancello passano solo le
  campagne che ci sono, solo l'admin le crea e mai al posto di una pagina, e il
  ritorno dall'accesso è solo verso una campagna vera.
