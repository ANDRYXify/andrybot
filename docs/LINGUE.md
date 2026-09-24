# Le lingue

SocialBot si usa in italiano, inglese e spagnolo. Il pannello lo è già: ogni
testo passa da `L(it, en, es)`. Il resto no:

| cosa | oggi |
|---|---|
| pagina iniziale | tre lingue, ma allo stesso indirizzo con `?lang=` |
| guide | solo italiano |
| manuali | solo italiano |
| novità (pagina e finestra nel pannello) | solo italiano, anche a chi ha il pannello in inglese |
| privacy e termini | solo italiano |
| pagina 404 | tre lingue |

Chi arriva in inglese o in spagnolo deve trovare **tutto** nella sua lingua, e un
motore di ricerca deve poter indicizzare ogni pagina in ogni lingua come una
pagina a sé.

## Gli indirizzi

Una lingua è un pezzo dell'indirizzo, non un parametro. Ogni pagina ha il suo
indirizzo per lingua, il suo `canonical` che punta a sé stessa e il gruppo
`hreflang` con le altre due (più `x-default` sull'italiano).

| pagina | italiano | inglese | spagnolo |
|---|---|---|---|
| pagina iniziale | `/` | `/en` | `/es` |
| guide | `/guide`, `/guide/<slug>` | `/en/guides`, `/en/guides/<slug>` | `/es/guias`, `/es/guias/<slug>` |
| manuali | `/manuale`, `/manuale/<slug>` | `/en/manual`, `/en/manual/<slug>` | `/es/manual`, `/es/manual/<slug>` |
| novità | `/novita` | `/en/news` | `/es/novedades` |
| privacy | `/privacy` | `/en/privacy` | `/es/privacidad` |
| termini | `/termini` | `/en/terms` | `/es/terminos` |

Gli slug si traducono: chi cerca in inglese legge l'indirizzo nei risultati, e
`/en/guides/twitch-moderation-bot` gli dice qualcosa, `/en/guides/bot-moderazione-twitch`
no.

**`/en` e non `/en/`.** La pagina iniziale chiama le sue risorse con indirizzi
relativi (`style.css`, `app.js`). Da `/en` un indirizzo relativo si risolve
sulla radice, da `/en/` finirebbe in `/en/style.css`, che non esiste. Con `/en`
è giusto senza toccare una riga di `index.html`; `/en/` risponde 301 su `/en`.

**`?lang=` resta per il pannello.** Chi non è entrato e apre `/?lang=en` va con
un 301 su `/en`, così i collegamenti vecchi e quelli già indicizzati portano
all'indirizzo nuovo. Chi è entrato, e la demo, restano sul pannello, che la
lingua la legge da `?lang`, poi dall'indirizzo (`/en`), poi da quella ricordata.
I collegamenti alla demo dalla pagina inglese portano `?demo=1&lang=en`: chi
arriva da una ricerca in inglese non si ritrova il pannello in italiano.

## Il modello dei contenuti

Una guida, un manuale, sono **una cosa in tre lingue**, non tre cose che si
somigliano. Ogni lingua sta nei suoi file, così si scrive e si traduce una
pagina per volta senza toccare le altre:

| cosa | italiano | inglese e spagnolo |
|---|---|---|
| guide | `src/web/guide/it.js` | `src/web/guide/en.js`, `src/web/guide/es.js` |
| manuali | `src/web/manuali/it/<slug>.js` | `src/web/manuali/en/`, `src/web/manuali/es/` |

Una traduzione è legata all'originale dall'`id`, che è lo slug italiano, e ha
il suo `slug`, `titolo`, `h1`, `desc`, `corpo` e `faq`. Schede, tipo e data li
eredita dalla voce italiana quando non ha i suoi.

- `guideIn(lingua)` e `manualiIn(lingua)` danno le pagine di una lingua, nello
  stesso ordine e nella stessa forma dell'italiano.
- Il gruppo `hreflang` si ricava dalle traduzioni che esistono
  (`alternativeGuida`, `alternativeManuale`): una pagina non può dichiarare una
  lingua che non ha, e una pagina non tradotta non esce in italiano sotto un
  indirizzo inglese.
- Le tabelle calcolate del manuale dei giochi (i numeri, le attese, le regole)
  stanno in `src/web/manuali/numeri.js` e leggono il catalogo, che ha già i nomi
  in tre lingue (`giochi-conf.js`).
- Le parti fisse della pagina (testata, piè di pagina, «In questa pagina»,
  «Domande frequenti», le briciole, la data) e gli indirizzi per lingua stanno
  una volta sola in `src/web/guide.js` (`T`, `VIE`).

## I nomi delle cose

Il manuale inglese chiama le schede, i tasti e le voci **come li chiama il
pannello inglese**. La fonte è una sola: le stringhe `L()` di `app.js`. Un
manuale che dice «Rules» dove il pannello dice «Chat rules» manda il lettore a
cercare una cosa che non trova.

I nomi dei comandi (`!morti`, `!ore`) non si traducono: sono quelli che il bot
riconosce.

## Il «?» del pannello

`aiutiPerScheda()` restituisce l'indirizzo della pagina nella lingua del
pannello: chi ha il pannello in spagnolo apre il manuale spagnolo.

## Le novità

Ogni riga di `NOVITA.md` si scrive nelle tre lingue, nello stesso commit:

```md
- Il testo in italiano. [vai: account]
  - en: The text in English.
  - es: El texto en español.
```

La finestra delle novità nel pannello mostra la riga nella lingua del
pannello; la pagina pubblica ha i suoi tre indirizzi. Le righe già scritte si
traducono una volta, tutte.

## Privacy e termini

Tradotti per intero. Il testo italiano resta quello di riferimento, e le due
traduzioni lo dicono in cima.

## Dati strutturati

Ogni lingua ha i suoi, ricavati dalla pagina che li porta:

- la `FAQPage` della pagina iniziale è la sezione di domande **visibile** in
  quella lingua, non un blocco scritto a mano in italiano e ricopiato;
- `SoftwareApplication` ha descrizione ed elenco delle funzioni nella lingua
  della pagina, e i prezzi dal listino vero;
- guide e manuali hanno `inLanguage` della loro lingua, e le briciole con i
  nomi della loro lingua.

## Il collaudo

- **Ogni pagina in tre lingue**: ogni guida, manuale, novità pubblica ha `it`,
  `en` ed `es` complete (stesse sezioni, stesse domande).
- **Nessun resto d'italiano** nelle pagine inglesi e spagnole, fuori dagli
  esempi di chat e dai nomi dei comandi.
- **Reciprocità**: ogni `hreflang` punta a una pagina che risponde 200 e che
  punta indietro.
- **I nomi delle schede** citati in un manuale sono quelli del pannello in
  quella lingua.
- La sitemap elenca ogni pagina in ogni lingua con le sue alternative.

## L'ordine del lavoro

1. **Gli indirizzi della pagina iniziale**: `/en` e `/es`, il 301 da `?lang=`, il
   pannello che legge la lingua dall'indirizzo, i collegamenti alla demo con la
   lingua, e i dati strutturati per lingua.
2. **I manuali completi in italiano**: ogni scheda del pannello spiegata fino in
   fondo. Prima di tradurre, così non si traduce due volte.
3. **Guide e manuali in tre lingue**: il modello qui sopra, le rotte, la sitemap,
   il «?» del pannello, e le traduzioni.
4. **Novità, privacy e termini** in tre lingue.
