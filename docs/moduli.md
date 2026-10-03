<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# Moduli — automazioni QUANDO → SE → ALLORA (tecnico)

I **Moduli** danno allo streamer libertà totale di costruire automazioni, ma in modo
**sicuro su un server condiviso**: un modulo è **dati** (JSON nel DB), **mai codice**.
Non esiste alcun modo per lo streamer di eseguire codice arbitrario: le uniche cose che
un modulo può fare sono le **azioni predefinite** elencate sotto.

Modello mentale: **QUANDO** succede qualcosa, **SE** valgono certe condizioni, **ALLORA**
il bot esegue una o più azioni.

## Modello dati

```jsonc
{
  "id": 1, "nome": "Social", "attivo": true,
  "trigger":   { "tipo": "comando", "comando": "social", "alias": ["socials"] },
  "condizioni":{ "tier": "tutti", "cooldown": 10, "probabilita": 100, "soloLive": false, "soloOffline": false },
  "azioni":    [ { "tipo": "messaggio", "testo": "Seguimi su ... $user" } ]
}
```

- **trigger.tipo**: `comando` · `parola` · `evento` · `timer` · `manuale` · `arrivo`
  - `comando`: `comando` (senza `!`) + `alias[]`. Match sulla prima parola dopo `!`.
  - `parola`: `testo` + `modo` (`contiene` · `esatto` · `inizia`).
  - `evento`: `evento` ∈ `follow · subscribe · raid · cheer · redemption · first · online · offline`.
  - `timer`: `minuti` (ogni N minuti) e/o `minMessaggi` (almeno N messaggi umani nuovi).
  - `manuale`: si attiva solo da "Prova" o via API in ingresso.
- **condizioni** (tutte facoltative): `tier` (scala `tutti < sub < vip < mod`), `cooldown`
  (secondi), `probabilita` (0..100), `soloLive`, `soloOffline`, `minQuantita`/`maxQuantita`.
- **La scala di un evento** (`minQuantita` / `maxQuantita`): certi eventi portano un
  numero, e quel numero e' la posta. Oggi: `cheer` → Bit, `raid` → spettatori,
  `subscribe` → mesi. Un innesco che non ha una scala (un comando, un timer, un
  follow) non viene toccato dalle due soglie: non c'e' niente da misurare. Dentro
  un evento che la scala ce l'ha, un numero che non arriva vale ZERO e la soglia
  lo ferma.
  - `0` = nessun limite. Un tetto piu' basso del pavimento si butta al
    salvataggio: e' un refuso, e lascerebbe un modulo che non scatta mai.
  - Le due soglie si valutano PRIMA di tutto cio' che consuma (costo, cooldown,
    cooldown per utente), quindi un cheer da 10 su un modulo «da 1000 in su» non
    paga niente e non brucia nessuna pausa.
  - Servono a scrivere una SCALA: un modulo per fascia (`1-99`, `100-999`,
    `1000` in su). Senza il tetto, un cheer da 5000 farebbe scattare insieme
    tutti gli scaglioni sotto di lui.
