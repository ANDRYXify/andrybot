# Riservatezza del codice servito

## La regola

**Nei file che il browser scarica non ci sono commenti.** Le uniche due righe
ammesse sono la filigrana di proprietà intellettuale.

Vale per tutto ciò che si può leggere con F12 o scaricando i file del sito:
`src/web/public/**` — `.js`, `.css`, `.html`. Il codice del server può avere
tutti i commenti che servono: non esce di lì.

## Perché

Un commento scritto da un'IA si riconosce: il registro, la lunghezza, il modo di
spiegare la causa prima della soluzione. Chi legge il sorgente e capisce **quale**
assistente ha lavorato al progetto sa anche come è stato ragionato, dove si
guarda e dove no, e può usare lo stesso assistente per cercare la breccia. È
informazione regalata a chi attacca, in cambio di zero.

Lo stesso vale per i commenti che raccontano *cosa era rotto prima*: sono una
mappa dei punti deboli storici, e i punti deboli storici sono i primi che si
riprovano.

## Dove va la spiegazione

In `docs/`. Un file per argomento, scritto per essere letto — che è comunque
meglio di un commento incastrato fra due righe di codice, perché lì ci sta il
ragionamento intero e non solo la scheggia che entrava nel margine.

Se togliendo un commento si perde qualcosa, quel qualcosa va scritto in `docs/`
**prima** di togliere il commento, non dopo.

## Il cancello

```
node scripts/spoglia-commenti.mjs --verifica   # elenca, esce 1 se trova qualcosa
node scripts/spoglia-commenti.mjs              # toglie
```

Segnala anche i file serviti **senza filigrana**.

Il modo in cui lavora è quello che lo rende sicuro da lanciare: marca ogni
carattere del file come commento o non-commento con un lexer vero — stringhe,
template letterali, letterali regex, commenti — e poi cancella **solo le righe
che sono commento per intero**. Se il lexer sbagliasse, la riga resterebbe
com'è: non può tagliare codice a metà.

Da lanciare prima di ogni deploy, insieme agli altri collaudi.

## Le tracce private non stanno su git

Il repository è **pubblico**. Quattro documenti che dicevano di sé stessi
«Privato. Solo per noi — non da pubblicare» ci sono stati dentro per settimane:
`ROTTA.md`, `CERVELLO.md`, `RAGIONE.md`, `anatomia.html`. Non c'era niente che
lo impedisse, e ricordarselo a mano non è un metodo.

Adesso sono **fuori dal tracciamento** (restano sul disco di chi ci lavora, in
`.gitignore`) e c'è la regola, per costruzione:

> Un file che **dichiara** di essere privato non può essere tracciato da git.

La dichiarazione sta nel documento stesso, quindi non c'è un secondo elenco da
tenere allineato: chi scrive una traccia privata la marca come sempre, e
`scripts/verifica-riservati.mjs` fa il resto. Gira dentro `npm run cancelli`,
quindi anche nel gancio pre-push: una traccia privata non può nemmeno essere
spinta per sbaglio. Messo alla prova rimettendo `ROTTA.md` con `git add -f`:
uscita 1.

### La cronologia è stata riscritta

Toglierli da adesso in poi era necessario ma non sufficiente: erano nella
cronologia dal 21 luglio, quindi recuperabili da qualunque commit vecchio. Con
`git filter-repo` sono stati tolti da **tutti** i commit e il ramo è stato
riscritto (`--force-with-lease`).

Cosa è stato verificato prima di spingere:

- il clone locale era **superficiale** (113 commit su 612): riscriverlo così
  avrebbe distrutto 499 commit. Prima `git fetch --unshallow`;
- copia di sicurezza dell'intero repository in un bundle;
- dopo la riscrittura: i quattro file non compaiono in **nessun** albero di
  **nessun** commit; l'albero finale è identico a prima file per file, con gli
  stessi identici hash di contenuto; 4 commit sono spariti perché toccavano
  *soltanto* quei documenti;
- prove e cancelli verdi; e un clone fresco dal remoto non li contiene più.

**Quello che nemmeno la riscrittura può fare.** GitHub tiene gli oggetti non più
referenziati raggiungibili per SHA finché non li raccoglie: chi conosce l'hash di
un commit vecchio può ancora arrivarci. Per chiuderla del tutto va chiesto al
supporto di GitHub di eseguire la garbage collection sul repository. E chi ha
clonato nell'ultimo mese ha comunque la sua copia: la riscrittura riduce la
superficie, non riscrive il passato di chi c'era.

---

