<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->

# CONSOLify — i tasti del canale

Due superfici, **un solo registro**: la webapp (CONSOLify) e uno Stream Deck fisico
guardano la stessa cosa.

## Cos'è davvero uno Stream Deck (e cosa non è)

Dalla ricerca, tre cose che cambiano il disegno:

1. **Non è una tastiera di scorciatoie.** Un tasto *dice cosa fa* e si aggiorna in
   tempo reale. Senza lo stato sul tasto avremmo fatto una pulsantiera. Per questo
   ogni azione porta con sé `mostra` — la riga corta da stampare — e chi la esegue
   risponde con quella.
2. **La struttura è a quattro livelli**: azione → multi-azione (più cose in fila,
   con attese) → cartella (un tasto che apre un secondo strato) → pagina/profilo
   (layout che cambia col contesto). Sui modelli nuovi ci sono manopole.
3. **Non serve pubblicare un plugin su Elgato.** Plugin generici (API Ninja di
   BarRaider, streamdeck-api-request) fanno una chiamata HTTP e mostrano la
   risposta sul tasto. Una porta HTTP copre Stream Deck, Bitfocus Companion, Touch
   Portal, Loupedeck e il browser di un telefono — oggi, senza dipendere da nessuno.

## Il registro si ricava, non si scrive

Un elenco di bottoni scritto a mano sarebbe un **secondo** elenco accanto a quello
dei contatori, e i due si scollerebbero al primo contatore nuovo. Perciò
`azioni(canale)` si ricava da ciò che il canale ha davvero: **aggiungi un contatore
e i suoi tasti compaiono da soli**, con la sua emoji e il suo passo.

Oggi il registro copre i contatori (`+passo`, `−passo`, `azzera`). Effetti, clip,
pubblicità e comandi arrivano dopo, e arriveranno **derivati** allo stesso modo.

## Un contatore cambia in un posto solo

Chat, premio riscattato, tasto della console: la spinta arriva da tre parti, ma le
cose che succedono sono le stesse tre — il numero sale, il bot lo dice, il widget a
schermo si aggiorna. Stanno in `contatori.cambia()`. Tre copie avrebbero voluto dire
che prima o poi una dimentica il widget, e nessuno se ne accorge finché non guarda.

## La porta

    GET|POST  /api/console/:login/:azione?key=…     → esegue, risponde {ok, mostra}
    GET       /api/console/:login?key=…             → il registro + lo stato di adesso

Non chiede una sessione: uno Stream Deck non sa tenere un cookie. Chiede la
**chiave del canale**, e accetta anche `GET` perché i plugin HTTP generici partono
da lì — non è bello, ed è ciò che rende la cosa utilizzabile oggi.

Il guardiano è **separato da ciò che fa** e ha un nome (`guardiaConsole`) che sta
sulla riga della rotta. Un gestore che si controlla da dentro funziona ma non si
vede da fuori: `scripts/verifica-porte.mjs` legge la riga della rotta per sapere chi
la sorveglia, e una porta il cui guardiano non si legge è una porta che un domani si
dimentica. Il cancello ha bocciato la prima versione proprio per questo, e aveva
ragione: la risposta giusta non era dichiararla pubblica, era fare un guardiano vero.

Da questa porta **non si guarda: si agisce.** Quindi, a differenza della chiave
dell'overlay:

- **si revoca** (una chiave finita in una clip smette di funzionare);
- **c'è un tetto di frequenza** (40 al minuto per canale);
- il confronto è a **tempo costante**: due chiavi sbagliate ci mettono lo stesso
  tempo a essere rifiutate, se no la differenza racconta quanti caratteri erano
  giusti.

### Una funzione che non può mantenere la promessa lo dice

La prima versione di `chiave()` generava una chiave nuova **a ogni chiamata** per un
canale che non esiste: `setSettings` su una riga che non c'è non scrive niente, e la
funzione restituiva una chiave fresca fingendo di averla salvata. Nessuna chiave
emessa avrebbe combaciato con sé stessa — e in produzione non si sarebbe visto mai,
perché lo streamer c'è sempre. Ora, se il salvataggio non attecchisce, torna `null`,
e `chiaveOk` dice no.

## Sullo Stream Deck fisico

Un tasto con un plugin HTTP generico, metodo `GET` o `POST`, e l'indirizzo che la
dashboard ti dà già pronto. Il plugin stampa la risposta sul tasto: dopo la
pressione il tasto mostra il numero nuovo. Icona, nome e tutto il resto si scelgono
in Stream Deck, come per qualunque altro tasto.

Lo stesso indirizzo funziona in Companion, Touch Portal, Loupedeck e da un telefono.
