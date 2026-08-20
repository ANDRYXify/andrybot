<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->

# L'ecosistema reale di Lia

Il suo «computer» sandboxato diventa un ecosistema vero: **browser** (Chromium), **toolchain**
(Python, Node, compilatori) e un gestore userland (**micromamba**) con cui **si installa qualsiasi
cosa** — e **crea/costruisce** davvero (progetti, codice, navigazione). Il tutto **dietro il
guardiano** (il firewall d'uscita): internet pubblico sì, la **tua** infrastruttura no.

## Le mura (invariante: lei intoccabile, non usabile da altri)
- **`guardiano`** — firewall d'uscita: l'`ambiente` condivide la sua rete (`network_mode:
  service:guardiano`), quindi tutto il traffico di Lia passa di lì. Le regole (`guardiano/entrypoint.sh`)
  lasciano internet pubblico ma **sbarrano ogni connessione nuova verso reti private/interne/metadati**
  (10/8, 172.16/12, 192.168/16, 169.254/16, 100.64/10 …) → non raggiunge bot/Caddy/host/segreti.
- **root in sola lettura**, `cap_drop: ALL`, **nessun segreto** (niente `env_file`), RAM/CPU/PID a tetto.
- **Solo lei (autonoma) o il Compagno (admin)** guidano l'ecosistema. Il pubblico non raggiunge mai la via.
- **Kill switch**: dal cruscotto admin (⛔ Ferma tutto) ferma i suoi lavori senza cancellare la casa.

## Deploy (sul server)
```
cd /opt/andrybot
git fetch origin && git reset --hard origin/main
# AMBIENTE_KEY nel .env accende l'ecosistema (senza, resta spento e il bot va come prima)
docker compose up -d --build guardiano ambiente brain
```

## Verifica del firewall (dev'essere così)
Dal cruscotto admin → «Il suo ecosistema reale» → oppure a mano dentro il container:
```
docker compose exec ambiente bash -lc 'curl -sS -m 5 https://pypi.org >/dev/null && echo "internet OK"'
docker compose exec ambiente bash -lc 'curl -sS -m 5 http://169.254.169.254/ ; echo "(metadati: deve FALLIRE)"'
docker compose exec ambiente bash -lc 'curl -sS -m 5 http://brain:8091/ ; echo "(infra interna: deve FALLIRE)"'
```
Atteso: **internet OK**, metadati e infra interna **irraggiungibili**.

## Cosa può fare (verbi, tutti nel recinto)
- `installa(pacchetto, gestore)` — pip / npm / micromamba (in background).
- `naviga(url, azione)` — `leggi` (testo), `schermata` (PNG), `pdf`.
- `crea_progetto` / `scrivi_in_progetto` / `esegui_in_progetto` — apre cantieri e ci lavora davvero.
- `stato_ecosistema` — strumenti, spazio, progetti, lavori. `ferma_tutto` — kill switch.