# Le porte: chi può bussare, e a cosa

## La domanda giusta

«Con F12 vedo un sacco di chiamate» non è un problema di sicurezza: quelle sono
le chiamate che fa **il tuo** browser, con la **tua** sessione, e nessun sito al
mondo può nasconderle a chi le sta facendo. Nascondere i nomi non
proteggerebbe nulla — sarebbe solo un lucchetto disegnato.

La domanda che conta è un'altra: **se bussa qualcun altro, gli si apre?**

## Come è messa oggi, misurata

`node scripts/verifica-porte.mjs` legge tutte le rotte del server e chi le
guarda:

| guardiano | rotte |
|---|---|
| `requireOwner` (solo il proprietario del canale) | 55 |
| `requireLogin` (sessione) | 132 |
| `requireAdmin` | 44 |
| `chiaveOk` (chiave dell'overlay: il link è il segreto) | 14 |
| `currentUser` (legge la sessione: senza, non c'è niente da leggere) | 5 |
| `verificaWebhook` (firma di Stripe) | 1 |
| `chiaveUguale` (chiave dell'estensione, confronto a tempo costante) | 1 |
| **pubbliche dichiarate** | **31** |

Le 31 pubbliche sono elencate **una per una nel cancello, col motivo**: pagine
che chiunque deve poter leggere (guide, manuale, privacy, novità, listino), le
pagine link degli streamer, i ritorni dei login esterni, e i due passaggi della
passkey — che il login non può chiedere di essere già loggati.

## La parte che vale: una porta nuova nasce rossa

Il cancello non fotografa lo stato, lo **impone**:

1. ogni rotta deve avere un guardiano, **oppure** stare nell'elenco delle
   pubbliche con scritto perché;
2. l'elenco non può marcire: una voce che non corrisponde più a nessuna rotta è
   rossa uguale;
3. tutto ciò che sta sotto `/api/admin` vuole `requireAdmin`, non basta essere
   entrati.

Quindi non serve *ricordarsi* di proteggere una rotta nuova: se te ne dimentichi,
il cancello diventa rosso prima del push. `--selftest` lo dimostra aggiungendo
una rotta aperta finta.

# Il lucchetto è sulla porta? (l'edge)

Gli header di sicurezza — CSP, HSTS, anti-frame, Permissions-Policy — non li
mette l'applicazione: li mette **Caddy**, e il `Caddyfile` è un file *montato*
nel suo container. Non si aggiorna quando si aggiorna il bot.

Da lì un modo elegante di illudersi: irrobustisci la politica nel repo, la vedi
scritta, e intanto in rete gira ancora quella vecchia. **È successo davvero**:
`script-src` aveva perso `'unsafe-inline'` nel repo e ce l'aveva ancora in
produzione. La differenza non è cosmetica — con `'unsafe-inline'` uno `<script>`
iniettato **esegue**; senza, il browser lo rifiuta.

`node scripts/verifica-edge.mjs` chiede gli header al sito vero e li confronta
con il `Caddyfile`, pezzo per pezzo della CSP. Sta fuori da `npm run cancelli`
perché esce in rete.

Quando segnala una differenza, il Caddyfile va portato dentro l'edge — e qui c'è
una trappola che ha resistito a due tentativi, quindi vale la pena scriverla per
bene.

Il `Caddyfile` è montato come **singolo file**, e un bind-mount di file punta
all'**inode**, non al percorso. `git pull` non modifica il file sul posto: ne
scrive uno nuovo e lo rinomina sopra. Inode nuovo. Il container continua a vedere
**quello vecchio**, e continuerà a vederlo per sempre.

Da cui, tutti e tre i tentativi ovvi falliscono, e falliscono *in silenzio*:

| comando | cosa succede |
|---|---|
| `caddy reload --config /etc/caddy/Caddyfile` | **riesce**, stampa «adapted config to JSON»… e rilegge il file vecchio |
| `docker compose restart caddy` | stesso container, stesso mount, stesso inode |
| `docker compose up -d caddy` | «up-to-date»: la configurazione del *servizio* non è cambiata |

Il controllo che lo dimostra in una riga — se risponde `0`, è questo:

    docker compose exec caddy grep -c inline-speculation-rules /etc/caddy/Caddyfile

E la cura, l'unica cosa che rilegge il *percorso* invece dell'inode:

    docker compose up -d --force-recreate caddy

Poi si rigira `verifica-edge.mjs` finché non dice «edge allineato». Ed è proprio
per questa classe di illusioni che il collaudo esiste: chiede al **sito vero**,
non al file.
