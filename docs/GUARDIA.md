<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# La guardia: quello che una macchina controlla da sola

Chiesto così: «mano a mano che implementiamo novità inseriamo tool automatici
(senza IA) che controllino e automatizzino eventuali update e prove di
sicurezza. Così alleggeriamo anche l'utilizzo di token e sono più tranquillo».

## Il modello

**Una cosa che si può controllare con una regola la controlla una macchina, a
orari fissi, e parla solo quando qualcosa non torna.** Chi sviluppa (una
persona o un'IA) entra in gioco quando c'è un rosso da capire, non per guardare
che sia ancora verde.

C'era già: i test a ogni push (GitHub, `collaudo.yml`), i cancelli prima di
ogni spinta (`.githooks/pre-push`) e a ogni aggiornamento del server
(`server/aggiorna.sh`), l'aggiornamento automatico del server quando nessuno è
in diretta (docs/AGGIORNARE.md). Mancavano quattro cose:

1. **Le dipendenze.** `dependabot.yml` propone da solo gli aggiornamenti (una
   richiesta la settimana per le librerie, una per le azioni di GitHub, più
   quelle di sicurezza appena escono); il lavoro `guardia` fa `npm audit` ogni
   notte sulle dipendenze che vanno in produzione, e va rosso da «alta» in su.
2. **Le chiavi nel codice.** `scripts/verifica-chiavi.mjs` è un cancello come
   gli altri (gira prima di ogni spinta, sul server e nella guardia): nessun
   file tracciato porta una chiave privata, un token di Stripe, Telegram,
   Twitch, GitHub, Google, AWS o Slack, né un file che per nome è un segreto
   (`.env`, `.pem`, un database). Le eccezioni stanno in un elenco, ognuna col
   suo perché (le credenziali finte delle esche, i campioni dei test).
3. **Il sito, da fuori.** `scripts/sonda-sito.mjs` guarda `socialbot.live`
   come lo vede chiunque, senza entrare: risponde in HTTPS e l'HTTP ci rimanda;
   il certificato non sta per scadere; le intestazioni di sicurezza ci sono
   (HSTS, CSP senza script liberi, nosniff, niente cornici, la riserva
   sull'addestramento); le porte private non si aprono senza sessione; i file
   pubblici ci sono (robots con i blocchi per chi addestra, ai.txt, llms.txt,
   sitemap, security.txt non scaduto); l'ingresso con la mail non parte senza
   la prova di lavoro; e l'esca è ancora un'esca (se `/.env` risponde, è quello
   finto). Gira ogni notte nella guardia, e a mano quando si vuole:
   `node scripts/sonda-sito.mjs`.
4. **Chi avvisa.** La guardia è un lavoro di GitHub (`guardia.yml`): se un
   controllo va rosso il lavoro fallisce, e GitHub lo scrive per mail al
   proprietario. Nessun servizio in più, nessun segreto in più.

## Le regole

- **Ogni novità porta il suo controllo** nello stesso commit: un cancello (con
  la sua autoprova che lo rompe apposta), o una riga della sonda se è una cosa
  che si vede da fuori. Una porta pubblica nuova entra in `verifica-porte`; una
  pagina nuova in `verifica-larghezza`; un file pubblico nuovo nella sonda.
- **La sonda non entra e non insiste**: nessuna credenziale, una richiesta per
  controllo, in fila. Non rimanda mai indietro il canarino delle esche (lo
  legge dal sorgente per riconoscerlo, non lo spedisce).
- **Un controllo che non si può fare dove gira si dice**, non passa in
  silenzio (il certificato dietro un proxy che lo sostituisce: «non misurabile
  da qui», rosso solo dove si può misurare).
- **Un rosso della guardia si legge prima di correggerlo**: difetto vero, o
  misura da aggiornare perché la regola è cambiata.

## Cosa NON fa

- Non unisce da sola gli aggiornamenti delle dipendenze: li propone; li unisce
  una persona dopo il collaudo.
- Non fa prove d'attacco (niente scansioni aggressive, niente tentativi di
  accesso): guarda quello che è pubblico.
- I cancelli col browser restano fuori da GitHub: girano sulla macchina di chi
  pubblica e, dove il browser c'è, a ogni spinta.
