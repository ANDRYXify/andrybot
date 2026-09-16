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
(0,99), comandi a voce (0,99), squadra fino a dieci moderatori (2,99); i tre
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
letto. All'avvio `verificaPrezziStripe()` chiede a Stripe ogni prezzo
configurato e confronta importo, valuta e cadenza con il catalogo: la voce che
non coincide sparisce dal listino (`vendibile()`), il checkout la rifiuta, e il
log dice quale e perché. Vale per il Base, gli extra e il pacchetto. Con Stripe
spento il listino si legge lo stesso e i pagamenti non partono, come prima.

Quando si cambia un prezzo: prima si crea il nuovo prezzo ricorrente in Stripe,
poi si mette il suo id nel `.env` (`STRIPE_PRICE_…`), poi si tocca il catalogo.
Il pacchetto «Tutto» è passato da 12,49 a 3,99: finché in Stripe resta il prezzo
vecchio, non si vende.

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
verifica dei prezzi con Stripe deve partire all'avvio e il checkout rifiutare
ciò che non coincide.

## Sui prezzi

Con la parità, il Base a 2,99 € è il piano a pagamento più basso del mercato
(Moobot parte da 4,99 $) e vende cose che gli altri non hanno: moderatori sul
pannello, avvisi su Telegram, Studio Web. Non c'è motivo di abbassarlo. Il
pacchetto «Tutto» a 12,49 non aveva più senso con tre extra da 0,99, 0,99 e
2,99: sta a 3,99. Se un giorno si vuole una cifra sola da dire a voce, «Base +
Tutto» fa 6,98 al mese: sotto Moobot Affiliate, con più cose dentro.
