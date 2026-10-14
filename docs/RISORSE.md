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

## Cosa resta per l'alleggerimento

La porta ferma l'accumulo; non rende leggero quello che pesa. Restano da fare,
misure alla mano:
- il disegno delle carte (avvisi della diretta) e del captcha di Telegram
  avviene sul filo del bot (resvg sincrono): va spostato fuori dal ciclo;
- la memoria del bot e le sue cache, area per area;
- i timer che girano anche quando non c'è nessuno in diretta.
