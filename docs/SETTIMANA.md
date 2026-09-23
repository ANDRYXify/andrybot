# La tua settimana

I giorni in cui vai in onda, scritti una volta sola, e i posti dove mandarli con
una spunta: Telegram, Discord, le storie. Compaiono solo i servizi collegati.

## Quello che si può fare davvero (verificato, settembre 2026)

| posto | si può? | come |
| --- | --- | --- |
| Telegram | sì | la foto con la didascalia, nei gruppi e canali collegati |
| Discord, canali | sì | l'immagine allegata, nei canali degli avvisi |
| Discord, calendario | sì | già c'era: gli appuntamenti sul server |
| Instagram, storia | sì, con due condizioni | account professionale, e il permesso di pubblicare |
| Twitch, storie | **no** | l'API di Twitch non ha una porta per le storie |
| Twitch, Programma | sì | la scheda «Programma» del canale |
| YouTube, storie | **no** | chiuse da YouTube il 26 giugno 2023; e i post non hanno API |

Su Twitch il posto giusto per la settimana è il **Programma** del canale, al
posto delle storie che l'API non ha. Serve un permesso Twitch in più
(`channel:manage:schedule`), che il pannello chiede come gli altri.

## La settimana ha una casa sua

Prima i giorni stavano dentro le grafiche e la durata con il calendario di
Discord: due pannelli che scrivevano pezzi della stessa cosa, e il
salvataggio di uno poteva riscrivere l'altro con quello che aveva in mano.
Adesso sta in `settings.settimana`, e la legge una funzione sola,
`settimanaDi`. La leggono la grafica, il calendario di Discord, il Programma
di Twitch e il giro delle sei ore.

I posti vecchi valgono come ripiego finché la settimana non si salva la prima
volta: nessuna migrazione da far girare, la prima lettura dice già la cosa
giusta. Le grafiche non mandano più i giorni, quindi non possono sovrascriverli.

La durata vale per tutti e due i calendari, e sta dentro quello che accettano
tutti e due: Twitch vuole fra 30 minuti e 23 ore.

## Due tipi di posto

- **I calendari** (Discord e il Programma di Twitch) sono uno stato: si
  riallineano quando salvi la settimana e ogni sei ore, e l'ora legale si
  sistema da sola, perché l'ora si rilegge nel fuso.
- **I post** (Telegram, i canali di Discord, la storia di Instagram) sono un
  evento: partono quando premi «Manda», con l'immagine che hai davanti.

L'immagine che parte è quella che vedi: la disegna il browser con lo stesso
disegnatore delle Grafiche, 1080×1350 in JPEG. Un file solo per tutti i posti.

## Il Programma di Twitch

- Un segmento **ricorrente** per ogni giorno con un'ora: Twitch ripete per
  giorno, non per gruppi di giorni.
- Titolo: quello che fai quel giorno. Categoria: trovata con il comando della
  categoria nuovo quando salvi, e ricordata, così il giro delle sei ore non
  cerca niente. Si ricorda solo una categoria **trovata**: «nessuna» si
  ricerca al salvataggio dopo, perché può voler dire che Twitch quella volta
  non ha risposto.
- In «cosa fai» va bene un gioco o un titolo. Mentre scrivi compaiono le
  categorie di Twitch che somigliano (la stessa ricerca della Regia, un pezzo
  solo nel pannello: `_cercaCategorie`); sceglierne una scrive il nome esatto.
  Se invece scrivi un titolo, sotto il giorno si legge quale categoria andrà
  sul Programma, cercata con la **stessa** funzione del salvataggio
  (`/api/streamer/settimana/categoria` chiama `risolviCategoria`): quello che
  si legge è quello che verrà scritto.
- **Chi è nostro** lo sappiamo solo noi: Twitch non dice chi ha scritto un
  segmento. Nostro è uno slot (giorno, ora) che abbiamo scritto noi, e quella
  memoria la tiene il server; dal pannello non arriva. Un segmento scritto a
  mano non si tocca mai, e se occupa il posto che vorremmo, lo si dice.
- Ora legale: uno dei nostri a un'ora di distanza con lo stesso titolo è lo
  stesso slittato. Un ricorrente non si sposta: si toglie e si rimette.
- Spegnere toglie quello che avevamo scritto noi, e solo quello.
- Un segmento che non si riesce a togliere resta nella memoria, e il giro dopo
  riprova: dimenticarlo vorrebbe dire lasciarlo lì per sempre, scambiato per
  uno scritto a mano.

## La storia di Instagram

- Si vede solo se Instagram è collegato **e** il permesso c'è. Lo si chiede
  alla porta che conta le pubblicazioni (`content_publishing_limit`): vuole lo
  stesso permesso della pubblicazione e non pubblica niente.
- Meta scarica l'immagine da un indirizzo pubblico nel momento in cui
  pubblica. Il file ha un nome casuale, si cancella appena pubblicato, e uno
  spazzino toglie quelli rimasti da un giro interrotto.
- Una storia non ha testo, e dall'API non si mettono gli adesivi con il link:
  per questo c'è il QR sulla grafica.

## Discord: allegare file

Un'immagine in un messaggio è un allegato, e per allegare serve «Allegare
file». L'invito del bot adesso lo chiede. Chi ha invitato il bot prima lo
vede segnato accanto al canale, con il tasto per aggiornarne i permessi.

## Le prove

`test/unita/settimana.test.mjs`: il ripiego sui posti vecchi, la durata, la
memoria di cosa è nostro che dal pannello non si scrive, il segmento altrui
intatto, il singolo che non è mai nostro, l'ora legale, il segmento che non si
toglie e resta nostro, le categorie cercate una volta. Ogni regola ha una
prova che diventa rossa se la si toglie.
