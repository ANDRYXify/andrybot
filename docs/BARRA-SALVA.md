<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# Il riquadro «modifiche non salvate»

Il riquadro in basso nel pannello dice una cosa sola: **quello che hai
cambiato e non hai ancora salvato, e dove**. Questo documento spiega come lo sa,
perché il vecchio a volte mentiva, e cosa deve fare chi aggiunge una carta.

Il codice sta in `src/web/public/app.js`, da `SEL_SALVA` in giù. Lo stile sta in
`anime.css`, sotto `.sv-barra`. Il collaudo è `scripts/verifica-barra-salva.mjs`.

## Perché il vecchio sembrava «a caso»

Le cause, trovate leggendo il codice:

1. **Il «da salvare» era un interruttore appiccicoso.** Qualunque `input` o
   `change` lo accendeva. Niente lo spegneva, salvo salvare, annullare o
   cambiare scheda. Se rimettevi a mano com'era, restava acceso.
2. **C'era una regione sola, quella dell'ultima carta toccata.** Se cambiavi
   la carta A e poi la B, il riquadro indicava solo B. Salvando B, tutto
   risultava «pulito» e le modifiche di A si perdevano senza avviso, anche
   all'uscita.
3. **Premere Salva spegneva subito il riquadro**, prima di sapere com'era
   andata. Un errore di validazione o di rete lasciava il riquadro spento su
   modifiche perse.
4. **«Salva ed esci» aspettava 260 ms** e poi usciva comunque.
5. **«Resta qui» chiudeva e basta.** Non lasciava traccia di cosa era cambiato.
6. **Le spunte che si salvano da sole accendevano il riquadro.** Per esempio
   l'interruttore del bot, «Ascolto» e gli avvisi Discord: erano già salvate, ma
   risultavano «da salvare».
7. **I campi delle carte senza salva finivano sotto il salva di un'altra.**
   In «Conoscenza», scrivere una domanda nuova proponeva il salva della scheda,
   che non la salvava.
8. **«Annulla» ricaricava la scheda**, ma Grafiche, Pannelli e Kit non si
   ricaricano. Il riquadro spariva e lo stato restava cambiato.
9. **Salvare «Personalità» ridisegnava «Le frasi del bot»** e cancellava quello
   che ci avevi scritto senza salvare.
10. **I campi nati dopo la base si confrontavano per posizione.** Se cambiavi
    qualcosa e poi aprivi una parte a richiesta (un momento delle frasi), le due
    liste non avevano più la stessa lunghezza: la carta restava «da salvare»
    anche rimessa com'era, e «Annulla» ricaricava la pagina.

## Il modello

**Regione.** Una regione è il contenitore governato da un insieme di tasti
Salva:

- Per un campo, la regione si trova così:
  - si parte dal più piccolo antenato che contiene un salva;
  - si sale finché il genitore contiene gli stessi salva e non altri;
  - non si supera mai il confine di una `.carta`.
- Una carta senza salva non appartiene al salva di un'altra.
- Fuori dalle carte, il pannello fa da regione solo se ha un salva solo.
- Una carta che un salva legge pur stando altrove si lega con
  `data-salva-con="id-del-salva"`. Succede per le spunte di «Mandala» con la
  settimana e per lo scudo con le sue regole.

**Firma.** La firma di una regione è quello che il suo salva manderebbe:

- **I campi** della regione: valore, oppure spunta per checkbox e radio.
- **Lo stato JS** degli editor che non vivono nei campi, letto da
  `STATI_SALVA[id del salva]`:
  - `stato()` restituisce lo stato;
  - `completo: true` dichiara che lo stato *è* quello che il salva manda, e in
    quel caso i campi non contano;
  - `rimetti(v)` facoltativo, per «Annulla».
  - Esempi: Pannelli, effetti degli eventi, Grafiche, Kit, QR, pagina link,
    Discord, la modifica di un effetto pronto, il negozio e la regia.
- **Restano fuori**:
  - i campi di sola lettura, `type=search`, `type=file`;
  - quelli dentro `NON_SALVA` o `[data-si-salva]`;
  - quelli che escono (`.esce`);
  - quelli che si salvano da soli.

