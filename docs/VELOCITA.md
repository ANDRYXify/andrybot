# Velocita e reattivita della pagina

Numeri presi sul banco (Chromium headless, 1440x900, rete locale, nessun
rallentamento artificiale). Non sono stime: sono misure ripetibili con gli
script in `scratchpad/` (`perf.mjs`, `cls.mjs`, `perf2.mjs`).

| metrica | prima | dopo | soglia "buono" |
| --- | ---: | ---: | ---: |
| FCP (primo disegno) | 12 696 ms | **104 ms** | < 1800 ms |
| LCP (elemento piu grande) | 12 812 ms | **1 104 ms** | < 2500 ms |
| CLS (scarti di layout) | 0,1536 | **0,0029** | < 0,1 |
| tempo di blocco totale | 205 ms | **199 ms** | < 200 ms |

## 1. Il primo disegno non e piu ostaggio di Google

`index.html` caricava i tre caratteri con un `<link rel="stylesheet">` verso
`fonts.googleapis.com`. Un foglio di stile esterno **blocca il rendering**:
finche non risponde, il browser non dipinge niente. Sul banco (rete chiusa)
questo significava 12,7 secondi di schermo bianco; in produzione sono qualche
centinaio di millisecondi, ma restano **sul percorso critico e in mano a un
terzo**. In piu l'indirizzo IP di ogni visitatore europeo arrivava a Google
prima ancora che la pagina esistesse.

Ora i caratteri stanno in `/vendor/font/`, serviti da noi. Sono stati presi
**solo i sottoinsiemi `latin` e `latin-ext`**: Zen Kaku Gothic New e un
carattere giapponese e l'intera famiglia pesa decine di MB, mentre il sito
parla italiano, inglese e spagnolo. Totale sul disco: 320 KB per 14 file, e il
browser ne scarica solo quelli che gli servono davvero (`unicode-range`).
`font.css` ripete le stesse `@font-face` puntando in locale, e la licenza
OFL-1.1 dei tre caratteri e riportata in `vendor/font/LICENSE.txt` come la
licenza richiede.

`archivo-...-latin.woff2` (il carattere del titolo) e in `preload`: e l'unico
che serve al primo schermo.

**Attenzione:** `font.css` deve stare nell'elenco `VETRINA` di `server.js`,
altrimenti a chi non e loggato risponde 404 e la pagina resta senza caratteri.

## 2. Lo scarto di layout non c'e piu

`body.vetrina` lo metteva `app.js` dopo la risposta di `/api/me`. Nel frattempo
la pagina aveva gia disegnato la colonna **stretta** della dashboard (640 px)
e poi si allargava a quella della vetrina (1180 px): un salto orizzontale da
0,15 CLS, sopra la soglia buona.

Chi e loggato e chi no **lo sa il server**, in sessione, a costo zero. Adesso
e lui a scrivere `<body class="vetrina">` nel primo HTML (`serviGuscio` in
`server.js`, con `Vary: Cookie`), e la larghezza e giusta al primo disegno.
`app.js` continua a fare il `toggle`, ma trova la classe gia al posto giusto:
serve solo se la sessione cambia mentre la pagina e aperta.

Lo scarto che resta, 0,0029, e il testo che si assesta di 9 px quando entra il
carattere vero (`font-display: swap`): trascurabile.

## 3. Il parser non aspetta piu un megabyte

`app.js` pesa circa 1 MB e veniva caricato con un `<script>` sincrono: il
parser si fermava li. Ora i cinque script del guscio hanno `defer`. L'ordine
resta identico (gli script `defer` girano in ordine di documento) ma il
documento finisce di essere letto subito e il preload scanner puo prendere
tutto in parallelo. FCP da 220 a 104 ms.

Caddy ora comprime con `zstd gzip` invece del solo `gzip`: su un file da 1 MB
si sente. I font hanno `Cache-Control: immutable` per un anno.

## 4. Navigazione istantanea

`index.html` dichiara delle **Speculation Rules** con `eagerness: moderate`:
il browser prefetcha una pagina interna quando ci passi sopra col mouse, cosi
il click e istantaneo. Sono escluse tutte le rotte con effetti collaterali
(`/entra`, `/accedi`, `/auth/*`, `/api/*`, gli overlay, i webhook) e tutti i
link che aprono in una nuova scheda.

## 5. La cache: l'impronta nel nome

**Il difetto, misurato sul sito vero.** Ogni file statico usciva con
`Cache-Control: public, max-age=0`:

| file | compresso | cache-control |
|---|---|---|
| `app.js` | 464 KB | `public, max-age=0` |
| `style.css` | 30 KB | `public, max-age=0` |
| `anime.css` | 23 KB | `public, max-age=0` |
| `overlay-skin.css` | 12,5 KB | `public, max-age=0` |
| `cerca.js` | 12 KB | `public, max-age=0` |

