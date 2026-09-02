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
