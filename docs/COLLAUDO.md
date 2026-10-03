<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# Il collaudo

> © 2024–2026 Andrea Taliento (ANDRYXify)

`npm test` — gira in pochi secondi, non chiede rete, non tocca il database vero.
Gira anche da solo su GitHub a ogni push e a ogni pull request
(`.github/workflows/collaudo.yml`), su Node 20 e 22.

## Perché esiste

Fino a ieri non c'era. Su 21.000 righe di server e 15.000 di dashboard l'unica
rete erano tre script che bisognava ricordarsi di lanciare a mano — e infatti il
difetto più caro (l'overlay che «non salvava niente») è passato proprio di lì:
il browser scriveva quattro assi nuovi, il server non li elencava e li buttava
via in silenzio. Nessuna prova attraversava il confine browser↔server, quindi
nessuna poteva vederlo.

Il criterio di cosa provare non è la copertura: è **ciò che è già costato**, e
ciò che costerebbe di più se cedesse in silenzio — i soldi, i segreti, la roba
degli altri.

## Cosa c'è dentro

| File | Cosa tiene fermo |
|---|---|
| `contratto/stile` | Ogni valore di ogni asse dell'overlay sopravvive al salvataggio; un valore inventato no. Chiama le normalizzazioni **vere** del server, non confronta testo. |
| `unita/piani` | Chi non paga non entra, chi paga non trova chiuso. Add-on che si sommano, tier inventati che non regalano niente. |
| `unita/segreti` | I token cifrati a riposo tornano identici, non trapelano, e un valore manomesso non fa cadere il bot. |
| `unita/libreria` | Chi vede cosa nella libreria condivisa. Il privato di uno non finisce nella vetrina di tutti. |
| `unita/identita` | Un media caricato non ne cancella mai un altro; ogni comando coniato è valido e non esce dalla cartella. |
| `unita/antispam` | Soprattutto il **falso positivo**: i messaggi normali devono passare. |
| `unita/moderazione` | Le parole vietate, e le conseguenze note della scelta «sottostringa». |
| `cancelli/*` | I cancelli statici (`npm run cancelli`), che ora girano da soli. |

## Come si aggiunge una prova

Un file `test/**/qualcosa.test.mjs`, `node:test` e `node:assert/strict`. Se
serve il database, `cartellaUsaEGetta()` da `test/aiuto.mjs` **prima**
dell'`import` di `db.js`: ogni file di prove gira nel suo processo, quindi ha il
suo database usa-e-getta.

## La regola

Un cancello che non è mai stato visto diventare rosso non è un cancello.
Ognuna di queste prove è stata messa alla prova rompendo di proposito la cosa
che sorveglia — per esempio, togliendo l'asse `materia` dalla normalizzazione
dell'alert il contratto diventa rosso con
`alert.materia: "piatta" entra ed esce come "undefined"`, che è esattamente il
difetto vero, riprodotto.

## La salute e il ripristino

Due cose che prima erano finte.

**`/health` diceva `ok: true` e basta.** Diceva «il processo risponde», non «il
prodotto funziona»: se cadeva la chat di tutti gli streamer restava verde. Ora
ha tre stati — `sano`, `degradato`, `guasto` — e risponde 503 solo sul guasto,
perché un monitor che sveglia alle 3 per una chat che si riconnette da sola si
impara a ignorare. Resta muto sul *perché*: la porta è pubblica, e il motivo
nomina canali e conteggi. Il dettaglio sta in `/api/admin/salute`.

Il guasto vero (database non scrivibile — che si vede solo **scrivendo**, non
leggendo) fa uscire il processo, ma solo se **persiste** per tre controlli di
fila: `docker compose` lo riavvia, e un disco pieno per un attimo non butta giù
gli overlay di tutti. Stessa logica per un'eccezione non catturata: prima si
logava e si tirava dritto, cioè si restava *mezzi vivi* — chat connessa,
database magari a pezzi. Ora si esce puliti.

**Le copie di backup c'erano, il ripristino no.** Un backup che nessuno ha mai
riaperto è una speranza. Ora:

- ogni copia appena fatta viene **riaperta e controllata** (`integrity_check`,
  tabelle vitali, quanti streamer dentro): se non è ripristinabile si sa subito,
  non il giorno del disastro;
- `node scripts/ripristina.mjs` è la strada scritta — elenca le copie e le
  prova, controlla quella scelta *prima* di toccare niente, mette da parte il
  database attuale senza cancellarlo, riapre il risultato e se non torna rimette
  indietro quello di prima;
- il collaudo fa il **giro completo**: scrive, copia, distrugge il database,
  ripristina, e ritrova gli stessi streamer e gli stessi effetti.

## L'argine

Un limite di frequenza c'era su **un** endpoint (l'API esterna). Login, OAuth,
passkey, caricamenti, ogni `/api/streamer/*`: niente. Su un prodotto
multi-inquilino a pagamento è insieme una porta all'abuso e una voce di costo —
ogni file caricato passa da compressione, cioè processore e disco.

