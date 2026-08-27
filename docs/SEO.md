# SEO — cosa c'e, cosa non funzionava, cosa e stato corretto

## Lo stato di partenza

Il sito aveva gia le fondamenta a posto: `title` e `description`, `canonical`,
Open Graph e Twitter Card con immagine 1200x630, `robots.txt` con il rimando
alla sitemap, un `llms.txt` per gli assistenti IA, e un grafo JSON-LD ricco
(`WebSite`, `WebPage`, `Organization`, `SoftwareApplication` con `featureList`
e `offers`, `FAQPage`). Piu i redirect canonici: `www` → dominio nudo e
`socialbot.it` → `socialbot.live`, entrambi 301.

Sotto, pero, c'erano tre difetti che annullavano una parte del lavoro.

## 1. Le versioni inglese e spagnola non potevano essere indicizzate

`index.html` dichiarava tre alternative `hreflang` — `/`, `/?lang=en`,
`/?lang=es` — ma il server rispondeva **sempre con lo stesso HTML italiano**:
`<html lang="it">`, titolo e descrizione in italiano, `og:locale` `it_IT` e
soprattutto

```html
<link rel="canonical" href="https://socialbot.live/">
```

Per Google quel canonical dice: «`?lang=en` e un duplicato della home
italiana, indicizza quella». Le due alternative venivano quindi scartate, e il
gruppo `hreflang` **si annullava da solo**: tre pagine dichiarate, una sola
indicizzabile.

Ora `serviGuscio` in `server.js` precalcola **un guscio per lingua**, ognuno
col proprio `lang`, `title`, `description`, `og:*`, `twitter:*`, `inLanguage`
del JSON-LD, e un `canonical` che punta **a se stesso**. Le alternative
`hreflang` restano identiche in tutti e tre, come vuole la specifica
(reciprocita).

Le sostituzioni in `gusciaDi()` sono **verificate una per una**: se un domani
`index.html` cambia e un ancoraggio non c'e piu, il server non parte, invece di
mettere online in silenzio delle alternative rotte.

Difetto gemello lato client: `?lang=` veniva letto **dopo** `localStorage`,
quindi a chi aveva gia scelto una lingua un link `?lang=en` condiviso non
faceva niente. Ora la richiesta esplicita nell'indirizzo vince, e viene anche
ricordata.

## 2. La sitemap vera non usciva

C'e una rotta `/sitemap.xml` che genera la sitemap dal database — pagine fisse
piu tutte le pagine link `/u/<canale>` pubblicate, con la loro data vera. Non
e mai stata servita: esisteva anche un file `public/sitemap.xml`, e
`express.static` e registrato molto prima della rotta, quindi vinceva lui. I
motori vedevano tre righe ferme a una data fissa.

Il file e stato tolto. Adesso la sitemap la fa solo la rotta, e la home
compare tre volte — una per lingua — ognuna col gruppo completo di
`xhtml:link rel="alternate"`, che e la forma che Google chiede per dichiarare
le lingue da sitemap.

## 3. La `description` era lunga il triplo del necessario

458 caratteri. Google ne mostra circa 155-160: il resto veniva tagliato, e
quello che restava leggeva come un elenco di parole chiave. Riscritta a 162,
164 e 159 caratteri nelle tre lingue, con dentro le parole che contano
davvero (bot Twitch, chat, moderazione, overlay OBS, avvisi live, gratis).

## 4. Core Web Vitals

Sono un segnale di posizionamento, e ora sono tutti verdi: FCP 104 ms, LCP
~1,1 s, CLS 0,003. I numeri e il perche stanno in `docs/VELOCITA.md`.

## Sui crawler delle IA

