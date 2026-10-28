<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# Pewpewify: i colpi degli spettatori

Nel prodotto si chiama **Pewpewify** (pagina, vetrina, chat); nel pannello la
scheda è **Pew**. Nel codice resta `colpi` / `colpo`, e così l'indirizzo lungo
(`/u/<canale>/colpo`): è già condiviso, e un nome cambiato non deve rompere un
link. Quello da dare in giro è **`pew.socialbot.live/<canale>`** («L'indirizzo
corto», sotto).

Chiesto così: «un "viewer attack" ma senza che servano estensioni twitch? tipo
che basta aprire un link che apre la live su socialbot e, grazie all'overlay,
il viewer può fare attacchi precisi dove vuole e come vuole pagando bit?
(però vorrei evitare che si mandino bit sulla chat, non possiamo integrare il
pagamento in bit anche direttamente sul sito?)». Scelti tutti e tre i modi di
pagare: euro sul sito, punti canale, Bit con un codice.

## Il vincolo dei Bit

I Bit si spendono solo dentro Twitch: in chat (cheer), nei Power-up e nelle
Estensioni (Bits in Extensions). Nessuna API lascia a un sito esterno
incassare Bit. Quindi, senza estensione, i Bit passano dalla chat: la pagina
dà un **codice** e il cheer lo porta nel messaggio. Gli euro invece si pagano
sul sito, sul conto dello streamer (come le donazioni, docs/DONAZIONI.md), e
i punti canale col premio che SocialBot crea su Twitch.

Quello che il sito può fare è tenere il conto dei Bit **già mandati** al
canale: i «Bit da spendere» (sotto) sono un saldo di SocialBot, non Bit di
Twitch. Si spendono solo sulla pagina, e tornano solo lì.

## Il modello (src/features/colpi.js)

- **Colpo** = un effetto del canale (immagine o video che si posa in un punto;
  niente tutto schermo, niente disegni) sparato nell'overlay nel punto mirato,
  col nome di chi lo manda.
- **Listino** (`settings.colpi`): `attivo`, `pausa`, `voci` (id, comando, nome,
  prezzi `euro` in centesimi / `punti` / `bit`, `scala`, `attiva`, e i campi
  del premio che scrive solo SocialBot), `zone` protette in % del quadro,
  `attesaSec` per spettatore, `alMinuto` per canale, `conNome`.
- **Mira** (tabella `colpi`): codice di 5 caratteri senza ambigui (sempre
  almeno una cifra e una lettera: una parola del messaggio non è mai un
  codice), punto, prezzi del momento, stato `attesa → sparata | scaduta`.

Le invarianti, per costruzione:

1. **Il punto si decide alla mira.** Il server lo controlla allora (nel quadro,
   fuori dalle zone) e lo tiene: chi paga dopo non lo sposta.
2. **Il punto è il centro.** L'overlay riceve `posizione.centro` e posa il
   colpo col suo centro lì (`translate(-50%,-50%)`), non con la «corsa» delle
   posizioni dell'Overlay Studio.
3. **Una mira parte una volta sola**: `UPDATE … WHERE stato='attesa'`, vince
   uno solo, qualunque cosa paghi.
4. **Il prezzo è quello della mira**: cambiare il listino non cambia le mire
   aperte.
5. **Una mira si paga in un modo.** Aperto un pagamento in euro la mira è
   legata a quella donazione (`riferimento`) e il codice non vale più per
   punti o Bit. La presa `apre:<id>` si prende prima di chiamare Stripe o
   Satispay: un doppio tocco non apre due pagamenti; se il pagamento non si
   apre la presa si rilascia.
6. **Chi paga vede il suo colpo, o riavrà i soldi.** Vedi «La consegna».

Scadenze: una mira non pagata scade dopo 15 minuti; una con dei Bit già
arrivati aspetta il resto fino a un giorno; una legata a un pagamento in euro
segue la sua donazione (scade quando scade quella).

## La consegna

Chiesto così: «cerca di essere sicuro al 100% che l'utente se paga avrà
l'effetto, in caso non lo avesse dovrà essere rimborsato o semplicemente dovrà
venire fermato dal pagare/mandare bit».

Stati: `attesa → pagata → sparata`, oppure `pagata → rimborsata`; `attesa →
scaduta`. «Pagata» vuol dire soldi arrivati; «sparata» vuol dire MOSTRATA.

