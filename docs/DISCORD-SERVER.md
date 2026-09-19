# Il costruttore del server Discord

Lo streamer descrive com'è fatto il suo Discord — categorie, canali, di cosa si
parla in ognuno, chi può fare cosa — e il bot lo mette su. Questo documento dice
**come è fatto dentro**, e soprattutto quali difetti non possono esistere e
perché.

Il manuale per chi lo usa sta in `src/web/manuali.js` (manuale della vetrina);
qui c'è il disegno.

## I pezzi, e perché sono separati

| file | cosa sa | cosa NON sa |
|---|---|---|
| `src/features/discord-catalogo.js` | i quattro server che proponiamo, i numeri dei permessi, come un preset scritto a parole diventa id | cosa sia la rete, e come si applica una differenza |
| `src/features/discord-preset.js` | come si calcola la differenza fra com'è e come lo vuoi | cosa sia Discord |
| `src/features/discord-api.js` | le chiamate: leggere i canali, crearli, sistemarli, toglierli | quali chiamate vadano fatte |
| `src/features/discord-costruisci.js` | in che ordine si eseguono le intenzioni, e quando ci si ferma | quali siano le intenzioni |

È la stessa divisione del gestore dei ruoli (`docs/DISCORD-RUOLI.md`): la regola
non sa cosa sia Discord, il filo non decide niente, e in mezzo c'è un giro che
li mette insieme. Il motivo è sempre lo stesso: un pezzo che sa tutto è un pezzo
che non si può provare senza avere un server vero sotto mano.

## Un preset è una DESCRIZIONE, non una sequenza di comandi

Questa è la scelta da cui scende tutto il resto. Un preset non dice «crea
questo, poi sposta quello»: dice **come dev'essere il server**. Chi applica
legge com'è adesso, calcola la differenza, e fa solo quella.

Tre cose che così non possono rompersi:

- **Applicare due volte non raddoppia niente.** Non perché ci ricordiamo di aver
  già applicato — un elenco di «cose già fatte» da tenere aggiornato è sempre la
  cosa che si scolla — ma perché la seconda differenza è vuota.
- **L'anteprima è la cosa vera.** Non c'è un codice che calcola cosa mostrare e
  un altro che agisce: si mostra la differenza e si applica quella. Due strade
  separate divergono al primo cambiamento.
- **Normale e distruttivo sono lo stesso motore.** La differenza ha tre parti —
  `crea`, `sistema`, `togli` — e il modo normale semplicemente non usa la terza.

## Come si riconosce «lo stesso canale»

Discord non dà nomi unici, e non dà nemmeno un identificativo stabile che il
preset possa conoscere: il preset descrive un server che non ha mai visto.

L'identità è **(categoria, nome normalizzato)**. La normalizzazione non ce la
inventiamo: nei canali di testo la fa già Discord — minuscole, spazi che
diventano trattini — quindi «Il Generale» e «il-generale» sono lo stesso canale.
Nei vocali il nome resta come lo scrivi, e lì si confronta senza storpiarlo.

Quella regola da sola però sbaglia il caso più comune di tutti: **il canale
trascinato fuori dalla sua categoria**. Con l'identità secca diventerebbe un
canale diverso, e gliene creeremmo un altro accanto — peggio ancora in
distruttivo, dove il vecchio, con dentro tutto quello che ci si erano detti,
finirebbe fra le cose da togliere.

Quindi c'è una **seconda occhiata**: se quel nome nel server c'è una volta sola,
è lui, sta solo nel posto sbagliato, e si rimette dentro. Se ce n'è più d'uno
non si indovina — quale dei due avremmo dovuto spostare? È l'**ambiguità** a
fermare il riconoscimento, non la posizione. Due passate, perché chi sta già al
posto giusto non si faccia rubare il riconoscimento da uno fuori posto.

Il contrario non si fa: un canale che il preset vuole in cima ma che sta dentro
a una categoria **non si tira fuori**. Spostare verso una casa è rimettere a
posto; spostare verso il nulla è far sparire dalla vista.

## Chi non si tocca

Non è un elenco che manteniamo, è una domanda al server. I canali che Discord
gestisce da sé nei server Community li nomina per id l'oggetto guild
(`rules_channel_id`, `public_updates_channel_id`, `safety_alerts_channel_id`,
`system_channel_id`); i ruoli delle integrazioni si dichiarano `managed`;
`@everyone` è il ruolo che ha l'id del server. Non li *evitiamo*: non entrano
proprio nell'elenco di quello che si può togliere.