Ora è **uno solo**, montato prima di ogni rotta: una rotta nuova nasce già
protetta invece di doversi ricordare di proteggerla. Quattro classi per costo
reale — autenticazione (la più stretta), caricamento, scrittura, lettura — e
l'identità è la **sessione** quando c'è: dietro una rete mobile mezza città
condivide un indirizzo, e punire l'indirizzo punirebbe loro.

Non si limita mai ciò che non va mai fermato: `/health` (lo interroga il
controllo di salute di Docker), `/stripe/webhook` (scartarne uno significa
perdere un pagamento, ed è già protetto dalla firma), gli SSE (un overlay resta
collegato per ore: è *una* richiesta, non un flusso) e i file statici.

I numeri sono larghi di proposito: devono fermare l'abuso, non l'uso. Il
collaudo lo verifica con un caso vero — trecento letture e centoventi
salvataggi in un minuto, cioè uno streamer che lavora di gusto nello studio, non
devono mai incontrare l'argine.

Tre difetti trovati mettendolo alla prova, tutti veri:

- cancellare o pubblicare un effetto finiva nella classe dei **caricamenti**:
  chi ne ripuliva trenta sbatteva contro il muro. Ora «caricamento» è chi porta
  davvero su un file (lo dice il tipo `multipart`), non chi tocca un percorso
  che *somiglia* a un caricamento;
- le esche contavano chi bussa prendendo a mano il primo valore di
  `X-Forwarded-For` — che lo scrive il client. Chiunque poteva intestare i
  propri colpi a un indirizzo inventato, o a quello di un altro. Ora si usa
  `req.ip`, che Express calcola contando gli hop di proxy fidati.
- e il peggiore, trovato ripercorrendo le rotte a limite già scritto: il
  rilevatore della webcam manda gli effetti a **~12 al secondo**, cioè 720 al
  minuto, contro un limite di 180. L'argine avrebbe **spento gli effetti da
  gesti a tutti gli streamer** — un argine che rompe il prodotto è un difetto,
  non una difesa. Quelle rotte (già protette dalla chiave dell'overlay) hanno
  ora una classe «tempo reale» con un tetto largo sopra il ritmo reale, che
  resta comunque un tetto: una pagina impazzita non fonde il server.

## L'osservatorio

Il registro era `console.log` con un timestamp: buono per leggere una riga,
inutile per rispondere alla domanda che conta su un prodotto in abbonamento —
**cosa sta fallendo, da quando, e quanto spesso?** Senza quella risposta un
difetto non diventa una segnalazione: diventa uno streamer che smette di pagare
senza dire niente.

Il gancio sta **dentro il logger**, quindi nessun modulo deve ricordarsi di
annotare: tutte e quarantanove le aree del bot hanno già la loro etichetta, e
ogni `log.error` finisce nel registro con quella. Il pannello dell'operatore
mostra le aree che stanno sbagliando *nell'ultima ora* (non quelle che
sbagliavano ieri e oggi tacciono), con quante volte e l'ultimo messaggio per
intero.

Quello che l'osservatorio **non** fa è indovinare di quale streamer si tratti.
Un messaggio d'errore spesso contiene un canale, ma dedurlo con
un'espressione regolare vuol dire attribuire a volte il guasto alla persona
sbagliata — peggio che non attribuirlo. Il canale si sa dove il codice lo sa: le
chat da ricollegare, che il bot già traccia per nome.

Nello stesso pannello ora si vedono anche gli **overlay collegati** (una domanda
che prima non aveva risposta: un alert è partito verso nessuno?) e se l'ultima
copia di backup **si riapre**.

## I modificatori di classe

