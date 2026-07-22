# ============================================================
#  AndryBot — immagine Docker di produzione
# ============================================================
FROM node:22-bookworm-slim

# Strumenti di compilazione: servono a better-sqlite3 SOLO se per
# questa piattaforma manca il binario precompilato (prebuild).
# ca-certificates serve per le chiamate HTTPS verso Twitch.
# ffmpeg serve alla super-compressione degli effetti (audio/immagini/video).
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Prima solo i manifest: così la cache di Docker riusa il layer di
# npm install quando cambia soltanto il codice sorgente.
COPY package*.json ./
RUN npm install --omit=dev

# Poi il codice del bot
COPY src ./src

ENV NODE_ENV=production
CMD ["node", "src/index.js"]
