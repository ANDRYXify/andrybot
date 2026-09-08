# La pagina moderazione: tre domande, tre pagine

## Cosa non andava

Non era brutta: era **tagliata nel posto sbagliato**. Due schede,
«Moderazione» e «Scudo anti-bot», divise per *quando* le cose erano state
scritte invece che per *cosa fanno*.

Misurato sulla pagina resa, a 1280 px:

| | Moderazione | Scudo |
|---|---|---|
| altezza | 2469 px | 1275 px |
| carte | 3 | 5 |
| comandi | 38, di cui 22 caselle | 5 |

Gli otto difetti, contati:

1. **Le stesse due liste in due posti.** «Bot da fermare in più» e «Nomi da non
   toccare MAI» erano due caselle di testo in Moderazione; «Blocca sempre» e
   «Non toccare mai» erano le stesse due liste a pastiglie nello Scudo. Stesso
   campo salvato: `extra` ed `esenti`.
2. **E si cancellavano a vicenda.** Le pastiglie salvano subito sul server e
   aggiornano solo il proprio riquadro; la casella di testo nell'altra scheda
   restava con il valore vecchio. Premendo «Salva anti-bot» il nome appena
   aggiunto spariva, in silenzio.
3. **Una carta con cinque mestieri dentro** (1354 px): ondate, liste di nomi,
   sola osservazione, bot che guardano, quando reagire, cosa fare, controllo per
   ogni follow, messaggi degli account nuovi.
4. **Gli interruttori maestri invisibili.** «Attiva l'antispam» e «Attiva la
   protezione anti-bot» avevano lo stesso peso della casella accanto, e sotto di
   loro venti comandi che senza non fanno niente.
5. **Caselle che vanno a capo a caso** — tre, tre, due, una — con campi numerici
   in mezzo alla riga.
6. **Tre carte grandi per dire che non è successo niente**: circa 700 px di
   riquadri vuoti in fila.
7. **Stato di qua, interruttore di là.** Lo Scudo diceva «Spento» ma per
   accenderlo si tornava in Moderazione.
8. **Le fasi A–G non si vedevano.** Sei livelli, incidenti, gruppi, reputazione,
   coda degli interventi, bonifica: tutto costruito, niente in pagina. Le
   chiamate al server c'erano già.

## Il modello

La pagina risponde a **tre domande diverse**, e ognuna vuole la sua pagina.

| pagina | domanda | su cosa agisce |
|---|---|---|
| **Chat** | cosa filtro nei messaggi? | un MESSAGGIO |
| **Scudo** | come mi difendo da un attacco? | un ACCOUNT |
| **Registro** | cosa è successo? | il RACCONTO di quello che è già accaduto |

La regola che decide dove va un comando, e non lascia margine: **un comando sta
dove sta il suo soggetto**. Filtra un messaggio → Chat. Ferma un account →
Scudo. Racconta un fatto passato → Registro.

## Le cinque regole della resa

1. **Niente esiste due volte.** Le liste stanno solo nello Scudo, a pastiglie,
   che salvano subito. Le caselle di testo spariscono: erano la metà del difetto
   numero 2.
2. **L'interruttore maestro è la testa della carta**, non una riga in mezzo alle
   altre, e quello che comanda si spegne con lui, visibilmente.
3. **Ogni numero sta con il filtro che lo usa**, sulla stessa riga. Nessun campo
   orfano in mezzo a una frase.
4. **Un registro vuoto è una riga, non una carta.** Le carte del Registro
   compaiono quando hanno qualcosa da dire.
5. **Lo stato e l'interruttore che lo cambia stanno insieme.**

## Dove è finito ogni comando

Nessun comando è stato perso: sono trentotto più cinque, e sono tutti qui.

**Chat** — parole vietate (invariata) · antispam: interruttore in testa, i link
con il loro livello e i domini permessi, i filtri in griglia a due colonne
ciascuno con il proprio numero, il timeout crescente, l'avviso in chat.