Un modificatore scritto a mano che nel CSS non esiste non dà nessun errore: il
pezzo si disegna, solo grigio. È come si era persa la differenza fra un badge
«degradato» e uno «sano» — scritto `ambra`, mentre la regola si chiama `giallo`.

Il cancello ora li conta. La prima versione però vedeva solo le classi scritte
per intero nell'attributo, non quelle che arrivano da una mappa: **non
avrebbe preso proprio il difetto che l'aveva ispirato**. Quindi i colori dei
badge hanno un vocabolario solo (`const BADGE`), e il cancello controlla quello.
Messo alla prova rimettendo `ambra`: rosso, uscita 1.

## Tre reti, tre momenti diversi

Non sono ridondanti: rispondono a tre domande diverse, e la più importante è la
seconda.

| dove | quando | a cosa serve |
|---|---|---|
| gancio **pre-push** (`.githooks/`) | prima che il codice esca dalla tua macchina | non spedire roba rotta |
| **`server/aggiorna.sh`** | prima che il codice diventi live | non far diventare live roba rotta |
| GitHub Actions | dopo, su una macchina pulita | un secondo parere, su due versioni di Node |

Il secondo è quello che conta davvero, ed era **l'unico che non c'era**: prima
l'aggiornamento del server era `git pull` più `docker compose up -d --build`,
senza che niente provasse niente. Un commit rotto diventava il sito.

### `server/aggiorna.sh`

L'ordine conta: si prova **prima** di toccare quello che gira, così un
aggiornamento che fallisce lascia le cose come stavano invece che a metà.

1. rifiuta di partire con la copia di lavoro sporca;
2. dice cosa sta per arrivare, e **si ferma** se la cronologia diverge (dopo una
   riscrittura, invece di fondere alla cieca);
3. copia di sicurezza del database dal container, con la strada già provata
   (quella che la riapre per controllarla);
4. `npm ci` + `npm test` + cancelli — **se è rosso il container non viene
   sfiorato** e il sito resta su con la versione di prima;
5. aspetta che nessuno sia in diretta (vedi sotto), costruisce l'immagine
   nuova col bot vecchio acceso, poi cambia il container e interroga `/health`
   finché non torna sano; se non torna, torna da solo alla versione di prima.

`--prova` fa tutto tranne toccare il container. `--salta-prove` e `--subito`
esistono per le emergenze vere.

Il `npm ci` non è un dettaglio: è ciò che dà a questo cancello la proprietà che
il gancio locale non ha — un'installazione **pulita, dal lockfile**, come su una
macchina che non ha mai visto il progetto.

### Aggiornare senza che il bot che gira se ne accorga

Due cose dell'aggiornamento toccavano il bot vivo, e nessuna delle due si
vedeva dallo script: si vedeva in chat.

- **Il collaudo ruba la macchina.** Prove, cancelli e Chromium sono mezz'ora
  di CPU sulla stessa macchina che tiene il bot in chat e gli overlay in onda.
  Adesso tutto il collaudo parte con `nice -n 19` (e `ionice -c 3` dove
  c'è): quando il bot e il collaudo vogliono la CPU insieme, il bot passa
  avanti, e il collaudo ci mette solo di più. Non si cambia il collaudo: si
  cambia chi aspetta.
- **Il cambio del container** sono pochi secondi con chat, avvisi e overlay
  giù, e quello che succede lì (un comando, un follow) si perde. Di base il
  cambio aspetta che **nessuno sia in diretta**. Lo dice il bot stesso: scrive
  chi è in onda in `data/.in-onda` a ogni cambio e all'avvio (`_scriviInOnda`
  in `src/bot.js`), su Twitch e su Kick. Lo script controlla ogni minuto, al
  massimo `ATTESA_MAX_MIN` minuti (di base 360). Se l'attesa scade rimette il
  repository com'era ed esce con 3. `--subito` non aspetta, ed è per le
  emergenze. Senza il file (il bot è fermo, o è una versione che ancora non lo
  scrive) non si sa chi è in onda, e non si aspetta.
- **Il collaudo verde si ricorda** (`data/.collaudato`, il commit di qui e
  quello del cervello): un aggiornamento rimandato non rifà mezz'ora di prove
  al giro dopo.
- **L'immagine nuova si costruisce prima**, col bot vecchio acceso; il fermo è
  solo il cambio, e alla fine lo script dice quanti secondi è durato.

