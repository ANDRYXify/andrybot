#!/usr/bin/env bash
# ============================================================
#  SocialBot — aggiornamento del server (Hetzner)
#
#  Da eseguire come root, sul server:
#      cd /opt/andrybot && bash server/aggiorna.sh
#
#  PERCHÉ ESISTE. Prima l'unico modo di aggiornare era `git pull` più
#  `docker compose up -d --build`: nessuno provava niente, quindi un commit
#  rotto diventava live e basta. Il collaudo su GitHub non copre questo caso —
#  gira su una macchina che non è questa, e può essere fermo per motivi che non
#  c'entrano col codice (una carta scaduta, per dire).
#
#  L'ORDINE CONTA. Si prova PRIMA di toccare quello che gira: se le prove sono
#  rosse il container in esecuzione non viene sfiorato, e il sito resta su con
#  la versione di prima. Un aggiornamento che fallisce deve lasciare le cose
#  come stavano, non a metà.
#
#  Opzioni:
#      --prova       fa tutto tranne fermare/ricostruire il container
#      --salta-prove salta il collaudo (emergenza vera: sai cosa stai facendo)
# ============================================================
set -euo pipefail

PROVA=0; SALTA=0
for a in "$@"; do
  case "$a" in
    --prova) PROVA=1 ;;
    --salta-prove) SALTA=1 ;;
    *) echo "opzione sconosciuta: $a" >&2; exit 2 ;;
  esac
done

passo() { echo; echo "==== $* ===="; }
muori() { echo; echo "FERMO: $*" >&2; exit 1; }

cd "$(dirname "$0")/.."
RADICE="$(pwd)"
[ -d .git ] || muori "qui non c'è un repository git ($RADICE)"

# ---- 1. la copia di lavoro dev'essere pulita ---------------
passo "Controllo la copia di lavoro"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  git status --short | head -20
  muori "ci sono modifiche non salvate. Committale o annullale prima di aggiornare."
fi
PRIMA="$(git rev-parse HEAD)"
echo "adesso siamo su $(git rev-parse --short HEAD) — $(git log -1 --format=%s)"
# i segreti li legge solo root, sempre: costa niente ripeterlo a ogni giro
[ -f .env ] && chmod 600 .env

# ---- 2. cosa sta per arrivare ------------------------------
passo "Guardo cosa c'è di nuovo"
git fetch --quiet origin
RAMO="$(git rev-parse --abbrev-ref HEAD)"
NUOVI="$(git rev-list --count HEAD..origin/"$RAMO" 2>/dev/null || echo 0)"
PERSI="$(git rev-list --count origin/"$RAMO"..HEAD 2>/dev/null || echo 0)"

if [ "$NUOVI" = "0" ] && [ "$PERSI" = "0" ]; then
  echo "già aggiornato: non c'è niente di nuovo."
  [ "$PROVA" = "1" ] || exit 0
fi

if [ "$PERSI" != "0" ]; then
  echo "La cronologia qui e quella su GitHub sono DIVERSE ($PERSI commit locali non sono là)."
  echo "Succede dopo una riscrittura della cronologia. Se sei sicuro che GitHub abbia ragione:"
  echo "    git -C $RADICE fetch origin && git -C $RADICE reset --hard origin/$RAMO"
  muori "non tiro dritto da solo su una divergenza di cronologia."
fi

echo "$NUOVI commit in arrivo:"
git log --oneline HEAD..origin/"$RAMO" | head -15