- **azioni** (in sequenza, max 8 eseguite per modulo):
  - `messaggio` `{ testo }` → scrive in chat (testo troncato a 400).
  - `effetto` `{ comando }` → fa partire un effetto/suono (salta tier e cooldown dell'effetto).
  - `contatore` `{ nome, op:'incrementa'|'azzera'|'imposta', valore? }`.
  - `webhook` `{ url, usaRisposta }` → POST esterno; se `usaRisposta` e la risposta è
    `{ "reply": "..." }`, il bot scrive quel testo in chat.
  - `attendi` `{ secondi }` → pausa (max 30s) prima dell'azione successiva.
  - `overlayTesto` `{ testo, durata }` → testo centrato sull'overlay OBS.
  - `timeout` `{ secondi }` → moderazione (vedi note sotto).
  - `regia` `{ cosa:'scena', scena }` | `{ cosa:'muto', fonte, come:'inverti'|'muta'|'smuta' }` |
    `{ cosa:'transizione', transizione }` → un passo di regia di CONSOLify (stessa forma dei passi
    dei tasti), eseguito dalla pagina del pannello aperta sul computer della regia attraverso il
    ponte (`console.passoDiRegia`). I nomi passano dall'espansione (`$arg1`). Vedi
    `docs/REGIA-PONTE.md`.

Ogni azione è isolata in `try/catch`: un errore **non blocca** quelle successive.

## Variabili (nei testi)

`$user` (chi ha attivato) · `$touser` (primo argomento o `$user`) · `$args` (tutto il testo
dopo il comando) · `$arg1 $arg2 …` (singole parole) · `$canale` · `$uptime` · `$gioco` ·
`$titolo` · `$count(nome)` · `$random(a,b)` · `$pick(a|b|c)`.
Eventi: `$raider $viewers` (raid) · `$mesi` (sub) · `$bits` (cheer) · `$premio` (riscatto punti).

Le variabili che richiedono I/O (`$uptime/$gioco/$titolo`) sono risolte con un `await` prima
di comporre il messaggio (stato live in cache 30s). Sostituzione con semplice `replace`:
**niente `eval`**, nessun template engine. Le variabili sconosciute diventano stringa vuota.

## Quando arriva in chat (le accoglienze)

Un'**accoglienza** è un Modulo con l'innesco `arrivo`: quando una persona scelta
arriva in chat, il bot fa quello che il modulo dice. Non c'è un secondo motore:
la sotto-scheda «Chi arriva in chat» è una vista dei Moduli con quell'innesco,
stesso archivio e stesso editor. La regola sta in `src/features/arrivi-regola.js`
(pura, senza import: la legge anche `db.js` per ripulire), i gesti in
`src/features/arrivi.js`.

```jsonc
{
  "trigger":    { "tipo": "arrivo", "quando": "diretta", "zitti": true },   // diretta | giorno | assenza (+ giorni)
  "condizioni": { "chi": { "modo": "solo", "persone": [{ "p": "twitch", "id": "123", "login": "tizio", "nome": "Tizio" }], "gruppi": ["vip"] } },
  "azioni":     [ { "tipo": "effetto", "comando": "coriandoli" }, { "tipo": "messaggio", "aCaso": true, "testo": "Ciao $user!\nEccoti, $user!" }, { "tipo": "gioco", "gioco": "caso" } ]
}
```

**Per chi** (`condizioni.chi`) vale per **ogni** innesco, non solo per gli
arrivi: un comando può rispondere in un modo a Tizio e in un altro a tutti gli
altri. `modo: solo | tranne`; `persone` per nome; `gruppi` fra `mod`, `vip`,
`sub`. Assente = per tutti (i moduli fatti prima). Un contesto senza nessuno
davanti (timer, inizio diretta) con «solo» si ferma, con «tranne» passa.

Gli invarianti, per costruzione:

- **Una persona si riconosce per id.** Si confronta l'id della piattaforma
  quando c'è (Twitch `user-id`, Kick `user_id`, YouTube `UC…`), il login
  altrimenti; un id diverso vince su un login uguale (il nome è passato a un
  altro). Scelta per nome, al primo messaggio l'id si appunta nel modulo
  (`modules.appuntaPersona`) e il nome si aggiorna se cambia.
- **La persona batte il gruppo, il gruppo batte tutti** (`chiVince`): fra le
  accoglienze che riguardano qualcuno scattano solo quelle del livello più
  alto (2 per nome, 1 per gruppo, 0 per tutti). «Tranne» non nomina nessuno.
- **Un'occasione, un'accoglienza.** L'occasione è la diretta in corso
  (Twitch: il suo `started_at`, che un riavvio non cambia; Kick: `da`, scritto
  all'inizio in `stato_vivo`), fuori diretta il giorno nel fuso del canale;
  «ogni giorno» è sempre il giorno. Il segno sta in `arrivi(channel, modulo,
  chi, occasione, volte, ts)` e si mette con un'unica istruzione che vale solo
  se l'occasione è diversa: due messaggi di fila, o un riavvio, non danno due
  accoglienze. «Dopo un'assenza» vuole un messaggio di prima, lontano almeno N
  giorni (dalla riga di `presenze` letta prima di questo messaggio).
- **Nel tubo**: dopo l'antispam (chi è appena stato fermato non si accoglie),
  prima del saluto generico di `presenze`, che tace per chi è riguardato.
  Un bot noto si accoglie solo se scritto per nome; il canale, il bot e chi
  scrive dal bot mai.
- **La fila**: una accoglienza alla volta per canale, 1,2 s dopo il messaggio
  (prima si risponde a quello che ha scritto), con la pausa del canale
  (`settings.arrivi.pausa`, 0-60 s, 5 di base); al più 25 in fila; se sarebbe
  partita più di tre minuti dopo l'arrivo, si salta.
- **Chi entra senza scrivere** (`zitti`): solo Twitch, solo le persone per
  nome, nel giro da cinque minuti della lista di chi c'è; la chiave è sempre
  l'id (chiesto a Twitch se manca), così chi entra in silenzio e poi scrive
  non è accolto due volte.

Le azioni nuove, utili anche fuori dagli arrivi:

- `gioco` (`gioco`: una voce del giro o `caso`): `giro-giochi.avviaVoce`, con
  le regole del giro (giochi spenti, uno già aperto non si interrompe, quelli
  dell'overlay vogliono la diretta) e conta per la distanza del giro.
- `modulo` (`modulo`: id, oppure `comando`: un comando semplice creato in chat):
  esegue un altro modulo come se l'avesse scritto la stessa persona, con le sue
  condizioni ma senza costo; mai se stesso né chi l'ha chiamato
  (`ctx._catena`), al più tre in fila.
- `messaggio` con `aCaso: true`: una riga per frase, ne esce una.
- Variabili: `$assenza` (giorni senza scrivere), `$volte` (accoglienze avute
  da questo modulo, questa compresa).

La prova «come se arrivasse…» (`POST /api/streamer/moduli/:id/prova` con
`persona`) mette la persona al posto di chi scrive, senza segnare niente.
I suggerimenti di «Per chi» (`GET /api/streamer/persone/recenti`) sono chi ha
scritto nel canale della sessione negli ultimi 14 giorni.

Prove: `test/unita/arrivi.test.mjs` (regola e gesti), `test/unita/moduli-arrivi.test.mjs`
(Per chi, Esegui un comando, frase a caso, Avvia un gioco, prova),
`test/contratto/arrivi-cablaggio.test.mjs` (i fili), `scripts/verifica-arrivi.mjs`
(il pannello in un browser, con `--selftest`).

## Aggancio nel bot

- **Chat** (`bot.js` → `chat.on('message')`): `modules.onMessage(msg, say)` dopo gli Effetti.
  Ignora `msg.isSelf`/`from_bot` (il bot non si auto-innesca). Gestisce `comando`, `parola`
  e l'evento `first` (tag Twitch `first-msg`).
- **Eventi** (`bot.js` → `_onTwitchEvent`): `modules.onEvent(ev, say)`. `ev.type`
  (`channel.follow`, …) è mappato al nome breve; le variabili evento arrivano da `ev.data`.
- **Timer** (`modules.start({ manager })`): un `setInterval` ogni 30s scorre i moduli attivi
  con trigger `timer`, solo per i canali in `streamers.active()`, rispettando `minuti` e
  (se richiesto) `minMessaggi` via `memory.messagesSince(...)`. Usa `manager.say`.

## Sicurezza

- **Nessun codice dello streamer sul server.** I moduli sono solo dati; le azioni sono un
  insieme chiuso. La sostituzione delle variabili non usa mai `eval`.
- **Webhook con guardia anti-SSRF** (`fetchWebhook`): accetta solo `http/https`; rifiuta gli
  IP privati/loopback/link-local/riservati sia se scritti direttamente sia **dopo la
  risoluzione DNS** del nome (`dns.lookup`, tutti gli indirizzi). `redirect: 'manual'` (un
  redirect non può aggirare la guardia), timeout 5s (`AbortController`), User-Agent
  `SocialBot-Webhook/1.0`, corpo JSON del contesto, lettura della risposta limitata a ~10KB,
  parsing JSON tollerante. Non punta mai verso l'interno della rete.
- **Chiave API in ingresso** (`POST /api/ext/:login`): confronto **timing-safe**
  (`crypto.timingSafeEqual`; lunghezze diverse → 404). Chiave errata → **404** (nessun
  indizio). Rate-limit soft in memoria (30/min per login). Solo `POST`.

## Contratto API (dashboard)

- `GET /api/streamer/moduli` → `{ moduli, effettiDisponibili, apiKey, apiUrl }`
- `POST /api/streamer/moduli` (body = modulo, `id?` per modifica) → `{ ok, id }`
- `DELETE /api/streamer/moduli/:id` → `{ ok }`
- `POST /api/streamer/moduli/:id/prova` → esegue una volta (salta le condizioni) → `{ ok }`
- `POST /api/streamer/moduli/:id/toggle` (body `{ attivo }`) → `{ ok }`
- `POST /api/streamer/apikey` → `{ apiKey }` (rigenera)
- `POST /api/ext/:login` con `Authorization: Bearer <apiKey>` (o `?key=`), body
  `{ azione:'messaggio'|'effetto'|'modulo', testo?|comando?|modulo? }` → `{ ok }`

## Timeout (moderazione)

L'azione `timeout` viene tentata **solo se** `helix` espone un metodo `timeout()`. Non
inventiamo endpoint né scope: se il metodo non esiste, l'azione viene saltata con un log di
debug, senza rompere le altre azioni. Per abilitarla davvero servirà aggiungere a Helix il
metodo e lo scope `moderator:manage:banned_users` (fuori dallo scope di questo lavoro).

## Plugin operatore (≠ Moduli)

I **plugin** in `plugins/` sono **codice server-side FIDATO**, riservato all'operatore
(andryxify), NON agli streamer. Vedi [`../plugins/README.md`](../plugins/README.md).
