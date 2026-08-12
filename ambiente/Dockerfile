# AMBIENTE di Lia — il suo "computer" personale, sandboxato.
# Immagine piccola con gli strumenti per "fare cose" davvero (Python, shell, rete,
# git, editor): dentro qui Lia ha mano libera. Fuori di qui non arriva: il
# container gira ISOLATO (vedi docker-compose.yml → rete `sandbox`, niente segreti,
# root in sola lettura, utente non privilegiato, RAM/CPU/processi limitati).
FROM python:3.12-slim

# strumenti di base per lavori, ricerche e svaghi (leggeri). ca-certificates per
# l'HTTPS in uscita; procps/less/nano per smanettare; jq per il JSON; git per il codice.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl git jq less nano procps unzip \
    && rm -rf /var/lib/apt/lists/*

# utente non privilegiato: i comandi di Lia girano SENZA privilegi. La sua "casa"
# è /home/lia (un volume persistente, così i suoi file restano tra un riavvio e
# l'altro). Un file segnaposto rende la cartella non vuota → al primo mount il
# volume eredita il proprietario giusto (lia).
RUN useradd -m -s /bin/bash lia
WORKDIR /home/lia
COPY executor.py /opt/executor.py
RUN echo "Questa e' la mia casa. — Lia" > /home/lia/LEGGIMI.txt \
    && chown -R lia:lia /home/lia

USER lia
ENV HOME=/home/lia PYTHONUNBUFFERED=1 PYTHONUSERBASE=/home/lia/.local
EXPOSE 8099
CMD ["python3", "/opt/executor.py"]
