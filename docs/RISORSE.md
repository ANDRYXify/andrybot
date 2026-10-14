<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# Lo scudo delle risorse

Una macchina sola, 16 GB, tutto insieme: il bot (chat di tutti, alert, overlay,
storie, avvisi), il cervello col suo modello, il suo ambiente con un browser
vero, Caddy. Il difetto da cui nasce: il lavoro pesante non aveva tetti. Dieci
video caricati insieme erano dieci ffmpeg insieme, e chi ne pagava il conto era
chi non c'entrava: l'alert che arriva tardi, il comando che non risponde, la
storia che parte in ritardo.

## La regola

**Il lavoro si divide in due: vitale e pesante.** Il vitale non passa mai da
nessuna porta. Il pesante passa da una porta sola, che decide quanto ne entra
guardando quanto è carica la macchina.

Vitale (mai fermato, mai messo in fila):
- chat, comandi, moderazione, scudo anti-bot;
- alert, eventi dell'overlay, effetti, regia;
- storie, avvisi su Telegram e Discord, mail;
- pagamenti, accessi, salvataggi del pannello.

Pesante (passa dalla porta):

| classe | cosa | perché pesa |
|---|---|---|
| `media` | compressione dei caricamenti (immagini, video, suoni), emote, icone SVG, alleggerimento dei PNG | un ffmpeg per file |
| `video` | il video promo dell'amministratore | x264 lento, minuti di CPU |
| `ascolto` | l'ascolto delle dirette per le clip sui picchi | streamlink e ffmpeg per ogni diretta, per ore |
| `cervello` | quello che il bot chiede al cervello di sua iniziativa: distillare, riflettere, parlare per primo | il modello usa tutti i core |
| `diretta` | il tramite dello streaming (docs/DIRETTA.md), quando ci sarà: conterà la banda, non i lavori | banda in uscita per ore |

## Il livello della macchina

Tre livelli, presi dalla misura peggiore fra:

| misura | giallo da | rosso da | perché questa |
|---|---|---|---|
| ritardo del ciclo del bot (p99 su 5 s) | 100 ms | 250 ms | è il ritardo che vede un alert: la misura più diretta di tutte |
| pressione della CPU (`/proc/pressure/cpu`, some avg10) | 50 % | 80 % | quanto tempo i processi aspettano la CPU, di tutta la macchina |
| pressione della memoria (`/proc/pressure/memory`, some avg10) | 10 % | 30 % | la memoria che manca si vede qui prima che arrivi l'OOM |
| memoria disponibile (`MemAvailable`) | sotto 15 % | sotto 7 % | il margine prima che il kernel uccida qualcuno |
| carico per core (solo se la pressione non si legge) | 1,5 | 3 | ripiego per i kernel senza PSI |

Si sale subito; si scende solo dopo 30 secondi di calma sotto la soglia, così il
livello non sfarfalla. La misura si campiona di continuo (ogni 2 secondi), non solo
quando qualcuno chiede il livello: la calma si conta dal primo campione che la
vede, e dieci minuti di calma senza richieste devono valere dieci minuti.

## La porta

Ogni classe ha:
- un **tetto per livello** (quanti lavori nuovi possono girare insieme in verde,
  giallo, rosso; in rosso il pesante nuovo non entra);
- un **tetto a testa**: uno solo per persona, in corso o in fila. È questo che
  rende il pesante **non accumulabile**: chi carica dieci file insieme ne fa uno
  e gli altri tornano indietro subito, detti;
- una **fila corta**, con un'attesa massima. Oltre, il rifiuto è immediato, con
  il motivo detto in chiaro (503, non un errore di chi chiede).

La porta decide solo chi **entra**. Un lavoro entrato finisce: interrompere a
metà una compressione costa più che lasciarla finire. Fanno eccezione le classi
lunghe che sanno cedere (`ascolto`): in rosso si fermano, e ripartono da sole
quando torna il verde.

Il lavoro di fondo (`cervello`) non fa fila: se non c'è posto si salta, e
riprova al giro dopo. Una frase spontanea saltata non la nota nessuno; un alert
in ritardo sì.

## Corretto per costruzione

1. **Un processo nasce da un posto solo.** `child_process` si importa solo in
   `src/risorse.js`; tutti gli ffmpeg, ffprobe e streamlink nascono da
   `risorse.avvia()`. Un collaudo lo tiene fermo: un `spawn` nuovo fuori dalla
   porta è rosso.
2. **Chi nasce dalla porta nasce in fondo alla fila della CPU.** `avvia()` dà al
   processo la priorità bassa del kernel (nice 15). Anche quando entra, il
   pesante cede la CPU al bot da sé, senza che nessuno debba misurare.