1. **Si paga solo un colpo consegnabile adesso** (`servizio.consegnabile`):
   colpi accesi e non in pausa, diretta in onda, un overlay PRONTO, l'effetto
   che c'è ancora. Lo guardano la mira, il tasto «Paga» (`porta.paga`) e il
   riscatto dei punti (che altrimenti si annulla subito, punti restituiti). La
   pagina chiede lo stato ogni 3 secondi (`pagabile`, `fermo`) e toglie cheer,
   premio e «Paga» appena il colpo smette di essere consegnabile.
2. **Pronto non è collegato.** Un overlay collegato può avere gli effetti
   spenti, o stare in una scena che non va in onda. Ogni overlay dichiara ogni
   20 secondi se è pronto (`/overlay/<login>/colpo/pronto`): effetti accesi,
   in OBS la sorgente attiva in programma (`obsSourceActiveChanged`), in un
   browser la scheda visibile. Vale 45 secondi (`effects.prontoColpi`).
3. **Consegnato vuol dire mostrato.** Il colpo va all'overlay col suo id; quando
   l'overlay lo mette a schermo risponde `/overlay/<login>/colpo/<id>/visto`, e
   solo allora diventa `sparata` (coi punti, il riscatto diventa FULFILLED). La
   ronda (ogni 5 s, nel server) rimanda ogni 20 s i colpi pagati e non visti:
   l'overlay riconosce quelli già in fila o già mostrati e non li mostra due
   volte (a un rinvio di uno già mostrato risponde di nuovo «visto»).
4. **Se non si vede, si restituisce.** Dopo 10 minuti (`CONSEGNA_MS`) un colpo
   pagato e mai mostrato si rimborsa da solo: gli euro con il rimborso sul
   conto dello streamer (Stripe o Satispay), i punti col riscatto CANCELED. Un
   rimborso che non riesce resta da fare e si ritenta a ogni giro: un colpo
   pagato non finisce mai nel nulla.
5. **Gli euro solo da un conto che sa rimborsare.** Satispay rimborsa sempre;
   Stripe solo con il permesso «Refunds», che si prova alla verifica della
   chiave con un rimborso di un pagamento che non esiste (`puoRimborsare`: 403 =
   no, «resource_missing» = sì). Senza, gli euro con Stripe non si offrono.
6. **I Bit non si possono restituire** (nessuno, fuori da Twitch). La garanzia
   è la prevenzione: la pagina chiede il cheer solo quando il colpo è
   consegnabile. Se i Bit arrivano quando non lo è più, il colpo resta pagato
   in coda e parte appena un overlay è pronto, anche alla diretta dopo; il bot
   lo dice in chat.

## I tre modi di pagare

- **Euro**: `POST /u/<login>/colpo/paga/<id>` apre il Checkout di Stripe o il
  pagamento Satispay sul conto dello streamer, con `ritorno: 'colpo'`. È una
  donazione a tutti gli effetti (avviso, obiettivo, registro). Quando la
  donazione arriva (ritorno, webhook Satispay o ronda) `donazioneArrivata`
  chiama `colpi.daPagamento`, che spara.
- **Punti canale**: per ogni voce con un prezzo in punti SocialBot crea il
  premio «Colpo: <nome>» con testo obbligatorio (`colpi-premi.js`), e lo rifà
  se cambiano prezzo o nome. Il riscatto col codice giusto spara e diventa
  FULFILLED; un codice sbagliato lo rende CANCELED (i punti tornano) e il bot
  lo dice in chat. Le riconciliazioni vanno una alla volta per canale, e
  scrivono solo i campi del premio sulle impostazioni del momento.
- **Bit**: il cheer col codice nel messaggio. I Bit si sommano (`versati`):
  chi ne manda meno sente in chat quanti ne mancano.

Con l'accesso a Twitch (sotto) il codice non serve: la mira porta l'id
Twitch dello spettatore (`colpi.spettatore`) e `registro.apertaDi` trova la
sua ultima mira aperta. Un suo cheer senza codice la paga **solo se da solo
copre quello che manca**: un cheer più piccolo, fatto magari per altro, non
si somma di nascosto (col codice sì, come prima). Un suo riscatto del premio
di quella voce la paga qualunque cosa scriva. Il codice resta e vince: se c'è
nel messaggio, vale quello.

## I lanci

Il colpo più naturale è un **lancio** (docs/LANCI.md): un pomodoro, una
ciabatta, una bomba… o un **adesivo** animato, o uno **spavento**, presi dal
catalogo con «Lanci e adesivi». Un lancio arriva da chi guarda, colpisce col
centro nel punto mirato e lascia il segno; il «visto» parte all'impatto (per un
adesivo, quando compare). Nella pagina l'anteprima e l'ombra sono il suo
disegno, lo stesso file che usa l'overlay.

