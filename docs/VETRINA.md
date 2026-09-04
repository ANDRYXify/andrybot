# La vetrina pubblica

I file del sito non hanno commenti: quello che spiegherebbero sta qui.

## Una vetrina sola (prima erano due, e diverse)

Sullo stesso indirizzo convivevano **due pagine**, non due copie della stessa:

| | dove stava | lingue | testo |
|---|---|---|---|
| il blocco per i motori | scritto a mano dentro `index.html` | **solo italiano** | 4357 caratteri, quattro sezioni sue |
| la vetrina vera | disegnata da `app.js` | it / en / es | la demo, i piani, i pacchetti |

E `app.innerHTML = …` **buttava via la prima**. Quindi il crawler indicizzava un
testo che nessun visitatore leggeva mai, e la persona ne leggeva un altro. Lo
scarto fra le due si misurava anche in CLS: **0,195**, cioè letteralmente lo
scambio di una pagina con l'altra a metà caricamento.

Adesso la pagina è **una**, e la disegna il server:

- il markup vive in `src/web/vetrina-vista.js`, funzione **pura** di lingua e
  poco altro — nessun DOM, nessuna richiesta, nessuna data — così i quattro
  gusci precalcolati all'avvio (`gusciaDi` in `server.js`) se la portano dentro
  senza rifare niente a ogni richiesta;
- il file sta in `src/web/` e **non** in `public/`: al browser arriva la vetrina
  già disegnata, il generatore gli sarebbe peso morto;
- `app.js` non la ridisegna più: aggancia i comportamenti su quello che trova, e
  aggiunge solo l'avviso d'errore, che dipende dall'indirizzo di chi guarda e
  quindi non può stare in un guscio precalcolato.

**Le lingue sono diventate link.** Erano pulsanti che ridisegnavano la pagina in
JS: un motore non li può premere, e chi cambiava lingua restava sullo stesso
indirizzo. Ora sono `<a>` verso `/`, `/?lang=en`, `/?lang=es` — esattamente i tre
indirizzi che sitemap e `hreflang` dichiarano da sempre. E `app.js`, da sloggato,
prende la lingua **dal documento servito**: quello che vedi è quello che è, senza
che una preferenza salvata scriva gli avvisi in un'altra lingua.

### Misurato

| | prima | dopo |
|---|---|---|
| testo indicizzabile senza JS | 4357 car., **una** lingua, altra pagina | 3953 car., **tre** lingue, la pagina vera |
| scarto di layout (CLS) | 0,195 | **0** |
| errori di pagina | 0 | 0 |

### Perché non può tornare a essere due

- `test/contratto/vetrina.test.mjs`: `index.html` deve avere solo il segnaposto,
  `app.js` non deve contenere markup della vetrina, ogni lingua deve avere lo
  stesso numero di sezioni e un solo `h1`, e le copie che il modulo si porta
  dietro (icone e nomi dei pacchetti — `app.js` è uno script classico e non può
  importare) devono essere identiche a quelle di `app.js`.
- `scripts/verifica-vetrina.mjs`: in un browser vero, senza JS la pagina c'è già;
  con JS ha **lo stesso** titolo e le stesse sezioni, e lo scarto di layout resta
  sotto 0,1. Provato rosso facendo riscrivere `#app` ad `app.js`.
- L'ancoraggio (`<div id="app"></div>`) e l'inserimento stanno in **una**
  funzione, `inserisciVetrina`, usata dal server e dai collaudi: se manca,
  il server non parte, invece di servire una home col buco.
- I collaudi col browser avevano **nove** copie del loro servertto locale, che
  servivano `index.html` grezzo: dopo questo cambio mostravano una pagina vuota
  al posto della vetrina, ed è così che il cancello del contrasto è diventato
  rosso. Adesso c'è `scripts/_sito.mjs`, e la home la compone con la stessa
  funzione del server.

## Il mondo: due stanze, una porta

