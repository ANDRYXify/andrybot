# © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
# Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
#
# AMBIENTE di Lia — il suo "computer" personale, sandboxato: ora un ECOSISTEMA REALE.
# Dentro qui ha mano libera per COSTRUIRE davvero: uno SCHERMO vero con un browser vero
# (Chromium di Playwright, con finestra, che resta aperto fra un gesto e l'altro), i toolchain
# (Python, Node, compilatori) e un gestore di pacchetti userland (micromamba) con cui può
# INSTALLARSI QUALSIASI COSA — senza toccare il sistema (root in sola lettura a runtime) e
# senza mai uscire dal recinto (docker-compose.yml → dietro il `guardiano`, che le lascia
# internet vero ma le sbarra la TUA infrastruttura; niente segreti, niente host, niente produzione).
# La versione di Debian e' PINNATA, e non e' pignoleria. `python:3.12-slim` segue la
# Debian del momento, e oggi e' trixie: Playwright 1.49.1 non la conosce, quindi per le
# librerie di sistema ripiega su un elenco vecchio dove `ttf-unifont` e
# `ttf-ubuntu-font-family` esistevano ancora. Su trixie quei pacchetti non ci sono piu' e
# `--with-deps` muore con «has no installation candidate». Non e' un difetto nostro: e' una
# base che cambia sotto i piedi. Bookworm e' la Debian che questa versione di Playwright
# sa vestire. Chi cambia una delle due deve cambiare l'altra — stanno insieme.
FROM python:3.12-slim-bookworm

ENV DEBIAN_FRONTEND=noninteractive

# TOOLCHAIN: gli strumenti per fare cose vere. nodejs/npm = l'ecosistema JS.
# build-essential = per compilare/costruire. git/curl/jq/unzip = lavoro quotidiano.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl wget git jq less nano procps unzip xz-utils \
      build-essential pkg-config \
      nodejs npm \
    && rm -rf /var/lib/apt/lists/*

# LO SCHERMO. Un browser senza schermo e' un browser a meta': molti siti si comportano
# diversamente in headless, le finestre di dialogo non esistono, e soprattutto non si VEDE
# niente — ne' lei ne' chi vuole guardare cosa sta facendo. Xvfb e' lo schermo, fluxbox il
# gestore di finestre, x11vnc + noVNC il vetro da cui lo si guarda dal vivo. Tutte porte
# interne alla rete del guardiano: niente di questo si affaccia su internet.
RUN apt-get update && apt-get install -y --no-install-recommends \
      xvfb x11-utils x11-xserver-utils fluxbox x11vnc novnc websockify scrot \
      fonts-liberation fonts-dejavu-core fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

# IL BROWSER VERO. Playwright con il SUO Chromium e tutte le librerie di sistema che gli
# servono: e' il browser completo, non quello ridotto della distribuzione. Da qui in poi Lia
# non «scarica una pagina»: naviga — clicca, scorre, compila, torna indietro, resta loggata.
# Sta in /opt/browsers e non nella sua casa, cosi' l'immagine se lo porta dietro e il volume
# della casa resta suo.
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/browsers
RUN pip install --no-cache-dir playwright==1.49.1 \
    && python3 -m playwright install --with-deps chromium \
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
COPY browser.py /opt/browser.py
COPY avvio.sh /opt/avvio.sh
RUN chmod +x /opt/avvio.sh
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
    PLAYWRIGHT_BROWSERS_PATH=/opt/browsers \
    DISPLAY=:99 \
    SCHERMO_LARG=1440 \
    SCHERMO_ALT=900
EXPOSE 8099
CMD ["/opt/avvio.sh"]