## L'impronta: «sì, fallo» non è una firma in bianco

Fra l'anteprima e la conferma passa del tempo, e quel server non è fermo:
qualcuno può creare un canale, trascinarne un altro, scriverci dentro.
Applicare «quello che avevi chiesto» su un server che nel frattempo è diventato
un altro è esattamente il modo in cui una conferma diventa una firma in bianco —
e nel modo distruttivo la firma in bianco autorizza a cancellare.

Quindi l'anteprima porta con sé l'**impronta di ciò che fa** (sha1 dell'elenco
delle intenzioni, dodici caratteri). Chi applica non riusa quell'elenco: rifà la
fotografia, ricalcola la differenza, e se l'impronta non coincide si ferma e
rimostra. Non è una conferma in più da cliccare: «lo stesso» ha una definizione,
e la macchina la controlla meglio di un occhio.

L'impronta di «vado avanti» e quella di «faccio piazza pulita» sono diverse per
costruzione, perché è di *ciò che si fa*: una conferma data per una non vale per
l'altra.

## Cosa resta fuori si sa sempre

Anche nel modo normale, l'anteprima calcola cosa il preset non prevede e lo
elenca. Non è un'offerta di cancellarlo: serve a poter dire «il tuo server ha
sette canali che questa traccia non copre». Non dirlo lascerebbe credere che il
server sia già uguale al preset quando non lo è.

Di ognuno si dice **da quanto tace**. Quella data non viene da un messaggio
letto: viene dall'**id** dell'ultimo messaggio, e dentro un id di Discord c'è
l'istante in cui è nato (`(id >> 22) + 1420070400000`). Così si sa che un canale
non parla da otto mesi senza aprire la conversazione di nessuno — e senza avere
il permesso per poterlo fare. Due date, non una: chi non ha mai parlato può
essere nato ieri, e chiamarlo morto costerebbe un canale.

## I permessi

### Si dicono a parole

Discord scrive i permessi come somme di potenze di due: «3072» non si legge e
non si corregge. Nel preset si scrive `nega: ['scrivere']`, e la somma la fa la
macchina. I dieci valori stanno in un posto solo (`PERMESSI` in
`discord-catalogo.js`), riletti sulla documentazione di Discord, e un collaudo li
fissa uno per uno. Le **parole** con cui si chiamano stanno nel pannello, che
parla tre lingue: un cancello controlla che ogni permesso ne abbia una.

### Si fondono, non si sostituiscono

Discord, quando gli mandi l'elenco dei permessi di un canale, **sostituisce**
quello che c'era. Mandargli solo i permessi del preset cancellerebbe quelli messi
a mano dallo streamer, quelli di un altro bot, quelli di un ruolo che non ci
riguarda. L'elenco da mandare si compone dove si vede com'è adesso
(`fondiPermessi`), e il preset ha l'ultima parola **solo su ciò che nomina**: è
un pacchetto di differenze, non una copia.

Per lo stesso motivo più righe che parlano della stessa persona diventano una
riga sola: Discord ha un permesso solo per ogni destinatario su ogni canale, e
mandarne due farebbe cancellare la prima alla seconda.

E **quello che hai concesso non si nega**: se lo stesso permesso finisce sia fra
i «può» che fra i «non può», vince il può. Non è una preferenza, è l'unica regola
che non dipende dall'ordine in cui hai scritto le righe.

### I due modi di sbagliare in silenzio, chiusi

- **Un ruolo che non c'è non è «nessuno».** Se un preset nomina «Moderatori» e in
  quel server non esiste, quella riga si salta e si dice quale. Se diventasse un
  id vuoto, un permesso scritto per proteggere un canale lo chiuderebbe a tutti —
  e sembrerebbe una scelta dello streamer.
- **Una riga senza destinatario non vale «tutti».** Era il difetto più silenzioso
  possibile: una chiave scritta storta avrebbe zittito il server intero.

## L'ordine, e perché rende innocuo l'inciampo

1. **Prima le categorie.** Non per eleganza: un canale si crea dentro una
   categoria dandone l'id, e quell'id esiste solo dopo. Al contrario nascerebbero
   tutti fuori, sparsi in cima.
