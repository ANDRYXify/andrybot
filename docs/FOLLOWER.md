<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# I tuoi follower: la lista intera, i bot, la pulizia

## Il problema

Lo scudo ferma i bot che arrivano adesso. Non tocca chi è già nella lista: i
bot che hanno seguito prima che lo scudo fosse acceso, quelli finiti nelle liste
pubbliche dopo aver seguito, le fabbriche di account che seguono a gocce. Restano
lì a gonfiare il numero, che è il danno vero di un follow-bot.

Prima c'erano due strade, tutte e due corte. Una scansione guardava solo gli
ultimi cento follower. Una pulizia scorreva fino a tremila nomi e prendeva solo i
nomi già noti, passando dall'esecutore dello scudo: con il suo ripiego sul ban,
che non toglie il follow ed è la cosa sbagliata da fare a chi è solo un nome in
una lista. Il pannello non chiamava nemmeno la seconda.

Adesso c'è una scheda sua, «I tuoi follower», nel gruppo «Scudo e attacchi».

## Tre regole che tengono in piedi il resto

1. **Togliere il follow è bloccare e sbloccare, mai bannare.** Twitch non ha un
   altro modo per togliere un follower (`PUT` e poi `DELETE /helix/users/blocks`).
   Il ban non toglie il follow e non c'è, nemmeno come ripiego. Se Twitch blocca
   ma non vuole sbloccare (tre tentativi), la persona resta bloccata e lo si
   dice, col tasto per sbloccarla: scrivere «tolto» su un blocco vero sarebbe
   una bugia.
2. **Chi si tocca si decide due volte.** Quando lo streamer conferma, scrivendo
   il numero che il server conta in quel momento; e di nuovo un attimo prima di
   toccare ciascuno, con la riga riletta dal disco e i ruoli riletti da Twitch
   (all'inizio del lavoro e ogni dieci minuti). Chi nel frattempo si è abbonato,
   è diventato VIP o è stato segnato «a posto» resta fuori.
3. **Gli usciti si segnano solo a giro completo.** Un giro a metà non sa chi è
   uscito: sa solo chi non ha ancora letto. Chi non è stato visto diventa
   «uscito» solo se il giro è arrivato in fondo e ha letto almeno il 95% di
   quanti Twitch dice che sono.

## Il giro

`features/follower.js`. La lista si legge a pagine da cento
(`GET /helix/channels/followers`), con un secondo di pausa fra una pagina e
l'altra; per chi è nuovo si chiede il profilo (`GET /helix/users`, cento alla
volta). Lo stato del giro sta in `stato_vivo` (`follower-giro`): un giro fermato,
caduto o interrotto da un riavvio riparte dal segnaposto, con lo stesso inizio,
così le righe già lette restano valide.

Ogni errore di Twitch è trattato per quello che è (`erroreDiPagina` in helix.js):

- **troppe richieste**: si aspetta fin quando Twitch dice (`Ratelimit-Reset`) e
  si ripete la stessa pagina;
- **Twitch giù**: tre riprove con attesa crescente, poi il giro si ferma e si
  riprende a mano;
- **segnaposto scaduto** (un giro ripreso dopo giorni): si riparte da capo, una
  volta sola;
- **permesso mancante**: il giro si ferma e il pannello dice di concederlo.

Un account chiesto a Twitch e non restituito non esiste più: chiuso o sospeso
(`creato = -1`). Solo se la risposta c'è stata: un errore non chiude nessuno.

A giro completo si rileggono i ruoli (moderatori, VIP, e gli abbonati con
`elencoAbbonati`, una chiamata ogni cento abbonati invece che ogni cento
follower) e la fiducia di ciascuno nel canale (`reputazione.diMolti`). Un ruolo
che non si è potuto leggere non cancella quello che si sapeva.

I follow nuovi entrano subito, dall'evento di Twitch, senza aspettare il giro.
Chi era stato tolto e torna a seguire non è più «tolto».

Anche i blocchi entrano subito, da chiunque arrivino: ogni blocco riuscito scritto
nel registro dello scudo (in un attacco, da una bonifica, da questa scheda) segna
la riga «bloccato» e uscita, e uno sblocco la riporta com'era. Senza, dopo un
attacco i bot bloccati dallo scudo sarebbero rimasti fra i follower fino al giro
dopo, e un «togli il follow» su di loro (blocca e sblocca) li avrebbe sbloccati,
riaprendo la porta che lo scudo aveva chiuso.

## Il giudizio

`features/follower-giudizio.js`, una funzione pura. Il primo livello che vale
decide:

