<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# Aggiornare senza perdere niente

Il bot si aggiorna mentre la gente lo usa: c'è chi è in diretta da OBS o dallo
Studio, chi ha il telefono collegato come fotocamera, chi sta scrivendo un
comando, e l'overlay è aperto in OBS giorno e notte. L'aggiornamento non deve
togliere niente a nessuno di loro.

La regola, decisa col proprietario: **a mano solo se in quel momento la pagina
è in uso. Finito l'uso (la diretta, la scrittura), l'aggiornamento è
automatico**, così al prossimo accesso o alla diretta dopo il bot è già nuovo.

## Il modello

Due metà, che si parlano solo con un file e un numero.

- **Il server** (`server/aggiorna.sh`, `src/in-onda.js`) si riavvia solo quando
  nessuno è in onda, e chiude da solo l'ultimo istante in cui qualcuno potrebbe
  partire.
- **Le pagine aperte** (`public/versione.js`) sanno con quale versione sono
  nate e si accorgono della nuova; decidono loro quando ricaricarsi, secondo
  l'uso.

## Invarianti

1. **Il server non si riavvia da solo mentre qualcuno trasmette**, da OBS o
   dallo Studio. Una diretta dallo Studio passa dal server: un riavvio la
   taglierebbe davvero, per questo conta da quando parte e verso qualunque
   destinazione, anche un RTMP proprio.
2. **Una pagina non si ricarica mai da sola mentre la si usa.** Lo dice, e
   offre «Aggiorna».
3. **Aggiornare a mano non perde niente.** Le modifiche da salvare si salvano
   prima (o si sceglie di lasciarle). La diretta continua con la scritta di
   riserva, e un tocco la riprende. Il telefono-fotocamera si ricollega da solo.
4. **Una pagina libera si aggiorna da sola, mai sotto gli occhi:** quando è
   nascosta, al prossimo cambio di scheda, o dopo un quarto d'ora senza tocchi.
5. **L'overlay in OBS non mostra mai riquadri e non si ricarica mai in
   diretta**, né con un alert o un effetto in scena.
6. **Un messaggio nuovo fra pagina e server si aggiunge e non cambia quelli di
   prima**, per almeno una versione: per qualche minuto una pagina vecchia
   parla col server nuovo.

## Chi è in onda (`src/in-onda.js`)

`data/.in-onda` è l'**unione** di tutte le fonti: le dirette delle piattaforme
(il bot, `_scriviInOnda`) e quelle dello Studio (il tramite,
`tramite.canali()`). Si riscrive nello **stesso giro** in cui una fonte cambia:
chi parte in diretta è nel file prima che la sua richiesta abbia una risposta.
Una diretta che ne sostituisce un'altra (riprendere con una codifica diversa)
si scrive una volta sola, alla fine: in mezzo il canale non manca mai.

## L'ultimo istante (`data/.riavvio`)

«Nessuno in onda», letto adesso, può essere già falso fra un secondo. Per
questo `aggiorna.sh` fa così:

1. **costruisce l'immagine nuova** mentre la vecchia gira. Prima la costruiva
   dopo l'attesa, e i minuti della costruzione erano una finestra in cui una
   diretta poteva partire e venire tagliata subito dopo;
2. **aspetta** che `data/.in-onda` sia vuoto (al massimo `ATTESA_MAX_MIN`);
3. **mette il segnale** `data/.riavvio`, lascia due secondi a chi stava
   partendo proprio allora, e **rilegge** il file;
4. se c'è qualcuno, toglie il segnale e torna al punto 2; se non c'è nessuno,
   riavvia.

Col segnale, `/api/diretta/avvio` non fa partire dirette **nuove** dallo
Studio: risponde 503 «aggiornamento», e lo Studio riprova da solo ogni tre
secondi per tre minuti, dicendo «il bot si sta aggiornando: la diretta parte
da sola». Il controllo sta subito prima di `tramite.avvia`, dopo ogni attesa
(la chiave di Twitch, quella di Kick): o la diretta è già nel file quando
`aggiorna.sh` lo rilegge, o viene rifiutata. Il segnale vale tre minuti al
massimo (uno script morto a metà non ferma le dirette per sempre), lo toglie
lo script uscendo e lo cancella il bot nuovo appena parte.

Restano fuori, e si sa: una diretta da OBS che comincia proprio in quei pochi
secondi (non passa dal server: per lei il riavvio sono pochi secondi di chat e
avvisi fermi), e `--subito`, che è per le emergenze.

## La versione

