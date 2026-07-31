# Edge di SocialBot — il "nostro Cloudflare", ma nostro

Un server di frontiera che sta **davanti** all'origine (il server col bot).
È tutto tuo: la tua configurazione, la tua chiave, niente terzi. Lo metti su
**qualunque server, ovunque nel mondo** — uno vicino al tuo pubblico rende la
pagina più veloce per loro.

## Cosa ti dà

- **Nasconde l'origine.** Il DNS del dominio punta all'edge, non al server
  vero. L'IP dell'origine smette di essere un bersaglio diretto.
- **Solo il tuo edge parla con l'origine.** L'edge aggiunge una chiave segreta
  (`EDGE_KEY`); l'origine, con la stessa chiave impostata, rifiuta tutto ciò che
  non la porta. Chi trova l'IP vero e lo colpisce non ottiene niente.
- **Distribuzione e ridondanza.** Più edge in più regioni = pubblico servito da
  vicino, e se un edge cade gli altri reggono (basta il DNS che li elenca).
- **Difese di bordo:** HTTPS automatico, protezione slowloris, header giganti
  rifiutati. Le esche e l'argine anti-flood restano sull'origine e continuano a
  vedere l'IP vero del visitatore (per questo sull'origine serve `TRUST_PROXY=2`).

## Cosa NON ti dà (ed è giusto saperlo)

Un edge **non assorbe un DDoS volumetrico grosso** più di quanta banda ha il
suo server. Per quello serve la rete anti-DDoS di un provider (OVH, Hetzner)
**sotto** l'edge. Più edge = più banda totale, ma non è magia: fermare 100 Gbps
richiede più di 100 Gbps di banda, e quella la danno i grandi provider, non un
VPS. L'edge risolve il resto: origine nascosta, vicinanza, ridondanza, filtro
applicativo.

## Come si mette su (su un server qualsiasi)

1. Copia la cartella `edge/` sul server di frontiera.
2. `cp .env.example .env` e compila: dominio pubblico, indirizzo (segreto)
   dell'origine, e la **stessa** `EDGE_KEY` che metti sul server origine.
3. Fai puntare il DNS del dominio pubblico all'IP di **questo** server.
4. `docker compose up -d`. Caddy prende il certificato da solo.
5. Sul server origine: metti `EDGE_KEY=…` (identica) e `TRUST_PROXY=2` nel suo
   `.env`, poi `docker compose up -d --build`. Da quel momento l'origine serve
   solo il traffico che passa dall'edge.

## Prima di accendere `EDGE_KEY` sull'origine

Assicurati che **ogni** proxy davanti all'origine mandi la chiave, altrimenti il
sito diventa 404. Nel setup normale è già così: il `Caddyfile` principale la
passa da `{env.EDGE_KEY}`. Se la chiave è vuota, tutto questo è spento e non
cambia niente — è il caso predefinito.