## La pagina (`/u/<login>/colpo`)

Disegnata da `colpi-pagina.js` con l'aspetto della pagina link, nella lingua
del browser (it/en/es); i dati vivi li risponde `colpi-porta.js` (le stesse
funzioni servono le rotte e il cancello). La diretta di Twitch si carica solo
quando lo spettatore lo chiede (o l'ha già accettato sulla pagina link:
`sb-consenso`). Sopra c'è lo strato di mira 16:9, che prende i clic solo dopo
aver scelto un colpo: prima il lettore resta usabile. Le zone protette si
vedono a righe; il mirino e l'ombra del colpo stanno dove si tocca, e l'ombra
è grande come sarà in un overlay 1920×1080 (file × grandezza). Si mira anche
con le frecce (Maiusc per passi da 5%) e Invio. L'anteprima dei media passa
da `/u/<login>/colpo/anteprima/<voce>`: gli indirizzi dell'overlay portano la
sua chiave e non escono mai.

La diretta nella pagina arriva qualche secondo dopo: il colpo cade nel punto
del quadro, e la pagina lo dice.

La pagina è un blocco dentro `renderLinkPage`, come la pagina link dello
streamer: stesso stile, stesso tema (sfondo, carattere, accento, angoli), la
stessa testata e lo stesso consenso per il lettore di Twitch (`.chiedi-b` di
`pagina-link.js`). Il blocco usa solo le variabili del tema (`--acc`,
`--suacc`, `--r`, `--fd`, `--btxt`…): un tema nuovo vale anche qui senza
toccarlo.

## L'indirizzo corto (`pew.<dominio>/<canale>`)

Come `negozio` e `telegram`: il nome sta nel Caddyfile (validato con Caddy vero
e registrato in `Caddyfile.validato`), il server bussa in HTTPS e accende
`config.pewHost` quando risponde; `PEW_HOST` lo sceglie o lo spegne (`no`).
L'indirizzo lungo vale sempre. `urlPaginaColpo` (colpi.js) è l'unico posto che
lo scrive: il pannello, il premio a punti canale, i ritorni di Stripe e
Satispay, il canonico della pagina.

Sul nome corto il server traduce solo `/<canale>` in `/u/<canale>/colpo`
(query compresa, così il ritorno `?dona=` di un pagamento arriva); la radice
rimanda al sito, l'informativa passa. La pagina chiama le sue rotte con
indirizzi interi (`/u/<canale>/colpo/dati`, `/mira`, `/chat`…), che lì valgono
uguali. Il lettore di Twitch vuole tra i `parent` anche il nome corto, se no
rifiuta di partire: `htmlPaginaColpo` lo riceve come `corto`.

**L'accesso passa da un ponte.** Twitch torna solo su `/auth/callback` del
sito, e il cookie della sessione vale per un nome solo (allargarlo a tutti i
sottodomini porterebbe la sessione del pannello anche sulle pagine
pubbliche: no). Allora:

1. su `pew`, `/accedi` mette in sessione un **segno** casuale e manda a
   `/accedi?segno=…` del sito;
2. il sito fa il giro con Twitch come sempre (lo state nella sua sessione) e si
   porta il segno nel `colpoFlow`;
3. al ritorno, la chiave dello spettatore non va nella sessione del sito ma in
   un **biglietto** (`creaPonti`, colpi-accesso.js): una volta sola, due
   minuti, per quel canale e per quel segno; si torna su
   `pew…/u/<canale>/colpo/entra?b=…`;
4. `entra` dà la chiave solo se il segno nella sessione di `pew` è quello del
   biglietto, e il biglietto si brucia comunque.

Un biglietto preso da un altro non fa entrare nessuno, perché il segno che
serve sta solo nel browser che è partito: nessuno può farti entrare col suo
account mandandoti un link.

## Le categorie

Chiesto così: «aggiungiamo anche la divisione per tipologia di attacchi,
personalizzabile dallo streamer (sempre tutto personalizzabile dev'essere)».

Il listino si divide in categorie (`colpi.categorie`, al massimo 10: `{ id,
nome }`), nell'ordine che sceglie lo streamer. Finché non le tocca valgono
quelle di serie, una per tipo: **Lanci**, **Adesivi**, **Spaventi**,
**Immagini e video** (`CATEGORIE_SERIE`). Il nome di una di serie può restare
vuoto: si legge nella lingua di chi guarda. Una nuova vuole un nome.

Ogni colpo va nella categoria che gli sceglie lo streamer (`voce.categoria`);
senza, in quella del suo tipo, se c'è; se no nella prima (`categoriaDi`). Il
tipo viene dall'effetto: un lancio dalla libreria del catalogo (adesivi,
spaventi, gli altri sono lanci), un'immagine o un video è «media». Senza
categorie la pagina mostra tutto insieme.

