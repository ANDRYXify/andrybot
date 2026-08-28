# Emote 7TV — dove sono le porte, e perché lì

Il bot fa due cose diverse con le emote 7TV, e conviene tenerle separate perché
si rompono in modi diversi:

| | Cosa fa | Chi la usa | Serve un token? |
|---|---|---|---|
| `features/emotes.js` | **legge** la mappa nome→immagine | la chat a schermo dell'overlay | no |
| `features/seventv.js` | **scrive**: aggiunge, toglie, rinomina, carica | la scheda «Emote (7TV)» | sì, il token dello streamer |

Il token è il JWT del **suo** account 7TV: è lui il proprietario del suo
emote-set, quindi solo lui (o chi ha il suo token) può modificarlo. Il token
resta sul server, non arriva mai al browser.

## Le tre porte, oggi

| Cosa | Dove | Perché lì |
|---|---|---|
| leggere un set | `GET /v3/emote-sets/<id>` (REST) | pubblico, nessuna autenticazione |
| cercare nella directory | `POST /v3/gql` → `emotes(query, …)` | pubblico |
| aggiungere / togliere / rinominare | `POST /v3/gql` → `emoteSet(id).emotes(id, action, name)` | è l'unica; richiede il token |
| **creare** una nuova emote | `POST /v4/emotes` (REST, multipart) | vedi sotto |

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
2. `emoteSet(id).emotes(id, action, name)` esista ancora in GraphQL;
3. `createEmote` sia ancora **fuori** da GraphQL — se tornasse, la scelta va rivista;
4. `POST /v4/emotes` rifiuti senza `metadata` e, con `metadata`, si fermi solo
   sull'identità (`401 you are not logged in`): il punto esatto a cui può
   arrivare una sonda senza token, e la prova che forma e percorso reggono.

Le prove offline (`test/unita/seventv-carica.test.mjs`) coprono l'altra metà:
sostituiscono `fetch` e guardano **cosa spediamo** — indirizzo, parti, token,
lettura dell'id, e un 401 letto come «token scaduto» invece che come guasto
generico.

## Il pezzo che resta scoperto

`aggiungi` / `rimuovi` / `rinomina` si possono verificare solo nello schema: per
provarle davvero serve il token di un account che possiede un set. La sonda
controlla la firma della mutation, che è la parte che 7TV cambia.
