# Le donazioni verso lo streamer

Chiesto così: «un modo per configurare le donazioni … verso lo streamer …
integrare nella pagina link con il tema coerente … e mettiamo anche un goal
donazioni»; poi «non possiamo gestirlo tutto all'interno di socialbot?»,
«ovviamente ogni donazione va al corrispettivo streamer», «io voglio che lo
streamer sia libero di fare da solo e gestirsi da sé» e «deve poter gestire il
tutto da socialbot in modo privato e completo e robusto».

## Cosa c'era

Niente sulle mance, poi il tasto «Sostieni» verso un link esterno (Ko-fi,
PayPal…) con il webhook di Ko-fi per l'avviso. Un link è un link: chi vuole
donare esce dalla pagina, e senza Ko-fi non c'è avviso.

## Il modello

1. **Il conto è dello streamer, e basta.** Lo apre e lo gestisce lui su
   Stripe, come chiunque: incassi, ricevute, contestazioni e bonifici sono nel
   suo Dashboard. **Niente Connect**: nessun conto «collegato» alla
   piattaforma, nessuna registrazione fatta da noi, niente da attivare
   sull'account di SocialBot, nessuna quota. Stripe Connect era stato il primo
   disegno ed è stato tolto proprio per questo.
2. **A noi affida una chiave con restrizioni** (`rk_…`), creata nel suo
   Dashboard con due permessi in scrittura: *Checkout Sessions* e *Products*.
   Niente rimborsi (a meno che non aggiunga *Refunds*, per rimborsare da qui),
   niente bonifici, niente dati bancari. La chiave segreta (`sk_…`) si rifiuta.
   Sta nella busta del database (`CAMPI_SEGRETI`: `conti_donazioni.chiave`),
   non torna mai al browser (il pannello vede solo le ultime quattro cifre), e
   lui la revoca dal suo Dashboard quando vuole: da quel momento SocialBot non
   può fare più niente.
3. **La chiave si verifica per intero al collegamento**: si crea nel suo conto
   il prodotto «Donazione» e una sessione di pagamento di prova (mai mostrata,
   scade da sola). Un permesso che manca si scopre lì, con la frase di Stripe
   detta allo streamer (è la sua chiave), non alla prima donazione vera. Si
   salva solo se tutto è passato. A ogni apertura della scheda, e comunque non
   più di una volta al minuto, la chiave si riverifica: se è stata revocata
   la scheda lo dice e chiede una chiave nuova.
4. **Il pagamento nasce sul suo conto**, con la sua chiave: Checkout di Stripe
   con `price_data` sul suo prodotto, importo scelto, `submit_type=donate`,
   ritorno sulla pagina link con l'id della sessione, scadenza un'ora.
5. **La verità la dà Stripe, non il browser.** Al ritorno
   (`/u/<login>?dona=cs_…`) il server rilegge la sessione con la sua chiave;
   se è pagata la donazione si conta **una volta sola**: il registro passa da
   `attesa` a `pagata` con `UPDATE … WHERE stato='attesa'`, quindi due
   richieste nello stesso istante ne fanno vincere una. Si tiene il
   `payment_intent`, per rimborsare da qui. Chi ricarica rivede il grazie.
6. **Nessun webhook.** Una ronda ogni due minuti rilegge le sessioni in attesa
   (un'ora più un quarto d'ora di tolleranza): chi paga e chiude la scheda
   prima di tornare non si perde.
7. **Una configurazione sola**, `settings.donazioni`: `modo` (`conto` | `link`),
   `importi` suggeriti (al massimo sei, dentro i limiti), `minimo` (1–100),
   `massimo` (500 di serie, mai oltre 5.000: sulle pagine pubbliche gli importi
   alti in una volta sola sono quasi sempre errori o carte rubate in prova, e
   la contestazione ricade sullo streamer), `conMessaggio`, il testo del tasto,
   una frase, la valuta, il grazie in chat, e per Ko-fi l'impronta del token.
8. **Una donazione è un evento**, come un follow: `AlertsEngine.donazione()`
   fa crescere l'obiettivo `euro`, spara l'alert `donazione` (soglia «importo
   minimo») e, se acceso, ringrazia in chat. Da qualunque fonte: conto, Ko-fi,
   chiave API. Con `{ soloAvviso: true }` l'avviso si rimanda dal registro
   senza ricontare e senza ringraziare di nuovo.

## Satispay, la seconda strada

