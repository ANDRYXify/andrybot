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
| `cancelli/*` | I tre cancelli statici, che ora girano da soli. |

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
5. solo allora ricostruisce, e interroga `/health` finché non torna sano;
   altrimenti stampa il comando esatto per tornare indietro.

`--prova` fa tutto tranne toccare il container. `--salta-prove` esiste per le
emergenze vere.

Il `npm ci` non è un dettaglio: è ciò che dà a questo cancello la proprietà che
il gancio locale non ha — un'installazione **pulita, dal lockfile**, come su una
macchina che non ha mai visto il progetto.

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
