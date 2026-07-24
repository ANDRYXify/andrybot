# Forgia — il modello "tutto suo" di lia (sul tuo Mac)

Il bot le costruisce una **mente locale** (la sua rete + la conoscenza che
distilla e studia). Qui fai il passo in più: **forgiare un vero modello
fine-tunato** sul *suo* materiale, che gira sul tuo Mac (Apple Silicon) e che poi
**ricolleghi al bot** come "maestro esterno". Da quel momento il bot parla con un
modello nato dai suoi dati.

> Perché sul Mac e non sul server? Il fine-tune ha bisogno di una macchina
> capace. Il CX33 (CPU, 8 GB) non ce la fa; un **MacBook Pro M4 Max (36 GB)** sì,
> ed è anzi ottimo grazie a **MLX** (il framework Apple per Metal).

## Cosa ti serve
- macOS su Apple Silicon (M1/M2/M3/M4).
- Python 3 (`python3 --version`).
- Il **dataset della sua mente**: scaricalo dalla dashboard →
  *Panoramica* → **📦 Scarica il dataset della sua mente** (ottieni `mente-<canale>.jsonl`).

## Come si fa (3 comandi)
```bash
cd forgia
chmod +x forgia.sh
./forgia.sh ~/Downloads/mente-andryx.jsonl
```
Lo script:
1. installa `mlx-lm`;
2. prepara i dati (`prepara.py` → `data/train.jsonl` + `data/valid.jsonl`);
3. fa il **fine-tune LoRA** sul modello base;
4. **fonde** l'adattatore in un modello vero (`./lia-forgiata`);
5. ti dice come **servirlo** e **ricollegarlo** al bot.

### Servirla e collegarla
```bash
python3 -m mlx_lm.server --model ./lia-forgiata --port 8080
```
Poi nel bot: **Admin → Cervello — modello IA → Maestro esterno**, URL
`http://IP-DEL-MAC:8080/v1`.

Se il bot gira **altrove** (es. Hetzner), esponi la porta con un tunnel:
```bash
cloudflared tunnel --url http://localhost:8080
```
e incolla l'URL `https://…` che ti dà.

## Scelte
- **Modello base** (variabile `BASE`): default
  `mlx-community/Qwen2.5-7B-Instruct-4bit` (buon italiano, veloce). Per più
  qualità coi tuoi 36 GB: `mlx-community/Qwen2.5-14B-Instruct-4bit`.
- **Durata** (`ITERS`): default 600 passi. Più esempi ha nella mente, più alza.
  ```bash
  BASE=mlx-community/Qwen2.5-14B-Instruct-4bit ITERS=1000 ./forgia.sh mente-andryx.jsonl
  ```

## Onestà su cos'è (e cosa non è)
- È un **fine-tune LoRA**: adatta un modello base al *modo di rispondere* e ai
  *contenuti* della sua mente. È genuinamente "suo" nella misura in cui i suoi
  dati lo plasmano — ma **resta un modello neurale/statistico**: non esiste oggi
  un "ragionamento non statistico". Il ragionamento "vero" glielo dà comunque il
  bot col modo `studio` (passi + auto-verifica) sopra a questo modello.
- La **persona, le regole (linee guida) e la memoria** restano nel bot e valgono
  a runtime: il modello forgiato ci mette le *parole*, il bot la *continuità*.
- Il bot **assembla il dataset da solo** mentre vive; la **forgia la lanci tu**
  (o via `cron`) sul Mac. Il bot non può addestrarsi entrando nel tuo computer.

## Aggiornarla nel tempo
Man mano che chatti, la alleni e lei studia, la sua mente cresce. Ogni tanto
riscarica il dataset e rilancia `./forgia.sh …`: ottieni una versione più matura.
