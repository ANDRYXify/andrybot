# Punti, classifiche e premio

## Due gare, non due economie

Le monete si guadagnano **allo stesso modo per tutti** — presenza, attività,
moltiplicatori per sub e VIP, il calo graduale di chi resta in lurk. Quello che
cambia è **con chi ti confronti**.

Un moderatore è in chat ogni sera per mestiere. In una classifica mista sta in
cima sempre, e la classifica smette di dire qualcosa proprio a chi la guarda —
il pubblico. Da qui due gare:

| gara | chi ci corre | comando |
|---|---|---|
| pubblico | chi guarda | `!classifica` |
| staff | moderatori e streamer | `!classifica mod`, `!classificamod` |
| — | la vecchia vista unica | `!classifica tutti` |

Non è un'impostazione: è un fatto su chi compete con chi. Per questo non c'è un
interruttore da accendere, c'è una parola da aggiungere al comando.

## Chi è staff lo dice Twitch, non «chi ha parlato di recente»

La prima versione ricordava il ruolo **quando uno guadagnava**: il distintivo
arriva gratis con ogni messaggio in chat, quindi sembrava abbastanza. Non lo era.

Sul canale vero, appena rilasciato, la classifica dello staff era **vuota** e i
moderatori — seb__98, skeller92, mizu__gamer — stavano in cima a quella del
pubblico, mentre la pagina diceva *«nessun moderatore ha ancora monete»*. Falso.
Erano moderatori da sempre; semplicemente non avevano ancora scritto **dopo** il
rilascio, e il codice sapeva solo quello che aveva visto passare.

Il difetto è di modello, non di dettaglio: **essere moderatore non è un evento,
è uno stato**, e legarlo a un evento lascia scoperto tutto il passato.

La lista autorevole ce l'ha Twitch (`GET /moderation/moderators`, scope
`moderation:read`). `features/ruoli.js` la chiede e **riscrive il ruolo di tutte
le righe già in archivio** — retroattivamente, nei due versi: chi è moderatore
sale, chi non lo è più torna nel pubblico. Si riallinea quando si apre la
classifica (con una scadenza di 10 minuti, per non chiedere a ogni pagina) e —
forzando — prima di assegnare il premio, perché il premio pesca dal pubblico e
deve sapere chi lo è davvero.

I distintivi in chat restano, e non sono ridondanti: coprono chi scrive **senza
bisogno di permessi**, quindi funzionano anche per chi non ha ancora
riautorizzato. Le due sorgenti coprono metà del problema ciascuna.

**«Non lo so» non è «nessun moderatore».** `getModerators` ritorna `null` quando
non si è potuto chiedere (permesso mancante, Twitch che non risponde) e un array
quando la risposta è arrivata. Con `null` non si tocca niente: trattare il
silenzio come «zero moderatori» rimanderebbe tutti nel pubblico, che è
esattamente il difetto di partenza servito al contrario.

E la pagina lo dice: se il permesso manca, la classifica dello staff non finge
di essere vuota — spiega che serve un permesso in più e offre il pulsante per
concederlo.

## Dove vive il ruolo

Nella tabella `points`, colonna `ruolo` (`''` = pubblico, `'staff'`). Non in
memoria: la classifica si legge anche dopo un riavvio.

Il ruolo arriva gratis — ogni messaggio in chat porta con sé i distintivi di chi
scrive — e si scrive **solo quando lo si sa davvero**. Un accredito che non sa
niente del ruolo (per esempio il giro della presenza per qualcuno che non ha mai
parlato) passa `null`, e `COALESCE` lascia intatto quello già registrato: nessun
declassamento per ignoranza.

Le righe scritte prima che la colonna esistesse hanno `ruolo=''`, quindi i
canali esistenti vedono nella classifica del pubblico **esattamente** quello che
vedevano prima. Chi è staff ci si sposta la prima volta che scrive.

## Il premio VIP: tre regole, tre fatti

Il premio periodico dà il VIP a chi ha più monete. Ogni regola nasce da un
fatto, non da un gusto.

**Pesca dalla classifica del pubblico.** Twitch *rifiuta* di dare il VIP a un
moderatore — `400: non posso (forse è mod o sei tu)`. Con una classifica mista
il premio si bruciava contro un rifiuto certo, e il posto non andava a nessuno.

**Salta chi ce l'ha già per sempre.** Dargli il VIP non aggiunge niente a lui e
toglie il posto a chi verrebbe dopo. «Per sempre» sono due cose: i VIP che
abbiamo dato noi senza scadenza, e i VIP del canale che non abbiamo dato noi —
quelli li chiediamo a Twitch con `getVips`. Un VIP **a tempo ancora in corso** è
un'altra cosa: quello il premio lo prolunga, ed è giusto così.

**Scorre.** Se qualcuno viene saltato o rifiutato, il posto va al successivo. I
posti promessi sono `quanti`, e `quanti` devono essere assegnati finché c'è
gente in classifica. Per questo si pesca in profondità (`quanti × 4 + 10`) e non
esattamente `quanti`.

### Il difetto che c'era sotto

Non era solo un premio sprecato. `assegnaVipLogin` scriveva `until = adesso +
durata` **anche su un VIP perenne**. Una settimana dopo `controllaScadenze`
glielo toglieva: il premio *degradava e poi revocava* un VIP permanente. E se
quel VIP era del canale — dato a mano dallo streamer, mai passato dal bot — il
bot se lo inseriva in tabella con una scadenza e finiva per togliere un VIP che
non aveva mai dato.

Per questo l'interruttore «salta chi ce l'ha già» decide **chi può vincere un
posto**, non se ci sia permesso rovinare quello che uno ha. Anche premiando
comunque, a un VIP perenne il premio viene assegnato con durata «sempre»: non
gli compare addosso una scadenza che non aveva.

## Il collaudo

`test/unita/punti-classifiche.test.mjs`, con un Twitch finto che sa rifiutare
come rifiuta quello vero. Undici prove, viste rosse rimettendo i difetti veri:
la pesca da classifica mista senza scorrimento (2 rosse) e la scadenza rimessa
su un perenne (2 rosse).
