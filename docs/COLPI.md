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
- `test/unita/colpi-pew.test.mjs`: l'indirizzo corto dal server vero, con le
  richieste fatte col nome `pew`: la pagina e le sue rotte, il `parent` del
  lettore, la radice, il giro completo dell'accesso fino alla chat scritta dal
  browser giusto, e il biglietto rubato che non fa entrare.

## Limiti noti

- L'ombra presume l'overlay a 1920×1080 (la misura di OBS e dello Studio).
- «Mostrato» lo dice l'overlay: se in OBS la sorgente è attiva ma coperta da
  un'altra, o il programma non trasmette, l'overlay non lo può sapere.
- Fuori da OBS (altri programmi di regia) «pronto» vuol dire scheda visibile.
- I Bit e i punti restano su Twitch (vincolo di Twitch): l'accesso toglie il
  codice, non il passaggio dalla chat o dal premio.
- Un riavvio fa rientrare gli spettatori (il token non si salva, apposta).