3. **Il permesso si rende sempre.** `con()` lo rende nel `finally`; un permesso
   reso due volte non conta due volte.
4. **Il temporaneo si cancella anche se la porta dice no.** `comprimi()` cancella
   sempre il file caricato: anche il rifiuto passa da lì.
5. **Il bot è l'ultimo che il kernel uccide** e il primo che riceve la CPU
   quando la macchina è contesa (`oom_score_adj` e `cpu_shares` nel
   docker-compose). Il cervello non viene reso più fragile: è il bot a essere
   protetto di più.

## Nelle prove

Con `SB_COLLAUDO=1` la misura vera è spenta (livello verde fisso): una
macchina di collaudo carica non deve far fallire le prove degli altri. Le
prove della porta le danno le misure a mano. `SB_RISORSE_VERE=1` riaccende la
misura vera anche in collaudo.

## Dove si vede

Nel pannello dell'amministratore, in «Salute»: il livello, la misura che lo
decide, e per ogni classe quanti lavori girano, quanti aspettano e quanti sono
stati rimandati indietro. Lo streamer vede solo il rifiuto, detto per quello
che è: «il server è sotto sforzo, riprova fra un minuto», oppure «hai già un
caricamento in corso».

## Il lavoro va dove sta chi lo chiede

Il modo più forte di alleggerire il server è non fargli fare il lavoro degli
altri. Ogni lavoro pesante ha un padrone: lo streamer che carica, che è in
diretta, che chiede la carta. **Se il dispositivo del padrone è collegato e
sa farlo, lo fa lui; se no lo fa il server, dalla porta.** Il risultato ha lo
stesso contratto da tutte e due le parti, e il server lo ricontrolla con una
lettura leggera (formato, misure, durata, peso, dati nascosti tolti) prima di
tenerlo.

| lavoro | sul dispositivo del padrone |
|---|---|
| compressione dei caricamenti | nel browser prima di caricare (WebCodecs, WebAssembly): meno peso anche in rete |
| video promo | già codificato nel browser; manca solo l'H.264, che WebCodecs sa fare |
| ascolto delle dirette (clip sui picchi) | il dispositivo che trasmette ha già l'audio: il volume si misura lì, niente streamlink né ffmpeg sul server |
| carte e storie aperte dal pannello | disegnate nel browser |
| carte e storie automatiche (pannello chiuso) | sul server; con OSify, il suo demone le fa anche a pannello chiuso |

**OSify** è il caso migliore: un demone sempre acceso, che prende i lavori del
suo padrone anche quando il browser è chiuso, con i codificatori della scheda
video e l'audio di sistema. Ma la maggior parte di questi lavori il browser li
sa fare già: OSify aggiunge la presenza a pannello chiuso, non è una condizione.

**Cosa NON si frammenta**, per scelta:
- il lavoro di un utente sulla macchina di un altro: i dati di una persona non
  vanno mai sul dispositivo di un'altra, e un risultato fatto da un estraneo
  non si può dare per buono;
- il lavoro in tempo reale del bot (chat, eventi delle piattaforme, alert):
  le piattaforme parlano col server, e deve restare lì;
- il cervello: è privato e vive sul server; non si spezza su macchine altrui.

## L'alleggerimento

La porta ferma l'accumulo; non rende leggero quello che pesa. L'alleggerimento
si decide sulle misure, non a occhio.

**Lo strumento.** In «Salute», «Misura 60 secondi» registra sul server vero il
profilo della CPU del bot (a campioni, dal suo inspector), i fermi del ciclo, la
raccolta della memoria e la memoria prima e dopo (`src/misura.js`). Il rapporto
dice dove va il tempo per file e per funzione del codice: solo nomi e righe,
mai argomenti o messaggi. Niente fotografie della memoria, che conterrebbero i
dati delle persone. Una misura alla volta, solo l'amministratore. Va fatta
durante una diretta, quando il carico è vero.

**Fatto: il disegno fuori dal filo.** Una carta della diretta (1200×630)
fermava il bot circa 30 ms, metà per rasterizzare e metà per codificare il
PNG; il captcha di Telegram e le icone SVG lo stesso, in piccolo. Ora tutto il
disegno passa da un filo suo (`src/disegno.js`): misurato sulla stessa
macchina, il fermo più lungo del ciclo durante cinque carte è sceso da 30 a
6 ms. Un collaudo tiene fermo che resvg si usi solo in quel filo.

**Da fare, misure alla mano:**
- le aree che la misura sul server vero mette in cima;
- la memoria del bot e le sue cache, area per area;
- i giri periodici che lavorano anche quando nessuno è in diretta.