**Fuori (`body.vetrina`) è sempre scuro.** I token del tema vengono ridefiniti su `body.vetrina`,
quindi vincono su `:root[data-theme]` per tutto ciò che sta dentro: la pagina pubblica resta
cinematica anche se il visitatore ha scelto il tema chiaro. **Dentro il cruscotto non cambia
niente**: continua a rispettare la scelta della persona. Verificato: con `data-theme="light"` la
vetrina resta `rgb(11,10,9)` e il cruscotto resta crema.

La ragione è di genere, non di gusto: un accento saturo vive sul nero e muore sulla crema, e il
pubblico di un bot per Twitch arriva da un mondo scuro.

**Palette.** Fondo `#0b0a09` (nero caldo, non piatto), accento `#ff5a36`, secondo accento
`#9b7bff`. Non è una scelta decorativa: sono la luce calda e la luce fredda di una scena — e il
viola è il colore della piattaforma su cui vive il prodotto.

**Tipografia.** `Archivo` larga (asse `wdth` fino a 112%) per i titoli: voce da interfaccia, ampia
e sicura. `Instrument Serif` in corsivo per le parole-accento: è la voce «lusso» che impedisce al
tutto di leggere solo «gamer». Il corpo resta `Zen Kaku Gothic New`, già in uso. Nessun host nuovo:
stessa richiesta a Google Fonts.

## Il cinema è un DI PIÙ, mai la sostanza

Le rivelazioni allo scroll usano le **animazioni CSS scroll-driven** (`animation-timeline: view()`),
che girano sul compositore e non toccano il thread principale — la lezione del cursore.

Supporto verificato, non assunto: **Chrome/Edge sì. Safari 26 sì** (e da 26.4 girano su thread
separato). **Firefox no**: è ancora dietro il flag `layout.css.scroll-driven-animations.enabled`.
MDN infatti segna la feature come *non* Baseline. Un blog diceva «universale nel 2026»: era falso.

Perciò tutto il cinema sta dentro:

```css
@media not (prefers-reduced-motion: reduce) {
  @supports (animation-timeline: view()) { ... }
}
```

Il contenuto è **leggibile e completo senza una sola animazione**: nessun `opacity: 0` di partenza
fuori dal blocco `@supports`. Su Firefox la pagina è statica e giusta, non vuota.

Trappola presa dalla guida WebKit: `animation-timeline` va scritta **dopo** `animation`, altrimenti
la shorthand la azzera.

## Il prodotto vivo

L'anteprima non è uno screenshot: è l'overlay che funziona. Chat che arriva a ondate, avviso
follower che scatta, contatore spettatori che sale. Tutto in CSS, con `animation-delay` sfalsati:
**deterministico, nessun JS, nessun timer**. Il contatore usa `@property --vt-n` + `counter()`:
sale davvero, senza una riga di script.

Quando scorri via, il vetro si allontana (`animation-range: exit`) invece di sparire: il prodotto
esce di scena, non viene tolto.

## Registrazione

Per un prodotto Twitch, **autorizzare È registrarsi**: un secondo sistema di identità con email e
password sarebbe solo un'altra superficie da difendere, e l'OAuth servirebbe comunque.

Quindi due porte, un corridoio:

- `/entra?nuovo=1` → `selfFlow.nuovo = true` → al ritorno dal callback: `/?benvenuto=1`
- `/entra` → come prima, dritto al cruscotto

Il **benvenuto** è un velo che si apre una volta sola e dice tre cose vere: il canale è collegato,
l'Essenziale è già tuo e gratis, gli extra si aggiungono dopo. Chiudendolo il parametro sparisce
dall'indirizzo.

## Il configuratore degli extra

