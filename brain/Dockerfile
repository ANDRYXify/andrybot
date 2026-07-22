# ============================================================
#  Cervello del bot — servizio Python isolato (coscienza + LLM locale)
#  Gira in un container a sé: qualunque cosa faccia, NON rallenta il bot
#  Node (i comandi restano istantanei).
# ============================================================
FROM python:3.11-slim

WORKDIR /app/brain

# Codice del cervello (coscienza in stdlib: nessuna dipendenza per la memoria)
COPY . ./

# Modello linguistico: llama-cpp-python dai WHEEL PRECOMPILATI CPU (niente
# compilazione pesante sul server). Se non c'è un wheel per questa piattaforma
# l'immagine si costruisce LO STESSO: il cervello parte, la chiacchiera resta
# spenta finché non c'è il modello (la coscienza/memoria funziona comunque).
RUN pip install --no-cache-dir \
      --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu \
      "llama-cpp-python>=0.3.2" \
    || echo "ATTENZIONE: llama-cpp-python non installato (chiacchiera spenta, coscienza attiva)."

ENV DATA_DIR=/app/data
# porta interna: la vede solo il bot sulla rete del compose
EXPOSE 8091

CMD ["python3", "-u", "server.py"]