2. **Poi i canali.**
3. **Poi i sistemi.** Un canale che si rimette nella sua categoria ha bisogno che
   la categoria ci sia: se la sua creazione è andata male, non lo si sposta «da
   qualche parte» — si lascia dov'è. Mezza cosa fatta è peggio di niente, perché
   non somiglia né a prima né a dopo.
4. **In fondo ciò che si toglie**, e solo nel modo distruttivo. Se qualcosa va
   storto prima, si è fermato un costruttore, non uno che stava cancellando. E
   fra le cose da togliere prima i canali e poi le categorie: una categoria
   cancellata non porta via i suoi canali, li lascia orfani in cima al server.

La seconda serratura sul cancellare è voluta: `togliere` decide già se la
differenza contiene l'elenco di ciò che sparisce, e `applica` lo ricontrolla
prima di chiamare. Non è una ripetizione — sull'unica cosa irreversibile la
domanda si fa nel punto in cui si distrugge, non solo dove si è deciso.

## La modalità distruttiva

Il motore sa cancellare da sempre: basta passargli `togliere: true`. Tutto il
resto di questo capitolo serve a decidere **da dove arriva quel true**, perché
è lì che si vince o si perde. Cancellare bene una cosa sbagliata non consola
nessuno.

### È una chiave, non un interruttore

Un interruttore si dimentica acceso. Resta così domani, e il giorno che qualcuno
preme «Costruisci» senza guardare il server si svuota — e la colpa sembra di
chi ha premuto, non di chi ha lasciato l'interruttore.

Quindi non è uno stato: è una **chiave che scade**. Il pannello chiede di
entrare, il server ne conia una che vale dieci minuti, e quella chiave è legata
a **chi** l'ha chiesta e a **cosa** apre — quella dei canali di Tizio non apre i
canali di Caio, e nemmeno i ruoli di Tizio. Dopo dieci minuti non esiste più: non
perché qualcuno si ricordi di spegnerla, ma perché il tempo è passato. Uscire la
brucia subito.

Due schede aperte non tengono la porta aperta il doppio: coniarne una seconda
brucia la prima.

E la chiave la conia il **server**. Se lo stato lo tenesse la pagina, una scheda
rimasta aperta da ieri — o una richiesta scritta a mano — basterebbe.

### La pagina si tinge

Dentro la modalità la scheda cambia colore e in cima compare una fascia con
scritto quanto le resta da vivere. Non è decorazione: il tasto che costruisce e
il tasto che cancella sono lo stesso tasto, e l'unica cosa che dice quale dei
due hai sotto il dito è come appare la pagina. Per questo il tasto cambia anche
le parole — «Costruisci» di là, «Fai piazza pulita» di qua — e la differenza
scrive **Cancella (N)** al posto di «Non è in questa traccia».

Entrare e uscire buttano via l'anteprima che c'era: un'anteprima appartiene a
una modalità, e restare a schermo dopo il cambio vorrebbe dire un tasto che
cancella fuori dalla modalità che lo autorizza.

Distruttivo non vuol dire «solo cancella»: crea e sistema come sempre, e in più
toglie. È la stessa differenza di prima con la terza parte accesa.

### La conferma pesa quanto il danno

Tre «sei sicuro?» identici si cliccano a memoria: il terzo non lo legge più
nessuno. Qui la domanda **cambia forma** quando c'è qualcosa di vivo da perdere
— un canale in cui si è parlato nell'ultimo mese — o quando è tanta roba insieme
(più di dieci cose). Allora non basta confermare: va **scritto il nome del
server**, che è l'unica conferma che non può venire dalla memoria muscolare.

A decidere se chiederla non è il pannello. Se lo decidesse lui, basterebbe non
chiamarlo. Il server rifà l'anteprima da sé, pesa **quella**, e se serve il nome
e il nome non c'è, non cancella. Per lo stesso motivo il peso non si accetta dal
corpo della richiesta: sarebbe una firma che si porta da casa.

### Cosa resta scritto

Ogni giro finisce nel registro: chi era, in che modo, quante cose ha creato,
sistemato e tolto — e, se ha tolto, **i nomi**. Sul server quei canali non
esistono più e non tornano: quel registro è l'unico posto dove resta scritto
come si chiamavano. Si scrive sempre, anche quando non si è cancellato niente,
perché un registro che compare solo nei giorni brutti non dice se quel giorno
era stato fatto anche altro.

