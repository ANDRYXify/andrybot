# Le preferenze del canale

Oggi il bot scrive le date all'italiana e con l'ora di Roma dappertutto, perché
è scritto così in una cinquantina di punti diversi (`'it-IT'`, `'Europe/Rome'`).
Parla italiano in chat anche a un canale inglese o spagnolo. E quando qualcuno
chiede «quando sei in diretta?» non sa rispondere con un'ora vera: nessun
comando lo dice, e la risposta, se c'è, viene da un testo scritto a mano.

Non sono tre difetti diversi. Manca un posto solo che dica come parla e come
conta il tempo **questo** canale. Questo documento è il piano per farlo.

## Il modello

Ogni canale ha le sue **preferenze**, salvate con le impostazioni:

| preferenza | valori | di base |
|---|---|---|
| lingua della chat | italiano, inglese, spagnolo | quella della piattaforma del canale, se si sa; altrimenti italiano |
| fuso orario | un fuso vero (IANA) | quello della settimana, se c'è; altrimenti Europe/Rome |
| data | 30/09/2026 · 09/30/2026 · 2026-09-30 · 30 settembre 2026 | segue la lingua (it ed es: gg/mm; en: mm/gg) |
| ora | 24 ore · 12 ore | segue la lingua (en: 12, it ed es: 24) |
| la settimana comincia | lunedì · domenica | lunedì |
| durate | brevi (1h 20m) · per esteso (1 ora e 20 minuti) | per esteso |
| prossime dirette da | la settimana di SocialBot · il Programma di Twitch | la settimana, se è piena; altrimenti il Programma, se il canale è su Twitch |
| il bot risponde | con @nome · rispondendo al messaggio | con @nome |

«Di base» non è un valore scritto: è quello che si legge quando lo streamer non
ha scelto niente. Così un canale che non tocca nulla ha già una risposta giusta,
e quando sceglie vale la sua scelta.

### Un modulo solo per scrivere il tempo

`src/web/public/formati.js`, servito al browser e importato dal server come
`pannelli.js` e `arena.js`: le stesse funzioni scrivono una data nel pannello, in
chat, su una grafica, in una mail.

- `data(istante, pref)`, `ora(istante, pref)`, `giorno(istante, pref)`,
  `quando(istante, pref)` («stasera alle 21:00», «domani alle 9 PM», «sabato 4
  ottobre alle 18:00»), `durata(ms, pref)`;
- la lingua e il fuso vengono dalle preferenze, mai da una costante;
- un cancello boccia `'it-IT'`, `'Europe/Rome'` e `toLocale…String` scritti a
  mano nei file che parlano (bot, giochi, moduli, mail, grafiche): passano tutti
  da qui.

### Le prossime dirette, da una fonte sola

`prossimeDirette(login, quante)` dà le prossime dirette dalla fonte scelta, sempre
nella stessa forma (`{ inizio, fine, titolo, categoria }`):

- **la settimana di SocialBot**: come oggi (`settimanaDi`, `prossimaDiretta`),
  estesa a più di una;
- **il Programma di Twitch**: letto con `GET /schedule` (c'è già in `helix.js`),
  tenuto da parte un quarto d'ora, con i segmenti annullati tolti.

Una fonte sola per canale, per costruzione: se la fonte è il Programma di Twitch,
la settimana non viene scritta sul Programma (sarebbe il cane che si morde la
coda) e il pannello lo dice accanto all'interruttore. Chi è su Kick o YouTube ha
solo la settimana: lì non c'è un Programma da leggere.

Chi la usa, e oggi legge altro o niente:

- in chat, un comando nuovo `!prossima` (rinominabile come gli altri): «La
  prossima diretta è stasera alle 21:00: Elden Ring»; con la settimana vuota lo
  dice, senza inventare;
- la variabile `$prossima` nei Moduli e nei comandi personalizzati;
- il cervello: alla domanda «quando sei in diretta?» risponde con l'ora vera
  presa da qui, non dal testo libero; e il saluto fuori diretta dice quando si
  torna;
- la home del pannello («La prossima»), la grafica e la storia «Stasera alle…»,
  il media kit, i pannelli di Twitch;
- la pagina link: un blocco «Prossima diretta» che si aggiorna da solo, al posto
  del conto alla rovescia scritto a mano (che resta per chi vuole una data sua).

### La lingua della chat

Tutto quello che il bot scrive da solo passa dalla voce del canale
(`docs/VOCE.md`), che sceglie la frase nella lingua delle preferenze. Le
preferenze sono il posto in cui quella lingua si decide; la voce è il posto in
cui si usa. Fino a quando un momento non è passato nella voce, resta com'è.

## Nel pannello

In Account una carta **«Preferenze del canale»**, con ogni scelta e accanto un
esempio vivo («Oggi si scrive così: 30 settembre 2026, 21:00»). La scelta della
fonte delle prossime dirette compare anche nella Settimana, dove si guarda la
programmazione: è la stessa impostazione, non una copia.

## In che ordine

1. `formati.js` e le preferenze (lettura con i valori di base, salvataggio,
   prove: ogni formato in ogni lingua, fusi con l'ora legale, mezzanotte).
2. `prossimeDirette` con le due fonti, e la regola della fonte sola.
3. `!prossima`, `$prossima`, il cervello e il saluto fuori diretta.
4. La carta nel pannello e la scelta nella Settimana.
5. I punti che scrivono date a mano passano da `formati.js`, a gruppi, fino a
   quando il cancello non ne trova più.
6. Il blocco «Prossima diretta» della pagina link.
7. Manuale (Account, Settimana, Moduli), novità, nelle tre lingue.
