# CONSOLify — memoria di lavoro

> Salvaposto: se la sessione si interrompe, si riprende da qui.

## Cosa ha chiesto il direttore
Supporto per **tastiera fisica fisico** (scorciatoie da mettere sui tasti, con TUTTO
personalizzabile: icone, nomi, il resto) **e** una parte della webapp che faccia da
tastiera fisica per chi non ce l'ha, con un nome suo: **CONSOLify**.
Deck fisico: si parte dalla **porta HTTP**, subito.

## Cosa ho imparato dalla ricerca (e non avrei indovinato)
1. **Non e' una tastiera di scorciatoie.** Un tasto tastiera fisica MOSTRA cosa fa e si
   aggiorna in tempo reale. Senza stato sul tasto e' una pulsantiera, non un deck.
2. **Quattro livelli**: azione → multi-azione (piu' cose in fila, con attese) →
   cartella (un tasto che apre un secondo strato) → pagina/profilo (layout che
   cambia col contesto). Sui modelli nuovi ci sono manopole (ruota + premi).
3. **Non serve pubblicare un plugin su Elgato.** Plugin generici (API Ninja di
   BarRaider, tastiera-api-request) fanno una chiamata HTTP e MOSTRANO la
   risposta sul tasto. Quindi una porta HTTP copre tastiera fisica, Companion, Touch
   Portal, Loupedeck e un telefono — oggi, senza dipendere da nessuno.

## Il modello
Il deck non e' una funzione: e' una **proiezione**. Il bot sa gia' fare molte cose;
scrivere a mano una lista di bottoni creerebbe un secondo elenco che si scolla dal
primo (il difetto di tutta la giornata). Percio':

**UN registro di azioni, DUE superfici.** E il registro si RICAVA:
- dai comandi: `comandi-registro.elenco(canale)` (id, nomi, titolo, acceso, livello);
- dai contatori: `contatori.list(canale)` → «+1», «-1», «azzera», e il tasto MOSTRA
  il valore (e' li' che sta il valore di un deck);
- dagli effetti: sparane uno sull'overlay;
- piu' poche azioni fisse: clip, pubblicita', scudo on/off, battuta.
Un contatore nuovo o un comando rinominato compaiono da soli: nessuna lista da
tenere allineata.

## La porta
- chiave per streamer nelle impostazioni (`consoleKey`), sul modello collaudato di
  `overlayKey`, PIU' revoca (rigenerala) e limite di frequenza: qui non si guarda,
  si agisce.
- `POST|GET /api/console/:login/:azione?key=...` → esegue e risponde
  `{ok, mostra}`; `mostra` e' la riga corta da stampare sul tasto.
- `GET /api/console/:login?key=...` → il registro delle azioni + lo stato di adesso
  (lo consuma anche CONSOLify).

## Stadi
- [x] Ricerca + modello + piano
- [x] A: registro derivato (contatori) + porta HTTP + chiave/revoca/limite/tempo costante
- [x] A2: effetti (dal motore vero), battuta (via `battute.diUna`), «di'» con testo
- [ ] A3: clip, pubblicita', comandi di chat. Lo SCUDO no: non e' un interruttore,
      e' la macchina antibot — merita un pezzo suo, non un tasto frettoloso.
- [x] B: CONSOLify — griglia adattiva, pagine, tasti personalizzabili (azione, nome,
      icona, colore, testo), stato sul tasto, indirizzi pronti per lo tastiera fisica
- [x] B2: EDITOR COMPLETO — icona da elenco nostro o IMMAGINE SUA caricata (con
      indirizzo pubblico, serve fuori dal sito), colore libero oltre ai preset,
      trascinamento per ordinare, colonne, duplica, sposta di pagina, conferma per
      tasto, e le scorciatoie della tastiera fisica che si COSTRUISCONO (prima
      quella di «di' una frase» non portava la frase: da li' non diceva niente)
- [ ] B3: cartelle (un tasto che apre un secondo strato) e multi-azione (piu' cose
      in fila, con attese) — sono due dei quattro livelli veri di una tastiera
- [ ] POPUP DELLE NOVITA': all'ingresso, se ci sono novita' dall'ultima volta, si
      apre un riquadro con QUELLE — e l'elenco di tutte quelle che si e' perso.
      Si ricava da NOVITA.md (la fonte c'e' gia': niente secondo elenco). Serve
      ricordare per utente fin dove ha letto (una data nelle sue impostazioni).
- [ ] C (dopo): plugin ufficiale .sdPlugin, se serve davvero

## Fonti
- Elgato: cos'e' una tastiera di comando, multi-azioni, cartelle, profili, SDK/azioni.
- API Ninja (BarRaider) e tastiera-api-request: chiamata HTTP dal tasto.
- Alternative viste: Bitfocus Companion, Touch Portal, Deckboard, WebDeck, SAMMI.

## Difetti trovati costruendo A (per memoria)
- `chiave()` per un canale che NON esiste ne generava una nuova a ogni chiamata:
  `setSettings` su una riga che non c'e' non scrive niente, e la funzione tornava
  una chiave fresca fingendo di averla salvata. Nessuna chiave emessa avrebbe
  combaciato con se stessa — e in produzione non si sarebbe visto mai, perche' lo
  streamer c'e' sempre. Ora se il salvataggio non attecchisce torna `null`.
- Il contatore cambiava in due posti (chat e premio riscattato): ora in uno solo,
  `contatori.cambia()`, che fa le tre cose insieme (numero, chat, widget).
- `e.etichetta` sugli effetti: campo che NON esiste (le colonne sono comando, tipo,
  file, tier, cooldown, volume, durata). La riga sembrava scegliere un nome e cadeva
  sempre sul ripiego.
- La sequenza «pesca, se no costruisci, dilla, segnala» stava in due punti e stava
  per diventare tre: ora in `battute.diUna()`.
- Il filtro degli eventi puntava a `#pannello-consolify`, che non esiste (i pannelli
  si chiamano `scheda-<id>`): la sezione sarebbe stata INERTE, nessun tasto avrebbe
  risposto, e senza un errore da nessuna parte.

## Regole assolute imparate qui (stanno in CLAUDE.md)
- **Niente emoji** nella grafica: le icone si disegnano e stanno in `ICO`.
- **Tutto e' modificabile, con un editor completo.** Se il prodotto lo mostra, si
  deve poter cambiare da dentro. Un elenco che si guarda e basta e' non finito.
- **Le icone: le nostre SEMPRE piu' la sua.** Immagine caricata da lui, con
  indirizzo pubblico, perche' la stessa faccia serve anche fuori dal sito.
- **Niente marchi altrui**: non siamo partner di nessuno. Si descrive la cosa per
  quello che fa («una tastiera fisica di comando»), non col nome di un prodotto.

## Difetti trovati guardando l'interfaccia (non ragionandoci)
- `var(--tratto)` e `var(--carta)` NON ESISTONO: il browser buttava via bordo e
  sfondo, e i tasti erano etichette che galleggiavano. Avevo scritto l'interfaccia
  senza mai aprirla.
- `direction: rtl` sull'indirizzo mostrava la CODA, cioe' la chiave, in chiaro.
- `.cons-scheda label` (due classi) batteva `.cons-spunta` (una): la spunta usciva
  in colonna. E il selettore di colore prendeva 784px invece di 32. Trovati
  chiedendo al browser le proprieta' calcolate, non guardando il CSS.

## Giro di lettura sul lavoro non ancora committato (indirizzo per tasto + formati)

Difetti trovati LEGGENDO, prima di far girare qualunque cosa. Tutti della stessa
famiglia: una riga che sembra fare qualcosa e non fa niente.

1. **«Rigenera la chiave» non era attaccato a niente.** Il bottone c'era, il giro
   guidato ci puntava, il testo prometteva «quello vecchio smette di funzionare
   all'istante» — e premerlo non faceva nulla. La rotta esisteva gia'.
2. **Un tasto senza indirizzo.** Un tasto appena aggiunto (o duplicato) non ha
   ancora un id: il suo indirizzo veniva fuori `/tasto/?key=…` e premerlo
   scriveva a vuoto. Per costruzione: la rotta di salvataggio RESTITUISCE gia' la
   plancia ripulita, con gli id assegnati — ora quella e' l'unica plancia che il
   pannello tiene. Non esiste piu' uno stato in cui a video c'e' un tasto che il
   server non conosce.
3. **Il testo scritto e non ancora salvato spariva.** Nome, frase e carattere
   vivevano solo nel DOM fino a «Salva»: bastava scegliere un colore o un'icona e
   il pannello si ridisegnava buttandoli. Per costruzione: i campi si depositano
   nel modello al `change` (che scatta all'uscita dal campo, PRIMA del click sul
   bottone accanto), quindi non esiste piu' roba non depositata da perdere. Il
   bottone «Salva» non aveva piu' niente da fare: tolto.
   Corollario: al `change` di un campo di testo NON si puo' ridisegnare tutto —
   il click che sta arrivando cadrebbe su un nodo staccato e non scatterebbe mai.
   Si aggiorna sul posto solo la scritta del tasto.
4. **Marchi altrui nelle lingue straniere.** L'italiano era gia' stato ripulito,
   inglese e spagnolo no: nomi di prodotti di altre aziende ancora scritti nel
   pannello e nel manuale. Regola assoluta, valeva per tutte e tre le lingue.
5. **«tastiera fisica» dentro le frasi inglesi e spagnole**: italiano colato
   nelle altre lingue.
6. **Due elementi con lo stesso id `cons-occhio`** quando scheda ed elenco sono a
   video insieme.
7. **Il «+» su ogni buca vuota** prometteva un posto che non si poteva occupare:
   la lista dei tasti e' compatta, l'unico buco riempibile e' il primo.
8. **L'elenco degli indirizzi non si aggiornava mai** dopo il caricamento: un
   tasto creato dopo non compariva li' sotto fino a un aggiornamento di pagina.
9. `scAperta`: campo di stato che nessuno legge.
10. «non salvato» restava scritto per sempre anche quando poi andava bene.

## E poi guardando la finestra delle novità

11. **Ogni finestra modale usciva nell'angolo in alto a sinistra.** Il browser
    la centra da solo — mette `margin: auto` a un `<dialog>` aperto con
    `showModal()` — ma la sveltina in cima al foglio di stile,
    `* { margin: 0 }`, gliela toglieva. Non era un difetto della finestra delle
    novità: era di tutte, comprese quelle che nasceranno domani. Rimesso il
    centro una volta sola, subito dopo la sveltina.
    Trovato misurando `getComputedStyle`, non leggendo il CSS: le due regole
    stanno in due punti lontani del file e a leggerle sembrano andare d'accordo.

## Il formato di partenza (segnalato dal direttore: «non mi pare ci sia la griglia»)

12. **Si partiva da «libero», cioe' dal foglio bianco.** La richiesta era
    l'opposto: si sceglie un formato «cosi' che l'utente parta con un layout
    grafico ed e' gia' avvantaggiato». Il commento sopra al codice lo diceva
    perfino — «si parte gia' con una disposizione» — e tre righe sotto il valore
    di partenza era `{0,0}`. Chi apriva CONSOLify trovava una frase al posto
    della plancia.
    **La causa vera non e' la distrazione: e' che `{0,0}` significava DUE cose** —
    «libero, l'ho scelto io» e «non ho capito cosa mi hai dato, ripiego». Un
    valore che dice due cose prima o poi dice quella sbagliata. Ora il ripiego e'
    `FORMATO_INIZIALE` (3x4) e `{0,0}` vale solo se qualcuno l'ha scelto davvero.
13. **A plancia vuota si vedeva o la griglia o il consiglio, mai tutti e due.**
    Con un formato scelto comparivano dodici caselle tratteggiate e nessuna
    parola; senza, una parola e nessuna casella. Ora la griglia c'e' e sotto c'e'
    scritto che farci.
14. **Il consiglio diceva «premi Modifica i tasti» anche a chi era GIA' in
    modifica.** Mandare qualcuno a premere un bottone che ha gia' premuto e' il
    modo piu' rapido per fargli credere che il pannello sia rotto.

**Cosa NON ho fatto, e perche'.** Chi ha gia' salvato una plancia con `{0,0}`
resta su «libero»: da qui non posso distinguere il «libero» scelto da quello
ereditato — il vecchio codice scriveva lo stesso identico valore per tutti e due.
Riscrivere in silenzio la preferenza di qualcuno per far tornare i conti sarebbe
peggio del difetto. Si cambia dalla tendina, un clic.

## I tasti si vedono (segnalato: «non sono distinguibili, ne' in light ne' in dark»)

15. **I tasti erano costruiti con token che il sito non usa.** `1px solid
    var(--border)` e `var(--om-s)`, mentre tutto il resto vive su `--tratto-mano`
    (spessori diseguali, tratto a mano), `--ang-mano` (angolo storto) e
    `--ombra-ink`. Un pezzo che non parla la lingua del posto non e' «piu'
    sobrio»: e' estraneo, e sparisce su tutti e due i fondi. Rifatti sui token
    veri, i due temi li seguono da soli.
16. **Un posto libero e' un POSTO, non un tasto spento.** Stesso tratto e stesso
    angolo, ma tratteggiato, senza ombra, piu' tenue: si vede che li' ci sta
    qualcosa e si vede che non c'e' ancora.
17. **La fascia del colore stava SOPRA il bordo** e sembrava una riga che
    galleggiava staccata. Ora e' dentro al tasto, sotto il tratto.

E per la seconda volta in questa sessione ho scritto commenti dentro un file che
si legge con F12. Il cancello mi ha fermato al push. Le spiegazioni stanno qui.

## Il suono che non si sente (segnalato: «compare il nome ma non si sente nulla»)

Prima ho seguito tre piste e sono cadute TUTTE E TRE. Le scrivo perche' il valore
sta anche nell'aver escluso:
- **non e' l'autoplay del browser**: misurato con la politica normale e con
  quella che usa OBS, suona in tutti e due i casi;
- **non e' l'estensione mancante**: i suoni vengono salvati `.ogg` da `comprimi`,
  quindi il tipo di contenuto lo prende giusto;
- **non e' `mostra('effetti')`**: e' acceso di default (`!== false`).

**Il dato che ha chiuso il cerchio: «compare il nome».** In `suona()`
l'etichetta col comando sta FUORI dal `try` e parte sempre, anche quando l'audio
fallisce. Quindi «il nome compare» non dice niente sul suono — e' esattamente il
sintomo di un audio che non parte in una funzione che si annuncia comunque.

**Cosa NON so ancora, e perche' non lo sa nessuno.** Cinque punti facevano
`a.play().catch(() => {})` e `es.onerror = () => {}`. Bloccato dal browser, file
irraggiungibile, chiave scaduta, flusso caduto: da fuori erano la stessa identica
cosa, cioe' silenzio. Non era una diagnosi difficile: era una diagnosi
IMPOSSIBILE, per costruzione.

**Percio' la prima cosa da fare non era indovinare la causa, ma togliere la
condizione che rende impossibile saperla.** Ora c'e' un punto solo dove il suono
parte (`suonaUrl`), che:
- tiene un riferimento a chi sta suonando (un elemento audio senza riferimenti
  puo' sparire sotto i piedi a meta');
- ascolta anche `error` sull'elemento, non solo il rifiuto di `play()` — sono due
  fallimenti diversi e prima erano tutti e due muti;
- riporta il guaio al server, che lo scrive nell'osservatorio: una volta al
  minuto per tipo, perche' un overlay che sbaglia sbaglia in fretta.
Lo stesso vale per i video e per il flusso di eventi caduto.

Adesso una prova sola dice quale delle cause e', invece di farci tirare a
indovinare in due.

## Il video che esce nero e se ne va

Il dettaglio del direttore — «esce, mostra un fotogramma nero, e se ne va senza
ne' suonare ne' andare avanti» — ha aperto DUE ipotesi che spiegano lo stesso
sintomo, e nessuna delle due si puo' provare da qui:

1. **Il permesso di partire con l'audio.** Un media con audio non parte da solo
   finche' nessuno ha toccato la pagina: `play()` viene rifiutato, resta il primo
   fotogramma, non avanza, non suona. In OBS il permesso c'e', in una scheda del
   browser no.
   Attenzione: avevo gia' «escluso» questa causa misurandola in Chromium
   headless, che fa partire l'audio comunque perche' non ha una scheda audio.
   Era un surrogato sbagliato, e ne avevo tratto una conclusione che non
   reggeva. Misurare la cosa sbagliata e' peggio che non misurare: da' la stessa
   sicurezza senza la sostanza.
2. **Il timer che chiude il video.** `setTimeout(chiudi, durataMs(ev) + 600)`
   gareggiava col video stesso. Se la durata memorizzata era sbagliata (un
   effetto vecchio, uno copiato dalla libreria) il video veniva troncato — e se
   comincia con un secondo nero, quello che si vede e' un fotogramma nero che
   sparisce. IDENTICO al sintomo dell'altra causa.

**Sistemate tutte e due, perche' tutte e due sono difetti veri a prescindere da
quale stia mordendo adesso:**
- se il permesso non c'e', il video riparte MUTO invece di restare fermo (un
  video muto parte sempre) e lo dice: fermo e muto, fra le due, la peggiore e'
  ferma;
- la fine del video la decide il video: `loadedmetadata` da' la durata vera, e
  quella dichiarata diventa un pavimento, non un soffitto.

Lezione da tenere: **due cause diverse possono avere lo stesso identico
sintomo.** Sceglierne una perche' e' la prima che viene in mente e' esattamente
il "dado" che qui non si usa.

## «Se premo, deve partire» — il tasto che diceva «fatto» a vuoto

18. **`emit` esce zitto quando non c'e' nessun overlay collegato**
    (`if (!set || !set.size) return;`), ma `fire` restituiva `true` lo stesso.
    Quindi il tasto rispondeva «fatto» mentre in diretta non era andato niente.
    Non e' «a volte non parte»: e' un tasto che MENTE, ed e' peggio di un tasto
    che non c'e' — ti fa credere di aver mandato una cosa a chi ti guarda.
    La funzione per saperlo (`hasClients`) esisteva gia', usata altrove per
    «evitare lavoro inutile». Serviva solo guardarla prima di sparare.
19. **Saperlo dopo aver premuto e' troppo tardi.** Un banco di comando mostra lo
    stato della cosa che comanda: ora in cima alla plancia c'e' una spia, e si
    aggiorna a ogni pressione perche' un overlay puo' cadere mentre streami.

Da tenere: qui il difetto non era nel pezzo che «non funzionava», era nel pezzo
che **rispondeva bene**. Cercare il guasto dove il risultato e' negativo e'
naturale; questo stava dove il risultato era positivo e falso.

## L'interruttore che avevo spinto inerte (e la prova che me l'ha detto)

20. Avevo messo l'interruttore «tasti di CONSOLify» nella lista sbagliata. Ce ne
    sono TRE che devono dire le stesse cose — quella dell'editor overlay
    (`ovlElemento`), quella del pannello (`ELEM_OVL`) e quella del server
    (`ELEM_OVERLAY`) — piu' una quarta, `ELEMENTI()`, che e' un'altra cosa: tiene
    le POSIZIONI di cio' che si disegna. CONSOLify non si disegna da nessuna
    parte: e' un permesso, non un elemento con un posto. Nella quarta non ci va.
    Messo dove non serviva e non messo dove serviva, l'interruttore si sarebbe
    visto, si sarebbe potuto spegnere, e il server l'avrebbe buttato via al
    salvataggio: **inerte**. Lo stesso difetto che sto togliendo da stamattina,
    fatto da me, nel commit che lo toglieva.
    L'ha preso una prova che c'era gia' («l'elenco degli elementi e quello che
    l'overlay mostra dicono le stesse cose»). Non l'ho zittita: mi stava dicendo
    una cosa vera sul modello, cioe' che avevo confuso «cosa compare» con «cosa
    e' permesso».

## Il conto alla rovescia che parte da solo

21. Il modello del timer era gia' giusto e non l'ho toccato: si salva l'ISTANTE
    di scadenza, non un contatore che scorre, quindi niente puo' andare fuori
    sincrono fra server e sorgenti, e un riavvio non lo azzera.
    Aggiunto solo l'avvio: l'overlay che lo mostra, aprendosi, chiede al server
    di farlo partire. **Solo se non sta gia' andando**: due sorgenti aperte
    insieme chiederebbero tutte e due, e la seconda farebbe ripartire da capo un
    conto che chi guarda sta gia' leggendo. Chi arriva secondo non trova niente
    da fare, ed e' giusto cosi'.

## Perché l'anteprima funzionava e il tasto no

La domanda del direttore — «se funziona l'anteprima dall'editor overlay, perché
non deve funzionare l'effetto lanciato dalla consolify?» — e' quella che ha
chiuso il caso, perche' mette a confronto due strade di cui una funziona. La
differenza fra le due E' il difetto, e non c'era piu' bisogno di ipotesi.

Confrontate riga per riga:
- anteprima: `effects.emit(login, effects.payload(login, eff))`
- tasto:     `fire(...)` → `this.emit(ch, this.payload(ch, eff))`

**Identiche.** Quindi il difetto non poteva stare nell'invio: stava PRIMA, cioe'
nella richiesta che non arrivava mai fino li'.

22. **`plancia()` restituiva i tasti cosi' com'erano sul disco; solo
    `salvaPlancia()` li ripuliva.** Un tasto creato prima che esistessero gli id
    non ne aveva uno. Il suo indirizzo veniva fuori `/tasto/?key=…`, quella rotta
    non esiste, express faceva cadere la richiesta su `/:azione` con azione
    «tasto» e tornava «azione sconosciuta». Premevi e non partiva niente —
    mentre l'anteprima, che non passa di li', partiva benissimo.

**La regola violata: leggere e salvare devono dare la stessa identica cosa.** Se
la ripulitura sta solo su un lato, esiste uno stato — quello sul disco — che il
resto del codice non si aspetta e non gestisce. Ora la ripulitura e' una sola
funzione usata da tutti e due.

E l'id assegnato leggendo va SCRITTO, se no cambierebbe a ogni lettura e
l'indirizzo incollato sulla tastiera fisica varrebbe fino al prossimo
aggiornamento di pagina. La prova lo controlla tre volte di fila.

## La partitura (punto 1 del piano), fatta

Il direttore: «manca la totalita' della personalizzazione dei tasti, non esiste
nulla di cio' che ci siamo detti». Aveva ragione: avevo scritto il piano e poi
passato il tempo sui difetti, quindi il pezzo che toglie lo strozzo non c'era.

**Un tasto non e' piu' un puntatore a una cosa sola: e' una fila di passi.**
Verbi di questo giro: fare una cosa che hai gia' · dire una frase in chat ·
mandare il RISULTATO di un comando (non la scritta «!comando») · aspettare.

Tre decisioni che tengono in piedi il resto:

1. **La conversione dei tasti vecchi sta dove si RIPULISCE**, non in una
   migrazione a parte. Cosi' vale sia leggendo sia salvando, e non esiste un
   tasto a meta' del guado: `azione` diventa una partitura di un passo solo, e
   quel tasto continua a fare quello che faceva.
2. **Un passo che va storto non zittisce quelli dopo.** Se il terzo di cinque non
   riesce, gli altri quattro devono succedere: chi ti guarda ha gia' visto i
   primi due. L'esito pero' non finge — dice quanti ne sono riusciti e qual e' il
   primo che non ce l'ha fatta.
3. **Un passo che non si puo' fare viene TOLTO, non tenuto li' a fingere**, e se
   non ne resta nessuno sparisce il tasto: e' la stessa regola che gia' valeva
   per un tasto puntato a un'azione cancellata.

Il verbo «risultato di un comando» si appoggia al motore dei comandi vero
(`tryComando`) con un messaggio finto dello streamer, e manda quello che il
comando direbbe. Nessun secondo posto dove i comandi si possono rompere.

Restano dal piano: «manda questo» (media caricato sul tasto), le cartelle, il
compagno per le app di fuori. E i verbi titolo/categoria/musica, che hanno una
dipendenza in piu' e vanno fatti interi invece che accennati.

## Cercare i dispositivi dal browser: misurato, non supposto

Domanda del direttore: la webapp può cercare i dispositivi in rete, così anche
dal telefono si controlla la regia? Ho misurato invece di rispondere a naso, e
la strada è chiusa due volte, indipendentemente:

1. **Non esiste un modo di cercare.** `navigator.mdns` non esiste. USB, Serial e
   HID esistono ma parlano con cose attaccate al dispositivo, non con computer
   della rete. Non c'è un'API di scoperta perché una pagina che scandaglia la
   rete di casa sarebbe uno strumento di ricognizione, e i browser gliel'hanno
   tolto apposta.
2. **Anche sapendo l'indirizzo, non lo raggiunge.** Da una pagina in HTTPS:
   `ws://127.0.0.1:4455` e `ws://localhost:4455` passano; `ws://192.168.1.50:4455`
   e qualunque host esterno danno **SecurityError**. Il telefono non parla col
   computer della regia nemmeno se glielo scrivi tu.

Quindi la risposta non è «non l'ho fatto», è «non si può, e non è una cosa da
aggirare». E soprattutto: **non serve**, perché il ponte c'è già. Dal telefono
il tasto scena lo esegue il pannello aperto sul computer della regia.

## Il ponte che non veniva mai usato (difetto mio, del giro prima)

Costruito il ponte, `premiTasto` eseguiva i passi di regia **in locale sempre**,
senza chiedersi se questa pagina fosse quella collegata. Dal telefono OBS non
c'è: il passo falliva lì e il ponte — scritto, testato, funzionante — non veniva
mai interpellato. Il difetto di sempre: una riga che sembra fare una cosa e non
la fa.

Corretto per costruzione: la scorciatoia locale vale **solo se è questa pagina a
essere collegata**; altrimenti il passo prende la strada normale, quella che
passa dal server, che il ponte ce l'ha. Una riga sola, ma è la riga che decide
se il ponte esiste.

E due testi erano diventati **falsi** nel momento in cui il ponte è nato: il
suggerimento nella scheda regia e il manuale dicevano entrambi «dal telefono le
scene no». Riscritti: un browser non può cercare né raggiungere un altro
computer, ma il tasto scena dal telefono funziona passando dal pannello aperto
sulla regia — e se lì non c'è nessun pannello, il tasto te lo dice.
