#!/usr/bin/env bash
# © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
# Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
# ============================================================
#  SocialBot — il server prende da solo gli aggiornamenti
#
#  Da eseguire come root, sul server, una volta (rilanciarlo non cambia niente
#  se e' gia' tutto a posto):
#      cd /opt/andrybot && bash server/aggiorna-da-solo.sh
#
#  Installa un timer di systemd che ogni quarto d'ora lancia server/aggiorna.sh,
#  con un ritardo casuale di qualche minuto. Il caso serve solo a non arrivare
#  tutti nello stesso istante su GitHub: non regge niente.
#
#  PERCHE' IL SERVER GUARDA, E NON GITHUB CHE CHIAMA. Il server guarda su GitHub
#  con la chiave di sola lettura che ha gia': niente porte nuove aperte verso
#  l'esterno, niente segreti nuovi. Un webhook vorrebbe un indirizzo pubblico e
#  una chiave da custodire, per risparmiare qualche minuto.
#
#  IL GIRO DA SOLO E' UN GIRO PRUDENTE. Mai --subito e mai --salta-prove: aspetta
#  la fine delle dirette, fa il collaudo e, se qualcosa non torna, torna indietro
#  come sempre. Quando non c'e' niente di nuovo, aggiorna.sh esce subito con
#  «già aggiornato» (anche per il cervello). Un giro alla volta: flock -n sul
#  lucchetto, e un giro che aspetta la fine di una diretta tiene fuori il
#  successivo.
#
#  Si vede: l'esito di ogni giro che ha fatto qualcosa va in data/aggiorna.json,
#  e il pannello dell'amministratore lo mostra (Gestione → Salute).
#  Si spegne: AGGIORNA_DA_SOLO=0 in .env, e il giro esce senza fare niente.
#  Si toglie: bash server/aggiorna-da-solo.sh --togli
#
#  Opzioni:
#      --togli   ferma il timer e toglie i due file
#      --stato   dice se il timer c'e' e quando parte
# ============================================================
set -euo pipefail

NOME="andrybot-aggiorna"
LUCCHETTO="/run/andrybot-aggiorna.lock"
# Dove stanno le unita'. Lo si cambia solo per provarlo (test/contratto/aggiorna-da-solo.test.mjs).
CARTELLA="${AGGIORNA_SYSTEMD_DIR:-/etc/systemd/system}"

muori() { echo; echo "FERMO: $*" >&2; exit 1; }

cd "$(dirname "$0")/.."
RADICE="$(pwd)"
[ -d .git ] || muori "qui non c'è un repository git ($RADICE)"
[ -f server/aggiorna.sh ] || muori "manca server/aggiorna.sh in $RADICE"

SERVIZIO="$CARTELLA/$NOME.service"
TIMER="$CARTELLA/$NOME.timer"

COSA="installa"
for a in "$@"; do
  case "$a" in
    --togli) COSA="togli" ;;
    --stato) COSA="stato" ;;
    *) echo "opzione sconosciuta: $a" >&2; exit 2 ;;
  esac
done

if [ -z "${AGGIORNA_SYSTEMD_DIR:-}" ] && [ "$(id -u)" != "0" ]; then
  muori "serve root: le unità di systemd stanno in $CARTELLA."
fi
command -v systemctl >/dev/null 2>&1 || muori "qui non c'è systemd (systemctl): il timer non si può installare."

come_si_toglie() {
  echo "Per spegnerlo senza toglierlo: AGGIORNA_DA_SOLO=0 in $RADICE/.env (il giro esce senza fare niente)."
  echo "Per toglierlo del tutto:       bash $RADICE/server/aggiorna-da-solo.sh --togli"
}

if [ "$COSA" = "togli" ]; then
  systemctl disable --now "$NOME.timer" 2>/dev/null || true
  rm -f "$SERVIZIO" "$TIMER"
  systemctl daemon-reload
  echo "timer tolto: il server non prende più gli aggiornamenti da solo."
  echo "Per aggiornare a mano: cd $RADICE && bash server/aggiorna.sh"
  exit 0
fi

if [ "$COSA" = "stato" ]; then
  if [ -f "$TIMER" ]; then
    systemctl list-timers "$NOME.timer" --all --no-pager || true
    echo
    echo "L'ultimo esito: $RADICE/data/aggiorna.json (e nel pannello, Gestione → Salute)."
    echo "Il racconto dei giri: journalctl -u $NOME.service"
  else
    echo "il timer non c'è: il server non prende gli aggiornamenti da solo."
  fi
  exit 0