**Base.** La base è la firma un attimo **prima** che tu cominci a toccare la
regione da pulita.

- A ogni inizio di gesto vero dentro la regione la base si riprende, purché la
  regione non sia già da salvare e nessun cambiamento sia ancora da valutare.
  I gesti veri sono `pointerdown`, `keydown`, `focusin` e `dragenter`.
- Così un valore messo dal codice su una carta pulita, come un caricamento,
  diventa la base e non accende niente.

**La base è per campo**, legata al campo stesso e non alla sua posizione
(`_confronto`):

- un campo che c'era quando la base è stata presa ha come base il suo valore di
  allora;
- un campo ridisegnato al posto di uno sparito prende la base di quello che
  sostituisce, nell'ordine: è una carta che si ridisegna;
- un campo nato dopo, senza nessuno da sostituire, ha come base il valore con
  cui è nato. Una parte che si apre a richiesta si disegna da quello che è
  salvato, e un osservatore delle nascite (`_osservaNascite`, un
  `MutationObserver`) ne registra il valore nel momento in cui il campo entra
  nella pagina, prima che tu possa toccarlo;
- un campo che nasce già con una scelta non salvata, perché si disegna da uno
  stato JS in attesa (la tendina di un momento dopo «Per tutti i momenti»),
  dichiara da sé il valore salvato con `data-salvato`, nella forma di
  `_valoreCampo` (`'1'`/`'0'` per le spunte);
- un campo della base sparito senza nessuno al suo posto è un cambiamento, e
  «Annulla» non può rimetterlo: ricarica la pagina.

**Da salvare** vuol dire `firma ≠ base`, campo per campo (`_diversa`). Si ricalcola:

- dopo un `input` o un `change`;
- dopo `segnaDaSalvare(el)`, il segnale degli editor a stato JS;
- dopo un clic dentro una regione col suo stato completo;
- all'esito di un salvataggio.

Un clic in una regione fatta solo di campi non ricalcola niente. Un clic che
carica non è una modifica, e le parti che si aprono a richiesta aggiungono
campi senza che tu abbia cambiato nulla.

**Il segnale `segnaDaSalvare(el)`.**

- Se la regione ha una base, la ripensa.
- Se non ce l'ha e siamo dentro un gesto vero, la segna «da salvare a base
  ignota»: resta da salvare finché non salvi o annulli.
- Fuori da un gesto non fa niente, perché un caricamento non è una modifica.

**Campi che si salvano da soli.** Quando un `change` porta a una scrittura
(`POST/PUT/PATCH/DELETE`) nello stesso giro, e non c'è nessun salvataggio in
corso, quel campo esce dalla firma per sempre.

- Se la scrittura parte dopo un'attesa, il campo si marca a mano con
  `data-si-salva`. È il caso degli obiettivi, dei cartelli e dei testi degli
  avvisi Discord.
- Ora obiettivi e cartelli si salvano da soli anche quando li aggiungi o li
  togli.

## Il salvataggio conta solo se è andato

1. **Il clic.** Il clic su un tasto Salva, o su un tasto marcato
   `data-salva-anche` («Prova», «Fammi vedere», «Prova e salva»), apre un
   *filo* per ogni regione che contiene quel tasto. Il filo ricorda la firma
   del momento.
2. **Le scritture legate.** Ogni `api()` che scrive si lega al filo, se parte:
   - mentre il clic è in corso;
   - oppure mentre gira il `conErrore` che quel clic ha avviato. In quel caso
     il filo aspetta la fine del gestore, attese comprese.
3. **L'esito.** È salvato solo se è partita almeno una scrittura, tutte sono
   andate e il gestore non ha lanciato.
   - Se è salvato, la base diventa la firma di adesso: il pannello può aver
     ridisegnato la carta. Se però hai cambiato la regione durante il volo, la
     base resta quella del clic.
   - Se non è partito niente (validazione) o qualcosa è fallito, la regione
     resta da salvare.
4. **Nessun tempo a caso.** «Salva ed esci» aspetta l'esito di ogni filo. Se
   uno non va, non esce e ti porta alla carta.

