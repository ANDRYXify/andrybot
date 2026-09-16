# I piani: cosa è gratis, cosa si paga, e dove sta il muro

Il catalogo vive in un posto solo, `src/features/abbonamenti.js`: l'Essenziale
(gratis), il Base, gli extra à la carte, il pacchetto «Tutto», il tier
Community. Tutto il resto (server, bot, pannello, vetrina, dati strutturati,
manuale) legge da lì o è confrontato con lì da un test.

## La regola: quello che gli altri danno gratis, qui è gratis

Confronto fatto a settembre 2026 sui bot che uno streamer italiano incontra
prima di noi. Nightbot è gratuito senza piani a pagamento: comandi, timer,
filtri antispam, giveaway, richieste musicali. StreamElements dà gratis alert,
overlay, chatbot, punti fedeltà e richieste musicali; il suo Premium (12 $/mese)
vende pacchetti di overlay e assistenza. Streamlabs Cloudbot dà gratis comandi,
punti fedeltà, minigiochi, sondaggi, giveaway, timer e citazioni; Ultra
(27 $/mese) vende multistreaming, temi premium e strumenti cloud. Fossabot è
gratis (moderazione, comandi, Twitch, YouTube e Kick). Moobot ha un piano gratis
con limiti e piani a 4,99 / 14,99 / 24,99 $ al mese. Botrix e Wizebot sono
freemium con il grosso gratis.

Quindi **nell'Essenziale** ci stanno, oltre a quello che c'era già (comandi e
automazioni illimitati, moderazione e scudo, overlay e contatori, personalità,
memoria, pagina link, grafiche): **giochi e monete** con classifiche e premio
VIP, **alert ed effetti** con immagini, video e suoni, anche a punti canale, le
**penitenze**, **sondaggi e predizioni**, i **giveaway**, le **richieste
musicali** su Spotify con il player a schermo.

**Si paga ciò che altrove non c'è.** Base, 2,99 €/mese: un moderatore sul
pannello, avvisi di diretta e dei nuovi post su Telegram e Discord (TikTok,
YouTube, Instagram), il bot su Telegram, lo Studio Web. Extra: clip automatiche
(1,99), comandi a voce (0,99), squadra fino a dieci moderatori (1,99); i tre
insieme nel pacchetto «Tutto» a 3,99 invece di 4,97. I membri abilitati della
community di andryxify.it hanno tutto.

Gli extra «Giochi & Classifiche», «Effetti & Punti canale» e «Richieste
Musicali», e i pacchetti «Creator» e «Interazione», sono **ritirati**: restano
nel catalogo con `ritirato: true` perché chi li aveva comprati ha quell'id nei
metadata Stripe e nel database, e il gating deve continuare a leggerlo; ma non
compaiono più nel listino, il checkout li ignora e la funzione che davano è
comunque nell'Essenziale. Chi li paga ancora va avvisato e rimborsato dal
portale Stripe: il codice non può disdire al posto suo.

## Il prezzo mostrato è quello che Stripe addebita, o non si vende

Il listino sta nel catalogo, il prezzo vero sta in Stripe: due posti. Il giorno
che uno cambia senza l'altro, qualcuno paga una cifra diversa da quella che ha
letto. Prima la cura era copiare a mano l'id di ogni prezzo nel `.env` e
confrontarlo all'avvio: funzionava, ma ogni prezzo nuovo voleva un giro sul
server, e il proprietario lo ha detto chiaro: scomodo.

