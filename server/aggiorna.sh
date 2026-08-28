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
    exit 1
  }

  npm ci --no-audit --no-fund --silent || { echo "installazione dipendenze fallita"; torna_indietro; }
  npm test --silent || torna_indietro
  npm run --silent cancelli || torna_indietro
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
passo "Controllo che sia tornato su"
PORTA="${PORTA_BOT:-8090}"
for i in $(seq 1 30); do
  RISP="$(docker compose exec -T bot node -e "require('http').get('http://127.0.0.1:$PORTA/health',r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{console.log(d);process.exit(0)})}).on('error',()=>process.exit(1))" 2>/dev/null || true)"
  case "$RISP" in
    *'"stato":"sano"'*)      echo "sano ✓"; echo "$RISP"; exit 0 ;;
    *'"stato":"degradato"'*) echo "in piedi ma degradato — guarda /api/admin/salute"; echo "$RISP"; exit 0 ;;
  esac
  sleep 2
done

echo
echo "Il bot non risponde sano dopo 60 secondi. Guarda i log:"
echo "    docker compose logs --tail=100 bot"
echo "Per tornare alla versione di prima:"
echo "    git -C $RADICE reset --hard $PRIMA && docker compose up -d --build"
exit 1
