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

**La velocità.** Prima di guardare la forma si guarda la velocità, perché sotto
una certa soglia la forma non dice più niente: con intervalli dell'ordine del
millisecondo l'orologio li arrotonda a 0 e 1, e una fila di 0 e 1 ha la stessa
dispersione di arrivi casuali. Risultato: l'ondata più veloce di tutte era
l'unica che passava per gente vera — più l'attacco correva, meno lo scudo lo
vedeva. Quindici follow a meno di cinque millisecondi l'uno dall'altro sono
quindici follow in settanta millisecondi. Un canale enorme fa una decina di
follow al secondo nei suoi momenti migliori: venti volte più lento.

**La cadenza.** Le persone arrivano a caso: gli intervalli fra follow hanno una
dispersione grande quanto la media — è un processo di Poisson, coefficiente di
variazione attorno a 1. Una macchina arriva a passo regolare e il coefficiente
crolla. Sotto 0,45 non sono persone.

**I nomi.** Se almeno tre account su dieci dell'ondata sono già riconosciuti dai
pattern o dalla lista pubblica, il resto viene dallo stesso posto.

Basta uno dei tre. Se non c'è nessuno dei tre, l'ondata ha l'aria di essere
genuina: si alza la serranda e si avvisa, **ma non si banna nessuno**.

### Quanti follow servono per rispondere

Il coefficiente di variazione di pochi campioni balla, e qui un errore dalla
parte sbagliata toglie il follow a dei fan veri. Misurato su ondate di gente
vera (intervalli esponenziali, ventimila giri per punto):

| follow guardati | ondate genuine scambiate per macchine |
|---|---|
| 6 | 8,16% |
| 10 | 1,34% |
| 15 | 0,14% |
| 20 | 0,01% |

Il minimo è **quindici**. Le macchine restano riconosciute al 100% anche con
quindici campioni e passo irregolare del 40%, quindi aspettare non costa niente
in capacità di vedere.

E sotto i quindici la risposta è **«non lo so ancora»**, che non è «no»: il
giudizio si rifà a ogni follow finché non ci sono abbastanza dati. Prima era un
«no» come un altro, e ci si tornava sopra solo al venticinquesimo follow.

## Bloccare sul nascere

Bannare solo i follow che arrivano dopo l'allarme lascia passare i primi — proprio
quelli che l'allarme lo hanno fatto scattare. Teniamo quindi chi ha seguito nella
finestra, **per la sola durata della finestra**, così quando scatta l'attacco si
prende tutta l'ondata, dal primo. Nomi e id spariscono appena la finestra scorre.

Vale anche quando la certezza arriva tardi. L'allarme può scattare mentre il
giudizio è ancora «non lo so ancora», e nel frattempo altri follow passano: la
**prima volta che ci si convince** si riprende tutta l'ondata, non solo il
follow di quel momento. Da lì in poi basta il singolo.

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

Il coro **non dipende dall'elenco dei nomi**. Le tre difese in chat — nomi noti,
coro, account appena nati — stavano dietro allo stesso interruttore: chi
spegneva «nomi da bot», che è una difesa contro i follow-bot promozionali, si
portava via anche la firma dell'hate-raid, e non gliel'aveva detto nessuno. Ora
ogni difesa ha il suo interruttore, e il coro segue solo quello dello scudo.

La firma normalizza via accenti, link, punteggiatura e spazi doppi — gli attacchi
variano quei dettagli apposta. I messaggi corti e le parole singole **non entrano
nel confronto**: venti persone che scrivono "lol" o una emote insieme sono una
chat viva, non un attacco. Quattro bocche diverse sullo stesso messaggio lungo
entro mezzo minuto alzano l'assetto e il messaggio viene tolto.

## Il difetto che rendeva inutile metà del lavoro

Twitch ha due azioni che sembrano equivalenti e non lo sono affatto:

- **Bannare** impedisce di scrivere e di interagire. **L'account resta follower.**
- **Bloccare** lo toglie dalla lista follower e gli impedisce di seguire di nuovo.

Lo scudo bannava. Quindi dopo un attacco da mille follow-bot il canale restava
con mille follower finti in più: il numero gonfiato — che è **il danno vero** di
un follow-bot, perché il rapporto follower/spettatori conta per Affiliato e
Partner e chi arriva sul canale lo legge — non veniva toccato. L'attacco restava
a segno anche quando lo scudo aveva "funzionato".

È lo stesso motivo per cui gli strumenti di riferimento del settore
(CommanderRoot, Sery_Bot) parlano di *blocklist* e non di ban.

