# YouTube

## Cosa fa

Con YouTube si **entra** e si **collega il canale**: dashboard, pagina link,
overlay, community, comandi. E adesso anche la **chat delle dirette**: il bot la
legge e ci risponde, con gli stessi comandi, moduli, monete e memoria di Twitch
e Kick — perché un messaggio di YouTube entra nello stesso tubo con la stessa
forma (`src/youtube/messaggio.js`), e tutto il resto non sa che YouTube esiste.

La chat si accende per canale, da **Stato → Le tue piattaforme**. Spenta di
default, per il motivo qui sotto.

## Il vincolo vero: la quota è UNA SOLA, ed è nostra

Questa è la cosa da capire prima di tutto il resto, ed è diversa da Kick e da
Twitch.

La quota giornaliera **non è dello streamer: è del progetto Google**, cioè di
SocialBot. Le chiamate le fa il nostro client OAuth e Google le addebita a noi,
quindi tutti i canali che accendono la chat spendono dalla **stessa borsa da
10.000 unità al giorno**
([fonte](https://developers.google.com/youtube/v3/determine_quota_cost)). Non
c'è modo di far pagare la quota a ciascuno: la chiave API che lo streamer mette
per l'avviso del video nuovo è un'altra strada, e non serve qui.

Quanto costa una chiamata di chat, Google **non lo pubblica**: le tabelle dei
costi non elencano i metodi della chat in diretta. Quindi si sceglie la stima
alta, **5 unità**, e lo si dichiara. Sbagliare in eccesso spreca margine;
sbagliare in difetto finisce la quota di tutti a metà pomeriggio e spegne anche
l'avviso del video nuovo, che passa dalla stessa borsa. I due errori non sono
equivalenti.

Da qui la **borsa** (`src/youtube/quota.js`): un tetto di 8.000 unità sulle
10.000, il resto lasciato al resto del bot. Ogni giro chiede il permesso di
spendere; quando la borsa è vuota si smette di bussare fino al rinnovo — che è a
mezzanotte del **Pacifico**, non a mezzanotte qui — e la dashboard lo dice
invece di lasciarlo scoprire dal silenzio. Il conto sta in `stato_vivo`, quindi
un deploy non regala quota.

Cosa vuol dire in pratica: con la stima alta la borsa vale circa **1.600
chiamate al giorno in tutto**. A cinque secondi di intervallo sono poco più di
due ore di chat, sommando tutti i canali accesi. **Va bene per una prova, non
per dieci streamer.** Per andare oltre serve chiedere a Google un aumento di
quota (si compila un modulo motivandolo): fino ad allora la chat è una cosa che
si accende per pochi, e il tetto fa sì che accenderla non possa far danno agli
altri.

Google stessa consiglia `liveChatMessages.streamList` al posto di `list`
proprio per consumare meno. È la strada dopo: qui si è usato `list` perché è
documentato per intero, si prova senza rete e rispetta `pollingIntervalMillis`,
che è YouTube a dire quanto è carica la chat in questo momento.

## Le due cose che su YouTube sono diverse

**La chat nasce e muore con la diretta.** Non è un posto fisso come su Twitch:
si arriva solo passando dal `liveChatId` della diretta attiva. Se non stai
trasmettendo non c'è nessun posto dove parlare — e non è un guasto.

**Non c'è un nome unico.** Twitch e Kick mandano un login. YouTube manda un nome
*visibile*, che due persone possono avere identico, e un id opaco (`UC…`).
L'economia del bot è fatta di nomi leggibili — le monete stanno in una riga
(canale, utente) e la classifica stampa quella parola — quindi col solo nome
visibile due spettatori diversi finirebbero nello stesso portafoglio, e con l'id
la classifica sarebbe un elenco di codici. La **maniglia** (@nome) è l'unica
cosa insieme unica e leggibile: non arriva nel messaggio, si chiede a parte
cinquanta per volta e si tiene. Quando manca si ripiega sul nome visibile
ripulito, e lo si accetta: è il massimo che YouTube lascia sapere.

## Il permesso di parlare

Serve lo scope `youtube.force-ssl`. Prima non lo chiedevamo, ed era giusto: la
chat non c'era, e chiedere il permesso di parlare per usarlo forse domani è
chiedere un potere che non si usa. Adesso la chat c'è, quindi si chiede.

Chi aveva collegato YouTube **prima** ha un token senza quel permesso: continua
a funzionare per tutto il resto, e la dashboard gli dice di ricollegare. Non è
un guasto da cercare — Google non aggiunge permessi a un token già dato, si
ripassa dalla porta. E questo non si indovina: gli scope del token sono salvati
insieme al token, quindi la dashboard lo *sa*.

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
