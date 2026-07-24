#!/usr/bin/env bash
# ============================================================================
#  forgia.sh — forgia il "cervello" di lia sul tuo Mac (Apple Silicon, es. M4)
#  con MLX. Fa un fine-tune LoRA sul dataset della sua mente, lo fonde in un
#  modello vero e ti dice come servirlo e ricollegarlo al bot.
#
#  Uso:
#     ./forgia.sh mente-andryx.jsonl
#
#  Opzioni (variabili d'ambiente):
#     BASE   modello base MLX      (default: mlx-community/Qwen2.5-7B-Instruct-4bit)
#            per più qualità su 36 GB: mlx-community/Qwen2.5-14B-Instruct-4bit
#     ITERS  passi di training     (default: 600)
#     OUT    cartella del modello  (default: ./lia-forgiata)
# ============================================================================
set -euo pipefail

DATASET="${1:?Passa il file .jsonl scaricato dalla dashboard, es: ./forgia.sh mente-andryx.jsonl}"
BASE="${BASE:-mlx-community/Qwen2.5-7B-Instruct-4bit}"
ITERS="${ITERS:-600}"
OUT="${OUT:-./lia-forgiata}"
ADAPTER="./adattatore-lia"
QUI="$(cd "$(dirname "$0")" && pwd)"

echo "==> 1/5  Installo mlx-lm (Apple Silicon + Python 3.9+)"
python3 -m pip install -U mlx-lm >/dev/null

echo "==> 2/5  Preparo il dataset (train/valid)"
python3 "$QUI/prepara.py" "$DATASET" --out ./data

echo "==> 3/5  Fine-tune LoRA su $BASE  ($ITERS passi) — è qui che diventa SUA"
python3 -m mlx_lm.lora \
  --model "$BASE" \
  --train \
  --data ./data \
  --iters "$ITERS" \
  --batch-size 2 \
  --num-layers 8 \
  --adapter-path "$ADAPTER"

echo "==> 4/5  Fondo l'adattatore nel modello → $OUT"
python3 -m mlx_lm.fuse \
  --model "$BASE" \
  --adapter-path "$ADAPTER" \
  --save-path "$OUT"

cat <<FINE

==> 5/5  Fatto! Il suo modello è in: $OUT

  Per usarla subito, servila con un endpoint OpenAI-compatibile:
      python3 -m mlx_lm.server --model "$OUT" --port 8080

  Poi collegala al bot: Dashboard → Admin → Cervello — modello IA →
  "Maestro esterno" → URL:  http://IP-DEL-MAC:8080/v1
  (se il bot gira altrove, es. Hetzner, esponi la porta con un tunnel:
   'cloudflared tunnel --url http://localhost:8080' e incolla l'URL https).

  Rilancia questo script quando la sua mente è cresciuta (più chat/allenamento):
  riscarichi il dataset e riforgi un modello aggiornato.
FINE
