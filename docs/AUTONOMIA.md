# Quello che il bot fa da solo

Il bot del canale — non Lia — fa alcune cose senza che nessuno gliele chieda.
Ognuna ha una manopola, una dose, un tetto e un posto dove si vede. Se una di
queste quattro manca, non è autonomia: è un bot che fa cose a caso.

| cosa | quando | manopola | tetto | dove si vede |
|---|---|---|---|---|
| **parla da solo** (promemoria dei link, una battuta, una cosa sua sul discorso in corso) | ogni 3 minuti tira a sorte con probabilità `dose × 0,4`, solo a chat viva (≥ 1 msg/min, i suoi esclusi) | *Il bot* → chat autonoma (0–50%, parte a **0**), personalità proattiva, solo in diretta, promo social, battute da solo | **mai due volte in 6 minuti**; il promemoria dei link al più ogni **45 minuti**; una battuta ogni 20 minuti e mai mentre misura le risate della precedente | *Il bot* → «Cosa ha detto da solo», con ora e motivo |
| **apre una manche** | a intervalli casuali fra min e max minuti, solo a chat viva | *Giochi* → manche automatiche (min/max, solo in diretta) | una alla volta | stesso registro (tipo «manche») |
| **clippa** | quando la chat esplode (picco misurato sulla baseline, persone diverse, reazioni) o su un evento forte (raid grosso, valanga di bit) | *Diretta* → clip automatiche, sensibilità 1–10 | una pausa fra una clip e l'altra, più corta se l'evento è caldo | l'elenco delle clip |
| **dà il VIP ai più affezionati** | ogni settimana o mese | *Giochi* → premio VIP (quanti, periodo, salta i perenni) | al più 5, e prima rilegge chi è staff | la lista dei VIP |
| **accredita monete e ore** | ogni 5 minuti a chi è in chat mentre è in diretta | *Giochi* | — | classifiche |
| **ferma i bot** | un nome da follow-bot noto, un coro, un account appena nato che scrive | *Moderazione* → scudo: azione (ban / timeout / segnala), soglie, esenti | broadcaster, mod, VIP e abbonati **mai** toccati; lista di bot buoni | *Registro* |
| **automazioni a tempo** | i Moduli con innesco «ogni N minuti» | li scrive lo streamer, uno per uno | 7 secondi fra due timer scaduti nello stesso giro; può tacere a chat ferma | *Comandi* |

## Il difetto che questo documento chiude

La decisione di parlare stava dentro al battito, sparsa in quattro condizioni e
due dadi, e mancavano due cose che si vedono da fuori:

- **nessun tetto a quanto spesso**: due giri di fila (tre minuti) potevano
  entrambi uscire vincenti;
- **nessun riposo per il promemoria dei link**: lo stesso indirizzo, senza
  distanza minima — la cosa più da bot che un bot possa fare.

E tre valori diversi per la stessa manopola: il codice partiva da **0**, il
cursore mostrava **3%**, il manuale prometteva **5%**. Chi leggeva il manuale si
aspettava un bot che chiacchiera un po'; chi apriva il pannello vedeva 3% e,
salvando il tono, se lo portava a casa senza volerlo; il bot, finché nessuno
salvava, stava zitto. Ora la verità è una: **0**, e comincia quando lo alzi.

La decisione è ora **una funzione sola** (`src/features/spontanea.js`), senza
dadi dentro — il caso le arriva da fuori — quindi si prova: dose zero, chat
ferma, non in diretta, il tetto dei sei minuti, il riposo della promo, la
probabilità. Il battito la chiama e basta.

## Perché il registro

Senza «Cosa ha detto da solo», l'unico modo di giudicare la dose era stare in
chat a guardare. Il manuale suggeriva il rapporto fra messaggi del bot e messaggi
della chat, ma quel numero mette insieme le risposte (chieste) e le iniziative
(sue): la dose riguarda solo le seconde. Il registro è **di seduta** — da quando
il bot è acceso — e il pannello lo dice; quello che ha detto resta comunque nella
memoria della chat.

## Lia non è qui

Il battito ospita anche due cose di Lia (il respiro dell'umore, la posta che
lei mette fuori) e i suoi messaggi proattivi su Telegram hanno una strada loro.
Non sono autonomia del bot: sono lei. Il confine è in `docs/BOT-E-LIA.md`.