Le prove sono in `test/contratto/aggiorna-senza-fermare.test.mjs`. Lì la
funzione che legge il file si fa girare così com'è scritta nello script, non
una sua copia.

### Cosa ha trovato alla prima esecuzione

Un difetto vero: `package-lock.json` non era in pari con `package.json`.
`node-llama-cpp` era stato messo fra le dipendenze opzionali e mai installato,
quindi mai entrato nel lock — e da lì **`npm ci` falliva su ogni macchina
pulita**: il server, il collaudo, tutto. Invisibile a chi sviluppa (chi ha già
`node_modules` non lancia mai `npm ci`), fatale a chi installa. Il pacchetto non
era usato da nessuna riga — l'LLM vive nel cervello Python — ed è stato tolto.

Il cancello che chiude la classe è `scripts/verifica-dipendenze.mjs`: confronta
i due file in un millisecondo, quindi può stare anche nel gancio pre-push, dove
`npm ci` (che ci mette secondi e scarica) non starebbe mai.

## Nessuna pagina è un vicolo cieco

Un moderatore che cambia canale e sceglie il **proprio** — quello dove il bot
non c'è — finiva sulla pagina «Richiedi SocialBot» e lì restava: nessun modo di
tornare dove stava, se non rifare il giro dall'esterno. Non è un caso limite: è
il percorso normale di chi ha sbagliato voce nel menù.

Il difetto non era di quella pagina sola. Le viste che **sostituiscono** il
cruscotto sono tre — richiesta, in attesa, disabilitato — e tutte e tre
capitavano anche a chi non le aveva cercate, e tutte e tre erano senza uscita.
Ora l'uscita è una sola funzione, `rigaUscita()`, che ognuna monta: se esiste un
altro canale porta lì, se non esiste non lascia una riga vuota ma una frase che
spiega dove si è finiti.

Il secondo difetto era più insidioso, perché il pulsante *si vedeva*: l'aggancio
del clic stava dentro una funzione che gira **prima** che `render()` scriva
`app.innerHTML`, quindi non trovava niente da agganciare. Un pulsante finto è
peggio di un pulsante assente. La difesa è strutturale: il clic si raccoglie su
`document`, delegato, così regge ogni ridisegno.

`scripts/verifica-uscite.mjs` tiene ferme le due cose. L'elenco delle viste non
è scritto nel cancello: **si ricava da `render()`**, quindi una quarta vista
senza cruscotto sarebbe coperta il giorno che nasce. Provato rosso su entrambi i
difetti veri — togliendo `rigaUscita()` da una vista, e riportando l'aggancio
del clic sull'elemento invece che su `document`.

## I collaudi che hanno bisogno del mondo vero

I collaudi che aprono un **browser** stanno nella catena di `npm run cancelli`:
dove Chromium non c'è, come sul server, si saltano da soli, e
`scripts/verifica-senza-browser.mjs` controlla che lo facciano. Fra questi
`scripts/verifica-barra.mjs` (le sovrapposizioni si vedono solo dopo un vero
calcolo di layout) e, entrato per ultimo col suo `--selftest`,
`scripts/verifica-studio.mjs`, il banco di regia. Fuori dalla catena era rosso
da giorni senza che nessuno lo vedesse: nella demo i contatori sparivano al
primo salvataggio (docs/DEMO.md).
Subito dopo, `scripts/verifica-scudo-tg.mjs`: la pagina della prova dello
scudo Telegram, con dietro gli stessi gesti del server su una richiesta in
memoria (docs/TELEGRAM.md). La sua autoprova rimette quattro difetti (la prova
ferma, i colori ignorati, la prova nuova che non arriva, il codice in una
risposta) e li vuole vedere tutti.

Due restano fuori dalla catena. Il primo, e non per dimenticanza, ha bisogno di
qualcosa che non controlliamo:

| | cosa chiede | perché |
|---|---|---|
| `scripts/verifica-7tv.mjs` | la rete | 7TV può spostare le sue porte senza dirlo, ed è successo |

`node scripts/verifica-sw.mjs` — il **service worker** in un browser vero: alza
un server con i file veri, aspetta che il worker sia attivo, cambia un'icona sul
server e guarda se il browser vede quella nuova. È la domanda che conta il
giorno che cambia il logo, e col worker "prima la cache" la risposta era no.

Si lanciano a mano, e prima di un rilascio che tocca l'una o l'altra cosa.

