# Entrare con YouTube

## Cosa fa, e cosa non fa

Con YouTube si **entra** e si **collega il canale**: da lì la persona ha la
dashboard, la pagina link, gli overlay, la community, i comandi — tutto ciò che
non passa dalla chat.

Il bot **non parla nella chat di YouTube**, e non è una dimenticanza. La chat in
diretta di YouTube si legge a interrogazioni ripetute (`liveChatMessages.list`),
ogni interrogazione costa quota, e la quota giornaliera di un progetto Google è
di 10.000 unità. Un solo canale acceso tutto il giorno, letto ogni cinque
secondi, ne consuma otto volte tanto. Con dieci canali non è una questione di
ottimizzare: non sta in piedi. Quindi la dashboard lo dice, invece di far
credere che il bot stia per rispondere.

Il giorno che si vorrà la chat servirà un progetto Google con quota alzata (si
chiede a Google con un modulo, motivandola), e allora si aggiungerà anche lo
scope per scrivere. Non prima: chiedere oggi il permesso di parlare per usarlo
forse domani è chiedere un potere che non si usa.

## Configurazione su Google Cloud

1. **Console Google Cloud → un progetto dedicato** (non quello di altre cose:
   la quota è per progetto).
2. **API e servizi → Libreria → YouTube Data API v3 → Attiva.**
3. **API e servizi → Credenziali → Crea credenziali → ID client OAuth**, tipo
   **Applicazione web**.
   - *Origini JavaScript autorizzate*: `https://socialbot.live`
   - *URI di reindirizzamento autorizzati*: `https://socialbot.live/auth/youtube/callback`
     — identico, carattere per carattere. Se non combacia, Google rifiuta prima
     ancora di mostrare la schermata di consenso: «non è conforme alle norme
     OAuth 2.0». Non è un errore del server, è un indirizzo non registrato.
4. Le due chiavi vanno nelle variabili d'ambiente:

       YOUTUBE_CLIENT_ID=...
       YOUTUBE_CLIENT_SECRET=...
       YOUTUBE_REDIRECT_URI=https://socialbot.live/auth/youtube/callback   (facoltativa: senza, si ricava da BASE_URL)

   Senza le prime due la porta non esiste e il pulsante non compare: meglio
   nessun pulsante di un pulsante che porta a un errore.

## La schermata di consenso, e il muro dei 100

Questo è il punto che ferma tutti, e conviene saperlo prima.

`youtube.readonly` è uno scope **sensibile** per Google. Finché la schermata di
consenso è in stato **Test**, possono entrare solo gli account elencati a mano
come utenti di prova, e sono **al massimo 100**. Chi non è nell'elenco vede un
errore e non entra.

Per aprirla a tutti bisogna **pubblicare** la schermata di consenso e passare la
**verifica di Google**: si compila un modulo, si spiega a cosa serve lo scope, si
mostra un video del giro, e serve un dominio verificato in Search Console con
informativa e termini raggiungibili (ci sono: `/privacy` e `/termini`). I tempi
sono di settimane, non di ore.

Finché la verifica non è passata, l'accesso con YouTube funziona per gli account
messi come utenti di prova. È il momento giusto per provarlo davvero, senza
prometterlo a nessuno.

### I due errori che si incontrano, in ordine

Arrivano uno dopo l'altro, e vogliono dire cose diverse.

1. **«non è conforme alle norme OAuth 2.0», con scritto `redirect_uri=...`** —
   quell'indirizzo non è registrato fra gli URI di reindirizzamento del client
   OAuth. Si aggiunge in Credenziali, identico. Non è il server: il server non è
   nemmeno stato interpellato.
2. **`Errore 403: access_denied`** — l'indirizzo ora va bene (siamo alla
   schermata dopo), ma l'app è in stato *Test* e quell'account non è fra gli
   utenti di prova. Si aggiunge in **Schermata di consenso OAuth → Pubblico →
   Utenti di prova**. Vale anche per l'account di chi ha creato il progetto: non
   è automaticamente autorizzato.

### Una cosa che scade da sola

Finché l'app è in *Test*, i refresh token rilasciati agli utenti di prova
**scadono dopo sette giorni**. Il collegamento smette di funzionare da solo, e
non è un difetto nostro: basta ricollegare. Con l'app pubblicata e verificata,
i token durano finché la persona non revoca il permesso.

### Perché non si evita chiedendo meno

Con `openid email profile` — scope non sensibili, nessuna verifica — si saprebbe
solo che è entrato un account Google. Ma su YouTube l'account Google e il
**canale** non sono la stessa cosa, e un account può averne più d'uno: senza
`youtube.readonly` non sapremmo *quale canale* stiamo attivando, e il canale è
esattamente ciò per cui la persona è venuta. Si chiede il minimo che serve —
non meno del necessario, che spezzerebbe il prodotto.

## Il nome del canale, da noi

Un canale YouTube da noi si chiama `yt.<maniglia>` (la `@maniglia`, senza la
chiocciola). Un login Twitch non può contenere il punto, quindi `yt.pippo` e il
`pippo` di Twitch non possono mai essere la stessa riga — per costruzione, non
per fortuna. Se la maniglia manca si ripiega sul titolo del canale, e in ultimo
sull'id, che c'è sempre.

Chi torna si riconosce dall'**id del canale**, non dal nome: la maniglia e il
titolo si cambiano, l'id no. Chi cambia maniglia ritrova il suo canale.

## Il rinnovo

Google dà il refresh token **una volta sola**, alla prima autorizzazione, e solo
a chi lo chiede con `access_type=offline`. Chi lo dimentica ha un collegamento
che funziona per un'ora e poi muore. Con `prompt=consent` lo si riottiene anche
da chi aveva già detto sì in passato.

E quando rinnova, la risposta di Google **non contiene** il refresh token: c'è
solo il nuovo access token. Chi salva la risposta così com'è cancella il refresh
che aveva. Il ricucire sta in un posto solo (`salvaToken`), dove il token vecchio
c'è ancora, così non può dipendere da chi si ricorda di farlo.

## Scollegare

Scollegando si toglie il permesso anche da casa di Google (`oauth2/revoke`), non
solo dal nostro database: altrimenti la persona si ritroverebbe nell'elenco delle
app autorizzate una voce che non usa più nessuno.