| Livello | Chi |
|---|---|
| protetto | segnato «a posto», sei tu, bot di servizio, in «Non toccare mai», moderatore, VIP, abbonato, di casa |
| noto | in «Blocca sempre», nella lista pubblica dei bot, nome da bot promozionale |
| probabile | nato insieme e arrivato insieme ad altri (la fabbrica), riconosciuto da 3 canali, fermato dallo scudo qui, o il punteggio dello scudo direbbe di agire |
| dubbio | uno solo dei segnali di lista, sospettato in un attacco, o il punteggio direbbe di guardare |
| pulito | il resto |

Un affiliato o partner di Twitch non va mai fra i probabili: ha passato le
soglie di Twitch, e una fabbrica non ci arriva. Può essere guardato.

I motivi escono come codici (`{ k: 'fabbrica', gemelli, ondata }`): il pannello
e il CSV li dicono nella lingua di chi legge, e una prova pretende che ogni
codice abbia le sue parole nelle tre lingue, nel modulo e nel pannello.

### Nati insieme e arrivati insieme

Un follow-bot di fabbrica è un account creato in serie con altri, minuti l'uno
dall'altro, e usato in serie con loro. Le due cose prese da sole capitano anche
alle persone: un raid porta dieci follow in un minuto, e in una lista grande
qualche account è nato lo stesso giorno di un altro. Prese insieme sono due fatti
indipendenti. Per questo una sola fa «dubbio», tutte e due fanno «probabile».

- **gemelli**: quanti account della lista sono nati entro cinque minuti da lui;
- **ondata**: quanti follow sono arrivati entro trenta secondi dal suo.

Si contano su tutta la lista, anche su chi non segue più: dopo aver tolto undici
bot di una fabbrica, il dodicesimo resta della fabbrica.

### Le soglie si ricavano dalla lista

Non sono numeri scelti. Se le date fossero sparse a caso, in una finestra larga
W ci aspetteremmo λ = (N−1)·W/arco altri account. La soglia è il numero più
piccolo k per cui, su tutta la lista, il caso ne produrrebbe meno di uno:

    N · P(Poisson(λ) ≥ k−1) < 1

Una lista piccola ha soglie basse, una grande le alza da sola. L'arco è il
doppio dello scarto interquartile (la metà centrale della lista), così pochi
account vecchissimi non lo allargano, e i bot stessi, finché non sono la
maggioranza, non lo stringono. Due minimi (4 gemelli, 5 in ondata) e due tetti
(25 e 30) tengono la soglia nel buon senso: venticinque account nati negli
stessi dieci minuti non li fa il caso.

Le ondate mostrate nel pannello sono fatte **solo** di account col motivo
«ondata»: un gruppo mostrato è fatto di account che, aperti uno per uno, dicono
di essere arrivati in un'ondata, e viceversa.

## Le azioni

Una per una, sempre dallo stesso posto (`esegui`): il tasto della riga e il
lavoro in massa fanno la stessa cosa.

- **Togli il follow**: blocca e sblocca.
- **Blocca**: blocca e basta; non può più seguire né scrivere in privato.
- **Sblocca**: disfa un blocco.
- **È a posto** / **Non più a posto**: la riga diventa protetta, o torna com'era.

Un'azione riuscita segna subito l'account come uscito: lo sappiamo adesso, senza
aspettare il giro dopo. Un protetto si tocca uno per uno solo con una conferma
in più (il pannello chiede, col perché).

### In massa

Sul filtro che lo streamer sta guardando, con una regola sola
(`azionabile`) per il conto che vede e per il lavoro che parte:

- mai i protetti, mai gli account chiusi, mai chi non segue più;
- **mai i puliti** per togliere o bloccare: un filtro «tutti» con un numero
  scritto sarebbe un clic per togliere il follow a persone vere;
- **«a posto» solo per chi è da guardare**: è la risposta a quella domanda, e sul
  filtro «tutti» proteggerebbe con un numero anche i bot noti;
- al massimo ventimila per volta.

Il lavoro sta in `stato_vivo` (`follower-lavoro`) e riparte dopo un riavvio da
dove era. Va a un account ogni 0,6 secondi (due chiamate: blocco e sblocco),
ubbidisce a Twitch quando chiede di rallentare ripetendo lo stesso account, e si
ferma se manca il permesso. **Sotto attacco aspetta**: quando lo scudo è da
«attacco» in su, il secchio delle chiamate serve alla difesa.

