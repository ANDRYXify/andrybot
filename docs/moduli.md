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

- **trigger.tipo**: `comando` · `parola` · `evento` · `timer` · `manuale`
  - `comando`: `comando` (senza `!`) + `alias[]`. Match sulla prima parola dopo `!`.
  - `parola`: `testo` + `modo` (`contiene` · `esatto` · `inizia`).
  - `evento`: `evento` ∈ `follow · subscribe · raid · cheer · redemption · first · online · offline`.
  - `timer`: `minuti` (ogni N minuti) e/o `minMessaggi` (almeno N messaggi umani nuovi).
  - `manuale`: si attiva solo da "Prova" o via API in ingresso.
- **condizioni** (tutte facoltative): `tier` (scala `tutti < sub < vip < mod`), `cooldown`
  (secondi), `probabilita` (0..100), `soloLive`, `soloOffline`.
- **azioni** (in sequenza, max 8 eseguite per modulo):
  - `messaggio` `{ testo }` → scrive in chat (testo troncato a 400).
  - `effetto` `{ comando }` → fa partire un effetto/suono (salta tier e cooldown dell'effetto).
  - `contatore` `{ nome, op:'incrementa'|'azzera'|'imposta', valore? }`.
  - `webhook` `{ url, usaRisposta }` → POST esterno; se `usaRisposta` e la risposta è
    `{ "reply": "..." }`, il bot scrive quel testo in chat.
  - `attendi` `{ secondi }` → pausa (max 30s) prima dell'azione successiva.
  - `overlayTesto` `{ testo, durata }` → testo centrato sull'overlay OBS.
  - `timeout` `{ secondi }` → moderazione (vedi note sotto).

Ogni azione è isolata in `try/catch`: un errore **non blocca** quelle successive.

## Variabili (nei testi)

`$user` (chi ha attivato) · `$touser` (primo argomento o `$user`) · `$args` (tutto il testo
dopo il comando) · `$arg1 $arg2 …` (singole parole) · `$canale` · `$uptime` · `$gioco` ·
`$titolo` · `$count(nome)` · `$random(a,b)` · `$pick(a|b|c)`.
Eventi: `$raider $viewers` (raid) · `$mesi` (sub) · `$bits` (cheer) · `$premio` (riscatto punti).

Le variabili che richiedono I/O (`$uptime/$gioco/$titolo`) sono risolte con un `await` prima
di comporre il messaggio (stato live in cache 30s). Sostituzione con semplice `replace`:
**niente `eval`**, nessun template engine. Le variabili sconosciute diventano stringa vuota.

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
