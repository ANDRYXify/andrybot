# Le donazioni verso lo streamer

Chiesto così: «un modo per configurare le donazioni … verso lo streamer …
integrare nella pagina link con il tema coerente … e mettiamo anche un goal
donazioni».

## Cosa c'era

Niente sulle mance. I bit erano l'unico denaro che il bot vedeva, e facevano
crescere l'obiettivo `bit`. La pagina link riconosceva già gli indirizzi di
Ko-fi, PayPal e Streamlabs (ci metteva l'icona giusta), ma un link è un link:
nessun avviso quando qualcuno dona, niente da mostrare.

## Come funziona davvero, fuori

Ko-fi ha una pagina per ricevere mance e un webhook gratuito: a ogni pagamento
manda un modulo (`application/x-www-form-urlencoded`) con un campo `data` che
contiene un JSON: `verification_token`, `message_id`, `type`, `from_name`,
`amount`, `currency`, `message`, `is_public`. Il token lo mostra nelle sue
impostazioni; chi riceve lo confronta. Se non riceve un 200 in tempo, ritenta,
con lo stesso `message_id`. PayPal.me è solo un link. Buy Me a Coffee e Patreon
hanno webhook firmati con HMAC: si possono aggiungere con lo stesso schema.
Streamlabs e StreamElements hanno i loro alert; chi li usa non ha bisogno dei
nostri, e comunque da loro le mance in overlay e in chat sono gratis, quindi
qui sono gratis.

## Il modello

1. **Una configurazione sola**, `settings.donazioni`: dove si dona (il link),
   il testo del tasto, una frase, la valuta, il grazie in chat. Del token di
   Ko-fi si conserva **l'impronta** (`segreti.impronta`, sale = login), mai il
   token: chi legge il database non può fingersi Ko-fi, e il pannello vede
   solo «impostato».
2. **Il tasto sulla pagina link è un blocco** (`sostieni`) che legge quella
   configurazione. Il blocco decide solo come si presenta (titolo, frase,
   testo del tasto, se mostrare l'obiettivo); il link e la valuta stanno in
   un posto solo. Si veste col tema come gli altri blocchi (carta, accento,
   bottone in evidenza), entra con la stessa animazione, e se le donazioni
   sono spente o manca il link non compare in pubblico; in anteprima si vede
   segnato «da completare».
3. **Una donazione è un evento**, come un follow: `AlertsEngine.donazione()`
   fa crescere l'obiettivo `euro` dell'importo, spara l'alert `donazione`
   (testo con `{user}`, `{importo}`, `{messaggio}`, soglia «importo minimo»)
   e, se acceso, ringrazia in chat. Il bot presta la chat al motore
   (`say`), come fa con le clip.
4. **L'obiettivo `euro`** è una quarta conta. Il conto tiene i centesimi, si
   scrive «12,50 € / 100 €» in diretta e sulla tela, e «Quanti ne ho adesso»
   non lo tocca: non c'è un numero da chiedere a nessuno.

## Da dove arriva una donazione

- `POST /dona/kofi/<login>`: un ingresso esterno dichiarato
  (`INGRESSI_ESTERNI`, senza sessione), col corpo letto come modulo. Senza
  impronta salvata, o con un token diverso, risponde 401 e basta. Se
  combacia risponde 200 **subito**, come a Kick, poi lavora: limite di
  frequenza per canale, doppioni scartati per `message_id` (un'ora di
  memoria, volatile: dopo un riavvio un ritentativo può passare due volte, e
  si preferisce quello a perderne una), e l'evento.
- `POST /api/ext/<login>` con `azione: "donazione"`, `importo`, `user`,
  `messaggio`, `valuta`, `id`: per chi usa un altro servizio e ha una propria
  automazione. La chiave API del canale è l'autenticazione, come per le altre
  azioni.

Nessun importo arriva dal browser: solo dal webhook o dalla chiave API.

## Nel pannello

Nella scheda «Pagina link», la carta **Donazioni**: interruttore, link, testo
del tasto, valuta, frase, grazie in chat, e la parte Ko-fi con l'indirizzo del
webhook da incollare e il campo del token (che si svuota dopo il salvataggio:
resta l'impronta). «Prova l'avviso» spara l'alert finto. L'alert si veste
nella scheda Overlay come gli altri; l'obiettivo si aggiunge fra gli
obiettivi con «Conta: euro donati».

## Collaudo

`test/unita/donazioni.test.mjs`: pulizia (https, limiti, impronta), lettura
del corpo di Ko-fi, mancia dalla chiave API, doppioni e scadenza, importi
scritti come si scrivono, dati per il blocco. `test/contratto/donazioni.test.mjs`:
l'alert esiste dove nasce, si veste e si salva; l'obiettivo dove si conta, si
pulisce e si disegna; il blocco dove si pulisce, si rende e si aggiunge; il
webhook è dichiarato, verificato e risponde prima di lavorare; il token non
viaggia verso il browser; il motore fa quel che dice con un canale di prova.