Stesso principio: il conto e' dello streamer. Nel suo pannello Business apre
un negozio online di tipo API e genera un **codice di attivazione** (vale una
volta sola). Con quel codice SocialBot registra presso Satispay una chiave
pubblica RSA nata per lui (`POST /g_business/v1/authentication_keys`) e
riceve un KeyId; la chiave privata sta nella busta (`conti_satispay.chiave`).
Da li' ogni richiesta e' firmata (`(request-target) host date digest`,
RSA-SHA256) e si verifica subito con una richiesta vera. Il pagamento e' un
`MATCH_CODE` con `redirect_url` verso `/u/<login>?dona=sp_<token>` e
`callback_url` verso `GET /dona/satispay/<login>?payment_id={uuid}`: il
registro tiene il nostro token come id e l'id di Satispay in `riferimento`,
cosi' il ritorno, la callback e la ronda arrivano tutti alla stessa riga e
`ACCEPTED` si conta una volta. Il rimborso e' un pagamento `REFUND` figlio
dell'originale. Solo in euro: con un'altra valuta Satispay non si offre. Con
Stripe e Satispay pronti, il blocco ha due tasti (`name="mezzo"`) e chi dona
sceglie; lo script manda il mezzo del tasto premuto, e il server accetta solo
un mezzo fra quelli pronti. `SATISPAY_HOST` punta alla sandbox, se serve.

Il blocco ha la sua icona, scelta fra quelle della pagina come per i link
(`icona`, di serie `cuore`).

## La pagina delle donazioni e le offerte

Chiesto così: «una pagina come quella della pagina link, super
personalizzabile SOLO per le donazioni, da cui si possono anche comprare
effetti ad hoc, e più range di prezzi per più effetti».

La pagina ha la **stessa forma** della pagina link: testa, tema, blocchi. Lo
store è uno (`storePagina(tabella)` in db.js) costruito su un altro tavolo,
`pagina_dona`: stessa pulizia, stesso salvataggio, e salvare l'una non tocca
l'altra. L'editor è uno: `LP.quale` (`link` | `dona`) sceglie la porta
(`/api/linkpage` o `/api/paginadona`), l'interruttore sta in cima all'editor
e dalla scheda Donazioni «Modifica la pagina» ci porta. Pubblica in
`/dona/<login>` (il vecchio `/u/<login>/dona` rimanda lì) e, appena il record DNS `dona` esiste, anche
`dona.socialbot.live/<login>`: il server prova da solo `dona.<dominio>`
(`candidatoDonaHost`, `dns.lookup` ogni dieci minuti finché non risponde) e da
quel momento un passaggio prima delle rotte traduce l'indirizzo corto e i
ritorni dal pagamento (`ritorno: 'dona'`) usano `urlPaginaDona(login)`; il
nome nel Caddyfile c'è già. `DONA_HOST` serve solo per un altro nome, o `no`
per non usarlo.

Il certificato del nome corto lo chiede Caddy da solo, ma lo chiede
all'avvio: se il record DNS arriva dopo, il primo tentativo fallisce e i
successivi si diradano (fino a un'ora fra uno e l'altro). Nel frattempo sulla
443 il nome risponde con un alert TLS (`ERR_SSL_PROTOCOL_ERROR` nel browser)
mentre sulla 80 rimanda già a https. Per non aspettare:
`docker compose restart caddy` e poi `docker compose logs --tail=50 caddy`,
dove deve comparire «certificate obtained successfully» per
`dona.socialbot.live`. Se il registro parla di un indirizzo IPv6
(`2a01:…`), il record AAAA di `dona` punta a qualcosa che non risponde: o si
fa rispondere il server anche in IPv6, o si toglie l'AAAA e resta l'A, come
per l'apice. Il blocco «Sostieni» della pagina link può portare lì
(`pagina: true`) invece di mostrare il modulo; sulla pagina delle donazioni
quel rimando non ha senso e resta il modulo, con un campo nascosto
`pagina=dona` che dice da dove si torna.

Le **offerte** (`settings.donazioni.livelli`): fino a otto scaglioni
`{ da, nome, effetto }`, in ordine di importo, senza doppioni, effetto come
riferimento alla libreria (`effetto:<comando>`). Chi dona le vede al posto
degli importi suggeriti («5 € · Applauso»), fra minimo e massimo. All'arrivo
della donazione `AlertsEngine.donazione()` calcola `livelloPer(livelli,
importo)`, la più alta raggiunta **dall'importo pagato** (mai da ciò che
manda il browser), e 1,2 s dopo l'avviso manda l'effetto in overlay con lo
stesso payload del tasto «Prova» (`effects.payload`). «Rimanda l'avviso» dal
registro non lo ripete.

## L'immagine di chi dona

