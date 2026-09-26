# Le campagne in città

Una pubblicità per strada (Times Square a New York, Milano, Napoli) porta un QR
verso `socialbot.live/<città>`. Lì chi ha un canale prende, una volta sola, **un
anno con tutti i pacchetti accesi**.

## Le regole

Decise dal proprietario del prodotto, uguali per ogni città:

| | |
|---|---|
| cosa | tutti i pacchetti, per 365 giorni |
| quanti | i primi 500 canali per città |
| fino a quando | 30 giorni dal giorno in cui la pubblicità va in onda |
| dopo | il canale torna all'Essenziale, gratis per sempre |

Stanno in `src/features/campagne.js` (`GIORNI`, `TETTO`, `FINESTRA`), e le
prove fissano quei tre numeri: cambiarli è una decisione, non un ritocco.

## Il regalo è la prova completa

Non c'è un secondo modo di «avere tutto». Il regalo è la stessa riga della
promo del primo accesso: Base più tutti i pacchetti, in stato `trialing`, con
la fine scritta nella riga (`campagne.regalo`). Scade da sé, perché
`subscriptions.attivo` guarda la data; niente carta, niente Stripe, niente da
disdire.

## Chi non lo può prendere

| caso | perché |
|---|---|
| paga già un piano (`active`) | il regalo scriverebbe sopra al suo abbonamento, e Stripe continuerebbe a incassare. La pagina gli dice di disdire prima, se vuole l'anno gratis |
| è della community | ha già tutto, per sempre |
| l'ha già preso | una volta per canale, per città |
| è un moderatore | lo prende il proprietario del canale |

Una prova in corso invece sì: diventa un anno.

## Il tetto è una proprietà del database

`campagneDb.prendi` fa tutto in **una transazione**: guarda se il canale l'ha
già preso, conta i posti, scrive la riga, fa il regalo. SQLite esegue una
transazione alla volta, quindi due richieste sull'ultimo posto non passano
tutte e due. E se il regalo non riesce, la riga torna indietro con lui: un
posto non resta preso da chi non ha avuto niente.

La tabella è `campagne_prese (campagna, channel, ts)`. La colonna `channel` la
fa esportare e cancellare con l'account, come ogni tabella di canale.

## La pagina

`src/web/campagna-vista.js`. In inglese per Times Square, in italiano per
Milano e Napoli, come la pubblicità da cui si arriva. Dice a ognuno dove si
trova, un caso alla volta: non ancora aperta, aperta (con i posti rimasti),
piena, chiusa, già tua, piano a pagamento, community, moderatore.

- Il tasto per prenderlo è un **modulo POST** (`/<città>/prendi`): un link che
  si apre da solo (un'anteprima, il controllo di una casella di posta) non
  regala niente. Il cookie di sessione è `SameSite=Lax`, quindi un modulo
  mandato da un altro sito arriva senza sessione e non prende niente.
- Senza sessione (scaduta fra l'apertura della pagina e il tasto) il POST
  rimanda alla pagina, che fa entrare: il tasto non finisce mai su un 404.
- Gli indirizzi sono **scritti per intero** (`['/nyc', '/milano', '/napoli']`),
  non costruiti in un giro: una porta composta non la legge il cancello delle
  porte (`scripts/verifica-porte.mjs`), e una porta che non si legge non si
  controlla. Che siano proprio le campagne dell'elenco lo fissa la prova di
  contratto.
- Chi arriva senza account entra con Twitch (`/entra?nuovo=1&campagna=<città>`)
  o con Kick (`/accedi/kick?campagna=<città>`), e al rientro torna sulla pagina.
  Le porte di Kick e YouTube lo ricordano da sé (`annotaIngresso`), senza una
  rotta in più davanti.
  Il nome della campagna vale solo se è nell'elenco: non è un «rimandami dove
  vuoi».
- Resta fuori dai motori di ricerca (`noindex`) e dalla sitemap: è una pagina
  che scade. Ha però la sua anteprima (`/icons/campagna-<città>.png`, 1200×630)
  per chi la condivide, scritta per intero in `COPERTINA` e col timbro di tutte
  le icone: il cancello delle risorse controlla che il file ci sia.

## Quando si apre

Il giorno di messa in onda sta nel `.env`, uno per città:

```
CAMPAGNA_NYC_DAL=2026-11-02
CAMPAGNA_MILANO_DAL=
CAMPAGNA_NAPOLI_DAL=
```

Si apre a **mezzanotte di quella città** (New York nel suo fuso, Milano e
Napoli in quello di Roma), e si chiude trenta giorni dopo. Senza data la pagina
dice che si apre il giorno in cui esce la pubblicità.

## Termini e privacy

- Termini, «Chi può usarlo»: cosa si regala, a chi, per quanto, cosa succede
  dopo.
- Privacy, «Quali dati trattiamo»: ricordiamo quale campagna ha preso un
  canale e quando, per contare i posti e non darla due volte.

## Le prove

- `test/unita/campagne.test.mjs`: fusi orari (ora legale e solare), stati,
  rifiuti, il regalo di 365 giorni, una presa per canale, il tetto, e la riga
  che torna indietro se il regalo non riesce.
- `test/unita/campagna-vista.test.mjs`: lingua, `noindex`, anteprima, un caso
  per frase, nessuna lineetta lunga e nessuna faccina involontaria.
- `test/contratto/campagne.test.mjs`: il regalo ha una porta sola (il POST del
  proprietario), la pagina si apre senza sessione, e il ritorno dall'accesso è
  solo verso una campagna vera.
