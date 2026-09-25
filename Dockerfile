# ============================================================
#  AndryBot — immagine Docker di produzione
# ============================================================
# ffmpeg: la build statica di static-ffmpeg (ffmpeg 9.0.2, con libvpx, libwebp,
# dav1d e x265), fissata per impronta: la stessa, byte per byte, su cui sono
# provati i formati degli effetti (docs/EFFETTI-SCHERMO.md). Quella di Debian 12
# e' la 5.1 e non legge l'HEVC trasparente di iPhone e Final Cut.
FROM mwader/static-ffmpeg:9.0.2@sha256:7d9bdaaf887f7e6ce6151f67325c344074b5ff1fb75316011c3376503e449a7b AS ffmpeg

FROM node:22-bookworm-slim

# Strumenti di compilazione: servono a better-sqlite3 SOLO se per
# questa piattaforma manca il binario precompilato (prebuild).
# ca-certificates serve per le chiamate HTTPS verso Twitch.
# streamlink tira l'audio della live da Twitch per l'ascolto lato server
# (bookworm ha il pacchetto nativo).
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates streamlink \
    && rm -rf /var/lib/apt/lists/*

# ffmpeg serve alla super-compressione degli effetti (audio/immagini/video)
# e alla misura della loudness (ebur128) per l'ascolto live; ffprobe alla
# durata vera dei media. Statici: non chiedono niente al sistema.
COPY --from=ffmpeg /ffmpeg /ffprobe /usr/local/bin/

WORKDIR /app

# Prima solo i manifest: così la cache di Docker riusa il layer di
# npm install quando cambia soltanto il codice sorgente.
COPY package*.json ./
RUN npm install --omit=dev

# Poi il codice del bot
COPY src ./src
# Script di utilità (es. stripe-fetch-prices.mjs), eseguibili dentro il container
COPY scripts ./scripts
# I file che il server LEGGE a runtime da fuori src/. Senza, non si rompe niente
# in modo rumoroso: la pagina esce vuota e nessuno se ne accorge. E' successo con
# le novità — pagina vuota, API vuota e la voce sparita dalla sitemap, tutti e
# tre per lo stesso file mancante. Il cancello verifica-immagine.mjs li elenca.
COPY NOVITA.md ./
# I caratteri della locandina. Senza, il server non la disegna e lo dice — ma
# lo dice solo a chi apre il pannello: da fuori sembra semplicemente che la
# grafica non ci sia.
COPY assets ./assets

ENV NODE_ENV=production
CMD ["node", "src/index.js"]