`configuratoreHtml(dati, opzioni)` + `montaConfiguratore(radice, dati, opzioni)`: **un solo
componente, due case** — la vetrina (dove porta a `/accedi` con i pacchetti scelti) e il cruscotto
(dove chi ha già l'abbonamento aggiunge solo ciò che gli manca, passando `gia: [...]`).

Spunti gli extra, vedi il totale mensile aggiornarsi, e **se un pacchetto curato costa meno della
somma di ciò che hai scelto te lo dice e lo applica da solo** — solo se lo copre per intero. Il
totale include il canone Base quando non ce l'hai ancora, e lo esclude quando ce l'hai già.

Verificato: Base €2,99 · +Giochi €5,78 · +Voce €6,77 · +Musica €8,48 con il pacchetto
«Interazione» applicato al posto della somma (€5,49 invece di €6,57).

## Tre lingue davvero

I nomi e le descrizioni dei piani vivevano solo in italiano: su pagina inglese comparivano
descrizioni italiane. Ora ogni piano, add-on e pacchetto ha `nome3` e `sommario3` (it/en/es), e
`pianiPubblici()` li espone. I campi vecchi restano: chi legge `sommario` continua a funzionare.

## Una tavolozza sola

La pagina pubblica aveva una tavolozza **tutta sua**, scura fissa: `body.vetrina`
ridefiniva l'intera palette — fondo quasi nero, accento arancione, un viola di
appoggio — e vinceva su quella del sito perché sta su `body`. Risultato: chi
sceglieva il tema chiaro vedeva comunque una home scura, e appena entrava (o
apriva una guida) cambiava prodotto.

Le guide, dal canto loro, avevano una **copia a mano** dei colori, rimasta al
viola di due marchi fa. Tre mondi diversi in tre clic.

Ora il fatto è scritto una volta: i colori stanno in `anime.css` — la stessa
fonte che veste la dashboard — e

- la **vetrina** non li ridefinisce più: eredita, quindi segue il tema come tutto
  il resto, compresa la scelta chiaro/scuro della persona (non solo quella del
  sistema operativo);
- le **guide, i manuali e le novità** li *leggono* da lì quando compongono la
  pagina, e caricano `tema.js` — l'unico script di quelle pagine, e non tocca il
  contenuto — per rispettare la stessa scelta.

Restano nella vetrina solo le cose che sono davvero sue: la composizione, gli
aloni della scena, le larghezze. E una sola eccezione dichiarata: dentro
`.vt-schermo` la tavolozza torna scura, perché **uno schermo è uno schermo** —
una diretta è scura anche su una pagina chiara, come in qualsiasi lettore video.
Dichiararlo lì una volta tiene leggibili etichette, chat, alert e webcam senza
che sappiano che tema ha la pagina attorno.

I colori adesso stanno in **`tema.css`**, un file che fa una cosa sola: dichiara
la tavolozza, chiara e scura. Lo caricano la home, le pagine semplici e — letto
da disco al momento di comporre — le guide. `anime.css` non li dichiara più.

## Anche le pagine semplici

`privacy`, `termini`, l'invito ai moderatori e lo sblocco con passkey avevano
ognuna **il proprio stile in linea**, scuro fisso, con i colori scritti a mano:
quattro copie di quasi la stessa cosa, ferme al viola di prima. Ora si appoggiano
a due fogli: `tema.css` per i colori e **`pagina.css`** per la forma — un
documento con le sue sezioni, oppure una carta in mezzo allo schermo per le
pagine che chiedono una cosa sola. E caricano `tema.js`, quindi seguono la
scelta chiaro/scuro come tutto il resto.

Gli unici colori scritti a mano rimasti in `pagina.css` sono il viola di Twitch
sul suo pulsante e il bianco sul pieno: sono di Twitch, non nostri.

`tgapp.html` resta fuori di proposito: è la mini app dentro Telegram e usa i
colori che Telegram le passa (`--tg-theme-*`). Lì la coerenza è con Telegram.

`test/contratto/tema.test.mjs` tiene il patto: la vetrina non dichiara colori del
sito (rosso provato rimettendoci `--acc`), lo schermo dichiara i suoi, le guide
usano davvero i valori di `tema.css`, e le pagine semplici non hanno più uno
stile tutto loro.

## Da dove si arriva alle guide

Guide, manuali e novità stavano **solo nel piede**: esistevano e non le trovava
nessuno. Ora la vetrina ha una testata vera — marchio a sinistra, *Guide ·
Manuali · Novità · Demo* al centro, lingua a destra — che su telefono va a capo
in due righe invece di stringersi.

E l'occhiello sopra il titolo non ripete più il nome — che adesso è scritto nel
logo lì sopra: dice a chi serve il bot («Per Twitch e Kick»).

Un dettaglio che vale la pena raccontare: la classe `.vt-testa` che avevo scelto
per quella testata **esisteva già** (le testate delle sezioni, con
`max-width: 46ch`). La barra si è ritrovata larga 384px e andava a capo da sola.
Non era un difetto di layout: era una collisione di nomi nel foglio di stile, di
quelle che non danno nessun errore. Si chiama `.vt-barra`.

## Il guscio non si elenca: si ricava

Il sito è un labirinto — senza sessione tutto risponde 404 — e per anni l'eccezione è stata un
elenco scritto a mano in `server.js` (`VETRINA`): i file che chi non è loggato può scaricare.

Un elenco così **non può funzionare**, e infatti ha ceduto due volte. L'ultima il giorno in cui
gli script in linea sono diventati file veri per togliere `'unsafe-inline'` dalla CSP: dieci file
nuovi (`cookie.js`, `splash.js`, `tema.js`, `mod.js`, `sblocca.js`, `tgapp.js`, `overlay-app.js`,
`tracking-play.js`, `tracking-detector.js`, `tracking-detector-conf.js`) sono nati **chiusi**. Il
sito rispondeva 200 a tutte le pagine e nessun collaudo era rosso, ma:

- la **home** restava sotto il velo di caricamento per sempre (`splash.js` è quello che lo toglie);
- l'**overlay in OBS** era una pagina bianca (`overlay-app.js`);
- l'**invito ai moderatori** e lo **sblocco con passkey** non facevano niente;
- e `/.well-known/security.txt` non era leggibile da nessuno, cioè da chi deve segnalare un buco.

Ora la decisione sta tutta in `src/web/vetrina.js`, in una funzione pura: `aperto(percorso)`.

- Le **pagine** le dichiara chi le serve, nel punto in cui le serve:
  `res.sendFile(guscio.pagina('privacy.html'))`. Una riga, dove l'informazione è vera.
- Gli **asset** non si dichiarano affatto: si seguono i riferimenti della pagina — gli `src` e gli
  `href` dell'HTML, gli `url()` dei CSS, i percorsi scritti dentro gli script (il service worker
  precarica così, e l'overlay tracking carica i suoi moduli a mano) — finché non si aggiunge più
  niente. Un file diventa pubblico solo se esiste davvero: le rotte (`/entra`, `/guide/...`) e i
  domini altrui cadono da soli.
- Dagli script **non** si seguono le pagine `.html`: una pagina è una rotta con un suo controllo
  d'accesso, e la decide chi la serve. `voce.html` è nominata dalla dashboard e resta dietro il
  login, dove deve stare.
- `/icons/` e `/vendor/` sono aperte per intero: niente di segreto, e servono anche ai crawler.

Il collaudo (`test/contratto/guscio.test.mjs`) legge dai sorgenti quali pagine il server dichiara,
rilegge cosa chiedono con una lettura **più larga** di quella del modulo (apici singoli, doppi,
nessun apice) e chiede al cancello se passano. Se un modo di scrivere un `src` sfuggisse al
modulo, la differenza salterebbe fuori lì.

Quindi: `vetrina.css` non è più «da ricordare». Lo chiede `index.html`, e tanto basta.
