# I ruoli di Discord, dati da quello che sappiamo noi

Discord i **sub** di Twitch se li sincronizza da solo. Tutto il resto no: chi ti
segue, chi e' VIP, chi e' moderatore, quante ore ti ha guardato, quante monete
ha, da quante dirette di fila c'e'. Quei dati ce li abbiamo, e qui diventano
ruoli sul server dello streamer.

## Tre pezzi, e nessuno sa il mestiere dell'altro

| pezzo | cosa sa | cosa NON sa |
|---|---|---|
| `features/discord-ruoli.js` | la regola: dalle condizioni e da cosa sappiamo di una persona, i ruoli che le spettano — e la **differenza** con quelli che ha | cosa sia Discord |
| `features/discord-api.js` | come si chiede e come si scrive: leggere i ruoli, leggere un membro, dare, togliere | perche' |
| il giro | mette insieme i due, una persona alla volta | — |

La regola e' pura apposta: si prova senza rete, e la si legge senza sapere
niente di HTTP. Il filo e' muto apposta: non decide mai niente.

## Quattro cose che non devono poter succedere

Stanno scritte per esteso in cima a `discord-ruoli.js`, in breve qui:

1. **Non si tocca un ruolo che non e' nostro.** Si puo' togliere solo un ruolo
   che una regola nomina. Lavorare per sottrazione — «via tutto quello che non
   gli spetta» — vorrebbe dire spogliare il server la prima volta che si accende
   l'interruttore.
2. **Si scrive solo la differenza.** Se non cambia niente non si chiama nessuno:
   per i limiti di frequenza, e perche' il registro del server non deve
   riempirsi di righe che non dicono niente.
3. **Un ruolo piu' alto del bot** non glielo puo' dare nessuno: Discord rifiuta.
   Si riconosce **prima**, dalle posizioni, e si dice — invece di riprovarci a
   ogni giro senza capire mai perche'.
4. **Una regola senza ruolo non e' una regola.** Un ruolo cancellato dal server
   lascia una condizione che non puo' avverarsi: si scarta, e si dice.

## Il filo: cosa e' chiuso prima di chiamare

`discord-api.js` parla **solo** con `https://discord.com/api/v10`. L'indirizzo
non arriva mai da fuori: la base e' fissa e dentro il percorso ci vanno solo
cifre (`ID_RE`). Un id che non e' fatto di sole cifre non parte nemmeno — e'
l'unico modo per uscire dal percorso, e si chiude prima della chiamata.

Il token viaggia nell'intestazione, mai nell'indirizzo, e non finisce nel
registro nemmeno a pezzi: quando una chiamata va male si scrive cosa e'
successo, non con cosa ci si e' autenticati.

Su «troppe richieste» si aspetta il tempo che dice Discord, **una volta sola**.
Un modulo che riprova per conto suo, in silenzio, e' un modulo che non si riesce
piu' a fermare: oltre la soglia il filo lo dice e lascia decidere al giro.

E **«non e' nel server» non e' un errore**: e' una risposta. Un ruolo non si puo'
dare a chi non c'e', e va detto cosi', non come un guasto.

## La memoria

`discord_ruoli` (una riga per canale) tiene il token del bot **dello streamer**,
l'id del server e le regole. Il token e' un segreto: sta nella busta
(`docs/SEGRETI.md`) e non esce mai verso il browser. La tabella e' sua e non
`settings` proprio per questo — `settings` non e' cifrato.

`discord_link` tiene chi ha detto «questo account Discord sono io», **per
canale**. Il consenso non e' un'iscrizione all'anagrafe: collegarsi al server di
uno streamer non vuol dire farsi riconoscere da tutti gli altri. Chi si scollega
sparisce da li', e da quel momento il giro non lo tocca piu' — ne' per dare ne'
per togliere: i ruoli che ha restano suoi. Se lo streamer spegne tutto, i
collegamenti vanno via con la configurazione: non si tengono consensi per un
servizio che non c'e' piu'.