## Cosa vedi

- **Riquadro.** Compare quando una regione da salvare ha il suo salva fuori
  vista.
  - Dice dove: «Modifiche non salvate in «Personalità»», oppure «in 2 carte».
  - Ha i tasti «Mostra», «Annulla» e i salva della carta (classe `sv-salva`).
  - La X lo mette da parte finché non cambi un'altra carta.
- **Segni.** La carta da salvare ha il bordo ambra (`.da-salvare-carta`).
  - Anche i campi cambiati hanno il bordo ambra (`.da-salvare`). Per una spunta
    si segna la sua etichetta, per una tendina il suo bottone.
  - I segni spariscono appena torni com'eri o salvi.
- **«Mostra» e «Resta qui».**
  - Aprono la parte nascosta, la `<details>` e la carta chiusa.
  - Portano al primo campo cambiato al centro dello schermo (quindi sotto la
    testata), lo fanno lampeggiare due volte e gli danno il fuoco.
  - Con «meno movimento» il lampeggio non c'è.
- **«Annulla».**
  - Rimette lo stato JS con `rimetti` e i campi uno per uno, poi controlla che
    la firma sia tornata quella di base.
  - Se una regione non si può rimettere sul posto, ricarica la pagina. Così
    non resta mai un riquadro spento su uno stato cambiato.
- **Uscire.** Vale per il cambio scheda, il cambio overlay e il contatore
  copiato.
  - La finestra elenca, per carta, i nomi dei campi cambiati.
  - «Salva ed esci» salva carta per carta e aspetta l'esito.
  - «Esci senza salvare» butta le modifiche.
  - «Resta qui» porta alla prima modifica.
  - Cambiare elemento dentro lo stesso editor chiede allo stesso modo, con
    «Salva e continua» e «Continua senza salvare». Vale per un altro articolo
    del negozio, un altro modulo o un altro effetto pronto da modificare.

## Cosa fa chi aggiunge una carta

- Un tasto che salva ha nell'id `salva` o `save`, oppure l'attributo
  `data-salva`. Un tasto che salva insieme ad altro ha `data-salva-anche`.
- Un campo che non è un'impostazione va dentro `[data-non-salva]` o usa
  `type=search`. Un campo che si salva da solo dopo un'attesa va dentro
  `[data-si-salva]`.
- Se il salva manda stato JS, registra `STATI_SALVA['id-del-salva']`. Se è
  tutto il carico, mettici `completo: true`.
- Se l'editor cambia lo stato senza un `change` (tasti, tela, righe aggiunte o
  tolte), chiama `segnaDaSalvare(el)` dopo il cambiamento, anche dopo un'attesa.
- Se l'editor carica un altro elemento nella stessa carta, chiede prima con
  `_primaDiCambiare(salva)` e dopo il caricamento chiama `_scordaRegione(salva)`.
- Se una parte a richiesta disegna un campo da uno stato JS non ancora salvato,
  il campo dice il suo valore salvato con `data-salvato`. Se si disegna da quello
  che è salvato, non serve niente: basta l'osservatore delle nascite.

## Prove

`scripts/verifica-barra-salva.mjs` gira su telefono e computer. Controlla:

- che rimettendo com'era non resti niente;
- che salvando una carta resti da salvare l'altra;
- che un salva fallito, o uno che non parte, lasci la carta da salvare, e che
  uno con attesa conti quando è andato;
- che un valore del codice diventi la nuova base;
- che una spunta che si salva da sola non resti da salvare, e che una carta
  senza salva non finisca sotto un'altra;
- «Annulla», la X, la finestra d'uscita con l'elenco, «Resta qui» (campo in
  vista, segnato, col fuoco) e «Salva ed esci» a rete giù e su;
- una parte che si apre dopo un cambiamento: rimettendo com'era la carta torna
  pulita, e «Annulla» rimette al posto anche i campi nati dopo (e quelli che
  dichiarano `data-salvato`) senza ricaricare. Se la pagina si ricarica, il
  cancello lo dice;
- i Pannelli: aggiungo e tolgo.

L'autoprova rimette il «da salvare» appiccicoso e pretende il rosso.
