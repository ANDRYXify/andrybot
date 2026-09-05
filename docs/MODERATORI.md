# Moderatori: la porta si apre da due lati

## Il problema

Finora moderatore si diventava in un modo solo: lo streamer si ricordava di
invitarti, generava un link, te lo mandava. Chi già moderava il canale — magari
da anni, tutte le sere — doveva chiederglielo a voce e sperare che se lo
ricordasse. La porta esisteva, ma la maniglia stava tutta da una parte.

Adesso c'è anche il verso opposto: **si può chiedere**.

## Cosa rende una richiesta una porta e non una casella per chiunque

Una richiesta senza prova è posta indesiderata con un pulsante «Accetta»
accanto. Quindi la prova non la dà chi chiede: la dà **la piattaforma**.

Su **Twitch** si chiede a Twitch l'elenco dei moderatori del canale
(`/moderation/moderators`) e si guarda se quella persona c'è. Due cose lo
rendono possibile senza chiedere niente a nessuno:

- il permesso `moderation:read` sul token dello **streamer** c'è già (lo usano
  le classifiche dello staff), quindi non si chiede un permesso nuovo né a lui
  né a chi bussa;
- chi bussa non deve concedere niente: la sua parola non entra nella decisione.

Se Twitch dice che quella persona non modera, **la richiesta non parte**: è
l'unico caso in cui sappiamo con certezza che non ha fondamento.

Su **Kick** e su **YouTube** la stessa domanda non si può fare: Kick non
pubblica l'elenco dei moderatori di un canale, e YouTube lo espone solo durante
una diretta e con un permesso che non chiediamo. Lì la richiesta arriva marcata
**«da controllare tu»**, e decide lo streamer guardando il nome. Il codice non
finge il contrario: `verificata` è un fatto, e dove non si sa resta falso.

C'è un terzo caso che sembra un difetto e non lo è: se la persona è su una
piattaforma e il canale su un'altra, la conferma automatica non è possibile
nemmeno su Twitch — l'elenco dei moderatori di un canale Twitch contiene login
Twitch, e un account Kick non ci comparirà mai, neanche se quella persona modera
davvero. Chiederlo lo stesso darebbe un «non sei moderatore» **falso**, che è
peggio di un «non lo so».

## «Non lo so» non diventa mai «no»

Quando Twitch non risponde — permesso revocato, rete, quel che sia — l'elenco
torna `null`, non vuoto. Sono due risposte diverse e vanno tenute diverse: se
trattassimo il silenzio come un no, diremmo a un moderatore vero che non lo è, e
la richiesta legittima verrebbe sbattuta fuori senza appello.

## Cosa NON è una richiesta

Una richiesta in attesa:

- **non dà accesso** — i contesti di una persona si costruiscono solo dai
  moderatori `attivo`;
- **non occupa un posto** del piano — se contasse, tre sconosciuti potrebbero
  riempire i posti di uno streamer senza che lui abbia detto sì a nessuno;
- **non compare** nell'elenco dei moderatori — mostrarla lì vorrebbe dire far
  vedere come staff qualcuno a cui non si è ancora detto sì;
- **non può retrocedere chi è già dentro**. Quest'ultima non è un controllo
  prima della scrittura: sta *dentro* la scrittura (`WHERE managers.status NOT
  IN ('attivo','invitato')`). Un controllo lo si può dimenticare in una strada
  nuova; questo no.

## I limiti, e perché

- **Tre richieste in attesa a testa.** Non è solo contro gli abusi: è il segno
  che chiedere a venti canali insieme non è il modo in cui questa cosa va usata.
- **Dopo un no, trenta giorni** prima di poter richiedere quel canale. Chi
  invece **ritira** la propria richiesta può riprovare quando vuole: non ha
  ricevuto un no.
- Il posto del piano si controlla **quando si accetta**, non quando la richiesta
  arriva: fra le due cose lo streamer può aver cambiato piano o riempito i posti
  con altri.

## L'invito, adesso, vale ovunque

L'invito si manda scegliendo la **piattaforma** e scrivendo il nome:
`twitch/pippo`, `kick/pippo`, `yt/pippo` diventano tre canali diversi e non
possono collidere (vedi `src/identita.js`). La vecchia forma — solo il nome —
continua a valere e vuol dire Twitch, che era l'unica piattaforma quando la
scheda è nata.

## L'imbuto degli inviti

Chi è stato invitato non deve per forza usare il link: gli basta **entrare**, da
qualunque porta. Le porte adesso sono quattro (Twitch self-service, login
moderatore, Kick, YouTube) e domani saranno cinque.

Questa regola sta in **una funzione sola** (`abbinaInviti`) e non in quattro
copie, per una ragione che non produce nessun sintomo quando si sbaglia: la
quinta porta se ne dimentica, chi entra da lì non vede nessun errore, e resta
semplicemente chiuso fuori dal canale che gli hanno affidato — senza mai capire
perché.

`scripts/verifica-moderatori.mjs` tiene ferma questa cosa: pretende che gli
inviti in attesa si leggano in un posto solo, che quel posto li **attivi**
davvero, e che ogni punto in cui una persona entra passi di lì. Si prova a
romperlo con `--selftest`, che rompe una cosa per volta — sempre una rottura che
qualcuno potrebbe fare davvero — e pretende che il cancello diventi rosso.
