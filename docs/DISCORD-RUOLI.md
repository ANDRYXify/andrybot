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

- **Il pannello** (le regole, la prova del collegamento, cosa ha fatto l'ultimo
  giro e cosa non ha potuto fare) e la **vetrina**.

## Il collegamento, e il verso in cui va il codice

Servono due meta': chi sei su Discord e chi sei su Twitch. La prima la dice
Discord, con la sua schermata del permesso. La seconda e' il problema, perche'
uno spettatore su SocialBot non ha un account.

La strada ovvia — il bot scrive in chat un link personale e tu lo apri — e'
**sbagliata**, e si rompe in un modo che non si vede: la chat e' pubblica. Chi
sta guardando vede il tuo link, lo apre prima di te, autorizza il SUO Discord, e
da quel momento e' lui a prendersi i tuoi ruoli. Nessuno se ne accorge, e il
derubato pensa di aver sbagliato qualcosa.

Quindi il codice va nell'altro verso:

1. apri `socialbot.live/collega/<canale>` e premi **Continua con Discord**;
2. Discord ti chiede il permesso (`identify`, niente altro) e torna da noi;
3. la pagina ti mostra un **codice di sei caratteri**, che sta solo sul tuo
   schermo;
4. lo scrivi nella chat dello streamer: `!discord ABC123`. Quel messaggio —
   che porta con se' l'autorita' di Twitch — chiude il collegamento, e **lo
   consuma**.

Chi legge il codice in chat lo legge gia' bruciato: e' arrivato secondo per
costruzione, perche' prima del tuo messaggio quel codice non esisteva per
nessun altro. E se lo scrivi nella chat sbagliata muore lo stesso — e' comunque
finito in pubblico, quindi non deve valere piu' nemmeno a casa sua.

Il resto sono conseguenze: un codice vive dieci minuti e vale per un canale
solo; ricominciare sostituisce quello di prima; lo stesso account Discord non
puo' restare appeso a due persone sullo stesso canale (sarebbe la stessa rapina,
fatta piano); e `!discord via` stacca, lasciando dov'e' quello che hai — i ruoli
non si tolgono per ripicca.

Il codice sta nel database e non in memoria per lo stesso motivo del cancello di
Telegram: un riavvio non deve lasciare una persona a meta' strada con un codice
che non vale piu' niente e nessuno che glielo dica.

## Il giro, e il difetto piu' pericoloso di tutti

Ogni quarto d'ora, sui canali accesi: si leggono le regole, si chiedono a
Discord i ruoli del server e l'altezza del bot, e per ogni persona collegata si
scrive **solo la differenza**. Un giro in cui non cambia niente non chiama
nessuno, quindi costa quanto una lettura.

Il pericolo non e' sbagliare a dare un ruolo: e' **leggere «non lo so» come
«no»**. Se Twitch tace per un minuto — un permesso revocato, una chiamata andata
storta — e noi capiamo «non e' abbonato», il giro dopo toglie il ruolo dei sub a
tutto il server. Un guasto di lettura diventa una scrittura irreversibile su
casa di qualcun altro, e quei ruoli poi li ridai a mano, uno per uno.

Percio' la regola e' scritta in negativo, e vale da cima a fondo:

- nello strato di Twitch, `null` vuol dire «non l'ho potuto chiedere» ed e'
  diverso da un elenco vuoto, che vuol dire «non c'e' nessuno». `getVips`
  tornava `[]` in tutti e due i casi: adesso no. Chi segue si chiede una
  persona alla volta, e se **una** chiamata cade non si torna una fotografia a
  meta': o si sa di tutti, o non si sa;
- nella fotografia (`helix.ruoliDi`) un fatto che non sappiamo **non c'e'
  proprio**: e' l'assenza della chiave, non un `false`. Un valore che non esiste
  non si puo' confondere con un no;
- nel giro, una condizione che non sappiamo valutare per quella persona, in
  quel giro, **non e' una regola**: non da' e non toglie niente. Il ruolo resta
  dov'e'.

Il resto viene da se': si respira fra una persona e l'altra, e se Discord chiede
una lunga attesa il giro si ferma e torna dopo — non e' il filo a decidere
quanto insistere, e' chi sta girando. «Fammi vedere cosa faresti» percorre la
**stessa** strada senza scrivere: se fosse una strada sua, mostrerebbe una cosa
e ne farebbe un'altra.

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
