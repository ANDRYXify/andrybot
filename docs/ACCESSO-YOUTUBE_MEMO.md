# Accesso YouTube + richieste da moderatore — piano

## 1. Identità multi-piattaforma (prima del resto)
`src/identita.js` oggi conosce due piattaforme e le scrive a mano (`kick.`).
Con la terza il rischio è la solita: la stessa regola in tre posti, e uno resta
indietro. Si passa a una TABELLA di piattaforme e si deriva tutto da lì:

    PIATTAFORME = [ {id:'twitch', prefisso:''}, {id:'kick', prefisso:'kick.'}, {id:'youtube', prefisso:'yt.'} ]

Da qui: `LOGIN_RE`, `loginSu(p, nome)`, `piattaformaDi(login)`, `nomeSu(login)`.
`loginKick`/`eKick`/`nomeKick` restano, ma diventano righe sole sopra le
funzioni generiche. Invariante: un login Twitch non può contenere il punto,
quindi nessun prefisso può collidere con Twitch; e due prefissi non possono
essere l'uno il prefisso dell'altro (collaudo).

## 2. Il giro OAuth scritto una volta sola
Kick e YouTube fanno lo stesso giro: PKCE, `state` monouso in sessione, scadenza
di 10 minuti, confronto a tempo costante. Scritto due volte, il giorno che si
corregge un difetto si corregge per metà delle porte. Va in `src/giro.js`:
`apri(req, chiave, extra)` e `chiudi(req, chiave, query)`.

## 3. YouTube
- `src/youtube/auth.js` — OAuth Google con PKCE. Scope: `openid` +
  `youtube.readonly`. `access_type=offline` + `prompt=consent`, altrimenti
  Google non dà il refresh token e il collegamento muore alla prima scadenza.
- `src/youtube/api.js` — `chiSono(token)` (canale: id e titolo), token cifrati
  nella stessa tabella (kind `youtube`), rinnovo con margine.
- `src/youtube/rotte.js` — `/accedi/youtube` (registrazione), `/auth/youtube`
  (collegamento), `/auth/youtube/callback`, stato e scollegamento.
- Canale nostro: `yt.<nome>`.
- Onestà: la chat di YouTube NON è collegata (la quota delle API YouTube non
  regge un polling per canale). Qui c'è l'accesso e l'identità; la chat è un
  passo a parte, e finché non c'è va detto nella dashboard.

## 4. Richieste da moderatore
Oggi l'unica porta è l'invito dello streamer. Si apre quella opposta, con la
prova al posto della fiducia: la richiesta parte solo se **Twitch conferma** che
quella persona modera davvero quel canale (`moderation:read`, che il token dello
streamer ha già). Nessun permesso nuovo a nessuno.
- `managers`: due stati in più (`richiesto`, `rifiutato`) e tre colonne
  (`chiesto_at`, `deciso_at`, `nota`).
- I posti del piano contano solo `attivo`+`invitato`: una richiesta non occupa
  un posto finché non è accettata (`managers.contaPosti`).
- Rate limit: al massimo 3 richieste in attesa a testa, e dopo un rifiuto quel
  canale non si può richiedere per 30 giorni.

## 5. In coda (chiesto durante il lavoro)
- Lia: l'apprendimento autonomo è fermo. Nel pannello «come ragiona» sei moduli
  sono a ZERO secco (calcolo, deduzione, costruzione, cause, introspezione,
  ecologia) mentre riflesso/moduli/modello lavorano. Uno zero pieno non è un
  modulo debole: è una strada che non viene mai imboccata. Da cercare lì.
- Lia: più libertà di movimento. La VM deve essere davvero aperta (un browser
  vero, non una riga di comando), con il solo confine che c'è già: il pubblico.