GPTBot, ClaudeBot e PerplexityBot **scaricano** il JavaScript ma non lo
eseguono: di una SPA vedono solo l'HTML iniziale. Qui il corpo della vetrina lo
scrive `app.js`, quindi il testo visibile non lo leggono. Non e pero un buco
cieco: il grafo JSON-LD in `index.html` — descrizione, `featureList` di 23
voci, le due offerte con i prezzi, e le domande e risposte della `FAQPage` —
sta **nell'HTML iniziale**, e i dati strutturati li leggono. Piu `llms.txt`,
che dice a chiare lettere chi siamo (serve: «SocialBot» e un nome usato anche
da prodotti di tutt'altro genere).

`robots.txt` non blocca nessun crawler IA: e voluto, vogliamo essere trovati.

## Il limite vero, che resta

Il dominio ha **una sola pagina di contenuto**. Una landing page sola non puo
posizionarsi su tutte le ricerche che ci interessano — «bot twitch gratis»,
«overlay OBS alert follow», «come fermare una hate raid», «richieste musicali
Spotify Twitch», «bot twitch italiano» — perche ognuna vuole una pagina che
parli di quella cosa. Le pagine `/u/<canale>` aggiungono superficie ma parlano
degli streamer, non del prodotto.

Il passo successivo, quando si vuole, e una manciata di pagine vere — una per
argomento — servite gia scritte dal server (non dalla SPA), cosi le leggono sia
Google sia le IA. E un lavoro di contenuti prima che di codice.

---

## Perché "bot twitch" non ci trovava: mancava il contenuto, non la tecnica

### La misura

Prima di toccare qualcosa, cosa vedeva davvero un motore di ricerca:

| segnale | stato |
|---|---|
| `robots.txt` | a posto, `Allow: /`, sitemap dichiarata |
| `sitemap.xml` | valida, servita, con hreflang |
| `canonical` per lingua | corretto, ognuno punta a sé |
| `hreflang` it/en/es + x-default | corretto |
| dati strutturati | presenti |
| `socialbot.it` | 301 su `socialbot.live` |
| testo nell'HTML servito | 21 KB, non serve JS per leggerlo |
| **URL di contenuto** | **1** |

La tecnica era già a posto. Quello che mancava è che la sitemap aveva sette voci
di cui **tre erano la stessa vetrina in tre lingue** e due erano le pagine legali:
una sola pagina con qualcosa da dire.

Cercando anche solo il nome del dominio, il sito non compariva.

### Cosa dice la ricerca sul 2026

Tre cose cambiano l'ordine delle priorità:

- **Google non supporta IndexNow.** Lo supportano Bing, Yandex, Naver, Seznam e
  Yep. Per Google restano Search Console e i collegamenti.
- **`llms.txt` non conta** né per il ranking né per gli AI Overviews: la
  documentazione di Google lo dice esplicitamente. Il file resta perché serve a
  disambiguare il nome "SocialBot" per gli assistenti, ma non è una leva SEO.
- **Il collo di bottiglia non è la sottomissione, è lo spessore.** Una pagina
  sottile resta "scansionata, non indicizzata" anche quando la si sottopone a
  mano. E gli AI Overviews usano gli stessi sistemi di ranking della ricerca
  normale: non c'è una scorciatoia separata.

C'è anche un fatto sulla forma della query. In italiano "bot twitch" è occupata
da **guide e confronti**, non da homepage di prodotto: chi cerca vuole capire
come si fa, non atterrare su una vetrina. Per comparire lì bisogna rispondere a
quella domanda.

### Cosa è stato fatto

Cinque guide vere, servite come HTML completo senza JavaScript, con il foglio di
stile dentro la pagina (tre chilobyte: una richiesta in meno vale più di una
cache) e il font già ospitato qui.

| pagina | parole | intento |
|---|---|---|
| `/guide/bot-per-twitch-italiano` | 1027 | confronto, "quale bot scelgo" |
| `/guide/come-mettere-un-bot-su-twitch` | 893 | procedura |
| `/guide/follow-bot-e-hate-raid` | 1422 | problema urgente |
| `/guide/comandi-chat-twitch` | 911 | riferimento |
| `/guide/overlay-obs-per-twitch` | 919 | procedura |

Ognuna con `Article` o `HowTo`, `BreadcrumbList` e `FAQPage` nei dati
strutturati, canonical, Open Graph, collegamenti fra guide e dalla home.

La guida sui follow-bot è la più lunga di proposito: è l'unica dove abbiamo
qualcosa di **originale** da dire — la distinzione fra un'ondata artificiale e
una clip andata bene misurata sulla cadenza degli arrivi — e il contenuto
originale è ciò che i motori e gli assistenti citano. Il resto sono guide
oneste su cose note.

Il contenuto vive in `src/web/guide.js` come struttura di dati, non come file
HTML sparsi: una guida in più è una voce in più, e da lì si aggiornano da sole
sitemap, indice e collegamenti incrociati.

### Il collaudo

Un controllo automatico rifiuta le pagine sottili (sotto le 700 parole), quelle
senza dati strutturati, senza canonical o senza `h1`, e i `title` sopra i 65
caratteri o le `description` sopra i 165 — che verrebbero troncati nei risultati.
Cinque descrizioni erano fuori misura e sono state riscritte.

### Cosa resta da fare, e richiede te

Queste due cose non le può fare il codice:

1. **Google Search Console** — verificare la proprietà di `socialbot.live` e
   sottoporre la sitemap. È il canale con cui Google scopre il sito in giorni
   invece che in settimane. Serve il codice di verifica: si mette come meta tag
   nell'`head` o come record DNS.
2. **Bing Webmaster Tools** — stessa cosa, e da lì si abilita IndexNow, che Bing
   supporta davvero.

Un sito nuovo, senza collegamenti in entrata, viene tipicamente indicizzato in
tre-sette giorni dopo la sottomissione. Il posizionamento su una query
competitiva richiede molto più tempo e, soprattutto, che qualcuno colleghi il
sito: quello nessun accorgimento tecnico lo sostituisce.

### Fonti

- [Google — llms.txt non ha effetto sul ranking](https://www.digitalapplied.com/blog/google-llms-txt-no-seo-value-lighthouse-audit-2026)
- [IndexNow: chi lo supporta nel 2026](https://pressonify.ai/blog/indexnow-instant-indexing-press-releases-2026)
- [Indicizzazione di un sito nuovo](https://www.trysight.ai/blog/website-not-getting-indexed-fast)
- [AI Overviews e sistemi di ranking](https://www.seoinc.com/seo-blog/ai-seo/)
