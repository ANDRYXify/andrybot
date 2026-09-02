# Più di una piattaforma

> © 2024–2026 Andrea Taliento (ANDRYXify)

## L'idea che tiene in piedi tutto

Il bot **non deve sapere da dove arriva un messaggio**. Comandi, moduli,
antispam, punti, ore guardate, memoria, minigiochi: tutto legge la stessa forma
e risponde attraverso la stessa interfaccia.

Due sole cose devono essere vere perché una piattaforma nuova funzioni il primo
giorno, senza toccare niente di quello che c'è:

1. un messaggio entra con la **forma di casa** — `channel, user, display, text,
   id, userId, isMod, isBroadcaster, isSub, isVip, isSelf, tags`;
2. la piattaforma espone **`say(canale, testo)`**, come fa la chat di Twitch.

Da lì in poi il gestore dei messaggi non cambia di una riga. E la risposta torna
**da dove è arrivata la domanda**: un `!comando` scritto su Kick si risponde su
Kick, non su Twitch — che è l'unica cosa che conta per chi ha scritto.

## Kick

OAuth 2.1 con **PKCE**: quando lo streamer preme «collega», nasce un segreto
usa-e-getta che resta nella *sua* sessione; a Kick va solo la sua impronta, e al
ritorno si mostra il segreto per intero. Un codice intercettato non serve a
nulla senza il verifier, che non è mai passato dalla rete.

I token finiscono nella **stessa tabella** di quelli Twitch (`kind='kick'`):
cifrati a riposo dalla strada già provata, ed esclusi dall'esportazione dei dati
senza doversene ricordare. Si rinnovano **prima** della scadenza, e una volta
sola anche se dieci messaggi partono insieme.

I messaggi non li chiediamo: Kick li **spinge** al nostro webhook. Che è
pubblico per forza — Kick deve raggiungerlo — quindi chiunque lo trovi potrebbe
mandarci finti eventi. L'unica cosa che distingue Kick da un impostore è la
firma RSA, e si verifica **prima di guardare qualunque altra cosa**.

Quello che si firma non è solo il corpo: è `id.timestamp.corpo`. Se si firmasse
solo il corpo passerebbe il **replay** — un evento vero, catturato e rispedito
mille volte. Il collaudo lo prova: stesso corpo e stessa firma con un altro id
non passa.

### Perché non funzionava: il webhook rispondeva 404

Il collegamento riusciva, l'iscrizione agli eventi pure, e poi non arrivava
niente. Nessun messaggio, nessun follow, nessun evento — e nessun errore da
nessuna parte, perché dal nostro lato non arrivava proprio una richiesta.

Il sito è un labirinto: senza sessione tutto risponde 404, e le eccezioni erano
un elenco scritto a mano. `/kick/webhook` non c'era. Kick bussava e trovava un
404 — che è esattamente la risposta che il cancello deve dare a uno sconosciuto,
e infatti la dava anche a Kick.

La cosa che rende il difetto istruttivo: **l'argine lo sapeva già**. Nel
limitatore di frequenza c'era scritto, nero su bianco, «i webhook delle
piattaforme non si limitano: scartarne uno significa perdere un messaggio in
chat o un evento» — e `/kick/webhook` era nella sua lista. Due elenchi per lo
stesso fatto, e non erano d'accordo.

Adesso il fatto sta in un posto solo (`INGRESSI_ESTERNI` in `web/vetrina.js`) e
lo leggono tutti e due: il cancello per lasciarli passare senza sessione, e
l'argine per non limitarli. `test/unita/kick-ingressi.test.mjs` tiene insieme le
due letture — provato rosso togliendo `/kick/webhook` dall'elenco.

### L'eco del bot

Su Twitch la chat dice chi ha scritto e un messaggio del bot arriva con
`isSelf`. Su Kick no: il bot scrive con l'account dell'app e l'evento torna
indietro come qualunque altro messaggio. Senza riconoscerlo il bot **si
ascolta**: impara le proprie frasi, si accredita monete, fa scattare i contatori
per parola, e una risposta che contenesse un comando riaccenderebbe il giro.

