# Le presenze: chi c'è, diretta dopo diretta

Le ore guardate dicono *quanto* uno ha guardato. Non dicono *quante volte* è
venuto, né se viene di fila: e la fedeltà è quella. Una persona che passa dieci
minuti a ogni diretta vale, per un canale, più di una che ne ha fatte otto di
seguito una volta sola. Questo modulo (`src/features/presenze.js`) conta quello.

## Il modello

**Una diretta** è una sessione live del canale. Al primo giro prende come
etichetta l'id dello stream che dà Helix. È una diretta nuova quando l'id è
diverso da quello corrente **e** sono passati almeno trenta minuti dall'ultimo
giro: un crash con riavvio entro mezz'ora è la stessa diretta (l'id cambia, la
serata no), e uno stesso id resta la stessa diretta anche dopo un buco lungo
(era giù il bot, non lo streamer). Lo stato sta in `dirette_viste`: la diretta
corrente, la precedente, l'ultimo giro. È una funzione pura sui dati che riceve
(`direttaDelGiro`).

**Una presenza** conta quando la persona compare nella lista di chi è in chat
in almeno due giri della stessa diretta, cioè dieci minuti, e conta una volta
sola per diretta. La lista è quella che Twitch dà ogni cinque minuti al giro
delle ore guardate: chi c'è e sta zitto conta, chi passa un minuto no, e non
c'è nessuna chiamata in più a Twitch. Chi esce e rientra ricomincia da zero i
due giri, ma se la diretta era già contata non si conta due volte. I bot noti
(la stessa lista delle ore) e lo streamer non contano.

**La serie** sono le dirette di fila. Presente a questa e all'ultima prima di
questa, la serie sale di uno; altrimenti riparte da uno. Il record resta. È il
confronto fra `ultima` della persona e `precedente` del canale: non c'è nessun
calendario, nessuna «settimana», nessuna finestra di ore da indovinare. Chi
salta una diretta lo sa.

**Il bonus** arriva quando la presenza viene contata: `bonus × min(serie,
tetto)`. Con i valori di base (10, tetto 10) sono 10 monete alla prima diretta,
30 alla terza di fila, 100 dalla decima in poi. Il tetto esiste perché una
serie da cento non deve diventare una rendita che schiaccia la classifica.
Ai traguardi (3, 5, 10, 25, 50, 100 di fila) il bot lo dice in chat, al più una
riga al minuto; se in uno stesso giro arrivano più traguardi, una riga sola.

## I saluti

Stanno sul primo messaggio che una persona scrive, non sulla presenza: un
saluto a chi non ha detto niente sarebbe un modo di dirgli che lo osservano.

- **Prima volta.** Su Twitch lo dice Twitch, col tag `first-msg` del messaggio:
  è la fonte giusta e non invecchia. Sulle altre piattaforme lo dice la memoria
  dei messaggi (nessuna riga e nessun messaggio prima di questo). Il saluto
  parte una volta sola per persona (`salutato`).
- **Ritorno.** L'ultimo segno di vita (ultimo messaggio o ultima presenza) è
  più vecchio di N giorni, ventuno di base.
- **Quello che ti sei costruito vince.** I Moduli hanno già l'innesco «primo
  messaggio»: se il canale ha un Modulo attivo su quell'innesco, il saluto di
  serie tace.
- **Niente raffiche.** Un raid porta cinquanta persone nuove in un colpo: un
  riposo di quarantacinque secondi fra un saluto e l'altro, e al più sei ogni
  dieci minuti. I comandi (`!…`) non fanno partire un saluto, e di base si
  saluta solo in diretta.

I due testi li scrive lo streamer, con `{user}`, `{giorni}`, `{serie}` e
`{dirette}`; un segnaposto sconosciuto resta com'è (è un testo suo, non un
errore da lanciare) e un testo vuoto spegne quel saluto. Le frasi di serie sono
neutre sul genere di chi arriva, perché non lo sappiamo.

## Dove si vede

- In chat: `!serie [@nome]` e `!classificaserie`, nel registro dei comandi
  (famiglia «Serie di presenze»: si spengono, si rinominano, si riservano come
  tutti gli altri). Nei Moduli: `$serie`, `$dirette`, `$recordserie`.
- Nel pannello: scheda Giochi, carta «Presenze e saluti» (bonus, tetto,
  annunci, i due testi, i giorni di assenza, solo in diretta); scheda Memoria,
  «Chi c'è sempre», i primi cinque per serie.
- Le impostazioni (`settings.presenze`) le normalizza `presenze.normalizza`,
  pura, chiamata dal server al salvataggio: quello che non arriva prende il
  valore di prima.

## Dati e diritti

Due tabelle con la colonna `channel`, `presenze` e `dirette_viste`: entrano da
sole nell'esportazione dei dati e nella cancellazione del canale
(`tabelleDiCanale()` le ricava dallo schema). Nessun dato nuovo su una persona
oltre a quando è stata vista: niente messaggi, niente contenuti.

## Il collaudo

`test/unita/presenze.test.mjs`: la diretta nuova e la ripresa, la presenza al
secondo giro e una sola volta, la serie che sale e riparte, il record, il
bonus col tetto, i traguardi e il loro riposo, i saluti (prima volta da tag,
ritorno, riposo, tetto, il Modulo che vince), i comandi, la normalizzazione.
`test/contratto/presenze.test.mjs`: il cablaggio nel bot, il registro e la
demo, il pannello, i manuali, la vetrina.
