# Abbracci, bacini e il batti il cinque

Gesti fra persone in chat. Non costano monete e non ne fanno vincere: servono a
stare insieme, e per questo stanno fuori dall'economia dei giochi (resa nulla
nel catalogo, nessun conto in `valutaResa`).

| comando | anche | cosa fa |
|---|---|---|
| `!abbraccio @nome` | `!abbraccia`, `!hug` | abbraccia chi è in chat; senza nome, tutta la chat |
| `!bacio @nome` | `!bacino`, `!kiss` | un bacino a chi è in chat; senza nome, a tutta la chat |
| `!cinque @nome` | `!highfive`, `!hi5` | alza la mano per qualcuno, o per chiunque senza nome |
| `!nococcole` | | niente gesti verso di te, finché non lo riscrivi |

## Le tre regole

**Solo con chi c'è.** Come il duello: si abbraccia chi ha scritto in chat di
recente (`inChat`), non un nome inventato. Un nome che non è un nome di Twitch
si dice, non si tira a indovinare.

**Chi non ne vuole, non ne riceve.** Un bacio da uno sconosciuto in chat non è
per tutti, e dirlo deve costare una parola: `!nococcole`. La lista sta nel
database (`statoVivo`, chiave `coccole-no`), perché una preferenza così non può
sparire a un riavvio. Chi l'ha scritta non riceve abbracci, bacini né mani
alzate per sé, e chi prova a mandarglieli legge che «preferisce niente coccole,
ma apprezza il pensiero»: un no gentile, detto una volta sola per gesto.

**Il cinque perfetto è una questione di tempo.** Vedi sotto.

## Il cinque perfetto

Lo schiocco di un cinque vero non viene dalla forza. Nasce quando i due palmi
arrivano insieme, inclinati di circa 45 gradi e sovrapposti a metà: l'aria in
mezzo esce così in fretta da fare una piccola onda d'urto, ed è quella che si
sente. Il consiglio di chi lo insegna è guardare il **gomito** dell'altro, non
la mano: vuol dire anticipare, arrivare nello stesso istante.

In chat l'equivalente dell'arrivare insieme è la **prontezza**:

| chi risponde | cinque | in chat | sull'overlay |
|---|---|---|---|
| entro `perfetto` (4 s) | perfetto | frasi del cinque perfetto | le mani si incontrano, lampo, onda d'urto, scintille, schiocco pieno |
| entro `pronto` (15 s) | normale | frasi del cinque normale | le mani si incontrano, schiocco |
| dopo | moscio | frasi del cinque moscio | le mani arrivano lente, schiocco debole e in ritardo |
| mai, entro `scadenza` (30 s) | mano a mezz'aria | frasi della mano sospesa | niente |

I tempi e tutte le frasi si cambiano nelle regole del gioco. Le soglie non si
raddrizzano: se `pronto` è sotto `perfetto` il cinque normale semplicemente non
c'è, e oltre la scadenza la mano è già giù.

Chi batte quale mano:

- `!cinque` da solo batte prima una mano alzata **per te**, poi una alzata per
  chiunque; se non ce n'è, alza la tua.
- `!cinque @nome` batte la mano di quella persona, se è alzata per te o per
  chiunque; altrimenti alza la tua per lei.
- La propria mano non si batte, e una mano alzata per qualcuno la batte solo
  lui.

Una mano battuta si abbassa e il suo timer si spegne. Senza, il timer della
mano di prima abbasserebbe quella rialzata dopo: c'è una prova apposta.

## L'overlay

L'evento arriva sulla stessa linea degli altri effetti
(`{ tipo: 'cinque', a, b, livello }`) e si vede solo se nell'overlay gli
effetti sono accesi. Le due mani sono disegnate (niente emoji), lo schiocco è
sintetizzato come gli altri suoni (`schiocco` e `schioccoPerfetto` in
`presets.js`): un colpo di rumore filtrato e breve, con in più, nel perfetto,
uno scatto acuto in testa, un corpo basso e una coda d'aria. Lo schiocco parte
quando le mani si toccano, non quando l'evento arriva. Chi nel sistema chiede
meno movimento vede le mani già unite e la scritta, che poi sfumano: niente
lampo, niente onda, niente scossa.

## Dove sta nel codice

| pezzo | dove |
|---|---|
| i gesti, le mani alzate, `!nococcole` | `src/features/coccole.js` |
| i comandi | `src/features/games.js` (i `case`), `comandi-registro.js` |
| le manopole e le frasi di serie | `src/features/giochi-conf.js` (`abbraccio`, `bacio`, `cinque`) |
| l'effetto | `src/web/public/overlay-app.js` (`cinque`), `overlay.html` (`.cinque-*`) |
| le prove | `test/unita/coccole.test.mjs` |

## Fonti

- Come nasce lo schiocco di un battito di mani (angolo dei palmi, getto
  d'aria, onda d'urto): Physics World, sul lavoro sul suono del battito di
  mani.
- Il trucco del gomito per non mancare il cinque: le guide pratiche sul
  batti il cinque (howtobeadad, scoopwhoop).