Chiesto così: «da un prezzo definito dallo streamer in su, si possono mandare
effetti custom dell'utente che dona». Gli invarianti, da cui viene tutto:

1. **Niente va in onda senza che lo streamer lo voglia.** Di serie ogni
   immagine aspetta il suo ok nel registro («Da mandare in onda»); «va in onda
   da sola» è una scelta sua esplicita (`proprio.subito`).
2. **Il file è legato a una donazione.** Nasce col modulo (prima del
   pagamento), vive con la riga (`media`, `media_tipo`, `media_durata`,
   `media_stato` attesa|ok|no, `media_at`), muore con la riga: scaduta (la
   ronda toglie il file), eliminata (la rotta toglie il file), pulizia annuale
   (`pulisci()` torna i file delle righe tolte), canale cancellato (la cartella
   degli effetti va via con tutto il resto).
3. **Vale l'importo pagato.** Il modulo ammette il file solo se l'importo
   scelto arriva alla soglia; all'arrivo (`donazioneArrivata`) si ricontrolla
   con l'importo pagato e sotto la soglia, o a funzione spenta, il file va via.
4. **La porta è pubblica, quindi i limiti sono per costruzione**
   (`donazioni-media.js`): solo PNG, JPG, WEBP e GIF; 8 MB in ingresso e un
   file solo (multer, `fields: 12`); ricompressione come per gli effetti (webp
   ≤800 px; una GIF diventa un video webm muto ≤30 s), l'originale non si
   conserva; il ritmo del modulo (`dona-modulo`), lo spazio del canale e un
   tetto di 30 file in attesa per canale; ogni risposta che non apre un
   pagamento toglie il temporaneo.
5. **Il file sta nella cartella degli effetti del canale**
   (`effects/<login>/dn_<ora>_<caso>.<webp|webm>`): lo serve la porta
   dell'overlay che c'è già, con la chiave, e conta nello spazio come tutto il
   resto. `togli()` accetta solo nomi con quel prefisso: gli effetti dello
   streamer non si toccano.

La configurazione: `settings.donazioni.proprio = { attivo, da, durata,
subito }` (`da` 1..5.000 in valuta, `durata` 2..15 s per le immagini; niente
volume, perché una GIF è muta e video veri non ne entrano). `datiSostieni`
espone `proprio: { da, durata }` solo sul conto e se la soglia sta sotto il
massimo; il blocco mostra allora il campo file (`name="media"`, con
`enctype="multipart/form-data"` solo in quel caso) e lo script della pagina
lo spegne sotto la soglia, controlla tipo e peso prima di mandare e usa
`FormData` invece di `URLSearchParams`. In overlay va lo stesso payload di un
effetto della libreria (`donaMedia.payload`: tipo, url, durata, nessuna
etichetta), via `AlertsEngine.effettoDono`, 1,2 s dopo l'avviso.

