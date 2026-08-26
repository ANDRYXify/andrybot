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