Nel registro dello scudo un lavoro scrive una riga quando parte e una quando
finisce, non una per account: ventimila righe avrebbero cacciato dal registro
quelle degli attacchi. Le azioni una per una scrivono la loro riga. Tutte sono
**fuori dall'attacco** (`fuoriAttacco`): quello che lo streamer fa dalla lista
non è una mossa della difesa, e contato nell'attacco aperto ne gonfierebbe il
rapporto.

## Quando l'account se ne va

Un giro o un lavoro durano minuti, a volte ore, e fra una chiamata a Twitch e
l'altra lo streamer può cancellare l'account. Senza niente, la pagina che torna
da Twitch dopo la cancellazione riscriverebbe righe e stato, e al riavvio il
giro ripartirebbe da solo: la persona crederebbe di essere sparita.

Per questo ogni scrittura del modulo passa da uno **scrittore** preso quando il
flusso parte, legato all'**epoca** del canale. La cancellazione (`cancella.js`)
chiama `dimentica`, che fa salire l'epoca prima di togliere le righe: da quel
momento quello che era in volo non scrive più niente, nemmeno «fermo», e il suo
giro si ferma al passo dopo. L'epoca non torna mai indietro: se lo stesso nome si
iscrive di nuovo, il suo giro parte subito e pulito, e il lavoro vecchio non
tocca la lista nuova. Una prova pretende che nel modulo non ci sia nessuna
scrittura che non passi dallo scrittore.

## La vista

Il pannello legge una vista calcolata: ogni riga col suo giudizio, i conti, le
ondate. Si ricalcola quando la lista è cambiata (al più ogni quindici secondi
mentre un giro la riempie) e comunque ogni minuto, perché la lista pubblica dei
bot e la rete cambiano da sole. Un'azione aggiorna la sua riga e i conti al
volo, senza ricalcolare tutto. Se ne tengono cinque, per i canali aperti di
recente.

## Le porte

Tutte del solo proprietario, e solo per un canale di Twitch:

- `GET /api/follower/stato`: il giro, i conti, le ondate, il lavoro;
- `POST /api/follower/giro`: leggi, rileggi, o ferma;
- `GET /api/follower/elenco`: una pagina della lista filtrata, con quanti
  toccherebbe ogni azione in massa;
- `POST /api/follower/azione`: un account;
- `POST /api/follower/lavoro`, `/lavoro/ferma`, `/lavoro/riprendi`;
- `GET /api/follower/controlla`: «Controlla un nome», col profilo vivo da Twitch
  (la foto passa solo se è di Twitch);
- `GET /api/follower/esporta.csv`: la lista filtrata, coi motivi in parole e le
  celle disinnescate (csv.js).

## I dati

Tabella `follower_elenco`: identificativo e nome su Twitch, quando ha seguito,
quando è nato l'account, se foto e bio sono quelle di base (non la foto, non la
bio), se è affiliato o partner, il ruolo, la fiducia, quando l'abbiamo visto,
quando è uscito, e lo stato scelto dallo streamer. Chi non segue più resta trenta
giorni, poi la potatura oraria lo toglie. La lista esce nei dati che lo streamer
scarica e se ne va con l'account. Detto nella privacy, nelle tre lingue. Se ne va
anche se in quel momento un giro o un lavoro erano in corso (vedi sopra).

## Le prove

- `test/unita/follower-giudizio.test.mjs`: le soglie (meno di un falso allarme
  sul serio, e il numero prima no), la fabbrica contro il raid vero, l'ordine dei
  livelli, i filtri, chi si può toccare, le ondate. Diciannove rotture,
  diciannove rossi.
- `test/unita/follower.test.mjs`: il giro su un Twitch finto (pagine, profili,
  chiusi, ruoli, errori, segnaposto, ripresa), gli usciti a giro completo, il
  togliere senza ban e fuori dall'attacco, lo sblocco che non passa, il lavoro in
  massa (conferma, ruoli, rigiudizio, scudo, rallentare, permesso, riavvio), il
  CSV, la potatura, «Controlla un nome», i blocchi dello scudo che entrano nella
  lista, l'account cancellato con un giro, un lavoro o un'azione in volo.
  Trentotto rotture, trentotto rossi.
- `test/contratto/follower.test.mjs`: le porte, il bot, il pannello, la privacy,
  e la prova del sito confrontata col server: la sua copia della regola, dei
  filtri, dell'ordine e dei conti dà gli stessi risultati su ogni combinazione
  che il pannello può mandare (3240), prima e dopo le azioni. Ventidue rotture:
  ventuno rossi, e una equivalente (la guardia sulla data di nascita ignota non
  cambia nessun risultato, perché un account senza data non è mai «nato da
  poco»).
