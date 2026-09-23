# Le modalità della chat a tempo

«Solo emote per due minuti.» Twitch ha le modalità della chat (solo emote,
messaggi unici, solo abbonati) ma non il tempo: si accendono e restano accese
finché qualcuno si ricorda di spegnerle. Qui si accendono **per un tempo**, e si
spengono da sole.

## Chi le accende

| chi | come | quanto dura |
|---|---|---|
| un mod o lo streamer | `!soloemote`, `!messaggiunici`, `!soloabbonati` | due minuti, o quello che scrive: `5m`, `90s`, `10` (minuti) |
| un Modulo | l'azione «Modalità della chat a tempo» | quello che scrivi nel campo, anche `$arg1`; vuoto = due minuti |
| la chat | `!sblocca` con le monete | i minuti che chi scrive paga, fino al massimo che scegli |

Il Modulo è la strada degli **automatismi**: un premio a punti canale «chat solo
emote», un hype train che la sblocca, un raid che arriva, un comando tuo come
`!festa $arg1`. Con `off` (`!soloemote off`) un mod la finisce prima.

## Le quattro regole

Non sono prudenza: sono quello che serve perché «per due minuti» voglia dire
due minuti.

**Si rimette com'era, non «spento».** Se la modalità era già accesa (l'ha messa
un mod), non la si tocca e non si programma niente: spegnerla alla fine vorrebbe
dire disfare la scelta di un altro. Per lo stesso motivo `!sblocca` non fa
pagare una chat che è già così.

**Sopravvive a un riavvio.** Quello che il bot accende su Twitch resta acceso
anche se il bot muore. La fine sta nel database (`statoVivo`, chiave
`modalita:<modo>`), e all'avvio si spegne quello che è scaduto e si ripunta il
resto. È la stessa regola della serranda dello scudo. Se alla fine Twitch non
risponde, la riga resta e si riprova ogni trenta secondi: una chat rimasta in
solo emote per sempre è esattamente il difetto che questo modulo esiste per non
avere.

**Due sblocchi non si sommano a caso.** Se ne arriva un secondo mentre il
primo corre, la fine diventa la più lontana delle due. Uno più corto non
accorcia, uno più lungo allunga, nessuno raddoppia.

**Le modalità dello scudo non ci sono.** Chat lenta e soli follower le usa lo
scudo contro gli attacchi. Se uno sblocco per gioco le spegnesse alla sua fine,
riaprirebbe la serranda in mezzo a un raid. I due elenchi non si toccano, e una
prova lo controlla (`CAMPI_DELLO_SCUDO`).

## Sbloccare con le monete

`!sblocca` costa `costoMinuto × minuti` (50 al minuto di serie, due minuti se
non se ne dicono, dieci al massimo), e dopo uno sblocco il canale aspetta dieci
minuti. Tutto si cambia nelle regole del gioco, compreso cosa si sblocca (solo
emote o messaggi unici). Si paga solo se la chat cambia davvero: prima si
sblocca, poi si tolgono le monete. È un modo di **spendere**: le monete escono
dall'economia invece di girare, e un'economia che ha solo entrate si gonfia.

## Dove sta nel codice

| pezzo | dove |
|---|---|
| il motore e le regole | `src/features/modalita-chat.js` |
| leggere e cambiare la chat | `src/twitch/helix.js` (`leggiChat`, `impostaChat`) |
| i comandi dei mod | `tryComando` nello stesso file, nel registro come famiglia «modalità» |
| l'azione dei Moduli | `src/features/modules.js` (`case 'modalita'`) |
| lo sblocco con le monete | `src/features/games.js` (`sblocca`), le manopole in `giochi-conf.js` |
| le prove | `test/unita/modalita-chat.test.mjs` |

Serve il permesso `moderator:manage:chat_settings`, che si chiedeva già per la
serranda dello scudo: nessuno deve riautorizzare niente.
