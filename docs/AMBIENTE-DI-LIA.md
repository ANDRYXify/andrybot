# L'ambiente di Lia: uno schermo vero, un browser vero

## Cos'era, e perché non bastava

Il suo «computer» c'era già: shell, Python, Node, compilatori, una casa che
sopravvive ai riavvii, internet in uscita dietro il firewall del `guardiano`.
Ma tre cose lo tenevano al guinzaglio, e non si vedevano finché non le si
misurava.

**Il browser non era un browser.** Navigare voleva dire questo:

    chromium --headless --dump-dom URL | sed 's/<[^>]*>/ /g' | head -c 6000

Un colpo solo, senza schermo, senza memoria. Ogni pagina nasceva e moriva dentro
un comando. Non poteva cliccare, non poteva scorrere, non poteva compilare un
campo, non restava loggata da nessuna parte, non poteva seguire un percorso di
due passi. E le pagine fatte in JavaScript le vedeva **vuote**, perché prendeva
il DOM prima che il sito si disegnasse. Non era un browser: era una fotocopia
sbiadita di una pagina, tagliata a seimila caratteri.

**Mezzo minuto.** Ogni comando aveva un tetto di 30 secondi. In trenta secondi
non ci sta una navigazione vera, né una compilazione, né una prova un po' seria.

**Nessuno poteva guardare.** Non c'era uno schermo. Di quello che faceva
restavano solo le righe che stampava.

## Cos'è adesso

**Uno schermo vero.** `Xvfb` a 1440×900, `fluxbox` come gestore di finestre,
`x11vnc` + `noVNC` come vetro da cui guardarlo dal vivo. Il browser gira
**headful**, con la finestra: molti siti si comportano diversamente in headless,
e «vero» vuol dire che si comporta come per chiunque altro.

**Un browser vero che resta aperto.** Chromium di Playwright — quello completo,
con tutte le librerie, non la versione ridotta della distribuzione. Vive in un
processo suo (`ambiente/browser.py`) e **non muore fra un gesto e l'altro**: la
pagina resta dov'è, e il gesto dopo riparte da lì. Il profilo sta su disco nella
sua casa, quindi i cookie e le sessioni restano: se ieri è entrata da qualche
parte, oggi è ancora dentro.

I gesti che sa fare:

| gesto | cosa fa |
|---|---|
| `apri(url)` | va su una pagina e aspetta che si disegni davvero |
| `leggi` | il testo della pagina **come si vede**, non il sorgente |
| `clicca(cosa)` | prima per testo, come farebbe una persona («Accedi»), poi per selettore |
| `scrivi(dove, testo, invio)` | compila un campo e, se vuole, manda |
| `scorri(pixel)` | scende nella pagina — e sotto c'è altro da leggere |
| `indietro` / `avanti` | la cronologia, come in un browser qualunque |
| `link` | tutti i collegamenti della pagina, con il loro testo |
| `schermata` / `immagine` / `pdf` | quello che vede, salvato o mandato fuori |
| `dove` | dov'è adesso: indirizzo e titolo |

**Due minuti invece di trenta secondi**, e per tutto ciò che dura di più resta
il lavoro in background, che non ha tetto.

**Uno schermo che si può guardare.** `schermo()` restituisce una fotografia del
desktop intero, non della sola pagina. Un ambiente che non si può guardare è un
ambiente di cui bisogna fidarsi sulla parola.

## Il browser ha un padrone solo

Questa è la cosa che tiene in piedi tutto il resto, e la prima volta l'ho
sbagliata.

L'API sincrona di Playwright è **legata al thread che l'ha creata**: gli oggetti
nascono dentro un dispatcher suo, e usarli da un altro thread non dà un errore —
si pianta, e resta piantato. Un server HTTP a thread (uno nuovo per ogni
richiesta) è la ricetta esatta per quel guaio: il primo gesto costruisce il
browser nel thread A e funziona, il secondo arriva sul thread B e muore in
silenzio. Da fuori si vede «sta caricando», per sempre.

Perciò il browser vive in **un thread solo** — il lavoratore — che se lo
costruisce, lo usa e lo chiude. Chi risponde alle richieste HTTP non lo tocca
mai: mette un gesto in coda e aspetta, con una scadenza. Se il gesto sfora, chi
ha chiesto riceve un errore che **dice** cos'è successo, e il browser viene
rifatto da capo al gesto dopo: una pagina rimasta a metà non deve avvelenare i
gesti successivi.