Sulla pagina, con almeno due categorie che hanno colpi, sopra il listino ci
sono i filtri («Tutti» e le categorie); quelle vuote non si vedono. Nel
pannello: l'elenco delle categorie (nome, su e giù, togli, aggiungi) e, su ogni
colpo, «Categoria» («Secondo il tipo» o una delle categorie).

## Le monete del canale

Chiesto così: «colleghiamo poi tutto ai punti del canale, così creiamo proprio
un sistema vivo». Un colpo ha un quarto prezzo: le monete del canale
(docs/ECONOMIA.md), `voce.monete`.

- **Dalla pagina**, con l'accesso a Twitch: «Paga N monete». Le monete sono di
  chi scrive in chat, quindi senza accesso non si sa di chi sono; e si paga
  solo la propria mira (`spettatore` vuoto o il proprio).
- **Dalla chat**: `!pew CODICE` (il comando lo sceglie lo streamer,
  `colpi.comando`), per chi non ha fatto l'accesso, anche su Kick e YouTube.
  Il bot risponde: pagato, quante ne mancano, codice che non vale, colpo fermo.
- **Le stesse regole degli altri modi**: si paga solo un colpo che adesso può
  comparire; una mira con un pagamento in euro aperto no; una volta sola.
- **Tutte o niente, con la ricevuta**: si spendono con `economia.punta`, che
  dà i lotti spesi; la ricevuta sta nella mira (`colpi.ricevuta`). Se in dieci
  minuti il colpo non compare, la ronda la rende tale e quale
  (`economia.rendi`): tornano le stesse monete, con le loro scadenze. Se la
  mira nel frattempo fosse già pagata, la ricevuta torna subito.
- Le monete si muovono solo da `economia.js`: il servizio riceve `punta`,
  `rendi` e `saldo`, e senza non offre il prezzo in monete.

E la presenza dà monete in serie («La serie della presenza», sotto).

## I modi misti

Chiesto così: «colleghiamo anche la possibilità di usare le monete del canale
ma anche monete più bit o monete più punti canale». Una voce può avere, oltre
ai prezzi pieni, due prezzi misti (`voce.misti`):

- `misti.bit = { monete, bit }`: le monete e poi i Bit;
- `misti.punti = { monete, punti }`: le monete e poi i punti canale, con un
  secondo premio su Twitch, «Colpo: <nome> + monete» (`voce.premioMisto`), che
  `colpi-premi.js` tiene allineato come il primo.

Niente euro misti: un rimborso a metà fra il conto dello streamer e le monete
non si fa in un passaggio solo.

**Prima le monete, sempre.** Sono l'unica parte che si può rendere da qui con
certezza, quindi si pagano per prime: l'**acconto** (`colpi.acconto`,
`{ modo, monete, resto, user, ricevuta }`), una volta sola, su una mira aperta
e senza un pagamento in euro in corso (`registro.acconto`). Dalla pagina con
l'accesso, o in chat con `!pew CODICE bit` / `!pew CODICE punti`
(`pagaInChat`). Da lì:

