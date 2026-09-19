# Il filtro del server (AutoMod)

AutoMod e' di Discord e gira DENTRO Discord: ferma il messaggio prima che
esista. Un bot in ascolto non puo' farlo — lui lo vede dopo, e cancellarlo e'
un'altra cosa (e un potere che non usiamo, vedi `scripts/verifica-poteri.mjs`).
Percio' il filtro non lo eseguiamo noi: lo SCRIVIAMO a loro, e poi ci stiamo
fuori.

## Sta nella traccia

Come le impostazioni e la porta d'ingresso, e per le stesse tre ragioni:
«leggi il mio server» se lo porta dietro, l'anteprima lo mostra insieme al
resto, e si costruisce in un giro solo. Il pannello lo scrive nella scheda
«Il filtro»; il salvataggio e l'anteprima sono quelli di sempre.

## I nomi, non gli id

Una regola puo' avvisare in un canale e risparmiare dei ruoli, e quei canali e
quei ruoli la traccia li sta creando nello stesso giro. Quindi si nominano per
NOME, e i nomi diventano id in `discord-costruisci.js`, dopo che canali e ruoli
esistono. Un nome che non si risolve non si inventa: quella voce cade, e si
dice quale — zittire un avviso senza dirlo sarebbe una regola che sembra accesa
e non avvisa nessuno.

## Quello che Discord pretende, contato prima

Verificato sulla documentazione:

| cosa | quanto |
|---|---|
| regole per server | parole 6 · spam 1 · liste pronte 1 · menzioni 1 · profilo 1 |
| `keyword_filter` | 1000 voci da 60 caratteri, con jolly `cat*`, `*cat*` |
| `regex_patterns` | 10, da 260 caratteri |
| `allow_list` | 100 (parole) o 1000 (liste pronte) |
| `mention_total_limit` | al massimo 50 |
| esenzioni | 20 ruoli · 50 canali |
| pausa | al massimo 28 giorni, e **solo** su parole e menzioni |

L'ultima riga e' quella che conta piu' delle altre: una pausa mandata su una
regola di spam fa rifiutare TUTTA la regola, per un campo che l'editor non
avrebbe nemmeno dovuto mostrare. Quindi non si mostra e non si manda.

E una regola senza nessuna azione non si manda cosi' com'e': sembrerebbe accesa
e non farebbe niente. Se non e' stato detto cosa fare, almeno blocca.

## Come si riconosce una regola gia' fatta

Per TIPO, e — per le parole, che possono essere sei — per NOME. Non serve un
contrassegno nostro: il tetto di Discord e' gia' la chiave, perche' di spam ce
n'e' una sola. Rinominare una regola di parole vuol dire percio' un'altra
regola: quella di prima sparisce e la nuova nasce, ed e' quello che
l'anteprima dice.

## Non si riscrive l'uguale, e non si cancella andando avanti

Il confronto passa per lo stesso `normalizzaFiltro` da tutte e due le parti
(vedi `differenzaFiltro`): se il segno coincide, non si chiama Discord. In casa
d'altri, una riga di registro ogni sera per non aver fatto niente e' rumore.

Le regole che ci sono e la traccia non prevede si DICONO sempre — anche andando
solo in avanti, dove restano dove sono — e si tolgono solo facendo piazza
pulita, come i canali.

## Dove sta nel codice

| pezzo | dove |
|---|---|
| le porte di Discord | `src/features/discord-api.js` — `regoleAuto`, `creaRegolaAuto`, `sistemaRegolaAuto`, `togliRegolaAuto` |
| com'e' scritto nella traccia | `src/features/discord-preset.js` — `normalizzaFiltro`, `TIPI_FILTRO`, `LISTE_FILTRO` |
| cosa cambierebbe | `src/features/discord-preset.js` — `differenzaFiltro` |
| i nomi che diventano id | `src/features/discord-costruisci.js`, dopo canali e ruoli |
| «parti dal server che hai» | `dallaFotografia(foto, { regole })` |
| la scheda | pannello, `dcfiltro` — «Il filtro» |

## Il secondo lucchetto

Nel costruttore le rimozioni stanno dentro un `if (togliere)`. Non e' lui a
proteggere: a proteggere e' l'anteprima, che andando avanti consegna l'elenco
vuoto — ed e' quello che il collaudo misura, da un capo all'altro. Quel
controllo sta li' per la stessa ragione dell'altro sui canali: sull'unica cosa
che toglie roba a qualcuno, la domanda si rifa' nel punto in cui si toglie.
