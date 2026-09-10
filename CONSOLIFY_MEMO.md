# CONSOLify — memoria di lavoro

> Salvaposto: se la sessione si interrompe, si riprende da qui.

## Cosa ha chiesto il direttore
Supporto per **Stream Deck fisico** (scorciatoie da mettere sui tasti, con TUTTO
personalizzabile: icone, nomi, il resto) **e** una parte della webapp che faccia da
Stream Deck per chi non ce l'ha, con un nome suo: **CONSOLify**.
Deck fisico: si parte dalla **porta HTTP**, subito.

## Cosa ho imparato dalla ricerca (e non avrei indovinato)
1. **Non e' una tastiera di scorciatoie.** Un tasto Stream Deck MOSTRA cosa fa e si
   aggiorna in tempo reale. Senza stato sul tasto e' una pulsantiera, non un deck.
2. **Quattro livelli**: azione → multi-azione (piu' cose in fila, con attese) →
   cartella (un tasto che apre un secondo strato) → pagina/profilo (layout che
   cambia col contesto). Sui modelli nuovi ci sono manopole (ruota + premi).
3. **Non serve pubblicare un plugin su Elgato.** Plugin generici (API Ninja di
   BarRaider, streamdeck-api-request) fanno una chiamata HTTP e MOSTRANO la
   risposta sul tasto. Quindi una porta HTTP copre Stream Deck, Companion, Touch
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
- [ ] A2: altre azioni derivate — effetti, comandi, clip, pubblicita', scudo, battuta
- [ ] B: CONSOLify (griglia, pagine, cartelle, tasti personalizzabili, telefono)
- [ ] C (dopo): plugin ufficiale .sdPlugin, se serve davvero

## Fonti
- Elgato: cos'e' uno Stream Deck, multi-azioni, cartelle, profili, SDK/azioni.
- API Ninja (BarRaider) e streamdeck-api-request: chiamata HTTP dal tasto.
- Alternative viste: Bitfocus Companion, Touch Portal, Deckboard, WebDeck, SAMMI.

## Difetti trovati costruendo A (per memoria)
- `chiave()` per un canale che NON esiste ne generava una nuova a ogni chiamata:
  `setSettings` su una riga che non c'e' non scrive niente, e la funzione tornava
  una chiave fresca fingendo di averla salvata. Nessuna chiave emessa avrebbe
  combaciato con se stessa — e in produzione non si sarebbe visto mai, perche' lo
  streamer c'e' sempre. Ora se il salvataggio non attecchisce torna `null`.
- Il contatore cambiava in due posti (chat e premio riscattato): ora in uno solo,
  `contatori.cambia()`, che fa le tre cose insieme (numero, chat, widget).