Non serve sapere *chi* è il bot su Kick (nessuna chiamata lo dice): basta sapere
*cosa* abbiamo appena detto. `kick/eco.js` segna ogni frase mandata — prima di
mandarla, perché l'evento può tornare prima della risposta — e la consuma quando
torna. Consumarla, e non tenerla, fa sì che uno spettatore che ripete la stessa
frase più tardi venga trattato come chiunque altro.

### Cosa deve fare l'operatore, una volta sola

Le credenziali Kick sono dell'app, non dello streamer. Su
[kick.com/settings/developer](https://kick.com/settings/developer), nell'app:

| Campo | Valore |
|---|---|
| Redirect URL | `https://socialbot.live/auth/kick/callback` |
| Enable Webhooks | acceso |
| Webhook URL | `https://socialbot.live/kick/webhook` |

e nell'ambiente `KICK_CLIENT_ID` e `KICK_CLIENT_SECRET`. Se gli eventi non
arrivano, il pannello lo dice con l'indirizzo giusto sotto la riga di Kick,
invece di un generico «da sistemare».

### Entrare con Kick

Chi trasmette **solo** su Kick non ha un account Twitch da usare, e chiedergliene
uno per usare il bot sarebbe chiedergli di iscriversi a un servizio che non gli
serve. Dalla vetrina c'è una seconda porta, `/accedi/kick`: la stessa
autorizzazione dice **chi è** e dà al bot il permesso di **parlare** — un giro
solo invece di due.

**Il nome del canale è la cosa che regge tutto.** Su Twitch e su Kick esiste lo
stesso nome, spessissimo di persone diverse: se il canale Kick «pippo» prendesse
la riga `pippo`, il giorno che il `pippo` di Twitch entra si ritroverebbe il
canale di un altro — comandi, monete, memoria, tutto. La soluzione non è un
controllo: è una **forma**. Un login Twitch è fatto solo di lettere, cifre e
trattini bassi, quindi un canale Kick si chiama **`kick.<nome>`** e non può
collidere. Non per fortuna: per costruzione (`src/identita.js`).

La stessa forma difende i percorsi su disco (`/u/<login>/img/...`): `..` non è un
canale, e non lo diventa.

Chi torna si riconosce dall'**id di Kick**, non dal nome: chi cambia nome su Kick
ritrova il suo canale.

Cosa cambia nel prodotto: niente, tranne le cose che parlano davvero con Twitch.
Il bot non entra in una chat Twitch senza un token Twitch, quindi il giro delle
connessioni si esclude da sé; e il pannello **spegne** le schede che su Kick non
avrebbero con cosa lavorare (moderazione, regia, emote 7TV) dicendo perché,
invece di mostrare pulsanti che non fanno niente. Le monete su Kick arrivano dai
messaggi: l'elenco di chi guarda in silenzio Kick non lo dà.

Il collaudo (`test/contratto/kick-accesso.test.mjs`) monta le rotte vere su
un'app Express e segue il giro con i cookie come farebbe un browser: PKCE con il
verifier che non passa mai dalla rete, uno `state` estraneo che non entra, un
ritorno senza giro in corso che non entra, lo stesso codice che non entra due
volte, e chi è già dentro che non passa dalla porta della registrazione.

### Cosa NON fa ancora, e perché è detto qui

Antibot e antispam agiscono via Helix (elimina, timeout): hanno senso solo su
Twitch. Su Kick il messaggio passa direttamente al flusso normale — **meglio
nessuna moderazione che una moderazione che finge di esserci**. Kick ha le sue
rotte di moderazione (`moderation:ban`, `moderation:chat_message:manage`): sono
già negli scope facoltativi, l'aggancio è il passo dopo.

## YouTube

Le credenziali ci sono. Il lavoro vero non è l'OAuth: è il **quota** e la
**verifica Google** (lo scope `youtube.force-ssl` è sensibile; prima della
verifica il progetto ha un tetto di 100 utenti che vale per tutta la sua vita).
Il modo giusto di leggere la chat è `liveChatMessages.streamList`, che tiene una
connessione aperta invece di interrogare in continuazione.
