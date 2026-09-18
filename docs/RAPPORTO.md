# Il rapporto di fine diretta

Appena la diretta finisce, il bot ne scrive il rapporto: poche righe su com'è
andata. Numeri, non aggettivi: il cervello qui non c'entra, e la reazione
affettuosa che già manda a fine live resta quella che è. Questo è il foglietto
che uno streamer si scriverebbe da sé, se avesse voglia di contare.

Il rapporto **resta sempre** nella scheda Dirette del pannello (tabella
`rapporti`, uno per diretta, con un puntino sulla voce di menu finché non lo
apre); in più può **arrivare** appena chiude, su Telegram in privato e/o via
mail. I canali si scelgono in quella scheda (`settings.rapporto`:
`telegram`, di serie acceso; `mail`, acceso solo dopo la conferma
dell'indirizzo). La posta la manda il server da sé: `docs/POSTA.md`.

## Da dove vengono i numeri

Quasi tutto è già in casa, e si legge dal database **al momento di chiudere**,
con la finestra della diretta (`raccogli`, in `src/features/rapporto.js`):

| riga | fonte |
|---|---|
| messaggi, persone, i tre più attivi | `messages` nella finestra, senza il bot e senza gli eventi |
| nuovi follower, sub (e regali), raid (con gli spettatori) | le righe `[evento]` che il bot scrive già in `messages` a ogni evento Twitch |
| presenti e prime volte | `presenze`: chi ha `ultima` uguale alla diretta corrente, chi ha `prima_ts` nella finestra |
| clip | `clips` nella finestra |
| donazioni | `donazioni` pagate nella finestra, non rimborsate |

Quello che passa e non resta, cioè gli spettatori a ogni giro, si tiene in
memoria durante la diretta (`osservaGiro`, dallo stesso giro da cinque minuti
delle ore guardate: `stream.viewer_count`, nessuna chiamata in più). Picco e
media escono da lì.

## L'inizio e la fine

L'inizio è l'istante in cui il bot ha visto partire la diretta
(`stream.online`, con `started_at` se c'è). Se il bot è ripartito a diretta in
corso, la sessione non c'è: al primo giro se ne apre una che parte
dall'inizio della diretta corrente delle presenze (`dirette_viste`), che
sopravvive ai riavvii. Un riavvio a metà serata perde al più il picco di
prima, non il rapporto. La fine è l'istante dell'offline.

Con `stream.offline` il bot chiude la sessione, raccoglie, **salva** il
rapporto (`rapporti.salva`) e poi lo manda dove lo streamer ha scelto:
- su Telegram (`testo`, pura: solo le righe che hanno qualcosa da dire), se la
  chat privata è collegata (`owner_tg_id`) e accesa (`dm_modo` diverso da
  `off`) e l'interruttore Telegram è acceso;
- via mail (`html`, col guscio del prodotto, e `testoPiano` per chi legge in
  testo), se l'indirizzo è confermato, l'interruttore mail è acceso e la posta
  del server è attiva.
Ogni consegna riuscita si segna sul rapporto (`inviato`), così la scheda dice
dov'è andato. Se un canale manca, silenzio su quel canale: il rapporto è suo.

## Dove si vede

Scheda Dirette: la lista dei rapporti (ognuno una carta con i numeri, «nuovo»
finché non la apri) e la carta «Dove ricevere il rapporto», con l'interruttore
Telegram, l'indirizzo mail con la conferma e l'interruttore mail. Aprire la
scheda segna i rapporti come letti (`POST /api/streamer/rapporti/letti`).
Il manuale della diretta ha la sezione «Il rapporto di ogni diretta».

## Il collaudo

`test/unita/rapporto.test.mjs`: la sessione (picco, media, durata, la ripresa
dalle presenze), la raccolta nella finestra giusta (chat, eventi, presenze,
clip, donazioni), il testo riga per riga e il caso vuoto, lo spegnimento.
`test/contratto/rapporto.test.mjs`: il cablaggio nel bot (salva sempre, poi i
canali), la scheda Dirette con le sue porte, il manuale, la vetrina, le novità.

## La mail: perché non è un tabulato

La prima versione era un elenco di undici righe etichetta-valore, tutte dello
stesso peso. Si legge una volta e non si riapre: non c'è niente da guardare, e
soprattutto niente da *rivedere*. Da lì il rifacimento, con tre scelte.

**Una voce in apertura, ricavata dai fatti.** La prima riga dice la cosa che è
saltata all'occhio quella sera. Non è un aggettivo buttato lì e non è un dado:
`apertura()` scorre una lista di condizioni in ordine fisso (record di
spettatori, raid, donazioni, facce nuove, follower, sub, chat viva, chat ferma)
e prende la prima che è vera. La stessa serata dà sempre la stessa riga, serate
diverse ne danno di diverse — che è esattamente il punto. Quella riga è anche
l'**oggetto** della mail: è l'unica cosa che si legge nell'elenco della posta, ed
è ciò che decide se la mail si apre. «Diretta finita: 3h 41m» si archivia senza
guardarlo.

**Una gerarchia.** Tre numeri grandi (picco, messaggi, follower nuovi) come i
riquadri del pannello, poi il podio di chi ha scritto, poi il resto in righe
leggere. Sotto i numeri le due colonne si impilano da sole — due blocchi
affiancati con una larghezza massima, non una regola condizionale, così vale
anche nei programmi che le regole non le leggono; per Outlook, che i blocchi
affiancati non li fa, c'è il solo commento condizionale.

**Le clip in fondo, una per una.** È il pezzo che vale di più: l'unico che si
riapre. `raccogli()` si porta via url, motivo e ora dalla finestra della diretta
(fino a otto), non solo il conteggio; la mail le mostra come carte con il titolo
cliccabile, Telegram come link, il testo semplice con l'indirizzo per esteso, e
la carta nella scheda Dirette le elenca per chi il rapporto non se lo fa mandare
da nessuna parte.

Il titolo dice **quando è cominciata**, non quando è finita: una diretta di
martedì sera che chiude alle 00:46 resta «martedì sera», perché è così che la
chiama chi l'ha fatta.

## I due temi, e i caratteri

Il guscio è lo stesso del prodotto, e i colori del tema scuro non si inventano:
sono quelli di `tema.css` letti per il tema scuro (`tinta(nome, 'scuro')`), gli
stessi del sito. Chi legge la posta col fondo nero non si prende una carta
bianca in faccia; chi non capisce la regola resta al chiaro. I caratteri del sito
non si spediscono — un programma di posta ne carica uno da fuori quasi mai —
quindi si chiede prima quello del sito, per chi ce l'ha, e dietro c'è una fila
che gli somiglia. Il cursore del sito, per lo stesso motivo, in una mail non
esiste: non c'è CSS che sopravviva e non c'è un puntatore da vestire.

## L'invito a lasciare l'indirizzo

Chi non ha mai messo un indirizzo non sa che il rapporto può arrivargli. Perciò
la prima volta che entra nel pannello dopo l'attivazione glielo si chiede, una
volta sola. Chi lo deve vedere lo decide il **server** (`/api/me`, campo
`invitoPosta`), non il browser: una scelta tenuta nel browser ricompare
sull'altro computer e sul telefono, e uno che ha già detto no se la ritrova
davanti. Non lo vede chi non è ancora attivo, chi non ha il canale, chi un
indirizzo ce l'ha già anche solo proposto, e chi ha già risposto. La risposta si
segna alla chiusura della finestra comunque sia andata, sì o no: la domanda è
stata fatta. E se le novità sono già aperte, l'invito aspetta che si chiudano
invece di accavallarsi.

## Le statistiche: un posto solo, e una fonte sola per numero

I numeri del canale stavano in tre schede con tre facce: i sette giorni in cima a
Memoria, le classifiche delle monete dentro la carta del premio VIP in Giochi, le
serie di presenze di nuovo in Memoria, i rapporti in Dirette. Nessun periodo da
scegliere, nessun confronto possibile, e il direttore l'ha detto senza giri:
«non si capisce nulla così».

Adesso c'è la scheda **Statistiche**, e il calcolo sta in
`src/features/statistiche.js` — non nella porta, così si prova senza HTTP.
`riassunto(login, { periodo })` decide due cose:

- **cos'è un periodo**: sette giorni, trenta, oppure da sempre (che non è un caso
  particolare, è l'inizio del tempo);
- **da dove viene ogni numero, e uno solo**. La chat e il bot dai messaggi; le
  dirette, le ore in onda, il picco, i follower, i sub e le donazioni **dai
  rapporti già salvati** — gli stessi che lo streamer legge nella scheda Dirette,
  non un secondo conto che col tempo diverge; le presenze e le ore guardate dai
  loro registri.

I rapporti si sommano **nel database** (`json_extract` in una query sola):
leggerli tutti per sommarli in JavaScript vorrebbe dire aprire un JSON per ogni
diretta mai fatta. Le ultime dirette invece non dipendono dal periodo: sono
l'elenco di com'è andata le ultime volte, e a chi guarda «sette giorni» dopo una
pausa di un mese una tabella vuota non direbbe niente.

## L'hype train, e il registro che si rileggeva a meta'

Il rapporto non tiene un conto suo: legge il registro degli eventi, come fa per
follow, sub e raid. Il treno si conta quando **finisce** — Twitch manda un
evento a ogni contributo, e sommarli vorrebbe dire raccontare dieci treni al
posto di uno — e il livello che si dice e' il piu' alto della serata, con chi
ha spinto quel treno li'.

Aggiungendolo e' venuto fuori un difetto piu' vecchio. Ogni evento lascia una
riga «tipo + contenuto in JSON», tagliata a 300 caratteri: un hype train ne
occupa **606**, e il taglio cadeva in mezzo al JSON. Il tipo restava leggibile,
il contenuto no, e chi lo rileggeva otteneva un oggetto vuoto — senza che
niente lo dicesse, perche' una riga tagliata sembra una riga. Non riguardava
solo il treno: qualunque evento un po' lungo, per esempio un abbonamento con un
messaggio, perdeva il suo contenuto per tutti quelli che leggono il registro.

Adesso `rigaEvento()` in `src/bot.js` tiene una regola sola: **o ci sta tutto, o
si scrive il tipo e basta**. Un contenuto che dichiara di non esserci e' piu'
onesto di un mezzo contenuto che finge di esserci.
`test/unita/registro-eventi.test.mjs` la tiene ferma.