**Scudo** — *Stato*: acceso/spento, livello di adesso, quanto presto reagire,
cosa fare, sola osservazione, avviso in chat. *Le ondate*: rilevamento, soglia
(quanti follow in quanti secondi), chat ai soli follower, ban aggressivo.
*Chi fermare*: nomi da bot noti, lista che si aggiorna da sola, chi guarda molti
canali, controllo di ogni nuovo follower. *Account appena creati*: trattieni,
età minima, cosa fare. *Le tue liste*: blocca sempre, non toccare mai.

**Registro** — oggi e sette giorni · da rivedere · gli incidenti, uno per volta,
con la bonifica · interventi recenti · azioni rimaste in sospeso, e il modo di
riprenderle · pulizia dei follower.

## Cosa è saltato fuori rifacendola

Tre difetti che non si vedevano da fuori, tutti della stessa famiglia: **una
cosa che sembra fare qualcosa e non la fa**.

1. **Il salvataggio ricostruiva l'oggetto intero da capo.** Il pannello mandava
   diciotto campi su ventisei; gli altri otto — soglia, timeout, età minima,
   dimensione del coro, e tre interruttori — tornavano ai valori di fabbrica a
   ogni «Salva», in silenzio. Nessuno se ne accorgeva perché quei valori erano
   già quelli che quasi tutti avevano.
2. **Tre comandi non arrivavano mai al disco.** «Sola osservazione», «quanto
   presto reagire» e «segnala chi guarda molti canali» erano nel pannello, si
   leggevano nella console, e la rotta che salva non li nominava. La sola
   osservazione — cioè la cosa che serve per provare lo scudo senza fargli
   toccare nessuno — non si poteva accendere.
3. **E il salvataggio delle liste era la seconda metà del difetto numero 2 di
   sopra**: le caselle di testo mandavano il proprio contenuto vecchio,
   sovrascrivendo quello che le pastiglie avevano appena salvato.

La correzione è una riga, e vale per tutte e tre: **il salvato sta sotto, quello
che arriva sta sopra**. Le due funzioni che normalizzano antispam e anti-bot
sono uscite dalla rotta e stanno in `src/web/impostazioni-moderazione.js`, dove
sono pure e si possono provare senza accendere un server.

## E perché non può ricapitare

Correggere tre difetti non basta: erano invisibili, e la prossima volta lo
sarebbero di nuovo. `scripts/verifica-salvataggi.mjs` controlla le tre catene
che si erano rotte, leggendo i file e non un elenco scritto a mano:

1. **markup → salvataggio** — un comando disegnato che nessuno legge;
2. **salvataggio → markup** — una lettura di un comando che non c'è più;
3. **salvataggio → disco** — una chiave mandata che il normalizzatore ignora.

Oggi sono 35 comandi, 33 letture e 32 chiavi. Il cancello ha il suo collaudo:
rimette i tre difetti uno per volta e deve vederli tutti e tre — un cancello
provato su uno solo dei tre direbbe di essere verde sapendone un terzo.

## Come è venuta

Misurato sulla pagina resa, a 1280 px e a 420 px:

| | prima | dopo |
|---|---|---|
| schede | 2 | 3 |
| altezza Chat | 2469 px (con dentro l'anti-bot) | 1244 px |
| altezza Scudo | 1275 px (solo stato) | 1535 px (tutto lo scudo) |
| altezza Registro | — | 619 px, con le carte vuote nascoste |
| liste in due posti | 2 | 0 |
| comandi senza nome accessibile | 0 | 0 |
| pagina che scorre di lato a 420 px | no | no |

L'interruttore maestro adesso spegne visibilmente quello che comanda: il corpo
della carta si smorza, e riaccendendolo torna. È una prova che si misura —
`data-spento` segue lo stato della casella — non un'impressione.

## Cosa resta fuori, e perché

La **reputazione** non ha comandi: non si tara, si legge. Compare come motivo
dentro una segnalazione («di casa in questo canale») e non come manopola. Una
manopola per la fiducia sarebbe un modo per farsi del male da soli.

I **gruppi** e i **livelli** non hanno comandi propri: i livelli si scelgono con
«quanto presto reagire», i gruppi non si configurano. Si vedono nel Registro,
dentro l'incidente, come racconto di quello che è successo.
