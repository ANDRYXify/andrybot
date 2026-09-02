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

Quindi la proposta arriva da sé. Dopo **quaranta secondi fermi** su una scheda —
senza un clic, un tasto, una rotella — compare in fondo una striscia, la stessa
forma di quella dei cookie: «C'è un manuale per questa scheda: *Manuale dei
giochi e delle monete*», con **Aprilo** e **Non serve**.

Le regole che la rendono un aiuto e non un fastidio:

- **compare solo se quella scheda ha davvero una pagina.** Niente pagina, niente
  striscia;
- **al primo movimento sparisce** — se ti stai muovendo non sei fermo — e
  l'attesa riparte da capo;
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

`test/contratto/aiuti.test.mjs` controlla che ogni scheda dichiarata esista
davvero nel pannello e che ogni aiuto punti a una pagina vera — provato rosso
scrivendo male il nome di una scheda. E in Chromium: compare dopo l'attesa,
sparisce al primo clic, torna se ti fermi di nuovo, e dopo «Non serve» non torna
nemmeno ricaricando.