## Quello che manca, e la strada scelta

Questo pezzo e' in costruzione. Cosa resta, in ordine:

- **Il giro.** Legge le regole, chiede a Discord i ruoli e l'altezza del bot,
  poi per ogni persona collegata mette insieme cosa sappiamo (monete e ore dal
  database, serie e dirette dalle presenze, follower/sub/VIP/mod da Twitch) e
  scrive la differenza. Le quattro cose di Twitch arrivano da una funzione sola,
  che sta nello strato di Twitch: il giro non deve sapere come si chiede.
- **Il collegamento dello spettatore.** Due meta': chi sei su Twitch e chi sei
  su Discord. La seconda vuole un'applicazione Discord con OAuth `identify`, ed
  e' **della piattaforma** (`DISCORD_CLIENT_ID` e `DISCORD_CLIENT_SECRET`, vedi
  sotto), mentre il bot che scrive i ruoli resta **dello streamer**. Dove
  l'applicazione non e' configurata, il pannello lo dice invece di offrire un
  tasto che non funziona.
- **Il pannello** (le regole, la prova del collegamento, cosa ha fatto l'ultimo
  giro e cosa non ha potuto fare) e la **vetrina**.

## Le due applicazioni, e perche' sono due

Sono due cose diverse e vanno tenute diverse:

| | chi la crea | a cosa serve | cosa puo' fare |
|---|---|---|---|
| **l'applicazione che riconosce** | la piattaforma, una sola | lo spettatore dice «questo account Discord sono io» | leggere il suo id e il suo nome (`identify`). Nient'altro |
| **il bot che muove i ruoli** | ogni streamer, per il suo server | dare e togliere ruoli | quello che gli permette il suo posto nella scala dei ruoli |

Chi riconosce non entra in nessun server. Chi scrive non sa chi sei su Twitch.
Sono due poteri diversi in due mani diverse, ed e' questo che rende innocuo il
fatto che l'applicazione del riconoscimento sia una sola per tutti.

### L'applicazione della piattaforma (una volta sola, nel `.env`)

1. https://discord.com/developers/applications → **New Application**, un nome e
   accetta i termini.
2. **OAuth2** nel menu a sinistra. Copia **Client ID** (e' anche l'Application
   ID, solo cifre) e premi **Reset Secret** per avere il **Client Secret**: si
   vede una volta sola, se lo perdi se ne rigenera un altro.
3. Sempre in OAuth2, **Redirects** → **Add Redirect** e incolla
   `https://socialbot.live/discord/oidc/callback` — identico, senza barra in
   fondo. Salva.
4. Nel `.env` del server: `DISCORD_CLIENT_ID=` e `DISCORD_CLIENT_SECRET=`, poi
   riavvia. Niente bot, niente permessi, niente invito: quell'applicazione non
   entra da nessuna parte.

Facoltativo ma gentile: in **General Information** metti icona e descrizione —
sono quelle che lo spettatore vede nella schermata di Discord che gli chiede il
permesso.

### Il bot dello streamer (una volta per server)

Questo lo fa lo streamer, e il pannello glielo spieghera' li' dentro:

1. Stessa pagina, **New Application** (la sua), poi **Bot** → **Reset Token** e
   copia il token: e' un segreto, va solo nel pannello di SocialBot.
2. **Installation** (o OAuth2 → URL Generator): scope `bot`, permesso **Manage
   Roles**. Apri il link e scegli il suo server.
3. In **Impostazioni server → Ruoli**, trascina il ruolo del bot **sopra** tutti
   i ruoli che deve poter dare. Discord non guarda il nome del permesso, guarda
   la posizione: sotto un ruolo, non lo tocca.
4. Id del server: clic destro sul server → **Copia ID server** (serve la
   Modalita' sviluppatore in Impostazioni → Avanzate).
