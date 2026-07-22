# SocialBot — guida al deploy (per Andrea)

Guida passo-passo per mettere online **bot.andryxify.it** sul server Hetzner.
Segui i punti in ordine: la prima volta ci vogliono ~20 minuti, poi gli aggiornamenti
sono un comando solo.

Dati del tuo server (già inseriti negli script):

- **IP:** `167.233.214.193` — **IPv6:** `2a01:4f8:c014:212e::1`
- **Utente:** `root`
- **Server:** Hetzner CPX12, Ubuntu 24.04

---

## 0. Cosa ti serve prima di iniziare

- La **password di root** del server (te l'ha mandata Hetzner via email). Serve **una sola
  volta**: dopo si entra con la chiave SSH.
- Accesso al **DNS** di andryxify.it (dove gestisci i record del dominio).
- L'**app Twitch** di andryxify.it (la stessa del sito) su
  [dev.twitch.tv/console](https://dev.twitch.tv/console).

---

## 1. DNS: fai puntare il sottodominio al server

Nel pannello DNS di andryxify.it aggiungi due record:

| Tipo | Nome | Valore |
|---|---|---|
| `A` | `bot` | `167.233.214.193` |
| `AAAA` | `bot` | `2a01:4f8:c014:212e::1` |

(Il certificato HTTPS arriverà da solo, appena il DNS punta al server.)

---

## 2. Dal tuo PC: FileZilla + chiave SSH (automatico)

Uno script prepara tutto: installa **FileZilla**, crea una **chiave SSH** dedicata, la copia
sul server (ti chiede la password di root **una volta**) e aggiunge il server al Gestore siti
di FileZilla.

**Windows** (apri *PowerShell* nella cartella del progetto):

```powershell
powershell -ExecutionPolicy Bypass -File .\server\pc\setup-pc-windows.ps1
```

**macOS** (apri il *Terminale*):

```bash
bash server/pc/setup-pc-mac.sh
```

Alla fine, per gestire i file del server: **FileZilla → File → Gestore siti → "Hetzner
andryxify" → Connetti**. (Alla prima connessione FileZilla può proporre di convertire la
chiave in formato PuTTY: accetta, è normale.)

Per il terminale sul server: `ssh -i ~/.ssh/hetzner_andryxify root@167.233.214.193`
(su Windows: `ssh -i %USERPROFILE%\.ssh\hetzner_andryxify root@167.233.214.193`).

---

## 3. App Twitch: redirect e secret

Su [dev.twitch.tv/console](https://dev.twitch.tv/console), nell'app di andryxify.it:

1. In **OAuth Redirect URLs** aggiungi: `https://bot.andryxify.it/auth/callback`
2. Genera (o recupera) **Client ID** e **Client Secret**: ti servono al punto 4.

---

## 4. Sul server: un solo comando

Entra nel server (via terminale o dal PC con la chiave appena creata) e lancia:

```bash
git clone https://github.com/ANDRYXify/andrybot.git /opt/andrybot
bash /opt/andrybot/server/setup-hetzner.sh
```

Lo script installa **Docker**, **Caddy** (HTTPS automatico), **firewall**, **fail2ban**,
**swap** e prepara tutto. La **prima volta si ferma** per farti inserire le credenziali
Twitch:

```bash
nano /opt/andrybot/.env
# compila TWITCH_CLIENT_ID e TWITCH_CLIENT_SECRET (dal punto 3), salva
bash /opt/andrybot/server/setup-hetzner.sh   # rilancialo: completa e avvia
```

> `SESSION_SECRET` viene generato in automatico. Non c'è nessun altro segreto da inserire:
> l'accesso alla dashboard usa i pass monouso del sito.

Al termine, la dashboard è su **https://bot.andryxify.it** (il certificato HTTPS arriva da
solo al primo accesso, se il DNS del punto 1 è a posto).

---

## 5. Collega il sito (andryxify.it / repo siteify)

Perché la card "Gestisci il tuo SocialBot" compaia nelle impostazioni degli streamer
abilitati, il sito deve avere l'integrazione del gate (file `api/bot-gate.js` +
`src/components/CardSocialBot.jsx` + la modifica a `SettingsPage.jsx`). Una volta in
produzione su Vercel, non serve alcuna variabile d'ambiente aggiuntiva: usa il Redis
(Upstash) e gli stessi segreti Twitch già presenti sul sito.

---

## 6. Primo avvio e abilitazione streamer

1. Apri **https://andryxify.it**, vai nelle **impostazioni del tuo account** e apri la card
   **"🤖 Gestisci il tuo SocialBot"** → ti porta alla dashboard del bot.
2. Nella dashboard, **concedi i permessi** (il bot leggerà e scriverà nella tua chat con il
   tuo account, creerà clip, vedrà follow/sub).
3. Accendi il bot con l'interruttore. Fatto: entra nel tuo canale e si pre-addestra dal tuo
   profilo.

Gli altri streamer seguono la stessa strada, **dopo** essere stati verificati e approvati
con la procedura del sito.

> **Da condividere con gli streamer:** «Se sei uno streamer verificato e abilitato su
> andryxify.it, vai nelle impostazioni del tuo account: trovi la card *Gestisci il tuo
> SocialBot*. Da lì attivi e configuri il tuo bot personale.»

---

## 7. Gestione ordinaria

Dal server, in `/opt/andrybot`:

```bash
# aggiornare all'ultima versione
git pull && docker compose up -d --build

# vedere i log in tempo reale
docker compose logs -f bot

# fermare / riavviare
docker compose down
docker compose up -d
```

**Backup:** salva ogni tanto la cartella `/opt/andrybot/data/` (contiene database, memoria
del bot e gli effetti caricati). È l'unica cosa che conta conservare.

---

## 8. Problemi comuni

| Sintomo | Causa / rimedio |
|---|---|
| `https://bot.andryxify.it` non si apre | DNS non ancora propagato (punto 1) o attendi il primo certificato HTTPS |
| Nei log: *"Login authentication failed"* | i permessi Twitch dello streamer vanno riconcessi dalla dashboard |
| La card non compare sul sito | lo streamer non risulta **approvato** (`streamers:approved`) sul sito |
| La clip non viene creata | il canale è offline, oppure mancano i permessi (clip) |
| Il bot non risponde | interruttore spento, spontaneità a zero, o cooldown ancora attivo |
| Effetto/suono non parte | overlay OBS non aggiunto/URL sbagliato, ffmpeg (nel Docker c'è già), o il tier non consente all'utente di attivarlo |
| Sono chiuso fuori dal server via SSH | l'hardening SSH scatta **solo** dopo che la chiave è stata copiata (punto 2); se serve, dal pannello Hetzner puoi rientrare in console |