fi

# ---- quello che il giro trova sulla sua strada --------------
# Sotto systemd il PATH e' quello corto di sistema: un Node messo altrove (nvm,
# /opt) non si troverebbe, e ogni giro si fermerebbe al collaudo. Le cartelle
# degli strumenti si leggono QUI, da chi installa, e si scrivono nel servizio.
FLOCK="$(command -v flock || true)"
[ -n "$FLOCK" ] || muori "manca flock (pacchetto util-linux): senza, due giri potrebbero partire insieme."
PERCORSO=""
for strumento in git docker node npm; do
  dove="$(command -v "$strumento" || true)"
  [ -n "$dove" ] || muori "manca $strumento: il giro da solo ne ha bisogno (il collaudo vuole Node e npm)."
  cartella="$(dirname "$dove")"
  case ":$PERCORSO:" in *":$cartella:"*) ;; *) PERCORSO="${PERCORSO:+$PERCORSO:}$cartella" ;; esac
done
for cartella in /usr/local/sbin /usr/local/bin /usr/sbin /usr/bin /sbin /bin; do
  case ":$PERCORSO:" in *":$cartella:"*) ;; *) PERCORSO="$PERCORSO:$cartella" ;; esac
done

# Il servizio: un giro, prudente, uno alla volta. Niente --subito, niente
# --salta-prove (un contratto lo controlla). Il lucchetto lo prende flock, e
# AGGIORNA_HA_LUCCHETTO lo dice allo script, che altrimenti lo prenderebbe lui.
# Nessun tempo massimo: un giro puo' aspettare ore la fine di una diretta.
UNITA_SERVIZIO="[Unit]
Description=SocialBot: prende da solo gli aggiornamenti del bot e del cervello
Documentation=file://$RADICE/docs/AGGIORNARE.md
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=$RADICE
Environment=HOME=/root
Environment=PATH=$PERCORSO
Environment=AGGIORNA_GIRO_DA_SOLO=1
Environment=AGGIORNA_HA_LUCCHETTO=1
ExecStart=$FLOCK -n $LUCCHETTO /bin/bash $RADICE/server/aggiorna.sh
TimeoutStartSec=infinity
"

# Il timer: ogni quarto d'ora, con qualche minuto a caso.
UNITA_TIMER="[Unit]
Description=SocialBot: guarda se c'è un aggiornamento, ogni quarto d'ora

[Timer]
OnCalendar=*:0/15
RandomizedDelaySec=4min
AccuracySec=1min
Unit=$NOME.service

[Install]
WantedBy=timers.target
"

mkdir -p "$CARTELLA"
CAMBIATO=0
scrivi_unita() {   # file contenuto — si riscrive solo se cambia, byte per byte
  printf '%s' "$2" > "$1.nuovo"
  if [ -f "$1" ] && cmp -s "$1.nuovo" "$1"; then
    rm -f "$1.nuovo"
  else
    mv -f "$1.nuovo" "$1"
    CAMBIATO=1
  fi
}
scrivi_unita "$SERVIZIO" "$UNITA_SERVIZIO"
scrivi_unita "$TIMER" "$UNITA_TIMER"

if [ "$CAMBIATO" = "1" ]; then
  systemctl daemon-reload
  echo "unità scritte: $SERVIZIO e $TIMER"
else
  echo "unità già a posto: non cambio niente."
fi
systemctl enable --now "$NOME.timer"

echo
echo "Il server prende da solo gli aggiornamenti, del bot e del cervello: ogni quarto d'ora,"
echo "con qualche minuto a caso. Aspetta la fine delle dirette, fa il collaudo, e se qualcosa"
echo "non torna torna indietro come sempre."
if [ -f .env ] && [ "$( { grep -E '^AGGIORNA_DA_SOLO=' .env || true; } | tail -1 | cut -d= -f2- | tr -d "\"' " )" = "0" ]; then
  echo "ATTENZIONE: in .env c'è AGGIORNA_DA_SOLO=0, quindi per ora ogni giro esce senza fare niente."
fi
echo "L'ultimo esito si vede nel pannello (Gestione → Salute) e in $RADICE/data/aggiorna.json."
echo "Il racconto dei giri: journalctl -u $NOME.service"
come_si_toglie
