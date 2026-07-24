#!/usr/bin/env python3
"""
prepara.py — trasforma il "dataset della mente di lia" nel formato che MLX vuole
per il fine-tune LoRA, e lo divide in train/valid.

INPUT  : il file .jsonl che scarichi dalla dashboard
         (Panoramica → «📦 Scarica il dataset della sua mente»), con righe:
             {"instruction": "domanda…", "output": "risposta…"}
OUTPUT : <out>/train.jsonl e <out>/valid.jsonl in formato chat MLX:
             {"messages":[{"role":"user","content":"…"},
                          {"role":"assistant","content":"…"}]}

Uso:  python3 prepara.py mente-andryx.jsonl --out data
Non serve nessuna libreria: solo Python 3.
"""
import argparse
import json
import os
import random
import sys


def leggi(path):
    righe = []
    with open(path, encoding="utf-8") as f:
        for r in f:
            r = r.strip()
            if not r:
                continue
            try:
                d = json.loads(r)
            except Exception:
                continue
            q = str(d.get("instruction") or d.get("q") or d.get("prompt") or "").strip()
            a = str(d.get("output") or d.get("a") or d.get("completion") or "").strip()
            if len(q) >= 2 and len(a) >= 1:
                righe.append({"messages": [
                    {"role": "user", "content": q},
                    {"role": "assistant", "content": a},
                ]})
    return righe


def main():
    ap = argparse.ArgumentParser(description="Prepara il dataset della mente di lia per MLX.")
    ap.add_argument("input", help="il file .jsonl scaricato dalla dashboard")
    ap.add_argument("--out", default="data", help="cartella di uscita (default: data)")
    ap.add_argument("--valid", type=float, default=0.1, help="quota di validazione (default: 0.1)")
    ap.add_argument("--seed", type=int, default=42)
    a = ap.parse_args()

    dati = leggi(a.input)
    if len(dati) < 8:
        print(f"Servono almeno ~8 esempi, ne ho trovati {len(dati)}. "
              f"Fai crescere la sua mente (chatta con lei, allenala, «Studia ora») e riprova.",
              file=sys.stderr)
        sys.exit(1)

    random.seed(a.seed)
    random.shuffle(dati)
    nv = max(1, int(len(dati) * a.valid))
    valid, train = dati[:nv], dati[nv:]

    os.makedirs(a.out, exist_ok=True)
    for nome, parte in (("train", train), ("valid", valid)):
        with open(os.path.join(a.out, nome + ".jsonl"), "w", encoding="utf-8") as f:
            for r in parte:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"OK: {len(train)} esempi di training + {len(valid)} di validazione → {os.path.abspath(a.out)}/")


if __name__ == "__main__":
    main()