Il registro: `/api/donazioni/stato` porta `daApprovare` (anteprima con l'url
dell'overlay); `/api/donazioni/azione` ha `manda` (attesa → ok, una volta
sola, e in onda), `scarta` (il file via, la riga resta), `rieffetto` (rimanda
un'immagine già in onda); `elimina` toglie anche il file. Le righe con
`effetto: true` mostrano «Rimanda l'immagine».

## Il blocco «Chi ha donato»

Un blocco della pagina (`donatori`: titolo, `quanti` 3..20, `modo` ultimi|top,
`periodo` mese|sempre) che mostra chi ha sostenuto lo streamer. I dati li porta
il server (`registroDonazioni.donatori(login)`: gli ultimi senza le rimborsate,
con «Qualcuno» per chi non ha scritto un nome; i primi per somma solo fra chi
un nome l'ha scritto, stesso nome in maiuscolo o minuscolo = stessa persona) e
si leggono **solo se la pagina ha il blocco** (`donatoriPer`), anche in
anteprima. Il modulo, quando il blocco c'è, dice a chi dona che il nome può
comparire in pagina: il consenso sta nella frase, prima del pagamento.

## Il registro, dentro SocialBot

Tabella `donazioni`: una riga per pagamento (`stripe:cs_…`, `kofi:<login>:<id>`,
`ext:<login>:<id>`), con stato, importo in centesimi, valuta, nome, messaggio,
riferimento del pagamento, data del rimborso. Anche i doppioni di Ko-fi e della
chiave API passano da qui (`INSERT OR IGNORE`), che sopravvive a un riavvio.
Nella scheda: i totali di oggi, degli ultimi trenta giorni, dell'anno e da
sempre (valuta per valuta, senza le rimborsate), la lista a pagine con ricerca,
lo scarico in CSV, e per ogni riga «Rimanda l'avviso», «Rimborsa» (solo per le
donazioni passate dal suo conto, con la sua chiave; senza il permesso *Refunds*
Stripe risponde 403 e lo si spiega) ed «Elimina» (la riga sparisce, nome e
messaggio compresi; l'obiettivo non cambia). Tutto è del proprietario del
canale (`requireOwner`): i moderatori non lo vedono. Il registro tiene un anno.

## Il modulo sulla pagina link

Il blocco `sostieni`, col tema della pagina: gli importi come bottoni, un campo
per un altro importo (fra minimo e massimo), il nome (se vuoi), il messaggio
(se lo streamer lo permette), un campo che una persona non vede (`sito`: se è
pieno, era un programma). Lo script della pagina manda il modulo via `fetch` e
naviga all'indirizzo di Checkout che riceve; senza script, il `POST` risponde
con una pagina-ponte che porta allo stesso posto. Nessun host di Stripe nel
codice della pagina: il CSP non cambia. In anteprima il modulo c'è ma non
manda niente. Al ritorno il blocco dice «Grazie, <nome>! 5 € arrivati.» e la
pagina con `?dona=` non finisce in cache.

## Le rotte

- `GET /api/donazioni/stato` (proprietario): stato del conto (`nessuno`,
  `incompleto` con la nota, `pronto` con la coda della chiave), riepilogo,
  prime cinquanta righe. `?rileggi=1` riverifica la chiave subito.
- `POST /api/donazioni/conto/collega` (proprietario, `{ chiave }`): verifica e
  salva. L'errore dice cosa manca; all'amministratore anche la frase di Stripe.
- `POST /api/donazioni/conto/scollega` (proprietario): la chiave si cancella.
- `GET /api/donazioni/elenco?prima=&n=` (proprietario): la pagina dopo.
- `GET /api/donazioni/esporta.csv` (proprietario): il registro intero.
- `POST /api/donazioni/azione` (proprietario, `{ id, cosa }`): `riproponi`,
  `rimborsa`, `elimina`.
- `POST /dona/<login>` (pubblica, modulo): apre il pagamento; JSON `{ url }` a
  chi lo chiede (`Accept: application/json`), pagina-ponte agli altri. Limite
  di frequenza per canale.
- `POST /dona/kofi/<login>` e `/api/ext` azione `donazione` come prima.

## Cosa serve dalla piattaforma

Niente. Nel `.env` non c'è nulla da mettere: le chiavi Stripe della
piattaforma servono agli abbonamenti, non alle donazioni.

## Le alternative guardate

Nessun processore muove soldi a commissione zero: le piattaforme «0%» (Ko-fi,
Liberapay, Streamlabs) azzerano la loro e lasciano quelle di PayPal o Stripe.
Fra le europee, Mollie (Paesi Bassi) ha un Connect con autorizzazione dal
pannello, avviso per pagamento impostato via API e quota facoltativa (iDEAL
0,29–0,32 €, carte 1,8 % + 0,25 €); Satispay (Italia) costa 0 % sotto 10 € in
negozio e 1,5 % online, ma solo per chi ha l'app; Liberapay (Francia, no
profit) è a 0 % ma per donazioni ricorrenti, senza avviso per ogni donazione.
Se serviranno, Mollie e Satispay si aggiungono con lo stesso registro.

## Collaudo

`test/unita/donazioni.test.mjs`: la configurazione (modo, importi, minimo,
massimo, impronta), il modulo letto, i dati del blocco con e senza conto.
`test/unita/donazioni-stripe.test.mjs`: con uno Stripe finto, la chiave si
verifica per intero e si salva solo se accettata, la segreta si rifiuta; il
pagamento nasce sul suo conto senza Connect e senza quote; la conferma conta
una volta sola e tiene il riferimento; la chiave revocata si scopre e si
spiega; il rimborso spiega il permesso che manca e segna la riga; la ronda; il
registro (doppioni, pagine, riepilogo, cancellazione).
`test/unita/donazioni-satispay.test.mjs`: la registrazione con il codice, ogni
firma verificata con la chiave pubblica mandata a Satispay, il pagamento con
ritorno e callback, la conferma una volta sola, il rimborso REFUND, la firma
rifiutata spiegata.
`test/contratto/donazioni.test.mjs`: la scheda nel pannello e negli aiuti, le
rotte col loro guardiano, niente Connect nel modulo, il blocco col modulo (e
non in anteprima), lo script, privacy e termini.
