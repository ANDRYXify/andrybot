#!/bin/bash
# © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
# Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
#
# L'AVVIO dell'ambiente di Lia: prima lo SCHERMO, poi il browser, poi l'esecutore.
#
# Perche' uno schermo. Un browser senza schermo e' un browser a meta': molti siti
# si comportano diversamente in headless, le finestre di dialogo non esistono, e
# soprattutto non si VEDE niente — ne' lei, ne' chi vuole guardare cosa sta
# facendo. Qui c'e' uno schermo vero (Xvfb), un gestore di finestre (fluxbox) e
# un ponte per guardarlo dal vivo (x11vnc + noVNC).
#
# Il confine resta quello di prima: tutte queste porte vivono nella rete del
# `guardiano`, dove arriva solo il cervello. Niente di questo si affaccia su
# internet.
set -u

SCHERMO="${DISPLAY:-:99}"
LARG="${SCHERMO_LARG:-1440}"
ALT="${SCHERMO_ALT:-900}"

avvia() {   # avvia <nome> <comando...>
  local nome="$1"; shift
  "$@" >>"$HOME/.eco/$nome.log" 2>&1 &
  echo "  · $nome"
}

mkdir -p "$HOME/.eco" "$HOME/progetti/scatti" "$HOME/.browser"

echo "ambiente di Lia — accendo:"

# 1. lo schermo
if command -v Xvfb >/dev/null 2>&1; then
  avvia xvfb Xvfb "$SCHERMO" -screen 0 "${LARG}x${ALT}x24" -nolisten tcp
  export DISPLAY="$SCHERMO"
  # do' allo schermo un istante per esistere prima di appoggiarci sopra qualcosa
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    command -v xdpyinfo >/dev/null 2>&1 && xdpyinfo -display "$SCHERMO" >/dev/null 2>&1 && break
    sleep 0.3
  done
  # LO SFONDO, prima di fluxbox. Senza, fluxbox chiama `fbsetbg`, non trova nessun
  # programma per posare uno sfondo e pianta in mezzo allo schermo una finestra
  # modale che chiede di installare Eterm — ogni singolo avvio. Non e' un dettaglio
  # estetico: e' una finestra che prende il fuoco davanti a tutto il resto.
  # Gli si dice noi con cosa dipingere il fondo, e la domanda non nasce.
  if command -v xsetroot >/dev/null 2>&1; then
    xsetroot -solid "${SFONDO:-#101418}" 2>/dev/null || true
    mkdir -p "$HOME/.fluxbox"
    if ! grep -q '^session.screen0.rootCommand:' "$HOME/.fluxbox/init" 2>/dev/null; then
      echo "session.screen0.rootCommand: xsetroot -solid ${SFONDO:-#101418}" >> "$HOME/.fluxbox/init"
    fi
  fi
  command -v fluxbox >/dev/null 2>&1 && avvia fluxbox fluxbox
  # guardarlo dal vivo: x11vnc parla VNC, websockify lo traduce per il browser
  command -v x11vnc >/dev/null 2>&1 && \
    avvia x11vnc x11vnc -display "$SCHERMO" -forever -shared -nopw -quiet -rfbport 5900 -localhost
  if command -v websockify >/dev/null 2>&1 && [ -d /usr/share/novnc ]; then
    avvia novnc websockify --web /usr/share/novnc 6080 127.0.0.1:5900
  fi
else
  echo "  · (nessuno schermo: il browser andra' headless)"
fi

# 2. il browser che resta aperto
avvia browser python3 /opt/browser.py

# 3. l'esecutore: in primo piano, e' lui il processo del container
exec python3 /opt/executor.py