Il browser si accende **all'avvio**, non al primo gesto: altrimenti quel gesto
pagherebbe mezzo minuto di attesa e da fuori sembrerebbe rotto.

## Le attese crescono verso l'esterno

Un gesto attraversa quattro attese in fila. Devono crescere andando verso
l'esterno, **sempre**:

| chi aspetta | quanto |
|---|---|
| il browser, per un gesto | 35s |
| l'esecutore, che aspetta il browser | 60s |
| il cervello, che aspetta l'esecutore | 75s |
| il sito, che aspetta il cervello | 90s |

Se una di quelle più esterne è più corta di una interna, chi sta fuori molla per
primo: la pagina si carica, la risposta arriva a nessuno, e nella scheda resta
una rotellina che gira. È esattamente quello che succedeva con venti secondi sul
sito e centocinquanta sotto.

`scripts/verifica-ambiente.mjs` non si limita a leggere il codice: fa **girare**
il meccanismo (coda, padrone unico, scadenze) sostituendo il solo gesto, e
pretende che con dieci richieste insieme un thread solo abbia toccato il
browser, che nessuna resti appesa, e che una lenta riceva un errore invece del
silenzio.

## Il confine, che non è cambiato

Tutto quello che c'era prima resta esattamente com'era. Questa non è una porta
aperta in più: è una stanza più grande dentro lo stesso recinto.

- **Il `guardiano`** resta il firewall d'uscita: internet pubblico sì, la
  tua infrastruttura (bot, Caddy, host, dati, metadati cloud) no. Anche il
  browser nuovo passa da lì — è la rete del container, non una sua.
- **Niente segreti.** La sandbox non riceve nessun `env_file`: solo la propria
  chiave. Non vede token, non vede pagamenti, non vede il database.
- **Una porta sola, una chiave sola.** Il browser ascolta su `127.0.0.1`, dentro
  il container. Da fuori ci si arriva **solo** passando dall'esecutore, che
  risponde solo a chi ha `AMBIENTE_KEY` — cioè al cervello. Le porte dello
  schermo (5900, 6080) e del browser (8100) vivono nella rete del guardiano:
  nessuna si affaccia su internet.
- **Utente non privilegiato, root in sola lettura, nessuna capability**, tetti a
  RAM, CPU e processi. Alzati — 4 GB e 2 CPU — perché uno schermo con un browser
  aperto consuma davvero, ma sempre tetti, e sempre regolabili da `.env`.
- **Il kill switch** (`ferma_tutto`) è dov'era.

Un solo permesso in più, e va detto: la sandbox ora tiene **cookie e sessioni**
fra un riavvio e l'altro, nel suo profilo. È ciò che rende il browser un browser
— senza, ogni pagina la ritroverebbe come uno sconosciuto. Vive nel volume della
sua casa, che è già suo e già isolato.

## Come si accende

L'ecosistema è spento finché non c'è `AMBIENTE_KEY` — se manca, tutto questo non
esiste e il bot funziona come prima. Con la chiave:

    docker compose build ambiente
    docker compose up -d ambiente

All'avvio si accendono, in ordine: lo schermo, il gestore di finestre, il vetro
per guardarlo, il browser, e infine l'esecutore (`ambiente/avvio.sh`). Se una di
queste cose manca nell'immagine, l'avvio **non si ferma**: lo dice nel log e
prosegue, e il browser va headless. Un ambiente che non parte è peggio di un
ambiente senza finestre.

Regolabili da `.env`: `AMBIENTE_MEM`, `AMBIENTE_CPUS`, `AMBIENTE_TIMEOUT_MAX`,
`SCHERMO_LARG`, `SCHERMO_ALT`.

## Perché la versione di Debian è inchiodata

`playwright install --with-deps` installa le librerie di sistema del browser con un
elenco che **dipende dalla versione di Debian**. Con una base che segue il vento
(`python:3.12-slim`) quella versione cambia quando cambia a monte: oggi è trixie,
Playwright 1.49 non la conosce, ripiega su un elenco vecchio e chiede
`ttf-unifont` e `ttf-ubuntu-font-family` — pacchetti che su trixie non esistono
più. Il build muore con «has no installation candidate», senza che nessuno qui
abbia toccato niente.

Perciò la base è `python:3.12-slim-bookworm`, e la versione di Playwright e la
Debian **stanno insieme**: chi cambia una deve cambiare l'altra.
`scripts/verifica-ambiente.mjs` lo tiene fermo — se l'immagine si fa vestire da
Playwright, la base dev'essere inchiodata a un nome preciso.
