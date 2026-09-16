# Le donazioni verso lo streamer

Chiesto così: «un modo per configurare le donazioni … verso lo streamer …
integrare nella pagina link con il tema coerente … e mettiamo anche un goal
donazioni», poi «non possiamo gestirlo tutto all'interno di socialbot?» e
«ovviamente ogni donazione va al corrispettivo streamer».

## Cosa c'era

Niente sulle mance, poi il tasto «Sostieni» verso un link esterno (Ko-fi,
PayPal…) con il webhook di Ko-fi per l'avviso. Un link è un link: chi vuole
donare esce dalla pagina, e senza Ko-fi non c'è avviso.

## Il modello, adesso

1. **Il conto è dello streamer.** Stripe Connect, conto *Standard*: lo streamer
   lo apre (o collega quello che ha) dalla scheda «Donazioni»; Stripe gli
   chiede identità e coordinate, il conto è suo, con la sua dashboard. Per la
   piattaforma un conto Standard non ha canone: niente costi per SocialBot.
2. **Il pagamento nasce sul suo conto** (*direct charge*: `Stripe-Account` sulla
   sessione di Checkout). Lo streamer è l'esercente: incassi, ricevute e
   contestazioni sono suoi; le commissioni di Stripe le paga lui sull'incasso,
   come con qualunque servizio. SocialBot può trattenere una quota
   (`DONAZIONI_QUOTA_PCT`, application fee), di serie zero, e la scheda la dice
   prima di collegare il conto. SocialBot non tiene mai fondi.
3. **La verità la dà Stripe, non il browser.** Al ritorno sulla pagina link
   (`/u/<login>?dona=cs_…`) il server rilegge la sessione con la chiave della
   piattaforma; se è pagata la donazione si conta. **Una volta sola**: il
   registro (`donazioni`, id = `stripe:cs_…`) passa da `attesa` a `pagata` con
   un `UPDATE … WHERE stato='attesa'`, quindi due richieste nello stesso
   istante ne fanno vincere una. Chi ricarica rivede il grazie, non fa partire
   un secondo avviso.
4. **Nessun webhook nuovo.** Una ronda ogni due minuti rilegge le sessioni in
   attesa (vivono un'ora, poi un quarto d'ora di tolleranza): chi paga e chiude
   la scheda prima di tornare non si perde. Il registro tiene le donazioni un
   anno e butta le sessioni scadute dopo un giorno.
5. **Una configurazione sola**, `settings.donazioni`: `modo` (`conto` | `link`),
   `importi` suggeriti (al massimo sei, dentro i limiti), `minimo` (1–100),
   `massimo` (500 di serie, mai oltre 5.000: sulle pagine pubbliche gli importi
   alti in una volta sola sono quasi sempre errori o carte rubate in prova, e
   la contestazione ricade sullo streamer), `conMessaggio`, il
   testo del tasto, una frase, la valuta, il grazie in chat, e per Ko-fi
   l'impronta del token (mai il token). Il blocco «Sostieni» la legge.
6. **Una donazione è un evento**, come un follow: `AlertsEngine.donazione()`
   fa crescere l'obiettivo `euro`, spara l'alert `donazione` (soglia
   «importo minimo») e, se acceso, ringrazia in chat. Da qualunque fonte:
   conto, Ko-fi, chiave API.

## Il modulo sulla pagina link

Il blocco `sostieni`, col tema della pagina: gli importi come bottoni, un campo
per un altro importo, il nome (se vuoi), il messaggio (se lo streamer lo
permette), un campo che una persona non vede (`sito`: se è pieno, era un
programma). Lo script della pagina manda il modulo via `fetch` e naviga
all'indirizzo di Checkout che riceve; senza script, il `POST` risponde con una
pagina-ponte che porta allo stesso posto. Nessun host di Stripe nel codice
della pagina: il CSP (`connect-src 'self'`, `form-action 'self'`) non cambia.
In anteprima il modulo c'è ma non manda niente.

Al ritorno il blocco dice «Grazie, <nome>! 5 € arrivati.» e la pagina con
`?dona=` non finisce in cache.

## Le rotte

- `GET /api/donazioni/stato` (proprietario): stato del conto (`nessuno`,
  `incompleto`, `pronto`; un conto non pronto si rilegge da Stripe, al massimo
  una volta al minuto o subito con `?rileggi=1`), quota, paesi, ultime
  donazioni e totali.
- `POST /api/donazioni/conto/collega` (proprietario, `{ paese }`): crea il
  conto se manca e torna l'indirizzo della registrazione di Stripe.
- `GET /api/donazioni/conto/riprendi` e `/ritorno`: dove Stripe rimanda; con la
  sessione del proprietario rileggono lo stato, altrimenti sono un rimando al
  pannello (`/#donazioni`).
- `POST /api/donazioni/conto/scollega` (proprietario): si dimentica l'id. Il
  conto su Stripe resta dello streamer.
- `POST /dona/<login>` (pubblica, modulo): apre il pagamento; JSON `{ url }` a
  chi lo chiede (`Accept: application/json`), pagina-ponte agli altri. Limite
  di frequenza per canale.
- `POST /dona/kofi/<login>` e `/api/ext` azione `donazione` come prima: il
  doppione lo scarta il registro (`INSERT OR IGNORE`), che sopravvive a un
  riavvio.

## Cosa serve dalla piattaforma

Nel Dashboard di Stripe, **Connect** attivato una volta (profilo piattaforma).
Nel `.env` basta `STRIPE_SECRET_KEY`; `DONAZIONI_QUOTA_PCT` è facoltativa.
Senza Connect, la creazione del conto fallisce e lo streamer vede «Stripe non ha
risposto come dovrebbe»; il motivo vero sta nel log.

## Nel pannello

La scheda **Donazioni**: il conto (paese, «Collega il mio conto Stripe», poi
«Continua la registrazione» o «Conto collegato», «Apri Stripe», «Scollega»),
il tasto (acceso, come si dona, importi, minimo, messaggio, testo, frase,
valuta, grazie in chat, prova dell'avviso), le ultime donazioni, e in fondo
Ko-fi e la chiave API per chi riceve altrove.

## Collaudo

`test/unita/donazioni.test.mjs`: la configurazione (modo, importi, minimo,
impronta), il modulo letto (importo scelto o libero, il campo trappola), i
dati del blocco con e senza conto. `test/unita/donazioni-stripe.test.mjs`: con
uno Stripe finto, il conto si crea Standard nel paese scelto e la registrazione
ha i due ritorni; il pagamento nasce sul conto dello streamer con l'importo,
la quota e il ritorno giusti; la conferma conta una volta sola, la sessione
scaduta si chiude, la ronda trova le pagate e lascia scadere le vecchie; il
registro scarta i doppioni. `test/contratto/donazioni.test.mjs`: la scheda
esiste nel pannello e nell'indice degli aiuti, le rotte hanno il loro
guardiano o sono dichiarate pubbliche, il blocco rende il modulo (e non in
anteprima), lo script lo manda via fetch, le pagine di privacy e termini lo
dicono.