## La rete non deve dipendere da GitHub

Le prove girano anche **prima di ogni push**, sulla macchina di chi pubblica:

```
npm run ganci        # una volta sola, installa il gancio
```

Da lì `git push` esegue prima `npm test` e i cancelli, e **si rifiuta di
spingere** se qualcosa è rosso (`git push --no-verify` lo salta, per le
emergenze vere). Il gancio vive in `.githooks/`, dentro il repository: chiunque
lavori sul progetto se lo installa con un comando.

Perché così e non solo su GitHub: la CI è un servizio, e un servizio può essere
spento, in coda, o bloccato da una politica dell'account — è successo subito,
alla prima esecuzione. Il valore non è «GitHub esegue le prove»: è «le prove
girano prima che il codice esca». Il gancio dà quella garanzia senza dipendere
da nessuno; Actions resta la conferma, non l'unica rete.

## Il collaudo non deve sapere su che macchina gira

Due deploy fermati dallo stesso difetto, e vale la pena scriverlo.

La prova della posta metteva `MAIL_DOMINIO` e `MAIL_DA` e dava per scontato che
tutto il resto della famiglia `MAIL` non ci fosse. In sviluppo è vero: non c'è un
`.env`. Sul server c'è, e dentro ci sono `MAIL_HELO`, `MAIL_NOME`, il mittente
vero. Risultato: una configurazione **giusta** faceva dire «rotto» al collaudo, e
`aggiorna.sh` si fermava — facendo esattamente il suo mestiere, per la ragione
sbagliata.

**Cancellare la variabile non basta**, ed è la trappola. Il lettore del `.env`
(`loadDotEnv` in `src/config.js`) gira quando si importa la configurazione, cioè
al primo `import` di qualunque cosa la usi, e riempie le chiavi **assenti**:

```js
if (!(key in process.env)) process.env[key] = val;
```

Una chiave cancellata prima dell'import torna indietro, col valore del server.
Una cancellata dopo dipende dall'ordine degli import, che è una cosa che nessuno
vuole dover tenere a mente.

**La regola**: una prova *dichiara* le variabili che la riguardano, vuote quando
devono valere come «non impostata».

```js
for (const k of ['MAIL', 'MAIL_NOME', 'MAIL_HELO', 'MAIL_DKIM_SELETTORE']) process.env[k] = '';
process.env.MAIL_DOMINIO = 'prova.example';
```

Una chiave che esiste, anche vuota, il lettore non la tocca. Così la prova dice
lei come sta il mondo e l'ordine degli import non conta più.

Per rifare il caso del server prima di spingere: si mette un `.env` di prova
nella radice con dentro le variabili che ha lui, si gira `npm test`, e lo si
toglie. È l'unico modo di vedere il difetto, perché in sviluppo quel file non
c'è.

## La console del collaudo dice gli esiti

Le prove provocano apposta rifiuti, errori e avvisi: è il loro mestiere. Finché
il registro del bot si stampava, `npm test` riempiva la console
dell'aggiornamento di centinaia di righe `WARN` e `ERROR` (735 e 14 in un giro
contato), e in mezzo c'era nascosta quella che contava davvero: lavoro rimasto
acceso dopo la fine di una prova.

Per costruzione, adesso:

- **Sotto il corridore delle prove il registro non si stampa** (`src/logger.js`,
  riconosce `NODE_TEST_CONTEXT` come `config.js`). Le ultime righe restano in
  memoria (`righeDelCollaudo()`) per la prova che vuole leggerle, e
  l'osservatorio riceve comunque ogni errore. Da verde si tace; **un file rosso
  stampa le sue ultime trenta righe**, che sono il contesto per capire perché.
  `LOG_COLLAUDO=1 npm test` le fa vedere sempre.
- **Una riga scritta dopo che la prova ha tolto la sua cartella fa rosso il
  file.** `cartellaUsaEGetta().pulisci()` lo dice al registro; una cartella
  nuova riapre i lavori. Una riga dopo la pulizia è un orologio, una coda o un
  salvataggio che sopravvive alla prova e scrive dove non c'è più niente: il
  difetto che la console nascondeva, ora non può tornare in silenzio.
- **Tutto il prodotto scrive dal registro.** `db.js` stampava i suoi messaggi
  di migrazione con `console.log`, fuori dal registro: ora passano da
  `makeLog('db')`, con ora e livello come gli altri, e sotto il collaudo
  tacciono come gli altri.
