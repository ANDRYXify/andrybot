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

## Cosa NON e stato fatto, e perche

`content-visibility: auto` sulle sezioni sotto la piega e il consiglio standard
per risparmiare lavoro di layout. **Qui e sbagliato:** applica
`contain: paint`, che ritaglia il contenuto al proprio riquadro — e ci
rimangiremmo esattamente le luci e le ombre appena liberate (vedi
`docs/LUCI.md`). Il guadagno non vale il difetto.
