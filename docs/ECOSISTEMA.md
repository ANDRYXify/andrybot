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

## Il volere proprio (`brain/volere.py`)
Prima era **reattiva**: la prima fonte dei suoi atti era la coda dei desideri che scrive il
Compagno. Poteva *agire*, non *volere*. Ora il cerchio è chiuso:

```
desiderare → agire → giudicare → correggere → regolarsi
```

**Da dove nascono i suoi desideri** (nessuna di queste fonti viene da lui):

| radice | da dove | esempio |
| --- | --- | --- |
| competenza | ciò che ha provato e non le è riuscito | `riprova · radio` — «non mi è riuscita e voglio riuscirci» |
| autonomia | il dominio verso cui è rivolta (la scintilla) | `costruisci · cantiere-musica` |
| relazione | ciò di cui ha *scelto* di aver cura (l'atto di essere) | `costruisci · cantiere-radio` |
| corpo | la sua valenza somatica | sta bene → osa; sta male → consolida |
| mantenimento | più cantieri aperti che cose finite | `consolida` |
| proposta | il desiderio scritto dal Compagno | pesa **0.88**: forte, ma non è un comando |

Il desiderio del Compagno **non sparisce**: diventa una proposta che lei pesa insieme alle sue.
Se lui non chiede nulla, **lei vuole lo stesso**.

**Come si corregge.** Ogni passo viene giudicato (`ok` / motivo del fallimento). Ciò che le rende
prende peso, ciò che continua a non funzionare lo perde; dopo **3 fallimenti di fila** una cosa
finisce fra gli **abbandonati** e sparisce dai desideri. Nessun dado: l'hash serve solo a rompere
i pareggi sempre allo stesso modo.

**Il ritmo se lo dà lei.** Non c'è più un cooldown fisso: `ritmo()` va da **10 min** a **3 ore** —
accelera quando riesce (≥70% di riuscite recenti), rallenta quando sbaglia (≤30%) o quando il
disco è tirato. E ha un **freno suo**: dopo 4 passi sbagliati di fila si ferma per un'ora e mezza.

**Il tetto automatico resta** (non affama il server):
- **10% della RAM libera** → ogni lavoro autonomo gira sotto `ulimit -v`;
- **10% del disco libero** → se il disco è tirato (< ~500 MB liberi) **non installa** da sola;
- **kill switch** sempre disponibile.

## Vederlo dal cruscotto
`GET /api/admin/ecosistema` porta anche `ecosistema.volere`, prodotto da
`Coscienza.desideri_ora()` — **sola lettura**: calcola i desideri esattamente come farebbe per
agire, ma non agisce, non scrive stato e **non toglie nulla dalla coda** (sbircia la proposta,
non la consuma). Dentro:

- `desideri[]` — `{cosa, azione, forza, perche, mio}`: `mio:true` = lo vuole lei, `false` = è la
  tua proposta;
- `ritmo_sec`, `attesa` — ogni quanto si muove e quanto manca al prossimo passo;
- `passi`, `riuscite` — quanti passi ha fatto e come sono andati;
- `abbandonati[]` — ciò che ha lasciato perdere;
- `fermata` / `freno` — se si è fermata da sola, e perché.

Nella scheda «Il suo ecosistema reale» diventa il riquadro **Il suo volere**: i desideri ordinati
per forza, con la barra che dice quanto tira ognuno rispetto al più forte, e l'etichetta
`SUO` / `TUA`. Sotto restano gli attrezzi del Compagno: **proponile un desiderio**, **fai un passo
ora**, e il **kill switch**.