- **monete + Bit**: il cheer col codice (o, con l'accesso, senza) paga il
  resto, `bitServe(m) = acconto.resto`. I Bit arrivati prima delle monete non
  vanno persi: restano in `versati`, e l'acconto che arriva dopo fa partire il
  colpo subito. Il metodo è `monete+bit`.
- **monete + punti**: il riscatto del premio misto vale solo con l'acconto di
  quella mira; senza, i punti tornano (CANCELED) e il bot dice cosa manca. Il
  metodo è `monete+punti`; i punti pieni su una mira con un acconto sono
  rifiutati.

**I rimborsi.** Un acconto lasciato a metà (la mira scade, o un giorno passa
coi Bit a metà) torna dalla ronda (`registro.accontiScaduti`, una volta sola:
prima `scadi`, poi `rendi`). Un colpo `monete+punti` che non compare torna
tutto: il riscatto CANCELED e, dopo, le monete. Un colpo `monete+bit` resta in
coda come uno a Bit (vedi «Il vincolo dei Bit»), salvo il saldo in Bit
(«I Bit da spendere», sotto). `pulisci` non tocca una mira con un acconto: la
chiude la ronda, che rende le monete.

## Con l'accesso, un tocco

Chiesto così: «a che serve il codice se il saldo è fittizio? Dai la
possibilità all'utente di fare direttamente tutto senza troppi rigiri, ha già
fatto il login». Il codice serve solo a legare la pagina a qualcosa che
succede **fuori**: un cheer nella chat di Twitch, un riscatto dei punti
canale, `!pew CODICE` per chi non ha l'accesso. Le monete del canale e i Bit
da spendere sono un saldo nostro: con l'accesso non serve.

- Scelto il colpo e toccato il punto, il passo 2 mostra un tasto per ogni
  saldo che lo paga: «Lancia · 20 Bit», «Lancia · 40 monete», «Lancia · 10
  monete + 30 Bit» (il modo misto coi Bit, pagato tutto dal saldo). Spento se
  il saldo non basta. «Prendi la mira» diventa «Altri modi di pagare»: cheer,
  punti, euro, col codice come prima.
- `POST /u/<login>/colpo/lancia` (`porta.lancia`): chi paga è chi ha
  l'accesso (la sessione, mai il corpo). Prima si guarda il saldo: un tocco
  che non può riuscire non apre nemmeno la mira. Poi la mira e
  `servizio.subito`, insieme.
- **Niente a metà.** Se il pagamento non va (il colpo intanto non può
  comparire, il saldo è cambiato), la mira si chiude (`scadi`, una volta) e
  quello che era già stato preso torna: nel modo misto, le monete
  dell'acconto. Il colpo pagato segue la strada di sempre (consegna, rinvii,
  rimborso se non compare).

## I Bit da spendere

Chiesto così: «in base ai bit spesi dall'utente, su pew.socialbot.live ci
saranno pari bit da poter spendere (come fosse una valuta assieme a punti
canale e monete)». Il saldo sta in `pew_bit` (per canale e per **id**
Twitch: il nome si cambia, l'id no), e ogni movimento in `pew_bit_mov` col
suo riferimento, unico per canale (`db.pewBit.muovi`).

**Un Bit vale una volta.** Il cheer passa prima dalla mira (`cheerSuMira`):
sulla mira va solo quello che serve (`usati`, mai oltre il prezzo); il resto
del cheer, o tutto se non paga niente (nessun codice, codice sbagliato), è
saldo. Così un colpo pagato a Bit non dà anche saldo, e un cheer più grande
del prezzo non perde niente. Il saldo è `bitResi(resa, bit)` =
⌊bit × resa / 100⌋: la **resa** la sceglie lo streamer (`bitPew.resa`, da 1 a
1000 ogni 100 Bit; di serie 100, alla pari). Spenti (`bitPew.attivo: false`)
o con la pagina spenta, i Bit restano solo al canale. Un cheer anonimo non è
di nessuno.

**Una volta per cheer.** Twitch consegna «almeno una volta»: il cheer porta
l'id del messaggio di EventSub (`ev.id`, da `events.js`), e il riferimento
`cheer:<id>` non entra due volte, nemmeno dopo un riavvio (gli id visti in
memoria non sopravvivono, il registro sì).

**Chi ha mandato cosa.** Ogni Bit su una mira ha un nome: `colpi.versanti`,
in ordine di arrivo, `[[id, bit, da]]` (`'-'` per gli anonimi, `da = 'p'` per
quelli presi dal saldo). Da qui tornano:

- **una mira mai pagata** (scade coi Bit dentro: un giorno, o l'acconto che
  la ronda chiude): `registro.svuota` la prende una volta, e i Bit tornano a
  chi li ha mandati (`persi:<mira>:<i>`). `pulisci` non cancella una mira
  scaduta coi Bit dentro finché la ronda non li ha resi (al massimo una
  settimana);
- **un colpo a Bit che non compare** (`bit` o `monete+bit`, dopo
  `CONSEGNA_MS`): prima `rimborsata` (una volta sola), poi i Bit tornano —
  quelli del saldo tali e quali, quelli dei cheer con la resa scritta sulla
  mira (`prezzi.resa`, quella di quando è nata) — e le monete dell'acconto.
  Solo se si sa di chi è **ogni** Bit della mira (`tracciati`): con anche un
  Bit anonimo, o una mira nata a Bit da spendere spenti, il colpo resta in
  coda come sempre (vedi «Il vincolo dei Bit»);
- **i Bit di troppo di un modo misto**: un cheer più grande del resto prima
  dell'acconto. Sono gli **ultimi arrivati** (`togliUltimi`): tornano a chi li
  ha mandati (`avanzo:<mira>:<i>`), e sulla mira restano quelli che l'hanno
  pagata (`registro.riparti`), così un rimborso dopo rende solo quelli.

**Spendere.** Dalla pagina, con l'accesso a Twitch (`POST /paga/<id>` con
`mezzo: 'bitpew'`): il saldo paga quello che manca (`bitServe(m)` meno i Bit
già arrivati), tutto o niente (`muovi` non va mai sotto zero), una volta per
mira (`spesa:<mira>`), con le regole degli altri modi: una mira aperta e
propria, senza un pagamento in euro in corso, e un colpo che adesso può
comparire. Un modo misto coi Bit si finisce col saldo dopo l'acconto in
monete. Il metodo resta `bit` / `monete+bit`; il riferimento è
`bitpew:<id>`.