## Il permesso, e il reinvito

L'invito chiede due permessi: «Gestire i ruoli» (per il gestore dei ruoli) e
«Gestire i canali» (per il costruttore). Il numero non si scrive a mano, si
compone da costanti con un nome, e un cancello controlla che ognuna di quelle
che chiediamo sia davvero usata da qualche parte: un permesso che non usiamo è
potere tenuto in tasca su casa d'altri.

Chi aveva portato il bot prima che il costruttore esistesse non ha «Gestire i
canali». Non lo scopre da un errore a metà costruzione: il permesso si guarda
**prima** (`fotografia()` lo calcola dall'unione dei ruoli del bot, senza una
chiamata in più), e la cura che si dice è il tasto dell'invito — reinvitare è il
modo con cui Discord aggiorna i permessi.

## I pieni poteri, e perché non sono quelli di partenza

Chi vuole governare tutto il server da SocialBot può darci l'**Amministratore**:
il pannello ha un tasto apposta che rigenera l'invito con quel bit
(`PERMESSI_PIENI`), e il server lo manda **solo** a chi lo chiede — nessuna
preferenza ricordata che un giorno si accende da sola. All'invito normale non si
chiede mai: sulla schermata di Discord quella spunta è la più pesante che esista,
e chiederla a chi vuole solo i ruoli è chiedere molto di più del necessario per
fare molto di meno.

Va detto cosa fa e cosa **non** fa. Fa: scavalca i permessi dei singoli canali,
quindi il bot vede tutto, anche i canali privati. Non fa: scavalcare la
**gerarchia**. Anche da amministratore un bot non tocca i ruoli più in alto del
suo, né il proprietario del server — è la regola che gli impedisce di
promuoversi, e nessun permesso la compra. Per questo, quando qualcosa «non si
applica», la causa è quasi sempre la posizione del ruolo e non un permesso
mancante.

`PERMESSI_PIENI` tiene dentro anche tutta la lista di prima. Non è ridondanza: se
un giorno qualcuno toglie l'Amministratore al nostro ruolo, il bot torna a fare
quello che faceva invece di restare nudo. Con un solo bit, quel giorno
smetterebbe di funzionare in silenzio.

## Il preset che arriva dal pannello non è quello che applichiamo

Quello che arriva è testo scritto da un browser, e un browser lo si convince a
mandare qualsiasi cosa. `normalizzaPreset` lo **rifà da zero**: restano solo i
campi che esistono, coi limiti che esistono, e tutto il resto cade. Non si
controlla se è valido — si *costruisce* valido, che è un'altra cosa: un controllo
può dimenticarsi un caso, una ricostruzione no.

## «Parti dal server che hai già»

Chi ha un server vivo non ricomincia da zero: `dallaFotografia()` trasforma la
sua forma nel primo preset. Si prendono nomi, tipi, dove stanno e argomenti —
**non i permessi**. Non per dimenticanza: un preset che non li nomina è un preset
che non li tocca, e quelli che ci sono restano come sono. Rileggerli e
riscriverli identici sarebbe lo stesso risultato passando per un giro in cui
qualcosa può andare storto.

Il collaudo che tiene in piedi questo pezzo è il giro chiuso: importi il server,
chiedi l'anteprima, e **non c'è niente da fare**. Se la forma letta e la forma
voluta fossero descritte in due modi diversi, la prima anteprima direbbe «creo
tutto» su un server già pieno.

## Come si prova senza un server

Nelle prove Discord è finto, ma finto al punto giusto: non si sostituisce il filo
con una bugia, si sostituisce la **rete**. Le chiamate vere partono davvero,
passano da `discord-api.js` com'è scritto, e trovano dall'altra parte un server
di bugia che però si comporta come uno vero — tiene i canali che gli crei, li
sposta, li cancella.

È l'unico modo perché «applicare due volte non raddoppia» sia una misura onesta:
con un finto che dice sempre «fatto», quella prova sarebbe verde anche
raddoppiando tutto.

Gli id del finto sono id plausibili. Con id corti («1», «2») il filo li
rifiuterebbe prima di chiamare, ed è giusto così — ma la prova misurerebbe un
caso che in un server vero non succede mai.

## Quello che non c'è ancora

