# Instagram, collegato con un tasto

Prima, per avere gli avvisi dei post nuovi, bisognava creare un'app sul sito di
Meta, collegare l'account a una Pagina Facebook e copiare nel pannello un id e
un token. Adesso c'è «Collega Instagram», come per TikTok. Il token copiato a
mano resta come strada di riserva, sotto «avanzato».

## Il giro

Verificato sulla documentazione di Meta (accesso aziendale di Instagram,
settembre 2026).

1. «Collega Instagram» chiede al server dove andare. Il server crea uno stato
   monouso legato al canale e manda a `www.instagram.com/oauth/authorize` con
   l'ID app di Instagram e due permessi: `instagram_business_basic` (leggere i
   post) e `instagram_business_content_publish` (pubblicare la storia della
   settimana). Messaggi e commenti non si chiedono. Con `force_reauth=true`
   Instagram chiede sempre con che account entrare: se il browser è già dentro
   con un account personale, non si collega quello per sbaglio.
2. Instagram torna su `/auth/instagram/callback` con un codice valido un'ora.
   Il codice si cambia con un token corto e l'**id di app** dell'account.
3. Il token corto si cambia con uno lungo, che dura sessanta giorni.
4. `/me` dice l'**id dell'account professionale** e il nome.

Se uno dei passi non va, il collegamento non si fa. Un collegamento a metà
sembra fatto e poi non pubblica.

Ogni ritorno ha la sua frase nel pannello: fatto, permesso negato, rimasto a
metà troppo a lungo, non riuscito, e partito da fuori. L'ultimo è chi arriva
senza stato, per esempio col link che la dashboard di Meta chiama «URL di
incorporamento»: quel link non serve, perché il tasto costruisce il suo, con
lo stato. La dashboard ci mette tutti i permessi del caso d'uso (messaggi,
commenti, statistiche); il tasto ne chiede due, e alla revisione dell'app si
presentano quei due.

## Due identificativi

Servono tutti e due, e non sono intercambiabili:

| id | da dove | a cosa serve | dove sta |
|---|---|---|---|
| id di app | lo scambio del codice | Meta lo mette nelle richieste firmate (revoca, cancellazione) | nella cassaforte dei token, accanto al token |
| id dell'account | `/me` | le chiamate lo vogliono nel percorso (`/<id>/media`) | nelle impostazioni, col nome |

Con l'id di app al posto di quello dell'account la storia non partirebbe mai;
con quello dell'account al posto di quello di app una revoca non troverebbe
nessuno. Per sicurezza, quando Meta bussa, si cerca in tutti e due i posti.

## Il ritorno vuole la sessione

Il ritorno da Instagram passa solo con la sessione del proprietario che ha
cominciato il giro, e solo se lo stato è il suo. Con lo stato soltanto, chi
comincia il giro per il SUO canale e lo fa finire a un'altra persona si
troverebbe collegato l'Instagram di quella persona, e ci potrebbe pubblicare
storie. Il cookie di sessione è `SameSite=Lax`, quindi arriva anche tornando da
instagram.com.

## Il token

Il token lungo sta nella cassaforte dei token, cifrato come quelli di Twitch.
Nelle impostazioni restano solo cose che si possono mostrare: l'id
dell'account, il nome, la strada (`via: 'instagram'`). Collegando col tasto il
token copiato a mano si svuota: vince quello che lo streamer ha fatto apposta.

Tutti quelli che parlano con Instagram (gli avvisi dei post nuovi, i posti della
settimana, «Manda», la prova dal pannello) chiedono le credenziali a una
funzione sola, `credenzialiInstagram`. Dice anche la strada, perché i token del
tasto parlano con `graph.instagram.com` e quelli copiati a mano con
`graph.facebook.com`.

Dal pannello arrivano le scelte (avvisi accesi, messaggio, chat), mai
l'identità: l'account collegato col tasto lo scrive solo il ritorno da
Instagram.

Il token si allunga da solo. Ogni sei ore, se mancano meno di trenta giorni, si
chiede a Instagram di rinnovarlo (a quel punto ha già più del giorno di vita
che Instagram pretende). Uno scaduto non vale più: il pannello dice di
ricollegare.

## Le porte di Meta

Due indirizzi senza sessione, perché chi bussa è Meta:

- `/instagram/scollega`: qualcuno ha tolto l'app dal suo Instagram;
- `/instagram/cancella`: qualcuno chiede di cancellare i suoi dati.

Arrivano con un `signed_request`, firmato HMAC-SHA256 con la chiave segreta
dell'app. La firma si confronta a tempo costante; una firma che non torna non
tocca niente. In tutti e due i casi si cancellano il token e il nome.

La cancellazione risponde con un indirizzo e un codice, come vuole Meta.
L'indirizzo, `/instagram/cancellazione`, dice com'è andata. La cancellazione si
fa subito, quindi non c'è niente da ricordare: il codice porta con sé la sua
firma, e la pagina dice «fatto» solo ai codici nostri. Un codice inventato non
diventa una conferma. La pagina non va nei motori di ricerca.

Le due porte stanno fra gli ingressi esterni di `vetrina.js`, e
`scripts/verifica-porte.mjs` conosce il loro guardiano (`firmaDiMeta`).

## Cosa serve sul server

Nel `.env`:

```
INSTAGRAM_APP_ID=…
INSTAGRAM_APP_SECRET=…
```

Sono l'ID e la chiave segreta **di Instagram**, dalla sezione dell'accesso
aziendale, non l'ID dell'app di Meta. Senza tutti e due il tasto non compare, e
resta la strada del token a mano.

Sulla dashboard di Meta, nelle impostazioni dell'accesso aziendale:

| campo | indirizzo |
|---|---|
| URI di reindirizzamento OAuth | `https://socialbot.live/auth/instagram/callback` |
| Callback per la revoca | `https://socialbot.live/instagram/scollega` |
| Richiesta di eliminazione dei dati | `https://socialbot.live/instagram/cancella` |

Finché l'app non è pubblicata, si collegano solo gli account aggiunti
nella dashboard. Per gli altri streamer servono la revisione dell'app e la
verifica dell'azienda.