La versione è l'**impronta di tutto quello che una pagina aperta può avere
caricato**: ogni file di `public/` (passando da `impronte.di`, che ricalcola
solo quello che cambia) più i moduli che compone il server (le regole
dell'economia, del giro, della carta). Cambia se e solo se cambia un file
servito: un aggiornamento solo del server non disturba nessuna pagina.

Il server la scrive su **ogni risposta**, in `Server-Timing: sbv;desc="…"`.
È l'unica intestazione che una pagina sa leggere del suo stesso documento
(`performance.getEntriesByType('navigation')`): così la pagina sa con certezza
con quale versione è nata, anche se l'aggiornamento è caduto mentre si apriva
(documento vecchio, file nuovi). Dopo, ogni risposta che arriva dalla rete
(`PerformanceObserver`, escluse quelle dalla cache) le dice se il server è
cambiato, senza una chiamata in più. L'intestazione esce **dopo il cancello**:
chi non ha sessione e non bussa a una porta aperta non sa quale versione gira.

Per chiedere apposta: `/api/versione` (il pannello, con la sessione),
`/api/cam/versione` (il telefono-fotocamera, che una sessione non ce l'ha),
`/overlay/:login/versione` (le fonti di OBS, con la chiave del canale: dice
anche se il canale è in onda). Si chiede quando un flusso torna dopo una
caduta (un riavvio lo è sempre: il gancio sta in `flusso.js`), quando la
pagina torna visibile, quando torna la rete, e ogni dieci minuti.

## Le pagine

| pagina | in uso quando | libera: si aggiorna |
| --- | --- | --- |
| pannello e Studio | diretta o avvio, telefoni collegati, fotocamera/microfono/schermo accesi, modifiche da salvare, salvataggi in viaggio, una finestra aperta, un campo in cui si scrive | nascosta, al cambio di scheda (aprendo la scheda scelta), dopo 15 minuti senza tocchi |
| telefono-fotocamera (`/cam`) | collegato alla regia | nascosta, dopo 15 minuti |
| ascolto vocale (`voce.html`) | mentre ascolta | nascosta, dopo 15 minuti |
| overlay, tracking (OBS) | un alert o un effetto in scena | appena il canale non è in onda e la scena è libera |

Il riquadro «C'è una versione nuova del bot» dice cosa succede: «si aggiorna
da sola al prossimo cambio di scheda», o, se è in uso, «appena hai finito; se
vuoi, anche adesso». In diretta aggiunge che il pubblico vedrà per qualche
secondo la scritta di riserva. «Più tardi» lo chiude; l'aggiornamento
automatico resta. Sul telefono sta in alto, lontano dai tasti del pollice.

**«Aggiorna» a mano.** Con modifiche da salvare passa da «Hai modifiche non
salvate» (salva, lascia, resta). In diretta chiede conferma. Poi ricarica
senza un secondo «vuoi uscire dal sito?» del browser. Dopo il ricaricamento la
pagina sa da dove veniva (`sessionStorage`, cinque minuti): il pannello riapre
la scheda e lo scorrimento e dice «Bot aggiornato»; se era in diretta apre lo
Studio, dove la diretta risulta ancora in onda con la scritta di riserva, e
«Riprendi la diretta» riaccende fotocamera e microfono e la riprende senza
interruzioni sul canale (un tocco serve comunque: il browser vuole un gesto
per l'audio e la fotocamera). Lo stesso avviso ora esce anche sulla regia da
telefono, dove prima mancava. Il telefono-fotocamera si ricollega da solo,
con la sua chiave.

## Limiti onesti

- Fra l'arrivo del server nuovo e il ricaricamento, una pagina vecchia che
  carica un modulo pigramente lo riceve nuovo. Per questo vale l'invariante 6,
  e per questo una pagina libera si aggiorna presto.
- Una diretta da OBS che parte nei pochi secondi del cambio perde quei secondi
  di chat e avvisi (il video no: non passa da noi).
- La condivisione dello schermo dopo «Riprendi la diretta» la si risceglie a
  mano: il browser la chiede ogni volta.

## Il collaudo

- `test/unita/in-onda.test.mjs`: l'unione delle fonti, la diretta dello Studio
  nel file mentre nasce, la sostituzione senza buchi, il segnale.
- `test/contratto/aggiorna-senza-fermare.test.mjs`: l'ordine dello script
  (costruisci, aspetta, segnale, cambia) e il pezzo dell'attesa fatto girare
  così com'è scritto, con una diretta che parte nell'istante del segnale.
- `test/contratto/versione-sito.test.mjs`: la versione cambia se e solo se
  cambia un file servito; l'intestazione dopo il cancello; il rifiuto subito
  prima di `tramite.avvia`; ogni pagina che resta aperta carica `versione.js`
  prima di `flusso.js`.
- `scripts/verifica-aggiornamento.mjs` (Chromium): il pannello libero, in uso,
  in diretta, a mano, a cavallo dell'aggiornamento; l'overlay in diretta, a
  fine diretta, con un alert in scena. Una promessa che il collaudo non arriva
  a misurare esce rossa. `--selftest` rimette dieci difetti e li vuole visti
  tutti.
