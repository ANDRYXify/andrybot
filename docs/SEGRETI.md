# I segreti: cosa c'è dentro, e cosa vede chi ruba il database

## Il criterio

Un database o un backup rubato deve essere **inutile**. Non «difficile da usare»:
inutile. E se una chiave dovesse trapelare, deve valere per **una cosa sola** —
non per tutto quello che c'è dentro.

## Cosa c'era, e cosa mancava

Cifrati a riposo: i token OAuth di Twitch e Kick. Basta.

**In chiaro** stavano, e sono i più preziosi:

| dove | cosa | cosa ci fa chi lo ruba |
|---|---|---|
| `telegram.token` | il token del bot Telegram dello streamer | controlla il suo bot: legge il gruppo, scrive a suo nome |
| `telegram.webhook_secret` | il segreto nel percorso del webhook | gli manda eventi finti |
| `spotify_tokens.*` | access, refresh e **client_secret** dell'app | usa il suo Spotify, e la sua app |
| `tiktok_tokens.*` | access e refresh (un anno di vita) | pubblica e legge a suo nome |
| `seventv_tokens.token` | il JWT dell'account 7TV | gestisce le sue emote |
| `moderatori.invite_token` | l'invito non ancora accettato | entra come moderatore |
| `settings.apiKey` | la chiave API in ingresso del canale | comanda i moduli del canale |
| `settings.youtube.apiKey` | la chiave API di YouTube | consuma la sua quota |

E tre difetti di struttura, sotto:

1. **Una chiave sola, per sempre.** Tutto derivava da `SESSION_SECRET` con un
   solo passaggio. Un segreto trapelato apriva ogni riga di ogni tabella, di
   ieri e di domani. Non c'era modo di ruotare senza buttare via tutto.
2. **La chiave API stava in chiaro.** Il confronto era già a tempo costante — su
   quello non c'era niente da correggere — ma la chiave si conservava per intero
   nelle impostazioni del canale, e il database rubato la consegnava funzionante.
3. **I backup erano copie del database.** Il backup rubato vale il database
   rubato.

## Come è fatta adesso

### Una busta per ogni segreto, con la sua chiave

Ogni valore ha una **chiave sua**, casuale, di 32 byte, usata per quel valore e
per nient'altro. Quella chiave non si conserva in chiaro: viene chiusa dentro una
seconda busta, cifrata con la chiave maestra. Nel database finisce solo:

```
enc:2:<kid>:<chiave-avvolta>:<iv>:<tag>:<testo-cifrato>
```

Due giri di cifratura, e sono l'uno dentro l'altro: per leggere il testo serve la
chiave del valore, e per avere quella serve la maestra. La maestra **non tocca
mai** il testo del segreto.

Perché una chiave per valore e non una per tutti: perché rompere una busta non
apre le altre. Con una chiave sola, il lavoro di forzarne una vale per tutte.

### La busta sa dove abita

Ogni busta è legata al suo posto (tabella, colonna, riga) come **dato
autenticato**. Una busta spostata da una riga all'altra non si apre: il conto non
torna. Senza questo, chi può scrivere nel database si copia il token
dell'amministratore nella propria riga e diventa lui — senza rompere nessuna
cifratura.

### Chiavi che cambiano

Le chiavi maestre sono un **anello**. Ognuna ha un numero (`kid`), e si ricava dal
segreto del server più quel numero. La più recente cifra; le precedenti servono
solo ad aprire quello che avevano chiuso. Ruotare vuol dire aggiungere un anello:
niente si perde, e il nuovo materiale non è più leggibile con la chiave vecchia.
Una passata riavvolge le buste vecchie sulla chiave nuova quando le incontra.

### La chiave API non si conserva

Di una chiave API si conserva **l'impronta** (SHA-256 con un sale per canale),
non la chiave. Chi ruba il database trova impronte: non ci si entra. Il confronto
resta a tempo costante, come già era.

Conseguenza voluta: la chiave si vede **una volta sola**, quando nasce. Se si
perde, se ne fa un'altra — non si può ripescare, e questo è il punto.

### I backup sono cifrati

Il backup è la stessa busta applicata al file intero, con la sua chiave. Un
backup senza il segreto del server è rumore.

## Il cancello

`node scripts/verifica-segreti.mjs` legge lo schema del database e pretende che
ogni colonna che sa di segreto (`token`, `secret`, `access`, `refresh`, `key`…)
o passi dalla busta, o sia dichiarata non-segreta **con un motivo scritto**. Una
colonna nuova che conserva un segreto in chiaro non può entrare in silenzio.