`max-age=0` vuol dire: a ogni apertura il browser RICHIEDE tutti e dieci i file
per sentirsi dire «non e' cambiato». Una decina di andate-e-ritorni prima di
disegnare qualcosa, anche a una settimana dall'ultima pubblicazione. Da telefono
e' proprio il mezzo secondo che si sente.

**La cura non e' alzare i tempi.** Quella e' una scommessa, e si perde il giorno
che pubblichi: chi ha in cache la versione di ieri se la tiene finche' scade. E'
legare il NOME al CONTENUTO.

`src/web/impronte.js` calcola l'impronta di ogni file servito (sha1 del
contenuto, otto caratteri) e marca i riferimenti nei gusci HTML:
`app.js` → `app.js?v=1a2b3c4d`. Poi `immutable` (un anno, e «non chiedere
nemmeno se ricarico») si da' **solo a chi chiede con l'impronta giusta**. Chi
arriva con una vecchia, o senza, riceve quello di prima — cosi' un indirizzo
salvato nei preferiti un anno fa non resta incastrato su una pagina morta.

Non e' una promessa che manteniamo stando attenti: `app.js?v=1a2b3c4d` o e'
quel file li', o non esiste. E sparisce anche il `?v=` scritto a mano sulle
icone, che era la stessa cosa fatta a memoria — e la memoria e' la parte che si
rompe.

**Dove entra.** Nei gusci, che il server costruisce come stringhe all'avvio
(`gusciaDi`, `PANNELLO`). Quindi niente passo di build da ricordarsi, e nessuna
cartella `dist` che possa andare fuori sincrono coi sorgenti.

**Un solo Cache-Control per risposta.** Sui caratteri ne uscivano due in
contraddizione — `immutable` messo da Caddy e `max-age=0` messo da noi: due
risposte alla stessa domanda, e quale vinca lo decide il parser di turno. La
regola di Caddy e' stata tolta: la cache la dichiara l'origine, che e' l'unico
posto che sa cosa sta servendo.

**Il service worker.** Con un indirizzo che non puo' cambiare contenuto puo'
rispondere SENZA RETE: cache-first per tutto quello che porta un `?v=`, e le
versioni vecchie dello stesso file si buttano quando ne arriva una nuova. Senza
impronta sarebbe stata una scommessa; con l'impronta e' una proprieta'.

Il collaudo (`test/contratto/impronte.test.mjs`) monta un'app Express vera con
la STESSA funzione del server (`montaStatici`): un collaudo su una copia che gli
somiglia non dice niente su quello che gira.

## Cosa NON e stato fatto, e perche

`content-visibility: auto` sulle sezioni sotto la piega e il consiglio standard
per risparmiare lavoro di layout. **Qui e sbagliato:** applica
`contain: paint`, che ritaglia il contenuto al proprio riquadro — e ci
rimangiremmo esattamente le luci e le ombre appena liberate (vedi
`docs/LUCI.md`). Il guadagno non vale il difetto.

## Quello che resta grosso: app.js in un file solo

1,45 MB minificati (464 compressi) in un unico file: il pannello non puo'
disegnare niente finche' non e' arrivato tutto. Adesso almeno lo scarica una
volta sola invece che a ogni apertura, ma resta il pezzo piu' pesante del sito.
Spezzarlo vuol dire decidere cosa serve al primo disegno e cosa puo' arrivare
dopo, ed e' un lavoro a se'.

## La vetrina non paga il conto del pannello

Misura sul sito vero, prima: **554 kB** sulla home per chi non e entrato, di
cui **434 kB di solo `app.js`** — il pannello intero, con lo Studio, l'editor
dell'overlay, la ricerca e il ponte con la regia. Piu il contorno: la veste
dell'overlay, il generatore di QR, l'avatar 3D, i preset, la plancia, il
pilota. Tutta roba che sulla home non ha niente da fare.

Il difetto non era un file di troppo: era che i due inquilini condividevano
l'elenco. `index.html` e uno solo — ed e giusto, e la stessa pagina, con la
stessa testata, lo stesso pie e la stessa filigrana — ma dentro ci abitano un
programma e un volantino. Finche l'elenco degli script e stato uno, il
volantino ha pagato il conto del programma. E non solo in byte: la vetrina che
il server aveva gia scritto restava sotto il velo di caricamento finche quel
megabyte non aveva finito di girare, perche il velo lo toglieva `app.js`.

Ora i gusci sono due, e li compone `src/web/vetrina-vista.js`:

- `guscioVetrina(...)` — la vetrina gia disegnata (listino compreso), la
  larghezza giusta al primo disegno, e **solo le risorse elencate in
  `RISORSE_VETRINA`**;
- `guscioPannello(...)` — tutto il resto, per chi e dentro e per la demo.

