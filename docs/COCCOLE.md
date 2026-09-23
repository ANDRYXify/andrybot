# Abbracci, bacini e il batti il cinque

Gesti fra persone in chat. Non costano monete e non ne fanno vincere: servono a
stare insieme, e per questo stanno fuori dall'economia dei giochi (resa nulla
nel catalogo, nessun conto in `valutaResa`). Succede tutto in chat: niente
overlay e niente suoni.

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

**Il cinque perfetto è una sorpresa.** Vedi sotto.

## Il batti il cinque

Uno alza la mano, un altro la batte. Chi batte quale mano:

- `!cinque` da solo batte prima una mano alzata **per te**, poi una alzata per
  chiunque; se non ce n'è, alza la tua.
- `!cinque @nome` batte la mano di quella persona, se è alzata per te o per
  chiunque; altrimenti alza la tua per lei.
- La propria mano non si batte, e una mano alzata per qualcuno la batte solo
  lui.

Quando una mano si batte, `perfetti` volte su cento (di serie 20) viene un
**cinque perfetto**, con le sue frasi; le altre volte è un cinque normale. È un
tiro a sorte e basta: non dipende da quanto in fretta si risponde, così nessuno
ha motivo di scrivere a raffica. Se nessuno risponde entro `scadenza` secondi
(di serie 30) la mano resta a mezz'aria, e il bot lo dice.

Una mano battuta si abbassa e il suo timer si spegne. Senza, il timer della
mano di prima abbasserebbe quella rialzata dopo: c'è una prova apposta.

## Dove sta nel codice

| pezzo | dove |
|---|---|
| i gesti, le mani alzate, `!nococcole` | `src/features/coccole.js` |
| i comandi | `src/features/games.js` (i `case`), `comandi-registro.js` |
| le manopole e le frasi di serie | `src/features/giochi-conf.js` (`abbraccio`, `bacio`, `cinque`) |
| le prove | `test/unita/coccole.test.mjs` |
