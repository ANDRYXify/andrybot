# Emote 7TV — dove sono le porte, e perché lì

Il bot fa due cose diverse con le emote 7TV, e conviene tenerle separate perché
si rompono in modi diversi:

| | Cosa fa | Chi la usa | Serve un token? |
|---|---|---|---|
| `features/emotes.js` | **legge** la mappa nome→immagine | la chat a schermo dell'overlay | no |
| `features/seventv.js` | **scrive**: aggiunge, toglie, rinomina, carica | la scheda «Emote (7TV)» | sì, il token dello streamer |

La mappa letta da `features/emotes.js` serve anche il muro delle emote
(`fonti.settetv`) e, per i raid, `soloCanale`.

Il token è il JWT del **suo** account 7TV: è lui il proprietario del suo
emote-set, quindi solo lui (o chi ha il suo token) può modificarlo. Il token
resta sul server, non arriva mai al browser.

## Le tre porte, oggi

| Cosa | Dove | Perché lì |
|---|---|---|
| leggere un set | `GET /v3/emote-sets/<id>` (REST) | pubblico, nessuna autenticazione |
| cercare nella directory | `POST /v3/gql` → `emotes(query, …)` | pubblico |
| sapere di chi è il token | `POST /v4/gql` → `users { me { id editableEmoteSetIds … } }` | vedi «Collegato» |
| aggiungere / togliere / rinominare | `POST /v4/gql` → `emoteSets { emoteSet(id) { addEmote / removeEmote / updateEmoteAlias } }` | vedi sotto; richiede il token |
| **creare** una nuova emote | `POST /v4/emotes` (REST, multipart) | vedi sotto |

## Perché le modifiche al set stanno sulla v4

Fino al 26 settembre 2026 aggiungi, togli e rinomina passavano dalla v3:
`emoteSet(id).emotes(id, action, name)`. La v3 esiste ancora, ma a una modifica
che non può fare (token non riconosciuto, account senza permessi) risponde

```
{ "data": { "emoteSet": null } }
```

**senza errori**. Il bot leggeva «nessun errore» come «fatto»: il pannello
diceva «Emote aggiunta ✓» e su 7TV non cambiava niente. Da fuori: «le emote
7TV non vanno», senza un messaggio che dicesse perché.

Oggi le tre modifiche sono scritte come le scrive il sito di 7TV (le stesse
mutation, lette dal suo codice pubblico), e **«fatto» è quello che 7TV
restituisce**, non l'assenza di proteste (`esitoModifica` in `seventv.js`):

| Modifica | Fatto se 7TV restituisce |
|---|---|
| aggiungi | il set, con l'id del set del canale |
| togli | il set, con l'id del set del canale |
| rinomina | la voce, col nome nuovo |

Un'emote nel set è `{ emoteId, alias }`: per togliere o rinominare il pannello
manda anche il nome che l'emote ha adesso nel set, così si tocca proprio quella
voce. Senza alias, aggiungi usa il nome dell'emote.

Gli errori si leggono in due famiglie. Token non riconosciuto o senza permessi
(HTTP 401/403, o un messaggio di identità) → «7TV non accetta più il token
collegato: scollega 7TV e ricollegalo con un token nuovo». Tutto il resto →
«7TV dice: …», con le parole di 7TV.

## Collegato

«Collegato» vuol dire che **7TV ha riconosciuto il token, e che quel token può
cambiare il set del canale**. Si chiede a 7TV al momento del collegamento
(`users.me`): o chi ha il token è il padrone del set (lo stesso id utente 7TV
del canale), o il set è fra i suoi `editableEmoteSetIds` (è un editor). Se 7TV
dice di no il token non si salva, e il messaggio dice di chi era il token. Se
7TV non risponde non si decide niente: il token non si salva e si riprova.

Il token si trova dove lo tiene il sito di 7TV: nell'archiviazione locale di
https://7tv.app, sotto `7tv-token`, e nelle richieste verso `api.7tv.app` dopo
`Bearer`. Le istruzioni vecchie parlavano di richieste verso `7tv.io`, che il
sito non fa più: chi le seguiva non trovava niente da copiare. Quello che si
incolla si pulisce da `Bearer`, virgolette e spazi (`pulisciToken`).

Il pannello spiega la strada per browser (Chrome ed Edge: «Application»;
Firefox: «Archiviazione»; poi «Local storage», https://7tv.app, filtro
`7tv-token`) e dice che senza accesso a 7tv.app il token non c'è. Si è guardato
se le API nuove (v4, documentate su 7tv.app/api/docs) permettono un tasto
«Collega» al posto del copia e incolla: no. Il login v4 è un PKCE con
`redirect_uri` fisso su `7tv.app/login/callback`, e un `return_to` verso un
altro sito risponde 403 «return_to origin mismatch». Il token resta dentro
7tv.app; la pagina delle API stessa lo legge da `localStorage["7tv-token"]`.

