# La vetrina pubblica

I file del sito non hanno commenti: quello che spiegherebbero sta qui.

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
