# Lo scudo anti-bot

Come funziona la difesa del canale contro follow-bot e hate-raid, e perché è
costruita così.

## Il problema del vecchio scudo

Le difese c'erano — lista di bot noti, pattern dei nomi, valutazione degli
account, conteggio dei follow — ma erano **sette interruttori indipendenti** che
lo streamer doveva capire e accendere uno per uno. Quelli che costano chiamate a
Twitch (`controllaAccount`, `chatNuovi`) erano spenti di default, quindi in
pratica non proteggevano quasi nessuno. E soprattutto:

- **La soglia era un numero fisso.** Dieci follow in trenta secondi valeva sia per
  un canale da dieci spettatori sia per uno da cinquemila. Sul primo era tardiva,
  sul secondo era un falso allarme perpetuo.
- **Nessuna difesa contro il coro.** Un hate-raid è lo stesso messaggio da molte
  bocche. Se gli account erano vecchi e i nomi normali, passava indisturbato.
- **L'onda lenta era invisibile.** La finestra breve vede duecento follow in
  cinque secondi; non vede un follow ogni quattro secondi per dieci minuti.
- **La serranda non poteva chiudersi.** `chatSoloFollower` chiamava un endpoint
  per cui lo scope `moderator:manage:chat_settings` non era mai stato richiesto:
  ogni tentativo tornava "permesso mancante". La difesa principale durante
  un'ondata era, di fatto, scollegata.
- **Nessuno Shield Mode.** Twitch ha una difesa nativa che lo streamer alzerebbe a
  mano dalla dashboard, e non veniva mai usata.

## L'assetto

Ora c'è **un livello per canale** — `calma`, `sospetto`, `attacco` — che sale
quando arriva evidenza e scende da solo dopo cinque minuti di quiete. Tutte le
difese leggono quello. Un fatto, un posto dove è scritto.

In `attacco` lo scudo alza da sé:

- **Shield Mode** di Twitch (`PUT /helix/moderation/shield_mode`);
- **chat ai soli follower** da almeno dieci minuti — che taglia fuori gli account
  appena creati per l'occasione;
- **chat lenta** a dieci secondi, per strozzare il volume;
- e internamente accende la trattenuta dei messaggi da account nuovissimi e il
  controllo dei nomi.

Al rientro in calma rimette a posto **solo ciò che aveva mosso lui**: quello che
lo streamer aveva già acceso per conto suo resta acceso.

Due scelte di costruzione:

- L'assetto vive **in memoria**, non nelle impostazioni salvate. Se il processo
  cadesse a metà attacco, al riavvio il canale è di nuovo in pace: non può restare
  in assetto per sempre per via di un crash.
- In attacco **non** si accende `controllaAccount`. Una chiamata a Twitch per ogni
  follow, proprio mentre ne arrivano centinaia, amplificherebbe l'attacco invece
  di fermarlo. Sotto ondata i follow si giudicano in aggregato.

## La soglia si tara sul canale

Teniamo il ritmo **abituale** di ogni canale: media esponenziale dell'intervallo
fra un follow e l'altro. L'allarme scatta a quattro volte il normale, e mai sotto
il numero dichiarato dallo streamer.

Il ritmo si impara **solo in tempo di pace**. Aggiornarlo anche durante un attacco
significherebbe insegnare al canale che quella è la sua normalità.

Finché non ci sono almeno trenta follow di storia, si usa il numero dichiarato:
senza dati non si inventa una statistica, si usa il valore noto.

Una seconda finestra da dieci minuti vede **l'onda lenta**, con la stessa logica.

## Macchina o clip virale?

Questa è la domanda che decide se si bannano cento account, e sbagliarla costa
più dell'attacco: bannare cento fan veri è un danno che non si recupera. Non si
tira a indovinare, si **misura** — e senza chiamare Twitch.

**La cadenza.** Le persone arrivano a caso: gli intervalli fra follow hanno una
dispersione grande quanto la media — è un processo di Poisson, coefficiente di
variazione attorno a 1. Una macchina arriva a passo regolare e il coefficiente
crolla. Sotto 0,45 non sono persone.