**Vederlo.** La pagina chiede `GET /saldi` (solo con l'accesso) e scrive
«Hai N Bit da spendere qui.» accanto al nome; chi non ha fatto l'accesso
legge che i suoi Bit si spendono anche lì. In chat `!pew bit` (col comando
dello streamer) risponde a chi scrive, su Twitch, una volta al minuto. Il
pannello mostra quanti ne girano e chi ne ha di più, coi nomi.

## L'anteprima

Chiesto così: «riusciamo ad inserire un'anteprima degli attacchi se l'utente
volesse vederli? in più riusciamo anche ad inserire un'anteprima prima di
lanciarli».

- **Guarda** (il ▶ su ogni colpo del listino): il colpo parte al centro della
  diretta, sulla pagina.
- **Prova qui** (al passo 2, e al passo 3 finché la mira è da pagare): parte
  nel punto mirato.

È lo stesso colpo che vedrebbe l'overlay, per costruzione: un lancio passa
dallo stesso disegnatore (`public/lanci.js`) col suo payload; un'immagine o un
video è il file dell'anteprima, grande come l'ombra (che è grande come
nell'overlay), e un video col green screen passa dallo stesso scontorno
(`public/scontorno.js`, che ora usa anche l'overlay). Suona col volume
dell'effetto; i suoni caricati dallo streamer arrivano da
`/u/<login>/colpo/anteprima/<voce>/suono`, perché gli indirizzi dell'overlay
portano la sua chiave e non escono. Sotto compare il posto del nome come
nell'overlay (il nome scritto, quello di Twitch o «Il tuo nome»).

L'anteprima la vede solo chi guarda, e la pagina lo scrive sopra la diretta.
All'overlay non arriva niente e nessuna mira si apre; si guarda anche a
diretta spenta.

## La presenza

Chiesto così: «riusciamo anche ad inserire un "presenza"? magari in chat da
scrivere "!pew presente" o una roba comunque personalizzata dallo streamer»;
scelto: compare in diretta.

Chi scrive in chat la frase dello streamer (di serie `!pew presente`) fa
comparire l'effetto scelto dallo streamer, nel punto scelto dallo streamer,
con sotto «Marta è presente» (o la scritta dello streamer, con `{nome}`; vuota,
quella di serie nella lingua della chat). È gratis e vale una volta per
diretta.

- **La frase** si confronta intera: maiuscole e spazi non contano, «ciao !pew
  presente» non vale. Su Twitch, Kick e YouTube.
- **Le stesse domande di un colpo**: pagina accesa e non in pausa, diretta in
  onda, un overlay pronto, l'effetto che c'è e si posa in un punto, il punto
  fuori dalle zone protette (anche se le zone cambiano dopo). Se no, niente:
  non si salva nulla e il bot tace.
- **Una per diretta**, per spettatore: la riga del registro ha il riferimento
  `presenza:<diretta>:<piattaforma>:<id>`, e un indice unico tiene una sola
  riga in arrivo o mostrata. La diretta è la chiave delle accoglienze
  (`arrivi.occasioneDiretta`: l'inizio della diretta su Twitch, o su Kick, o
  il giorno), che regge un riavvio.
- **La strada dei colpi**: nasce da consegnare, l'overlay la mostra in fila
  (mai sopra un altro effetto) e dice «visto»; la ronda la rimanda. Non c'è
  niente da rimborsare: se in tre minuti non si vede, il momento è passato
  (`scaduta`) e chi l'ha scritta la può rifare.
- **Un tetto suo** (di serie 6 al minuto): un raid che si presenta non
  riempie la diretta, e non toglie posto a chi paga (le presenze non contano
  nel tetto dei colpi).
- **La serie**: chi la fa partire, o l'ha già fatta, è presente a questa
  diretta senza aspettare i due giri (docs/PRESENZE.md).

Nel pannello, scheda Pew, «La presenza»: accesa, frase, scritta, effetto (anche
dai lanci e adesivi), grandezza, tetto, il punto toccando il quadro, e
«Prova nell'overlay», che la manda subito col nome dello streamer, senza
registro.

## La serie della presenza

Chiesto così: «quando si fa la presenza colleghiamo quella presenza al
riscatto delle monete (ogni giorno si può aggiungere quante monete, tipo alla
prima presenza 1, poi 5, poi 10 poi 15 fino a che non si salta una presenza,
però personalizzabile, sia quanto la combo massima sia quanti punti sia
tutto)».

- **I gradini** (`presenza.premi`, fino a 30): le monete della prima presenza
  di fila, della seconda, e così via. Dopo l'ultimo gradino si resta lì o si
  ricomincia dal primo (`presenza.dopo`). Tutti a zero, niente monete
  (`premioSerie`).
- **Di fila vuol dire diretta dopo diretta.** La serie (`pew_serie`, per
  spettatore) sale se la sua ultima presenza era alla diretta subito prima di
  questa, se no riparte da 1 (`serieDopo`). «Subito prima» lo dice l'elenco
  delle dirette del canale (`pew_dirette`): ogni diretta ci entra dal giro
  delle ore guardate, ogni cinque minuti in onda, e a ogni presenza, con la
  stessa chiave della presenza (`arrivi.occasioneDiretta`). Così una diretta
  in cui nessuno si è presentato c'è lo stesso, e chi l'ha saltata riparte. Una
  diretta più corta di cinque minuti senza presenze non entra: non conta come
  saltata.
- **Le monete una volta per diretta**: una presenza rifatta perché la prima non
  si è vista compare di nuovo, ma non ridà le monete. Sono un premio scelto
  dallo streamer (`economia.premio`): nascono «da un premio», vanno nel
  registro delle monete (motivo `presenza`), e i bot, gli esclusi e lo
  streamer non le ricevono.
- **La scritta** sull'overlay e **la risposta** in chat possono dire `{serie}`
  e `{monete}` (la risposta anche `{moneta}`, il nome delle monete). La
  risposta si spegne; vuota, è quella di serie nella lingua della chat, col
  premio se c'è. Arriva solo alla prima presenza della diretta.

Nel pannello, sotto «La presenza»: i gradini separati da virgole, cosa succede
dopo l'ultimo, una riga che rilegge la serie coi numeri, la risposta.

## La chat

`colpi-chat.js`: le righe che il bot riceve già dalla chat di Twitch del
canale (solo coi colpi accesi), girate alla pagina con un flusso SSE
(`GET /u/<login>/colpo/chat`) e le ultime 40 per chi arriva. È la chat
pubblica del canale, niente di più. Le emote (di Twitch e del canale) viaggiano
come nome → indirizzo https; la pagina scrive il testo con `textContent`, e un
messaggio con dell'HTML resta testo. Tetti: 300 lettori per canale, 3000 in
tutto; un commento ogni 25 s tiene viva la linea dietro i proxy. Le righe
stanno solo in memoria: un riavvio le perde, e la pagina riparte dai nuovi.

## L'accesso con Twitch

Un permesso solo: `user:write:chat` (scrivere in chat a nome tuo). Chi è lo
dice Twitch col token (validate), senza chiedere l'email né altro. Niente
permessi per Bit o punti: **Twitch non lascia spenderli fuori da Twitch**,
né con le API né con la chat incorporata, quindi chiederli spaventerebbe e
basta.

- `GET /u/<login>/colpo/accedi` mette nella sessione `colpoFlow` (state,
  canale, ora) e manda su Twitch. Il ritorno passa da `/auth/callback`,
  l'unico indirizzo registrato, che riconosce il flusso **dallo state**: un
  accesso lasciato a metà non ruba il ritorno al login dello streamer.
- Il token sta **solo nella memoria del server** (`colpi-accesso.js`): il
  cookie della sessione è firmato ma si legge, quindi lì va solo una chiave
  casuale. Rinnovo a 5 minuti dalla scadenza; la chiave dura un giorno; al
  massimo 5000 spettatori. Un riavvio li perde: si rientra con un clic.
- `POST /u/<login>/colpo/chat` scrive col token dello spettatore e l'API
  `Send Chat Message`: ban, AutoMod, chat per follower li applica Twitch, e
  la pagina mostra il suo motivo. Tetto per spettatore. Un 401 chiude
  l'accesso.
- `POST /u/<login>/colpo/esci` toglie chiave e token. Il cookie è
  `SameSite=lax`: un altro sito non può né scrivere né far uscire.
- Con l'accesso la pagina non chiede il nome: il colpo porta il nome Twitch
  (se lo streamer mostra i nomi).

## Il pannello

Scheda «Pew» in «Scena e overlay»: pagina aperta e pausa,
indirizzo da copiare, listino, regole, zone protette disegnate trascinando sul
quadro, gli ultimi colpi e gli avvisi (conto per gli euro mancante, premi che
Twitch non ha creato, col motivo).

Il riquadro «La pagina» dice da dove viene l'aspetto (la pagina link) con un
tasto che apre direttamente la sua scheda «Aspetto», e ha titolo e
sottotitolo (`colpi.titolo`, `colpi.dida`, 80 e 200 caratteri). Vuoti, la
pagina usa quelli di serie nella lingua di chi la apre; il sottotitolo di
serie promette «col tuo nome» solo se i nomi sono accesi. Il premio a punti
canale dice anche che con l'accesso a Twitch va bene qualunque testo.

## Collaudo

- `test/unita/colpi.test.mjs`: modello, servizio sul registro vero, porta.
- `scripts/verifica-colpi.mjs` (`--selftest`, `--rompi=N`): nel browser,
  dalla pagina all'overlay. I difetti: strato che prende sempre i clic, pagina
  che non guarda le zone, ombra senza grandezza, overlay che non centra, che
  non dice «visto», che mostra due volte un rinvio, pagina che lascia pagare a
  diretta ferma, chat che scrive l'HTML di un messaggio, modulo per scrivere
  a chi non ha l'accesso. Ognuno, da solo, fa rosso. Prova anche il tema
  (l'accento è quello della pagina link), l'accesso, la mira legata allo
  spettatore e il suo cheer senza codice.
- `test/unita/colpi-chat-accesso.test.mjs`: la riga (colore, emote https),
  i tetti della chat, la chiave dell'accesso (rinnovo, scadenza, niente token
  in `chi`), il messaggio verso l'API di Twitch e i suoi rifiuti; il ponte
  (una volta sola, scadenza, canale e segno giusti).
- `test/unita/colpi.test.mjs` prova anche `urlPaginaColpo`, il canonico e il
  `parent` del lettore col nome corto; `test/contratto/colpi-pew.test.mjs`
  fissa come il server li usa: la traduzione di `/<canale>` e di niente altro,
  la radice, la sonda e il nome nel Caddyfile, l'accesso che parte dal sito col
  segno e torna col biglietto, il segno preso dalla sessione e mai dalla
  richiesta, l'indirizzo scritto in un posto solo. Il giro dell'accesso fra due
  nomi veri (con un certificato per ciascuno) non si prova qui: si prova in
  produzione, appena il nome risponde.
- Le categorie e le monete: `colpi.test.mjs` (le categorie di serie e quelle
  dello streamer, la categoria di un colpo, il comando in chat; le monete
  tutte o niente, solo a colpo consegnabile, una volta sola, rese tali e quali
  se il colpo non compare; la porta che le chiede con l'accesso e solo per la
  propria mira), e `verifica-colpi.mjs` nel browser (i filtri, il comando
  scritto senza accesso, «Paga» che toglie le monete e fa partire il colpo),
  con un difetto suo (la categoria che non filtra).
- L'anteprima e la presenza: `colpi.test.mjs` (il modello della presenza, il
  servizio sul registro vero: una per diretta, il tetto suo, le stesse domande
  di un colpo, la ronda che la lascia; la porta che dà all'anteprima quello che
  avrebbe l'overlay, senza la sua chiave), `presenze.test.mjs` (la presenza
  dichiarata conta al giro dopo, sulla diretta di quel giro),
  `test/contratto/colpi-presenza.test.mjs` (il bot e il server), e
  `verifica-colpi.mjs` nel browser, con due difetti suoi (anteprima che ignora
  il punto, anteprima che non dice di essere un'anteprima).

## Limiti noti

- L'ombra presume l'overlay a 1920×1080 (la misura di OBS e dello Studio).
- «Mostrato» lo dice l'overlay: se in OBS la sorgente è attiva ma coperta da
  un'altra, o il programma non trasmette, l'overlay non lo può sapere.
- Fuori da OBS (altri programmi di regia) «pronto» vuol dire scheda visibile.
- I Bit e i punti restano su Twitch (vincolo di Twitch): l'accesso toglie il
  codice, non il passaggio dalla chat o dal premio.
- Un riavvio fa rientrare gli spettatori (il token non si salva, apposta).