# ---- 2b. il cervello privato -------------------------------
# Il codice del cervello vive in un repository a parte (LIA_DIR, di solito la
# cartella accanto a questa). Da quando è così, aggiornare QUESTO senza avere
# QUELLO vorrebbe dire costruire i container del cervello dal nulla: si ferma
# prima, con l'istruzione giusta, invece di scoprirlo a metà del build.
passo "Il cervello privato"
LIA_DIR_CONF="$( { grep -E '^LIA_DIR=' .env 2>/dev/null || true; } | tail -1 | cut -d= -f2- )"
LIA_DIR="${LIA_DIR_CONF:-../lia}"
case "$LIA_DIR" in /*) ;; *) LIA_DIR="$RADICE/$LIA_DIR" ;; esac
SERVE_LIA=0
if git show "origin/$RAMO:docker-compose.yml" 2>/dev/null | grep -q 'LIA_DIR'; then SERVE_LIA=1; fi
if [ "$SERVE_LIA" = "1" ]; then
  if [ ! -d "$LIA_DIR/.git" ]; then
    echo "Il codice in arrivo si aspetta il cervello privato in $LIA_DIR, e lì non c'è niente."
    echo "Prima adottalo (una volta sola):"
    echo "    cd $RADICE && bash server/adotta-lia.sh"
    muori "senza il cervello privato non aggiorno."
  fi
  if [ -n "$(git -C "$LIA_DIR" status --porcelain --untracked-files=no)" ]; then
    git -C "$LIA_DIR" status --short | head -10
    muori "il cervello privato ha modifiche non salvate: committale o annullale prima."
  fi
  LIA_PRIMA="$(git -C "$LIA_DIR" rev-parse HEAD)"
  echo "cervello adesso su $(git -C "$LIA_DIR" rev-parse --short HEAD) — $(git -C "$LIA_DIR" log -1 --format=%s)"
  git -C "$LIA_DIR" fetch --quiet origin
  LIA_RAMO="$(git -C "$LIA_DIR" rev-parse --abbrev-ref HEAD)"
  LIA_NUOVI="$(git -C "$LIA_DIR" rev-list --count HEAD..origin/"$LIA_RAMO" 2>/dev/null || echo 0)"
  echo "$LIA_NUOVI commit in arrivo per il cervello"
  git -C "$LIA_DIR" log --oneline HEAD..origin/"$LIA_RAMO" | head -10
else
  echo "il codice in arrivo non lo chiede ancora: niente da fare qui."
fi

# ---- 3. copia di sicurezza del database --------------------
passo "Copia di sicurezza del database"
if docker compose ps --status running 2>/dev/null | grep -q bot; then
  if docker compose exec -T bot node -e "import('./src/backup.js').then(m=>m.backupOra()).then(r=>{console.log(r.ok?'copia fatta e riaperta ok':'copia FALLITA: '+r.errore);process.exit(r.ok?0:1)})"; then
    echo "database al sicuro."
  else
    echo "ATTENZIONE: la copia non è riuscita. Continuo lo stesso, ma sappilo."
  fi
else
  echo "il container non è in esecuzione: salto la copia."
fi

# ---- 4. porto il codice nuovo ------------------------------
passo "Prendo il codice nuovo"
git merge --ff-only "origin/$RAMO"
echo "ora siamo su $(git rev-parse --short HEAD) — $(git log -1 --format=%s)"
if [ "$SERVE_LIA" = "1" ]; then
  git -C "$LIA_DIR" merge --ff-only "origin/$LIA_RAMO"
  echo "cervello ora su $(git -C "$LIA_DIR" rev-parse --short HEAD) — $(git -C "$LIA_DIR" log -1 --format=%s)"
fi

# ---- 5. il collaudo, PRIMA di toccare quello che gira ------
if [ "$SALTA" = "1" ]; then
  echo; echo "collaudo saltato su tua richiesta."
else
  passo "Collaudo (se è rosso, quello che gira non viene toccato)"
  command -v node >/dev/null || muori "serve Node sul server per il collaudo. Installalo, oppure usa --salta-prove."

  torna_indietro() {
    echo
    echo "Il codice nuovo NON passa il collaudo. Quello che gira non è stato toccato."
    echo "Per rimettere il repository com'era:"
    echo "    git -C $RADICE reset --hard $PRIMA"
    [ "$SERVE_LIA" = "1" ] && echo "    git -C $LIA_DIR reset --hard $LIA_PRIMA"
    exit 1
  }

  npm ci --no-audit --no-fund --silent || { echo "installazione dipendenze fallita"; torna_indietro; }
  npm test --silent || torna_indietro
  npm run --silent cancelli || torna_indietro
  if [ "$SERVE_LIA" = "1" ]; then
    # le prove del cervello leggono anche questo repository (sta accanto): ANDRYBOT_DIR glielo dice
    ( cd "$LIA_DIR" && ANDRYBOT_DIR="$RADICE" npm test --silent && ANDRYBOT_DIR="$RADICE" npm run --silent cancelli ) || torna_indietro
  fi
  echo "collaudo verde ✓"
fi

# ---- 6. adesso si sostituisce quello che gira --------------
if [ "$PROVA" = "1" ]; then
  passo "Prova a vuoto: mi fermo qui, non tocco il container"
  echo "per aggiornare davvero, rilancia senza --prova"
  exit 0
fi

passo "Ricostruisco e riavvio"
docker compose up -d --build

# ---- 7. è tornato su davvero? ------------------------------
# Se non torna su, si TORNA INDIETRO DA SOLI: chi aggiorna da una console
# scomoda non deve battere a mano un comando lungo con il sito giù.
PORTA="${PORTA_BOT:-8090}"
aspetta_sano() {   # esce 0 se entro 60 secondi il bot risponde sano o degradato
  for i in $(seq 1 30); do
    RISP="$(docker compose exec -T bot node -e "require('http').get('http://127.0.0.1:$PORTA/health',r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{console.log(d);process.exit(0)})}).on('error',()=>process.exit(1))" 2>/dev/null || true)"
    case "$RISP" in
      *'"stato":"sano"'*)      echo "sano ✓"; echo "$RISP"; return 0 ;;
      *'"stato":"degradato"'*) echo "in piedi ma degradato — guarda /api/admin/salute"; echo "$RISP"; return 0 ;;
    esac
    sleep 2
  done
  return 1
}

passo "Controllo che sia tornato su"
if aspetta_sano; then
  echo "aggiornato a $(git rev-parse --short HEAD) — se nei log c'è «chiavi degli overlay rinnovate», i link degli overlay vanno rimessi nelle sorgenti di regia."
  exit 0
fi

echo
echo "Il bot non risponde sano dopo 60 secondi: TORNO ALLA VERSIONE DI PRIMA ($(git rev-parse --short "$PRIMA"))."
echo "Ultime righe di log della versione nuova, per capire:"
docker compose logs --tail=40 bot 2>/dev/null || true
git reset --hard "$PRIMA" >/dev/null
[ "$SERVE_LIA" = "1" ] && git -C "$LIA_DIR" reset --hard "$LIA_PRIMA" >/dev/null
docker compose up -d --build

passo "Controllo che la versione di prima sia tornata su"
if aspetta_sano; then
  echo "tornati alla versione di prima. L'aggiornamento NON è passato: guarda i log qui sopra."
  exit 1
fi
echo
echo "Nemmeno la versione di prima risponde. Guarda i log:"
echo "    docker compose logs --tail=100 bot"
exit 1