**I nomi.** Se almeno tre account su dieci dell'ondata sono già riconosciuti dai
pattern o dalla lista pubblica, il resto viene dallo stesso posto.

Basta uno dei due. Se non c'è nessuno dei due, l'ondata ha l'aria di essere
genuina: si alza la serranda e si avvisa, **ma non si banna nessuno**.

## Bloccare sul nascere

Bannare solo i follow che arrivano dopo l'allarme lascia passare i primi — proprio
quelli che l'allarme lo hanno fatto scattare. Teniamo quindi chi ha seguito nella
finestra, **per la sola durata della finestra**, così quando scatta l'attacco si
prende tutta l'ondata, dal primo. Nomi e id spariscono appena la finestra scorre.

Twitch banna un account per chiamata, con un tetto di 800 richieste al minuto per
canale e la pratica consigliata sotto le 400 per la moderazione. La coda va a
**sei al secondo** (360 al minuto), con rientro di cinque secondi se arriva
comunque un 429: durante un attacco farsi bloccare dal rate limit significa
restare disarmati sul più bello. Mille account finti si ripuliscono in poco meno
di tre minuti — è il limite di Twitch, non nostro.

Il giudizio sull'ondata si rifà ogni venticinque follow: un'ondata può cambiare
faccia a metà.

## Il coro

È la firma dell'hate-raid, ed è quello che mancava del tutto: non conta chi scrive
né da quanto esiste il suo account, conta che **lo stesso messaggio esca da molte
bocche diverse** in pochi secondi. La ricerca sul fenomeno usa proprio la
somiglianza del contenuto come rilevatore principale.

La firma normalizza via accenti, link, punteggiatura e spazi doppi — gli attacchi
variano quei dettagli apposta. I messaggi corti e le parole singole **non entrano
nel confronto**: venti persone che scrivono "lol" o una emote insieme sono una
chat viva, non un attacco. Quattro bocche diverse sullo stesso messaggio lungo
entro mezzo minuto alzano l'assetto e il messaggio viene tolto.

## Permessi

Servono due scope nuovi, e chi era già collegato deve riautorizzare (la dashboard
lo segnala da sola, come per gli altri):

- `moderator:manage:chat_settings` — la serranda: chat ai soli follower, chat lenta.
- `moderator:manage:shield_mode` — lo Shield Mode di Twitch.

Senza, lo scudo funziona lo stesso ma con una mano legata: banna e trattiene, non
può chiudere la chat.

## Cosa si vede dalla console

`/api/antibot/console` riporta l'assetto vivo del canale, la soglia **effettiva**
calcolata per quel canale (non quella dichiarata), e quanti account sono in coda
per il ban. Il registro degli interventi include le voci nuove `assetto`, `blocco`
e `coro`.

## Il collaudo

`t_scudo.mjs` verifica i casi che contano davvero, e in particolare i due che si
somigliano e vanno distinti:

- un'ondata a cadenza regolare viene riconosciuta come macchina;
- **un picco irregolare di gente vera non viene toccato** — questo è il test che
  protegge i fan;
- sotto attacco l'assetto sale, Shield Mode e serranda si alzano, e **tutta**
  l'ondata finisce bannata, primo compreso;
- al rientro tutto torna com'era;
- un coro di cinque account identici alza l'assetto e il messaggio sparisce;
- venti persone che scrivono "lol" non alzano niente;
- la firma resiste ad accenti, link e punteggiatura cambiati.

## Fonti

- [Twitch — Update Shield Mode Status](https://dev.twitch.tv/docs/api/reference)
- [Twitch — Moderating Twitch Chatrooms](https://dev.twitch.tv/docs/chat/moderation/)
- [Twitch — API Concepts (rate limit)](https://dev.twitch.tv/docs/api/guide)
- [Hate Raids on Twitch: Echoes of the Past, New Modalities](https://arxiv.org/pdf/2301.03946)
- [Hate Raids on Twitch: Understanding Real-Time Human-Bot Coordination](https://arxiv.org/pdf/2305.16248)