- **Gli avvisi sperimentali di Node non si ripetono.** Le prove usano
  `mock.timers`, che in Node 22 è sperimentale, e ogni file lo ricordava con due
  righe: `npm test` gira con `--disable-warning=ExperimentalWarning`, che vale
  anche per i processi delle prove. Il prodotto non lo ha: se un modulo usasse
  qualcosa di sperimentale, sul server si vedrebbe.
- **Chi accende lo scudo lo spegne, come il bot.** Le prove che creano un
  `AntiBot` chiudono con `await spegniScudo()` prima di `pulisci()`: ferma le
  file e scrive registro, incidenti e rete. È lo stesso spegnimento di
  `bot.stop()`, quindi ogni collaudo lo prova. Chi se ne dimentica lo scopre
  dalla guardia.

Il caso che l'ha fatto nascere: la fila dell'esecutore del simulatore restava
accesa più di un minuto dopo la prova (`docs/SIMULATORE.md`). Accesa la
guardia, ha trovato da sola altri tre file con lo stesso difetto (gruppi,
reputazione, scudo), e, guardando chi accende scudi, un secondo scudo nel
server (`docs/PIATTAFORMA.md`). Rimettendo il difetto apposta la guardia lo dice
così, e il file è rosso:

```
Riga scritta dopo che la prova ha tolto la sua cartella (/tmp/simulatore-…): c'e' lavoro rimasto acceso.
```

## Le novità di ogni commit, anche dopo

`scripts/verifica-novita.mjs` vuole che ogni commit che tocca `src/` dica cosa
cambia per chi usa il bot: una riga in `NOVITA.md` nello stesso commit, oppure
«Novità: nessuna (perché)» nel messaggio.

Due cose che prima lo facevano passare a vuoto, o lo rendevano difficile:

- **Un ramo senza ramo a monte** non confrontava niente. È il caso dei rami di
  lavoro: i commit muti si scoprivano solo dopo l'unione nel ramo principale.
  Adesso, senza ramo a monte, il confronto è con `origin/main`.
- **Un commit già fatto** che si è dimenticato la dichiarazione si poteva
  sistemare solo riscrivendone il messaggio, cioè riscrivendo la cronologia.
  Adesso la dichiarazione può stare in una nota attaccata al commit:

  ```
  git notes add -m "Novità: nessuna (perché)" <sha>
  ```

  La nota non cambia il commit. Serve dove il cancello controlla, cioè nella
  cartella da cui si spinge: quella la prende insieme al ramo
  (`git fetch <repo> main refs/notes/commits:refs/notes/commits`). Su GitHub
  le note non vanno: da qui il riferimento `refs/notes/commits` non si può
  spingere (il primo tentativo è stato rifiutato con un 403), e non serve,
  perché un commit già su GitHub il cancello non lo guarda più. Si spinge solo
  il ramo, come sempre.

## Le scelte stanno con le loro parole

`scripts/verifica-scelte.mjs` apre ogni scheda del pannello con tutte le
sezioni aperte, al telefono (390) e al computer (1280), e misura ogni casella e
ogni pallino che ha un'etichetta:

- sta sulla stessa riga delle sue parole, a non più di 24 pixel;
- fra le parole delle scelte su quella riga, le più vicine sono le sue;
- non sta sopra le sue parole;
- se la frase va a capo, riparte sotto il suo inizio, non in colonna.

Nasce da uno screenshot: sul telefono le quattro scelte della moneta andavano a
capo dove capitava. La causa non era quel gruppo. `.riga-check` aveva due
regole, una che la faceva riga e una dell'Overlay Studio che la faceva pezzo
in linea, e vinceva la seconda dappertutto. La prima misura ha trovato 27
scelte fuori posto in 444.

Adesso la regola è una sola: la casella (o il pallino) è appesa a sinistra,
allineata alla prima riga, e le parole scorrono come un paragrafo con il loro
rientro. Il rientro si applica solo a una riga che comincia davvero con una
casella. Un riquadro che ha un suo margine interno dichiara `--rc-lato` e
`--rc-cima` invece di riscrivere il margine, così la casella resta dentro.
Una riga che contiene un campo (un numero, un menù) si allinea al centro del
campo. Più scelte affiancate le mette in fila il contenitore
(`.riga-flessibile`), non la riga.
