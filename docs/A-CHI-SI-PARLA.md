<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# A chi si parla, e cosa si chiede

Il bot rispondeva a parole. In una diretta vera (mizu__gamer, 30 settembre 2026),
dove il bot scrive con l'account dello streamer, e' uscito questo:

| In chat | Il bot | Perche' |
| --- | --- | --- |
| «Quanti bot AHAHAHAH» | «Sì ANDRYXify? Se è per soldi, non ne ho 😂» | «bot» in qualunque punto era una chiamata; il modello non ha risposto e il ripiego ha pescato una frase a caso |
| «@mizu__gamer …» | «Eccomi vecchio mio, chi mi ha evocato?» | il nome dello streamer era una chiamata al bot |
| una frase con «da quanto» | «Il contatore dice 2h 33m di live» | `/uptime\|da quanto/` in qualunque punto del testo |

E la risposta di chi guardava e' stata «nessuno te l'ha chiesto».

## Il modello

Prima di rispondere si decidono due cose, in quest'ordine, in un posto solo
(`src/ai/destinatario.js`).

**A chi e' rivolto il messaggio.** Uno di quattro:

- **al bot**: «bot» detto come si chiama qualcuno (in testa, dopo un saluto o un
  grazie, in coda dopo un verbo, prima di una virgola), il suo account con la @
  quando ne ha uno suo, o la risposta a una riga scritta dal bot;
- **allo streamer**: il nome del canale, o la risposta a una riga scritta da lui;
- **a un altro**: la risposta a un altro spettatore, o @qualcuno;
- **alla stanza**: nient'altro.

«bot» dopo un articolo, un numero o un «quanti» e' una cosa di cui si parla, non
uno che si chiama: «quanti bot», «i bot», «sei un bot?», «questo bot».

**Le risposte di Twitch.** Twitch dice a quale messaggio si risponde (tag
`reply-parent-*`) e mette da solo «@nome » in testa al testo: quel pezzo non e'
una menzione scritta da chi risponde, e si toglie prima di guardare il resto.
Quando il bot scrive con l'account dello streamer, la stessa firma copre due
autori: si guarda il testo della riga a cui si risponde fra le ultime righe
scritte dal bot (la memoria della chat, dove `chat.say` le mette gia'). Se e' li',
si risponde al bot; se no, allo streamer.

**Cosa si chiede.** La durata della diretta e il gioco sono dati veri, e il bot
li dice senza modello: ma a una domanda con quella forma («da quanto sei live?»,
«a cosa stai giocando?», «che gioco è?»), non a una parola dentro una frase
qualsiasi («da quanto tempo non ci vediamo», «che gioco del cavolo»).

## Cosa fa, per ognuno

- **A un altro**: niente. Fra due persone il bot non si mette in mezzo, nemmeno
  con un dato vero.
- **Allo streamer**: i fatti (gioco, durata, link, la Conoscenza del canale), e un
  saluto a chi lo saluta e basta. Niente chiacchiera al posto suo e niente
  «eccomi»: chi scrive il suo nome parla a lui, e il bot usa il suo account.
- **Al bot**: tutto. Se il modello non risponde, una domanda riceve un onesto
  «non lo so»; un cenno («eccomi», un saluto) lo riceve solo chi l'ha chiamato e
  basta. A una frase vera che non ha capito, il bot tace: un cenno pescato a caso
  non e' una risposta.
- **Alla stanza**: come prima, con la chat autonoma e il suo respiro.

## Le prove

- `test/unita/destinatario.test.mjs`: righe di chat come si scrivono, ognuna con
  quello che il bot deve capire (quelle del 30 settembre per prime).
- `test/contratto/chiacchiera-a-chi.test.mjs`: il cervello vero, a modello
  spento, con le stesse righe.