Il verso conta. L'elenco e **corto e positivo**: la vetrina tiene solo quello
che nomina, e tutto il resto e del pannello per definizione. Uno script nuovo
aggiunto domani non arriva alla home perche qualcuno si e ricordato di
escluderlo: non ci arriva perche non e in quell'elenco. Un elenco di cose da
togliere ha gia fallito due volte altrove (vedi `src/web/vetrina.js`), e per
costruzione non poteva fare altro.

Il listino se lo disegna il server. Prima la home apriva un buco vuoto,
chiedeva `/api/abbonamento/piani` e ci scriveva dentro le schede a risposta
arrivata: un giro di rete in piu e un pezzo di pagina che compariva dopo. I
prezzi il server li ha gia in mano, quindi entrano nei gusci insieme al resto,
e i gusci si rifanno quando il listino **cambia davvero** — la stessa ronda che
aggiorna le dirette in vetrina. Al browser resta il conto del configuratore:
`src/web/public/vetrina-app.js`, che legge prezzi e frasi da `data-conto` e non
contiene una parola di copia.

| | prima | dopo |
| --- | ---: | ---: |
| home, HTML + CSS + JS (gzip) | 554 kB | **82 kB** |
| script caricati | 17 | **5** |
| velo di caricamento | via dopo `/api/me` | via subito |

Il cancello che la tiene ferma: `node scripts/verifica-dieta.mjs`
(`--selftest`). Apre la home in un browser vero, pesa ogni cosa che chiede,
controlla che non chieda niente che non sia suo, che stia sotto il tetto di
120 kB, che il velo se ne sia andato — e che la demo, che il pannello lo e
davvero, continui ad averlo tutto. Se un domani il tetto si sfora, la domanda
giusta non e "alzo il tetto?": e "cosa e rientrato dalla finestra?".

Resta da fare, e vale un'altra fetta: `style.css` e `anime.css` sono ancora
interi (52 kB gzip sui 82), e per buona parte sono stile del pannello.

### La seconda fetta: le animazioni che non la riguardano

Misura, non stima: la vetrina usa **44 regole su 856** di `anime.css`. Il resto
e' lo Studio, la ricerca, le tabelle, le schede del pannello. Novanta per cento
di roba che a chi passa a leggere non serve.

Per toglierla c'erano due strade, e la differenza sta tutta in chi rischia.
**Spostare** le regole comuni in un file terzo sarebbe la cosa pulita, ma
cambia l'ORDINE in cui le regole si sovrascrivono per il pannello — e
sull'ordine si regge il suo aspetto. **Copiarle** in un file della vetrina non
tocca i file del pannello nemmeno di un byte: li' non puo' rompersi niente per
definizione. Il prezzo e' che quelle regole esistono in due posti.

Si e' scelto di copiare, e di far sorvegliare le copie. `anime-vetrina.css` sta
nello STESSO punto della catena in cui stava `anime.css` — prima di
`vetrina.css` — quindi per la vetrina l'ordine non cambia di una virgola.

Il cancello (`scripts/verifica-dieta.mjs`) guarda le copie in tre modi:

1. **Ogni regola copiata esiste identica in `anime.css`.** Confronto testuale,
   con i `@media` normalizzati (due media annidati e un media solo con la «and»
   dicono la stessa cosa e devono dare la stessa chiave).
2. **Rimettendo `anime.css` sulla vetrina non cambia niente.** Si confronta lo
   stile calcolato di ogni elemento, coi suoi due strati disegnati, in tre stati:
   a riposo, con tutto acceso (avviso, toast, domande aperte, pacchetti scelti) e
   sul telefono. Le animazioni si spengono da tutte e due le parti: non e' una
   scorciatoia, e' l'unico modo di avere due misure confrontabili, perche' la
   stessa animazione fotografata due volte da' due valori diversi anche quando la
   regola e' identica.
3. **Le animazioni vive sono le stesse.** Spente le animazioni, un `@keyframes`
   dimenticato nella copia non si vedrebbe piu': la regola `animation: respiro …`
   resta scritta uguale ma non anima niente. Quindi si confronta anche l'ELENCO
   delle animazioni attive — su quale elemento, con che nome.

Tre rotture di prova (una regola che sparisce, una che dice un'altra cosa, i
fotogrammi che non ci sono piu') sono viste tutte e tre.

| | prima | dopo la prima fetta | dopo la seconda |
| --- | ---: | ---: | ---: |
| home, HTML + CSS + JS (gzip) | 554 kB | 82 kB | **65 kB** |

Resta `style.css`: 118 regole usate su 1230, cioe' altri 25 kB. Li' le regole
che servono sono SPARSE — l'ultima utile e' la numero 1007 su 1230 — quindi non
esiste un punto dove tagliare, e la copia sarebbe di centoventi regole invece di
quarantaquattro. Si e' preferito fermarsi: e' una scelta, non una dimenticanza.
