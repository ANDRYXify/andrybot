# © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
# Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
#
# AMBIENTE di Lia — il suo "computer" personale, sandboxato: ora un ECOSISTEMA REALE.
# Dentro qui ha mano libera per COSTRUIRE davvero: un browser vero (Chromium), i toolchain
# (Python, Node, compilatori) e un gestore di pacchetti userland (micromamba) con cui può
# INSTALLARSI QUALSIASI COSA — senza toccare il sistema (root in sola lettura a runtime) e
# senza mai uscire dal recinto (docker-compose.yml → dietro il `guardiano`, che le lascia
# internet vero ma le sbarra la TUA infrastruttura; niente segreti, niente host, niente produzione).
FROM python:3.12-slim

ENV DEBIAN_FRONTEND=noninteractive

# TOOLCHAIN + BROWSER: gli strumenti per fare cose vere. chromium = un browser headless vero
# (naviga, screenshot, legge pagine). nodejs/npm = l'ecosistema JS. build-essential = per
# compilare/costruire. git/curl/jq/unzip = lavoro quotidiano. font per rendere le pagine.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl wget git jq less nano procps unzip xz-utils \
      build-essential pkg-config \
      nodejs npm \
      chromium fonts-liberation fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# MICROMAMBA: un gestore di pacchetti USERLAND (conda-forge) → può installarsi QUALSIASI
# software (Python, R, strumenti nativi, librerie) nella sua casa, senza root. È il cuore del
# «installa quel che vuoi» che convive con root in sola lettura. (Se il download fallisce al
# build, l'immagine si costruisce lo stesso: pip --user e npm restano disponibili.)
RUN (curl -Ls https://micro.mamba.pm/api/micromamba/linux-64/latest \
      | tar -xj -C /usr/local/bin --strip-components=1 bin/micromamba \
      && chmod +x /usr/local/bin/micromamba) || echo "micromamba non installato (ok: pip/npm restano)"

# utente non privilegiato: i comandi di Lia girano SENZA privilegi. La "casa" /home/lia è un
# volume persistente (i suoi file, i suoi progetti, i suoi install restano tra un riavvio e l'altro).
RUN useradd -m -s /bin/bash lia
WORKDIR /home/lia
COPY executor.py /opt/executor.py
RUN mkdir -p /home/lia/progetti /home/lia/.local/bin /home/lia/micromamba \
    && echo "Questa e' la mia casa, e ora e' un ecosistema vero. — Lia" > /home/lia/LEGGIMI.txt \
    && chown -R lia:lia /home/lia

USER lia
# PATH e prefissi per gli install USERLAND: pip --user, npm globali in casa, binari suoi, micromamba.
ENV HOME=/home/lia \
    PYTHONUNBUFFERED=1 \
    PYTHONUSERBASE=/home/lia/.local \
    NPM_CONFIG_PREFIX=/home/lia/.local \
    MAMBA_ROOT_PREFIX=/home/lia/micromamba \
    PATH=/home/lia/.local/bin:/home/lia/micromamba/bin:/usr/local/bin:/usr/bin:/bin \
    CHROME_BIN=/usr/bin/chromium \
    CHROMIUM_FLAGS="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage"
EXPOSE 8099
CMD ["python3", "/opt/executor.py"]