## Le letture si ricordano solo quando sono riuscite

`features/emotes.js` tiene la mappa di un canale per dieci minuti. Prima ci
finiva anche una lettura andata male (7TV lento, Twitch che non risponde),
come se il canale non avesse emote: per dieci minuti la chat a schermo e il
muro mostravano il testo al posto delle emote 7TV, e il browser dell'overlay
teneva quella risposta altri cinque.

Ora:

- una lettura riuscita vale dieci minuti;
- una mancata si riprova dopo 30 secondi (non a raffica), e **non cancella**
  la mappa di prima: vale l'ultima buona;
- un 404 di 7TV è una risposta vera («questo canale su 7TV non c'è») e si
  ricorda come tale;
- `/overlay/:login/emotes` con una mappa incompleta risponde `no-store` e
  `X-Emote-Intera: 0`; l'overlay allora unisce senza togliere niente e
  richiede dopo un minuto.

Le prove: `test/unita/emote-lettura.test.mjs`.

## Perché il caricamento sta da un'altra parte

7TV ha **tolto `createEmote` da GraphQL**. Non è deprecata: non c'è più.
Interrogando lo schema v3 oggi si ottiene

```
Unknown field "createEmote" on type "Mutation"
```

e in v4 `EmoteMutation` espone soltanto `emote(id)` e `emotes(ids)` — cioè
modifiche a emote che **esistono già**. Il risultato, sul prodotto, è stato che
ogni caricamento falliva con un errore di schema, mentre tutto il resto della
scheda continuava a funzionare: da fuori sembrava che «le emote 7TV si fossero
rotte».

La porta di oggi è REST: `POST https://7tv.io/v4/emotes`, `multipart/form-data`
con **due** parti —

- `metadata` — JSON `{ name, tags, flags }`
- `file` — i byte dell'immagine (WebP, statico o animato)

La parte `metadata` non è opzionale: senza, 7TV risponde `400 missing metadata`
prima ancora di guardare chi sei. Questo è utile, ed è il modo in cui la sonda
qui sotto verifica la forma senza avere credenziali.

L'id della nuova emote lo leggiamo da più punti plausibili (`id`, `data.id`,
`emote.id`, `data.emote.id`) invece di scommettere su uno: 7TV l'ha già spostato
in passato, e un id che non si trova rompe l'aggiunta al set subito dopo.

## Come ce ne accorgiamo la prossima volta

```
node scripts/verifica-7tv.mjs
```

Parla con 7TV **vero**, quindi vive fuori da `npm test` (le prove devono girare
offline e uguali a se stesse). Controlla, adesso, che:

1. un set si legga ancora da `/v3/emote-sets` con `{ id, name }`;
2. nella v4 ci siano ancora `addEmote(id)`, `removeEmote(id)`,
   `updateEmoteAlias(id, alias)`, la voce `{ emoteId, alias }`,
   `editableEmoteSetIds`, e che senza token `users.me` sia `null`;
3. `createEmote` sia ancora **fuori** da GraphQL — se tornasse, la scelta va rivista;
4. `POST /v4/emotes` rifiuti senza `metadata` e, con `metadata`, si fermi solo
   sull'identità (`401 you are not logged in`): il punto esatto a cui può
   arrivare una sonda senza token, e la prova che forma e percorso reggono.

Le prove offline coprono l'altra metà: sostituiscono `fetch` e guardano
**cosa spediamo** e **come leggiamo la risposta**.

- `test/unita/seventv-carica.test.mjs`: indirizzo, parti, token, lettura
  dell'id, e un 401 letto come «token scaduto» invece che come guasto generico.
- `test/unita/seventv-set.test.mjs`: le modifiche vanno alla v4 con la forma
  del sito di 7TV; una risposta senza il set non è «fatto»; togli e rinomina
  mandano l'alias attuale; il collegamento rifiuta un token che 7TV non
  riconosce o che non può cambiare il set, e non decide niente se 7TV tace.

## Il pezzo che resta scoperto

`aggiungi` / `rimuovi` / `rinomina` contro 7TV vero si possono provare solo con
il token di un account che possiede un set: la sonda controlla lo schema, e
non manda modifiche a set di altri. Quello che non si può più avere è il
«fatto» finto: se 7TV non conferma, il pannello lo dice.
