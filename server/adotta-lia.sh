#!/usr/bin/env bash
# ============================================================
#  SocialBot — adotta il cervello privato sul server
#
#  Da eseguire come root, sul server, UNA volta:
#      cd /opt/andrybot && bash server/adotta-lia.sh
#
#  PERCHÉ ESISTE. Il codice del cervello vive in un repository PRIVATO, a parte
#  da questo che è pubblico. Il server deve poterlo leggere senza che nessun
#  altro possa: la strada è una CHIAVE DI DEPLOY in sola lettura, generata QUI
#  e mai uscita da qui. Su GitHub si incolla solo la sua metà pubblica.
#
#  Cosa fa, in ordine:
#    1. se manca, genera la chiave (/root/.ssh/lia_deploy) e ti mostra la metà
#       pubblica da incollare su GitHub → repository «lia» → Settings → Deploy keys
#       (lascia «Allow write access» SPENTO: il server legge, non scrive);
#    2. prova a raggiungere il repository con quella chiave;
#    3. se ci arriva e la cartella non c'è ancora, lo clona in LIA_DIR
#       (predefinito: la cartella «lia» accanto a questa, cioè /opt/lia).
#
#  Rilanciarlo non fa danni: se la chiave c'è la riusa, se il clone c'è lo lascia.
#  Da qui in poi è server/aggiorna.sh a tenerlo aggiornato insieme al resto.
# ============================================================
set -euo pipefail

passo() { echo; echo "==== $* ===="; }
muori() { echo; echo "FERMO: $*" >&2; exit 1; }

cd "$(dirname "$0")/.."
RADICE="$(pwd)"
# LIA_DIR come nel .env (relativo a questa cartella), sennò la cartella accanto
LIA_DIR_CONF="$( { grep -E '^LIA_DIR=' .env 2>/dev/null || true; } | tail -1 | cut -d= -f2- )"
LIA_DIR="${LIA_DIR_CONF:-../lia}"
case "$LIA_DIR" in /*) ;; *) LIA_DIR="$RADICE/$LIA_DIR" ;; esac
LIA_DIR="$(cd "$(dirname "$LIA_DIR")" && pwd)/$(basename "$LIA_DIR")"
REPO="${LIA_REPO:-git@github.com:ANDRYXify/lia.git}"
CHIAVE="${LIA_CHIAVE:-/root/.ssh/lia_deploy}"
SSH_CMD="ssh -i $CHIAVE -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"

# ---- 1. la chiave di deploy ---------------------------------
passo "La chiave di deploy"
mkdir -p "$(dirname "$CHIAVE")"; chmod 700 "$(dirname "$CHIAVE")"
if [ ! -f "$CHIAVE" ]; then
  ssh-keygen -t ed25519 -N "" -C "socialbot-server → lia (sola lettura)" -f "$CHIAVE" >/dev/null
  chmod 600 "$CHIAVE"
  echo "chiave nuova generata in $CHIAVE"
else
  echo "chiave già presente in $CHIAVE (la riuso)"
fi
echo
echo "La metà PUBBLICA, da incollare su GitHub → repository «lia» → Settings → Deploy keys → Add:"
echo "------------------------------------------------------------"
cat "$CHIAVE.pub"
echo "------------------------------------------------------------"
echo "(«Allow write access» deve restare SPENTO: il server legge e basta.)"

# ---- 2. la raggiunge? ---------------------------------------
passo "Provo a raggiungere $REPO"
if ! GIT_SSH_COMMAND="$SSH_CMD" git ls-remote --exit-code -h "$REPO" >/dev/null 2>&1; then
  echo "Non ci arrivo ancora. È normale la prima volta: incolla la chiave qui sopra su GitHub,"
  echo "poi rilancia questo stesso comando:"
  echo "    cd $RADICE && bash server/adotta-lia.sh"
  exit 2
fi
echo "raggiunto ✓"

# ---- 3. il clone ---------------------------------------------
passo "Il repository privato in $LIA_DIR"
if [ -d "$LIA_DIR/.git" ]; then
  echo "c'è già: lo lascio com'è (lo aggiorna server/aggiorna.sh)."
else
  GIT_SSH_COMMAND="$SSH_CMD" git clone --quiet "$REPO" "$LIA_DIR"
  echo "clonato ✓"
fi
# da qui in poi ogni fetch/pull di quel clone usa la chiave di deploy, senza doverlo ricordare
git -C "$LIA_DIR" config core.sshCommand "$SSH_CMD"
chmod 750 "$LIA_DIR"
echo "adesso il cervello è su $(git -C "$LIA_DIR" rev-parse --short HEAD) — $(git -C "$LIA_DIR" log -1 --format=%s)"
echo
echo "Fatto. Ora: cd $RADICE && bash server/aggiorna.sh"
