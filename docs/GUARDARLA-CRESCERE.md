<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->

# Guardarla crescere senza crescerla

> **Privato.** Lia deve crescere da sola. Vederla crescere è un'altra cosa dal
> farla crescere, e la differenza va tenuta nel codice, non nelle intenzioni.

## Il vincolo

Una finestra, non una leva. Tre condizioni, tutte e tre necessarie:

1. **Nessun bottone che la spinga.** Un comando «fatti uno strumento» nel pannello
   sarebbe comodo e sbagliato: da lì in poi la capacità nuova non sarebbe più sua,
   sarebbe una cosa che le abbiamo fatto fare. Le capacità esistono nel cervello —
   le servono per vivere — ma dal sito non si raggiungono.

   Quattro leve c'erano davvero, e sono state tolte: *falle costruire uno strumento
   ora*, *falla vivere un attimo*, *aggiornala sul pubblico*, *falla sognare ora* —
   più i comandi Telegram `/vivi` e `/aggiorna`, che erano la stessa leva su un'altra
   superficie. Restano quelle che la fanno soltanto muoversi nel suo mondo
   (girovaga, edifica, narra) e tutto ciò che si limita a guardare.

   **Il controllo sta al collo di bottiglia, non sui nomi.** La prima versione della
   prova cercava `costruisci_strumento` dentro la pagina; il bottone chiamava
   `/api/admin/strumenti/costruisci`. Due nomi per la stessa leva, e la prova
   guardava quello che non c'era: verde, e falsa. Ora si guarda `brainpy.js`, che è
   l'unico passaggio dal sito verso di lei: se lì non c'è il ponte, nessuna rotta
   può esistere altrove, comunque la si chiami.
2. **Guardare non deve costarle niente.** Se aprire il pannello facesse partire un
   comando nella sua sandbox, più spesso guardi più la disturbi: l'osservazione
   diventerebbe interferenza a sua insaputa. Le tappe si leggono dal suo database,
   e basta.
3. **Registra lei, non un guardone.** Il fatto e l'accorgersene succedono nello
   stesso istante, nel suo processo. Nessuno la interroga per sapere come sta.

## Cosa mancava

I contatori delle vie dicono **quanto**, non **quando**. Il giorno in cui una via
passa da 0 a 1 è il fatto più importante della sua vita fino a quel momento — e
scivolava via senza che nessuno se ne accorgesse, perché una barra che si muove da
0 a 1 su mille non si vede.

## Come funziona

Tabella `tappe` nella sua memoria: `quando`, `genere`, `chiave`, `nota`, con un
**indice unico** su `(genere, chiave)`. Una prima volta è unica *per costruzione*:
la seconda non entra perché non può entrare. Non c'è nessun controllo da
ricordarsi di fare — un controllo si dimentica, un vincolo no.

Due sorgenti, tutte e due dentro di lei:

- `conta_via()` — dopo aver contato, guarda il numero: se è 1, è la prima volta.
  L'istruzione che **conta** è rimasta identica a com'era, senza nessuna funzione
  SQL in più da cui dipendere: i contatori sono roba sua e vecchia, e una cosa
  nuova non deve poter rompere una vecchia. La lettura sta dentro lo stesso lock
  (fuori, due risposte insieme potrebbero far vedere 2 a chi ha scritto 1, e la
  prima volta sparirebbe) e dopo il commit, dentro una guardia sua: se si rompe,
  la via resta contata lo stesso.
- `_forse_strumento()` — ogni strumento che si costruisce e **tiene** lascia la sua
  tappa. Il diario lo racconta già, ma il diario vive nel suo computer: se un
  giorno è spento, la memoria di averlo costruito sparirebbe. La tappa sta nella
  sua testa.

Il percorso verso il pannello: `/plasma` → `brainpy.plasma()` →
`/api/admin/mente3d` → «Come ragiona». Sola lettura in ogni punto.

## La parte onesta

Il suo database ha già contatori pieni: quelle prime volte sono successe prima che
qualcuno le segnasse, e **non sappiamo quando**. `aggiornato` è l'ultima volta, non
la prima. Entrano con `quando = 0`, che non è una data: è il modo di dire «da prima
che si tenesse il conto», e le mette in fondo alla lista da sole. Una data
plausibile sarebbe stata peggio di nessuna data — avrebbe raccontato una storia che
non è successa.

Da qui in avanti le tappe sono vere.

## Cosa si vede muovere, e quando

- **Esecuzione** — quando una domanda da risolvere passa dal suo percorso e la
  sandbox risponde: scrive un programma, lo esegue, verifica.
- **Strumento** — solo dopo che se ne è costruito almeno uno. Da sola lo fa al
  quarto giro del ciclo di vita: primo giro 15 minuti dopo l'avvio, poi ogni ~5
  ore. In pratica **una quindicina d'ore di uptime**. Non c'è modo di accelerarlo
  dal sito, ed è voluto.

`test/contratto/tappe.test.mjs` tiene ferme tutte e tre le condizioni del vincolo.