Ora:

- **sui follow** si blocca (`PUT /helix/users/blocks`), e il ban resta come
  ripiego se il blocco fallisce;
- **in chat** si banna, perché lì è moderazione e non pulizia della lista;
- la coda dell'ondata blocca invece di bannare, quindi ripulisce davvero.

## Pulire quello che è già dentro

La difesa in tempo reale ferma quello che arriva adesso. Non tocca chi è già nella
lista: i bot che hanno seguito prima che lo scudo fosse acceso, e quelli finiti
nelle liste pubbliche **dopo** aver seguito.

`pulisciFollower` scorre la lista follower e blocca i riconosciuti, con due
prudenze:

- guarda **solo** i nomi noti o corrispondenti ai pattern, mai il punteggio di
  sospetto. Qui non c'è un attacco in corso a giustificare un margine d'errore, e
  un fan vero rimosso non torna;
- va al ritmo della coda, perché un canale con diecimila follower sono cento
  pagine e altrettante migliaia di chiamate.

L'endpoint `/api/antibot/pulizia` funziona in due tempi: **in prova** dice chi
verrebbe tolto senza toccare niente; confermata, parte in sottofondo e
l'avanzamento si legge dalla console. Prima si guarda, poi si agisce.

## Permessi

Servono due scope nuovi, e chi era già collegato deve riautorizzare (la dashboard
lo segnala da sola, come per gli altri):

- `moderator:manage:chat_settings` — la serranda: chat ai soli follower, chat lenta.
- `moderator:manage:shield_mode` — lo Shield Mode di Twitch.
- `user:manage:blocked_users` — il blocco, l'unica azione che toglie il follow.

Senza, lo scudo funziona lo stesso ma con una mano legata: banna e trattiene, non
può chiudere la chat.

## Cosa si vede dalla console

`/api/antibot/console` riporta l'assetto vivo del canale, la soglia **effettiva**
calcolata per quel canale (non quella dichiarata), e quanti account sono in coda
per il ban. Il registro degli interventi include le voci nuove `assetto`, `blocco`
e `coro`.

## Il collaudo

Questa sezione ha descritto per mesi le prove di un file, `t_scudo.mjs`, che non
è mai esistito in nessun commit: tutto lo scudo non aveva una sola prova. Un
documento che promette una rete che non c'è è peggio di un documento che non la
promette, perché chi legge smette di guardare.

Le prove ora ci sono, stanno in `test/unita/scudo.test.mjs` e girano dentro
`npm test`. Coprono i casi che contano, e in particolare i due che si somigliano
e vanno distinti:

- un'ondata a passo regolare viene riconosciuta come macchina, anche col passo
  che balla del 40%;
- un'ondata così veloce da stare dentro pochi millisecondi pure — era l'unica
  che passava;
- **duemila ondate di gente vera non vengono toccate** (soglia: sotto lo 0,5%);
- sotto i quindici follow la risposta è «non lo so ancora», non «no»;
- sotto attacco l'assetto sale, serranda e Shield Mode si alzano, e **tutta**
  l'ondata finisce bloccata, primo compreso;
- un picco irregolare di gente vera alza la serranda e **non tocca nessuno**;
- al rientro si riapre solo ciò che aveva chiuso lui;
- un coro di quattro account identici alza l'assetto e il messaggio sparisce;
- venti persone che scrivono «lol», o «w andry», non alzano niente;
- la firma resiste ad accenti, link e punteggiatura cambiati;
- il coro funziona anche con l'elenco dei nomi spento;
- un follow-bot viene **bloccato**, mentre in chat si banna;
- la pulizia in prova non tocca niente, quella vera prende i due bot e **non**
  sfiora né i fan veri né Nightbot;
- un inciampo di rete non spegne per sempre il controllo di un account.

Ogni prova è stata vista rossa rompendo il codice sotto: sedici rotture, sedici
rossi. Due prove erano cieche alla prima stesura e sono state riscritte.

## Fonti

- [Twitch — Update Shield Mode Status](https://dev.twitch.tv/docs/api/reference)
- [Twitch — Moderating Twitch Chatrooms](https://dev.twitch.tv/docs/chat/moderation/)
- [Twitch — API Concepts (rate limit)](https://dev.twitch.tv/docs/api/guide)
- [Hate Raids on Twitch: Echoes of the Past, New Modalities](https://arxiv.org/pdf/2301.03946)
- [Hate Raids on Twitch: Understanding Real-Time Human-Bot Coordination](https://arxiv.org/pdf/2305.16248)
