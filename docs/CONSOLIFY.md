<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->

# CONSOLify — i tasti del canale

Due superfici, **un solo registro**: la webapp (CONSOLify) e uno tastiera fisica fisico
guardano la stessa cosa.

## Cos'è davvero uno tastiera fisica (e cosa non è)

Dalla ricerca, tre cose che cambiano il disegno:

1. **Non è una tastiera di scorciatoie.** Un tasto *dice cosa fa* e si aggiorna in
   tempo reale. Senza lo stato sul tasto avremmo fatto una pulsantiera. Per questo
   ogni azione porta con sé `mostra` — la riga corta da stampare — e chi la esegue
   risponde con quella.
2. **La struttura è a quattro livelli**: azione → multi-azione (più cose in fila,
   con attese) → cartella (un tasto che apre un secondo strato) → pagina/profilo
   (layout che cambia col contesto). Sui modelli nuovi ci sono manopole.
3. **Non serve pubblicare un plugin su Elgato.** Plugin generici (API Ninja di
   BarRaider, tastiera-api-request) fanno una chiamata HTTP e mostrano la
   risposta sul tasto. Una porta HTTP copre tastiera fisica, Bitfocus Companion, Touch
   Portal, Loupedeck e il browser di un telefono — oggi, senza dipendere da nessuno.

## Il registro si ricava, non si scrive

Un elenco di bottoni scritto a mano sarebbe un **secondo** elenco accanto a quello
dei contatori, e i due si scollerebbero al primo contatore nuovo. Perciò
`azioni(canale)` si ricava da ciò che il canale ha davvero: **aggiungi un contatore
e i suoi tasti compaiono da soli**, con la sua emoji e il suo passo.

Oggi il registro copre:

- **contatori** — `+passo`, `−passo`, `azzera`, con l'emoji del contatore e il
  numero di adesso sul tasto;
- **effetti** — uno per ogni effetto del canale, con l'icona che segue il tipo
  (suono, immagine, video). Lo spara il **motore vero**, quello che userebbe la
  chat: un secondo modo di mandare un effetto sarebbe un secondo posto dove rompersi;
- **battuta** — ne dice una, e la segna come detta (se no il suo schema non impara);
- **dì** — l'unico tasto che porta con sé del testo, passato come `?testo=`.

Clip, pubblicità e comandi di chat arrivano dopo, **derivati** allo stesso modo. Lo
scudo no: non è un interruttore, è tutta la macchina antibot, e merita un pezzo suo.

## Una battuta si dice in un posto solo

Chat, iniziativa del bot, tasto della console: la sequenza è sempre la stessa —
prima il serbatoio (che pesa riposo e presa sul pubblico), se è vuoto la si
**costruisce** con la materia del canale, poi si dice e si segna che è stata detta,
che apre la finestra in cui si contano le risate. Sta in `battute.diUna()`. Tre
copie avrebbero voluto dire che prima o poi una si dimentica di segnare, e quella
battuta non impara più niente.

### Un campo che non esisteva

La prima versione dava ai tasti degli effetti il titolo `e.etichetta || e.comando`.
Un effetto **non ha** un'etichetta: ha il comando con cui lo chiama la chat e il
tipo. Quella riga sembrava scegliere un nome e cadeva sempre sul ripiego. Ora il
titolo è `!comando`, che è il nome vero.

## Un contatore cambia in un posto solo

Chat, premio riscattato, tasto della console: la spinta arriva da tre parti, ma le
cose che succedono sono le stesse tre — il numero sale, il bot lo dice, il widget a
schermo si aggiorna. Stanno in `contatori.cambia()`. Tre copie avrebbero voluto dire
che prima o poi una dimentica il widget, e nessuno se ne accorge finché non guarda.

## La porta

    GET|POST  /api/console/:login/:azione?key=…     → esegue, risponde {ok, mostra}
    GET       /api/console/:login?key=…             → il registro + lo stato di adesso

Non chiede una sessione: uno tastiera fisica non sa tenere un cookie. Chiede la
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

## Sullo tastiera fisica fisico

Un tasto con un plugin HTTP generico, metodo `GET` o `POST`, e l'indirizzo che la
dashboard ti dà già pronto. Il plugin stampa la risposta sul tasto: dopo la
pressione il tasto mostra il numero nuovo. Icona, nome e tutto il resto si scelgono
sulla tastiera, come per qualunque altro tasto.

Lo stesso indirizzo funziona in Companion, Touch Portal, Loupedeck e da un telefono.

## La plancia (la webapp)

Sta in **Durante la diretta → CONSOLify**. Una griglia di tasti, con pagine, e ogni
tasto scelto da te: quale azione, che nome, che icona, che colore.

- **La griglia si adatta da sé.** Tre per riga su un telefono in verticale, molti di
  più su un monitor. Questa cosa si usa **col telefono in mano mentre streammi**,
  non seduti davanti alla dashboard.
- **Il tasto risponde subito**: si abbassa quando lo premi, e la riga sotto mostra
  com'è andata — il numero nuovo, o che non è andata. Quella riga si tiene lo spazio
  anche da vuota, se no la griglia salta a ogni pressione.
- **In modifica non spara.** Mentre stai sistemando i tasti, premerne uno non manda
  niente in chat.
- **Un ascoltatore solo**, appeso una volta al contenitore. La plancia si ridisegna a
  ogni pressione: riappendere i gestori a ogni disegno vuol dire che prima o poi si
  appendono due volte e un tasto spara due colpi.

### Il filtro che avrebbe reso la sezione inerte

La prima versione filtrava gli eventi su `#pannello-consolify`. Quel contenitore non
esiste: i pannelli si chiamano `scheda-<id>`. Il filtro non avrebbe agganciato
niente e **nessun tasto avrebbe mai risposto** — una sezione intera morta, senza un
errore da nessuna parte, di quelli che si scoprono solo aprendo la pagina. Una prova
tiene fermo che il filtro punti al contenitore vero.

## Quello che la plancia non si fida di ricevere

Il salvataggio **ripulisce in ingresso**: nomi e icone tagliati, colori solo se sono
colori, pagine e tasti con un tetto. E soprattutto: **un tasto che punta a un'azione
che non esiste più non si salva**. Un contatore cancellato lascerebbe un bottone che
sembra fare qualcosa e non fa niente quando lo premi — peggio di un buco.

## Sullo tastiera fisica, in pratica

La scheda ti dà **gli indirizzi delle tue azioni**, già scritti, uno per tasto, con
il bottone per copiarli. Non un esempio generico da adattare: il tuo.

Sulla tastiera: aggiungi un tasto con un componente che fa chiamate web, incolli
l'indirizzo, e scegli icona e nome lì — perché lì, icona e
nome, sono roba di tastiera fisica e si personalizzano meglio che da noi. Il plugin
stampa la risposta sul tasto, quindi dopo la pressione leggi il numero nuovo.

Se un indirizzo finisce in una clip o in uno screenshot: **rigenera la chiave**. Gli
indirizzi vecchi smettono di funzionare all'istante e vanno rifatti — è il motivo
per cui il bottone c'è.