- **I ruoli creati dal preset.** Oggi il preset può *nominare* un ruolo che
  esiste, non crearne uno. Serve alla porta d'ingresso, e arriva con quella.
- **«Puliamo il server».** Le date ci sono già (nasce da qui il «ferma da otto
  mesi»); manca il giro che le legge e propone.

## I ruoli nel pannello

Tre scelte che si vedono poco e contano.

**I privilegi di un ruolo non sono i permessi di un canale.** Quelli valgono
dentro un canale, questi nel server intero. Nel pannello stanno in due posti
diversi e non si mescolano mai, perché mescolarli farebbe credere che «non può
scrivere» detto in un canale valga ovunque — o peggio, il contrario.

**I privilegi stanno dentro un «details».** Sono tredici, e quasi sempre non si
toccano: chi vuole aprirli li apre, chi vuole solo cambiare un nome non ci
passa sopra. Un muro di tredici interruttori aperti si spunta a caso.

**Un solo ascoltatore sulla carta, non uno per riga.** Le righe dei ruoli si
ridisegnano a ogni modifica, e un ascoltatore attaccato a mano a una riga
morirebbe con lei. È lo stesso difetto che «Leggi il mio server» aveva avuto:
il tasto c'era, nel codice la riga c'era, e premerlo non faceva niente — perché
al momento dell'aggancio quel tasto non esisteva ancora. Per quel difetto
esiste `scripts/verifica-costruttore.mjs`, che i tasti li preme davvero.


## Le impostazioni del server (e perché stanno nella traccia)

Quello che su Discord sta in «Impostazioni server» — livello di verifica, filtro
dei contenuti, canale di sistema e cosa zittirci dentro, canale delle regole,
avvisi allo staff, avvisi di sicurezza, angolo AFK, barra dei boost, pausa a
tutti gli inviti — **non lo teniamo noi**: vive su Discord.

Sta comunque **dentro la traccia**, accanto a categorie, canali e ruoli. Da
quella scelta discendono tre cose, senza scriverle:

- **«Leggi il mio server»** se le porta dietro: senza, il primo «rimettilo a
  posto» azzererebbe in silenzio quello che qualcuno aveva messo a mano;
- **«Fammi vedere cosa faresti»** le mostra nella stessa anteprima;
- la **modalità distruttiva** le rimette come dice la traccia, con la stessa
  serratura di tutto il resto.

Una scheda a parte col suo tasto «Salva» sarebbe una seconda strada verso lo
stesso server, e un'anteprima che ne racconta una sola.

### Le regole che non possono saltare

| regola | perché |
|---|---|
| un campo che la traccia non nomina non si manda | assente vuol dire «non mi interessa», non «zero»: scriverlo cambierebbe una scelta fatta a mano |
| un valore che Discord non accetta non parte | sarebbe un errore a metà costruzione per un campo che non doveva uscire |
| un canale nominato che non c'è più si salta | altrimenti Discord rifiuta l'intera chiamata, e una impostazione sbagliata ne fa fallire otto giuste |
| quello che non cambia non si riscrive | una riga nel registro del server a ogni giro, per non aver fatto niente |
| «pausa agli inviti» viaggia con l'elenco delle caratteristiche | è una caratteristica, non un campo: mandarla da sola cancellerebbe COMMUNITY, e con essa benvenuto, domande d'ingresso e canali annunci |

### La firma le copre

Fra «fammi vedere» e «sì, fallo» passa del tempo. L'impronta include anche le
impostazioni **col loro valore**: un sì dato guardando i canali non autorizza un
livello di verifica cambiato nel frattempo.

### Il permesso, e il cancello che lo tiene fermo

Serve `MANAGE_GUILD`, ed è nell'invito **normale**, non fra i pieni poteri: chi
entra col solo Discord non ha altro, e senza quel permesso metà del prodotto per
lui non esisterebbe.

Quel permesso permetterebbe anche di rifare il vestito del server (nome, icona,
stendardo, indirizzo personalizzato) e di cancellare inviti altrui. Non lo
facciamo, e non è una promessa: `scripts/verifica-poteri.mjs` guarda **i campi**
che finiscono in `PATCH /guilds/{id}`, non solo quale porta si chiama — perché
quella porta è sempre la stessa, ed è la porta giusta.

Chi aveva già invitato il bot deve **ripassare dal tasto** una volta: reinvitarlo
è il modo con cui Discord gli aggiorna i permessi.
