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
- Elgato: cos'e' uno tastiera fisica, multi-azioni, cartelle, profili, SDK/azioni.
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
