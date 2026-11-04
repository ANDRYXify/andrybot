<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# Il walk-on: l'entrata in scena di chi è sub

Chiesto così: una pagina `socialbot.live/won/<canale>` dove chi è sub sceglie
la sua entrata (uno degli effetti del canale, o un'immagine, un video, un audio
suoi), moderata dai mod o dallo streamer, con una mail facoltativa per sapere
l'esito, che né lo streamer né i mod vedono mai.

## Il modello

**Un walk-on è di una persona in un canale**: una riga, una sola per persona
(`piattaforma:id`, la stessa persona dei Pew: l'id Twitch, `k:<id>` su Kick).
Ha uno **stato**: `attesa` → `approvato` | `rifiutato`; `sospeso` quando chi
l'ha fatto non ha più i requisiti (non è più sub). Cambiarlo lo rimette in
`attesa`: si approva quello che si vede, non una versione vecchia.

**Cosa si sceglie** (ognuno acceso o spento dallo streamer):
- un **effetto del canale**, fra quelli che lo streamer ha messo a
  disposizione (di serie nessuno: li sceglie lui, uno per uno);
- un **file suo**: immagine, video o audio, coi limiti dello streamer (tipi,
  peso, durata). Il file passa dalla stessa strada dei media del canale
  (`media-effetti.js`: tipo vero letto dai byte, non dall'estensione) e sta
  in un posto suo, fuori dalla libreria dello streamer finché non è approvato;
- una **riga di testo** facoltativa sotto, con `{nome}`.

**Chi può** (dello streamer): sub di Twitch (da quale livello), sub di Kick,
VIP, mod; più «chiunque io scelga a mano». I requisiti si guardano quando si
salva e di nuovo quando parte: chi non è più sub non entra in scena, e il suo
walk-on passa a `sospeso` (non si cancella: se torna sub, torna com'era).

**La moderazione**: nel pannello, scheda «Walk-on» (gruppo «In diretta»), e
per i mod con la delega del canale. Si vede l'anteprima vera (il file, o
l'effetto), chi l'ha chiesto, quando. Approva / Rifiuta con un motivo
facoltativo (testi pronti dello streamer, o scritto). Ogni decisione resta in
un registro: chi, quando, cosa. Lo streamer può dire che un effetto del canale
non ha bisogno di approvazione (l'ha già scelto lui): parte approvato.

**Quando parte**: la prima volta che la persona scrive in chat **in quella
diretta** (una volta per diretta, per costruzione: la chiave è
`<diretta>:<persona>` come per la presenza), solo in onda, con l'overlay. Le
regole dello streamer: attesa fra due walk-on (una fila, mai due insieme),
quanti al massimo per diretta, durata massima, volume, dove sullo schermo
(l'elemento `walkon` dell'Overlay Studio, posizionato come gli altri), e se
partono anche con un comando (`!walkon`) invece che al primo messaggio.

**La pagina** `won/<canale>`: entra con Twitch (o Kick), come la pagina dei Pew.
Dice cosa vale qui (le regole dello streamer in chiaro), cosa hai adesso e in
che stato è, con l'anteprima. Chi non ha i requisiti lo legge subito, con
perché. Cancellare il proprio walk-on è sempre possibile: il file se ne va
con lui.

## La mail dell'esito: di chi la scrive, e basta

- Facoltativa, e c'è solo se la posta del bot è accesa (`posta.attiva()`,
  docs/POSTA.md): senza, il campo non compare. Non si promette quello che non
  si può dare.
- Si salva **cifrata** (`segreti.cifra`, con il suo `dove`), in una colonna
  che nessuna rotta del pannello o dei mod legge: lo streamer e i mod non la
  vedono, né in chiaro né cifrata, né in un'esportazione.
- Serve **una volta**: alla decisione parte la mail con l'esito (e il motivo,
  se c'è), e l'indirizzo si cancella. Un nuovo walk-on ne chiede una nuova.
- La persona la può togliere quando vuole dalla pagina.

## Di chi è (tutto dello streamer)

Acceso o spento (di serie spento); chi può; cosa si può scegliere (effetti del
canale e quali, file e di che tipo, peso e durata massimi, il testo); se gli
effetti del canale passano senza approvazione; quando parte (primo messaggio o
comando, e il nome del comando); attesa, tetto per diretta, durata, volume,
posto in scena; i testi della pagina, della chat e i motivi pronti del
rifiuto, nelle tre lingue; la riga in chat quando parte (o niente).

## Garanzie

- Una persona, un walk-on per canale; una entrata per diretta.
- Si approva quello che si vede: ogni modifica torna in attesa.
- Un file che entra è del tipo che dice di essere (letto dai byte), entro i
  limiti; un file rifiutato o cancellato se ne va dal disco.
- La mail non esce mai da dove la legge la posta: nessuna rotta la ridà.
- Chi non ha più i requisiti non entra in scena.

## Le scelte fatte costruendola

Il modello sopra non diceva queste cose; sono scritte qui prima del codice, e
il codice le segue.

**Le tabelle, e cosa tiene ogni garanzia.**
- `walkon`: una riga per `(channel, persona)`, `UNIQUE`. Salvare è un
  `INSERT … ON CONFLICT DO UPDATE`: un secondo walk-on della stessa persona non
  può nascere, sostituisce il primo.
- Ogni salvataggio alza `versione` e rimette `stato` in `attesa`, nella stessa
  scrittura. La decisione porta la versione che il moderatore ha visto, e
  l'`UPDATE` vale solo `WHERE versione = ?`: una decisione su quello che non si
  vede più non passa (risponde «è cambiato, riguardalo»).
- `walkon_entrate`: chiave primaria `(channel, occasione, persona)`, dove
  `occasione` è la diretta di `arrivi.occasioneDiretta` (la stessa della
  presenza). Entrare in scena è un `INSERT OR IGNORE` che conta il tetto per
  diretta nella stessa transazione: una seconda entrata nella stessa diretta
  non è un controllo che si può dimenticare, è una riga che non entra.
- `walkon_registro`: ogni salvataggio, decisione e cancellazione, con chi,
  quando, cosa e versione. Si tengono le ultime 500 righe per canale.
- `walkon_posta`: la mail sta in **un'altra tabella**, non in una colonna di
  `walkon`. Così nessuna lettura delle righe del walk-on (pannello, mod,
  pagina, nemmeno un `SELECT *`) la può portare con sé per sbaglio: per
  leggerla bisogna nominare quella tabella, e la nomina una funzione sola,
  quella che manda l'esito. La busta è `segreti.cifra` col suo posto
  (`walkon_posta/busta/<canale>/<persona>`), l'esportazione la nega
  (`NEGATE` in esporta.js) e la cancellazione del canale la toglie con le
  altre tabelle di canale.

**Sospeso è un segno, non uno stato.** `sospeso` è una colonna accanto a
`stato`. Chi perde i requisiti prende il segno; chi li ritrova lo perde, e lo
`stato` (approvato, in attesa, rifiutato) è rimasto quello di prima senza
che nessuno debba ricordarselo: «se torna sub, torna com'era» è vero per
costruzione. Si guarda a ogni partenza e a ogni volta che la persona apre la
pagina con l'accesso.

**I requisiti, e «non lo so».** Quando si salva: su Twitch la sottoscrizione
e il suo livello li dice Helix (`/subscriptions`, col token dello streamer);
VIP e mod li dicono gli ultimi distintivi visti in chat (in memoria). Su Kick
non c'è una domanda da fare: valgono i distintivi visti. Se la risposta è
«no» il salvataggio è rifiutato col perché; se è «non lo so» (Kick, Helix muto,
mai visto in chat) il walk-on si salva segnato «da verificare», e il
moderatore lo vede. Quando parte decidono i distintivi del messaggio che lo
fa partire, che sono la prova più fresca. Il livello del sub (1, 2, 3) si
legge dalla versione del distintivo (`subscriber/2xxx` è il livello 2,
`3xxx` il 3); su Kick i livelli non ci sono e conta solo «sub». «Chiunque
io scelga a mano» è un elenco di nomi (`pippo` su Twitch, `kick:pippo` su
Kick).

**Il file.** Sta in `DATA_DIR/walkon/<canale>/`, con un nome fatto dal server
(`wo_<istante>_<casuale>.<estensione>`): niente dell'utente entra nel percorso.
Resta lì anche dopo l'approvazione: il walk-on è della persona, non entra mai
nella libreria Effetti dello streamer (dove sarebbe suo e condivisibile).
- Il tipo si legge dai primi byte (PNG, JPEG, GIF, WebP; MP4/MOV, WebM/MKV;
  MP3, OGG, WAV, M4A, FLAC). Il tipo che dice il browser non si guarda.
  Deve essere una famiglia che lo streamer accetta (immagine, video, audio:
  una GIF è un'immagine, e va in onda come video muto).
- La durata vera (ffprobe) deve stare nel massimo dello streamer: un file più
  lungo si rifiuta, non si taglia.
- Poi si ricomprime come gli effetti (`comprimi`): su disco va un WebP, un
  WebM o un OGG fatti da noi; l'originale non si conserva.
- Il peso massimo è quello dello streamer (al massimo 30 MB), applicato da
  multer mentre il file arriva.
- Un file rifiutato se ne va subito dal disco (la riga resta, con lo stato e
  il motivo, senza file); uno sostituito o cancellato pure. Un giro di pulizia
  toglie ogni file della cartella che nessuna riga nomina: un'interruzione
  fra la scrittura nel database e il disco non lascia file orfani.

**L'effetto del canale.** Si offrono solo immagini, video e audio: gli effetti
disegnati e i lanci non hanno un posto (docs/EFFETTI-SCHERMO.md), e il
walk-on sta nel suo. Lo streamer li sceglie uno per uno; un effetto tolto
dalla sua scelta, o cancellato, non parte più (si guarda alla partenza).
Il green screen di un video resta.

**Quando parte, esattamente.** L'entrata si scrive solo quando il walk-on va
davvero in scena: approvato, non sospeso, requisiti buoni sul messaggio, in
onda, almeno un overlay collegato, sotto il tetto della diretta. Un messaggio
scritto mentre il walk-on era ancora in attesa non brucia l'entrata: parte al
primo messaggio dopo l'approvazione. In modo «comando» serve `!<comando>`.

**La fila** sta nel server, per canale: uno alla volta, e il successivo parte
quando il primo è finito più l'attesa dello streamer. È in memoria: un riavvio
perde chi era in fila, e quella persona non rientra in quella diretta (l'entrata
è già scritta). Una volta per diretta vale più di «di sicuro mostrato».

**La mail.** Si chiede solo se `posta.attiva()`, e anche il server la rifiuta
se la posta è spenta. Vale per la versione con cui è stata data: un nuovo
salvataggio senza mail la toglie. Alla decisione si prende e si cancella nella
stessa transazione, poi si manda: riuscita o no, l'indirizzo non c'è più.

**L'accesso.** Lo stesso dei Pew (`colpi-accesso.js`, la stessa memoria dei
token), ma senza permessi: su Twitch nessuno scope (basta sapere chi sei), su
Kick `user:read`. La pagina lo tiene in una chiave sua della sessione
(`spettatoreWon`), e accetta anche chi è entrato dai Pew (è la stessa persona);
i Pew non accettano chi è entrato dal walk-on, perché lì serve scrivere in chat.

**I testi.** La pagina parla nella lingua di chi la apre (it, en, es); il
titolo e la presentazione li può riscrivere lo streamer per ognuna. La riga in
chat va nella lingua della chat, coi segnaposti `{nome}` e `{canale}`. I motivi
pronti del rifiuto sono scritti nelle tre lingue; la persona li legge (sulla
pagina e nella mail) nella lingua con cui ha salvato.

**In scena.** Un elemento `walkon` dell'Overlay Studio, fatto come il «Testo a
schermo»: una carta con il media e la riga sotto, la veste di tutti, la
posizione e la grandezza dello Studio. Eredita l'interruttore `effetti`
(`EREDITA_MOSTRA`): un overlay salvato con gli effetti spenti non si trova i
walk-on in scena perché è nato un pezzo. Il volume è quello del walk-on, la
durata quella del media, al massimo la durata dello streamer.