Ora il server **trova i prezzi da solo**. La regola, in una frase: il prezzo di
una voce è quello, attivo e mensile in euro, del prodotto Stripe che porta il
suo nome con l'importo del listino. Il nome si confronta senza maiuscole,
accenti e segni («Bundle Tutto» vale per il pacchetto «Tutto», «Effetti & Punti
canale» vale com'è); se un prodotto ha nei metadata la chiave `socialbot`
uguale alla chiave della voce (`base`, `addon_clip`, `bundle_tutto`…), vince
quella e il nome non conta. Fra più prezzi dello stesso prodotto si prende
quello con l'importo giusto, e fra più prezzi giusti il più recente. Se
l'importo non torna, o il prodotto non c'è, la voce sparisce dal listino
(`vendibile()`), il checkout la rifiuta e il log dice cosa Stripe ha davvero.
Le voci ritirate e quelle già comprese nel Base (Social & Notifiche) non si
cercano: non si vendono a parte, e un checkout che le chiede non le addebita.

Il controllo (`verificaPrezziStripe()`, pura la parte che abbina:
`abbinaPrezzi()`) parte all'avvio e si ripete ogni quarto d'ora, ogni minuto
finché Stripe non risponde (`sorvegliaPrezzi()`). Finché Stripe non ha
confermato, non si vende: meglio un listino vuoto per un minuto che un prezzo
sbagliato. Un id scritto nel `.env` (`STRIPE_PRICE_…`) forza la scelta per
quella voce e viene verificato allo stesso modo; di norma le righe restano vuote.

Quando si cambia un prezzo: si crea il nuovo prezzo ricorrente in Stripe con
l'importo del listino, si archivia il vecchio, e entro un quarto d'ora (o al
riavvio) si vende quello nuovo. Il pacchetto «Tutto» è passato da 12,49 a 3,99
così. Clip automatiche e Squadra stavano a 0,99 e 2,99 nel catalogo ma a 1,99 e
1,99 in Stripe dal luglio 2026: il catalogo ora dice quello che Stripe addebita
(la somma dei tre extra resta 4,97).

## Il muro sta dove la funzione parte

Il piano si applicava al **salvataggio** delle impostazioni: chi non aveva le
clip automatiche se le trovava spente quando salvava la scheda. Ma un piano che
scade lascia in piedi le impostazioni salvate prima, e la funzione continuava a
lavorare gratis; e i valori iniziali di un canale nuovo accendono giochi e clip
da soli. Ora la domanda «questo canale ha diritto a X?» (`canaleHa`,
`src/features/accesso.js`) si fa **dove X parte**:

- le clip automatiche, in `clips.js`, sia dal ritmo della chat sia dagli
  eventi (raid, sub);
- gli avvisi di diretta (`annunciaDiretta`), dei nuovi post (`notificaPost`,
  che copre anche i feed) e della diretta TikTok (`notificaTikTok`), in `bot.js`;
- l'ascolto a voce (`reconcileListeners`): senza «voce» non si apre nessun
  ascolto, qualunque cosa dica l'impostazione;
- le rotte laterali: i feed dei nuovi post, la Mini App Telegram, e la chiave
  API (`/api/ext`), dove clip, diretta TikTok e nuovi post seguono il piano del
  canale — una chiave API non è un abbonamento.

Il controllo al salvataggio resta: dice subito alla persona che quella cosa non
è nel suo piano, invece di lasciarla configurare a vuoto.

## Il muro nel pannello dice quale pacchetto lo apre

Le schede intere che dipendono da un extra (notifiche, ascolto, Studio) erano
già murate. Mancavano i muri **dentro** le schede: le clip automatiche
(interruttore che si spegneva da solo al salvataggio) e i moderatori (un errore
dopo il tentativo). Ora `muroPacchetto(funzione, cosa)` mette nella scheda una
riga con il lucchetto, cosa manca e il tasto «Sblocca con …» verso il pacchetto
giusto (`FUNZ_ADDON`); con un posto solo, il Base propone «Squadra». E
«illimitato» arriva al pannello come -1 e non più come `null` (Infinity non
esiste in JSON), quindi «Comandi e automazioni» non compare più spento.

## Il collaudo

`test/unita/piani.test.mjs`: la tabella dei diritti (chi ha cosa), gli extra
ritirati non offerti ma ancora letti, il pacchetto «Tutto» che copre solo ciò
che si vende e costa meno della somma, -1 al posto di Infinity.

`test/contratto/muri.test.mjs`: le chiavi a pagamento si leggono dal catalogo
(quelle che l'Essenziale non ha) e per ognuna deve esistere il muro sul server,
nel bot dove la funzione parte, nelle rotte laterali e nel pannello; vetrina,
dati strutturati e listino demo devono vendere le stesse cose del catalogo; la
ricerca dei prezzi in Stripe deve partire all'avvio e il checkout rifiutare
ciò che non coincide; `abbinaPrezzi()` ha i suoi casi in `test/unita/piani.test.mjs`.

## Sui prezzi

Con la parità, il Base a 2,99 € è il piano a pagamento più basso del mercato
(Moobot parte da 4,99 $) e vende cose che gli altri non hanno: moderatori sul
pannello, avvisi su Telegram, Studio Web. Non c'è motivo di abbassarlo. Il
pacchetto «Tutto» a 12,49 non aveva più senso con tre extra da 1,99, 0,99 e
1,99: sta a 3,99. Se un giorno si vuole una cifra sola da dire a voce, «Base +
Tutto» fa 6,98 al mese: sotto Moobot Affiliate, con più cose dentro.

## Gli accessi decisi a mano

Il proprietario può aprire o chiudere quello che vuole, a chi vuole, quando
vuole, anche fuori dalla community: è la leva manuale che deve esistere prima
di qualunque controllo automatico delle norme, così se qualcosa va storto c'è
sempre una mano che rimette a posto.

Una riga per canale nella tabella `accessi`: `modo` **tutto** (accesso pieno),
**scelte** (le funzioni elencate si sommano al piano: booleani in OR, numeri al
massimo) o **blocco** (le funzioni elencate si chiudono; nessuna elencata =
tutto chiuso nel pannello), con `scade` facoltativo, `nota` (la legge anche lo
streamer) e `motivo` (`manuale` oggi, `norme` domani). Ogni cambio scrive in
`accessi_storia` chi, quando, prima e dopo.

La domanda «questo canale ha diritto a X?» ha **una risposta sola**:
`funzioniCanale(login)` in `src/features/accesso.js`, che prende il piano
(abbonamento, community o Essenziale) e ci applica la concessione che vale
adesso (`applicaAccesso`, pura). Il server delega lì (`funzioniDi`), il bot
legge lì (`canaleHa`): non esistono due calcoli. Una concessione scaduta smette
da sola. Chi ha «tutto» conta come streamer vero e atterra sul proprio canale.

Le porte, tutte dell'amministratore: `GET /api/admin/accessi`,
`GET/PUT/DELETE /api/admin/accessi/:login`. Nel pannello Admin ogni streamer
ha il tasto «Accessi»: modo, caselle delle funzioni (moderatori come numero),
scadenza, nota, storia. Lo streamer legge la riga nella scheda «Il tuo bot»
(«Il proprietario ti ha aperto…», «Accesso sospeso…»), e i muri delle funzioni
chiuse dicono «chiuso dal proprietario» invece di proporre un acquisto. Il
blocco chiude le funzioni nel pannello e nel bot dove il muro c'è; per far
uscire il bot dal canale resta «Disabilita».

## Chi paga arriva in fondo, chi non paga sa cosa manca

Un giro completo fatto a settembre 2026 sui tre momenti del paywall: comprare,
vivere con l'abbonamento (rinnovi, disdette, prove che finiscono), non pagare.
L'invariante che regge tutto: **l'Essenziale non scade mai e il bot non si
spegne mai per una questione di soldi**; quello che si spegne sono le funzioni
in più, dove partono, perché il gating legge il piano a ogni richiesta.

Quello che non tornava, e come sta adesso:

- **Il ritorno dal Checkout non era confermato.** Stripe rimandava a
  `/?abbonato=1` e il pannello diceva «attivo» sulla sola query, webhook o non
  webhook. Ora il ritorno è `/abbonamento/ritorno?sessione={CHECKOUT_SESSION_ID}`:
  la sessione si rilegge da Stripe (`leggiCheckout`, `esitoCheckout`), e se è
  pagata si attiva subito con la stessa funzione del webhook
  (`attivaDaCheckout`, idempotente: chi arriva prima attiva, l'altro trova
  tutto com'è). Il pannello riceve tre esiti: `1` attivo, `attesa` (Stripe non
  ha ancora incassato, per esempio un bonifico), `no` (nessuna sessione pagata
  con quell'id). Chi era entrato solo per abbonarsi, senza sessione, entra al
  ritorno se il login combacia.
- **Un extra per chi ha già il Base apriva un secondo Checkout con il Base
  dentro**: due sottoscrizioni, il Base pagato due volte. Ora ogni acquisto
  passa da `avviaAcquisto`, dalla rotta del pannello e dal login self-service:
  con una sottoscrizione viva gli extra entrano in *quella*
  (`aggiungiAlAbbonamento`: voci in più sulla sottoscrizione, la parte di mese
  che resta nella prossima fattura, i metadata aggiornati così il webhook e il
  gating leggono come sempre); senza, il Checkout come prima. Un pacchetto
  curato, per chi ha già degli extra, diventa i suoi extra mancanti uno per
  uno: mai più di quanto ha letto. Con un pagamento non riuscito la rotta
  risponde 409: prima si sistema quello.
- **Rinnovo fallito o disdetta: silenzio.** Il webhook portava il piano a
  Essenziale e la scheda diceva «niente da annullare», senza il tasto del
  portale: la carta non si poteva nemmeno aggiornare. Ora `/api/me` dice se
  l'abbonamento è attivo e se esiste un cliente Stripe, e la scheda racconta lo
  stato vero: pagamento non riuscito (con «Aggiorna la carta»), in pausa,
  finito (con la data, e cosa riaccendere), prova finita. Il portale c'è ogni
  volta che c'è un cliente Stripe.
- **Il webhook spegneva il bot** alla disdetta o all'insoluto, contro la
  promessa «torni all'Essenziale». Non lo fa più. E una sottoscrizione vecchia
  che si spegne (un doppione di prima) non spegne quella viva: si guarda l'id.
- **La ronda del sito spegneva anche l'Essenziale.** Chi non era nella lista
  di andryxify.it, senza Stripe attivo e non gestito a mano, dopo sette giorni
  di grazia finiva `disabled` («Accesso disabilitato»): valeva anche per chi si
  era iscritto gratis dalla vetrina, che in quella lista non è mai stato. Ora
  la lista governa **una cosa sola, il flag community**: community e non più in
  lista → grazia, poi `community=0` (torna all'Essenziale, il canale resta);
  in lista senza flag → `community=1`; chi era stato spento da una grazia
  scaduta viene riapprovato sull'Essenziale. La ronda è `giroCancello(attivi)`,
  esportata e collaudata con un database usa-e-getta.
- **La prova promo** finiva solo quando passava la ronda: ora
  `subscriptions.attivo(login, ora)` guarda la data, e la ronda, quando la
  chiude, toglie anche gli extra dalla riga (prima restavano, e la scheda li
  mostrava come «attivo»). Nel pannello gli extra «tuoi» sono solo quelli di un
  abbonamento attivo.
- **La scheda Abbonamento non vendeva**: elencava gli extra senza tasti e
  «Scegli i pacchetti» portava alla scheda Stato, dove c'era scritto «gli
  abbonamenti self-service stanno arrivando». Ora nella scheda c'è lo stesso
  compositore della vetrina, con gli extra già tuoi tolti: sull'Essenziale il
  totale comprende il Base, con il Base attivo conta solo quello che aggiungi.
  I muri dentro le schede e le schede murate portano lì, e la scheda Stato dice
  dove si aggiunge un extra invece di rimandare a domani.
- **I testi**: il 403 dice dove si apre la funzione («lo apri dalla scheda
  Abbonamento») e i messaggi di ritorno dal pagamento sono scritti come si
  parla, senza trattini lunghi.

Il collaudo: `test/unita/abbonamento-stato.test.mjs` (la prova che finisce
per data, la ronda in cinque situazioni, gli extra aggiunti a una sottoscrizione
con uno Stripe finto, il ritorno dal Checkout) e `test/contratto/paywall.test.mjs`
(il ritorno confermato, un solo posto per comprare, il bot che non si spegne per
soldi, la scheda che vende e i muri che portano lì).
