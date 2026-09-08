# Le porte del server: cosa è aperto, e perché

Una scansione ha trovato tre porte aperte sul server: **22**, **80** e **443**.
Questo documento dice quali devono restare così, quale merita un intervento, e
come farlo senza chiudersi fuori.

## Le tre porte

| porta | cosa è | va chiusa? |
|---|---|---|
| **443** | HTTPS: il sito | **No.** Chiuderla vuol dire spegnere socialbot.live |
| **80** | HTTP: il rimbalzo su HTTPS e la sfida di Let's Encrypt | **No.** Senza, il certificato scade in tre mesi e il sito diventa irraggiungibile lo stesso |
| **22** | SSH: l'accesso al server | Non si chiude, si **stringe**. È l'unica delle tre su cui abbia senso lavorare |

Il livello che la scansione dà a ognuna — medio alla 22, basso alle altre due —
è corretto: SSH aperto a tutto internet raccoglie tentativi di accesso in
continuazione, giorno e notte, da macchine che provano nomi e password a caso.

## La notizia vera: non c'era una quarta porta

Il bot ascolta sulla 8090, il cervello ha la sua, i dati stanno su disco. Niente
di tutto questo si vede da fuori: sta dentro la rete di Docker, dove da internet
non si bussa. Dal `docker-compose.yml` esce **solo Caddy**, con 80, 443 e
443/udp per HTTP/3.

Un servizio interno finito su internet per sbaglio è il difetto che fa male
davvero, e non dà nessun segnale: basta una riga `ports:` aggiunta per provare
una cosa al volo, e da quel momento è aperto. Nessun errore, nessun avviso.

Per questo il patto adesso si controlla da solo:
`scripts/verifica-esposizione.mjs` legge il compose e pretende che **una sola
porta di casa** esista — quella di Caddy — che le porte aperte siano solo le
tre dichiarate, che l'elenco non marcisca (una porta dichiarata che non c'è più
è rossa come una di troppo), e che nessun servizio usi `network_mode: host`,
che toglierebbe di mezzo la mappatura e metterebbe tutto sulla scheda di rete
del server. Il suo collaudo rimette i quattro guasti uno per volta.

## Stringere la 22, in ordine di valore reale

### 1. Solo chiave, niente password

È la mossa che vale di più e costa niente: senza password da indovinare, i
tentativi automatici finiscono contro un muro il primo giorno.

**Prima**, verifica di poter già entrare con la chiave — se non puoi, il resto
ti chiude fuori:

```
ssh -o PasswordAuthentication=no -o PreferredAuthentications=publickey utente@server
```

Se questo comando ti fa entrare, procedi. In `/etc/ssh/sshd_config`:

```
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
```

Poi, **senza chiudere la sessione che hai aperta**:

```
sudo sshd -t          # controlla la sintassi: se sbaglia, NON riavviare
sudo systemctl reload ssh
```

E adesso la parte che conta: **apri un secondo terminale e prova a entrare**.
Solo quando il secondo accesso funziona, chiudi il primo. Se qualcosa è andato
storto, quella sessione ancora aperta è la tua via di rientro.

### 2. Il firewall di Hetzner, se il tuo indirizzo è fermo

Il Cloud Firewall di Hetzner è gratuito e sta **fuori dalla macchina**: filtra
prima che il pacchetto arrivi, quindi vale anche se sul server sbagli qualcosa.
Regola: 80 e 443 da tutti, 22 solo dal tuo indirizzo.

Il rischio è chiaro e va detto: **se il tuo indirizzo di casa cambia, resti
fuori**. La via di scampo c'è ed è la console web di Hetzner, che passa dalla
tastiera virtuale e non da SSH — da lì rimetti a posto la regola. Se la tua
linea non ha un indirizzo fisso, questa mossa è più fastidio che guadagno:
fermati alla prima e alla terza.

### 3. fail2ban

Legge il registro degli accessi e banna per un po' chi sbaglia troppe volte di
fila. Con la chiave sola i tentativi non passano comunque, ma smette di
riempirti i log:

```
sudo apt install fail2ban
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

### 4. Cambiare la porta: no

Spostare SSH dalla 22 alla 2222 toglie righe dai log, e basta. Chi cerca
davvero scansiona tutte le porte in pochi secondi. Non è sicurezza, è
disordine in più da ricordarsi.

## Cosa NON fare

- **Non chiudere la 80** «tanto c'è HTTPS»: Let's Encrypt la usa per rinnovare
  il certificato, e il rinnovo fallito non avvisa nessuno finché il sito non si
  ferma.
- **Non toccare `sshd_config` senza una seconda sessione aperta.** È il modo
  classico di restare chiusi fuori da casa propria.
- **Non aggiungere `ports:` a un servizio per fare una prova.** Se serve
  guardare dentro, si usa `docker compose exec` o un tunnel SSH, che non apre
  niente a nessuno.
